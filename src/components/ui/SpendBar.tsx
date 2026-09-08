// Horizontal cap meter with the per-trade cap marked. Server-safe.
import { usd } from '@/lib/format'

export function SpendBar({ spent, cap, perTrade }: { spent: number; cap: number; perTrade: number }) {
  const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0
  const tradePct = cap > 0 ? Math.min(100, (perTrade / cap) * 100) : 0
  return (
    <div className="relative pt-1 pb-6">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-bg-2 ring-1 ring-inset ring-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-allow/70 to-allow shadow-[0_0_14px_var(--allow)]" style={{ width: `${Math.max(pct, spent > 0 ? 0.6 : 0)}%`, transition: 'width 1s var(--ease-out-expo)' }} />
        {Array.from({ length: 20 }).map((_, i) => <span key={i} className="absolute inset-y-0 w-px bg-bg/60" style={{ left: `${(i + 1) * 5}%` }} />)}
      </div>
      {tradePct > 0 && (
        <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${tradePct}%` }}>
          <span className="h-5 w-px bg-seal" />
          <span className="mt-0.5 whitespace-nowrap font-mono text-[9.5px] text-seal">one max trade · {usd(perTrade, { compact: true })}</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 font-mono text-[10px] text-text-3">$0</div>
      <div className="absolute bottom-0 right-0 font-mono text-[10px] text-text-3">{usd(cap, { cents: false })} cap</div>
    </div>
  )
}
