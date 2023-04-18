// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "./interfaces/IPeggedToken.sol";
import "./interfaces/IDegenX.sol";

contract BridgeManager is AccessControlEnumerable, IPeggedToken {
    address public operatingToken;

    mapping(address => bool) public bridges;

    event UPDATE_OPERATING_TOKEN(address indexed token);

    error AddressZero();
    error NotAllowed(address sender);

    bytes32 public constant ROLE_BRIDGE = keccak256("ROLE_BRIDGE");
    bytes32 public constant ROLE_BRIDGE_ADMIN = keccak256("ROLE_BRIDGE_ADMIN");

    constructor() {
        grantRole(ROLE_BRIDGE_ADMIN, _msgSender());
    }

    modifier onlyBridgeAndBridgeAdmin() {
        _onlyBridgeAndBridgeAdmin();
        _;
    }

    function _onlyBridgeAndBridgeAdmin() internal view {
        if (
            !(hasRole(ROLE_BRIDGE, _msgSender()) ||
                hasRole(ROLE_BRIDGE_ADMIN, _msgSender()))
        ) revert NotAllowed(_msgSender());
    }

    function name()
        external
        view
        onlyRole(ROLE_BRIDGE)
        returns (string memory)
    {
        return IERC20Metadata(operatingToken).name();
    }

    function symbol()
        external
        view
        onlyRole(ROLE_BRIDGE)
        returns (string memory)
    {
        return IERC20Metadata(operatingToken).symbol();
    }

    function decimals() external view onlyRole(ROLE_BRIDGE) returns (uint8) {
        return IERC20Metadata(operatingToken).decimals();
    }

    function setOperatingToken(
        address _operatingToken
    ) external onlyRole(ROLE_BRIDGE_ADMIN) {
        if (_operatingToken == address(0)) revert AddressZero();
        operatingToken = _operatingToken;
        emit UPDATE_OPERATING_TOKEN(_operatingToken);
    }

    function addBridgeAllowance(
        address _candidate
    ) external onlyRole(ROLE_BRIDGE_ADMIN) {
        if (_candidate == address(0)) revert AddressZero();
        grantRole(ROLE_BRIDGE, _candidate);
        bridges[_candidate] = false;
    }

    function removeBridgeAllowance(
        address _candidate
    ) external onlyRole(ROLE_BRIDGE_ADMIN) {
        if (_candidate == address(0)) revert AddressZero();
        revokeRole(ROLE_BRIDGE, _candidate);
        delete bridges[_candidate];
    }

    function enableBridge(
        address _candidate
    ) external onlyRole(ROLE_BRIDGE_ADMIN) {
        if (_candidate == address(0)) revert AddressZero();
        bridges[_candidate] = true;
    }

    function disableBridge(
        address _candidate
    ) external onlyRole(ROLE_BRIDGE_ADMIN) {
        if (_candidate == address(0)) revert AddressZero();
        bridges[_candidate] = false;
    }

    function mint(
        address _to,
        uint256 _amount
    ) external onlyBridgeAndBridgeAdmin {
        IDegenX(operatingToken).release(_to, _amount);
    }

    function burn(
        address _from,
        uint256 _amount
    ) external onlyBridgeAndBridgeAdmin {
        IDegenX(operatingToken).collect(_from, _amount);
    }
}
