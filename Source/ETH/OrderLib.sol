
// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;


import "./OwnerLib.sol";



contract OrderLib is OwnerLib
{
    //------------------------------------------------------------------------ Time


    function OrderInPeriod(uint ID) view internal returns(uint)
    {
        uint BlockNumOrder=ID/100000;

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


    function GetOrderHeader(uint48 ID) public view returns(bytes32)
    {
        uint Header=LoadHeaderBytes(ID);
        return bytes32(Header);
    }
    function GetBody(uint48 BodyID,uint Length) public view returns(bytes memory)
    {
        return LoadBodyBytes(BodyID,Length);
    }
    function GetOrderObject(uint48 ID) public view returns(TypeOrder memory)
    {
        return LoadOrder(ID);
    }


    //----------------------------------------------------------------------------------------------- SAVE/LOAD ORDER
    function SaveOrderHeader(TypeOrder memory Order)internal
    {
        uint FData=(uint(Order.BodyLength)<<240) | (uint(Order.PrevID)<<192) | (uint(Order.NextID)<<144) | (uint(Order.BodyID)<<96)  | (uint(Order.Process)<<88);
        SaveHeaderBytes(Order.ID,FData);
    }
    function FillOrderHeader(TypeOrder memory Order,uint FData)internal pure
    {
        Order.BodyLength = uint16((FData>>240) & 0xFFFFFFFFFFFF);
        Order.PrevID     = uint48((FData>>192) & 0xFFFFFFFFFFFF);
        Order.NextID     = uint48((FData>>144) & 0xFFFFFFFFFFFF);
        Order.BodyID     = uint48((FData>>96)  & 0xFFFFFFFFFFFF);
        Order.Process    = uint8((FData>>88)   & 0xFF);
    }

    function LoadOrder(uint48 ID) internal view returns(TypeOrder memory)
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

    function GetOrder(uint48 ID) public view returns(bytes memory)
    {

        TypeOrder memory Order=LoadOrder(ID);
        if(Order.ID==0)
            return "";
        return GetBufFromOrder(Order,BUF_EXTERN_FULL);
    }

    function GetOrderList(uint48 ID, uint16 Count) public view returns(bytes[] memory Arr)
    {
        TypeOrder memory Order;
        Arr=new bytes[](Count);
        uint32 Num=0;
        uint48 NextID=ID;
        while(NextID>0)
        {
            Order=LoadOrder(NextID);
            if(Order.ID==0)
                break;
            Arr[Num]=GetBufFromOrder(Order,BUF_EXTERN_FULL);
            NextID=Order.NextID;

            Num++;
            if(Num>=Count)
                break;
        }
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
        if(Conf.TailOrderID>0)
        {
            uint Period=OrderInPeriod(Conf.TailOrderID);
            if(Period>=4)
            {
                uint HeaderLast=LoadHeaderBytes(Conf.TailOrderID);

                require(HeaderLast>0,"Error read HeaderLast");

                if(HeaderLast>0)
                {
                    SaveHeaderBytes(Conf.TailOrderID,0);//удаляем его
                    if(Conf.HeadOrderID==Conf.TailOrderID)
                        Conf.HeadOrderID=0;

                    Order.BodyID=uint48((HeaderLast>>96) & 0xFFFFFFFFFFFF);//BodyID
                    Conf.TailOrderID=uint48((HeaderLast>>192) & 0xFFFFFFFFFFFF);//PrevID
                }
            }
        }


        Order.NextID=Conf.HeadOrderID;
        SaveOrder(Order);


        //записываем ссылку на этот ордер в предыдущем ордере
        if(Conf.HeadOrderID>0)
        {
            uint HeaderFirst=LoadHeaderBytes(Conf.HeadOrderID);
            require(HeaderFirst>0,"Error read HeadOrderID");

//            //обнуляем предыдущее значение PrevID - но вообще оно и так всегда пустое
//            uint TemplatePrevID = 0xFFFFFFFFFFFF << 192;
//            HeaderFirst = HeaderFirst | TemplatePrevID;
//            HeaderFirst = HeaderFirst ^ TemplatePrevID;
            //новая ссылка
            HeaderFirst = HeaderFirst |  (uint(Order.ID) << 192);

            SaveHeaderBytes(Conf.HeadOrderID,HeaderFirst);
        }

        Conf.HeadOrderID=Order.ID;
        if(Conf.TailOrderID==0)
            Conf.TailOrderID=Order.ID;


    }



}
