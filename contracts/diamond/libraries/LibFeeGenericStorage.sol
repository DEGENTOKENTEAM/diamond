// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

/// @title Lib Fee Generic Storage
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Storage for the Fee Generic Facet
library LibFeeGenericStorage {
    bytes32 constant FEE_GENERIC_STORAGE_POSITION = keccak256("degenx.fee-generic.storage.v1");

    struct Storage {
        uint256 homeChainId;
        address nativeWrapper;
        address uniswapV2Router;
        bool isHomeChain;
        bool initialized;
    }

    /// store
    function store() internal pure returns (Storage storage _s) {
        bytes32 position = FEE_GENERIC_STORAGE_POSITION;
        assembly {
            _s.slot := position
        }
    }
}
