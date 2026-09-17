/**
 * Which app is this? Each project is its own web app at `<slug>.femi.phoxta.com`.
 * On any other host (the Vercel preview URL, localhost, the hub domain) the same
 * build serves every app under a path prefix, `/<slug>/…`, and the hub at `/`.
 */
import { SLUGS, type Slug } from '@/content/registry'
import { MERGED_INTO } from '@/content/types'

export const APP_DOMAIN = 'femi.phoxta.com'
export const HUB_HOST = `apps.${APP_DOMAIN}`

export interface Resolution {
  /** `null` means the hub (index of every app). */
  slug: Slug | null
  /** Router basename: '' on a dedicated host, '/<slug>' on a shared host. */
  basename: string
  /** True when the app is served from its own subdomain. */
  dedicatedHost: boolean
  /**
   * Set when the visitor asked for a product that has since been merged into
   * another. The caller rewrites the address to this before rendering, so an
   * old link lands on the product that replaced it rather than on a 404.
   */
  redirectTo?: string
}

function isSlug(s: string): s is Slug {
  return (SLUGS as readonly string[]).includes(s)
}

/** The product a retired slug now lives inside, if it has one. */
const successor = (s: string): Slug | undefined => MERGED_INTO[s as Slug]

export function resolve(hostname = window.location.hostname, pathname = window.location.pathname): Resolution {
  const host = hostname.toLowerCase()
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const sub = host.slice(0, -(APP_DOMAIN.length + 1))
    if (isSlug(sub)) return { slug: sub, basename: '', dedicatedHost: true }
    const to = successor(sub)
    if (to) return { slug: to, basename: '', dedicatedHost: true, redirectTo: `https://${to}.${APP_DOMAIN}${pathname}` }
  }
  // local dev convenience: customer.localhost
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length)
    if (isSlug(sub)) return { slug: sub, basename: '', dedicatedHost: true }
  }
  const parts = pathname.split('/').filter(Boolean)
  const first = parts[0] ?? ''
  if (isSlug(first)) return { slug: first, basename: `/${first}`, dedicatedHost: false }
  const to = successor(first)
  if (to) {
    // Keep whatever page they were on: /brand/pricing becomes /customer/pricing.
    const rest = parts.slice(1).join('/')
    return { slug: to, basename: `/${to}`, dedicatedHost: false, redirectTo: `/${to}${rest ? `/${rest}` : '/'}` }
  }
  return { slug: null, basename: '', dedicatedHost: false }
}

/** Absolute URL of an app, from wherever we are. */
export function appUrl(slug: Slug, current: Resolution = resolve()): string {
  const host = window.location.hostname.toLowerCase()
  const onProdDomain = host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`)
  if (onProdDomain || current.dedicatedHost) return `https://${slug}.${APP_DOMAIN}/`
  return `/${slug}/`
}

/** Absolute URL of the hub. */
export function hubUrl(current: Resolution = resolve()): string {
  const host = window.location.hostname.toLowerCase()
  const onProdDomain = host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`)
  if (onProdDomain || current.dedicatedHost) return `https://${HUB_HOST}/`
  return '/'
}
