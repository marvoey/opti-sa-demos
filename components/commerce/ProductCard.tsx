'use client'

import Image from 'next/image'
import { Heart } from 'lucide-react'
import Price from '@/components/commerce/Price'
import { useCommerce } from '@/components/commerce/CommerceProvider'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { localizedHref } from '@/lib/i18n/config'
import { trackWishlistAdd } from '@/lib/commerce/track'
import type { ProductCardData } from '@/lib/commerce/card'
import type { MessageKey } from '@/lib/i18n/t'

const MAX_SWATCHES = 4

type Props = {
  product:   ProductCardData
  /** Above-the-fold cards load eagerly. */
  priority?: boolean
  /** Image aspect ratio. Portrait (4:5) is the retail default. */
  aspect?:   'portrait' | 'square'
  sizes?:    string
}

/**
 * The storefront's product tile — used by the PLP, catalog recommendations and
 * the wishlist. Deliberately quiet: image-led, one line of name, one of price,
 * swatches as small dots. The second image crossfades in on hover (opacity
 * only, motion-safe). The wishlist heart is a real toggle button layered over
 * the link (not nested in it), with a 44px target.
 */
export default function ProductCard({ product, priority = false, aspect = 'portrait', sizes }: Props) {
  const { t, locale } = useTranslation()
  const { enabled, state, toggleWishlist } = useCommerce()
  const saved = state.wishlist.includes(product.handle)
  const href = localizedHref(product.url, locale)
  const badge = product.badges.find((b) => b !== 'signature') ?? null
  const extraSwatches = product.colours.length - MAX_SWATCHES

  const onHeart = () => {
    if (toggleWishlist(product.handle)) trackWishlistAdd(product.handle)
  }

  return (
    <article className="group relative flex w-full flex-col">
      <a
        href={href}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        aria-label={t('commerce.viewProduct', { name: product.name })}
      >
        <div className={`relative w-full overflow-hidden bg-surface ${aspect === 'square' ? 'aspect-square' : 'aspect-4/5'}`}>
          {product.image ? (
            <>
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority={priority}
                sizes={sizes ?? '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'}
                className="object-cover motion-safe:transition-transform motion-safe:duration-700 ease-kinetic motion-safe:group-hover:scale-[1.03]"
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage}
                  alt=""
                  aria-hidden
                  fill
                  sizes={sizes ?? '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'}
                  className="object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-500 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-end p-md" aria-hidden>
              <span className="text-label uppercase tracking-label text-fg-muted">{product.name}</span>
            </div>
          )}
          {badge && (
            <span
              className={`absolute left-sm top-sm px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-label ${
                badge === 'archive' ? 'bg-canvas/90 text-fg-muted' : 'bg-canvas/90 text-fg'
              }`}
            >
              {t(`commerce.badge_${badge}` as MessageKey)}
            </span>
          )}
        </div>

        <div className="mt-sm flex flex-col gap-1 pr-10">
          <h3 className="text-body font-medium leading-snug text-fg text-pretty">{product.name}</h3>
          <Price price={product.price} locale={locale} size="sm" labels={{ was: t('commerce.was'), now: t('commerce.now') }} />
        </div>
      </a>

      {product.colours.length > 1 && (
        <ul className="mt-2 flex items-center gap-1.5" aria-label={t('commerce.colour')}>
          {product.colours.slice(0, MAX_SWATCHES).map((c) => (
            <li key={c.code} title={c.name} className="h-3 w-3 border border-fg/20" style={{ backgroundColor: c.hex }}>
              <span className="sr-only">{c.name}</span>
            </li>
          ))}
          {extraSwatches > 0 && <li className="text-xs text-fg-muted">+{extraSwatches}</li>}
        </ul>
      )}

      {enabled && (
        <button
          type="button"
          onClick={onHeart}
          aria-pressed={saved}
          aria-label={t(saved ? 'commerce.removeFromWishlist' : 'commerce.addToWishlist', { name: product.name })}
          className="absolute right-xs top-xs inline-flex h-11 w-11 items-center justify-center text-fg motion-safe:transition-transform duration-150 ease-quick hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand"
        >
          <Heart size={18} strokeWidth={1.75} aria-hidden className={saved ? 'fill-fg' : ''} />
        </button>
      )}
    </article>
  )
}
