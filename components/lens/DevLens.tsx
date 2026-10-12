/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, react-hooks/set-state-in-effect -- demo-only panel over loosely typed Graph JSON */
'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Dev lens: a demo drawer that opens the hood on the page. It re-runs the page's
 * real Graph calls through /api/lens and shows the query, the raw response, the
 * props the components receive, the schema.org output and the concierge contract.
 */

export type LensContext =
  | { kind: 'aircraft'; locale: string; aircraftKey: string }
  | { kind: 'listing'; locale: string }
  | { kind: 'compare'; locale: string; ids: string[] }

interface GraphCall { operation: string; query: string; variables: unknown; status: number; ms: number; bytes: number; response: unknown; truncated: boolean }
interface LensData {
  kind: string; locale: string; calls: GraphCall[]; props: any; contract: any
  components: { component: string; receives: string[] }[]
}

const TABS = [
  { id: 'model',    label: 'Model' },
  { id: 'contract', label: 'Contract' },
  { id: 'schema',   label: 'schema.org' },
  { id: 'consume',  label: 'Consume' },
  { id: 'platform', label: 'Platform' },
] as const
type TabId = (typeof TABS)[number]['id']

const GRAPH_URL = 'https://cg.optimizely.com/content/v2'
const LOCALIZED = new Set(['tagline', 'overviewHtml', 'keyFeatures', 'specSheetUrl'])

/** Strips the shared leading indent so template-literal queries read cleanly. */
const dedent = (q: string) => {
  const lines = q.replace(/^\n+|\s+$/g, '').split('\n')
  const pad = Math.min(...lines.slice(1).filter(l => l.trim()).map(l => l.match(/^ */)![0].length), Infinity)
  return [lines[0].trim(), ...lines.slice(1).map(l => l.slice(Number.isFinite(pad) ? Math.min(pad, 4) : 0))].join('\n')
}
const pretty = (v: unknown) => JSON.stringify(v, null, 2)

function Code({ text, label, maxH = 'max-h-72' }: { text: string; label?: string; maxH?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="overflow-hidden rounded-md border border-fg/15 bg-[oklch(0.2_0.012_250)]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-white/60">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) }}
          className="rounded px-2 py-0.5 font-semibold text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
        >{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className={`${maxH} overflow-auto p-3 font-mono text-[12px] leading-relaxed text-[oklch(0.92_0.01_250)]`}>{text}</pre>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fg text-xs font-bold text-canvas">{n}</span>
        <span className="mt-1 w-px flex-1 bg-fg/15" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-2 space-y-3 text-sm text-fg/80">{children}</div>
      </div>
    </section>
  )
}

const Pill = ({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'shared' | 'local' }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
    tone === 'shared' ? 'bg-brand/15 text-fg' : tone === 'local' ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/80'}`}>{children}</span>
)

const Note = ({ children }: { children: ReactNode }) => (
  <p className="rounded-md bg-fg/[0.06] px-3 py-2 text-[13px] leading-relaxed text-fg/80">{children}</p>
)

