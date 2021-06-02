
//support muliticoins like ERC1655



//--------------------------------------
//Multicoin interface support (NFT,ERC...)
//--------------------------------------



//-------------------------------------- СТРУКТУРА ХРАНЕНИЯ
// Адресация "ACCOUNT":Account
// Один адрес Тера может содержать не более 10 строк токенов
function FormatAccount()
{
    return {MaxCount:"uint32", Arr:[{Token:"str", Arr:[{ID:"str", SumCOIN:"uint", SumCENT:"uint32", Flag:"uint"}], Flag:"uint"}], Flag:"uint"};
}

// Адресация "CONF":Token
//Multicoin: 0 - ERC20, 1-NFT
function FormatConf()
{
    return {
        Token:"str10", //tokenSymbol
        Name: "str30",  //tokenName
        ImgBlock:"uint",
        ImgTx:"uint32",
        Total:{SumCOIN:"uint", SumCENT:"uint32"},
        Owner:"uint32",
        Multicoin:"byte", //1-NFT,2-1655
        System:"byte",
        Flag:"uint",
        ModeURI:"uint",
        BaseURI:"str120",
        //IsNFT:"byte",
    };
}



//----------------------------------------------------------------------------
//-------------------------------------- INNER LIB
//----------------------------------------------------------------------------

//-------------------------------------- coin list work


function ReadCoinConf(Token)
{
    var Conf=ReadValue("CONF:"+Token,FormatConf());
    return Conf;
}

function WriteCoinConf(Conf)
{
    if(!Conf.Token)
        throw "Error Conf.Token="+Conf.Token;

    WriteValue("CONF:"+Conf.Token,Conf,FormatConf());
}



//-------------------------------------- account transfer work

function NewTokenRow(Token,ID)
{
    return {Token:Token, Arr:[NewTokenIDRow(ID)]};
}

function NewTokenIDRow(ID)
{
    return {ID:String(ID), SumCOIN:0, SumCENT:0, Flag:0};
}

function GetCoinKey(Account)
{
    Account=+Account;
    return "ACCOUNT:"+Account;
}

function ReadTokens(Account)
{
    var KeyAccount=GetCoinKey(Account);
    var Tokens=ReadValue(KeyAccount,FormatAccount());
    if(!Tokens)
        Tokens={MaxCount:10, Arr:[]};
    return Tokens;
}


function WriteTokens(Account,Tokens)
{
    if(Account!==context.Smart.Account)
    {
        var Count=0;
        for(var t=0;t<Tokens.Arr.length;t++)
        {
            var Item=Tokens.Arr[t];
            if(Item.Arr.length>0)
                Count+=Item.Arr.length;
            else
                Count++;
        }

        if(Count>Tokens.MaxCount)
            throw "Error Tokens rows count = "+Count+" on Account="+Account;
    }


    var KeyAccount=GetCoinKey(Account);
    WriteValue(KeyAccount,Tokens,FormatAccount());
}

//поиск в массивах
function FindItemTokenID(TokensArr,Token,ID, bCreate)
{
    for(var t=0;t<TokensArr.length;t++)
    {
        var Item=TokensArr[t];
        if(Item.Token==Token)
        {
            var Value=FindItemID(Item.Arr,ID);
            if(!Value && bCreate)
            {
                Value=NewTokenIDRow(ID);
                Value.IndexID=Item.Arr.length;

                Item.Arr.push(Value);
            }
            if(Value)
            {
                Value.IndexToken=t;

                return Value;
            }

            //не нашли
            break;
        }
    }
    //не нашли
    if(bCreate)
    {
        var Item=NewTokenRow(Token,ID);
        TokensArr.push(Item);
        return Item.Arr[0];
    }
}

function FindItemID(Arr,ID)
{
    for(var i=0;i<Arr.length;i++)
    {
        var Value=Arr[i];
        if(Value.ID==ID)
        {
            //хлебные крошки для быстрого удаления пустых строк
            Value.IndexID=i;

            return Value;
        }
    }
}

//----------------------------------------------------------------------------
//-------------------------------------- Public methods
//----------------------------------------------------------------------------


//-------------------------------------- COIN CONF


"public"
function GetTokenConf(Params)
{
    //Params:{Token}

    return ReadCoinConf(Params.Token)
}

"public"
function CreateToken(Params)
{
    if(!context.FromNum)
        throw "Error sender account";

    CreateTokenInner(Params,0);
}

"public"
function CreateTokenSys(Params)
{
    CheckOwnerPermission();
    CreateTokenInner(Params,1);
}

