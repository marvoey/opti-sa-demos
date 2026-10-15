/**
 * lib/campaign-looks.ts
 *
 * The look model for OT_CampaignLandingPage. A "look" is a preset identity the
 * editor picks on the page; each look fixes its own mode (dark / light / drenched),
 * so there is deliberately no separate light/dark field.
 *
 * Pure and CMS-agnostic. The CSS for each look lives in
 * components/campaign/campaign-looks.css and reads the attributes this file
 * resolves (data-look, data-motion, data-fill) plus one inline variable, --cl-seed.
 *
 * Contrast strategy: every look pins its fills to fixed OKLCH lightness steps and
 * only takes HUE and a clamped CHROMA from the seed. Text on a fill therefore has a
 * known contrast no matter what colour the editor or the site supplies. The single
 * seed-dependent decision, Poster's deep vs bright drench, is made here, on the
 * server, from the seed's lightness.
 */
import { colorLightness } from '@/lib/theme-axes'

export const CAMPAIGN_LOOKS = ['cinematic', 'poster', 'daylight', 'stage'] as const
export type CampaignLook = (typeof CAMPAIGN_LOOKS)[number]
export const DEFAULT_CAMPAIGN_LOOK: CampaignLook = 'cinematic'

export const CAMPAIGN_MOTION_LEVELS = ['full', 'calm', 'still'] as const
export type CampaignMotion = (typeof CAMPAIGN_MOTION_LEVELS)[number]
export const DEFAULT_CAMPAIGN_MOTION: CampaignMotion = 'full'

/** Colour mode each look renders in (becomes the frame's data-theme). */
export const LOOK_MODE: Record<CampaignLook, 'dark' | 'light'> = {
  cinematic: 'dark',
  poster:    'dark',   // overridden per fill, see resolveCampaignAppearance
  daylight:  'light',
  stage:     'dark',
}

export function resolveLook(value: string | null | undefined): CampaignLook {
  return (CAMPAIGN_LOOKS as readonly string[]).includes(value ?? '')
    ? (value as CampaignLook)
    : DEFAULT_CAMPAIGN_LOOK
}

export function resolveMotion(value: string | null | undefined): CampaignMotion {
  return (CAMPAIGN_MOTION_LEVELS as readonly string[]).includes(value ?? '')
    ? (value as CampaignMotion)
    : DEFAULT_CAMPAIGN_MOTION
}

/**
 * Validates an editor-typed hex ("#c7b289", "c7b289", "#fb0") and normalises it to
 * "#rrggbb". Anything else returns null, so a typo falls back to the site colour
 * instead of injecting arbitrary text into a style attribute.
 */
export function sanitizeHex(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(v)) return `#${v.split('').map(c => c + c).join('').toLowerCase()}`
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v.toLowerCase()}`
  return null
}

/** Lightness at or above which a seed is "bright" and Poster drenches bright. */
const POSTER_BRIGHT_AT = 0.6

export type CampaignAppearance = {
  look:   CampaignLook
  motion: CampaignMotion
  /** data-theme for the frame: re-scopes every theme token to the right mode. */
  theme:  'dark' | 'light'
  /** Poster only: bright fill (dark ink) or deep fill (light ink). */
  fill:   'bright' | 'deep' | null
  /** The colour every look derives its palette from. Valid CSS colour. */
  seed:   string
}

/**
 * Resolves the page's appearance from the editor's fields and the site's colours.
 * Seed priority: valid accent override, then the site accent, then the site brand, then
 * the accent token the site renders by default.
 */
export function resolveCampaignAppearance(input: {
  look?:           string | null
  motion?:         string | null
  accentOverride?: string | null
  siteAccent?:     string | null
  siteBrand?:      string | null
}): CampaignAppearance {
  const look   = resolveLook(input.look)
  const motion = resolveMotion(input.motion)
  const seed =
    sanitizeHex(input.accentOverride) ??
    (input.siteAccent?.trim() || null) ??
    (input.siteBrand?.trim() || null) ??
    // No ThemeManager colours (e.g. a fresh localhost): defer to whatever accent the site
    // renders by default, so the look always matches the rest of its own site. This reads
    // --cl-site-accent, captured by the frame on a wrapper ABOVE the look scope: pointing
    // at var(--ot-accent) directly would be circular, since each look redefines it.
    'var(--cl-site-accent)'

  let fill: CampaignAppearance['fill'] = null
  let theme = LOOK_MODE[look]
  if (look === 'poster') {
    // A var() seed is the token default accent (L 0.82), which drenches bright.
    const l = colorLightness(seed) ?? 0.82
    fill  = l >= POSTER_BRIGHT_AT ? 'bright' : 'deep'
    theme = fill === 'bright' ? 'light' : 'dark'
  }
  return { look, motion, theme, fill, seed }
}
