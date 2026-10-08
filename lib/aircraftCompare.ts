import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { AIRCRAFT_SPEC_FIELDS } from '@/cms/content-types/_shared/aircraftSpecs'
import type { AircraftData } from '@/lib/aircraft'
import { specValue } from '@/lib/aircraftFormat'

/** Rows shown on the visitor-built /aircraft/compare page, in order, with group dividers. */
export const DEFAULT_COMPARE_ROWS: { field: AircraftSpecField; group?: 'performance' | 'cabin' | 'exterior' | 'powerplant' }[] = [
  { field: 'rangeNm', group: 'performance' },
  { field: 'cruiseSpeedMach' },
  { field: 'maxOperatingMach' },
  { field: 'maxAltitudeFt' },
  { field: 'takeoffDistanceFt' },
  { field: 'landingDistanceFt' },
  { field: 'maxPassengers', group: 'cabin' },
  { field: 'typicalPassengers' },
  { field: 'livingSpaces' },
  { field: 'cabinLengthM' },
  { field: 'cabinWidthM' },
  { field: 'cabinHeightM' },
  { field: 'baggageVolumeM3' },
  { field: 'overallLengthM', group: 'exterior' },
  { field: 'wingspanM' },
  { field: 'overallHeightM' },
  { field: 'thrustLbf', group: 'powerplant' },
]

/**
 * Which direction is "leading" for a numeric row. Shorter takeoff/landing wins;
 * crew and the exterior dimensions have no better direction, so they are never
 * highlighted.
 */
const LEADING: Partial<Record<AircraftSpecField, 'high' | 'low'>> = {
  rangeNm: 'high', cruiseSpeedMach: 'high', maxOperatingMach: 'high', maxAltitudeFt: 'high',
  takeoffDistanceFt: 'low', landingDistanceFt: 'low',
  maxPassengers: 'high', typicalPassengers: 'high', livingSpaces: 'high',
  cabinLengthM: 'high', cabinWidthM: 'high', cabinHeightM: 'high', baggageVolumeM3: 'high',
  thrustLbf: 'high',
}

/** Indices (within `values`) holding the leading value; empty when no winner or all tie. */
export function leadingIndices(field: AircraftSpecField, values: (number | null)[]): number[] {
  const dir = LEADING[field]
  if (!dir) return []
  const present = values.filter((v): v is number => v != null)
  if (present.length < 2) return []
  const best = dir === 'high' ? Math.max(...present) : Math.min(...present)
  if (present.every(v => v === best)) return []
  return values.map((v, i) => (v === best ? i : -1)).filter(i => i >= 0)
}

/** Serializable column for the comparison table (no functions, safe for a client component). */
export interface CompareColumn {
  key: string
  modelName: string
  family?: string
  tagline?: string
  heroImageUrl?: string
  url?: string
  values: Partial<Record<AircraftSpecField, number>>
}

export function toCompareColumn(a: AircraftData): CompareColumn {
  const values: Partial<Record<AircraftSpecField, number>> = {}
  for (const f of AIRCRAFT_SPEC_FIELDS) {
    const v = specValue(a, f.value)
    if (v != null) values[f.value] = v
  }
  return { key: a.key, modelName: a.modelName, family: a.family, tagline: a.tagline, heroImageUrl: a.heroImageUrl, url: a.url, values }
}

/** Parses `?ids=a,b,c` into unique, hyphen-free, lower-case keys, capped at 4. */
export function parseCompareIds(raw: string | string[] | undefined): string[] {
  const s = Array.isArray(raw) ? raw.join(',') : (raw ?? '')
  const out: string[] = []
  for (const part of s.split(',')) {
    const k = part.trim().replace(/-/g, '').toLowerCase()
    if (/^[0-9a-f]{32}$/.test(k) && !out.includes(k)) out.push(k)
  }
  return out.slice(0, 4)
}
