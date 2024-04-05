// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IRouter02 } from "./../interfaces/IRouter02.sol";
import { INativeWrapper } from "./../interfaces/INativeWrapper.sol";

import { LibFeeStore } from "./LibFeeStore.sol";
import { LibFeeDistributor } from "./LibFeeDistributor.sol";
import { LibFeeGenericStorage } from "./LibFeeGenericStorage.sol";

import { ZeroValueNotAllowed, WrongChain } from "./../helpers/GenericErrors.sol";
import { FeeConfigSyncHomeDTO, FeeConfigSyncHomeFees } from "./../helpers/Structs.sol";

/// @title Lib Fee Generic
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Library for generic functions of the fee protocol
library LibFeeGeneric {
    using Address for address;
    using Address for address payable;

    event BountyPaid(uint256 bountyAmount, address indexed bountyReceiver);

    /// @return _is true if is home chain, else false
    function isHomeChain() internal view returns (bool _is) {
        _is = block.chainid == LibFeeGenericStorage.store().homeChainId;
    }

    /// @return _homeChainId configured home chain id
    function getHomeChainId() internal view returns (uint256 _homeChainId) {
        _homeChainId = LibFeeGenericStorage.store().homeChainId;
    }

    /// @return _nativeWrapper address of the native wrapper token
    function getNativeWrapper() internal view returns (address _nativeWrapper) {
        _nativeWrapper = LibFeeGenericStorage.store().nativeWrapper;
    }

    /// @return _uniswapV2Router address of a v2 conform dex router
    function getUniswapV2Router() internal view returns (address _uniswapV2Router) {
        _uniswapV2Router = LibFeeGenericStorage.store().uniswapV2Router;
    }

    /// Deposits a single fee with native currency on the home chain
    /// @param _feeId fee id in bytes32
    /// @param _bountyReceiver address of the receiver of the bounty
    /// @param _bountyShareInBps bounty share in basis points
    /// @return _feeAmount fee amount that is being added
    /// @return _bountyAmount amount for the bounty receiver
    /// @dev interacts with the fee distributor
    function depositSingleFeeNativeOnHomeChain(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) internal returns (uint256 _feeAmount, uint256 _bountyAmount) {
        if (!isHomeChain()) revert WrongChain();
        if (msg.value == 0) revert ZeroValueNotAllowed();
        _feeAmount = msg.value;
        (_feeAmount, _bountyAmount) = LibFeeDistributor.payoutBountyInNativeWithCustomShare(_feeAmount, _bountyReceiver, _bountyShareInBps);
        FeeConfigSyncHomeDTO memory _updatedDto = FeeConfigSyncHomeDTO({
            totalFees: _feeAmount,
            bountyReceiver: _bountyReceiver,
            fees: new FeeConfigSyncHomeFees[](1)
        });
        _updatedDto.fees[0] = FeeConfigSyncHomeFees({ id: _feeId, amount: _feeAmount });
        LibFeeDistributor.pushFees(_updatedDto);
    }

    /// Deposits a single fee with native currency on the target chain
    /// @param _feeId fee id in bytes32
    /// @param _bountyReceiver address of the receiver of the bounty
    /// @param _bountyShareInBps bounty share in basis points
    /// @return _feeAmount fee amount that is being added
    /// @return _bountyAmount amount for the bounty receiver
    /// @dev interacts with the fee store
    function depositSingleFeeNativeOnTargetChain(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) internal returns (uint256 _feeAmount, uint256 _bountyAmount) {
        if (isHomeChain()) revert WrongChain();
        uint256 _amount = msg.value;

        if (_bountyShareInBps > 0 && _bountyReceiver != address(0)) {
            _bountyAmount = (_amount * _bountyShareInBps) / 10 ** 4;
            _amount -= _bountyAmount;
            payable(_bountyReceiver).sendValue(_bountyAmount);
            emit BountyPaid(_bountyAmount, _bountyReceiver);
        }

        // convert native to wrapper native, because swapExactTokensForTokens has generic naming and is uniswap v2 pool conform
        INativeWrapper(getNativeWrapper()).deposit{ value: _amount }();

        IERC20(getNativeWrapper()).approve(getUniswapV2Router(), _amount);
        address[] memory _path = new address[](2);
        _path[0] = getNativeWrapper();
        _path[1] = LibFeeStore.getIntermediateAsset();
        uint256[] memory amounts = IRouter02(getUniswapV2Router()).swapExactTokensForTokens(
            _amount,
            (_amount * 9900) / 10 ** 4,
            _path,
            address(this),
            block.timestamp + 60
        );

        _feeAmount = amounts[amounts.length - 1];

        LibFeeStore.putFees(_feeId, _feeAmount);
    }
}
