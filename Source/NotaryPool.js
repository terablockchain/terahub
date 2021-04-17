//Smart-contract:NotaryPool


function OnGet()//getting coins
{
    if(context.SmartMode)
    {
        var Item=context.Description;
        if(typeof Item==="object")
        {
            var Map={AddOrder:AddOrder, Deposit:Deposit, Withdraw:Withdraw, Refund:Refund};
            return Map[Item.cmd](Item);
        }
    }
    else
    if(context.Description.substr(0,1)==="{")
    {
        if(SetState())
            return;
    }
}

//-------------------------------------- СТРУКТУРА ХРАНЕНИЯ
// Адресация канала "CHANNEL2":SmartAccount
// Адресация ордера "ORDER2":ID


function FormatChannel()
{
    return {
        Name:"str",
        AccountFrom:"uint32",//канал разрешенных вызовов
        Pause:"uint32",
        SignPeriod:"uint32",//период для подписи (в блоках)
        TransferPeriod:"uint32",//устаревание ордеров (в блоках)

        NotaryFee:"double", MinNotaryFee:"double",//комиссии за подпись (в Терах)
        MinDeposit:"double", //депозит в Терах

        //подписанты (валидаторы)
        NotaryArr:[{Name:"str",Addr:"arr20",AccDeposit:"uint32",SumDeposit:"double", CanSign:"byte", BlockFrom:"uint", BlockTo:"uint"}],
        MinSign:"uint16",//требуемое минимальное число подписей

        //штрафные санкции
        SlashRate:"double",MinSlash:"double",

        NextID:"uint",
        NextID2:"uint",

        SignLib:"uint32",

        WorkNum:"uint32",
        WorkDel:"uint",

        Flag:"uint",
        Rate:"double"//курс для расчета комисии в Терах из (Order.Amount+Order.TransferFee)
    };
}


function FormatOrder()
{
    return  {
        //Body:
        Channel:"uint32", ID:"uint",AddrTera:"uint32",AddrEth:"str",TokenID:"arr32",Amount:"double",TransferFee:"double",Description:"str",
        //Signs:
        SignArr:[{Notary:"byte",Sign:"arr65",Slash:"byte"}],
        //State:
        Process:"byte",NotaryFee:"double", NextID:"uint", Flag:"uint"
    };
}




//-------------------------------------- DB

function ReadChannel(AccountFrom)
{
    return ReadValue("CHANNEL3:"+AccountFrom,FormatChannel());
}
function WriteChannel(Item)
{
    WriteValue("CHANNEL3:"+Item.AccountFrom,Item,FormatChannel());
}


function ReadOrder(ID)
{
    return ReadValue("ORDER3:"+ID,FormatOrder());
}

function WriteOrder(Order)
{
    if(!Order.ID)
        throw "Error Order.ID";
    WriteValue("ORDER3:"+Order.ID,Order,FormatOrder());
}
function DeleteOrder(Order)
{
    if(!Order.ID)
        throw "Error Order.ID";
    RemoveValue("ORDER3:"+Order.ID);
}


