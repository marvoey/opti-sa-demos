import { Suspense } from 'react'
import { ContentProps } from '@optimizely/cms-sdk'
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server'
import { OT_AircraftListingBlock as OT_AircraftListingBlockContentType } from '@/cms/content-types/OT_AircraftListingBlock'
import { getRequestLocale, getSiteKey } from '@/lib/optimizely'
import { getAllAircraft, type AircraftData } from '@/lib/aircraft'
import { localizedHref } from '@/lib/i18n/config'
import { sanitizeCmsHtml } from '@/lib/sanitizeHtml'
import AircraftListing, { type ListItem, type SortKey } from '@/components/aircraft/AircraftListing'
import { familyLabels, lifecycleLabels, listingText } from '@/components/aircraft/aircraftText'

type Props = {
  content:          ContentProps<typeof OT_AircraftListingBlockContentType>
  displaySettings?: Record<string, string | boolean>
}

const CURRENT = ['inProduction', 'inService']

// Async server component. Loads aircraft records at render time, scoped to the
// current site via siteKey (ThemeManager frontEndDomain), applies the editor's
// locks (family, lifecycle, manual selection), then hands plain serializable data
// to the client listing, which owns search, filters, sort, and compare.
export default async function OT_AircraftListingBlockAdapter({ content, displaySettings = {} }: Props) {
  const { pa } = getPreviewUtils(content)
  const [locale, siteKey] = await Promise.all([getRequestLocale(), getSiteKey()])
  const all = await getAllAircraft({ siteKey: siteKey ?? undefined, locale })

  // Manual selection overrides the family and lifecycle locks, in the editor's order.
  const manualKeys = ((content.manualSelection ?? []) as unknown as { key?: string }[]).map(r => r?.key).filter((k): k is string => !!k)
  const familyLock = content.familyFilter && content.familyFilter !== 'all' ? content.familyFilter : null
  const lifeLock = content.lifecycleFilter && content.lifecycleFilter !== 'all' ? content.lifecycleFilter : null

  let picked: AircraftData[]
  if (manualKeys.length) {
    picked = manualKeys.map(k => all.find(a => a.key === k)).filter((a): a is AircraftData => !!a)
  } else {
    picked = all.filter(a =>
      (!familyLock || a.family === familyLock) &&
      (!lifeLock || (lifeLock === 'currentOnly' ? CURRENT.includes(a.lifecycleStatus ?? '') : a.lifecycleStatus === 'announced')),
    )
  }

  const items: ListItem[] = picked.map(a => ({
    key: a.key, modelName: a.modelName, tagline: a.tagline, family: a.family, lifecycleStatus: a.lifecycleStatus,
    rangeNm: a.rangeNm, maxPassengers: a.maxPassengers, heroImageUrl: a.heroImageUrl, url: a.url,
    comparisonEligible: a.comparisonEligible,
  }))

  // Booleans have no model default; unset means "on" so a fresh block is fully featured.
  const on = (v: boolean | null | undefined) => v ?? true
  const cols = ({ col2: 2, col3: 3, col4: 4 } as const)[String(displaySettings.columns ?? 'col3') as 'col2' | 'col3' | 'col4'] ?? 3
  const bg = displaySettings.color === 'surface' ? 'bg-surface' : 'bg-canvas'

  return (
    <section {...pa(content.__composition)} className={`${bg} w-full text-fg`}>
      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        {content.heading && (
          <h2 {...pa('heading')} className="text-balance text-[clamp(2rem,4.5vw,3rem)] font-light leading-[1.05] tracking-[-0.02em]">
            {content.heading}
          </h2>
        )}
        {content.intro?.html && (
          <div {...pa('intro')} className="prose-ot mt-md max-w-[65ch] text-fg/85" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.intro.html) }} />
        )}
        <div className={content.heading || content.intro?.html ? 'mt-lg' : ''}>
          <Suspense fallback={null}>
            <AircraftListing
              items={items}
              locale={locale}
              options={{
                showSearch: on(content.showSearch), showFamilyFilter: on(content.showFamilyFilter),
                showRangeFilter: on(content.showRangeFilter), showPassengerFilter: on(content.showPassengerFilter),
                showCompareToggle: on(content.showCompareToggle),
                defaultSort: (content.defaultSort as SortKey | undefined) ?? 'displayOrder',
                lifecycleLocked: !!lifeLock || manualKeys.length > 0,
              }}
              settings={{
                columns: cols,
                compact: displaySettings.density === 'compact',
                cardStyle: displaySettings.cardStyle === 'spec' ? 'spec' : 'image',
                showImages: String(displaySettings.showImages ?? 'true') !== 'false',
              }}
              compareBase={localizedHref('/aircraft/compare', locale)}
              familyLabels={familyLabels(locale)}
              lifecycleLabels={lifecycleLabels(locale)}
              text={listingText(locale)}
            />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
