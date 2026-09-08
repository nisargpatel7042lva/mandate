'use client'

// Simulate — compose an attempt on the left, watch the enforcement rail on the right.
// Prediction is computed client-side from live scope; the verdict is the real /api/check.

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useLive } from '@/components/live/LiveProvider'
import { useCheck } from './useCheck'
import { runHistory } from './runHistory'
import { Pipeline, EMPTY_STEPS } from './Pipeline'
import { PRESETS } from './QuickSim'
import { PROTOCOLS, protocolLabel, usd, relTime } from '@/lib/format'
import { TRUST_THRESHOLD } from '@/lib/underwriting'

const MIN = 100, MAX = 100_000, STEP = 100
const QUICK = [1_000, 5_000, 8_000, 10_000, 12_000, 60_000]

export function Simulator() {
  const params = useSearchParams()
  const router = useRouter()
  const { snap } = useLive()
  const [protocol, setProtocol] = useState(params.get('protocol') ?? PRESETS.find(p => p.id === params.get('preset'))?.protocol ?? 'gmx-perp')
  const [amount, setAmount] = useState(Number(params.get('amount')) || PRESETS.find(p => p.id === params.get('preset'))?.amountUsdc || 5000)
  const history = useSyncExternalStore(runHistory.subscribe, runHistory.get, runHistory.getServer)
  const [copied, setCopied] = useState(false)
  const autoran = useRef(false)

  const { runState, states, result, error, run, reset, isRunning } = useCheck({ onDone: runHistory.add })

  useEffect(() => {
    if (params.get('run') === '1' && !autoran.current) { autoran.current = true; void run(protocol, amount); router.replace('/execute', { scroll: false }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isRunning) void run(protocol, amount) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [protocol, amount, isRunning, run])

  const a = snap?.agent
  const allowed = useMemo(() => a?.allowedProtocols ?? [], [a])
  const perTrade = a?.maxPositionSizeUsdc ?? null
  const daily = a?.maxDailySpendUsdc ?? null
  const spent = snap?.spentTodayUsdc ?? 0

  // Client-side prediction from live scope — instant feedback before the real check.
  const prediction = useMemo(() => {
    if (!a) return null
    if (a.trustScore < TRUST_THRESHOLD) return { ok: false, at: 'Trust score', why: `${a.trustScore.toFixed(1)} < ${TRUST_THRESHOLD}` }
    if (!a.scopeFound) return { ok: false, at: 'Permission scope', why: 'no scope indexed' }
    if (!allowed.includes(protocol)) return { ok: false, at: 'Protocol allowlist', why: `${protocolLabel(protocol)} is out of scope` }
    if (perTrade !== null && amount > perTrade) return { ok: false, at: 'Position size', why: `${usd(amount, { cents: false })} > ${usd(perTrade, { cents: false })}` }
    if (daily !== null && amount + spent > daily) return { ok: false, at: 'Daily cap', why: `would exceed ${usd(daily, { cents: false })}` }
    return { ok: true, at: null, why: 'all five checks should pass' }
  }, [a, allowed, protocol, amount, perTrade, daily, spent])

  const pct = ((amount - MIN) / (MAX - MIN)) * 100
  const capPct = perTrade ? ((Math.min(perTrade, MAX) - MIN) / (MAX - MIN)) * 100 : null
  const dailyPct = daily ? ((Math.min(daily, MAX) - MIN) / (MAX - MIN)) * 100 : null
  const track = capPct !== null
    ? `linear-gradient(90deg, rgb(var(--allow-rgb)/.8) 0 ${capPct}%, rgb(var(--deny-rgb)/.7) ${capPct}% 100%)`
    : 'var(--line-2)'

  const copyJson = async () => {
    if (!result) return
    try { await navigator.clipboard.writeText(JSON.stringify({ protocol, amountUsdc: amount, ...result }, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {}
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="reveal flex flex-wrap items-end justify-between gap-3" style={{ ['--i' as string]: 0 }}>
        <div>
          <div className="eyebrow">Simulate</div>
          <h1 className="display mt-1 text-[34px] leading-none sm:text-[40px]">Propose an attempt. <em className="text-seal">Watch it get underwritten.</em></h1>
        </div>
        <div className="text-[12px] text-text-3">Presets:{' '}
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => { reset(); setProtocol(p.protocol); setAmount(p.amountUsdc) }} className="ml-1 rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-text-2 transition hover:border-seal hover:text-seal">{protocolLabel(p.protocol)} {usd(p.amountUsdc, { cents: false })}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* ── Compose ── */}
        <div className="reveal flex flex-col gap-4 lg:col-span-5" style={{ ['--i' as string]: 1 }}>
          <div className="panel ticks p-4">
            <div className="mb-3 flex items-center justify-between"><span className="eyebrow">Protocol</span><span className="text-[11px] text-text-3">{allowed.length ? `${allowed.length} in scope` : 'loading scope…'}</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROTOCOLS.map(p => {
                const on = protocol === p.id
                const inScope = allowed.includes(p.id)
                return (
                  <button key={p.id} onClick={() => { if (!isRunning) { reset(); setProtocol(p.id) } }}
                    className={`group relative rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-seal bg-seal/5 shadow-[0_0_0_1px_var(--seal),0_0_24px_-8px_var(--seal)]' : 'border-line bg-bg-2 hover:border-line-2 hover:bg-surface-2'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-text">{p.short}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${a ? (inScope ? 'bg-allow' : 'bg-deny') : 'bg-text-3'}`} />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-text-3">{p.label}</div>
                    <div className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${a ? (inScope ? 'text-allow' : 'text-deny') : 'text-text-3'}`}>{a ? (inScope ? 'in scope' : 'denied') : '…'}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="panel ticks p-4">
            <div className="mb-1 flex items-center justify-between"><span className="eyebrow">Amount · USDC</span>
              <span className="text-[11px] text-text-3">cap {usd(perTrade, { cents: false })} / trade · {usd(daily, { cents: false })} / day</span></div>
            <div className="num my-2 text-[40px] font-bold leading-none tracking-tight">
              <span className="text-text-3">$</span>{amount.toLocaleString('en-US')}
            </div>
            <div className="relative">
              <input type="range" min={MIN} max={MAX} step={STEP} value={amount} disabled={isRunning}
                onChange={e => { reset(); setAmount(Number(e.target.value)) }}
                className="slider" style={{ ['--slider-track' as string]: track }} aria-label="Amount in USDC" />
              {capPct !== null && (
                <div className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${capPct}%` }}>
                  <span className="h-3 w-px bg-seal" /><span className="mt-6 whitespace-nowrap font-mono text-[9.5px] text-seal">per-trade cap</span>
                </div>
              )}
              {dailyPct !== null && dailyPct < 100 && (
                <div className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${dailyPct}%` }}>
                  <span className="h-3 w-px bg-deny" /><span className="mt-6 whitespace-nowrap font-mono text-[9.5px] text-deny">daily cap</span>
                </div>
              )}
              <div className="pointer-events-none absolute -bottom-1 left-0 h-1 rounded-full bg-seal/30" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-7 flex flex-wrap gap-1.5">
              {QUICK.map(q => (
                <button key={q} disabled={isRunning} onClick={() => { reset(); setAmount(q) }}
                  className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${amount === q ? 'border-seal text-seal' : 'border-line text-text-2 hover:border-line-2 hover:text-text'}`}>{usd(q, { compact: true })}</button>
              ))}
              <input type="number" min={MIN} max={MAX} step={STEP} value={amount} disabled={isRunning}
                onChange={e => { reset(); setAmount(Math.max(MIN, Math.min(MAX, Number(e.target.value) || MIN))) }}
                className="ml-auto w-28 rounded-md border border-line bg-bg-2 px-2 py-1 text-right font-mono text-[12px] text-text outline-none focus:border-seal" aria-label="Exact amount" />
            </div>
          </div>

          {/* Prediction + run */}
          <div className={`panel p-4 transition ${prediction ? (prediction.ok ? 'panel-allow' : 'panel-deny') : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="eyebrow">Prediction · from live scope</div>
                {prediction ? (
                  <div className="mt-1 text-[13px]">
                    <span className={`font-semibold ${prediction.ok ? 'text-allow' : 'text-deny'}`}>{prediction.ok ? 'Should clear' : `Should block at ${prediction.at}`}</span>
                    <span className="text-text-3"> · {prediction.why}</span>
                  </div>
                ) : <div className="skeleton mt-1 h-4 w-48" />}
              </div>
              <button onClick={() => void run(protocol, amount)} disabled={isRunning} className="btn btn-seal shrink-0 !py-2.5 !px-4 text-[14px]">
                {isRunning ? <><span className="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-[#1a1200]/40 border-t-[#1a1200]" />Checking</> : <>Run check <span className="kbd !border-[#1a1200]/20 !bg-transparent !text-[#1a1200]/70">⌘↵</span></>}
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2"><span className="eyebrow">Recent runs · this browser</span>
                <button onClick={runHistory.clear} className="text-[11px] text-text-3 hover:text-text">clear</button></div>
              <ul className="max-h-56 divide-y divide-line overflow-y-auto">
                {history.map(h => (
                  <li key={h.id}>
                    <button onClick={() => { reset(); setProtocol(h.protocol); setAmount(h.amountUsdc) }} className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-surface-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${h.authorized ? 'bg-allow' : 'bg-deny'}`} />
                      <span className="text-[12.5px] text-text">{protocolLabel(h.protocol)}</span>
                      <span className="num text-[12px] text-text-2">{usd(h.amountUsdc, { cents: false })}</span>
                      <span className="ml-auto truncate text-[11px] text-text-3">{h.primaryBlock ?? 'authorized'}</span>
                      <span className="shrink-0 text-[10.5px] text-text-3">{relTime(Math.floor(h.at / 1000))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Enforcement rail ── */}
        <div className="reveal lg:col-span-7" style={{ ['--i' as string]: 2 }}>
          <div className={`panel ticks flex min-h-[560px] flex-col p-5 transition-all duration-500 ${result ? (result.authorized ? 'panel-allow' : 'panel-deny') : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">Enforcement rail</div>
                <div className="mt-0.5 text-[13px] text-text-2">
                  <span className="font-mono text-text">{protocolLabel(protocol)}</span> · <span className="num text-text">{usd(amount, { cents: false })}</span>
                  <span className="text-text-3"> · {LIVE_ENS}</span>
                </div>
              </div>
              <div className="text-right text-[11px] text-text-3">
                {runState === 'calling' && <span className="flex items-center gap-1.5 text-seal"><span className="h-1.5 w-1.5 rounded-full bg-seal live-dot" />Mandate + Agent0 subgraphs</span>}
                {result && <span className="num">{result.latencyMs}ms round-trip</span>}
                {runState === 'idle' && !error && <span>idle</span>}
              </div>
            </div>
            <div className="hairline my-4" />

            {error && <div className="mb-4 rounded-lg border border-deny/30 bg-deny/5 px-3 py-2 text-[12px] text-deny">API error: {error}</div>}

            <div className="flex-1">
              <Pipeline steps={result?.steps ?? EMPTY_STEPS} states={runState === 'calling' || runState === 'idle' ? ['idle','idle','idle','idle','idle'] : states} />
            </div>

            {result ? (
              <div className="mt-6 stamp">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className={`eyebrow ${result.authorized ? 'text-allow' : 'text-deny'}`}>{result.authorized ? 'Verdict · clears MandateGate' : 'Verdict · MandateGate reverts'}</div>
                    <div className={`display mt-1 text-[44px] leading-none ${result.authorized ? 'text-allow text-glow-allow' : 'text-deny text-glow-deny'}`}>{result.authorized ? 'Authorized.' : 'Blocked.'}</div>
                    <p className="mt-2 max-w-md text-[13px] text-text-2">{result.primaryBlock ?? `All five checks passed. Trust ${result.trustScore.toFixed(1)} against threshold ${TRUST_THRESHOLD}; scope, protocol, size and daily cap all within bounds.`}</p>
                    {result.primaryBlockDetail && <p className="mt-1 font-mono text-[11px] text-text-3">{result.primaryBlockDetail}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.authorized && <Link href="/treasury" className="btn btn-seal">Settlements →</Link>}
                    {!result.authorized && <Link href="/transactions/blocked" className="btn">Incident view</Link>}
                    <button onClick={copyJson} className="btn">{copied ? 'Copied' : 'Copy decision'}</button>
                    <button onClick={reset} className="btn btn-ghost">Reset</button>
                  </div>
                </div>
              </div>
            ) : runState === 'idle' && (
              <div className="mt-6 text-[11.5px] text-text-3">Pick a protocol and amount. The prediction updates instantly from live scope; the run confirms it against the real underwriting composition.</div>
            )}
            <div className="mt-4 text-[10.5px] text-text-3">Off-chain underwriting for the demo. Sources: Mandate subgraph (Sepolia), Agent0 (Base), Arc settlements.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LIVE_ENS = 'testagent.mandate.eth'
