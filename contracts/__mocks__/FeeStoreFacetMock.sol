// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { IFeeStoreFacet } from "./../diamond/interfaces/IFeeStoreFacet.sol";
import { FeeConfigSyncHomeDTO, FeeConfigSyncHomeFees, FeeConfigSyncDTO, FeeStoreConfig } from "./../diamond/helpers/Structs.sol";
import { LibFeeStore } from "./../diamond/libraries/LibFeeStore.sol";
import { LibFeeStoreStorage } from "./../diamond/libraries/LibFeeStoreStorage.sol";

contract FeeStoreFacetMock is IFeeStoreFacet {
    event prepareToSendFeesEvent();

    function prepareToSendFeesSETUP(uint256[] calldata _amounts, FeeStoreConfig[] calldata _feeStoreConfig) external {
        LibFeeStoreStorage.FeeStoreStorage storage s = LibFeeStoreStorage.feeStoreStorage();
        for (uint256 i = 0; i < _feeStoreConfig.length; ) {
            FeeStoreConfig memory fmem = _feeStoreConfig[i];
            FeeStoreConfig storage fstore = s.feeConfigs[_feeStoreConfig[i].id];
            fstore.id = fmem.id;
            fstore.fee = fmem.fee;
            fstore.target = fmem.target;
            fstore.deleted = fmem.deleted;
            s.feeConfigIds.push(fmem.id);
            s.collectedFeesTotal += _amounts[i];
            s.collectedFees[fmem.id] += _amounts[i];
            unchecked {
                i++;
            }
        }
    }

    function prepareToSendFees() external returns (FeeConfigSyncHomeDTO memory _dto) {
        return LibFeeStore.prepareToSendFees();
    }

    function syncFees(FeeConfigSyncDTO[] calldata _feeConfigSyncDTO) external payable {}

    event restoreFeesFromSendFeesEvent(FeeConfigSyncHomeDTO _dto);

    function restoreFeesFromSendFees(FeeConfigSyncHomeDTO memory _dto) external payable {
        emit restoreFeesFromSendFeesEvent(_dto);
    }

    function getFeeStoreConfig(bytes32 _id) external view returns (FeeStoreConfig memory _feeStoreConfig) {}

    function setIntermediateAsset(address _intermediateAsset) external {
        LibFeeStore.setIntermediateAsset(_intermediateAsset);
    }
}
