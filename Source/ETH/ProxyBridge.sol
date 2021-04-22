// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;


import "./DataLib.sol";
import "./proxy/Proxy.sol";

contract ProxyBridge is  DataLib, Proxy
{
    address public SmartContract;
    uint constant DEVELOPING_MODE_PERIOD=90*24*3600;
    uint public StartDeveloperMode;

    constructor()
    {
        Owner = msg.sender;
    }

    function SetUpgrade(address Address)public
    {
        require(msg.sender == Owner,"Need only owner access");

        if(StartDeveloperMode>0)
            require(block.timestamp-StartDeveloperMode <= DEVELOPING_MODE_PERIOD,"Smart contract in immutable mode");

        SmartContract=Address;
        StartDeveloperMode=block.timestamp;
    }

    function _implementation() internal view override returns (address)
    {
        return SmartContract;
    }
}

