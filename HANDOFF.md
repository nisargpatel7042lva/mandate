# Backend → UI Handoff (Track B → Track U)

Everything Track U needs to replace the `EXAMPLE_*` fixtures in `src/lib/example-data.ts`
with live data. Written 2026-09-06. Every value below is verified on-chain or by a live query.

---

## 1. Get running

```bash
git pull
npm install
cp .env.example .env      # then fill in the values in section 2
npm run dev
```

You do **not** need a wallet, testnet funds, or a private key. Everything the UI reads is
public. `PRIVATE_KEY` / `MNEMONIC` are only for the backend scripts that write to chain —
leave them blank.

## 2. Environment

```bash
# Reading chain state directly (optional for the UI)
SEPOLIA_RPC_URL=<any Sepolia RPC — alchemy.com free tier is fine>

# The Graph — needed for the composition
NEXT_PUBLIC_GRAPH_API_KEY=<thegraph.com/studio -> API Keys>
NEXT_PUBLIC_AGENT0_SUBGRAPH_ID=43s9hQRurMGjuYnC1r2ZwS6xSQktbFyXMPMqGKUFJojb
NEXT_PUBLIC_MANDATE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1758732/mandate-subgraph/v0.0.2

# Our live agent
AGENT_ID=10099
AGENT_ADDRESS=0xa0062C5066cF0B34010D7c4E90F68E4287D083a8
ENS_NAME=testagent.mandate.eth
```

These are already set in Vercel. Ask if you want the Graph key rather than making your own.

## 3. The live agent

| | |
|---|---|
| ENS name | `testagent.mandate.eth` |
| ERC-8004 agentId | `10099` |
| Owner / agent wallet | `0xa0062C5066cF0B34010D7c4E90F68E4287D083a8` |
| Permission scope | uniswap-v3, curve, aave-v3 · spot, lp · max 10,000 USDC · daily 50,000 USDC |
| Scope expiry | 2026-10-05T18:16:35Z |

Real, on Sepolia, readable by anyone. The dashboard's policy strip can show exactly this.

## 4. What to call

### Option A — the MCP server (public, no key needed)

```
POST https://mandate-rho.vercel.app/api/mcp
```

Streamable HTTP MCP. Three tools: `get_agent_authority`, `check_permission`,
`get_risk_score`. `GET` the same URL for a description of the endpoint.

Best for: the "propose a trade → watch it get approved or blocked" flow, and anything
you want to demo as a natural-language interface.

### Option B — call the composition directly (simplest from a server component)

```ts
import { composeRiskScore } from '@/lib/underwriting'

const result = await composeRiskScore(
  '0xa0062C5066cF0B34010D7c4E90F68E4287D083a8',
  { protocol: 'uniswap-v3', amountUsdc: 8_500_000_000n, currentDailySpendUsdc: 0n },
)
```

Returns:

```ts
{
  trustScore: number
  erc8004Score: number | null      // null = no record; NOT zero. Render as "unknown".
  mandateHistoryScore: number
  authorized: boolean
  reasons: string[]                // human-readable; this is your "why it was blocked" copy
  agentFound: boolean
  reputationFound: boolean
  scopeFound: boolean
  scopeExpiry: number | null       // unix seconds
  allowedProtocols: bigint | null  // bitmask, see PROTOCOL_BITS
  maxPositionSizeUsdc: bigint | null   // 6 decimals
  maxDailySpendUsdc: bigint | null     // 6 decimals
}
```

Omit the second argument for a score-only call with no permission check.

### Option C — the raw subgraph

```
POST https://api.studio.thegraph.com/query/1758732/mandate-subgraph/v0.0.2

{ agentScopes { id allowedProtocols allowedPositionTypes maxPositionSizeUsdc
                maxDailySpendUsdc expiry ensNode lastSyncedBlock syncCount } }
```

Helpers already exist in `src/lib/mandate-subgraph.ts`: `fetchAgentScope`,
`fetchRecentUpdates`.

## 5. Mapping the existing screens

| Fixture | Replace with |
|---|---|
| `EXAMPLE_AGENT.permissions` | `composeRiskScore(...)` → `allowedProtocols` / `maxPositionSizeUsdc` / `maxDailySpendUsdc` / `scopeExpiry` |
| `EXAMPLE_AGENT.trustScore` | `result.trustScore` |
| `EXAMPLE_BLOCKED_TX.enforcementChain` | `result.reasons` — already ordered and human-readable |
| `EXAMPLE_TRADES` | `fetchRecentUpdates()` for sync history. **There is no trade log yet** — trades arrive in Phase 5 (Arc). Keep fixtures here and keep the "example data" banner. |
| `EXAMPLE_TREASURY` / `EXAMPLE_SETTLEMENTS` | Phase 5, not built. Keep fixtures + banner. |

## 6. Things that will trip you up

- **`allowedProtocols` is a bitmask**, not an array. `7` = uniswap-v3 | curve | aave-v3.
  `PROTOCOL_BITS` in `src/lib/underwriting.ts` maps names to bits.
- **USDC amounts are 6 decimals.** `10000000000` = 10,000 USDC.
- **`erc8004Score` is `null`, not `0`, when unknown.** Our agent is on Sepolia and the
  Agent0 subgraph indexes Base Mainnet only, so it has no row there. Rendering that as a
  zero would read as "bad agent" when it means "no data". `reasons` explains it.
- **`reasons` is populated even when authorized** — it carries provenance notes, not just
  failures. Check `authorized`, don't infer from a non-empty array.
- The kill switch must eventually call a real revocation. Right now it is local UI state
  only (Phase 4 item 4 in the build plan).

## 7. States worth designing for

The build plan asks for real states, not just the happy path:

- **Subgraph still indexing** — `scopeFound: false` while `syncCount` is 0
- **No Agent0 record** — `erc8004Score: null`, weights renormalise; show it as unknown
- **Scope expired** — `scopeExpiry` in the past; `authorized` goes false
- **Query failure** — the fetchers throw; `composeRiskScore` catches and returns nulls

## 8. Verify it yourself

```bash
npm run underwrite                      # authorized
npm run underwrite -- gmx-perp 5000     # protocol not allowlisted
npm run underwrite -- curve 12000       # over position limit
npm run read:identity                   # full on-chain read-back
```

## 9. Not built yet — do not wire these

- Trade execution and the trade log (Phase 7, stretch)
- Treasury, settlements, USDC balances (Phase 5, not started)
- Reputation write-back (Phase 5)

Keep the "example data" banners on those screens. They are honest and the build plan
asks for it.
