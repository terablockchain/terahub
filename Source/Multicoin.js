//--------------------------------------
//Multicoin interface support (NFT,ERC)
//--------------------------------------

// "public"
// function TokenList()
// {
//     return ["COIN1","COIN2"];
// }
"public"
function URI(Params)
{
    //Params:{Token,ID}
}


"public"
function BalanceOf(Params)
{
    //Params:{Token,Account,ID}
}

// "public"
// function BalanceOfBatch(Params)
// {
//     //Params:{TokenArr:[],AccountArr:[],IDArr:[]}
// }

"public"
function ReadTokens(Account)
{
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
function Transfer(Params)
{
    //Params:{Token,From,To,ID,Amount,Description}
}

"public"
function TransferBatch(Params)
{
    //Params:{Token,From,To,IDArr:[],AmountArr:[],Description}
}

