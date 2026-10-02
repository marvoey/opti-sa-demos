import { getReviewComments, reviewHistoryEnabled, type StoredReviewComment } from '@/lib/review-comments'

/**
 * ReviewCommentsStrip — server component shown to CMS authors alongside
 * ExternalPreviewLinkPanel. Lists external reviewer comments (newest first).
 * Renders nothing when KV is not configured or there are no comments.
 * Reviewer names/emails are self-reported and unverified.
 */

const RECENT = 5

function Item({ c }: { c: StoredReviewComment }) {
  const when = new Date(c.submittedAt)
  const valid = !Number.isNaN(when.getTime())
  return (
    <li className="py-sm border-t border-fg/8 first:border-t-0">
      <div className="flex items-baseline flex-wrap gap-x-sm gap-y-0.5 text-label">
        <span className="font-semibold text-fg">{c.name}</span>
        {c.email && (
          <a href={`mailto:${encodeURI(c.email)}`} className="text-brand underline underline-offset-2">
            {c.email}
          </a>
        )}
        {valid && (
          <time dateTime={when.toISOString()} className="text-fg-muted">
            {when.toISOString().slice(0, 16).replace('T', ' ')} UTC
          </time>
        )}
        {c.ver && <span className="text-fg-muted">v{c.ver}</span>}
      </div>
      <p className="mt-0.5 text-body text-fg whitespace-pre-wrap break-words">{c.comment}</p>
    </li>
  )
}

export async function ReviewCommentsStrip({ contentKey }: { contentKey: string }) {
  // Stored under the dash-less lowercase key (matches validateReviewInput).
  const key = contentKey.replace(/-/g, '').toLowerCase()
  if (!key || !reviewHistoryEnabled()) return null
  const comments = await getReviewComments(key)
  if (comments.length === 0) return null

  const recent = comments.slice(0, RECENT)
  const rest   = comments.slice(RECENT)

  return (
    <section aria-label="Reviewer feedback" className="w-full bg-brand/8 border-b border-brand/15">
      <div className="max-w-screen-xl mx-auto px-lg py-sm">
        <h2 className="text-label uppercase tracking-label font-semibold text-brand">
          Reviewer feedback ({comments.length})
        </h2>
        <ul className="mt-xs">
          {recent.map(c => <Item key={c.id} c={c} />)}
        </ul>
        {rest.length > 0 && (
          <details className="mt-xs">
            <summary className="cursor-pointer text-label text-fg-muted hover:text-fg min-h-[44px] flex items-center">
              Show all ({comments.length})
            </summary>
            <ul>
              {rest.map(c => <Item key={c.id} c={c} />)}
            </ul>
          </details>
        )}
      </div>
    </section>
  )
}
