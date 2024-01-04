// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { IERC20Facet } from "../diamond/interfaces/IERC20Facet.sol";

contract MinterBurnerMock {
    function mint(address _callee, address _receiver, uint256 _amount) external returns (bool _success) {
        _success = IERC20Facet(_callee).mint(_receiver, _amount);
    }

    function burn(address _callee, address _receiver, uint256 _amount) external returns (bool _success) {
        _success = IERC20Facet(_callee).burn(_receiver, _amount);
    }

    function burnFrom(address _callee, address _receiver, uint256 _amount) external returns (bool _success) {
        _success = IERC20Facet(_callee).burnFrom(_receiver, _amount);
    }
}
