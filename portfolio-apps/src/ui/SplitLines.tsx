/**
 * A headline that arrives one line at a time.
 *
 * Every word is wrapped in a clipping box with the word itself translated below
 * it, so the line rises out of nothing rather than fading in. The catch with a
 * responsive headline is that you do not know where the lines break until the
 * browser has laid it out, and splitting by line in the markup would break at
 * the wrong place on a narrow screen.
 *
 * So the split is by word, and the *stagger* is by line: after layout we read
 * each word's `offsetTop`, group the words that share one, and write the line
 * index onto the element as a custom property. Words on the same line then move
 * together, which is what reads as a line reveal. A ResizeObserver re-measures
 * when the headline reflows.
 *
 * No dependency, no character soup in the accessibility tree — the whole
 * heading carries its own text as an aria-label and the pieces are hidden.
 */
import { Fragment, useEffect, useRef, type ElementType } from 'react'

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function SplitLines({
  text, as: As = 'span', className, delay = 0, step = 90, play = true,
}: {
  text: string
  as?: ElementType
  className?: string
  /** Milliseconds before the first line moves. */
  delay?: number
  /** Milliseconds between one line and the next. */
  step?: number
  /** Pass false to hold the reveal until a parent says go. */
  play?: boolean
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced()) { el.setAttribute('data-shown', 'true'); return }

    const measure = () => {
      const words = Array.from(el.querySelectorAll<HTMLElement>('.sl__w'))
      let top: number | null = null
      let line = -1
      for (const w of words) {
        const t = w.offsetTop
        // A tolerance, because sub-pixel layout puts words on the same visual
        // line a fraction of a pixel apart.
        if (top === null || t > top + 2) { line += 1; top = t }
        w.style.setProperty('--l', String(line))
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Web fonts land after first paint and change where the lines break.
    void document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [text])

  useEffect(() => {
    const el = ref.current
    if (!el || !play) return
    const id = window.requestAnimationFrame(() => el.setAttribute('data-shown', 'true'))
    // Never leave a headline invisible if a frame is dropped.
    const failsafe = window.setTimeout(() => el.setAttribute('data-shown', 'true'), 1800)
    return () => { window.cancelAnimationFrame(id); window.clearTimeout(failsafe) }
  }, [play])

  const words = text.split(/\s+/).filter(Boolean)

  return (
    <As
      ref={ref}
      className={className ? `sl ${className}` : 'sl'}
      style={{ '--sl-delay': `${delay}ms`, '--sl-step': `${step}ms` } as React.CSSProperties}
      aria-label={text}
    >
      {words.map((w, i) => (
        // The space belongs between the clipping boxes, never inside one: a
        // box with `overflow: hidden` swallows its own trailing space and the
        // headline runs together.
        <Fragment key={`${w}-${i}`}>
          <span className="sl__w" aria-hidden="true"><span className="sl__i">{w}</span></span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </As>
  )
}
