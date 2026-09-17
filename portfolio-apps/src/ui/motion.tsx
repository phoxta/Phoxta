/**
 * Motion.
 *
 * Sections settle into place as they enter the viewport, using IBM Carbon's
 * expressive entrance easing. It is one observer for the whole page, it runs
 * once per element, and it is disabled outright when the visitor asks for
 * reduced motion — the content is already in the DOM either way.
 */
import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let observer: IntersectionObserver | null = null

function watcher(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-shown', 'true')
          observer?.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )
  }
  return observer
}

export function Reveal({
  as: As = 'div', delay = 0, className, children, ...rest
}: { as?: ElementType; delay?: number; className?: string; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-shown', 'true')
      return
    }
    watcher().observe(el)
    // Content must never be stuck invisible: if the observer has not fired by
    // the time the page has settled, show it anyway.
    const failsafe = window.setTimeout(() => el.setAttribute('data-shown', 'true'), 2500)
    return () => {
      window.clearTimeout(failsafe)
      watcher().unobserve(el)
    }
  }, [])

  return (
    <As
      ref={ref}
      className={className ? `u-reveal ${className}` : 'u-reveal'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </As>
  )
}

/** Staggers a list of children without wrapping each call site. */
export function RevealGroup({ children, step = 70, className }: { children: ReactNode[]; step?: number; className?: string }) {
  return (
    <>
      {children.map((c, i) => (
        <Reveal key={i} delay={i * step} className={className}>{c}</Reveal>
      ))}
    </>
  )
}
