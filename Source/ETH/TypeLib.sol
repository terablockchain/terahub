// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;


contract TypeLib
{
    //uint constant CONSENSUS_PERIOD_TIME = 3;
    //uint constant FIRST_TIME_BLOCK = 1593818071;//const from TERA 1/1000        Main-net:1403426400     Test-net: 1593818071

    uint constant BUF_SIGN    = 1;
    uint constant BUF_STORE   = 2;
    uint constant BUF_EXTERN  = 3;
    uint constant BUF_EXTERN2 = 4;

    struct TypeCommon
    {
        uint8  WORK_MODE;
        uint8 CONSENSUS_PERIOD_TIME;
        uint32 FIRST_TIME_BLOCK;//const from TERA 1/1000        Main-net:1403426400     Test-net: 1593818071
        uint32 CHANNEL;
        uint24 MAX_SIGN_PERIOD;
        uint24 MAX_TRANSFER_PERIOD;
        uint8 NOTARY_COUNT;
        uint8 MIN_SIGN_COUNT;

        uint48 RATE;//курс монеты к eth (в полях Amount и TransferFee) с точностью 1e-9
        uint24 MIN_NOTARY_FEE;//мин. комиссия с точностью 1e-6
        uint16 NOTARY_FEE;//коэффициент нотариальной комисии с точностью 1e-3

        uint24 MIN_DEPOSIT;//мин депозит в целых монетых Eth
        //32
    }

    struct TypeConf
    {
        uint40  WorkNum;
        uint40  FirstOrderID;
        uint40  LastOrderID;
        //15
    }



    struct TypeNotary
    {
        uint8 Notary;
        address Addr;
        uint8 CanSign;

        uint64 Deposit;//депозит Eth с точнсостью до 1e9
    }

    struct TypeSigner
    {
        uint8 Notary;
        bytes32 SignR;
        bytes32 SignS;
        uint8 SignV;
        uint8 Slash;
    }

    struct TypeOrder
    {
        uint32 Channel;
        uint40 ID;
        uint32  AddrTera;
        bytes20 AddrEth;
        bytes TokenID;
        uint64 Amount;//точность до 1e-9
        uint64 TransferFee;////точность до 1e-9
        bytes Description;

        uint8 Process;
        uint64 NotaryFee;//точность до 1e-9

        uint40 PrevID;
        uint40 NextID;

        uint40 BodyID;

        TypeSigner[] SignArr;

    }



}
