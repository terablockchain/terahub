//Smart-contract:NotaryPool



// function OnGet()//getting coins
// {
//     if(context.SmartMode)
//     {
//         var Item=context.Description;
//         if(typeof Item==="object")
//         {
//             var Map={};
//             return Map[Item.cmd](Item);
//         }
//     }
//     else
//     if(context.Description.substr(0,1)==="{")
//     {
//         if(SetState())
//             return;
//     }
// }

//--------------------------------------
//BRIDGE Smart contract
//--------------------------------------


//-------------------------------------- СТРУКТУРА ХРАНЕНИЯ
//TODO форматирование используется только для Order
// Адресация ордера "ORDER":ID

// function FormatCommon()
// {
//     return {
//                 Pause:"uint32",
//                 SignLib:"uint32",
//                 SignPeriod:"uint32",//период для подписи (в блоках)
//                 TransferPeriod:"uint32",//устаревание ордеров (в блоках)

//                 //комиссии за подпись (в Терах)
//                 NotaryFee:"double",
//                 MinNotaryFee:"double",
//                 MinDeposit:"double", //депозит в Терах

//                 //подписанты (валидаторы)
//                 NotaryArr:[{Addr:"arr20",AccDeposit:"uint32",SumDeposit:"double", CanSign:"byte", BlockFrom:"uint", BlockTo:"uint", Channel:["uint32"]}],
//                 MinSign:"uint16",//требуемое минимальное число подписей

//                 //штрафные санкции
//                 SlashRate:"double",
//                 MinSlash:"double",

//                 WorkNum:"uint32",
//                 OrderList: {HeadID:"uint", TailID:"uint"},
//                 NewOrderID:"uint",
//             };
// }
// function FormatChannel()
// {
//     return {
//                 ID:"uint32",//глобальный номер канала
//                 Name:"str",
//                 Pause:"uint32",

//                 TokenAcc:"uint32",//номер счета с монетами
//                 Rate:"double",//курс к Тера для расчета комисии из (Order.Amount+Order.TransferFee)
//             };
// }


function FormatOrder()
{
    return  {
        //Header:
        Gate:"uint32", ID:"uint",AddrTera:"uint32",AddrEth:"str",TokenID:"str",Amount:"double",TransferFee:"double",Description:"str",
        //Signs:
        SignArr:[{Notary:"byte",Sign:"arr65",Slash:"byte"}],
        //State:
        Process:"byte",NotaryFee:"double", NextID:"uint", PrevID:"uint"
    };
}




//-------------------------------------- DB
function ReadConf()
{
    return ReadValue("CONF");
    //return ReadValue("COMMON",FormatCommon());
}
function WriteConf(Item)
{
    WriteValue("CONF",Item);
    //WriteValue("COMMON",Item,FormatCommon());
}





function ReadOrder(ID)//todo
{
    return ReadValue("ORDER:"+ID, FormatOrder());
}

function WriteOrder(Order)
{
    if(!Order.ID)
        throw "WriteOrder Error Order.ID="+Order.ID;

    if(Order.TokenID && Order.TokenID.length>64)
        throw "WriteOrder Error TokenID length: "+Order.TokenID;

    WriteValue("ORDER:"+Order.ID, Order, FormatOrder());
}
function DeleteOrder(Order)
{
    if(!Order.ID)
        throw "DeleteOrder Error Order.ID="+Order.ID;
    RemoveValue("ORDER:"+Order.ID);
}


function WriteOrderWithRefs(Order,Common,Conf)
{
    //удаляем последний ордер если он в находится старом периоде
    if(Conf.TailID>0)
    {
        var Period=OrderInPeriod(Common, Conf.TailID);
        if(Period>=4)
        {
            var OrderLast=ReadOrder(Conf.TailID);
            if(OrderLast)
            {
                DeleteOrder(OrderLast);//удаляем его
                if(Conf.HeadID==OrderLast.ID)
                    Conf.HeadID=0;
                Conf.TailID=OrderLast.PrevID;
            }
        }
    }

    if(Order.ID==Conf.HeadID)
        throw "Error set Order.NextID = "+Conf.HeadID+" in Order.ID="+Order.ID;

    Order.NextID=Conf.HeadID;
    WriteOrder(Order);

    //записываем ссылку на этот ордер в предыдущем ордере
    if(Conf.HeadID>0)
    {
        var Order3=ReadOrder(Conf.HeadID);
        if(Order3)
        {
            Order3.PrevID=Order.ID;
            WriteOrder(Order3);
        }
    }


    Conf.HeadID=Order.ID;
    if(!Conf.TailID)
    {
        Conf.TailID=Conf.HeadID;
    }



    //Внимание: запись Conf должна быть при записи Info в вызывающей функции
}

