// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;


import "./DataLib.sol";

contract ConvertLib is DataLib
{
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------


    function toAddress(bytes memory _bytes, uint256 _start) internal pure returns (address) {
        require(_start + 20 >= _start, "toAddress_overflow");
        require(_bytes.length >= _start + 20, "toAddress_outOfBounds");
        address tempAddress;

        assembly {
            tempAddress := div(mload(add(add(_bytes, 0x20), _start)), 0x1000000000000000000000000)
        }

        return tempAddress;
    }

    function RevertBytes(uint Data)  internal pure returns (uint Ret)
    {
        assembly
        {
            for { let i := 0 } lt(i, 32) { i := add(i, 1) }
            {
                Ret := mul(Ret,0x100)
                Ret := or(Ret,and(Data,0xFF))

                Data := div(Data,0x100)
            }
        }
    }

    function GetAddrFromBytes(bytes memory Addr) internal pure returns (address)
    {
        require(Addr.length >= 20, "GetAddrFromBytes_outOfBounds");

        uint160 addr=0;
        assembly
        {
            addr := div(mload(add(Addr,32)), 0x1000000000000000000000000)
        }

        return address(addr);
    }

    function GetAddrFromBytes20(bytes20 Addr) internal pure returns (address)
    {
        uint160 addr;
        assembly
        {
            addr := div(Addr, 0x1000000000000000000000000)
        }

        return address(addr);
    }


    //------------------------------------------------------------------------
    function MemCpy(uint dest,uint src, uint16 size)  internal pure
    {
        // Copy word-length chunks while possible
        for(; size >= 32; size -= 32)
        {
            assembly
            {
                mstore(dest, mload(src))
            }
            dest += 32;
            src += 32;
        }


        // Copy remaining bytes
        uint mask = 256 ** (32 - size) - 1;
        assembly
        {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }

    //------------------------------------------------------------------------
    //-------------------------------- TERA decode library for Solidity
    //------------------------------------------------------------------------
    function GetBufPos(bytes memory Buf) pure internal returns (uint Ret)
    {
        assembly
        {
            Ret := add(Buf,32)
        }
    }


    //------------------------------------------------------------------------


    function GetBytes32(uint Data)  internal pure returns (bytes32 RetArr)
    {
        assembly
        {
            RetArr := mload(Data)
        }
    }
    function GetBytes20(uint Data)  internal pure returns (bytes20 RetArr)
    {
        assembly
        {
            RetArr := mload(Data)
            RetArr := and(RetArr, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000)
        }
    }

    function GetBytes10(uint Data)  internal pure returns (bytes10 RetArr)
    {
        assembly
        {
            RetArr := mload(Data)
            RetArr := and(RetArr, 0xFFFFFFFFFFFFFFFFFFFF00000000000000000000000000000000000000000000)
        }
    }

    function GetBytes(uint Data, uint16 size)  internal pure returns (bytes memory RetArr)
    {
        RetArr=new bytes(size);
        uint dest;
        assembly
        {
            dest := add(RetArr, 0x20)
        }
        MemCpy(dest,Data,size);
    }


    function Bytes32FromBytes(bytes memory Data)  internal pure returns (bytes32 RetArr)
    {
        uint ShrCount;
        if(Data.length<32)
            ShrCount=8*(32-Data.length);

        assembly
        {
            RetArr := mload(add(Data, 0x20))
            RetArr := shr(ShrCount,RetArr)
        }
    }


    function UintFromBytes(bytes memory Data)  internal pure returns (uint RetArr)
    {
        uint ShrCount;
        if(Data.length==0)
            return 0;
        if(Data.length<32)
            ShrCount=8*(32-Data.length);

        assembly
        {
            RetArr := mload(add(Data, 0x20))
            RetArr := shr(ShrCount,RetArr)
        }
    }
    function UintFromBytes10(bytes memory Data)  internal pure returns (uint Ret)
    {
        uint256 value = UintFromBytes(Data);

        uint256 Mult=1;
        while (value != 0)
        {
            uint256 B=value%16;
            require(B<10, "UintFromBytes10: Received a character in the range A-F");

            Ret = Ret + B*Mult;

            Mult = Mult*10;
            value = value >> 4;
        }

    }

    function GetUint1(uint Data) internal pure returns (uint8 Num)
    {
        assembly
        {
            Num := shr(248,mload(Data))
        }
    }

    function GetUint2(uint Data) internal pure returns (uint16 Num)
    {
        assembly
        {
            Num := shr(240,mload(Data))
        }
    }

    function GetUint3(uint Data) internal pure returns (uint24 Num)
    {
        assembly
        {
            Num := shr(232,mload(Data))
        }
    }

    function GetUint4(uint Data) internal pure returns (uint32 Num)
    {
        assembly
        {
            Num := shr(224,mload(Data))
        }
    }
    function GetUint5(uint Data) internal pure returns (uint40 Num)
    {
        assembly
        {
            Num := shr(216,mload(Data))
        }
    }
    function GetUint6(uint Data) internal pure returns (uint48 Num)
    {
        assembly
        {
            Num := shr(208,mload(Data))
        }
    }
    function GetUint8(uint Data) internal pure returns (uint64 Num)
    {
        assembly
        {
            Num := shr(192,mload(Data))
        }
    }







    //------------------------------------------------------------------------
    //-------------------------------- TERA encode library for Solidity
    //------------------------------------------------------------------------

    function EncodeUint(uint Buf,uint256 Value,uint16 size) pure internal
    {
        uint16 rotate=256-size*8;

        assembly
        {
            mstore(Buf, shl(rotate,Value))
        }
    }

    function EncodeArrConst(uint Buf,bytes32 Value) pure internal
    {
        assembly
        {
            mstore(Buf, Value)
        }
    }

    function EncodeBytes(uint Buf,bytes memory Value) pure internal
    {
        uint16 size=uint16(Value.length);

        uint src;
        assembly
        {
            src := add(Value, 0x20)
        }
        MemCpy(Buf,src,size);
    }




    //------------------------------------------------------------------------
    //Order lib
    //------------------------------------------------------------------------

    function CheckBufPos(bytes memory Buf,uint BufPos) pure internal
    {
        uint StartPos;
        assembly
        {
            StartPos := add(Buf,32)
        }
        StartPos+=Buf.length;
        require(StartPos>=BufPos,"Error BufPos");
    }

    //SizeMode: 2-from store,3-from extern tx
    function FillOrderBody(TypeOrder memory Order, bytes memory Buf, uint SizeMode)  internal  pure
    {
        /*
        TERA:
        Order.Gate=DecodeUint(Buf,4);
        Order.ID=DecodeUint(Buf,6);
        Order.AddrTera=DecodeUint(Buf,4);
        Order.AddrEth=GetHexFromArr(DecodeArrConst(Buf,20));
        Order.TokenID=GetHexFromArr(DecodeArr(Buf));
        Order.Amount=DecodeUint(Buf,8)/1e9;
        Order.TransferFee=DecodeUint(Buf,8)/1e9;
        Order.Description=DecodeStr(Buf);
        */

        require(SizeMode>=BUF_STORE,"FillOrderBody:SizeMode error");

        uint MustMinLength=4+6+4+20 +2 +8+8+2;


        if(SizeMode==BUF_EXTERN_FULL)
            MustMinLength+= 1+66;
        if(SizeMode==BUF_STORE)
            MustMinLength+= 1+66 + 8;
        //BUF_EXTERN_HEADER - not add

        require(Buf.length>=MustMinLength,"Error FillOrderBody Data length");

        uint16 size;


        uint BufPos=GetBufPos(Buf);

        Order.Gate=GetUint4(BufPos); BufPos+=4;
        Order.ID=GetUint6(BufPos);   BufPos+=6;


        Order.AddrTera=GetUint4(BufPos); BufPos+=4;
        Order.AddrEth=GetBytes20(BufPos);BufPos+=20;

        size=GetUint2(BufPos);BufPos+=2;
        Order.TokenID=GetBytes(BufPos,size);BufPos+=size;


        Order.Amount=GetUint8(BufPos); BufPos+=8;
        Order.TransferFee=GetUint8(BufPos); BufPos+=8;





        size=GetUint2(BufPos);BufPos+=2;
        Order.Description=GetBytes(BufPos,size);BufPos+=size;

        if(SizeMode==BUF_EXTERN_HEADER)//data from tx AddOrder
        {
            CheckBufPos(Buf,BufPos);
            return;
        }



        size=GetUint1(BufPos); BufPos++;

        if(size>0)
        {
            Order.SignArr=new TypeSigner[](size);
            for(uint8 i=0;i<size;i++)
            {
                TypeSigner memory Item=Order.SignArr[i];

                Item.Notary=GetUint1(BufPos); BufPos++;
                Item.SignR=GetBytes32(BufPos);BufPos+=32;
                Item.SignS=GetBytes32(BufPos);BufPos+=32;
                Item.SignV=GetUint1(BufPos);BufPos++;
            }
        }


        if(SizeMode==BUF_EXTERN_FULL)//data from tx ExecOrder
        {
            CheckBufPos(Buf,BufPos);
            return;
        }

        //data from state
        Order.NotaryFee=GetUint8(BufPos); BufPos+=8;
        CheckBufPos(Buf,BufPos);
    }

    //SizeMode: 1-for sign, 2-for save to store,3-for extern use (get full info)
    function GetBufFromOrder(TypeOrder memory Order,uint SizeMode) pure internal returns (bytes memory)
    {
        /*
        TERA:
        EncodeUint(Buf,Order.Gate,4);
        EncodeUint(Buf,Order.ID,6);
        EncodeUint(Buf,Order.AddrTera,4);
        EncodeArrConst(Buf,Order.AddrEth,20);
        EncodeArr(Buf,Order.TokenID);
        EncodeUint(Buf,FromFloat(Order.Amount),8);
        EncodeUint(Buf,FromFloat(Order.TransferFee),8);
        EncodeStr(Buf,Order.Description);
        */
        require(SizeMode>0,"GetBufFromOrder:SizeMode error");

        uint32 size1=uint32(Order.TokenID.length);
        uint32 size2=uint32(Order.Description.length);
        uint32 size3=uint32(Order.SignArr.length);
        uint Length=4+6+4+20+2+8+8+2+size1+size2;
        if(SizeMode>=BUF_STORE)
            Length+= 1 + size3*66 +  8;// + 1;

        if(SizeMode==BUF_EXTERN_FULL)
            Length+= 1 + 6+6;


        bytes memory Buf=new bytes(Length);

        uint BufPos=GetBufPos(Buf);



        EncodeUint(BufPos,Order.Gate,4);             BufPos+=4;
        EncodeUint(BufPos,Order.ID,6);               BufPos+=6;
        EncodeUint(BufPos,Order.AddrTera,4);         BufPos+=4;
        EncodeArrConst(BufPos,Order.AddrEth);        BufPos+=20;

        EncodeUint(BufPos,size1,2);                  BufPos+=2;
        EncodeBytes(BufPos,Order.TokenID);           BufPos+=size1;


        EncodeUint(BufPos,Order.Amount,8);           BufPos+=8;
        EncodeUint(BufPos,Order.TransferFee,8);      BufPos+=8;

        EncodeUint(BufPos,size2,2);                  BufPos+=2;
        EncodeBytes(BufPos,Order.Description);       BufPos+=size2;

        if(SizeMode==BUF_SIGN)//sign
            return Buf;

        EncodeUint(BufPos,size3,1);                  BufPos++;

        for(uint8 i=0;i<size3;i++)
        {
            TypeSigner memory Item=Order.SignArr[i];

            EncodeUint(BufPos,Item.Notary,1);     BufPos++;
            EncodeArrConst(BufPos,Item.SignR);    BufPos+=32;
            EncodeArrConst(BufPos,Item.SignS);    BufPos+=32;
            EncodeUint(BufPos,Item.SignV,1);      BufPos++;
        }


        EncodeUint(BufPos,Order.NotaryFee,8);     BufPos+=8;
//        EncodeUint(BufPos,Order.Process,1);       BufPos++;

        if(SizeMode==BUF_STORE)//store
        {
            CheckBufPos(Buf,BufPos);
            return Buf;
        }

        //full
        EncodeUint(BufPos,Order.Process,1);        BufPos++;

        EncodeUint(BufPos,Order.PrevID,6);         BufPos+=6;
        EncodeUint(BufPos,Order.NextID,6);         BufPos+=6;

        CheckBufPos(Buf,BufPos);
        return Buf;

    }



    function GetSignBufFromOrder(TypeOrder memory Order)  pure internal returns (bytes memory Buf)
    {
        Buf=GetBufFromOrder(Order,1);
    }


}
