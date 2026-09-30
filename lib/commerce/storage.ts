/**
 * Browser persistence for the mock storefront. Everything is namespaced per
 * catalog (`ot-commerce:<catalogId>:<key>`) so two demo sites on the same origin
 * (e.g. localhost during development) never share a bag. All access is wrapped:
 * private mode / blocked storage degrades to in-memory state, never an error.
 */
export const STORAGE_KEYS = ['bag', 'wishlist', 'viewed', 'order'] as const
export type StorageKey = (typeof STORAGE_KEYS)[number]

/** Cookie mirror of the bag count so the header can render it server-side. */
export const BAG_COUNT_COOKIE = 'ot_bag_count'

const nsKey = (catalogId: string, key: StorageKey) => `ot-commerce:${catalogId}:${key}`

export function readStored<T>(catalogId: string, key: StorageKey, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(nsKey(catalogId, key))
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStored(catalogId: string, key: StorageKey, value: unknown): void {
  try {
    window.localStorage.setItem(nsKey(catalogId, key), JSON.stringify(value))
  } catch {
    /* storage full or blocked — state stays in memory for this session */
  }
}

export function writeBagCountCookie(count: number): void {
  try {
    document.cookie = `${BAG_COUNT_COOKIE}=${Math.max(0, Math.min(count, 999))}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

/** True when `key` (a raw localStorage key from a StorageEvent) belongs to this catalog. */
export function isCatalogStorageKey(catalogId: string, rawKey: string | null): boolean {
  return !!rawKey && rawKey.startsWith(`ot-commerce:${catalogId}:`)
}
