'use client'

import { useState, useRef } from 'react'
import type { CheckResult, CheckStep } from '@/app/api/check/route'

// ── Preset trades that cover the three demo outcomes ────────────────────────
const PRESETS = [
  {
    id: 'uniswap-approved',
    protocol: 'uniswap-v3',
    label: 'Uniswap v3',
    action: 'Swap USDC → ETH',
    amountUsdc: 8000,
    hint: 'approved',
    hintLabel: 'Should pass',
  },
  {
    id: 'gmx-blocked-protocol',
    protocol: 'gmx-perp',
    label: 'GMX Perpetuals',
    action: 'Long ETH 10×',
    amountUsdc: 5000,
    hint: 'blocked',
    hintLabel: 'Not in allowlist',
  },
  {
    id: 'curve-blocked-size',
    protocol: 'curve',
    label: 'Curve Finance',
    action: 'Add LP',
    amountUsdc: 12000,
    hint: 'blocked',
    hintLabel: 'Exceeds position limit',
  },
] as const

const PROTOCOL_OPTIONS = [
  { value: 'uniswap-v3',  label: 'Uniswap v3' },
  { value: 'curve',       label: 'Curve Finance' },
  { value: 'aave-v3',     label: 'Aave v3' },
  { value: '1inch',       label: '1inch' },
  { value: 'gmx-perp',    label: 'GMX Perpetuals' },
  { value: 'compound-v3', label: 'Compound v3' },
]

// ── Step animation timing ────────────────────────────────────────────────────
const STEP_REVEAL_MS = 550   // gap between each step animating in
const VERDICT_DELAY_MS = 200 // brief pause after last step before verdict

type StepState = 'idle' | 'checking' | 'pass' | 'fail' | 'skip'
type PageState = 'idle' | 'calling' | 'animating' | 'done'

function StepRow({ step, state }: { step: CheckStep; state: StepState }) {
  const icon =
    state === 'checking' ? (
      <span className="inline-block h-4 w-4 animate-spin rounded-full border border-current border-t-transparent opacity-70" />
    ) : state === 'pass' ? (
      <span className="text-emerald-400">✓</span>
    ) : state === 'fail' ? (
      <span className="text-red-400">✕</span>
    ) : (
      <span className="opacity-20">·</span>
    )

  const labelColor =
    state === 'fail' ? 'text-red-400' :
    state === 'pass' ? 'text-[var(--text)]' :
    'text-[var(--text-3)]'

  const detailColor =
    state === 'fail' ? 'text-red-300' :
    state === 'pass' ? 'text-emerald-400/80' :
    'text-[var(--text-3)] opacity-40'

  return (
    <div className={`flex items-start gap-3 py-2.5 transition-opacity duration-300 ${state === 'idle' ? 'opacity-30' : 'opacity-100'}`}>
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center font-mono text-xs">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className={`text-sm font-medium ${labelColor}`}>{step.label}</span>
        {state !== 'idle' && state !== 'checking' && step.detail && (
          <p className={`mt-0.5 font-mono text-xs ${detailColor}`}>{step.detail}</p>
        )}
      </div>
    </div>
  )
}

