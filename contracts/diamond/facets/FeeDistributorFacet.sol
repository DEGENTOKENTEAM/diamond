// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { IFeeDistributorFacet } from "./../interfaces/IFeeDistributorFacet.sol";
import { IDepositable } from "./../interfaces/IDepositable.sol";
import { IRouter02 } from "./../interfaces/IRouter02.sol";
import { IWAVAX } from "./../interfaces/IWAVAX.sol";
import { LibFeeManager } from "./../libraries/LibFeeManager.sol";
import { LibFeeDistributor } from "./../libraries/LibFeeDistributor.sol";
import { LibFeeManagerStorage } from "./../libraries/LibFeeManagerStorage.sol";
import { LibFeeDistributorStorage } from "./../libraries/LibFeeDistributorStorage.sol";
import { LibAccessControlEnumerable } from "./../libraries/LibAccessControlEnumerable.sol";
import { FeeConfig, FeeConfigSyncHomeDTO, FeeConfigSyncHomeFees, AddReceiverParams } from "./../helpers/Structs.sol";
import { AlreadyInitialized, ZeroValueNotAllowed, MissingData } from "./../helpers/GenericErrors.sol";
import { Constants } from "./../helpers/Constants.sol";

/// @title Fee Distributor Facet
/// @author Daniel <danieldegendev@gmail.com>
/// @notice It is responsible for distributing received fees to its configured receivers
/// @custom:version 1.0.0
contract FeeDistributorFacet is IFeeDistributorFacet {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    event ReceiverAdded(address account, uint64 points);
    event ReceiverRemoved(address account);
    event DistributionStarted();
    event DistributionStopped();
    event TriggerDistributionWhileNotRunning();
    event Distributed(address indexed account, uint256 amount);
    event UpdatedDistributionShares(address[] receivers, uint64[] shares);
    event BountyEnabled();
    event BountyDisabled();
    event BountyShareUpdated(uint64 share);
    event PushFeesGasCompensationForCallerUpdate(uint256 amountInWei);
    event BountyPaidFailed(uint256 amount, address receiver);
    event EnableBountyInToken();
    event DisableBountyInToken();

    error ReceiverNotExisting(address receiver);
    error WrongData();
    error WrongToken();
    error FailedStartMissingShares();
    error InvalidSwapPath();

    modifier onlyFeeDistributorManager() {
        LibAccessControlEnumerable.checkRole(Constants.FEE_DISTRIBUTOR_MANAGER);
        _;
    }

    /// Initializes the facet
    /// @param _baseToken address of the expected token we get from the bridge
    /// @param _nativeWrapper address of native wrapper token on the operating chain
    /// @param _router uniswap v2 based router
    /// @param _bountyShare share of bounty  (10000 = 1%, 1000 = 0.1%)
    /// @dev only available to DEPLOYER_ROLE
    function initFeeDistributorFacet(address _baseToken, address _nativeWrapper, address _router, uint64 _bountyShare) external {
        LibAccessControlEnumerable.checkRole(Constants.DEPLOYER_ROLE);
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        if (s.initialized) revert AlreadyInitialized();
        s.bountyShare = _bountyShare;
        s.baseToken = _baseToken;
        s.nativeWrapper = _nativeWrapper;
        s.router = _router;
        s.bountyInToken = false;
        s.initialized = true;
    }

    /// @inheritdoc IFeeDistributorFacet
    function pushFees(address _token, uint256 _amount, FeeConfigSyncHomeDTO calldata _dto) external payable {
        LibAccessControlEnumerable.checkRole(Constants.FEE_DISTRIBUTOR_PUSH_ROLE);
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();

        if (s.baseToken != _token) revert WrongToken();
        if (_amount == 0) revert ZeroValueNotAllowed();

        // before native swap
        if (s.bountyInToken) (_amount, ) = LibFeeDistributor.payoutBountyInToken(_token, _amount, _dto.bountyReceiver);

        // swap basetoken to native
        address[] memory _path = new address[](2);
        _path[0] = s.baseToken;
        _path[1] = s.nativeWrapper;
        IERC20(s.baseToken).approve(s.router, _amount);
        uint256[] memory _amounts = IRouter02(s.router).swapExactTokensForAVAX(_amount, 0, _path, address(this), block.timestamp + 60);
        _amount = _amounts[_amounts.length - 1];

        // pay gas compensation to EOA
        if (s.pushFeesGasCompensationForCaller > 0 && _amount > s.pushFeesGasCompensationForCaller && !msg.sender.isContract()) {
            payable(msg.sender).sendValue(s.pushFeesGasCompensationForCaller);
            _amount -= s.pushFeesGasCompensationForCaller;
        }

        // after native swap
        if (!s.bountyInToken) (_amount, ) = LibFeeDistributor.payoutBountyInNative(_amount, _dto.bountyReceiver);

        // generate new dto and redraw shares based on _amount and original send amount (_dto.totalFees) because we substract some stuff and bridged funds will differ from initial funds anyway
        // slither-disable-next-line uninitialized-local-variables
        FeeConfigSyncHomeDTO memory _updatedDto = FeeConfigSyncHomeDTO({
            totalFees: _amount,
            bountyReceiver: _dto.bountyReceiver,
            fees: new FeeConfigSyncHomeFees[](_dto.fees.length)
        });
        for (uint256 i = 0; i < _dto.fees.length; ) {
            uint256 _feeAmount = (_amount * _dto.fees[i].amount) / _dto.totalFees;
            _updatedDto.fees[i] = FeeConfigSyncHomeFees({ id: _dto.fees[i].id, amount: _feeAmount });
            unchecked {
                i++;
            }
        }

        LibFeeDistributor.pushFees(_updatedDto);
    }

    /// @inheritdoc IFeeDistributorFacet
    function feeDistributorDepositSingleFeeNative(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) external payable returns (uint256 _amount, uint256 _bountyAmount) {
        if (msg.value == 0) revert ZeroValueNotAllowed();
        _amount = msg.value;
        (_amount, _bountyAmount) = LibFeeDistributor.payoutBountyInNativeWithCustomShare(_amount, _bountyReceiver, _bountyShareInBps);
        FeeConfigSyncHomeDTO memory _updatedDto = FeeConfigSyncHomeDTO({
            totalFees: _amount,
            bountyReceiver: _bountyReceiver,
            fees: new FeeConfigSyncHomeFees[](1)
        });
        _updatedDto.fees[0] = FeeConfigSyncHomeFees({ id: _feeId, amount: _amount });
        LibFeeDistributor.pushFees(_updatedDto);
    }

    /// Adds a fee receiver
    /// @param _params contains the name, points, account address und swapPath for the receiver
    /// @dev swapPath[] needs to have the base token address on position 0
    /// @dev This method also checks if there is a valid swap path existing, otherwise it will be reverted by the aggregator
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function addFeeDistributionReceiver(AddReceiverParams calldata _params) external onlyFeeDistributorManager {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        // check if it is a valid pair
        if (_params.swapPath.length > 1) IRouter02(s.router).getAmountsOut(10 ** 6, _params.swapPath);
        s.shareIndex[_params.account] = s.shares.length;
        s.shares.push(
            LibFeeDistributorStorage.Share({
                name: _params.name,
                points: _params.points,
                receiver: _params.account,
                swap: _params.swapPath
            })
        );
        s.totalPoints += _params.points;
        emit ReceiverAdded(_params.account, _params.points);
    }

    /// Removes a receiver based on the receiver address
    /// @param _account address of the receiver
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function removeFeeDistributionReceiver(address _account) external onlyFeeDistributorManager {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        if (s.shares.length == 0) {
            revert ReceiverNotExisting(_account);
        } else if (s.shares.length == 1) {
            delete s.shares;
            delete s.shareIndex[_account];
            s.totalPoints = 0;
            s.running = false; // stop when there is no share available anymore
        } else {
            for (uint256 i = 0; i < s.shares.length; ) {
                if (s.shares[i].receiver == _account) {
                    delete s.shareIndex[_account];
                    s.shareIndex[s.shares[s.shares.length - 1].receiver] = i;
                    s.totalPoints -= s.shares[i].points;
                    s.shares[i] = s.shares[s.shares.length - 1];
                }
                unchecked {
                    i++;
                }
            }
            s.shares.pop();
        }
        emit ReceiverRemoved(_account);
    }

    /// Updates the shares of existing receivers
    /// @param _receivers array of existing receivers
    /// @param _shares array of new shares to be set
    /// @dev if a receiver is not existing, it'll be reverted
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function updateFeeDistributionShares(address[] calldata _receivers, uint64[] calldata _shares) external onlyFeeDistributorManager {
        if (_receivers.length == 0 || _shares.length == 0 || _receivers.length != _shares.length) revert WrongData();
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();
        if (s.shares.length == 0) revert MissingData();
        for (uint256 i = 0; i < _receivers.length; ) {
            if (s.shares[s.shareIndex[_receivers[i]]].receiver != _receivers[i]) revert ReceiverNotExisting(_receivers[i]);
            s.totalPoints -= s.shares[s.shareIndex[_receivers[i]]].points;
            s.shares[s.shareIndex[_receivers[i]]].points = _shares[i];
            s.totalPoints += _shares[i];
            unchecked {
                i++;
            }
        }
        emit UpdatedDistributionShares(_receivers, _shares);
    }

    /// Starts the fee distribution
    /// @dev It will be also check if the bounties are being activated and if there are already fees in the queue to process. If so, it'll be process on activating the fee distribution.
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function startFeeDistribution() external onlyFeeDistributorManager {
        LibFeeDistributorStorage.Storage storage s = LibFeeDistributorStorage.store();

        if (s.shares.length == 0) revert FailedStartMissingShares();

        LibFeeDistributor.setRunning(true);

        bool _initialState = s.bountyActive;
        if (_initialState) s.bountyActive = false;
        if (s.queue.length > 0) {
            for (uint256 i = 0; i < s.queue.length; ) {
                LibFeeDistributor.pushFees(s.queue[i]);
                unchecked {
                    i++;
                }
            }
            delete s.queue;
        }

        if (_initialState) s.bountyActive = true;

        emit DistributionStarted();
    }

    /// Stops the fee distribution
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function stopFeeDistribution() external onlyFeeDistributorManager {
        LibFeeDistributor.setRunning(false);
        emit DistributionStopped();
    }

    /// @dev Enables the bounty possibility
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function enableFeeDistributorBounty() external onlyFeeDistributorManager {
        LibFeeDistributorStorage.store().bountyActive = true;
        emit BountyEnabled();
    }

    /// @dev Disables the bounty possibility
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function disableFeeDistributorBounty() external onlyFeeDistributorManager {
        LibFeeDistributorStorage.store().bountyActive = false;
        emit BountyDisabled();
    }

    /// Sets the share of the bounty
    /// @param _share share of the bounty
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function setFeeDistributorBountyShare(uint64 _share) external onlyFeeDistributorManager {
        LibFeeDistributorStorage.store().bountyShare = _share;
        emit BountyShareUpdated(_share);
    }

    /// Sets the gas compensation for the caller of the push fee method
    /// @param _amountInWei share of the bounty
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function setPushFeesGasCompensationForCaller(uint256 _amountInWei) external onlyFeeDistributorManager {
        LibFeeDistributorStorage.store().pushFeesGasCompensationForCaller = _amountInWei;
        emit PushFeesGasCompensationForCallerUpdate(_amountInWei);
    }

    /// Enables  or disables the bountyInToken flag based on the given parameter
    /// @param _bountyInToken flag if enabled or not
    /// @dev only available to FEE_DISTRIBUTIOR_MANAGER role
    function enableBountyInToken(bool _bountyInToken) external onlyFeeDistributorManager {
        LibFeeDistributorStorage.store().bountyInToken = _bountyInToken;
        if (_bountyInToken) emit EnableBountyInToken();
        else emit DisableBountyInToken();
    }

    /// viewables

    /// @dev check whether the bounty is active of not
    /// @return _is if true, it's on
    function isFeeDistributorBountyActive() external view returns (bool _is) {
        _is = LibFeeDistributorStorage.store().bountyActive;
    }

    /// @dev check whether the distributor is running of not
    /// @return _is if true, it's on
    function isFeeDistributorRunning() external view returns (bool _is) {
        _is = LibFeeDistributorStorage.store().running;
    }

    /// @dev check whether the distributors bounty is paid in the token or not
    /// @return _is if true, it's paid in token
    function isFeeDistributorBountyInToken() external view returns (bool _is) {
        _is = LibFeeDistributorStorage.store().bountyInToken;
    }

    /// @dev Gets the current total points of all shares
    /// @return _totalPoints points
    function getFeeDistributorTotalPoints() external view returns (uint64 _totalPoints) {
        _totalPoints = LibFeeDistributorStorage.store().totalPoints;
    }

    /// @dev Gets all items in queue
    /// @return _queue array of sync items
    function getFeeDistributorQueue() external view returns (FeeConfigSyncHomeDTO[] memory _queue) {
        _queue = LibFeeDistributorStorage.store().queue;
    }

    /// @dev Gets all shares
    /// @return _shares array of configured shares
    function getFeeDistributorReceivers() external view returns (LibFeeDistributorStorage.Share[] memory _shares) {
        _shares = LibFeeDistributorStorage.store().shares;
    }

    /// @dev Gets last bounty information
    /// @return _receiver address of recent receiver
    /// @return _payout amount being paid to recent receiver
    function getFeeDistributorLastBounty() external view returns (address _receiver, uint256 _payout) {
        _receiver = LibFeeDistributorStorage.store().lastBountyReceiver;
        _payout = LibFeeDistributorStorage.store().lastBountyAmount;
    }

    /// @dev Gets the bounty share
    /// @return _share current bounty share
    function getFeeDistributorBountyShare() external view returns (uint64 _share) {
        _share = LibFeeDistributorStorage.store().bountyShare;
    }

    /// @dev Gets the total bounties being paid
    /// @return _totalBounties total bounties
    function getFeeDistributorTotalBounties() external view returns (uint256 _totalBounties) {
        _totalBounties = LibFeeDistributorStorage.store().totalBounties;
    }

    /// @dev Checks whether the fee distributor is initialized or not
    /// @return _is true on initialized state, false if not
    function feeDistributorIsInitialized() external view returns (bool _is) {
        _is = LibFeeDistributorStorage.store().initialized;
    }
}
