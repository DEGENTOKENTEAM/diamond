// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

interface IFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    function createPair(address tokenA, address tokenB) external returns (address pair);
}
