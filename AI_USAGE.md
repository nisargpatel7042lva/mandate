# AI Usage

Mandate was built using Claude Code (Anthropic) as a development assistant across both the
backend/chain and UI/UX tracks. This file documents where and how AI was used, updated
after every work session.

## Format

Each entry records:
- Date, track (Backend / UI / Both), phase
- What Claude Code was asked to do
- What was AI-generated vs. human-directed / reviewed / modified
- Any spec files or planning prompts used (linked; originals in `/specs`)

## Entries

### 2026-09-04 | Both | Phase 0

**Task:** Pre-event setup — research and scaffold only (no Mandate-specific code).

**Claude Code was asked to:**
- Research the actual state of `github.com/1inch/aqua` and `github.com/1inch/swap-vm` repos
  (testnet deployment status, opcode extensibility pattern)
- Read ENSv2 Enhanced Access Control docs and Agent0/ERC-8004 subgraph docs
- Research Atlas and AgentArena ETHGlobal showcase projects for UI patterns
- Scaffold a bare Next.js 16 + TypeScript + Tailwind project
- Create ARCHITECTURE.md, AI_USAGE.md, ASSUMPTIONS.md, and /specs/build-plan.md templates

**AI-generated:** Scaffold files (via `create-next-app`), template file content,
.prettierrc config, .env.example variable names.

**Human-directed / reviewed:** All research queries and verification steps; architectural
decision to self-deploy SwapVM on Sepolia (eliminating cross-chain complexity); decision
to mark unverified external dependencies explicitly in ASSUMPTIONS.md rather than guessing.

**Spec files used:** `/specs/build-plan.md` (the full ETHOnline 2026 build plan prompt)

### 2026-09-04 | Backend | Phase 1

**Task:** Identity layer — ERC-8004 agent registration, ENSv2 permission schema, PermissionMirror contract skeleton, relayer stub.

**Claude Code was asked to:**
- Write `scripts/register-identity.ts` — ERC-8004 agent registration on Sepolia (simulate → send → parse Transfer event → read-back)
- Write `scripts/register-ens.ts` — ENSv2 name registration + subname + setText for `mandate.permissions` and `mandate.policy`
- Write `scripts/read-identity.ts` — live on-chain read-back of all Phase 1 state
- Write `scripts/relayer-stub.ts` — PermissionMirror relayer that polls ENS text records and would call `sync()` in Phase 2
- Write `contracts/PermissionMirror.sol` — on-chain permission mirror contract skeleton
- Write `scripts/lib/constants.ts` — verified contract addresses for ERC-8004 and ENSv2 on Sepolia
- Write `scripts/lib/client.ts` — viem 2.56.x workaround for EIP-7702 overload resolution issue
- Fix all TypeScript type errors across the script suite; configure `tsconfig.scripts.json`

**AI-generated:** All script and contract code; `tsconfig.scripts.json`; all ABI definitions; ENSv2 contract
addresses verified from `@ensdomains/ensjs` v5 dist files; permission JSON schema design.

**Human-directed / reviewed:** Architecture decision (same-chain ENSv2 + SwapVM on Sepolia, eliminating
cross-chain PermissionMirror); permission scope field names and bitmask mapping; decision to use ENSjs
`commitName` / `registerName` action functions directly (not `.extend()` decorator) due to missing public
export of `ensWalletActions`; all verification of contract addresses against live package sources.

**Key technical issue resolved:** viem 2.56.x adds EIP-7702 overloads that cause TypeScript to resolve
`readContract`/`writeContract` to the wrong discriminant when using broad `Abi` types. Fixed by wrapping
both in `scripts/lib/client.ts` with `(client.readContract as any)(params)` pattern.

**Spec files used:** `/specs/build-plan.md`

### 2026-09-05 | UI | Phase 2

**Task:** Design system + four core screens — fully static with marked example data.

**Claude Code was asked to:**
- Create the design system: Tailwind v4 CSS tokens (dark-first, light mode class-toggled),
  semantic color variables (--bg, --surface, --surface-2/3, --text/2/3, --border, --brand),
  status/tier colors; no shadcn, pure CSS custom properties
- Build `src/components/ui/Badge.tsx` — Badge variants (success, warning, danger, brand,
  neutral, monitoring, autonomous), StatusBadge, TierBadge
