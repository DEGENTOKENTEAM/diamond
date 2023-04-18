// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDegenX {
    function release(address _to, uint256 _amount) external;

    function collect(address _from, uint256 _amount) external;
}
