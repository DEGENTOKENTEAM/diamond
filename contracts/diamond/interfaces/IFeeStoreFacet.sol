// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { FeeStoreConfig, FeeConfigSyncDTO, FeeConfigSyncHomeDTO } from "./../helpers/Structs.sol";

/// @title Fee Store Facet Interface
/// @author Daniel <danieldegendev@gmail.com>
interface IFeeStoreFacet {
    /// Synchronizes fee configs
    /// @param _feeConfigSyncDTO array of fee configs to process in the fee store
    function syncFees(FeeConfigSyncDTO[] calldata _feeConfigSyncDTO) external payable;

    /// Restores fees which are actually intended to be sent to the home chain
    /// @param _dto data which is primarily used for sending fees to the home chain
    function restoreFeesFromSendFees(FeeConfigSyncHomeDTO memory _dto) external payable;

    /// Gets a fee store config based on the fee id
    /// @param _id fee config id
    /// @return _feeStoreConfig FeeStoreConfig, see {contracts/diamond/helpers/Structs.sol#FeeStoreConfig}
    function getFeeStoreConfig(bytes32 _id) external view returns (FeeStoreConfig memory _feeStoreConfig);
}
