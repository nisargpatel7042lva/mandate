// Console — the daily first screen. Live authority state, the perimeter map,
// a one-click simulator, and the unified on-chain feed.

import Link from 'next/link'
import { LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import { getArcBalance, getArcSettlements } from '@/lib/arc-data'
import { fetchRecentUpdates } from '@/lib/mandate-subgraph'
import type { LiveEvent } from '@/lib/live'
import { untilExpiry, usd, protocolLabel, shortAddr, EXPLORER, nowSeconds } from '@/lib/format'
import { Panel, PanelHead, Stat } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { Gauge } from '@/components/ui/Gauge'
import { Ticker } from '@/components/live/Ticker'
import { LiveFeed } from '@/components/live/LiveFeed'
import { QuickSim } from '@/components/enforcement/QuickSim'
import { MapPanel } from '@/components/viz/MapPanel'

const SCOPE_WINDOW_S = 30 * 86400 // relayer syncs a 30-day scope

export default async function ConsolePage() {
  const [data, arc, settlementsData, updates] = await Promise.all([
    getAgentLiveData(),
    getArcBalance(LIVE_AGENT.address),
    getArcSettlements(LIVE_AGENT.address),
    fetchRecentUpdates(LIVE_AGENT.address).catch(() => []),
  ])
  const nowS = nowSeconds()
  const exp = untilExpiry(data.scopeExpiry)
  const expiryFrac = data.scopeExpiry ? Math.max(0, Math.min(1, (data.scopeExpiry - nowS) / SCOPE_WINDOW_S)) : 0
  const ok = settlementsData.settlements.filter(s => s.success)
  const spent24 = ok.filter(s => s.timestamp >= nowS - 86400).reduce((a, s) => a + s.amountUsdc, 0)
  const dailyCap = data.maxDailySpendUsdc ?? 0
  const spentPct = dailyCap > 0 ? (spent24 / dailyCap) * 100 : 0

  const events: LiveEvent[] = [
    ...settlementsData.settlements.map<LiveEvent>(s => ({ id: `arc:${s.txHash}`, kind: 'settlement', chain: 'arc', timestamp: s.timestamp, blockNumber: s.blockNumber, txHash: s.txHash, amountUsdc: s.amountUsdc, success: s.success })),
    ...updates.map<LiveEvent>(u => ({ id: `sep:${u.id}`, kind: 'sync', chain: 'sepolia', timestamp: parseInt(u.blockTimestamp, 10), blockNumber: parseInt(u.blockNumber, 10), txHash: u.transactionHash.startsWith('0x') ? u.transactionHash : `0x${u.transactionHash}` })),
  ].sort((a, b) => b.timestamp - a.timestamp)

  const status = data.fetchError ? 'error' : !data.scopeFound ? 'syncing' : data.authorized ? 'authorized' : 'revoked'

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* ── Status line ── */}
      <div className="reveal flex flex-wrap items-center gap-2 text-[12px]" style={{ ['--i' as string]: 0 }}>
        {status === 'error' && <Chip tone="deny" dot>Live data unavailable · {data.fetchError}</Chip>}
        {status === 'syncing' && <Chip tone="warn" dot>Subgraph syncing · scope not indexed yet</Chip>}
        {status === 'authorized' && <Chip tone="allow" live>Live</Chip>}
        {status === 'revoked' && <Chip tone="deny" dot>Authority revoked</Chip>}
        <span className="text-text-3">ENS <span className="font-mono text-text-2">{LIVE_AGENT.ensName}</span></span>
        <span className="text-text-3">· ERC-8004 <span className="font-mono text-text-2">#{LIVE_AGENT.agentId}</span></span>
        <span className="text-text-3">· Mandate subgraph v0.0.2 · Agent0 (Base)</span>
      </div>

      {/* ── Hero ── */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Statement */}
        <div className="reveal flex flex-col justify-between lg:col-span-4" style={{ ['--i' as string]: 1 }}>
          <div>
            <div className="eyebrow">Authority state</div>
            <h1 className="mt-3 text-[38px] font-medium leading-[1.05] tracking-[-0.045em] text-white sm:text-[46px]">
              {status === 'authorized' ? <>Cleared to trade,<br /><em className="display text-text-2">within bounds.</em></>
                : status === 'revoked' ? <>Authority<br /><em className="display text-deny">revoked.</em></>
                : status === 'syncing' ? <>Waiting on<br /><em className="display text-warn">the index.</em></>
                : <>Live data<br /><em className="display text-deny">unreachable.</em></>}
            </h1>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-text-2">
              The mandate lives in an ENS record and a mirror contract the agent cannot edit.
              Every trade is checked against it, composed with live reputation, at the moment of execution.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <Gauge pct={data.trustScore} size={116} tone={data.trustScore >= 60 ? 'allow' : 'deny'}
              label={<div className="num text-[26px] font-bold leading-none">{data.trustScore.toFixed(0)}</div>} sub="trust" />
            <div className="flex flex-col gap-2 text-[12px]">
              <div className="flex items-center justify-between gap-6"><span className="text-text-3">Threshold</span><span className="num text-text">60</span></div>
              <div className="flex items-center justify-between gap-6"><span className="text-text-3">Mandate history</span><span className="num text-allow">{data.mandateHistoryScore}</span></div>
              <div className="flex items-center justify-between gap-6"><span className="text-text-3">ERC-8004</span><span className="num text-chain">{data.erc8004Score === null ? 'n/a · Sepolia' : data.erc8004Score.toFixed(0)}</span></div>
              <div className="flex items-center justify-between gap-6"><span className="text-text-3">Scope expires</span><span className={`num ${exp.expired ? 'text-deny' : 'text-white'}`}>{exp.label}</span></div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="reveal lg:col-span-5" style={{ ['--i' as string]: 2 }}>
          <MapPanel allowed={data.allowedProtocols} trustScore={data.trustScore} expiryFrac={expiryFrac} authorized={status === 'authorized'} ensName={LIVE_AGENT.ensName} />
        </div>

        {/* Guardrails */}
        <div className="reveal flex flex-col gap-3 lg:col-span-3" style={{ ['--i' as string]: 3 }}>
          <Panel className="p-4" hover>
            <Stat label="Per-trade cap" value={usd(data.maxPositionSizeUsdc, { cents: false })} sub="maxPositionSizeUsdc · on-chain" />
          </Panel>
          <Panel className="p-4" hover>
            <div className="flex items-center justify-between">
              <Stat label="Spent · 24h" value={usd(spent24, { cents: true })} sub={`of ${usd(dailyCap, { cents: false })} daily cap`} tone="allow" />
              <Gauge pct={spentPct} size={64} stroke={6} tone={spentPct > 80 ? 'deny' : 'allow'} label={<span className="num text-[11px] font-bold">{spentPct < 0.01 && spent24 > 0 ? '<.01' : spentPct.toFixed(spentPct < 1 ? 2 : 0)}%</span>} />
            </div>
          </Panel>
          <Panel className="p-4" hover>
            <Stat label="Arc balance" value={usd(arc.balanceUsdc, { cents: true })} sub={arc.fetchError ? `RPC error` : `block ${arc.blockNumber.toLocaleString()} · native USDC`} tone="chain" />
          </Panel>
          <Panel className="p-4" hover>
            <div className="eyebrow">Positions</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['spot', 'lp', 'perp'].map(t => <Chip key={t} tone={data.allowedPositionTypes.includes(t) ? 'allow' : 'deny'} dot>{t.toUpperCase()}</Chip>)}
            </div>
          </Panel>
        </div>
      </section>

      <div className="reveal -mx-4 min-w-0 overflow-hidden sm:-mx-6" style={{ ['--i' as string]: 4 }}><Ticker /></div>

      {/* ── Quick simulate ── */}
      <section className="reveal" style={{ ['--i' as string]: 5 }}>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="eyebrow">Try an attempt</div>
            <h2 className="mt-1 text-lg font-semibold">What happens when the agent reaches?</h2>
          </div>
          <Link href="/execute" className="btn btn-seal">Open simulator</Link>
        </div>
        <QuickSim />
      </section>

      {/* ── Feed + identity ── */}
      <section className="grid gap-4 lg:grid-cols-12">
        <Panel className="reveal overflow-hidden lg:col-span-7" style={{ ['--i' as string]: 6 }}>
          <PanelHead title="On-chain feed" right={<span>Arc settlements · Sepolia syncs</span>} />
          <LiveFeed initial={events} />
        </Panel>

        <div className="reveal flex flex-col gap-4 lg:col-span-5" style={{ ['--i' as string]: 7 }}>
          <Panel>
            <PanelHead title="Scope · from PermissionMirror" right={<span>{data.syncCount ?? 0} syncs</span>} />
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {['uniswap-v3', 'curve', 'aave-v3', '1inch', 'gmx-perp', 'compound-v3'].map(p => (
                  <Link key={p} href={`/execute?protocol=${p}`} className="transition hover:scale-[1.03]">
                    <Chip tone={data.allowedProtocols.includes(p) ? 'allow' : 'deny'} dot>{protocolLabel(p)}</Chip>
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-text-3">Click a protocol to simulate against it. Denied protocols revert at the allowlist step.</p>
            </div>
          </Panel>
          <Panel>
            <PanelHead title="Identity" />
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 p-4 text-[12px] sm:grid-cols-2">
              {[
                ['Agent wallet', <a key="w" className="font-mono text-text-2 hover:text-chain" href={EXPLORER.sepoliaAddr(LIVE_AGENT.address)} target="_blank" rel="noopener noreferrer">{shortAddr(LIVE_AGENT.address, 10, 6)}</a>],
                ['Owner', <span key="o" className="font-mono text-text-2">{shortAddr(LIVE_AGENT.ownerAddress, 10, 6)}</span>],
                ['ENS node', <span key="n" className="font-mono text-text-2">{data.ensNode ? shortAddr(data.ensNode, 10, 6) : '—'}</span>],
                ['Last sync', <span key="s" className="font-mono text-text-2">{data.lastSyncedAt ? new Date(data.lastSyncedAt * 1000).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}</span>],
                ['Tier', <Chip key="t" tone="seal">AUTONOMOUS</Chip>],
                ['MCP', <a key="m" className="font-mono text-text-2 hover:text-chain" href="/api/mcp" target="_blank">/api/mcp ↗</a>],
              ].map(([k, v]) => (
                <div key={String(k)}><dt className="text-text-3">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>
          </Panel>
        </div>
      </section>
    </div>
  )
}
