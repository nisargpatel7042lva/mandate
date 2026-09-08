'use client'

// Optional cinematic layer above the canvas gate. If `src` 404s or the browser can't
// play it, this quietly stays invisible and the GateScene canvas underneath is the
// whole picture — so dropping a file in later is the only step needed to upgrade it.

import { useState } from 'react'

export function HeroVideo({ src, className = '' }: { src: string; className?: string }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <video
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
      autoPlay muted loop playsInline preload="auto" aria-hidden
      onCanPlay={() => setReady(true)}
      onError={() => setFailed(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
