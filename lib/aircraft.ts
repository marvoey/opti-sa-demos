import { cache } from 'react'
import { getClient } from '@/lib/optimizely'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AircraftFamily = 'learjet' | 'challenger' | 'global'
export type AircraftLifecycle = 'announced' | 'inProduction' | 'inService' | 'legacy'

export interface AircraftSpecPointer {
  specField: AircraftSpecField
  rowLabel?: string
  groupHeader?: string
}

export interface AircraftFeature {
  headline: string
  bodyHtml?: string
}

/**
 * Flat shape consumed by the aircraft header, spec panel, listing cards, and
 * comparison table. Resolved from OT_AircraftProfile. Every numeric spec is
 * language-neutral (one stored value); only tagline / overview / features /
 * specSheet vary by locale.
 *
 * `isFallback` is true when the requested locale had no published version and
 * the English record was served instead. The renderer MUST show a visible
 * language notice in that case (Bill 96): never a silent English fallback.
 */
export interface AircraftData {
  key: string
  locale: string
  isFallback: boolean
  modelName: string
  family?: AircraftFamily
  lifecycleStatus?: AircraftLifecycle
  tagline?: string
  overviewHtml?: string
  rangeNm?: number
  cruiseSpeedMach?: number
  maxOperatingMach?: number
  maxAltitudeFt?: number
  takeoffDistanceFt?: number
  landingDistanceFt?: number
  maxPassengers?: number
  typicalPassengers?: number
  crewCount?: number
  livingSpaces?: number
  cabinLengthM?: number
  cabinWidthM?: number
  cabinHeightM?: number
  baggageVolumeM3?: number
  engineModel?: string
  thrustLbf?: number
  certificationDate?: string
  heroImageUrl?: string
  galleryUrls: string[]
  featureVideoUrl?: string
  specSheetUrl?: string
  keyFeatures: AircraftFeature[]
  headlineSpecs: AircraftSpecPointer[]
  relatedKeys: string[]
  comparisonEligible: boolean
  siteKey?: string
  displayOrder?: number
  /** URL of the OT_AircraftPage that references this record, when one exists. */
  url?: string
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const PROFILE_FIELDS = `
  _metadata { key locale url { default } }
  modelName
  family
  lifecycleStatus
  tagline
  overview { html }
  rangeNm
  cruiseSpeedMach
  maxOperatingMach
  maxAltitudeFt
  takeoffDistanceFt
  landingDistanceFt
  maxPassengers
  typicalPassengers
  crewCount
  livingSpaces
  cabinLengthM
  cabinWidthM
  cabinHeightM
  baggageVolumeM3
  engineModel
  thrustLbf
  certificationDate
  heroImage { url { default } }
  galleryImages { url { default } }
  featureVideo { url { default } }
  specSheet { url { default } }
  keyFeatures { headline body { html } }
  headlineSpecs { specField rowLabel groupHeader }
  relatedAircraft { key }
  comparisonEligible
  siteKey
  displayOrder
`

const ONE_QUERY = `
  query GetAircraft($key: String!, $locale: String) {
    OT_AircraftProfile(
      where: { _metadata: { key: { eq: $key }, locale: { eq: $locale } } }
      limit: 1
    ) { items { ${PROFILE_FIELDS} } }
  }
`

function buildListQuery(withSiteKey: boolean): string {
  const skVar    = withSiteKey ? ', $siteKey: String' : ''
  const skFilter = withSiteKey ? '\n      siteKey: { eq: $siteKey }' : ''
  return `
    query GetAircraftList($locale: String!${skVar}) {
      OT_AircraftProfile(
        limit: 100,
        orderBy: { displayOrder: ASC },
        where: { _metadata: { locale: { eq: $locale } }${skFilter} }
      ) { items { ${PROFILE_FIELDS} } }
    }
  `
}

// Maps record key → URL of the OT_AircraftPage that references it, so cards and
// related-aircraft links point at the real model page (the shared record has no
// URL of its own).
const PAGES_QUERY = `
  query GetAircraftPages($locale: String!) {
    OT_AircraftPage(
      limit: 100,
      where: { _metadata: { locale: { eq: $locale }, status: { eq: "Published" } } }
    ) { items { _metadata { url { default } } aircraftRef { key } } }
  }
`

// ─── Shaping ──────────────────────────────────────────────────────────────────

function toAircraft(item: any, requestedLocale: string, url?: string): AircraftData {
  const rec = item._metadata?.locale ?? requestedLocale
  return {
    key:        item._metadata?.key ?? '',
    locale:     rec,
    isFallback: rec !== requestedLocale,
    modelName:  item.modelName ?? '',
    family:     item.family ?? undefined,
    lifecycleStatus: item.lifecycleStatus ?? undefined,
    tagline:    item.tagline ?? undefined,
    overviewHtml: item.overview?.html ?? undefined,
    rangeNm:           item.rangeNm ?? undefined,
    cruiseSpeedMach:   item.cruiseSpeedMach ?? undefined,
    maxOperatingMach:  item.maxOperatingMach ?? undefined,
    maxAltitudeFt:     item.maxAltitudeFt ?? undefined,
    takeoffDistanceFt: item.takeoffDistanceFt ?? undefined,
    landingDistanceFt: item.landingDistanceFt ?? undefined,
    maxPassengers:     item.maxPassengers ?? undefined,
    typicalPassengers: item.typicalPassengers ?? undefined,
    crewCount:         item.crewCount ?? undefined,
    livingSpaces:      item.livingSpaces ?? undefined,
    cabinLengthM:      item.cabinLengthM ?? undefined,
    cabinWidthM:       item.cabinWidthM ?? undefined,
    cabinHeightM:      item.cabinHeightM ?? undefined,
    baggageVolumeM3:   item.baggageVolumeM3 ?? undefined,
    engineModel:       item.engineModel ?? undefined,
    thrustLbf:         item.thrustLbf ?? undefined,
    certificationDate: item.certificationDate ?? undefined,
    heroImageUrl:      item.heroImage?.url?.default ?? undefined,
    galleryUrls:       (item.galleryImages ?? []).map((g: any) => g?.url?.default).filter(Boolean),
    featureVideoUrl:   item.featureVideo?.url?.default ?? undefined,
    specSheetUrl:      item.specSheet?.url?.default ?? undefined,
    keyFeatures:       (item.keyFeatures ?? [])
      .filter((f: any) => f?.headline)
      .map((f: any) => ({ headline: f.headline, bodyHtml: f.body?.html ?? undefined })),
    headlineSpecs:     (item.headlineSpecs ?? [])
      .filter((s: any) => s?.specField)
      .map((s: any) => ({ specField: s.specField, rowLabel: s.rowLabel ?? undefined, groupHeader: s.groupHeader ?? undefined })),
    relatedKeys:       (item.relatedAircraft ?? []).map((r: any) => r?.key).filter(Boolean),
    comparisonEligible: item.comparisonEligible ?? false,
    siteKey:           item.siteKey ?? undefined,
    displayOrder:      item.displayOrder ?? undefined,
    url,
  }
}

// ─── Data access ──────────────────────────────────────────────────────────────

/**
 * One aircraft record by content key. Falls back to English when the requested
 * locale has no published version (never null for a French request that has an
 * English equivalent); the result's `isFallback` drives the mandatory notice.
 * React-cached so generateMetadata and the page share one round-trip.
 */
export const getAircraft = cache(async function getAircraft(
  key: string,
  locale = 'en',
): Promise<AircraftData | null> {
  try {
    const data = await getClient().request(ONE_QUERY, { key, locale })
    let item = (data as any)?.OT_AircraftProfile?.items?.[0] ?? null
    if (!item && locale !== 'en') {
      const fb = await getClient().request(ONE_QUERY, { key, locale: 'en' })
      item = (fb as any)?.OT_AircraftProfile?.items?.[0] ?? null
    }
    return item ? toAircraft(item, locale) : null
  } catch {
    return null
  }
})

/** Records for the fleet listing / comparison, site-scoped, with page URLs. */
export const getAllAircraft = cache(async function getAllAircraft(
  options?: { siteKey?: string; locale?: string },
): Promise<AircraftData[]> {
  const locale  = options?.locale ?? 'en'
  const siteKey = options?.siteKey
  const query   = buildListQuery(!!siteKey)
  const vars    = { locale, ...(siteKey ? { siteKey } : {}) }
  try {
    const [recs, pages] = await Promise.all([
      getClient().request(query, vars),
      getClient().request(PAGES_QUERY, { locale }),
    ])
    const urlByKey = new Map<string, string>()
    for (const p of (pages as any)?.OT_AircraftPage?.items ?? []) {
      const k = p?.aircraftRef?.key
      const u = p?._metadata?.url?.default
      if (k && u && !urlByKey.has(k)) urlByKey.set(k, u)
    }
    const seen = new Set<string>()
    const out: AircraftData[] = []
    for (const item of (recs as any)?.OT_AircraftProfile?.items ?? []) {
      const k = item?._metadata?.key
      if (!k || seen.has(k)) continue
      seen.add(k)
      out.push(toAircraft(item, locale, urlByKey.get(k)))
    }
    return out
  } catch {
    return []
  }
})

/** Page URL for one record key, resolving through its OT_AircraftPage. */
export async function getAircraftPageUrl(key: string, locale = 'en'): Promise<string | undefined> {
  const all = await getAllAircraft({ locale })
  return all.find(a => a.key === key)?.url
}
