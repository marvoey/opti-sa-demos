import Link from 'next/link'
import type { ReactNode } from 'react'
import type { AircraftData } from '@/lib/aircraft'
import { getAllAircraft } from '@/lib/aircraft'
import { t } from '@/lib/i18n/t'
import { localizedHref, type Locale } from '@/lib/i18n/config'
import AircraftHeader, { type AircraftHeaderStyle } from '@/components/aircraft/AircraftHeader'
import AircraftSpecPanel from '@/components/aircraft/AircraftSpecPanel'
import AircraftGallery from '@/components/aircraft/AircraftGallery'
import AircraftRelated from '@/components/aircraft/AircraftRelated'
import LanguageNotice from '@/components/aircraft/LanguageNotice'
import OptiFormsContainerDataAdapter from '@/cms/components/OptiFormsContainerData'

type Props = {
  aircraft:       AircraftData
  locale:         Locale
  headerStyle?:   string | null
  showSpecPanel?: boolean | null
  showComparisonCta?: boolean | null
  enquiryFormKey?: string | null
  enquiryHeading?: string | null
  /** The Visual Builder composition, rendered between header and spec panel. */
  composition:    ReactNode
}

const HEADER_STYLES: AircraftHeaderStyle[] = ['fullBleed', 'splitSpec', 'minimal']

/**
 * An aircraft model page. Order follows the spec: locked header (with headline
 * stats), free composition, specification panel, gallery, spec sheet, related
 * aircraft, enquiry form. Everything except the composition and the form
 * resolves from the referenced OT_AircraftProfile.
 *
 * `showSpecPanel` has no model default, so an unset value is treated as ON
 * (the panel is the proof of the single-source model; editors turn it off for
 * teaser pages on announced models).
 */
export default async function AircraftPage({
  aircraft, locale, headerStyle, showSpecPanel, showComparisonCta,
  enquiryFormKey, enquiryHeading, composition,
}: Props) {
  const style = (HEADER_STYLES as string[]).includes(headerStyle ?? '') ? (headerStyle as AircraftHeaderStyle) : 'fullBleed'

  const compareHref =
    showComparisonCta && aircraft.comparisonEligible
      ? localizedHref(`/aircraft/compare?ids=${[aircraft.key, ...aircraft.relatedKeys].join(',')}`, locale)
      : undefined

  const relatedKeys = new Set(aircraft.relatedKeys)
  const related = relatedKeys.size
    ? (await getAllAircraft({ locale })).filter(a => relatedKeys.has(a.key))
    : []

  return (
    <>
      {aircraft.isFallback && <LanguageNotice locale={locale} />}
      <AircraftHeader aircraft={aircraft} locale={locale} headerStyle={style} compareHref={compareHref} />

      {composition}

      {showSpecPanel !== false && <AircraftSpecPanel aircraft={aircraft} locale={locale} />}

      <AircraftGallery
        urls={aircraft.galleryUrls}
        modelName={aircraft.modelName}
        labels={{
          heading: t(locale, 'aircraft.gallery'),
          hint:    t(locale, 'aircraft.galleryHint'),
          open:    t(locale, 'aircraft.openImage', { n: '{n}', total: '{total}' }),
          close:   t(locale, 'aircraft.closeGallery'),
          prev:    t(locale, 'aircraft.prevImage'),
          next:    t(locale, 'aircraft.nextImage'),
        }}
      />

      {aircraft.specSheetUrl && (
        <section aria-labelledby="aircraft-specsheet-heading" className="bg-canvas text-fg">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-md px-md py-lg lg:px-xl">
            <h2 id="aircraft-specsheet-heading" className="text-xl font-semibold tracking-[-0.01em]">
              {t(locale, 'aircraft.specSheet')}
            </h2>
            <Link
              href={aircraft.specSheetUrl}
              className="inline-flex min-h-11 items-center border border-fg px-md py-sm text-sm font-semibold transition-colors duration-200 hover:bg-fg hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {t(locale, 'aircraft.downloadSpecSheet')}
            </Link>
          </div>
        </section>
      )}

      <AircraftRelated items={related} locale={locale} />

      {enquiryFormKey && (
        <section aria-labelledby="aircraft-enquiry-heading" className="bg-surface text-fg">
          <div className="mx-auto max-w-3xl px-md py-xl lg:py-2xl">
            <h2 id="aircraft-enquiry-heading" className="text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">
              {enquiryHeading || t(locale, 'aircraft.enquiry')}
            </h2>
            <div className="mt-lg">
              <OptiFormsContainerDataAdapter
                content={{ _metadata: { key: enquiryFormKey } }}
                displaySettings={{ contentWidth: 'default', verticalSpacing: 'none', backgroundColor: 'none' }}
              />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
