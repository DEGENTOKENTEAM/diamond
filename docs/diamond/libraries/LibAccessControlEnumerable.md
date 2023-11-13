# Solidity API

## LibAccessControlEnumerable

### ACCESS_CONTROL_STORAGE_POSITION

```solidity
bytes32 ACCESS_CONTROL_STORAGE_POSITION
```

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 role, bytes32 previousAdminRole, bytes32 newAdminRole)
```

### RoleGranted

```solidity
event RoleGranted(bytes32 role, address account, address sender)
```

### RoleRevoked

```solidity
event RoleRevoked(bytes32 role, address account, address sender)
```

### RoleData

```solidity
struct RoleData {
  mapping(address => bool) members;
  bytes32 adminRole;
}
```

### AccessControlStorage

```solidity
struct AccessControlStorage {
  mapping(bytes32 => struct LibAccessControlEnumerable.RoleData) roles;
  mapping(bytes32 => struct EnumerableSet.AddressSet) roleMembers;
  mapping(bytes4 => bool) supportedInterfaces;
}
```

### accessControlStorage

```solidity
function accessControlStorage() internal pure returns (struct LibAccessControlEnumerable.AccessControlStorage acs)
```

### checkRole

```solidity
function checkRole(bytes32 role) internal view
```

### checkRole

```solidity
function checkRole(bytes32 role, address account) internal view
```

### hasRole

```solidity
function hasRole(bytes32 role, address account) internal view returns (bool)
```

### grantRole

```solidity
function grantRole(bytes32 role, address account) internal
```

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) internal
```

### setRoleAdmin

```solidity
function setRoleAdmin(bytes32 role, bytes32 adminRole) internal
```

