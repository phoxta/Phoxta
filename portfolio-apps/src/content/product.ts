/**
 * The commercial layer: each project as a sellable SaaS product.
 *
 * One module per product in `src/content/product/<slug>.ts`, `export default` a
 * `Product`. This drives the marketing site (home, features, solutions, pricing,
 * security, docs, about) and the in-app upgrade paths. Everything here must be
 * defensible: real competitors, real pricing anchors, real buyer language.
 */
import type { ElementType } from 'react'

export interface Persona {
  /** e.g. "VP of Risk, mid-market issuer" */
  title: string
  /** Company size / segment, e.g. "Banks and fintechs, 50k–5M monthly transactions" */
  segment: string
  /** The job they are hiring this product to do, in their words. */
  jobToBeDone: string
  /** What they use today and why it fails them. */
  statusQuo: string
  /** The metric they are judged on. */
  successMetric: string
}

export interface PainPoint {
  title: string
  body: string
  /** Quantified cost of the problem, e.g. "$2.8M/yr in false declines". */
  cost?: string
  icon?: ElementType
}

export interface ProductFeature {
  name: string
  /** One line of benefit-first copy. */
  summary: string
  /** How it actually works — the engineering, in two or three sentences. */
  detail: string
  icon?: ElementType
  /** True when the feature is powered by a model rather than rules. */
  ai?: boolean
  /** Which plan first includes it. */
  tier?: 'starter' | 'growth' | 'enterprise'
  /** Screenshot or illustration file under /media/<slug>/. */
  image?: string
  /** Route inside the app that demonstrates it, e.g. "/app/alerts". */
  appRoute?: string
}

export interface Competitor {
  name: string
  url?: string
  /** What they are strong at. */
  strength: string
  /** The gap this product exploits. */
  gap: string
  /** Their public pricing anchor, e.g. "from $2,500/mo". */
  pricing?: string
}

export interface PricingPlan {
  id: 'starter' | 'growth' | 'enterprise'
  name: string
  /** Monthly price in USD; null = "talk to us". */
  monthly: number | null
  /** Annual price per month when billed yearly. */
  annual?: number | null
  tagline: string
  /** The unit the plan is metered in, e.g. "50k scored transactions / month". */
  meter: string
  features: string[]
  cta: string
  highlighted?: boolean
}

export interface Integration {
  name: string
  /** Category: warehouse, crm, comms, identity… */
  kind: string
  domain?: string
}

export interface Metric {
  label: string
  value: string
  caption?: string
}

export interface FaqItem {
  q: string
  a: string
}

export interface ProofPoint {
  /** e.g. "AUC 0.94 on 14.3M real applications" */
  claim: string
  /** How it is substantiated. */
  evidence: string
}

export interface Product {
  /** Commercial name — distinct from the research project name. */
  name: string
  /** e.g. "Fraud decisioning for teams that can't afford false declines" */
  tagline: string
  /** 2–3 sentences of positioning: for whom, what, why different. */
  positioning: string
  /** One-line category, e.g. "Risk decisioning platform". */
  category: string
  /** The market: size, growth, why now. */
  market: { size: string; growth: string; whyNow: string }
  personas: Persona[]
  pains: PainPoint[]
  /** The wedge: the single thing this wins on. */
  wedge: { title: string; body: string }
  features: ProductFeature[]
  /** The AI capabilities, called out separately for the marketing site. */
  aiFeatures: ProductFeature[]
  competitors: Competitor[]
  pricing: PricingPlan[]
  integrations: Integration[]
  proof: ProofPoint[]
  outcomes: Metric[]
  faq: FaqItem[]
  /** Compliance and trust posture shown on the security page. */
  trust: { name: string; body: string }[]
  /** Sequenced roadmap shown on the product page. */
  roadmap: { quarter: string; title: string; body: string }[]
}
