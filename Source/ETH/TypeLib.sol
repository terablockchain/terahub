// SPDX-License-Identifier: TERA

pragma solidity ^0.7.3;


contract TypeLib
{
    //uint constant CONSENSUS_PERIOD_TIME = 3;
    //uint constant FIRST_TIME_BLOCK = 1593818071;//const from TERA 1/1000        Main-net:1403426400     Test-net: 1593818071

    uint constant BUF_SIGN    = 1;
    uint constant BUF_STORE   = 2;
    uint constant BUF_EXTERN_FULL  = 3;
    uint constant BUF_EXTERN_HEADER = 4;

    uint constant ERC_SKIP = 1;
    uint constant ERC_MINT = 2;
    uint constant ERC_OTHER = 3;

    struct TypeCommon
    {
        uint8  WORK_MODE;
        uint8 CONSENSUS_PERIOD_TIME;
        uint32 FIRST_TIME_BLOCK;//const from TERA 1/1000        Main-net:1403426400     Test-net: 1593818071
        uint24 MAX_SIGN_PERIOD;
        uint24 MAX_TRANSFER_PERIOD;
        uint8 NOTARY_COUNT;
        uint8 MIN_SIGN_COUNT;

        uint48 MinNotaryFee;//мин. комиссия с точностью 1e-9
        uint48 NotaryFee;//коэффициент нотариальной комисии с точностью 1e-9
        uint48 MinDeposit;//мин депозит с точностью 1e-9


        uint16 SlashRate;//множитель слэшинга (тока целые множители)
        uint48 MinSlash;//точность 1e-9

        uint8 OrderEnum;//0-99: 0=Tera, 1=Eth, 2=BSC

    }

    struct TypeGate
    {
        address TokenAddr;
        uint8  WORK_MODE;//0 - pause, 1 - skip, 2 - own mint (from tera), 3 - other token
        uint16  TypeERC;//0 - eth, 20-erc20, 721-erc721, 1155-1155
        uint48 Rate;//курс монеты к eth (в полях Amount и TransferFee) с точностью 1e-9
        uint8 Decimals;
    }

    struct TypeConf
    {
        uint48  WorkNum;
        uint48  HeadOrderID;
        uint48  TailOrderID;
        uint48  NewOrderID;
        //24
    }



    struct TypeNotary
    {
        uint8 Notary;
        address Addr;
        uint8 CanSign;

        uint64 SumDeposit;//депозит Eth с точнсостью до 1e9
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
        uint32 Gate;
        uint48 ID;
        uint32  AddrTera;
        bytes20 AddrEth;
        bytes TokenID;
        uint64 Amount;//точность до 1e-9
        uint64 TransferFee;////точность до 1e-9
        bytes Description;

        uint8 Process;
        uint64 NotaryFee;//точность до 1e-9

        uint48 PrevID;
        uint48 NextID;

        uint48 BodyID;
        uint16 BodyLength;

        TypeSigner[] SignArr;

    }



}
