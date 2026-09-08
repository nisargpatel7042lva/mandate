'use client'

import { useLive } from './LiveProvider'
import type { LiveEvent } from '@/lib/live'
import { TxLink } from '@/components/ui/TxLink'
import { relTime, usd, nowSeconds } from '@/lib/format'

export function LiveFeed({ initial, limit = 8 }: { initial: LiveEvent[]; limit?: number }) {
  const { snap, lastFetch } = useLive()
  const events = (snap?.events ?? initial).slice(0, limit)
  const nowS = nowSeconds()

  if (events.length === 0) {
    return <div className="px-4 py-8 text-center text-[13px] text-text-3">No on-chain events yet. Settlements and permission syncs appear here as they land.</div>
  }
  return (
    <ul className="divide-y divide-line">
      {events.map((e, i) => {
        const settle = e.kind === 'settlement'
        const tone = settle ? (e.success ? 'allow' : 'deny') : 'chain'
        return (
          <li key={e.id} className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2/60 reveal" style={{ ['--i' as string]: i }}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${tone === 'allow' ? 'bg-allow' : tone === 'deny' ? 'bg-deny' : 'bg-chain'} ${i === 0 ? 'live-dot' : ''}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-text">{settle ? (e.success ? 'USDC settled' : 'Settlement failed') : 'Permission synced'}</span>
                <span className="font-mono text-[10.5px] uppercase text-text-3">{e.chain === 'arc' ? 'Arc' : 'Sepolia'} · #{e.blockNumber.toLocaleString()}</span>
              </div>
              <TxLink hash={e.txHash} chain={e.chain} className="opacity-70 group-hover:opacity-100" />
            </div>
            <div className="text-right">
              {settle && <div className={`num text-[13px] font-semibold ${e.success ? 'text-allow' : 'text-deny'}`}>{usd(e.amountUsdc ?? 0, { cents: true })}</div>}
              <div className="text-[10.5px] text-text-3">{relTime(e.timestamp, nowS)}</div>
            </div>
          </li>
        )
      })}
      <li className="px-4 py-2 text-[10.5px] text-text-3">{lastFetch ? `Snapshot ${new Date(lastFetch).toLocaleTimeString()} · refreshes every 30s` : 'Server snapshot · live polling starts on hydrate'}{snap?.settlementsError ? <span className="text-warn"> · ArcScan rate-limited, showing last good list</span> : null}</li>
    </ul>
  )
}
