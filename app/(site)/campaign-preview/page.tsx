import type { Metadata } from 'next'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import CampaignLandingFrame from '@/components/campaign/CampaignLandingFrame'
import HeroBlock from '@/components/blocks/HeroBlock'
import StatBlock from '@/components/blocks/StatBlock'
import QuoteBlock from '@/components/blocks/QuoteBlock'
import AccordionBlock from '@/components/blocks/AccordionBlock'
import BannerBlock from '@/components/blocks/BannerBlock'
import Button from '@/components/ui/Button'
import { getRequestLocale } from '@/lib/optimizely'
import { CAMPAIGN_LOOKS, resolveLook } from '@/lib/campaign-looks'

/**
 * Live demo of the Campaign Landing Page type: the real frame wrapped around a sample
 * composition built from the real blocks, with the look, accent and motion switchable
 * from the URL. This is what the Showcase "Campaign Landing" page links to, and it is
 * the quickest way to show a prospect how one page type can wear four identities.
 *
 *   /campaign-preview?look=neon&accent=%23e4572e&motion=calm
 *
 * Not a CMS page: it renders from static copy, so it never needs content in Graph.
 */
export const metadata: Metadata = {
  title: 'Campaign Landing Page demo',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const LABELS: Record<(typeof CAMPAIGN_LOOKS)[number], string> = {
  blueprint: 'Blueprint', neon: 'Neon', comic: 'Comic', stage: 'Stage',
}

function one(v: string | string[] | undefined) { return typeof v === 'string' ? v : undefined }

function HeroArt() {
  // Abstract and vertical-neutral: concentric rings and a tilted bar, all token colours.
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="400" height="300" fill="var(--ot-surface)" />
      <circle cx="270" cy="150" r="118" fill="none" stroke="var(--ot-accent)" strokeWidth="2" opacity="0.9" />
      <circle cx="270" cy="150" r="82" fill="var(--ot-accent)" opacity="0.92" />
      <circle cx="270" cy="150" r="46" fill="var(--ot-canvas)" />
      <rect x="-20" y="196" width="320" height="26" fill="var(--ot-fg)" opacity="0.9" transform="rotate(-8 140 209)" />
      <circle cx="74" cy="76" r="22" fill="none" stroke="var(--ot-fg)" strokeWidth="2" opacity="0.6" />
    </svg>
  )
}

const FIELD = 'w-full rounded-ot-control border border-fg/40 bg-canvas px-md py-sm text-body text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function DemoForm() {
  return (
    <form className="grid gap-md" aria-label="Request an invitation" action="#request-information">
      <div className="grid gap-md sm:grid-cols-2">
        <label className="grid gap-xs text-label font-semibold uppercase tracking-label">
          First name
          <input className={FIELD} name="first" autoComplete="given-name" placeholder="Alex" />
        </label>
        <label className="grid gap-xs text-label font-semibold uppercase tracking-label">
          Last name
          <input className={FIELD} name="last" autoComplete="family-name" placeholder="Morgan" />
        </label>
      </div>
      <label className="grid gap-xs text-label font-semibold uppercase tracking-label">
        Work email
        <input className={FIELD} name="email" type="email" autoComplete="email" placeholder="alex@company.com" />
      </label>
      <label className="grid gap-xs text-label font-semibold uppercase tracking-label">
        Which day suits you?
        <select className={FIELD} name="day" defaultValue="">
          <option value="" disabled>Choose a day</option>
          <option>Friday</option>
          <option>Saturday</option>
          <option>Sunday</option>
        </select>
      </label>
      <div><Button variant="accent" type="button">Request an invitation</Button></div>
    </form>
  )
}

export default async function CampaignPreviewPage({ searchParams }: Props) {
  const sp     = await searchParams
  const locale = await getRequestLocale()
  const look   = resolveLook(one(sp.look))
  const accent = one(sp.accent)
  const motion = one(sp.motion)

  return (
    <>
      {/* Demo chrome only (not part of the page type): switch looks. */}
      <nav aria-label="Switch look" className="flex flex-wrap items-center gap-sm border-b border-fg/10 bg-canvas px-md py-sm text-label text-fg-muted lg:px-xl">
        <span className="font-semibold uppercase tracking-label">Look</span>
        {CAMPAIGN_LOOKS.map(l => (
          <Link
            key={l}
            href={{ pathname: '/campaign-preview', query: { look: l, ...(accent ? { accent } : {}), ...(motion ? { motion } : {}) } }}
            aria-current={l === look ? 'page' : undefined}
            className={`rounded-ot-control border px-md py-xs font-semibold uppercase tracking-label transition-colors ${l === look ? 'border-brand bg-brand text-fg-on-brand' : 'border-fg/25 hover:border-fg/60 hover:text-fg'}`}
          >
            {LABELS[l]}
          </Link>
        ))}
      </nav>

      <CampaignLandingFrame
        locale={locale}
        look={look}
        accentOverride={accent}
        motionLevel={motion}
        ctaLabel="Request an invitation"
        ctaUrl="#request-information"
        formHeading="Request an invitation"
        formSlot={<DemoForm />}
      >
        <HeroBlock
          eyebrow="Preview weekend · October 24 to 26"
          headline="Come see it first"
          body="Three days of private walkthroughs, live demonstrations and time with the people who built it. Places are held for guests we invite."
          primaryCta={{ label: 'Request an invitation', href: '#request-information' }}
          secondaryCta={{ label: 'See the schedule', href: '#schedule' }}
          visual={<HeroArt />}
          styleOptions={{ direction: 'editorialSplit', layout: 'imageRight', color: 'brand', animation: 'fade' }}
        />

        <div id="schedule" />
        <StatBlock
          eyebrow="The weekend in numbers"
          heading="Small on purpose"
          stats={[
            { value: '3', label: 'Days', context: 'Friday through Sunday' },
            { value: '120', label: 'Guests', context: 'By invitation only' },
            { value: '12', label: 'Live sessions', context: 'Led by the product team' },
          ]}
          styleOptions={{ columns: 3, color: 'canvas', animate: true }}
        />

        <QuoteBlock
          quote="It felt less like a launch and more like being let into the workshop. I left with answers I could not have found anywhere else."
          attribution={{ name: 'Jordan Ellis', title: 'Guest, last year’s preview' }}
          styleOptions={{ treatment: 'default', color: 'canvas', alignment: 'left', size: 'large' }}
        />

        <AccordionBlock
          eyebrow="Before you request"
          headline="Good to know"
          items={[
            { question: 'Who is invited?', answer: 'Customers, partners and members of the press. Every request is reviewed and confirmed individually, usually within two working days.' },
            { question: 'What does it cost?', answer: 'Nothing. Travel and accommodation are at your own expense; we can recommend nearby places to stay.' },
            { question: 'Can I bring a colleague?', answer: 'Yes. Add their name in the request and we will confirm both places together.' },
          ]}
          styleOptions={{ color: 'canvas', borderStyle: 'ruled', openMode: 'single' }}
        />

        <BannerBlock
          heading="Seats are limited"
          eyebrow="Closes October 17"
          primaryCta={{ label: 'Request an invitation', href: '#request-information' }}
          styleOptions={{ color: 'brand', alignment: 'center', size: 'display', treatment: 'none' }}
        />
      </CampaignLandingFrame>
    </>
  )
}
