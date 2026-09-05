'use client'

import { useState } from 'react'
import type { TradeDecision } from '@/lib/types'
import { StatusBadge } from '@/components/ui/Badge'
import { fmtUsdc, fmtTime } from '@/lib/example-data'

interface TradeLogProps {
  trades: TradeDecision[]
}

type Filter = 'all' | 'approved' | 'blocked'

export function TradeLog({ trades }: TradeLogProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? trades : trades.filter(t => t.status === filter)

  return (
    <div className="flex flex-col gap-0">
      {/* Filter bar */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-4 py-2">
        <span className="mr-2 text-xs text-[var(--text-3)]">Filter:</span>
        {(['all', 'approved', 'blocked'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-2.5 py-0.5 text-xs font-medium transition
              ${filter === f
                ? f === 'blocked'
                  ? 'bg-red-500/15 text-red-400'
                  : f === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-[var(--surface-3)] text-[var(--text)]'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
              }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-[var(--text-3)]">
          {visible.length} records
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_80px_100px_120px] gap-4 border-b border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
        <span>Time</span>
        <span>Protocol · Action</span>
        <span className="text-right">Amount</span>
        <span className="text-center">Status</span>
        <span>Reason</span>
      </div>

      {/* Rows */}
      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-[var(--text-3)]">
          No {filter} transactions
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {visible.map(trade => (
            <div
              key={trade.id}
              className={`grid grid-cols-[1fr_1fr_80px_100px_120px] gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-2)]
                ${trade.status === 'blocked' ? 'bg-red-500/[0.02]' : ''}`}
            >
              <span className="font-mono text-xs text-[var(--text-3)]">
                {fmtTime(trade.timestamp)}
              </span>
              <span className="text-[var(--text)]">
                {trade.protocol}
                <span className="ml-1 text-xs text-[var(--text-3)]">· {trade.action}</span>
              </span>
              <span className="text-right font-mono text-xs text-[var(--text)]">
                {fmtUsdc(trade.amountUsdc)}
              </span>
              <span className="flex justify-center">
                <StatusBadge status={trade.status} />
              </span>
              <span
                className={`text-xs ${trade.status === 'blocked' ? 'text-red-400' : 'text-[var(--text-3)]'}`}
              >
                {trade.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