"public"
function SetTokenConf(Params)
{
    var Conf=ReadCoinConf(Params.Token);
    if(!Conf)
        throw "Error Token = "+Params.Token;

    if(Conf.Owner!==context.FromNum)
        throw "Error token Owner = "+context.FromNum+"/"+Conf.Owner;

    Conf.Name=Params.Name;
    Conf.Owner=Params.Owner;
    Conf.ImgBlock=Params.ImgBlock;
    Conf.ImgTx=Params.ImgTx;
    Conf.ModeURI=Params.ModeURI;
    Conf.BaseURI=Params.BaseURI;
    Conf.Multicoin=Params.Multicoin;
    //Conf.OnlyOwner=Params.OnlyOwner;
    //Conf.IsNFT=Params.IsNFT;

    WriteCoinConf(Conf);
    RunEvent("SetTokenConf",Conf);
}


function CreateTokenInner(Params,bSys)
{
    var Token=Params.Token;

    //Params:{Token,Name, MintSum, Owner, Multicoin,  ID, ImgBlock, ImgTx}
    if(!Token || typeof Token!=="string")
        throw "Error Token="+Token;

    Token=Token.trim();

    if(!bSys && Token.length<6)
        throw "Error Token length="+Token.length+"/6";


    var Was=ReadCoinConf(Token);
    if(Was)
        throw "Not unique Token="+Token;


    var Common=ReadValue("COMMON");
    if(!Common)
        throw "Error Common";

    if(!bSys && Common.PriceCreate)
    {
        //проверяем что пришла оплата
        var Sum=FLOAT_FROM_COIN(context.Value);
        if(Sum<Common.PriceCreate)
            throw "Error price = "+Sum+"/"+Common.PriceCreate;
        //Send(context.Smart.Account,COIN_FROM_FLOAT2(Common.PriceCreate),"Create new token "+Token);
    }

    var Conf=
        {
            Token:Token,
            Name:Params.Name,
            ImgBlock:Params.ImgBlock,
            ImgTx:Params.ImgTx,
            Total:{SumCOIN:0, SumCENT:0},
            Owner:Params.Owner,
            Multicoin:Params.Multicoin,
            System:bSys,
            ModeURI:Params.ModeURI,
            BaseURI:Params.BaseURI,
            //OnlyOwner:Params.OnlyOwner,
            //IsNFT:Params.IsNFT,
        }


    WriteCoinConf(Conf);

    if(Params.Owner && Params.MintSum)
    {
        MintInner(Params.Owner, Token, Params.ID, Params.MintSum, "Mint", 0);
    }


    var Conf2=ReadCoinConf(Token);
    RunEvent("CreateToken",Conf2);

}




//-------------------------------------- ACCOUNT TRANSFER WORK


"public"
function GetTokenURI(Params)
{
    //Params:{Token,ID}
    var Conf=Params.Conf;
    if(!Conf)
        Conf=ReadCoinConf(Params.Token);
    if(!Conf || !Conf.Multicoin)
        return "";

    //из Тера блокчейна
    if(Conf.ModeURI==0)
    {
        return "/nft/"+Params.ID;
    }

    if(Conf.ModeURI==1)
    {
        return Conf.BaseURI+Params.ID;
    }

    //other
    return "";
}


"public"
function GetBaseURI(Params)
{
    //Params:{Token}

    var Conf=ReadCoinConf(Params.Token);
    if(!Conf)
        return "";

    return Conf.BaseURI;
}

//--------------------------------------

"public"
function GetTokens(Params)
{
    //Params:Account,GetURI:1

    var Tokens=ReadTokens(Params.Account);
    if(Params.GetURI)
    {
        for(var t=0;t<Tokens.Arr.length;t++)
        {
            var Item=Tokens.Arr[t];

            var Conf=undefined;
            if(Item.Token)
                Conf=ReadCoinConf(Item.Token);

            for(var i=0;i<Item.Arr.length;i++)
            {
                var Value=Item.Arr[i];
                Value.URI=GetTokenURI({Conf:Conf,Token:Item.Token,ID:Value.ID});
            }

        }
    }
    return Tokens;
}

"public"
function ReadTokensBatch(Arr)
{
    var RetArr=[];
    for(var i=0;i<Arr.length;i++)
    {
        RetArr.push(ReadTokens(Arr[i]));
    }

    return RetArr;
}



"public"
function BalanceOf(Params)
{
    //Params:{Token,Account,ID}

    var Tokens=ReadTokens(Params.Account);
    var Value=FindItemTokenID(Tokens.Arr, Params.Token, Params.ID);
    if(Value)
        return FLOAT_FROM_COIN(Value);

    return 0;
}

