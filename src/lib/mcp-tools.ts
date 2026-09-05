// Mandate MCP tools — shared by both entrypoints:
//   - mcp/server.ts            standalone Node server for local development
//   - src/app/api/mcp/route.ts the public deployment, served with the frontend
//
// Composes two live Graph products:
//   - Agent0/ERC-8004 subgraph (Base Mainnet) — the ERC-8004 agent population
//   - Mandate subgraph (Sepolia)              — this agent's permission scope

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { composeRiskScore, PROTOCOL_BITS, TRUST_THRESHOLD } from './underwriting'
import { fetchAgent0Data, AGENT0_INDEXED_CHAIN_ID } from './agent0'
import { fetchAgentScope, fetchRecentUpdates } from './mandate-subgraph'

// Agent0 ids are "<chainId>:<agentId>" and that subgraph indexes Base Mainnet
// only, so an agent registered elsewhere has no row there. Callers may pass an
// id explicitly; otherwise fall back to AGENT_ID from the environment.
const DEFAULT_AGENT0_ID = process.env.AGENT_ID?.trim() || undefined

/** Renders the composite formula, keeping "unknown" distinct from zero. */
function formulaText(erc: number | null, mandate: number, total: number): string {
  return erc === null
    ? `no ERC-8004 record — weights renormalised onto Mandate history: ${mandate} = ${total}`
    : `${erc} × 0.60 + ${mandate} × 0.40 = ${total}`
}

export function createMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'mandate-authority',
    version: '0.1.0',
  })

  // ── Tool: get_agent_authority ─────────────────────────────────────────────
  // Returns the full composed authority profile for an agent address:
  // trust score, permission scope, recent sync history.
  mcp.tool(
    'get_agent_authority',
    'Get the composed authority profile for a Mandate agent: trust score, permission scope, \
recent sync history. Combines Agent0/ERC-8004 reputation (Base Mainnet) with the agent\'s \
on-chain permission scope from the Mandate subgraph (Sepolia).',
    {
      agentAddress: z.string().describe('The agent\'s wallet address (0x...)'),
      agentId: z
        .string()
        .optional()
        .describe('ERC-8004 agent id for the Agent0 lookup. Optional; that subgraph indexes Base Mainnet only.'),
    },
    async ({ agentAddress, agentId }) => {
      const a0Id = agentId ?? DEFAULT_AGENT0_ID
      const [riskResult, agent0Data, scope, recentUpdates] = await Promise.all([
        composeRiskScore(agentAddress, undefined, a0Id),
        a0Id
          ? fetchAgent0Data(AGENT0_INDEXED_CHAIN_ID, a0Id).catch(() => null)
          : Promise.resolve(null),
        fetchAgentScope(agentAddress).catch(() => null),
        fetchRecentUpdates(agentAddress).catch(() => []),
      ])

      const output = {
        agentAddress,
        trustScore: riskResult.trustScore,
        erc8004Score: riskResult.erc8004Score,
        mandateHistoryScore: riskResult.mandateHistoryScore,
        authorized: riskResult.authorized,
        reasons: riskResult.reasons,
        identity: agent0Data?.identity ?? null,
        reputation: agent0Data?.reputation ?? null,
        permissionScope: scope
          ? {
              allowedProtocols: scope.allowedProtocols,
              allowedPositionTypes: scope.allowedPositionTypes,
              maxPositionSizeUsdc: scope.maxPositionSizeUsdc,
              maxDailySpendUsdc: scope.maxDailySpendUsdc,
              expiry: scope.expiry,
              expiryHuman: new Date(parseInt(scope.expiry, 10) * 1000).toISOString(),
              syncCount: scope.syncCount,
              lastSyncedAt: new Date(parseInt(scope.lastSyncedAt, 10) * 1000).toISOString(),
            }
          : null,
        recentSyncs: recentUpdates.slice(0, 5).map(u => ({
          block: u.blockNumber,
          timestamp: new Date(parseInt(u.blockTimestamp, 10) * 1000).toISOString(),
          txHash: u.transactionHash,
        })),
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      }
    }
  )

  // ── Tool: check_permission ───────────────────────────────────────────────
  // Answers: "can this agent make this specific trade right now?"
  mcp.tool(
    'check_permission',
    'Check whether a specific trade is authorized for an agent: protocol, amount, \
and current daily spend are checked against the agent\'s on-chain permission scope \
and composed trust score.',
    {
      agentAddress: z.string().describe('The agent\'s wallet address (0x...)'),
      protocol: z.string().describe(
        `Protocol identifier. Supported: ${Object.keys(PROTOCOL_BITS).join(', ')}`
      ),
      amountUsdc: z.string().describe('Trade amount in USDC, as a decimal string (e.g. "5000.00")'),
      currentDailySpendUsdc: z.string().default('0').describe(
        'Amount already spent today in USDC (default 0)'
      ),
    },
    async ({ agentAddress, protocol, amountUsdc, currentDailySpendUsdc }) => {
      const amountRaw = BigInt(Math.round(parseFloat(amountUsdc) * 1_000_000))
      const dailySpendRaw = BigInt(Math.round(parseFloat(currentDailySpendUsdc) * 1_000_000))

      const result = await composeRiskScore(
        agentAddress,
        { protocol, amountUsdc: amountRaw, currentDailySpendUsdc: dailySpendRaw },
        DEFAULT_AGENT0_ID,
      )

      const output = {
        agentAddress,
        protocol,
        amountUsdc,
        authorized: result.authorized,
        trustScore: result.trustScore,
        trustThreshold: TRUST_THRESHOLD,
        reasons: result.reasons,
        breakdown: {
          erc8004Score: result.erc8004Score,
          mandateHistoryScore: result.mandateHistoryScore,
          formula: formulaText(result.erc8004Score, result.mandateHistoryScore, result.trustScore),
        },
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      }
    }
  )

  // ── Tool: get_risk_score ─────────────────────────────────────────────────
  // Quick score-only query, no permission check.
  mcp.tool(
    'get_risk_score',
    'Get the composed trust score for a Mandate agent (0–100). \
Returns the weighted combination of ERC-8004 reputation and Mandate on-chain history.',
    { agentAddress: z.string().describe('The agent\'s wallet address (0x...)') },
    async ({ agentAddress }) => {
      const result = await composeRiskScore(agentAddress, undefined, DEFAULT_AGENT0_ID)

      const output = {
        agentAddress,
        trustScore: result.trustScore,
        breakdown: {
          erc8004Score: result.erc8004Score,
          erc8004Weight: result.erc8004Score === null ? 'n/a (no record)' : '60%',
          mandateHistoryScore: result.mandateHistoryScore,
          mandateHistoryWeight: result.erc8004Score === null ? '100% (renormalised)' : '40%',
          formula: formulaText(result.erc8004Score, result.mandateHistoryScore, result.trustScore),
        },
        meetsThreshold: result.trustScore >= TRUST_THRESHOLD,
        threshold: TRUST_THRESHOLD,
        dataSourcesFound: {
          agent0Identity: result.agentFound,
          agent0Reputation: result.reputationFound,
          mandateScope: result.scopeFound,
        },
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      }
    }
  )

  return mcp
}
