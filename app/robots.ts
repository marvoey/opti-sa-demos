import type { MetadataRoute } from 'next'
import { getRequestBaseUrl } from '@/lib/optimizely'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Per request host: one deployment serves several demo domains, and each
  // must point crawlers at its own sitemap.
  const siteUrl = await getRequestBaseUrl()

  return {
    rules: [
      // Standard crawlers — full access
      { userAgent: '*', allow: '/', disallow: ['/api/', '/opti-admin/'] },

      // AI answer engines — explicitly permitted for GEO discoverability
      { userAgent: 'GPTBot',           allow: '/' },
      { userAgent: 'ChatGPT-User',     allow: '/' },
      { userAgent: 'ClaudeBot',        allow: '/' },
      { userAgent: 'Claude-Web',       allow: '/' },
      { userAgent: 'PerplexityBot',    allow: '/' },
      { userAgent: 'GoogleOther',      allow: '/' },
      { userAgent: 'Google-Extended',  allow: '/' },
      { userAgent: 'cohere-ai',        allow: '/' },
      { userAgent: 'anthropic-ai',     allow: '/' },
    ],
    sitemap: siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  }
}
