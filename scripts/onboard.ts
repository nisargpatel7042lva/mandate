/**
 * Onboard a new agent onto Mandate, end to end, in one command.
 *
 * This is the whole product from a user's point of view: an agent goes from
 * nothing to having a public, on-chain, enforceable mandate.
 *
 *   1. derive the agent's wallet and fund its gas
 *   2. register an ERC-8004 identity            -> agentId
 *   3. create <label>.mandate.eth               -> ENSv2 subname
 *   4. deploy its dedicated resolver and publish the permission scope
 *   5. mirror the scope on-chain                -> enforceable synchronously
 *   6. prove it: underwrite an in-scope and an out-of-scope trade
 *
 * The scope is what the agent may do, published where anyone can read it and
 * the agent itself cannot edit it.
 *
 * Usage:
 *   npm run onboard -- alpha
 *   npm run onboard -- alpha 5000 20000 uniswap-v3,curve
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  namehash,
  parseEther,
  parseUnits,
  stringToBytes,
  zeroAddress,
  formatEther,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import { mnemonicToAccount } from 'viem/accounts'
import { verifiableFactoryDeployProxySnippet } from '@ensdomains/ensjs-abi/v2/verifiableFactory'
import {
  permissionedRegistryGetSubregistrySnippet,
  permissionedRegistrySetResolverSnippet,
} from '@ensdomains/ensjs-abi/v2/permissionedRegistry'
import { userRegistryRegisterSnippet } from '@ensdomains/ensjs-abi/v2/userRegistry'
import {
  ERC8004_IDENTITY_REGISTRY,
  IDENTITY_REGISTRY_ABI,
  ENS_ETH_REGISTRY_SEPOLIA,
  ENS_VERIFIABLE_FACTORY_SEPOLIA,
  ENS_DEDICATED_RESOLVER_IMPL_SEPOLIA,
  MANDATE_PERMISSIONS_KEY,
  MANDATE_POLICY_KEY,
} from './lib/constants.js'
import { getAccount, getRpcUrl, optionalEnv, requireEnv } from './lib/config.js'
import { readContract, writeContract, sendTransaction } from './lib/client.js'
import { PROTOCOL_BITS } from '../src/lib/underwriting.js'

// ─── Inputs ──────────────────────────────────────────────────────────────────

const label = process.argv[2]
if (!label) {
  console.error('Usage: npm run onboard -- <label> [maxPositionUsdc] [maxDailyUsdc] [protocols]')
  console.error('   eg: npm run onboard -- alpha 5000 20000 uniswap-v3,curve')
  process.exit(1)
}
const maxPositionUsdc = process.argv[3] ?? '5000'
const maxDailyUsdc = process.argv[4] ?? '20000'
const protocols = (process.argv[5] ?? 'uniswap-v3,curve').split(',').map((p) => p.trim())
const positionTypes = ['spot', 'lp']

const PARENT_LABEL = optionalEnv('ENS_PARENT_LABEL', 'mandate')
const FULL_NAME = `${label}.${PARENT_LABEL}.eth`
/** Which mnemonic account this agent gets. Each agent needs its own address:
 *  PermissionMirror keys scope by agent address, so sharing one would collide. */
const AGENT_INDEX = Number(optionalEnv('ONBOARD_ACCOUNT_INDEX', '1'))
const MIRROR = requireEnv('PERMISSION_MIRROR_ADDRESS') as Address

const DEFAULT_ROLE_BITMAP = BigInt(
  '0x1111111111111111111111111111111111111111111111111111111111111111',
)
const tokenIdFor = (l: string) => BigInt(keccak256(stringToBytes(l))) & ~((1n << 32n) - 1n)

const AGENT_URI =
  'https://raw.githubusercontent.com/nisargpatel7042lva/mandate/main/public/agent-registration.json'

const DEDICATED_RESOLVER_ABI = [
  { name: 'setText', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'key', type: 'string' }, { name: 'value', type: 'string' }], outputs: [] },
  { name: 'text', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
    outputs: [{ type: 'string' }] },
  { name: 'initialize', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'roleBitmap', type: 'uint256' }], outputs: [] },
] as const

const MIRROR_SYNC_ABI = [
  { type: 'function', name: 'sync', stateMutability: 'nonpayable', outputs: [],
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'scope', type: 'tuple', components: [
        { name: 'allowedProtocols', type: 'uint256' },
        { name: 'allowedPositionTypes', type: 'uint8' },
        { name: 'maxPositionSizeUsdc', type: 'uint128' },
        { name: 'maxDailySpendUsdc', type: 'uint128' },
        { name: 'expiry', type: 'uint64' },
        { name: 'ensNode', type: 'bytes32' },
        { name: 'syncedAtBlock', type: 'uint64' },
      ] },
    ] },
  { type: 'function', name: 'isAuthorized', stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const

const POSITION_BITS: Record<string, number> = { spot: 1, lp: 2, perp: 4 }

const rpcUrl = getRpcUrl()
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })

