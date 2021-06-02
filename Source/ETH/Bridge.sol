// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;


import "./TokenLib.sol";
import "./OrderLib.sol";
import "./NotaryLib.sol";



pragma experimental ABIEncoderV2;



/**
 * @title Bridge
 * @dev Bridge TERA-ETH
 */


contract Bridge is  OrderLib, BridgeERC20, NotaryLib
{
    bytes32 constant ZeroSign32=hex"00112233445566778899aabbccddeeffff112233445566778899aabbccddeeff";




    //------------------------------------------------------------------------ETH->TERA
    function AddOrder(bytes memory Buf)  public payable
    {
        require(ConfCommon.WORK_MODE>0,"Pausing");
        require(Buf.length<=1024,"Error order buf size");

        TypeOrder memory Order;
        FillOrderBody(Order,Buf,BUF_EXTERN_HEADER);

        address AddrEth=GetAddrFromBytes20(Order.AddrEth);

        TypeGate memory Gate=GateList[Order.Gate];
        require(Gate.WORK_MODE>0,"Error order channel or work mode");

        require(Order.AddrTera>0,"Error AddrTera");
        require(AddrEth==msg.sender,"Error AddrEth");



        //расчет номера ордера внутри блока
        uint OrderNum=0;
        uint BlockNum=(block.timestamp-ConfCommon.FIRST_TIME_BLOCK)/ConfCommon.CONSENSUS_PERIOD_TIME;

        uint PrevBlockNum=ConfData.NewOrderID/100000;
        if(PrevBlockNum>=BlockNum)
            OrderNum = (ConfData.NewOrderID%1000) + 1;

        require(OrderNum<1000,"Big tx num, try later");

        Order.ID=uint48(BlockNum*100000 + ConfCommon.OrderEnum*1000 + OrderNum);
        ConfData.NewOrderID=Order.ID;




        uint256 Amount=uint256(Order.Amount);

        if(Gate.TypeERC==721)
        {
            //комиссия в газе и всегда равна MinNotaryFee
            Order.NotaryFee=ConfCommon.MinNotaryFee;

            //не учитываем в Amount комиссию - ее получили газом
            //переводим точность комиссии к точности 1e18
            uint256 Fee=uint256(Order.NotaryFee+Order.TransferFee)*1e9;//9 - > 18
            require(uint64(msg.value) >= Fee,"Error receive Fee");

        }
        else
        {
            Order.NotaryFee=uint64(uint(ConfCommon.NotaryFee)*(Order.Amount+Order.TransferFee)/1e9);

            //перевод MinNotaryFee в валюту ордера
            uint MinNotaryFee=uint(Gate.Rate)*ConfCommon.MinNotaryFee/1e9;
            if(Order.NotaryFee<MinNotaryFee)
                Order.NotaryFee=uint64(MinNotaryFee);

            Amount += uint256(Order.TransferFee + Order.NotaryFee);
        }


        //переводим точность к точности монеты
        Amount = Amount*(10**Gate.Decimals)/1e9;

        //transfer
        if(Gate.WORK_MODE>ERC_SKIP)
        {
            ReceiveOrBurn(Gate, AddrEth, Order.TokenID, Amount);
        }

        ConfData.WorkNum++;


        //fill notary tx
        CreateEmptyOrderBody(Order);

        //save
        SaveNewOrder(ConfData,Order,0);
    }

    function CreateEmptyOrderBody(TypeOrder memory Order)internal view
    {
        Order.SignArr=new TypeSigner[](ConfCommon.NOTARY_COUNT);
        for(uint8 i=0;i<ConfCommon.NOTARY_COUNT;i++)
        {
            TypeSigner memory Item=Order.SignArr[i];
            Item.Notary=0xFF;
            Item.SignR=ZeroSign32;
            Item.SignS=ZeroSign32;
            Item.SignV=0xFF;
        }
    }


    function NotarySign(uint48 ID, uint8 Notary, bytes32 SignR,bytes32 SignS,uint8 SignV)  public
    {

        //1.Проверяем параметры, что ордер не устарел (SignPeriod)
        //2.Проверка разрешения вызова - нотариус в списке подписантов
        //3.Проверяем что у валидатора есть минимальный депозит (SumDeposit/MinDeposit)
        //4.Проверяем что этот валидатор еще не подписывал
        //5.Проверяем подпись
        //6.Добавляем в массив подписей
        //7.Если достаточное число подписей - ставим признак Process=1
        //8.Записываем признак апдейта в канал

        require(ID>0 && (ID/1000)%100 == ConfCommon.OrderEnum,"The order was not created in this blockchain");

        //1
        uint Period=OrderInPeriod(ID);
        require(Period==2,"Error order period (time stamp)");

        TypeOrder memory Order=LoadOrder(ID);
        require(Order.ID>0,"Error order ID");

        //2
        TypeNotary memory ItemNotary=NotaryList[Notary];
        require(ItemNotary.Addr!=address(0),"Error notary Addr");

        //3
        require(ItemNotary.SumDeposit>=ConfCommon.MinDeposit,"Error notary Deposit");

        bytes32 Hash=GetSignOrderHash(Order);

        uint Was=0;
        uint SignCount=0;
        for(uint8 i=0;i<Order.SignArr.length;i++)
        {
            TypeSigner memory Item=Order.SignArr[i];
            if(Item.Notary!=0xFF)
            {
                //4
                require(Item.Notary!=Notary,"Error was sign Notary");
                SignCount++;
            }
            else
            {
                //5
                address AddrFromSign=ecrecover(Hash, SignV, SignR, SignS);
                require(ItemNotary.Addr==AddrFromSign,"Error Sign");
                //6
                Item.Notary=Notary;
                Item.SignR=SignR;
                Item.SignS=SignS;
                Item.SignV=SignV;

                SignCount++;
                Was=1;
            }
        }

        require(Was==1,"Error search sign slot");

        //7
        if(SignCount==ConfCommon.MIN_SIGN_COUNT)
            Order.Process=1;

        //Если Order.Process==1 и есть NotaryFee, то одинаковыми частями начисляем награду валидаторам - в массив NotaryList.SumDeposit

        //8
        ConfData.WorkNum++;

        SaveOrder(Order);

        //Send gas to notary
    }

    function SlashProof(bytes memory Buf, uint8 Notary, bytes32 SignR,bytes32 SignS,uint8 SignV) public
    {
        //1.Проверяем валидность ID (только ордера созданные в этом блокчейне)
        //2.Проверяем валидность канала
        //3.Проверяем валидность номера нотариуса
        //4.Проверяем что время ордера в периоде = 3 (больше SignPeriod, но меньше TransferPeriod)
        //5.Проверяем подпись
        //6.Проверяем что такой подписи в ордере нет
        //7.
        //8.Добавляем подпись в ордер для предотвращения дальнейших штрафов с такой подписью и ставим Slash=1
        //9.Устанавливаем в ордере NotaryFee = 0
        //10.Штрафуем валидаторов (списанием с депозита), за основу берем большую сумму между полученным ордером и записанным в БД (так как может быть ситуация когда пришедший ID - "левый")
        //11.Записываем признак апдейта в канал

        TypeOrder memory Order;
        FillOrderBody(Order,Buf,BUF_EXTERN_HEADER);

        //1
        require(Order.ID>0 && (Order.ID/1000)%100 == ConfCommon.OrderEnum,"The order was not created in this blockchain");


        //2
        TypeGate memory Gate=GateList[Order.Gate];
        require(Gate.WORK_MODE>0,"Error order channel or work mode");

        //3
        TypeNotary storage ItemNotary=NotaryList[Notary];
        require(ItemNotary.Addr!=address(0),"Error notary Addr");

        //4
        uint Period=OrderInPeriod(Order.ID);
        require(Period==3,"Error order period (time stamp)");


        //5
        bytes32 Hash=GetSignOrderHash(Order);
        address AddrFromSign=ecrecover(Hash, SignV, SignR, SignS);
        require(ItemNotary.Addr==AddrFromSign,"Error Sign");

        //6
        uint8 NewOrder;
        uint8 ItemNum;
        TypeOrder memory OrderDB=LoadOrder(Order.ID);

        //точность 1e9
        uint SlashAmount=Order.Amount + Order.TransferFee;

        if(OrderDB.ID==0)
        {
            NewOrder=1;

            CreateEmptyOrderBody(Order);
        }
        else
        {
            uint SlashAmountDB=OrderDB.Amount + OrderDB.TransferFee;
            if(SlashAmountDB>SlashAmount)
                SlashAmount=SlashAmountDB;

            Order=OrderDB;
        }


        for(uint8 i=0;i<Order.SignArr.length;i++)
        {
            TypeSigner memory Item=Order.SignArr[i];
            //require(Item.Notary!=Notary,"This notary sign was already there"); - так низзя
            require(Item.SignV!=SignV && Item.SignR!=SignR,"This signature was already there");//именно этот вариант, так как это еще неявная проверка одинаковости ордеров

            if(Item.Notary==0xFF)
            {
                ItemNum=i;
                break;
            }
        }




        Order.Process=200;

        //8
        Order.SignArr[ItemNum]=TypeSigner({Notary:Notary,SignR:SignR, SignS:SignS, SignV:SignV, Slash:1});

        //9
        Order.NotaryFee=0;

        if(NewOrder>0)
            SaveNewOrder(ConfData,Order,0);
        else
            SaveOrder(Order);


        //10
        //перевод валюты ордера в Eth
        uint SlashSum=uint(ConfCommon.SlashRate)*SlashAmount*1e9/uint(Gate.Rate);
        if(Gate.TypeERC==721 || SlashSum<ConfCommon.MinSlash)
            SlashSum=ConfCommon.MinSlash;


        //отнимаем из депозита
        if(SlashSum>=ItemNotary.SumDeposit)
        {
            ItemNotary.SumDeposit=0;
        }
        else
        {
            ItemNotary.SumDeposit-=uint64(SlashSum);
        }

        if(ItemNotary.SumDeposit<ConfCommon.MinDeposit)
            ItemNotary.CanSign=0;

        //11
        ConfData.WorkNum++;
    }


    function CancelOrder(uint48 ID) public
    {
        //1. Проверяем время ордера больше SignPeriod
        //2. Проверяем что Process===0
        //3. Устанавливаем в ордере признак обработанности Process=100
        //4. Возвращаем средства
        //5.Записываем признак апдейта в канал

        require(ID>0 && (ID/1000)%100 == ConfCommon.OrderEnum,"The order was not created in this blockchain");


        //1
        uint Period=OrderInPeriod(ID);
        require(Period==3,"Error order period (time stamp)");

        TypeOrder memory Order=LoadOrder(ID);
        require(Order.ID>0,"Error order ID");

        TypeGate memory Gate=GateList[Order.Gate];
        require(Gate.WORK_MODE>0,"Error order channel or work mode");

        //2
        require(Order.Process==0,"The order has already been processed");

        //3
        Order.Process=100;
        SaveOrderHeader(Order);
        //Not Reentrancy


        //4
        //transfer
        address AddrEth=GetAddrFromBytes20(Order.AddrEth);

        if(Gate.WORK_MODE>ERC_SKIP)
        {
            uint256 Amount=uint256(Order.Amount);

            if(Gate.TypeERC==721)
            {
                uint256 Fee=uint256(Order.TransferFee + Order.NotaryFee)*1e9;//9 - > 18
                if(Fee>0)
                {
                    payable(AddrEth).transfer(Fee);
                }
            }
            else
            {
                Amount += uint256(Order.TransferFee + Order.NotaryFee);
            }

            //переводим точность к точности монеты
            Amount = Amount*(10**Gate.Decimals)/1e9;

            SendOrMint(Gate, AddrEth, Order.TokenID, Amount);
        }


        //5
        ConfData.WorkNum++;

    }




    //------------------------------------------------------------------------TERA->ETH
    function ExecOrder(bytes memory Buf)  public
    {


        require(ConfCommon.WORK_MODE>0,"Pausing");
        require(Buf.length<=1024,"Error order buf size");

        TypeOrder memory Order;
        FillOrderBody(Order,Buf,BUF_EXTERN_FULL);

        TypeGate memory Gate=GateList[Order.Gate];
        require(Gate.WORK_MODE>0,"Error order channel or work mode");
        require(Order.ID>0,"Error order ID");
        //require(Order.ID%2==1,"Error order ID");
        require((Order.ID/1000)%100 == 0,"The order was not created in Tera-Hub");

        uint Period=OrderInPeriod(Order.ID);
        require(Period>=2 && Period<=3,"Error order period (time stamp)");


        //signs
        CheckOrderSign(Order);

        Order.Process=1;



        //Save order
        SaveNewOrder(ConfData,Order,1);//запись с обязательной проверкой уникальности ID
        //Not Reentrancy

        //transfer
        if(Gate.WORK_MODE>ERC_SKIP)
        {
            address AddrEth=GetAddrFromBytes20(Order.AddrEth);

            uint256 Amount=uint256(Order.Amount);

            if(Order.TransferFee>0)
            {
                uint256 Fee=uint256(Order.TransferFee);

                if(Gate.TypeERC==721)
                {
                    //возврат газа?? но там были Тера
                    //payable(AddrEth).transfer(Fee*1e9);//9 - > 18
                }
                else
                if(tx.origin==AddrEth)
                {
                    Amount+=Fee;
                }
                else
                {
                    //переводим точность к точности монеты
                    Fee = Fee*(10**Gate.Decimals)/1e9;

                    SendOrMint(Gate, tx.origin, "", Fee);
                }
            }

            //переводим точность к точности монеты
            Amount = Amount*(10**Gate.Decimals)/1e9;

            SendOrMint(Gate, AddrEth, Order.TokenID, Amount);

        }

        ConfData.WorkNum++;

    }



    //------------------------------------------------------------------------ COMMON
    function SetCommon(TypeCommon memory Conf) public OnlyOwner                         //<------------------ owner
    {
        ConfCommon=Conf;
    }



    function GetCommon() public view returns(TypeCommon memory)                         //<------------------ owner
    {
        return ConfCommon;
    }


    function GetConf() public view returns(TypeConf memory)
    {
        return ConfData;
    }



}


//address(this)
//IERC721Transfer(Erc721Addr).safeTransferFrom(msg.sender, address(this), tokenId);
