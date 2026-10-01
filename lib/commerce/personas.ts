import type { OrderAddress } from '@/lib/commerce/types'

/**
 * Fictitious demo shoppers for the mock storefront's "Sign in" picker.
 *
 * Demo-site rules these follow:
 *  - Invented people on the reserved example.com domain (RFC 2606) with
 *    made-up addresses — never real PII.
 *  - Only the `segment` leaves the profile (as the ot_persona cookie) so
 *    personalisation can target "circle" / "reserve" without knowing who.
 *  - Signing in only pre-fills checkout; everything stays in the browser and
 *    the global demo reset signs out.
 */
export type PersonaSegment = 'new' | 'circle' | 'reserve'

export type DemoPersona = {
  id:       string
  segment:  PersonaSegment
  initials: string
  address:  OrderAddress
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'jordan', segment: 'new', initials: 'JA',
    address: { firstName: 'Jordan', lastName: 'Avery', email: 'jordan.avery@example.com', line1: '418 Hudson Street, Apt 5C', city: 'New York, NY', postcode: '10014', country: 'United States' },
  },
  {
    id: 'priya', segment: 'circle', initials: 'PS',
    address: { firstName: 'Priya', lastName: 'Shah', email: 'priya.shah@example.com', line1: '2150 N Clark Street', city: 'Chicago, IL', postcode: '60614', country: 'United States' },
  },
  {
    id: 'eleanor', segment: 'reserve', initials: 'EM',
    address: { firstName: 'Eleanor', lastName: 'Marsh', email: 'eleanor.marsh@example.com', line1: '14 Chiltern Street', city: 'London', postcode: 'W1U 7PZ', country: 'United Kingdom' },
  },
]

export const DEFAULT_PERSONA_ID = 'jordan'

export function getPersona(id: string | null | undefined): DemoPersona | null {
  return DEMO_PERSONAS.find((p) => p.id === id) ?? null
}

/** The published mock test card (CheckoutView accepts only this). */
export const TEST_CARD = { number: '4242 4242 4242 4242', expiry: '12/29', cvc: '123' }
