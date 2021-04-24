// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;



import "./DataLib.sol";
import "./ConvertLib.sol";


//серилизация/десерилизация с хранилищем

contract StorageLib is DataLib, ConvertLib
{


//    //------------------------------------------------------------------------ Token conf slots
//    function GetTokenConf(uint ID)internal view returns (TypeGate memory Data)
//    {
//        uint PosHeader=(0xABCD<<240) | (ID<<192);
//        // solhint-disable-next-line no-inline-assembly
//        assembly
//        {
//            //Data := sload(PosHeader) - низзя так
//        }
//    }
//
//    function SetTokenConf(uint ID, TypeGate memory Data)internal
//    {
//        uint PosHeader=(0xABCD<<240) | (ID<<192);
//
//        // solhint-disable-next-line no-inline-assembly
//        assembly
//        {
//            //sstore(PosHeader, Data) - низзя так
//        }
//    }


    //------------------------------------------------------------------------ Order slots

    function SaveHeaderBytes(uint ID,uint HeaderData)internal
    {
        uint PosHeader=(0xABCE<<240) | (ID<<192);

        // solhint-disable-next-line no-inline-assembly
        assembly
        {
            sstore(PosHeader, HeaderData)
        }
    }

    function LoadHeaderBytes(uint ID)internal view returns (uint HeaderData)
    {
        uint PosHeader=(0xABCE<<240) | (ID<<192);
        // solhint-disable-next-line no-inline-assembly
        assembly
        {
            HeaderData := sload(PosHeader)
        }
    }


    function SaveBodyBytes(uint BodyID,bytes memory data)internal
    {

        uint PosBody = (0xABCE<<240) | (BodyID<<192) | 1;
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

        uint PosBody = (0xABCE<<240) | (BodyID<<192) | 1;
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



}


