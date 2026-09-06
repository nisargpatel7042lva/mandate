// Screen A: Agent Overview — wired to live on-chain data (Phase 4)
// Live: trust score, permission scope, expiry — from composeRiskScore + Mandate subgraph
// Fixture: recent trades — arrives in Phase 5 (Arc settlement)

import {
  LIVE_AGENT,
  getAgentLiveData,
  type AgentLiveData,
} from '@/lib/server-data'
import { EXAMPLE_TRADES, shortAddr, fmtUsdc, fmtExpiry, fmtTime } from '@/lib/example-data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge, StatusBadge, TierBadge } from '@/components/ui/Badge'

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

export default async function AgentOverviewPage() {
  const data = await getAgentLiveData()

  const recentTrades = EXAMPLE_TRADES.slice(0, 4)

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
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Trust Score</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--text)]">
            {data.trustScore.toFixed(1)}
          </p>
          {data.erc8004Score === null ? (
            <p className="text-xs text-[var(--text-3)]">ERC-8004 unknown · Sepolia agent</p>
          ) : (
            <p className="text-xs text-emerald-400">ERC-8004 {data.erc8004Score.toFixed(0)}</p>
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
          { label: 'Trust Score',   value: data.trustScore.toFixed(1), color: '' },
          { label: 'Mandate Score', value: data.mandateHistoryScore.toString(), color: 'text-emerald-400' },
          { label: 'ERC-8004',      value: data.erc8004Score !== null ? data.erc8004Score.toFixed(0) : 'Unknown', color: data.erc8004Score !== null ? 'text-blue-400' : 'text-[var(--text-3)]' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardBody className="text-center">
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">{label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${color || 'text-[var(--text)]'}`}>
                {value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent activity — fixture until Phase 5 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
            Recent Activity
          </h2>
          <a href="/dashboard" className="text-xs text-[var(--brand,#0ea5e9)] hover:underline">
            Full log →
          </a>
        </div>
        <div className="mb-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          Example trades · Trade log wires to Arc settlement events in Phase 5
        </div>
        <Card>
          <div className="divide-y divide-[var(--border)]">
            {recentTrades.map(trade => (
              <div key={trade.id} className="flex items-center gap-4 px-4 py-3">
                <StatusBadge status={trade.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text)]">
                    {trade.protocol} · {trade.action}
                  </p>
                  <p className="text-xs text-[var(--text-3)]">{trade.reason}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-[var(--text)]">{fmtUsdc(trade.amountUsdc)}</p>
                  <p className="text-xs text-[var(--text-3)]">{fmtTime(trade.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
