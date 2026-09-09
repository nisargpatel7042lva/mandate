// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Context } from "@1inch/swap-vm/src/libs/VM.sol";
import { MemoryPtr, MemoryPtrLib } from "@1inch/swap-vm/src/libs/MemoryPtr.sol";
import { InstructionBuilder } from "@1inch/swap-vm/src/libs/InstructionBuilder.sol";
import { InstructionArgs } from "@1inch/swap-vm/src/libs/InstructionArgs.sol";

import { PermissionMirror } from "../PermissionMirror.sol";

/**
 * @title MandateGate
 * @notice A SwapVM opcode that enforces the agent's on-chain-mirrored permission
 *         scope mid-execution, inside the swap itself rather than before it.
 *
 * This is deliberately built as a standalone instruction library in the exact
 * shape SwapVM's own opcodes take (see TokenValidators.sol's
 * OnlyTakerTokenBalanceNonZero for the closest real precedent: a gate that
 * reads external state and reverts, appended to a strategy's bytecode ahead
 * of the instructions it guards) rather than editing any vendored file.
 *
 * Opcode slot: 0x27 -- an unallocated `_27` slot in the "Conditions & access
 * guards" bank (0x20-0x3f) of swap-vm's own `Opcode` enum, in its OpcodeList.sol.
 * Nothing in the vendored swap-vm/aqua packages is modified; this opcode is appended by
 * MandateSwapVMRouter overriding the (already `virtual`) `_runOpcode`
 * dispatcher and falling through to `super._runOpcode` for every existing
 * opcode -- see MandateSwapVMRouter.sol.
 *
 * Encoding: [address permissionMirror, address agent, uint8 protocolId]
 * `agent` is explicit (not implied by ctx.query.taker) because the account
 * that signs/settles the swap on Aqua is not necessarily the same address
 * whose ENS-mirrored permission scope is being checked -- the agent's
 * identity is a program argument here, exactly like OnlyTakerTokenBalanceNonZero
 * takes `token` as an argument rather than assuming a fixed one.
 */
library MandateGate {
    using InstructionArgs for bytes;
    using InstructionBuilder for MemoryPtr;

    error AgentPermissionExpiredOrUnset(address agent);
    error ProtocolNotInAllowedScope(address agent, uint8 protocolId, uint256 allowedProtocols);

    uint8 constant OPCODE = 0x27;

    function sizeOf(address, address, uint8) internal pure returns (uint256) {
        return InstructionBuilder.sizeOf() + 20 + 20 + 1;
    }

    function build(address permissionMirror, address agent, uint8 protocolId) internal pure returns (bytes memory) {
        return build(MemoryPtrLib.alloc(sizeOf(permissionMirror, agent, protocolId)), permissionMirror, agent, protocolId).resolve();
    }

    function build(MemoryPtr ptrStart, address permissionMirror, address agent, uint8 protocolId) internal pure returns (MemoryPtr ptr) {
        // Same header shape as InstructionBuilder.pushHeader, without requiring an
        // `Opcode` enum member for a slot the vendored enum leaves unallocated.
        ptr = ptrStart.push(OPCODE).skip(1);
        ptr = ptr.push(permissionMirror).push(agent).push(protocolId);
        ptrStart.patchLength(ptr);
    }

    function parse(bytes calldata args) internal pure returns (address permissionMirror, address agent, uint8 protocolId) {
        permissionMirror = args.at(0).asAddress();
        agent = args.at(20).asAddress();
        protocolId = args.at(40).asU8();
    }

    function exec(Context memory, bytes calldata args) internal view {
        (address permissionMirrorAddr, address agent, uint8 protocolId) = parse(args);
        PermissionMirror mirror = PermissionMirror(permissionMirrorAddr);

        PermissionMirror.PermissionScope memory scope = mirror.getPermissions(agent);
        require(scope.expiry != 0 && scope.expiry >= block.timestamp, AgentPermissionExpiredOrUnset(agent));

        bool protocolAllowed = (scope.allowedProtocols >> protocolId) & 1 == 1;
        require(protocolAllowed, ProtocolNotInAllowedScope(agent, protocolId, scope.allowedProtocols));
    }
}
