'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  {
    href: '/execute',
    label: 'Execute',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/',
    label: 'Agent',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/treasury',
    label: 'Treasury',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 5v6M6 6.5h3a1 1 0 010 2H7a1 1 0 010 2h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [dark, setDark] = useState(true)

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-[var(--border)] bg-[var(--surface)] py-4 md:w-56 md:items-stretch">

      {/* Wordmark */}
      <div className="mb-6 flex items-center gap-2.5 px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-[0_2px_8px_rgba(14,165,233,0.4)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M7 5v4M5 7h4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-bold tracking-tight text-[var(--text)]">Mandate</p>
          <p className="text-[10px] font-mono text-[var(--text-3)]">Sepolia testnet</p>
        </div>
      </div>

      {/* Agent pill */}
      <div className="mb-5 hidden w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 md:block">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Active Agent</p>
          <span className="flex items-center gap-1">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400">Live</span>
          </span>
        </div>
        <p className="mt-1 font-mono text-xs font-semibold text-[var(--text)]">testagent.mandate.eth</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20">
            AUTONOMOUS
          </span>
          <span className="font-mono text-[10px] text-[var(--text-3)]">#10099</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex w-full flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-gradient-to-r from-sky-500/10 to-transparent text-sky-400 shadow-[inset_2px_0_0_#0ea5e9]'
                  : 'text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]'
                }`}
            >
              <span className={`shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-[var(--text-3)] group-hover:text-[var(--text-2)]'}`}>
                {icon}
              </span>
              <span className="hidden md:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto flex w-full flex-col gap-1 px-2">
        <Link
          href="/transactions/blocked"
          className="group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--text-3)] transition-all hover:bg-red-500/8 hover:text-red-400"
        >
          <span className="shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="hidden md:block">Last Blocked</span>
        </Link>

        <button
          onClick={() => {
            setDark(!dark)
            document.documentElement.classList.toggle('dark', !dark)
          }}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--text-3)] transition-all hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]"
        >
          <span className="shrink-0">
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 9.5A6 6 0 016.5 3a6 6 0 100 10A6 6 0 0113 9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span className="hidden md:block">{dark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  )
}
