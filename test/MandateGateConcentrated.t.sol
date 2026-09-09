// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { AquaSwapVMTest } from "@1inch/swap-vm/test/base/AquaSwapVMTest.sol";
import { SwapVM } from "@1inch/swap-vm/src/SwapVM.sol";
import { ISwapVM } from "@1inch/swap-vm/src/interfaces/ISwapVM.sol";
import { XYCConcentrateSwap } from "@1inch/swap-vm/src/instructions/XYCConcentrate.sol";
import { Salt } from "@1inch/swap-vm/src/instructions/Controls.sol";

import { MandateSwapVMRouter } from "../contracts/MandateSwapVMRouter.sol";
import { MandateGate } from "../contracts/opcodes/MandateGate.sol";
import { PermissionMirror } from "../contracts/PermissionMirror.sol";

/**
 * @notice MandateGate gating a genuinely more sophisticated position than a plain
 * XYC swap: a concentrated-liquidity range (Uniswap-v3-style), using swap-vm's own
 * XYCConcentrateSwap instruction. Same opcode, same router, different downstream
 * instruction -- proving MandateGate composes with any instruction in the vendor's
 * set, not just the simplest one.
 */
contract MandateGateConcentratedTest is AquaSwapVMTest {
    using Math for uint256;

    PermissionMirror mirror;
    address agent = address(0xA6E47);

    uint8 constant PROTOCOL_UNISWAP = 0;

    // A real, non-degenerate range: 0.25x - 4x around price 1 (our tokens mint 1:1),
    // same fixed-point convention swap-vm's own test builders use (sqrt(price * 1e18)).
    uint256 constant PRICE_MIN = 0.25e18;
    uint256 constant PRICE_MAX = 4e18;

    function setUp() public override {
        super.setUp();
        mirror = new PermissionMirror(address(this));
        mirror.sync(agent, PermissionMirror.PermissionScope({
            allowedProtocols: 1 << PROTOCOL_UNISWAP,
            allowedPositionTypes: 1,
            maxPositionSizeUsdc: 10_000e6,
            maxDailySpendUsdc: 50_000e6,
            expiry: uint64(block.timestamp + 1 days),
            ensNode: bytes32(0),
            syncedAtBlock: 0
        }));
    }

    function _deployRouter() internal override returns (SwapVM) {
        return new MandateSwapVMRouter(address(aqua), address(0), address(this), "Mandate", "1.0.0");
    }

    function test_MandateGate_GatesConcentratedLiquidityPosition() public {
        uint256 sqrtPriceMin = (PRICE_MIN * 1e18).sqrt();
        uint256 sqrtPriceMax = (PRICE_MAX * 1e18).sqrt();

        bytes memory program = bytes.concat(
            MandateGate.build(address(mirror), agent, PROTOCOL_UNISWAP),
            XYCConcentrateSwap.build(sqrtPriceMin, sqrtPriceMax),
            Salt.build(abi.encodePacked(vm.randomUint()))
        );

        ISwapVM.Order memory order = createStrategy(program);
        shipStrategy(order, tokenA, tokenB, 1_000e18, 1_000e18);

        SwapProgram memory swapProgram = SwapProgram({
            amount: 10e18, taker: taker, tokenA: tokenA, tokenB: tokenB, zeroForOne: true, isExactIn: true
        });
        mintTokenInToTaker(swapProgram);
        mintTokenOutToMaker(swapProgram, 20e18);

        (uint256 amountIn, uint256 amountOut) = swap(swapProgram, order);

        assertEq(amountIn, 10e18, "gated concentrated-liquidity fill should execute at the requested amount");
        assertGt(amountOut, 0, "should return tokenB to the taker");
        // Concentrated liquidity within a tight-ish range should price close to 1:1
        // near the pool's current balance -- not exact due to fees/rounding, but a
        // sanity bound that this is a real curve, not a broken one returning ~0 or
        // the whole pool.
        assertGt(amountOut, 9e18, "price should stay close to 1:1 near the current balance");
        assertLt(amountOut, 10e18, "AMM output is always < input at 1:1 spot due to slippage");
    }

    function test_MandateGate_RevertsConcentratedFillOutsideScope() public {
        // Re-sync with a different protocol allowed -- Uniswap is no longer in scope.
        mirror.sync(agent, PermissionMirror.PermissionScope({
            allowedProtocols: 1 << 1, // curve only
            allowedPositionTypes: 1,
            maxPositionSizeUsdc: 10_000e6,
            maxDailySpendUsdc: 50_000e6,
            expiry: uint64(block.timestamp + 1 days),
            ensNode: bytes32(0),
            syncedAtBlock: 0
        }));

        uint256 sqrtPriceMin = (PRICE_MIN * 1e18).sqrt();
        uint256 sqrtPriceMax = (PRICE_MAX * 1e18).sqrt();

        bytes memory program = bytes.concat(
            MandateGate.build(address(mirror), agent, PROTOCOL_UNISWAP),
            XYCConcentrateSwap.build(sqrtPriceMin, sqrtPriceMax),
            Salt.build(abi.encodePacked(vm.randomUint()))
        );

        ISwapVM.Order memory order = createStrategy(program);
        shipStrategy(order, tokenA, tokenB, 1_000e18, 1_000e18);

        SwapProgram memory swapProgram = SwapProgram({
            amount: 10e18, taker: taker, tokenA: tokenA, tokenB: tokenB, zeroForOne: true, isExactIn: true
        });
        mintTokenInToTaker(swapProgram);
        mintTokenOutToMaker(swapProgram, 20e18);

        vm.expectRevert(abi.encodeWithSelector(
            MandateGate.ProtocolNotInAllowedScope.selector, agent, PROTOCOL_UNISWAP, uint256(1 << 1)
        ));
        swap(swapProgram, order);
    }
}
