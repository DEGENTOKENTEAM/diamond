// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

/// @title Depositable Interface
/// @author Daniel <danieldegendev@gmail.com>
interface IDepositable {
    /// Deposits a token into corresponding contracts like "Liquidity Backing" and "Staking"
    /// @param _token address of the token that should be deposited
    /// @param _amount amount of token
    function deposit(address _token, uint256 _amount) external;
}
