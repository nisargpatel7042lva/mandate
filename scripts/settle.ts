/**
 * Phase 5 — the full settlement loop, run against live testnets.
 *
 *   propose a trade
 *     -> underwrite it against live ENS scope + both subgraphs
 *     -> if denied, stop. Settlement is gated on the decision, not logged beside it.
 *     -> if approved, move real USDC on Arc testnet
 *     -> write the outcome back to the agent's ERC-8004 reputation
 *
 * Arc's native currency is USDC, so settlement is a value transfer, not an
 * ERC-20 call. Reputation is written by a second account: the registry rejects
 * self-feedback, so the agent's owner cannot score itself.
 *
 * Usage:
 *   npm run settle                        # uniswap-v3, 8500 USDC
 *   npm run settle -- curve 12000         # denied: over the position limit
 *   npm run settle -- uniswap-v3 5 0.01   # protocol, trade size, amount to actually move
 */

import {
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  zeroHash,
  type Address,
} from 'viem'
import { arcTestnet, sepolia } from 'viem/chains'
import { composeRiskScore, TRUST_THRESHOLD } from '../src/lib/underwriting.js'
import {
  ARC_RPC_URL,
  ARC_USDC_DECIMALS,
  arcPublicClient,
  arcTxUrl,
  arcAddressUrl,
  type SettlementRecord,
} from '../src/lib/arc-settlement.js'
import { getAccount, getClientAccount, getRpcUrl, optionalEnv } from './lib/config.js'
import { writeContract, sendTransaction } from './lib/client.js'

const protocol = process.argv[2] ?? 'uniswap-v3'
const tradeUsdc = process.argv[3] ?? '8500'
/** How much to actually move on Arc. Testnet balances are small, so the
 *  settlement is a real but token-sized transfer of the notional trade. */
const settleUsdc = process.argv[4] ?? '0.01'

const AGENT = optionalEnv('AGENT_ADDRESS', '0x0') as Address
const AGENT_ID = BigInt(optionalEnv('AGENT_ID', '10099'))
const MIRROR = optionalEnv('PERMISSION_MIRROR_ADDRESS', '0x0')
const ENS_NAME = optionalEnv('ENS_NAME', 'testagent.mandate.eth')

const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as Address

