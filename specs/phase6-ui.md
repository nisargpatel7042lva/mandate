# Phase 6 — Treasury UI (reconstructed 2026-09-09)

> **Note on provenance:** the original prompt as typed for this phase was not saved
> as a separate file when the work was done — a gap this file closes. What follows
> is not that verbatim prompt; it is the task description `AI_USAGE.md` recorded
> contemporaneously on 2026-09-06, the day the work happened, copied here unedited.
> See `AI_USAGE.md` under "2026-09-06 | UI | Phase 6" for the full entry, including
> what was AI-generated, human-directed, and what was verified live.

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
