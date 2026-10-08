'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

type Labels = {
  heading: string
  /** Template with {n} and {total} placeholders. */
  open: string
  close: string
  prev: string
  next: string
}

/**
 * Lightbox grid built on the native <dialog>: focus is trapped, Escape closes,
 * and the backdrop is the browser's own. Thumbnails are real buttons; arrow keys
 * step through images while open. The grid is static (no entrance animation),
 * so there is no motion to gate behind prefers-reduced-motion.
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

  return (
    <section aria-labelledby="aircraft-gallery-heading" className="bg-surface text-fg">
      <div className="mx-auto max-w-6xl px-md py-xl lg:px-xl lg:py-2xl">
        <h2 id="aircraft-gallery-heading" className="text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">
          {labels.heading}
        </h2>
        <ul className="mt-lg grid grid-cols-2 gap-sm lg:grid-cols-4">
          {urls.map((url, i) => (
            <li key={url} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={labels.open.replace('{n}', String(i + 1)).replace('{total}', String(total))}
                className="group relative block aspect-[4/3] w-full overflow-hidden bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes={i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                  className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${modelName}: ${labels.heading}`}
        className="m-auto h-[min(92svh,60rem)] w-[min(96vw,80rem)] max-w-none overflow-hidden bg-canvas p-0 text-fg backdrop:bg-black/80"
      >
        {index != null && (
          <div className="relative h-full w-full">
            <Image src={urls[index]} alt={`${modelName} ${index + 1} / ${total}`} fill sizes="96vw" className="object-contain" />
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label={labels.close}
              className="absolute right-sm top-sm min-h-11 min-w-11 bg-canvas/85 px-sm text-lg text-fg focus-visible:outline-2 focus-visible:outline-brand">
              <span aria-hidden>×</span>
            </button>
            {total > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label={labels.prev}
                  className="absolute left-sm top-1/2 min-h-11 min-w-11 -translate-y-1/2 bg-canvas/85 px-sm text-lg text-fg focus-visible:outline-2 focus-visible:outline-brand">
                  <span aria-hidden>‹</span>
                </button>
                <button type="button" onClick={() => step(1)} aria-label={labels.next}
                  className="absolute right-sm top-1/2 min-h-11 min-w-11 -translate-y-1/2 bg-canvas/85 px-sm text-lg text-fg focus-visible:outline-2 focus-visible:outline-brand">
                  <span aria-hidden>›</span>
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </section>
  )
}
