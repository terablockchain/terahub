// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;


import "./TokenLib.sol";
import "./OrderLib.sol";

pragma experimental ABIEncoderV2;



/**
 * @title Bridge
 * @dev Bridge TERA-ETH
 */

contract Bridge is  OrderLib, BridgeERC20
{
    bytes32 constant ZeroSign32=hex"00112233445566778899aabbccddeeffff112233445566778899aabbccddeeff";
    
    //------------------------------------------------------------------------ 
    constructor()
    {
        Owner = msg.sender;


        ConfCommon.CONSENSUS_PERIOD_TIME = 3;
        ConfCommon.FIRST_TIME_BLOCK = 1593818071;//const from TERA 1/1000        Main-net:1403426400     Test-net: 1593818071

        ConfCommon.CHANNEL=606;//652 - tera dapp for testnet kovan, 606 - rinkeby
        ConfCommon.MAX_SIGN_PERIOD=60;//24*3600/6;
        ConfCommon.MAX_TRANSFER_PERIOD=120;//24*3600/3;
        ConfCommon.MIN_SIGN_COUNT = 1;
        ConfCommon.NOTARY_COUNT = 0;
        ConfCommon.WORK_MODE = 1;
        ConfCommon.RATE = 0.000008 * 1e9;
        ConfCommon.MIN_NOTARY_FEE = 0.001 * 1e6;
        ConfCommon.NOTARY_FEE = 0.01 * 1e3;

        ConfCommon.MIN_DEPOSIT = 100;

        SetNotary(0,hex"7D557BD835219FF838E06D2651BAB8F46791092E", 100*1e9, 1);
    }
    
    //------------------------------------------------------------------------ETH->TERA
    function AddOrder(bytes memory Buf)  public payable
    {
        require(ConfCommon.WORK_MODE>0,"Pausing");
        require(Buf.length<=1024,"Error order buf size");

        TypeOrder memory Order=GetOrderFromBuf(Buf,BUF_EXTERN2);

        address AddrEth=GetAddrFromBytes20(Order.AddrEth);

        require(Order.Channel==ConfCommon.CHANNEL,"Error order channel");
        require(Order.AddrTera>0,"Error AddrTera");
        require(AddrEth==msg.sender,"Error AddrEth");



        //расчет номера ордера внутри блока
        uint OrderNum=2;
        uint BlockNum=(block.timestamp-ConfCommon.FIRST_TIME_BLOCK)/ConfCommon.CONSENSUS_PERIOD_TIME;

        uint PrevBlockNum=ConfData2.FirstOrderID/1000;
        if(PrevBlockNum>BlockNum)
            BlockNum=PrevBlockNum;
        if(PrevBlockNum==BlockNum)
            OrderNum = (ConfData2.FirstOrderID%1000)+2; // четные
        require(OrderNum<1000,"Big tx num, try later");
        Order.ID=uint40(BlockNum*1000 + OrderNum);


        //приводим полученные eth к стандартному формату (точность 1e-9)
        Order.NotaryFee=uint64(msg.value/1e9);//18 - > 9

        uint NeedFee=ConfCommon.RATE*ConfCommon.NOTARY_FEE*(Order.Amount+Order.TransferFee)/1e12;
        if(NeedFee<ConfCommon.MIN_NOTARY_FEE*1e3)
            NeedFee=ConfCommon.MIN_NOTARY_FEE*1e3;

        require(Order.NotaryFee>=NeedFee,"Error NotaryFee");


        ConfData2.WorkNum++;



        //transfer
        if(ConfCommon.WORK_MODE>=2)
        {
            //ERC20 mode
            uint256 Amount=uint256(Order.Amount);
            Token.SmartBurn(AddrEth, Amount);
        }

        //fill notary tx
        Order.SignArr=new TypeSigner[](ConfCommon.NOTARY_COUNT);
        for(uint8 i=0;i<ConfCommon.NOTARY_COUNT;i++)
        {
            TypeSigner memory Item=Order.SignArr[i];
            Item.Notary=0xFF;
            Item.SignR=ZeroSign32;
            Item.SignS=ZeroSign32;
            Item.SignV=0xFF;
        }
        //save
        SaveNewOrder(ConfData2,Order,0);

    }

    function NotarySign(uint40 ID, uint8 Notary, bytes32 SignR,bytes32 SignS,uint8 SignV)  public
    {
        //todo Gas used 73k

        //1.Проверяем параметры, что ордер не устарел (SignPeriod)
        //2.Проверка разрешения вызова - нотариус в списке подписантов
        //3.Проверяем что у валидатора есть минимальный депозит (SumDeposit/MinDeposit)
        //4.Проверяем что этот валидатор еще не подписывал
        //5.Проверяем подпись
        //6.Добавляем в массив подписей
        //7.Если достаточное число подписей - ставим признак Process=1
        //8.Записываем признак апдейта в канал

        require(ID>0,"Error ID");

        //1
        uint Period=OrderInPeriod(ID);
        require(Period==2,"Error order period (time stamp)");

        TypeOrder memory Order=LoadOrder(ID);
        require(Order.ID>0,"Error order ID");

        //2
        TypeNotary memory ItemNotary=NotaryList[Notary];
        require(ItemNotary.Addr!=address(0),"Error notary Addr");

        //3
        require(ItemNotary.Deposit>=ConfCommon.MIN_DEPOSIT*1e9,"Error notary Deposit");

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

        //Если Order.Process==1 и есть NotaryFee, то одинаковыми частями начисляем награду валидаторам - в массив NotaryList.Deposit

        //8
        ConfData2.WorkNum++;

        SaveOrder(Order);

        //Send gas to notary
    }

    function SlashProof(uint40 ID,bytes memory Buf) public pure//uint8 Notary, bytes32 SignR,bytes32 SignS,uint8 SignV)
    {

    }
    function CancelOrder(uint40 ID)  public pure
    {

    }




    //------------------------------------------------------------------------TERA->ETH
    function ExecOrder(bytes memory Buf)  public
    {


        require(ConfCommon.WORK_MODE>0,"Pausing");
        require(Buf.length<=1024,"Error order buf size");

        TypeOrder memory Order=GetOrderFromBuf(Buf,BUF_EXTERN);
        require(Order.Channel==ConfCommon.CHANNEL,"Error order channel");
        require(Order.ID>0,"Error order ID");
        require(Order.ID%2==1,"Error order ID");

        uint Period=OrderInPeriod(Order.ID);
        require(Period>=2 && Period<=3,"Error order period (time stamp)");


        //signs
        CheckOrderSign(Order);

        Order.Process=1;



        //Save order
        SaveNewOrder(ConfData1,Order,1);



        //transfer
        if(ConfCommon.WORK_MODE>=2)
        {
            address AddrEth=GetAddrFromBytes20(Order.AddrEth);
            uint TokenID=UintFromBytes(Order.TokenID);
            if(TokenID>0)
            {
                //ERC721(NFT) mode
                //Token.SmartMint(AddrEth, TokenID, Order.Description);
            }
            else
            {
                //ERC20 mode

                uint256 Amount=uint256(Order.Amount);
                if(Order.TransferFee>0)
                {
                    uint256 Fee=uint256(Order.TransferFee);
                    if(tx.origin==AddrEth)
                        Amount+=Fee;
                    else
                        Token.SmartMint(tx.origin, Fee);
                }

                Token.SmartMint(AddrEth, Amount);
            }
        }
    }


    //------------------------------------------------------------------------ COMMON
    function SetCommon(TypeCommon memory Conf) public OnlyOwner
    {
        ConfCommon=Conf;
    }



    function GetCommon() public view returns(TypeCommon memory)
    {
        return ConfCommon;
    }

    function GetConf(uint8 Mode) public view returns(TypeConf memory)
    {
       if(Mode==2)
            return ConfData2;


       return ConfData1;
    }




}
