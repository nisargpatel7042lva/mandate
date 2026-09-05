'use client'

import { useState } from 'react'

export function KillSwitch() {
  const [state, setState] = useState<'idle' | 'confirm' | 'revoking' | 'revoked'>('idle')

  if (state === 'revoked') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          ✕
        </div>
        <div>
          <p className="text-sm font-semibold text-red-400">Authority Revoked</p>
          <p className="text-xs text-[var(--text-3)]">
            Agent cannot execute trades · ENSv2 record cleared
          </p>
        </div>
        <button
          onClick={() => setState('idle')}
          className="ml-auto text-xs text-[var(--text-3)] underline hover:text-[var(--text-2)]"
        >
          Reset (demo)
        </button>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/8 p-4">
        <p className="text-sm font-semibold text-red-400">Confirm Authority Revocation</p>
        <p className="mt-1 text-xs text-[var(--text-2)]">
          This will clear the ENSv2 permission record for{' '}
          <span className="font-mono">testagent.mandate.eth</span>. The agent will be
          unable to execute any trades until a new scope is written.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setState('revoking')
              setTimeout(() => setState('revoked'), 1800)
            }}
            className="rounded bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 active:scale-95"
          >
            Confirm Revoke
          </button>
          <button
            onClick={() => setState('idle')}
            className="rounded border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">Kill Switch</p>
        <p className="text-xs text-[var(--text-3)]">
          Immediately revoke agent authority by clearing ENSv2 permission record
        </p>
      </div>
      <button
        onClick={() => setState('confirm')}
        disabled={state === 'revoking'}
        className="flex shrink-0 items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
      >
        {state === 'revoking' ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
            Revoking…
          </>
        ) : (
          <>✕ Revoke Authority</>
        )}
      </button>
    </div>
  )
}
