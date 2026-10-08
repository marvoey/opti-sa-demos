import { ContentProps } from '@optimizely/cms-sdk'
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server'
import { OT_AircraftSpecTable as OT_AircraftSpecTableContentType } from '@/cms/content-types/OT_AircraftSpecTable'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { getRequestLocale } from '@/lib/optimizely'
import { getAllAircraft } from '@/lib/aircraft'
import { toCompareColumn } from '@/lib/aircraftCompare'
import { specLabel } from '@/lib/aircraftFormat'
import { sanitizeCmsHtml } from '@/lib/sanitizeHtml'
import AircraftCompareTable from '@/components/aircraft/AircraftCompareTable'
import { compareText, familyLabels } from '@/components/aircraft/aircraftText'

type Props = {
  content:          ContentProps<typeof OT_AircraftSpecTableContentType>
  displaySettings?: Record<string, string | boolean>
}

// Server component. The comparison's columns and every cell resolve from the
// referenced OT_AircraftProfile records at render time; nothing here is typed
// text, so editing a record updates every comparison that includes it.
export default async function OT_AircraftSpecTableAdapter({ content, displaySettings = {} }: Props) {
  const { pa } = getPreviewUtils(content)
  const locale = await getRequestLocale()
  const all = await getAllAircraft({ locale })

  const keys = ((content.aircraft ?? []) as unknown as { key?: string }[]).map(r => r?.key).filter((k): k is string => !!k)
  const columns = keys.map(k => all.find(a => a.key === k)).filter((a): a is NonNullable<typeof a> => !!a).map(toCompareColumn)

  const rows = ((content.specRows ?? []) as unknown as { specField?: string; rowLabel?: string; groupHeader?: string }[])
    .filter(r => r?.specField)
    .map(r => ({
      field: r.specField as AircraftSpecField,
      label: r.rowLabel || specLabel(r.specField as AircraftSpecField, locale),
      group: r.groupHeader || undefined,
    }))

  const featuredKey = (content.featuredAircraft as unknown as { key?: string } | null)?.key
  const bg = displaySettings.color === 'surface' ? 'bg-surface' : 'bg-canvas'

  return (
    <section {...pa(content.__composition)} className={`${bg} w-full text-fg`}>
      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        {content.heading && (
          <h2 {...pa('heading')} className="text-balance text-[clamp(2rem,4.5vw,3rem)] font-light leading-[1.05] tracking-[-0.02em]">{content.heading}</h2>
        )}
        {content.intro?.html && (
          <div {...pa('intro')} className="prose-ot mt-md max-w-[65ch] text-fg/85" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.intro.html) }} />
        )}
        <div className="mt-lg">
          {columns.length >= 2 && rows.length > 0 ? (
            <AircraftCompareTable
              columns={columns}
              rows={rows}
              locale={locale}
              unitSystem={(content.unitSystem as 'metric' | 'imperial' | 'both' | undefined) ?? 'metric'}
              featuredKey={featuredKey}
              highlightBest={!!content.highlightBest}
              stickyFirstColumn={String(displaySettings.stickyFirstColumn ?? 'true') !== 'false'}
              mobileBehavior={displaySettings.mobileBehavior === 'columnSelector' ? 'columnSelector' : 'scroll'}
              familyLabels={familyLabels(locale)}
              text={compareText(locale)}
            />
          ) : (
            <p {...pa('aircraft')} className="border border-dashed border-fg/30 p-lg text-center text-sm text-fg/70">
              Select at least two aircraft and one specification row.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