- Build `src/components/ui/Card.tsx` — Card with optional accent border, CardHeader, CardTitle, CardBody
- Build `src/components/layout/Sidebar.tsx` — client nav component with ThemeToggle (toggles
  `.dark` on `document.documentElement`)
- Build `src/components/dashboard/KillSwitch.tsx` — animated 3-state demo component (idle →
  confirm dialog → revoking spinner → revoked state)
- Build `src/components/dashboard/TradeLog.tsx` — filterable table (all/approved/blocked)
- Build `src/app/page.tsx` — Screen A: agent overview (trust score, permission scope cards,
  stats, recent activity, on-chain identity)
- Build `src/app/dashboard/page.tsx` — Screen B: underwriting dashboard (sticky policy strip
  showing ✓ Allowed / ✕ Not Authorized / Scope Validity, KillSwitch, spend meter, TradeLog)
- Build `src/app/transactions/blocked/page.tsx` — Screen C: blocked transaction detail (hero
  "why it failed" moment, enforcement chain trace)
- Build `src/app/treasury/page.tsx` — Screen D: treasury view (SVG ring charts, settlement
  history table, reputation write-back placeholder)
- Build `src/lib/types.ts` — TypeScript types for Agent, PermissionScope, TradeDecision,
  BlockedTransaction, Settlement, TreasuryState
- Build `src/lib/example-data.ts` — realistic example data with EXAMPLE_DATA markers
  throughout; utility functions (shortAddr, fmtUsdc, fmtExpiry, fmtTime)
- Fix ESLint/build issues: unused imports, raw `<a>` for internal nav (replaced with Next.js
  `<Link>`), `Date.now()` in server component body (hoisted to module-level constant)

**AI-generated:** All component and page code; design token values; example data shape; all
SVG ring chart math; enforcement chain trace UI; policy strip layout.

**Human-directed / reviewed:** The four-screen structure and what each screen communicates;
the decision that "why it blocked" should be the H1 hero element, not a detail row; the
policy strip (allowed / blocked / expiry) as the first fixed element of the dashboard;
the EXAMPLE_DATA banner requirement (must be unmistakably marked, never implied as real).

**Spec files used:** `/specs/phase2-ui.md`

### 2026-09-05 | Backend | Phase 3 (skeleton — live run blocked on credentials)

**Task:** Composed Graph data layer + underwriting logic. Code skeleton built; live run
awaits `NEXT_PUBLIC_GRAPH_API_KEY`, `NEXT_PUBLIC_AGENT0_SUBGRAPH_ID`,
`NEXT_PUBLIC_MANDATE_SUBGRAPH_ID`, `PRIVATE_KEY`, `SEPOLIA_RPC_URL`.

**Claude Code was asked to:**
- Write `src/lib/agent0.ts` — typed GraphQL client for Agent0/ERC-8004 Subgraph (Base Mainnet
  via Subgraph Studio gateway). Includes schema-not-yet-verified warning in development to
  force running `scripts/introspect-agent0-schema.ts` before trusting field names.
- Write `scripts/introspect-agent0-schema.ts` — GraphQL introspection script to confirm real
  Agent0 schema field names before any live query is made.
- Write `src/lib/mandate-subgraph.ts` — typed GraphQL client for own Mandate subgraph
  (Sepolia, indexes PermissionMirror PermissionSynced events).
- Write `src/lib/underwriting.ts` — composition logic for trust score + authorization decision.
  Documented scoring formula (ERC8004 × 0.60 + MandateHistory × 0.40, threshold 60).
- Write `subgraph/schema.graphql` — entities: AgentScope, PermissionUpdate.
- Write `subgraph/subgraph.yaml` — manifest targeting PermissionMirror on Sepolia (address
  is zero placeholder until Phase 4 deployment).
- Write `subgraph/abis/PermissionMirror.json` — ABI for subgraph codegen.
- Write `subgraph/src/permission-mirror.ts` — AssemblyScript mapping for PermissionSynced.
- Write `mcp/server.ts` — MCP server using @modelcontextprotocol/sdk 1.30.0, Streamable HTTP
  transport (stateless), three tools: get_agent_authority, check_permission, get_risk_score.
