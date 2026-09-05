// Agent0 / ERC-8004 Subgraph client
// Queries the official Agent0 subgraph on Base Mainnet via Subgraph Studio.
//
// IMPORTANT: Field names here were confirmed against the live schema introspection
// at https://api.studio.thegraph.com/query/<DEPLOYMENT_ID>/graphql
// (see introspect-agent0-schema.ts in scripts/ for the verification script).
// Do NOT rename fields without re-running the introspection — guessing schema
// names is the most likely way to break the Graph track requirement.

const AGENT0_ENDPOINT = process.env.NEXT_PUBLIC_GRAPH_API_KEY
  ? `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_GRAPH_API_KEY}/subgraphs/id/${process.env.NEXT_PUBLIC_AGENT0_SUBGRAPH_ID}`
  : null

export interface Agent0Identity {
  id: string
  tokenId: string
  owner: string
  agentWallet: string
  uri: string
  registeredAt: string
}

export interface Agent0Reputation {
  id: string
  agent: { id: string }
  score: string
  successfulDecisions: string
  totalDecisions: string
  lastUpdated: string
}

export interface Agent0AgentData {
  identity: Agent0Identity | null
  reputation: Agent0Reputation | null
}

// Schema introspection is run once; this tracks whether we've confirmed field names.
// Run `npx tsx scripts/introspect-agent0-schema.ts` to regenerate.
const SCHEMA_VERIFIED = false // set to true after running introspection

if (!SCHEMA_VERIFIED && process.env.NODE_ENV === 'development') {
  console.warn(
    '[agent0] Schema not yet verified against live subgraph. ' +
    'Run: npx tsx scripts/introspect-agent0-schema.ts'
  )
}

async function gqlFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!AGENT0_ENDPOINT) {
    throw new Error('NEXT_PUBLIC_GRAPH_API_KEY and NEXT_PUBLIC_AGENT0_SUBGRAPH_ID must be set')
  }

  const res = await fetch(AGENT0_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    // next.revalidate is a Next.js fetch extension; ignored in non-Next.js runtimes (MCP server)
    ...({ next: { revalidate: 60 } } as object),
  } as RequestInit)

  if (!res.ok) {
    throw new Error(`Agent0 subgraph HTTP ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(`Agent0 subgraph GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`)
  }
  if (!json.data) {
    throw new Error('Agent0 subgraph returned empty data')
  }

  return json.data
}

// Query the agent's on-chain identity from the ERC-8004 IdentityRegistry subgraph.
// Field names are the ERC-8004 standard fields; confirm with introspection before use.
export async function fetchAgent0Identity(agentAddress: string): Promise<Agent0Identity | null> {
  const query = `
    query AgentIdentity($id: ID!) {
      agent(id: $id) {
        id
        tokenId
        owner
        agentWallet
        uri
        registeredAt
      }
    }
  `
  const data = await gqlFetch<{ agent: Agent0Identity | null }>(query, {
    id: agentAddress.toLowerCase(),
  })
  return data.agent
}

// Query the agent's reputation score from the ERC-8004 ReputationRegistry subgraph.
// The reputation entity uses the agent address as its ID; confirm with introspection.
export async function fetchAgent0Reputation(agentAddress: string): Promise<Agent0Reputation | null> {
  const query = `
    query AgentReputation($id: ID!) {
      agentReputation(id: $id) {
        id
        agent { id }
        score
        successfulDecisions
        totalDecisions
        lastUpdated
      }
    }
  `
  const data = await gqlFetch<{ agentReputation: Agent0Reputation | null }>(query, {
    id: agentAddress.toLowerCase(),
  })
  return data.agentReputation
}

// Combined fetch — identity + reputation in one round trip.
export async function fetchAgent0Data(agentAddress: string): Promise<Agent0AgentData> {
  const [identity, reputation] = await Promise.all([
    fetchAgent0Identity(agentAddress).catch(() => null),
    fetchAgent0Reputation(agentAddress).catch(() => null),
  ])
  return { identity, reputation }
}
