// Mandate underwriting composition logic
//
// Composes two live Graph products into one trust-and-risk decision:
//   - Agent0 / ERC-8004 subgraph  — the ERC-8004 agent population on Base Mainnet
//   - our own Mandate subgraph    — this agent's permission-sync history on Sepolia
//
// Scoring formula (also documented in ARCHITECTURE.md):
//
//   ERC8004_score (0-100), or null when the agent has no Agent0 record:
//     40 * clientDiversity  — distinct counterparties, capped at 10, scaled to 1.
//                             Volume from a single address is a sybil pattern, not
//                             trust, so diversity is weighted above raw count.
//     30 * valueQuality     — mean non-revoked feedback value, clamped to [0,1]
//     20 * (1 - revocationRate)
//     10 * activityPercentile — totalFeedback vs a live sample of the population
//
//   MandateHistory_score (0-100), from our own subgraph:
//     scopeFreshness — 100 while synced within 24h, decaying linearly to 0 at 7 days.
//     A stale mirror means enforcement is reading permissions that may no longer
//     match the canonical ENS record.
//     No record at all: 70 (neutral — a new agent is unproven, not untrustworthy).
//
//   TrustScore:
//     both available  -> ERC8004 * 0.60 + MandateHistory * 0.40
//     no Agent0 row   -> MandateHistory alone (weights renormalised)
//
//   Absence is NOT scored as zero. Our agent is registered on Sepolia and the
//   Agent0 subgraph indexes only Base Mainnet, so it has no row there by
//   construction. Scoring that as 0 would assert "bad" where we only know
//   "unknown", and would deny every trade. The gap is disclosed in `reasons`
//   and flagged by `reputationFound`.
//
//   Authorization (all must hold):
//     1. TrustScore >= 60
//     2. requested protocol bit set in allowedProtocols
//     3. amount <= maxPositionSizeUsdc
//     4. currentDailySpend + amount <= maxDailySpendUsdc
//     5. now < expiry

import {
  fetchAgent0Data,
  percentileOf,
  AGENT0_INDEXED_CHAIN_ID,
  type Agent0Population,
  type Agent0Reputation,
} from './agent0'
import { fetchAgentScope } from './mandate-subgraph'

export const TRUST_THRESHOLD = 60

// Protocol bitmask (must match PermissionMirror + relayer-stub.ts)
export const PROTOCOL_BITS: Record<string, bigint> = {
  'uniswap-v3': 1n,
  'curve':      2n,
  'aave-v3':    4n,
  '1inch':      8n,
  'gmx-perp':   16n,
  'compound-v3': 32n,
}

export interface UnderwritingResult {
  trustScore: number
  /** null when the agent has no Agent0 record — unknown, not zero. */
  erc8004Score: number | null
  mandateHistoryScore: number
  authorized: boolean
  reasons: string[]

  // raw data for display / audit
  agentFound: boolean
  reputationFound: boolean
  scopeFound: boolean
  scopeExpiry: number | null
  allowedProtocols: bigint | null
  maxPositionSizeUsdc: bigint | null
  maxDailySpendUsdc: bigint | null
}

function computeErc8004Score(
  reputation: Agent0Reputation,
  population: Agent0Population | null,
): number {
  const clientDiversity = Math.min(reputation.distinctClients, 10) / 10
  const valueQuality = Math.max(0, Math.min(1, reputation.meanValue))
  const revocationHealth = 1 - reputation.revocationRate
  const activityPercentile = population
    ? percentileOf(reputation.totalFeedback, population) / 100
    : 0

  return Math.round(
    40 * clientDiversity +
      30 * valueQuality +
      20 * revocationHealth +
      10 * activityPercentile,
  )
}

function computeMandateHistoryScore(lastSyncedAt: number | null): number {
  if (lastSyncedAt === null) return 70 // new agent: unproven, not untrusted

  const nowS = Math.floor(Date.now() / 1000)
  const ageSeconds = nowS - lastSyncedAt
  const oneDayS = 86400
  const sevenDaysS = 7 * 86400

  if (ageSeconds <= oneDayS) return 100
  if (ageSeconds >= sevenDaysS) return 0

  // linear decay from 100 to 0 between 1 day and 7 days stale
  const staleFraction = (ageSeconds - oneDayS) / (sevenDaysS - oneDayS)
  return Math.round(100 * (1 - staleFraction))
}

export interface PermissionCheckParams {
  protocol: string       // e.g. 'uniswap-v3'
  amountUsdc: bigint     // in 6-decimal USDC units
  currentDailySpendUsdc: bigint
  currentTimestampS?: number // defaults to Date.now()/1000
}