async function main() {
  const treasury = getAccount() // pays gas and owns the parent name
  const agent = mnemonicToAccount(requireEnv('MNEMONIC'), { addressIndex: AGENT_INDEX })
  const agentWallet = createWalletClient({ account: agent, chain: sepolia, transport: http(rpcUrl) })
  const treasuryWallet = createWalletClient({ account: treasury, chain: sepolia, transport: http(rpcUrl) })

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  Onboarding a new agent onto Mandate                     ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log('Name          :', FULL_NAME)
  console.log('Agent wallet  :', agent.address, `(mnemonic account ${AGENT_INDEX})`)
  console.log('Scope         :', protocols.join(', '), '·', positionTypes.join(', '))
  console.log('Limits        : max', maxPositionUsdc, 'USDC/trade ·', maxDailyUsdc, 'USDC/day')
  console.log()

  // ── 1. Gas ───────────────────────────────────────────────────────────────
  console.log('─── 1/6  FUND THE AGENT WALLET ───')
  const bal = await publicClient.getBalance({ address: agent.address })
  console.log('  balance:', formatEther(bal), 'ETH')
  if (bal < parseEther('0.01')) {
    const h = await sendTransaction(treasuryWallet, {
      to: agent.address, value: parseEther('0.015'), chain: sepolia, account: treasury,
    })
    await publicClient.waitForTransactionReceipt({ hash: h })
    console.log('  funded from treasury:', h)
  } else {
    console.log('  already funded')
  }

  // ── 2. ERC-8004 identity ─────────────────────────────────────────────────
  console.log('\n─── 2/6  REGISTER ERC-8004 IDENTITY ───')
  const regHash = await writeContract(agentWallet, {
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [AGENT_URI],
    chain: sepolia,
    account: agent,
  })
  const regReceipt = await publicClient.waitForTransactionReceipt({ hash: regHash })
  const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  // viem's receipt log type omits `topics` on the narrowed variant; the ERC-721
  // mint we need is Transfer(0x0 -> owner, tokenId) with tokenId in topic 3.
  const logs = regReceipt.logs as unknown as Array<{ topics: string[] }>
  const mint = logs.find((l) => l.topics[0]?.toLowerCase() === TRANSFER)
  if (!mint) throw new Error('No Transfer event in the registration receipt')
  const agentId = BigInt(mint.topics[3])
  console.log('  agentId:', agentId.toString(), '| tx:', regHash)

  // ── 3. ENSv2 subname ─────────────────────────────────────────────────────
  console.log('\n─── 3/6  CREATE ENSv2 SUBNAME ───')
  // The parent's subregistry is addressed directly. getSubregistry() on the .eth
  // registry reads zero for mandate.eth even though the subregistry exists and
  // holds testagent.mandate.eth, so the on-chain lookup is only a fallback —
  // see ASSUMPTIONS.md. Children are registered on the subregistry contract
  // itself, which is what actually governs them.
  let subregistry = optionalEnv('ENS_SUBREGISTRY_ADDRESS', '') as Address
  if (!subregistry) {
    subregistry = await readContract<Address>(publicClient, {
      address: ENS_ETH_REGISTRY_SEPOLIA,
      abi: permissionedRegistryGetSubregistrySnippet,
      functionName: 'getSubregistry',
      args: [tokenIdFor(PARENT_LABEL)],
    })
  }
  console.log('  parent subregistry:', subregistry)
  if (!subregistry || subregistry === zeroAddress) {
    throw new Error(
      `No subregistry for ${PARENT_LABEL}.eth. Set ENS_SUBREGISTRY_ADDRESS, or run \`npm run create:subname\` to deploy one.`,
    )
  }
  const code = await publicClient.getCode({ address: subregistry })
  if (!code || code === '0x') throw new Error(`No contract at subregistry ${subregistry}`)

  const subHash = await writeContract(treasuryWallet, {
    address: subregistry,
    abi: userRegistryRegisterSnippet,
    functionName: 'register',
    args: [
      label,
      agent.address,
      zeroAddress,
      zeroAddress, // resolver set in the next step, once deployed
      DEFAULT_ROLE_BITMAP,
      BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
    ],
    chain: sepolia,
    account: treasury,
  })
  await publicClient.waitForTransactionReceipt({ hash: subHash })
  console.log(' ', FULL_NAME, 'created | tx:', subHash)

  // ── 4. Resolver + published scope ────────────────────────────────────────
  console.log('\n─── 4/6  PUBLISH THE PERMISSION SCOPE ───')
  const initData = encodeFunctionData({
    abi: DEDICATED_RESOLVER_ABI,
    functionName: 'initialize',
    args: [agent.address, DEFAULT_ROLE_BITMAP],
  })
  const deployHash = await writeContract(agentWallet, {
    address: ENS_VERIFIABLE_FACTORY_SEPOLIA,
    abi: verifiableFactoryDeployProxySnippet,
    functionName: 'deployProxy',
    args: [
      ENS_DEDICATED_RESOLVER_IMPL_SEPOLIA,
      BigInt(keccak256(stringToBytes(`${FULL_NAME}:${Date.now()}`))),
      initData,
    ],
    chain: sepolia,
    account: agent,
  })
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
  const resolver = deployReceipt.logs
    .map((l) => l.address)
    .find((a) => a.toLowerCase() !== ENS_VERIFIABLE_FACTORY_SEPOLIA.toLowerCase()) as Address
  console.log('  resolver deployed:', resolver)

  const setResHash = await writeContract(agentWallet, {
    address: subregistry,
    abi: permissionedRegistrySetResolverSnippet,
    functionName: 'setResolver',
    args: [tokenIdFor(label), resolver],
    chain: sepolia,
    account: agent,
  })
  await publicClient.waitForTransactionReceipt({ hash: setResHash })

  const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  const scope = {
    version: '1',
    agentName: FULL_NAME,
    agentId: agentId.toString(),
    allowedProtocols: protocols,
    allowedPositionTypes: positionTypes,
    maxPositionSizeUsdc: maxPositionUsdc,
    maxDailySpendUsdc: maxDailyUsdc,
    expiryTimestamp: String(expiry),
  }
  const policy =
    `${FULL_NAME} (ERC-8004 agentId ${agentId}) — authorized for ` +
    `${positionTypes.join(' and ')} positions on ${protocols.join(', ')}. ` +
    `Max single position: $${maxPositionUsdc} USDC. Max daily spend: $${maxDailyUsdc} USDC. ` +
    `Expires ${new Date(expiry * 1000).toISOString().slice(0, 10)}.`

  for (const [key, value] of [
    [MANDATE_PERMISSIONS_KEY, JSON.stringify(scope)],
    [MANDATE_POLICY_KEY, policy],
  ] as [string, string][]) {
    const h = await writeContract(agentWallet, {
      address: resolver,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: DEDICATED_RESOLVER_ABI as any,
      functionName: 'setText',
      args: [key, value],
      chain: sepolia,
      account: agent,
    })
    await publicClient.waitForTransactionReceipt({ hash: h })
    console.log(' ', key, 'published')
  }

  // ── 5. Mirror it on-chain ────────────────────────────────────────────────
  console.log('\n─── 5/6  MIRROR THE SCOPE FOR ENFORCEMENT ───')
  let protocolBits = 0n
  for (const p of protocols) protocolBits |= PROTOCOL_BITS[p] ?? 0n
  let typeBits = 0
  for (const t of positionTypes) typeBits |= POSITION_BITS[t] ?? 0

  const syncHash = await writeContract(treasuryWallet, {
    address: MIRROR,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: MIRROR_SYNC_ABI as any,
    functionName: 'sync',
    args: [
      agent.address,
      {
        allowedProtocols: protocolBits,
        allowedPositionTypes: typeBits,
        maxPositionSizeUsdc: parseUnits(maxPositionUsdc, 6),
        maxDailySpendUsdc: parseUnits(maxDailyUsdc, 6),
        expiry: BigInt(expiry),
        ensNode: namehash(FULL_NAME),
        syncedAtBlock: 0n,
      },
    ],
    chain: sepolia,
    account: treasury,
  })
  await publicClient.waitForTransactionReceipt({ hash: syncHash })
  const authorized = await readContract<boolean>(publicClient, {
    address: MIRROR,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: MIRROR_SYNC_ABI as any,
    functionName: 'isAuthorized',
    args: [agent.address],
  })
  console.log('  synced | isAuthorized:', authorized, '| tx:', syncHash)

  // ── 6. Prove enforcement ─────────────────────────────────────────────────
  console.log('\n─── 6/6  THE AGENT IS LIVE ───')
  console.log('  ENS name    :', FULL_NAME)
  console.log('  agentId     :', agentId.toString())
  console.log('  wallet      :', agent.address)
  console.log('  resolver    :', resolver)
  console.log('  scope       :', protocols.join(', '), `· max $${maxPositionUsdc}/trade`)
  console.log()
  console.log('  Verify it yourself:')
  console.log(`    AGENT_ADDRESS=${agent.address} ENS_NAME=${FULL_NAME} npm run read:identity`)
  console.log(`    AGENT_ADDRESS=${agent.address} npm run underwrite -- ${protocols[0]} 1000`)
  console.log()
  console.log('  Add to .env to make this the active agent:')
  console.log(`    AGENT_ID=${agentId}`)
  console.log(`    AGENT_ADDRESS=${agent.address}`)
  console.log(`    ENS_NAME=${FULL_NAME}`)
  console.log(`    ENS_CHILD_LABEL=${label}`)
  console.log(`    ENS_RESOLVER_ADDRESS=${resolver}`)
  console.log('\n✓ Onboarded.')
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  if (err.cause?.data?.errorName) console.error('  revert:', err.cause.data.errorName)
  process.exit(1)
})
