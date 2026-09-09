'use client'

// The hero's visual layer: canvas gate + video + fade gradients. Scoped to the hero
// section (not the viewport) so it scrolls away like normal content, with a light
// parallax drift — the backdrop moves slower than the page and eases back slightly,
// which is what actually reads as "premium" rather than a flat pinned image.

import { useEffect, useRef, useState } from 'react'
import { GateScene } from './GateScene'
import { HeroVideo } from './HeroVideo'

const MAX_DRIFT_PX = 90
const MAX_SCALE_DELTA = 0.05
const MAX_FADE = 0.45

export function HeroBackdrop({ allowed }: { allowed: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ y: 0, scale: 1, opacity: 1 })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const section = wrapRef.current?.parentElement
      if (!section) return
      const rect = section.getBoundingClientRect()
      const h = rect.height || 1
      // 0 while the hero fills the viewport top, sliding to 1 as it scrolls fully past.
      const progress = Math.min(1, Math.max(0, -rect.top / h))
      setT({
        y: progress * MAX_DRIFT_PX,
        scale: 1 + progress * MAX_SCALE_DELTA,
        opacity: 1 - progress * MAX_FADE,
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-x-0 -top-[10%] -bottom-[10%] will-change-transform"
      style={{ transform: `translateY(${t.y}px) scale(${t.scale})`, opacity: t.opacity }}
      aria-hidden
    >
      <GateScene allowed={allowed} />
      <HeroVideo src="/hero-gate.mp4" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,.82) 86%, #000 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 30%, rgba(0,0,0,0) 52%, rgba(0,0,0,0) 86%, rgba(0,0,0,.5) 100%)' }} />
    </div>
  )
}