//-------------------------------------- добавление нового ордера
//Order: {From,To,Amount,TransferFee,Description}
//
"public"
function AddOrder(Data)//OnGet
{
    if(!context.SmartMode)
        throw "Need run in smart mode";
    // if(context.TrNum>=1000)
    //     throw "Big tx num, try later";

    var AccountFrom=context.FromNum;
    if(typeof Data!=="object")
        throw "AddOrder: Error type Data";

    if(typeof Data.AddrTera!=="number" || !Data.AddrTera)
        throw "Error 'AddrTera' value";
    // if(typeof Data.AddrEth==="string")
    //     Data.AddrEth=GetArrFromHex(Data.AddrEth);
    if(!Data.AddrEth.length)
        throw "Error 'To' value";
    if(typeof Data.Description!=="string" || Data.Description.length>300)
        throw "Error length 'Description'";


    //смотрим имеет ли право смарт - отправитель перевода добавлять ордера
    var Info=ReadChannel(AccountFrom);
    if(!Info)
        throw "Error channel sender="+AccountFrom;


    //проверка имеет ли право этот аккаунт принимать запросы и соотв. деньги
    if(context.Account.Num!==context.Smart.Account)
        throw "Error account receiver: "+context.Account.Num+"/"+context.Smart.Account;

    if(Info.Pause)
        throw "Pause";


    //расчет номера ордера внутри блока
    var OrderNum=1;
    if(Math.floor(Info.NextID/1000)===context.BlockNum)
        OrderNum = (Info.NextID%1000)+2;
    if(OrderNum>=1000)
        throw "Big tx num, try later, OrderNum="+OrderNum;
    var ID=context.BlockNum*1000 + OrderNum;



    var Order=
        {
            Channel:AccountFrom,
            ID:ID,//context.BlockNum*1000+context.TrNum,

            AddrTera:Data.AddrTera,
            AddrEth:Data.AddrEth,
            Amount:parseFloat(Data.Amount),
            TransferFee:parseFloat(Data.TransferFee),
            Description:Data.Description,

            Process:0,
            NotaryFee:FLOAT_FROM_COIN(context.Value),
            SignArr:[],
            NextID:Info.NextID,
        };





    var NeedFee=Info.Rate*Info.NotaryFee*(Order.Amount+Order.TransferFee);
    NeedFee=Round(Math.max(NeedFee,Info.MinNotaryFee));
    if(NeedFee && NeedFee-Order.NotaryFee>1e-9)
        throw "Error Notary fee="+Order.NotaryFee+" Fee must: "+NeedFee;


    WriteOrder(Order);
    RunEvent("Order",Order);

    //  if(Info.NextID===Order.ID)
    //     throw "Was Order.ID="+Order.ID;

    Info.NextID=Order.ID;
    Info.WorkNum++;
    WriteChannel(Info);

    //Event(Info);
}



//-------------------------------------- задание параметров канала

"public"
function SetChannel(Params)
{
    CheckPermission();

    var Info=ReadChannel(Params.AccountFrom);
    if(Info)
    {
        Params.NextID=Info.NextID;
        Params.NextID2=Info.NextID2;
        Params.WorkNum=Info.WorkNum;
        Params.WorkDel=Info.WorkDel;
    }
    else
    {
        Params.NextID=0;
        Params.NextID2=0;
        Params.WorkNum=0;
        Params.WorkDel=0;
    }

    for(var i=0;i<Params.NotaryArr.length;i++)
    {
        var Item=Params.NotaryArr[i];
        Item.Addr=GetArrFromHex(Item.Addr);
    }


    WriteChannel(Params);
    RunEvent("Channel",Params);
    //Event("OK "+Params.Account);
}



"public"
function GetChannel(Params)
{
    var Channel=ReadChannel(Params.Channel);
    return Channel;
}








//--------------------------------------подпись валидатора Params:{ID,Notary}, ParamSign:arr65
"public"
function NotarySign(Params, ParamSign)
{
    //1.Проверяем параметры, что ордер не устарел (SignPeriod)
    //2.Проверка разрешения вызова - нотариус в списке подписантов
    //3.Проверяем что у валидатора есть минимальный депозит (SumDeposit/MinDeposit)
    //4.Проверяем что этот валидатор еще не подписывал
    //5.Проверяем подпись
    //6.Добавляем в массив подписей
    //7.Если достаточное число подписей - ставим признак Process=1
    //8.Записываем признак апдейта в канал

    if(Params.ID%2!==1)
        throw "Error Mode Order ID="+Params.ID;

    var Order=ReadOrder(Params.ID);
    if(!Order)
        throw "Error Order ID="+Params.ID;
    var Info=ReadChannel(Order.Channel);
    if(!Info)
        throw "Error Order Channel = "+Order.Channel;

    //1
    var BlockNum=GetOrderBlockNum(Params);
    if(BlockNum+Info.SignPeriod<context.BlockNum)
        throw "Order is outdated (BlockNum="+BlockNum+")";

    //2
    var Notary=Params.Notary;
    var InfoItem=Info.NotaryArr[Notary];
    if(!InfoItem)
        throw "Error Notary number";
    //3
    if(InfoItem.SumDeposit<Info.MinDeposit)
        throw "No deposit required ("+InfoItem.SumDeposit+"/"+Info.MinDeposit+")";
    //4
    if(HasSign(Order,Notary))
        throw "There was already a signature";

    //5
    CheckSign(Info.SignLib,Order,InfoItem.Addr,ParamSign);

    //6
    Order.SignArr.push({Notary:Notary,Sign:ParamSign});

    //7
    if(Order.SignArr.length===Info.MinSign)
        Order.Process=1;

    WriteOrder(Order);
    RunEvent("Sign",Order);

    //8
    Info.WorkNum++;
    WriteChannel(Info);

}




