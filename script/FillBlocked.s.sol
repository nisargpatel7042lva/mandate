// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Script, console2 } from "forge-std/Script.sol";

import { ISwapVM } from "@1inch/swap-vm/src/interfaces/ISwapVM.sol";
import { XYCSwap } from "@1inch/swap-vm/src/instructions/XYCSwap.sol";
import { Salt } from "@1inch/swap-vm/src/instructions/Controls.sol";
import { MakerTraitsLib } from "@1inch/swap-vm/src/libs/MakerTraits.sol";
import { TakerTraitsLib } from "@1inch/swap-vm/src/libs/TakerTraits.sol";
import { MockTaker } from "@1inch/swap-vm/test/mocks/MockTaker.sol";

import { MandateGate } from "../contracts/opcodes/MandateGate.sol";

/**
 * @notice Fills the GMX-gated strategy shipped by DeployMandateGate.s.sol. GMX
 * perps is outside the agent's live PermissionMirror scope (allowedProtocols = 7,
 * bit 4 unset), so this is expected to revert -- and it needs to revert as a real,
 * mined, failed transaction, not just fail forge's pre-broadcast simulation and
 * get silently dropped. The swap call is wrapped in a low-level `.call` so the
 * script itself doesn't see the revert as an exception: it broadcasts the
 * transaction regardless, and the chain records the failure.
 */
contract FillBlocked is Script {
    address constant PERMISSION_MIRROR = 0x6F19DD6F759faC8a19579ECDefb342009a21D9A7;
    address constant AGENT = 0xa0062C5066cF0B34010D7c4E90F68E4287D083a8;
    address constant MAKER = 0x7b77781AE1572c517E2f1Cf461E1Af697A8A5657;

    address constant TOKEN_A = 0x316Ee819F1ff7605eaA3D0f67aEA8c8864Dd62fa;
    address constant TOKEN_B = 0x5Ed61c3139F8A5F457EAd93C5492423078730E16;
    address constant TAKER_CONTRACT = 0x25A8fE7F407E38b2DB50c49ad9B81bB474228e05;

    uint8 constant PROTOCOL_GMX = 4;

    function run() external {
        uint256 agentPk = vm.envUint("PRIVATE_KEY");

        bytes memory program = bytes.concat(
            MandateGate.build(PERMISSION_MIRROR, AGENT, PROTOCOL_GMX),
            XYCSwap.build(),
            Salt.build(abi.encodePacked(uint256(2)))
        );

        ISwapVM.Order memory order = MakerTraitsLib.build(MakerTraitsLib.Args({
            maker: MAKER, tokenA: TOKEN_A, tokenB: TOKEN_B,
            shouldUnwrapWeth: false, useAquaInsteadOfSignature: true, allowZeroAmountIn: false,
            receiver: address(0),
            hasPreTransferInHook: false, hasPostTransferInHook: false,
            hasPreTransferOutHook: false, hasPostTransferOutHook: false,
            preTransferInTarget: address(0), preTransferInData: "",
            postTransferInTarget: address(0), postTransferInData: "",
            preTransferOutTarget: address(0), preTransferOutData: "",
            postTransferOutTarget: address(0), postTransferOutData: "",
            program: program
        }));

        bytes memory takerData = TakerTraitsLib.build(TakerTraitsLib.Args({
            taker: TAKER_CONTRACT, isExactIn: true, shouldUnwrapWeth: false,
            hasPreTransferInCallback: true, hasPreTransferOutCallback: false,
            isStrictThresholdAmount: false, isFirstTransferFromTaker: false,
            useTransferFromAndAquaPush: false, isAToB: true, allowPartialFill: false,
            threshold: "", to: address(0), deadline: 0,
            preTransferInHookData: "", postTransferInHookData: "",
            preTransferOutHookData: "", postTransferOutHookData: "",
            preTransferInCallbackData: "", preTransferOutCallbackData: "",
            instructionsArgs: "", signature: ""
        }));

        bytes memory callData = abi.encodeCall(MockTaker.swap, (order, 10e18, takerData));

        vm.startBroadcast(agentPk);
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = TAKER_CONTRACT.call(callData);
        vm.stopBroadcast();

        if (success) {
            console2.log("UNEXPECTED: fill succeeded -- MandateGate should have blocked this");
        } else {
            console2.log("MandateGate BLOCKED this fill, as expected (GMX perps outside scope)");
            console2.logBytes(returndata);
        }
    }
}
