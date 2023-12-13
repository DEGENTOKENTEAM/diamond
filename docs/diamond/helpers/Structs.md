# Solidity API

## FeeConfig

```solidity
struct FeeConfig {
  uint256 fee;
  address receiver;
  enum FeeType ftype;
  enum FeeCurrency currency;
}
```

## AddFeeConfigParams

```solidity
struct AddFeeConfigParams {
  bytes32 id;
  uint256 fee;
  address receiver;
  enum FeeType ftype;
  enum FeeCurrency currency;
}
```

## UpdateFeeConfigParams

```solidity
struct UpdateFeeConfigParams {
  bytes32 id;
  uint256 fee;
  address receiver;
}
```

## RemoveFeeConfigParams

```solidity
struct RemoveFeeConfigParams {
  bytes32 id;
}
```

## AddChainParams

```solidity
struct AddChainParams {
  uint256 chainId;
  address target;
}
```

## RemoveChainParams

```solidity
struct RemoveChainParams {
  uint256 chainId;
}
```

## AssignFeeConfigToChainParams

```solidity
struct AssignFeeConfigToChainParams {
  bytes32 id;
  uint256 chainId;
}
```

## UnassignFeeConfigFromChainParams

```solidity
struct UnassignFeeConfigFromChainParams {
  bytes32 id;
  uint256 chainId;
}
```

## UnassignFeeConfigFromAllChainsParams

```solidity
struct UnassignFeeConfigFromAllChainsParams {
  bytes32 id;
}
```

## FeeSyncQueue

```solidity
struct FeeSyncQueue {
  bytes32 id;
  uint256 chainId;
  enum FeeSyncAction action;
}
```

## FeeConfigDeployState

```solidity
struct FeeConfigDeployState {
  bytes32 id;
  enum FeeDeployState state;
}
```

## FeeConfigSyncDTO

```solidity
struct FeeConfigSyncDTO {
  bytes32 id;
  uint256 fee;
  address target;
  enum FeeSyncAction action;
}
```

## FeeConfigSyncHomeFees

```solidity
struct FeeConfigSyncHomeFees {
  bytes32 id;
  uint256 amount;
}
```

## FeeConfigSyncHomeDTO

```solidity
struct FeeConfigSyncHomeDTO {
  uint256 totalFees;
  address bountyReceiver;
  struct FeeConfigSyncHomeFees[] fees;
}
```

## CelerRelayerData

```solidity
struct CelerRelayerData {
  bytes32 what;
  address target;
  bytes message;
}
```

## FeeStoreConfig

```solidity
struct FeeStoreConfig {
  bytes32 id;
  uint256 fee;
  address target;
  bool deleted;
}
```

## AddReceiverParams

```solidity
struct AddReceiverParams {
  string name;
  uint64 points;
  address account;
  address[] swapPath;
}
```