//--------------------------------------доказательство обмана Params:{Notary, Channel,ID, From,To,Amount,TransferFee,Description}, ParamSign:arr65
"public"
function SlashProof(Params,ParamSign)
{
    //1.Проверяем валидность канала
    //2.Проверяем валидность номера нотариуса
    //3.Проверяем время ордера меньше TransferPeriod
    //4.Проверяем время ордера больше SignPeriod
    //5.Проверяем подпись
    //6.Проверяем что такой подписи в ордере нет
    //7.Новые ордера добавляем в отдельный список фейковых ордеров
    //8.Добавляем подпись в ордер для предотвращения дальнейших штрафов с такой подписью и ставим Slash=1
    //9.Устанавливаем в ордере NotaryFee = 0
    //10.Штрафуем валидаторов (списанием с депозита), за основу берем большую сумму между полученным ордером и записанным в БД (так как может быть ситуация когда пришедший ID - "левый")
    //11.Записываем признак апдейта в канал


    if(!Params.ID || typeof Params.ID!=="number")
        throw "Error Order ID="+Params.ID;

    if(Params.ID%2!==1)
        throw "Error Mode Order ID="+Params.ID;

    //1
    var Info=ReadChannel(Params.Channel);
    if(!Info)
        throw "Error channel";

    //2
    var Notary=Params.Notary;
    var InfoItem=Info.NotaryArr[Notary];
    if(!InfoItem)
        throw "Error Notary number";

    var BlockNum=GetOrderBlockNum(Params);
    //3
    if(BlockNum+Info.TransferPeriod<=context.BlockNum)
        throw "No Transfering period. Bad order time (BlockNum="+BlockNum+")";
    //4
    if(BlockNum+Info.SignPeriod>=context.BlockNum)
        throw "No Slashing period. Bad order time (BlockNum="+BlockNum+")";


    //5
    CheckSign(Info.SignLib,Params,InfoItem.Addr,ParamSign);
    var ParamSignStr=GetHexFromArr(ParamSign);

    //6
    var OrderDB=ReadOrder(Params.ID);
    if(OrderDB)
    {
        var SignArr=OrderDB.SignArr;
        for(var i=0;i<SignArr.length;i++)
        {
            if(GetHexFromArr(SignArr[i].Sign)===ParamSignStr)
                throw "This signature was already there";
        }
    }
    else
    {
        OrderDB=Params;
        OrderDB.SignArr=[];
        OrderDB.NotaryFee=0;
        OrderDB.Process=200;

        //7
        OrderDB.NextID=Info.NextID2;
        Info.NextID2=OrderDB.ID;
    }

    //8
    OrderDB.SignArr.push({Notary:Notary,Sign:ParamSign,Slash:1});
    //9
    OrderDB.NotaryFee=0;

    WriteOrder(OrderDB);
    RunEvent("Slash",OrderDB);

    //10
    var SlashSum=Info.SlashRate*Math.max(OrderDB.Amount+OrderDB.TransferFee, Params.Amount+Params.TransferFee);
    if(SlashSum<Info.MinSlash)
        SlashSum=Info.MinSlash;
    //отнимаем из депозита
    InfoItem.SumDeposit-=SlashSum;
    if(InfoItem.SumDeposit<0)
    {
        InfoItem.SumDeposit=0;
    }

    //11
    Info.WorkNum++;
    WriteChannel(Info);
    //Event(Info);
}



