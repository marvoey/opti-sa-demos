/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, react-hooks/set-state-in-effect -- demo-only panel over loosely typed Graph JSON */
'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Dev lens: a demo drawer that opens the hood on the page. It re-runs the page's
 * real Graph calls through /api/lens and shows the query, the raw response, the
 * props the components receive, the schema.org output and the concierge contract.
 *
 * Layout is container-query driven: the drawer is wide (up to 62rem) and its
 * panels split into two columns once the drawer itself is wider than 48rem.
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
  { id: 'model',    label: 'Model',      hint: 'What is stored' },
  { id: 'contract', label: 'Contract',   hint: 'Graph to props' },
  { id: 'schema',   label: 'schema.org', hint: 'Structured data' },
  { id: 'consume',  label: 'Consume',    hint: 'APIs and MCP' },
  { id: 'platform', label: 'Platform',   hint: 'SDK and cache' },
] as const
type TabId = (typeof TABS)[number]['id']

const KIND_LABEL: Record<string, string> = { aircraft: 'Aircraft page', listing: 'Fleet listing', compare: 'Comparison' }
const GRAPH_URL = 'https://cg.optimizely.com/content/v2'
const LOCALIZED = new Set(['tagline', 'overviewHtml', 'keyFeatures', 'specSheetUrl'])

// ── Small helpers ────────────────────────────────────────────────────────────

/** Re-indents a GraphQL document by brace depth so generated queries read cleanly. */
const dedent = (q: string) => {
  let depth = 0
  return q.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    if (/^[})\]]/.test(l)) depth = Math.max(0, depth - 1)
    const line = '  '.repeat(depth) + l
    const opens = (l.match(/[{(\[]/g) ?? []).length - (l.match(/[})\]]/g) ?? []).length + (/^[})\]]/.test(l) ? 1 : 0)
    depth = Math.max(0, depth + opens)
    return line
  }).join('\n')
}
const pretty = (v: unknown) => JSON.stringify(v, null, 2)

type Lang = 'json' | 'graphql' | 'shell'
const TOKEN: Record<Lang, RegExp> = {
  json: /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
  graphql: /(#[^\n]*)|("(?:\\.|[^"\\])*")|(\$\w+)|\b(query|mutation|fragment|on|true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
  shell: /('(?:[^'\\]|\\.)*')|(\s-[A-Za-z]\b)|\b(curl)\b/g,
}
const C = {
  key: 'text-[oklch(0.82_0.09_235)]', str: 'text-[oklch(0.83_0.1_150)]', num: 'text-[oklch(0.82_0.11_75)]',
  kw: 'text-[oklch(0.8_0.11_310)]', mute: 'text-[oklch(0.62_0.015_250)]',
}

/** Minimal tokenizer: enough colour to scan a query or payload, no dependency. */
function highlight(src: string, lang: Lang): ReactNode[] {
  const out: ReactNode[] = []
  const re = new RegExp(TOKEN[lang].source, 'g')
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index))
    let cls = C.num
    if (lang === 'json') cls = m[1] ? (m[2] ? C.key : C.str) : m[3] ? C.kw : C.num
    else if (lang === 'graphql') cls = m[1] ? C.mute : m[2] ? C.str : m[3] ? C.key : m[4] ? C.kw : C.num
    else cls = m[1] ? C.str : m[2] ? C.key : C.kw
    // Keep a JSON key's colon uncoloured.
    if (lang === 'json' && m[1] && m[2]) { out.push(<span key={i++} className={cls}>{m[1]}</span>, m[2]) }
    else out.push(<span key={i++} className={cls}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < src.length) out.push(src.slice(last))
  return out
}

const LINE_LIMIT = 16