function CheckSum(Sum)
{
    if(Sum===0)
        return;
    if(Sum && typeof Sum==="number")
        return;

    throw "Error, need type number: "+Sum;
}

function TrimTokenID(Str)
{
    if(Str.length===64)
        return Str;

    if(Str && Str.length>15)
        Str = Str.substr(Str.length-15);

    while(Str.length>1 && Str.substr(0,1)==="0")
        Str=Str.substr(1);
    return Str;
}

//-------------------------------------- Token Sends
function MoveToken(Info,Gate, From,To,TokenID,Amount,Description)
{
    if(Gate.IsERC || Gate.IsNFT)
    {
        //erc token mode
        if(Gate.IsNFT && !TokenID)
            throw "Error TokenID="+TokenID;

        if(context.Account.Num!==From)
            throw "Error From = "+From+"/"+context.Account.Num;

        if(Gate.IsNFT)
            TokenID=TrimTokenID(TokenID);

        if(From===context.Smart.Account)//mint
            Send(Info.CoinStore, 0, {cmd:"MintBridge", Account:To, Token:Gate.TokenName, ID:TokenID, Amount:Amount, Description:Description});
        else
        if(To===context.Smart.Account)//burn - не храним монеты
            Move(context.Smart.Account,Info.CoinStore, 0, {cmd:"BurnBridge", Account:From, Token:Gate.TokenName, ID:TokenID, Amount:Amount, Description:Description});
        else
            throw "Error MoveToken operation: "+From+"->"+To;

        // if(From===context.Smart.Account)//mint
        //     Send(Info.CoinStore, 0, {cmd:"MintBridge", Token:Gate.TokenName, Account:context.Smart.Account, ID:TokenID, Amount:Amount});

        // Send(Info.CoinStore, 0, {cmd:"Transfer", Token:Gate.TokenName, To:To, ID:TokenID, Amount:Amount, Description:Description});

        // if(To===context.Smart.Account)//burn - не храним монеты
        //     Move(context.Smart.Account,Info.CoinStore, 0, {cmd:"BurnBridge", Token:Gate.TokenName, ID:TokenID, Amount:Amount});


    }
    else
    {
        //RunEvent("MoveToken not erc");

        //native token mode
        Move(From,To, COIN_FROM_FLOAT2(Amount), Description);
    }
}


"public"
function Transfer(Params)
{
    CheckSenderPermission();

    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    Params.cmd="Transfer";
    Send(Info.CoinStore, 0, Params);
    Event(Params);
}



//-------------------------------------- добавление нового ордера
//Order: {From,To,Amount,TransferFee,Description}
//

