//--------------------------------------
//BRIDGE Smart contract
//--------------------------------------

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

    Send(context.Smart.Account, Params.Amount, Params.Description);

    // var NeedFee=Info.Fee?Info.Fee*Params.Amount:0;
    // NeedFee=Math.max(NeedFee,Info.MinFee);

    Params.cmd="AddOrder";
    Move(context.Smart.Account,NotaryAcc,Params.Fee,Params);
    Event(Params);

}



"public"
function Refund(Order)
{
    if(!context.SmartMode)
        throw "Need run in smart mode";

    Event("Refund: "+FLOAT_FROM_COIN(context.Value));
    //Event(Order);
}


//--------------------------------------
//В блокчейне 2
//--------------------------------------предъявление на оплату входящего ордера из другого блокчейна

"public"
function Order(Params)
{
    //Проверяем параметры (дата входящего ордера еще не истекла)
    //Проверяем подписи
    //Ставим признак что ордер выполнен (для защиты от дублей)
    //Переводим средства
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


// function OnGet()//getting coins
// {
//     if(context.SmartMode)
//     {
//         var Item=context.Description;
//         if(typeof Item==="object")
//         {
//             Event(Item);
//         }
//     }
// }
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