function Code({ text, label, lang = 'json', meta }: { text: string; label: string; lang?: Lang; meta?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const [all, setAll] = useState(false)
  const lines = text.split('\n')
  const long = lines.length > LINE_LIMIT + 2
  const shown = long && !all ? lines.slice(0, LINE_LIMIT).join('\n') : text
  return (
    <figure className="min-w-0 overflow-hidden rounded-lg bg-[oklch(0.19_0.012_250)] ring-1 ring-fg/10">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3.5 py-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">{label}</span>
        <span className="flex items-center gap-2">
          {meta}
          <button
            type="button"
            onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) }}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >{copied ? 'Copied' : 'Copy'}</button>
        </span>
      </figcaption>
      <pre className={`overflow-x-auto px-3.5 py-3 [color-scheme:dark] font-mono text-[12px] leading-[1.65] text-[oklch(0.9_0.01_250)] ${all ? 'max-h-[34rem] overflow-y-auto' : ''}`}>{highlight(shown, lang)}</pre>
      {long && (
        <button
          type="button"
          onClick={() => setAll(a => !a)}
          className="w-full border-t border-white/[0.08] px-3.5 py-2 text-left text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >{all ? 'Show less' : `Show all ${lines.length} lines`}</button>
      )}
    </figure>
  )
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg/55">{children}</h3>
)

