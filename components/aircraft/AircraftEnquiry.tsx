import OptiFormsContainerDataAdapter from '@/cms/components/OptiFormsContainerData'
import { t } from '@/lib/i18n/t'

type Props = {
  formKey: string
  /** Author-supplied lead-in. Shown as a small label; the form carries the headline. */
  heading?: string | null
  locale: string
}

/**
 * The shared request-for-information form on an aircraft page.
 *
 * The section ground is the theme surface and the form card lifts off it on the
 * canvas color (white in a light theme), so the card reads as a distinct object
 * instead of surface-on-surface. The form already has its own headline, so the
 * authored heading is a quiet label with a short rule, not a second competing title.
 */
export default function AircraftEnquiry({ formKey, heading, locale }: Props) {
  return (
    <section
      aria-label={heading || t(locale, 'aircraft.enquiry')}
      className="bg-surface text-fg"
    >
      <div className="mx-auto max-w-3xl px-md py-lg lg:py-xl">
        {heading && (
          <p className="mb-md flex items-center gap-sm text-label font-semibold uppercase tracking-label text-fg-muted">
            <span aria-hidden className="h-px w-8 bg-fg/40" />
            {heading}
          </p>
        )}
        {/* --ot-form-card-bg lifts the card to the canvas color; the card's own outer margin is
            dropped because this section already provides the spacing. */}
        <div
          style={{ '--ot-form-card-bg': 'var(--ot-canvas)' } as React.CSSProperties}
          className="[&_[data-form-card]]:!my-0"
        >
          <OptiFormsContainerDataAdapter
            locale={locale}
            content={{ _metadata: { key: formKey } }}
            displaySettings={{ contentWidth: 'default', verticalSpacing: 'none', backgroundColor: 'none' }}
          />
        </div>
      </div>
    </section>
  )
}
