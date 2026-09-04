/**
 * Read an ERC-8004 identity and ENSv2 permission records from Sepolia.
 * Prints live on-chain data only — no local state.
 *
 * Requires:
 *   SEPOLIA_RPC_URL=https://...
 *   AGENT_ID=<uint256 from register-identity.ts>
 *   ENS_NAME=testagent.mandate.eth
 *
 * Usage: npx tsx scripts/read-identity.ts
 */

import { createPublicClient, http, namehash, type Abi } from 'viem'
import { sepolia } from 'viem/chains'
import {
  ERC8004_IDENTITY_REGISTRY,
  ERC8004_REPUTATION_REGISTRY,
  ENS_PUBLIC_RESOLVER_SEPOLIA,
  IDENTITY_REGISTRY_ABI,
  PUBLIC_RESOLVER_ABI,
  MANDATE_PERMISSIONS_KEY,
  MANDATE_POLICY_KEY,
} from './lib/constants.js'
import { readContract } from './lib/client.js'

if (!process.env.SEPOLIA_RPC_URL) throw new Error('SEPOLIA_RPC_URL env var is required')

const AGENT_ID = BigInt(process.env.AGENT_ID ?? '1')
const ENS_NAME = process.env.ENS_NAME ?? 'testagent.mandate.eth'

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
})

// Minimal Reputation Registry ABI — source: erc-8004/erc-8004-contracts README
const REPUTATION_REGISTRY_ABI: Abi = [
  {
    name: 'getSummary',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'bytes32' },
      { name: 'tag2', type: 'bytes32' },
    ],
    outputs: [
      { name: 'count', type: 'uint256' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ],
  },
]

async function main() {
  console.log('=== Mandate Identity Read-back (live Sepolia) ===')
  console.log('Network:    Sepolia (chain ID 11155111)')
  console.log('agentId:   ', AGENT_ID.toString())
  console.log('ENS name:  ', ENS_NAME)
  console.log()

  // ── ERC-8004 Identity ─────────────────────────────────────────────────────
  console.log('─── ERC-8004 Identity Registry ───')
  console.log('Registry:', ERC8004_IDENTITY_REGISTRY)

  const tokenUri = await readContract<string>(publicClient, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'tokenURI',
    args: [AGENT_ID],
  })
  const owner = await readContract<string>(publicClient, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [AGENT_ID],
  })
  const agentWallet = await readContract<string>(publicClient, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getAgentWallet',
    args: [AGENT_ID],
  })

  console.log('tokenURI (on-chain):    ', tokenUri)
  console.log('owner (on-chain):       ', owner)
  console.log('agentWallet (on-chain): ', agentWallet)

  // ── ERC-8004 Reputation (empty for a fresh agent — confirms the read path works)
  console.log('\n─── ERC-8004 Reputation Registry ───')
  console.log('Registry:', ERC8004_REPUTATION_REGISTRY)

  try {
    const result = await readContract<[bigint, bigint, number]>(publicClient, {
      address: ERC8004_REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getSummary',
      args: [AGENT_ID, [], `0x${'0'.repeat(64)}`, `0x${'0'.repeat(64)}`],
    })
    const [count, summaryValue, summaryValueDecimals] = result
    console.log('Feedback count:', count.toString())
    console.log('Summary value: ', summaryValue.toString(), '(decimals:', summaryValueDecimals, ')')
  } catch (err: any) {
    console.log('Reputation read error (expected for fresh agent):', err.shortMessage ?? err.message)
  }

  // ── ENSv2 Permission Records ──────────────────────────────────────────────
  console.log('\n─── ENSv2 Text Records ───')
  console.log('Resolver:', ENS_PUBLIC_RESOLVER_SEPOLIA)
  console.log('Name:    ', ENS_NAME)

  const node = namehash(ENS_NAME)
  console.log('namehash:', node)

  const permissionsRaw = await readContract<string>(publicClient, {
    address: ENS_PUBLIC_RESOLVER_SEPOLIA,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'text',
    args: [node, MANDATE_PERMISSIONS_KEY],
  })
  const policyRaw = await readContract<string>(publicClient, {
    address: ENS_PUBLIC_RESOLVER_SEPOLIA,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'text',
    args: [node, MANDATE_POLICY_KEY],
  })

  console.log('\n' + MANDATE_PERMISSIONS_KEY + ':')
  if (permissionsRaw) {
    try {
      console.log(JSON.stringify(JSON.parse(permissionsRaw), null, 2))
    } catch {
      console.log(permissionsRaw)
    }
  } else {
    console.log('(empty — register-ens.ts has not been run yet)')
  }

  console.log('\n' + MANDATE_POLICY_KEY + ':')
  console.log(policyRaw || '(empty — register-ens.ts has not been run yet)')

  console.log('\n✓ Read-back complete.')
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
