// Recent simulator runs, persisted per browser. Exposed as an external store so
// components read it with useSyncExternalStore (server snapshot is empty → no
// hydration mismatch, no setState-in-effect).

import type { RunRecord } from './useCheck'

const KEY = 'mandate:runs'
const EMPTY: RunRecord[] = []
let cache: RunRecord[] | null = null
const listeners = new Set<() => void>()

function read(): RunRecord[] {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? '[]') as RunRecord[] } catch { cache = [] }
  return cache
}
function write(next: RunRecord[]) {
  cache = next.slice(0, 12)
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch {}
  listeners.forEach(l => l())
}

export const runHistory = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
  get: () => read(),
  getServer: () => EMPTY,
  add: (r: RunRecord) => write([r, ...read().filter(x => x.id !== r.id)]),
  clear: () => write([]),
}
