# Siddharth — Track B (Backend/Chain) Checklist

> **Track:** B — Backend/Chain (identity/permission contracts, Graph subgraph +
> composition logic, Arc settlement, MandateGate opcode, MCP server).
> **Partner:** Nisarg — Track U (UI/UX).
> **Deadline:** Sun Sept 13 2026, 12:00pm EDT / 9:30pm IST. No late submissions.
>
> Source of truth: `MANDATE_CLAUDE_CODE_BUILD_PLAN.md.pdf` §6. This file is the
> Track B extract — tick items as they are *verified working*, not as they are written.

---

## Rules that bind every item below

- [ ] **Loop Protocol on every task** — restate → verify externals BEFORE building →
      smallest unit → actually run build/lint/typecheck and paste real output →
      report what's still a stub → wait for go-ahead → commit.
      *"A task is only done if you ran it and watched it work. 'This should work' is not done."*
- [ ] **Never invent** a contract address, API endpoint, or function signature.
      Write `UNVERIFIED: <specific thing>` in ASSUMPTIONS.md and ask instead.
- [ ] **Live data only** where Graph and 1inch are involved — both explicitly
      disqualify mocked/local-only data. Testnet fine; fixtures standing in for the
      real integration are not.
- [ ] **Small, honest, incremental commits.** Imperative mood, one logical change each.
      No AI signatures in commit messages. Large single commits = disqualification risk.
- [ ] **Append to AI_USAGE.md before each commit**; drop every phase prompt used
      into `/specs` verbatim.
- [ ] **Never commit** a secret, private key, or API key.

---

## Phase 0 — Pre-event setup ✅ DONE

- [x] Accounts: Subgraph Studio, 1inch Developer Portal, Circle Developer Portal
- [x] Testnet funds: Sepolia, Arc testnet, Base Sepolia
- [x] Research: 1inch aqua / swap-vm deployment status, ENSv2 EAC docs, Agent0 subgraph docs
- [x] Empty scaffold: Next.js + TS, ESLint/Prettier, .gitignore, .env.example
- [x] ARCHITECTURE.md + AI_USAGE.md templates created

---

## Phase 1 — Identity core: ERC-8004 + ENSv2 (Sept 4) — CODE DONE, ⚠️ NOT VERIFIED LIVE

Code is committed. The phase's definition of done requires **real on-chain data printed
from a live Sepolia run** — not `console.log` of local variables. Close this gap first.

**Written:**
- [x] `ARCHITECTURE.md` — chain decision, PermissionMirror design, exact addresses
- [x] `scripts/register-identity.ts` — ERC-8004 register → parse Transfer → read back
- [x] `scripts/register-ens.ts` — commit → wait → USDC approve → register → subname → 2× setText → read back
- [x] `scripts/read-identity.ts` — live read of identity + reputation + both text records
- [x] `scripts/relayer-stub.ts` — polls ENS record, decodes scope to bitmasks
- [x] `contracts/PermissionMirror.sol` — skeleton, relayer-gated sync
- [x] `scripts/lib/constants.ts` — addresses verified from ensjs v5 dist + ERC-8004 repo

**Still to verify (do this before Phase 3):**
- [ ] Set up `.env` with a funded Sepolia key + RPC URL
- [ ] **Actually run** `register-identity.ts` against live Sepolia — capture the real agentId
- [ ] **Actually run** `register-ens.ts` — capture real tx hashes for register / subname / both setText
- [ ] **Actually run** `read-identity.ts` — paste the real on-chain output
- [ ] Record the live agentId + ENS name where Phase 3 and Nisarg can both use them
- [ ] Update ASSUMPTIONS.md: flip verified items, log anything that failed

**Definition of done:** a script that registers an ERC-8004 identity, writes an ENSv2
permission record + policy summary, and reads both back — printing real on-chain data
from live Sepolia.

---

## Phase 3 — Composed Graph data layer + underwriting logic (Sept 5–7) 🔴 CRITICAL PATH

Carries 2 of 3 target prizes. Blocks Nisarg's Phase 4. Start here.

### 3.1 — Live Agent0/ERC-8004 subgraph query
- [ ] Resolve `UNVERIFIED`: does an Agent0/ERC-8004 subgraph exist on any testnet?
      (Only Base Mainnet ID `43s9hQ…` is confirmed — see ASSUMPTIONS.md)
