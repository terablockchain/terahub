
function OnGet()//getting coins
{
    if(context.SmartMode)
    {
        var Item=context.Description;
        if(typeof Item==="object")
        {
            return CallProxy(Item.cmd,Item);
        }
    }
    else
    if(context.Description.substr(0,1)==="{")
    {
        if(SetState())
            return;
    }
}



function ReadStorage()
{
    return ReadValue("PROXY");
}

function WriteStorage(Item)
{
    WriteValue("PROXY",Item);
}


function CallProxy(Name,Params,ParamArr)
{
    var Info=ReadStorage();
    var LibNum=Info[Name];
    if(!LibNum)
    {
        LibNum=Info.CommonNum;
        if(!LibNum)
            return;
    }

    var lib=require(LibNum);
    return lib[Name](Params,ParamArr);
}

"public"
function Call(Params,ParamArr)
{
    var RetValue=CallProxy(Params.cmd,Params,ParamArr);
    if(Params.evt)
        Event(Params);
    return RetValue;
}


"public"
function SetProxy(Params)
{
    if(context.FromNum!==context.Smart.Owner)
        throw "Access is only allowed from Owner account";


    //---------------------
    //developing mode check
    var DEVELOPING_MODE_PERIOD=365*24*3600/3;
    var Info=GetProxy(Params);
    if(Info && Info.StartDeveloperMode)
        if(context.BlockNum-Info.StartDeveloperMode > DEVELOPING_MODE_PERIOD)
            throw "Smart contract in immutable mode";

    Params.StartDeveloperMode=context.BlockNum;
    //---------------------


    WriteStorage(Params);
}

"public"
function GetProxy(Params)
{
    return ReadStorage(Params);
}


"public"
function GetKey(Params)
{
    return ReadValue(Params.Key,Params.Format);
}


//Lib
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


