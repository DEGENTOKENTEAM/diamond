// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

interface IFee {
    /// data structures
    struct FeeAmount {
        uint32 value;
        uint32 denominator;
    }

    struct FeeConfig {
        uint256 id;
        address receiver;
        FeeAmount[] feeAmounts;
    }

    struct FeeDetermined {
        uint256 id;
        uint256 fee;
        uint256 included;
        uint256 excluded;
    }

    struct FeeDetermineData {
        address candidate;
        uint256 amount;
    }

    struct AddFeeParams {
        address candidate;
        address receiver;
        FeeAmount[] feeAmounts;
    }

    struct CollectedFee {
        uint256 id;
        uint256 amount;
    }
}
