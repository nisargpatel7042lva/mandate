'use client'

// A small "block N · Δ since load" readout that keeps ticking after hydration.
import { useLive } from './LiveProvider'

export function BalancePulse({ initialBlock }: { initialBlock: number }) {
  const { snap, refreshing } = useLive()
  const block = snap?.arc.blockNumber ?? initialBlock
  const delta = block - initialBlock
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px]">
      <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? 'bg-white' : 'bg-chain live-dot'}`} />
      <span className="text-text-2">block {block.toLocaleString()}</span>
      {delta > 0 && <span className="text-chain">+{delta} since you opened this</span>}
    </span>
  )
}
