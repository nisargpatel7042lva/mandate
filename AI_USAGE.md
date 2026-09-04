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
