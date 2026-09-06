// Screen C: Blocked Transaction Detail — the demo-video moment
// WHY it failed is the hero element.
// Phase 4: enforcement chain is real — from a live composeRiskScore check
// against protocol gmx-perp (not in the agent's allowlist).

import { getBlockedScenario, LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve':      'Curve',
  'aave-v3':    'Aave v3',
  '1inch':      '1inch',
  'gmx-perp':   'GMX Perpetuals',
  'compound-v3': 'Compound v3',
}

// Map raw reason strings into pass/fail steps for the enforcement chain display.
// Reasons that contain "not in allowlist" or "expired" or "exceeds" are failures;
// everything else is informational context (not a hard fail).
function parseEnforcementChain(reasons: string[]): Array<{ step: string; detail: string; result: 'pass' | 'fail' }> {
  const steps: Array<{ step: string; detail: string; result: 'pass' | 'fail' }> = []

  // Step 1: trust score threshold
  const trustFailReason = reasons.find(r => r.includes('TrustScore') && r.includes('< threshold'))
  steps.push({
    step: 'Trust Score Threshold',
    detail: trustFailReason ?? 'Score meets minimum threshold of 60',
    result: trustFailReason ? 'fail' : 'pass',
  })

  // Step 2: scope found
  const noScopeReason = reasons.find(r => r.includes('No permission scope'))
  steps.push({
    step: 'Permission Scope',
    detail: noScopeReason ?? 'Scope record found in Mandate subgraph',
    result: noScopeReason ? 'fail' : 'pass',
  })

  // Step 3: expiry
  const expiryReason = reasons.find(r => r.includes('expired'))
  steps.push({
    step: 'Scope Expiry',
    detail: expiryReason ?? 'Scope is within validity period',
    result: expiryReason ? 'fail' : 'pass',
  })

  // Step 4: protocol allowlist — the expected failure for the gmx-perp scenario
  const protocolReason = reasons.find(r => r.includes('not in allowlist') || r.includes('Unknown protocol'))
  steps.push({
    step: 'Protocol Allowlist',
    detail: protocolReason ?? 'Protocol is authorised',
    result: protocolReason ? 'fail' : 'pass',
  })

  // Step 5: position size
  const sizeReason = reasons.find(r => r.includes('max position size'))
  steps.push({
    step: 'Position Size',
    detail: sizeReason ?? 'Amount within max position size',
    result: sizeReason ? 'fail' : 'pass',
  })

  // Step 6: daily spend cap
  const dailyReason = reasons.find(r => r.includes('daily limit'))
  steps.push({
    step: 'Daily Spend Cap',
    detail: dailyReason ?? 'Projected spend within daily cap',
    result: dailyReason ? 'fail' : 'pass',
  })

  return steps
}

// The primary block reason is the first step that failed
function primaryBlockReason(steps: ReturnType<typeof parseEnforcementChain>): { title: string; detail: string } {
  const failed = steps.find(s => s.result === 'fail')
  if (!failed) return { title: 'Unknown', detail: 'No failure reason available' }

  if (failed.step === 'Protocol Allowlist') {
    return { title: 'Protocol Not in Allowlist', detail: failed.detail }
  }
  if (failed.step === 'Trust Score Threshold') {
    return { title: 'Trust Score Too Low', detail: failed.detail }
  }
  if (failed.step === 'Scope Expiry') {
    return { title: 'Permission Scope Expired', detail: failed.detail }
  }
  if (failed.step === 'Position Size') {
    return { title: 'Position Size Exceeded', detail: failed.detail }
  }
  return { title: failed.step, detail: failed.detail }
}