// ── Tab: content model ───────────────────────────────────────────────────────
function ModelTab({ data }: { data: LensData }) {
  if (data.kind === 'aircraft' && data.props) {
    const a = data.props as Record<string, unknown>
    const rows = Object.entries(a).filter(([k, v]) =>
      !['galleryUrls', 'keyFeatures', 'headlineSpecs', 'relatedKeys', 'overviewHtml', 'siteKey', 'displayOrder', 'url', 'locale', 'isFallback'].includes(k) && v != null && v !== '')
    return (
      <div className="space-y-4">
        <Note>
          This page is two content items. The <b>page</b> (OT_AircraftPage) holds layout and editorial blocks; it points at one
          shared <b>Aircraft Profile</b> that holds every number. Change a spec once and every page, listing and comparison updates.
        </Note>
        <div className="flex flex-wrap gap-2 text-xs">
          <Pill>Content type: OT_AircraftProfile</Pill>
          <Pill>Locale served: {String(a.locale)}</Pill>
          {a.isFallback ? <Pill tone="local">English fallback</Pill> : null}
          <Pill>{rows.length} scalar fields · {(a.galleryUrls as unknown[]).length} gallery · {(a.keyFeatures as unknown[]).length} features</Pill>
        </div>
        <div className="overflow-hidden rounded-md border border-fg/15">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-fg/[0.06] text-[11px] uppercase tracking-wide text-fg/60">
              <tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Scope</th></tr>
            </thead>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-t border-fg/10 align-top">
                  <td className="px-3 py-1.5 font-mono text-[12px]">{k}</td>
                  <td className="max-w-[16rem] break-words px-3 py-1.5">{String(v).length > 70 ? `${String(v).slice(0, 70)}…` : String(v)}</td>
                  <td className="px-3 py-1.5">{LOCALIZED.has(k) ? <Pill tone="local">localized</Pill> : <Pill tone="shared">shared</Pill>}</td>
                </tr>
              ))}
              {(['overviewHtml', 'keyFeatures'] as const).map(k => (
                <tr key={k} className="border-t border-fg/10">
                  <td className="px-3 py-1.5 font-mono text-[12px]">{k}</td>
                  <td className="px-3 py-1.5">{k === 'keyFeatures' ? `${(a.keyFeatures as unknown[]).length} items` : 'rich text'}</td>
                  <td className="px-3 py-1.5"><Pill tone="local">localized</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  const list: any[] = Array.isArray(data.props) ? data.props : []
  return (
    <div className="space-y-4">
      <Note>
        {data.kind === 'listing'
          ? 'The fleet grid has no content of its own. It queries every Aircraft Profile for this site and language, then the client filters, sorts and compares them.'
          : 'A comparison is not authored anywhere. The URL carries the aircraft ids and the table is built from the same shared Aircraft Profiles.'}
      </Note>
      <div className="flex flex-wrap gap-2 text-xs"><Pill>Content type: OT_AircraftProfile</Pill><Pill>{list.length} records</Pill><Pill>Locale: {data.locale}</Pill></div>
      <ul className="divide-y divide-fg/10 rounded-md border border-fg/15 text-[13px]">
        {list.map(m => (
          <li key={m.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="font-semibold">{m.modelName}</span>
            <span className="font-mono text-[11px] text-fg/60">{String(m.key).slice(0, 8)}…</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Tab: component contract ──────────────────────────────────────────────────
function ContractTab({ data }: { data: LensData }) {
  // The SDK's own page lookups (GetContent...) are plumbing; the data calls are the story.
  const sdk = data.calls.filter(c => c.operation.startsWith('GetContent'))
  const main = data.calls.filter(c => !c.operation.startsWith('GetContent'))
  return (
    <div>
      <Step n={1} title="The page asks Graph">
        <p>One GraphQL request per data need, built from the content type. Variables carry the key and language.</p>
        {data.calls.length === 0 && <Note>No Graph call was recorded for this request.</Note>}
        {main.map((c, i) => (
          <div key={i} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Pill>{c.operation}</Pill><Pill>HTTP {c.status}</Pill><Pill>{c.ms} ms</Pill><Pill>{(c.bytes / 1024).toFixed(1)} KB</Pill>
            </div>
            <Code label="query" text={dedent(c.query)} />
            <Code label="variables" text={pretty(c.variables)} maxH="max-h-32" />
          </div>
        ))}
        {sdk.length > 0 && (
          <details className="rounded-md border border-fg/15 px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-semibold">SDK page lookup ({sdk.length} generated {sdk.length === 1 ? 'call' : 'calls'})</summary>
            <p className="mt-2 text-[12px] text-fg/70">Before the data above, the SDK resolves the URL to a content item and its type. It writes these queries itself; the first match wins.</p>
            <div className="mt-2 space-y-2">
              {sdk.map((c, i) => <Code key={i} label={`${c.operation} · ${c.ms} ms`} text={c.query.trim() + '\n\n// variables\n' + pretty(c.variables)} maxH="max-h-56" />)}
            </div>
          </details>
        )}
      </Step>
      <Step n={2} title="Graph answers with raw JSON">
        <p>This is the response before any shaping. Note nested objects such as <code className="font-mono text-xs">url {'{ default }'}</code>.</p>
        {main.slice(0, 2).map((c, i) => (
          <Code key={i} label={`${c.operation} · response`} text={c.truncated ? `// ${(c.bytes / 1024).toFixed(0)} KB, too large to display` : pretty(c.response)} maxH="max-h-80" />
        ))}
      </Step>
      <Step n={3} title="The adapter shapes it into props">
        <p>A server adapter flattens Graph's nested shape into the typed props the UI needs. The components never see Graph.</p>
        <ul className="space-y-1.5">
          {data.components.map(c => (
            <li key={c.component} className="rounded-md border border-fg/15 px-3 py-2">
              <span className="font-mono text-[12px] font-semibold">&lt;{c.component} /&gt;</span>
              <span className="mt-0.5 block text-[12px] text-fg/70">{c.receives.join(' · ')}</span>
            </li>
          ))}
        </ul>
        <Code label="props bound to the components" text={pretty(data.props)} maxH="max-h-80" />
      </Step>
      <Step n={4} title="What the JS SDK did for you">
        <ul className="list-disc space-y-1 pl-5">
          <li>Looked up the page by URL and locale, then <b>generated the query</b> for exactly the content types in that page.</li>
          <li>Matched each returned block's <code className="font-mono text-xs">__typename</code> to a React component through the registry.</li>
          <li>Added the preview attributes that make click-to-edit work inside the CMS.</li>
        </ul>
      </Step>
    </div>
  )
}

// ── Tab: schema.org ──────────────────────────────────────────────────────────
function SchemaTab() {
  const [docs, setDocs] = useState<any[] | null>(null)
  useEffect(() => {
    const out: any[] = []
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => { try { out.push(JSON.parse(s.textContent ?? '')) } catch { /* ignore */ } })
    setDocs(out)
  }, [])
  if (!docs) return null
  const nodes = docs.flatMap(d => (Array.isArray(d?.['@graph']) ? d['@graph'] : [d]))
  const product = nodes.find(d => d?.['@type'] === 'Product')
  return (
    <div className="space-y-4">
      <Note>Read live from this page's HTML. Search engines and AI agents consume this, and every number is the same stored value the page shows.</Note>
      {docs.length === 0 && <Note>This page type does not emit structured data. Aircraft model pages emit a schema.org Product.</Note>}
      {product?.additionalProperty && (
        <div className="overflow-hidden rounded-md border border-fg/15">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-fg/[0.06] text-[11px] uppercase tracking-wide text-fg/60"><tr><th className="px-3 py-2">Property</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Unit code</th></tr></thead>
            <tbody>
              {product.additionalProperty.map((p: any) => (
                <tr key={p.name} className="border-t border-fg/10"><td className="px-3 py-1.5">{p.name}</td><td className="px-3 py-1.5 font-mono text-[12px]">{p.value}</td><td className="px-3 py-1.5 font-mono text-[12px]">{p.unitCode ?? '–'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {docs.map((d, i) => <Code key={i} label={`application/ld+json · ${d['@type'] ?? 'graph'}`} text={pretty(d)} maxH="max-h-96" />)}
    </div>
  )
}

// ── Tab: consume it ──────────────────────────────────────────────────────────
function ConsumeTab({ data }: { data: LensData }) {
  const first = data.calls.find(c => !c.operation.startsWith('GetContent'))
  const q = (first?.query ?? '').trim().replace(/\s+/g, ' ')
  const vars = pretty(first?.variables ?? {})
  const graphCurl = `curl -X POST '${GRAPH_URL}?cache=true' \\
  -H 'Authorization: epi-single <SINGLE_KEY>' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({ query: q, variables: first?.variables ?? {} }).replace(/'/g, "'\\''")}'`
  const mcp = pretty({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'graph_content_graphql_executor', arguments: { query: q, variablesAsJson: JSON.stringify(first?.variables ?? {}) } },
  })
  const media: any[] = data.contract?.media ?? []
  const cards: any[] = data.contract?.specCards ?? []
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">The contract the concierge receives</h3>
        <Note>A component-level payload: ready-to-render spec cards, numbers with units (not formatted strings), and typed asset references. Same data the page binds to, reshaped for a non-web consumer.</Note>
        {cards.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {cards.map(c => (
              <div key={c.field} className="rounded-md border border-fg/15 p-3">
                <div className="text-[11px] uppercase tracking-wide text-fg/60">{c.label}</div>
                <div className="mt-1 text-base font-semibold">{c.display ?? '–'}</div>
              </div>
            ))}
          </div>
        )}
        <Code label="contract (JSON)" text={pretty(data.contract)} maxH="max-h-80" />
      </section>

      {media.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Asset references</h3>
          <p className="text-[13px] text-fg/70">Assets are URLs to the media store, never embedded. <Pill tone="shared">dam</Pill> assets are managed in Optimizely DAM; <Pill>cms</Pill> assets live in the CMS media library.</p>
          <ul className="divide-y divide-fg/10 rounded-md border border-fg/15 text-[12px]">
            {media.slice(0, 8).map((m, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                <Pill tone={m.source === 'dam' ? 'shared' : 'plain'}>{m.source}</Pill>
                <span className="w-24 shrink-0 font-semibold">{m.role}</span>
                <span className="min-w-0 truncate font-mono text-fg/60">{m.url}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Example A: call Graph directly</h3>
        <p className="text-[13px] text-fg/70">Best for a hosted service that needs fast, high-volume, read-only reads. Auth is a read-only key (published content only). Cache by content key and language on the consumer side.</p>
        <Code label="curl" text={graphCurl} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Example B: call the CMS MCP server</h3>
        <p className="text-[13px] text-fg/70">Best when an agent should discover the schema itself. It authenticates with OAuth client credentials, and the same query runs through a tool call.</p>
        <Code label="MCP tools/call" text={mcp} />
        <Code label="variables" text={vars} maxH="max-h-24" />
      </section>
    </div>
  )
}

// ── Tab: platform ────────────────────────────────────────────────────────────
function PlatformTab() {
  const flow = [
    ['Editor publishes', 'The CMS stores the new version and sends it to Graph for indexing.'],
    ['Graph re-indexes', 'A short delay (seconds to a few minutes). Until then Graph still serves the previous version.'],
    ['Graph cache refreshes', 'Requests use ?cache=true, so Graph answers from its CDN cache and refreshes it after indexing.'],
    ['Next.js revalidates', 'Pages use a 60 second revalidate window: the first request after it triggers a rebuild in the background, and the next visitor gets the new page.'],
  ]
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">From request to pixels</h3>
        <ol className="space-y-1.5 text-[13px]">
          {['Route matches the URL', 'SDK looks the page up in Graph', 'Registry maps each content type to a component', 'Adapters shape Graph data into props', 'Components render, with preview attributes in the CMS'].map((s, i) => (
            <li key={s} className="flex gap-2"><span className="font-mono text-fg/50">{i + 1}.</span>{s}</li>
          ))}
        </ol>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">When content changes</h3>
        <ol className="space-y-2">
          {flow.map(([t, d], i) => (
            <li key={t} className="rounded-md border border-fg/15 px-3 py-2">
              <div className="text-[13px] font-semibold"><span className="mr-2 font-mono text-fg/50">{i + 1}</span>{t}</div>
              <div className="mt-0.5 text-[12px] text-fg/70">{d}</div>
            </li>
          ))}
        </ol>
        <Note>This demo relies on the revalidate window, so a publish shows within a few minutes. For instant updates, a CMS publish webhook can call a revalidation endpoint to purge pages on demand. It is not wired up here.</Note>
      </section>
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────
export default function DevLens({ context }: { context: LensContext }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('model')
  const [data, setData] = useState<LensData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const ctxKey = JSON.stringify(context) + pathname
  const load = useCallback(async () => {
    setData(null); setError(null)
    const qs = new URLSearchParams({ kind: context.kind, locale: context.locale })
    if (context.kind === 'aircraft') { qs.set('key', context.aircraftKey); qs.set('path', pathname.replace(/^\/(fr|es)(?=\/|$)/, '') || '/') }
    if (context.kind === 'compare') qs.set('ids', context.ids.join(','))
    try {
      const r = await fetch(`/api/lens?${qs}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Request failed')
      setData(j)
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
  }, [context, pathname])

  useEffect(() => { if (open) void load() }, [open, ctxKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="fixed bottom-4 left-4 z-[60] inline-flex min-h-11 items-center gap-2 rounded-full bg-[oklch(0.2_0.012_250)] px-4 text-sm font-semibold text-white shadow-lg ring-1 ring-white/15 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
      >
        <span className="font-mono text-white/70" aria-hidden>&lt;/&gt;</span>Dev lens
      </button>

      {open && (
        <aside role="dialog" aria-label="Dev lens" className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[34rem] flex-col border-l border-fg/15 bg-canvas text-fg shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-fg/10 px-4 pb-3 pt-4">
            <div>
              <h2 className="text-base font-semibold">Dev lens</h2>
              <p className="text-[12px] text-fg/60">Live view of the data behind this page</p>
            </div>
            <button ref={closeRef} type="button" onClick={() => { setOpen(false); triggerRef.current?.focus() }} className="min-h-11 rounded-md px-3 text-sm font-semibold hover:bg-fg/10 focus-visible:outline-2 focus-visible:outline-brand">Close</button>
          </header>
          <div role="tablist" aria-label="Lens sections" className="flex gap-1 overflow-x-auto border-b border-fg/10 px-3 pt-2">
            {TABS.map(t => (
              <button
                key={t.id} role="tab" type="button" aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-t-md px-3 py-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-brand ${tab === t.id ? 'border-b-2 border-fg text-fg' : 'text-fg/60 hover:text-fg'}`}
              >{t.label}</button>
            ))}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {error && <Note>Could not load: {error}</Note>}
            {!error && !data && tab !== 'platform' && tab !== 'schema' && <p className="text-sm text-fg/60">Running the page's queries…</p>}
            {tab === 'platform' && <PlatformTab />}
            {tab === 'schema' && <SchemaTab />}
            {data && tab === 'model' && <ModelTab data={data} />}
            {data && tab === 'contract' && <ContractTab data={data} />}
            {data && tab === 'consume' && <ConsumeTab data={data} />}
          </div>
        </aside>
      )}
    </>
  )
}
