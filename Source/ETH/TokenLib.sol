// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;

import "./OwnerLib.sol";
import "./TokenERC20.sol";


contract BridgeERC20 is OwnerLib
{
    TokenERC20 public Token;


    function SetTokenERC(address Addr) public OnlyOwner
    {
        if (Addr != address(0))
        {
            Token = TokenERC20(Addr);
            Token.SetSmart(address(this));
        }
    }
    function SetTokenOwner(address Addr) public OnlyOwner
    {
        if (Addr != address(0))
        {
            Token.SetSmart(Addr);
        }
    }
}