const GIVE_FEEDBACK_ABI = [
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const

async function main() {
  const agentAccount = getAccount()
  const clientAccount = getClientAccount()

  console.log('=== Mandate settlement loop (live) ===')
  console.log('Agent:     ', AGENT, `(${ENS_NAME}, agentId ${AGENT_ID})`)
  console.log('Proposed:  ', protocol, '·', tradeUsdc, 'USDC notional')
  console.log('Settling:  ', settleUsdc, 'USDC on Arc testnet')
  console.log()

  // ── 1. Underwrite ────────────────────────────────────────────────────────
  console.log('─── 1. UNDERWRITING (live ENS scope + both subgraphs) ───')
  const decision = await composeRiskScore(
    AGENT,
    {
      protocol,
      amountUsdc: parseUnits(tradeUsdc, 6),
      currentDailySpendUsdc: 0n,
    },
    optionalEnv('AGENT_ID', '10099'),
  )

  console.log('  trustScore          :', decision.trustScore, `(threshold ${TRUST_THRESHOLD})`)
  console.log('  erc8004Score        :', decision.erc8004Score ?? 'unknown — no record')
  console.log('  mandateHistoryScore :', decision.mandateHistoryScore)
  console.log('  scopeFound          :', decision.scopeFound)
  console.log('  authorized          :', decision.authorized)
  for (const r of decision.reasons) console.log('   ·', r)

  if (!decision.authorized) {
    console.log('\n⛔ DENIED — no settlement. The transfer is gated on this decision.')
    process.exit(0)
  }

  // ── 2. Settle on Arc ─────────────────────────────────────────────────────
  console.log('\n─── 2. ARC SETTLEMENT (real USDC transfer) ───')
  const arc = arcPublicClient()
  const balance = await arc.getBalance({ address: agentAccount.address })
  console.log('  agent Arc balance :', formatUnits(balance, ARC_USDC_DECIMALS), 'USDC')

  const amount = parseUnits(settleUsdc, ARC_USDC_DECIMALS)
  if (balance < amount) {
    console.log(`\n⚠ Insufficient Arc USDC. Need ${settleUsdc}, have ${formatUnits(balance, ARC_USDC_DECIMALS)}.`)
    console.log('  Fund it at https://faucet.circle.com (select Arc Testnet):')
    console.log(' ', agentAccount.address)
    console.log('  Everything up to this point is verified; only the transfer is blocked.')
    process.exit(1)
  }

  const arcWallet = createWalletClient({
    account: agentAccount,
    chain: arcTestnet,
    transport: http(ARC_RPC_URL),
  })
  const recipient = optionalEnv('SETTLEMENT_RECIPIENT', clientAccount.address) as Address

  const settleHash = await sendTransaction(arcWallet, { to: recipient, value: amount })
  console.log('  tx submitted      :', settleHash)
  const settleReceipt = await arc.waitForTransactionReceipt({ hash: settleHash })
  console.log('  confirmed in block:', settleReceipt.blockNumber.toString())
  console.log('  explorer          :', arcTxUrl(settleHash))

  const record: SettlementRecord = {
    settledAt: new Date().toISOString(),
    amountUsdc: settleUsdc,
    recipient,
    txHash: settleHash,
    explorerUrl: arcTxUrl(settleHash),
    blockNumber: settleReceipt.blockNumber.toString(),
    authorisedBy: {
      trustScore: decision.trustScore,
      trustThreshold: TRUST_THRESHOLD,
      erc8004Score: decision.erc8004Score,
      mandateHistoryScore: decision.mandateHistoryScore,
      protocol,
      checksPassed: [
        `trustScore ${decision.trustScore} >= ${TRUST_THRESHOLD}`,
        `protocol ${protocol} in allowlist (bitmask ${decision.allowedProtocols})`,
        `amount ${tradeUsdc} <= max position ${decision.maxPositionSizeUsdc}`,
        `scope valid until ${decision.scopeExpiry ? new Date(decision.scopeExpiry * 1000).toISOString() : 'n/a'}`,
      ],
      scopeSource: `ENSv2 mandate.permissions on ${ENS_NAME}`,
      permissionMirror: MIRROR,
    },
  }

  // ── 3. Reputation write-back ─────────────────────────────────────────────
  console.log('\n─── 3. REPUTATION WRITE-BACK (ERC-8004, Sepolia) ───')
  console.log('  client (counterparty):', clientAccount.address)
  const sepoliaWallet = createWalletClient({
    account: clientAccount,
    chain: sepolia,
    transport: http(getRpcUrl()),
  })

  try {
    const fbHash = await writeContract(sepoliaWallet, {
      address: REPUTATION_REGISTRY,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: GIVE_FEEDBACK_ABI as any,
      functionName: 'giveFeedback',
      args: [
        AGENT_ID,
        100n, // 1.00 with 2 decimals — settled successfully
        2,
        'mandate-settlement',
        'arc-testnet',
        '',
        record.explorerUrl,
        zeroHash,
      ],
      chain: sepolia,
      account: clientAccount,
    })
    console.log('  feedback tx       :', fbHash)
    console.log('  explorer          : https://sepolia.etherscan.io/tx/' + fbHash)
  } catch (err) {
    const e = err as { shortMessage?: string; message?: string }
    console.log('  ⚠ feedback failed :', e.shortMessage ?? e.message)
    console.log('    (settlement itself succeeded — see the tx above)')
  }

  // ── 4. The record ────────────────────────────────────────────────────────
  console.log('\n─── SETTLEMENT RECORD ───')
  console.log(JSON.stringify(record, null, 2))
  console.log('\nAgent on Arc:', arcAddressUrl(agentAccount.address))
  console.log('\n✓ Loop complete.')
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