const Tag = ({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'ok' | 'local' | 'dark' }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-4 tabular-nums ${
    tone === 'ok' ? 'bg-[oklch(0.93_0.06_160)] text-[oklch(0.35_0.08_160)]'
    : tone === 'local' ? 'bg-fg text-canvas'
    : tone === 'dark' ? 'bg-white/10 text-white/80'
    : 'bg-fg/[0.08] text-fg/75'}`}>{children}</span>
)

const Note = ({ children }: { children: ReactNode }) => (
  <p className="flex gap-2.5 rounded-lg bg-fg/[0.05] px-3.5 py-3 text-[13.5px] leading-relaxed text-fg/80">
    <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-fg/80 text-[10px] font-bold text-canvas">i</span>
    <span className="min-w-0">{children}</span>
  </p>
)

function Step({ n, title, lede, last, children }: { n: number; title: string; lede?: string; last?: boolean; children: ReactNode }) {
  return (
    <section className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg text-[13px] font-bold text-canvas">{n}</span>
        {!last && <span className="mt-1.5 w-px flex-1 bg-fg/15" aria-hidden />}
      </div>
      <div className={`min-w-0 flex-1 ${last ? '' : 'pb-9'}`}>
        <h3 className="text-[15px] font-semibold leading-7">{title}</h3>
        {lede && <p className="mt-0.5 max-w-[65ch] text-[13.5px] leading-relaxed text-fg/70">{lede}</p>}
        <div className="mt-3 space-y-3 text-[13.5px] text-fg/80">{children}</div>
      </div>
    </section>
  )
}

const Cols = ({ children }: { children: ReactNode }) => <div className="grid gap-3 @3xl:grid-cols-2">{children}</div>

// ── Tab: model ───────────────────────────────────────────────────────────────

const UNIT_SUFFIX: Record<string, string> = {
  rangeNm: ' nm', maxAltitudeFt: ' ft', takeoffDistanceFt: ' ft', landingDistanceFt: ' ft',
  cabinLengthM: ' m', cabinWidthM: ' m', cabinHeightM: ' m', overallLengthM: ' m', wingspanM: ' m', overallHeightM: ' m',
  baggageVolumeM3: ' m³', thrustLbf: ' lbf', cruiseSpeedMach: ' Mach', maxOperatingMach: ' Mach',
}
const MODEL_GROUPS: [string, string[]][] = [
  ['Identity', ['modelName', 'family', 'lifecycleStatus', 'certificationDate', 'tagline']],
  ['Performance', ['rangeNm', 'cruiseSpeedMach', 'maxOperatingMach', 'maxAltitudeFt', 'takeoffDistanceFt', 'landingDistanceFt']],
  ['Cabin', ['maxPassengers', 'typicalPassengers', 'crewCount', 'livingSpaces', 'cabinLengthM', 'cabinWidthM', 'cabinHeightM', 'baggageVolumeM3']],
  ['Exterior', ['overallLengthM', 'wingspanM', 'overallHeightM']],
  ['Powerplant', ['engineModel', 'thrustLbf']],
  ['Narrative and media', ['overviewHtml', 'keyFeatures', 'specSheetUrl', 'heroImageUrl', 'galleryUrls', 'diagramFrontUrl', 'diagramSideUrl', 'featureVideoUrl', 'relatedKeys']],
]

function fieldValue(k: string, v: unknown): string {
  if (Array.isArray(v)) return `${v.length} ${v.length === 1 ? 'item' : 'items'}`
  if (k === 'overviewHtml') return `rich text, ${String(v).length} chars`
  if (typeof v === 'string' && /^https?:\/\//.test(v)) return '…/' + v.split('/').slice(-2).join('/')
  const s = String(v)
  return (s.length > 64 ? s.slice(0, 64) + '…' : s) + (UNIT_SUFFIX[k] && typeof v === 'number' ? UNIT_SUFFIX[k] : '')
}

function ModelTab({ data }: { data: LensData }) {
  if (data.kind === 'aircraft' && data.props) {
    const a = data.props as Record<string, unknown>
    const groups = MODEL_GROUPS.map(([title, keys]) => [title, keys.filter(k => a[k] != null && a[k] !== '' && !(Array.isArray(a[k]) && !(a[k] as unknown[]).length))] as const).filter(([, k]) => k.length)
    const present = groups.flatMap(([, k]) => k)
    const localized = present.filter(k => LOCALIZED.has(k)).length
    return (
      <div className="space-y-5">
        <Note>
          This page is two content items. The <b>page</b> (OT_AircraftPage) holds layout and editorial blocks and points at one shared
          <b> Aircraft Profile</b> that holds every number. Change a spec once and every page, listing and comparison updates.
        </Note>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-fg/75">
          <span><b className="text-fg">{present.length - localized}</b> shared values</span>
          <span><b className="text-fg">{localized}</b> localized fields</span>
          <span>Served in <b className="text-fg">{String(a.locale).toUpperCase()}</b>{a.isFallback ? ' (English fallback)' : ''}</span>
          <span className="font-mono text-[12px] text-fg/55">OT_AircraftProfile</span>
        </div>
        <div className="gap-x-8 @3xl:columns-2">
          {groups.map(([title, keys]) => (
            <section key={title} className="mb-6 break-inside-avoid">
              <Eyebrow>{title}</Eyebrow>
              <dl className="mt-2 divide-y divide-fg/10 border-y border-fg/10">
                {keys.map(k => (
                  <div key={k} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-baseline gap-3 py-2">
                    <dt className="truncate font-mono text-[12px] text-fg/60">{k}</dt>
                    <dd className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 text-[13.5px]">
                      <span className="min-w-0 break-words font-medium">{fieldValue(k, a[k])}</span>
                      {LOCALIZED.has(k) && <Tag tone="local">per language</Tag>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    )
  }
  const list: any[] = Array.isArray(data.props) ? data.props : []
  return (
    <div className="space-y-5">
      <Note>
        {data.kind === 'listing'
          ? 'The fleet grid has no content of its own. It queries every Aircraft Profile for this site and language, then the client filters, sorts and compares them.'
          : 'A comparison is not authored anywhere. The URL carries the aircraft ids and the table is built from the same shared Aircraft Profiles.'}
      </Note>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-fg/75">
        <span><b className="text-fg">{list.length}</b> records</span>
        <span>Served in <b className="text-fg">{data.locale.toUpperCase()}</b></span>
        <span className="font-mono text-[12px] text-fg/55">OT_AircraftProfile</span>
      </div>
      <ul className="grid gap-x-8 @3xl:grid-cols-2">
        {list.map(m => (
          <li key={m.key} className="flex items-baseline justify-between gap-3 border-b border-fg/10 py-2.5 text-[13.5px]">
            <span className="font-semibold">{m.modelName}</span>
            <span className="font-mono text-[11px] text-fg/50">{String(m.key).slice(0, 8)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Tab: contract ────────────────────────────────────────────────────────────

const CallStats = ({ c }: { c: GraphCall }) => (
  <span className="flex gap-1.5"><Tag tone="dark">HTTP {c.status}</Tag><Tag tone="dark">{c.ms} ms</Tag><Tag tone="dark">{(c.bytes / 1024).toFixed(1)} KB</Tag></span>
)

function ContractTab({ data }: { data: LensData }) {
  // The SDK's own page lookups (GetContent...) are plumbing; the data calls are the story.
  const sdk = data.calls.filter(c => c.operation.startsWith('GetContent'))
  const main = data.calls.filter(c => !c.operation.startsWith('GetContent'))
  return (
    <div>
      <Step n={1} title="The page asks Graph" lede="One GraphQL request per data need, built from the content type. Variables carry the key and the language.">
        {main.length === 0 && <Note>No Graph call was recorded for this request.</Note>}
        {main.map((c, i) => (
          <Cols key={i}>
            <Code label={`${c.operation} · query`} lang="graphql" text={dedent(c.query)} meta={<CallStats c={c} />} />
            <Code label="variables" text={pretty(c.variables)} />
          </Cols>
        ))}
        {sdk.length > 0 && (
          <details className="group rounded-lg border border-fg/15 px-3.5 py-2.5">
            <summary className="cursor-pointer text-[13.5px] font-semibold">SDK page lookup <span className="font-normal text-fg/60">({sdk.length} generated {sdk.length === 1 ? 'call' : 'calls'})</span></summary>
            <p className="mt-2 max-w-[65ch] text-[13px] text-fg/70">Before the data above, the SDK resolves the URL to a content item and its type. It writes these queries itself; the first match wins.</p>
            <div className="mt-3 space-y-3">
              {sdk.map((c, i) => <Code key={i} label={`${c.operation} · ${c.ms} ms`} lang="graphql" text={dedent(c.query) + '\n\n# variables\n' + pretty(c.variables)} />)}
            </div>
          </details>
        )}
      </Step>
      <Step n={2} title="Graph answers with raw JSON" lede="The response before any shaping. Notice nested objects such as url { default } and wrapper objects around rich text.">
        <Cols>
          {main.slice(0, 2).map((c, i) => (
            <Code key={i} label={`${c.operation} · response`} text={c.truncated ? `// ${(c.bytes / 1024).toFixed(0)} KB, too large to display` : pretty(c.response)} />
          ))}
        </Cols>
      </Step>
      <Step n={3} title="The adapter shapes it into props" lede="A server adapter flattens Graph's nested shape into the typed props the UI needs. The components never see Graph.">
        <ul className="grid gap-x-8 @3xl:grid-cols-2">
          {data.components.map(c => (
            <li key={c.component} className="border-b border-fg/10 py-2.5">
              <span className="font-mono text-[12.5px] font-semibold">&lt;{c.component} /&gt;</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-fg/65">{c.receives.join(' · ')}</span>
            </li>
          ))}
        </ul>
        <Code label="props bound to the components" text={pretty(data.props)} />
      </Step>
      <Step n={4} last title="What the JS SDK did for you">
        <ul className="grid gap-x-8 gap-y-2 @3xl:grid-cols-3">
          {[
            ['Built the query', 'Looked the page up by URL and locale, then generated the query for exactly the content types on it.'],
            ['Resolved components', 'Matched each returned __typename to a React component through the registry.'],
            ['Wired the editor', 'Added the preview attributes that make click-to-edit work inside the CMS.'],
          ].map(([t, d]) => (
            <li key={t} className="border-t border-fg/15 pt-2.5">
              <div className="text-[13.5px] font-semibold text-fg">{t}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-fg/70">{d}</div>
            </li>
          ))}
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
  const types = nodes.map(n => n?.['@type']).filter(Boolean)
  const props: any[] = product?.additionalProperty ?? []
  return (
    <div className="space-y-5">
      <Note>Read live from this page's HTML. Search engines and AI agents consume this, and every number is the same stored value the page shows.</Note>
      {docs.length === 0 && <Note>This page type does not emit structured data. Aircraft model pages emit a schema.org Product.</Note>}
      {types.length > 0 && <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-fg/70">Emitted types: {types.map((t, i) => <Tag key={i}>{String(t)}</Tag>)}</div>}
      <div className="grid items-start gap-4 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {props.length > 0 && (
          <section>
            <Eyebrow>Product · additionalProperty</Eyebrow>
            <table className="mt-2 w-full border-y border-fg/10 text-left text-[13px]">
              <thead className="sr-only"><tr><th>Property</th><th>Value</th><th>Unit code</th></tr></thead>
              <tbody className="divide-y divide-fg/10">
                {props.map(p => (
                  <tr key={p.name}>
                    <td className="py-1.5 pr-3">{p.name}</td>
                    <td className="py-1.5 text-right font-mono text-[12px] tabular-nums">{p.value}</td>
                    <td className="w-14 py-1.5 pl-3 font-mono text-[11px] text-fg/50">{p.unitCode ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="space-y-3">
          {docs.map((d, i) => <Code key={i} label={`application/ld+json · ${d['@type'] ?? 'graph'}`} text={pretty(d)} />)}
        </div>
      </div>
    </div>
  )
}

// ── Tab: consume ─────────────────────────────────────────────────────────────
function ConsumeTab({ data }: { data: LensData }) {
  const first = data.calls.find(c => !c.operation.startsWith('GetContent'))
  const q = (first?.query ?? '').trim().replace(/\s+/g, ' ')
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
    <div className="space-y-9">
      <section className="space-y-3">
        <div>
          <h3 className="text-[15px] font-semibold">The contract the concierge receives</h3>
          <p className="mt-0.5 max-w-[65ch] text-[13.5px] leading-relaxed text-fg/70">A component-level payload: ready-to-render spec cards, numbers with units rather than formatted strings, and typed asset references. The same data the page binds to, reshaped for a non-web consumer.</p>
        </div>
        <div className="grid items-start gap-4 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="space-y-4">
            {cards.length > 0 && (
              <div>
                <Eyebrow>specCards, rendered</Eyebrow>
                <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-fg/10 ring-1 ring-fg/10">
                  {cards.map(c => (
                    <div key={c.field} className="bg-canvas p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg/55">{c.label}</div>
                      <div className="mt-1 text-[15px] font-semibold leading-snug tabular-nums">{c.display ?? 'n/a'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {media.length > 0 && (
              <div>
                <Eyebrow>Asset references</Eyebrow>
                <ul className="mt-2 divide-y divide-fg/10 border-y border-fg/10 text-[12.5px]">
                  {media.slice(0, 8).map((m, i) => (
                    <li key={i} className="grid grid-cols-[3rem_6.5rem_1fr] items-center gap-2 py-1.5">
                      <Tag tone={m.source === 'dam' ? 'ok' : 'plain'}>{m.source}</Tag>
                      <span className="font-semibold">{m.role}</span>
                      <span className="truncate font-mono text-[11.5px] text-fg/55" title={m.url}>{m.url}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[12.5px] leading-snug text-fg/60">Assets are URLs to the media store, never embedded. <b>dam</b> assets are managed in Optimizely DAM, <b>cms</b> assets live in the CMS media library.</p>
              </div>
            )}
          </div>
          <Code label="contract · JSON" text={pretty(data.contract)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Two ways to read the same content</h3>
        <Cols>
          <div className="min-w-0 space-y-2.5">
            <div>
              <div className="text-[13.5px] font-semibold">A. Call Graph directly</div>
              <p className="mt-0.5 text-[13px] leading-snug text-fg/70">For a hosted service that needs fast, high-volume, read-only reads. A read-only key returns published content only. Cache by content key and language on the consumer side.</p>
            </div>
            <Code label="curl" lang="shell" text={graphCurl} />
          </div>
          <div className="min-w-0 space-y-2.5">
            <div>
              <div className="text-[13.5px] font-semibold">B. Call the CMS MCP server</div>
              <p className="mt-0.5 text-[13px] leading-snug text-fg/70">For an agent that should discover the schema itself. It authenticates with OAuth client credentials, then runs the same query as a tool call.</p>
            </div>
            <Code label="MCP · tools/call" text={mcp} />
          </div>
        </Cols>
      </section>
    </div>
  )
}

// ── Tab: platform ────────────────────────────────────────────────────────────
function PlatformTab() {
  const render = ['Route matches the URL', 'SDK looks the page up in Graph', 'Registry maps each content type to a component', 'Adapters shape Graph data into props', 'Components render, with preview attributes in the CMS']
  const flow = [
    ['Editor publishes', 'The CMS stores the new version and sends it to Graph for indexing.'],
    ['Graph re-indexes', 'A short delay of seconds to a few minutes. Until then Graph still serves the previous version.'],
    ['Graph cache refreshes', 'Requests use ?cache=true, so Graph answers from its CDN cache and refreshes it after indexing.'],
    ['Next.js revalidates', 'Pages use a 60 second revalidate window. The first request after it rebuilds the page in the background, and the next visitor gets the new version.'],
  ]
  return (
    <div className="space-y-8">
      <div className="grid gap-x-10 gap-y-8 @3xl:grid-cols-2">
        <section>
          <Eyebrow>From request to pixels</Eyebrow>
          <ol className="mt-3 space-y-2.5">
            {render.map((s, i) => (
              <li key={s} className="flex items-baseline gap-3 text-[14px]"><span className="w-5 shrink-0 font-mono text-[12px] text-fg/45">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </section>
        <section>
          <Eyebrow>When content changes</Eyebrow>
          <ol className="mt-3 divide-y divide-fg/10 border-y border-fg/10">
            {flow.map(([t, d], i) => (
              <li key={t} className="flex gap-3 py-2.5">
                <span className="w-5 shrink-0 font-mono text-[12px] leading-5 text-fg/45">{i + 1}</span>
                <div><div className="text-[14px] font-semibold leading-5">{t}</div><div className="mt-0.5 text-[13px] leading-snug text-fg/70">{d}</div></div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <Note>This demo relies on the revalidate window, so a publish shows within a few minutes. For instant updates, a CMS publish webhook can call a revalidation endpoint to purge pages on demand. It is not wired up here.</Note>
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
  const [loadedAt, setLoadedAt] = useState<string>('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

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
      setLoadedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed') }
  }, [context, pathname])

  useEffect(() => { if (open) void load() }, [open, ctxKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Roving tabindex: arrow keys move between tabs, as in the ARIA tabs pattern.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex(t => t.id === tab)
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1
    if (next < 0) return
    e.preventDefault()
    setTab(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }

  const totalMs = data?.calls.reduce((s, c) => s + c.ms, 0) ?? 0
  const subject = context.kind === 'aircraft' && data?.props?.modelName ? data.props.modelName : null

  return (
    <>
      <style>{`
        @keyframes lens-in { from { transform: translateX(2rem); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes lens-fade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        .lens-drawer { animation: lens-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both }
        .lens-panel { animation: lens-fade 220ms cubic-bezier(0.22, 1, 0.36, 1) both }
        @media (prefers-reduced-motion: reduce) { .lens-drawer, .lens-panel { animation: none } }
      `}</style>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="fixed bottom-4 left-4 z-[60] inline-flex min-h-11 items-center gap-2 rounded-full bg-[oklch(0.2_0.012_250)] px-4 text-sm font-semibold text-white shadow-lg ring-1 ring-white/15 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
      >
        <span className="font-mono text-white/70" aria-hidden>&lt;/&gt;</span>Dev lens
      </button>

      {open && (
        <aside
          role="dialog"
          aria-label="Dev lens"
          className="lens-drawer fixed inset-y-0 right-0 z-[70] flex w-[min(62rem,100vw)] flex-col border-l border-fg/15 bg-canvas text-fg shadow-[-24px_0_48px_-24px_oklch(0.2_0.02_250/0.35)]"
        >
          <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg/55">Dev lens</p>
              <h2 className="mt-0.5 truncate text-xl font-semibold leading-tight tracking-[-0.01em]">
                {subject ?? KIND_LABEL[context.kind]}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-fg/65">
                {subject && <Tag>{KIND_LABEL[context.kind]}</Tag>}
                <Tag>{context.locale.toUpperCase()}</Tag>
                <span>Live view of the data behind this page</span>
              </p>
            </div>
            <button ref={closeRef} type="button" onClick={() => { setOpen(false); triggerRef.current?.focus() }} className="-mr-2 min-h-11 rounded-md px-3 text-sm font-semibold text-fg/80 transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand">Close</button>
          </header>

          <div role="tablist" aria-label="Lens sections" className="flex gap-1 overflow-x-auto border-b border-fg/12 px-3 sm:px-5">
            {TABS.map(t => {
              const on = tab === t.id
              return (
                <button
                  key={t.id}
                  ref={el => { tabRefs.current[t.id] = el }}
                  role="tab" id={`lens-tab-${t.id}`} aria-controls="lens-panel" type="button"
                  aria-selected={on} tabIndex={on ? 0 : -1}
                  onClick={() => setTab(t.id)} onKeyDown={onTabKey}
                  className={`relative -mb-px shrink-0 whitespace-nowrap px-3.5 pb-2.5 pt-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand ${on ? 'text-fg' : 'text-fg/60 hover:text-fg'}`}
                >
                  <span className="block text-[14px] font-semibold leading-5">{t.label}</span>
                  <span className="block text-[11.5px] leading-4 text-fg/50">{t.hint}</span>
                  {on && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-fg" />}
                </button>
              )
            })}
          </div>

          <div id="lens-panel" role="tabpanel" aria-labelledby={`lens-tab-${tab}`} className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div key={tab} className="lens-panel mx-auto max-w-[58rem] px-6 py-6">
              {error && <Note>Could not load: {error}</Note>}
              {!error && !data && tab !== 'platform' && tab !== 'schema' && (
                <div className="space-y-3" aria-busy="true" aria-label="Running the page's queries">
                  {[88, 64, 76, 52].map((w, i) => <div key={i} className="h-4 animate-pulse rounded bg-fg/10 motion-reduce:animate-none" style={{ width: `${w}%` }} />)}
                </div>
              )}
              {tab === 'platform' && <PlatformTab />}
              {tab === 'schema' && <SchemaTab />}
              {data && tab === 'model' && <ModelTab data={data} />}
              {data && tab === 'contract' && <ContractTab data={data} />}
              {data && tab === 'consume' && <ConsumeTab data={data} />}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-fg/12 px-6 py-2.5 text-[12px] text-fg/60">
            <span aria-live="polite">
              {data ? `${data.calls.length} Graph ${data.calls.length === 1 ? 'call' : 'calls'} · ${totalMs} ms · queried ${loadedAt}` : error ? 'Query failed' : 'Querying Graph…'}
            </span>
            <button type="button" onClick={() => void load()} className="rounded-md px-2.5 py-1 font-semibold text-fg/80 transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand">Re-run queries</button>
          </footer>
        </aside>
      )}
    </>
  )
}
