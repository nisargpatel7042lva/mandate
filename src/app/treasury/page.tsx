// Screen D: Treasury / Settlement View
// Placeholder for Phase 6 (Circle Arc settlement wiring)
// EXAMPLE_DATA: all values are placeholder — wire to Arc/USDC API in Phase 6

import { EXAMPLE_TREASURY, EXAMPLE_SETTLEMENTS, EXAMPLE_AGENT, fmtUsdc, fmtTime, shortAddr } from '@/lib/example-data'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

function SettlementStatusBadge({ status }: { status: string }) {
  if (status === 'settled')
    return <Badge variant="success" dot>SETTLED</Badge>
  if (status === 'pending')
    return <Badge variant="warning" dot>PENDING</Badge>
  return <Badge variant="danger" dot>FAILED</Badge>
}

function BalanceRing({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function TreasuryPage() {
  const treasury = EXAMPLE_TREASURY
  const agent = EXAMPLE_AGENT
  const pendingTotal = EXAMPLE_SETTLEMENTS
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amountUsdc, 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Example data notice */}
      <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
        Example data · Wire to Arc Agent Stack API + Circle USDC in Phase 6
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text)]">Treasury</h1>
        <span className="font-mono text-xs text-[var(--text-3)]">{agent.ensName}</span>
      </div>

      {/* Balance overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Available USDC */}
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="relative">
              <BalanceRing
                value={treasury.availableUsdc}
                max={treasury.maxUsdc}
                color="#22c55e"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-[var(--text-3)]">avail</span>
                <span className="font-mono text-xs font-semibold text-[var(--text)]">
                  {Math.round((treasury.availableUsdc / treasury.maxUsdc) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Available USDC</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
                {fmtUsdc(treasury.availableUsdc)}
              </p>
              <p className="text-xs text-[var(--text-3)]">of {fmtUsdc(treasury.maxUsdc)} allocated</p>
            </div>
          </CardBody>
        </Card>

        {/* Daily spend */}
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="relative">
              <BalanceRing
                value={treasury.todaySpentUsdc}
                max={treasury.dailyLimitUsdc}
                color={treasury.todaySpentUsdc / treasury.dailyLimitUsdc > 0.8 ? '#f59e0b' : '#0ea5e9'}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-[var(--text-3)]">spent</span>
                <span className="font-mono text-xs font-semibold text-[var(--text)]">
                  {Math.round((treasury.todaySpentUsdc / treasury.dailyLimitUsdc) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Today&apos;s Spend</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
                {fmtUsdc(treasury.todaySpentUsdc)}
              </p>
              <p className="text-xs text-[var(--text-3)]">of {fmtUsdc(treasury.dailyLimitUsdc)} daily limit</p>
            </div>
          </CardBody>
        </Card>

        {/* Pending settlements */}
        <Card>
          <CardBody className="flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Pending Settlements</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
                {treasury.pendingSettlements}
              </p>
              <p className="text-xs text-[var(--text-3)]">
                {fmtUsdc(pendingTotal)} awaiting Arc confirmation
              </p>
            </div>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              Arc wiring pending Phase 6
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Settlement history */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
          <Badge variant="neutral">Circle Arc · USDC</Badge>
        </CardHeader>

        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_100px_140px_80px] gap-4 border-b border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
          <span>Settlement ID</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Status</span>
          <span>Timestamp</span>
          <span>Trade</span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {EXAMPLE_SETTLEMENTS.map(s => (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_80px_100px_140px_80px] gap-4 px-4 py-3 text-sm transition-colors hover:bg-[var(--surface-2)]"
            >
              <div>
                <p className="font-mono text-xs text-[var(--text)]">{s.id}</p>
                <p className="font-mono text-xs text-[var(--text-3)]">→ {shortAddr(s.recipient)}</p>
              </div>
              <span className="text-right font-mono text-xs text-[var(--text)]">
                {fmtUsdc(s.amountUsdc)}
              </span>
              <span className="flex justify-center">
                <SettlementStatusBadge status={s.status} />
              </span>
              <span className="font-mono text-xs text-[var(--text-3)]">
                {fmtTime(s.timestamp)}
              </span>
              <span className="font-mono text-xs text-[var(--text-3)]">{s.tradeId}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Reputation write-back placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Reputation Write-back</CardTitle>
          <Badge variant="neutral">Phase 6</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-[var(--text-2)]">
            After each settled trade, Mandate will write feedback to the ERC-8004 Reputation
            Registry. Positive settlements increase the trust score; policy violations decrease it.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-center text-sm">
            <div>
              <p className="font-mono text-lg font-semibold text-[var(--text)]">
                {agent.trustScore.toFixed(1)}
              </p>
              <p className="text-xs text-[var(--text-3)]">Current score</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-emerald-400">+2.1</p>
              <p className="text-xs text-[var(--text-3)]">This period</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-[var(--text)]">4</p>
              <p className="text-xs text-[var(--text-3)]">Settled trades</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
