'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCheck } from './useCheck'
import { Pipeline, EMPTY_STEPS } from './Pipeline'
import { protocolLabel, usd } from '@/lib/format'
import { PRESETS } from '@/lib/presets'

export function QuickSim() {
  const { runState, states, result, error, run, reset, isRunning } = useCheck({ stepMs: 420 })
  const [active, setActive] = useState<string | null>(null)
  const p = PRESETS.find(x => x.id === active)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <div className="flex flex-col gap-2">
          {PRESETS.map(pr => {
            const on = active === pr.id
            return (
              <button key={pr.id} disabled={isRunning}
                onClick={() => { setActive(pr.id); void run(pr.protocol, pr.amountUsdc) }}
                className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${on ? (pr.expect === 'allow' ? 'border-allow/50 bg-allow/5' : 'border-deny/50 bg-deny/5') : 'border-line bg-surface hover:border-line-2 hover:bg-surface-2'} disabled:opacity-60`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${pr.expect === 'allow' ? 'bg-allow/10 text-allow' : 'bg-deny/10 text-deny'}`}>{pr.expect === 'allow' ? '✓' : '✕'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-text">{protocolLabel(pr.protocol)} <span className="font-normal text-text-3">· {pr.action}</span></span>
                  <span className="block text-[11px] text-text-3">{pr.why}</span>
                </span>
                <span className="num text-[13px] font-semibold text-text-2">{usd(pr.amountUsdc, { cents: false })}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-3 transition group-hover:translate-x-0.5 group-hover:text-white"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )
          })}
        </div>
        <Link href="/execute" className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-text-2 transition hover:text-white">
          Open the full simulator <span className="text-text-3">→</span>
        </Link>
      </div>

      <div className="panel min-h-[220px] p-4">
        {runState === 'idle' && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="display text-2xl italic text-text-2">Pick an attempt.</div>
            <div className="text-[12px] text-text-3">The same five checks the MCP tool runs, against live scope.</div>
          </div>
        )}
        {error && <div className="rounded-lg border border-deny/30 bg-deny/5 px-3 py-2 text-[12px] text-deny">{error}</div>}
        {runState !== 'idle' && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">{p ? `${protocolLabel(p.protocol)} · ${usd(p.amountUsdc, { cents: false })}` : 'Check'}</span>
              {runState === 'calling' && <span className="flex items-center gap-1.5 text-[11px] text-white"><span className="h-1.5 w-1.5 rounded-full bg-white live-dot" />querying subgraphs</span>}
              {result && <span className="num text-[11px] text-text-3">{result.latencyMs}ms</span>}
            </div>
            <Pipeline steps={result?.steps ?? EMPTY_STEPS} states={runState === 'calling' ? ['idle','idle','idle','idle','idle'] : states} compact />
            {result && (
              <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 stamp ${result.authorized ? 'bg-allow/10 text-allow' : 'bg-deny/10 text-deny'}`}>
                <span className="text-[13px] font-bold">{result.authorized ? 'AUTHORIZED' : 'BLOCKED'}</span>
                <span className="truncate pl-3 text-[11.5px] opacity-90">{result.primaryBlock ?? 'All five checks passed'}</span>
                <button onClick={() => { reset(); setActive(null) }} className="ml-3 shrink-0 text-[11px] underline opacity-70 hover:opacity-100">clear</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
