import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Footer from '@/components/layout/Footer'
import { LogoImage } from '@/components/layout/LogoImage'
import OptiFormsContainerDataAdapter from '@/cms/components/OptiFormsContainerData'
import { getCampaignFooter } from '@/lib/campaignLanding'
import { getRequestDomain, getSiteSettings } from '@/lib/optimizely'
import { localizedHref, type Locale } from '@/lib/i18n/config'
import { t } from '@/lib/i18n/t'


/**
 * Campaign-only styling, emitted inline with the page (not via globals.css) so it
 * ships atomically with the markup that uses it.
 *
 * 1. Token remap: the committed color here is the accent. Themes whose brand fill is
 *    near the dark canvas (Bombardier: #202020) would otherwise lose brand-filled
 *    buttons and brand-colored eyebrows, so inside the frame the brand role resolves
 *    to the accent and every block stays visible and on-theme without edits.
 * 2. Hero sheen: one champagne band sweeps across the headline on load, then it
 *    settles to the plain solid headline (solid --ot-fg at both ends, so the resting
 *    state equals no effect). Only background-position animates (paint, not layout).
 *    The hero already runs a fade-in on the h1 with an inline animation-delay, so both
 *    animations are listed and the delay list is !important to beat that inline value.
 *    Skipped entirely under prefers-reduced-motion: the headline stays solid.
 */
const CAMPAIGN_CSS = `
.ot-campaign-frame[data-theme]{--ot-brand:var(--ot-accent);--ot-brand-hover:var(--ot-accent-hover);--ot-fg-on-brand:var(--ot-fg-on-accent)}
@keyframes ot-campaign-sheen{from{background-position:100% 0}to{background-position:0% 0}}
@media (prefers-reduced-motion:no-preference){
.ot-campaign-frame h1{
background-image:linear-gradient(100deg,var(--ot-fg) 0%,var(--ot-fg) 38%,var(--ot-accent) 50%,var(--ot-fg) 62%,var(--ot-fg) 100%);
background-size:300% 100%;background-position:100% 0;
-webkit-background-clip:text;background-clip:text;color:transparent;
animation:fadeIn var(--ot-dur-slow) cubic-bezier(.16,1,.3,1) both,ot-campaign-sheen 4.5s cubic-bezier(.4,0,.3,1) 1 both;
animation-delay:100ms,800ms!important}
}
`

type Props = {
  locale:       Locale
  ctaLabel?:    string | null
  ctaUrl?:      string | null
  returnLabel?: string | null
  footerKey?:   string | null
  formKey?:     string | null
  formHeading?: string | null
  /** The editor's Visual Builder composition. */
  children:     ReactNode
}

/**
 * Frame for OT_CampaignLandingPage. The site shell is switched off for this type
 * (lib/shellMode.ts), so the page owns its whole viewport: a slim sticky strip,
 * the free composition, and a footer chosen on the page.
 *
 * The frame is pinned to the dark token set (data-theme="dark", the same scoping
 * the site footer and dark sections use), so it draws every color from the site's
 * ThemeManager yet reads as a deliberate, cinematic surface rather than a
 * standard page. The strip is not site navigation: its only exits are the return
 * link and the campaign's own call to action.
 */
export default async function CampaignLandingFrame({
  locale, ctaLabel, ctaUrl, returnLabel, footerKey, formKey, formHeading, children,
}: Props) {
  const [settings, footerBlock] = await Promise.all([
    getRequestDomain().then(d => getSiteSettings(d, locale)),
    footerKey ? getCampaignFooter(footerKey, locale) : Promise.resolve(null),
  ])

  const siteName    = (settings?.siteName as string | undefined) ?? ''
  const logoSrc     = settings?.logo?.url?.default as string | undefined
  const logoAlt     = (settings?.logoAlt as string | undefined) ?? siteName
  const logoInvert  = settings?.logoInvertDark === true
  const homeHref    = localizedHref('/', locale)
  const returnText  = returnLabel || t(locale, 'campaignLanding.returnToSite')
  const showCta     = !!(ctaLabel && ctaUrl)

  const returnLink = (
    <Link
      href={homeHref}
      className="group inline-flex min-h-11 shrink-0 items-center gap-xs whitespace-nowrap rounded-ot-control text-[0.7rem] sm:text-label font-semibold uppercase tracking-label text-fg-muted transition-colors duration-200 ease-quick hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <ArrowLeft aria-hidden className="size-4 transition-transform duration-200 ease-quick group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      {returnLabel ? returnText : (
        <>
          <span className="sm:hidden">{t(locale, 'campaignLanding.returnShort')}</span>
          <span className="hidden sm:inline">{returnText}</span>
        </>
      )}
    </Link>
  )

  return (
    <div data-theme="dark" className="ot-campaign-frame flex min-h-dvh flex-col bg-canvas text-fg">
      <style>{CAMPAIGN_CSS}</style>
      <header
        aria-label={t(locale, 'campaignLanding.strip')}
        className="sticky top-0 z-40 border-b border-fg/10 bg-canvas"
      >
        <div className="mx-auto flex h-[var(--ot-site-header-h)] max-w-[88rem] items-center justify-between gap-md px-md lg:px-xl">
          <div className="flex min-w-0 items-center gap-md">
            {returnLink}
            {logoSrc && (
              <>
                <span aria-hidden className="hidden h-5 w-px bg-fg/20 sm:block" />
                {/* Decorative here: the strip is not navigation, so the mark is not a link. */}
                <LogoImage
                  src={logoSrc}
                  alt={logoAlt}
                  containerClass="hidden h-7 max-w-[160px] flex-shrink-0 sm:block"
                  imgClass={['h-full w-auto max-w-full object-contain object-left', logoInvert ? 'logo-invert-dark' : ''].filter(Boolean).join(' ')}
                />
              </>
            )}
          </div>
          {showCta && (
            <Button variant="accent" size="sm" href={ctaUrl!} className="shrink-0 whitespace-nowrap !px-md !text-[0.7rem] sm:!px-7 sm:!text-label">
              {ctaLabel}
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {formKey && (
        // Anchor target for the strip button (#request-information); scroll-mt clears the sticky strip.
        <section id="request-information" aria-label={formHeading || t(locale, 'campaignLanding.formHeading')} className="scroll-mt-[var(--ot-site-header-h)] bg-surface text-fg">
          <div className="mx-auto max-w-3xl px-md py-xl lg:py-2xl">
            {/* The form block carries its own title; a heading here is optional and author-supplied. */}
            {formHeading && (
              <h2 id="campaign-form-heading" className="mb-lg text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-light leading-[1.05] tracking-[-0.02em]">
                {formHeading}
              </h2>
            )}
            <div>
              <OptiFormsContainerDataAdapter
                content={{ _metadata: { key: formKey } }}
                displaySettings={{ contentWidth: 'default', verticalSpacing: 'none', backgroundColor: 'none' }}
              />
            </div>
          </div>
        </section>
      )}

      {footerBlock ? (
        <>
          <div className="border-t border-fg/10">
            <div className="mx-auto max-w-[88rem] px-md py-sm lg:px-xl">{returnLink}</div>
          </div>
          <Footer footerBlock={footerBlock} />
        </>
      ) : (
        <footer className="border-t border-fg/10">
          <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-md px-md py-lg text-label tracking-label text-fg-muted lg:px-xl">
            {returnLink}
            <p>© {new Date().getFullYear()} {siteName}. {t(locale, 'campaignLanding.minimalFooter')}</p>
          </div>
        </footer>
      )}
    </div>
  )
}
