'use client'

import { useEffect, useRef } from 'react'

type FadeInOptions = {
  threshold?: number
  rootMargin?: string
  once?: boolean
  effectClasses?: string[]
}

export function useAppearEffect<T extends HTMLElement>(
  options: FadeInOptions = {
    threshold: 0.2,
    rootMargin: '0px',
    once: true,
    effectClasses: ['opacity-100'],
  }
) {
  const { threshold = 0.2, rootMargin = '0px', once = true, effectClasses = ['opacity-100'] } = options
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(...effectClasses)

          if (once) {
            observer.unobserve(el)
          }
        } else {
          if (!once) {
            el.classList.remove(...effectClasses)
          }
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [threshold, rootMargin, once, effectClasses])

  return ref
}
