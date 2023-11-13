# Solidity API

## IFeeStoreFacet

### syncFees

```solidity
function syncFees(struct FeeConfigSyncDTO[] _feeConfigSyncDTO) external payable
```

Synchronizes fee configs

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeConfigSyncDTO | struct FeeConfigSyncDTO[] | array of fee configs to process in the fee store |

### restoreFeesFromSendFees

```solidity
function restoreFeesFromSendFees(struct FeeConfigSyncHomeDTO _dto) external payable
```

Restores fees which are actually intended to be sent to the home chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dto | struct FeeConfigSyncHomeDTO | data which is primarily used for sending fees to the home chain |

