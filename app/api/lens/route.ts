import { NextResponse, type NextRequest } from 'next/server'
import { getAircraft, getAllAircraft } from '@/lib/aircraft'
import { getLocalizedContentByPath, getRequestBaseUrl, getSiteKey } from '@/lib/optimizely'
import { isSupportedLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { parseCompareIds, toCompareColumn } from '@/lib/aircraftCompare'
import { toAircraftContract, toComparisonContract } from '@/lib/lens/concierge'
import { captureGraph } from '@/lib/lens/capture'

export const dynamic = 'force-dynamic'

// Dev lens data source. Re-runs the SAME data functions the page uses (lib/aircraft.ts
// and the SDK's getContentByPath) while recording the Graph calls they make, so the
// panel shows the live query, the raw response and the shaped props, never a mock-up.
// Read-only and limited to three fixed kinds; it accepts no query text from the client.

const COMPONENTS = {
  aircraft: [
    { component: 'AircraftHeader',    receives: ['modelName', 'tagline', 'family', 'heroImageUrl', 'headlineSpecs', 'rangeNm', 'cruiseSpeedMach', 'maxPassengers'] },
    { component: 'AircraftSpecPanel', receives: ['all 18 numeric specs', 'cabin and exterior diagrams', 'engineModel', 'certificationDate'] },
    { component: 'AircraftGallery',   receives: ['galleryUrls'] },
    { component: 'AircraftRelated',   receives: ['relatedKeys → cards'] },
    { component: 'JSON-LD (Product)', receives: ['modelName', 'tagline', 'images', 'numeric specs as PropertyValue'] },
  ],
  listing: [
    { component: 'AircraftListing (client)', receives: ['key', 'modelName', 'tagline', 'family', 'lifecycleStatus', 'rangeNm', 'maxPassengers', 'cruiseSpeedMach', 'heroImageUrl', 'url', 'comparisonEligible'] },
  ],
  compare: [
    { component: 'AircraftCompareTable (client)', receives: ['CompareColumn[]: key, modelName, family, heroImageUrl, url, values{spec → number}'] },
  ],
} as const

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const kind = sp.get('kind')
  const loc = sp.get('locale') ?? DEFAULT_LOCALE
  const locale: Locale = isSupportedLocale(loc) ? loc : DEFAULT_LOCALE

  try {
    if (kind === 'aircraft') {
      const key = (sp.get('key') ?? '').replace(/-/g, '').toLowerCase()
      const path = sp.get('path') ?? ''
      if (!/^[0-9a-f]{32}$/.test(key)) return NextResponse.json({ error: 'bad key' }, { status: 400 })
      const baseUrl = await getRequestBaseUrl()
      const { result: aircraft, calls } = await captureGraph(async () => {
        if (path.startsWith('/')) await getLocalizedContentByPath(path, locale, baseUrl).catch(() => null)
        return getAircraft(key, locale)
      })
      return NextResponse.json({
        kind, locale, calls, components: COMPONENTS.aircraft,
        props: aircraft,
        contract: aircraft ? toAircraftContract(aircraft, locale) : null,
      })
    }

    if (kind === 'listing' || kind === 'compare') {
      const siteKey = (await getSiteKey()) ?? undefined
      const { result: all, calls } = await captureGraph(() => getAllAircraft({ siteKey, locale }))
      if (kind === 'listing') {
        const props = all.map(a => ({
          key: a.key, modelName: a.modelName, tagline: a.tagline, family: a.family, lifecycleStatus: a.lifecycleStatus,
          rangeNm: a.rangeNm, maxPassengers: a.maxPassengers, cruiseSpeedMach: a.cruiseSpeedMach,
          heroImageUrl: a.heroImageUrl, url: a.url, comparisonEligible: a.comparisonEligible,
        }))
        return NextResponse.json({ kind, locale, calls, components: COMPONENTS.listing, props, contract: { schema: 'bombardier.fleet.v1', locale, models: all.map(a => toAircraftContract(a, locale)) } })
      }
      const picked = parseCompareIds(sp.get('ids') ?? '')
        .map(id => all.find(a => a.key === id))
        .filter((a): a is NonNullable<typeof a> => !!a && a.comparisonEligible)
      return NextResponse.json({
        kind, locale, calls, components: COMPONENTS.compare,
        props: picked.map(toCompareColumn),
        contract: toComparisonContract(picked, locale),
      })
    }
    return NextResponse.json({ error: 'unknown kind' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'lens failed' }, { status: 500 })
  }
}
