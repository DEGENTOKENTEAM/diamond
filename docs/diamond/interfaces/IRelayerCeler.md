# Solidity API

## IRelayerCeler

### deployFees

```solidity
function deployFees(address _receiver, address _target, uint256 _chainId, bytes _message) external payable
```

Deploys the fees to the desired chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | relayer on target chain |
| _target | address | diamond address on target chain |
| _chainId | uint256 | target chain id |
| _message | bytes | message to send to the message bus |

### deployFeesFeeCalc

```solidity
function deployFeesFeeCalc(address _target, bytes _message) external view returns (uint256 _wei)
```

Pre calculates upcoming fees for deploying fees

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _target | address | diamond address on target chain |
| _message | bytes | message to send to the message bus |

### sendFees

```solidity
function sendFees(address _asset, uint256 _amount, uint32 minMaxSlippage, bytes _message) external payable
```

Sends the fees to the home chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | asset that get send |
| _amount | uint256 | amount of assets that gets send |
| minMaxSlippage | uint32 | calculated slippage by celer |
| _message | bytes | message to send to the message bus |

### sendFeesFeeCalc

```solidity
function sendFeesFeeCalc(bytes _message) external view returns (uint256 _wei)
```

Pre calculates upcoming fees for sending fees

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _message | bytes | message to send to the message bus |

