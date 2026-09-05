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

## PermissionMirror (Sepolia)

- `[RESOLVED]` Deployed at `0x6f19dd6f759fac8a19579ecdefb342009a21d9a7`, block
  11642041 (tx `0x37fb017a…`), relayer set to the project signer. Compiled with
  Foundry 1.5.0 / solc 0.8.30; `foundry.toml` points `src` at `contracts/`.

- `[RESOLVED]` Deploying this in Phase 1 rather than alongside MandateGate removes
  a dependency inversion: the Mandate subgraph indexes this contract's
  `PermissionSynced` events, so the Graph track would otherwise have depended on
  the SwapVM phase, which is explicitly timeboxed and may be dropped.

- `[VERIFIED]` Full ENS -> mirror pipeline runs live. `npm run relayer` reads
  `mandate.permissions` from the ENSv2 resolver, decodes it to bitmasks, and calls
  `sync()`. Confirmed on-chain: `isAuthorized(agent)` = true, `allowedProtocols` =
  7 (uniswap-v3 | curve | aave-v3), `allowedPositionTypes` = 3 (spot | lp),
  maxPosition 10,000 USDC, maxDaily 50,000 USDC, `syncedAtBlock` 11642045.
  Sync tx `0x7868486e…`.

- `[VERIFIED]` The subgraph's `PermissionSynced` ABI matches the deployed
  contract's event signature exactly.

- `[VERIFIED]` Deployed to Subgraph Studio and indexing live Sepolia events.
  Endpoint: `https://api.studio.thegraph.com/query/1758732/mandate-subgraph/v0.0.2`
  (deployment `Qmc3ZukZS5ZJHZuBC3qbmoYKtVGrPA71g7jg53HxbKCVZG`), `hasIndexingErrors`
  false. Querying `agentScopes` returns the real synced scope: allowedProtocols 7,
  allowedPositionTypes 3, maxPositionSizeUsdc 10000000000, maxDailySpendUsdc
  50000000000, ensNode `0xa6233e5b…`, lastSyncedBlock 11642045, syncCount 1.

- `[RESOLVED]` v0.0.1 indexed the event but wrote zeros for every scope field.
  `PermissionSynced` carries only agent, ensNode and syncedAtBlock — the scope is
  not in the event — and the handler never read contract state. Fixed in v0.0.2 by
  binding the contract and calling `getPermissions` in the handler.

- `[RESOLVED]` A Studio development deployment is queried at its own studio URL
  with no API key. The `gateway.thegraph.com/api/<key>/subgraphs/id/<id>` form only
  resolves for subgraphs published to the decentralized network, which this is not.
  `NEXT_PUBLIC_MANDATE_SUBGRAPH_URL` carries the studio URL.

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

## ENSv2 Sepolia — resolved by live registration (2026-09-05)

- `[RESOLVED]` Two incompatible address sets ship in ensjs. `dist/clients/l2.d.ts`
  keys **Namechain** contracts under chain id 11155111; those addresses exist on
  Sepolia and answer `isAvailable()`, but `getRegisterPrice()` reverts for every
  payment token and `register()` reverts with `PaymentTokenNotSupported`. The
  working Ethereum Sepolia set comes from `extendChainWithEns(sepolia)`:
  registrar `0x8c2e866b…`, payment token `0x3dfc8b53…`. Price for a 7-character
  name for one year: 7.994534 USDC.

- `[RESOLVED]` ENSv2 subnames are fully supported. A parent name has its own
  registry contract, so it can hold no children until a subregistry is deployed
  and attached — `register()` arg 3 is `subregistry`, and passing `address(0)`
  leaves the name childless. Flow: `VerifiableFactory.deployProxy(userRegistryImpl)`
  → `setSubregistry(parentTokenId, subregistry)` → `register(...)` on the
  subregistry. ENSv2 token id = labelhash with the low 32 bits cleared.

- `[RESOLVED]` The v1 `createSubname` from `@ensdomains/ensjs/wallet` targets the
  legacy registry and NameWrapper and cannot drive a v2 name. ensjs has v2
  equivalents under `actions/wallet/v2/`, but `deploySubregistry` and the v2
  `createSubname` are not re-exported from any public entrypoint and the package
  `exports` map blocks deep imports. We call the contracts directly with ABIs
  from `@ensdomains/ensjs-abi`.

- `[RESOLVED]` ENSv2 resolvers are per-name. `0xa20b41dc…` is the DedicatedResolver
  *implementation*, not a usable resolver — it is deployed as a proxy per name.
  Its writer is **`setText(string key, string value)` with no node argument**;
  the v1-style `setText(bytes32,string,string)` does not exist on it. Reads use
  the ENS-compatible `text(bytes32,string)`, which ignores the node.

- `[VERIFIED]` Live deployment for `testagent.mandate.eth`:
  subregistry `0x907779eaec2f678bf91c2580b2fd8b395cf42775`,
  resolver `0x47199acbb8cf8766c67a4853574e945c8e795005`.
  `mandate.permissions` and `mandate.policy` both read back from chain.

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
