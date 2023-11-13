// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.17;

import { ICelerFeeHubFacet } from "../diamond/interfaces/ICelerFeeHubFacet.sol";

contract CelerFeeHubFacetMock is ICelerFeeHubFacet {
    event deployFeesWithCelerConfirmEvent(uint64 _chainId, bytes _message);

    function deployFeesWithCelerConfirm(uint64 _chainId, bytes memory _message) external {
        emit deployFeesWithCelerConfirmEvent(_chainId, _message);
    }
}
