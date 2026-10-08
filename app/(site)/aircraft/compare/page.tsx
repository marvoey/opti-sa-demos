import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/optimizely'
import { getAllAircraft } from '@/lib/aircraft'
import { DEFAULT_COMPARE_ROWS, parseCompareIds, toCompareColumn } from '@/lib/aircraftCompare'
import { specLabel } from '@/lib/aircraftFormat'
import { localizedHref } from '@/lib/i18n/config'
import { t } from '@/lib/i18n/t'
import AircraftCompareTable from '@/components/aircraft/AircraftCompareTable'
import BackToFleetLink from '@/components/aircraft/BackToFleetLink'
import AircraftBreadcrumb from '@/components/aircraft/AircraftBreadcrumb'
import { breadcrumbLabels, compareText, familyLabels } from '@/components/aircraft/aircraftText'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Visitor-built comparison. The set lives in the URL (`?ids=a,b,c`), so any
// comparison is shareable. Infinite id combinations are not worth indexing.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  return { title: t(locale, 'aircraft.comparison.compareTitle'), robots: { index: false, follow: true } }
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams
  const locale = await getRequestLocale()
  const ids = parseCompareIds(sp.ids)
  const all = await getAllAircraft({ locale })

  // Only records marked "Include in Comparisons" may be compared; request order is kept.
  const columns = ids
    .map(id => all.find(a => a.key === id))
    .filter((a): a is NonNullable<typeof a> => !!a && a.comparisonEligible)
    .map(toCompareColumn)

  const groupLabel = (g: string) => t(locale, `aircraft.${g}` as never)
  const rows = DEFAULT_COMPARE_ROWS.map(r => ({
    field: r.field,
    label: specLabel(r.field, locale),
    group: r.group ? groupLabel(r.group) : undefined,
  }))

  return (
    <>
    <AircraftBreadcrumb
      homeHref={localizedHref('/', locale)}
      fleetHref={localizedHref('/aircraft', locale)}
      labels={breadcrumbLabels(locale)}
      current={t(locale, 'aircraft.nav.compare')}
      widthClass="max-w-[88rem]"
    />
    <section className="bg-canvas text-fg">
      <div className="mx-auto max-w-[88rem] px-md py-xl lg:px-xl lg:py-2xl">
        <h1 className="text-balance text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.05] tracking-[-0.02em]">
          {t(locale, 'aircraft.comparison.compareTitle')}
        </h1>
        <p className="mt-md max-w-[65ch] text-fg/80">{t(locale, 'aircraft.comparison.compareIntro')}</p>
        {columns.length >= 2 && (
          <div className="mt-md">
            <BackToFleetLink fleetHref={localizedHref('/aircraft', locale)}>{t(locale, 'aircraft.nav.changeSelection')}</BackToFleetLink>
          </div>
        )}
        <div className="mt-lg">
          {columns.length >= 2 ? (
            <AircraftCompareTable
              columns={columns}
              rows={rows}
              locale={locale}
              unitSystem="both"
              highlightBest
              mobileBehavior="columnSelector"
              familyLabels={familyLabels(locale)}
              text={compareText(locale)}
            />
          ) : (
            <div className="border border-dashed border-fg/30 p-lg text-center">
              <p className="text-lg font-semibold">{t(locale, 'aircraft.comparison.emptyTitle')}</p>
              <Link href={localizedHref('/aircraft', locale)} className="mt-md inline-flex min-h-11 items-center border border-fg px-md text-sm font-semibold hover:bg-fg hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                {t(locale, 'aircraft.comparison.backToFleet')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
    </>
  )
}
