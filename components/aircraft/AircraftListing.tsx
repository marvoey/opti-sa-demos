'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Gauge, Globe, LayoutGrid, List, Users } from 'lucide-react'
import { formatSpec } from '@/lib/aircraftFormat'
import { saveFleetReturn } from '@/lib/aircraftNav'

export interface ListItem {
  key: string
  modelName: string
  tagline?: string
  family?: string
  lifecycleStatus?: string
  rangeNm?: number
  maxPassengers?: number
  cruiseSpeedMach?: number
  heroImageUrl?: string
  url?: string
  comparisonEligible: boolean
}

export type SortKey = 'displayOrder' | 'rangeDesc' | 'passengersDesc' | 'nameAsc'

type Options = {
  showSearch: boolean; showFamilyFilter: boolean; showRangeFilter: boolean
  showPassengerFilter: boolean; showCompareToggle: boolean
  defaultSort: SortKey
  /** 'all' lets the visitor choose; otherwise the server already restricted the set. */
  lifecycleLocked: boolean
}

type Settings = { columns: 2 | 3 | 4; compact: boolean; cardStyle: 'image' | 'spec'; showImages: boolean }

type Props = {
  items: ListItem[]
  locale: string
  options: Options
  settings: Settings
  /** Locale-prefixed base of the compare route, e.g. `/fr/aircraft/compare`. */
  compareBase: string
  familyLabels: Record<string, string>
  lifecycleLabels: Record<string, string>
  text: Record<
    | 'search' | 'searchPlaceholder' | 'family' | 'range' | 'passengers' | 'anyPassengers' | 'passengersPlus'
    | 'lifecycle' | 'sort' | 'sortDisplayOrder' | 'sortRangeDesc' | 'sortPassengersDesc' | 'sortNameAsc'
    | 'resultCount' | 'resultOne' | 'noResults' | 'activeFilters' | 'clearFilters' | 'selectToCompare'
    | 'compareSelected' | 'compareHint' | 'maxCompare' | 'rangeMin' | 'rangeMax' | 'currentOnly'
    | 'compareLabel' | 'viewModel' | 'viewLabel' | 'viewCard' | 'viewList' | 'seeDetails' | 'speed',
    string
  >
}

// Aircraft photography is panoramic (the Global 7500 hero is 1568x665, ~2.35:1), so
// thumbnails use a 7:3 frame: a taller crop slices the nose or tail off the plane.
const PAX_STEPS = [0, 8, 12, 16, 19]
const CURRENT = ['inProduction', 'inService']
type View = 'card' | 'list'
const SORTS: SortKey[] = ['displayOrder', 'rangeDesc', 'passengersDesc', 'nameAsc']

// "Portée" must match "portee": strip combining marks after NFD, lower-case both sides.
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const csv = (v: string | null) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : [])

/**
 * Filterable fleet directory. All filter state lives in the URL
 * (`?family=global,challenger&range=6000-8000&sort=rangeDesc`) so a result set is
 * shareable and indexable. The URL is written with history.replaceState, which
 * updates the address bar without a server round-trip. Every control is a real,
 * keyboard-operable form control; an aria-live region announces the result count.
 */
