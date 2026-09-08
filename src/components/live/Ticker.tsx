'use client'

import { useLive } from './LiveProvider'
import { untilExpiry, usd } from '@/lib/format'
import { LIVE_AGENT } from '@/lib/server-data'

export function Ticker() {
  const { snap } = useLive()
  const a = snap?.agent
  const items: Array<[string, string, 'seal' | 'allow' | 'chain' | 'deny' | 'plain']> = [
    ['ARC BLOCK', snap ? snap.arc.blockNumber.toLocaleString() : '…', 'chain'],
    ['BALANCE', snap ? usd(snap.arc.balanceUsdc, { cents: true }) : '…', 'plain'],
    ['TRUST', a ? a.trustScore.toFixed(1) : '…', a ? (a.trustScore >= 60 ? 'allow' : 'deny') : 'plain'],
    ['SCOPE', a ? untilExpiry(a.scopeExpiry).label : '…', 'seal'],
    ['PER TRADE', a ? usd(a.maxPositionSizeUsdc, { cents: false }) : '…', 'plain'],
    ['DAILY CAP', a ? usd(a.maxDailySpendUsdc, { cents: false }) : '…', 'plain'],
    ['SPENT 24H', snap ? usd(snap.spentTodayUsdc, { cents: true }) : '…', 'plain'],
    ['SETTLEMENTS', snap ? String(snap.settlements.length) : '…', 'allow'],
    ['SYNCS', a?.syncCount != null ? String(a.syncCount) : '…', 'chain'],
    ['AGENT', LIVE_AGENT.ensName, 'seal'],
    ['ERC-8004', `#${LIVE_AGENT.agentId}`, 'plain'],
    ['STATUS', a ? (a.authorized ? 'AUTHORIZED' : 'REVOKED') : '…', a ? (a.authorized ? 'allow' : 'deny') : 'plain'],
  ]
  const tone = { seal: 'text-seal', allow: 'text-allow', chain: 'text-chain', deny: 'text-deny', plain: 'text-text' }
  const row = items.map(([k, v, t], i) => (
    <span key={i} className="flex items-center gap-2 pr-10">
      <span className="eyebrow !text-[9.5px]">{k}</span>
      <span className={`num text-[12px] font-semibold ${tone[t]}`}>{v}</span>
    </span>
  ))
  return (
    <div className="relative w-full min-w-0 overflow-hidden border-y border-line bg-bg-2/60 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent" />
      <div className="marquee flex w-max">
        <div className="flex">{row}</div>
        <div className="flex" aria-hidden>{row}</div>
      </div>
    </div>
  )
}