export default function ExecutePage() {
  // Form state
  const [protocol, setProtocol] = useState('gmx-perp')
  const [amountUsdc, setAmountUsdc] = useState(5000)
  const [selectedPreset, setSelectedPreset] = useState<string>('gmx-blocked-protocol')

  // Run state
  const [pageState, setPageState] = useState<PageState>('idle')
  const [stepStates, setStepStates] = useState<StepState[]>(['idle', 'idle', 'idle', 'idle', 'idle'])
  const [result, setResult] = useState<CheckResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showVerdict, setShowVerdict] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  function selectPreset(id: string) {
    const p = PRESETS.find(x => x.id === id)
    if (!p) return
    setSelectedPreset(id)
    setProtocol(p.protocol)
    setAmountUsdc(p.amountUsdc)
  }

  function reset() {
    abortRef.current?.abort()
    setPageState('idle')
    setStepStates(['idle', 'idle', 'idle', 'idle', 'idle'])
    setResult(null)
    setApiError(null)
    setShowVerdict(false)
  }

  async function runCheck() {
    reset()
    abortRef.current = new AbortController()

    setPageState('calling')

    let data: CheckResult
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol, amountUsdc }),
        signal: abortRef.current.signal,
      })
      data = await res.json() as CheckResult
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setApiError(err instanceof Error ? err.message : 'Network error')
      setPageState('idle')
      return
    }

    // API returned — animate steps sequentially
    setPageState('animating')

    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i]

      if (step.status === 'skip') {
        // Reveal remaining skipped steps at once after the fail
        setStepStates(prev => {
          const next = [...prev]
          for (let j = i; j < data.steps.length; j++) next[j] = 'skip'
          return next
        })
        break
      }

      // Show "checking" then resolve to pass/fail
      setStepStates(prev => { const n = [...prev]; n[i] = 'checking'; return n })
      await delay(STEP_REVEAL_MS * 0.3)
      setStepStates(prev => { const n = [...prev]; n[i] = step.status; return n })

      if (step.status === 'fail') {
        // Mark remaining as skip
        setStepStates(prev => {
          const next = [...prev]
          for (let j = i + 1; j < data.steps.length; j++) next[j] = 'skip'
          return next
        })
        break
      }

      if (i < data.steps.length - 1) {
        await delay(STEP_REVEAL_MS * 0.7)
      }
    }

    await delay(VERDICT_DELAY_MS)
    setResult(data)
    setShowVerdict(true)
    setPageState('done')
  }

  const isRunning = pageState === 'calling' || pageState === 'animating'
  const protocolLabel = PROTOCOL_OPTIONS.find(p => p.value === protocol)?.label ?? protocol

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">Propose a Trade</h1>
        <p className="mt-0.5 text-xs text-[var(--text-3)]">
          Watch the underwriting check run in real time · testagent.mandate.eth
        </p>
      </div>

      {/* Preset buttons */}
      {!isRunning && pageState !== 'done' && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
            Pick a demo scenario
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => selectPreset(p.id)}
                className={`rounded-lg border px-4 py-3 text-left transition-all ${
                  selectedPreset === p.id
                    ? p.hint === 'approved'
                      ? 'border-emerald-500/60 bg-emerald-500/8 ring-1 ring-emerald-500/30'
                      : 'border-red-500/60 bg-red-500/8 ring-1 ring-red-500/30'
                    : 'border-[var(--border)] hover:border-[var(--border-hover,var(--border))] hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text)]">{p.label}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    p.hint === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {p.hintLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-3)]">{p.action}</p>
                <p className="mt-0.5 font-mono text-xs text-[var(--text-2)]">
                  ${p.amountUsdc.toLocaleString()} USDC
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom form */}
      {!isRunning && pageState !== 'done' && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
              Protocol
            </label>
            <select
              value={protocol}
              onChange={e => { setProtocol(e.target.value); setSelectedPreset('') }}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand,#0ea5e9)]"
            >
              {PROTOCOL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
              Amount (USDC)
            </label>
            <input
              type="number"
              min={100}
              max={100000}
              step={100}
              value={amountUsdc}
              onChange={e => { setAmountUsdc(Number(e.target.value)); setSelectedPreset('') }}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-sm text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand,#0ea5e9)]"
            />
          </div>
          <button
            onClick={runCheck}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-md bg-[var(--brand,#0ea5e9)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {isRunning
              ? <><span className="inline-block h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" /> Checking…</>
              : '→ Check Trade'
            }
          </button>
        </div>
      )}

      {apiError && (
        <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          API error: {apiError}
        </div>
      )}

      {/* Underwriting check panel — shows once check starts */}
      {pageState !== 'idle' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
                Underwriting Check
              </p>
              {pageState === 'calling' && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                  <span className="inline-block h-2 w-2 animate-ping rounded-full bg-[var(--brand,#0ea5e9)] opacity-75" />
                  Querying live data…
                </span>
              )}
              {result && (
                <span className="font-mono text-xs text-[var(--text-3)]">
                  {result.latencyMs}ms
                </span>
              )}
            </div>
            {pageState === 'calling' && (
              <p className="mt-1 text-xs text-[var(--text-3)]">
                {protocolLabel} · ${amountUsdc.toLocaleString()} USDC · hitting Mandate subgraph + Agent0…
              </p>
            )}
          </div>

          <div className="divide-y divide-[var(--border-subtle)] px-4">
            {(pageState === 'calling'
              ? [
                  { id: 'trust', label: 'Trust Score', detail: '', status: 'pass' as const },
                  { id: 'scope', label: 'Permission Scope', detail: '', status: 'pass' as const },
                  { id: 'protocol', label: 'Protocol Allowlist', detail: '', status: 'pass' as const },
                  { id: 'size', label: 'Position Size', detail: '', status: 'pass' as const },
                  { id: 'daily', label: 'Daily Spending Cap', detail: '', status: 'pass' as const },
                ]
              : result?.steps ?? []
            ).map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                state={pageState === 'calling' ? 'idle' : stepStates[i]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── VERDICT ──────────────────────────────────────────────────────────── */}
      {showVerdict && result && (
        <div className={`rounded-xl border-2 p-6 transition-all duration-500 ${
          result.authorized
            ? 'border-emerald-500/50 bg-emerald-500/6'
            : 'border-red-500/50 bg-red-500/6'
        }`}>
          {result.authorized ? (
            /* APPROVED */
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-3xl text-emerald-400">
                  ✓
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                    Trade Authorized
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-emerald-400 sm:text-3xl">
                    MandateGate clears
                  </h2>
                  <p className="mt-1 text-[var(--text-2)]">
                    <span className="font-mono font-semibold text-[var(--text)]">
                      {protocolLabel}
                    </span>{' '}
                    · ${amountUsdc.toLocaleString()} USDC · all checks passed
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Trust Score</p>
                <p className="font-mono text-lg text-emerald-400">{result.trustScore.toFixed(1)}</p>
                <p className="text-[10px] text-[var(--text-3)]">threshold {60}</p>
              </div>
            </div>
          ) : (
            /* BLOCKED */
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-3xl text-red-400">
                  ✕
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">
                    Transaction Blocked
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-red-400 sm:text-3xl">
                    MandateGate reverts
                  </h2>
                  <p className="mt-1 text-[var(--text-2)]">{result.primaryBlock}</p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Trust Score</p>
                <p className="font-mono text-lg text-[var(--text)]">{result.trustScore.toFixed(1)}</p>
                <p className="text-[10px] text-[var(--text-3)]">threshold {60}</p>
              </div>
            </div>
          )}

          {/* Technical revert detail */}
          {!result.authorized && result.primaryBlockDetail && (
            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
              <span className="text-xs font-semibold text-red-400">MandateGate revert: </span>
              <span className="font-mono text-xs text-red-300">{result.primaryBlockDetail}</span>
            </div>
          )}

          {/* Settlement CTA / reset */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {result.authorized && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 opacity-60">
                ⟳ Settle via Arc USDC
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px]">Phase 5 pending</span>
              </div>
            )}
            <button
              onClick={reset}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
            >
              ← Try another trade
            </button>
          </div>
        </div>
      )}

      {/* Latency / data source footnote */}
      {result && (
        <p className="text-[10px] text-[var(--text-3)]">
          Check took {result.latencyMs}ms · live data from{' '}
          {result.scopeFound ? 'Mandate subgraph (Sepolia) + Agent0 (Base Mainnet)' : 'Agent0 (Base Mainnet) · Mandate subgraph syncing'} ·
          off-chain underwriting (Phase 7 on-chain enforcement not yet deployed)
        </p>
      )}
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
