'use client'

// Desktop landing is one frame, no scroll — same rule as the reference.
import { useEffect } from 'react'

export function LockViewport() {
  useEffect(() => {
    document.body.classList.add('lock-viewport')
    return () => document.body.classList.remove('lock-viewport')
  }, [])
  return null
}
