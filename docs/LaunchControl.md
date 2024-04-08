# Solidity API

## LaunchControl

### launched

```solidity
bool launched
```

### liquidity

```solidity
bool liquidity
```

### startPoolWithToken

```solidity
uint256 startPoolWithToken
```

### startPoolWithNative

```solidity
uint256 startPoolWithNative
```

### router

```solidity
address router
```

### lp

```solidity
address lp
```

### lpTokenReceiver

```solidity
address lpTokenReceiver
```

### token

```solidity
address token
```

### nativeWrapper

```solidity
address nativeWrapper
```

### constructor

```solidity
constructor(address _nativeWrapper) public
```

admin

### recover

```solidity
function recover(address _asset) external
```

### setRouter

```solidity
function setRouter(address _router) external
```

### setToken

```solidity
function setToken(address _token) external
```

### setStartPoolWithToken

```solidity
function setStartPoolWithToken(uint256 _amount) external
```

### setStartPoolWithNative

```solidity
function setStartPoolWithNative(uint256 _amount) external
```

### setLpTokenReceiver

```solidity
function setLpTokenReceiver(address _account) external
```

### addLiquidity

```solidity
function addLiquidity() external
```

### startTrading

```solidity
function startTrading() external
```

### receive

```solidity
receive() external payable
```

receiver

