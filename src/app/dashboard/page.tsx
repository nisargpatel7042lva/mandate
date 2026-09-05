// Screen B: Underwriting Dashboard — THE judged pattern
// Policy strip (always visible) + Kill Switch + Trade Log
// EXAMPLE_DATA: all values placeholder — wire to ENSv2 + ERC-8004 + subgraph in Phase 3

import { EXAMPLE_AGENT, EXAMPLE_TRADES, fmtUsdc, fmtExpiry } from '@/lib/example-data'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge, TierBadge } from '@/components/ui/Badge'
import { KillSwitch } from '@/components/dashboard/KillSwitch'
import { TradeLog } from '@/components/dashboard/TradeLog'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve': 'Curve',
  'aave-v3': 'Aave v3',
}

// All protocols that exist but are NOT allowed for this agent
const ALL_PROTOCOLS = ['uniswap-v3', 'curve', 'aave-v3', 'gmx-perp', '1inch', 'compound-v3']

// Expiry computed at module load (server component) — avoids Date.now() inside render
const NOW_S = Math.floor(Date.now() / 1000)

export default function DashboardPage() {
  const agent = EXAMPLE_AGENT
  const { permissions } = agent
  const blockedProtocols = ALL_PROTOCOLS.filter(p => !permissions.allowedProtocols.includes(p))
  const expiry = fmtExpiry(permissions.expiryTimestamp)
  const expiresUrgent = permissions.expiryTimestamp - NOW_S < 3 * 86400

  return (
    <div className="flex flex-col gap-0">
      {/* ── Policy Strip ── always visible, first thing the eye hits ── */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]">
        {/* Agent line */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2">
          <span className="font-mono text-sm font-semibold text-[var(--text)]">
            {agent.ensName}
          </span>
          <TierBadge tier={agent.tier} />
          <span className="font-mono text-xs text-[var(--text-3)]">#{agent.agentId}</span>
          <span className="ml-auto hidden items-center gap-1.5 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400">Active</span>
          </span>
        </div>

        {/* Three-column policy strip */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
          {/* ALLOWED */}
          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
              ✓ Allowed
            </p>
            <div className="flex flex-wrap gap-1">
              {permissions.allowedProtocols.map(p => (
                <Badge key={p} variant="success">{PROTOCOL_LABELS[p] ?? p}</Badge>
              ))}
              {permissions.allowedPositionTypes.map(t => (
                <Badge key={t} variant="neutral">{t.toUpperCase()}</Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--text-3)]">
              Max {fmtUsdc(permissions.maxPositionSizeUsdc)} / trade ·{' '}
              {fmtUsdc(permissions.maxDailySpendUsdc)} / day
            </p>
          </div>

          {/* BLOCKED */}
          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-500">
              ✕ Not Authorized
            </p>
            <div className="flex flex-wrap gap-1">
              {blockedProtocols.map(p => (
                <Badge key={p} variant="danger">
                  {PROTOCOL_LABELS[p] ?? p}
                </Badge>
              ))}
              <Badge variant="danger">PERP</Badge>
              <Badge variant="danger">SHORT</Badge>
            </div>
            <p className="mt-2 text-xs text-[var(--text-3)]">
              Blocked by MandateGate at execution time
            </p>
          </div>

          {/* EXPIRY */}
          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
              Scope Validity
            </p>
            <p
              className={`font-mono text-xl font-semibold ${
                expiresUrgent ? 'text-amber-400' : 'text-[var(--text)]'
              }`}
            >
              {expiry}
            </p>
            {expiresUrgent && (
              <Badge variant="warning" dot className="mt-1">Renewal Due</Badge>
            )}
            <p className="mt-2 text-xs text-[var(--text-3)]">
              Trust score: {agent.trustScore.toFixed(1)} / 100
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {/* Example data notice */}
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          Example data · Wire to ENSv2 setText reads + ERC-8004 getSummary in Phase 3
        </div>

        {/* Kill switch */}
        <KillSwitch />

        {/* Daily spend meter */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spend</CardTitle>
            <span className="font-mono text-xs text-[var(--text-2)]">
              {fmtUsdc(EXAMPLE_TRADES
                .filter(t => t.status === 'approved')
                .reduce((s, t) => s + t.amountUsdc, 0))} / {fmtUsdc(permissions.maxDailySpendUsdc)}
            </span>
          </CardHeader>
          <CardBody>
            {(() => {
              const spent = EXAMPLE_TRADES
                .filter(t => t.status === 'approved')
                .reduce((s, t) => s + t.amountUsdc, 0)
              const pct = Math.min((spent / permissions.maxDailySpendUsdc) * 100, 100)
              const color = pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'
              return (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-[var(--text-3)]">
                    <span>{pct.toFixed(0)}% of daily limit used</span>
                    <span>{fmtUsdc(permissions.maxDailySpendUsdc - spent)} remaining</span>
                  </div>
                </div>
              )
            })()}
          </CardBody>
        </Card>

        {/* Trade Log */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Decisions</CardTitle>
            <a href="/transactions/blocked" className="text-xs text-red-400 hover:underline">
              View last blocked →
            </a>
          </CardHeader>
          <TradeLog trades={EXAMPLE_TRADES} />
        </Card>
      </div>
    </div>
  )
}