"public"
function AddOrder(Data)
{
    CheckSenderPermission();

    if(typeof Data!=="object")
        throw "AddOrder: Error type Data";

    CheckSum(Data.Amount);
    CheckSum(Data.TransferFee);
    //CheckSum(Data.NotaryFee);




    var NotaryFee=Data.NotaryFee;


    Data.AddrTera=context.Account.Num;
    // if(typeof Data.AddrTera!=="number" || !Data.AddrTera)
    //     throw "Error 'AddrTera' value";
    if(!Data.AddrEth.length)
        throw "Error 'To' value";
    if(typeof Data.Description!=="string" || Data.Description.length>300)
        throw "Error length 'Description'";


    //читаем настройки текущего канала (гейта)
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    var Common=Info.Common;
    var Orders=Info.Orders;
    var Gate=Info.Gates[Data.Gate];
    if(!Gate)
        throw "Error Gate="+Data.Gate;

    if(Common.Pause || Gate.Pause)
        throw "Pause";


    //расчет номера ордера внутри блока
    var OrderNum=0;
    var PrevBlockNum=GetOrderBlockNum({ID:Orders.NewOrderID});
    if(PrevBlockNum==context.BlockNum)
        OrderNum = (Orders.NewOrderID%1000)+1;

    if(OrderNum>=1000)
        throw "Big tx num, try later, OrderNum="+OrderNum;


    var ID=context.BlockNum*100000 + OrderNum;// так как наш OrderEnum = 0
    Orders.NewOrderID = ID;



    var Order=
        {
            Gate:+Data.Gate,
            ID:ID,

            AddrTera:Data.AddrTera,
            AddrEth:Data.AddrEth,
            Amount:Data.Amount,
            TransferFee:Data.TransferFee,
            Description:Data.Description,
            TokenID:Data.TokenID,

            Process:0,
            NotaryFee:NotaryFee,
            SignArr:[],
        };




    //--------------------------------------Token transfer

    var Total;
    if(Gate.IsNFT)
    {
        //комиссия всегда в Терах и всегда равна MinNotaryFee
        Order.NotaryFee=Common.MinNotaryFee;
        var Fee=Order.NotaryFee+Order.TransferFee;
        if(Fee)
            Send(context.Smart.Account, COIN_FROM_FLOAT2(Fee), "Fee");

        Total=Round(Order.Amount);
    }
    else
    {
        //Notary fee
        var NeedFee=Common.NotaryFee*(Order.Amount+Order.TransferFee);

        //перевод MinNotaryFee в валюту ордера
        Order.NotaryFee=Round(Math.max(NeedFee,Gate.Rate*Common.MinNotaryFee));

        //все в одной сумме
        Total=Round(Order.Amount+Order.TransferFee+Order.NotaryFee);
    }



    var TokenAcc=Gate.TokenAcc;
    if(!TokenAcc)
        TokenAcc=context.Smart.Account;
    MoveToken(Info,Gate, Order.AddrTera, TokenAcc, Order.TokenID, Total, Order.Description);
    //--------------------------------------



    WriteOrderWithRefs(Order,Common,Orders);

    Orders.WorkNum++;
    WriteConf(Info);

    Event(Data);
}




//--------------------------------------подпись валидатора Params:{ID,Notary}, ParamSign:arr65
"public"
function NotarySign(Params, ParamSign)
{
    CheckBaseCall();

    //1.Проверяем параметры, что ордер не устарел (SignPeriod)
    //2.Проверка разрешения вызова - нотариус в списке подписантов
    //3.Проверяем что у валидатора есть минимальный депозит (SumDeposit/MinDeposit)
    //4.Проверяем что этот валидатор еще не подписывал
    //5.Проверяем подпись
    //6.Добавляем в массив подписей
    //7.Если достаточное число подписей - ставим признак Process=1
    //8.Записываем признак апдейта в канал

    //только ордера созданные в этом блокчейне
    CheckOrderID(Params.ID,0);

    var Order=ReadOrder(Params.ID);
    if(!Order)
        throw "Error Order ID="+Params.ID;


    //читаем настройки текущего канала (гейта)
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    var Common=Info.Common;
    var Orders=Info.Orders;
    var Gate=Info.Gates[Order.Gate];
    if(!Gate)
        throw "Error Gate="+Order.Gate;

    if(Common.Pause || Gate.Pause)
        throw "Pause";



    //1
    var Period=OrderInPeriod(Common,Params.ID);
    if(Period!==2)
        throw "No Notary period. Period="+Period;


    //2
    var Notary=Params.Notary;
    var InfoItem=Common.NotaryArr[Notary];
    if(!InfoItem)
        throw "Error Notary number";
    //3
    if(InfoItem.SumDeposit<Common.MinDeposit)
        throw "No deposit required ("+InfoItem.SumDeposit+"/"+Common.MinDeposit+")";
    if(!InfoItem.CanSign)
        throw "This notary cannt Sign";

    //4
    if(HasSign(Order,Notary))
        throw "There was already a signature";

    //5
    DoCheckSign(Info.SignLib,Order,InfoItem.Addr,ParamSign);

    //6
    Order.SignArr.push({Notary:Notary,Sign:ParamSign});

    //7
    if(Order.SignArr.length===Common.MinSign && Order.Process!==1)
    {
        Order.Process=1;
        DistributeNotaryFee(Common,Order);
    }


    WriteOrder(Order);
    RunEvent("Sign",Order);

    //8
    Orders.WorkNum++;
    WriteConf(Info);

}




