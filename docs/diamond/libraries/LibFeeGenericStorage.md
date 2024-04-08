# Solidity API

## LibFeeGenericStorage

Storage for the Fee Generic Facet

### FEE_GENERIC_STORAGE_POSITION

```solidity
bytes32 FEE_GENERIC_STORAGE_POSITION
```

### Storage

```solidity
struct Storage {
  uint256 homeChainId;
  address nativeWrapper;
  address uniswapV2Router;
  bool isHomeChain;
  bool initialized;
}
```

### store

```solidity
function store() internal pure returns (struct LibFeeGenericStorage.Storage _s)
```

store

