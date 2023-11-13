# Solidity API

## SwapPaths

```solidity
struct SwapPaths {
  address[] tjoePath;
  address[] pangoPath;
}
```

## OptimalSwapBalance

```solidity
struct OptimalSwapBalance {
  uint256 inputAmountTjoe;
  uint256 inputAmountPango;
  uint256 outputAmountBalanced;
  uint256 outputAmountUnbalanced;
}
```

## MultiswapBalanced

```solidity
struct MultiswapBalanced {
  uint256 inputAmount;
  uint256 outputAmountMin;
  address[] tjoePath;
  address[] pangoPath;
}
```

## IAggregator

### determineOptimalSwaps

```solidity
function determineOptimalSwaps(uint256 inputAmount, struct SwapPaths swapPaths) external view returns (struct OptimalSwapBalance optimalSwap)
```

### multiswapBalanced

```solidity
function multiswapBalanced(struct MultiswapBalanced swapData) external payable returns (uint256 outputAmountNet, uint256 outputAmountGross, uint256 commissionAmount)
```

### isValidPair

```solidity
function isValidPair(address from, address to) external view returns (bool isPair)
```

