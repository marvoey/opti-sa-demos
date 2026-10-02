'use client'

/**
 * ReviewCommentsPanel
 *
 * Client half of ReviewCommentsStrip. Shows external reviewer comments to the
 * CMS author: a card with a corner "New" ribbon when anything arrived today,
 * friendly viewer-local timestamps, and a dismiss / re-open toggle that
 * remembers per page (and re-opens itself when a newer comment arrives).
 *
 * Time-dependent output (ribbon, "Today at…") is only rendered after hydration —
 * the server has no idea what the viewer's timezone or "today" is.
 */

import { useId, useState, useSyncExternalStore } from 'react'
import { ChevronDown, ChevronUp, Mail, MessageSquare } from 'lucide-react'

export type PanelComment = {
  id:          string
  name:        string
  email?:      string
  comment:     string
  ver:         string
  path:        string
  submittedAt: string
}

type Props = { contentKey: string; comments: PanelComment[] }

const VISIBLE_BY_DEFAULT = 3

// ── "now", ticking once a minute; null on the server ─────────────────────────

function subscribeMinute(cb: () => void) {
  const t = setInterval(cb, 60_000)
  return () => clearInterval(t)
}
const minuteNow  = (): number | null => Math.floor(Date.now() / 60_000) * 60_000
const serverNow  = (): number | null => null

// ── Dismissed state (localStorage, tolerant of it being unavailable) ─────────

const dismissListeners = new Set<() => void>()
function subscribeDismiss(cb: () => void) {
  dismissListeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    dismissListeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}
function readDismissed(storageKey: string): string | null {
  try { return localStorage.getItem(storageKey) } catch { return null }
}
function writeDismissed(storageKey: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, value)
  } catch {
    // storage blocked — the in-memory override in the component still works
  }
  dismissListeners.forEach(l => l())
}

// ── Friendly dates ───────────────────────────────────────────────────────────

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000)

function friendlyTime(iso: string, now: number): string {
  const t    = new Date(iso)
  const diff = now - t.getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < 60_000)    return 'Just now'
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  const time = t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const days = dayDiff(t, new Date(now))
  if (days <= 0) return `Today at ${time}`
  if (days === 1) return `Yesterday at ${time}`
  if (days < 7)  return `${t.toLocaleDateString(undefined, { weekday: 'long' })} at ${time}`
  const sameYear = t.getFullYear() === new Date(now).getFullYear()
  const date = t.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  })
  return `${date} at ${time}`
}

const fullTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })

const isToday = (iso: string, now: number | null) =>
  now !== null && dayDiff(new Date(iso), new Date(now)) === 0

// ── Small pieces ─────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = (parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? '?'])
    .map(p => Array.from(p)[0] ?? '')
  return letters.join('').toUpperCase()
}

function mailtoHref(email: string, path: string) {
  const to = encodeURIComponent(email).replace(/%40/g, '@')
  return `mailto:${to}?subject=${encodeURIComponent(`Re: your feedback on ${path}`)}`
}

const chip =
  'inline-flex items-center px-1.5 py-0.5 text-label font-semibold leading-none border border-fg/15 text-fg-muted rounded-ot-control'

function NewChip() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-label font-semibold uppercase tracking-label leading-none bg-brand text-fg-on-brand rounded-ot-control">
      New
    </span>
  )
}

