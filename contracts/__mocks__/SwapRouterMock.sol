// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { IRouter02 } from "./../diamond/interfaces/IRouter02.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWAVAX {
    function deposit() external payable;

    function transfer(address to, uint256 value) external returns (bool);

    function withdraw(uint256) external;
}

contract SwapRouterMock is IRouter02 {
    address immutable lp;
    address immutable nativeWrapper;

    event swapExactTokensForTokensEvent();
    event swapExactTokensForAVAXEvent();
    event swapExactAVAXForTokensEvent();

    constructor(address _lp, address _nativeWrapper) {
        lp = _lp;
        nativeWrapper = _nativeWrapper;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountIn;
        IERC20(path[0]).transferFrom(msg.sender, lp, amountIn);
        IERC20(path[path.length - 1]).transferFrom(lp, to, amounts[path.length - 1]);
        emit swapExactTokensForTokensEvent();
    }

    function swapExactTokensForAVAX(
        uint256 amountIn,
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountIn;
        IERC20(path[0]).transferFrom(msg.sender, lp, amountIn);
        IERC20(path[path.length - 1]).transferFrom(lp, address(this), amounts[path.length - 1]);
        IWAVAX(path[path.length - 1]).withdraw(amounts[path.length - 1]);
        (bool sent, ) = payable(to).call{ value: amountIn }("");
        sent;
        emit swapExactTokensForAVAXEvent();
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountIn;
        IERC20(path[0]).transferFrom(msg.sender, lp, amountIn);
        IERC20(path[path.length - 1]).transferFrom(lp, address(this), amounts[path.length - 1]);
        IWAVAX(path[path.length - 1]).withdraw(amounts[path.length - 1]);
        (bool sent, ) = payable(to).call{ value: amountIn }("");
        sent;
        emit swapExactTokensForAVAXEvent();
    }

    function swapExactAVAXForTokens(
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external payable returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        amounts[path.length - 1] = msg.value;
        IWAVAX(path[0]).deposit{ value: msg.value }();
        IERC20(path[0]).transfer(lp, msg.value);
        IERC20(path[path.length - 1]).transferFrom(lp, to, msg.value);
        emit swapExactAVAXForTokensEvent();
    }

    function swapExactETHForTokens(
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external payable returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        amounts[path.length - 1] = msg.value;
        IWAVAX(path[0]).deposit{ value: msg.value }();
        IERC20(path[0]).transfer(lp, msg.value);
        IERC20(path[path.length - 1]).transferFrom(lp, to, msg.value);
        emit swapExactAVAXForTokensEvent();
    }

    bool public getAmountsOutSuccess = true;

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        if (!getAmountsOutSuccess) {
            revert("nope");
        }
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = 1337 * 10 ** 18;
    }

    function setGetAmountsOutSuccess(bool _success) external {
        getAmountsOutSuccess = _success;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {}

    function factory() external returns (address) {}

    receive() external payable {}
}
