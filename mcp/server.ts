// Mandate MCP Server
// Provides tools for querying agent authority state composed from:
//   - Agent0/ERC-8004 Subgraph (Base Mainnet) — reputation and identity
//   - Mandate Subgraph (Sepolia) — on-chain permission scope history
//
// Transport: Streamable HTTP (stateless) — clients POST to /mcp
// Port: MCP_SERVER_PORT env var (default 3001)
//
// To run: npx tsx mcp/server.ts
// To query: see mcp/example-query.ts for a sample client

import http from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { composeRiskScore, PROTOCOL_BITS, TRUST_THRESHOLD } from '../src/lib/underwriting.js'
import { fetchAgent0Data } from '../src/lib/agent0.js'
import { fetchAgentScope, fetchRecentUpdates } from '../src/lib/mandate-subgraph.js'

const PORT = parseInt(process.env.MCP_SERVER_PORT ?? '3001', 10)

function createMcpServer(): McpServer {
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
    { agentAddress: z.string().describe('The agent\'s wallet address (0x...)') },
    async ({ agentAddress }) => {
      const [riskResult, agent0Data, scope, recentUpdates] = await Promise.all([
        composeRiskScore(agentAddress),
        fetchAgent0Data(agentAddress).catch(() => null),
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

      const result = await composeRiskScore(agentAddress, {
        protocol,
        amountUsdc: amountRaw,
        currentDailySpendUsdc: dailySpendRaw,
      })

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
          formula: `${result.erc8004Score} × 0.60 + ${result.mandateHistoryScore} × 0.40 = ${result.trustScore}`,
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
      const result = await composeRiskScore(agentAddress)

      const output = {
        agentAddress,
        trustScore: result.trustScore,
        breakdown: {
          erc8004Score: result.erc8004Score,
          erc8004Weight: '60%',
          mandateHistoryScore: result.mandateHistoryScore,
          mandateHistoryWeight: '40%',
          formula: `${result.erc8004Score} × 0.60 + ${result.mandateHistoryScore} × 0.40 = ${result.trustScore}`,
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

// ── HTTP server ──────────────────────────────────────────────────────────────
// Stateless mode: each POST to /mcp is handled independently.
// For demos, this is simpler than stateful session management.

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', server: 'mandate-authority-mcp', version: '0.1.0' }))
    return
  }

  if (req.url !== '/mcp') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  // Parse body for POST requests
  let body = ''
  for await (const chunk of req) {
    body += chunk
  }

  let parsedBody: unknown
  try {
    parsedBody = body ? JSON.parse(body) : undefined
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  })

  const mcp = createMcpServer()
  await mcp.connect(transport)
  await transport.handleRequest(req, res, parsedBody)
  await mcp.close()
})

server.listen(PORT, () => {
  console.log(`Mandate MCP server listening on http://localhost:${PORT}`)
  console.log(`  POST /mcp  — MCP Streamable HTTP endpoint`)
  console.log(`  GET  /health — health check`)
  console.log()
  console.log('Tools available:')
  console.log('  get_agent_authority  — full authority profile')
  console.log('  check_permission     — specific trade authorization check')
  console.log('  get_risk_score       — trust score only')
  console.log()
  console.log('Required env:')
  console.log('  NEXT_PUBLIC_GRAPH_API_KEY')
  console.log('  NEXT_PUBLIC_AGENT0_SUBGRAPH_ID')
  console.log('  NEXT_PUBLIC_MANDATE_SUBGRAPH_ID')
})
