// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./IFee.sol";

interface IFeeDistributorClient is IFee, IERC165 {
    function pullFee() external returns (CollectedFee[] memory fees);

    function applyFee(
        uint256 amount
    ) external returns (FeeDetermined memory determined);
}
