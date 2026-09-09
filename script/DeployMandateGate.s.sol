// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Script, console2 } from "forge-std/Script.sol";

import { AquaRouter } from "@1inch/aqua/src/AquaRouter.sol";

import { ISwapVM } from "@1inch/swap-vm/src/interfaces/ISwapVM.sol";
import { XYCSwap } from "@1inch/swap-vm/src/instructions/XYCSwap.sol";
import { Salt } from "@1inch/swap-vm/src/instructions/Controls.sol";
import { MakerTraitsLib } from "@1inch/swap-vm/src/libs/MakerTraits.sol";
import { MockTaker } from "@1inch/swap-vm/test/mocks/MockTaker.sol";

import { TokenMock } from "@1inch/solidity-utils/contracts/mocks/TokenMock.sol";

import { MandateSwapVMRouter } from "../contracts/MandateSwapVMRouter.sol";
import { MandateGate } from "../contracts/opcodes/MandateGate.sol";

/**
 * @notice Phase 7 live deploy: real AquaRouter + MandateSwapVMRouter on Sepolia,
 * two demo tokens, and two shipped strategies -- one gated on Uniswap (a protocol
 * already in the live agent's synced scope), one gated on GMX perps (already
 * outside it, same "gmx-blocked-protocol" case the landing page's off-chain demo
 * uses). Both strategies point at the real, already-deployed PermissionMirror
 * (0x6f19dd6f759fac8a19579ecdefb342009a21d9a7) -- MandateGate here reads the exact
 * same permission state Phase 1/5 already put on-chain, not a fresh copy of it.
 *
 * Fill scripts (FillApproved.s.sol, FillBlocked.s.sol) run after this one.
 */
contract DeployMandateGate is Script {
    address constant PERMISSION_MIRROR = 0x6F19DD6F759faC8a19579ECDefb342009a21D9A7;
    address constant AGENT = 0xa0062C5066cF0B34010D7c4E90F68E4287D083a8;
    address constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    uint8 constant PROTOCOL_UNISWAP = 0; // in the live agent's allowedProtocols mask (7)
    uint8 constant PROTOCOL_GMX = 4; // not in it -- same case as the landing page's blocked demo

    function run() external {
        uint256 agentPk = vm.envUint("PRIVATE_KEY");
        uint256 makerPk = vm.envUint("MAKER_PRIVATE_KEY");
        address maker = vm.addr(makerPk);

        vm.startBroadcast(agentPk);

        AquaRouter aqua = new AquaRouter(AGENT);
        MandateSwapVMRouter router = new MandateSwapVMRouter(address(aqua), SEPOLIA_WETH, AGENT, "Mandate", "1.0.0");

        TokenMock tokenA = new TokenMock("Mandate Demo USDC", "mUSDC");
        TokenMock tokenB = new TokenMock("Mandate Demo WETH", "mWETH");
        if (address(tokenA) > address(tokenB)) (tokenA, tokenB) = (tokenB, tokenA);

        MockTaker takerContract = new MockTaker(aqua, router, AGENT);

        tokenA.mint(maker, 1_000e18);
        tokenB.mint(maker, 1_000e18);
        tokenA.mint(address(takerContract), 100e18);

        console2.log("AquaRouter:        ", address(aqua));
        console2.log("MandateSwapVMRouter:", address(router));
        console2.log("tokenA (in):        ", address(tokenA));
        console2.log("tokenB (out):       ", address(tokenB));
        console2.log("MockTaker:          ", address(takerContract));

        vm.stopBroadcast();

        ISwapVM.Order memory approvedOrder = _buildOrder(maker, address(tokenA), address(tokenB), PROTOCOL_UNISWAP, 1);
        ISwapVM.Order memory blockedOrder = _buildOrder(maker, address(tokenA), address(tokenB), PROTOCOL_GMX, 2);

        vm.startBroadcast(makerPk);
        tokenA.approve(address(aqua), type(uint256).max);
        tokenB.approve(address(aqua), type(uint256).max);

        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400e18;
        amounts[1] = 400e18;

        bytes32 approvedHash = aqua.ship(address(router), abi.encode(approvedOrder), tokens, amounts);
        bytes32 blockedHash = aqua.ship(address(router), abi.encode(blockedOrder), tokens, amounts);
        vm.stopBroadcast();

        console2.log("Shipped approved strategy, hash:");
        console2.logBytes32(approvedHash);
        console2.log("Shipped blocked strategy, hash:");
        console2.logBytes32(blockedHash);
    }

    function _buildOrder(address maker, address tokenA, address tokenB, uint8 protocolId, uint256 salt)
        internal view returns (ISwapVM.Order memory)
    {
        bytes memory program = bytes.concat(
            MandateGate.build(PERMISSION_MIRROR, AGENT, protocolId),
            XYCSwap.build(),
            Salt.build(abi.encodePacked(salt))
        );

        return MakerTraitsLib.build(MakerTraitsLib.Args({
            maker: maker,
            tokenA: tokenA,
            tokenB: tokenB,
            shouldUnwrapWeth: false,
            useAquaInsteadOfSignature: true,
            allowZeroAmountIn: false,
            receiver: address(0),
            hasPreTransferInHook: false,
            hasPostTransferInHook: false,
            hasPreTransferOutHook: false,
            hasPostTransferOutHook: false,
            preTransferInTarget: address(0),
            preTransferInData: "",
            postTransferInTarget: address(0),
            postTransferInData: "",
            preTransferOutTarget: address(0),
            preTransferOutData: "",
            postTransferOutTarget: address(0),
            postTransferOutData: "",
            program: program
        }));
    }
}
