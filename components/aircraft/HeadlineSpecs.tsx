import type { AircraftData } from '@/lib/aircraft'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { formatSpec, specLabel, specValue } from '@/lib/aircraftFormat'

// Sensible lead specs when an editor has not picked any headline specs.
const FALLBACK_HEADLINES: AircraftSpecField[] = ['rangeNm', 'maxPassengers', 'cruiseSpeedMach', 'cabinLengthM']

export interface ResolvedHeadline {
  field: AircraftSpecField
  label: string
  primary: string
  secondary?: string
}

/**
 * Resolves the header stats FROM THE RECORD. The editor picks which spec to
 * lead with and (optionally) a localized label; the number always comes from
 * the stored value, so it can never drift from the spec panel or the listing.
 */
export function resolveHeadlines(aircraft: AircraftData, locale: string): ResolvedHeadline[] {
  const picks = aircraft.headlineSpecs.length
    ? aircraft.headlineSpecs.slice(0, 4)
    : FALLBACK_HEADLINES.map(f => ({ specField: f, rowLabel: undefined }))

  const out: ResolvedHeadline[] = []
  for (const p of picks) {
    const formatted = formatSpec(p.specField, specValue(aircraft, p.specField), locale, 'both')
    if (!formatted) continue
    out.push({
      field:     p.specField,
      label:     p.rowLabel || specLabel(p.specField, locale),
      primary:   formatted.primary,
      secondary: formatted.secondary,
    })
  }
  return out
}

/** The stat strip: tabular mono values over small caps labels. */
export default function HeadlineSpecs({ items, tone = 'brand' }: { items: ResolvedHeadline[]; tone?: 'brand' | 'canvas' }) {
  if (!items.length) return null
  const wrap = tone === 'brand' ? 'bg-brand text-fg-on-brand' : 'bg-canvas text-fg border-t border-fg/15'
  return (
    <div className={wrap}>
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-md gap-y-lg px-md py-lg lg:grid-cols-4 lg:px-xl">
        {items.map(item => (
          <div key={item.field} className="min-w-0">
            <dt className="text-pretty text-[0.75rem] font-semibold uppercase leading-snug tracking-[0.08em] opacity-80">
              {item.label}
            </dt>
            <dd className="mt-xs">
              <span className="block font-mono text-[clamp(1.5rem,3.2vw,2.25rem)] font-medium leading-none tracking-tight tabular-nums">
                {item.primary}
              </span>
              {item.secondary && (
                <span className="mt-xs block font-mono text-sm tabular-nums opacity-75">{item.secondary}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
