
function OnGet()
{
    if(typeof context.Description==="string" && context.Description.substr(0,1)==="{")
    {
        if(SetState())
            return;
    }
}


function ToBytes(Data)
{
    if(typeof Data==="object")
        Data=GetHexFromArr(Data);
    if(Data.substr(0,2)!=="0x")
        Data="0x"+Data;

    return Data;
}

function ArrFromBytes(Str)
{
    if(typeof Str==="string" && Str.substr(0,2)==="0x")
        Str=Str.substr(2);

    return GetArrFromHex(Str);
}




//-------------------------------- Order Lib

"public"
function CheckSign(Order,AddrNotary,ParamSign,bNoErr)
{
    if(typeof ParamSign==="string")
        ParamSign=GetArrFromHex(ParamSign);

    if(typeof AddrNotary!=="string")
        AddrNotary=GetHexFromArr(AddrNotary);



    //check sign by etherium style
    if(ParamSign.length!==65)
    {
        var Err="Error length sign arr="+ParamSign.length;
        if(bNoErr==2)
            Event(Err);
        if(bNoErr)
            return 0;

        throw Err;
    }

    var Hash=GetOrderHash(Order);

    var r = ParamSign.slice(0, 32);
    var s = ParamSign.slice(32, 64);
    var v=ParamSign[64];

    var AddrStr=GetHexFromArr(ecrecover(Hash, v, r, s));

    if(bNoErr==3)
        Event("AddrStr="+AddrStr+" AddrNotary="+AddrNotary);

    if(AddrStr!==AddrNotary)
    {
        var Err="Sign error: ecrecover addr="+AddrStr+"/"+AddrNotary;
        if(bNoErr==2)
            Event(Err);
        if(bNoErr)
            return 0;

        throw Err;
    }

    return 1;

}



"public"
function GetOrderHash(Order)
{


    if(!Order.ID)
        throw "Error order ID";
    if(typeof Order.Amount!=="number" || Order.Amount>1e12 || Order.Amount<0)
        throw "Error order Amount";
    if(typeof Order.TransferFee!=="number" || Order.TransferFee>1e12 || Order.TransferFee<0)
        throw "Error order TransferFee";


    var Buf=GetSignArrFromOrder(Order);



    var Hash=keccak256(Buf);

    return Hash;
}

"public"
function GetPureOrder(OrderFrom)
{
    var Order={};
    var Arr=["ID","Gate","AddrTera","AddrEth","TokenID","Amount","TransferFee","Description"];
    for(var i=0;i<Arr.length;i++)
    {
        var Name=Arr[i];
        Order[Name]=OrderFrom[Name];
    }

    Order.SignArr=[];
    for(var i=0;i<OrderFrom.SignArr.length;i++)
    {
        var Item=OrderFrom.SignArr[i];
        var Sign=Item.Sign;
        if(typeof Sign!=="string")
            Sign=GetHexFromArr(Sign);

        Order.SignArr.push({Notary:Item.Notary,Sign:Sign});
    }
    return Order;
}



//-------------------------------- Decode lib for Solidity
"public"
function DecodeOrder(Buf,bFull)
{
    var Order={};
    Buf.len=0;

    Order.Gate=DecodeUint(Buf,4);
    Order.ID=DecodeUint(Buf,6);
    Order.AddrTera=DecodeUint(Buf,4);
    Order.AddrEth=GetHexFromArr(DecodeArrConst(Buf,20));
    Order.TokenID=DecodeHex10(Buf);
    Order.Amount=DecodeUint(Buf,8)/1e9;
    Order.TransferFee=DecodeUint(Buf,8)/1e9;
    Order.Description=DecodeStr(Buf);

    if(bFull)
    {

        var Length=DecodeUint(Buf,1);
        Order.SignArr=[];
        for(var i=0;i<Length;i++)
        {
            var Item={};
            Item.Notary=DecodeUint(Buf,1);
            Item.Sign=DecodeArrConst(Buf,65);
            Order.SignArr.push(Item);
        }

        Order.NotaryFee=DecodeUint(Buf,8)/1e9;
        Order.Process=DecodeUint(Buf,1);

        Order.PrevID=DecodeUint(Buf,6);
        Order.NextID=DecodeUint(Buf,6);

    }

    return  Order;
}



