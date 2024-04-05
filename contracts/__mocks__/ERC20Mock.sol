// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.9;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Pausable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract ERC20Mock is ERC20Pausable {
    bool returnFalseOnTransfer;

    function setReturnFalseOnTransfer(bool _returnFalseOnTransfer) external {
        returnFalseOnTransfer = _returnFalseOnTransfer;
    }

    constructor() ERC20("ERC20Mock", "ERC20Mock") {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function disable() public {
        _pause();
    }

    function enable() public {
        _unpause();
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        if (returnFalseOnTransfer) return false;
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        if (returnFalseOnTransfer) return false;
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }
}