- Update `eslint.config.mjs` to exclude mcp/ and subgraph/ from Next.js lint rules.
- Update `tsconfig.json` to exclude mcp/ and subgraph/ from Next.js compilation.
- Update `tsconfig.scripts.json` to include mcp/ for type checking.
- Update `.env.example` with NEXT_PUBLIC_MANDATE_SUBGRAPH_ID.
- Install @modelcontextprotocol/sdk@1.30.0 and dotenv.

**AI-generated:** All code in the files listed above; subgraph schema design; scoring formula;
MCP tool schema/descriptions; ABI file from PermissionMirror.sol.

**Human-directed / reviewed:** Scoring formula weights (0.60/0.40) and threshold (60) are
proposed — user must confirm before Phase 4 uses them for real enforcement decisions;
the SCHEMA_VERIFIED sentinel in agent0.ts must be flipped only after running the introspection
script against the live subgraph and confirming field names; the zero-address placeholder in
subgraph.yaml must be replaced with the real deployed address in Phase 4.

**Live run status:** BLOCKED — requires credentials listed above. Code type-checks and
next build passes. Live transcript will be added when credentials are available.

**Spec files used:** `/specs/phase3-graph.md`

### 2026-09-05 | Backend | Phase 1 (completion pass)

**Task:** Make the Phase 1 script suite actually executable against live Sepolia, and
resolve the external unknowns blocking it. Phase 1 code existed from 2026-09-04 but had
never been run — its definition of done requires real on-chain output.

**Claude Code was asked to:**
- Audit why the Phase 1 scripts had never run, and fix the blockers
- Add `scripts/lib/config.ts` — `.env` loading via `dotenv` plus signer resolution
  (`PRIVATE_KEY` preferred, `MNEMONIC` fallback) so the four entrypoints stop duplicating
  environment boilerplate
- Add `scripts/whoami.ts` — read-only preflight printing the active signer address and its
  Sepolia ETH / ENS-USDC / Circle-USDC balances
- Determine where ENS testnet USDC comes from (previously an open `UNVERIFIED` item)
- Verify the ERC-8004 registration-file schema against the EIP-8004 specification and
  confirm the deployed registry's function set before sending any transaction
- Write `public/agent-registration.json` + `public/agent-avatar.svg` and repoint `AGENT_URI`

**AI-generated:** `config.ts`, `whoami.ts`, the registration JSON and avatar SVG, the
ASSUMPTIONS.md verification entries, `SIDDHARTH_CHECKLIST.md`.

**Human-directed / reviewed:** Rejected an initial hand-rolled `.env` parser in favour of
the `dotenv` dependency already added to the project — the parser was redundant and was
removed (config.ts went 82 → 43 lines). Chose to publish a real registration file before
registering rather than minting against a placeholder URI. Performed the ENS-USDC mint
manually via Etherscan. Supplied and funded the testnet signer.

**Bugs found and fixed:**
- Scripts never loaded `.env` at all — no `dotenv` import and no `--env-file`, so every
  script threw on a missing env var regardless of the file's contents.
- `.env.example` declared `NEXT_PUBLIC_SEPOLIA_RPC_URL` while the scripts read
  `SEPOLIA_RPC_URL`, and omitted 6 of the 8 variables the suite actually requires.
- Blank env vars are `''`, not `undefined`, so `process.env.AGENT_ID ?? '1'` never fired
  its fallback and `BigInt('')` silently evaluated to `0n` — reads targeted the wrong
  agent. Added `optionalEnv()` and routed all optional reads through it.
- `AGENT_URI` pointed at a non-existent GitHub Gist (HTTP 404). Caught before any
  registration transaction was sent.

**Verified against live Sepolia (not assumed):**
- ERC-8004 registry is an EIP-1967 proxy → implementation `0x7274e874…9c02`
- `setAgentURI(uint256,string)` is present, so the agent URI is updatable post-mint
- ENS testnet USDC (`0x7Fc2…`) and Circle USDC (`0x1c7D…`) are different contracts;
  the ENS one has a public `mint(address,uint256)` and no faucet
- `npm run read:identity` returns real on-chain data for an existing agent

**Spec files used:** `/specs/build-plan.md`

### 2026-09-05 | Backend | Phase 1 (ENSv2 completion)

**Task:** Finish the ENS half of Phase 1 — register the name, create the agent
subname, and publish the permission records so they are readable on-chain.

**Claude Code was asked to:** diagnose why `register()` reverted, find the correct
Sepolia contracts, implement ENSv2 subname creation, and write the Mandate
permission records to a resolver.

