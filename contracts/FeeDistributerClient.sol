// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./interfaces/IFeeDistributor.sol";
import "./interfaces/IFeeDistributorClient.sol";

abstract contract FeeDistributorClient is IFeeDistributorClient, ERC165 {
    error NoCollectedFees();
    error NoFeeDeistributor(address sender);

    // mapping(id => amount)
    CollectedFee[] collectedFees;
    address feeDistributor;

    constructor(address _feeDistributor) {
        feeDistributor = _feeDistributor;
    }

    function pullFee() external virtual returns (CollectedFee[] memory fees) {
        if (feeDistributor != msg.sender) revert NoFeeDeistributor(msg.sender);
        if (collectedFees.length > 0) revert NoCollectedFees();
        fees = collectedFees;
        delete collectedFees;
    }

    function applyFee(
        uint256 amount
    ) external virtual returns (FeeDetermined memory determined) {
        FeeDetermineData memory dertermineData = FeeDetermineData({
            candidate: address(this),
            amount: amount
        });
        FeeDetermined memory determinedData = IFeeDistributor(feeDistributor)
            .determine(dertermineData);

        bool applied = false;
        for (uint256 i = 0; i < collectedFees.length; i++) {
            if (collectedFees[i].id == determinedData.id) {
                collectedFees[i].amount += determinedData.fee;
                applied = true;
            }
        }

        if (!applied) {
            collectedFees.push(
                CollectedFee({
                    id: determinedData.id,
                    amount: determinedData.fee
                })
            );
        }

        determined = determinedData;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IFeeDistributorClient).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
