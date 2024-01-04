# Solidity API

## ERC20Facet

Provides the functionality of an ERC20 token to an EIP-2535 based diamond

### ERC20_FACET_STORAGE_SLOT

```solidity
bytes32 ERC20_FACET_STORAGE_SLOT
```

Storage Slot

### SetLP

```solidity
event SetLP(address lp)
```

### PutFees

```solidity
event PutFees()
```

### ManuallyPutFees

```solidity
event ManuallyPutFees()
```

### ExcludeAccountFromTax

```solidity
event ExcludeAccountFromTax(address account)
```

### IncludeAccountToTax

```solidity
event IncludeAccountToTax(address account)
```

### FeeAdded

```solidity
event FeeAdded(bytes32 id, bool buyFee)
```

### FeeRemoved

```solidity
event FeeRemoved(bytes32 id, bool buyFee)
```

### FeeIdAlreadySet

```solidity
error FeeIdAlreadySet(bytes32 id)
```

### FeeIdNotSet

```solidity
error FeeIdNotSet(bytes32 id)
```

### FeeIdMissing

```solidity
error FeeIdMissing()
```

### InvalidFeeId

```solidity
error InvalidFeeId(bytes32 id)
```

### NoBurnPossible

```solidity
error NoBurnPossible()
```

### ERC20FacetStorage

```solidity
struct ERC20FacetStorage {
  address lp;
  bool isMinter;
  bool isBurner;
  bool initialized;
  bytes32[] buyFee;
  bytes32[] sellFee;
  mapping(address => bool) excludes;
  mapping(bytes32 => uint256) fees;
}
```

### initERC20Facet

```solidity
function initERC20Facet(string __name, string __symbol, uint8 __decimals) external
```

Initializes the contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| __name | string | The name of the token |
| __symbol | string | The symbol of the token |
| __decimals | uint8 | The number of decimals of the token |

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

### setLP

```solidity
function setLP(address _lp) external
```

Sets the liquidity pool address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lp | address | address of the liquidity pool of the token |

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

### addBuyFee

```solidity
function addBuyFee(bytes32 _id) external
```

Adds a buy fee based on a fee id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### removeBuyFee

```solidity
function removeBuyFee(bytes32 _id) external
```

Removes a buy fee based on a fee id

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

### removeSellFee

```solidity
function removeSellFee(bytes32 _id) external
```

Removes a sell fee based on a fee id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### isExcluded

```solidity
function isExcluded(address _account) external view returns (bool _isExcluded)
```

Checks if an account is whether excluded from paying fees or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | account to check |

### isBuyFee

```solidity
function isBuyFee(bytes32 _id) external view returns (bool _itis)
```

Checks whether a fee id is a buy fee or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### isSellFee

```solidity
function isSellFee(bytes32 _id) external view returns (bool _itis)
```

Check whether a fee id is a sell fee or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |

### getLP

```solidity
function getLP() external view returns (address _lp)
```

Returns the address of the currently set liquidity pool

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lp | address | address of the liquidity pool |

### getBuyFees

```solidity
function getBuyFees() external view returns (bytes32[] _fees)
```

Returns all buy fee ids

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fees | bytes32[] | array of fee ids |

### getSellFees

```solidity
function getSellFees() external view returns (bytes32[] _fees)
```

Returns all sell fee ids

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fees | bytes32[] | array of fee ids |

### _isFee

```solidity
function _isFee(bytes32 _id, bool _isBuyFee) internal view returns (bool _itis)
```

Returns if a fee is an actual fee from the buy fees or from the sell fees

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _isBuyFee | bool | flag to decide whether it is a buy fee or not |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _itis | bool | returns true if it is a fee |

### _addFee

```solidity
function _addFee(bytes32 _id, bool _isBuyFee) internal
```

Adds a fee based on a fee id and a flag if it should be added as buy fee or sell fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _isBuyFee | bool | flag if fee id should be processed as buy fee or sell fee |

### _removeFee

```solidity
function _removeFee(bytes32 _id, bool _isBuyFee) internal
```

Removes a fee based on a fee id and a flag if it should be removed as buy fee or sell fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | bytes32 | fee id |
| _isBuyFee | bool | flag if fee id should be processed as buy fee or sell fee |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal
```

The execution is successful when the contract is enabled.
        Furthermore it will also check if the receiver address is a burn address,
        so it will be prevented from burning by a unallowed account.

### _transfer

```solidity
function _transfer(address _from, address _to, uint256 _amount) internal returns (bool)
```

Transfers the token from one address to another
During this process, it will be checked if the provided address are a liquidity pool address and then
        being marked as a buy transfer or sell transfer. During a buy or sell, desired fees will be charged.
        But only if non of the addresses is excluded from the fees and the router is set. Since swapping tokens
        during a buy process, it will be only done in a sell process. The charged fees are getting cut of from
        the initial amount of tokens and the rest is getting transfered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | holder address |
| _to | address | receiver address |
| _amount | uint256 | amount of tokens to transfer |

### _store

```solidity
function _store() internal pure returns (struct ERC20Facet.ERC20FacetStorage _s)
```

_Store_

