# Mandate — ETHOnline 2026 Build Plan

> This file contains the exact build plan prompt used to direct AI development on this project,
> as required by ETHGlobal's Spec-Driven Development disclosure guidelines.
> Pasted verbatim on 2026-09-04 (Phase 0).

---

"Start Fresh" is stricter than it sounds. Per the rules: "any prior project-specific code,
designs, or assets are not allowed." That includes Figma mockups, wireframes, a color palette
you fell in love with, or a half-written contract — not just code. Between now (Sept 2) and
Sept 4, the only things you're allowed to do without risking your partner-prize/Finalist
eligibility are: reading docs, creating dev accounts (Subgraph Studio, Circle developer portal,
1inch developer portal), getting testnet ETH, and setting up an empty repo with generic tooling
(ESLint config, a bare Next.js scaffold from the public starter templates the sponsors link —
not anything Mandate-specific). Phase 0 below is scoped exactly to that boundary. Don't let
the design itch jump the gun.

Commit like a human engineer, document like an honest one. No per-commit AI signatures needed
(that's not an ETHGlobal requirement). Small, honestly-described, incremental commits — never
one giant end-of-day dump (the rules explicitly call this out as disqualification-risk).
Section 4 has the exact format. Section 5 has the AI_USAGE.md spec that carries the actual
required disclosure.

Live data only, for Graph and 1inch. Both sponsors explicitly disqualify mocked/local-only
data. Every phase touching Graph or Aqua below says "live" for a reason — don't let Claude
Code quietly reach for a fixture file under time pressure.

We are building "Mandate" for ETHOnline 2026 (ETHGlobal), a fully online hackathon.

Submission deadline: Sunday Sept 13 2026, 12:00pm EDT. No late submissions accepted.

## WHAT WE'RE BUILDING, IN PLAIN LANGUAGE

Mandate lets someone deploy an autonomous DeFi trading agent that cannot exceed its own
declared authority, and that earns or loses trust based on its real track record — enforced
on-chain, not by trusting the agent's own good behavior.

Concretely, four pieces wired into one pipeline:

1. IDENTITY & PERMISSIONS: each agent gets an ENSv2 subname (e.g. alpha.fund.eth) on Sepolia.
   Its Enhanced Access Control record IS its permission scope — which protocols, which
   position types, max position size, max daily spend. Public, checkable, not a config file.

2. REPUTATION & RISK SIGNAL: before acting, we compose two Graph products — the sponsor-listed
   Agent0/ERC-8004 Subgraph (the agent's real job history / validated outcomes) plus a subgraph
   we build ourselves indexing Mandate's own past decisions and fills — into one live
   trust-and-risk score. This is served over a public MCP server for natural-language queries.

3. ENFORCEMENT & EXECUTION: a custom SwapVM opcode, MandateGate, added to 1inch's Aqua/SwapVM
   opcode table, reads the agent's permission scope and reputation score AT EXECUTION TIME and
   reverts the fill if either check fails. This is enforced inside the swap itself, not as an
   off-chain pre-check an attacker or a bug could route around.

4. SETTLEMENT & REPUTATION WRITE-BACK: approved trades fund and settle in USDC over Arc's
   (Circle's) Agent Stack. The outcome gets written back into the agent's reputation record,
   closing the loop for its next decision.

## WHY THIS IS REAL, NOT A TOY PROBLEM

2026 has seen repeated, costly failures of exactly this kind — a prompt-injected agent wallet
lost ~$150K twice, another agent lost track of its own balance after a crash and sent 1000x
its intended transfer (~$250K gone), and MCP memory-poisoning attacks drained an estimated
$45M from a cluster of Solana trading-agent platforms. ERC-8004 (identity/reputation) and
tools like AgentScope (on-chain spend limits via ERC-4337) are the ecosystem's current answer
to HALF the problem — enforcement. Nobody has wired live reputation + market risk into the
enforcement decision itself. That's the gap we're filling. Say this explicitly in the README —
name ERC-8004 and AgentScope directly. Don't let a judge think we've never heard of them.

## TARGET SPONSOR TRACKS

- The Graph: "Best Use of Composable/Standardized Graph Products" AND "Best AI Tooling/Use
  Case" (both are reachable from one integration — see WHAT WE'RE BUILDING #2)
- Arc/Circle: "Best Agentic Economy with Circle Agent Stack" AND "Best DeFi Stablecoin-Native
  Pool" (both reachable from #4)
- ENS: "Best Use of ENSv2" (from #1)
- 1inch (STRETCH, attempt only after the above three work end to end): "Build an Aqua App"
  (from #3)

## ARCHITECTURE DECISION

ENSv2 Enhanced Access Control only exists on Sepolia (beta). 1inch's Aqua/SwapVM contracts
are NOT guaranteed to be deployed on Sepolia — verify their actual deployment status in
Phase 1 before assuming a chain. This means the permission record (Sepolia) and the
MandateGate opcode (wherever Aqua lives) are very likely on DIFFERENT chains, and a smart
contract cannot synchronously read state on a different chain.

The correct fix, not a workaround: deploy a small "PermissionMirror" contract on the SAME
chain as our Aqua/SwapVM deployment. A backend relayer service watches the canonical ENSv2
Sepolia record and the composed Graph reputation score, and keeps PermissionMirror in sync
whenever either changes. MandateGate reads PermissionMirror synchronously, on its own chain,
at execution time — so enforcement is still a same-chain, unbypassable on-chain read, and the
relayer is just a sync mechanism, not a trust boundary. Confirm and document this design in
ARCHITECTURE.md in Phase 1 before other phases build on top of it.

## TEAM & DIVISION OF LABOR

- Backend/Chain (Track B): identity/permission contracts, Graph subgraph + composition logic,
  Arc settlement, the MandateGate opcode, the MCP server.
- UI/UX (Track U): design system, the underwriting dashboard (visible policy strip / kill
  switch / trade log — this is a judged UX pattern, not decoration), the "blocked transaction"
  demo moment, treasury view, final demo video.

## GLOBAL ENGINEERING STANDARDS

- Real, live data only where a sponsor's rules require it (Graph, 1inch both explicitly
  disqualify mocked/local-only data). Testnet is fine; fixtures/mocks standing in for the
  real integration are not.
- Small, honest, incremental commits. See the Git Discipline section.
- Every phase ends with an update to AI_USAGE.md and a pass through the Loop Protocol —
  don't skip either under time pressure.
- If you (Claude) are not certain an API, contract address, or function signature is real,
  say so explicitly and verify before using it. Guessing a plausible-looking signature is
  the single most likely way this project breaks two days before the deadline.
- Prefer TypeScript across the stack (frontend, backend, subgraph mappings) for one
  consistent language, unless a sponsor's tooling forces otherwise.

---

## Phase 0 Prompt (verbatim, pasted 2026-09-04)

Phase 0 — Pre-event setup only (Sept 2–3, before official start)
Track: Both. Boundary: research and accounts only — no Mandate-specific code, contracts,
or designs (see Section 1).

Both: create accounts — Subgraph Studio, 1inch Developer Portal (API key), Circle Developer
Portal (Arc testnet access), get Sepolia + Arc testnet + Base Sepolia test funds from their
respective faucets.

Backend track: read the actual current state of 1inch's github.com/1inch/aqua and
github.com/1inch/swap-vm repos — confirm whether a testnet deployment exists yet, or whether
you'll be deploying the official contracts yourselves (this was true for several teams as
recently as mid-2026 — don't assume it's changed).

Backend track: read ENSv2 Enhanced Access Control docs (docs.ens.domains/ensv2/enhanced-access-control)
and the Agent0/ERC-8004 Subgraph docs (thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/).

UI track: research only — look at atlas, Aqua Prime, and AgentArena's actual showcase pages
(ethglobal.com/showcase) for how they visualized policy/permission state. Do not start
Figma files yet.

Both: scaffold an empty repo — generic Next.js + TypeScript starter, ESLint/Prettier config,
.gitignore, .env.example. No Mandate-specific files.

Deliverable: repo exists and builds; accounts + testnet funds ready; ARCHITECTURE.md and
AI_USAGE.md created as empty templates.
