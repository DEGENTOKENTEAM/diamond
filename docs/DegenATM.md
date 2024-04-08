# Solidity API

## DegenATM

Funds collecting and vesting smart contract

### LOCK_PERIOD

```solidity
uint256 LOCK_PERIOD
```

### DENOMINATOR

```solidity
uint256 DENOMINATOR
```

### TOTAL_REWARD_BPS

```solidity
uint256 TOTAL_REWARD_BPS
```

### REWARD_PENALTY_BPS

```solidity
uint256 REWARD_PENALTY_BPS
```

### claiming

```solidity
bool claiming
```

### collecting

```solidity
bool collecting
```

### totalDeposits

```solidity
uint256 totalDeposits
```

### startTimestamp

```solidity
uint256 startTimestamp
```

### allocationLimit

```solidity
uint256 allocationLimit
```

### totalLockedTokens

```solidity
uint256 totalLockedTokens
```

### tokensPerOneNative

```solidity
uint256 tokensPerOneNative
```

### totalClaimedTokens

```solidity
uint256 totalClaimedTokens
```

### token

```solidity
address token
```

### locked

```solidity
mapping(address => bool) locked
```

### claimed

```solidity
mapping(address => bool) claimed
```

### whitelist

```solidity
mapping(address => bool) whitelist
```

### deposits

```solidity
mapping(address => uint256) deposits
```

### lockedAmount

```solidity
mapping(address => uint256) lockedAmount
```

### claimedAmount

```solidity
mapping(address => uint256) claimedAmount
```

### Deposit

```solidity
event Deposit(address depositer, uint256 amount)
```

### Claimed

```solidity
event Claimed(address claimer, uint256 amount)
```

### LockJoin

```solidity
event LockJoin(address locker, uint256 amount)
```

### LockLeave

```solidity
event LockLeave(address locker, uint256 amount, uint256 reward, uint256 penalty)
```

### CollectingEnabled

```solidity
event CollectingEnabled()
```

### CollectingDisabled

```solidity
event CollectingDisabled()
```

### ClaimingEnabled

```solidity
event ClaimingEnabled()
```

### ClaimingDisabled

```solidity
event ClaimingDisabled()
```

### LockingEnabled

```solidity
event LockingEnabled()
```

### LockingDisabled

```solidity
event LockingDisabled()
```

### UpdatedAllocationRate

```solidity
event UpdatedAllocationRate(uint256 rate)
```

### UpdatedAllocationLimit

```solidity
event UpdatedAllocationLimit(uint256 limit)
```

### UpdatedToken

```solidity
event UpdatedToken(address token)
```

### AddToWhitelist

```solidity
event AddToWhitelist(address candidate)
```

### RemoveFromWhitelist

```solidity
event RemoveFromWhitelist(address candidate)
```

### StartLockPeriod

```solidity
event StartLockPeriod()
```

### qualifyCheck

```solidity
modifier qualifyCheck()
```

### deposit

```solidity
function deposit() external payable
```

Deposit native token

### claimTokens

```solidity
function claimTokens() external
```

Claiming the tokens
claiming is only possible when the claiming period has started

_it also makes some qualify checks whether sender is allowed to execute, otherwise it reverts
possible to execute when claming is started_

### lockJoin

```solidity
function lockJoin() external
```

Locks the tokens
the sender will enter a lock state with his allocated amount of tokens

_it also makes some qualify checks whether sender is allowed to execute, otherwise it reverts
possible to execute when claming is started_

### lockLeave

```solidity
function lockLeave() external
```

Leaves the lock of the tokens
The sender will leave the locked state if he has joined it.
After leaving, he will auto claim the tokens and not be able to join the lock anymore.
The sender can leave at any time. Before the lock period, he has not gained any rewards
and claims only his initial allocated amount of tokens. If the lock period has started
and not ended yet, the sender will receive his initial allocated tokens with 30% of the
rewards, because of the desined penalty when leaving the locked state before end of period.
After the lock period has ended, the sender will receive the allocated amount of tokens
and the full amount of rewards.

### StatsForQualifier

```solidity
struct StatsForQualifier {
  bool isWhitelisted;
  bool hasClaimed;
  bool hasLocked;
  uint256 tokenBalance;
  uint256 lockedAmount;
  uint256 claimedAmount;
  uint256 totalDeposited;
  uint256 currentRewardAmount;
  uint256 currentPenaltyAmount;
  uint256 currentRewardAmountNet;
  uint256 estimatedTotalRewardAmount;
  uint256 estimatedTotalClaimAmount;
}
```

### getStatsForQualifier

```solidity
function getStatsForQualifier(address _qualifier) external view returns (struct DegenATM.StatsForQualifier _stats)
```

Returns atm stats for a given qualifier

