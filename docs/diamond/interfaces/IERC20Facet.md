# Solidity API

## IERC20Facet

### mint

```solidity
function mint(address _to, uint256 _amount) external
```

Minting an amount of tokens for a designated receiver
This can only be executed by the MINTER_ROLE which will be bridge related contracts

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | receiver address of the token |
| _amount | uint256 | receiving amount |

### burn

```solidity
function burn(address _from, uint256 _amount) external
```

Burning an amount of tokens from a designated holder

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | holder address to burn the tokens from |
| _amount | uint256 | burnable amount |

### enable

```solidity
function enable() external
```

This enables the transfers of this tokens

### disable

```solidity
function disable() external
```

This disables the transfers of this tokens

### excludeAccountFromTax

```solidity
function excludeAccountFromTax(address _account) external
```

Exclude an account from being charged on fees

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | address to exclude |

### includeAccountForTax

```solidity
function includeAccountForTax(address _account) external
```

Includes an account againt to pay fees

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | address to include |

### setLP

```solidity
function setLP(address _lp) external
```

Sets the liquidity pool address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lp | address | address of the liquidity pool of the token |

