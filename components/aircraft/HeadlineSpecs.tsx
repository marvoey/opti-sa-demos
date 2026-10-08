'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Armchair, Flame, Gauge, Globe, Luggage, MoveHorizontal, MoveVertical, Mountain,
  PlaneLanding, PlaneTakeoff, Ruler, Sofa, UserRound, Users, type LucideIcon,
} from 'lucide-react'
import { renderParts } from '@/lib/aircraftFormat'
import type { ResolvedHeadline } from './headlineData'

const ICONS: Record<string, LucideIcon> = {
  Armchair, Flame, Gauge, Globe, Luggage, MoveHorizontal, MoveVertical, Mountain,
  PlaneLanding, PlaneTakeoff, Ruler, Sofa, UserRound, Users,
}

const DURATION_MS = 1400
// ease-out-quart: fast start, long settle. No bounce.
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

/**
 * Drives a 0 → 1 progress for the whole strip once it scrolls into view.
 * Server render and no-JS show the FINAL values (progress starts at 1); the
 * effect only rewinds to 0 when motion is allowed. Reduced-motion visitors
 * never see an animation. Reads matchMedia directly (not a hook) so there is no
 * first-render window where the animation could start for them.
 */
/** Runs the 0 -> 1 ease-out and reports each frame. Returns a cancel function. */
function runCountUp(onFrame: (p: number) => void): () => void {
  let raf = 0
  const t0 = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / DURATION_MS)
    onFrame(easeOutQuart(t))
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  onFrame(0)
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

function useCountUp(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancel: (() => void) | undefined
    const io = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return
        io.disconnect()
        cancel = runCountUp(setProgress)
      },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => { io.disconnect(); cancel?.() }
  }, [ref])

  return progress
}

/**
 * The stat strip under the hero: a thin-line icon, a small-caps label, the value
 * in tabular mono, and the converted unit beneath. Values count up from zero when
 * the strip first enters the viewport; icons render in the theme accent.
 */
export default function HeadlineSpecs({ items, locale }: { items: ResolvedHeadline[]; locale: string }) {
  const ref = useRef<HTMLDListElement>(null)
  const p = useCountUp(ref)
  if (!items.length) return null

  return (
    <div className="bg-brand text-fg-on-brand">
      <dl ref={ref} className="mx-auto grid max-w-6xl grid-cols-2 gap-x-md gap-y-lg px-md py-lg lg:grid-cols-4 lg:px-xl">
        {items.map(item => {
          const Icon = ICONS[item.icon]
          return (
            <div key={item.field} className="flex min-w-0 items-center gap-sm">
              {Icon && <Icon aria-hidden strokeWidth={1.1} className="size-9 shrink-0 text-accent sm:size-11" />}
              <div className="min-w-0">
                <dt className="text-pretty text-[0.7rem] font-semibold uppercase leading-snug tracking-[0.08em] opacity-80">
                  {item.label}
                </dt>
                <dd className="mt-1">
                  <span className="block font-mono text-[clamp(1.25rem,2.6vw,2rem)] font-medium leading-none tracking-tight tabular-nums">
                    {item.primaryParts ? renderParts(item.primaryParts, locale, p) : item.primary}
                  </span>
                  {item.secondary && (
                    <span className="mt-1 block font-mono text-sm tabular-nums opacity-75">
                      {item.secondaryParts ? renderParts(item.secondaryParts, locale, p) : item.secondary}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
