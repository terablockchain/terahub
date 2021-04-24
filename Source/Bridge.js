


//--------------------------------------
//BRIDGE Smart contract
//--------------------------------------


function OnGet()
{
    if(typeof context.Description==="string" && context.Description.substr(0,1)==="{")
    {
        if(SetState())
            return;
    }
}





function ReadStorage()
{
    return ReadValue("INFO");
}



"public"
function SendOrder(Params)
{
    CheckSenderPermission();

    var Info=ReadStorage();
    var NotaryAcc=Info.NotarySmartAcc;
    if(!NotaryAcc)
        throw "Error: Not set NotarySmartAcc";

    var Total=Round(Params.Amount+Params.TransferFee+Params.NotaryFee);
    if(!Total || typeof Total!=="number")
        throw "Error total amount";

    Send(context.Smart.Account, COIN_FROM_FLOAT2(Total), Params.Description);

    Params.cmd="AddOrder";
    var FeeCoin=COIN_FROM_FLOAT2(Params.NotaryFee);
    Move(context.Smart.Account,NotaryAcc,FeeCoin,Params);
    Event(Params);

}



"public"
function Refund(Order)
{
    if(!context.SmartMode)
        throw "Need run in smart mode";


    var Total=Order.Amount+Order.TransferFee+Order.NotaryFee;
    Send(Order.AddrTera, COIN_FROM_FLOAT2(Total), "Refund");

    Event(Order);
}


//--------------------------------------
//В блокчейне 2
//--------------------------------------предъявление на оплату входящего ордера из другого блокчейна

"public"
function Order(Params)
{
    //Проверяем параметры (дата входящего ордера еще не истекла)
    //Проверяем подписи
    //Ставим признак что ордер выполнен (для защиты от дублей) и добавляем в отдельный список
    //Переводим средства

    //отдельно процесс по удалению старых ордеров из списка
}


//--------------------------------------

"public"
function SetKey(Params)
{
    CheckOwnerPermission();
    WriteValue(Params.Key,Params.Value,Params.Format);
}



"public"
function RemoveKey(Params)
{
    CheckOwnerPermission();
    return RemoveValue(Params.Key);
}




//Lib
function CheckOwnerPermission()
{
    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account";
}

function CheckSenderPermission()
{
    if(context.FromNum!==context.Account.Num)
        throw "Access is only allowed from Sender account";
}



function SetState()
{
    if(context.Account.Num===context.Smart.Account
        && context.FromNum===context.Smart.Owner
        && context.Description.substr(0,1)==="{")
    {

        var State=ReadState(context.Smart.Account);
        var Data=JSON.parse(context.Description);
        for(var key in Data)
            State[key]=Data[key];

        WriteState(State);
        Event(State);
        return 1;
    }
    return 0;
}



//-------------------------------------- for test mode only


"public"
function GetChannel(Params)
{
    return {};
}


function WriteStorage(Item)
{
    WriteValue("INFO",Item);
}

"public"
function SetInfo(Params)
{
    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account";

    WriteStorage(Params);
}

//for static call

"public"
function GetInfo(Params)
{
    return ReadStorage(Params);
}

"public"
function GetKey(Params)
{
    return ReadValue(Params.Key,Params.Format);
}

//--------------------------------------

//lib


function RunEvent(Name,Data)
{
    Event({"cmd":Name,Data:Data});
}


function GetOrderBlockNum(Order)
{
    return Math.floor(Order.ID/1000);
}

function Round(Sum)
{
    return Math.floor(0.5+Sum*1e9)/1e9;
}


function COIN_FROM_FLOAT2(Sum)
{
    var MAX_SUM_CENT = 1e9;
    var SumCOIN=Math.floor(Sum);
    var SumCENT = Math.floor((Sum+0.0000000001) * MAX_SUM_CENT - SumCOIN * MAX_SUM_CENT);
    var Coin={SumCOIN:SumCOIN,SumCENT:SumCENT};
    return Coin;
}


/*


{
    "EthSmartAddr": "0xbc4d60aa28ab4e8f51c469917a7d2b5cba46c740",
    "SignLib": 283,
    "Common": {
        "Pause": 0,
        "SignPeriod": 14400,
        "TransferPeriod": 28800,
        "NotaryFee": 0.01,
        "MinNotaryFee": 0,
        "MinDeposit": 100000,
        "NotaryArr": [
            {
                "Addr": "B13151395FD30AE79E6DB58E35C9BBA12FA8FF63",
                "AccDeposit": 0,
                "SumDeposit": 240012.30000000002,
                "CanSign": 1,
                "BlockFrom": 0,
                "BlockTo": 0,
                "Gates": [
                    1,
                    2,
                    3
                ]
            }
        ],
        "MinSign": 1,
        "SlashRate": 1,
        "MinSlash": 1000
    },
    "Gates": {
        "1": {
            "ID": 1,
            "OrderEnum": 1,
            "ChainName": "ETH",
            "EthNetworkId": 4,
            "TokenId": 0,
            "TokenName": "TERA",
            "Decimals": 9,
            "TokenAcc": 891,
            "Rate": 8000,
            "Pause": 0
        },
        "2": {
            "ID": 2,
            "OrderEnum": 2,
            "ChainName": "BSC",
            "EthNetworkId": 97,
            "TokenId": 0,
            "TokenName": "TERA",
            "Decimals": 9,
            "TokenAcc": 891,
            "Rate": 2000,
            "Pause": 0
        },
        "3": {
            "ID": 3,
            "OrderEnum": 1,
            "ChainName": "ETH",
            "EthNetworkId": 4,
            "TokenId": 10,
            "TokenName": "USD",
            "Decimals": 6,
            "TokenAcc": 522,
            "Rate": 0.03,
            "Pause": 0
        }
    },
    "Orders": {
        "HeadID": 848449601001,
        "TailID": 848345100000,
        "NewOrderID": 848379200000,
        "WorkNum": 9
    },
    "cmd": "SetCommon"
}

 */