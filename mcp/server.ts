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

import 'dotenv/config'
import http from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '../src/lib/mcp-tools.js'

const PORT = parseInt(process.env.MCP_SERVER_PORT ?? '3001', 10)


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
  console.log('  NEXT_PUBLIC_MANDATE_SUBGRAPH_URL  (or _ID, if published)')
})
