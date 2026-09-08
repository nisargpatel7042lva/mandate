'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CheckResult } from '@/app/api/check/route'
import type { StepState } from './Pipeline'

export type RunState = 'idle' | 'calling' | 'animating' | 'done'
const IDLE: StepState[] = ['idle', 'idle', 'idle', 'idle', 'idle']
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export interface RunRecord { id: string; at: number; protocol: string; amountUsdc: number; authorized: boolean; primaryBlock: string | null; latencyMs: number; trustScore: number }

export function useCheck(opts: { stepMs?: number; onDone?: (r: RunRecord) => void } = {}) {
  const stepMs = opts.stepMs ?? 520
  const [runState, setRunState] = useState<RunState>('idle')
  const [states, setStates] = useState<StepState[]>(IDLE)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const onDone = useRef(opts.onDone)
  useEffect(() => { onDone.current = opts.onDone })

  const reset = useCallback(() => {
    abort.current?.abort()
    setRunState('idle'); setStates(IDLE); setResult(null); setError(null)
  }, [])

  const run = useCallback(async (protocol: string, amountUsdc: number) => {
    reset()
    const ac = new AbortController(); abort.current = ac
    setRunState('calling')
    let data: CheckResult
    try {
      const res = await fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ protocol, amountUsdc }), signal: ac.signal })
      if (!res.ok) throw new Error(`API ${res.status}`)
      data = await res.json() as CheckResult
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Network error'); setRunState('idle'); return
    }
    if (ac.signal.aborted) return
    setRunState('animating')
    for (let i = 0; i < data.steps.length; i++) {
      if (ac.signal.aborted) return
      const step = data.steps[i]
      if (step.status === 'skip') { setStates(p => { const n = [...p]; for (let j = i; j < data.steps.length; j++) n[j] = 'skip'; return n }); break }
      setStates(p => { const n = [...p]; n[i] = 'checking'; return n })
      await delay(stepMs * 0.35)
      if (ac.signal.aborted) return
      setStates(p => { const n = [...p]; n[i] = step.status; return n })
      if (step.status === 'fail') { setStates(p => { const n = [...p]; for (let j = i + 1; j < data.steps.length; j++) n[j] = 'skip'; return n }); break }
      if (i < data.steps.length - 1) await delay(stepMs * 0.65)
    }
    await delay(180)
    if (ac.signal.aborted) return
    setResult(data); setRunState('done')
    onDone.current?.({ id: `${Date.now()}`, at: Date.now(), protocol, amountUsdc, authorized: data.authorized, primaryBlock: data.primaryBlock, latencyMs: data.latencyMs, trustScore: data.trustScore })
  }, [reset, stepMs])

  return { runState, states, result, error, run, reset, isRunning: runState === 'calling' || runState === 'animating' }
}
