# Solidity API

## AccessControlEnumerableFacet

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```

_Returns `true` if `account` has been granted `role`._

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) public view returns (bytes32)
```

_Returns the admin role that controls `role`. See {grantRole} and
{revokeRole}.

To change a role's admin, use {AccessControl-_setRoleAdmin}._

### grantRole

```solidity
function grantRole(bytes32 role, address account) external
```

_Grants `role` to `account`.

If `account` had not been already granted `role`, emits a {RoleGranted}
event.

Requirements:

- the caller must have ``role``'s admin role._

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external
```

_Revokes `role` from `account`.

If `account` had been granted `role`, emits a {RoleRevoked} event.

Requirements:

- the caller must have ``role``'s admin role._

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external
```

_Revokes `role` from the calling account.

Roles are often managed via {grantRole} and {revokeRole}: this function's
purpose is to provide a mechanism for accounts to lose their privileges
if they are compromised (such as when a trusted device is misplaced).

If the calling account had been granted `role`, emits a {RoleRevoked}
event.

Requirements:

- the caller must be `account`._

### getRoleMember

```solidity
function getRoleMember(bytes32 role, uint256 index) external view returns (address)
```

_Returns one of the accounts that have `role`. `index` must be a
value between 0 and {getRoleMemberCount}, non-inclusive.

Role bearers are not sorted in any particular way, and their ordering may
change at any point.

WARNING: When using {getRoleMember} and {getRoleMemberCount}, make sure
you perform all queries on the same block. See the following
https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
for more information._

### getRoleMemberCount

```solidity
function getRoleMemberCount(bytes32 role) external view returns (uint256)
```

_Returns the number of accounts that have `role`. Can be used
together with {getRoleMember} to enumerate all bearers of a role._

