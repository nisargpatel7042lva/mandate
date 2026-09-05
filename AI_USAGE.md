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
