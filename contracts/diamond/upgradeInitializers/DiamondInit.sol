// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IDiamondLoupe } from "../interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { IERC173 } from "../interfaces/IERC173.sol";
import { IERC165 } from "../interfaces/IERC165.sol";
import { LibAccessControlEnumerable } from "./../libraries/LibAccessControlEnumerable.sol";
import { LibDiamond } from "../libraries/LibDiamond.sol";
import { Constants } from "./../helpers/Constants.sol";

/// @custom:version 1.0.0
contract DiamondInit {
    function init() external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        // set and grant admin roles

        LibAccessControlEnumerable.grantRole(Constants.DEFAULT_ADMIN_ROLE, msg.sender);

        LibAccessControlEnumerable.setRoleAdmin(Constants.ADMIN_ROLE, Constants.DEFAULT_ADMIN_ROLE);
        LibAccessControlEnumerable.setRoleAdmin(Constants.FEE_DISTRIBUTOR_PUSH_ROLE, Constants.ADMIN_ROLE);
        LibAccessControlEnumerable.setRoleAdmin(Constants.FEE_DISTRIBUTOR_MANAGER, Constants.ADMIN_ROLE);
        LibAccessControlEnumerable.setRoleAdmin(Constants.FEE_STORE_MANAGER_ROLE, Constants.ADMIN_ROLE);
        LibAccessControlEnumerable.setRoleAdmin(Constants.FEE_MANAGER_ROLE, Constants.ADMIN_ROLE);
        LibAccessControlEnumerable.setRoleAdmin(Constants.DEPLOYER_ROLE, Constants.ADMIN_ROLE);
        LibAccessControlEnumerable.grantRole(Constants.FEE_DISTRIBUTOR_PUSH_ROLE, msg.sender);
        LibAccessControlEnumerable.grantRole(Constants.FEE_DISTRIBUTOR_MANAGER, msg.sender);
        LibAccessControlEnumerable.grantRole(Constants.FEE_STORE_MANAGER_ROLE, msg.sender);
        LibAccessControlEnumerable.grantRole(Constants.FEE_MANAGER_ROLE, msg.sender);
        LibAccessControlEnumerable.grantRole(Constants.DEPLOYER_ROLE, msg.sender);
        LibAccessControlEnumerable.grantRole(Constants.ADMIN_ROLE, msg.sender);
    }
}
