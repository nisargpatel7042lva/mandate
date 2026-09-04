# Assumptions & Unverified Dependencies

Items listed here are not yet confirmed against live source. Each must be resolved before
the phase that depends on it ships. Format: `[STATUS] Item — what needs verifying — blocking phase`.

---

## Chain / Deployment

- `[UNVERIFIED]` ENSv2 Enhanced Access Control is live and functional on Sepolia —
  docs say schema is "not yet final"; need to deploy a test record and read it back.
  **Blocking: Phase 1 (identity contract).**

- `[UNVERIFIED]` Aqua contract is not yet deployed on Sepolia by 1inch —
  we plan to self-deploy per `1inch/aqua` DEPLOY.md. Need to confirm `chain-11155111.json`
  parameter file exists in the repo and that the Aqua address can be set to our own deployment.
  **Blocking: Phase 2 (SwapVM router deployment).**

- `[RESOLVED]` Cross-chain PermissionMirror not needed for Phase 1 prototype —
  both ENSv2 and our planned SwapVM router are on Sepolia. PermissionMirror.sol is kept
  as a skeleton for the architecture demo but MandateGate will read directly from ENSv2
  resolver on the same chain. ARCHITECTURE.md TBD update in Phase 2.

## SwapVM Opcodes

- `[UNVERIFIED]` Custom opcode registration pattern —
  README shows `_instructions()` returning a function array, but `src/opcodes/Opcodes.sol`
  uses an if-else `_runOpcode` dispatcher. Need to read `src/SwapVM.sol` to confirm which
  virtual function MandateGate must override.
  **Blocking: Phase 2 (MandateGate implementation).**

## The Graph

- `[UNVERIFIED]` Agent0/ERC-8004 subgraph deployment on Sepolia or any testnet —
  confirmed Base Mainnet ID `43s9hQRurMGjuYnC1r2ZwS6xSQktbFyXMPMqGKUFJojb`, but no
  testnet subgraph ID found. May need to use mainnet subgraph for agent history queries.
  **Blocking: Phase 2 (Graph composition).**

## Circle / Arc

- `[UNVERIFIED]` Arc Agent Stack testnet endpoint URL and SDK method signatures —
  not yet read from Circle developer docs. Need to confirm before Phase 2 settlement work.
  **Blocking: Phase 2 (Arc settlement).**

- `[UNVERIFIED]` USDC testnet contract address on Sepolia for Arc settlement —
  need to confirm from Circle docs whether they operate their own testnet USDC or use
  the canonical one.
  **Blocking: Phase 2 (settlement contract).**

## ENSv2 EAC Record Schema

- `[RESOLVED]` ENSv2 EAC is NOT used for permission encoding — we use standard ENS
  `setText(node, key, value)` on the dedicated resolver. Keys are `mandate.permissions`
  (JSON permission scope) and `mandate.policy` (human-readable summary). This avoids the
  EAC bitmask schema uncertainty entirely and is readable by any ENS tooling.

- `[VERIFIED]` ENSjs v5 contract addresses on Sepolia — verified from installed package
  `dist/clients/l2.d.ts`: ethRegistrar=`0x3334...`, ensDedicatedResolver=`0xa20b...`,
  ensV2EthRegistry=`0xF332...`, usdc=`0x7Fc2...`. Note: these differ from the L1-view
  addresses in `dist/clients/chain.d.ts`. Using the L2 addresses throughout.
  **Blocking: Phase 1 (registration script) — RESOLVED.**
