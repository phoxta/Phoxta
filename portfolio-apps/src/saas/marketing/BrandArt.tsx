/**
 * Per-product brand art.
 *
 * Every product owns an accent colour; these turn it into an identity — a mesh
 * glow, a plotted grid, a signal trace — so the page has something of its own to
 * look at without resorting to stock photography of offices. All of it is drawn
 * from the product's own numbers, is deterministic, and costs nothing to load.
 */
import { useId, useMemo } from 'react'
import { useSite } from '../context'

/** Soft radial mesh, used behind heroes and calls to action. */
export function Mesh({ intensity = 1, className }: { intensity?: number; className?: string }) {
  return (
    <div
      className={`ba-mesh${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{ '--ba-i': intensity } as React.CSSProperties}
    />
  )
}

/** Faint plotted grid that fades out — signals "measurement" without saying it. */
export function Grid({ className, fade = 'bottom' }: { className?: string; fade?: 'bottom' | 'radial' }) {
  return <div className={`ba-grid ba-grid--${fade}${className ? ` ${className}` : ''}`} aria-hidden="true" />
}

/**
 * A signal trace built from the product's own headline numbers: the shape is
 * stable per product, so each one is visually distinguishable at a glance.
 */
export function Trace({ height = 120, className }: { height?: number; className?: string }) {
  const { project } = useSite()
  const id = useId().replace(/:/g, '')
  const path = useMemo(() => {
    let s = project.num * 2654435761
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const pts: [number, number][] = []
    let y = 50
    for (let i = 0; i <= 28; i++) {
      y = Math.max(14, Math.min(86, y + (rnd() - 0.48) * 26))
      pts.push([(i / 28) * 100, y])
    }
    return pts.map(([x, py], i) => {
      if (i === 0) return `M ${x} ${py}`
      const [px, ppy] = pts[i - 1]
      const cx = (px + x) / 2
      return `C ${cx} ${ppy}, ${cx} ${py}, ${x} ${py}`
    }).join(' ')
  }, [project.num])

  return (
    <svg className={`ba-trace${className ? ` ${className}` : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 100 L 0 100 Z`} fill={`url(#t${id})`} />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** The product mark: its icon on the accent gradient. Used as a favicon-scale logo. */
export function Mark({ size = 40, radius }: { size?: number; radius?: number }) {
  const { project } = useSite()
  const Icon = project.icon
  return (
    <span
      className="ba-mark"
      style={{ width: size, height: size, borderRadius: radius ?? Math.round(size * 0.29) }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.52)} />
    </span>
  )
}
