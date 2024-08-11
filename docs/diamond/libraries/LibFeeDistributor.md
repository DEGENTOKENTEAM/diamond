# Solidity API

## LibFeeDistributor

Library for the fee distributor facet

### TriggerDistributionWhileNotRunning

```solidity
event TriggerDistributionWhileNotRunning()
```

### Distributed

```solidity
event Distributed(address account, uint256 amount)
```

### BountyPaid

```solidity
event BountyPaid(uint256 amount, address receiver)
```

### pushFees

```solidity
function pushFees(struct FeeConfigSyncHomeDTO _dto) internal
```

Distributes the fees to the desired receivers based on their share

_If the distribution is running, it'll distribute it directly, otherwise it will be queued up and distributed once the distirbution is enabled_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dto | struct FeeConfigSyncHomeDTO | a dto that needs to be synced |

### distribute

```solidity
function distribute(address _receiver, uint256 _amount) internal
```

Distributes the fees to the desired addresses

_If the receiver is address(0), the funds will be distributed to all defined shares based on their points and desired swap
If the receiver is not address(0), the funds will be directly send to the address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | address of the receiver, can be address(0) |
| _amount | uint256 | amount of tokens being distributed |

### setRunning

```solidity
function setRunning(bool _running) internal
```

Set the the running state of the distributor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _running | bool | flag |

### payoutBountyInToken

```solidity
function payoutBountyInToken(address _token, uint256 _amount, address _receiver) internal returns (uint256 _amountLeft, uint256 _bountyAmount)
```

Pays out the bounty to the bounty receiver

_only pays out the bounty if the distributor is running_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | address of the asset |
| _amount | uint256 | amount of the asser |
| _receiver | address | address of the bounty receiver |

### payoutBountyInNative

```solidity
function payoutBountyInNative(uint256 _amount, address _receiver) internal returns (uint256 _amountLeft, uint256 _bountyAmount)
```

Pays out the bounty to the bounty receiver

_only pays out the bounty if the distributor is running_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount of the asser |
| _receiver | address | address of the bounty receiver |

### payoutBountyInNativeWithCustomShare

```solidity
function payoutBountyInNativeWithCustomShare(uint256 _amount, address _receiver, uint256 _customShare) internal returns (uint256 _amountLeft, uint256 _bountyAmount)
```

Pays out the bounty to the bounty receiver with a given custom share

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | base amount for the bounty calculation |
| _receiver | address | address of the bounty receiver |
| _customShare | uint256 | bps of the custom share of the bounty |

