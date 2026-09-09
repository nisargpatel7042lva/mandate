// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { AquaSwapVMTest } from "@1inch/swap-vm/test/base/AquaSwapVMTest.sol";
import { SwapVM } from "@1inch/swap-vm/src/SwapVM.sol";
import { ISwapVM } from "@1inch/swap-vm/src/interfaces/ISwapVM.sol";
import { XYCSwap } from "@1inch/swap-vm/src/instructions/XYCSwap.sol";
import { Salt } from "@1inch/swap-vm/src/instructions/Controls.sol";

import { MandateSwapVMRouter } from "../contracts/MandateSwapVMRouter.sol";
import { MandateGate } from "../contracts/opcodes/MandateGate.sol";
import { PermissionMirror } from "../contracts/PermissionMirror.sol";

/**
 * @notice Proves MandateGate actually gates a real Aqua-backed SwapVM fill, running
 * the genuine 1inch swap-vm + aqua run loop (their own AquaSwapVMTest harness), not
 * a hand-rolled stand-in for it. Two cases, matching Phase 7's definition of done:
 * an authorized agent on an allowed protocol fills successfully, and a swap for a
 * protocol outside the agent's mirrored scope reverts inside the swap itself.
 */
contract MandateGateAquaTest is AquaSwapVMTest {
    PermissionMirror mirror;
    address agent = address(0xA6E47);

    uint8 constant PROTOCOL_UNISWAP = 0;
    uint8 constant PROTOCOL_CURVE = 1;

    function setUp() public override {
        super.setUp();
        mirror = new PermissionMirror(address(this));
    }

    function _deployRouter() internal override returns (SwapVM) {
        return new MandateSwapVMRouter(address(aqua), address(0), address(this), "Mandate", "1.0.0");
    }

    function _authorize(uint256 allowedProtocols, uint64 expiry) internal {
        mirror.sync(agent, PermissionMirror.PermissionScope({
            allowedProtocols: allowedProtocols,
            allowedPositionTypes: 1,
            maxPositionSizeUsdc: 10_000e6,
            maxDailySpendUsdc: 50_000e6,
            expiry: expiry,
            ensNode: bytes32(0),
            syncedAtBlock: 0
        }));
    }

    function _gatedProgram(uint8 protocolId) internal view returns (bytes memory) {
        return bytes.concat(
            MandateGate.build(address(mirror), agent, protocolId),
            XYCSwap.build(),
            Salt.build(abi.encodePacked(vm.randomUint()))
        );
    }

    function _fillOrder(uint8 protocolId) internal returns (ISwapVM.Order memory order, SwapProgram memory swapProgram) {
        order = createStrategy(_gatedProgram(protocolId));
        shipStrategy(order, tokenA, tokenB, 1_000e18, 1_000e18);

        swapProgram = SwapProgram({ amount: 10e18, taker: taker, tokenA: tokenA, tokenB: tokenB, zeroForOne: true, isExactIn: true });
        mintTokenInToTaker(swapProgram);
        mintTokenOutToMaker(swapProgram, 20e18);
    }

    function test_MandateGate_AllowsAuthorizedAgentOnAllowedProtocol() public {
        _authorize(1 << PROTOCOL_UNISWAP, uint64(block.timestamp + 1 days));

        (ISwapVM.Order memory order, SwapProgram memory swapProgram) = _fillOrder(PROTOCOL_UNISWAP);
        (uint256 amountIn, uint256 amountOut) = swap(swapProgram, order);

        assertEq(amountIn, 10e18, "approved fill should execute at the requested amount");
        assertGt(amountOut, 0, "approved fill should return tokenB to the taker");
    }

    function test_MandateGate_RevertsOnProtocolOutsideScope() public {
        // authorized in general, but the scope only covers Curve -- this fill targets Uniswap
        _authorize(1 << PROTOCOL_CURVE, uint64(block.timestamp + 1 days));

        (ISwapVM.Order memory order, SwapProgram memory swapProgram) = _fillOrder(PROTOCOL_UNISWAP);

        vm.expectRevert(abi.encodeWithSelector(
            MandateGate.ProtocolNotInAllowedScope.selector, agent, PROTOCOL_UNISWAP, uint256(1 << PROTOCOL_CURVE)
        ));
        swap(swapProgram, order);
    }

    function test_MandateGate_RevertsWhenPermissionExpired() public {
        _authorize(1 << PROTOCOL_UNISWAP, uint64(block.timestamp - 1)); // already expired

        (ISwapVM.Order memory order, SwapProgram memory swapProgram) = _fillOrder(PROTOCOL_UNISWAP);

        vm.expectRevert(abi.encodeWithSelector(MandateGate.AgentPermissionExpiredOrUnset.selector, agent));
        swap(swapProgram, order);
    }

    function test_MandateGate_RevertsWhenNeverSynced() public {
        // no _authorize() call at all -- mirrors a killed / never-registered agent
        (ISwapVM.Order memory order, SwapProgram memory swapProgram) = _fillOrder(PROTOCOL_UNISWAP);

        vm.expectRevert(abi.encodeWithSelector(MandateGate.AgentPermissionExpiredOrUnset.selector, agent));
        swap(swapProgram, order);
    }
}
