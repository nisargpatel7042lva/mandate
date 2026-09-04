# Mandate — Architecture

> **Status:** Template — fill in during Phase 1 once deployment targets are confirmed.

## Overview

Mandate is an on-chain authority enforcement layer for autonomous DeFi trading agents.
An agent cannot exceed its declared permission scope, and its right to act is gated on
both its policy AND its live reputation score — enforced inside the swap execution itself.

## Components

### 1. Identity & Permissions (ENSv2, Sepolia)

> TODO Phase 1: confirm ENSv2 Enhanced Access Control contract addresses on Sepolia;
> document the exact record fields used for permission scope storage.

### 2. Reputation & Risk Signal (The Graph)

> TODO Phase 1: confirm Agent0/ERC-8004 subgraph ID and query schema;
> design the composition logic combining Agent0 data with our custom Mandate subgraph.

### 3. Enforcement & Execution (1inch SwapVM, self-deployed on Sepolia)

> TODO Phase 1: confirm SwapVM opcode registration pattern (`_runOpcode` vs `_instructions()`);
> confirm Aqua contract deployment on Sepolia (self-deploy required);
> document MandateGate opcode interface.

### 4. Settlement & Reputation Write-back (Circle Arc, Sepolia testnet)

> TODO Phase 1: confirm Arc testnet endpoint and SDK method signatures;
> document USDC settlement flow and reputation write-back trigger.

## Cross-Chain Architecture Decision

**ENSv2 Enhanced Access Control** is live on Sepolia only (beta).

**SwapVM** has no canonical Sepolia deployment from 1inch. Per `1inch/swap-vm` DEPLOY.md,
Sepolia is a supported self-deploy target (`ignition/parameters/chain-11155111.json`).

**Decision under review (confirm in Phase 1):** If we self-deploy Aqua + a custom SwapVM
router to Sepolia, both the ENSv2 permission record and MandateGate are on the same chain,
eliminating the need for a cross-chain PermissionMirror relay. If the Agent0/ERC-8004
subgraph is mainnet-only, the reputation score is still read off-chain and written into
an on-chain registry — confirm and document this in Phase 1.

**Fallback (PermissionMirror pattern):** If cross-chain is unavoidable, a `PermissionMirror`
contract on the SwapVM chain is kept in sync by a backend relayer watching the canonical
Sepolia ENSv2 record and the Graph reputation score. MandateGate reads PermissionMirror
synchronously on its own chain. The relayer is a sync mechanism, not a trust boundary.

## Data Flow

```
[Agent Decision]
      │
      ▼
[ENSv2 EAC Record] ──────────────────────────────┐
      │                                           │
[Graph: Agent0/ERC-8004] ──► [Reputation Score] ─┤
[Graph: Mandate Subgraph] ──►                    │
                                                  ▼
                                         [MandateGate Opcode]
                                                  │
                                    passes? ──────┤────── reverts
                                                  │
                                         [SwapVM Execution]
                                                  │
                                         [Arc/USDC Settlement]
                                                  │
                                         [Reputation Write-back]
```

## Deployed Addresses

> TODO Phase 1: fill in after deployments.

| Contract        | Chain   | Address |
|-----------------|---------|---------|
| Aqua            | Sepolia | TBD     |
| MandateRouter   | Sepolia | TBD     |
| MandateGate     | Sepolia | TBD     |
| PermissionStore | Sepolia | TBD     |
