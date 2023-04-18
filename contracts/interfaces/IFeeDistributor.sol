// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./IFee.sol";

interface IFeeDistributor is IFee {
    /// errors
    error MissingImplementationForFeeClient(address account);
    error AddressZero();
    error FeeExists(address account);

    function determine(
        FeeDetermineData memory data
    ) external view returns (FeeDetermined memory fee);

    function pullAndDistribute(address client) external;
}
