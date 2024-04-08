// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { LibFeeGeneric } from "./../libraries/LibFeeGeneric.sol";
import { IFeeGenericFacet } from "./../interfaces/IFeeGenericFacet.sol";
import { LibFeeGenericStorage } from "./../libraries/LibFeeGenericStorage.sol";
import { LibAccessControlEnumerable } from "./../libraries/LibAccessControlEnumerable.sol";
import { Constants } from "./../helpers/Constants.sol";
import { AlreadyInitialized, ZeroValueNotAllowed } from "./../helpers/GenericErrors.sol";
import { addressZeroCheck } from "./../helpers/Functions.sol";

/// @title Fee Generic Facet
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Contains generic fee functions
/// @custom:version 1.0.0
contract FeeGenericFacet is IFeeGenericFacet {
    /// Initializes the facet
    /// @param _homeChainId home chain id
    /// @param _nativeWrapper address of the native wrapper token
    /// @param _uniswapV2Router address of the uniswap v2 conform router
    function initFeeGenericFacet(uint256 _homeChainId, address _nativeWrapper, address _uniswapV2Router, bool _isHomeChain) external {
        LibAccessControlEnumerable.checkRole(Constants.DEPLOYER_ROLE);
        addressZeroCheck(_nativeWrapper);
        LibFeeGenericStorage.Storage storage _s = LibFeeGenericStorage.store();
        if (_s.initialized) revert AlreadyInitialized();
        _s.initialized = true;
        _s.isHomeChain = _isHomeChain;
        _s.homeChainId = _homeChainId;
        _s.nativeWrapper = _nativeWrapper;
        _s.uniswapV2Router = _uniswapV2Router;
    }

    /// @inheritdoc IFeeGenericFacet
    function feeGenericIsHomeChain() external view returns (bool _is) {
        _is = LibFeeGeneric.isHomeChain();
    }

    /// @inheritdoc IFeeGenericFacet
    function feeGenericGetHomeChainId() external view returns (uint256 _homeChainId) {
        _homeChainId = LibFeeGeneric.getHomeChainId();
    }

    /// @inheritdoc IFeeGenericFacet
    function feeGenericIsInitialized() external view returns (bool _is) {
        _is = LibFeeGeneric.isInitialized();
    }

    /// @inheritdoc IFeeGenericFacet
    function feeGenericDepositSingleFeeNative(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) external payable returns (uint256 _feeAmount, uint256 _bountyAmount) {
        if (msg.value == 0) revert ZeroValueNotAllowed();
        (_feeAmount, _bountyAmount) = LibFeeGeneric.isHomeChain()
            ? LibFeeGeneric.depositSingleFeeNativeOnHomeChain(_feeId, _bountyReceiver, _bountyShareInBps)
            : LibFeeGeneric.depositSingleFeeNativeOnTargetChain(_feeId, _bountyReceiver, _bountyShareInBps);
    }
}
