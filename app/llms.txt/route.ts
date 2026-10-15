/**
 * Dynamic llms.txt route — served at /llms.txt
 *
 * The llms.txt specification (llmstxt.org) defines a plain-text file at the
 * site root that gives AI language models a structured, concise summary of
 * the site's purpose, content areas, and key pages — the same function that
 * robots.txt serves for traditional crawlers.
 *
 * This route generates the file from live data so it stays accurate as the CMS
 * content evolves: title and summary come from ThemeManager settings, and the
 * page lists come from published, indexable pages in Content Graph.
 */

import { NextResponse }                           from 'next/server'
import { getClient, getSiteSettings, getRequestDomain, getRequestBaseUrl } from '@/lib/optimizely'

export const dynamic = 'force-dynamic'

// Every published English page/experience for this site channel, whatever its
// content type. `_metadata.url.base` is the protocol + host Graph stores per
// site, so filtering on it keeps a shared CMS instance from leaking another
// site's pages into this file. Querying `_Content` (not per-type roots) means
// new page types show up here without touching this route.
const PAGES_QUERY = `
  query LlmsTxtPages($base: String) {
    _Content(
      where: {
        _metadata: {
          status: { eq: "Published" }
          url: { base: { eq: $base } }
          types: { in: ["_Page", "_Experience"] }
        }
      }
      locale: [en]
      limit: 100
    ) { items { _metadata { displayName types url { default } } } }
  }
`

type PageLink = { title: string; path: string }

// "/campaigns/montreal-grand-prix/" -> "Campaigns"; root-level pages -> "Pages".
function groupFor(path: string): string {
  const segments = path.split('/').filter(Boolean)
  if (segments.length < 2) return 'Pages'
  return segments[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function getPageGroups(baseUrl: string): Promise<[string, PageLink[]][]> {
  if (!baseUrl) return []
  try {
    const data  = (await getClient().request(PAGES_QUERY, { base: baseUrl })) as any
    const items = (data?._Content?.items ?? []) as any[]
    const groups = new Map<string, PageLink[]>()
    const seen = new Set<string>()
    for (const item of items) {
      const types = (item._metadata?.types ?? []) as string[]
      // Folders are structural, not content.
      if (types.some(t => t.endsWith('FolderPage'))) continue
      const raw   = item._metadata?.url?.default as string | null | undefined
      const title = item._metadata?.displayName as string | null | undefined
      if (!raw || !title) continue
      const path = raw.startsWith('http') ? new URL(raw).pathname : raw
      if (seen.has(path)) continue
      seen.add(path)
      const group = groupFor(path)
      groups.set(group, [...(groups.get(group) ?? []), { title, path }])
    }
    for (const links of groups.values()) links.sort((x, y) => x.path.localeCompare(y.path))
    // "Pages" first, the rest alphabetical.
    return [...groups.entries()].sort(([x], [y]) =>
      x === 'Pages' ? -1 : y === 'Pages' ? 1 : x.localeCompare(y))
  } catch {
    return []
  }
}

export async function GET() {
  const domain   = await getRequestDomain()
  const baseUrl  = await getRequestBaseUrl()
  const settings = await getSiteSettings(domain)

  const siteUrl      = (process.env.NEXT_PUBLIC_SITE_URL ?? baseUrl ?? `https://${domain}`).replace(/\/$/, '')
  const siteName     = (settings?.siteName as string | null)               ?? 'Site Accelerator'
  const orgDesc      = (settings?.organizationDescription as string | null) ?? ''
  const seoDesc      = (settings?.defaultSeoDescription as string | null)   ?? ''
  const description  = orgDesc || seoDesc

  const groups = await getPageGroups(baseUrl)

  // Build the llms.txt document following the spec:
  //   # Title           — name of the site
  //   > Blockquote      — one-line summary (what it is)
  //   ## Section        — named content groups with URLs
  const lines: string[] = [
    `# ${siteName}`,
    '',
    description ? `> ${description}` : `> ${siteName} — official website.`,
    '',
  ]

  for (const [group, links] of groups) {
    lines.push(`## ${group}`, '')
    for (const { title, path } of links) lines.push(`- [${title}](${siteUrl}${path})`)
    lines.push('')
  }

  lines.push('## Contact', '', `Website: ${siteUrl}`)

  const body = lines.join('\n').trimEnd()

  return new NextResponse(body, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
