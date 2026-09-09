'use client'

// A gate of light in fog. Attempts drift toward it from the dark; the ones inside the
// mandate pass through and are absorbed, the others die at the threshold. Monochrome,
// slow, and driven by the live allowlist. Renders one still frame under reduced motion.

import { useEffect, useRef } from 'react'
import { PROTOCOLS } from '@/lib/format'

interface P { x: number; y: number; vx: number; vy: number; life: number; allowed: boolean; label: string; phase: number; dead: boolean; fade: number }
interface Fog { x: number; y: number; r: number; vx: number; a: number }

export function GateScene({ allowed, className = '' }: { allowed: string[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const allowedRef = useRef(allowed)
  useEffect(() => { allowedRef.current = allowed })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-sans-var').trim() || 'system-ui'

    let w = 0, h = 0, dpr = 1, gx = 0, gTop = 0, gBot = 0
    const fog: Fog[] = []
    const ps: P[] = []
    let raf = 0, last = performance.now(), spawn = 0, t = 0

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(1.5, window.devicePixelRatio || 1)
      w = r.width; h = r.height
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      gx = w * (w < 700 ? 0.5 : 0.70); gTop = h * 0.18; gBot = h * 0.80
      fog.length = 0
      for (let i = 0; i < 14; i++) fog.push({ x: Math.random() * w, y: h * (0.62 + Math.random() * 0.4), r: w * (0.12 + Math.random() * 0.22), vx: (Math.random() - 0.5) * 0.008, a: 0.035 + Math.random() * 0.05 })
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize()

    const spawnOne = () => {
      const list = allowedRef.current
      const proto = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)]
      const fromLeft = Math.random() < 0.7
      const x = fromLeft ? -20 : w + 20
      ps.push({ x, y: h * (0.5 + Math.random() * 0.34), vx: (fromLeft ? 1 : -1) * (0.022 + Math.random() * 0.02), vy: 0, life: 1, allowed: list.includes(proto.id), label: proto.short, phase: Math.random() * Math.PI * 2, dead: false, fade: 0 })
    }

    const frame = (now: number) => {
      const dt = Math.min(50, now - last); last = now; t += dt
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)

      // floor glow under the gate
      const floor = ctx.createRadialGradient(gx, gBot + 10, 0, gx, gBot + 10, w * 0.28)
      floor.addColorStop(0, 'rgba(255,255,255,0.16)'); floor.addColorStop(0.35, 'rgba(255,255,255,0.05)'); floor.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save(); ctx.scale(1, 0.32); ctx.fillStyle = floor; ctx.beginPath(); ctx.arc(gx, (gBot + 10) / 0.32, w * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.restore()

      // fog
      ctx.globalCompositeOperation = 'lighter'
      for (const f of fog) {
        if (!reduced) { f.x += f.vx * dt; if (f.x < -f.r) f.x = w + f.r; if (f.x > w + f.r) f.x = -f.r }
        const near = 1 - Math.min(1, Math.abs(f.x - gx) / (w * 0.5))
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r)
        g.addColorStop(0, `rgba(255,255,255,${f.a * (0.5 + near * 0.9)})`); g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // the gate: halo, then core slit with a slow breathing flicker
      const flick = 0.92 + 0.08 * Math.sin(t * 0.0013) + 0.02 * Math.sin(t * 0.021)
      const halo = ctx.createRadialGradient(gx, (gTop + gBot) / 2, 0, gx, (gTop + gBot) / 2, h * 0.55)
      halo.addColorStop(0, `rgba(255,255,255,${0.20 * flick})`); halo.addColorStop(0.25, `rgba(255,255,255,${0.06 * flick})`); halo.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save(); ctx.scale(0.55, 1); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx / 0.55, (gTop + gBot) / 2, h * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      for (const [wd, a, blur] of [[26, 0.10, 60], [12, 0.35, 30], [5, 0.9, 12], [2, 1, 0]] as const) {
        ctx.strokeStyle = `rgba(255,255,255,${a * flick})`; ctx.lineWidth = wd; ctx.lineCap = 'round'
        ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = blur
        ctx.beginPath(); ctx.moveTo(gx, gTop); ctx.lineTo(gx, gBot); ctx.stroke()
      }
      ctx.shadowBlur = 0

      // attempts
      if (!reduced) { spawn += dt; if (spawn > 1900 && ps.length < 9) { spawn = 0; spawnOne() } }
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      for (const p of ps) {
        if (p.dead) continue
        const dir = Math.sign(p.vx)
        const dist = (gx - p.x) * dir
        if (!reduced) {
          p.x += p.vx * dt; p.y += Math.sin(t * 0.002 + p.phase) * 0.015 * dt
          if (p.fade === 0 && p.x > 24 && p.x < w - 24) p.life = Math.min(1, p.life + dt / 900)
        }
        if (!p.allowed && dist < 70 && p.fade === 0) p.fade = 0.0001
        if (p.fade > 0) { p.fade += dt / 900; p.vx *= 0.94; p.y += dt * 0.02 }
        if (p.allowed && dist < 4) { p.dead = true; continue }
        if (p.fade >= 1 || p.x < -40 || p.x > w + 40) { p.dead = true; continue }

        const near = Math.max(0, 1 - Math.abs(dist) / (w * 0.3))
        const alpha = p.life * (p.fade > 0 ? 1 - p.fade : 1)
        const a = (p.allowed ? 0.35 + near * 0.65 : 0.3 + near * 0.2) * alpha
        // trail
        const tl = 26 + near * 40
        const g = ctx.createLinearGradient(p.x - dir * tl, p.y, p.x, p.y)
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${a})`)
        ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x - dir * tl, p.y); ctx.lineTo(p.x, p.y); ctx.stroke()
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = p.allowed ? 8 + near * 10 : 4
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + near * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
        ctx.font = `500 10px ${sans}`
        ctx.fillStyle = p.fade > 0 ? `rgba(255,120,120,${0.7 * alpha})` : `rgba(255,255,255,${0.55 * alpha})`
        ctx.fillText(p.fade > 0 ? `${p.label} · denied` : p.label, p.x, p.y - 8)
      }
      for (let i = ps.length - 1; i >= 0; i--) if (ps[i].dead) ps.splice(i, 1)

      if (!reduced) raf = requestAnimationFrame(frame)
    }
    if (reduced) {
      for (let i = 0; i < 5; i++) { spawnOne(); ps[i].x = w * (0.1 + i * 0.09); ps[i].life = 1 }
      frame(performance.now()) // one still frame, painted now rather than on a rAF that may never come
    } else {
      raf = requestAnimationFrame(frame)
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={ref} className={`absolute inset-0 block h-full w-full ${className}`} aria-hidden />
}
