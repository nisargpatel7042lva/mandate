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

- `[UNVERIFIED]` Cross-chain PermissionMirror may be unnecessary —
  if we self-deploy both Aqua and our SwapVM router on Sepolia, ENSv2 and MandateGate are
  on the same chain. Must confirm in Phase 1 and update ARCHITECTURE.md.
  **Blocking: Phase 1 (architecture doc).**

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

- `[UNVERIFIED]` Exact field names / storage keys for agent permission scope in ENSv2 EAC —
  docs describe `_roles[resource][account]` bitmaps but do not specify the convention for
  encoding "max position size", "allowed protocols", etc. into those fields.
  **Blocking: Phase 1 (identity contract + permission record format).**
