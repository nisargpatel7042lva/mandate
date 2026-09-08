// Screen B: Underwriting Dashboard — fully live (Phase 9)
// Live: policy strip, trust score, daily spend, settlement history — all real on-chain data

import { LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import { fmtUsdc, fmtExpiry } from '@/lib/example-data'
import { getArcSettlements, arcExplorerTx } from '@/lib/arc-data'
import { Card, CardHeader, CardTitle, CardBody, StatCard } from '@/components/ui/Card'
import { Badge, TierBadge } from '@/components/ui/Badge'
import { KillSwitch } from '@/components/dashboard/KillSwitch'

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

const NOW_S = Math.floor(Date.now() / 1000)

function fmtTs(unixSecs: number): string {
  return new Date(unixSecs * 1000).toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}

export default async function DashboardPage() {
  const [data, settlementsData] = await Promise.all([
    getAgentLiveData(),
    getArcSettlements(LIVE_AGENT.address),
  ])

  const blockedProtocols = ALL_KNOWN_PROTOCOLS.filter(p => !data.allowedProtocols.includes(p))
  const blockedPositionTypes = ALL_KNOWN_POSITION_TYPES.filter(t => !data.allowedPositionTypes.includes(t))

  const expiry = data.scopeExpiry ? fmtExpiry(data.scopeExpiry) : '—'
  const expiresUrgent = data.scopeExpiry ? (data.scopeExpiry - NOW_S < 3 * 86400) : false

  const settlements = settlementsData.settlements
  const totalSettled = settlements.filter(s => s.success).reduce((sum, s) => sum + s.amountUsdc, 0)
  const todayStart = NOW_S - 86400
  const todaySettled = settlements.filter(s => s.success && s.timestamp >= todayStart).reduce((sum, s) => sum + s.amountUsdc, 0)

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
            <p className={`font-mono text-xl font-semibold ${expiresUrgent ? 'text-amber-400' : 'text-[var(--text)]'}`}>
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
            Subgraph syncing — scope not yet indexed.
          </div>
        ) : (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
            Live · {data.syncCount} sync{data.syncCount !== 1 ? 's' : ''} indexed ·{' '}
            last synced {data.lastSyncedAt ? new Date(data.lastSyncedAt * 1000).toLocaleString() : '—'} ·{' '}
            {settlements.length} Arc settlement{settlements.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Kill switch */}
        <KillSwitch agentAddress={LIVE_AGENT.address} />

        {/* Settlement spend stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Today's Spend"
            value={todaySettled > 0 ? `$${todaySettled.toFixed(2)}` : '$0.00'}
            sub={`of ${data.maxDailySpendUsdc !== null ? fmtUsdc(data.maxDailySpendUsdc) : '—'} daily cap`}
          />
          <StatCard
            label="Total Settled"
            value={totalSettled > 0 ? `$${totalSettled.toFixed(2)}` : '$0.00'}
            sub={`${settlements.filter(s => s.success).length} successful Arc transfer${settlements.filter(s => s.success).length !== 1 ? 's' : ''}`}
            accent="emerald"
          />
          <StatCard
            label="Cap Remaining"
            value={data.maxDailySpendUsdc !== null
              ? `$${(data.maxDailySpendUsdc - todaySettled).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : '—'}
            sub={todaySettled === 0 ? 'Full capacity available' : `$${todaySettled.toFixed(2)} used today`}
            accent="brand"
          />
        </div>

        {/* Daily cap progress bar */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spend vs Cap</CardTitle>
            <span className="font-mono text-xs text-[var(--text-2)]">
              {todaySettled > 0 ? `$${todaySettled.toFixed(2)}` : '$0.00'} /{' '}
              {data.maxDailySpendUsdc !== null ? fmtUsdc(data.maxDailySpendUsdc) : '—'}
            </span>
          </CardHeader>
          <CardBody>
            {(() => {
              const limit = data.maxDailySpendUsdc ?? 50_000
              const pct = Math.min((todaySettled / limit) * 100, 100)
              const color = pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'
              return (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(pct, 0.5)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-[var(--text-3)]">
                    <span>{pct < 0.01 ? '<0.01' : pct.toFixed(2)}% of daily cap used today</span>
                    <span>
                      {data.maxDailySpendUsdc !== null
                        ? fmtUsdc(data.maxDailySpendUsdc - todaySettled) + ' remaining'
                        : '—'}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-400/70">
                    Live Arc USDC settlements ·{' '}
                    <a href="/treasury" className="underline hover:text-emerald-300">full settlement history →</a>
                  </p>
                </div>
              )
            })()}
          </CardBody>
        </Card>

        {/* Settlement History — real Arc transfers */}
        <Card>
          <CardHeader>
            <CardTitle>Settlement History</CardTitle>
            <Badge variant={settlements.length > 0 ? 'success' : 'neutral'}>
              {settlements.length > 0
                ? `${settlements.length} settlement${settlements.length !== 1 ? 's' : ''} · live`
                : 'Arc testnet · USDC'}
            </Badge>
          </CardHeader>

          {settlementsData.fetchError && (
            <div className="mx-4 mb-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              ArcScan unavailable: {settlementsData.fetchError}
            </div>
          )}

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_90px_90px_1fr] gap-3 border-b border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
            <span>Block · Time</span>
            <span className="text-right">Amount</span>
            <span className="text-center">Status</span>
            <span>Tx Hash</span>
          </div>

          {settlements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <p className="text-sm font-medium text-[var(--text-2)]">No Arc settlements yet</p>
              <p className="text-xs text-[var(--text-3)]">
                USDC transfers from the agent wallet appear here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {settlements.map(s => (
                <div key={s.txHash} className="grid grid-cols-[1fr_90px_90px_1fr] gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-mono text-xs text-[var(--text)]">
                      Block {s.blockNumber.toLocaleString()}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--text-3)]">
                      {fmtTs(s.timestamp)}
                    </p>
                  </div>
                  <p className="self-center text-right font-mono text-xs font-semibold text-emerald-400">
                    {s.amountUsdc < 1
                      ? `$${s.amountUsdc.toFixed(2)}`
                      : `$${s.amountUsdc.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                  </p>
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                      s.success
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 ring-red-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {s.success ? 'Settled' : 'Failed'}
                    </span>
                  </div>
                  <a
                    href={arcExplorerTx(s.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-center font-mono text-[10px] text-[var(--text-3)] underline hover:text-[var(--text-2)]"
                  >
                    {s.txHash.slice(0, 6)}…{s.txHash.slice(-4)} ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
