import type { ReactNode } from 'react'

export function Panel({ children, className = '', tone, hover, style }: {
  children: ReactNode; className?: string; tone?: 'seal' | 'allow' | 'deny'; hover?: boolean; style?: React.CSSProperties
}) {
  return (
    <div className={`panel ${tone ? `panel-${tone}` : ''} ${hover ? 'panel-hover' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

export function PanelHead({ title, right, className = '' }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-line px-4 py-3 ${className}`}>
      <div className="eyebrow">{title}</div>
      {right && <div className="text-[11.5px] text-text-3">{right}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, tone, className = '', big }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'seal' | 'allow' | 'deny' | 'chain'; className?: string; big?: boolean
}) {
  const color = tone ? { seal: 'text-white', allow: 'text-allow', deny: 'text-deny', chain: 'text-chain' }[tone] : 'text-white'
  return (
    <div className={className}>
      <div className="eyebrow">{label}</div>
      <div className={`num mt-1.5 font-medium tracking-[-0.03em] ${big ? 'text-[30px] leading-none' : 'text-[21px] leading-none'} ${color}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-text-3">{sub}</div>}
    </div>
  )
}
