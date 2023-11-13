# Solidity API

## FeeDistributorFacet

It is responsible for distributing received fees to its configured receivers

### STORAGE_NAMESPACE

```solidity
bytes32 STORAGE_NAMESPACE
```

### ReceiverAdded

```solidity
event ReceiverAdded(address account, uint64 points)
```

### ReceiverRemoved

```solidity
event ReceiverRemoved(address account)
```

### DistributionStarted

```solidity
event DistributionStarted()
```

### DistributionStopped

```solidity
event DistributionStopped()
```

### TriggerDistributionWhileNotRunning

```solidity
event TriggerDistributionWhileNotRunning()
```

### Distributed

```solidity
event Distributed(address account, uint256 amount)
```

### UpdatedDistributionShares

```solidity
event UpdatedDistributionShares(address[] receivers, uint64[] shares)
```

### BountyEnabled

```solidity
event BountyEnabled()
```

### BountyDisabled

```solidity
event BountyDisabled()
```

### BountyShareUpdated

```solidity
event BountyShareUpdated(uint64 share)
```

### PushFeesGasCompensationForCallerUpdate

```solidity
event PushFeesGasCompensationForCallerUpdate(uint256 amountInWei)
```

### BountyPaid

```solidity
event BountyPaid(uint256 amount, address receiver)
```

### BountyPaidFailed

```solidity
event BountyPaidFailed(uint256 amount, address receiver)
```

### EnableBountyInToken

```solidity
event EnableBountyInToken()
```

### DisableBountyInToken

```solidity
event DisableBountyInToken()
```

### ReceiverNotExisting

```solidity
error ReceiverNotExisting(address receiver)
```

### WrongData

```solidity
error WrongData()
```

### WrongToken

```solidity
error WrongToken()
```

### MissingData

```solidity
error MissingData()
```

### FailedStartMissingShares

```solidity
error FailedStartMissingShares()
```

### InvalidSwapPath

```solidity
error InvalidSwapPath()
```

### Share

```solidity
struct Share {
  string name;
  uint64 points;
  address receiver;
  address[] swap;
}
```

### Storage

```solidity
struct Storage {
  struct FeeDistributorFacet.Share[] shares;
  struct FeeConfigSyncHomeDTO[] queue;
  mapping(address => uint256) shareIndex;
  uint64 totalPoints;
  address baseToken;
  address nativeWrapper;
  address router;
  uint256 pushFeesGasCompensationForCaller;
  uint64 bountyShare;
  address bountyReceiver;
  address lastBountyReceiver;
  uint256 lastBountyAmount;
  uint256 totalBounties;
  bool running;
  bool bountyActive;
  bool bountyInToken;
  bool initialized;
}
```

### initFeeDistributorFacet

```solidity
function initFeeDistributorFacet(address _baseToken, address _nativeWrapper, address _router, uint64 _bountyShare) external
```

Initializes the facet

_only available to DEPLOYER_ROLE_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _baseToken | address | address of the expected token we get from the bridge |
| _nativeWrapper | address | address of native wrapper token on the operating chain |
| _router | address | uniswap v2 based router |
| _bountyShare | uint64 | share of bounty  (10000 = 1%, 1000 = 0.1%) |

### pushFees

```solidity
function pushFees(address _token, uint256 _amount, struct FeeConfigSyncHomeDTO _dto) external payable
```

Pushes the fee to the desired receivers

_an updated dto needs to be created since the receiving amount is not
     matching the sent amount anymore. The contract will 100% receive the
     _token _amount before being executed
only available to FEE_DISTRIBUTOR_PUSH_ROLE role
if the token doesn't match, it will fail._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | the token address being received |
| _amount | uint256 | amount of tokens being received |
| _dto | struct FeeConfigSyncHomeDTO | the dto of the fee store to determine the split of _amount |

### addFeeDistributionReceiver

```solidity
function addFeeDistributionReceiver(struct AddReceiverParams _params) external
```

Adds a fee receiver

_swapPath[] needs to have the base token address on position 0
This method also checks if there is a valid swap path existing, otherwise it will be reverted by the aggregator
only available to FEE_DISTRIBUTIOR_MANAGER role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct AddReceiverParams | contains the name, points, account address und swapPath for the receiver |

### removeFeeDistributionReceiver

```solidity
function removeFeeDistributionReceiver(address _account) external
```

Removes a receiver based on the receiver address

_only available to FEE_DISTRIBUTIOR_MANAGER role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | address of the receiver |

### updateFeeDistributionShares

```solidity
function updateFeeDistributionShares(address[] _receivers, uint64[] _shares) external
```

Updates the shares of existing receivers

_if a receiver is not existing, it'll be reverted
only available to FEE_DISTRIBUTIOR_MANAGER role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receivers | address[] | array of existing receivers |
| _shares | uint64[] | array of new shares to be set |

### startFeeDistribution