export async function composeRiskScore(
  agentAddress: string,
  permissionCheck?: PermissionCheckParams,
  /** ERC-8004 agent id, for the Agent0 lookup. Ids there are "<chainId>:<agentId>". */
  agent0AgentId?: string | number,
  agent0ChainId: string | number = AGENT0_INDEXED_CHAIN_ID,
): Promise<UnderwritingResult> {
  const reasons: string[] = []

  const [agent0Data, mandateScope] = await Promise.all([
    agent0AgentId !== undefined
      ? fetchAgent0Data(agent0ChainId, agent0AgentId).catch(() => null)
      : Promise.resolve(null),
    fetchAgentScope(agentAddress).catch(() => null),
  ])

  // ── ERC-8004 score ──────────────────────────────────────────────────────────
  const reputation = agent0Data?.reputation ?? null
  let erc8004Score: number | null = null

  if (reputation?.found) {
    erc8004Score = computeErc8004Score(reputation, agent0Data?.population ?? null)
  } else {
    reasons.push(
      `No ERC-8004 record for this agent in the Agent0 subgraph (it indexes chain ` +
        `${AGENT0_INDEXED_CHAIN_ID} only) — reputation unknown, not scored as zero`,
    )
  }

  // ── Mandate history score ────────────────────────────────────────────────────
  const lastSyncedAt = mandateScope ? parseInt(mandateScope.lastSyncedAt, 10) : null
  const mandateHistoryScore = computeMandateHistoryScore(lastSyncedAt)

  if (!mandateScope) {
    reasons.push('No Mandate subgraph record — neutral score 70 (new agent)')
  }

  // ── Composite trust score ────────────────────────────────────────────────────
  // With no Agent0 row the weights renormalise onto the component we do have,
  // rather than averaging in a zero we have no evidence for.
  const trustScore =
    erc8004Score !== null
      ? Math.round(erc8004Score * 0.6 + mandateHistoryScore * 0.4)
      : Math.round(mandateHistoryScore)

  if (trustScore < TRUST_THRESHOLD) {
    reasons.push(`TrustScore ${trustScore} < threshold ${TRUST_THRESHOLD}`)
  }

  // ── Permission scope checks ──────────────────────────────────────────────────
  const allowedProtocols = mandateScope
    ? BigInt(mandateScope.allowedProtocols)
    : null
  const maxPositionSizeUsdc = mandateScope
    ? BigInt(mandateScope.maxPositionSizeUsdc)
    : null
  const maxDailySpendUsdc = mandateScope
    ? BigInt(mandateScope.maxDailySpendUsdc)
    : null
  const scopeExpiry = mandateScope ? parseInt(mandateScope.expiry, 10) : null

  let authorized = trustScore >= TRUST_THRESHOLD

  if (permissionCheck && authorized) {
    const nowS = permissionCheck.currentTimestampS ?? Math.floor(Date.now() / 1000)

    if (!mandateScope) {
      authorized = false
      reasons.push('No permission scope found in Mandate subgraph')
    } else {
      if (scopeExpiry !== null && nowS >= scopeExpiry) {
        authorized = false
        reasons.push(`Permission scope expired at ${new Date(scopeExpiry * 1000).toISOString()}`)
      }

      const protocolBit = PROTOCOL_BITS[permissionCheck.protocol]
      if (!protocolBit) {
        authorized = false
        reasons.push(`Unknown protocol: ${permissionCheck.protocol}`)
      } else if (allowedProtocols !== null && !(allowedProtocols & protocolBit)) {
        authorized = false
        reasons.push(`Protocol ${permissionCheck.protocol} not in allowlist (bitmask: ${allowedProtocols})`)
      }

      if (maxPositionSizeUsdc !== null && permissionCheck.amountUsdc > maxPositionSizeUsdc) {
        authorized = false
        reasons.push(
          `Amount ${permissionCheck.amountUsdc} USDC exceeds max position size ${maxPositionSizeUsdc} USDC`
        )
      }

      if (maxDailySpendUsdc !== null) {
        const projectedSpend = permissionCheck.currentDailySpendUsdc + permissionCheck.amountUsdc
        if (projectedSpend > maxDailySpendUsdc) {
          authorized = false
          reasons.push(
            `Projected daily spend ${projectedSpend} USDC exceeds daily limit ${maxDailySpendUsdc} USDC`
          )
        }
      }
    }
  }

  return {
    trustScore,
    erc8004Score,
    mandateHistoryScore,
    authorized,
    reasons,
    agentFound: !!agent0Data?.identity,
    reputationFound: !!reputation,
    scopeFound: !!mandateScope,
    scopeExpiry,
    allowedProtocols,
    maxPositionSizeUsdc,
    maxDailySpendUsdc,
  }
}
