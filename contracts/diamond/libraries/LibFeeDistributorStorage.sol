// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { FeeConfigSyncHomeDTO } from "./../helpers/Structs.sol";

/// @title Lib Fee Distributor Storage
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Storage library for the fee distributor facet
library LibFeeDistributorStorage {
    bytes32 constant FEE_DISTRIBUTOR_STORAGE_NAMESPACE = keccak256("degenx.fee-distributor.storage.v1");

    /// @param name the name of the fee share for the UI
    /// @param points the fee share points
    /// @param receiver the receiver of the fee share
    /// @param swap a dedicated swapping path for the fee share
    struct Share {
        string name;
        uint64 points;
        address receiver;
        address[] swap;
    }

    /// @param shares stores the shares in an array
    /// @param queue stores a queue of fees that can be send home
    /// @param shareIndex store the share index of the shares array
    /// @param totalPoints cumulative share points
    /// @param baseToken the expected token from the bridge
    /// @param router uniswap v2 based router
    /// @param bountyShare share of the bounty
    /// @param bountyReceiver bounty receiver for processing purposes
    /// @param lastBountyReceiver last recent bounty receiver
    /// @param lastBountyAmount last recent bounty amount that receiver got
    /// @param totalBounties total amount of bounties paid out
    /// @param running running state of the fee distributor
    /// @param bountyActive is a bounty active or not
    /// @param initialized initialize state of the facet
    struct Storage {
        Share[] shares;
        FeeConfigSyncHomeDTO[] queue;
        mapping(address => uint256) shareIndex;
        uint64 totalPoints;
        address baseToken;
        address nativeWrapper;
        address router;
        uint256 pushFeesGasCompensationForCaller;
        // bounties
        uint64 bountyShare;
        address bountyReceiver;
        address lastBountyReceiver;
        uint256 lastBountyAmount;
        uint256 totalBounties;
        // flags
        bool running;
        bool bountyActive;
        bool bountyInToken;
        bool initialized;
    }

    /// Store
    function store() internal pure returns (Storage storage _s) {
        bytes32 position = FEE_DISTRIBUTOR_STORAGE_NAMESPACE;
        assembly {
            _s.slot := position
        }
    }
}
