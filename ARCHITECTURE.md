# Mandate — Architecture

> **Status:** Phase 2 UI complete. Phase 3 data layer skeleton built — live run awaits credentials.

## Overview

Mandate is an on-chain authority enforcement layer for autonomous DeFi trading agents.
An agent cannot exceed its declared permission scope, and its right to act is gated on
both its policy AND its live reputation score — enforced inside the swap execution itself.

## Components

### 1. Identity & Permissions (ENSv2, Sepolia) — Phase 1 ✓

**ERC-8004 Identity Registry** (`0x8004A818BFB912233c491871b3d84c89A494BD9e` on Sepolia)
- Agents register via `register(agentURI)` → mints an ERC-721 NFT with a unique `agentId`
- `agentURI` points to a publicly resolvable JSON registration file
- `ownerOf(agentId)` = controller EOA; `getAgentWallet(agentId)` = execution wallet

**ENSv2 Permission Schema** (Sepolia dedicated resolver `0xa20b41dc7336c4d974e3c9a6ea01b77647559c46`)
- Each agent gets an ENS subname: `<agent>.mandate.eth`
- Two text records store the machine-readable permission scope:
  - `mandate.permissions` — JSON: allowedProtocols (array), allowedPositionTypes (array),
    maxPositionSizeUsdc (string, 6 decimals), maxDailySpendUsdc (string, 6 decimals),
    expiryTimestamp (unix seconds)
  - `mandate.policy` — human-readable policy summary for auditors / UI
- Chosen over ENSv2 EAC because standard `setText`/`text` is simpler, auditable, and
  readable by any ENS tooling without EAC bitmask schema uncertainty.

**PermissionMirror** (`contracts/PermissionMirror.sol`, not yet deployed)
- Kept as an architecture artifact for the cross-chain fallback pattern (see below)
- In the single-chain prototype, MandateGate reads ENSv2 directly; PermissionMirror
  becomes relevant if the execution chain differs from Sepolia.

### 2. Reputation & Risk Signal (The Graph) — Phase 3 skeleton ✓, live run pending

**ERC-8004 Reputation Registry** (`0x8004B663056A597Dffe9eCcC1965A193B7388713` on Sepolia)
- `getSummary(agentId, clientAddresses, tag1, tag2)` → feedback count + weighted score

**Subgraph queries (src/lib/agent0.ts, src/lib/mandate-subgraph.ts):**
- Agent0/ERC-8004 subgraph: Base Mainnet deployment ID `43s9hQRurMGjuYnC1r2ZwS6xSQktbFyXMPMqGKUFJojb`
  — field names must be verified via `scripts/introspect-agent0-schema.ts` before live queries.
- Mandate subgraph (subgraph/): indexes PermissionMirror.PermissionSynced events on Sepolia.
  Entities: AgentScope (current state), PermissionUpdate (history). Not yet deployed.

**Underwriting formula (src/lib/underwriting.ts):**

```
TrustScore = ERC8004_score × 0.60 + MandateHistory_score × 0.40

ERC8004_score (0–100):
  = (successfulDecisions / totalDecisions) × 100
  = 0 if agent has no reputation record (unverified agent — must earn trust)

MandateHistory_score (0–100):
  Interim (Phase 3): scope freshness proxy
    = 70  if last synced within 24h
    = linear decay to 0 over days 1–7 of staleness
    = 70  if no Mandate subgraph record (new agent neutral bonus)
  Full (Phase 4+): (1 - blockedRate) × 100 once MandateGate events are indexed

Authorization decision (all must hold):
  1. TrustScore ≥ 60
  2. protocol bitmask has the requested protocol bit set
  3. amount ≤ maxPositionSizeUsdc
  4. currentDailySpend + amount ≤ maxDailySpendUsdc
  5. block.timestamp < scope.expiry
```

**MCP server (mcp/server.ts):**
- Transport: Streamable HTTP (stateless), port MCP_SERVER_PORT (default 3001)
- Tools: `get_agent_authority`, `check_permission`, `get_risk_score`
- Each tool fetches from live subgraphs — no fixtures

### 3. Enforcement & Execution (1inch SwapVM, self-deployed on Sepolia) — Phase 2

**MandateGate** — custom SwapVM opcode
- Reads agent permission scope from ENSv2 resolver (same chain, synchronous)
- Reads agent reputation score from ERC-8004 Reputation Registry
- Reverts if: scope expired, protocol not allowed, position size exceeded, reputation below threshold

**SwapVM Router** — to be self-deployed on Sepolia per `1inch/swap-vm` DEPLOY.md
- Opcode registration: `_runOpcode` dispatcher pattern (confirmed from `src/SwapVM.sol`)

### 4. Settlement & Reputation Write-back (Circle Arc, Sepolia) — Phase 2

Arc Agent Stack SDK → USDC settlement after approved trades. Reputation write-back to
ERC-8004 Reputation Registry on settled trades. Testnet endpoint TBD from Circle docs.

---

## Cross-Chain Architecture Decision (Phase 1 Resolved)

**Single-chain prototype on Sepolia** — chosen because:
- ENSv2 is live on Sepolia (beta)
- SwapVM is self-deployed on Sepolia
- ENSv2 permission records and MandateGate are on the same chain — no relay needed
- ERC-8004 registries are deployed on Sepolia

**PermissionMirror pattern (available if needed):**
If the execution chain ever differs from Sepolia, `contracts/PermissionMirror.sol` + the
relayer in `scripts/relayer-stub.ts` implement the cross-chain sync. The relayer watches
ENSv2 text record changes and calls `PermissionMirror.sync()` on the execution chain.
MandateGate then reads from PermissionMirror instead of ENSv2 directly.

---

## Data Flow

```
[Agent Decision]
      │
      ▼
[ENSv2 Text Record]  ←── mandate.permissions (JSON scope)
  testagent.mandate.eth  mandate.policy (human summary)
      │
      ├──── permission scope
      │
[ERC-8004 Reputation Registry]
      │
      ├──── reputation score + feedback count
      │
      ▼
[MandateGate Opcode]  ←── executes inside SwapVM bytecode
      │
 passes? ──── reverts (OutOfScope / LowReputation / Expired)
      │
[SwapVM Execution]
      │
[Arc/USDC Settlement]
      │
[Reputation Write-back → ERC-8004]
```

---

## Deployed Addresses (Sepolia)

| Contract                  | Address                                      | Source |
|---------------------------|----------------------------------------------|--------|
| ERC-8004 IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | erc-8004/erc-8004-contracts |
| ERC-8004 ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | erc-8004/erc-8004-contracts |
| ENSv2 ethRegistrar        | `0x3334f0ebcbc4b5b7067f3aff25c6da8973690d54` | ensjs v5 dist/clients/l2.d.ts |
| ENSv2 ensV2EthRegistry    | `0xF332544e6234f1CA149907D0d4658afD5feB6831` | ensjs v5 dist/clients/l2.d.ts |
| ENSv2 dedicatedResolver   | `0xa20b41dc7336c4d974e3c9a6ea01b77647559c46` | ensjs v5 dist/clients/l2.d.ts |
| ENSv2 testnet USDC        | `0x7Fc21ceb0C5003576ab5E101eB240c2b822c95d2` | ensjs v5 dist/clients/l2.d.ts |
| Aqua                      | TBD — self-deploy in Phase 2                 | |
| MandateRouter (SwapVM)    | TBD — self-deploy in Phase 2                 | |
| MandateGate               | TBD — Phase 2                                | |
| PermissionMirror          | TBD — Phase 2 (if cross-chain needed)        | |
