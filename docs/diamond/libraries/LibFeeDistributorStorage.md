# Solidity API

## LibFeeDistributorStorage

Storage library for the fee distributor facet

### FEE_DISTRIBUTOR_STORAGE_NAMESPACE

```solidity
bytes32 FEE_DISTRIBUTOR_STORAGE_NAMESPACE
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
  struct LibFeeDistributorStorage.Share[] shares;
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

### store

```solidity
function store() internal pure returns (struct LibFeeDistributorStorage.Storage _s)
```

Store

