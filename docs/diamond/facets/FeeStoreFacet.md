# Solidity API

## FeeStoreFacet

every contract needs to take care of the fees they collect. ITS JUST STORAGE HERE

### STORAGE_NAMESPACE

```solidity
bytes32 STORAGE_NAMESPACE
```

### FeeConfigAdded

```solidity
event FeeConfigAdded(bytes32 id)
```

### FeeConfigUpdated

```solidity
event FeeConfigUpdated(bytes32 id)
```

### FeeConfigDeleted

```solidity
event FeeConfigDeleted(bytes32 id)
```

### FeeConfigMarkedAsDeleted

```solidity
event FeeConfigMarkedAsDeleted(bytes32 id)
```

### FeesPrepared

```solidity
event FeesPrepared(uint256 amount, struct FeeConfigSyncHomeDTO candidate)
```

### FeesSynced

```solidity
event FeesSynced(struct FeeConfigSyncDTO[] candidates)
```

### FeesRestored

```solidity
event FeesRestored(struct FeeConfigSyncHomeDTO candidate)
```

### FeesCollected

```solidity
event FeesCollected(struct FeeConfigSyncHomeDTO candidate)
```

### UpdatedOperator

```solidity
event UpdatedOperator(address operator)
```

### UpdatedIntermediateAsset

```solidity
event UpdatedIntermediateAsset(address intermediateAsset)
```

### FeeAmountDeposited

```solidity
event FeeAmountDeposited(address _asset, bytes32 _feeConfigId, uint256 _amount)
```

### Initialized

```solidity
event Initialized()
```

### InvalidFee

```solidity
error InvalidFee(bytes32 id)
```

### DataMissing

```solidity
error DataMissing()
```

### TransferFailed

```solidity
error TransferFailed()
```

### Storage

```solidity
struct Storage {
  bool initialized;
}
```

### initFeeStoreFacet

```solidity
function initFeeStoreFacet(address _operator, address _intermediateAsset) external
```

Initializes the facet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | address of account that is receiving fees if this contracts automations are failing |
| _intermediateAsset | address |  |

### syncFees

```solidity
function syncFees(struct FeeConfigSyncDTO[] _feeConfigSyncDTO) external payable
```

Synchronizes fee configs

_it will check wheter an array is sufficient and add, updates or removes fee configs based on the fee sync action create by the fee manager_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigSyncDTO | struct FeeConfigSyncDTO[] | array of fee configs to process in the fee store |

### restoreFeesFromSendFees

```solidity
function restoreFeesFromSendFees(struct FeeConfigSyncHomeDTO _dto) external payable
```

Restores fees which are actually intended to be sent to the home chain

_this function restores the fees based on refunds from bridge providers, in case someone starts try to sync fees home and it's failing on the bridge side
if the fee config is not configured anymore, the funds that are getting restored, will be send to the operator_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dto | struct FeeConfigSyncHomeDTO | data which is primarily used for sending fees to the home chain |

### collectFeesFromFeeStore

```solidity
function collectFeesFromFeeStore() external
```

Sends the current collected fees to the Operator in case no bridge provider is working and the job needs to be done manually

### setOperator

```solidity
function setOperator(address _operator) external
```

Sets a new operator

__operator can't be a zero address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | address of the operator |

### setIntermediateAsset

```solidity
function setIntermediateAsset(address _intermediateAsset) external
```

Sets the intermediate asset

__intermediateAsset can't be a zero address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _intermediateAsset | address | address of the asset |

### feeStoreDepositFeeAmount

```solidity
function feeStoreDepositFeeAmount(bytes32 _feeConfigId, uint256 _amount) external
```

Deposit a fee manually

_can only be executed from the fee store manager role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigId | bytes32 | fee config id |
| _amount | uint256 | amount to deposit |

### getFeeStoreConfig

```solidity
function getFeeStoreConfig(bytes32 _id) external view returns (struct FeeStoreConfig _feeStoreConfig)
```

Gets a fee store config based on the fee id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeStoreConfig | struct FeeStoreConfig | FeeStoreConfig, see {contracts/diamond/helpers/Structs.sol#FeeStoreConfig} |

### getCollectedFeesTotal

```solidity
function getCollectedFeesTotal() external view returns (uint256 _collectedFeesTotal)
```

Gets the current collected total fees on this store

_this is a cumulative number of all fees collected on this store until it get's send to the home chain_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collectedFeesTotal | uint256 | amount of total fees collected |

### getCollectedFeesByConfigId

```solidity
function getCollectedFeesByConfigId(bytes32 _id) external view returns (uint256 _collectedFees)
```

Gets the collected fees for a specific fee id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee config id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collectedFees | uint256 | amount of fees collected |

### getFeeConfigIds

```solidity
function getFeeConfigIds() external view returns (bytes32[] _feeConfigIds)
```

Gets all fee config ids defined on this fee store

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigIds | bytes32[] | array of fee ids |

### getOperator

```solidity
function getOperator() external view returns (address _operator)
```

Gets the current operator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | address of the operator |

### getIntermediateAsset

```solidity
function getIntermediateAsset() external view returns (address _intermediateAsset)
```

Gets the current intermediate asset

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _intermediateAsset | address | address of the intermadiate asset |

### _addFee

```solidity
function _addFee(bytes32 _id, uint256 _fee, address _target) internal
```

Wrapper function to add a fee to the store

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _fee | uint256 | fee value |
| _target | address | the target address |

### _updateFee

```solidity
function _updateFee(bytes32 _id, uint256 _fee, address _target) internal
```

Wrapper function to update a fee in the store

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _fee | uint256 | fee value |
| _target | address | the target address |

### _deleteFee

```solidity
function _deleteFee(bytes32 _id) internal
```

Removes a fee from the store

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### _store

```solidity
function _store() internal pure returns (struct LibFeeStoreStorage.FeeStoreStorage s)
```

Store

### _storeInternal

```solidity
function _storeInternal() internal pure returns (struct FeeStoreFacet.Storage s)
```

InternalStore