- [ ] If testnet-only is impossible, decide + document the fallback (mainnet subgraph for history)
- [ ] Read the subgraph's **actual GraphQL schema** — do not guess field names
- [ ] Query it live via Subgraph Studio for the registered test agent
- [ ] Paste a real query + real response into the phase report

### 3.2 — Build our OWN subgraph
- [ ] Define the schema — index permission writes, gate checks, fills, settlements
- [ ] Write mappings (TypeScript, per the global standard)
- [ ] Deploy to Subgraph Studio
- [ ] **Prove it indexes live:** trigger a real testnet event, watch it appear in a query
- [ ] Capture the deployed subgraph ID / query URL for Nisarg

### 3.3 — Composition / underwriting logic
- [ ] Take three inputs: (a) ENS permission scope, (b) ERC-8004 reputation, (c) own indexed history
- [ ] Compute one trust-and-risk score + an allow/deny decision for a proposed action
- [ ] **Document the scoring formula in code comments** — real logic, explicitly *not* a stub that always returns true
- [ ] Unit-test the deny paths: over position limit, protocol not allowed, expired scope, reputation below threshold

### 3.4 — Public MCP server
- [ ] Stand up an MCP server exposing the composed signal in natural language
- [ ] Handles e.g. *"what can testagent.mandate.eth do right now, and what's its track record?"*
- [ ] Confirm it answers a real query end to end
- [ ] Make it publicly reachable (this is what earns the Graph AI track)

### 3.5 — Handoff to Nisarg
- [ ] Publish the actual API/query shape he should consume
- [ ] Tell him explicitly where it differs from his Phase 2 placeholder shapes

**Definition of done:** querying the MCP server about the real registered test agent
returns a real, composed answer sourced from live Subgraph Studio data — demonstrated
with an actual transcript in the phase report, not a description of what it would do.

---

## Phase 5 — Arc/Circle settlement + reputation write-back (Sept 7–9) 🟠

Highest count of unverified externals — budget discovery time, not just coding time.

- [ ] Resolve `UNVERIFIED`: Arc Agent Stack testnet endpoint URL
- [ ] Resolve `UNVERIFIED`: Arc SDK method signatures — **read `github.com/circlefin/agent-stack-starter-kits` source** before assuming any API shape
- [ ] Resolve `UNVERIFIED`: which USDC contract Arc settlement uses on testnet
- [ ] Give the test agent a Circle wallet on Arc testnet
- [ ] Build the funding/settlement flow: an approved action → **real USDC transfer** on Arc testnet
- [ ] Confirm the tx hash is real and visible on Arc's block explorer (not a logged simulated success)
- [ ] Make the decision traceable: settlement record references *which* trust score and *which* permission check passed
- [ ] Write outcome back to our own subgraph
- [ ] **Verify** whether ERC-8004 Reputation Registry is write-accessible to us — do not assume; write back if it is
- [ ] Run one full manual loop: propose → check passes → Arc settles → reputation updates → re-query MCP shows updated history
- [ ] Expose a funding flow for Nisarg's Phase 6 if feasible — tell him what actually exists

**Definition of done:** one complete, real, live-testnet cycle with every step's on-chain
evidence (tx hashes, explorer links) captured in the phase report.

---

## Phase 7 — MandateGate: custom SwapVM opcode (Sept 9–11) 🟡 STRETCH

**Do not start until Phases 1, 3, and 5 are solid end to end.**
**Hard timebox: if it isn't cleanly working by the evening of Sept 11, invoke the fallback.**

- [ ] Resolve `UNVERIFIED`: read actual `github.com/1inch/swap-vm` source to confirm the
      opcode table structure — `_instructions()` array vs `_runOpcode` if-else dispatcher.
      Do not assume from memory or a similar project's description.
- [ ] Resolve `UNVERIFIED`: does `chain-11155111.json` exist for Aqua? Can we self-deploy?
- [ ] Deploy SwapVM router + Aqua on Sepolia per their DEPLOY.md
- [ ] Deploy PermissionMirror for real on the execution chain
- [ ] Get the relayer actually syncing it from the canonical ENS record + composed trust score
- [ ] Write the `MandateGate` opcode, following Turing Swap's `_humanGate` precedent
      (reads external state mid-execution, reverts on failure)
