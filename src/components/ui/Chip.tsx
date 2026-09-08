import type { ReactNode } from 'react'

type Tone = 'seal' | 'allow' | 'deny' | 'chain' | 'warn' | 'neutral'

const tones: Record<Tone, string> = {
  seal:    'bg-seal/10 text-seal ring-seal/30',
  allow:   'bg-allow/10 text-allow ring-allow/30',
  deny:    'bg-deny/10 text-deny ring-deny/30',
  chain:   'bg-chain/10 text-chain ring-chain/30',
  warn:    'bg-warn/10 text-warn ring-warn/30',
  neutral: 'bg-surface-2 text-text-2 ring-line-2',
}
const dots: Record<Tone, string> = {
  seal: 'bg-seal', allow: 'bg-allow', deny: 'bg-deny', chain: 'bg-chain', warn: 'bg-warn', neutral: 'bg-text-3',
}

export function Chip({ tone = 'neutral', dot, live, mono, children, className = '' }: {
  tone?: Tone; dot?: boolean; live?: boolean; mono?: boolean; children: ReactNode; className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${tones[tone]} ${mono ? 'font-mono' : ''} ${className}`}>
      {(dot || live) && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]} ${live ? 'live-dot' : ''}`} />}
      {children}
    </span>
  )
}
