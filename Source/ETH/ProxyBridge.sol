// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;


import "./DataLib.sol";
import "./proxy/Proxy.sol";

contract ProxyBridge is  DataLib, Proxy
{
    address public SmartContract;

    constructor()
    {
        Owner = msg.sender;
    }

    function SetUpgrade(address Address)public
    {
        require(msg.sender == Owner,"Need only owner access");
        SmartContract=Address;
    }

    function _implementation() internal view override returns (address)
    {
        return SmartContract;
    }
}

