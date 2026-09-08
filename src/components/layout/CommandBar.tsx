'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { useLive } from '@/components/live/LiveProvider'
import { useUi } from './UiProvider'
import { CountUp } from '@/components/ui/CountUp'
import { LIVE_AGENT } from '@/lib/server-data'

const noSub = () => () => {}

const NAV = [
  { href: '/',          label: 'Overview' },
  { href: '/execute',   label: 'Simulate' },
  { href: '/dashboard', label: 'Ledger' },
  { href: '/treasury',  label: 'Treasury' },
]

export function CommandBar() {
  const pathname = usePathname()
  const { snap, refreshing, lastFetch } = useLive()
  const { setPaletteOpen, setKillOpen } = useUi()
  const isMac = useSyncExternalStore(noSub, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true)

  const trust = snap?.agent.trustScore ?? null
  const authorized = snap?.agent.authorized ?? null
  const block = snap?.arc.blockNumber ?? null

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        {/* Wordmark */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-seal text-[#1a1200] shadow-[0_0_20px_-4px_var(--seal)] transition group-hover:shadow-[0_0_28px_-4px_var(--seal)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4.5 7l1.8 1.8L9.8 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span className="hidden text-[15px] font-bold tracking-tight sm:block">Mandate</span>
        </Link>

        {/* Nav */}
        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {NAV.map(n => {
            const active = pathname === n.href
            return (
              <Link key={n.href} href={n.href}
                className={`relative rounded-md px-3 py-1.5 text-[13px] font-medium transition ${active ? 'text-text' : 'text-text-2 hover:bg-surface-2 hover:text-text'}`}>
                {n.label}
                {active && <span className="absolute inset-x-3 -bottom-[13px] h-px bg-seal shadow-[0_0_8px_var(--seal)]" />}
              </Link>
            )
          })}
        </nav>

        {/* Chain pulse */}
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-2.5 py-1.5" title={lastFetch ? `Snapshot ${new Date(lastFetch).toLocaleTimeString()}` : 'Connecting…'}>
            <span className={`h-1.5 w-1.5 rounded-full ${snap?.arc.error ? 'bg-deny' : 'bg-chain live-dot'}`} />
            <span className="eyebrow !text-[9.5px] text-text-3">Arc</span>
            {block !== null
              ? <CountUp value={block} className="text-[12px] text-text" />
              : <span className="skeleton inline-block h-3 w-16" />}
            <span className={`h-3 w-px bg-line-2`} />
            <span className="eyebrow !text-[9.5px] text-text-3">Sepolia</span>
            <span className="num text-[12px] text-text">{snap?.agent.syncCount ?? '—'} <span className="text-text-3">syncs</span></span>
            {refreshing && <span className="spin ml-1 inline-block h-2.5 w-2.5 rounded-full border border-text-3 border-t-transparent" />}
          </div>

          {/* Agent pill */}
          <Link href="/" className="flex items-center gap-2.5 rounded-lg border border-line bg-surface/60 px-2.5 py-1.5 transition hover:border-line-2">
            <span className={`h-1.5 w-1.5 rounded-full ${authorized === null ? 'bg-text-3' : authorized ? 'bg-allow live-dot' : 'bg-deny'}`} />
            <span className="font-mono text-[12px] text-text">{LIVE_AGENT.ensName}</span>
            <span className={`num rounded px-1.5 py-0.5 text-[11px] font-bold ${trust === null ? 'bg-surface-2 text-text-3' : trust >= 60 ? 'bg-allow/10 text-allow' : 'bg-deny/10 text-deny'}`}>
              {trust === null ? '—' : trust.toFixed(0)}
            </span>
          </Link>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button onClick={() => setPaletteOpen(true)} className="btn btn-ghost !px-2.5" aria-label="Open command palette">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span className="hidden items-center gap-1 sm:flex"><span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span className="kbd">K</span></span>
          </button>
          <button onClick={() => setKillOpen(true)} className="btn btn-deny !px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-deny" />
            <span className="hidden sm:inline">Kill switch</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-3 py-1.5 md:hidden">
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={`rounded-md px-3 py-1 text-[12px] font-medium ${pathname === n.href ? 'bg-seal/10 text-seal' : 'text-text-2'}`}>{n.label}</Link>
        ))}
      </nav>
    </header>
  )
}
