'use client'

// ⌘K palette — the daily-driver. Jump anywhere, fire a preset check, copy addresses.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUi } from './UiProvider'
import { LIVE_AGENT } from '@/lib/server-data'
import { EXPLORER } from '@/lib/format'

interface Item { id: string; group: string; label: string; hint?: string; keys?: string; run: () => void }

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setKillOpen } = useUi()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = () => { setPaletteOpen(false); setQ(''); setCursor(0) }
  const go = (href: string) => { close(); router.push(href) }
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setToast(`${what} copied`) } catch { setToast('Clipboard blocked') }
    setTimeout(() => setToast(null), 1400)
    close()
  }

  const items = useMemo<Item[]>(() => [
    { id: 'nav-overview',  group: 'Go to',   label: 'Overview',  hint: 'Authority map, live feed',      run: () => go('/') },
    { id: 'nav-simulate',  group: 'Go to',   label: 'Simulate',  hint: 'Run an underwriting check',     run: () => go('/execute') },
    { id: 'nav-ledger',    group: 'Go to',   label: 'Ledger',    hint: 'Spend, events, kill switch',    run: () => go('/dashboard') },
    { id: 'nav-treasury',  group: 'Go to',   label: 'Treasury',  hint: 'Arc balance and settlements',   run: () => go('/treasury') },
    { id: 'nav-incident',  group: 'Go to',   label: 'Last incident', hint: 'Why GMX was blocked',       run: () => go('/transactions/blocked') },
    { id: 'sim-uni',  group: 'Simulate', label: 'Uniswap v3 · $8,000 swap',    hint: 'Expected: authorized',  run: () => go('/execute?preset=uniswap-approved&run=1') },
    { id: 'sim-gmx',  group: 'Simulate', label: 'GMX Perps · $5,000 long',     hint: 'Expected: blocked (protocol)', run: () => go('/execute?preset=gmx-blocked-protocol&run=1') },
    { id: 'sim-crv',  group: 'Simulate', label: 'Curve · $12,000 LP',          hint: 'Expected: blocked (size)',     run: () => go('/execute?preset=curve-blocked-size&run=1') },
    { id: 'copy-addr', group: 'Copy',    label: 'Agent wallet address', hint: LIVE_AGENT.address, run: () => copy(LIVE_AGENT.address, 'Address') },
    { id: 'copy-ens',  group: 'Copy',    label: 'ENS name',             hint: LIVE_AGENT.ensName, run: () => copy(LIVE_AGENT.ensName, 'ENS name') },
    { id: 'copy-mcp',  group: 'Copy',    label: 'MCP endpoint',         hint: '/api/mcp',         run: () => copy(`${location.origin}/api/mcp`, 'MCP URL') },
    { id: 'open-arc',  group: 'Open',    label: 'Agent on ArcScan',     hint: 'testnet.arcscan.app', run: () => { window.open(EXPLORER.arcAddr(LIVE_AGENT.address), '_blank'); close() } },
    { id: 'open-sep',  group: 'Open',    label: 'Agent on Etherscan',   hint: 'sepolia.etherscan.io', run: () => { window.open(EXPLORER.sepoliaAddr(LIVE_AGENT.address), '_blank'); close() } },
    { id: 'kill',      group: 'Danger',  label: 'Revoke authority',     hint: 'Opens the kill switch', run: () => { close(); setKillOpen(true) } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(i => `${i.group} ${i.label} ${i.hint ?? ''}`.toLowerCase().includes(s))
  }, [q, items])

  // Global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(!paletteOpen) }
      if (e.key === 'Escape' && paletteOpen) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen])

  useEffect(() => { if (paletteOpen) setTimeout(() => inputRef.current?.focus(), 10) }, [paletteOpen])

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line-2 bg-surface-2 px-3 py-1.5 text-[12px] text-text shadow-xl fade-in">{toast}</div>
      )}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 p-4 pt-[12vh] backdrop-blur-sm fade-in" onMouseDown={close}>
          <div className="panel ticks w-full max-w-xl overflow-hidden" onMouseDown={e => e.stopPropagation()} style={{ animation: 'rise .35s var(--ease-out-expo)' }}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-text-3"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input
                ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setCursor(0) }}
                placeholder="Jump, simulate, copy…"
                className="h-12 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-3"
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(filtered.length - 1, c + 1)) }
                  if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
                  if (e.key === 'Enter' && filtered[cursor]) filtered[cursor].run()
                }}
              />
              <span className="kbd">esc</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-1.5">
              {filtered.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-text-3">Nothing matches “{q}”</div>}
              {filtered.map((it, i) => {
                const first = i === 0 || filtered[i - 1].group !== it.group
                return (
                  <div key={it.id}>
                    {first && <div className="eyebrow px-4 pb-1 pt-2.5">{it.group}</div>}
                    <button
                      onMouseEnter={() => setCursor(i)} onClick={it.run}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${i === cursor ? 'bg-surface-2' : ''}`}>
                      <span className={`h-1 w-1 rounded-full ${it.group === 'Danger' ? 'bg-deny' : it.group === 'Simulate' ? 'bg-seal' : 'bg-text-3'}`} />
                      <span className={`text-[13px] ${it.group === 'Danger' ? 'text-deny' : 'text-text'}`}>{it.label}</span>
                      {it.hint && <span className="ml-auto truncate font-mono text-[11px] text-text-3">{it.hint}</span>}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[10.5px] text-text-3">
              <span><span className="kbd">↑↓</span> navigate</span>
              <span><span className="kbd">↵</span> run</span>
              <span className="ml-auto">{filtered.length} commands</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
