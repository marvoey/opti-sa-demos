import 'server-only'
import { cache } from 'react'
import type { Category, Colour, CurrencyCode, Money, Product, ProductGender, Variant } from '@/lib/commerce/types'
import localCatalog from '@/data/catalog/apparel.json'

/**
 * Product catalog reader.
 *
 * The catalog is NOT CMS content — it lives in an Optimizely Graph external
 * content source (id `ret`, types `ret_Product` / `ret_Category`), seeded by
 * scripts/catalog/push-catalog.mjs and, later, by an OCP app (backlog
 * APP-002/003). Pages query it alongside CMS content through the same Graph
 * single key, which is the "one graph over CMS + commerce data" demo story.
 *
 * Two providers sit behind one interface:
 *   - `graph` (default) — cached Graph GET queries, tagged `catalog` so
 *     /api/revalidate/catalog can bust them after a re-push.
 *   - `local` — reads data/catalog/apparel.json directly. Selected with
 *     CATALOG_SOURCE=local, and used automatically as a fallback if a Graph
 *     read fails, so the demo never renders an empty store.
 *
 * The whole catalog is small (48 products), so every read loads the full
 * catalog once per request (React cache + fetch cache) and filters in memory.
 */

const GRAPH_URL = 'https://cg.optimizely.com/content/v2'
const REVALIDATE_SECONDS = 300
export const CATALOG_CACHE_TAG = 'catalog'

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,79}$/

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle)
}

// ─── Graph provider ────────────────────────────────────────────────────────────

const PRICE_FIELDS = 'Currency Amount CompareAt'

const PRODUCT_FIELDS = `
  Handle StyleId CatalogId Brand Name Description Gender PrimaryCategory
  CategoryHandles Collections Badges Materials Care Fit FitNotes Traits
  Rating ReviewCount SortRank LaunchedAt Url Sizes PairsWith
  Colours { Code Name Hex Images }
  Variants { Sku ColourCode Size Stock Prices { ${PRICE_FIELDS} } }
  FromPrices { ${PRICE_FIELDS} }
`

const PRODUCTS_QUERY = `
  query CatalogProducts($catalogId: String, $cursor: String) {
    ret_Product(where: { CatalogId: { eq: $catalogId } }, limit: 100, cursor: $cursor) {
      cursor
      items { ${PRODUCT_FIELDS} }
    }
  }
`

const CATEGORIES_QUERY = `
  query CatalogCategories($catalogId: String) {
    ret_Category(where: { CatalogId: { eq: $catalogId } }, limit: 100) {
      items { Handle Name ParentHandle Gender Url SortRank }
    }
  }
`

type GraphResponse<T> = { data?: T; errors?: { message: string }[] }

async function graphGet<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const key = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY
  if (!key) throw new Error('OPTIMIZELY_GRAPH_SINGLE_KEY is not set')
  // GET (not POST) so Next's fetch cache stores the response under the tag.
  const url = `${GRAPH_URL}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(JSON.stringify(variables))}`
  const res = await fetch(url, {
    headers: { Authorization: `epi-single ${key}` },
    next: { revalidate: REVALIDATE_SECONDS, tags: [CATALOG_CACHE_TAG] },
  })
  if (!res.ok) throw new Error(`Catalog Graph request failed: HTTP ${res.status}`)
  const json = (await res.json()) as GraphResponse<T>
  if (json.errors?.length) throw new Error(`Catalog Graph error: ${json.errors[0].message}`)
  if (!json.data) throw new Error('Catalog Graph returned no data')
  return json.data
}

// Catalog images are stored as instance-relative DAM paths (/globalassets/…)
// so one dataset works on every CMS instance; resolve them against the CMS host.
const CMS_ORIGIN = (process.env.OPTIMIZELY_CMS_URL ?? '').replace(/\/+$/, '')
const resolveImage = (src: string): string => (src.startsWith('/') && CMS_ORIGIN ? CMS_ORIGIN + src : src)
const resolveColours = (colours: Colour[]): Colour[] => colours.map((c) => ({ ...c, images: c.images.map(resolveImage) }))

/* eslint-disable @typescript-eslint/no-explicit-any */
const toMoney = (p: any): Money => ({
  currency:  p.Currency as CurrencyCode,
  amount:    Number(p.Amount) || 0,
  compareAt: p.CompareAt == null ? null : Number(p.CompareAt),
})

function fromGraphProduct(p: any): Product {
  return {
    handle:          p.Handle,
    styleId:         p.StyleId ?? '',
    catalogId:       p.CatalogId,
    brand:           p.Brand ?? '',
    name:            p.Name ?? '',
    description:     p.Description ?? '',
    gender:          (p.Gender ?? 'unisex') as ProductGender,
    primaryCategory: p.PrimaryCategory ?? '',
    categoryHandles: p.CategoryHandles ?? [],
    collections:     p.Collections ?? [],
    badges:          p.Badges ?? [],
    materials:       p.Materials ?? [],
    care:            p.Care ?? [],
    fit:             p.Fit ?? null,
    fitNotes:        p.FitNotes ?? '',
    traits:          p.Traits ?? [],
    rating:          Number(p.Rating) || 0,
    reviewCount:     Number(p.ReviewCount) || 0,
    sortRank:        Number(p.SortRank) || 0,
    launchedAt:      p.LaunchedAt ?? '',
    url:             p.Url ?? `/products/${p.Handle}`,
    colours:         resolveColours((p.Colours ?? []).map((c: any): Colour => ({ code: c.Code, name: c.Name, hex: c.Hex, images: c.Images ?? [] }))),
    sizes:           p.Sizes ?? [],
    variants:        (p.Variants ?? []).map((v: any): Variant => ({
      sku: v.Sku, colourCode: v.ColourCode, size: v.Size, stock: Number(v.Stock) || 0, prices: (v.Prices ?? []).map(toMoney),
    })),
    fromPrices:      (p.FromPrices ?? []).map(toMoney),
    pairsWith:       p.PairsWith ?? [],
  }
}

