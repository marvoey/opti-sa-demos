'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useFleetReturn } from '@/lib/aircraftNav'

type Props = {
  homeHref: string
  fleetHref: string
  labels: { nav: string; home: string; fleet: string }
  /** The current page, rendered last and not linked. */
  current: string
  /** Light text for placement over a dark surface. */
  className?: string
  /** Container width class; match the content below. */
  widthClass?: string
}

/**
 * Home / Fleet / current. "Fleet" links to the visitor's last fleet view, filters
 * and compare selection included, so a detour into a model or comparison is never
 * a dead end.
 */
export default function AircraftBreadcrumb({ homeHref, fleetHref, labels, current, className = '', widthClass = 'max-w-6xl' }: Props) {
  const fleet = useFleetReturn(fleetHref)
  const link = 'rounded-ot-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
  return (
    <nav aria-label={labels.nav} className={`bg-canvas text-fg ${className}`}>
      <ol className={`mx-auto flex ${widthClass} flex-wrap items-center gap-x-xs gap-y-1 px-md py-md text-sm lg:px-xl`}>
        <li><Link href={homeHref} className={`${link} text-fg/75`}>{labels.home}</Link></li>
        <li aria-hidden className="text-fg/40"><ChevronRight className="size-4" /></li>
        <li><Link href={fleet} className={`${link} text-fg/75`}>{labels.fleet}</Link></li>
        <li aria-hidden className="text-fg/40"><ChevronRight className="size-4" /></li>
        <li aria-current="page" className="font-semibold">{current}</li>
      </ol>
    </nav>
  )
}
