// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { IFeeDistributorFacet } from "./../diamond/interfaces/IFeeDistributorFacet.sol";
import { FeeConfigSyncHomeDTO } from "./../diamond/helpers/Structs.sol";

contract FeeDistributorFacetMock is IFeeDistributorFacet {
    event pushFeesEvent(address _token, uint256 _amount, FeeConfigSyncHomeDTO _dto, uint256 _value, uint256 _gas);
    event feeDistributorDepositSingleFeeNativeEvent(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps,
        uint256 _value,
        uint256 _gas
    );

    function pushFees(address _token, uint256 _amount, FeeConfigSyncHomeDTO calldata _dto) external payable {
        emit pushFeesEvent(_token, _amount, _dto, msg.value, gasleft());
    }

    function feeDistributorDepositSingleFeeNative(bytes32 _feeId, address _bountyReceiver, uint256 _bountyShareInBps) external payable {
        emit feeDistributorDepositSingleFeeNativeEvent(_feeId, _bountyReceiver, _bountyShareInBps, msg.value, gasleft());
    }
}
