'use client'

import { useState } from 'react'

type State = 'idle' | 'confirm' | 'revoking' | 'revoked' | 'error'

export function KillSwitch() {
  const [state, setState] = useState<State>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRevoke() {
    setState('revoking')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/revoke', { method: 'POST' })
      const json = await res.json() as { revoked?: boolean; txHash?: string; error?: string }
      if (!res.ok || json.error) {
        // Server has no private key (Vercel without PRIVATE_KEY) — show informative error
        setErrorMsg(json.error ?? 'Revocation failed')
        setState('error')
        return
      }
      setTxHash(json.txHash ?? null)
      setState('revoked')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setState('error')
    }
  }

  if (state === 'revoked') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          ✕
        </div>
        <div>
          <p className="text-sm font-semibold text-red-400">Authority Revoked</p>
          <p className="text-xs text-[var(--text-3)]">
            Agent cannot execute trades · PermissionMirror expiry set to 0
          </p>
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block font-mono text-[10px] text-[var(--text-3)] underline hover:text-[var(--text-2)]"
            >
              tx {txHash.slice(0, 18)}…
            </a>
          )}
        </div>
        <button
          onClick={() => { setState('idle'); setTxHash(null) }}
          className="ml-auto text-xs text-[var(--text-3)] underline hover:text-[var(--text-2)]"
        >
          Reset (demo)
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          !
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400">Revocation unavailable</p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">{errorMsg}</p>
        </div>
        <button
          onClick={() => { setState('idle'); setErrorMsg(null) }}
          className="ml-auto text-xs text-[var(--text-3)] underline hover:text-[var(--text-2)]"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/8 p-4">
        <p className="text-sm font-semibold text-red-400">Confirm Authority Revocation</p>
        <p className="mt-1 text-xs text-[var(--text-2)]">
          This calls{' '}
          <span className="font-mono">PermissionMirror.sync()</span> on Sepolia with expiry=0,
          making <span className="font-mono">isAuthorized()</span> return false immediately.
          A real Sepolia transaction will be submitted.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleRevoke}
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
          Immediately revoke agent authority via{' '}
          <span className="font-mono">PermissionMirror.sync(expiry=0)</span> on Sepolia
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
