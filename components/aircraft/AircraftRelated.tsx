import Image from 'next/image'
import Link from 'next/link'
import type { AircraftData } from '@/lib/aircraft'
import { t } from '@/lib/i18n/t'
import { FAMILY_LABELS, formatSpec } from '@/lib/aircraftFormat'

/** Up to three cross-shopped models, resolved from the record's relatedAircraft. */
export default function AircraftRelated({ items, locale }: { items: AircraftData[]; locale: string }) {
  const linked = items.filter(i => i.url).slice(0, 3)
  if (!linked.length) return null
  return (
    <section aria-labelledby="aircraft-related-heading" className="bg-canvas text-fg">
      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        <h2 id="aircraft-related-heading" className="text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">
          {t(locale, 'aircraft.related')}
        </h2>
        <ul className="mt-lg grid gap-lg md:grid-cols-3">
          {linked.map(a => {
            const range = formatSpec('rangeNm', a.rangeNm, locale, 'both')
            return (
              <li key={a.key}>
                <Link
                  href={a.url!}
                  aria-label={t(locale, 'aircraft.viewModel', { model: a.modelName })}
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-surface">
                    {a.heroImageUrl && (
                      <Image src={a.heroImageUrl} alt="" fill sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                    )}
                  </div>
                  <p className="mt-sm text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-fg/70">
                    {a.family ? FAMILY_LABELS[a.family] : ''}
                  </p>
                  <h3 className="mt-xs text-xl font-semibold leading-tight tracking-[-0.01em] group-hover:underline">{a.modelName}</h3>
                  {range && <p className="mt-xs font-mono text-sm tabular-nums text-fg/75">{range.text}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