const fromGraphCategory = (c: any): Category => ({
  handle: c.Handle, name: c.Name, parentHandle: c.ParentHandle ?? null,
  gender: (c.Gender ?? 'unisex') as ProductGender, url: c.Url, sortRank: Number(c.SortRank) || 0,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

async function graphProducts(catalogId: string): Promise<Product[]> {
  const out: Product[] = []
  let cursor = ''
  // Graph caps a page at 100; follow the cursor (bounded) for larger catalogs.
  for (let page = 0; page < 10; page++) {
    const data = await graphGet<{ ret_Product: { cursor?: string; items: unknown[] } }>(PRODUCTS_QUERY, { catalogId, cursor })
    const items = data.ret_Product?.items ?? []
    out.push(...items.map(fromGraphProduct))
    if (items.length < 100 || !data.ret_Product.cursor) break
    cursor = data.ret_Product.cursor
  }
  return out
}

async function graphCategories(catalogId: string): Promise<Category[]> {
  const data = await graphGet<{ ret_Category: { items: unknown[] } }>(CATEGORIES_QUERY, { catalogId })
  return (data.ret_Category?.items ?? []).map(fromGraphCategory)
}

// ─── Local provider ────────────────────────────────────────────────────────────

type LocalCatalog = { catalogId: string; categories: Category[]; products: Product[] }
const RAW_LOCAL = localCatalog as unknown as LocalCatalog
const LOCAL: LocalCatalog = { ...RAW_LOCAL, products: RAW_LOCAL.products.map((p) => ({ ...p, colours: resolveColours(p.colours) })) }

const localProducts   = (catalogId: string) => (LOCAL.catalogId === catalogId ? LOCAL.products : [])
const localCategories = (catalogId: string) => (LOCAL.catalogId === catalogId ? LOCAL.categories : [])

// ─── Provider selection (per request) ──────────────────────────────────────────

const useLocal = () => process.env.CATALOG_SOURCE === 'local'

const loadProducts = cache(async (catalogId: string): Promise<Product[]> => {
  if (useLocal()) return localProducts(catalogId)
  try {
    const products = await graphProducts(catalogId)
    if (products.length) return products
    console.warn(`[catalog] Graph returned 0 products for "${catalogId}" — using local catalog`)
  } catch (err) {
    console.warn(`[catalog] Graph read failed — using local catalog: ${(err as Error).message}`)
  }
  return localProducts(catalogId)
})

const loadCategories = cache(async (catalogId: string): Promise<Category[]> => {
  if (useLocal()) return localCategories(catalogId)
  try {
    const categories = await graphCategories(catalogId)
    if (categories.length) return categories
  } catch (err) {
    console.warn(`[catalog] Graph category read failed — using local catalog: ${(err as Error).message}`)
  }
  return localCategories(catalogId)
})

// ─── Public API ────────────────────────────────────────────────────────────────

export type ProductQuery = {
  category?:   string
  gender?:     ProductGender
  collection?: string
  badge?:      string
}

export async function getProducts(catalogId: string, q: ProductQuery = {}): Promise<Product[]> {
  const all = await loadProducts(catalogId)
  return all
    .filter((p) =>
      (!q.category   || p.categoryHandles.includes(q.category)) &&
      (!q.gender     || p.gender === q.gender) &&
      (!q.collection || p.collections.includes(q.collection)) &&
      (!q.badge      || p.badges.includes(q.badge)))
    .sort((a, b) => a.sortRank - b.sortRank)
}

export async function getProductByHandle(catalogId: string, handle: string): Promise<Product | null> {
  if (!isValidHandle(handle)) return null
  const all = await loadProducts(catalogId)
  return all.find((p) => p.handle === handle) ?? null
}

/** Returns products in the order of `handles`, skipping unknown/invalid ones. */
export async function getProductsByHandles(catalogId: string, handles: string[]): Promise<Product[]> {
  const all = await loadProducts(catalogId)
  const byHandle = new Map(all.map((p) => [p.handle, p]))
  return handles.filter(isValidHandle).map((h) => byHandle.get(h)).filter((p): p is Product => !!p)
}

export async function getCategories(catalogId: string): Promise<Category[]> {
  const cats = await loadCategories(catalogId)
  return [...cats].sort((a, b) => a.sortRank - b.sortRank)
}

export async function getCategory(catalogId: string, handle: string): Promise<Category | null> {
  return (await getCategories(catalogId)).find((c) => c.handle === handle) ?? null
}

/**
 * Related products for "complete the look": the product's curated pairings
 * first, then same-category items, excluding the product and `exclude`.
 */
export async function getRelated(catalogId: string, product: Product, n = 4, exclude: string[] = []): Promise<Product[]> {
  const skip = new Set([product.handle, ...exclude])
  const paired = (await getProductsByHandles(catalogId, product.pairsWith)).filter((p) => !skip.has(p.handle))
  paired.forEach((p) => skip.add(p.handle))
  const sameCategory = (await getProducts(catalogId, { category: product.primaryCategory }))
    .filter((p) => !skip.has(p.handle) && !p.badges.includes('archive'))
  return [...paired, ...sameCategory].slice(0, n)
}

export async function getAllHandles(catalogId: string): Promise<string[]> {
  return (await loadProducts(catalogId)).map((p) => p.handle)
}
