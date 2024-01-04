# Solidity API

## LibFeeManagerStorage

Storage for the Fee Manager Facet

### FEE_MANAGER_STORAGE_POSITION

```solidity
bytes32 FEE_MANAGER_STORAGE_POSITION
```

### FeeManagerStorage

```solidity
struct FeeManagerStorage {
  uint256[] chainIds;
  bytes32[] feeConfigIds;
  mapping(uint256 => address) chainTargets;
  mapping(uint256 => bytes32[]) chainIdFeeConfigMap;
  mapping(uint256 => mapping(bytes32 => bool)) chainIdFeeConfig;
  mapping(uint256 => bool) isChainSupported;
  mapping(bytes32 => struct FeeConfig) feeConfigs;
  mapping(bytes32 => struct FeeConfig[]) feeConfigsArchive;
  mapping(uint256 => struct FeeSyncQueue[]) feeSyncQueue;
  mapping(uint256 => mapping(bytes32 => enum FeeDeployState)) feeDeployState;
}
```

### feeManagerStorage

```solidity
function feeManagerStorage() internal pure returns (struct LibFeeManagerStorage.FeeManagerStorage fms)
```

store

