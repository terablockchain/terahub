
// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;



import "./OwnerLib.sol";


contract NotaryLib is OwnerLib
{
    //------------------------------------------------------------------------ Notary

    function SetNotary(uint8 Notary,bytes memory Addr,uint64 Deposit, uint8 CanSign) public OnlyOwner       //<------------------ owner
    {

        require(Notary<=ConfCommon.NOTARY_COUNT, "Notary num cannot more NotaryCount");

        if(Notary==ConfCommon.NOTARY_COUNT)
            ConfCommon.NOTARY_COUNT++;

        NotaryList[Notary]=TypeNotary({Notary:Notary,Addr:GetAddrFromBytes(Addr),CanSign:CanSign, Deposit:Deposit});

    }

    function DeleteLastNotary() public OnlyOwner                                                            //<------------------ owner
    {

        require(ConfCommon.NOTARY_COUNT>0, "No Notary");

        ConfCommon.NOTARY_COUNT--;
        delete NotaryList[ConfCommon.NOTARY_COUNT];


    }



}
