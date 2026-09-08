// Ledger — spend against caps, every on-chain event, and the emergency control.

import Link from 'next/link'
import { LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import { getArcSettlements } from '@/lib/arc-data'
import { fetchRecentUpdates } from '@/lib/mandate-subgraph'
import type { LiveEvent } from '@/lib/live'
import { untilExpiry, usd, protocolLabel, nowSeconds } from '@/lib/format'
import { Panel, PanelHead, Stat } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { Gauge } from '@/components/ui/Gauge'
import { LiveFeed } from '@/components/live/LiveFeed'
import { KillSwitch } from '@/components/dashboard/KillSwitch'
import { SpendBar } from '@/components/ui/SpendBar'

const ALL = ['uniswap-v3', 'curve', 'aave-v3', '1inch', 'gmx-perp', 'compound-v3']

export default async function LedgerPage() {
  const [data, settlementsData, updates] = await Promise.all([
    getAgentLiveData(), getArcSettlements(LIVE_AGENT.address), fetchRecentUpdates(LIVE_AGENT.address).catch(() => []),
  ])
  const nowS = nowSeconds()
  const ok = settlementsData.settlements.filter(s => s.success)
  const spent24 = ok.filter(s => s.timestamp >= nowS - 86400).reduce((a, s) => a + s.amountUsdc, 0)
  const total = ok.reduce((a, s) => a + s.amountUsdc, 0)
  const daily = data.maxDailySpendUsdc ?? 0
  const exp = untilExpiry(data.scopeExpiry)
  const events: LiveEvent[] = [
    ...settlementsData.settlements.map<LiveEvent>(s => ({ id: `arc:${s.txHash}`, kind: 'settlement', chain: 'arc', timestamp: s.timestamp, blockNumber: s.blockNumber, txHash: s.txHash, amountUsdc: s.amountUsdc, success: s.success })),
    ...updates.map<LiveEvent>(u => ({ id: `sep:${u.id}`, kind: 'sync', chain: 'sepolia', timestamp: parseInt(u.blockTimestamp, 10), blockNumber: parseInt(u.blockNumber, 10), txHash: u.transactionHash.startsWith('0x') ? u.transactionHash : `0x${u.transactionHash}` })),
  ].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="flex flex-col gap-5">
      <div className="reveal flex flex-wrap items-end justify-between gap-3" style={{ ['--i' as string]: 0 }}>
        <div>
          <div className="eyebrow">Ledger</div>
          <h1 className="display mt-1 text-[34px] leading-none sm:text-[40px]">Every dollar, <em className="text-seal">every sync.</em></h1>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          {data.fetchError ? <Chip tone="deny" dot>Subgraph error</Chip> : data.scopeFound ? <Chip tone="allow" live>Live</Chip> : <Chip tone="warn" dot>Syncing</Chip>}
          <span className="text-text-3">{events.length} events · {data.syncCount ?? 0} syncs · {ok.length} settlements</span>
        </div>
      </div>

      {/* Spend row */}
      <section className="reveal grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ ['--i' as string]: 1 }}>
        <Panel className="p-4" hover><Stat label="Spent · 24h" value={usd(spent24, { cents: true })} sub={`of ${usd(daily, { cents: false })} daily cap`} tone="allow" big /></Panel>
        <Panel className="p-4" hover><Stat label="Cap remaining" value={usd(Math.max(0, daily - spent24), { cents: false })} sub={spent24 === 0 ? 'full capacity' : `${((spent24 / daily) * 100).toFixed(3)}% used`} tone="seal" big /></Panel>
        <Panel className="p-4" hover><Stat label="Total settled" value={usd(total, { cents: true })} sub={`${ok.length} Arc transfer${ok.length === 1 ? '' : 's'} · all time`} tone="chain" big /></Panel>
        <Panel className="p-4" hover>
          <div className="flex items-center justify-between">
            <Stat label="Scope validity" value={exp.label} sub={data.scopeExpiry ? new Date(data.scopeExpiry * 1000).toISOString().slice(0, 10) : '—'} tone={exp.expired ? 'deny' : undefined} big />
            <Gauge pct={Math.min(100, (exp.days / 30) * 100)} size={56} stroke={5} tone={exp.expired ? 'deny' : 'seal'} label={<span className="num text-[10px] font-bold">{Math.round(exp.days)}d</span>} />
          </div>
        </Panel>
      </section>

      <section className="reveal" style={{ ['--i' as string]: 2 }}>
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between"><span className="eyebrow">Daily cap utilisation</span><span className="num text-[11px] text-text-3">{usd(spent24, { cents: true })} / {usd(daily, { cents: false })}</span></div>
          <SpendBar spent={spent24} cap={daily} perTrade={data.maxPositionSizeUsdc ?? 0} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="reveal flex flex-col gap-4 lg:col-span-4" style={{ ['--i' as string]: 3 }}>
          <Panel>
            <PanelHead title="Policy matrix" right={<span>PermissionMirror · Sepolia</span>} />
            <div className="p-4">
              <div className="eyebrow mb-2 text-allow">Allowed</div>
              <div className="flex flex-wrap gap-1.5">
                {data.allowedProtocols.map(p => <Link key={p} href={`/execute?protocol=${p}`}><Chip tone="allow" dot>{protocolLabel(p)}</Chip></Link>)}
                {data.allowedPositionTypes.map(t => <Chip key={t} tone="neutral">{t.toUpperCase()}</Chip>)}
              </div>
              <div className="eyebrow mb-2 mt-4 text-deny">Reverts at allowlist</div>
              <div className="flex flex-wrap gap-1.5">
                {ALL.filter(p => !data.allowedProtocols.includes(p)).map(p => <Link key={p} href={`/execute?protocol=${p}`}><Chip tone="deny" dot>{protocolLabel(p)}</Chip></Link>)}
                {['spot', 'lp', 'perp'].filter(t => !data.allowedPositionTypes.includes(t)).map(t => <Chip key={t} tone="deny">{t.toUpperCase()}</Chip>)}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[12px]">
                <div><dt className="text-text-3">Per trade</dt><dd className="num text-text">{usd(data.maxPositionSizeUsdc, { cents: false })}</dd></div>
                <div><dt className="text-text-3">Per day</dt><dd className="num text-text">{usd(data.maxDailySpendUsdc, { cents: false })}</dd></div>
              </dl>
            </div>
          </Panel>
          <div>
            <div className="eyebrow mb-2 text-deny">Emergency</div>
            <KillSwitch agentAddress={LIVE_AGENT.address} />
          </div>
        </div>

        <Panel className="reveal overflow-hidden lg:col-span-8" style={{ ['--i' as string]: 4 }}>
          <PanelHead title="Event timeline" right={<span>Arc settlements + Sepolia permission syncs · newest first</span>} />
          <LiveFeed initial={events} limit={50} />
        </Panel>
      </section>
    </div>
  )
}
