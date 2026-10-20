type CmsUrl = string | { default?: string | null; base?: string | null } | null | undefined

const host = (u: string) => {
  try { return new URL(u).host } catch { return '' }
}

/**
 * Resolves a Graph `url`/`link` property to an href. Links to content on
 * another site in the same CMS come back as a relative `default` plus a
 * foreign `base`; returning the relative path would send the visitor to this
 * site instead, so those are returned as absolute URLs.
 *
 * `ownHost` is this site's host (e.g. the request Host header). When omitted
 * it falls back to the host of NEXT_PUBLIC_SITE_URL; if neither is known the
 * relative path is kept.
 */
export function resolveCmsUrl(url: CmsUrl, ownHost?: string): string | undefined {
  if (!url) return undefined
  if (typeof url === 'string') return url
  const path = url.default
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  const base = url.base
  const own  = ownHost || host(process.env.NEXT_PUBLIC_SITE_URL ?? '')
  if (!base || !own || host(base) === own) return path
  return `${base.replace(/\/$/, '')}${path}`
}
