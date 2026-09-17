/**
 * Photography components.
 *
 * Images are used as content, not wallpaper: a framed shot beside the copy, a
 * mosaic that shows the work, a portrait next to a persona. Every one carries
 * the Pexels attribution its licence asks for, and every one is a real photo of
 * the world this product operates in.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSite } from '../context'
import { photo, photoSrc, type PhotoRole } from '@/content/photos'

/** A framed photograph with an optional floating card over one corner. */
export function PhotoCard({ role, overlay, ratio = '4 / 3', tint = true, className }: {
  role: PhotoRole
  overlay?: ReactNode
  ratio?: string
  tint?: boolean
  className?: string
}) {
  const { project } = useSite()
  const credit = photo(project.slug, role)
  if (!credit) return null
  return (
    <div className={`mk-stage${className ? ` ${className}` : ''}`}>
      <div className={`mk-stage__photo mk-photo-card${tint ? '' : ' mk-stage__photo--plain'}`} style={{ aspectRatio: ratio }}>
        <img src={photoSrc(project.slug, role)} alt={credit.alt} loading="lazy" decoding="async" width={1600} height={1200} />
        <span className="mk-credit--stage">
          <a href={credit.url} target="_blank" rel="noreferrer">{credit.photographer}</a> · Pexels
        </span>
      </div>
      {overlay && <div className="mk-stage__card">{overlay}</div>}
    </div>
  )
}

/** Three photographs at different heights: shows the world, not a hero banner. */
export function PhotoMosaic({ roles = ['detail', 'workspace', 'people'] }: { roles?: PhotoRole[] }) {
  const { project } = useSite()
  const items = roles.map((r) => ({ role: r, credit: photo(project.slug, r) })).filter((x) => x.credit)
  if (!items.length) return null
  return (
    <div className="mk-mosaic">
      {items.map(({ role, credit }, i) => (
        <figure key={role} className={`mk-mosaic__item mk-photo-card mk-mosaic__item--${i + 1}`}>
          <img src={photoSrc(project.slug, role, true)} alt={credit!.alt} loading="lazy" decoding="async" width={800} height={450} />
          <figcaption>
            <a href={credit!.url} target="_blank" rel="noreferrer">{credit!.photographer}</a> · Pexels
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/** A circular portrait for persona and testimonial blocks. */
export function Portrait({ role = 'people', size = 56 }: { role?: PhotoRole; size?: number }) {
  const { project } = useSite()
  const credit = photo(project.slug, role)
  if (!credit) return null
  return (
    <img
      className="mk-portrait"
      src={photoSrc(project.slug, role, true)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
    />
  )
}

/**
 * Counts a number up when it scrolls into view. Falls back to the final value
 * immediately for reduced motion or when the observer is unavailable.
 */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Only animate a value that is essentially one number with decoration.
    const m = value.match(/^([^\d-]*)(-?[\d.,]+)(.*)$/)
    if (reduced || !m || typeof IntersectionObserver === 'undefined') { setText(value); return }
    const [, prefix, digits, suffix] = m
    const target = Number(digits.replace(/,/g, ''))
    if (!Number.isFinite(target)) { setText(value); return }
    const decimals = (digits.split('.')[1] ?? '').length
    const grouped = digits.includes(',')

    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        const n = target * eased
        const shown = decimals ? n.toFixed(decimals) : grouped ? Math.round(n).toLocaleString() : String(Math.round(n))
        setText(`${prefix}${shown}${suffix}`)
        if (t < 1) requestAnimationFrame(tick)
        else setText(value)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })

    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return <span ref={ref} className="u-count">{text}</span>
}
