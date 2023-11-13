// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

struct SwapPaths {
    address[] tjoePath;
    address[] pangoPath;
}

struct OptimalSwapBalance {
    uint256 inputAmountTjoe;
    uint256 inputAmountPango;
    uint256 outputAmountBalanced;
    uint256 outputAmountUnbalanced;
}

struct MultiswapBalanced {
    uint256 inputAmount;
    uint256 outputAmountMin;
    address[] tjoePath;
    address[] pangoPath;
}

interface IAggregator {
    function determineOptimalSwaps(
        uint256 inputAmount,
        SwapPaths memory swapPaths
    ) external view returns (OptimalSwapBalance memory optimalSwap);

    function multiswapBalanced(
        MultiswapBalanced calldata swapData
    ) external payable returns (uint256 outputAmountNet, uint256 outputAmountGross, uint256 commissionAmount);

    function isValidPair(address from, address to) external view returns (bool isPair);
}
