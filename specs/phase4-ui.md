# Phase 4 — UI wiring (reconstructed 2026-09-09)

> **Note on provenance:** the original prompt as typed for this phase was not saved
> as a separate file when the work was done — a gap this file closes. What follows
> is not that verbatim prompt; it is the task description `AI_USAGE.md` recorded
> contemporaneously on 2026-09-06, the day the work happened, copied here unedited.
> See `AI_USAGE.md` under "2026-09-06 | UI | Phase 4" for the full entry, including
> what was AI-generated, human-directed, and the bugs found along the way.

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