//-------------------------------- Encode lib for Solidity
"public"
function EncodeOrder(Buf,Order,bFull,MaxSignCount)
{
    EncodeUint(Buf,Order.Gate,4);
    EncodeUint(Buf,Order.ID,6);
    EncodeUint(Buf,Order.AddrTera,4);
    EncodeArrConst(Buf,Order.AddrEth,20);
    EncodeHex10(Buf,Order.TokenID);
    EncodeUint(Buf,FromFloat(Order.Amount),8);
    EncodeUint(Buf,FromFloat(Order.TransferFee),8);
    EncodeStr(Buf,Order.Description);

    if(bFull)
    {

        var length=Order.SignArr?Order.SignArr.length:0;
        var Count=0;
        var CountPos=Buf.length;
        EncodeUint(Buf,0,1);
        for(var i=0;i<length;i++)
        {
            var Item=Order.SignArr[i];
            if(!Item.Slash)
            {
                Count++;
                EncodeUint(Buf,Item.Notary,1);
                EncodeArrConst(Buf,Item.Sign,65);
                if(MaxSignCount && Count>=MaxSignCount)
                    break;
            }
        }
        Buf[CountPos]=Count;

        //not send to Eth:
        if(bFull===2)//test mode
        {
            EncodeUint(Buf,FromFloat(Order.NotaryFee),8);
            EncodeUint(Buf,Order.Process,1);
            EncodeUint(Buf,Order.PrevID,6);
            EncodeUint(Buf,Order.NextID,6);
        }

    }
}

"public"
function GetSignArrFromOrder(Order)
{
    var Buf=[];
    EncodeOrder(Buf,Order,0);
    return  Buf;
}



//--------------------------------
function FromFloat(Sum)
{
    return Math.floor(Sum*1e9);//todo
}


//--------------------------------
//Decode utils
//--------------------------------
function DecodeUint(arr,Bytes)
{
    var len = arr.len;
    arr.len += Bytes;
    if(arr.length<arr.len)
        throw "DecodeUint. Error pos = "+arr.len+"/"+arr.length;

    var Data=0;
    for(var b=0;b<Bytes;b++)
    {
        Data = Data*256 + arr[len + b];
    }
    return Data;
}

function ZTrimTokenID(Str)
{
    while(Str.length!==64 && Str.length>1 && Str.substr(0,1)==="0")
        Str=Str.substr(1);
    return Str;
}

function DecodeHex10(arr)
{
    var arr2=DecodeArr(arr);
    var Str=GetHexFromArr(arr2);

    return ZTrimTokenID(Str);


    // var Str;
    // if(!arr2.length)
    //     return "";

    // if(arr2.length<=6)
    // {
    //     //to 10 string
    //     arr2.len=0;
    //     var Num=DecodeUint(arr2,6);
    //     Str=String(Num);


    // }
    // else
    // {
    //     //to 16 string
    //     Str=GetHexFromArr(arr2);
    // }

    // return Str;
}

function DecodeArr(arr)
{
    var length = arr[arr.len + 1] + arr[arr.len] * 256;
    arr.len += 2;
    if(arr.length<arr.len)
        throw "DecodeArr. Error pos = "+arr.len+"/"+arr.length;

    return DecodeArrConst(arr,length);
}

function DecodeArrConst(arr,length)
{
    var Ret = [];
    var len = arr.len;
    for(var i = 0; i < length; i++)
    {
        var b =  + arr[len + i];
        if(!b)
            b = 0;
        Ret[i]=b;
    }
    arr.len += length;
    return Ret;
}

function DecodeStr(arr,MaxLength)
{
    if(arr.length<arr.len)
        throw "DecodeStr. Error pos = "+arr.len+"/"+arr.length;

    var length = arr[arr.len + 1] + arr[arr.len] * 256;
    arr.len += 2;
    if(!length)
        return "";

    if(MaxLength && length>MaxLength)
        length=MaxLength;
    return DecodeStrConst(arr, length);
}

function DecodeStrConst(arr,length)
{
    var arr2 = arr.slice(arr.len, arr.len + length);
    arr.len += length;
    var Str = Utf8ArrayToStr(arr2);
    return Str;
}



//--------------------------------
//Encode utils
//style Solidity
//--------------------------------


function EncodeUint(arr,Num,Bytes)
{
    if(typeof Num!=="number")
        throw "Need type number of Num="+Num;

    if(!Bytes)
        Bytes=6;
    if(!Num)
        Num = 0;
    var Data=Num;
    var len = arr.length;
    for(var n=1;n<=Bytes;n++)
    {
        var b=Bytes-n;
        //var b=n-1;
        arr[len + b] = Data & 0xFF;

        if(n%4===0)
            Data = Math.floor(Num / 4294967296);
        else
            Data = Data>>8;
    }
}

