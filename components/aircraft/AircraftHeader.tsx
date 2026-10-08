import Image from 'next/image'
import Link from 'next/link'
import type { AircraftData } from '@/lib/aircraft'
import { t } from '@/lib/i18n/t'
import { FAMILY_LABELS } from '@/lib/aircraftFormat'
import HeadlineSpecs from './HeadlineSpecs'
import { resolveHeadlines } from './headlineData'

type PreviewAttrs = (field: string) => Record<string, unknown>

export type AircraftHeaderStyle = 'fullBleed' | 'splitSpec' | 'minimal'

type Props = {
  aircraft:      AircraftData
  locale:        string
  headerStyle?:  AircraftHeaderStyle
  /** Pre-built, locale-prefixed compare URL; omit to hide the CTA. */
  compareHref?:  string
  pa?:           PreviewAttrs
}

// Dark, theme-independent ink for text laid over photography. The scrim has to
// hold contrast regardless of the visitor's light/dark theme.
const SCRIM =
  'linear-gradient(to top, oklch(13% 0.012 27 / 0.94) 0%, oklch(13% 0.012 27 / 0.55) 38%, oklch(13% 0.012 27 / 0.12) 100%)'

function Badges({ aircraft, locale }: { aircraft: AircraftData; locale: string }) {
  const family = aircraft.family ? FAMILY_LABELS[aircraft.family] : null
  const status = aircraft.lifecycleStatus ? t(locale, `aircraft.lifecycle.${aircraft.lifecycleStatus}` as never) : null
  if (!family && !status) return null
  return (
    <p className="flex flex-wrap items-center gap-x-sm gap-y-xs text-[0.75rem] font-semibold uppercase tracking-[0.1em]">
      {family && <span>{family}</span>}
      {family && status && <span aria-hidden className="opacity-50">/</span>}
      {status && <span className="opacity-80">{status}</span>}
    </p>
  )
}

function CompareCta({ href, locale }: { href?: string; locale: string }) {
  if (!href) return null
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center bg-brand px-md py-sm text-sm font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-on-brand"
    >
      {t(locale, 'aircraft.compareThis')}
    </Link>
  )
}

/**
 * The locked aircraft header, rendered by the slug route OUTSIDE the Visual
 * Builder composition. Everything here resolves from the OT_AircraftProfile
 * record: editors cannot mistype a spec because they cannot type one.
 *
 * `headerStyle` picks one of three approved layouts. The model name is set in
 * the themeable primary font at a light weight (no Syne), so it follows the
 * ThemeManager Primary Font axis.
 */
export default function AircraftHeader({ aircraft, locale, headerStyle = 'fullBleed', compareHref, pa }: Props) {
  const headlines = resolveHeadlines(aircraft, locale)
  const a = aircraft
  const name = (
    <h1
      className="text-balance text-[clamp(3rem,9vw,7rem)] font-light leading-[0.95] tracking-[-0.025em]"
      {...(pa ? pa('modelName') : {})}
    >
      {a.modelName}
    </h1>
  )
  const tagline = a.tagline ? (
    <p className="mt-md max-w-[42ch] text-pretty text-lg leading-snug opacity-90 lg:text-xl">{a.tagline}</p>
  ) : null

  // ── Minimal: type-led, no photography (announced models) ────────────────────
  if (headerStyle === 'minimal' || (!a.heroImageUrl && headerStyle === 'fullBleed')) {
    return (
      <header>
        <div className="bg-surface text-fg">
          <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
            <Badges aircraft={a} locale={locale} />
            <div className="mt-md">{name}</div>
            {tagline}
            {compareHref && <div className="mt-lg"><CompareCta href={compareHref} locale={locale} /></div>}
          </div>
        </div>
        <HeadlineSpecs items={headlines} locale={locale} />
      </header>
    )
  }

  // ── Split: image left, quiet spec panel right ───────────────────────────────
  if (headerStyle === 'splitSpec') {
    return (
      <header className="bg-canvas text-fg">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[18rem] lg:min-h-[34rem]">
            {a.heroImageUrl && (
              <Image src={a.heroImageUrl} alt={a.modelName} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            )}
          </div>
          <div className="flex flex-col justify-center bg-surface px-md py-xl lg:px-xl">
            <Badges aircraft={a} locale={locale} />
            <div className="mt-md">{name}</div>
            {tagline}
            <dl className="mt-lg divide-y divide-fg/15 border-y border-fg/15">
              {headlines.map(h => (
                <div key={h.field} className="flex items-baseline justify-between gap-md py-sm">
                  <dt className="min-w-0 text-pretty text-sm text-fg/75">{h.label}</dt>
                  <dd className="shrink-0 text-right font-mono tabular-nums">
                    <span className="block text-xl font-medium">{h.primary}</span>
                    {h.secondary && <span className="block text-xs text-fg/65">{h.secondary}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {compareHref && <div className="mt-lg"><CompareCta href={compareHref} locale={locale} /></div>}
          </div>
        </div>
      </header>
    )
  }

  // ── Full-bleed: photograph, scrim, name lower-left, anchor-color stat strip ─
  return (
    <header>
      <div className="relative isolate flex min-h-[min(76svh,46rem)] items-end overflow-hidden bg-canvas text-fg-on-brand">
        {a.heroImageUrl && (
          <Image src={a.heroImageUrl} alt={a.modelName} fill priority sizes="100vw" className="-z-20 object-cover" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: SCRIM }} />
        <div className="relative mx-auto w-full max-w-6xl px-md pb-xl pt-2xl lg:px-xl">
          <Badges aircraft={a} locale={locale} />
          <div className="mt-md">{name}</div>
          {tagline}
          {compareHref && <div className="mt-lg"><CompareCta href={compareHref} locale={locale} /></div>}
        </div>
      </div>
      <HeadlineSpecs items={headlines} locale={locale} />
    </header>
  )
}
