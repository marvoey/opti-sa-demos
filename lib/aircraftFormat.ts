import { AIRCRAFT_SPEC_FIELDS, type AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'

// ─── Aircraft spec formatting ─────────────────────────────────────────────────
// Store once, render contextually. Specs are stored in ONE unit (nm, ft, m) and
// converted here at render time; a converted value is never persisted, so the
// English and French pages can never disagree. Number formatting follows the
// visitor's locale: fr uses fr-CA (non-breaking space thousands separator,
// comma decimal), per the Bill 96 brief.

export type SpecUnitSystem = 'metric' | 'imperial' | 'both'

const INTL_LOCALE: Record<string, string> = { en: 'en-GB', fr: 'fr-CA', es: 'es', de: 'de' }
const intlLocale = (locale: string) => INTL_LOCALE[locale] ?? 'en-CA'

const num = (locale: string, value: number, digits = 0, maxDigits = digits) =>
  new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: maxDigits,
  }).format(value)

/** 54.43 ft → `54 ft 5 in` */
function feetInches(m: number, locale: string): string {
  const totalIn = Math.round((m / 0.0254))
  const ft = Math.floor(totalIn / 12)
  const inch = totalIn - ft * 12
  return `${num(locale, ft)} ft ${num(locale, inch)} in`
}

// Visible labels for each spec key. English is the fallback for any locale not
// listed; a row's own localized Row Label always wins over these.
const SPEC_LABELS: Record<string, Partial<Record<AircraftSpecField, string>>> = {
  // Unit-free labels: the formatted value already carries its unit, so
  // "Range (nm) | 7,700 nm" would say it twice.
  en: {
    rangeNm: 'Range',
    cruiseSpeedMach: 'High-speed cruise',
    maxOperatingMach: 'Max operating speed (Mmo)',
    maxAltitudeFt: 'Maximum altitude',
    takeoffDistanceFt: 'Takeoff distance',
    landingDistanceFt: 'Landing distance',
    maxPassengers: 'Maximum passengers',
    typicalPassengers: 'Typical configuration',
    crewCount: 'Crew',
    livingSpaces: 'Living spaces',
    cabinLengthM: 'Cabin length',
    cabinWidthM: 'Cabin width',
    cabinHeightM: 'Cabin height',
    baggageVolumeM3: 'Baggage volume',
    thrustLbf: 'Thrust per engine',
  },
  fr: {
    rangeNm: 'Portée',
    cruiseSpeedMach: 'Croisière à haute vitesse',
    maxOperatingMach: 'Vitesse maximale d’exploitation',
    maxAltitudeFt: 'Altitude maximale',
    takeoffDistanceFt: 'Distance de décollage',
    landingDistanceFt: 'Distance d’atterrissage',
    maxPassengers: 'Passagers (max.)',
    typicalPassengers: 'Configuration type',
    crewCount: 'Équipage',
    livingSpaces: 'Espaces de vie',
    cabinLengthM: 'Longueur de la cabine',
    cabinWidthM: 'Largeur de la cabine',
    cabinHeightM: 'Hauteur de la cabine',
    baggageVolumeM3: 'Volume des bagages',
    thrustLbf: 'Poussée par moteur',
  },
}

export function specLabel(field: AircraftSpecField, locale: string): string {
  const localized = SPEC_LABELS[locale]?.[field] ?? SPEC_LABELS.en?.[field]
  if (localized) return localized
  return AIRCRAFT_SPEC_FIELDS.find(f => f.value === field)?.displayName ?? field
}

export const SPEC_GROUPS: { id: 'performance' | 'cabin' | 'powerplant'; fields: AircraftSpecField[] }[] = [
  { id: 'performance', fields: ['rangeNm', 'cruiseSpeedMach', 'maxOperatingMach', 'maxAltitudeFt', 'takeoffDistanceFt', 'landingDistanceFt'] },
  { id: 'cabin',       fields: ['maxPassengers', 'typicalPassengers', 'crewCount', 'livingSpaces', 'cabinLengthM', 'cabinWidthM', 'cabinHeightM', 'baggageVolumeM3'] },
  { id: 'powerplant',  fields: ['thrustLbf'] },
]