//--------------------------------------доказательство обмана Params:{Notary, Gate,ID, From,To,Amount,TransferFee,Description}, ParamSign:arr65
"public"
function SlashProof(Params,ParamSign)
{
    CheckBaseCall();

    //1.Проверяем валидность ID (только ордера созданные в этом блокчейне)
    //2.Проверяем валидность канала
    //3.Проверяем валидность номера нотариуса
    //4.Проверяем что время ордера в периоде = 3 (больше SignPeriod, но меньше TransferPeriod)
    //5.Проверяем подпись
    //6.Проверяем что такой подписи в ордере нет
    //
    //7.Добавляем подпись в ордер для предотвращения дальнейших штрафов с такой подписью и ставим Slash=1
    //8.Устанавливаем в ордере NotaryFee = 0
    //9.Штрафуем валидаторов (списанием с депозита), за основу берем большую сумму между полученным ордером и записанным в БД (так как может быть ситуация когда пришедший ID - "левый")
    //10.Записываем признак апдейта в канал


    CheckSum(Params.Amount);
    CheckSum(Params.TransferFee);
    //CheckSum(Params.NotaryFee);

    //1
    CheckOrderID(Params.ID,0);

    //2
    //читаем настройки текущего канала (гейта)
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    var Common=Info.Common;
    var Orders=Info.Orders;
    var Gate=Info.Gates[Params.Gate];
    if(!Gate)
        throw "Error Gate="+Params.Gate;


    //3
    var Notary=Params.Notary;
    var InfoItem=Common.NotaryArr[Notary];
    if(!InfoItem)
        throw "Error Notary number";


    //4
    var Period=OrderInPeriod(Common,Params.ID);
    if(Period!==3)
        throw "No Slash period. Period="+Period;


    //5
    DoCheckSign(Info.SignLib,Params,InfoItem.Addr,ParamSign);
    var ParamSignStr=GetHexFromArr(ParamSign);


    //6
    var OrderDB=ReadOrder(Params.ID);
    var bNewOrder=0;
    if(OrderDB)
    {
        var SignArr=OrderDB.SignArr;
        for(var i=0;i<SignArr.length;i++)
        {
            if(GetHexFromArr(SignArr[i].Sign)===ParamSignStr)//именно этот вариант, так как это еще неявная проверка одинаковости ордеров
                throw "This signature was already there";
            // if(Notary===SignArr[i].Notary) - низзя
            //     throw "This notary sign was already there";
        }
    }
    else
    {
        bNewOrder=1;
        OrderDB=Params;
        OrderDB.SignArr=[];
        OrderDB.NotaryFee=0;

    }
    OrderDB.Process=200;

    //7
    OrderDB.SignArr.push({Notary:Notary,Sign:ParamSign,Slash:1});
    //8
    OrderDB.NotaryFee=0;


    if(bNewOrder)
        WriteOrderWithRefs(OrderDB,Common,Orders)
    else
        WriteOrder(OrderDB);

    //9
    //перевод валюты ордера в Тера
    var SlashSum=Common.SlashRate*Math.max(OrderDB.Amount+OrderDB.TransferFee, Params.Amount+Params.TransferFee)/Gate.Rate;
    if(Gate.IsNFT || SlashSum<Common.MinSlash)
        SlashSum=Common.MinSlash;

    //отнимаем из депозита
    InfoItem.SumDeposit-=SlashSum;
    if(InfoItem.SumDeposit<0)
        InfoItem.SumDeposit=0;

    if(InfoItem.SumDeposit<Common.MinDeposit)
        InfoItem.CanSign=0;

    //10
    Orders.WorkNum++;
    WriteConf(Info);

    RunEvent("Slash",OrderDB);

}