```solidity
function startFeeDistribution() external
```

Starts the fee distribution

_It will be also check if the bounties are being activated and if there are already fees in the queue to process. If so, it'll be process on activating the fee distribution.
only available to FEE_DISTRIBUTIOR_MANAGER role_

### stopFeeDistribution

```solidity
function stopFeeDistribution() external
```

Stops the fee distribution

_only available to FEE_DISTRIBUTIOR_MANAGER role_

### enableFeeDistributorBounty

```solidity
function enableFeeDistributorBounty() external
```

_Enables the bounty possibility
only available to FEE_DISTRIBUTIOR_MANAGER role_

### disableFeeDistributorBounty

```solidity
function disableFeeDistributorBounty() external
```

_Disables the bounty possibility
only available to FEE_DISTRIBUTIOR_MANAGER role_

### setFeeDistributorBountyShare

```solidity
function setFeeDistributorBountyShare(uint64 _share) external
```

Sets the share of the bounty

_only available to FEE_DISTRIBUTIOR_MANAGER role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _share | uint64 | share of the bounty |

### setPushFeesGasCompensationForCaller

```solidity
function setPushFeesGasCompensationForCaller(uint256 _amountInWei) external
```

Sets the gas compensation for the caller of the push fee method

_only available to FEE_DISTRIBUTIOR_MANAGER role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amountInWei | uint256 | share of the bounty |

### enableBountyInToken

```solidity
function enableBountyInToken(bool _bountyInToken) external
```

Enables  or disables the bountyInToken flag based on the given parameter

_only available to FEE_DISTRIBUTIOR_MANAGER role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bountyInToken | bool | flag if enabled or not |

### isFeeDistributorBountyActive

```solidity
function isFeeDistributorBountyActive() external view returns (bool _is)
```

_check whether the bounty is active of not_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | if true, it's on |

### isFeeDistributorRunning

```solidity
function isFeeDistributorRunning() external view returns (bool _is)
```

_check whether the distributor is running of not_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | if true, it's on |

### isFeeDistributorBountyInToken

```solidity
function isFeeDistributorBountyInToken() external view returns (bool _is)
```

_check whether the distributors bounty is paid in the token or not_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | if true, it's paid in token |

### getFeeDistributorTotalPoints

```solidity
function getFeeDistributorTotalPoints() external view returns (uint64 _totalPoints)
```

_Gets the current total points of all shares_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _totalPoints | uint64 | points |

### getFeeDistributorQueue

```solidity
function getFeeDistributorQueue() external view returns (struct FeeConfigSyncHomeDTO[] _queue)
```

_Gets all items in queue_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _queue | struct FeeConfigSyncHomeDTO[] | array of sync items |

### getFeeDistributorReceivers

```solidity
function getFeeDistributorReceivers() external view returns (struct FeeDistributorFacet.Share[] _shares)
```

_Gets all shares_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _shares | struct FeeDistributorFacet.Share[] | array of configured shares |

### getFeeDistributorLastBounty

```solidity
function getFeeDistributorLastBounty() external view returns (address _receiver, uint256 _payout)
```

_Gets last bounty information_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | address of recent receiver |
| _payout | uint256 | amount being paid to recent receiver |

### getFeeDistributorBountyShare

```solidity
function getFeeDistributorBountyShare() external view returns (uint64 _share)
```

_Gets the bounty share_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _share | uint64 | current bounty share |

### getFeeDistributorTotalBounties

```solidity
function getFeeDistributorTotalBounties() external view returns (uint256 _totalBounties)
```

_Gets the total bounties being paid_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _totalBounties | uint256 | total bounties |

### _pushFees

```solidity
function _pushFees(struct FeeConfigSyncHomeDTO _dto) internal
```

Distributes the fees to the desired receivers based on their share

_If the distribution is running, it'll distribute it directly, otherwise it will be queued up and distributed once the distirbution is enabled_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dto | struct FeeConfigSyncHomeDTO | a dto that needs to be synced |

### _distribute

```solidity
function _distribute(address _receiver, uint256 _amount) internal
```

Distributes the fees to the desired addresses

_If the receiver is address(0), the funds will be distributed to all defined shares based on their points and desired swap
If the receiver is not address(0), the funds will be directly send to the address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | address of the receiver, can be address(0) |
| _amount | uint256 | amount of tokens being distributed |

### _setRunning

```solidity
function _setRunning(bool _running) internal
```

Set the the running state of the distributor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _running | bool | flag |

### _payoutBountyInToken

```solidity
function _payoutBountyInToken(address _token, uint256 _amount, address _receiver) internal returns (uint256 _amountLeft)
```

### _payoutBountyInNative

```solidity
function _payoutBountyInNative(uint256 _amount, address _receiver) internal returns (uint256 _amountLeft)
```

### _store

```solidity
function _store() internal pure returns (struct FeeDistributorFacet.Storage s)
```

Store

