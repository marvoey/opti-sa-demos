import { cache } from 'react'
import { getClient } from '@/lib/optimizely'

const FOOTER_QUERY = `
  query GetCampaignFooter($key: String!, $locale: String) {
    OT_FooterBlock(
      where: { _metadata: { key: { eq: $key }, locale: { eq: $locale } } }
      limit: 1
    ) {
      items {
        _metadata { key locale }
        footerStyle
        footerLogo { url { default } }
        footerLogoSize
        footerLogoInvertDark
        footerLeftMode
        description { html }
        links { label url { default } }
      }
    }
  }
`

/**
 * The footer block a campaign landing page points at, in the visitor's language
 * with an English fallback. Null when unset or unpublished; the frame then shows
 * its minimal default footer.
 */
export const getCampaignFooter = cache(async function getCampaignFooter(key: string, locale: string): Promise<any | null> {
  for (const loc of locale === 'en' ? ['en'] : [locale, 'en']) {
    try {
      const r: any = await getClient().request(FOOTER_QUERY, { key, locale: loc })
      const item = r?.OT_FooterBlock?.items?.[0]
      if (item) return item
    } catch { /* try the next locale */ }
  }
  return null
})
