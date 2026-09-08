'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLive } from '@/components/live/LiveProvider'
import { useUi } from './UiProvider'

const APP_NAV = [
  { href: '/console',   label: 'Console' },
  { href: '/execute',   label: 'Simulate' },
  { href: '/dashboard', label: 'Ledger' },
  { href: '/treasury',  label: 'Treasury' },
]

const LANDING_NAV = [
  { href: '#how',   label: 'How it works' },
  { href: '#proof', label: 'Live proof' },
  { href: '#try',   label: 'Try it' },
  { href: '#faq',   label: 'FAQ' },
]

export function BrandMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  // Two uprights and a lintel: the gate. The gap is where authority is checked.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="4" y="5" width="3.4" height="16" rx="1.7" />
      <rect x="16.6" y="5" width="3.4" height="16" rx="1.7" />
      <rect x="4" y="2.6" width="16" height="2.6" rx="1.3" />
      <circle cx="12" cy="14.2" r="1.5" />
    </svg>
  )
}

export function Header() {
  const pathname = usePathname()
  const landing = pathname === '/'
  const { snap } = useLive()
  const { setPaletteOpen, setKillOpen } = useUi()
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.toggle('menu-open', open)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('menu-open') }
  }, [open])

  // Scroll-spy on the landing page so the nav shows where you are, not just where you can go.
  useEffect(() => {
    if (!landing) return
    const els = LANDING_NAV.map(n => document.getElementById(n.href.slice(1))).filter((e): e is HTMLElement => !!e)
    if (els.length === 0) return
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-42% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [landing])

  const authorized = snap?.agent.authorized ?? null
  const nav = landing ? LANDING_NAV : APP_NAV
  const primary = pathname === '/execute' ? { href: '/console', label: 'Open console' } : { href: '/execute', label: 'Simulate' }

  return (
    <header className={`sticky top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center bg-black/70 px-5 pb-2.5 pt-[18px] backdrop-blur-xl sm:px-10 sm:pt-[22px] ${landing ? '' : 'border-b border-line'}`}>
      <Link href="/" aria-label="Mandate" className="appear appear--scale inline-flex items-center gap-2.5 justify-self-start text-[15.5px] font-semibold tracking-[-0.03em] text-white" style={{ ['--d' as string]: '.08s' }}>
        <BrandMark />
        <span>Mandate<span className="font-normal text-text-2">.eth</span></span>
        <span
          className={`ml-1 h-1.5 w-1.5 rounded-full ${authorized === null ? 'bg-text-3' : authorized ? 'bg-allow' : 'bg-deny'}`}
          title={authorized === null ? 'Connecting' : authorized ? 'Agent authorized' : 'Authority revoked'}
        />
      </Link>

      <nav aria-label="Primary" className={`justify-self-center items-center gap-2 ${open ? 'menu-open-nav flex' : 'hidden'} md:flex`}>
        {nav.map((n, i) => (
          <Link key={n.href} href={n.href} data-active={landing ? activeSection === n.href.slice(1) : pathname === n.href} className="pill-nav appear appear--scale" style={{ ['--d' as string]: `${0.16 + i * 0.12}s` }}>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 justify-self-end">
        <button onClick={() => setPaletteOpen(true)} className="btn btn-ghost hidden !px-2.5 lg:inline-flex" aria-label="Command palette">
          <span className="kbd">⌘</span><span className="kbd">K</span>
        </button>
        <button onClick={() => setKillOpen(true)} className="btn btn-deny appear appear--scale hidden sm:inline-flex" style={{ ['--d' as string]: '.30s' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-deny" />Kill switch
        </button>
        <Link href={primary.href} className="btn btn-solid appear appear--scale" style={{ ['--d' as string]: '.34s' }}>{primary.label}</Link>
        <button
          onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}
          className="grid h-[42px] w-[42px] place-items-center rounded-md border border-line bg-black/60 md:hidden">
          <span className="grid gap-[5px]">
            <i className={`block h-[1.5px] w-4 rounded-sm bg-white transition duration-200 ${open ? 'translate-y-[6.5px] rotate-45' : ''}`} />
            <i className={`block h-[1.5px] w-4 rounded-sm bg-white transition duration-200 ${open ? 'opacity-0' : ''}`} />
            <i className={`block h-[1.5px] w-4 rounded-sm bg-white transition duration-200 ${open ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="fixed inset-0 z-40 flex flex-col items-stretch gap-3 bg-black/70 px-6 pb-8 pt-28 backdrop-blur-2xl md:hidden" onClick={() => setOpen(false)}>
          <p className="eyebrow mb-2">{landing ? 'On this page' : 'Menu'}</p>
          {nav.map(n => <Link key={n.href} href={n.href} className="pill-nav !h-14 !justify-between !rounded-xl !text-[19px]">{n.label}<span className="text-text-3">›</span></Link>)}
          <div className="mt-auto flex flex-col gap-2">
            <button onClick={() => { setOpen(false); setKillOpen(true) }} className="btn btn-deny btn-lg w-full">Kill switch</button>
            <Link href="/execute" className="btn btn-solid btn-lg w-full">Simulate</Link>
          </div>
        </div>
      )}
    </header>
  )
}