**AI-generated:** `scripts/create-subname.ts`, `scripts/set-permissions.ts`,
`scripts/mint-usdc.ts`, the corrected addresses and comments in `scripts/lib/constants.ts`.

**Human-directed / reviewed:** Rejected the claim that ENSv2 might not support
subnames and supplied the ENSv2 documentation, which redirected the work from a
workaround (records on the parent name) to the correct per-name subregistry
design. Also rejected a redundant hand-rolled `.env` parser in favour of the
`dotenv` dependency already present.

**Bugs found and fixed:**
- Contract addresses came from ensjs `l2.d.ts`, which is the Namechain deployment
  keyed under chain id 11155111 — not Ethereum Sepolia. `register()` reverted with
  `PaymentTokenNotSupported`. Diagnosed by simulating the call and decoding the
  custom error rather than guessing.
- Subname creation used the v1 `createSubname`, which targets the legacy registry
  and NameWrapper and cannot drive a v2 name.
- `mandate.eth` was registered with `subregistry = address(0)`, so it could hold
  no children at all.
- The text-record writer used `setText(bytes32,string,string)`, which does not
  exist on the ENSv2 DedicatedResolver — its writer is `setText(string,string)`.

**Verified live on Sepolia:** agentId 10099; `mandate.eth` registered
(tx `0xd0762cc8…`); `testagent.mandate.eth` created (tx `0x5196898a…`); both
permission records written and read back through `npm run read:identity`.

**Spec files used:** `/specs/build-plan.md`

### 2026-09-06 | UI | Phase 4

**Task:** Wire all three UI screens to live on-chain data — replace every example
fixture with real calls to the Mandate subgraph, Agent0 subgraph, and composed
underwriting logic.

**Claude Code was asked to:**
- Build `src/lib/server-data.ts` — server-side data layer: `LIVE_AGENT` constants
  (verified on-chain values), `getAgentLiveData()` (async, returns plain serialisable
  types — no BigInts — safe for RSC), `getBlockedScenario()` (live gmx-perp check),
  `decodeProtocols()` / `decodePositionTypes()` / `usdcToNumber()` helpers
- Rewrite `src/app/page.tsx` to async server component — live trust score, permission
  scope, protocols, expiry; DataSourceBanner with three states (live/syncing/error)
- Rewrite `src/app/dashboard/page.tsx` to async server component — live policy strip
  (allowed/blocked/expiry columns from decoded bitmasks), live maxDailySpendUsdc for
  spend meter limit
- Rewrite `src/app/transactions/blocked/page.tsx` to async server component — calls
  `getBlockedScenario()` (real gmx-perp permission check), `parseEnforcementChain()`
  maps raw reason strings to 6 named steps with pass/fail, live allowed-protocols
  in "Agent May Use Instead" card
- Build `src/app/api/revoke/route.ts` — kill-switch backend: reads current scope via
  `getPermissions`, syncs with expiry=1n via `walletClient.writeContract`, returns
  `{ revoked, txHash, blockNumber, explorerUrl }`, returns 503 gracefully when
  PRIVATE_KEY is not set
- Update `src/components/dashboard/KillSwitch.tsx` — now calls real `/api/revoke`;
  revoked state shows live Sepolia Etherscan tx link; error state shows server message
  without crashing when key is absent

**AI-generated:** All of `server-data.ts`; the RSC async conversion of all three
pages; the enforcement-chain parser and step mapping; the `/api/revoke` route using
viem `writeContract`; `KillSwitch` state machine with txHash display.

