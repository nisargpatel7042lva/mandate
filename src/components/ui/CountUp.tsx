'use client'

// Animates a number toward its target whenever the target changes.
import { useEffect, useRef, useState } from 'react'

export function CountUp({
  value, decimals = 0, duration = 900, prefix = '', suffix = '', className = '', startFrom,
}: { value: number; decimals?: number; duration?: number; prefix?: string; suffix?: string; className?: string; startFrom?: number }) {
  const [shown, setShown] = useState(startFrom ?? value)
  const from = useRef(startFrom ?? value)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const a = from.current
    const b = value
    if (a === b) return
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - p, 4) // expo-out
      setShown(a + (b - a) * e)
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else from.current = b
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, duration])

  return (
    <span className={`num ${className}`}>
      {prefix}{shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  )
}
