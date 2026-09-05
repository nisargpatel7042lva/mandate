import type { ReactNode } from 'react'
import type { TxStatus, AuthorityTier } from '@/lib/types'

type Variant = 'success' | 'warning' | 'danger' | 'brand' | 'neutral' | 'monitoring' | 'autonomous'

const variantClasses: Record<Variant, string> = {
  success:    'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning:    'bg-amber-500/10 text-amber-500 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
  danger:     'bg-red-500/10 text-red-500 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
  brand:      'bg-sky-500/10 text-sky-500 ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400',
  neutral:    'bg-[var(--surface-2)] text-[var(--text-2)] ring-[var(--border)]',
  monitoring: 'bg-blue-500/10 text-blue-500 ring-blue-500/20 dark:text-blue-400',
  autonomous: 'bg-orange-500/10 text-orange-500 ring-orange-500/20 dark:text-orange-400',
}

interface BadgeProps {
  variant?: Variant
  children: ReactNode
  dot?: boolean
  className?: string
}

export function Badge({ variant = 'neutral', children, dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            variant === 'success' ? 'bg-emerald-400' :
            variant === 'danger' ? 'bg-red-400' :
            variant === 'warning' ? 'bg-amber-400' :
            variant === 'brand' ? 'bg-sky-400' :
            variant === 'monitoring' ? 'bg-blue-400' :
            variant === 'autonomous' ? 'bg-orange-400' : 'bg-[var(--text-3)]'
          }`}
        />
      )}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: TxStatus }) {
  return status === 'approved' ? (
    <Badge variant="success" dot>APPROVED</Badge>
  ) : (
    <Badge variant="danger" dot>BLOCKED</Badge>
  )
}

export function TierBadge({ tier }: { tier: AuthorityTier }) {
  const map: Record<AuthorityTier, { variant: Variant; label: string }> = {
    analytics:  { variant: 'neutral',    label: 'Analytics' },
    monitoring: { variant: 'monitoring', label: 'Monitoring' },
    autonomous: { variant: 'autonomous', label: 'Autonomous' },
  }
  const { variant, label } = map[tier]
  return <Badge variant={variant} dot>{label.toUpperCase()}</Badge>
}
