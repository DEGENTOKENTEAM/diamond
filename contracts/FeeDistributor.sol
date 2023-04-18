// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "./interfaces/IFeeDistributor.sol";
import "./interfaces/IFeeDistributorClient.sol";

contract FeeDistributor is IFeeDistributor, Initializable {
    mapping(address => FeeConfig) feeMap;

    /// instatiiation
    function initialize() public initializer {}

    function determine(
        FeeDetermineData memory data
    ) external view returns (FeeDetermined memory fee) {
        
    }

    function pullFromClient(address client) external {
        if (
            !ERC165CheckerUpgradeable.supportsInterface(
                from,
                type(IFeeDistributorClient).interfaceId
            )
        ) revert MissingImplementationForFeeClient(from);

        CollectedFee[] memory collectedFees = IFeeDistributorClient(client)
            .pullFee();

        for (uint256 i = 0; i < collectedFees.length; i++) {
            collectedFees[i].id
        }
        /// check which
    }

    function addFee(AddFeeParams memory params) external {
        if (params.candidate == address(0)) revert AddressZero();
        if (feeMap[params.candidate].id > 0) revert FeeExists(params.candidate);

        feeMap[params.candidate] = FeeConfig({
            id: 1,
            receiver: params.receiver,
            feeAmounts: params.feeAmounts
        });
        /// while adding a new fee to an existing feeConfig, pull old fees from the contract
        /// if the fees cant be pulled, the fee can not be updated
    }

    // function updateFee()
}
