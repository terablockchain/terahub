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
        uint TokenID=GetTokenID(OrderTokenID);

        if(Gate.WORK_MODE==ERC_MINT)
        {
            IOwnTokenERC(Gate.TokenAddr).SmartMint(AddrEth, TokenID, Amount);
        }
        else//ERC_OTHER
        {
            if(Gate.TypeERC==0)//eth
            {
                payable(AddrEth).transfer(Amount);
            }
            else
            if(Gate.TypeERC==20)
            {
                IERC20(Gate.TokenAddr).transfer(AddrEth, Amount);
            }
            else
            if(Gate.TypeERC==721)
            {
                IERC721(Gate.TokenAddr).safeTransferFrom(address(this), AddrEth, TokenID);
                //IERC721(Gate.TokenAddr).transferFrom(address(this), AddrEth, TokenID);
            }
            else
            if(Gate.TypeERC==1155)
            {
                IERC1155(Gate.TokenAddr).safeTransferFrom(address(this), AddrEth, TokenID, Amount, "");
            }

        }
    }


    function ReceiveOrBurn(TypeGate memory Gate, address AddrEth, bytes memory OrderTokenID, uint256 Amount) internal
    {
        uint TokenID=GetTokenID(OrderTokenID);

        if(Gate.WORK_MODE==ERC_MINT)
        {
            IOwnTokenERC(Gate.TokenAddr).SmartBurn(AddrEth, TokenID, Amount);
        }
        else//ERC_OTHER
        {
            if(Gate.TypeERC==0)//eth
            {
                require(uint64(msg.value) >= Amount,"Error receive Amount");
            }
            else
            if(Gate.TypeERC==20)
            {
                //надо ли проверять IERC20.allowance() ??
                IERC20(Gate.TokenAddr).transferFrom(msg.sender, address(this), Amount);
            }
            else
            if(Gate.TypeERC==721)
            {
                IERC721(Gate.TokenAddr).transferFrom(msg.sender, address(this), TokenID);
            }
            else
            if(Gate.TypeERC==1155)
            {
                IERC1155(Gate.TokenAddr).safeTransferFrom(msg.sender, address(this), TokenID, Amount, "");
            }

        }
    }

    function GetTokenID(bytes memory Data)  internal pure returns (uint TokenID)
    {
        if(Data.length<32)
            TokenID=UintFromBytes10(Data);
        else
            TokenID=UintFromBytes(Data);
    }


    //------------------------------------------------------------------------ Gate

    function GetGate(uint32 Num) public view returns(TypeGate memory)
    {
        return GateList[Num];
    }

    function SetGate(uint32 Num, TypeGate memory Gate) public OnlyOwner               //<------------------ owner
    {
        GateList[Num]=Gate;

        if(Gate.WORK_MODE==ERC_MINT)
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
