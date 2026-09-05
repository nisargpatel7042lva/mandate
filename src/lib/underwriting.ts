// Mandate underwriting composition logic
//
// Scoring formula (also documented in ARCHITECTURE.md §Underwriting):
//
//   TrustScore = ERC8004_score * 0.60 + MandateHistory_score * 0.40
//
//   ERC8004_score (0–100):
//     Derived from Agent0/ERC-8004 ReputationRegistry subgraph.
//     = (successfulDecisions / totalDecisions) * 100
//     If the agent has no reputation record: 0 (unverified agent — must earn trust).
//
//   MandateHistory_score (0–100):
//     Derived from our own Mandate subgraph (PermissionSynced event history).
//     Currently approximated from sync frequency and permission scope freshness.
//     Full blocked-attempt scoring requires Phase 4 MandateGate events to be indexed.
//     Interim formula until Phase 4:
//       = scopeFreshnessPct * 70  (max 70 from freshness alone — history earns the rest)
//     where scopeFreshnessPct = 1 if synced within 24h, linear decay to 0 at 7 days stale.
//     If no Mandate subgraph record: 70 (new agent neutral bonus — cannot penalize the unknown).
//
//   Authorization decision (all conditions must hold):
//     1. TrustScore >= 60
//     2. protocol bitmask has the requested protocol bit set
//     3. amount <= maxPositionSizeUsdc
//     4. currentDailySpend + amount <= maxDailySpendUsdc
//     5. block.timestamp < expiry

import { fetchAgent0Data } from './agent0'
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
  erc8004Score: number
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
  successfulDecisions: number,
  totalDecisions: number,
): number {
  if (totalDecisions === 0) return 0
  return Math.min(100, Math.round((successfulDecisions / totalDecisions) * 100))
}

function computeMandateHistoryScore(lastSyncedAt: number | null): number {
  if (lastSyncedAt === null) return 70 // new agent neutral bonus

  const nowS = Math.floor(Date.now() / 1000)
  const ageSeconds = nowS - lastSyncedAt
  const oneDayS = 86400
  const sevenDaysS = 7 * 86400

  if (ageSeconds <= oneDayS) return 70
  if (ageSeconds >= sevenDaysS) return 0

  // linear decay from 70 to 0 between 1 day and 7 days stale
  const staleFraction = (ageSeconds - oneDayS) / (sevenDaysS - oneDayS)
  return Math.round(70 * (1 - staleFraction))
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
): Promise<UnderwritingResult> {
  const reasons: string[] = []

  const [agent0Data, mandateScope] = await Promise.all([
    fetchAgent0Data(agentAddress).catch(() => null),
    fetchAgentScope(agentAddress).catch(() => null),
  ])

  // ── ERC-8004 score ──────────────────────────────────────────────────────────
  const reputation = agent0Data?.reputation ?? null
  let erc8004Score = 0

  if (!agent0Data?.identity) {
    reasons.push('Agent not registered in ERC-8004 IdentityRegistry')
  }

  if (reputation) {
    const successful = parseInt(reputation.successfulDecisions, 10)
    const total = parseInt(reputation.totalDecisions, 10)
    erc8004Score = computeErc8004Score(successful, total)
  } else {
    reasons.push('No reputation record in Agent0 subgraph — score 0 (unverified agent)')
  }

  // ── Mandate history score ────────────────────────────────────────────────────
  const lastSyncedAt = mandateScope ? parseInt(mandateScope.lastSyncedAt, 10) : null
  const mandateHistoryScore = computeMandateHistoryScore(lastSyncedAt)

  if (!mandateScope) {
    reasons.push('No Mandate subgraph record — using neutral score 70 (new agent)')
  }

  // ── Composite trust score ────────────────────────────────────────────────────
  const trustScore = Math.round(erc8004Score * 0.60 + mandateHistoryScore * 0.40)

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
