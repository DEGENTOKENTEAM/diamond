# Solidity API

## FeeManagerFacet

It's responsible for managing fees and its state of deployment. This contract supposed to be deployed only on the home chain, not on the target chain.

### ChainIdZero

```solidity
error ChainIdZero()
```

### ChainIdExists

```solidity
error ChainIdExists(uint256 chainId)
```

### ChainIdNotExisting

```solidity
error ChainIdNotExisting(uint256 chainId)
```

### ConfigAlreadyAssignedToChain

```solidity
error ConfigAlreadyAssignedToChain(bytes32 id, uint256 chainId)
```

### ConfigNotAssignedToChain

```solidity
error ConfigNotAssignedToChain(bytes32 id, uint256 chainId)
```

### ConfigsAssignedToChain

```solidity
error ConfigsAssignedToChain(uint256 chainId)
```

### ConfigInUse

```solidity
error ConfigInUse(bytes32 id)
```

### FeeZero

```solidity
error FeeZero()
```

### ConfigExists

```solidity
error ConfigExists(bytes32 id)
```

### ConfigNotExisting

```solidity
error ConfigNotExisting(bytes32 id)
```

### SyncQueueEmpty

```solidity
error SyncQueueEmpty()
```

### FeeConfigAdded

```solidity
event FeeConfigAdded(bytes32 id, struct AddFeeConfigParams params, address sender)
```

### FeeConfigUpdated

```solidity
event FeeConfigUpdated(bytes32 id, struct UpdateFeeConfigParams params, address sender)
```

### FeeConfigRemoved

```solidity
event FeeConfigRemoved(bytes32 id, address sender)
```

### ChainAdded

```solidity
event ChainAdded(uint256 chainId, address target)
```

### ChainRemoved

```solidity
event ChainRemoved(uint256 chainId)
```

### ConfigAssignedToChain

```solidity
event ConfigAssignedToChain(bytes32 id, uint256 chainId)
```

### ConfigUnassignedFromChain

```solidity
event ConfigUnassignedFromChain(bytes32 id, uint256 chainId)
```

### ConfigUnassignedFromAllChains

```solidity
event ConfigUnassignedFromAllChains(bytes32 id)
```

### ClearQueue

```solidity
event ClearQueue()
```

### ManuallyQueued

```solidity
event ManuallyQueued()
```

### addChain

```solidity
function addChain(struct AddChainParams _params) external
```

Adds a corresponding chain

_the target address is the desired contract address receiving the fee config information_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct AddChainParams | consists of the chain id and target addess |

### removeChain

```solidity
function removeChain(struct RemoveChainParams _params) external
```

Removes a corresponding chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct RemoveChainParams | consists only of the chain id |

### addFeeConfig

```solidity
function addFeeConfig(struct AddFeeConfigParams _params) external
```

Adds a fee config

_will fail if a config id is already existing or the fee value is zero_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct AddFeeConfigParams | see {contracts/diamond/helpers/Structs.sol#AddFeeConfigParams} |

### updateFeeConfig

```solidity
function updateFeeConfig(struct UpdateFeeConfigParams _params) external
```

Updates a fee config partially

_if you need more data changed than _params in providing, remove and add a fee_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct UpdateFeeConfigParams | see {contracts/diamond/helpers/Structs.sol#UpdateFeeConfigParams} |

### removeFeeConfig

```solidity
function removeFeeConfig(struct RemoveFeeConfigParams _params) external
```

Removes a fee config

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct RemoveFeeConfigParams | params consist of a fee id that should be removed |

### assignFeeConfigToChain

```solidity
function assignFeeConfigToChain(struct AssignFeeConfigToChainParams _params) external
```

Adds a fee config to chain connection

_after the assignment, the fee config is added to a queue with an add action_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct AssignFeeConfigToChainParams | see {contracts/diamond/helpers/Structs.sol#AssignFeeConfigToChainParams} |

### unassignFeeConfigFromChain

```solidity
function unassignFeeConfigFromChain(struct UnassignFeeConfigFromChainParams _params) external
```

Removes a fee config to chain connection

_the main task will be done in {_decoupleFeeConfigFromChain}_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct UnassignFeeConfigFromChainParams | see {contracts/diamond/helpers/Structs.sol#UnassignFeeConfigFromChainParams} |

### unassignFeeConfigFromAllChains

```solidity
function unassignFeeConfigFromAllChains(struct UnassignFeeConfigFromAllChainsParams _params) external
```

Removes all existing fee config to chain connections

_it will iteration through all chains and removes the connections. The main task will be done in {_decoupleFeeConfigFromChain}_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct UnassignFeeConfigFromAllChainsParams | see {contracts/diamond/helpers/Structs.sol#UnassignFeeConfigFromAllChainsParams} |

### clearQueue

```solidity
function clearQueue() external
```

Clears the queue and removes all current jobs

_the deployment state is set to pending while doing_

### queueUpManually

```solidity
function queueUpManually(struct FeeSyncQueue[] _syncQueue) external
```

Queues up fee configs manually

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _syncQueue | struct FeeSyncQueue[] | list of FeeSyncQueue data |

### getFeeConfigIds

```solidity
function getFeeConfigIds() external view returns (bytes32[] _feeConfigIds)
```

Gets the fee config ids

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigIds | bytes32[] | returns an arrayf of fee config ids |

### getFeeConfig

```solidity
function getFeeConfig(bytes32 _id) external view returns (struct FeeConfig _feeConfig)
```

Gets the fee config by fee config id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfig | struct FeeConfig | fee config |

### getArchivedFeeConfigs

```solidity
function getArchivedFeeConfigs(bytes32 _id) external view returns (struct FeeConfig[] _feeConfig)
```

Gets all previous fee config states by fee config id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfig | struct FeeConfig[] | array of fee configs |

### getFeeConfigsByChain

```solidity
function getFeeConfigsByChain(uint256 _chainId) external view returns (bytes32[] _feeConfigs)
```

Gets all fee config ids by chain id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigs | bytes32[] | array of fee config ids |

### getFeeSyncQueueByChain

```solidity
function getFeeSyncQueueByChain(uint256 _chainId) external view returns (struct FeeSyncQueue[] _feeSyncQueue)
```

Gets the current queue for a chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeSyncQueue | struct FeeSyncQueue[] | returns an array of queue items. See {contracts/diamond/helpers/Structs.sol#FeeSyncQueue} |

### getFeeConfigDeployState

```solidity
function getFeeConfigDeployState(uint256 _chainId, bytes32 _id) external view returns (enum FeeDeployState _state)
```

Gets the current deployment state of a fee config id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id |
| _id | bytes32 | fee config id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _state | enum FeeDeployState | deployment state of a fee config |

### getDeployStatesForChain

```solidity
function getDeployStatesForChain(uint256 _chainId) external view returns (struct FeeConfigDeployState[] _states)
```

Gets the current deployment state of all fee config ids from a given chain id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _states | struct FeeConfigDeployState[] | all deployment states of config ids for a specific chain |

### _decoupleFeeConfigFromChain

```solidity
function _decoupleFeeConfigFromChain(bytes32 _id, uint256 _chainId) internal
```

Removes a fee config to chain connection and queues it

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |
| _chainId | uint256 | chain id |

