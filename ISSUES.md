# Issues — Phase 9 Integration Pass (2026-09-07)

Triaged during the full end-to-end walk. Format: description → status → triage.

---

## Fix Before Submission

### I-002 — /api/revoke could kill the agent from anywhere, unauthenticated
The kill switch POSTed to `/api/revoke`, which signed `PermissionMirror.sync()` with a
server-held `PRIVATE_KEY`. The route took no body, no token and no auth, so once the key
was set in Vercel any `curl -X POST https://mandate-rho.vercel.app/api/revoke` revoked the
agent's authority on-chain. This was demonstrated accidentally on 2026-09-07: tx
`0x5a5dabed...` set expiry to 1 and `isAuthorized()` went false. Restored by re-running
the relayer (tx `0xc0fa23c5...`).

**Fix applied:** Removed the route entirely — the app no longer holds or uses a signing
key anywhere. The kill switch now signs in the owner's own wallet via EIP-1193, checks it
is on Sepolia, and verifies the connected account is the contract's relayer before
writing. Revocation is authorised by the key holder rather than by a server acting for
them, which is also the more honest demo of the product's own thesis.

It fired a second time minutes later while polling for the fix to deploy — the old
build was still serving, so the poll itself revoked again (tx set expiry to 1 at block
11654585, restored by `0x6d6604ce...`). Two lessons recorded: never probe a
state-changing endpoint with the method that changes state, and a destructive endpoint
should never be reachable without authentication in the first place.

**Status: FIXED**


### I-001 — TradeLog table had no fixture disclosure
The "Trade Decisions" card on `/dashboard` showed 6 example trades from Sept 4 with
fake tx hashes and no in-card label. A judge would read them as real historical records.

**Fix applied:** Added a footer line "Example data · live trade log wires to Arc
settlement events in Phase 5" to `TradeLog.tsx`. Matches the existing disclosure
pattern used in the Daily Spend section and the Agent home page.

**Status: FIXED**

---

## Known Limitations — Mention Honestly in README

### L-001 — Trade log is example data
Until Phase 5 (Arc settlement) completes, the trade log on `/dashboard` and `/` shows
static example trades from Sept 4 with fabricated block numbers and tx hashes. The
enforcement logic driving the Execute screen is real; the historical log is not.
**In README: "Trade history shown is illustrative; live entries require Phase 5 Arc USDC settlement."**

### L-002 — Arc wallet balance = $0
The Arc testnet wallet (`0xa0062C…`) has no USDC. The treasury page shows $0 alongside
a live block number — the connection is real; the balance is the correct current value.
Phase 5 (Circle Arc wallet funding) has not run.
**In README: "Agent wallet unfunded on Arc testnet; balance will update once Circle deposit endpoint is available."**

### L-003 — Arc settlement history is empty
No real Arc USDC transfers have been made; the treasury settlement table shows an
honest empty state. Entries will appear automatically once Phase 5 creates transactions.
**In README: "Settlement history is empty; entries appear after Phase 5 Arc USDC transfers."**

### L-004 — Underwriting is off-chain (Phase 7 stretch goal)
The Execute screen runs `composeRiskScore` server-side. On-chain MandateGate enforcement
(Phase 7) is a stretch goal timeboxed to Sept 11. The screen discloses this in its
footnote: "off-chain underwriting (Phase 7 on-chain enforcement not yet deployed)."
**In README: "MandateGate enforcement is off-chain for the demo; Phase 7 deploys it as a SwapVM opcode."**

### L-005 — Agent registration and permission-setting have no UI
Both steps must be done via CLI scripts (`npm run register-identity`,
`npm run relayer`). `testagent.mandate.eth` (agentId 10099) is already registered and
its scope is live (allowedProtocols 7, maxPosition $10k, maxDaily $50k).
**In README: "Registration and permission sync are one-time CLI operations; the UI shows the resulting live state."**

### L-006 — Agent0 / ERC-8004 subgraph is Base Mainnet only
Our agent is on Sepolia. The Agent0 subgraph has no Sepolia data, so `erc8004Score`
falls back to renormalizing onto Mandate history alone. Trust score for the demo agent
is 92. The underwriting footnote discloses which subgraphs contributed.
**In README: "Agent0 subgraph indexes Base Mainnet only; Sepolia agents are scored from Mandate history."**

### L-007 — Scope expiry countdown
The permission scope was synced ~Sept 5. The expiry shown is ~28 days (expires ~Oct 3).
The hackathon deadline is Sept 13 — well within the window. No action needed now.
**Note for team: re-sync scope if demo runs after Oct 3.**

### L-008 — Two GitHub remotes for production
Vercel builds from `siddharth-09/mandate` (fork). Upstream is `nisargpatel7042lva/mandate`.
A push to upstream only reaches production after the fork is manually synced.
**In README / HANDOFF: document the sync step before any demo or judge walkthrough.**

### L-009 — Vercel production env vars must be set manually
`NEXT_PUBLIC_GRAPH_API_KEY`, `NEXT_PUBLIC_MANDATE_SUBGRAPH_URL`,
`NEXT_PUBLIC_AGENT0_SUBGRAPH_ID`, `AGENT_ID` are required in the Vercel dashboard.
`PRIVATE_KEY` and `SEPOLIA_RPC_URL` are intentionally absent from the deployment.
**Status: already documented in ASSUMPTIONS.md and HANDOFF.md.**

---

## Full Happy-Path Checklist (Phase 9 verified 2026-09-07)

| Step | Route | Live data | Verdict |
|------|-------|-----------|---------|
| Agent identity | `/` | testagent.mandate.eth · agentId 10099 · trust 92 | ✅ |
| Agent permissions | `/` | Allowed: Uniswap v3, Curve, Aave v3 · $10k/$50k limits | ✅ |
| Propose trade → approved | `/execute` | Uniswap $8k · all 5 checks pass | ✅ |
| Propose trade → blocked (protocol) | `/execute` | GMX $5k · blocked at Protocol Allowlist | ✅ |
| Propose trade → blocked (size) | `/execute` | Curve $12k · blocked at Position Size | ✅ |
| Blocked detail page | `/transactions/blocked` | GMX enforcement chain live | ✅ |
| Treasury balance | `/treasury` | Arc block 60,868,633 · $0 USDC (unfunded) | ✅ honest |
| Authorization trail | `/treasury` | 1 PermissionSynced event on Sepolia | ✅ |
| Settlement history | `/treasury` | Empty state (Phase 5 pending) | ✅ honest |
| Dashboard permissions | `/dashboard` | Live from subgraph · protocols + limits | ✅ |
| Dashboard trade log | `/dashboard` | Example data · disclosed | ✅ honest |
