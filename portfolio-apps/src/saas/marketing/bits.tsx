import { useEffect, type ReactNode } from 'react'
import { Container, LinkButton } from '@/ui'
import { Reveal } from '@/ui/motion'

/* ── Section rhythm ─────────────────────────────────────────────────────── */

export function Section({
  id, tone, kicker, title, sub, center, children, actions, heading = 'h2', size = 'md', wide,
}: {
  id?: string
  tone?: 'tint' | 'dark'
  kicker?: string
  title?: ReactNode
  sub?: ReactNode
  center?: boolean
  children?: ReactNode
  actions?: ReactNode
  /** Use `h1` on the first section of a page so every page has one. */
  heading?: 'h1' | 'h2'
  size?: 'sm' | 'md' | 'lg'
  wide?: boolean
}) {
  const H = heading

  return (
    <section
      id={id}
      className={`mk-sec${tone ? ` mk-sec--${tone}` : ''}${size !== 'md' ? ` mk-sec--${size}` : ''}`}
    >
      <Container wide={wide}>
        {(kicker || title || sub) && (
          <Reveal as="header" className={`mk-head${center ? ' mk-head--center' : ''}`}>
            {kicker && <p className="mk-kicker">{kicker}</p>}
            {title && <H className={heading === 'h1' ? 'u-hero-title' : 'mk-title'}>{title}</H>}
            {sub && <p className="mk-sub">{sub}</p>}
            {actions && <div className="u-row" style={{ justifyContent: center ? 'center' : 'flex-start', marginTop: 'var(--space-2)' }}>{actions}</div>}
          </Reveal>
        )}
        {children}
      </Container>
    </section>
  )
}

/* ── Closing call to action ─────────────────────────────────────────────── */

export function CtaBand({ title, body, primary, secondary }: {
  title: string
  body: string
  primary?: { to: string; label: string }
  secondary?: { to: string; label: string }
}) {
  return (
    <section className="mk-sec mk-sec--sm">
      <Container>
        <Reveal className="mk-cta">
          <div className="mk-cta__glow" aria-hidden="true" />
          <div className="mk-cta__body">
            <h2>{title}</h2>
            <p>{body}</p>
            <div className="u-row" style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}>
              {primary && <LinkButton to={primary.to} variant="inverse" size="lg">{primary.label}</LinkButton>}
              {secondary && <LinkButton to={secondary.to} variant="ghost-inverse" size="lg">{secondary.label}</LinkButton>}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

/* ── Small pieces ───────────────────────────────────────────────────────── */

export function Logo({ domain, name }: { domain?: string; name: string }) {
  return (
    <span className="mk-logo">
      {domain && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt="" width={20} height={20} loading="lazy"
          // Not every company has a favicon the service can find. A broken image
          // placeholder next to the name looks worse than the name alone.
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}
      {name}
    </span>
  )
}

export function Stat({ value, label, caption }: { value: ReactNode; label: string; caption?: string }) {
  return (
    <div className="mk-stat">
      <div className="mk-stat__v u-num">{value}</div>
      <div className="mk-stat__l">{label}</div>
      {caption && <div className="mk-stat__c">{caption}</div>}
    </div>
  )
}

export function useMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    if (!description) return
    let el = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!el) {
      el = document.createElement('meta')
      el.name = 'description'
      document.head.appendChild(el)
    }
    el.content = description
  }, [title, description])
}

export const money = (n: number | null | undefined) => (n == null ? 'Custom' : n === 0 ? 'Free' : `$${n.toLocaleString()}`)

/** Kept so pages written against the older kit keep compiling. */
export { Checks as Ticks } from '@/ui'
export { Reveal } from '@/ui/motion'
