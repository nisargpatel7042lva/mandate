/**
 * Register mandate.eth on ENSv2 Sepolia, create testagent.mandate.eth subname,
 * write the mandate.permissions + mandate.policy text records, then read both back.
 *
 * ENSv2 registration flow (L2 pattern, verified from ENSjs v5):
 *   1. commitName(...)      — stores a commitment hash on the registrar
 *   2. wait ≥ 60 seconds    — MIN_COMMITMENT_AGE
 *   3. approve USDC          — registrar pulls USDC for registration fee
 *   4. registerName(...)     — mints the name
 *   5. createSubname(...)    — creates testagent.mandate.eth
 *   6. setTextRecord × 2     — writes permission records
 *   7. read both back        — verifies live on-chain data
 *
 * ENSjs v5 API pattern:
 *   - walletClient = createWalletClient({ chain: sepoliaWithEns }).extend(ensWalletActions)
 *   - chain must include { ethRegistrar } in contracts (added manually from l2.d.ts)
 *
 * Requires:
 *   SEPOLIA_RPC_URL=https://...
 *   PRIVATE_KEY=0x...
 *   REGISTRATION_SECRET=0x<32 random bytes>   (generate once, keep for re-runs)
 *
 * Usage: npx tsx scripts/register-ens.ts
 */

import { createPublicClient, createWalletClient, http, namehash } from 'viem'
import { sepolia } from 'viem/chains'
import { extendChainWithEns } from '@ensdomains/ensjs/chain'
import { commitName, registerName, createSubname } from '@ensdomains/ensjs/wallet'
import { randomSecret } from '@ensdomains/ensjs/utils'
import {
  ENS_L2_REGISTRAR_SEPOLIA,
  ENS_TESTNET_USDC_SEPOLIA,
  ENS_PUBLIC_RESOLVER_SEPOLIA,
  MANDATE_PERMISSIONS_KEY,
  MANDATE_POLICY_KEY,
  PUBLIC_RESOLVER_ABI,
} from './lib/constants.js'
import { readContract, writeContract } from './lib/client.js'
import { getAccount, getRpcUrl, optionalEnv } from './lib/config.js'

const account = getAccount()

const transport = http(getRpcUrl())

// Extend Sepolia with ENS L1 contracts (ensWalletActions needs the chain config),
// then add ethRegistrar (ENSv2 L2 registrar) so commitName/registerName work.
// ensjs's action helpers look up the contracts by the keys `ethRegistrar` and
// `usdc`, but extendChainWithEns exposes the registrar as `ensEthRegistrar`.
// Map both explicitly so registerName resolves the working Sepolia deployment
// rather than the Namechain set (see constants.ts for why that matters).
const sepoliaWithEns = {
  ...extendChainWithEns(sepolia),
  contracts: {
    ...(extendChainWithEns(sepolia) as any).contracts,
    ethRegistrar: { address: ENS_L2_REGISTRAR_SEPOLIA },
    usdc: { address: ENS_TESTNET_USDC_SEPOLIA },
  },
} as any

const publicClient = createPublicClient({ chain: sepolia, transport })

const walletClient = createWalletClient({
  account,
  chain: sepoliaWithEns,
  transport,
})

// ─── Permission scope ──────────────────────────────────────────────────────────
const PERMISSION_SCOPE = {
  version: '1',
  agentName: 'testagent.mandate.eth',
  allowedProtocols: ['uniswap-v3', 'curve', 'aave-v3'],
  allowedPositionTypes: ['spot', 'lp'],
  maxPositionSizeUsdc: '10000',
  maxDailySpendUsdc: '50000',
  expiryTimestamp: String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
}

const POLICY_SUMMARY =
  'Mandate test agent — authorized for spot and LP positions on Uniswap v3, Curve, and Aave v3. ' +
  'Max single position: $10,000 USDC. Max daily spend: $50,000 USDC. ' +
  'Expires 30 days from registration. Enforced by MandateGate on Sepolia.'

// Minimal ERC-20 ABI for approve/allowance
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureUsdcApproved(amount: bigint) {
  const allowance = await readContract<bigint>(publicClient, {
    address: ENS_TESTNET_USDC_SEPOLIA,
    abi: ERC20_ABI as any,
    functionName: 'allowance',
    args: [account.address, ENS_L2_REGISTRAR_SEPOLIA],
  })
  if (allowance >= amount) {
    console.log('USDC already approved:', allowance.toString())
    return
  }
  console.log('Approving USDC to registrar...')
  const hash = await writeContract(walletClient, {
    address: ENS_TESTNET_USDC_SEPOLIA,
    abi: ERC20_ABI as any,
    functionName: 'approve',
    args: [ENS_L2_REGISTRAR_SEPOLIA, amount],
    chain: sepoliaWithEns,
    account,
  })
  await publicClient.waitForTransactionReceipt({ hash })
  console.log('USDC approved.')
}

