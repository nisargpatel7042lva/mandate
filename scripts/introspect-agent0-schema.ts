// Introspect the live Agent0/ERC-8004 subgraph schema via Subgraph Studio.
// Run this BEFORE writing any GraphQL queries against agent0.ts to confirm real field names.
//
// Usage: npx tsx scripts/introspect-agent0-schema.ts
//
// Requires: NEXT_PUBLIC_GRAPH_API_KEY and NEXT_PUBLIC_AGENT0_SUBGRAPH_ID in .env

import 'dotenv/config'

const API_KEY = process.env.NEXT_PUBLIC_GRAPH_API_KEY
const SUBGRAPH_ID = process.env.NEXT_PUBLIC_AGENT0_SUBGRAPH_ID

if (!API_KEY || !SUBGRAPH_ID) {
  console.error('Error: NEXT_PUBLIC_GRAPH_API_KEY and NEXT_PUBLIC_AGENT0_SUBGRAPH_ID must be set')
  process.exit(1)
}

const ENDPOINT = `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID}`

const INTROSPECTION_QUERY = `
  {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`

async function main() {
  console.log(`Introspecting Agent0 subgraph: ${SUBGRAPH_ID}`)
  console.log()

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  })

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const json = (await res.json()) as {
    data?: { __schema: { types: Array<{ name: string; kind: string; fields: Array<{ name: string; type: { name: string; kind: string; ofType: { name: string; kind: string } | null } }> | null }> } }
    errors?: Array<{ message: string }>
  }

  if (json.errors?.length) {
    console.error('GraphQL errors:', json.errors)
    process.exit(1)
  }

  const types = json.data!.__schema.types.filter(
    t => t.kind === 'OBJECT' && !t.name.startsWith('__')
  )

  console.log('=== Agent0 Subgraph Entity Types ===')
  console.log()
  for (const type of types) {
    if (!type.fields) continue
    console.log(`${type.name}:`)
    for (const field of type.fields) {
      const typeName = field.type.ofType?.name ?? field.type.name
      console.log(`  ${field.name}: ${typeName}`)
    }
    console.log()
  }

  // Print the types we specifically need for agent0.ts
  const agentType = types.find(t => t.name.toLowerCase() === 'agent')
  const reputationType = types.find(t =>
    t.name.toLowerCase().includes('reputation')
  )

  console.log()
  console.log('=== Fields to confirm in src/lib/agent0.ts ===')
  console.log()
  console.log('Agent entity:', agentType?.fields?.map(f => f.name).join(', ') ?? 'NOT FOUND')
  console.log('Reputation entity:', reputationType?.name, reputationType?.fields?.map(f => f.name).join(', ') ?? 'NOT FOUND')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
