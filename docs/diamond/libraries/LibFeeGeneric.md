# Solidity API

## LibFeeGeneric

Library for generic functions of the fee protocol

### BountyPaid

```solidity
event BountyPaid(uint256 bountyAmount, address bountyReceiver)
```

### Collected

```solidity
event Collected(bytes32 feeId, uint256 amount)
```

### isHomeChain

```solidity
function isHomeChain() internal view returns (bool _is)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | true if is home chain, else false |

### isInitialized

```solidity
function isInitialized() internal view returns (bool _is)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _is | bool | true if it's initialized, else false |

### getHomeChainId

```solidity
function getHomeChainId() internal view returns (uint256 _homeChainId)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _homeChainId | uint256 | configured home chain id |

### getNativeWrapper

```solidity
function getNativeWrapper() internal view returns (address _nativeWrapper)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _nativeWrapper | address | address of the native wrapper token |

### getUniswapV2Router

```solidity
function getUniswapV2Router() internal view returns (address _uniswapV2Router)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _uniswapV2Router | address | address of a v2 conform dex router |

### depositSingleFeeNativeOnHomeChain

```solidity
function depositSingleFeeNativeOnHomeChain(bytes32 _feeId, address _bountyReceiver, uint256 _bountyShareInBps) internal returns (uint256 _feeAmount, uint256 _bountyAmount)
```

Deposits a single fee with native currency on the home chain

_interacts with the fee distributor_

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

### depositSingleFeeNativeOnTargetChain

```solidity
function depositSingleFeeNativeOnTargetChain(bytes32 _feeId, address _bountyReceiver, uint256 _bountyShareInBps) internal returns (uint256 _feeAmount, uint256 _bountyAmount)
```

Deposits a single fee with native currency on the target chain

_interacts with the fee store_

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

