// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;



import "./TypeLib.sol";
import "./TokenERC20.sol";


//серилизация/десерилизация с хранилищем

contract DataLib is TypeLib
{
    address internal Owner;
    TypeCommon internal ConfCommon;
    TypeConf internal ConfData1;//TERA->ETH
    //TypeConf internal ConfData2;//ETH->TERA

    //notary
    mapping(uint8 => TypeNotary) internal NotaryList;

    uint internal ExtData;


    TokenERC20 internal Token;




}


