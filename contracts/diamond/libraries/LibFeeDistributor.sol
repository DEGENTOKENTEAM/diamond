// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { IWAVAX } from "./../interfaces/IWAVAX.sol";
import { IRouter02 } from "./../interfaces/IRouter02.sol";
import { IDepositable } from "./../interfaces/IDepositable.sol";
import { LibFeeManager } from "./LibFeeManager.sol";
import { LibFeeDistributorStorage } from "./LibFeeDistributorStorage.sol";
import { LibAccessControlEnumerable } from "./LibAccessControlEnumerable.sol";
import { Constants } from "./../helpers/Constants.sol";
import { MissingData } from "./../helpers/GenericErrors.sol";
import { FeeConfigSyncHomeDTO, FeeConfigSyncHomeFees } from "./../helpers/Structs.sol";

/// @title Lib Fee Distributor
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Library for the fee distributor facet
library LibFeeDistributor {
    using Address for address;
    using Address for address payable;

    // TODO put into generic events interface or something
    event TriggerDistributionWhileNotRunning();
    event Distributed(address indexed account, uint256 amount);
    event BountyPaid(uint256 amount, address indexed receiver);

    /// Distributes the fees to the desired receivers based on their share
    /// @param _dto a dto that needs to be synced
    /// @dev If the distribution is running, it'll distribute it directly, otherwise it will be queued up and distributed once the distirbution is enabled
    function pushFees(FeeConfigSyncHomeDTO memory _dto) internal {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        if (_dto.fees.length == 0) revert MissingData();
        // more efficient way to check this before and not in loop
        if (s.running) {
            for (uint256 i = 0; i < _dto.fees.length; ) {
                distribute(LibFeeManager.getFeeConfigById(_dto.fees[i].id).receiver, _dto.fees[i].amount);
                unchecked {
                    i++;
                }
            }
        } else {
            FeeConfigSyncHomeDTO storage _q = s.queue.push();
            _q.totalFees = _dto.totalFees;
            _q.bountyReceiver = _dto.bountyReceiver;
            for (uint256 i = 0; i < _dto.fees.length; ) {
                _q.fees.push(FeeConfigSyncHomeFees({ id: _dto.fees[i].id, amount: _dto.fees[i].amount }));
                unchecked {
                    i++;
                }
            }
            emit TriggerDistributionWhileNotRunning();
        }
    }

    /// Distributes the fees to the desired addresses
    /// @param _receiver address of the receiver, can be address(0)
    /// @param _amount amount of tokens being distributed
    /// @dev If the receiver is address(0), the funds will be distributed to all defined shares based on their points and desired swap
    /// @dev If the receiver is not address(0), the funds will be directly send to the address
    function distribute(address _receiver, uint256 _amount) internal {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        if (_receiver == address(0) && s.totalPoints > 0) {
            uint256 _rest = _amount;
            uint256 _shareCount = s.shares.length;
            for (uint256 i = 0; i < _shareCount; i++) {
                LibFeeDistributorStorage.Share storage _share = s.shares[i];

                bool _useRest = _shareCount == i + 1;
                uint256 _shareAmount = _useRest ? _rest : (_amount * uint256(_share.points)) / uint256(s.totalPoints);
                _rest = _useRest ? 0 : _rest - _shareAmount;

                if (_share.swap.length > 1) {
                    address _token = _share.swap[_share.swap.length - 1];
                    uint256[] memory amounts = IRouter02(s.router).swapExactAVAXForTokens{ value: _shareAmount }(
                        0,
                        _share.swap,
                        _share.receiver.isContract() ? address(this) : _share.receiver,
                        block.timestamp
                    );
                    _shareAmount = amounts[amounts.length - 1];
                    if (_share.receiver.isContract()) {
                        IERC20(_token).approve(_share.receiver, _shareAmount);
                        IDepositable(_share.receiver).deposit(_token, _shareAmount);
                    }
                    emit Distributed(_share.receiver, _shareAmount);
                } else if (_share.receiver.isContract()) {
                    IWAVAX(s.nativeWrapper).deposit{ value: _shareAmount }();
                    IERC20(s.nativeWrapper).approve(_share.receiver, _shareAmount);
                    IDepositable(_share.receiver).deposit(s.nativeWrapper, _shareAmount);
                    emit Distributed(_share.receiver, _shareAmount);
                } else {
                    payable(_share.receiver).sendValue(_shareAmount);
                    emit Distributed(_share.receiver, _shareAmount);
                }
            }
        } else {
            payable(_receiver).sendValue(_amount);
            emit Distributed(_receiver, _amount);
        }
    }

    /// Set the the running state of the distributor
    /// @param _running flag
    function setRunning(bool _running) internal {
        LibFeeDistributorStorage.store().running = _running;
    }

    /// Pays out the bounty to the bounty receiver
    /// @param _token address of the asset
    /// @param _amount amount of the asser
    /// @param _receiver address of the bounty receiver
    /// @dev only pays out the bounty if the distributor is running
    function payoutBountyInToken(
        address _token,
        uint256 _amount,
        address _receiver
    ) internal returns (uint256 _amountLeft, uint256 _bountyAmount) {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        _amountLeft = _amount;
        if (s.running && s.bountyActive && s.bountyShare > 0 && _receiver != address(0) && _amountLeft > 0) {
            _bountyAmount = (_amountLeft * s.bountyShare) / 10 ** 4;
            _amountLeft -= _bountyAmount;
            s.totalBounties += _bountyAmount;
            s.lastBountyAmount = _bountyAmount;
            s.lastBountyReceiver = _receiver;
            // slither-disable-next-line unchecked-transfer
            IERC20(_token).transfer(_receiver, _bountyAmount);
            emit BountyPaid(_bountyAmount, _receiver);
        }
    }

    /// Pays out the bounty to the bounty receiver
    /// @param _amount amount of the asser
    /// @param _receiver address of the bounty receiver
    /// @dev only pays out the bounty if the distributor is running
    function payoutBountyInNative(uint256 _amount, address _receiver) internal returns (uint256 _amountLeft, uint256 _bountyAmount) {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        (_amountLeft, _bountyAmount) = payoutBountyInNativeWithCustomShare(_amount, _receiver, s.bountyShare);
    }

    /// Pays out the bounty to the bounty receiver with a given custom share
    /// @param _amount base amount for the bounty calculation
    /// @param _receiver address of the bounty receiver
    /// @param _customShare bps of the custom share of the bounty
    function payoutBountyInNativeWithCustomShare(
        uint256 _amount,
        address _receiver,
        uint256 _customShare
    ) internal returns (uint256 _amountLeft, uint256 _bountyAmount) {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        _amountLeft = _amount;
        if (s.running && s.bountyActive && _customShare > 0 && _receiver != address(0) && _amountLeft > 0) {
            _bountyAmount = (_amountLeft * _customShare) / 10 ** 4;
            _amountLeft -= _bountyAmount;
            s.totalBounties += _bountyAmount;
            s.lastBountyAmount = _bountyAmount;
            s.lastBountyReceiver = _receiver;
            payable(_receiver).sendValue(_bountyAmount);
            emit BountyPaid(_bountyAmount, _receiver);
        }
    }
}
