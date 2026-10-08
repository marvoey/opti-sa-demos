'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { formatSpec, type SpecUnit } from '@/lib/aircraftFormat'
import { leadingIndices, type CompareColumn } from '@/lib/aircraftCompare'

export interface CompareRow {
  field: AircraftSpecField
  label: string
  /** Section divider text rendered above this row. */
  group?: string
}

type Props = {
  columns: CompareColumn[]
  rows: CompareRow[]
  locale: string
  unitSystem: SpecUnit | 'both'
  featuredKey?: string
  highlightBest?: boolean
  stickyFirstColumn?: boolean
  mobileBehavior?: 'scroll' | 'columnSelector'
  familyLabels: Record<string, string>
  text: { specification: string; best: string; featured: string; columns: string; showColumn: string; tableLabel: string }
}

/**
 * Side-by-side comparison. Every cell is formatted from the aircraft record's
 * stored values at render time: nothing here is typed text, so editing a record
 * updates every comparison that includes it. A real <table> with row and column
 * headers, so screen readers announce "Range, Global 7500, 7,700 nm".
 */
export default function AircraftCompareTable({
  columns, rows, locale, unitSystem, featuredKey, highlightBest, stickyFirstColumn = true,
  mobileBehavior = 'scroll', familyLabels, text,
}: Props) {
  // Column selector (mobile): which columns are shown below md. Default: the first two.
  const [shown, setShown] = useState<string[]>(() => columns.slice(0, 2).map(c => c.key))
  const useSelector = mobileBehavior === 'columnSelector'
  const toggle = (key: string) =>
    setShown(prev => prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key])
  // Hidden columns still render (so the table stays one source) but are display:none below md.
  const hideOnMobile = (key: string) => (useSelector && !shown.includes(key) ? 'max-md:hidden' : '')

  const sticky = stickyFirstColumn ? 'sticky left-0 z-10 bg-canvas' : ''

  return (
    <div>
      {useSelector && (
        <fieldset className="mb-md md:hidden">
          <legend className="mb-xs text-xs font-semibold uppercase tracking-[0.1em] text-fg/70">{text.columns}</legend>
          <div className="flex flex-wrap gap-xs">
            {columns.map(c => (
              <label key={c.key} className="inline-flex min-h-11 cursor-pointer items-center gap-xs border border-fg/30 px-sm text-sm has-[:checked]:bg-fg has-[:checked]:text-canvas has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                <input type="checkbox" className="sr-only" checked={shown.includes(c.key)} onChange={() => toggle(c.key)}
                  aria-label={text.showColumn.replace('{model}', c.modelName)} />
                {c.modelName}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={text.tableLabel}>
        <table className="w-full min-w-[34rem] table-fixed border-collapse text-left">
          <caption className="sr-only">{text.tableLabel}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${sticky} w-[9rem] border-b border-fg/40 p-sm align-bottom text-xs font-semibold uppercase tracking-[0.1em] text-fg/70 md:w-[12rem]`}>
                {text.specification}
              </th>
              {columns.map(c => {
                const featured = c.key === featuredKey
                return (
                  <th key={c.key} scope="col" className={`${hideOnMobile(c.key)} min-w-[9rem] border-b border-fg/40 p-sm align-bottom font-normal ${featured ? 'bg-accent/15' : ''}`}>
                    {featured && <p className="mb-xs text-[0.7rem] font-semibold uppercase tracking-[0.1em]">{text.featured}</p>}
                    {c.heroImageUrl && (
                      <div className="relative mb-sm aspect-[7/3] w-full overflow-hidden bg-surface">
                        <Image src={c.heroImageUrl} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" />
                      </div>
                    )}
                    {c.family && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-fg/70">{familyLabels[c.family] ?? c.family}</p>}
                    <p className="mt-0.5 text-lg font-semibold leading-tight tracking-[-0.01em]">
                      {c.url ? <Link href={c.url} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{c.modelName}</Link> : c.modelName}
                    </p>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const raw = columns.map(c => c.values[row.field] ?? null)
              const best = highlightBest ? leadingIndices(row.field, raw) : []
              return (
                <RowGroup key={row.field} row={row} colSpan={columns.length + 1}>
                  <tr className="border-b border-fg/10">
                    <th scope="row" className={`${sticky} p-sm text-sm font-normal text-fg/80`}>{row.label}</th>
                    {columns.map((c, i) => {
                      const f = formatSpec(row.field, c.values[row.field], locale, unitSystem)
                      const isBest = best.includes(i)
                      const featured = c.key === featuredKey
                      return (
                        <td key={c.key} className={`${hideOnMobile(c.key)} p-sm align-baseline font-mono tabular-nums ${featured ? 'bg-accent/15' : ''} ${isBest ? 'bg-accent/30 font-semibold' : ''}`}>
                          {f ? (
                            <>
                              <span className="block text-base">{f.primary}</span>
                              {f.secondary && <span className="block text-xs text-fg/65">{f.secondary}</span>}
                              {isBest && <span className="sr-only"> ({text.best})</span>}
                            </>
                          ) : <span aria-hidden className="text-fg/40">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                </RowGroup>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Emits a group divider row before the row when it starts a new group. */
function RowGroup({ row, colSpan, children }: { row: CompareRow; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      {row.group && (
        <tr>
          <th scope="colgroup" colSpan={colSpan} className="bg-surface p-sm text-xs font-bold uppercase tracking-[0.1em]">{row.group}</th>
        </tr>
      )}
      {children}
    </>
  )
}