"public"
function ExpandStore(Params)
{
    //CheckSenderPermission();
    if(!context.FromNum)
        throw "Error sender account";


    //Params:{Account,Count}
    var Count=Params.Count;
    if(!Count || typeof Count!=="number")
        throw "Error Count="+Count;

    var Common=ReadValue("COMMON");
    if(!Common)
        throw "Error Common";

    //проверяем что пришла оплата
    var Sum=FLOAT_FROM_COIN(context.Value);
    var Sum2=Common.PriceExpand*Count;
    if(Sum<Sum2)
        throw "Error price = "+Sum+"/"+Sum2;
    //Send(context.Smart.Account,COIN_FROM_FLOAT2(Common.PriceExpand*Count),"Expand: "+Count);


    var Tokens=ReadTokens(Params.Account);
    Tokens.MaxCount+=Count;
    WriteTokens(Params.Account,Tokens);
}





"public"
function Transfer(Params)
{
    //context.FromNum, Params:{Token, To, ID, Amount, Description}
    //Amount:double or {SumCOIN, SumCENT}

    //CheckSenderPermission(); - не надо, так как отправлено из context.FromNum
    Params.From=context.FromNum;


    var Amount=Params.Amount;
    if(typeof Amount==="number")
        Amount=COIN_FROM_FLOAT2(Amount);

    if(Amount.SumCENT)
    {
        var Conf=ReadCoinConf(Params.Token);
        if(!Conf)
            throw "Error Token = "+Params.Token;

        //check params
        if(Conf.Multicoin===1)
            throw "Not the correct amount of NFT token = "+FLOAT_FROM_COIN(Amount);
    }


    if(!Amount.SumCOIN && !Amount.SumCENT)
        return;

    var Tokens1=ReadTokens(Params.From);
    var ItemFrom=FindItemTokenID(Tokens1.Arr, Params.Token, String(Params.ID));
    if(!ItemFrom)
        throw "Token not found in address = "+Params.From;



    if(!SUB(ItemFrom, Amount))
        throw "Error rest amount = "+FLOAT_FROM_COIN(ItemFrom);


    //--------------------------------------           проверки работы алгоритма - потом убрать
    // if(!Tokens1.Arr[ItemFrom.IndexToken])
    //     throw "Error IndexToken="+ItemFrom.IndexToken;
    // var Item=Tokens1.Arr[ItemFrom.IndexToken];
    // if(!Item.Arr[ItemFrom.IndexID])
    //     throw "Error IndexID="+ItemFrom.IndexID;
    //--------------------------------------

    if(ISZERO(ItemFrom))
    {
        var Item=Tokens1.Arr[ItemFrom.IndexToken];
        Item.Arr.splice(ItemFrom.IndexID,1);
    }

    WriteTokens(Params.From,Tokens1);

    Params.To=+Params.To;

    var Tokens2=ReadTokens(Params.To);
    var ItemTo=FindItemTokenID(Tokens2.Arr, Params.Token, String(Params.ID), 1);
    ADD(ItemTo,Amount);
    WriteTokens(Params.To,Tokens2);

    //{Token, ID, From, To, Amount, Description}
    Event(Params,"History");

    RunEvent("Transfer",Params);
}



"public"
function TransferBatch(Params)
{
    //context.FromNum, Params:{Token, To,IDArr:[],AmountArr:[],Description}
    CheckSenderPermission();

}


//--------------------------------------  Mint
function MintInner(Account, Token, ID, Amount, Description, bBridhe)
{
    if(!Account)
        throw "Error Mint Account="+Account;
    ID=String(ID);
    if(ID.length>64)
        throw "Error length ID";

    var Tokens2=ReadTokens(Account);
    var ItemTo=FindItemTokenID(Tokens2.Arr, Token, ID, 1);


    if(typeof Amount==="number")
        Amount=COIN_FROM_FLOAT2(Amount);
    ADD(ItemTo,Amount);
    WriteTokens(Account,Tokens2);

    Event({Token:Token, ID:ID, From:0, To:Account, Amount:Amount, Description:Description},"History");


    //Total
    AddTotalWithCheck(Token,Amount,bBridhe);
}



