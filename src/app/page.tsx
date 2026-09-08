// Screen A: Agent Overview — wired to live on-chain data (Phase 4)
// Live: trust score, permission scope, expiry — from composeRiskScore + Mandate subgraph
// Fixture: recent trades — arrives in Phase 5 (Arc settlement)

import {
  LIVE_AGENT,
  getAgentLiveData,
  type AgentLiveData,
} from '@/lib/server-data'
import { shortAddr, fmtUsdc, fmtExpiry } from '@/lib/example-data'
import { getArcSettlements, arcExplorerTx } from '@/lib/arc-data'
import { Card, CardBody, StatCard } from '@/components/ui/Card'
import { Badge, TierBadge } from '@/components/ui/Badge'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve':      'Curve',
  'aave-v3':    'Aave v3',
  '1inch':      '1inch',
  'gmx-perp':   'GMX Perps',
  'compound-v3': 'Compound v3',
}

const TIER_RING: Record<string, string> = {
  analytics:  'ring-1 ring-[var(--border)]',
  monitoring: 'ring-2 ring-blue-500',
  autonomous: 'ring-2 ring-orange-500',
}

function DataSourceBanner({ data }: { data: AgentLiveData }) {
  if (data.fetchError) {
    return (
      <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
        Live data unavailable: {data.fetchError}
      </div>
    )
  }
  if (!data.scopeFound) {
    return (
      <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
        Subgraph syncing — permission scope not yet indexed. Re-check after the next PermissionSynced event.
      </div>
    )
  }
  return (
    <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
      Live data · ENS {LIVE_AGENT.ensName} · ERC-8004 agent #{LIVE_AGENT.agentId} · Mandate subgraph v0.0.2
    </div>
  )
}

function fmtTs(unixSecs: number): string {
  return new Date(unixSecs * 1000).toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}

