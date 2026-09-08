'use client'

// Polls /api/live and shares the snapshot with every client component.
// A server-rendered `initial` keeps first paint honest; polling keeps it moving.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { LiveSnapshot } from '@/lib/live'

interface LiveCtx {
  snap: LiveSnapshot | null
  lastFetch: number | null
  refreshing: boolean
  refresh: () => Promise<void>
}

const Ctx = createContext<LiveCtx>({ snap: null, lastFetch: null, refreshing: false, refresh: async () => {} })

export function LiveProvider({ initial, intervalMs = 30_000, children }: { initial: LiveSnapshot | null; intervalMs?: number; children: ReactNode }) {
  const [snap, setSnap] = useState<LiveSnapshot | null>(initial)
  const [lastFetch, setLastFetch] = useState<number | null>(() => (initial ? initial.at * 1000 : null))
  const [refreshing, setRefreshing] = useState(false)
  const inflight = useRef<AbortController | null>(null)

  async function refresh() {
    inflight.current?.abort()
    const ac = new AbortController()
    inflight.current = ac
    setRefreshing(true)
    try {
      const res = await fetch('/api/live', { signal: ac.signal, cache: 'no-store' })
      if (res.ok) {
        const next = await res.json() as LiveSnapshot
        setSnap(prev => {
          // A rate-limited ArcScan poll must not erase settlements we already showed.
          if (next.settlementsError && prev && prev.settlements.length > next.settlements.length) {
            return { ...next, settlements: prev.settlements, events: prev.events, spentTodayUsdc: prev.spentTodayUsdc, totalSettledUsdc: prev.totalSettledUsdc }
          }
          return next
        })
        setLastFetch(Date.now())
      }
    } catch { /* aborted or offline — keep the last snapshot */ }
    finally { if (inflight.current === ac) setRefreshing(false) }
  }

  useEffect(() => {
    // First poll on the next tick so the effect body itself stays free of state updates.
    const kick = initial ? null : setTimeout(() => { void refresh() }, 0)
    const id = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, intervalMs)
    const onVis = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => { if (kick) clearTimeout(kick); clearInterval(id); document.removeEventListener('visibilitychange', onVis); inflight.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Ctx.Provider value={{ snap, lastFetch, refreshing, refresh }}>{children}</Ctx.Provider>
}

export function useLive() { return useContext(Ctx) }
