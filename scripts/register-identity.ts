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
import { sepolia } from 'viem/chains'
import {
  ERC8004_IDENTITY_REGISTRY,
  IDENTITY_REGISTRY_ABI,
} from './lib/constants.js'
import { readContract, writeContract } from './lib/client.js'
import { getAccount, getRpcUrl } from './lib/config.js'

const account = getAccount()
const rpcUrl = getRpcUrl()

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl),
})

// The ERC-8004 registration file, served from the repo's public/ directory so
// the URL is stable, versioned alongside the code, and checkable by anyone.
// Schema: https://eips.ethereum.org/EIPS/eip-8004#registration-v1
// The registry exposes setAgentURI(uint256,string) (verified present in the
// deployed implementation), so this can be repointed later if needed.
const AGENT_URI =
  'https://raw.githubusercontent.com/nisargpatel7042lva/mandate/main/public/agent-registration.json'

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