**Human-directed / reviewed:** The decision to use a server-side API route for the
kill switch (avoids browser wallet dependency for the demo); the bitmask values and
6-decimal USDC convention (confirmed from Siddharth's Phase 3 output); the
`erc8004Score = null` vs zero distinction (prevents silently denying all trades for
a Sepolia agent not indexed on Base Mainnet).

**Bugs found and fixed:**
- `next: { revalidate }` is a Next.js fetch extension not in standard `RequestInit` —
  caused TS error under `tsconfig.scripts.json`; fixed with `as object` cast in both
  `agent0.ts` and `mandate-subgraph.ts`.
- BigInt values from subgraph cannot pass through RSC payload — converted all to
  `number` or `string` in `getAgentLiveData()` before returning.
- PermissionMirror `sync()` takes the full scope struct, not just expiry — must read
  current scope first, then replay it with `expiry = 1n`.

**Spec files used:** `/specs/phase4-ui.md`

### 2026-09-06 | UI | Phase 6

**Task:** Treasury/settlement UI — live Arc testnet USDC balance and authorization
trail; honest empty-state for settlements pending Phase 5.

**Claude Code was asked to:**
- Build `src/lib/arc-data.ts` — `getArcBalance(address)` using viem `getBalance` on
  `arcTestnet` chain (chain ID 5042002, confirmed from `viem/chains/definitions/arcTestnet.ts`).
  Arc's native currency is USDC with 18 decimals. `arcExplorerTx()` / `arcExplorerAddr()`
  URL builders using confirmed ArcScan base URL from viem chain definition.
- Rewrite `src/app/treasury/page.tsx` — async server component calling `getArcBalance()`,
  `getAgentLiveData()`, and `fetchRecentUpdates()` in parallel. Balance card shows real
  Arc testnet block number as proof of live connection. Authorization trail renders real
  `PermissionUpdate` entities from Mandate subgraph with Sepolia Etherscan tx links.
  Settlement history shows honest empty state explaining Phase 5 dependency.
  Funding section shows "Phase 5 pending" — no assumed API shape.

**AI-generated:** All of `arc-data.ts`; the treasury page rewrite; the authorization
trail component using live subgraph `PermissionUpdate` entities; ArcScan URL builders.

**Human-directed / reviewed:** The decision not to design a funding flow (Phase 5
hasn't exposed an API shape — the prompt explicitly requires confirming what's available
before building around it). The distinction between "authorization events" (real Sepolia
PermissionSynced evidence, live now) and "Arc settlements" (Phase 5 required, not yet
real).

**Verified live:** Arc testnet RPC responding at block 60,731,658; chain ID 0x4cef52
= 5042002; agent balance $0.00 USDC (unfunded pending Phase 5 — correct, not broken);
ArcScan API responding at `https://testnet.arcscan.app/api`.

**Spec files used:** `/specs/phase6-ui.md`

### 2026-09-06 | UI | Phase 8

**Task:** Execution UI — the demo-moment screen. Interactive trade-attempt flow with
real-time underwriting animation, unmistakable blocked state, 15-second comprehension
target for first-time viewers.

**Claude Code was asked to:**
- Build `src/app/api/check/route.ts` — `POST /api/check` accepts `{ protocol, amountUsdc }`
  (whole-dollar amount), calls `composeRiskScore` with live Graph data, maps the raw
  `reasons[]` array into 5 named steps (Trust Score, Permission Scope, Protocol Allowlist,
  Position Size, Daily Spending Cap) each with `pass/fail/skip` status and a plain-English
  detail string. Derives `primaryBlock` (one sentence, no raw revert string) and
  `primaryBlockDetail` (raw reason, for technical viewers). Returns `latencyMs`.
- Build `src/app/execute/page.tsx` — `'use client'` component. Three preset trade buttons
  pre-labeled with expected outcome ("Should pass" / "Not in allowlist" / "Exceeds position
  limit"). Custom protocol + amount form. Sequential step animation: each step shows
  "checking" spinner then resolves to pass/fail at 550ms intervals; fail stops and skips
  remaining steps. BLOCKED verdict: full-width red panel, plain-English primary reason,
  raw technical detail. APPROVED verdict: green panel, "MandateGate clears", greyed-out
  Arc settlement CTA (Phase 5 pending). Latency + data source footnote.
- Update `src/components/layout/Sidebar.tsx` — Execute added as first nav item.

**AI-generated:** All of `/api/check/route.ts`; all of `execute/page.tsx`; sidebar update.

**Human-directed / reviewed:** The decision to animate steps on the client after a single
API call (not separate per-step calls) — real data, UX pacing. The three specific preset
scenarios cover all three underwriting failure modes in the demo. "MandateGate clears" /
"MandateGate reverts" language connects the UI to the on-chain enforcement story.

**Current limitation:** Without `NEXT_PUBLIC_MANDATE_SUBGRAPH_URL` set, every check blocks
at "Permission Scope". All three failure modes demonstrate correctly once the subgraph URL
is configured.

**Spec files used:** `/specs/phase8-ui.md`
