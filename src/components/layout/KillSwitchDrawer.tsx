'use client'

import { useEffect } from 'react'
import { useUi } from './UiProvider'
import { KillSwitch } from '@/components/dashboard/KillSwitch'
import { LIVE_AGENT } from '@/lib/server-data'

export function KillSwitchDrawer() {
  const { killOpen, setKillOpen } = useUi()
  useEffect(() => {
    if (!killOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setKillOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [killOpen, setKillOpen])

  if (!killOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg/60 backdrop-blur-sm fade-in" onMouseDown={() => setKillOpen(false)}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-deny/30 bg-surface shadow-[0_0_80px_-20px_rgb(var(--deny-rgb)/.6)]"
        style={{ animation: 'rise .4s var(--ease-out-expo)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="eyebrow text-deny">Emergency control</div>
            <h2 className="mt-1 text-lg font-semibold">Kill switch</h2>
          </div>
          <button onClick={() => setKillOpen(false)} className="btn btn-ghost !px-2" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="text-[13px] leading-relaxed text-text-2">
            Writes an expired scope to <span className="font-mono text-text">PermissionMirror</span> on Sepolia so
            <span className="font-mono text-text"> isAuthorized()</span> returns false on the next block. Signed in your own wallet,
            never by this server. Requires the relayer account.
          </p>
          <div className="mt-5">
            <KillSwitch agentAddress={LIVE_AGENT.address} />
          </div>
          <div className="mt-6 rounded-lg border border-line bg-bg-2 p-3 text-[11.5px] leading-relaxed text-text-3">
            Limits are preserved and only expiry moves into the past, so the record stays auditable.
            Re-run the relayer to restore authority.
          </div>
        </div>
      </aside>
    </div>
  )
}
