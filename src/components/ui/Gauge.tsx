// Arc gauge — pure SVG, server-safe. `pct` 0..100.
export function Gauge({
  pct, size = 120, stroke = 9, tone = 'seal', label, sub, className = '',
}: { pct: number; size?: number; stroke?: number; tone?: 'seal' | 'allow' | 'deny' | 'chain'; label?: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const sweep = 0.75 // 270°
  const p = Math.max(0, Math.min(100, pct)) / 100
  const color = { seal: 'var(--seal)', allow: 'var(--allow)', deny: 'var(--deny)', chain: 'var(--chain)' }[tone]
  return (
    <div className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="ring-track" strokeWidth={stroke}
          strokeDasharray={`${c * sweep} ${c}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${c * sweep * p} ${c}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s var(--ease-out-expo)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label}
        {sub && <div className="mt-0.5 text-[10px] text-text-3">{sub}</div>}
      </div>
    </div>
  )
}
