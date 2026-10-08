'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useFleetReturn } from '@/lib/aircraftNav'

/** Returns to the visitor's last fleet view (filters, view and selection intact). */
export default function BackToFleetLink({ fleetHref, children }: { fleetHref: string; children: React.ReactNode }) {
  const href = useFleetReturn(fleetHref)
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-xs border border-fg px-md text-sm font-semibold transition-colors duration-150 hover:bg-fg hover:text-canvas rounded-ot-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <ArrowLeft aria-hidden className="size-4" />{children}
    </Link>
  )
}
