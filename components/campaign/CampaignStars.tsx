'use client'

import { useEffect, useRef } from 'react'

type Star = { x: number; y: number; r: number; v: number; a: number; warm: boolean }

const DENSITY = 1 / 30000      // stars per px² of the band
const MAX_STARS = 40

/**
 * A sparse field of stars drifting slowly sideways, like a night sky at altitude.
 * Deliberately quiet: tiny dots, no twinkle, parallax by size (smaller = dimmer and
 * slower). One small canvas per band; it stops drawing when off-screen or the tab
 * is hidden, and under prefers-reduced-motion it paints a single static frame.
 * Colors come from the theme (--ot-fg / --ot-accent), never hard-coded.
 */
export default function CampaignStars({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Static single frame for visitors who prefer reduced motion and for the editor's Still setting.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !!canvas.closest('[data-motion="still"]')
    const css = getComputedStyle(canvas)
    const fg = css.getPropertyValue('--ot-fg').trim() || '#fdfbf3'
    const accent = css.getPropertyValue('--ot-accent').trim() || '#c7b289'

    let w = 0, h = 0, raf = 0, last = 0, visible = true
    let stars: Star[] = []

    const seed = () => {
      const n = Math.min(MAX_STARS, Math.round(w * h * DENSITY))
      stars = Array.from({ length: n }, () => {
        const r = 0.5 + Math.random() * 1.1
        return { x: Math.random() * w, y: Math.random() * h, r, v: 3 + r * 7, a: 0.22 + r * 0.3, warm: Math.random() < 0.4 }
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        ctx.globalAlpha = s.a
        ctx.fillStyle = s.warm ? accent : fg
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      draw()
    }

    const tick = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
      last = now
      for (const s of stars) {
        s.x += s.v * dt
        if (s.x > w + 2) { s.x = -2; s.y = Math.random() * h }
      }
      draw()
      raf = requestAnimationFrame(tick)
    }

    const start = () => { if (!reduce && !raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(tick) } }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start() }, { threshold: 0 })
    io.observe(canvas)
    document.addEventListener('visibilitychange', start)
    start()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={className} />
}
