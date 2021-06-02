// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;



import "./TypeLib.sol";




contract DataLib is TypeLib
{
    address internal Owner;
    TypeCommon internal ConfCommon;
    TypeConf internal ConfData;//TERA->ETH
    //TypeConf internal ConfData2;//ETH->TERA

    //notary
    mapping(uint8 => TypeNotary) internal NotaryList;

    uint internal ExtData;


    //TokenERC20 internal Token;

    mapping(uint32 => TypeGate) internal GateList;




}


