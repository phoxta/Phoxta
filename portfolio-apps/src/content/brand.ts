/**
 * One design system, one brand per product.
 *
 * Every product shares the same foundations — the Untitled UI scale, the Carbon
 * density, the component kit — but a buyer arriving at two of them should not
 * feel they are looking at the same company. Each one therefore owns a display
 * typeface, a shape language, an accent, a background pattern and a hero
 * composition. Those five choices are enough to make them read as siblings from
 * different studios rather than as one template filled in over and over.
 */
import type { Slug } from './types'

/** Which hero composition the landing page uses. */
export type HeroVariant =
  | 'split-right'   // copy left, framed photograph and a floating panel right
  | 'split-left'    // mirrored, for products whose imagery reads left-to-right
  | 'centred'       // centred copy over a wide product panel beneath
  | 'editorial'     // oversized serif headline, photograph bleeding to the edge
  | 'panel'         // dark full-bleed panel, product UI floating over it
  | 'stacked'       // copy, then a photo mosaic — for the field products

/** The decorative layer behind the hero. */
export type Pattern = 'grid' | 'dots' | 'rings' | 'waves' | 'topo' | 'none'

/** Corner language. Sharper reads industrial, softer reads consumer. */
export type Shape = 'sharp' | 'balanced' | 'soft' | 'pill'

export interface BrandTheme {
  /** Display face for headings; body stays Inter for legibility. */
  display: string
  /** The CSS font stack the theme injects. */
  displayStack: string
  /** Heading weight that suits the face. */
  displayWeight: number
  /** Tracking adjustment for the face at display sizes. */
  displayTracking: string
  accent: string
  /** A second hue used for gradients and the dark panels. */
  accentDeep: string
  shape: Shape
  hero: HeroVariant
  pattern: Pattern
  /** Whether the hero sits on a dark surface. */
  heroDark: boolean
  /** Whether headings are set in sentence case or with tighter display case. */
  uppercaseKicker: boolean
}

const STACK: Record<string, string> = {
  Inter: "'Inter Variable', Inter, system-ui, sans-serif",
  'Space Grotesk': "'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif",
  Sora: "'Sora Variable', Sora, system-ui, sans-serif",
  Outfit: "'Outfit Variable', Outfit, system-ui, sans-serif",
  Fraunces: "'Fraunces Variable', Fraunces, Georgia, serif",
  Manrope: "'Manrope Variable', Manrope, system-ui, sans-serif",
  Newsreader: "'Newsreader Variable', Newsreader, Georgia, serif",
}

const theme = (
  display: keyof typeof STACK,
  accent: string,
  accentDeep: string,
  shape: Shape,
  hero: HeroVariant,
  pattern: Pattern,
  opts: Partial<Pick<BrandTheme, 'heroDark' | 'displayWeight' | 'displayTracking' | 'uppercaseKicker'>> = {},
): BrandTheme => ({
  display,
  displayStack: STACK[display],
  displayWeight: opts.displayWeight ?? 600,
  displayTracking: opts.displayTracking ?? '-0.028em',
  accent,
  accentDeep,
  shape,
  hero,
  pattern,
  heroDark: opts.heroDark ?? false,
  uppercaseKicker: opts.uppercaseKicker ?? false,
})