function MintBatchInner(Account, Token, IDStart,Count, Amount)
{
    if(!Account)
        throw "Error Mint Account="+Account;

    if(typeof Amount==="number")
        Amount=COIN_FROM_FLOAT2(Amount);
    IDStart=+IDStart;

    var Total={SumCOIN:0, SumCENT:0};
    var Tokens2=ReadTokens(Account);
    for(var i=0;i<Count;i++)
    {
        var ID=String(IDStart+i);
        var ItemTo=FindItemTokenID(Tokens2.Arr, Token, ID, 1);
        ADD(ItemTo,Amount);
        ADD(Total,Amount);

        Event({Token:Token, ID:ID, From:0, To:Account, Amount:Amount, Description:"Mint"},"History");
    }

    WriteTokens(Account,Tokens2);

    //Total
    AddTotalWithCheck(Token,Total,0);
}

function AddTotalWithCheck(Token,CoinAmount,bBridhe)
{
    var Conf=ReadCoinConf(Token);
    if(!Conf)
        throw "Error Token = "+Token;

    if(!bBridhe && Conf.Owner!==context.FromNum)
        throw "Error token Owner = "+context.FromNum+"/"+Conf.Owner;

    ADD(Conf.Total, CoinAmount);

    WriteCoinConf(Conf);
}


function BurnInner(Account, Token, ID, Amount, Description)
{
    if(!Account)
        throw "Error Burn Account="+Account;

    var Tokens2=ReadTokens(Account);
    var ItemTo=FindItemTokenID(Tokens2.Arr, Token, ID);
    if(!ItemTo)
        return;


    if(typeof Amount==="number")
        Amount=COIN_FROM_FLOAT2(Amount);

    if(!SUB(ItemTo,Amount))
        throw "Error burn amount = "+FLOAT_FROM_COIN(Amount);


    WriteTokens(Account,Tokens2);

    Event({Token:Token, ID:ID, From:Account, To:0, Amount:Amount, Description:Description},"History");

    //Total
    SubTotal(Token,Amount,1);
}

function SubTotal(Token,CoinAmount)
{
    var Conf=ReadCoinConf(Token);
    if(!Conf)
        throw "Error Token = "+Token;

    if(!SUB(Conf.Total, CoinAmount))
        Conf.Total={SumCOIN:0, SumCENT:0};

    WriteCoinConf(Conf);
}


//----------- public Mint
"public"
function Mint(Params)
{
    //Params: {Account, Token, ID, Amount}

    //проверка собственника в AddTotalWithCheck

    MintInner(Params.Account, Params.Token, Params.ID, Params.Amount,"Mint", 0);
    RunEvent("Mint",Params);
}

"public"
function Burn(Params)
{
    //Params: {Token, ID, Amount}

    //сжигать можно тока свои
    CheckSenderPermission();


    BurnInner(context.Account.Num, Params.Token, Params.ID, Params.Amount,"Burn");
    RunEvent("Burn",Params);
}

"public"
function MintBridge(Params)
{
    //Params: {Account, Token, ID, Amount, Description}

    //тут только мосту можно создавать
    CheckBridgePermission();


    //проверка собственника в AddTotalWithCheck

    MintInner(Params.Account, Params.Token, Params.ID, Params.Amount,Params.Description, 1);
    RunEvent("Mint",Params);
}


"public"
function BurnBridge(Params)
{
    //Params: {Account, Token, ID, Amount, Description}

    //тут только мосту можно сжигать
    CheckBridgePermission();

    BurnInner(Params.Account, Params.Token, Params.ID, Params.Amount, Params.Description);
    RunEvent("Burn",Params);
}


"public"
function MintBatch(Params)
{

    //Params: {Token, StartID, Count, Amount}

    //проверка собственника в AddTotalWithCheck

    MintBatchInner(Params.Account, Params.Token, Params.StartID, Params.Count, Params.Amount);
    RunEvent("MintBatch",Params);
}





//-------------------------------------- COMMON
"public"
function SetCommon(Params)
{
    CheckOwnerPermission();

    WriteValue("COMMON",Params);
}

"public"
function GetCommon(Params)
{
    return ReadValue("COMMON");
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




//-------------------------------------- Lib
function CheckOwnerPermission()
{
    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account: "+context.FromNum+"/"+context.Smart.Owner;
}

function CheckSenderPermission()
{
    if(context.FromNum!==context.Account.Num)
        throw "Access is only allowed from Sender account: "+context.FromNum+"/"+context.Account.Num;
}

function CheckBridgePermission()
{
    var Common=GetCommon();
    if(Common.AccBridge!==context.FromNum)
        throw "Access is only allowed from Bridge: "+context.FromNum+"/"+Common.AccBridge;
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

function RunEvent(Name,Data)
{
    Event({"cmd":Name,Data:Data});
}