function DistributeNotaryFee(Common,Order)
{
    //1. Если Order.Process==1 и есть NotaryFee, то одинаковыми частями начисляем награду валидаторам - в массив NotaryArr.SumDeposit

    var LSigns=Order.SignArr.length;
    if(Order.Process===1 && Order.NotaryFee && LSigns)
    {
        //рассчитываем коэффициент выплаты
        var K=1/LSigns;
        for(var i=0;i<LSigns;i++)
        {
            var Item=Order.SignArr[i];
            var NotaryItem=Common.NotaryArr[Item.Notary];
            if(NotaryItem && !Item.Slash)
            {
                NotaryItem.SumDeposit+=Order.NotaryFee*K;
            }
        }
    }

}

//--------------------------------------возврат средств с неподписанного ордера
"public"
function CancelOrder(Params)
{
    CheckBaseCall();

    //1. Проверяем время ордера больше SignPeriod
    //2. Проверяем что Process===0
    //3. Устанавливаем в ордере признак обработанности Process=100
    //4. Возвращаем средства
    //5. Записываем признак апдейта в канал

    //только ордера созданные в этом блокчейне
    CheckOrderID(Params.ID,0);


    var Order=ReadOrder(Params.ID);
    if(!Order)
        throw "Error Order ID="+Params.ID;

    //2
    //читаем настройки текущего канала (гейта)
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    var Common=Info.Common;
    var Orders=Info.Orders;
    var Gate=Info.Gates[Order.Gate];
    if(!Gate)
        throw "Error Gate="+Order.Gate;

    //1
    var Period=OrderInPeriod(Common,Params.ID);
    if(Period<3)
        throw "Error order Period="+Period;


    //2
    if(Order.Process!==0)
        throw "The order has already been processed. Process="+Order.Process;

    //3
    Order.Process=100;
    WriteOrder(Order);

    //4
    //--------------------------------------Token transfer
    var Total;
    if(Gate.IsNFT)
    {
        //комиссия всегда в Терах
        var Fee=Order.NotaryFee+Order.TransferFee;
        if(Fee)
            Send(Order.AddrTera, COIN_FROM_FLOAT2(Fee), "Rufund");

        Total=Round(Order.Amount);
    }
    else
    {
        Total=Order.Amount+Order.TransferFee+Order.NotaryFee;
    }

    var TokenAcc=Gate.TokenAcc;
    if(!TokenAcc)
        TokenAcc=context.Smart.Account;


    MoveToken(Info,Gate, TokenAcc, Order.AddrTera, Order.TokenID, Total, "Refund");


    //Move(TokenAcc,Order.AddrTera, COIN_FROM_FLOAT2(Total), "Refund");
    //--------------------------------------



    //5
    Orders.WorkNum++;
    WriteConf(Info);


    RunEvent("Refund",Order);

}






//--------------------------------------
//В блокчейне 2
//--------------------------------------предъявление на оплату входящего ордера из другого блокчейна

"public"
function ExecOrder(Order)
{
    //Разбиваем обработку ордера на два шага (в две транзакции):
    //1) Process==1 Проверки и запись оредра
    //2) Process==2 Перевод средств (уже записанного и проверенного ордера)

    //Проверяем что номер ордера уникальный, смотрим номер обработки

    //
    var Order2=ReadOrder(Order.ID);
    if(!Order2)
        return ExecOrder1(Order);

    if(Order2.Process==1)
        return ExecOrder2(Order2);

    if(Order2.Process==2)
        return;//done

    //ошибки вызова

    throw "The order has already been processed. Process="+Order2.Process;
}



