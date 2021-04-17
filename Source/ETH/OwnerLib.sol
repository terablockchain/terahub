// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;

import "./StorageLib.sol";

contract OwnerLib is StorageLib
{

    modifier OnlyOwner()
    {
        require(msg.sender == Owner,"Need only owner access!!");
        _;
    }


    function SetOwner(address newOwner) public OnlyOwner
    {
        if (newOwner != address(0))
        {
            Owner = newOwner;
        }
    }

}

