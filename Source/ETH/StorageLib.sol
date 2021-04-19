// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;



import "./DataLib.sol";
import "./ConvertLib.sol";


//серилизация/десерилизация с хранилищем

contract StorageLib is DataLib, ConvertLib
{

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

    function SaveHeaderBytes(uint ID,uint HeaderData)internal
    {
        uint PosHeader=(0xABCE<<240) | (ID<<200);

        // solhint-disable-next-line no-inline-assembly
        assembly
        {
            sstore(PosHeader, HeaderData)
        }
    }

    function LoadHeaderBytes(uint ID)internal view returns (uint HeaderData)
    {
        uint PosHeader=(0xABCE<<240) | (ID<<200);
        // solhint-disable-next-line no-inline-assembly
        assembly
        {
            HeaderData := sload(PosHeader)
        }
    }


    function SaveBodyBytes(uint BodyID,bytes memory data)internal
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

    function LoadBodyBytes(uint BodyID,uint Length)internal view returns (bytes memory)
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
//        SaveHeaderBytes(Type,ID,FData);
//
//        //2 body
//        SaveBodyBytes(Type,BodyID,data);
//    }

//    function LoadBytes(uint ID)internal view returns (bytes memory)
//    {
//        uint Type=1;
//
//        //1 header
//
//        uint FData=LoadHeaderBytes(Type,ID);
//
//        uint Length=(FData>>240) & 0xFFFFFFFFFF;
//        uint PrevID=(FData>>200) & 0xFFFFFFFFFF;
//        uint NextID=(FData>>160) & 0xFFFFFFFFFF;
//        uint BodyID=(FData>>120) & 0xFFFFFFFFFF;
//
//
//        return LoadBodyBytes(Type,BodyID,Length);
//
//    }

}


