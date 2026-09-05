// Screen A: Agent Overview
// EXAMPLE_DATA: all values are placeholder — wire to ERC-8004 + ENSv2 reads in Phase 3

import { EXAMPLE_AGENT, EXAMPLE_TRADES, shortAddr, fmtUsdc, fmtExpiry, fmtTime } from '@/lib/example-data'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge, StatusBadge, TierBadge } from '@/components/ui/Badge'

const TIER_RING: Record<string, string> = {
  analytics:  'ring-1 ring-[var(--border)]',
  monitoring: 'ring-2 ring-blue-500',
  autonomous: 'ring-2 ring-orange-500',
}

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve':      'Curve',
  'aave-v3':    'Aave v3',
}

export default function AgentOverviewPage() {
  const agent = EXAMPLE_AGENT
  const recentTrades = EXAMPLE_TRADES.slice(0, 4)
  const expiry = fmtExpiry(agent.permissions.expiryTimestamp)
  const blockedCount = EXAMPLE_TRADES.filter(t => t.status === 'blocked').length
  const approvedCount = EXAMPLE_TRADES.filter(t => t.status === 'approved').length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Example data notice */}
      <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
        Example data · Wire to ERC-8004 + ENSv2 in Phase 3
      </div>

      {/* Agent identity header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar with tier ring */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xl ${TIER_RING[agent.tier]}`}
          >
            ◈
          </div>
          <div>
            <h1 className="font-mono text-xl font-semibold text-[var(--text)]">
              {agent.ensName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[var(--text-3)]">#{agent.agentId}</span>
              <span className="text-[var(--border)]">·</span>
              <TierBadge tier={agent.tier} />
              <span className="text-[var(--border)]">·</span>
              <span className="font-mono text-xs text-[var(--text-2)]">
                owner {shortAddr(agent.ownerAddress)}
              </span>
            </div>
          </div>
        </div>

        {/* Trust score */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Trust Score</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--text)]">
            {agent.trustScore.toFixed(1)}
          </p>
          <p className="text-xs text-emerald-400">
            +{agent.trustScoreDelta.toFixed(1)} this period
          </p>
        </div>
      </div>

      {/* Permission scope cards */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
          Permission Scope
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Protocols */}
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Protocols</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.permissions.allowedProtocols.map(p => (
                  <Badge key={p} variant="brand">{PROTOCOL_LABELS[p] ?? p}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Position types */}
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Positions</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.permissions.allowedPositionTypes.map(t => (
                  <Badge key={t} variant="neutral">{t.toUpperCase()}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Max position */}
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Max Position</p>
              <p className="mt-2 font-mono text-lg font-semibold text-[var(--text)]">
                {fmtUsdc(agent.permissions.maxPositionSizeUsdc)}
              </p>
              <p className="text-xs text-[var(--text-3)]">per trade</p>
            </CardBody>
          </Card>

          {/* Expiry */}
          <Card accentColor={expiry === 'Expired' ? '#ef4444' : undefined}>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Expires In</p>
              <p className={`mt-2 font-mono text-lg font-semibold ${expiry === 'Expired' ? 'text-red-400' : 'text-[var(--text)]'}`}>
                {expiry}
              </p>
              <p className="text-xs text-[var(--text-3)]">max daily {fmtUsdc(agent.permissions.maxDailySpendUsdc)}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Decisions', value: EXAMPLE_TRADES.length, color: '' },
          { label: 'Approved',        value: approvedCount,         color: 'text-emerald-400' },
          { label: 'Blocked',         value: blockedCount,          color: 'text-red-400' },
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

      {/* Recent activity */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
            Recent Activity
          </h2>
          <a href="/dashboard" className="text-xs text-[var(--brand,#0ea5e9)] hover:underline">
            Full log →
          </a>
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

      {/* ENS node / wallet details */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
          On-chain Identity
        </h2>
        <Card>
          <CardBody>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              {[
                { label: 'Agent Wallet',  value: agent.agentWallet },
                { label: 'Owner',         value: agent.ownerAddress },
                { label: 'ENS Node',      value: agent.permissions.ensNode },
                { label: 'Token URI',     value: agent.tokenUri, truncate: true },
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
    </div>
  )
}