export const SPEC_GROUP_LABELS: Record<string, Record<'performance' | 'cabin' | 'powerplant', string>> = {
  en: { performance: 'Performance', cabin: 'Cabin', powerplant: 'Powerplant' },
  fr: { performance: 'Performance', cabin: 'Cabine', powerplant: 'Groupe motopropulseur' },
}

export interface FormattedSpec {
  /** Primary rendering, e.g. `7,700 nm` */
  primary: string
  /** Converted rendering, e.g. `14,260 km`. Present when unitSystem needs it. */
  secondary?: string
  /** Single line for contexts with one text slot: `7,700 nm (14,260 km)` */
  text: string
}

/**
 * Formats one stored spec value. `unitSystem` decides which unit leads:
 * metric → km / m, imperial → nm / ft, both → imperial lead with metric in
 * parentheses (the format the brief shows for range and altitude).
 */
export function formatSpec(
  field: AircraftSpecField,
  value: number | null | undefined,
  locale: string,
  unitSystem: SpecUnitSystem = 'both',
): FormattedSpec | null {
  if (value == null || Number.isNaN(value)) return null

  let imperial: string
  let metric: string | undefined

  switch (field) {
    case 'rangeNm':
      imperial = `${num(locale, value)} nm`
      metric   = `${num(locale, Math.round(value * 1.852))} km`
      break
    case 'maxAltitudeFt':
      imperial = `${num(locale, value)} ft`
      metric   = `${num(locale, Math.round(value * 0.3048))} m`
      break
    case 'takeoffDistanceFt':
    case 'landingDistanceFt':
      imperial = `${num(locale, value)} ft`
      metric   = `${num(locale, Math.round(value * 0.3048))} m`
      break
    case 'cabinLengthM':
    case 'cabinWidthM':
    case 'cabinHeightM':
      metric   = `${num(locale, value, 2)} m`
      imperial = feetInches(value, locale)
      break
    case 'baggageVolumeM3':
      metric   = `${num(locale, value, 2)} m³`
      imperial = `${num(locale, value * 35.3147, 0)} ft³`
      break
    case 'cruiseSpeedMach':
    case 'maxOperatingMach':
      imperial = `Mach ${num(locale, value, 2, 3)}`
      break
    case 'thrustLbf':
      imperial = `${num(locale, value)} lbf`
      metric   = `${num(locale, Math.round(value * 4.44822 / 1000 * 10) / 10, 1)} kN`
      break
    default:
      imperial = num(locale, value)
  }

  // Metric-native fields (cabin) lead with metric; imperial-native (range, ft)
  // lead with imperial under `both`. `metric` / `imperial` flip for explicit picks.
  const metricNative = field === 'cabinLengthM' || field === 'cabinWidthM' || field === 'cabinHeightM' || field === 'baggageVolumeM3'
  if (!metric) return { primary: imperial, text: imperial }

  if (unitSystem === 'metric')   return { primary: metric,   text: metric }
  if (unitSystem === 'imperial') return { primary: imperial, text: imperial }

  const [lead, trail] = metricNative ? [metric, imperial] : [imperial, metric]
  return { primary: lead, secondary: trail, text: `${lead} (${trail})` }
}

/** Raw numeric value of a spec key on a record, or null. */
export function specValue(aircraft: object, field: AircraftSpecField): number | null {
  const v = (aircraft as Record<string, unknown>)[field]
  return typeof v === 'number' ? v : null
}

/** Locale-aware long date, e.g. `18 September 2018` / `18 septembre 2018`. */
export function formatCertDate(iso: string | undefined, locale: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

export const FAMILY_LABELS: Record<string, string> = { learjet: 'Learjet', challenger: 'Challenger', global: 'Global' }

export const LIFECYCLE_LABELS: Record<string, Record<string, string>> = {
  en: { announced: 'Announced', inProduction: 'In production', inService: 'In service', legacy: 'Legacy' },
  fr: { announced: 'Annoncé', inProduction: 'En production', inService: 'En service', legacy: 'Héritage' },
}
