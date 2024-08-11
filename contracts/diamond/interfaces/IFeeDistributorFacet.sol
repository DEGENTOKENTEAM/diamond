// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { FeeConfigSyncHomeDTO } from "./../helpers/Structs.sol";

/// @title Fee Distributor Interface
/// @author Daniel <danieldegendev@gmail.com>
interface IFeeDistributorFacet {
    // this is guarateed to get the tokens before being executed

    /// Pushes the fee to the desired receivers
    /// @param _token the token address being received
    /// @param _amount amount of tokens being received
    /// @param _dto the dto of the fee store to determine the split of _amount
    /// @dev an updated dto needs to be created since the receiving amount is not
    ///      matching the sent amount anymore. The contract will 100% receive the
    ///      _token _amount before being executed
    /// @dev only available to FEE_DISTRIBUTOR_PUSH_ROLE role
    /// @dev if the token doesn't match, it will fail.
    function pushFees(address _token, uint256 _amount, FeeConfigSyncHomeDTO calldata _dto) external payable;

    /// Distributes a single native fee
    /// @param _feeId id of the fee
    /// @param _bountyReceiver address of the bounty receiver
    /// @param _bountyShareInBps percentage share in bps
    /// @return _amount fee amount that has been paid (excl. bounty)
    /// @return _bountyAmount bounty that has been paid
    /// @dev the fee receiver should to have defined a proper swapping path
    function feeDistributorDepositSingleFeeNative(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) external payable returns (uint256 _amount, uint256 _bountyAmount);
}
