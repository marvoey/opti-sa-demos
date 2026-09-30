import { trackConversion } from '@/lib/fx/track'
import type { CartLine, Order } from '@/lib/commerce/types'

/**
 * Storefront events, routed through the existing conversion pipeline
 * (lib/fx/track.ts → FX trackEvent → TRACK listener → ODP zaius.event), so they
 * become FX metrics and ODP events with no extra wiring.
 *
 * APP-008: once the OCP connector syncs product objects into ODP, switch these
 * to ODP's native commerce events — zaius.event('product', { action: 'detail' |
 * 'add_to_cart', product_id }) and zaius.event('order', { action: 'purchase',
 * order }) — instead of (not as well as) these, to avoid double counting.
 */
export function trackProductView(handle: string, name: string): void {
  trackConversion('product_view', { product_id: handle, product_name: name })
}

export function trackAddToCart(line: CartLine, currency: string, amountMinor: number): void {
  trackConversion('add_to_cart', {
    product_id: line.handle, sku: line.sku, quantity: line.quantity, currency, value: amountMinor / 100,
  })
}

export function trackWishlistAdd(handle: string): void {
  trackConversion('wishlist_add', { product_id: handle })
}

export function trackBeginCheckout(itemCount: number, currency: string, subtotalMinor: number): void {
  trackConversion('begin_checkout', { item_count: itemCount, currency, value: subtotalMinor / 100 })
}

export function trackPurchase(order: Order): void {
  trackConversion('purchase', {
    order_id: order.id,
    currency: order.currency,
    revenue:  order.total / 100,
    value:    order.total / 100,
    item_count: order.lines.reduce((n, l) => n + l.quantity, 0),
  })
}
