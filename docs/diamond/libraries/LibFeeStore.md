# Solidity API

## LibFeeStore

Functions to help with the fee store for other instances

### DENOMINATOR_RELATIVE

```solidity
uint256 DENOMINATOR_RELATIVE
```

### DENOMINATOR_ABSOLUTE

```solidity
uint256 DENOMINATOR_ABSOLUTE
```

### ZeroFees

```solidity
error ZeroFees()
```

### FeeNotExisting

```solidity
error FeeNotExisting(bytes32 id)
```

### FeeExists

```solidity
error FeeExists(bytes32 id)
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

### putFees

```solidity
function putFees(bytes32 _feeConfigId, uint256 _amount) internal
```

Store a specific amount of fees in the store

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigId | bytes32 | fee config id |
| _amount | uint256 | amount of tokens |

### prepareToSendFees

```solidity
function prepareToSendFees() internal returns (struct FeeConfigSyncHomeDTO _dto)
```

Prepares the fees collected on the store to be send to the home chain

_this method will also clean up every fee collected and sets it to 0_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dto | struct FeeConfigSyncHomeDTO | the dto that will be used on the home chain for receiving and process fees |

### deleteFee

```solidity
function deleteFee(bytes32 _id) internal
```

Removes a fee from the store

_if a fee is still in use, it will be marked as deleted. Once fees get moved to home chain, it will be deleted properly_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### addFee

```solidity
function addFee(bytes32 _id, uint256 _fee, address _target) internal
```

Adds a fee to the store

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _fee | uint256 | fee value |
| _target | address | the target address |

### updateFee

```solidity
function updateFee(bytes32 _id, uint256 _fee, address _target) internal
```

Updates a fee on the store

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _fee | uint256 | fee value |
| _target | address | the target address |

### calcFeesRelative

```solidity
function calcFeesRelative(bytes32 _feeConfigId, address _asset, uint256 _amount) internal view returns (uint256 _amountNet, uint256 _fee, uint256 _feePoints)
```

Calculates the relative fee based on the inserted amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigId | bytes32 | fee config id |
| _asset | address | address of the token |
| _amount | uint256 | amount that fees are based on |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amountNet | uint256 | amount excluding fee |
| _fee | uint256 | amount of fee |
| _feePoints | uint256 | fee value that is applied |

### calcFeesAbsolute

```solidity
function calcFeesAbsolute(bytes32 _feeConfigId, address _asset, uint256 _amount) internal view returns (uint256 _amountNet, uint256 _fee, uint256 _feePoints)
```

Calculates the absolute fee based on the inserted amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigId | bytes32 | fee config id |
| _asset | address | address of the token |
| _amount | uint256 | amount that fees are based on |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amountNet | uint256 | amount excluding fee |
| _fee | uint256 | amount of fee |
| _feePoints | uint256 | fee value that is applied |

### calcFees

```solidity
function calcFees(bytes32 _feeConfigId, address _asset, uint256 _amount, bool _absolute) internal view returns (uint256 _amountNet, uint256 _fee, uint256 _feePoints)
```

Calculates the relative or absolute fees based on the inserted amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigId | bytes32 | fee config id |
| _asset | address | address of the token |
| _amount | uint256 | amount that fees are based on |
| _absolute | bool | whether a calculation is relative or absolute |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amountNet | uint256 | amount excluding fee |
| _fee | uint256 | amount of fee |
| _feePoints | uint256 | fee value that is applied |

### getOperator

```solidity
function getOperator() internal view returns (address _operator)
```

### setOperator

```solidity
function setOperator(address _operator) internal
```

### getIntermediateAsset

```solidity
function getIntermediateAsset() internal view returns (address _intermediateAsset)
```

### setIntermediateAsset

```solidity
function setIntermediateAsset(address _intermediateAsset) internal
```

