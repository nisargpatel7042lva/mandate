/**
 * PermissionMirror relayer stub.
 *
 * Watches ENSv2 text record changes for the agent's subname and syncs
 * the decoded permission scope into the PermissionMirror contract.
 *
 * Phase 1 status: stub — polling + sync logic scaffolded but PermissionMirror
 *   contract address is TBD (deployed in Phase 2). Cross-chain note: if both
 *   ENSv2 and PermissionMirror are on Sepolia, the relayer is just a sync layer
 *   and not a trust boundary.
 *
 * Requires:
 *   SEPOLIA_RPC_URL=https://...
 *   PRIVATE_KEY=0x...                          (relayer signer key)
 *   PERMISSION_MIRROR_ADDRESS=0x...            (after Phase 2 deploy)
 *   AGENT_ENS_NAME=testagent.mandate.eth
 *   AGENT_ADDRESS=0x...                        (agent's execution wallet)
 *
 * Usage: npx tsx scripts/relayer-stub.ts
 */

import { createPublicClient, createWalletClient, http, namehash, type Address, type Abi } from 'viem'
import { sepolia } from 'viem/chains'
import {
  ENS_PUBLIC_RESOLVER_SEPOLIA,
  PUBLIC_RESOLVER_ABI,
  MANDATE_PERMISSIONS_KEY,
} from './lib/constants.js'
import { readContract, writeContract } from './lib/client.js'
import { getAccount, getRpcUrl, optionalEnv } from './lib/config.js'

const account = getAccount()

const AGENT_ENS_NAME = optionalEnv('AGENT_ENS_NAME', 'testagent.mandate.eth')
const AGENT_ADDRESS = optionalEnv('AGENT_ADDRESS', '0x0000000000000000000000000000000000000000') as Address

// TODO Phase 2: fill in once PermissionMirror is deployed
const PERMISSION_MIRROR_ADDRESS = optionalEnv(
  'PERMISSION_MIRROR_ADDRESS',
  '0x0000000000000000000000000000000000000000',
) as Address

const rpcUrl = getRpcUrl()

// ENSv2 resolvers are per-name; ENS_RESOLVER_ADDRESS is the instance deployed
// for our agent's subname by set-permissions.ts.
const RESOLVER = optionalEnv('ENS_RESOLVER_ADDRESS', ENS_PUBLIC_RESOLVER_SEPOLIA) as Address

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl),
})

// Minimal ABI for PermissionMirror.sync() — matches contracts/PermissionMirror.sol
const PERMISSION_MIRROR_ABI: Abi = [
  {
    name: 'sync',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'address' },
      {
        name: 'scope',
        type: 'tuple',
        components: [
          { name: 'allowedProtocols', type: 'uint256' },
          { name: 'allowedPositionTypes', type: 'uint8' },
          { name: 'maxPositionSizeUsdc', type: 'uint128' },
          { name: 'maxDailySpendUsdc', type: 'uint128' },
          { name: 'expiry', type: 'uint64' },
          { name: 'ensNode', type: 'bytes32' },
          { name: 'syncedAtBlock', type: 'uint64' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'PermissionSynced',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'ensNode', type: 'bytes32', indexed: true },
      { name: 'syncedAtBlock', type: 'uint64', indexed: false },
    ],
  },
]

// Protocol ID bitmask helpers — map human-readable protocol names to bit positions
const PROTOCOL_BITS: Record<string, bigint> = {
  'uniswap-v3': 1n,
  'curve': 2n,
  'aave-v3': 4n,
  '1inch': 8n,
}

const POSITION_TYPE_BITS: Record<string, number> = {
  'spot': 1,
  'lp': 2,
  'perp': 4,
}

function decodePermissionScope(raw: string, ensNode: `0x${string}`) {
  const parsed = JSON.parse(raw)

  let allowedProtocols = 0n
  for (const p of (parsed.allowedProtocols ?? [])) {
    allowedProtocols |= PROTOCOL_BITS[p] ?? 0n
  }

  let allowedPositionTypes = 0
  for (const pt of (parsed.allowedPositionTypes ?? [])) {
    allowedPositionTypes |= POSITION_TYPE_BITS[pt] ?? 0
  }

  return {
    allowedProtocols,
    allowedPositionTypes,
    maxPositionSizeUsdc: BigInt(
      Math.round(parseFloat(parsed.maxPositionSizeUsdc ?? '0') * 1_000_000),
    ),
    maxDailySpendUsdc: BigInt(
      Math.round(parseFloat(parsed.maxDailySpendUsdc ?? '0') * 1_000_000),
    ),
    expiry: BigInt(parsed.expiryTimestamp ?? '0'),
    ensNode,
    syncedAtBlock: 0n, // filled in by the contract
  }
}

async function fetchAndSync() {
  const node = namehash(AGENT_ENS_NAME)

  const raw = await readContract<string>(publicClient, {
    address: RESOLVER,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'text',
    args: [node, MANDATE_PERMISSIONS_KEY],
  })

  if (!raw) {
    console.log(`[relayer] No ${MANDATE_PERMISSIONS_KEY} record found — nothing to sync.`)
    return
  }

  console.log('[relayer] Fetched permission record:')
  console.log(raw)

  const scope = decodePermissionScope(raw, node)
  console.log('[relayer] Decoded scope:', scope)

  // TODO Phase 2: un-stub after PermissionMirror is deployed
  if (PERMISSION_MIRROR_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('[relayer] PERMISSION_MIRROR_ADDRESS not set — skipping sync write (stub mode).')
    console.log('[relayer] Would have called PermissionMirror.sync(', AGENT_ADDRESS, ', scope)')
    return
  }

  const hash = await writeContract(walletClient, {
    address: PERMISSION_MIRROR_ADDRESS,
    abi: PERMISSION_MIRROR_ABI,
    functionName: 'sync',
    args: [AGENT_ADDRESS, scope],
    chain: sepolia,
    account,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('[relayer] Synced in block', receipt.blockNumber.toString(), '| tx:', hash)
}

async function main() {
  console.log('=== PermissionMirror Relayer ===')
  console.log('Watching:', AGENT_ENS_NAME)
  console.log('Syncing to:', PERMISSION_MIRROR_ADDRESS)
  console.log()

  // Initial sync
  await fetchAndSync()

  // Poll every 60 seconds for record changes.
  // TODO Phase 2: replace with ENSv2 event subscription for efficiency.
  const POLL_INTERVAL_MS = 60_000
  console.log(`[relayer] Polling every ${POLL_INTERVAL_MS / 1000}s for changes...`)
  setInterval(fetchAndSync, POLL_INTERVAL_MS)
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
