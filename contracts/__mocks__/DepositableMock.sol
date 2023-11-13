// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IDepositable } from "./../diamond/interfaces/IDepositable.sol";

contract DepositableMock is IDepositable {
    using SafeERC20 for IERC20;

    event depositEvent(address _token, uint256 _amount);

    function deposit(address _token, uint256 _amount) external {
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        emit depositEvent(_token, _amount);
    }
}
