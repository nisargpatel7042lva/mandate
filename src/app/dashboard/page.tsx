// Screen B: Underwriting Dashboard — wired to live data (Phase 4)
// Live: policy strip (allowed/blocked/expiry), daily spend limits, trust score
// Fixture: trade log — arrives in Phase 5 (Arc settlement)

import { LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import { EXAMPLE_TRADES, fmtUsdc, fmtExpiry } from '@/lib/example-data'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge, TierBadge } from '@/components/ui/Badge'
import { KillSwitch } from '@/components/dashboard/KillSwitch'
import { TradeLog } from '@/components/dashboard/TradeLog'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve':      'Curve',
  'aave-v3':    'Aave v3',
  '1inch':      '1inch',
  'gmx-perp':   'GMX Perps',
  'compound-v3': 'Compound v3',
}

const ALL_KNOWN_PROTOCOLS = ['uniswap-v3', 'curve', 'aave-v3', 'gmx-perp', '1inch', 'compound-v3']
const ALL_KNOWN_POSITION_TYPES = ['spot', 'lp', 'perp']

// Computed at module load (server component) — avoids Date.now() inside render
const NOW_S = Math.floor(Date.now() / 1000)

export default async function DashboardPage() {
  const data = await getAgentLiveData()

  const blockedProtocols = ALL_KNOWN_PROTOCOLS.filter(p => !data.allowedProtocols.includes(p))
  const blockedPositionTypes = ALL_KNOWN_POSITION_TYPES.filter(t => !data.allowedPositionTypes.includes(t))

  const expiry = data.scopeExpiry ? fmtExpiry(data.scopeExpiry) : '—'
  const expiresUrgent = data.scopeExpiry ? (data.scopeExpiry - NOW_S < 3 * 86400) : false

  // Daily spend — example data until Phase 5 wires Arc settlement
  const exampleDailySpent = EXAMPLE_TRADES
    .filter(t => t.status === 'approved')
    .reduce((s, t) => s + t.amountUsdc, 0)

  return (
    <div className="flex flex-col gap-0">
      {/* ── Policy Strip ── always visible ── */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]">
        {/* Agent line */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2">
          <span className="font-mono text-sm font-semibold text-[var(--text)]">
            {LIVE_AGENT.ensName}
          </span>
          <TierBadge tier={LIVE_AGENT.tier} />
          <span className="font-mono text-xs text-[var(--text-3)]">#{LIVE_AGENT.agentId}</span>
          {data.fetchError ? (
            <span className="ml-auto text-xs text-red-400">data error</span>
          ) : (
            <span className="ml-auto hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400">
                {data.scopeFound ? 'Live' : 'Syncing'}
              </span>
            </span>
          )}
        </div>

        {/* Three-column policy strip */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
          {/* ALLOWED */}
          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
              ✓ Allowed
            </p>
            <div className="flex flex-wrap gap-1">
              {data.allowedProtocols.length > 0 ? (
                data.allowedProtocols.map(p => (
                  <Badge key={p} variant="success">{PROTOCOL_LABELS[p] ?? p}</Badge>
                ))
              ) : (
                <span className="text-xs text-[var(--text-3)]">—</span>
              )}
              {data.allowedPositionTypes.map(t => (
                <Badge key={t} variant="neutral">{t.toUpperCase()}</Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--text-3)]">
              Max {data.maxPositionSizeUsdc !== null ? fmtUsdc(data.maxPositionSizeUsdc) : '—'} / trade ·{' '}
              {data.maxDailySpendUsdc !== null ? fmtUsdc(data.maxDailySpendUsdc) : '—'} / day
            </p>
          </div>

          {/* BLOCKED */}
          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-500">
              ✕ Not Authorized
            </p>
            <div className="flex flex-wrap gap-1">
              {blockedProtocols.map(p => (
                <Badge key={p} variant="danger">{PROTOCOL_LABELS[p] ?? p}</Badge>
              ))}
              {blockedPositionTypes.map(t => (
                <Badge key={t} variant="danger">{t.toUpperCase()}</Badge>
              ))}
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
              Trust score: {data.trustScore.toFixed(1)} / 100
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {/* Data source notice */}
        {data.fetchError ? (
          <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            Live data error: {data.fetchError}
          </div>
        ) : !data.scopeFound ? (
          <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            Subgraph syncing — scope not yet indexed. Policy strip populates once a PermissionSynced event is indexed.
          </div>
        ) : (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
            Live data · {data.syncCount} sync{data.syncCount !== 1 ? 's' : ''} indexed ·{' '}
            last synced {data.lastSyncedAt ? new Date(data.lastSyncedAt * 1000).toLocaleString() : '—'}
          </div>
        )}

        {/* Kill switch */}
        <KillSwitch />

        {/* Daily spend meter */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spend</CardTitle>
            <span className="font-mono text-xs text-[var(--text-2)]">
              {fmtUsdc(exampleDailySpent)} /{' '}
              {data.maxDailySpendUsdc !== null ? fmtUsdc(data.maxDailySpendUsdc) : '—'}
            </span>
          </CardHeader>
          <CardBody>
            {(() => {
              const limit = data.maxDailySpendUsdc ?? 50_000
              const pct = Math.min((exampleDailySpent / limit) * 100, 100)
              const color = pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'
              return (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-[var(--text-3)]">
                    <span>{pct.toFixed(0)}% of daily limit used</span>
                    <span>
                      {data.maxDailySpendUsdc !== null
                        ? fmtUsdc(data.maxDailySpendUsdc - exampleDailySpent) + ' remaining'
                        : '—'}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-amber-400/70">
                    Spend figures are example data · live trade log wires in Phase 5
                  </p>
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
