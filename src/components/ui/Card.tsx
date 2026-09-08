import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  accentColor?: string
  variant?: 'default' | 'glass' | 'elevated'
}

export function Card({ children, className = '', accentColor, variant = 'default' }: CardProps) {
  const base = 'rounded-xl transition-all duration-200'
  const variants = {
    default:  'border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--surface-3)]',
    glass:    'card-glass rounded-xl',
    elevated: 'border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)]',
  }
  return (
    <div
      className={`${base} ${variants[variant]} ${className}`}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 2 } : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between border-b border-[var(--border)] px-4 py-3 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-xs font-semibold uppercase tracking-widest text-[var(--text-3)] ${className}`}>
      {children}
    </h3>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>
}

export function StatCard({
  label,
  value,
  sub,
  accent,
  className = '',
}: {
  label: string
  value: string
  sub?: string
  accent?: 'emerald' | 'red' | 'brand' | 'amber'
  className?: string
}) {
  const valueColor = {
    emerald: 'text-emerald-400',
    red:     'text-red-400',
    brand:   'text-sky-400',
    amber:   'text-amber-400',
    none:    'text-[var(--text)]',
  }[accent ?? 'none']

  return (
    <Card variant="elevated" className={className}>
      <CardBody>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">{label}</p>
        <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-[var(--text-3)]">{sub}</p>}
      </CardBody>
    </Card>
  )
}
