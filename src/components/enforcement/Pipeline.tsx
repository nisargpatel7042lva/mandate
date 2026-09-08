import type { CheckStep } from '@/app/api/check/route'

export type StepState = 'idle' | 'checking' | 'pass' | 'fail' | 'skip'

const SOURCE: Record<string, string> = {
  trust: 'Agent0 + Mandate subgraphs',
  scope: 'Mandate subgraph · PermissionMirror',
  protocol: 'allowedProtocols bitmask',
  size: 'maxPositionSizeUsdc',
  daily: 'maxDailySpendUsdc · Arc settlements',
}

export function Pipeline({ steps, states, compact = false, stagger = false }: {
  steps: CheckStep[]; states: StepState[]; compact?: boolean; stagger?: boolean
}) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const st = states[i] ?? 'idle'
        const last = i === steps.length - 1
        const c = st === 'pass' ? 'var(--allow)' : st === 'fail' ? 'var(--deny)' : st === 'checking' ? 'var(--seal)' : 'var(--line-2)'
        return (
          <li key={step.id} className={`relative flex gap-4 ${stagger ? 'reveal' : ''}`} style={stagger ? { ['--i' as string]: i } : undefined}>
            {/* rail */}
            <div className="flex w-6 shrink-0 flex-col items-center">
              <span
                className={`relative z-10 grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold transition-all duration-300 ${
                  st === 'pass' ? 'border-allow/60 bg-allow/15 text-allow' :
                  st === 'fail' ? 'border-deny/60 bg-deny/15 text-deny shadow-[0_0_18px_-2px_var(--deny)]' :
                  st === 'checking' ? 'border-seal/60 bg-seal/10 text-seal' :
                  st === 'skip' ? 'border-line bg-bg-2 text-text-3' : 'border-line bg-bg-2 text-text-3'
                }`}
                style={st === 'pass' || st === 'fail' ? { animation: 'stamp .4s var(--ease-out-expo)' } : undefined}
              >
                {st === 'checking' ? <span className="spin h-3 w-3 rounded-full border border-seal border-t-transparent" />
                  : st === 'pass' ? '✓' : st === 'fail' ? '✕' : st === 'skip' ? '–' : i + 1}
              </span>
              {!last && (
                <span className="relative my-1 w-px flex-1 bg-line">
                  <span className="absolute inset-0 origin-top transition-transform duration-500" style={{ background: c, transform: st === 'pass' || st === 'fail' ? 'scaleY(1)' : 'scaleY(0)' }} />
                </span>
              )}
            </div>
            {/* body */}
            <div className={`min-w-0 flex-1 ${last ? 'pb-0' : compact ? 'pb-3' : 'pb-5'} transition-opacity duration-300 ${st === 'idle' ? 'opacity-40' : st === 'skip' ? 'opacity-35' : 'opacity-100'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-[13px] font-semibold ${st === 'fail' ? 'text-deny' : st === 'pass' ? 'text-text' : 'text-text-2'}`}>{step.label}</span>
                {!compact && <span className="hidden font-mono text-[10px] text-text-3 sm:inline">{SOURCE[step.id]}</span>}
              </div>
              {st !== 'idle' && st !== 'checking' && step.detail && step.detail !== '—' && (
                <p className={`mt-0.5 font-mono text-[11.5px] fade-in ${st === 'fail' ? 'text-deny/90' : st === 'pass' ? 'text-allow/80' : 'text-text-3'}`}>{step.detail}</p>
              )}
              {st === 'checking' && <p className="mt-0.5 font-mono text-[11.5px] text-seal/80">querying…</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export const EMPTY_STEPS: CheckStep[] = [
  { id: 'trust',    label: 'Trust score',        detail: '', status: 'pass' },
  { id: 'scope',    label: 'Permission scope',   detail: '', status: 'pass' },
  { id: 'protocol', label: 'Protocol allowlist', detail: '', status: 'pass' },
  { id: 'size',     label: 'Position size',      detail: '', status: 'pass' },
  { id: 'daily',    label: 'Daily spending cap', detail: '', status: 'pass' },
]