export const BRAND: Record<Slug, BrandTheme> = {
  // The merged customer product: warm, editorial, feedback-led.
  customer: theme('Fraunces', '#7e22ce', '#2e0f4d', 'soft', 'split-right', 'dots', { displayWeight: 500, displayTracking: '-0.012em' }),

  // ── Finance and risk: precise, technical, squared off ──────────────────
  fraud: theme('Space Grotesk', '#1257d1', '#0a1f4d', 'sharp', 'panel', 'grid', { heroDark: true, uppercaseKicker: true, displayTracking: '-0.035em' }),
  loan: theme('Space Grotesk', '#b4243a', '#3d0a14', 'sharp', 'split-right', 'grid', { uppercaseKicker: true }),
  mortgage: theme('Newsreader', '#166f4a', '#0a2e1f', 'balanced', 'editorial', 'topo', { displayWeight: 500, displayTracking: '-0.018em' }),
  'supply-chain': theme('Sora', '#0d7d78', '#062f2d', 'sharp', 'split-left', 'topo', { heroDark: true, uppercaseKicker: true }),

  // ── Growth and customer: warmer, rounder, consumer-facing ──────────────
  clv: theme('Plus Jakarta Sans', '#c2410c', '#4a1a06', 'soft', 'split-right', 'rings'),
  marketing: theme('Plus Jakarta Sans', '#0f766e', '#062f2c', 'pill', 'centred', 'waves'),
  music: theme('Outfit', '#7c3aed', '#2b1065', 'pill', 'centred', 'waves', { heroDark: true, displayTracking: '-0.032em' }),
  reviews: theme('Fraunces', '#7e22ce', '#2e0f4d', 'soft', 'editorial', 'dots', { displayWeight: 500, displayTracking: '-0.012em' }),
  brand: theme('Fraunces', '#be123c', '#4c0519', 'soft', 'editorial', 'dots', { displayWeight: 500, displayTracking: '-0.012em' }),

  // ── People and workplace: humane, approachable ─────────────────────────
  people: theme('Manrope', '#4338ca', '#1e1b4b', 'soft', 'split-right', 'rings'),
  ergonomics: theme('Manrope', '#ea580c', '#431407', 'balanced', 'stacked', 'dots'),
  ppe: theme('Manrope', '#a16207', '#3d2a06', 'sharp', 'stacked', 'grid', { uppercaseKicker: true }),

  // ── Field and vision: industrial, image-led ────────────────────────────
  retail: theme('Outfit', '#0369a1', '#082f49', 'balanced', 'split-left', 'grid'),
  automotive: theme('Sora', '#334155', '#0f172a', 'sharp', 'stacked', 'topo', { uppercaseKicker: true }),

  // ── Clinical: serious, quiet, evidence-first ───────────────────────────
  malaria: theme('Newsreader', '#0e7490', '#083344', 'balanced', 'split-left', 'waves', { displayWeight: 500, displayTracking: '-0.018em' }),
  parkinsons: theme('Newsreader', '#6d28d9', '#2e1065', 'balanced', 'editorial', 'waves', { displayWeight: 500, displayTracking: '-0.018em' }),
  emotion: theme('Outfit', '#db2777', '#500724', 'pill', 'centred', 'rings', { heroDark: true }),
}

export const brandOf = (slug: Slug): BrandTheme => BRAND[slug]

/** Radius values per shape language, applied over the base scale. */
export const SHAPE_RADII: Record<Shape, Record<string, string>> = {
  sharp: { sm: '2px', md: '3px', lg: '4px', xl: '5px', '2xl': '6px', '3xl': '8px', '4xl': '10px' },
  balanced: { sm: '5px', md: '7px', lg: '9px', xl: '11px', '2xl': '14px', '3xl': '18px', '4xl': '22px' },
  soft: { sm: '8px', md: '11px', lg: '14px', xl: '18px', '2xl': '22px', '3xl': '28px', '4xl': '34px' },
  pill: { sm: '10px', md: '999px', lg: '18px', xl: '22px', '2xl': '28px', '3xl': '36px', '4xl': '44px' },
}

/** CSS custom properties for a product, applied to its root element. */
export function brandVars(slug: Slug): Record<string, string> {
  const b = brandOf(slug)
  const radii = SHAPE_RADII[b.shape]
  return {
    '--brand': b.accent,
    '--brand-deep': b.accentDeep,
    '--font-display': b.displayStack,
    '--display-weight': String(b.displayWeight),
    '--display-tracking': b.displayTracking,
    '--radius-sm': radii.sm,
    '--radius-md': radii.md,
    '--radius-lg': radii.lg,
    '--radius-xl': radii.xl,
    '--radius-2xl': radii['2xl'],
    '--radius-3xl': radii['3xl'],
    '--radius-4xl': radii['4xl'],
  }
}
