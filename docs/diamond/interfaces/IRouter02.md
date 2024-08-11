# Solidity API

## IRouter02

### swapExactTokensForTokens

```solidity
function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)
```

### swapExactTokensForAVAX

```solidity
function swapExactTokensForAVAX(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)
```

### swapExactTokensForETH

```solidity
function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)
```

### swapExactAVAXForTokens

```solidity
function swapExactAVAXForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) external payable returns (uint256[] amounts)
```

### swapExactETHForTokens

```solidity
function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) external payable returns (uint256[] amounts)
```

### getAmountsOut

```solidity
function getAmountsOut(uint256 amountIn, address[] path) external view returns (uint256[] amounts)
```

### addLiquidity

```solidity
function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)
```

### factory

```solidity
function factory() external returns (address)
```

