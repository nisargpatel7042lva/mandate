/**
 * Register an ERC-8004 agent identity on Sepolia.
 *
 * Requires:
 *   SEPOLIA_RPC_URL=https://...
 *   PRIVATE_KEY=0x...
 *
 * Usage: npx tsx scripts/register-identity.ts
 *
 * On success, prints the minted agentId and its tokenURI (live on-chain reads).
 */

import { createPublicClient, createWalletClient, http, parseEventLogs } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import {
  ERC8004_IDENTITY_REGISTRY,
  IDENTITY_REGISTRY_ABI,
} from './lib/constants.js'
import { readContract, writeContract } from './lib/client.js'

if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY env var is required')
if (!process.env.SEPOLIA_RPC_URL) throw new Error('SEPOLIA_RPC_URL env var is required')

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
})

// The agent registration file we'll publish.
// For testnet: using a GitHub Gist URL so it's publicly resolvable.
// In production this would be an IPFS URI.
const AGENT_URI =
  'https://gist.githubusercontent.com/mandate-agent/testagent/raw/agent-registration.json'

async function main() {
  console.log('=== ERC-8004 Agent Identity Registration ===')
  console.log('Network:  Sepolia (chain ID 11155111)')
  console.log('Registry:', ERC8004_IDENTITY_REGISTRY)
  console.log('Wallet:  ', account.address)
  console.log()

  // ── Simulate first (catches ABI or permission errors before spending gas) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { result: simulatedAgentId } = await (publicClient.simulateContract as any)({
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [AGENT_URI],
    account,
  })
  console.log('Simulation passed. Predicted agentId:', (simulatedAgentId as bigint).toString())

  // ── Send the real transaction ─────────────────────────────────────────────
  const hash = await writeContract(walletClient, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [AGENT_URI],
    chain: sepolia,
    account,
  })
  console.log('Tx submitted:', hash)

  // ── Wait for receipt ──────────────────────────────────────────────────────
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('Confirmed in block:', receipt.blockNumber.toString())

  // ── Parse agentId from the Transfer(0x0 → owner, tokenId) event ──────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs = parseEventLogs({
    abi: IDENTITY_REGISTRY_ABI,
    eventName: 'Transfer',
    logs: receipt.logs,
  }) as any[]

  if (logs.length === 0) throw new Error('No Transfer event found in receipt — registration may have failed')

  const agentId = logs[0].args.tokenId as bigint
  console.log()
  console.log('─── ON-CHAIN READ-BACK ───')
  console.log('agentId (tokenId):', agentId.toString())

  // ── Read tokenURI back from chain (live on-chain data, not local var) ─────
  const tokenUri = await readContract<string>(publicClient, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'tokenURI',
    args: [agentId],
  })
  console.log('tokenURI (on-chain):', tokenUri)

  const owner = await readContract<string>(publicClient, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [agentId],
  })
  console.log('owner (on-chain):   ', owner)

  console.log()
  console.log('✓ Identity registered. Save this agentId for subsequent scripts:')
  console.log('  AGENT_ID=' + agentId.toString())
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err)
  process.exit(1)
})
