// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Context } from "@1inch/swap-vm/src/libs/VM.sol";
import { AquaSwapVMRouter } from "@1inch/swap-vm/src/routers/AquaSwapVMRouter.sol";

import { MandateGate } from "./opcodes/MandateGate.sol";

/**
 * @title MandateSwapVMRouter
 * @notice The official AquaSwapVMRouter with one opcode appended: MandateGate.
 *
 * `_runOpcode` in the vendored AquaOpcodes contract is declared `internal virtual`
 * specifically so it can be extended this way -- this override handles the one
 * new opcode and falls through to `super._runOpcode` (the real, unmodified
 * AquaOpcodes dispatcher) for every opcode that already existed. Nothing in
 * the vendored swap-vm or aqua packages is edited; both are pulled in as real
 * npm dependencies (see package.json / foundry.toml remappings).
 */
contract MandateSwapVMRouter is AquaSwapVMRouter {
    constructor(address aqua, address weth, address owner, string memory name, string memory version)
        AquaSwapVMRouter(aqua, weth, owner, name, version)
    { }

    function _runOpcode(Context memory ctx, uint256 opcode, bytes calldata args) internal override {
        if (opcode == MandateGate.OPCODE) {
            MandateGate.exec(ctx, args);
        } else {
            super._runOpcode(ctx, opcode, args);
        }
    }
}
