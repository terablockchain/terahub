// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

//TODO переделать ссылки по типу: import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./token/ERC721/extensions/ERC721Enumerable.sol";



//------------------------------------------------------------------------
contract TokenERC721Enum is ERC721Enumerable
{
    using Strings for uint256;

    modifier OnlyOwner()
    {
        require(msg.sender == SmartOwner, "Need only owner access");
        _;
    }


    address SmartOwner;
    string BaseURI;
    uint48 AddMintNum;

    constructor()ERC721("TERA-NFT", "TERA-NFT")
    {
        //SmartOwner = msg.sender;
        BaseURI="http://terahub.io/nft/";
    }

    function _baseURI() internal view virtual override returns (string memory)
    {
        return BaseURI;
    }
    function SetURI(string memory _BaseURI) public OnlyOwner
    {
        BaseURI=_BaseURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory)
    {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        tokenId = tokenId % 1e15;

        string memory baseURI = _baseURI();
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }



    function SetSmart(address newOwner) public
    {
        if(SmartOwner!=address(0))
            require(msg.sender == SmartOwner, "Need only owner access!");

        if (newOwner != address(0))
        {
            SmartOwner = newOwner;
        }
    }


    function SmartMint(address account, uint256 id, uint amount) public OnlyOwner
    {
        uint num=0;
        while(amount>0)
        {
            num++;
            amount--;
            uint256 idSet;
            if(_exists(id) || num>1)
            {
                AddMintNum++;
                idSet=AddMintNum * 1e15 + id;
            }
            else
            {
                idSet=id;
            }

            _safeMint(account,idSet,"");
        }
    }

    function SmartBurn(address account, uint256 id, uint256) public OnlyOwner
    {
        require(ERC721.ownerOf(id) == account, "ERC721: burn of token that is not own");

        _burn(id);
    }

    function GetTokenList(address account,uint16 MaxCount)public view returns(uint[] memory Arr)
    {
        uint Count=balanceOf(account);
        if(Count>MaxCount)
            Count=MaxCount;
        if(Count>0)
        {
            Arr=new uint[](Count);
            for(uint i=0;i<Count;i++)
            {
                Arr[i]=tokenOfOwnerByIndex(account,i);
            }
        }
    }
}