function ExecOrder1(Order)
{

    //1. проверка типа Amount
    //2. только ордера созданные в другом блокчейне (Blockchain.OrderEnum)
    //3. Проверяем параметры (дата входящего ордера еще не истекла)
    //5. Проверяем подписи
    //6. Ставим признак что ордер выполнен1 (для защиты от дублей), записываем и добавляем в отдельный список
    //7. Перевод средств осуществляется в вызывающем смарт-контракте



    CheckBaseCall();

    CheckSum(Order.Amount);


    //читаем настройки текущего канала (гейта)
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    var Common=Info.Common;
    var Orders=Info.Orders;
    var Gate=Info.Gates[Order.Gate];
    if(!Gate)
        throw "Error Gate="+Order.Gate;

    var Blockchain=Info.Blockchains[Gate.ChainName];
    if(!Blockchain)
        throw "Error ChainName="+Gate.ChainName;


    //2
    CheckOrderID(Order.ID,Blockchain.OrderEnum);//gate


    //3
    var Period=OrderInPeriod(Common,Order.ID);
    if(Period<2 || Period>3)
        throw "Error order Period="+Period;




    //5
    var SignCount=0;
    for(var i=0;i<Order.SignArr.length;i++)
    {
        var Item=Order.SignArr[i];
        var InfoItem=Common.NotaryArr[Item.Notary];

        if(InfoItem && InfoItem.CanSign && DoCheckSign(Info.SignLib, Order, InfoItem.Addr, Item.Sign, 2))
        {
            SignCount++;
        }
    }

    if(SignCount<Common.MinSign)
        throw "MultiSign error, found="+SignCount+"/"+Common.MinSign;


    //6
    Order.Process=1;
    WriteOrderWithRefs(Order,Common,Orders);


    Orders.WorkNum++;
    WriteConf(Info);

    RunEvent("ExecOrder1",Order);

}


function ExecOrder2(Order)
{
    //2. только ордера созданные в другом блокчейне (Blockchain.OrderEnum)
    //6. Ставим признак что ордер выполнен2 (для защиты от дублей), записываем и добавляем в отдельный список

    //читаем настройки текущего канала (гейта)
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    var Common=Info.Common;
    var Orders=Info.Orders;
    var Gate=Info.Gates[Order.Gate];
    if(!Gate)
        throw "Error Gate="+Order.Gate;
    var Blockchain=Info.Blockchains[Gate.ChainName];
    if(!Blockchain)
        throw "Error ChainName="+Gate.ChainName;

    //2
    CheckOrderID(Order.ID,Blockchain.OrderEnum);//gate


    //--------------------------------------Token transfer
    var TokenAcc=Gate.TokenAcc;
    if(!TokenAcc)
        TokenAcc=context.Smart.Account;


    MoveToken(Info,Gate, TokenAcc, Order.AddrTera, Order.TokenID, Order.Amount, Order.Description);

    //--------------------------------------

    //6
    Order.Process=2;
    WriteOrder(Order);


    Orders.WorkNum++;
    WriteConf(Info);

    RunEvent("ExecOrder2",Order);
}




//--------------------------------------
//перечисления валидаторам из другого смарт-контракта - OnGet вызовы
//--------------------------------------

//--------------------------------------увеличение депозита в пул Params: {Notary}
"public"
function Deposit(Params)
{
    //0. Запускается из другого смарта
    //1. Чтение настроек
    //2. Проверка номера нотариуса
    //3. Проверка разрешения вызова - счет отправитель = NotaryArr.AccDeposit
    //4. начисление в массив NotaryArr.SumDeposit

    //1
    if(!context.SmartMode)
        throw "Need run in smart mode";

    //1
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    //2
    var Notary=Params.Notary;
    var InfoItem=Info.Common.NotaryArr[Params.Notary];
    if(!InfoItem)
        throw "Error Notary number="+Params.Notary;

    //3
    if(context.Account.Num!==InfoItem.AccDeposit)
        throw "Errar sender account: "+context.Account.Num+"/"+InfoItem.AccDeposit;

    //4
    InfoItem.SumDeposit += FLOAT_FROM_COIN(context.Value);

    WriteConf(Info);

    RunEvent("Deposit",Params);
}




//--------------------------------------снятие депозита Params:{Notary,Amount}
"public"
function Withdraw(Params)
{
    //1. Чтение настроек канала
    //2. Проверка номера нотариуса
    //3. Проверка разрешения вызова - счет отправитель = NotaryArr.AccDeposit
    //4. Списание из массив NotaryArr.SumDeposit
    //5. Если CanSign==1, то проверка минимального остатка SumDeposit
    //6. Возврат средств на счет NotaryArr.AccDeposit

    if(!context.SmartMode)
        throw "Need run in smart mode";
    if(!Params.Amount || typeof Params.Amount!=="number" || Params.Amount<0 || Params.Amount>1e12)
        throw "Error Amount="+Params.Amount;

    //1
    var Info=ReadConf();
    if(!Info)
        throw "Error ReadConf";

    //2
    var Notary=Params.Notary;
    var InfoItem=Info.Common.NotaryArr[Params.Notary];
    if(!InfoItem)
        throw "Error Notary number="+Params.Notary;

    //3
    if(context.Account.Num!==InfoItem.AccDeposit)
        throw "Errar sender account: "+context.Account.Num+"/"+InfoItem.AccDeposit;

    //4
    InfoItem.SumDeposit-=Params.Amount;

    //5
    var MinDeposit=Info.Common.MinDeposit;
    if(!InfoItem.CanSign)
        MinDeposit=0;
    if(InfoItem.SumDeposit<MinDeposit)
        throw "Error deposit balance: "+InfoItem.SumDeposit+"/"+MinDeposit;

    WriteConf(Info);
    RunEvent("Withdraw",Params);

    //6
    Send(InfoItem.AccDeposit,COIN_FROM_FLOAT2(Params.Amount),"Withdraw");


}


