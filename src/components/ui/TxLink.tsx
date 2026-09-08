import { EXPLORER, shortAddr } from '@/lib/format'

export function TxLink({ hash, chain, className = '', head = 8, tail = 6 }: {
  hash: string; chain: 'arc' | 'sepolia'; className?: string; head?: number; tail?: number
}) {
  const href = chain === 'arc' ? EXPLORER.arcTx(hash) : EXPLORER.sepoliaTx(hash)
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className={`group inline-flex items-center gap-1 font-mono text-[11px] text-text-3 transition hover:text-chain ${className}`}
      title={hash}
    >
      {shortAddr(hash, head, tail)}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100">
        <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}
