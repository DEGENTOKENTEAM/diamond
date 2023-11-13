// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.17;

import { IRelayerCeler } from "./../diamond/interfaces/IRelayerCeler.sol";
import { ICelerFeeHubFacet } from "./../diamond/interfaces/ICelerFeeHubFacet.sol";

contract RelayerCelerMock is IRelayerCeler {
    uint256 public deployFeesFeeCalcReturnValue = 100;
    uint256 public sendFeesFeeCalcReturnValue = 100;

    event deployFeesEvent(address _receiver, address _target, uint256 _dstChainId, bytes _message);
    event sendFeesEvent(address _asset, uint256 _amount, uint32 minMaxSlippage, bytes _message);

    function deployFees(address _receiver, address _target, uint256 _chainId, bytes calldata _message) external payable {
        emit deployFeesEvent(_receiver, _target, _chainId, _message);
    }

    function sendFees(address _asset, uint256 _amount, uint32 minMaxSlippage, bytes calldata _message) external payable {
        emit sendFeesEvent(_asset, _amount, minMaxSlippage, _message);
    }

    function deployFeesFeeCalc(address _target, bytes calldata _message) external view returns (uint256 _wei) {
        _target;
        _message;
        _wei = deployFeesFeeCalcReturnValue;
    }

    function sendFeesFeeCalc(bytes calldata _message) external view returns (uint256 _wei) {
        _message;
        _wei = sendFeesFeeCalcReturnValue;
    }

    function setDeployFeesFeeCalcReturnValue(uint256 _deployFeesFeeCalcReturnValue) external {
        deployFeesFeeCalcReturnValue = _deployFeesFeeCalcReturnValue;
    }

    function setSendFeesFeeCalcReturnValue(uint256 _sendFeesFeeCalcReturnValue) external {
        sendFeesFeeCalcReturnValue = _sendFeesFeeCalcReturnValue;
    }

    /// internal testing

    function fakeCelerFeeHubFacetDeployFeesWithCelerConfirm(address _contract, uint64 _chainId, bytes memory _message) external {
        ICelerFeeHubFacet(_contract).deployFeesWithCelerConfirm(_chainId, _message);
    }
}
