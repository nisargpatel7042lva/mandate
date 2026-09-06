// POST /api/check — run the underwriting check for a proposed trade.
// Body: { protocol: string; amountUsdc: number }  (amountUsdc in whole dollars)
// Returns CheckResult with named step results and a plain-English primary block reason.

import { composeRiskScore, PROTOCOL_BITS, TRUST_THRESHOLD } from '@/lib/underwriting'
import { LIVE_AGENT } from '@/lib/server-data'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3':  'Uniswap v3',
  'curve':       'Curve Finance',
  'aave-v3':     'Aave v3',
  '1inch':       '1inch',
  'gmx-perp':    'GMX Perpetuals',
  'compound-v3': 'Compound v3',
}

export interface CheckStep {
  id: string
  label: string
  detail: string
  status: 'pass' | 'fail' | 'skip'
}

export interface CheckResult {
  authorized: boolean
  trustScore: number
  erc8004Score: number | null
  mandateHistoryScore: number
  scopeExpiry: number | null
  scopeFound: boolean
  steps: CheckStep[]
  /** Single plain-English sentence — what stopped the trade, null if approved */
  primaryBlock: string | null
  /** Technical detail (raw reason string) for the curious */
  primaryBlockDetail: string | null
  latencyMs: number
}

function fmtDollars(usdc6: bigint | null): string {
  if (usdc6 === null) return '—'
  return `$${(Number(usdc6) / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtExpiry(s: number | null): string {
  if (!s) return 'unknown'
  const diff = s - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'expired'
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  return `${d}d ${h}h`
}

export async function POST(req: Request): Promise<Response> {
  const start = Date.now()

  let protocol: string
  let amountUsdcDollars: number

  try {
    const body = await req.json() as { protocol: string; amountUsdc: number }
    protocol = body.protocol?.trim()
    amountUsdcDollars = Number(body.amountUsdc)
    if (!protocol || !amountUsdcDollars || isNaN(amountUsdcDollars)) {
      return Response.json({ error: 'protocol and amountUsdc are required' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Convert whole-dollar amount to 6-decimal USDC BigInt
  const amountUsdc6 = BigInt(Math.round(amountUsdcDollars * 1_000_000))
  const protocolLabel = PROTOCOL_LABELS[protocol] ?? protocol

  const result = await composeRiskScore(LIVE_AGENT.address, {
    protocol,
    amountUsdc: amountUsdc6,
    currentDailySpendUsdc: 0n,
  })

  const latencyMs = Date.now() - start
  const reasons = result.reasons

  // ── Build named steps ────────────────────────────────────────────────────────

  const steps: CheckStep[] = []
  let failedAt = -1  // index of first failing step

  // Step 0: Trust Score
  const trustFail = reasons.find(r => r.includes('TrustScore') && r.includes('< threshold'))
  steps.push({
    id: 'trust',
    label: 'Trust Score',
    detail: trustFail
      ? `Score ${result.trustScore.toFixed(1)} · below threshold ${TRUST_THRESHOLD}`
      : `Score ${result.trustScore.toFixed(1)} · above threshold ${TRUST_THRESHOLD}`,
    status: trustFail ? 'fail' : 'pass',
  })
  if (trustFail) failedAt = 0

  // Step 1: Permission Scope
  const scopeFail = !result.scopeFound
    ? 'No permission scope record in Mandate subgraph'
    : reasons.find(r => r.includes('expired'))
  const scopeFailStr = typeof scopeFail === 'string' ? scopeFail : undefined
  steps.push({
    id: 'scope',
    label: 'Permission Scope',
    detail: scopeFailStr
      ? scopeFailStr.includes('No permission') ? 'No scope record in Mandate subgraph' : `Scope expired`
      : `Scope valid · expires ${fmtExpiry(result.scopeExpiry)}`,
    status: (failedAt >= 0 ? 'skip' : scopeFailStr ? 'fail' : 'pass'),
  })
  if (failedAt < 0 && scopeFailStr) failedAt = 1

  // Step 2: Protocol Allowlist
  const protocolFail = reasons.find(r =>
    r.includes('not in allowlist') || r.includes('Unknown protocol')
  )
  const protocolBit = PROTOCOL_BITS[protocol]
  steps.push({
    id: 'protocol',
    label: 'Protocol Allowlist',
    detail: failedAt >= 0 && failedAt < 2
      ? '—'
      : protocolFail
        ? `${protocolLabel} is not in this agent's allowlist`
        : protocolBit
          ? `${protocolLabel} is authorised`
          : `Unknown protocol: ${protocol}`,
    status: failedAt >= 0 && failedAt < 2 ? 'skip' : protocolFail ? 'fail' : 'pass',
  })
  if (failedAt < 0 && protocolFail) failedAt = 2

  // Step 3: Position Size
  const sizeFail = reasons.find(r => r.includes('exceeds max position size'))
  steps.push({
    id: 'size',
    label: 'Position Size',
    detail: failedAt >= 0 && failedAt < 3
      ? '—'
      : sizeFail
        ? `${fmtDollars(amountUsdc6)} exceeds ${fmtDollars(result.maxPositionSizeUsdc)} limit`
        : result.maxPositionSizeUsdc !== null
          ? `${fmtDollars(amountUsdc6)} within ${fmtDollars(result.maxPositionSizeUsdc)} limit`
          : '—',
    status: failedAt >= 0 && failedAt < 3 ? 'skip' : sizeFail ? 'fail' : 'pass',
  })
  if (failedAt < 0 && sizeFail) failedAt = 3

  // Step 4: Daily Cap
  const dailyFail = reasons.find(r => r.includes('exceeds daily limit'))
  steps.push({
    id: 'daily',
    label: 'Daily Spending Cap',
    detail: failedAt >= 0 && failedAt < 4
      ? '—'
      : dailyFail
        ? `${fmtDollars(amountUsdc6)} would exceed daily limit of ${fmtDollars(result.maxDailySpendUsdc)}`
        : result.maxDailySpendUsdc !== null
          ? `${fmtDollars(amountUsdc6)} fits within ${fmtDollars(result.maxDailySpendUsdc)} daily limit`
          : '—',
    status: failedAt >= 0 && failedAt < 4 ? 'skip' : dailyFail ? 'fail' : 'pass',
  })
  if (failedAt < 0 && dailyFail) failedAt = 4

  // ── Primary block reason ─────────────────────────────────────────────────────
  let primaryBlock: string | null = null
  let primaryBlockDetail: string | null = null

  if (!result.authorized) {
    const failedStep = failedAt >= 0 ? steps[failedAt] : null
    if (failedStep?.id === 'trust') {
      primaryBlock = `Trust score is below the minimum threshold of ${TRUST_THRESHOLD}`
      primaryBlockDetail = trustFail ?? null
    } else if (failedStep?.id === 'scope') {
      primaryBlock = result.scopeFound
        ? 'This agent\'s permission scope has expired'
        : 'No valid permission scope found for this agent'
      primaryBlockDetail = scopeFailStr ?? null
    } else if (failedStep?.id === 'protocol') {
      primaryBlock = `${protocolLabel} is not authorized for this agent`
      primaryBlockDetail = protocolFail ?? null
    } else if (failedStep?.id === 'size') {
      primaryBlock = `Trade amount exceeds the ${fmtDollars(result.maxPositionSizeUsdc)} per-trade limit`
      primaryBlockDetail = sizeFail ?? null
    } else if (failedStep?.id === 'daily') {
      primaryBlock = `This trade would exceed the agent's daily spending cap`
      primaryBlockDetail = dailyFail ?? null
    } else {
      primaryBlock = 'Trade blocked by underwriting policy'
      primaryBlockDetail = reasons[0] ?? null
    }
  }

  const response: CheckResult = {
    authorized: result.authorized,
    trustScore: result.trustScore,
    erc8004Score: result.erc8004Score,
    mandateHistoryScore: result.mandateHistoryScore,
    scopeExpiry: result.scopeExpiry,
    scopeFound: result.scopeFound,
    steps,
    primaryBlock,
    primaryBlockDetail,
    latencyMs,
  }

  return Response.json(response)
}
