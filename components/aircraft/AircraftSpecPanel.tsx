import type { AircraftData } from '@/lib/aircraft'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { t } from '@/lib/i18n/t'
import { formatCertDate, formatSpec, specLabel, specValue, SPEC_GROUPS } from '@/lib/aircraftFormat'

/**
 * The full specification panel. Reads ONLY from the aircraft record, never from
 * page fields: this is the surface that proves "edit once, update everywhere".
 * Groups render as definition lists with hairline dividers (not cards); values
 * are tabular mono so numerals align down the column.
 */
export default function AircraftSpecPanel({ aircraft, locale }: { aircraft: AircraftData; locale: string }) {
  const certDate = formatCertDate(aircraft.certificationDate, locale)

  const groups = SPEC_GROUPS.map(g => {
    const rows = g.fields
      .map((f: AircraftSpecField) => {
        const fmt = formatSpec(f, specValue(aircraft, f), locale, 'both')
        return fmt ? { field: f, label: specLabel(f, locale), fmt } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
    return { id: g.id, rows }
  })

  return (
    <section aria-labelledby="aircraft-specs-heading" className="bg-canvas text-fg">
      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        <h2 id="aircraft-specs-heading" className="text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">
          {t(locale, 'aircraft.specifications')}
        </h2>
        <div className="mt-lg grid gap-x-xl gap-y-lg lg:grid-cols-3">
          {groups.map(g => {
            const isPower = g.id === 'powerplant'
            const hasEngine = isPower && (aircraft.engineModel || certDate)
            if (!g.rows.length && !hasEngine) return null
            return (
              <div key={g.id} className="min-w-0">
                <h3 className="border-b border-fg/40 pb-sm text-[0.75rem] font-semibold uppercase tracking-[0.1em]">
                  {t(locale, `aircraft.${g.id}` as never)}
                </h3>
                <dl className="divide-y divide-fg/10">
                  {isPower && aircraft.engineModel && (
                    <div className="flex items-baseline justify-between gap-md py-sm">
                      <dt className="min-w-0 text-pretty text-sm text-fg/75">{t(locale, 'aircraft.engine')}</dt>
                      <dd className="shrink-0 text-right font-mono text-sm">{aircraft.engineModel}</dd>
                    </div>
                  )}
                  {g.rows.map(r => (
                    <div key={r.field} className="flex items-baseline justify-between gap-md py-sm">
                      <dt className="min-w-0 text-pretty text-sm text-fg/75">{r.label}</dt>
                      <dd className="shrink-0 text-right font-mono tabular-nums">
                        <span className="block text-base font-medium">{r.fmt.primary}</span>
                        {r.fmt.secondary && <span className="block text-xs text-fg/65">{r.fmt.secondary}</span>}
                      </dd>
                    </div>
                  ))}
                  {isPower && certDate && (
                    <div className="flex items-baseline justify-between gap-md py-sm">
                      <dt className="min-w-0 text-pretty text-sm text-fg/75">{t(locale, 'aircraft.certified')}</dt>
                      <dd className="shrink-0 text-right font-mono text-sm">{certDate}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
