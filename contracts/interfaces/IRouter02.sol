// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

interface IRouter02 {
    function factory() external returns (address);

    function WETH() external returns (address);

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}
