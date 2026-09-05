/**
 * Deploy a dedicated resolver for testagent.mandate.eth and write the Mandate
 * permission records to it, then read them back from chain.
 *
 * ENSv2 resolvers are per-name: DedicatedResolver is an implementation deployed
 * as a proxy for a single name, so its writer is `setText(string key, string
 * value)` with NO node argument — the instance already knows which name it
 * serves. Reads still go through the ENS-compatible `text(bytes32 node, string
 * key)`, which ignores the node.
 *
 * That is why the v1-style `setText(bytes32,string,string)` used elsewhere
 * reverts here: the function does not exist on this resolver.
 *
 *   1. deployProxy   — VerifiableFactory + DedicatedResolver implementation
 *   2. setResolver   — point the subname at that resolver instance
 *   3. setText × 2   — mandate.permissions (JSON scope) + mandate.policy (prose)
 *   4. read back     — via text(node, key), live from chain
 *
 * Usage: npm run set:permissions
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  namehash,
  stringToBytes,
  zeroAddress,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import { verifiableFactoryDeployProxySnippet } from '@ensdomains/ensjs-abi/v2/verifiableFactory'
import { permissionedRegistrySetResolverSnippet } from '@ensdomains/ensjs-abi/v2/permissionedRegistry'
import { permissionedRegistryGetResolverSnippet } from '@ensdomains/ensjs-abi/v2/permissionedRegistry'
import {
  ENS_VERIFIABLE_FACTORY_SEPOLIA,
  ENS_DEDICATED_RESOLVER_IMPL_SEPOLIA,
  MANDATE_PERMISSIONS_KEY,
  MANDATE_POLICY_KEY,
} from './lib/constants.js'
import { getAccount, getRpcUrl, optionalEnv, requireEnv } from './lib/config.js'
import { readContract, writeContract } from './lib/client.js'

const PARENT_LABEL = optionalEnv('ENS_PARENT_LABEL', 'mandate')
const CHILD_LABEL = optionalEnv('ENS_CHILD_LABEL', 'testagent')
const FULL_NAME = `${CHILD_LABEL}.${PARENT_LABEL}.eth`
const SUBREGISTRY = requireEnv('ENS_SUBREGISTRY_ADDRESS') as Address

const DEFAULT_ROLE_BITMAP = BigInt(
  '0x1111111111111111111111111111111111111111111111111111111111111111',
)

const tokenIdFor = (label: string) =>
  BigInt(keccak256(stringToBytes(label))) & ~((1n << 32n) - 1n)

// DedicatedResolver: setText carries no node — the instance serves one name.
const DEDICATED_RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'initialize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'roleBitmap', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const PERMISSION_SCOPE = {
  version: '1',
  agentName: FULL_NAME,
  agentId: optionalEnv('AGENT_ID', '10099'),
  allowedProtocols: ['uniswap-v3', 'curve', 'aave-v3'],
  allowedPositionTypes: ['spot', 'lp'],
  maxPositionSizeUsdc: '10000',
  maxDailySpendUsdc: '50000',
  expiryTimestamp: String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
}

const POLICY_SUMMARY =
  `Mandate test agent (ERC-8004 agentId ${PERMISSION_SCOPE.agentId}) — authorized for spot and LP ` +
  'positions on Uniswap v3, Curve, and Aave v3. Max single position: $10,000 USDC. ' +
  'Max daily spend: $50,000 USDC. Expires 30 days from registration. ' +
  'Enforced by MandateGate at execution time on Sepolia.'

const account = getAccount()
const rpcUrl = getRpcUrl()
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) })

async function main() {
  const childTokenId = tokenIdFor(CHILD_LABEL)

  console.log('=== Mandate permission records (ENSv2) ===')
  console.log('Name:        ', FULL_NAME)
  console.log('Subregistry: ', SUBREGISTRY)
  console.log('Owner:       ', account.address)
  console.log()

  // ── Is a resolver already set? ───────────────────────────────────────────
  let resolver = zeroAddress as Address
  try {
    resolver = await readContract<Address>(publicClient, {
      address: SUBREGISTRY,
      abi: permissionedRegistryGetResolverSnippet,
      functionName: 'getResolver',
      args: [childTokenId],
    })
  } catch {
    /* treat as unset */
  }
  console.log('Current resolver:', resolver)

  if (resolver === zeroAddress) {
    // ── Step 1: deploy a DedicatedResolver instance for this name ─────────
    console.log('\nStep 1: deploying a dedicated resolver...')
    const initCallData = encodeFunctionData({
      abi: DEDICATED_RESOLVER_ABI,
      functionName: 'initialize',
      args: [account.address, DEFAULT_ROLE_BITMAP],
    })
    const salt = BigInt(keccak256(stringToBytes(`${FULL_NAME}:${new Date().toISOString()}`)))

    const deployHash = await writeContract(walletClient, {
      address: ENS_VERIFIABLE_FACTORY_SEPOLIA,
      abi: verifiableFactoryDeployProxySnippet,
      functionName: 'deployProxy',
      args: [ENS_DEDICATED_RESOLVER_IMPL_SEPOLIA, salt, initCallData],
      chain: sepolia,
      account,
    })
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
    console.log('  block', deployReceipt.blockNumber.toString(), '| tx:', deployHash)

    const created = deployReceipt.logs
      .map((l) => l.address)
      .find((a) => a.toLowerCase() !== ENS_VERIFIABLE_FACTORY_SEPOLIA.toLowerCase())
    if (!created) throw new Error('Could not find the deployed resolver address in the receipt logs')
    resolver = created as Address
    console.log('  resolver:', resolver)

    // ── Step 2: point the subname at it ───────────────────────────────────
    console.log('\nStep 2: setting resolver on', FULL_NAME, '...')
    const setHash = await writeContract(walletClient, {
      address: SUBREGISTRY,
      abi: permissionedRegistrySetResolverSnippet,
      functionName: 'setResolver',
      args: [childTokenId, resolver],
      chain: sepolia,
      account,
    })
    const setReceipt = await publicClient.waitForTransactionReceipt({ hash: setHash })
    console.log('  block', setReceipt.blockNumber.toString(), '| tx:', setHash)
  } else {
    console.log('  (already set — skipping steps 1 and 2)')
  }

  // ── Step 3: write the records ────────────────────────────────────────────
  const records: [string, string][] = [
    [MANDATE_PERMISSIONS_KEY, JSON.stringify(PERMISSION_SCOPE)],
    [MANDATE_POLICY_KEY, POLICY_SUMMARY],
  ]

  for (const [key, value] of records) {
    console.log(`\nStep 3: writing ${key} ...`)
    const hash = await writeContract(walletClient, {
      address: resolver,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: DEDICATED_RESOLVER_ABI as any,
      functionName: 'setText',
      args: [key, value],
      chain: sepolia,
      account,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('  block', receipt.blockNumber.toString(), '| tx:', hash)
  }

  // ── Step 4: read back from chain ─────────────────────────────────────────
  console.log('\n─── ON-CHAIN READ-BACK ───')
  console.log('resolver:', resolver)
  const node = namehash(FULL_NAME)
  console.log('namehash:', node)

  for (const [key] of records) {
    const value = await readContract<string>(publicClient, {
      address: resolver,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: DEDICATED_RESOLVER_ABI as any,
      functionName: 'text',
      args: [node, key],
    })
    console.log(`\n${key}:`)
    if (!value) {
      console.log('  (empty)')
    } else if (key === MANDATE_PERMISSIONS_KEY) {
      console.log(JSON.stringify(JSON.parse(value), null, 2))
    } else {
      console.log(value)
    }
  }

  console.log('\n✓ Permission records live on ENSv2.')
  console.log('  ENS_RESOLVER_ADDRESS=' + resolver)
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  const d = err.cause?.data
  if (d?.errorName) console.error('  revert:', d.errorName, JSON.stringify(d.args ?? []))
  process.exit(1)
})
