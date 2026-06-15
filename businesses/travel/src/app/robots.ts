import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/account-billing', '/account-password', '/account-savelists', '/checkout', '/pay-done'],
    },
    sitemap: 'https://travel.phoxta.com/sitemap.xml',
  }
}
