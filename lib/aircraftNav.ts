'use client'

import { useSyncExternalStore } from 'react'

// The fleet listing keeps its filters, sort, view and compare selection in the URL.
// When a visitor leaves for a model or comparison page, the listing's last URL is
// remembered for the tab so "Fleet" in the breadcrumb returns them to exactly
// where they were, not to a reset directory.
const KEY = 'aircraft-fleet-return'
const EVENT = 'aircraft-fleet-return-change'

export function saveFleetReturn(url: string) {
  try {
    sessionStorage.setItem(KEY, url)
    window.dispatchEvent(new Event(EVENT))
  } catch { /* storage unavailable: the plain fleet link still works */ }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}

/** The remembered fleet URL when it belongs to `fleetPath`, else `fleetPath`. */
export function useFleetReturn(fleetPath: string): string {
  const stored = useSyncExternalStore(
    subscribe,
    () => { try { return sessionStorage.getItem(KEY) } catch { return null } },
    () => null,
  )
  // Only trust a same-origin path under this locale's fleet route.
  return stored && (stored === fleetPath || stored.startsWith(`${fleetPath}?`)) ? stored : fleetPath
}
