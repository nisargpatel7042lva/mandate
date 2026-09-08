// Display helpers shared across screens. Pure functions, safe on server and client.

export const PROTOCOLS: Array<{ id: string; label: string; short: string; kind: 'dex' | 'lending' | 'perp' | 'aggregator' }> = [
  { id: 'uniswap-v3',  label: 'Uniswap v3',      short: 'UNI',  kind: 'dex' },
  { id: 'curve',       label: 'Curve Finance',   short: 'CRV',  kind: 'dex' },
  { id: 'aave-v3',     label: 'Aave v3',         short: 'AAVE', kind: 'lending' },
  { id: '1inch',       label: '1inch',           short: '1INCH', kind: 'aggregator' },
  { id: 'gmx-perp',    label: 'GMX Perpetuals',  short: 'GMX',  kind: 'perp' },
  { id: 'compound-v3', label: 'Compound v3',     short: 'COMP', kind: 'lending' },
]

export const PROTOCOL_LABEL: Record<string, string> = Object.fromEntries(PROTOCOLS.map(p => [p.id, p.label]))

export function protocolLabel(id: string): string {
  return PROTOCOL_LABEL[id] ?? id
}

/** Wall clock in unix seconds. Kept out of component bodies so render stays pure. */
export function nowSeconds(): number { return Math.floor(Date.now() / 1000) }

export function shortAddr(addr: string, head = 6, tail = 4): string {
  if (!addr) return '—'
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

export function usd(n: number | null | undefined, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  if (opts.compact && Math.abs(n) >= 1000) {
    return `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`
  }
  const cents = opts.cents ?? n < 100
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`
}

/** Seconds until `ts` → "27d 14h" / "Expired" */
export function untilExpiry(ts: number | null): { label: string; expired: boolean; days: number } {
  if (!ts) return { label: '—', expired: false, days: 0 }
  const diff = ts - Math.floor(Date.now() / 1000)
  if (diff <= 0) return { label: 'Expired', expired: true, days: 0 }
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  return { label: `${d}d ${h}h`, expired: false, days: d + h / 24 }
}

export function fmtTs(unixSecs: number, withSeconds = false): string {
  return new Date(unixSecs * 1000).toLocaleString('en-US', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}), hour12: false,
  })
}

export function relTime(unixSecs: number, nowS = Math.floor(Date.now() / 1000)): string {
  const diff = Math.max(0, nowS - unixSecs)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const EXPLORER = {
  sepoliaTx:   (h: string) => `https://sepolia.etherscan.io/tx/${h.startsWith('0x') ? h : `0x${h}`}`,
  sepoliaAddr: (a: string) => `https://sepolia.etherscan.io/address/${a}`,
  arcTx:       (h: string) => `https://testnet.arcscan.app/tx/${h}`,
  arcAddr:     (a: string) => `https://testnet.arcscan.app/address/${a}`,
}
