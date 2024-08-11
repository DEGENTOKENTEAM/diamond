# Solidity API

## IERC20Facet

### mint

```solidity
function mint(address _to, uint256 _amount) external returns (bool _success)
```

Minting an amount of tokens for a designated receiver
It allows to mint specified amount until the bridge supply cap is reached

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | receiver address of the token |
| _amount | uint256 | receiving amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _success | bool | Returns true is operation succeeds |

### burn

```solidity
function burn(uint256 _amount) external returns (bool _success)
```

Burning an amount of tokens from sender
It allows to burn a bridge supply until its supply is 0, even if the cap is already set to 0

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | burnable amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _success | bool | Returns true is operation succeeds |

### burn

```solidity
function burn(address _from, uint256 _amount) external returns (bool _success)
```

Burning an amount of tokens from a designated holder
It allows to burn a bridge supply until its supply is 0, even if the cap is already set to 0

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | holder address to burn the tokens from |
| _amount | uint256 | burnable amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _success | bool | Returns true is operation succeeds |

### burnFrom

```solidity
function burnFrom(address _from, uint256 _amount) external returns (bool _success)
```

Burning an amount of tokens from a designated holder
It allows to burn a bridge supply until its supply is 0, even if the cap is already set to 0

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | holder address to burn the tokens from |
| _amount | uint256 | burnable amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _success | bool | Returns true is operation succeeds |

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

### addLP

```solidity
function addLP(address _lp) external
```

Adds a liquidity pool address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lp | address | address of the liquidity pool of the token |

### removeLP

```solidity
function removeLP(address _lp) external
```

Removes a liquidity pool address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lp | address | address of the liquidity pool of the token |

### hasLP

```solidity
function hasLP(address _lp) external view returns (bool _has)
```

Returns the existence of an lp address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _has | bool | has lp or not |

### addBuyFee

```solidity
function addBuyFee(bytes32 _id) external
```

Adds a buy fee based on a fee id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### addSellFee

```solidity
function addSellFee(bytes32 _id) external
```

Adds a sell fee based on a fee id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

