// Mandate own subgraph client — queries our deployed Mandate subgraph on Subgraph Studio.
// Indexes PermissionSynced events from the PermissionMirror contract on Sepolia.

const MANDATE_SUBGRAPH_ID = process.env.NEXT_PUBLIC_MANDATE_SUBGRAPH_ID
const GRAPH_API_KEY = process.env.NEXT_PUBLIC_GRAPH_API_KEY

const MANDATE_ENDPOINT = GRAPH_API_KEY && MANDATE_SUBGRAPH_ID
  ? `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${MANDATE_SUBGRAPH_ID}`
  : null

export interface MandateAgentScope {
  id: string
  allowedProtocols: string
  allowedPositionTypes: number
  maxPositionSizeUsdc: string
  maxDailySpendUsdc: string
  expiry: string
  ensNode: string
  lastSyncedBlock: string
  lastSyncedAt: string
  syncCount: number
}

export interface MandatePermissionUpdate {
  id: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  ensNode: string
}

async function gqlFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!MANDATE_ENDPOINT) {
    throw new Error('NEXT_PUBLIC_GRAPH_API_KEY and NEXT_PUBLIC_MANDATE_SUBGRAPH_ID must be set')
  }

  const res = await fetch(MANDATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    // next.revalidate is a Next.js fetch extension; ignored in non-Next.js runtimes (MCP server)
    ...({ next: { revalidate: 30 } } as object),
  } as RequestInit)

  if (!res.ok) {
    throw new Error(`Mandate subgraph HTTP ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(`Mandate subgraph GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`)
  }
  if (!json.data) {
    throw new Error('Mandate subgraph returned empty data')
  }

  return json.data
}

export async function fetchAgentScope(agentAddress: string): Promise<MandateAgentScope | null> {
  const query = `
    query AgentScope($id: ID!) {
      agentScope(id: $id) {
        id
        allowedProtocols
        allowedPositionTypes
        maxPositionSizeUsdc
        maxDailySpendUsdc
        expiry
        ensNode
        lastSyncedBlock
        lastSyncedAt
        syncCount
      }
    }
  `
  const data = await gqlFetch<{ agentScope: MandateAgentScope | null }>(query, {
    id: agentAddress.toLowerCase(),
  })
  return data.agentScope
}

// Fetch recent permission updates for an agent (newest first, last 10).
export async function fetchRecentUpdates(agentAddress: string): Promise<MandatePermissionUpdate[]> {
  const query = `
    query RecentUpdates($agentId: String!, $first: Int!) {
      permissionUpdates(
        where: { agent: $agentId }
        orderBy: blockTimestamp
        orderDirection: desc
        first: $first
      ) {
        id
        blockNumber
        blockTimestamp
        transactionHash
        ensNode
      }
    }
  `
  const data = await gqlFetch<{ permissionUpdates: MandatePermissionUpdate[] }>(query, {
    agentId: agentAddress.toLowerCase(),
    first: 10,
  })
  return data.permissionUpdates
}
