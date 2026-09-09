'use client'

import { useRouter } from 'next/navigation'
import { AuthorityMap } from './AuthorityMap'

export function MapPanel(props: { allowed: string[]; trustScore: number; expiryFrac: number; authorized: boolean; ensName: string }) {
  const router = useRouter()
  return (
    <div className="panel relative h-[380px] overflow-hidden lg:h-full lg:min-h-[420px]">
      <div className="absolute left-4 top-3 z-10 flex items-center gap-3">
        <span className="eyebrow">Authority perimeter</span>
        <span className="flex items-center gap-1.5 text-[10.5px] text-text-3"><span className="h-1.5 w-1.5 rounded-full bg-allow" />in scope</span>
        <span className="flex items-center gap-1.5 text-[10.5px] text-text-3"><span className="h-1.5 w-1.5 rounded-full bg-deny" />denied</span>
      </div>
      <div className="absolute bottom-3 right-4 z-10 hidden font-mono text-[10px] text-text-3 sm:block">ring = scope validity · pulses = attempts</div>
      <AuthorityMap {...props} onSelect={id => router.push(`/execute?protocol=${id}`)} />
    </div>
  )
}