//--------------------------------------очистка старых ордеров + начисление комиссии валидаторам {ID}
"public"
function ClearOrderList(Params)
{
    //На вход подается начальный номер ордера для перебора
    //1. Ищем конец (макс 20 переборов)//500 тиков каждый
    //2. Начиная с конца перебираем ордера и смотрим дату, если устарели (TransferPeriod) то удаляем (макс 5 штук)//1000 тиков каждый
    //3. Если Order.Process==1 и есть NotaryFee, то одинаковыми частями начисляем награду валидаторам - в массив NotaryArr.SumDeposit
    //4. Удаляем ордер
    //5. Выдавать Event для коректировки начального номера
    //6. Записываем информацию по каналу обмена

    //1
    var Arr=[];
    var Order;
    var ID=Params.ID;
    while(1)
    {
        Order=ReadOrder(ID);
        if(!Order)
            break;

        Arr.unshift(Order);
        if(Arr.length>20)
            throw "Error - not start order ID = "+ID;

        ID=Order.NextID;
    }

    var Count=Math.min(Arr.length,5);
    if(!Count)
        return;

    var Info=ReadChannel(Arr[0].Channel);

    //2
    for(var n=0;n<Count;n++)
    {
        Order=Arr[n];
        var BlockNum=GetOrderBlockNum(Order);

        if(BlockNum+Info.TransferPeriod>=context.BlockNum)
            break;

        //3
        var LSigns=Order.SignArr.length;
        if(Order.Process===1 && Order.NotaryFee && LSigns)
        {
            //рассчитываем коэффициент выплаты
            var K=1/LSigns;
            for(var i=0;i<LSigns;i++)
            {
                var Item=Order.SignArr[i];
                var NotaryItem=Info.NotaryArr[Item.Notary];
                if(NotaryItem && !Item.Slash)
                {
                    NotaryItem.SumDeposit+=Order.NotaryFee*K;
                }
            }
        }

        //4
        DeleteOrder(Order);


        //5
        Info.WorkDel=Order.ID;
        RunEvent("Delete",Order);

    }

    //6
    Info.WorkNum++;
    WriteChannel(Info);

}



//--------------------------------------возврат средств с неподписанного ордера
"public"
function CancelOrder(Params)
{
    //1. Проверяем что Process===0
    //2. Проверяем время ордера больше SignPeriod
    //3. Устанавливаем в ордере признак обработанности Process=100
    //4. Возвращаем средства
    //5.Записываем признак апдейта в канал


    var Order=ReadOrder(Params.ID);
    if(!Order)
        throw "Error Order ID="+Params.ID;

    var Info=ReadChannel(Order.Channel);

    //1
    if(Order.Process!==0)
        throw "The order has already been processed. Process="+Order.Process;

    //2
    var BlockNum=GetOrderBlockNum(Order);
    if(BlockNum+Info.SignPeriod>context.BlockNum)
        throw "Bad order time for cancel (BlockNum="+BlockNum+")";

    //3
    Order.Process=100;
    WriteOrder(Order);

    //4
    Order.cmd="Refund";
    Send(Info.AccountFrom,COIN_FROM_FLOAT2(Order.NotaryFee),Order);

    //5
    Info.WorkNum++;
    WriteChannel(Info);
}



//--------------------------------------
//перечисления валидаторам из другого смарт-контракта - OnGet вызовы
//--------------------------------------

