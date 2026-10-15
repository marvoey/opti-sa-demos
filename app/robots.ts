import type { MetadataRoute } from 'next'
import { AI_CRAWLERS, INDEXING_ALLOWED } from '@/lib/indexing'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

  return {
    rules: [
      // Crawling stays open on purpose. Keeping search results clean is done with a
      // noindex header (see lib/indexing.ts), which a crawler only sees if it may fetch the page.
      { userAgent: '*', allow: '/', disallow: ['/api/', '/opti-admin/'] },

      // AI answer engines and assistants: explicitly permitted for demo analysis
      ...AI_CRAWLERS.map(userAgent => ({ userAgent, allow: '/' })),
    ],
    // Do not hand search engines a sitemap unless indexing is enabled.
    sitemap: INDEXING_ALLOWED && siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  }
}
