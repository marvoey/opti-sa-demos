import { AsyncLocalStorage } from 'node:async_hooks'

/** One Graph round-trip, exactly as the SDK sent it and Graph answered. */
export interface GraphCall {
  operation: string
  query: string
  variables: unknown
  status: number
  ms: number
  bytes: number
  /** Parsed response body; null when it exceeds MAX_BODY (see `truncated`). */
  response: unknown
  truncated: boolean
}

const MAX_BODY = 160_000
const store = new AsyncLocalStorage<GraphCall[]>()

// Lens requests run one at a time: the capture swaps globalThis.fetch for the
// duration of the call, and serializing keeps overlapping lens requests from
// restoring each other's wrapper. Normal site traffic is untouched (the wrapper
// passes through anything outside a capture scope).
let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs `fn` and records every Optimizely Graph POST it makes. The recorded
 * query text is whatever the SDK or lib/aircraft.ts actually sent, so the
 * panel can never drift from the real data path.
 */
export function captureGraph<T>(fn: () => Promise<T>): Promise<{ result: T; calls: GraphCall[] }> {
  const run = async () => {
    const calls: GraphCall[] = []
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const sink = store.getStore()
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (!sink || !/optimizely\.com|cg\.optimizely/.test(url) || init?.method !== 'POST' || typeof init.body !== 'string') {
        return original(input, init)
      }
      const started = Date.now()
      const res = await original(input, init)
      try {
        const body = JSON.parse(init.body) as { query?: string; variables?: unknown }
        const text = await res.clone().text()
        const big = text.length > MAX_BODY
        sink.push({
          operation: /(?:query|mutation)\s+(\w+)/.exec(body.query ?? '')?.[1] ?? 'anonymous',
          query: body.query ?? '',
          variables: body.variables ?? {},
          status: res.status,
          ms: Date.now() - started,
          bytes: text.length,
          response: big ? null : JSON.parse(text),
          truncated: big,
        })
      } catch { /* recording must never break the request */ }
      return res
    }) as typeof fetch
    try {
      const result = await store.run(calls, fn)
      return { result, calls }
    } finally {
      globalThis.fetch = original
    }
  }
  const next = queue.then(run, run)
  queue = next.catch(() => undefined)
  return next
}
