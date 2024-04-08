# Solidity API

## IFeeGenericFacet

### Distributed

```solidity
event Distributed(address account, uint256 amount)
```

### Collected

```solidity
event Collected(bytes32 feeId, uint256 amount)
```

### feeGenericIsHomeChain

```solidity
function feeGenericIsHomeChain() external view returns (bool _is)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | whether the diamond is on the home chain or not |

### feeGenericGetHomeChainId

```solidity
function feeGenericGetHomeChainId() external view returns (uint256 _homeChainId)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _homeChainId | uint256 | block.chainid of the configured home chain |

### feeGenericIsInitialized

```solidity
function feeGenericIsInitialized() external view returns (bool _is)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | true if it's initialized, else false |

### feeGenericDepositSingleFeeNative

```solidity
function feeGenericDepositSingleFeeNative(bytes32 _feeId, address _bountyReceiver, uint256 _bountyShareInBps) external payable returns (uint256 _feeAmount, uint256 _bountyAmount)
```

Deposits a single fee with native currency

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeId | bytes32 | fee id in bytes32 |
| _bountyReceiver | address | address of the receiver of the bounty |
| _bountyShareInBps | uint256 | bounty share in basis points |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeAmount | uint256 | fee amount that is being added |
| _bountyAmount | uint256 | amount for the bounty receiver |

