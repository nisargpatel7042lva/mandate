/**
 * Run the underwriting composition against live data and print the decision.
 *
 * Composes two Graph products: the Agent0/ERC-8004 subgraph (live ERC-8004
 * population on Base Mainnet) and our own Mandate subgraph (this agent's
 * permission-sync history on Sepolia).
 *
 * Usage:
 *   npm run underwrite                          # default: an in-scope trade
 *   npm run underwrite -- curve 12000           # over the position limit
 *   npm run underwrite -- gmx-perp 5000         # protocol not allowlisted
 */

import { composeRiskScore } from '../src/lib/underwriting.js'
import { fetchAgent0Data } from '../src/lib/agent0.js'
import { optionalEnv } from './lib/config.js'

const protocol = process.argv[2] ?? 'uniswap-v3'
const amount = process.argv[3] ?? '8500'
const AGENT = optionalEnv('AGENT_ADDRESS', '0x0000000000000000000000000000000000000000')

async function main() {
  console.log('=== Mandate underwriting (live composed data) ===')
  console.log('Agent:    ', AGENT)
  console.log('Proposed: ', protocol, '·', amount, 'USDC')
  console.log()

  const result = await composeRiskScore(AGENT, {
    protocol,
    amountUsdc: BigInt(amount) * 1_000_000n,
    currentDailySpendUsdc: 0n,
  })

  console.log('─── SCORE ───')
  console.log('  ERC-8004 component :', result.erc8004Score ?? 'unknown (no Agent0 record)')
  console.log('  Mandate history    :', result.mandateHistoryScore)
  console.log('  TrustScore         :', result.trustScore)
  console.log()
  console.log('─── SCOPE (live from our subgraph) ───')
  console.log('  scopeFound         :', result.scopeFound)
  console.log('  allowedProtocols   :', result.allowedProtocols)
  console.log('  maxPositionSizeUsdc:', result.maxPositionSizeUsdc)
  console.log('  maxDailySpendUsdc  :', result.maxDailySpendUsdc)
  console.log('  expiry             :', result.scopeExpiry ? new Date(result.scopeExpiry * 1000).toISOString() : null)
  console.log()
  console.log('─── DECISION ───')
  console.log(result.authorized ? '  ✅ AUTHORIZED' : '  ⛔ DENIED')
  for (const r of result.reasons) console.log('   ·', r)

  // Show the second Graph product actually returning live data.
  const pop = await fetchAgent0Data('8453', '25975')
  console.log('\n─── Agent0 population baseline (live, Base Mainnet) ───')
  console.log('  sampled agents     :', pop.population?.sampleSize)
  console.log('  median totalFeedback:', pop.population?.medianFeedback)
  console.log('  reference agent 25975:', pop.reputation.totalFeedback, 'feedback from',
              pop.reputation.distinctClients, 'distinct clients (sampled', pop.reputation.sampled + ')')
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err)
  process.exit(1)
})
