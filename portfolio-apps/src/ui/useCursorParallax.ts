/**
 * Depth that follows the pointer.
 *
 * The hook writes two damped numbers in −1..1 onto the element as `--px` and
 * `--py`; the stylesheet decides how far each layer moves. Everything about it
 * is deliberately restrained:
 *
 *   • It never runs on touch, where a pointer position is a fiction, and never
 *     when the visitor has asked for reduced motion.
 *   • It eases toward the cursor at 8% per frame. Lower and the layers trail
 *     like a balloon on a string; higher and it becomes twitchy 1:1 tracking.
 *   • The loop stops itself once it has settled, when the hero scrolls out of
 *     view, and when the tab is hidden. An animation frame that runs forever
 *     for no visible reason is the most common cause of a warm laptop.
 */
import { useEffect, useRef } from 'react'

const LERP = 0.08
const EPSILON = 0.0004

export function useCursorParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let tx = 0, ty = 0        // where the pointer is
    let cx = 0, cy = 0        // where the layers have got to
    let raf = 0
    let visible = true

    const tick = () => {
      cx += (tx - cx) * LERP
      cy += (ty - cy) * LERP
      el.style.setProperty('--px', cx.toFixed(4))
      el.style.setProperty('--py', cy.toFixed(4))
      raf = Math.abs(tx - cx) > EPSILON || Math.abs(ty - cy) > EPSILON
        ? requestAnimationFrame(tick)
        : 0
    }

    const start = () => { if (!raf && visible) raf = requestAnimationFrame(tick) }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2
      start()
    }
    const onLeave = () => { tx = 0; ty = 0; start() }
    const onHidden = () => { if (document.hidden) stop() }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (!visible) stop()
    }, { threshold: 0 })
    io.observe(el)

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    document.addEventListener('visibilitychange', onHidden)

    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onHidden)
      io.disconnect()
      stop()
    }
  }, [])

  return ref
}