//--------------------------------------увеличение депозита в пул Params: {Channel,Notary}
"public"
function Deposit(Params)
{
    //1. Проверка канала
    //2. Проверка номера нотариуса
    //3. Проверка разрешения вызова - счет отправитель = NotaryArr.AccDeposit
    //4. начисление в массив NotaryArr.SumDeposit

    if(!context.SmartMode)
        throw "Need run in smart mode";

    //1
    var Info=ReadChannel(Params.Channel);
    if(!Info)
        throw "Error Channel = "+Params.Channel;

    //2
    var Notary=Params.Notary;
    var InfoItem=Info.NotaryArr[Params.Notary];
    if(!InfoItem)
        throw "Error Notary number="+Params.Notary;

    //3
    if(context.Account.Num!==InfoItem.AccDeposit)
        throw "Errar sender account: "+context.Account.Num+"/"+InfoItem.AccDeposit;

    //4
    InfoItem.SumDeposit += FLOAT_FROM_COIN(context.Value);

    WriteChannel(Info);
    RunEvent("Deposit",Params);
}




//--------------------------------------снятие депозита Params:{Channel,Notary,Amount}
"public"
function Withdraw(Params)
{
    //1. Проверка канала
    //2. Проверка номера нотариуса
    //3. Проверка разрешения вызова - счет отправитель = NotaryArr.AccDeposit
    //4. Списание из массив NotaryArr.SumDeposit
    //5. Если CanSign==1, то проверка минимального остатка SumDeposit
    //6. Возврат средств на счет NotaryArr.AccDeposit

    if(!context.SmartMode)
        throw "Need run in smart mode";
    if(typeof Params.Amount!=="number" || Params.Amount<0 || Params.Amount>1e12)
        throw "Error Amount="+Params.Amount;

    //1
    var Info=ReadChannel(Params.Channel);
    if(!Info)
        throw "Error Channel = "+Params.Channel;

    //2
    var Notary=Params.Notary;
    var InfoItem=Info.NotaryArr[Params.Notary];
    if(!InfoItem)
        throw "Error Notary number="+Params.Notary;

    //3
    if(context.Account.Num!==InfoItem.AccDeposit)
        throw "Errar sender account: "+context.Account.Num+"/"+InfoItem.AccDeposit;

    //4
    InfoItem.SumDeposit-=Params.Amount;

    //5
    var MinDeposit=Info.MinDeposit;
    if(!InfoItem.CanSign)
        MinDeposit=0;
    if(InfoItem.SumDeposit<MinDeposit)
        throw "Error deposit balance: "+InfoItem.SumDeposit+"/"+MinDeposit;

    WriteChannel(Info);
    RunEvent("Withdraw",Params);

    //6
    Send(InfoItem.AccDeposit,COIN_FROM_FLOAT2(Params.Amount),"Withdraw");


}




//--------------------------------------
//BRIDGE Smart contract
//--------------------------------------


"public"
function RunOrder(Params)
{
    CheckPermission();

    Params.cmd="AddOrder";
    Send(Params.TestTo,Params.TestSum,Params);
}

"public"
function RunDeposit(Params)
{
    CheckPermission();

    Params.cmd="Deposit";
    Send(Params.TestTo,Params.TestSum,Params);

}
"public"
function RunWithdraw(Params)
{
    CheckPermission();

    Params.cmd="Withdraw";
    Send(Params.TestTo,0,Params);

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







"public"
function SetKey(Params)
{
    CheckPermission();
    WriteValue(Params.Key,Params.Value,Params.Format);
}



"public"
function RemoveKey(Params)
{
    CheckPermission();
    return RemoveValue(Params.Key);
}




//Lib
function CheckPermission()
{
    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account";
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


//for static call

"public"
function GetOrder(Params)
{
    return ReadOrder(Params.ID);
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

function CheckSign(NumLib,Order,AddrNotary,ParamSign)
{
    var lib=require(NumLib);
    lib.CheckSign(Order,AddrNotary,ParamSign);
}

//--------------------------------------------------------------------------- common smart-contract lib
function HasSign(Order,Notary)
{
    var SignArr=Order.SignArr;
    for(var i=0;i<SignArr.length;i++)
    {
        if(SignArr[i].Notary===Notary)
            return 1;
    }
    return 0;
}
function GetOrderBlockNum(Order)
{
    return Math.floor(Order.ID/1000);
}

// function Round(Sum)
// {
//     return Math.floor(Sum*1e9)/1e9;
// }
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