export default async function BlockedTransactionPage() {
  const [scenario, agentData] = await Promise.all([
    getBlockedScenario(),
    getAgentLiveData(),
  ])

  const chain = parseEnforcementChain(scenario.reasons)
  const primary = primaryBlockReason(chain)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Data source notice */}
      {scenario.fetchError ? (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          Live enforcement data unavailable: {scenario.fetchError} · Showing last known state
        </div>
      ) : (
        <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
          Live enforcement check · gmx-perp vs {LIVE_AGENT.ensName} · real MandateGate logic
        </div>
      )}

      {/* ── HERO: Blocked indicator ── */}
      <div className="rounded-xl border-2 border-red-500/40 bg-red-500/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-3xl text-red-400">
              ✕
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-red-500">
                  Transaction Blocked
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="font-mono text-xs text-[var(--text-3)]">
                  {new Date().toLocaleString()}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-red-400 sm:text-3xl">
                {primary.title}
              </h1>
              <p className="mt-1 text-[var(--text-2)]">
                <span className="font-mono font-semibold text-[var(--text)]">
                  {PROTOCOL_LABELS[scenario.protocol] ?? scenario.protocol}
                </span>{' '}
                is not authorized for this agent
              </p>
            </div>
          </div>

          {/* Trust score */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Trust Score</p>
            <p className="font-mono text-lg text-[var(--text)]">
              {scenario.trustScore.toFixed(1)}
            </p>
            <p className="text-[10px] text-[var(--text-3)]">threshold 60</p>
          </div>
        </div>

        {/* Primary reason */}
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
          <span className="text-xs font-semibold text-red-400">MandateGate revert: </span>
          <span className="font-mono text-xs text-red-300">{primary.detail}</span>
        </div>
      </div>

      {/* Attempted transaction details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attempted Transaction</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="flex flex-col gap-3">
              {[
                { label: 'Agent',    value: LIVE_AGENT.ensName,               mono: true },
                { label: 'Protocol', value: PROTOCOL_LABELS[scenario.protocol] ?? scenario.protocol, highlight: true },
                { label: 'Action',   value: scenario.action },
                { label: 'Amount',   value: `$${scenario.amountUsdc.toLocaleString()} USDC`,  mono: true },
                { label: 'Wallet',   value: LIVE_AGENT.address.slice(0, 10) + '…',            mono: true },
              ].map(({ label, value, mono, highlight }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-xs text-[var(--text-3)]">{label}</dt>
                  <dd className={`text-right text-sm ${
                    highlight ? 'font-semibold text-red-400' :
                    mono ? 'font-mono text-[var(--text-2)]' : 'text-[var(--text)]'
                  }`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {/* Authorized protocols */}
        <Card>
          <CardHeader>
            <CardTitle>Agent May Use Instead</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-xs text-[var(--text-3)]">
              These protocols are within scope for{' '}
              <span className="font-mono">{LIVE_AGENT.ensName}</span>:
            </p>
            <div className="flex flex-col gap-2">
              {agentData.allowedProtocols.length > 0 ? (
                agentData.allowedProtocols.map(p => (
                  <div
                    key={p}
                    className="flex items-center gap-2 rounded-md bg-emerald-500/5 px-3 py-2 ring-1 ring-emerald-500/20"
                  >
                    <span className="text-emerald-400">✓</span>
                    <span className="text-sm text-[var(--text)]">
                      {PROTOCOL_LABELS[p] ?? p}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-3)]">No authorized protocols found</p>
              )}
            </div>
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--text-3)]">Position limits</p>
              <p className="mt-1 font-mono text-sm text-[var(--text)]">
                Max {agentData.maxPositionSizeUsdc !== null ? `$${agentData.maxPositionSizeUsdc.toLocaleString()}` : '—'} / trade
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Enforcement chain */}
      <Card>
        <CardHeader>
          <CardTitle>Enforcement Chain</CardTitle>
          <span className="text-xs text-[var(--text-3)]">MandateGate execution trace · live</span>
        </CardHeader>
        <CardBody>
          <ol className="flex flex-col gap-0">
            {chain.map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
                      ${step.result === 'pass'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                      }`}
                  >
                    {step.result === 'pass' ? '✓' : '✕'}
                  </div>
                  {i < chain.length - 1 && (
                    <div className="my-1 w-px flex-1 bg-[var(--border)]" />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-sm font-medium ${
                      step.result === 'pass' ? 'text-[var(--text)]' : 'text-red-400'
                    }`}
                  >
                    {step.step}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--text-3)]">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          ← Back to Dashboard
        </Link>
        <Link
          href="/"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          View Agent Scope
        </Link>
      </div>
    </div>
  )
}