function EncodeHex10(arr,HexStr)
{
    if(HexStr.length%2===1)
    {
        //add left "0"
        HexStr="0"+HexStr;
    }
    return EncodeArr(arr,HexStr);

    // if(!HexStr || !HexStr.length)
    // {
    //     //zero arr
    //     return EncodeArr(arr,[]);
    // }

    // if(typeof HexStr!=="string")
    //     throw "EncodeHex10: Need string, HexStr="+HexStr;


    // //console.log(HexStr);

    // var arr2;
    // if(HexStr.length<=15)
    // {
    //     //Token ID is 10 string
    //     arr2=[];
    //     EncodeUint(arr2,+HexStr,6);
    // }
    // else
    // {
    //     if(HexStr.length%2===1)
    //     {
    //         //add left "0"
    //         HexStr="0"+HexStr;
    //     }

    //     //Token ID is 16 string
    //     arr2=ArrFromBytes(HexStr);
    // }

    // EncodeArr(arr,arr2);
}

function EncodeArr(arr,arr2)
{
    if(typeof arr2==="string")
        arr2=ArrFromBytes(arr2);

    if(arr2.length===undefined)
        throw "Need type array of arr2="+arr2;


    var length = arr2.length;
    arr[arr.length] = (length >>> 8) & 0xFF;
    arr[arr.length] = length & 0xFF;

    EncodeArrConst(arr,arr2,length);
}


function EncodeArrConst(arr,arr2,length)
{
    if(typeof arr2==="string")
        arr2=ArrFromBytes(arr2);

    if(arr2.length===undefined)
        throw "Need type array of arr2="+arr2;

    for(var i = 0; i < length; i++)
    {
        var b=arr2[i];
        if(!b)
            b=0;
        arr[arr.length] = b;
    }
}

function EncodeStr(arr,Str,MaxLength)
{
    if(typeof Str!=="string")
        throw "Need type string of Str="+Str;

    if(!arr)
        arr=[];
    if(!Str)
        Str = "";
    var arrStr = toUTF8Array(Str);
    if(MaxLength && arrStr.length>MaxLength)
    {
        arrStr.length=MaxLength;
    }

    EncodeArr(arr, arrStr);

    return arr;
}
function EncodeStrConst(arr,Str,Length)
{
    if(typeof Str!=="string")
        throw "Need type string of Str="+Str;

    if(!Str)
        Str = "";
    var arrStr = toUTF8Array(Str);
    EncodeArrConst(arr, arrStr,Length);
    return arr;
}

//--------------------------------
//String utils
//--------------------------------

function Utf8ArrayToStr(array)
{
    if(!String.fromCharCode)
        return array;//TODO no find fromCharCode

    var out = utf8ArrayToStrNew(array);

    for(var i = 0; i < out.length; i++)
    {
        if(out.charCodeAt(i) === 0)
        {
            out = out.substr(0, i);
            break;
        }
    }
    return out;
}

function utf8ArrayToStrNew(array)
{
    var charCache = [];
    var charFromCodePt = String.fromCodePoint || String.fromCharCode;
    var result = [];
    var codePt, byte1;
    var buffLen = array.length;

    result.length = 0;

    for(var i = 0; i < buffLen; )
    {
        byte1 = array[i++];

        if(byte1 <= 0x7F)
        {
            codePt = byte1;
        }
        else
        if(byte1 <= 0xDF)
        {
            codePt = ((byte1 & 0x1F) << 6) | (array[i++] & 0x3F);
        }
        else
        if(byte1 <= 0xEF)
        {
            codePt = ((byte1 & 0x0F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
        }
        else
        if(String.fromCodePoint)
        {
            codePt = ((byte1 & 0x07) << 18) | ((array[i++] & 0x3F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
        }
        else
        {
            codePt = 63;
            i += 3;
        }

        result.push(charCache[codePt] || (charCache[codePt] = charFromCodePt(codePt)));
    }

    return result.join('');

}




function toUTF8Array(str)
{
    var utf8 = [];
    for(var i = 0; i < str.length; i++)
    {
        var charcode = str.charCodeAt(i);
        if(charcode < 0x80)
            utf8.push(charcode);
        else
        if(charcode < 0x800)
        {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        }
        else
        if(charcode < 0xd800 || charcode >= 0xe000)
        {
            utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
        else
        {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}





//--------------------------------
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


//--------------------------------
//-------------------------------- Test
//--------------------------------
"public"
function Test_GetBuf(Order)
{
    var Buf=[];
    EncodeOrder(Buf,Order,1);
    return Buf;
}




