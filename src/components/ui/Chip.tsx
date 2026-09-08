import type { ReactNode } from 'react'

type Tone = 'seal' | 'allow' | 'deny' | 'chain' | 'warn' | 'neutral'

const tones: Record<Tone, string> = {
  seal:    'border-white/30 text-white',
  allow:   'border-allow/30 text-allow',
  deny:    'border-deny/30 text-deny',
  chain:   'border-chain/30 text-chain',
  warn:    'border-warn/30 text-warn',
  neutral: 'border-line-2 text-text-2',
}
const dots: Record<Tone, string> = { seal: 'bg-white', allow: 'bg-allow', deny: 'bg-deny', chain: 'bg-chain', warn: 'bg-warn', neutral: 'bg-text-3' }

export function Chip({ tone = 'neutral', dot, live, mono, children, className = '' }: {
  tone?: Tone; dot?: boolean; live?: boolean; mono?: boolean; children: ReactNode; className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[5px] border bg-black/40 px-2 py-[3px] text-[11px] font-medium tracking-[-0.01em] ${tones[tone]} ${mono ? 'hash' : ''} ${className}`}>
      {(dot || live) && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]} ${live ? 'live-dot' : ''}`} />}
      {children}
    </span>
  )
}