export default async function AgentOverviewPage() {
  const [data, settlementsData] = await Promise.all([
    getAgentLiveData(),
    getArcSettlements(LIVE_AGENT.address),
  ])

  const expiry = data.scopeExpiry ? fmtExpiry(data.scopeExpiry) : '—'
  const expiryExpired = expiry === 'Expired'

  return (
    <div className="flex flex-col gap-6 p-6">
      <DataSourceBanner data={data} />

      {/* Agent identity header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xl ${TIER_RING[LIVE_AGENT.tier]}`}
          >
            ◈
          </div>
          <div>
            <h1 className="font-mono text-xl font-semibold text-[var(--text)]">
              {LIVE_AGENT.ensName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[var(--text-3)]">#{LIVE_AGENT.agentId}</span>
              <span className="text-[var(--border)]">·</span>
              <TierBadge tier={LIVE_AGENT.tier} />
              <span className="text-[var(--border)]">·</span>
              <span className="font-mono text-xs text-[var(--text-2)]">
                owner {shortAddr(LIVE_AGENT.ownerAddress)}
              </span>
            </div>
          </div>
        </div>

        {/* Trust score */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-right glow-emerald">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/70">Trust Score</p>
          <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-gradient-emerald">
            {data.trustScore.toFixed(1)}
          </p>
          {data.erc8004Score === null ? (
            <p className="mt-0.5 text-xs text-[var(--text-3)]">ERC-8004 unknown · Sepolia</p>
          ) : (
            <p className="mt-0.5 text-xs text-emerald-400/80">ERC-8004 · {data.erc8004Score.toFixed(0)}</p>
          )}
        </div>
      </div>

      {/* Permission scope cards */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
          Permission Scope
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Protocols</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {data.allowedProtocols.length > 0 ? (
                  data.allowedProtocols.map(p => (
                    <Badge key={p} variant="brand">{PROTOCOL_LABELS[p] ?? p}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-3)]">—</span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Positions</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {data.allowedPositionTypes.length > 0 ? (
                  data.allowedPositionTypes.map(t => (
                    <Badge key={t} variant="neutral">{t.toUpperCase()}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-3)]">—</span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Max Position</p>
              <p className="mt-2 font-mono text-lg font-semibold text-[var(--text)]">
                {data.maxPositionSizeUsdc !== null ? fmtUsdc(data.maxPositionSizeUsdc) : '—'}
              </p>
              <p className="text-xs text-[var(--text-3)]">per trade</p>
            </CardBody>
          </Card>

          <Card accentColor={expiryExpired ? '#ef4444' : undefined}>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Expires In</p>
              <p className={`mt-2 font-mono text-lg font-semibold ${expiryExpired ? 'text-red-400' : 'text-[var(--text)]'}`}>
                {expiry}
              </p>
              <p className="text-xs text-[var(--text-3)]">
                max daily {data.maxDailySpendUsdc !== null ? fmtUsdc(data.maxDailySpendUsdc) : '—'}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Trust Score',   value: data.trustScore.toFixed(1),   accent: undefined as 'emerald' | 'brand' | undefined },
          { label: 'Mandate Score', value: data.mandateHistoryScore.toString(), accent: 'emerald' as const },
          { label: 'ERC-8004',      value: data.erc8004Score !== null ? data.erc8004Score.toFixed(0) : '—', accent: 'brand' as const },
        ].map(({ label, value, accent }) => (
          <StatCard key={label} label={label} value={value} accent={accent} />
        ))}
      </div>

      {/* Recent Arc settlements — live */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
            Recent Arc Settlements
          </h2>
          <a href="/treasury" className="text-xs text-[var(--brand,#0ea5e9)] hover:underline">
            Full history →
          </a>
        </div>
        {settlementsData.fetchError ? (
          <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            ArcScan unavailable: {settlementsData.fetchError}
          </div>
        ) : settlementsData.settlements.length === 0 ? (
          <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-3)]">
            No Arc USDC settlements yet · transfers appear here in real time
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-[var(--border)]">
              {settlementsData.settlements.slice(0, 4).map(s => (
                <div key={s.txHash} className="flex items-center gap-4 px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                    s.success
                      ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 ring-red-500/20'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {s.success ? 'Settled' : 'Failed'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[var(--text)]">
                      Block {s.blockNumber.toLocaleString()}
                    </p>
                    <a
                      href={arcExplorerTx(s.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-[var(--text-3)] underline hover:text-[var(--text-2)]"
                    >
                      {s.txHash.slice(0, 8)}…{s.txHash.slice(-6)} ↗
                    </a>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-emerald-400">
                      {s.amountUsdc < 1
                        ? `$${s.amountUsdc.toFixed(2)}`
                        : `$${s.amountUsdc.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-xs text-[var(--text-3)]">{fmtTs(s.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* On-chain identity */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
          On-chain Identity
        </h2>
        <Card>
          <CardBody>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                { label: 'Agent Wallet', value: LIVE_AGENT.address },
                { label: 'Owner',        value: LIVE_AGENT.ownerAddress },
                { label: 'ENS Name',     value: LIVE_AGENT.ensName },
                { label: 'ERC-8004 ID',  value: `#${LIVE_AGENT.agentId}` },
                { label: 'ENS Node',     value: data.ensNode ?? '—' },
                { label: 'Token URI',    value: LIVE_AGENT.tokenUri, truncate: true },
              ].map(({ label, value, truncate }) => (
                <div key={label}>
                  <dt className="text-xs text-[var(--text-3)]">{label}</dt>
                  <dd className={`mt-0.5 font-mono text-xs text-[var(--text-2)] ${truncate ? 'truncate' : ''}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Subgraph sync metadata */}
      {data.scopeFound && data.syncCount !== null && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
            Subgraph State
          </h2>
          <Card>
            <CardBody>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  { label: 'Sync count',   value: data.syncCount.toString() },
                  { label: 'Last synced',  value: data.lastSyncedAt ? new Date(data.lastSyncedAt * 1000).toLocaleString() : '—' },
                  { label: 'Scope expiry', value: data.scopeExpiry ? new Date(data.scopeExpiry * 1000).toISOString().slice(0, 10) : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-[var(--text-3)]">{label}</dt>
                    <dd className="mt-0.5 font-mono text-xs text-[var(--text-2)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
