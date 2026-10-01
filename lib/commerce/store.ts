import type { CartLine, Order } from '@/lib/commerce/types'
import { isCatalogStorageKey, purgeLegacyStorage, readStored, writeBagCountCookie, writePersonaSegmentCookie, writeStored } from '@/lib/commerce/storage'
import { getPersona } from '@/lib/commerce/personas'

/**
 * External store for the mock storefront, consumed with useSyncExternalStore.
 * State lives in browser storage (per catalog; see storage.ts); the store keeps an in-memory copy
 * so snapshots are referentially stable between changes.
 */
export type CommerceState = {
  bag:       CartLine[]
  wishlist:  string[]
  viewed:    string[]
  lastOrder: Order | null
  /** Signed-in demo persona id (lib/commerce/personas.ts), or null for a guest. */
  persona:   string | null
  /** False on the server snapshot and the first hydration pass. */
  hydrated:  boolean
}

const EMPTY: CommerceState = { bag: [], wishlist: [], viewed: [], lastOrder: null, persona: null, hydrated: false }
const MAX_VIEWED = 12
const MAX_QTY = 10

export type CommerceStore = ReturnType<typeof createCommerceStore>

/**
 * `seed` pre-fills an EMPTY store (showcase demos only). Seeded values stay in
 * memory until the shopper changes something, so a demo never overwrites a
 * real bag.
 */
export function createCommerceStore(catalogId: string, seed?: Partial<Pick<CommerceState, 'bag' | 'wishlist'>>) {
  let state: CommerceState = EMPTY
  const listeners = new Set<() => void>()

  const load = (): CommerceState => ({
    bag:       readStored<CartLine[]>(catalogId, 'bag', seed?.bag ?? []),
    wishlist:  readStored<string[]>(catalogId, 'wishlist', seed?.wishlist ?? []),
    viewed:    readStored<string[]>(catalogId, 'viewed', []),
    lastOrder: readStored<Order | null>(catalogId, 'order', null),
    persona:   getPersona(readStored<string | null>(catalogId, 'persona', null))?.id ?? null,
    hydrated:  true,
  })

  if (typeof window !== 'undefined') {
    purgeLegacyStorage(catalogId)
    state = load()
  }

  const emit = () => listeners.forEach((l) => l())

  function set(next: Partial<CommerceState>) {
    state = { ...state, ...next, hydrated: true }
    if (next.bag) {
      writeStored(catalogId, 'bag', next.bag)
      writeBagCountCookie(next.bag.reduce((n, l) => n + l.quantity, 0))
    }
    if (next.wishlist) writeStored(catalogId, 'wishlist', next.wishlist)
    if (next.viewed) writeStored(catalogId, 'viewed', next.viewed)
    if (next.lastOrder !== undefined) writeStored(catalogId, 'order', next.lastOrder)
    if (next.persona !== undefined) {
      writeStored(catalogId, 'persona', next.persona)
      writePersonaSegmentCookie(getPersona(next.persona)?.segment ?? null)
    }
    emit()
  }

  const reload = () => { state = load(); emit() }

  return {
    getSnapshot:       () => state,
    getServerSnapshot: () => EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener)
      // Keep tabs in sync, and clear with the global demo reset (lib/demo/state.ts).
      const onStorage = (e: StorageEvent) => { if (e.key === null || isCatalogStorageKey(catalogId, e.key)) reload() }
      // localStorage.clear() in the reset doesn't reach sessionStorage or cookies.
      const onReset = () => { writeStored(catalogId, 'order', null); writeBagCountCookie(0); writePersonaSegmentCookie(null); reload() }
      window.addEventListener('storage', onStorage)
      window.addEventListener('demo:reset', onReset)
      return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('demo:reset', onReset)
      }
    },

    addLine(line: Omit<CartLine, 'quantity'>, quantity = 1): CartLine {
      const existing = state.bag.find((l) => l.sku === line.sku)
      const qty = Math.min(MAX_QTY, (existing?.quantity ?? 0) + quantity)
      const updated: CartLine = { ...line, quantity: qty }
      set({ bag: existing ? state.bag.map((l) => (l.sku === line.sku ? updated : l)) : [...state.bag, updated] })
      return updated
    },
    setQuantity(sku: string, quantity: number) {
      const q = Math.max(0, Math.min(MAX_QTY, Math.round(quantity)))
      set({ bag: q === 0 ? state.bag.filter((l) => l.sku !== sku) : state.bag.map((l) => (l.sku === sku ? { ...l, quantity: q } : l)) })
    },
    removeLine(sku: string) {
      set({ bag: state.bag.filter((l) => l.sku !== sku) })
    },
    toggleWishlist(handle: string): boolean {
      const has = state.wishlist.includes(handle)
      set({ wishlist: has ? state.wishlist.filter((h) => h !== handle) : [handle, ...state.wishlist] })
      return !has
    },
    recordView(handle: string) {
      if (state.viewed[0] === handle) return
      set({ viewed: [handle, ...state.viewed.filter((h) => h !== handle)].slice(0, MAX_VIEWED) })
    },
    completeOrder(order: Order) {
      set({ lastOrder: order, bag: [] })
    },
    signIn(personaId: string) {
      if (getPersona(personaId)) set({ persona: personaId })
    },
    signOut() {
      set({ persona: null })
    },
  }
}
