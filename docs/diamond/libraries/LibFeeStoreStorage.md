# Solidity API

## LibFeeStoreStorage

### FEE_STORE_STORAGE_POSITION

```solidity
bytes32 FEE_STORE_STORAGE_POSITION
```

### FeeStoreStorage

```solidity
struct FeeStoreStorage {
  mapping(bytes32 => struct FeeStoreConfig) feeConfigs;
  mapping(bytes32 => uint256) collectedFees;
  uint256 collectedFeesTotal;
  bytes32[] feeConfigIds;
  address operator;
  address intermediateAsset;
}
```

### feeStoreStorage

```solidity
function feeStoreStorage() internal pure returns (struct LibFeeStoreStorage.FeeStoreStorage fss)
```