- [ ] **Append** it to the opcode table — do not replace existing opcodes (1inch rule:
      bonus for modifying opcodes, official contracts required as the base)
- [ ] Wire into one real Aqua position type
- [ ] Demo **both** outcomes live on testnet:
  - [ ] in-scope, well-reputed action → executes successfully
  - [ ] out-of-scope or low-reputation action → **reverts at the MandateGate check**, on-chain revert visible
- [ ] Clean incremental git history for this phase specifically (1inch disqualifies
      single-commit final-day entries)

**FALLBACK if not clean by Sept 11 evening:** execute the approved action as a plain swap
instead of a custom SwapVM position, keep the underwriting story intact via Phases 1–5,
and don't submit for the 1inch prize. The three core tracks don't depend on this.

**Definition of done:** two real, live testnet transactions — one MandateGate-approved
fill that succeeds, one MandateGate-blocked attempt that reverts on-chain — both with tx hashes.

---

## Phase 9 — Integration pass + bug bash (Sept 11) 🔵 BOTH TRACKS, LIVE, TOGETHER

- [ ] Walk the full journey together on live testnets: register agent → set permissions →
      propose actions (one approved, one blocked) → settlement → reputation update →
      dashboard reflects all of it correctly
- [ ] Actually click through every step as a first-time user would — not code review alone
- [ ] Log every rough edge in ASSUMPTIONS.md / a new ISSUES.md, triaged as
      "fix before submission" vs "known limitation, mention honestly in README"
- [ ] **No new feature work today** unless the walkthrough reveals a hard blocker for one
      of the 3 core tracks' qualification requirements

**Definition of done:** the full happy path AND the full blocked path both work, live,
start to finish, with no manual data seeding via a script that wouldn't exist in production.

---

## Phase 10 — Documentation (Sept 11–12) 🔵 NISARG LEADS, YOU FILL TECHNICAL SECTIONS

- [ ] Replace the default `create-next-app` README (still untouched as of Sept 5)
- [ ] Technical sections: architecture diagram, setup instructions a judge can actually follow
- [ ] Explicit prior-art section naming **ERC-8004** and **AgentScope**, stating what
      Mandate adds on top
- [ ] Every claim checked against what actually works — not what was planned
- [ ] Final completeness pass on AI_USAGE.md (should already be mostly populated)
- [ ] Confirm `/specs` contains the build plan + every phase prompt actually used
- [ ] Per-sponsor submission paragraphs: Graph, Arc, ENS (+ 1inch if it shipped)

---

## Phase 11–12 — Demo video + submission (Sept 12–13) — NISARG OWNS

⚠️ The PDF assigns these to "you, solo" in its own voice, which resolves to Nisarg
(page 1 names him the demo-video owner). **Confirm this split with him explicitly.**

- [ ] Supply Nisarg with real tx hashes + explorer links for anything claimed on camera
- [ ] Be available Sept 13 for last-minute technical fixes
- [ ] Sanity-check the submission's technical claims before it goes in

---

## Qualification bar per sponsor — your track's obligations

| Sponsor | Non-negotiable | Your phase |
|---|---|---|
| **The Graph** | Live Subgraph Studio data, not mocked; 2+ Graph products composed; reasoning shown, not raw query output | Phase 3 |
| **Arc/Circle** | Working frontend + backend + architecture diagram; decision logic traceably tied to a real signal | Phase 5 |
| **ENS** | ENSv2 (Sepolia) central to the product, functional demo, no hard-coded values | Phase 1 |
| **1inch** (stretch) | Official Aqua/SwapVM contracts; real git history; on-chain token transfer shown in demo | Phase 7 |

Submit for up to 3 Partner Prizes. Default: **Graph, Arc, ENS.** Swap in 1inch only if
Phase 7 fully succeeded and dropping one of the other three is clearly worth it.

---

## Standing risks

- **All UI data is currently fixtures.** Graph and 1inch disqualify mocked data. The
  amber "Example data" banners are honest, but they're a countdown — Phase 4 (Nisarg)
  can't start clearing them until your Phase 3 API shape is stable.
- **Phase 3 is the bottleneck for two people.** Every day late here costs Nisarg two.
- **Arc is the largest unknown surface** — endpoint, SDK, USDC address all unverified.
- **Phase 7 is genuinely optional.** Respect the Sept 11 timebox.
