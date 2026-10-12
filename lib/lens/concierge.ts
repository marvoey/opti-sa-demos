import type { AircraftData } from '@/lib/aircraft'
import { AIRCRAFT_SPEC_FIELDS, type AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { formatSpec, specLabel, specValue } from '@/lib/aircraftFormat'
import { DEFAULT_COMPARE_ROWS, leadingIndices } from '@/lib/aircraftCompare'

/** `dam` when the URL is served by Optimizely DAM (Content Marketing Platform), else the CMS media library. */
function assetSource(url: string): 'dam' | 'cms' {
  return /cmp\.optimizely\.com|\/dam\/|dam\./i.test(url) ? 'dam' : 'cms'
}

const asset = (role: string, url?: string) => (url ? { role, url, source: assetSource(url) } : null)

const UNIT: Partial<Record<AircraftSpecField, string>> = {
  rangeNm: 'nmi', maxAltitudeFt: 'ft', takeoffDistanceFt: 'ft', landingDistanceFt: 'ft',
  cabinLengthM: 'm', cabinWidthM: 'm', cabinHeightM: 'm', overallLengthM: 'm', wingspanM: 'm', overallHeightM: 'm',
  baggageVolumeM3: 'm3', thrustLbf: 'lbf', cruiseSpeedMach: 'Mach', maxOperatingMach: 'Mach',
}

const MEDIA_ROLES = (a: AircraftData) => [
  asset('hero', a.heroImageUrl),
  ...a.galleryUrls.map(u => asset('gallery', u)),
  asset('diagram-front', a.diagramFrontUrl),
  asset('diagram-side', a.diagramSideUrl),
  asset('feature-video', a.featureVideoUrl),
  asset('spec-sheet', a.specSheetUrl),
].filter((m): m is NonNullable<typeof m> => !!m)

/**
 * The component-level contract a downstream consumer (the Azure concierge) can
 * render directly: spec cards, language-neutral numeric specs with units, and
 * typed asset references. Built from the same AircraftData the page binds to.
 */
export function toAircraftContract(a: AircraftData, locale: string) {
  return {
    schema: 'bombardier.aircraft.v1',
    id: a.key,
    locale: a.locale,
    localeFallback: a.isFallback,
    name: a.modelName,
    family: a.family,
    lifecycle: a.lifecycleStatus,
    tagline: a.tagline,
    pageUrl: a.url,
    specCards: a.headlineSpecs.map(h => {
      const v = specValue(a, h.specField)
      return {
        field: h.specField,
        label: h.rowLabel ?? specLabel(h.specField, locale),
        value: v,
        unit: UNIT[h.specField] ?? null,
        display: formatSpec(h.specField, v, locale, 'both')?.text ?? null,
      }
    }),
    specs: Object.fromEntries(
      AIRCRAFT_SPEC_FIELDS.map(f => [f.value, specValue(a, f.value)]).filter(([, v]) => v != null),
    ),
    media: MEDIA_ROLES(a),
    relatedIds: a.relatedKeys,
  }
}

export function toComparisonContract(list: AircraftData[], locale: string) {
  return {
    schema: 'bombardier.comparison.v1',
    locale,
    models: list.map(a => ({ id: a.key, name: a.modelName })),
    rows: DEFAULT_COMPARE_ROWS.map(r => {
      const values = list.map(a => specValue(a, r.field))
      const lead = leadingIndices(r.field, values)
      return {
        field: r.field,
        label: specLabel(r.field, locale),
        unit: UNIT[r.field] ?? null,
        values,
        leader: lead.length ? lead.map(i => list[i].key) : null,
      }
    }),
  }
}
