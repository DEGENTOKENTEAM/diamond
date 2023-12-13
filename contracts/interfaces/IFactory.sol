// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

interface IFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}
