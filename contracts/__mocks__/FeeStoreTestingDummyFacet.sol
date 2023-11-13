// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { FeeConfigSyncHomeDTO } from "./../diamond/helpers/Structs.sol";
import { IFeeStoreFacet } from "./../diamond/interfaces/IFeeStoreFacet.sol";
import { LibFeeStore } from "./../diamond/libraries/LibFeeStore.sol";

contract FeeStoreTestingDummyFacet {
    function prepareToSendFeesTest() external returns (FeeConfigSyncHomeDTO memory _messageData) {
        return LibFeeStore.prepareToSendFees();
    }

    function calcFeesRelative(
        bytes32 _feeConfigId,
        address _asset,
        uint256 _amount
    ) external view returns (uint256 _amountNet, uint256 _fee, uint256 _feePoints) {
        return LibFeeStore.calcFeesRelative(_feeConfigId, _asset, _amount);
    }

    function calcFeesAbsolute(
        bytes32 _feeConfigId,
        address _asset,
        uint256 _amount
    ) external view returns (uint256 _amountNet, uint256 _fee, uint256 _feePoints) {
        return LibFeeStore.calcFeesAbsolute(_feeConfigId, _asset, _amount);
    }

    function putFees(bytes32 _feeConfigId, uint256 _amount) external {
        LibFeeStore.putFees(_feeConfigId, _amount);
    }
}
