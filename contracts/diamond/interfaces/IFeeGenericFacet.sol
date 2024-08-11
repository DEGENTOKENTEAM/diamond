// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

/// @title Fee Generic Facet Interface
/// @author Daniel <danieldegendev@gmail.com>
interface IFeeGenericFacet {
    event Distributed(address indexed account, uint256 amount);
    event Collected(bytes32 indexed feeId, uint256 amount);

    /// @return _is whether the diamond is on the home chain or not
    function feeGenericIsHomeChain() external view returns (bool _is);

    /// @return _homeChainId block.chainid of the configured home chain
    function feeGenericGetHomeChainId() external view returns (uint256 _homeChainId);

    /// @return _is true if it's initialized, else false
    function feeGenericIsInitialized() external view returns (bool _is);

    /// Deposits a single fee with native currency
    /// @param _feeId fee id in bytes32
    /// @param _bountyReceiver address of the receiver of the bounty
    /// @param _bountyShareInBps bounty share in basis points
    /// @return _feeAmount fee amount that is being added
    /// @return _bountyAmount amount for the bounty receiver
    function feeGenericDepositSingleFeeNative(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) external payable returns (uint256 _feeAmount, uint256 _bountyAmount);

    /// Response the value of the fee
    /// @param _feeId fee id in bytes32
    function feeGenericGetFee(bytes32 _feeId) external view returns (uint256 _fee);
}
