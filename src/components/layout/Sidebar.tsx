'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/execute',     label: 'Execute',    icon: '▷' },
  { href: '/',            label: 'Agent',      icon: '◈' },
  { href: '/dashboard',   label: 'Dashboard',  icon: '⊞' },
  { href: '/treasury',    label: 'Treasury',   icon: '◎' },
]

function ThemeToggle() {
  const [dark, setDark] = useState(true)
  return (
    <button
      onClick={() => {
        setDark(!dark)
        document.documentElement.classList.toggle('dark', !dark)
      }}
      className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-3)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀' : '◑'}
    </button>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-14 flex-col items-center border-r border-[var(--border)] bg-[var(--surface)] py-4 md:w-52 md:items-start md:px-3">
      {/* Wordmark */}
      <div className="mb-6 flex items-center gap-2 px-1">
        <span className="text-[var(--tier-autonomous,#f97316)] text-lg">◈</span>
        <span className="hidden font-semibold tracking-tight text-[var(--text)] md:block">
          Mandate
        </span>
        <span className="ml-auto hidden text-[10px] font-mono text-[var(--text-3)] md:block">
          Sepolia
        </span>
      </div>

      {/* Agent selector pill */}
      <div className="mb-4 hidden w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 md:block">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Active agent</p>
        <p className="mt-0.5 font-mono text-xs text-[var(--text)]">testagent.mandate.eth</p>
        <div className="mt-1 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          <span className="text-[10px] text-orange-400">Autonomous</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex w-full flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-9 items-center gap-3 rounded-md px-2 text-sm transition-colors
                ${active
                  ? 'bg-[var(--surface-3)] font-medium text-[var(--text)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`}
            >
              <span className="w-5 text-center text-base leading-none">{icon}</span>
              <span className="hidden md:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: blocked tx link + theme toggle */}
      <div className="mt-auto flex w-full flex-col gap-0.5">
        <Link
          href="/transactions/blocked"
          className="flex h-9 items-center gap-3 rounded-md px-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          <span className="w-5 text-center text-base leading-none">✕</span>
          <span className="hidden md:block">Last Blocked</span>
        </Link>
        <div className="flex items-center justify-center md:justify-start md:px-2">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
