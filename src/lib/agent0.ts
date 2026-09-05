// Agent0 / ERC-8004 Subgraph client
//
// Field names below were confirmed against the live schema by introspection on
// 2026-09-06 (`npx tsx scripts/introspect-agent0-schema.ts`). Do NOT rename them
// without re-running it — the earlier version of this file used plausible-looking
// names (`tokenId`, `uri`, `registeredAt`, an `agentReputation` entity) that do
// not exist, and every call threw.
//
// Scope of this subgraph, verified live: it indexes exactly one protocol,
// Base Mainnet (chainId 8453, identityRegistry 0x8004a169...). Our own agent is
// on Sepolia (11155111, registry 0x8004A818...) and therefore has no row here.
// So Agent0 is used for what it can actually answer: the live ERC-8004
// population, as a baseline to contextualise our own agent's record.

// Resolved per call rather than at module load: a module-level read runs before
// dotenv has populated process.env in script entrypoints, which silently yields
// a null endpoint and makes every query look like "no data".
function agent0Endpoint(): string | null {
  const id = process.env.NEXT_PUBLIC_AGENT0_SUBGRAPH_ID
  const key = process.env.NEXT_PUBLIC_GRAPH_API_KEY
  return key && id ? `https://gateway.thegraph.com/api/${key}/subgraphs/id/${id}` : null
}

/** The chain this subgraph indexes. Anything else returns no rows. */
export const AGENT0_INDEXED_CHAIN_ID = '8453'

// ─── Types (mirror the live schema) ──────────────────────────────────────────

export interface Agent0Agent {
  id: string // "<chainId>:<agentId>"
  chainId: string
  agentId: string
  agentURI: string | null
  owner: string
  agentWallet: string
  createdAt: string
  lastActivity: string | null
  totalFeedback: string
}

export interface Agent0Feedback {
  id: string
  value: string // BigDecimal
  tag1: string | null
  tag2: string | null
  isRevoked: boolean
  clientAddress: string
  createdAt: string
}

/** Derived reputation signal — computed here, not a subgraph field. */
export interface Agent0Reputation {
  found: boolean
  totalFeedback: number
  sampled: number
  distinctClients: number
  meanValue: number
  revokedCount: number
  revocationRate: number
  lastActivity: number | null
}

/** Live ecosystem baseline used to contextualise a single agent. */
export interface Agent0Population {
  sampleSize: number
  feedbackCounts: number[]
  medianFeedback: number
}

export interface Agent0AgentData {
  identity: Agent0Agent | null
  reputation: Agent0Reputation
  population: Agent0Population | null
}

// ─── Transport ───────────────────────────────────────────────────────────────

async function gqlFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const endpoint = agent0Endpoint()
  if (!endpoint) {
    throw new Error(
      'NEXT_PUBLIC_GRAPH_API_KEY and NEXT_PUBLIC_AGENT0_SUBGRAPH_ID must be set',
    )
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    // next.revalidate is a Next.js fetch extension; ignored in other runtimes.
    ...({ next: { revalidate: 60 } } as object),
  } as RequestInit)

  if (!res.ok) throw new Error(`Agent0 subgraph HTTP ${res.status}: ${await res.text()}`)

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(`Agent0 subgraph GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`)
  }
  if (!json.data) throw new Error('Agent0 subgraph returned empty data')
  return json.data
}

/** Agent ids are composite: "<chainId>:<agentId>". */
export const agent0Key = (chainId: string | number, agentId: string | number) =>
  `${chainId}:${agentId}`

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchAgent0Agent(
  chainId: string | number,
  agentId: string | number,
): Promise<Agent0Agent | null> {
  const query = `
    query AgentIdentity($id: ID!) {
      agent(id: $id) {
        id
        chainId
        agentId
        agentURI
        owner
        agentWallet
        createdAt
        lastActivity
        totalFeedback
      }
    }
  `
  const data = await gqlFetch<{ agent: Agent0Agent | null }>(query, {
    id: agent0Key(chainId, agentId),
  })
  return data.agent
}

export async function fetchAgent0Feedback(
  chainId: string | number,
  agentId: string | number,
  limit = 100,
): Promise<Agent0Feedback[]> {
  const query = `
    query AgentFeedback($agent: String!, $limit: Int!) {
      feedbacks(
        first: $limit
        where: { agent: $agent }
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        value
        tag1
        tag2
        isRevoked
        clientAddress
        createdAt
      }
    }
  `
  const data = await gqlFetch<{ feedbacks: Agent0Feedback[] }>(query, {
    agent: agent0Key(chainId, agentId),
    limit,
  })
  return data.feedbacks ?? []
}

/**
 * A live sample of the ERC-8004 population, used as a reference distribution.
 * Ordered by activity so the sample spans the active end of the ecosystem.
 */
export async function fetchAgent0Population(sampleSize = 100): Promise<Agent0Population> {
  const query = `
    query Population($limit: Int!) {
      agents(first: $limit, orderBy: totalFeedback, orderDirection: desc) {
        totalFeedback
      }
    }
  `
  const data = await gqlFetch<{ agents: Array<{ totalFeedback: string }> }>(query, {
    limit: sampleSize,
  })
  const counts = (data.agents ?? []).map((a) => Number(a.totalFeedback)).sort((a, b) => a - b)
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0
  return { sampleSize: counts.length, feedbackCounts: counts, medianFeedback: median }
}

// ─── Derivation ──────────────────────────────────────────────────────────────

/**
 * Reduce raw feedback rows to a reputation signal.
 *
 * Distinct clients matters more than raw volume: one counterparty can emit an
 * unlimited number of positive rows, so a high count from a single address is a
 * sybil pattern rather than evidence of trust. Both are reported so the caller
 * can weigh them.
 */
export function deriveReputation(
  agent: Agent0Agent | null,
  feedback: Agent0Feedback[],
): Agent0Reputation {
  if (!agent) {
    return {
      found: false,
      totalFeedback: 0,
      sampled: 0,
      distinctClients: 0,
      meanValue: 0,
      revokedCount: 0,
      revocationRate: 0,
      lastActivity: null,
    }
  }

  const live = feedback.filter((f) => !f.isRevoked)
  const revoked = feedback.length - live.length
  const meanValue = live.length
    ? live.reduce((sum, f) => sum + Number(f.value), 0) / live.length
    : 0

  return {
    found: true,
    totalFeedback: Number(agent.totalFeedback),
    sampled: feedback.length,
    distinctClients: new Set(feedback.map((f) => f.clientAddress.toLowerCase())).size,
    meanValue,
    revokedCount: revoked,
    revocationRate: feedback.length ? revoked / feedback.length : 0,
    lastActivity: agent.lastActivity ? Number(agent.lastActivity) : null,
  }
}

/** Percentile of `value` within the sampled population, 0–100. */
export function percentileOf(value: number, population: Agent0Population): number {
  if (!population.sampleSize) return 0
  const below = population.feedbackCounts.filter((c) => c <= value).length
  return Math.round((below / population.sampleSize) * 100)
}

// ─── Combined fetch ──────────────────────────────────────────────────────────

export async function fetchAgent0Data(
  chainId: string | number,
  agentId: string | number,
): Promise<Agent0AgentData> {
  const [identity, population] = await Promise.all([
    fetchAgent0Agent(chainId, agentId).catch(() => null),
    fetchAgent0Population().catch(() => null),
  ])

  const feedback = identity
    ? await fetchAgent0Feedback(chainId, agentId).catch(() => [])
    : []

  return { identity, reputation: deriveReputation(identity, feedback), population }
}
