// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;


import "./DataLib.sol";
import "./proxy/Proxy.sol";

contract ProxyBridge is  DataLib, Proxy
{
    uint constant DEVELOPING_MODE_PERIOD=365*24*3600;
    uint public StartDeveloperMode;


    constructor()
    {
        assert(_IMPLEMENTATION_SLOT == bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1));

        Owner = msg.sender;
    }

    function SetUpgrade(address Address)public
    {
        require(msg.sender == Owner,"Need only owner access");

        if(StartDeveloperMode>0)
        {
            require(block.timestamp-StartDeveloperMode <= DEVELOPING_MODE_PERIOD,"Smart contract in immutable mode");
        }
        StartDeveloperMode=block.timestamp;

        _setImplementation(Address);
    }

    //ERC1967

    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 private constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    /**
     * @dev Returns the current implementation address.
     */
    function _implementation() internal view virtual override returns (address impl) {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            impl := sload(slot)
        }
    }


    /**
     * @dev Stores a new address in the EIP1967 implementation slot.
     */
    function _setImplementation(address newImplementation) private {
        //require(Address.isContract(newImplementation), "ERC1967Proxy: new implementation is not a contract");

        bytes32 slot = _IMPLEMENTATION_SLOT;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(slot, newImplementation)
        }
    }

    function GetImplementation() public view returns (address)
    {
        return _implementation();
    }


}