// --------------------------------------
// DeFi Smart contract
// --------------------------------------


"public"
function RunDeposit(Params)
{
    CheckOwnerPermission();

    Params.cmd="Deposit";
    Send(context.Smart.Account,Params.TestSum,Params);

}
"public"
function RunWithdraw(Params)
{
    CheckOwnerPermission();

    Params.cmd="Withdraw";
    Send(context.Smart.Account,0,Params);

}




//----------------------------------------------------------------
//-------------------------------------- задание параметров
//----------------------------------------------------------------

"public"
function SetCommon(Params)
{
    CheckOwnerPermission();

    var Info=ReadConf();
    if(Info)
    {
        Params.Orders=Info.Orders;
    }


    WriteConf(Params);
    Event("OK WriteConf");
}

"public"
function ResetOrders(Params)
{
    CheckOwnerPermission();


    var Info=ReadConf();
    if(Info)
    {
        Info.Orders=
            {
                HeadID:0,
                TailID:0,

                NewOrderID:0,
                WorkNum:0,
            };

        WriteConf(Info);
        Event("WriteConf OK");
    }
    else
    {
        Event("Not found Conf");
    }

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
function CheckBaseCall()
{
    if(context.Account.Num!==context.Smart.Account)
        throw "Error call Account = "+context.Account.Num+"/"+context.Smart.Account;
}

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


//for static call
"public"
function GetConf()
{
    return ReadConf();
}



"public"
function GetOrder(Params)
{
    return ReadOrder(Params.ID);
}


"public"
function GetOrderList(Params)
{
    var Arr=[];
    var NextID=Params.ID;
    var Count=0;
    while(NextID)
    {
        Count++;
        var Order=ReadOrder(NextID);
        if(Order && Order.ID)
        {
            Arr.push(Order);
            NextID=Order.NextID;
        }
        else
        {
            NextID=0;
        }

        if(Count>=Params.Count)
        {
            break;
        }
    }
    return Arr;
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

function DoCheckSign(NumLib,Order,AddrNotary,ParamSign,bNoErr)
{
    if(!NumLib)
        throw "Error SignLib="+NumLib;

    var Lib=require(NumLib);

    var Ret=Lib.CheckSign(Order,AddrNotary,ParamSign,bNoErr);
    return Ret;
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
    if(typeof Order.ID!=="number")
        throw "GetOrderBlockNum Error Order.ID="+Order.ID;

    return Math.floor(Order.ID/100000);
}

function CheckOrderID(ID,OrderEnum)
{
    if(typeof ID!=="number" || !ID || ID<0)
        throw "Error order ID="+ID;

    var Num=Math.floor(ID/1000);
    if(Num%100 !== OrderEnum)
        throw "Error order ID="+ID+" (need OrderEnum="+OrderEnum+")";
}

function OrderInPeriod(Info,ID)
{
    var BlockNum=Math.floor(ID/100000);

    if(context.BlockNum<BlockNum)
        return 1;


    if(context.BlockNum>BlockNum+Info.TransferPeriod)
        return 4;

    if(context.BlockNum>BlockNum+Info.SignPeriod)
        return 3;

    return 2;

}





//-------------------------------------- for test mode only

"public"
function SetProxy(Params)
{
    CheckOwnerPermission();

    WriteValue("PROXY",Params);
}

"public"
function GetProxy(Params)
{
    return ReadValue("PROXY");
}