function CommentItem({ c, now }: { c: PanelComment; now: number | null }) {
  const fresh = isToday(c.submittedAt, now)
  return (
    <li className="flex gap-md py-md border-t border-fg/8 first:border-t-0 first:pt-0 last:pb-0">
      <span
        className="shrink-0 w-9 h-9 rounded-full bg-brand/15 text-fg flex items-center justify-center text-label font-semibold"
        aria-hidden
      >
        {initials(c.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-sm gap-y-1">
          <span className="font-semibold text-fg">{c.name}</span>
          {fresh && <NewChip />}
          <time dateTime={c.submittedAt} title={fullTime(c.submittedAt)} className="text-label text-fg-muted">
            {now !== null ? friendlyTime(c.submittedAt, now) : ''}
          </time>
          {c.ver && <span className={chip}>v{c.ver}</span>}
        </div>
        <p className="mt-1 text-body text-fg whitespace-pre-wrap break-words">{c.comment}</p>
        {c.email && (
          <a
            href={mailtoHref(c.email, c.path)}
            className="mt-1 -ml-2 px-2 min-h-[44px] inline-flex items-center gap-xs text-label font-semibold text-fg underline underline-offset-4 decoration-brand hover:decoration-2 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Mail className="w-3.5 h-3.5" aria-hidden />
            Reply to {c.name.split(/\s+/)[0]}
            <span className="font-normal text-fg-muted no-underline">· {c.email}</span>
          </a>
        )}
      </div>
    </li>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function ReviewCommentsPanel({ contentKey, comments }: Props) {
  const bodyId     = useId()
  const storageKey = `review-comments:dismissed:${contentKey}`
  const latestId   = comments[0]?.id ?? ''

  const now       = useSyncExternalStore(subscribeMinute, minuteNow, serverNow)
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    () => readDismissed(storageKey),
    () => null,
  )
  // In-memory override so the toggle works even when storage is blocked.
  const [override, setOverride] = useState<'open' | 'closed' | null>(null)
  const [showAll, setShowAll]   = useState(false)

  // A comment newer than the one that was dismissed re-opens the panel.
  const collapsed = override ? override === 'closed' : dismissed === latestId
  const freshCount = comments.filter(c => isToday(c.submittedAt, now)).length
  const hasFresh   = freshCount > 0

  function setCollapsed(next: boolean) {
    setOverride(next ? 'closed' : 'open')
    writeDismissed(storageKey, next ? latestId : null)
  }

  const visible = showAll ? comments : comments.slice(0, VISIBLE_BY_DEFAULT)
  const hidden  = comments.length - visible.length
  const count   = comments.length

  return (
    <section aria-label="Reviewer feedback" className="w-full bg-brand/8 border-b border-brand/15">
      <div className="max-w-screen-xl mx-auto px-lg py-sm">

        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-expanded={false}
            aria-controls={bodyId}
            className="w-full min-h-[44px] flex items-center gap-sm px-md bg-surface border border-fg/12 rounded-ot-control text-left hover:border-fg/25 transition-colors focus-visible:outline-2 focus-visible:outline-brand"
          >
            <MessageSquare className="w-4 h-4 text-fg" aria-hidden />
            <span className="text-label font-semibold uppercase tracking-label text-fg">Reviewer feedback</span>
            <span className={chip}>{count}</span>
            {hasFresh && <NewChip />}
            <span className="ml-auto flex items-center gap-xs text-label text-fg-muted">
              Show <ChevronDown className="w-4 h-4" aria-hidden />
            </span>
          </button>
        ) : (
          <div
            id={bodyId}
            className="relative overflow-hidden bg-surface border border-fg/12 rounded-ot-surface shadow-[0_4px_24px_var(--ot-bloom-brand-faint)]"
          >
            {/* Corner ribbon — only when something arrived today */}
            {hasFresh && (
              <div className="pointer-events-none absolute left-0 top-0 w-[76px] h-[76px] overflow-hidden" aria-hidden>
                <span className="absolute left-[-28px] top-[15px] w-[116px] -rotate-45 py-0.5 text-center text-label font-semibold uppercase tracking-label leading-none bg-brand text-fg-on-brand shadow-[0_2px_6px_oklch(from_var(--ot-fg)_l_c_h/0.25)]">
                  New
                </span>
              </div>
            )}

            <div className={`flex items-center gap-sm pr-sm py-sm ${hasFresh ? 'pl-[3.75rem]' : 'pl-md'}`}>
              <h2 className="text-label font-semibold uppercase tracking-label text-fg">
                Reviewer feedback
                {hasFresh && <span className="sr-only"> — new feedback today</span>}
              </h2>
              <span className={chip}>{count}</span>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-expanded
                aria-controls={bodyId}
                className="ml-auto min-h-[44px] px-sm flex items-center gap-xs text-label text-fg-muted hover:text-fg transition-colors focus-visible:outline-2 focus-visible:outline-brand"
              >
                Hide <ChevronUp className="w-4 h-4" aria-hidden />
              </button>
            </div>

            <div className="px-md pb-md pt-xs border-t border-fg/8">
              <ul className="pt-md">
                {visible.map(c => <CommentItem key={c.id} c={c} now={now} />)}
              </ul>
              {(hidden > 0 || showAll) && count > VISIBLE_BY_DEFAULT && (
                <button
                  type="button"
                  onClick={() => setShowAll(v => !v)}
                  aria-expanded={showAll}
                  className="mt-sm min-h-[44px] px-md text-label font-semibold text-fg border border-fg/15 rounded-ot-control hover:border-fg/30 transition-colors focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {showAll ? 'Show fewer' : `Show ${hidden} more`}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