async function main() {
  console.log('=== ENSv2 Name Registration + Permission Records ===')
  console.log('Network:  Sepolia (chain ID 11155111)')
  console.log('Wallet:  ', account.address)
  console.log()

  const label = 'mandate'
  const subname = 'testagent.mandate.eth'

  const secret = optionalEnv('REGISTRATION_SECRET', randomSecret()) as `0x${string}`
  if (!process.env.REGISTRATION_SECRET?.trim()) {
    console.log('Generated registration secret (save for re-runs):')
    console.log('  REGISTRATION_SECRET=' + secret)
  }

  const registrationArgs = {
    label,
    owner: account.address,
    duration: 365 * 24 * 60 * 60,
    secret,
    resolverAddress: ENS_PUBLIC_RESOLVER_SEPOLIA,
  }

  // ── Step 1: Commit ────────────────────────────────────────────────────────
  console.log('Step 1: Committing...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commitHash = await (commitName as any)(walletClient, registrationArgs)
  const commitReceipt = await publicClient.waitForTransactionReceipt({ hash: commitHash })
  console.log('Committed in block:', commitReceipt.blockNumber.toString(), '| tx:', commitHash)

  // ── Step 2: Wait for MIN_COMMITMENT_AGE (60 s) ───────────────────────────
  console.log('Waiting 65 seconds for commitment to mature...')
  await sleep(65_000)

  // ── Step 3: Ensure USDC approved ─────────────────────────────────────────
  await ensureUsdcApproved(1_000_000_000n) // 1,000 USDC of headroom; price is ~8

  // ── Step 4: Register ──────────────────────────────────────────────────────
  console.log('Step 4: Registering mandate.eth...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registerHash = await (registerName as any)(walletClient, registrationArgs)
  const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerHash })
  console.log('Registered in block:', registerReceipt.blockNumber.toString(), '| tx:', registerHash)

  // ── Step 5: Create subname testagent.mandate.eth ──────────────────────────
  console.log('Step 5: Creating subname', subname, '...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createSubnameHash = await (createSubname as any)(walletClient, {
    name: subname,
    owner: account.address,
    contract: 'registry',
  })
  await publicClient.waitForTransactionReceipt({ hash: createSubnameHash })
  console.log('Subname created | tx:', createSubnameHash)

  // ── Step 6: Write text records on the subname ─────────────────────────────
  const subnameNode = namehash(subname)

  console.log('Step 6a: Writing', MANDATE_PERMISSIONS_KEY, '...')
  const setPermHash = await writeContract(walletClient, {
    address: ENS_PUBLIC_RESOLVER_SEPOLIA,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'setText',
    args: [subnameNode, MANDATE_PERMISSIONS_KEY, JSON.stringify(PERMISSION_SCOPE)],
    chain: sepoliaWithEns,
    account,
  })
  await publicClient.waitForTransactionReceipt({ hash: setPermHash })
  console.log('Permissions written | tx:', setPermHash)

  console.log('Step 6b: Writing', MANDATE_POLICY_KEY, '...')
  const setPolicyHash = await writeContract(walletClient, {
    address: ENS_PUBLIC_RESOLVER_SEPOLIA,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'setText',
    args: [subnameNode, MANDATE_POLICY_KEY, POLICY_SUMMARY],
    chain: sepoliaWithEns,
    account,
  })
  await publicClient.waitForTransactionReceipt({ hash: setPolicyHash })
  console.log('Policy written | tx:', setPolicyHash)

  // ── Step 7: Read both back from chain ─────────────────────────────────────
  console.log()
  console.log('─── ON-CHAIN READ-BACK ───')

  const permissionsRecord = await readContract<string>(publicClient, {
    address: ENS_PUBLIC_RESOLVER_SEPOLIA,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'text',
    args: [subnameNode, MANDATE_PERMISSIONS_KEY],
  })

  const policyRecord = await readContract<string>(publicClient, {
    address: ENS_PUBLIC_RESOLVER_SEPOLIA,
    abi: PUBLIC_RESOLVER_ABI,
    functionName: 'text',
    args: [subnameNode, MANDATE_POLICY_KEY],
  })

  console.log(`\n${MANDATE_PERMISSIONS_KEY} (on-chain):`)
  console.log(JSON.stringify(JSON.parse(permissionsRecord), null, 2))

  console.log(`\n${MANDATE_POLICY_KEY} (on-chain):`)
  console.log(policyRecord)

  console.log('\n✓ ENSv2 registration and records complete.')
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
