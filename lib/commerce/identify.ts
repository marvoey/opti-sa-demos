import { setFxAttribute } from '@/lib/fx/browser-client'
import { trackSignIn } from '@/lib/commerce/track'
import type { DemoPersona } from '@/lib/commerce/personas'

/**
 * Identify a signed-in demo persona to ODP and FX (browser only).
 *
 * ODP: zaius.customer() keyed by the persona's example.com email. The ODP web
 * SDK's vuid joins it to the fs_user_id the FX ODP manager identifies, so the
 * server's fetchQualifiedSegments() sees the persona's ODP segments.
 * FX: `loyalty_tier` goes on the browser user context (events carry it); the
 * server reads the same value from the ot_persona cookie for decide().
 *
 * loyalty_tier / home_city / home_country are custom ODP customer fields
 * (APP-006), listed in ODP_CUSTOMER_FIELDS and printed by `yarn fx:events`.
 */
export function identifyPersona(p: DemoPersona): void {
  if (typeof window === 'undefined') return
  try {
    window.zaius?.customer(
      { email: p.address.email },
      {
        first_name:   p.address.firstName,
        last_name:    p.address.lastName,
        loyalty_tier: p.segment,
        home_city:    p.address.city,
        home_country: p.address.country,
      },
    )
  } catch { /* ODP not loaded */ }
  setFxAttribute('loyalty_tier', p.segment)
  trackSignIn(p.segment)
}

export function forgetPersona(): void {
  setFxAttribute('loyalty_tier', null)
}
