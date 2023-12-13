# Solidity API

## CelerFeeHubFacet

This contract provides the functionality to interact with the celer services through a defined relayer

### STORAGE_NAMESPACE

```solidity
bytes32 STORAGE_NAMESPACE
```

### relayer

```solidity
address relayer
```

### QueueProcessed

```solidity
event QueueProcessed()
```

### FeesSent

```solidity
event FeesSent()
```

### UpdateThreshold

```solidity
event UpdateThreshold(uint256 amount)
```

### UpdateSendFeesWei

```solidity
event UpdateSendFeesWei(uint256 amount)
```

### UpdateDeployFeesWei

```solidity
event UpdateDeployFeesWei(uint256 amount)
```

### RefundCollected

```solidity
event RefundCollected(address asset, address receiver, uint256 amount)
```

### RefundForwarded

```solidity
event RefundForwarded(address asset, address receiver, uint256 amount)
```

### RelayerForChainAdded

```solidity
event RelayerForChainAdded(address relayer, uint256 chainId)
```

### RelayerForChainUpdated

```solidity
event RelayerForChainUpdated(address relayer, uint256 chainId)
```

### RelayerForChainRemoved

```solidity
event RelayerForChainRemoved(uint256 chainId)
```

### DeploymentSuccessful

```solidity
event DeploymentSuccessful(uint64 chainId)
```

### QueueEmpty

```solidity
error QueueEmpty()
```

### NoChainsConfigured

```solidity
error NoChainsConfigured()
```

### RefundFailed

```solidity
error RefundFailed()
```

### ChainExisting

```solidity
error ChainExisting(uint256 chainId)
```

### ChainNotExisting

```solidity
error ChainNotExisting(uint256 chainId)
```

### RelayerExists

```solidity
error RelayerExists(address relayer)
```

### ThresholdNotMet

```solidity
error ThresholdNotMet()
```

### InsufficientFundsSent

```solidity
error InsufficientFundsSent()
```

### InsufficientFundsForGas

```solidity
error InsufficientFundsForGas()
```

### Storage

```solidity
struct Storage {
  uint256 sendFeesThreshold;
  uint256 sendFeesWei;
  uint256 deployFeesWei;
  mapping(uint256 => address) chainIdToRelayer;
}
```

### constructor

```solidity
constructor(address _relayer) public
```

Constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _relayer | address | address of the relayer |

### addRelayerForChain

```solidity
function addRelayerForChain(address _relayer, uint256 _chainId) external
```

Adds a relayer for a specific chain id

_this can only be executed by the FEE_MANAGER_ROLE, which is the DAO and the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _relayer | address | address of a relayer |
| _chainId | uint256 | chain id of the relayer |

### updateRelayerOnChain

```solidity
function updateRelayerOnChain(address _relayer, uint256 _chainId) external
```

Updates a relayer for a specific chain id

_this can only be executed by the FEE_MANAGER_ROLE, which is the DAO and the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _relayer | address | address of a relayer |
| _chainId | uint256 | chain id of the relayer |

### removeRelayerOnChain

```solidity
function removeRelayerOnChain(uint256 _chainId) external
```

Removes a relayer for a specific chain id

_this can only be executed by the FEE_MANAGER_ROLE, which is the DAO and the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint256 | chain id of the relayer |

### updateSendFeesThreshold

```solidity
function updateSendFeesThreshold(uint256 _amount) external
```

Sets the threshold a total fee can be sent to the home chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | threshold amount |

### updateSendFeesWei

```solidity
function updateSendFeesWei(uint256 _wei) external
```

Sets the amount of fees that is being used to initiate the send fees process

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _wei | uint256 | amount of fees |

### updateDeployFeesWei

```solidity
function updateDeployFeesWei(uint256 _wei) external
```

Sets the amount of fees that is being used to initiate the deploy fees process

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _wei | uint256 | amount of fees |

### deployFeesWithCeler

```solidity
function deployFeesWithCeler() external payable
```

This method deploys added, updated or removed fee configuration to desired chains through CELER IM. It is executable by everyone (DeFi things obv)

_Once the queue of the fee manager is filled with configs, it'll be processable. It creates an array of dtos which are being processed by the target chain and its relayer._

### deployFeesWithCelerConfirm

```solidity
function deployFeesWithCelerConfirm(uint64 _chainId, bytes _message) external
```

Registers the successful deployment of the fees to the given chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _chainId | uint64 | chain id |
| _message | bytes | encoded message |

### sendFeesWithCeler

```solidity
function sendFeesWithCeler(uint32 minMaxSlippage, address _bountyReceiver) external payable
```

Sends fees stored on the FeeStore back to the home chain, respecting a bounty receiver
Can be executed by everyone. Its success is dependend on the sendFeesThreshold being met

_The bounty receiver is set because you can't relay on the initiator in the consuming
     contract on the home chain, because contracts can execute this method without having
     the same address on the home chain. It also transfers the tokens to the relayer which
     then bridges the tokens and sends the message to the CELER IM service_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minMaxSlippage | uint32 | external defined minimal max slippage by the estimation api of CELER |
| _bountyReceiver | address | address of the bounty receiver on the home chain |

### celerFeeHubSendFeesWei

```solidity
function celerFeeHubSendFeesWei() external view returns (uint256 _wei)
```

viewables

### celerFeeHubDeployFeesWei

```solidity
function celerFeeHubDeployFeesWei() external view returns (uint256 _wei)
```

### _store

```solidity
function _store() internal pure returns (struct CelerFeeHubFacet.Storage s)
```

Store

