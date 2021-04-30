## Ethereum/Binance Tera-Bridge  


  

Blockchains are independent islands in the information ocean and do not have built-in means for communication with each other. Meanwhile, there is a great demand for the free movement of assets between them. The greater the integration of blockchains between each other, the greater their overall network effect. Below is a communication protocol that is suitable for any blockchains that support smart contracts. It has advantages in the form of fast and safe transfer of values.

---

Notary Pool  - pool of notaries (Notary), organizes responsible signature creation. The correctness of the signature is guaranteed by the insurance deposit.
Bridge - bridges across to other blockchains, organizes the transfer of coins, provides an interface to the user who needs to transfer coins. On the interface part, it looks at two blockchains at once to control the correctness of transactions. In case of incorrect behavior of the validators, it sends the cryptographic proof to the notary pool.
DeFi - smart contracts for which the profit from commission fees from notaries is deducted. It can be owned by either one person or several on the principle of a joint-stock company through the sale of tokens. The funds from the token sale are used to cover the notary's security deposit.

 

---
There are 3 types of actors in the exchange scheme:
1. User account Tera
2. Ethereum/Binance User Account
3. Bridge Validators

Physically, the users of items 1 and 2 can match.

Validators must have two complete blockchains: Ethereum and Tera. As a motivation, the validators receive a commission for the transfer.



### From Ethereum/Binance

An Eth user sends tokens to a special smart contract that stores the token type, amount, and number of the recipient's Tera account. The commission for the transaction of the Ether blockchain is at the expense of the initiator.

When receiving tokens for an Ethereum smart contract, the validators send a transaction about this event to the Tera blockchain in the form of a call to a specific smart contract method.

When a certain number of calls to such methods are reached (when the required quorum of the validator node is reached), a transaction is formed to transfer the token to the recipient's account in Tera.




### From Tera

The user sends the tokens to a special smart contract account with the recipient's address in Ethereum. A special window opens for the user - the transfer card.

When receiving tokens for a smart contract, the validators form electronic signatures that are placed in the card.

As soon as the card has a sufficient number of validator signatures, the opening of the Ethereum wallet window (for example, Metamask) is initiated. Signatures are parameters that are passed to a specific smart contract method that transfers tokens. The method can be called by anyone - either the sending or receiving party, in this case it pays a commission to the Ethereum blockchain network.



### Validators and stakers

To become a bridge validator, you need to run two blockchains on your server and send a security deposit in the tokens that this bridge serves to the smart contract. 

To simplify the collection of deposit amounts, the concept of staking is introduced into the system. Each owner of the tokens can give a loan to the validator that he trusts for a certain part of the profit from the work of the bridge (which is formed from the transfer fees). The staker has a risk that the transaction will be recognized as invalid and part of the insured amount will be burned.




### Security

The validator transfers values only in the amount not exceeding its deposit. Periodically, the deposit is restored after the cryptographic proof of the matching state of the smart contracts in both blockchains is provided.

To complicate the attack, each validator has several signing nodes in its pool. They must be located on different secure servers. The transaction must have a sufficient number of node signatures. Thus, compromising one node will not lead to the loss of the validator's money.



Teaser video: https://youtu.be/FCB9KemgeYw
Description video: https://youtu.be/-kOWXWKadh8
Telegram channel: https://t.me/terahub


Protocol description:
https://docs.google.com/document/d/1XJXZw186m4rBG5MGN8SHTpknPDGpPk6FjrjsbGRhLFw/edit


Articles:
* ENG: https://docs.google.com/document/d/1iDnN2owjOdlc1_83Wml1m7-WGhi4JCYJwRhrlga2PJQ/edit?usp=sharing
* RUS: https://docs.google.com/document/d/1tqELNJivosx-qlFQZWqa6Qy9NI9G7tSEZ7q0500Ji0A/edit?usp=sharing