export default function AircraftListing({ items, locale, options, settings, compareBase, familyLabels, lifecycleLabels, text }: Props) {
  const sp = useSearchParams()

  // ── Bounds derived from the result set, never hard-coded ───────────────────
  const bounds = useMemo(() => {
    const r = items.map(i => i.rangeNm).filter((n): n is number => typeof n === 'number')
    if (!r.length) return { min: 0, max: 0 }
    return { min: Math.floor(Math.min(...r) / 100) * 100, max: Math.ceil(Math.max(...r) / 100) * 100 }
  }, [items])

  const familiesPresent = useMemo(() => [...new Set(items.map(i => i.family).filter((f): f is string => !!f))], [items])
  const statusesPresent = useMemo(() => [...new Set(items.map(i => i.lifecycleStatus).filter((s): s is string => !!s))], [items])
  const defaultStatuses = useMemo(() => {
    const cur = statusesPresent.filter(s => CURRENT.includes(s))
    return cur.length ? cur : statusesPresent
  }, [statusesPresent])

  // ── State, seeded from the URL ─────────────────────────────────────────────
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [qApplied, setQApplied] = useState(sp.get('q') ?? '')
  const [families, setFamilies] = useState<string[]>(() => csv(sp.get('family')))
  const [pax, setPax] = useState<number>(() => Number(sp.get('pax')) || 0)
  const [statuses, setStatuses] = useState<string[]>(() => (sp.get('status') ? csv(sp.get('status')) : defaultStatuses))
  const [sort, setSort] = useState<SortKey>(() => (SORTS.includes(sp.get('sort') as SortKey) ? (sp.get('sort') as SortKey) : options.defaultSort))
  const [range, setRange] = useState<[number, number]>(() => {
    const m = /^(\d+)-(\d+)$/.exec(sp.get('range') ?? '')
    if (!m) return [bounds.min, bounds.max]
    return [Math.max(bounds.min, Number(m[1])), Math.min(bounds.max, Number(m[2]))]
  })
  const [view, setView] = useState<View>(() => (sp.get('view') === 'list' ? 'list' : 'card'))
  // Selection is URL state too, so coming back from a comparison restores the ticks.
  const [selected, setSelected] = useState<string[]>(() =>
    csv(sp.get('sel')).filter(k => items.some(i => i.key === k && i.comparisonEligible)).slice(0, 4))

  // Debounce the search box (250 ms) before it filters or touches the URL.
  useEffect(() => {
    const id = window.setTimeout(() => setQApplied(q), 250)
    return () => window.clearTimeout(id)
  }, [q])

  // ── Write non-default state back to the URL ────────────────────────────────
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      saveFleetReturn(`${window.location.pathname}${window.location.search}`)
      return
    }
    const p = new URLSearchParams(window.location.search)
    const set = (k: string, v: string | null) => (v ? p.set(k, v) : p.delete(k))
    set('q', qApplied.trim() || null)
    set('family', families.length ? families.join(',') : null)
    set('range', range[0] !== bounds.min || range[1] !== bounds.max ? `${range[0]}-${range[1]}` : null)
    set('pax', pax ? String(pax) : null)
    set('status', sameSet(statuses, defaultStatuses) ? null : statuses.join(','))
    set('sort', sort !== options.defaultSort ? sort : null)
    set('view', view === 'list' ? 'list' : null)
    set('sel', selected.length ? selected.join(',') : null)
    const qs = p.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    saveFleetReturn(`${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [qApplied, families, range, pax, statuses, sort, view, selected, bounds, defaultStatuses, options.defaultSort])

  // ── Filtering and sorting ──────────────────────────────────────────────────
  const results = useMemo(() => {
    const terms = fold(qApplied).split(/\s+/).filter(Boolean)
    const list = items.filter(i => {
      if (terms.length) {
        const hay = fold(`${i.modelName} ${i.tagline ?? ''}`)
        if (!terms.every(t => hay.includes(t))) return false
      }
      if (families.length && !(i.family && families.includes(i.family))) return false
      if (options.showRangeFilter && typeof i.rangeNm === 'number' && (i.rangeNm < range[0] || i.rangeNm > range[1])) return false
      if (options.showPassengerFilter && pax && (i.maxPassengers ?? 0) < pax) return false
      if (!options.lifecycleLocked && statuses.length && i.lifecycleStatus && !statuses.includes(i.lifecycleStatus)) return false
      return true
    })
    const idx = new Map(items.map((i, n) => [i.key, n]))
    const by: Record<SortKey, (a: ListItem, b: ListItem) => number> = {
      displayOrder:   (a, b) => (idx.get(a.key) ?? 0) - (idx.get(b.key) ?? 0),
      rangeDesc:      (a, b) => (b.rangeNm ?? 0) - (a.rangeNm ?? 0),
      passengersDesc: (a, b) => (b.maxPassengers ?? 0) - (a.maxPassengers ?? 0),
      nameAsc:        (a, b) => a.modelName.localeCompare(b.modelName, locale),
    }
    return [...list].sort(by[sort])
  }, [items, qApplied, families, range, pax, statuses, sort, options, locale])

  // ── Active filters (for the chips and the empty state) ─────────────────────
  const active: { id: string; label: string; clear: () => void }[] = []
  if (qApplied.trim()) active.push({ id: 'q', label: `“${qApplied.trim()}”`, clear: () => { setQ(''); setQApplied('') } })
  families.forEach(f => active.push({ id: `f-${f}`, label: familyLabels[f] ?? f, clear: () => setFamilies(families.filter(x => x !== f)) }))
  if (options.showRangeFilter && (range[0] !== bounds.min || range[1] !== bounds.max))
    active.push({ id: 'range', label: `${text.range}: ${nm(range[0], locale)} – ${nm(range[1], locale)}`, clear: () => setRange([bounds.min, bounds.max]) })
  if (options.showPassengerFilter && pax)
    active.push({ id: 'pax', label: `${text.passengers}: ${text.passengersPlus.replace('{n}', String(pax))}`, clear: () => setPax(0) })
  if (!options.lifecycleLocked && !sameSet(statuses, defaultStatuses))
    active.push({ id: 'status', label: `${text.lifecycle}: ${statuses.map(s => lifecycleLabels[s] ?? s).join(', ')}`, clear: () => setStatuses(defaultStatuses) })

  const clearAll = () => {
    setQ(''); setQApplied(''); setFamilies([]); setPax(0); setRange([bounds.min, bounds.max]); setStatuses(defaultStatuses)
  }

  const toggleSel = (key: string) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : prev.length < 4 ? [...prev, key] : prev)

  const count = results.length === 1 ? text.resultOne : text.resultCount.replace('{count}', String(results.length))
  const cols = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4' }[settings.columns]
  const ctl = 'min-h-11 w-full border border-fg/40 bg-canvas px-sm text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-ot-control'
  const label = 'mb-xs block text-xs font-semibold uppercase tracking-[0.1em] text-fg/75'

  return (
    <div>
      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <form onSubmit={e => e.preventDefault()} role="search" className="grid gap-x-lg gap-y-lg border-y border-fg/20 py-lg lg:grid-cols-12">
        {options.showSearch && (
          <div className="lg:col-span-5">
            <label htmlFor="ac-q" className={label}>{text.search}</label>
            <input id="ac-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={text.searchPlaceholder} className={ctl} autoComplete="off" />
          </div>
        )}

        {options.showFamilyFilter && familiesPresent.length > 1 && (
          <fieldset className="lg:col-span-7">
            <legend className={label}>{text.family}</legend>
            <div className="flex flex-wrap gap-sm">
              {familiesPresent.map(f => {
                const on = families.includes(f)
                return (
                  <button key={f} type="button" aria-pressed={on}
                    onClick={() => setFamilies(on ? families.filter(x => x !== f) : [...families, f])}
                    className={`min-h-11 border px-md text-sm font-semibold transition-colors duration-150 rounded-ot-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${on ? 'border-fg bg-fg text-canvas' : 'border-fg/40 hover:border-fg'}`}>
                    {familyLabels[f] ?? f}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {options.showRangeFilter && bounds.max > bounds.min && (
          <div className="lg:col-span-5">
            <p className={label} id="ac-range-label">{text.range}</p>
            <div role="group" aria-labelledby="ac-range-label" className="flex min-h-11 flex-col justify-center">
              <DualRange min={bounds.min} max={bounds.max} step={100} value={range} onChange={setRange}
                labelMin={text.rangeMin} labelMax={text.rangeMax} />
              <p className="mt-sm flex justify-between font-mono text-sm tabular-nums text-fg/80">
                <span>{nm(range[0], locale)}</span><span>{nm(range[1], locale)}</span>
              </p>
            </div>
          </div>
        )}

        {options.showPassengerFilter && (
          <div className="lg:col-span-3">
            <label htmlFor="ac-pax" className={label}>{text.passengers}</label>
            <select id="ac-pax" value={pax} onChange={e => setPax(Number(e.target.value))} className={ctl}>
              {PAX_STEPS.map(n => <option key={n} value={n}>{n === 0 ? text.anyPassengers : text.passengersPlus.replace('{n}', String(n))}</option>)}
            </select>
          </div>
        )}

        {!options.lifecycleLocked && statusesPresent.length > 1 && (
          <fieldset className="lg:col-span-4">
            <legend className={label}>{text.lifecycle}</legend>
            <div className="flex min-h-11 flex-wrap items-center gap-x-lg gap-y-xs">
              {statusesPresent.map(s => (
                <label key={s} className="inline-flex min-h-8 cursor-pointer items-center gap-xs text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--ot-accent)]" checked={statuses.includes(s)}
                    onChange={() => setStatuses(statuses.includes(s) ? statuses.filter(x => x !== s) : [...statuses, s])} />
                  {lifecycleLabels[s] ?? s}
                </label>
              ))}
            </div>
          </fieldset>
        )}

      </form>

      {/* ── Result count (announced) and active filters ──────────────────── */}
      <div className="mt-lg flex flex-wrap items-center gap-x-md gap-y-sm">
        <p role="status" aria-live="polite" className="text-sm font-semibold">{count}</p>
        {active.length > 0 && (
          <ul aria-label={text.activeFilters} className="flex flex-1 flex-wrap gap-xs">
            {active.map(a => (
              <li key={a.id}>
                <button type="button" onClick={a.clear} className="inline-flex min-h-8 items-center gap-xs border border-fg/40 px-sm text-xs hover:border-fg rounded-ot-control focus-visible:outline-2 focus-visible:outline-brand">
                  {a.label}<span aria-hidden>×</span><span className="sr-only"> {text.clearFilters}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-md">
          <div role="group" aria-label={text.viewLabel} className="inline-flex overflow-hidden border border-fg/40 rounded-ot-control">
            {([['card', text.viewCard, LayoutGrid], ['list', text.viewList, List]] as const).map(([v, name, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                className={`inline-flex min-h-11 items-center gap-xs px-md text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${view === v ? 'bg-fg text-canvas' : 'hover:bg-fg/10'}`}>
                <Icon aria-hidden className="size-4" />{name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-xs">
          <label htmlFor="ac-sort" className="text-xs font-semibold uppercase tracking-[0.1em] text-fg/75">{text.sort}</label>
          <select id="ac-sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} className={`${ctl} !w-auto`}>
            <option value="displayOrder">{text.sortDisplayOrder}</option>
            <option value="rangeDesc">{text.sortRangeDesc}</option>
            <option value="passengersDesc">{text.sortPassengersDesc}</option>
            <option value="nameAsc">{text.sortNameAsc}</option>
          </select>
          </div>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {results.length === 0 ? (
        <div className="mt-lg border border-dashed border-fg/30 p-lg text-center">
          <p className="text-lg font-semibold">{text.noResults}</p>
          {active.length > 0 && (
            <p className="mt-sm text-sm text-fg/75">{text.activeFilters}: {active.map(a => a.label).join(' · ')}</p>
          )}
          <button type="button" onClick={clearAll} className="mt-md inline-flex min-h-11 items-center border border-fg px-md text-sm font-semibold hover:bg-fg hover:text-canvas rounded-ot-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {text.clearFilters}
          </button>
        </div>
      ) : view === 'list' ? (
        <ul className="mt-lg flex flex-col gap-sm">
          {results.map(i => {
            const rng = formatSpec('rangeNm', i.rangeNm, locale, 'both')
            const spd = formatSpec('cruiseSpeedMach', i.cruiseSpeedMach, locale, 'both')
            const isSel = selected.includes(i.key)
            const full = selected.length >= 4 && !isSel
            const stat = 'flex items-center gap-sm'
            const ico = 'size-9 shrink-0 text-accent'
            return (
              <li key={i.key} className="group relative grid items-center gap-x-lg gap-y-sm bg-surface p-md transition-colors duration-200 hover:bg-surface/70 md:grid-cols-[11rem_minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto] md:px-lg">
                {settings.showImages && (
                  <div className="relative aspect-[7/3] w-full max-w-60 md:max-w-none">
                    {i.heroImageUrl && <Image src={i.heroImageUrl} alt="" fill sizes="176px" className="object-contain" />}
                  </div>
                )}
                <div className={`min-w-0 ${settings.showImages ? '' : 'md:col-span-2'}`}>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-fg/70">
                    {i.family ? familyLabels[i.family] ?? i.family : ''}{i.lifecycleStatus ? ` / ${lifecycleLabels[i.lifecycleStatus] ?? i.lifecycleStatus}` : ''}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold leading-tight">
                    {i.url
                      ? <Link href={i.url} aria-label={text.viewModel.replace('{model}', i.modelName)} className="after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{i.modelName}</Link>
                      : i.modelName}
                  </h3>
                  {i.tagline && <p className="mt-1 text-pretty text-sm text-fg/80">{i.tagline}</p>}
                </div>
                <dl className="contents">
                  <div className={stat}>
                    <Globe aria-hidden strokeWidth={1.1} className={ico} />
                    <div><dt className="sr-only">{text.range}</dt><dd className="font-mono tabular-nums"><span className="block font-semibold">{rng?.primary ?? '–'}</span>{rng?.secondary && <span className="block text-xs text-fg/65">{rng.secondary}</span>}</dd></div>
                  </div>
                  <div className={stat}>
                    <Users aria-hidden strokeWidth={1.1} className={ico} />
                    <div><dt className="sr-only">{text.passengers}</dt><dd className="font-mono font-semibold tabular-nums">{i.maxPassengers ?? '–'}</dd></div>
                  </div>
                  <div className={stat}>
                    <Gauge aria-hidden strokeWidth={1.1} className={ico} />
                    <div><dt className="sr-only">{text.speed}</dt><dd className="font-mono tabular-nums"><span className="block font-semibold">{spd?.primary ?? '–'}</span>{spd?.secondary && <span className="block text-xs text-fg/65">{spd.secondary}</span>}</dd></div>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center gap-md md:flex-col md:items-end md:gap-xs">
                  <span aria-hidden className="inline-flex min-h-11 items-center bg-fg px-md text-sm font-semibold uppercase tracking-[0.08em] text-canvas rounded-ot-control group-hover:opacity-90">{text.seeDetails} →</span>
                  {options.showCompareToggle && i.comparisonEligible && (
                    <label className={`relative z-10 inline-flex min-h-11 items-center gap-xs text-sm ${full ? 'opacity-50' : 'cursor-pointer'}`}>
                      <input type="checkbox" className="size-5 accent-[var(--ot-accent)]" checked={isSel} disabled={full} onChange={() => toggleSel(i.key)}
                        aria-label={text.selectToCompare.replace('{model}', i.modelName)} />
                      {text.compareLabel}
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className={`mt-lg grid gap-lg ${cols}`}>
          {results.map(i => {
            const range = formatSpec('rangeNm', i.rangeNm, locale, 'both')
            const paxTxt = i.maxPassengers != null ? String(i.maxPassengers) : null
            const isSel = selected.includes(i.key)
            const full = selected.length >= 4 && !isSel
            const body = (
              <>
                {settings.showImages && settings.cardStyle === 'image' && (
                  <div className="relative aspect-[7/3] overflow-hidden bg-surface">
                    {i.heroImageUrl && (
                      <Image src={i.heroImageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                    )}
                  </div>
                )}
                <div className={settings.compact ? 'pt-sm' : 'pt-md'}>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-fg/70">
                    {i.family ? familyLabels[i.family] ?? i.family : ''}{i.lifecycleStatus ? ` / ${lifecycleLabels[i.lifecycleStatus] ?? i.lifecycleStatus}` : ''}
                  </p>
                  <h3 className="mt-xs text-2xl font-light leading-tight tracking-[-0.01em] group-hover:underline">{i.modelName}</h3>
                  {i.tagline && <p className="mt-xs text-pretty text-sm text-fg/80">{i.tagline}</p>}
                  <dl className={`mt-sm grid grid-cols-2 gap-sm border-t border-fg/15 pt-sm ${settings.cardStyle === 'spec' ? 'text-base' : 'text-sm'}`}>
                    {range && <div><dt className="text-xs uppercase tracking-[0.08em] text-fg/65">{text.range}</dt><dd className="font-mono tabular-nums">{range.primary}{range.secondary && <span className="block text-xs text-fg/65">{range.secondary}</span>}</dd></div>}
                    {paxTxt && <div><dt className="text-xs uppercase tracking-[0.08em] text-fg/65">{text.passengers}</dt><dd className="font-mono tabular-nums">{paxTxt}</dd></div>}
                  </dl>
                </div>
              </>
            )
            return (
              <li key={i.key} className="group flex flex-col">
                {i.url ? (
                  <Link href={i.url} aria-label={text.viewModel.replace('{model}', i.modelName)} className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{body}</Link>
                ) : <div>{body}</div>}
                {options.showCompareToggle && i.comparisonEligible && (
                  <label className={`mt-sm inline-flex min-h-11 items-center gap-xs text-sm ${full ? 'opacity-50' : 'cursor-pointer'}`}>
                    <input type="checkbox" className="size-5 accent-[var(--ot-accent)]" checked={isSel} disabled={full} onChange={() => toggleSel(i.key)}
                      aria-label={text.selectToCompare.replace('{model}', i.modelName)} />
                    {text.compareLabel}
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Compare bar ───────────────────────────────────────────────────── */}
      {options.showCompareToggle && selected.length > 0 && (
        <div className="sticky bottom-md z-20 mt-lg flex flex-wrap items-center justify-between gap-md border border-fg/30 bg-canvas p-md shadow-lg">
          <p role="status" className="text-sm">
            {selected.length >= 4 ? text.maxCompare : selected.length < 2 ? text.compareHint : text.compareSelected.replace('{count}', String(selected.length))}
          </p>
          {selected.length >= 2 ? (
            <Link href={`${compareBase}?ids=${selected.join(',')}`} className="inline-flex min-h-11 items-center bg-fg px-md text-sm font-semibold text-canvas hover:opacity-90 rounded-ot-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">
              {text.compareSelected.replace('{count}', String(selected.length))}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}

const nm = (n: number, locale: string) => formatSpec('rangeNm', n, locale, 'imperial')?.primary ?? String(n)
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))

/**
 * Two native range inputs stacked on one track. Each stays a real, labelled,
 * keyboard-operable slider; the track fill is drawn between the two thumbs.
 */
function DualRange({ min, max, step, value, onChange, labelMin, labelMax }: {
  min: number; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void; labelMin: string; labelMax: string
}) {
  const [lo, hi] = value
  const pct = (n: number) => ((n - min) / (max - min)) * 100
  // pointer-events only on the thumbs, so both handles stay grabbable when overlapped.
  const thumb =
    'pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent ' +
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-ot-control [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-canvas [&::-webkit-slider-thumb]:bg-fg [&::-webkit-slider-thumb]:shadow ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-ot-control [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-canvas [&::-moz-range-thumb]:bg-fg ' +
    'focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-offset-2 focus-visible:[&::-webkit-slider-thumb]:outline-brand'
  return (
    <div className="relative h-6">
      <div aria-hidden className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-fg/20" />
      <div aria-hidden className="absolute top-1/2 h-1 -translate-y-1/2 bg-fg" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      <input type="range" aria-label={labelMin} min={min} max={max} step={step} value={lo}
        onChange={e => onChange([Math.min(Number(e.target.value), hi), hi])} className={thumb} />
      <input type="range" aria-label={labelMax} min={min} max={max} step={step} value={hi}
        onChange={e => onChange([lo, Math.max(Number(e.target.value), lo)])} className={thumb} />
    </div>
  )
}
