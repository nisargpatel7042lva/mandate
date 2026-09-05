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

- `[RESOLVED]` USDC on Sepolia — there are TWO distinct USDC contracts and they are
  not interchangeable. ENS name registration requires the ENS-deployed token at
  `0x7Fc21ceb0C5003576ab5E101eB240c2b822c95d2`; Circle's canonical Sepolia USDC is
  `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (what faucet.circle.com dispenses) and
  is the one Arc settlement will use in Phase 5. Both are named "USDC" with 6 decimals,
  so a wrong-token balance looks correct in a wallet while `register-ens.ts` still fails.

- `[RESOLVED]` How to obtain ENS testnet USDC — there is no faucet. The token at
  `0x7Fc21ceb…95d2` exposes a public, unrestricted `mint(address,uint256)`; total supply
  is ~5.6e51, consistent with open minting. Verified by minting 10,000 USDC to the project
  signer via Etherscan's write interface (balance confirmed on-chain by `npm run whoami`).
  **Blocking: Phase 1 (ENS registration) — RESOLVED.**

## ERC-8004 Identity Registry

- `[VERIFIED]` Registry at `0x8004A818BFB912233c491871b3d84c89A494BD9e` on Sepolia is an
  EIP-1967 proxy (131-byte runtime) delegating to implementation
  `0x7274e874ca62410a93bd8bf61c69d8045e399c02` (14,475 bytes). Live reads against it
  return real data: agentId 0 has `tokenURI` `ipfs://QmPxKi3ZZW…epKo` and owner
  `0xA7132182Cbc0ceA8bE148FDE88faaD3BB9410d48`.

- `[VERIFIED]` Function selectors present in the deployed implementation:
  `register(string)` = `0xf2c298be`, `register()`, `setAgentURI(uint256,string)`,
  `setMetadata(uint256,string,bytes)`, `tokenURI(uint256)`, `ownerOf(uint256)`.
  `getAgentWallet(uint256)` returns a zero address for unregistered wallets rather than
  reverting, confirming it exists. **The agent URI is therefore updatable after minting**,
  so a wrong URI is recoverable and does not require burning an agentId.

- `[VERIFIED]` Agent registration file schema, from the EIP-8004 specification:
  required `type`, `name`, `description`, `image`, `services`; optional `x402Support`,
  `active`, `registrations`, `supportedTrust`. `type` must be
  `https://eips.ethereum.org/EIPS/eip-8004#registration-v1`. Our file lives at
  `public/agent-registration.json` and is served from the repo's raw URL.
  `registrations[]` is intentionally omitted on first publish because it carries the
  `agentId`, which does not exist until registration completes.

- `[RESOLVED]` The original `AGENT_URI` in `register-identity.ts` pointed at
  `gist.githubusercontent.com/mandate-agent/…`, which returns HTTP 404 — an invented
  placeholder. Replaced with the repo-hosted registration file before any registration
  transaction was sent.

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
