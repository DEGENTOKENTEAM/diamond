// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { IMessageBus, MsgDataTypes } from "celer/contracts/message/interfaces/IMessageBus.sol";
import { IMessageReceiverApp } from "celer/contracts/message/framework/MessageApp.sol";

contract MessageBusMock is IMessageBus {
    event sendMessageEvent(address _receiver, uint256 _dstChainId, bytes _message, uint256 _value);
    event sendMessageEventBytes(bytes _receiver, uint256 _dstChainId, bytes _message, uint256 _value);
    event sendMessageWithTransferEvent(
        address _receiver,
        uint256 _dstChainId,
        address _srcBridge,
        bytes32 _srcTransferId,
        bytes _message,
        uint256 _value
    );
    event executeMessageEvent(bytes _message, MsgDataTypes.RouteInfo _route, bytes[] _sigs, address[] _signers, uint256[] _powers);
    event executeMessageWithTransferEvent(
        bytes _message,
        MsgDataTypes.TransferInfo _route,
        bytes[] _sigs,
        address[] _signers,
        uint256[] _powers
    );

    function sendMessage(address _receiver, uint256 _dstChainId, bytes calldata _message) external payable {
        emit sendMessageEvent(_receiver, _dstChainId, _message, msg.value);
    }

    function sendMessage(bytes calldata _receiver, uint256 _dstChainId, bytes calldata _message) external payable {
        emit sendMessageEventBytes(_receiver, _dstChainId, _message, msg.value);
    }

    function sendMessageWithTransfer(
        address _receiver,
        uint256 _dstChainId,
        address _srcBridge,
        bytes32 _srcTransferId,
        bytes calldata _message
    ) external payable {
        emit sendMessageWithTransferEvent(_receiver, _dstChainId, _srcBridge, _srcTransferId, _message, msg.value);
    }

    function executeMessage(
        bytes calldata _message,
        MsgDataTypes.RouteInfo calldata _route,
        bytes[] calldata _sigs,
        address[] calldata _signers,
        uint256[] calldata _powers
    ) external payable {
        emit executeMessageEvent(_message, _route, _sigs, _signers, _powers);
    }

    function executeMessageWithTransfer(
        bytes calldata _message,
        MsgDataTypes.TransferInfo calldata _transfer,
        bytes[] calldata _sigs,
        address[] calldata _signers,
        uint256[] calldata _powers
    ) external payable {
        emit executeMessageWithTransferEvent(_message, _transfer, _sigs, _signers, _powers);
    }

    function executeMessageWithTransferRefund(
        bytes calldata _message, // the same message associated with the original transfer
        MsgDataTypes.TransferInfo calldata _transfer,
        bytes[] calldata _sigs,
        address[] calldata _signers,
        uint256[] calldata _powers
    ) external payable {}

    function withdrawFee(
        address _account,
        uint256 _cumulativeFee,
        bytes[] calldata _sigs,
        address[] calldata _signers,
        uint256[] calldata _powers
    ) external {}

    function calcFee(bytes calldata _message) public pure returns (uint256) {
        return 1 + _message.length * 1;
    }

    function liquidityBridge() external pure returns (address) {
        return 0x0000000000000000000000000000000000000001;
    }

    function pegBridge() external pure returns (address) {
        return 0x0000000000000000000000000000000000000001;
    }

    function pegBridgeV2() external pure returns (address) {
        return 0x0000000000000000000000000000000000000001;
    }

    function pegVault() external pure returns (address) {
        return 0x0000000000000000000000000000000000000001;
    }

    function pegVaultV2() external pure returns (address) {
        return 0x0000000000000000000000000000000000000001;
    }

    ///
    /// Helper functions to execute message bus calls
    ///

    function relayerCall_executeMessage(
        address _relayer,
        address _srcContract,
        uint64 _srcChainId,
        bytes calldata _message
    ) external payable returns (IMessageReceiverApp.ExecutionStatus) {
        return IMessageReceiverApp(_relayer).executeMessage{ value: msg.value }(_srcContract, _srcChainId, _message, msg.sender);
    }

    function relayerCall_executeMessageRaw(
        address _relayer,
        bytes calldata _message
    ) external payable returns (IMessageReceiverApp.ExecutionStatus) {
        (bool _success, bytes memory _data) = address(_relayer).call(_message);
        _data;
        return _success ? IMessageReceiverApp.ExecutionStatus.Success : IMessageReceiverApp.ExecutionStatus.Fail;
    }

    receive() external payable {}
}
