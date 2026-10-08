'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

type Labels = {
  heading: string
  /** Hint under the heading, e.g. "Select any image to open the slideshow". */
  hint: string
  /** Template with {n} and {total} placeholders. */
  open: string
  close: string
  prev: string
  next: string
}

/**
 * Lightbox grid built on the native <dialog>: focus is trapped, Escape closes,
 * and the backdrop is the browser's own. EVERY thumbnail is a real button that
 * opens the slideshow at that image, and each carries a permanent expand icon so
 * the affordance is visible on touch screens too (no hover-only cue). Arrow keys
 * step through images while open; clicking the dark surround closes it.
 *
 * The dialog is always dark, whatever the theme: photography reads best against
 * a dark surround, and a light theme must not turn the lightbox white.
 */
export default function AircraftGallery({ urls, modelName, labels }: { urls: string[]; modelName: string; labels: Labels }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState<number | null>(null)
  const total = urls.length

  const open = (i: number) => {
    setIndex(i)
    dialogRef.current?.showModal()
  }
  const step = useCallback((d: number) => setIndex(i => (i == null ? i : (i + d + total) % total)), [total])

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    const onClose = () => setIndex(null)
    dlg.addEventListener('close', onClose)
    return () => dlg.removeEventListener('close', onClose)
  }, [])

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, step])

  if (!total) return null

  // Solid, high-contrast controls: white on the dark surround, large touch targets.
  const control =
    'absolute z-10 flex size-14 items-center justify-center bg-white text-neutral-950 shadow-lg ring-1 ring-black/20 transition-colors duration-150 hover:bg-neutral-200 rounded-ot-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

  return (
    <section aria-labelledby="aircraft-gallery-heading" className="bg-surface text-fg">
      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        <h2 id="aircraft-gallery-heading" className="text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">
          {labels.heading}
        </h2>
        <p className="mt-sm flex items-center gap-xs text-sm text-fg/75">
          <Maximize2 aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
          {labels.hint}
        </p>
        <ul className="mt-lg grid grid-cols-2 gap-sm lg:grid-cols-4">
          {urls.map((url, i) => {
            // The lead image takes a 2x2 block. When an odd number of images
            // remain, the last one spans two columns so the grid has no hole.
            const isLead = i === 0
            const fillsRow = !isLead && i === total - 1 && (total - 1) % 2 === 1
            return (
            <li key={url} className={isLead ? 'col-span-2 row-span-2' : fillsRow ? 'col-span-2' : ''}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={labels.open.replace('{n}', String(i + 1)).replace('{total}', String(total))}
                className={`group relative block w-full cursor-zoom-in overflow-hidden bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${fillsRow ? 'aspect-[8/3]' : 'aspect-[4/3]'}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes={isLead || fillsRow ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                  className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                {/* Always-visible expand cue: a hover-only cue would not exist on touch. */}
                <span
                  aria-hidden
                  className="absolute bottom-sm right-sm flex size-10 items-center justify-center bg-black/65 text-white backdrop-blur-sm transition-colors duration-200 group-hover:bg-black/85 rounded-ot-control"
                >
                  <Maximize2 strokeWidth={1.75} className="size-5" />
                </span>
              </button>
            </li>
            )
          })}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${modelName}: ${labels.heading}`}
        // Click on the dark surround (the dialog box itself, not its contents) closes it.
        onClick={e => { if (e.target === dialogRef.current) dialogRef.current?.close() }}
        className="m-auto h-[min(94svh,64rem)] w-[min(96vw,84rem)] max-w-none overflow-hidden bg-[oklch(9%_0.006_60)] p-0 text-white backdrop:bg-black/90"
      >
        {index != null && (
          <div className="relative h-full w-full">
            <Image src={urls[index]} alt={`${modelName} ${index + 1} / ${total}`} fill sizes="96vw" className="object-contain" />

            <button type="button" onClick={() => dialogRef.current?.close()} aria-label={labels.close}
              className={`${control} right-md top-md`}>
              <X aria-hidden strokeWidth={2.5} className="size-8" />
            </button>

            {total > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label={labels.prev}
                  className={`${control} left-md top-1/2 -translate-y-1/2`}>
                  <ChevronLeft aria-hidden strokeWidth={2.5} className="size-8" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label={labels.next}
                  className={`${control} right-md top-1/2 -translate-y-1/2`}>
                  <ChevronRight aria-hidden strokeWidth={2.5} className="size-8" />
                </button>
                <p aria-live="polite" className="absolute bottom-md left-1/2 -translate-x-1/2 bg-black/70 px-md py-xs font-mono text-sm tabular-nums text-white">
                  {index + 1} / {total}
                </p>
              </>
            )}
          </div>
        )}
      </dialog>
    </section>
  )
}
