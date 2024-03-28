// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { FeeConfig } from "./../helpers/Structs.sol";

interface IFeeManager {
    function getFeeConfig(bytes32 _id) external view returns (FeeConfig memory _feeConfig);
}
