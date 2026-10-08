import type { AircraftData } from '@/lib/aircraft'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { formatSpec, specLabel, specValue, SPEC_ICON, type NumParts } from '@/lib/aircraftFormat'

// Sensible lead specs when an editor has not picked any headline specs.
const FALLBACK_HEADLINES: AircraftSpecField[] = ['rangeNm', 'maxPassengers', 'cruiseSpeedMach', 'cabinLengthM']

/** Plain, serializable data for one headline stat (safe to pass to a client component). */
export interface ResolvedHeadline {
  field: AircraftSpecField
  label: string
  icon: string
  primary: string
  primaryParts?: NumParts
  secondary?: string
  secondaryParts?: NumParts
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
    const f = formatSpec(p.specField, specValue(aircraft, p.specField), locale, 'both')
    if (!f) continue
    out.push({
      field:          p.specField,
      label:          p.rowLabel || specLabel(p.specField, locale),
      icon:           SPEC_ICON[p.specField],
      primary:        f.primary,
      primaryParts:   f.primaryParts,
      secondary:      f.secondary,
      secondaryParts: f.secondaryParts,
    })
  }
  return out
}
