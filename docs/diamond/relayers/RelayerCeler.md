# Solidity API

## RelayerCeler

this contract will manage the interaction with the IM service of CELER. It can only be called by the message bus or the diamonds on the desired chains

_also have a look at https://github.com/celer-network/sgn-v2-contracts/blob/main/contracts/message/framework/MessageApp.sol_

### diamond

```solidity
address diamond
```

_address of the diamond_

### relayerHome

```solidity
address relayerHome
```

_address of the relayer on the home chain_

### chainHome

```solidity
uint256 chainHome
```

_chain id of the home chain_

### isHomeRelayer

```solidity
bool isHomeRelayer
```

_flag whether this relayer is based on a target chain or a home chain (true=home chain)_

### operator

```solidity
address operator
```

address of the operator which receives the funds in case every legit execution fails

### nonce

```solidity
uint64 nonce
```

nonce for the transfers being created to avoid duplications

### RefundForwarded

```solidity
event RefundForwarded(address asset, address receiver, uint256 amount)
```

### MessageReceived

```solidity
event MessageReceived(address srcContract, uint64 srcChainId, bytes message, bool status)
```

### ActorAdded

```solidity
event ActorAdded(uint256 chainId, address actor)
```

### ActorRemoved

```solidity
event ActorRemoved(uint256 chainId)
```

### ActorNotExisting

```solidity
error ActorNotExisting()
```

### MissingGasFees

```solidity
error MissingGasFees()
```

### onlyDiamondHome

```solidity
modifier onlyDiamondHome()
```

### onlyDiamondTarget

```solidity
modifier onlyDiamondTarget()
```

### paybackOverhead

```solidity
modifier paybackOverhead(address _recipient)
```

### constructor

```solidity
constructor(address _diamond, address _relayerHome, address _operator, address _messageBus, uint256 _chainHome, bool _isHomeRelayer) public
```

Constructor

_it also initializes the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _diamond | address | address of the diamond |
| _relayerHome | address | address of the relayer on the home chain |
| _operator | address | address of the operator |
| _messageBus | address | address of the message bus from celer (if update needed, new deployment necessary) |
| _chainHome | uint256 | chain id of the home chain |
| _isHomeRelayer | bool | flag wheter this contract is deployed on the home chain or target chain |

### deployFees

```solidity
function deployFees(address _receiver, address _target, uint256 _chainId, bytes _message) external payable
```

Deploys the fees to the desired chain

_can only be executed by the home chain diamond_

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

_can only be executed by the home chain diamond_

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

_can only be executred bei the target chain diamond_

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

_can only be executred bei the target chain diamond_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _message | bytes | message to send to the message bus |

### executeMessage

```solidity
function executeMessage(address _srcContract, uint64 _srcChainId, bytes _message, address _executor) external payable returns (enum IMessageReceiverApp.ExecutionStatus)
```

Executes the message on the desired chain

_this is only executed by the message bus from CELER IM_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _srcContract | address | relayer contract address |
| _srcChainId | uint64 | chain id of the relayer |
| _message | bytes | encoded CelerRelayerData data |
| _executor | address | trusted account which is configured in the executor |

### executeMessageWithTransfer

```solidity
function executeMessageWithTransfer(address _sender, address _token, uint256 _amount, uint64 _srcChainId, bytes _message, address _executor) external payable returns (enum IMessageReceiverApp.ExecutionStatus)
```

Called by MessageBus to execute a message with an associated token transfer.
The contract is guaranteed to have received the right amount of tokens before this function is called.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sender | address | The address of the source app contract |
| _token | address | The address of the token that comes out of the bridge |
| _amount | uint256 | The amount of tokens received at this contract through the cross-chain bridge. |
| _srcChainId | uint64 | The source chain ID where the transfer is originated from |
| _message | bytes | Arbitrary message bytes originated from and encoded by the source app contract |
| _executor | address | trusted account which is configured in the executor |

### executeMessageWithTransferFallback

```solidity
function executeMessageWithTransferFallback(address _sender, address _token, uint256 _amount, uint64 _srcChainId, bytes, address) external payable virtual returns (enum IMessageReceiverApp.ExecutionStatus)
```

Only called by MessageBus if
        1. executeMessageWithTransfer reverts, or
        2. executeMessageWithTransfer returns ExecutionStatus.Fail
The contract is guaranteed to have received the right amount of tokens before this function is called.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sender | address | The address of the source app contract |
| _token | address | The address of the token that comes out of the bridge |
| _amount | uint256 | The amount of tokens received at this contract through the cross-chain bridge. |
| _srcChainId | uint64 | The source chain ID where the transfer is originated from |
|  | bytes |  |
|  | address |  |

### executeMessageWithTransferRefund

```solidity
function executeMessageWithTransferRefund(address _token, uint256 _amount, bytes _message, address) external payable returns (enum IMessageReceiverApp.ExecutionStatus)
```

Called by MessageBus to process refund of the original transfer from this contract.
The contract is guaranteed to have received the refund before this function is called.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | The token address of the original transfer |
| _amount | uint256 | The amount of the original transfer |
| _message | bytes | The same message associated with the original transfer |
|  | address |  |

### forwardRefund

```solidity
function forwardRefund(address _asset, address payable _receiver, uint256 _amount) external
```

Payout refund to receiver once token gets stuck

_only executeable by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | address of token that should be moved from the relayer |
| _receiver | address payable | receiver of token |
| _amount | uint256 | amount of token |

### addActor

```solidity
function addActor(uint256 _chainId, address _actor) external
```

Adds an actor to the relayer

_manage actors that can execute methods of this relayer. Will mostly be relayers from the corresponding chains_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id of the actor |
| _actor | address | address of the actor |

### removeActor

```solidity
function removeActor(uint256 _chainId) external
```

Removes an actor based on the chain id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id of the actor |

### isActor

```solidity
function isActor(uint256 _chainId, address _actor) public view returns (bool _isActor)
```

Checks whether an actor is existing or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id of actor |
| _actor | address | address of actor |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _isActor | bool | flag if is actor or not |

### _sendMessageWithTransfer

```solidity
function _sendMessageWithTransfer(address _receiver, address _token, uint256 _amount, uint64 _dstChainId, uint64 _nonce, uint32 _maxSlippage, bytes _message, enum MsgDataTypes.BridgeSendType _bridgeSendType, uint256 _fee) internal virtual returns (bytes32 _transferId)
```

Sends a message associated with a transfer to a contract on another chain.

_wrapper function to write proper tests without mocking your ass of_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | The address of the destination app contract. |
| _token | address | The address of the token to be sent. |
| _amount | uint256 | The amount of tokens to be sent. |
| _dstChainId | uint64 | The destination chain ID. |
| _nonce | uint64 | A number input to guarantee uniqueness of transferId. Can be timestamp in practice. |
| _maxSlippage | uint32 | The max slippage accepted, given as percentage in point (pip). Eg. 5000 means 0.5%.        Must be greater than minimalMaxSlippage. Receiver is guaranteed to receive at least        (100% - max slippage percentage) * amount or the transfer can be refunded.        Only applicable to the {MsgDataTypes.BridgeSendType.Liquidity}. |
| _message | bytes | Arbitrary message bytes to be decoded by the destination app contract.        If message is empty, only the token transfer will be sent |
| _bridgeSendType | enum MsgDataTypes.BridgeSendType | One of the {BridgeSendType} enum. |
| _fee | uint256 | The fee amount to pay to MessageBus. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _transferId | bytes32 | he transfer ID. |

### receive

```solidity
receive() external payable
```

receiver

