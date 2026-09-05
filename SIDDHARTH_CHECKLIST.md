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

## Phase 1 — Identity core: ERC-8004 + ENSv2 ✅ COMPLETE (verified live 2026-09-05)

- [x] `.env` wired; scripts load it via `dotenv` in `scripts/lib/config.ts`
- [x] `npm run whoami` — signer `0xa0062C5066cF0B34010D7c4E90F68E4287D083a8`, funded
- [x] ENS testnet USDC obtained (10,000) — no faucet exists, token has a public `mint()`
- [x] ERC-8004 registration file published to spec at `public/agent-registration.json`
- [x] **`npm run register:identity` run against live Sepolia — `agentId 10099`**
      tx `0xf2545fe2d698a8de2eed5dd86366a178d3ed64cbed50d62030386e00f2b201b8`, block 11641781
- [x] `npm run read:identity` returns real on-chain data; `tokenURI` resolves HTTP 200
- [x] ASSUMPTIONS.md + AI_USAGE.md updated; committed in small honest commits

**Still open in Phase 1:**
- [ ] `npm run register:ens` — register `mandate.eth`, create the subname, write
      `mandate.permissions` + `mandate.policy`. Prerequisites are all met now
      (10,000 ENS USDC, 0.049 ETH, REGISTRATION_SECRET set). Not yet run.
- [ ] After it runs: the ENS text records must appear in `npm run read:identity`

---

## Phase 3 — Composed Graph data layer 🟡 PARTIALLY BUILT — re-baselined 2026-09-05

Code landed in commit `609b831` (not written in this session). Reviewed below against
the phase's own definition of done. **Nothing here is verified running yet.**

### 3.1 — Live Agent0/ERC-8004 subgraph query — CODE EXISTS, UNTESTED
- [x] `src/lib/agent0.ts` (124 lines) — client written, points at Base Mainnet subgraph
      `43s9hQRurMGjuYnC1r2ZwS6xSQktbFyXMPMqGKUFJojb`
- [x] `scripts/introspect-agent0-schema.ts` — schema introspection, the right instinct
- [ ] **Blocked: `NEXT_PUBLIC_GRAPH_API_KEY` is unset — no query has ever run**
- [ ] Run the introspection, confirm the field names, paste a real response

### 3.2 — Our own subgraph — WRITTEN BUT NOT DEPLOYABLE 🔴
- [x] `subgraph/schema.graphql`, `subgraph/src/permission-mirror.ts`, `subgraph.yaml`
- [ ] 🔴 **Circular dependency:** the manifest indexes `PermissionSynced` from
      PermissionMirror, but `address: "0x0000…0000"` and `startBlock: 0` — the contract
      is not deployed. PermissionMirror deployment sits in Phase 7, the *stretch* goal.
      So the Graph prize currently depends on the one phase we agreed to timebox and drop.
- [ ] **Fix: deploy PermissionMirror to Sepolia now.** It is a standalone contract with no
      SwapVM dependency — deploying it early decouples Phase 3 from Phase 7 entirely.
- [ ] Then: set the real address + startBlock, deploy to Studio, trigger a real sync via
      `npm run relayer`, and watch the event appear in a query

### 3.3 — Composition / underwriting logic — SUBSTANTIALLY DONE ✅
- [x] `src/lib/underwriting.ts` (201 lines), real documented formula:
      `TrustScore = ERC8004 * 0.60 + MandateHistory * 0.40`, threshold 60,
      five explicit authorization conditions. Not a stub — satisfies the phase requirement.
- [ ] Exercise the deny paths against real data once 3.1 and 3.2 return live values

### 3.4 — Public MCP server — WRITTEN BUT CANNOT RUN 🔴
- [x] `mcp/server.ts` (221 lines)
- [ ] 🔴 **`@modelcontextprotocol/sdk` is not installed** — `typecheck:scripts` fails with
      TS2307 on both SDK imports. The server has never started.
- [ ] Install the dependency, run it, answer a real query end to end
- [ ] Expose it publicly

### 3.5 — Handoff to Nisarg
- [ ] Publish the real query shape once 3.1/3.2 return live data

**Definition of done (unchanged):** an actual transcript of the MCP server answering a
real question about agent 10099, sourced from live Subgraph Studio data.

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
