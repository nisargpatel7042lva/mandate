'use client'

// The authority perimeter. The agent sits at the core; the amber ring is its mandate.
// Allowed protocols live inside and stream trades to the core. Denied protocols sit
// outside; their attempts hit the ring and shatter. Everything is driven by live scope.

import { useEffect, useRef } from 'react'
import { PROTOCOLS } from '@/lib/format'

interface Props {
  allowed: string[]
  trustScore: number
  /** 0..1 fraction of scope validity remaining */
  expiryFrac: number
  authorized: boolean
  ensName: string
  onSelect?: (protocolId: string) => void
  className?: string
}

interface Node { id: string; label: string; short: string; allowed: boolean; angle: number; r: number; x: number; y: number; hot: number }
interface Particle { from: Node; t: number; speed: number; dead: boolean }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; allowed: boolean }
interface Ripple { x: number; y: number; r: number; life: number; allowed: boolean }

export function AuthorityMap({ allowed, trustScore, expiryFrac, authorized, ensName, onSelect, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ allowed, trustScore, expiryFrac, authorized, ensName, onSelect })
  useEffect(() => { propsRef.current = { allowed, trustScore, expiryFrac, authorized, ensName, onSelect } })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const css = getComputedStyle(document.documentElement)
    const col = {
      seal: css.getPropertyValue('--seal').trim() || '#f5b544',
      allow: css.getPropertyValue('--allow').trim() || '#34d399',
      deny: css.getPropertyValue('--deny').trim() || '#ff5d5d',
      chain: css.getPropertyValue('--chain').trim() || '#5ed7ee',
      text: css.getPropertyValue('--text').trim() || '#eceef5',
      text3: css.getPropertyValue('--text-3').trim() || '#545b70',
      line: css.getPropertyValue('--line-2').trim() || '#2a3040',
    }
    const monoFam = css.getPropertyValue('--font-mono-var').trim() || 'ui-monospace'
    const sansFam = css.getPropertyValue('--font-sans-var').trim() || 'system-ui'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1
    let cx = 0, cy = 0, R = 0
    let nodes: Node[] = []
    const particles: Particle[] = []
    const sparks: Spark[] = []
    const ripples: Ripple[] = []
    let mouse = { x: -1e9, y: -1e9 }
    let hover: Node | null = null
    let raf = 0
    let last = performance.now()
    let spawnAcc = 0
    let sweep = 0
    let orbit = 0

    const buildNodes = () => {
      const { allowed } = propsRef.current
      nodes = PROTOCOLS.map((p, i) => {
        const isAllowed = allowed.includes(p.id)
        const angle = (-Math.PI / 2) + (i / PROTOCOLS.length) * Math.PI * 2
        const prev = nodes.find(n => n.id === p.id)
        return { id: p.id, label: p.label, short: p.short, allowed: isAllowed, angle, r: isAllowed ? R * 0.58 : R * 1.42, x: 0, y: 0, hot: prev?.hot ?? 0 }
      })
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = rect.width; h = rect.height
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = w / 2; cy = h / 2
      R = Math.min(w, h) * 0.28
      buildNodes()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const onMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top } }
    const onLeave = () => { mouse = { x: -1e9, y: -1e9 } }
    const onClick = () => { if (hover) propsRef.current.onSelect?.(hover.id) }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)

    // Accepts #rgb, #rrggbb and rgb()/rgba() — the CSS minifier shortens hex, and hairline tokens are rgba.
    const toRGB = (c: string): [number, number, number] => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (m) { const [r, g, b] = m[1].split(/[,\s/]+/).map(Number); return [r, g, b] }
      let h = c.replace('#', '')
      if (h.length === 3) h = h.split('').map(ch => ch + ch).join('')
      const n = parseInt(h, 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const rgba = (c: string, a: number) => { const [r, g, b] = toRGB(c); return `rgba(${r},${g},${b},${a})` }

    const frame = (now: number) => {
      const dt = Math.min(50, now - last); last = now
      const { trustScore, expiryFrac, authorized, ensName } = propsRef.current

      // keep nodes in sync with live scope
      const allowedKey = propsRef.current.allowed.join(',')
      if (nodes.map(n => n.allowed ? n.id : '').filter(Boolean).join(',') !== allowedKey) buildNodes()

      if (!reduced) { orbit += dt * 0.00004; sweep += dt * 0.0006 }
      for (const n of nodes) {
        const a = n.angle + orbit
        n.x = cx + Math.cos(a) * n.r; n.y = cy + Math.sin(a) * n.r
      }
      // hover
      hover = null
      let best = 22
      for (const n of nodes) { const d = Math.hypot(n.x - mouse.x, n.y - mouse.y); if (d < best) { best = d; hover = n } }
      canvas.style.cursor = hover ? 'pointer' : 'default'
      for (const n of nodes) n.hot += ((hover === n ? 1 : 0) - n.hot) * Math.min(1, dt / 120)

      // spawn attempts
      if (!reduced) {
        spawnAcc += dt
        if (spawnAcc > 1500 && nodes.length) {
          spawnAcc = 0
          const from = nodes[Math.floor(Math.random() * nodes.length)]
          particles.push({ from, t: 0, speed: 0.00035 + Math.random() * 0.00015, dead: false })
        }
      }

      ctx.clearRect(0, 0, w, h)

      // radar sweep
      if (!reduced) {
        const g = ctx.createConicGradient(sweep, cx, cy)
        g.addColorStop(0, rgba(col.seal, authorized ? 0.10 : 0.0))
        g.addColorStop(0.12, 'rgba(0,0,0,0)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()
      }

      // concentric guides
      ctx.strokeStyle = rgba(col.line, 0.6); ctx.lineWidth = 1
      for (const k of [0.58, 1.42]) { ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); ctx.stroke() }
      ctx.setLineDash([])

      // perimeter ring: base + remaining validity arc
      const ringCol = authorized ? col.seal : col.deny
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(ringCol, 0.18)
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.002)
      ctx.lineWidth = 3 + (trustScore / 100) * 3 + pulse
      ctx.strokeStyle = rgba(ringCol, 0.85)
      ctx.shadowColor = ringCol; ctx.shadowBlur = 18
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, expiryFrac)); ctx.stroke()
      ctx.shadowBlur = 0
      // ring tick marks
      ctx.strokeStyle = rgba(ringCol, 0.35); ctx.lineWidth = 1
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2; const len = i % 9 === 0 ? 10 : 5
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8)); ctx.lineTo(cx + Math.cos(a) * (R + 8 + len), cy + Math.sin(a) * (R + 8 + len)); ctx.stroke()
      }

      // links from allowed nodes to core (flowing)
      for (const n of nodes) {
        if (!n.allowed) continue
        ctx.setLineDash([4, 8]); ctx.lineDashOffset = reduced ? 0 : -now * 0.02
        ctx.strokeStyle = rgba(col.allow, 0.25 + n.hot * 0.4); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(cx, cy); ctx.stroke()
      }
      ctx.setLineDash([])
      // denied: short dashed vector aimed at ring, stopping outside
      for (const n of nodes) {
        if (n.allowed) continue
        const ang = Math.atan2(cy - n.y, cx - n.x)
        const ex = cx - Math.cos(ang) * (R + 14), ey = cy - Math.sin(ang) * (R + 14)
        ctx.setLineDash([3, 5]); ctx.strokeStyle = rgba(col.deny, 0.25 + n.hot * 0.4); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(ex, ey); ctx.stroke()
        ctx.setLineDash([])
        // stop bar
        ctx.strokeStyle = rgba(col.deny, 0.5 + n.hot * 0.5); ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(ex + Math.sin(ang) * 6, ey - Math.cos(ang) * 6); ctx.lineTo(ex - Math.sin(ang) * 6, ey + Math.cos(ang) * 6); ctx.stroke()
      }

      // particles
      for (const p of particles) {
        if (p.dead) continue
        p.t += dt * p.speed
        const x = p.from.x + (cx - p.from.x) * p.t, y = p.from.y + (cy - p.from.y) * p.t
        const dist = Math.hypot(x - cx, y - cy)
        const c = p.from.allowed ? col.allow : col.deny
        if (!p.from.allowed && dist <= R + 2) {
          p.dead = true
          ripples.push({ x, y, r: 4, life: 1, allowed: false })
          for (let i = 0; i < 14; i++) {
            const a = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5) * 2.2
            const s = 0.06 + Math.random() * 0.16
            sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, allowed: false })
          }
          continue
        }
        if (p.t >= 1) {
          p.dead = true
          ripples.push({ x: cx, y: cy, r: 6, life: 1, allowed: true })
          continue
        }
        // trail
        const tx = p.from.x + (cx - p.from.x) * Math.max(0, p.t - 0.08), ty = p.from.y + (cy - p.from.y) * Math.max(0, p.t - 0.08)
        const g = ctx.createLinearGradient(tx, ty, x, y); g.addColorStop(0, rgba(c, 0)); g.addColorStop(1, rgba(c, 0.9))
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke()
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      }
      for (let i = particles.length - 1; i >= 0; i--) if (particles[i].dead) particles.splice(i, 1)

      // sparks + ripples
      for (const s of sparks) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96; s.life -= dt / 600
        ctx.fillStyle = rgba(col.deny, Math.max(0, s.life)); ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill()
      }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1)
      for (const r of ripples) {
        r.r += dt * 0.06; r.life -= dt / 700
        ctx.strokeStyle = rgba(r.allowed ? col.allow : col.deny, Math.max(0, r.life) * 0.8); ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke()
      }
      for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].life <= 0) ripples.splice(i, 1)

      // nodes
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (const n of nodes) {
        const c = n.allowed ? col.allow : col.deny
        const rr = (n.allowed ? 5 : 4) + n.hot * 3
        ctx.shadowColor = c; ctx.shadowBlur = 12 + n.hot * 12
        ctx.fillStyle = n.allowed ? c : rgba(col.deny, 0.75)
        ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        if (!n.allowed) { ctx.strokeStyle = '#06070b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(n.x - 2, n.y - 2); ctx.lineTo(n.x + 2, n.y + 2); ctx.moveTo(n.x + 2, n.y - 2); ctx.lineTo(n.x - 2, n.y + 2); ctx.stroke() }
        // label
        const outward = n.allowed ? -1 : 1
        const lx = n.x + Math.cos(n.angle + orbit) * outward * 0, ly = n.y + (n.allowed ? 14 : 15) + n.hot * 2
        ctx.font = `${n.allowed ? 600 : 500} ${10.5 + n.hot * 1.5}px ${sansFam}`
        ctx.fillStyle = n.allowed ? rgba(col.text, 0.85 + n.hot * 0.15) : rgba(col.text3, 0.9 + n.hot * 0.1)
        ctx.fillText(n.hot > 0.5 ? n.label : n.short, lx, ly)
        if (n.hot > 0.5) {
          ctx.font = `500 9px ${monoFam}`; ctx.fillStyle = rgba(c, 0.9)
          ctx.fillText(n.allowed ? 'IN SCOPE · click to simulate' : 'OUT OF SCOPE · click to simulate', lx, ly + 13)
        }
      }

      // core
      const coreCol = authorized ? col.seal : col.deny
      const halo = 14 + pulse * 6
      const g2 = ctx.createRadialGradient(cx, cy, 2, cx, cy, halo * 2.2)
      g2.addColorStop(0, rgba(coreCol, 0.45)); g2.addColorStop(1, rgba(coreCol, 0))
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, halo * 2.2, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = coreCol; ctx.shadowBlur = 24; ctx.fillStyle = coreCol
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      ctx.fillStyle = '#06070b'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill()
      ctx.font = `600 11px ${monoFam}`; ctx.fillStyle = rgba(col.text, 0.9)
      ctx.fillText(ensName, cx, cy + 24)
      ctx.font = `500 9.5px ${monoFam}`; ctx.fillStyle = rgba(coreCol, 0.9)
      ctx.fillText(authorized ? `TRUST ${trustScore.toFixed(0)} · AUTHORIZED` : 'AUTHORITY REVOKED', cx, cy + 38)

      if (!reduced) raf = requestAnimationFrame(frame)
    }
    if (reduced) frame(performance.now()) // one still frame, painted synchronously
    else raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); canvas.removeEventListener('click', onClick)
    }
  }, [])

  return <canvas ref={ref} className={`absolute inset-0 block h-full w-full ${className}`} aria-label="Authority perimeter map" role="img" />
}