_`isWhitelisted` flag if the qualifier is whitelisted or not
`hasClaimed` flag if the qualifier has claimed his tokens
`hasLocked` flag if the qualifier has locked his tokens
`tokenBalance` qualifiers balance of the token
`lockedAmount` amount of locked tokens
`claimedAmount` amount of claimed tokens
`totalDeposited` amount of deposited native
`currentRewardAmount` returns the current reward amount (only if lock period has started, else 0)
`currentPenaltyAmount` returns the current penalty amount if the qualifier leaves the lock (only if lock period has started, else 0)
`currentRewardAmountNet` returns the current rewart amount excl. penalty amount (only if lock period has started, else 0)
`estimatedTotalRewardAmount` potential amount of rewards qualifier receives after whole lock period
`estimatedTotalClaimAmount` potential total amount (accumulated + rewards) which the qualifier will receive after whole lock period_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _qualifier | address | address of the account |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stats | struct DegenATM.StatsForQualifier | statistics for a qualifier |

### Stats

```solidity
struct Stats {
  bool collecting;
  bool claiming;
  bool lockPeriodActive;
  address token;
  uint256 tokenBalance;
  uint256 allocationLimit;
  uint256 tokensPerOneNative;
  uint256 totalDeposits;
  uint256 totalLockedTokens;
  uint256 totalClaimedTokens;
  uint256 estimatedTotalLockedTokensRewards;
  uint256 estimatedTotalLockedTokensPayouts;
  uint256 estimatedTotalTokensPayout;
  uint256 lockPeriodStarts;
  uint256 lockPeriodEnds;
  uint256 lockPeriodInSeconds;
  uint256 rewardPenaltyBps;
  uint256 totalRewardBps;
}
```

### getStats

```solidity
function getStats() external view returns (struct DegenATM.Stats _stats)
```

Returns general atm stats

_`collecting` flag if the native token collection has started or not
`claiming` flag if the claiming has started or not (will enable claiming and locking functionality)
`lockPeriodActive` flag is the lock period has started
`token` address of the token
`tokenBalance` contract balance of the token
`allocationLimit` defined alloctaion limit
`tokensPerOneNative` defined tokens per one native
`totalDeposits` total amount of native deposits
`totalLockedTokens` total amount of locked tokens
`totalClaimedTokens` total amount of claimed tokens
`estimatedTotalLockedTokensRewards` estimated amount of total rewards paid for current locked tokens
`estimatedTotalLockedTokensPayouts` estimated amount of tokens incl. rewards which are getting paid out
`estimatedTotalTokensPayout` estimated amount of ALL possible paid out tokens (claimed + locked + rewards)
`lockPeriodStarts` the timestamp when the lock period starts
`lockPeriodEnds` the timestamp when the lock period ends
`lockPeriodInSeconds` lock period in seconds which result in 365d or 1y
`rewardPenaltyBps` % loyalty penalty in basis points
`totalRewardBps` % reward in basis points_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stats | struct DegenATM.Stats | statistics for a qualifier |

### startLockPeriod

```solidity
function startLockPeriod() external
```

Starts the lock period

### recoverNative

```solidity
function recoverNative() external
```

Recovers the native funds and sends it to the owner

### recoverTokens

```solidity
function recoverTokens(address _asset) external
```

Recovers the tokens and sends it to the owner

### enableClaiming

```solidity
function enableClaiming(bool _enable) external
```

Sets the state of the claiming

_when enabling, automaticall disabled collectiong flag and vice versa_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _enable | bool | true enables, false disables |

### enableCollecting

```solidity
function enableCollecting(bool _enable) public
```

Sets the state of the collecting

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _enable | bool | true enables, false disables |

### setAllocationRate

```solidity
function setAllocationRate(uint256 _rate) external
```

Sets the allocation rate
this number is used to calculate the accumulated token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _rate | uint256 | amount of tokens |

### setAllocationLimit

```solidity
function setAllocationLimit(uint256 _limit) external
```

Sets the deposit limit for accounts

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _limit | uint256 | amount of native token a participant can deposit |

### setToken

```solidity
function setToken(address _token) external
```

Sets the token address which to pay out

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | address of the token |

### addToWhitelist

```solidity
function addToWhitelist(address _account) public
```

Adds an account to the whitelist

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | address of the participant |

### addToWhitelistInBulk

```solidity
function addToWhitelistInBulk(address[] _accounts) external
```

Adds multiple accounts to the whitelist

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | array of addresses of participants |

### removeFromWhitelist

```solidity
function removeFromWhitelist(address payable _account) external
```

Removes the address from the whitelist
When the address is being removed and has already deposited, this amount will be sent back to the account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address payable | address of the participant |

### _checkQualification

```solidity
function _checkQualification() internal view
```

internals

### _deposit

```solidity
function _deposit(uint256 _amount, address _sender) internal
```

### _calcClaimAmount

```solidity
function _calcClaimAmount(address _depositer) internal view returns (uint256 _amount)
```

### _calcRewards

```solidity
function _calcRewards(uint256 _lockedAmount, uint256 _startTimestamp) internal view returns (uint256 _amount, uint256 _penalty, uint256 _amountNet)
```

### receive

```solidity
receive() external payable
```

receiver

