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
    useGrouping: 'always',
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
    overallLengthM: 'Length',
    wingspanM: 'Wingspan',
    overallHeightM: 'Height',
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
    overallLengthM: 'Longueur',
    wingspanM: 'Envergure',
    overallHeightM: 'Hauteur',
  },
  es: {
    rangeNm: 'Alcance',
    cruiseSpeedMach: 'Crucero de alta velocidad',
    maxOperatingMach: 'Velocidad máxima de operación (Mmo)',
    maxAltitudeFt: 'Altitud máxima',
    takeoffDistanceFt: 'Distancia de despegue',
    landingDistanceFt: 'Distancia de aterrizaje',
    maxPassengers: 'Pasajeros (máx.)',
    typicalPassengers: 'Configuración típica',
    crewCount: 'Tripulación',
    livingSpaces: 'Espacios habitables',
    cabinLengthM: 'Longitud de la cabina',
    cabinWidthM: 'Ancho de la cabina',
    cabinHeightM: 'Altura de la cabina',
    baggageVolumeM3: 'Volumen de equipaje',
    thrustLbf: 'Empuje por motor',
    overallLengthM: 'Longitud',
    wingspanM: 'Envergadura',
    overallHeightM: 'Altura',
  },
}

export function specLabel(field: AircraftSpecField, locale: string): string {
  const localized = SPEC_LABELS[locale]?.[field] ?? SPEC_LABELS.en?.[field]
  if (localized) return localized
  return AIRCRAFT_SPEC_FIELDS.find(f => f.value === field)?.displayName ?? field
}

export const SPEC_GROUPS: { id: 'performance' | 'cabin' | 'exterior' | 'powerplant'; fields: AircraftSpecField[] }[] = [
  { id: 'performance', fields: ['rangeNm', 'cruiseSpeedMach', 'maxOperatingMach', 'maxAltitudeFt', 'takeoffDistanceFt', 'landingDistanceFt'] },
  { id: 'cabin',       fields: ['maxPassengers', 'typicalPassengers', 'crewCount', 'livingSpaces', 'cabinLengthM', 'cabinWidthM', 'cabinHeightM', 'baggageVolumeM3'] },
  { id: 'exterior',    fields: ['overallLengthM', 'wingspanM', 'overallHeightM'] },
  { id: 'powerplant',  fields: ['thrustLbf'] },
]

/** Icon (lucide name) per spec, resolved to a component in the client. */
export const SPEC_ICON: Record<AircraftSpecField, string> = {
  rangeNm: 'Globe',
  cruiseSpeedMach: 'Gauge',
  maxOperatingMach: 'Gauge',
  maxAltitudeFt: 'Mountain',
  takeoffDistanceFt: 'PlaneTakeoff',
  landingDistanceFt: 'PlaneLanding',
  maxPassengers: 'Users',
  typicalPassengers: 'Armchair',
  crewCount: 'UserRound',
  livingSpaces: 'Sofa',
  cabinLengthM: 'Ruler',
  cabinWidthM: 'MoveHorizontal',
  cabinHeightM: 'MoveVertical',
  baggageVolumeM3: 'Luggage',
  overallLengthM: 'Ruler',
  wingspanM: 'MoveHorizontal',
  overallHeightM: 'MoveVertical',
  thrustLbf: 'Flame',
}

export type SpecUnit = 'metric' | 'imperial'

/** English reads imperial first; every other locale defaults to metric. */
export function defaultUnitSystem(locale: string): SpecUnit {
  return locale === 'en' ? 'imperial' : 'metric'
}

/**
 * The numeric part of a rendered value, kept separate so the stat strip can
 * count it up from zero. `text` is always the final, fully formatted string.
 */
export interface NumParts {
  value: number
  minFrac: number
  maxFrac: number
  prefix: string
  suffix: string
}

export function renderParts(parts: NumParts, locale: string, progress = 1): string {
  const v = parts.value * progress
  return `${parts.prefix}${new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: parts.minFrac,
    maximumFractionDigits: parts.maxFrac,
    useGrouping: 'always',
  }).format(v)}${parts.suffix}`
}

export interface FormattedValue {
  text: string
  /** Absent for composites like `54 ft 5 in`, which render static. */
  parts?: NumParts
}

