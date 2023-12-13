// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { RelayerCeler, MsgDataTypes } from "./../diamond/relayers/RelayerCeler.sol";

contract RelayerCelerTargetMock is RelayerCeler {
    event sendMessageWithTransferEvent(
        address _receiver,
        address _token,
        uint256 _amount,
        uint64 _dstChainId,
        uint64 _nonce,
        uint32 _maxSlippage,
        bytes _message,
        MsgDataTypes.BridgeSendType _bridgeSendType,
        address _messageBus,
        uint256 _fee
    );

    constructor(
        address _diamond,
        address _relayerHome,
        address _operator,
        address _messageBus,
        uint256 _chainHome,
        bool _isHomeRelayer
    ) RelayerCeler(_diamond, _relayerHome, _operator, _messageBus, _chainHome, _isHomeRelayer) {}

    function _sendMessageWithTransfer(
        address _receiver,
        address _token,
        uint256 _amount,
        uint64 _dstChainId,
        uint64 _nonce,
        uint32 _maxSlippage,
        bytes memory _message,
        MsgDataTypes.BridgeSendType _bridgeSendType,
        uint256 _fee
    ) internal override returns (bytes32) {
        emit sendMessageWithTransferEvent(
            _receiver,
            _token,
            _amount,
            _dstChainId,
            _nonce,
            _maxSlippage,
            _message,
            _bridgeSendType,
            messageBus,
            _fee
        );
        return keccak256("TRANSFER_ID");
    }
}
