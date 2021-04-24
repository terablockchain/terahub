// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;


import "./OwnerLib.sol";

import "./token/ERC20/IERC20.sol";
import "./token/ERC721/IERC721.sol";
import "./token/ERC1155/IERC1155.sol";


interface IOwnTokenERC
{
    function SetSmart(address newOwner) external;
    function SmartMint(address account, uint256 id, uint Amount) external;
    function SmartBurn(address account, uint256 id, uint Amount) external;
}

contract BridgeERC20 is OwnerLib
{
    function SendOrMint(TypeGate memory Gate, address AddrEth, bytes memory OrderTokenID, uint256 Amount) internal
    {
        uint TokenID=UintFromBytes(OrderTokenID);

        if(Gate.WORK_MODE==OWN_MINT_MODE)
        {
            IOwnTokenERC(Gate.TokenAddr).SmartMint(AddrEth, TokenID, Amount);
        }
        else//NATIVE_ETH_MODE
        {
            if(Gate.TypeERC==0)//eth
            {
                payable(AddrEth).transfer(Amount*1e9);//9 - > 18
            }
            else
            if(Gate.TypeERC==1)//20
            {
                IERC20(Gate.TokenAddr).transferFrom(address(this), AddrEth, Amount);
            }
            else
            if(Gate.TypeERC==2)//721
            {
                IERC721(Gate.TokenAddr).transferFrom(address(this), AddrEth, TokenID);
            }
            else
            if(Gate.TypeERC==3)//1155
            {
                IERC1155(Gate.TokenAddr).safeTransferFrom(address(this), AddrEth, TokenID, Amount, "");
            }
            //TODO 1155 BatchTransfer
        }
    }


    function ReceiveOrBurn(TypeGate memory Gate, address AddrEth, bytes memory OrderTokenID, uint256 Amount) internal
    {
        uint TokenID=UintFromBytes(OrderTokenID);
        if(Gate.WORK_MODE==OWN_MINT_MODE)
        {
            IOwnTokenERC(Gate.TokenAddr).SmartBurn(AddrEth, TokenID, Amount);
        }
        else//NATIVE_ETH_MODE
        {
            if(Gate.TypeERC==0)//eth
            {
                //приводим полученные eth к стандартному формату (точность 1e-9)
                require(uint64(msg.value/1e9) >= Amount,"Error receive Amount");
            }
            else
            if(Gate.TypeERC==1)//20
            {
                //надо ли проверять IERC20.allowance() ??
                IERC20(Gate.TokenAddr).transferFrom(msg.sender, address(this), Amount);
            }
            else
            if(Gate.TypeERC==2)//721
            {
                IERC721(Gate.TokenAddr).transferFrom(msg.sender, address(this), TokenID);
            }
            else
            if(Gate.TypeERC==3)//1155
            {
                IERC1155(Gate.TokenAddr).safeTransferFrom(msg.sender, address(this), TokenID, Amount, "");
            }
            //TODO 1155 BatchTransfer
        }
    }



    //------------------------------------------------------------------------ Gate

    function GetGate(uint32 Num) public view returns(TypeGate memory)
    {
        return GateList[Num];
    }

    function SetGate(uint32 Num, TypeGate memory Gate) public OnlyOwner               //<------------------ owner
    {
        GateList[Num]=Gate;

        if(Gate.WORK_MODE==OWN_MINT_MODE)
            IOwnTokenERC(Gate.TokenAddr).SetSmart(address(this));

    }


//    function SetTokenERC(address Addr) public OnlyOwner
//    {
//        if (Addr != address(0))
//        {
//            Token = TokenERC20(Addr);
//            Token.SetSmart(address(this));
//        }
//    }
//    function SetTokenOwner(address Addr) public OnlyOwner
//    {
//        if (Addr != address(0))
//        {
//            Token.SetSmart(Addr);
//        }
//    }
//
//    function GetTokenERC() public view returns (TokenERC20)
//    {
//        return Token;
//    }
}
