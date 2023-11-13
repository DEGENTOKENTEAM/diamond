# Solidity API

## LibFeeManager

Helper functions for the Fee Manager Facet

### exists

```solidity
function exists(bytes32 _id) internal view returns (bool _exists)
```

Checks whether a fee config exsists or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

### isFeeConfigInUse

```solidity
function isFeeConfigInUse(bytes32 _id) internal view returns (bool _exists)
```

Checks whether a fee config is in use on a specific chain or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

### getChainTarget

```solidity
function getChainTarget(uint256 _chainId) internal view returns (address _target)
```

Gets the target address for a specific chain

_normally the address of the diamond on the target chain_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id |

### getFeeConfigById

```solidity
function getFeeConfigById(bytes32 _id) internal view returns (struct FeeConfig _feeConfig)
```

Gets the fee config by a given id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

### queue

```solidity
function queue(bytes32 _id, uint256 _chainId, enum FeeSyncAction _action) internal
```

Queues up a specific fee config for a specific chain with a specific action

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |
| _chainId | uint256 | chain id |
| _action | enum FeeSyncAction | action to execute on the target chain |

### archiveFeeConfig

```solidity
function archiveFeeConfig(bytes32 _id) internal
```

Simple archiving of fee configs

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id will be called on update and delete of a fee config |

### store

```solidity
function store() internal pure returns (struct LibFeeManagerStorage.FeeManagerStorage _store)
```

store