export interface FormattedSpec {
  /** Primary rendering, e.g. `7,700 nm` */
  primary: string
  primaryParts?: NumParts
  /** Converted rendering, e.g. `14,260 km`. */
  secondary?: string
  secondaryParts?: NumParts
  /** Single line for contexts with one text slot: `7,700 nm (14,260 km)` */
  text: string
}

const MACH_KMH = 1062.2   // 1 Mach at the ISA tropopause, in km/h
const MACH_MPH = 660.0    // same, in mph

function val(locale: string, value: number, minFrac: number, maxFrac: number, prefix: string, suffix: string): FormattedValue {
  const parts: NumParts = { value, minFrac, maxFrac, prefix, suffix }
  return { text: renderParts(parts, locale), parts }
}

const METRE_FIELDS: AircraftSpecField[] = ['cabinLengthM', 'cabinWidthM', 'cabinHeightM', 'overallLengthM', 'wingspanM', 'overallHeightM']

/**
 * Formats one stored spec value. Specs are stored in ONE unit; this converts at
 * render time and never persists a converted value.
 *
 * `unitSystem`:
 *  - 'metric' / 'imperial': one unit (the visitor's toggle).
 *  - 'both': the lead unit with the other as `secondary` (the stat strip).
 * Mach rows always lead with Mach and carry the equivalent speed as secondary
 * (km/h for metric and both, mph for imperial).
 */
export function formatSpec(
  field: AircraftSpecField,
  value: number | null | undefined,
  locale: string,
  unitSystem: SpecUnit | 'both' = 'both',
): FormattedSpec | null {
  if (value == null || Number.isNaN(value)) return null

  const single = (v: FormattedValue): FormattedSpec => ({ primary: v.text, primaryParts: v.parts, text: v.text })

  if (field === 'cruiseSpeedMach' || field === 'maxOperatingMach') {
    const mach = val(locale, value, 2, 3, 'Mach ', '')
    const speed = unitSystem === 'imperial'
      ? val(locale, Math.round(value * MACH_MPH), 0, 0, '', ' mph')
      : val(locale, Math.round(value * MACH_KMH), 0, 0, '', ' km/h')
    return { primary: mach.text, primaryParts: mach.parts, secondary: speed.text, secondaryParts: speed.parts, text: `${mach.text} (${speed.text})` }
  }

  let imperial: FormattedValue
  let metric: FormattedValue | undefined
  let metricLeads = false

  if (field === 'rangeNm') {
    imperial = val(locale, value, 0, 0, '', ' nm')
    metric   = val(locale, Math.round(value * 1.852), 0, 0, '', ' km')
  } else if (field === 'maxAltitudeFt' || field === 'takeoffDistanceFt' || field === 'landingDistanceFt') {
    imperial = val(locale, value, 0, 0, '', ' ft')
    metric   = val(locale, Math.round(value * 0.3048), 0, 0, '', ' m')
  } else if (METRE_FIELDS.includes(field)) {
    metricLeads = true
    metric   = val(locale, value, 2, 2, '', ' m')
    imperial = { text: feetInches(value, locale) }
  } else if (field === 'baggageVolumeM3') {
    metricLeads = true
    metric   = val(locale, value, 2, 2, '', ' m³')
    imperial = val(locale, Math.round(value * 35.3147), 0, 0, '', ' ft³')
  } else if (field === 'thrustLbf') {
    imperial = val(locale, value, 0, 0, '', ' lbf')
    metric   = val(locale, Math.round(value * 4.44822 / 100) / 10, 1, 1, '', ' kN')
  } else {
    // Counts (passengers, crew, living spaces): no unit, no conversion.
    return single(val(locale, value, 0, 0, '', ''))
  }

  if (!metric) return single(imperial)
  if (unitSystem === 'metric')   return single(metric)
  if (unitSystem === 'imperial') return single(imperial)

  const [lead, trail] = metricLeads ? [metric, imperial] : [imperial, metric]
  return {
    primary: lead.text, primaryParts: lead.parts,
    secondary: trail.text, secondaryParts: trail.parts,
    text: `${lead.text} (${trail.text})`,
  }
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
  es: { announced: 'Anunciado', inProduction: 'En producción', inService: 'En servicio', legacy: 'Heredado' },
}
