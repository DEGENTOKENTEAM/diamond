# Solidity API

## IFeeDistributorFacet

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

### feeDistributorDepositSingleFeeNative

```solidity
function feeDistributorDepositSingleFeeNative(bytes32 _feeId, address _bountyReceiver, uint256 _bountyShareInBps) external payable returns (uint256 _amount, uint256 _bountyAmount)
```

Distributes a single native fee

_the fee receiver should to have defined a proper swapping path_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeId | bytes32 | id of the fee |
| _bountyReceiver | address | address of the bounty receiver |
| _bountyShareInBps | uint256 | percentage share in bps |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | fee amount that has been paid (excl. bounty) |
| _bountyAmount | uint256 | bounty that has been paid |

