import type { ReactNode } from 'react'

export function Panel({ children, className = '', tone, hover, ticks, style }: {
  children: ReactNode; className?: string; tone?: 'seal' | 'allow' | 'deny'; hover?: boolean; ticks?: boolean; style?: React.CSSProperties
}) {
  return (
    <div className={`panel ${tone ? `panel-${tone}` : ''} ${hover ? 'panel-hover' : ''} ${ticks ? 'ticks' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

export function PanelHead({ title, right, className = '' }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 ${className}`}>
      <div className="eyebrow">{title}</div>
      {right && <div className="text-[11px] text-text-3">{right}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, tone, className = '', big }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'seal' | 'allow' | 'deny' | 'chain'; className?: string; big?: boolean
}) {
  const color = tone ? { seal: 'text-seal', allow: 'text-allow', deny: 'text-deny', chain: 'text-chain' }[tone] : 'text-text'
  return (
    <div className={className}>
      <div className="eyebrow">{label}</div>
      <div className={`num mt-1.5 font-semibold ${big ? 'text-3xl' : 'text-xl'} ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-text-3">{sub}</div>}
    </div>
  )
}
