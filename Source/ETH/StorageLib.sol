// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;



import "./TypeLib.sol";
import "./ConvertLib.sol";


//серилизация/десерилизация с хранилищем

contract StorageLib is TypeLib, ConvertLib
{
    address Owner;
    TypeCommon internal ConfCommon;
    TypeConf internal ConfData1;//TERA->ETH
    TypeConf internal ConfData2;//ETH->TERA

    //notary
    mapping(uint8 => TypeNotary) public NotaryList;

    //order list
    //mapping(uint48 => bytes) OrderBufList;

//    string public LogName;
//    uint public LogValue;
    //------------------------------------------------------------------------ Conf



//    function SaveConf(TypeConf memory Conf)internal
//    {
//        ConfData1=Conf;
//        //ConfData=GetBufFromConf(Conf);
//    }
//    function LoadConf()  internal  view returns (TypeConf memory)
//    {
//        return ConfData1;
//        //return GetConfFromBuf(ConfData);
//    }
//
//
//    function SaveConf2(TypeConf memory Conf)internal
//    {
//        ConfData2=Conf;
//        //ConfData2=GetBufFromConf(Conf);
//    }
//    function LoadConf2()  internal  view returns (TypeConf memory)
//    {
//        return ConfData2;
//        //return GetConfFromBuf(ConfData2);
//    }
//


    //------------------------------------------------------------------------ Slots

    function SaveHeader(uint ID,uint HeaderData)internal
    {
        uint PosHeader=(0xABCE<<240) | (ID<<200);

        // solhint-disable-next-line no-inline-assembly
        assembly
        {
            sstore(PosHeader, HeaderData)
        }
    }

    function LoadHeader(uint ID)internal view returns (uint HeaderData)
    {
        uint PosHeader=(0xABCE<<240) | (ID<<200);
        // solhint-disable-next-line no-inline-assembly
        assembly
        {
            HeaderData := sload(PosHeader)
        }
    }


    function SaveBody(uint BodyID,bytes memory data)internal
    {

        uint PosBody = (0xABCE<<240) | (BodyID<<200) | 1;
        uint PosData;
        assembly
        {
            PosData := add(data,32)
        }
        int Counter=int(data.length);
        while(Counter>0)
        {
            // solhint-disable-next-line no-inline-assembly
            assembly
            {
                sstore(PosBody, mload(PosData))
            }


            PosBody+=32;
            PosData+=32;
            Counter-=32;
        }
    }

    function LoadBody(uint BodyID,uint Length)internal view returns (bytes memory)
    {

        uint PosBody = (0xABCE<<240) | (BodyID<<200) | 1;
        bytes memory Buf=new bytes(Length);
        uint PosData;
        assembly
        {
            PosData := add(Buf,32)
        }

        int Counter=int(Length);
        while(Counter>0)
        {
            assembly
            {
                mstore(PosData, sload(PosBody))
            }


            PosBody+=32;
            PosData+=32;
            Counter-=32;
        }



        return Buf;
    }


//    function SaveBytes(uint ID,uint BodyID,bytes memory data)internal
//    {
//        uint Type=1;
//        uint PrevID=0;
//        uint NextID=0;
//
//
//        //1 header
//        uint FData=(data.length<<240)  | (PrevID<<200) | (NextID<<160) | (BodyID<<120);
//        SaveHeader(Type,ID,FData);
//
//        //2 body
//        SaveBody(Type,BodyID,data);
//    }

//    function LoadBytes(uint ID)internal view returns (bytes memory)
//    {
//        uint Type=1;
//
//        //1 header
//
//        uint FData=LoadHeader(Type,ID);
//
//        uint Length=(FData>>240) & 0xFFFFFFFFFF;
//        uint PrevID=(FData>>200) & 0xFFFFFFFFFF;
//        uint NextID=(FData>>160) & 0xFFFFFFFFFF;
//        uint BodyID=(FData>>120) & 0xFFFFFFFFFF;
//
//
//        return LoadBody(Type,BodyID,Length);
//
//    }

}


