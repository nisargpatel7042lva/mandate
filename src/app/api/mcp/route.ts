/**
 * Public MCP endpoint — POST /api/mcp
 *
 * The Graph's AI Tooling track asks for a publicly reachable MCP server. Serving
 * it from the Next.js app means it deploys with the frontend and shares its
 * lifetime, rather than needing a second host kept alive for the demo.
 *
 * Uses the SDK's Web-standard transport (Request -> Response) rather than the
 * Node one, because App Router route handlers work in Web primitives.
 *
 * Stateless: each request builds a fresh server and transport, so no session
 * state has to survive between serverless invocations.
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/lib/mcp-tools'

// Needs the Node runtime: the underlying data clients use node APIs.
export const runtime = 'nodejs'
// Every request reads live chain and subgraph state.
export const dynamic = 'force-dynamic'

async function handle(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  })
  const mcp = createMcpServer()
  await mcp.connect(transport)

  // Deliberately not closing the server here. handleRequest returns a Response
  // whose body is still streaming; closing in a finally block tears the stream
  // down before anything is written and the client sees an empty 200. The
  // server is per-request and short-lived, so it goes away with the invocation.
  return transport.handleRequest(req)
}

export async function POST(req: Request): Promise<Response> {
  return handle(req)
}

export async function GET(): Promise<Response> {
  // Not an MCP transport request — describe the endpoint so a human hitting it
  // in a browser gets something useful instead of a protocol error.
  return Response.json({
    server: 'mandate-authority',
    version: '0.1.0',
    transport: 'streamable-http',
    endpoint: '/api/mcp',
    method: 'POST',
    tools: ['get_agent_authority', 'check_permission', 'get_risk_score'],
    composes: [
      'Agent0/ERC-8004 subgraph (Base Mainnet)',
      'Mandate subgraph (Sepolia)',
    ],
  })
}
