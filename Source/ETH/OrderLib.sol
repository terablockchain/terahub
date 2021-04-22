
// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;


import "./OwnerLib.sol";



contract OrderLib is OwnerLib
{
    //------------------------------------------------------------------------ Time


    function OrderInPeriod(uint ID) view internal returns(uint)
    {
        uint BlockNumOrder=ID/1000;

        uint TimeStampOrder=ConfCommon.FIRST_TIME_BLOCK + BlockNumOrder * ConfCommon.CONSENSUS_PERIOD_TIME;
        if(block.timestamp<TimeStampOrder)
            return 1;

        uint KMult=ConfCommon.CONSENSUS_PERIOD_TIME;

        if(block.timestamp>TimeStampOrder+ConfCommon.MAX_TRANSFER_PERIOD*KMult)
            return 4;

        if(block.timestamp>TimeStampOrder+ConfCommon.MAX_SIGN_PERIOD*KMult)
            return 3;

        return 2;
    }






    //------------------------------------------------------------------------ Sign

    function CheckOrderSign(TypeOrder memory Order) internal view returns (bool)
    {
        //TypeConf memory Conf=LoadConf();

        uint8[] memory WasNotary=new uint8[](256);
        bytes32 Hash=GetSignOrderHash(Order);

        uint8 CountSign=0;
        for(uint8 i=0;i<Order.SignArr.length;i++)
        {
            TypeSigner memory Item=Order.SignArr[i];
            if(WasNotary[Item.Notary]==1)
                continue;

            require(Item.Notary<ConfCommon.NOTARY_COUNT,"Error notary num");


            TypeNotary memory ItemNotary=NotaryList[Item.Notary];
            require(ItemNotary.Addr!=address(0),"Error notary addr");



            //LogBuf=GetSignBufFromOrder(Order);

            address AddrFromSign=ecrecover(Hash, Item.SignV, Item.SignR, Item.SignS);

            if(ItemNotary.Addr==AddrFromSign)
            {
                CountSign++;
                if(CountSign>=ConfCommon.MIN_SIGN_COUNT)
                    return true;
            }
            WasNotary[Item.Notary]=1;
        }

        require(CountSign>=ConfCommon.MIN_SIGN_COUNT,"Error multisign count");



        return true;
    }




    function GetSignOrderHash(TypeOrder memory Order)  pure internal returns (bytes32)
    {
        bytes memory Buf=GetSignBufFromOrder(Order);
        //return sha256(Buf);
        return keccak256(Buf);
    }


    //------------------------------------------------------------------------


//    function GetOrderHeader(uint40 ID) public view returns(bytes32)
//    {
//        uint Header=LoadHeaderBytes(ID);
//        return bytes32(Header);
//    }
//    function GetBody(uint40 BodyID,uint Length) public view returns(bytes memory)
//    {
//        return LoadBodyBytes(BodyID,Length);
//    }

    //----------------------------------------------------------------------------------------------- SAVE/LOAD ORDER
    function SaveOrderHeader(TypeOrder memory Order)internal
    {
        uint FData=(uint(Order.BodyLength)<<240) | (uint(Order.PrevID)<<200) | (uint(Order.NextID)<<160) | (uint(Order.BodyID)<<120)  | (uint(Order.Process)<<112);
        SaveHeaderBytes(Order.ID,FData);
    }
    function FillOrderHeader(TypeOrder memory Order,uint FData)internal pure
    {
        Order.BodyLength = uint16((FData>>240) & 0xFFFFFFFFFF);
        Order.PrevID     = uint40((FData>>200) & 0xFFFFFFFFFF);
        Order.NextID     = uint40((FData>>160) & 0xFFFFFFFFFF);
        Order.BodyID     = uint40((FData>>120) & 0xFFFFFFFFFF);
        Order.Process    = uint8((FData>>112) & 0xFF);
    }

    function LoadOrder(uint40 ID) internal view returns(TypeOrder memory)
    {
        TypeOrder memory Order;
        uint FData=LoadHeaderBytes(ID);

        FillOrderHeader(Order,FData);
        if(Order.BodyID==0)
            return Order;

        Order.ID=ID;
        bytes memory Buf=LoadBodyBytes(Order.BodyID,Order.BodyLength);
        FillOrderBody(Order,Buf,BUF_STORE);



        return Order;
    }

    function GetOrder(uint40 ID) public view returns(bytes memory)
    {

        TypeOrder memory Order=LoadOrder(ID);
        if(Order.ID==0)
            return hex"";
        return GetBufFromOrder(Order,BUF_EXTERN_FULL);
    }


    function SaveOrder(TypeOrder memory Order)internal
    {
        require(Order.BodyID>0, "Error Order.BodyID");



        bytes memory Buf=GetBufFromOrder(Order,BUF_STORE);
        Order.BodyLength=uint16(Buf.length);

        SaveOrderHeader(Order);
        SaveBodyBytes(Order.BodyID,Buf);
    }

    function SaveNewOrder(TypeConf storage Conf,TypeOrder memory Order,uint8 CheckUnique)internal
    {
        require(Order.ID>0,"Error order ID");
        require(Order.Amount<=1e21,"Amount more then 1e21");
        require(Order.TransferFee<=1e21,"TransferFee more then 1e21");

        if(CheckUnique>0)
        {
            uint Header=LoadHeaderBytes(Order.ID);
            require(Header==0,"Order was payed");
        }

        Order.BodyID=Order.ID;

        //используем BodyID последнего ордера в удаляемом периоде
        if(Conf.LastOrderID>0)
        {
            uint Period=OrderInPeriod(Conf.LastOrderID);
            if(Period>=4)
            {
                uint HeaderLast=LoadHeaderBytes(Conf.LastOrderID);

                require(HeaderLast>0,"Error read HeaderLast");

                if(HeaderLast>0)
                {
                    SaveHeaderBytes(Conf.LastOrderID,0);//удаляем его
                    if(Conf.FirstOrderID==Conf.LastOrderID)
                        Conf.FirstOrderID=0;

                    Order.BodyID=uint40((HeaderLast>>120) & 0xFFFFFFFFFF);//BodyID
                    Conf.LastOrderID=uint40((HeaderLast>>200) & 0xFFFFFFFFFF);//PrevID
                }
            }
        }


        Order.NextID=Conf.FirstOrderID;
        SaveOrder(Order);


        //записываем ссылку на этот ордер в предыдущем ордере
        if(Conf.FirstOrderID>0)
        {
            uint HeaderFirst=LoadHeaderBytes(Conf.FirstOrderID);
            require(HeaderFirst>0,"Error read FirstOrderID");

            //обнуляем предыдущее значение PrevID - но вообще оно и так всегда пустое
            uint TemplatePrevID = 0xFFFFFFFFFF << 200;
            HeaderFirst = HeaderFirst | TemplatePrevID;
            HeaderFirst = HeaderFirst ^ TemplatePrevID;
            //новая ссылка
            HeaderFirst = HeaderFirst |  (uint(Order.ID) << 200);

            SaveHeaderBytes(Conf.FirstOrderID,HeaderFirst);
        }

        Conf.FirstOrderID=Order.ID;
        if(Conf.LastOrderID==0)
            Conf.LastOrderID=Order.ID;


    }



}
