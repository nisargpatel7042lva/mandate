# Phase 3 Prompt (verbatim, pasted 2026-09-05)

Phase 3 — Composed Graph data layer + underwriting logic (Sept 5–7)
Track: Backend (lead). Run this under the Loop Protocol.

Goal: the actual trust-and-risk composition — this is where the Graph track prize lives.

Sub-tasks:

1. Agent0/ERC-8004 Subgraph query (live, not mocked)
   - Query the real, live Agent0/ERC-8004 Subgraph for our registered test agent's reputation
     data via Subgraph Studio (live, not mocked — this is a hard requirement for the Graph track).
   - Confirm the actual schema fields by reading the subgraph's GraphQL schema, don't guess
     field names.
   - Subgraph Studio deployment ID: 43s9hQRurMGjuYnC1r2ZwS6xSQktbFyXMPMqGKUFJojb (Base Mainnet).
   - Write src/lib/agent0.ts — typed query function using NEXT_PUBLIC_GRAPH_API_KEY.

2. Mandate own subgraph (deploy and index)
   - Write subgraph/schema.graphql — entities: AgentScope (current permission state),
     PermissionUpdate (history of syncs), BlockedAttempt (future — MandateGate events).
   - Write subgraph/subgraph.yaml — manifest targeting PermissionMirror on Sepolia;
     placeholder address until the contract is deployed in Phase 4.
   - Write subgraph/src/permission-mirror.ts — AssemblyScript mapping for PermissionSynced event.
   - Deploy to Subgraph Studio; trigger at least one real PermissionSynced event by running
     the relayer-stub.ts script; confirm the event is indexed.

3. Underwriting composition logic
   - Write src/lib/underwriting.ts — composeRiskScore(agentAddress): fetches from both
     subgraphs, applies documented formula, returns a trust score 0–100 + authorization decision.
   - Scoring formula (document in code and in ARCHITECTURE.md):
     * ERC8004_score (0–100): from Agent0 subgraph reputation data
     * mandate_own_score (0–100): from own subgraph (1 - blockedRate) * 100; neutral 70 if new
     * TrustScore = ERC8004_score * 0.60 + mandate_own_score * 0.40
     * Authorization: TrustScore >= 60 AND protocol in allowlist AND amount <= maxPosition
       AND dailySpend + amount <= maxDailySpend AND block.timestamp < expiry

4. MCP server (public, proved live)
   - Write mcp/server.ts — MCP server using @modelcontextprotocol/sdk, HTTP/SSE transport.
   - Expose tools: get_agent_authority(agentAddress), check_permission(agent, protocol, amount),
     get_risk_score(agentAddress).
   - Each tool fetches from live subgraphs (no fixtures).
   - Run the server and query it with an actual tool call; include the real transcript in the
     phase report (not a description of what it would do).

Definition of done:
- Querying the MCP server about a real registered test agent returns a real, composed answer
  sourced from live Subgraph Studio data — demonstrate this with an actual transcript in the
  phase report, not a description of what it would do.
- Own subgraph is deployed to Subgraph Studio with at least one indexed PermissionSynced event.
- Underwriting formula is documented in ARCHITECTURE.md.
- All code type-checks; next build clean.
- Committed in logical chunks; AI_USAGE.md updated.

Blockers that gate the live-run steps:
- NEXT_PUBLIC_GRAPH_API_KEY (Subgraph Studio API key)
- NEXT_PUBLIC_AGENT0_SUBGRAPH_ID (confirm or override the Base Mainnet ID above)
- PRIVATE_KEY (for triggering PermissionSynced events via the relayer)
- SEPOLIA_RPC_URL (Sepolia endpoint)
- Subgraph Studio deploy key (for `graph deploy`)
