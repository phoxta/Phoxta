import { createContext, useContext } from 'react'
import type { ProjectApp } from '@/content/types'
import type { Product } from '@/content/product'
import type { Frontier } from '@/content/frontier'
import type { Resolution } from '@/app/resolve'

export interface SiteCtx {
  /** The engineering content: models, data, results. Always present. */
  project: ProjectApp
  /** The commercial layer. Null while a product module is still being written. */
  product: Product | null
  /** The 2026 state-of-the-art comparison. Null until researched. */
  frontier: Frontier | null
  resolution: Resolution
}

export const SiteContext = createContext<SiteCtx | null>(null)

export function useSite(): SiteCtx {
  const v = useContext(SiteContext)
  if (!v) throw new Error('useSite outside a product site')
  return v
}

/** The commercial name when there is one, else the research name. */
export function productName(s: SiteCtx) {
  return s.product?.name ?? s.project.short
}
