import type { Money } from '@/lib/commerce/types'

/**
 * Price treatment seam for Feature Experimentation price tests (backlog
 * APP-019: base / sale / VIP-tier price variables).
 *
 * Today it is the identity: catalog prices are shown as-is. When the FX flag
 * exists, resolve it SERVER-side (lib/fx/variant-resolver.ts already builds the
 * user context with ODP segments) and return the variable values here — the
 * PDP and PLP apply the treatment before rendering, so a test variant never
 * flickers from the default price on the client.
 */
export type PriceTreatment = {
  /** Percentage off the displayed price (0–100). */
  discountPct:   number
  /** Show the pre-discount amount as a compare-at strikethrough. */
  showCompareAt: boolean
}

export const DEFAULT_PRICE_TREATMENT: PriceTreatment = { discountPct: 0, showCompareAt: true }

export async function getPriceTreatment(): Promise<PriceTreatment> {
  return DEFAULT_PRICE_TREATMENT
}

export function applyTreatment(price: Money, t: PriceTreatment): Money {
  if (!t.discountPct) return t.showCompareAt ? price : { ...price, compareAt: null }
  const amount = Math.round((price.amount * (100 - t.discountPct)) / 100 / 100) * 100
  return { ...price, amount, compareAt: t.showCompareAt ? price.compareAt ?? price.amount : null }
}
