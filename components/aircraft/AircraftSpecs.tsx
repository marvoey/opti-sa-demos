'use client'

import { useEffect, useId, useState } from 'react'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { defaultUnitSystem, formatSpec, SPEC_GROUPS, type SpecUnit } from '@/lib/aircraftFormat'
import AircraftDiagram from './AircraftDiagram'

type Text = {
  heading: string; measure: string; metric: string; imperial: string
  performance: string; cabin: string; exterior: string; powerplant: string
  engine: string; certified: string
  diagramLabel: string; diagramNote: string
}

type Props = {
  locale: string
  modelName: string
  values: Partial<Record<AircraftSpecField, number>>
  engineModel?: string
  certDate?: string | null
  fieldLabels: Record<string, string>
  diagramFrontUrl?: string
  diagramSideUrl?: string
  text: Text
}

const STORAGE_KEY = 'aircraft-unit'

/**
 * The full specification section: a metric/imperial toggle (the locale picks the
 * default, the visitor can flip it), a dimensioned aircraft diagram, and the
 * spec groups. Reads ONLY from the aircraft record's stored values and converts
 * at render time, so the numbers cannot disagree with the rest of the page.
 * Sits on the brand color with a faint blueprint grid.
 */
export default function AircraftSpecs({ locale, modelName, values, engineModel, certDate, fieldLabels, diagramFrontUrl, diagramSideUrl, text }: Props) {
  const [unit, setUnit] = useState<SpecUnit>(defaultUnitSystem(locale))
  const radioName = useId()

  // A visitor's explicit choice persists across aircraft pages. Per-viewer
  // convenience only: failures (private mode, blocked storage) are ignored.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'metric' || saved === 'imperial') setUnit(saved)
    } catch { /* storage unavailable */ }
  }, [])

  const choose = (next: SpecUnit) => {
    setUnit(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* storage unavailable */ }
  }

  const fmt = (f: AircraftSpecField) => formatSpec(f, values[f], locale, unit)
  const groupTitle: Record<string, string> = {
    performance: text.performance, cabin: text.cabin, exterior: text.exterior, powerplant: text.powerplant,
  }

  const wing = fmt('wingspanM'), len = fmt('overallLengthM'), hgt = fmt('overallHeightM')
  const showDiagram = !!(wing && len && hgt)

  return (
    <section aria-labelledby="aircraft-specs-heading" className="relative isolate overflow-hidden bg-brand text-fg-on-brand">
      {/* Blueprint grid: fine 24px lines with a stronger 120px line, token-derived. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(oklch(from var(--ot-fg-on-brand) l c h / 0.07) 1px, transparent 1px),' +
            'linear-gradient(90deg, oklch(from var(--ot-fg-on-brand) l c h / 0.07) 1px, transparent 1px),' +
            'linear-gradient(oklch(from var(--ot-fg-on-brand) l c h / 0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, oklch(from var(--ot-fg-on-brand) l c h / 0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
        }}
      />

      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        <div className="flex flex-col items-center text-center">
          <h2 id="aircraft-specs-heading" className="text-balance text-[clamp(2rem,4.5vw,3rem)] font-light leading-[1.05] tracking-[-0.02em]">
            {text.heading}
          </h2>
          <div aria-hidden className="mt-md h-px w-48 bg-fg-on-brand/40" />

          <div className="mt-lg flex flex-wrap items-center justify-center gap-sm">
            <span id={`${radioName}-label`} className="text-sm font-semibold uppercase tracking-[0.1em]">{text.measure}</span>
            <div role="radiogroup" aria-labelledby={`${radioName}-label`} className="inline-flex border border-fg-on-brand/60 p-0.5 rounded-ot-control">
              {(['imperial', 'metric'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={unit === u}
                  onClick={() => choose(u)}
                  className={`min-h-9 px-md text-xs font-bold uppercase tracking-[0.12em] transition-colors duration-200 rounded-ot-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    unit === u ? 'bg-fg-on-brand text-brand' : 'text-fg-on-brand hover:bg-fg-on-brand/15'
                  }`}
                >
                  {u === 'imperial' ? text.imperial : text.metric}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showDiagram && (
          <div className="mt-xl">
            <AircraftDiagram
              wingspan={{ label: fieldLabels.wingspanM, value: wing!.text }}
              length={{ label: fieldLabels.overallLengthM, value: len!.text }}
              height={{ label: fieldLabels.overallHeightM, value: hgt!.text }}
              ariaLabel={text.diagramLabel
                .replace('{model}', modelName)
                .replace('{length}', len!.text)
                .replace('{wingspan}', wing!.text)
                .replace('{height}', hgt!.text)}
              note={text.diagramNote}
              frontSrc={diagramFrontUrl}
              sideSrc={diagramSideUrl}
            />
          </div>
        )}

        <div className="mt-xl grid gap-x-lg gap-y-xl md:grid-cols-2 lg:grid-cols-4">
          {SPEC_GROUPS.map(g => {
            const rows = g.fields
              .map(f => {
                const v = fmt(f)
                return v ? { field: f, label: fieldLabels[f], v } : null
              })
              .filter((r): r is NonNullable<typeof r> => r !== null)
            const isPower = g.id === 'powerplant'
            if (!rows.length && !(isPower && (engineModel || certDate))) return null
            return (
              <div key={g.id} className="min-w-0">
                <h3 className="border-b border-fg-on-brand/40 pb-sm text-sm font-bold uppercase tracking-[0.08em]">
                  {groupTitle[g.id]}
                </h3>
                <dl className="divide-y divide-fg-on-brand/15">
                  {isPower && engineModel && (
                    <div className="flex items-baseline justify-between gap-md py-sm">
                      <dt className="min-w-0 text-pretty text-sm opacity-80">{text.engine}</dt>
                      <dd className="shrink-0 text-right font-mono text-sm">{engineModel}</dd>
                    </div>
                  )}
                  {rows.map(r => (
                    <div key={r.field} className="flex items-baseline justify-between gap-md py-sm">
                      <dt className="min-w-0 text-pretty text-sm opacity-80">{r.label}</dt>
                      <dd className="shrink-0 text-right font-mono tabular-nums">
                        <span className="block text-base font-medium">{r.v.primary}</span>
                        {r.v.secondary && <span className="block text-xs opacity-65">{r.v.secondary}</span>}
                      </dd>
                    </div>
                  ))}
                  {isPower && certDate && (
                    <div className="flex items-baseline justify-between gap-md py-sm">
                      <dt className="min-w-0 text-pretty text-sm opacity-80">{text.certified}</dt>
                      <dd className="shrink-0 text-right font-mono text-sm">{certDate}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
