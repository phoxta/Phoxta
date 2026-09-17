/**
 * Content schema for one portfolio project app.
 *
 * Every project ships ONE module in `src/content/projects/<slug>.ts` that exports a
 * `ProjectApp`. The generic shell (`src/app/*`) renders every page from this data, so
 * the richer the module, the richer the app. Anything optional is simply not rendered.
 *
 * Conventions
 *  - Image paths are relative to `/media/<slug>/` (e.g. `"01_overview.webp"`, `"hero.jpg"`).
 *  - Numbers that are percentages are written as 0–100 (`pct: 91`), probabilities as 0–1.
 *  - Copy is written in product voice: crisp, specific, no first person.
 */
import type { ElementType } from 'react'

export type Slug =
  | 'customer'
  | 'brand' | 'fraud' | 'mortgage' | 'people' | 'parkinsons' | 'supply-chain' | 'retail'
  | 'ergonomics' | 'clv' | 'ppe' | 'marketing' | 'automotive' | 'loan' | 'malaria'
  | 'emotion' | 'music' | 'reviews'

/**
 * Four of the original apps were one product sold four times: Brand Intelligence
 * and Review Categorisation both read what customers say, while CLV & Retention
 * and Marketing Campaign both score what customers do. They are now `customer`,
 * and these four redirect to it. Their research modules stay where they are and
 * feed the merged product's evidence.
 */
export const MERGED_INTO: Partial<Record<Slug, Slug>> = {
  brand: 'customer', reviews: 'customer', clv: 'customer', marketing: 'customer',
}

export type Category =
  | 'NLP & GenAI' | 'ML Classification' | 'ML Regression' | 'Finance & Risk'
  | 'Customer Analytics' | 'Recommendation' | 'Computer Vision'

export type Tone = 'accent' | 'success' | 'attention' | 'danger' | 'done' | 'default'

/** A headline number. `pct` (0–100) draws a small meter under the value. */
export interface Metric {
  label: string
  value: string
  caption?: string
  pct?: number
  tone?: Tone
}

export interface Series { key: string; label: string }

export type ValueFormat = 'number' | 'percent' | 'currency' | 'ms' | 'compact'

/* ───────────────────────────── charts ───────────────────────────── */

interface ChartBase {
  title: string
  subtitle?: string
  /** One-line takeaway rendered under the chart. */
  note?: string
  /** Column span in the dashboard grid (default 6 of 12). */
  span?: 4 | 6 | 8 | 12
  height?: number
}

export interface LineChart extends ChartBase {
  kind: 'line' | 'area'
  xKey: string
  series: Series[]
  data: Record<string, number | string>[]
  yLabel?: string
  yDomain?: [number, number]
  valueFormat?: ValueFormat
  /** Draw a dashed reference line at this y value (e.g. a threshold). */
  reference?: { y: number; label: string }
}

export interface BarChart extends ChartBase {
  kind: 'bar'
  xKey: string
  series: Series[]
  data: Record<string, number | string>[]
  horizontal?: boolean
  stacked?: boolean
  valueFormat?: ValueFormat
  yLabel?: string
}

/** Sorted horizontal bars, one hue — for feature importance, SHAP, rankings. */
export interface ImportanceChart extends ChartBase {
  kind: 'importance'
  items: { name: string; value: number }[]
  valueFormat?: ValueFormat
  /** Colour negative values with the diverging pair (SHAP-style). */
  diverging?: boolean
}

export interface RocChart extends ChartBase {
  kind: 'roc'
  /** Each curve is drawn from `points` if given, else synthesised from `auc`. */
  curves: { label: string; auc: number; points?: [number, number][] }[]
}

export interface ConfusionChart extends ChartBase {
  kind: 'confusion'
  labels: string[]
  /** matrix[actual][predicted] */
  matrix: number[][]
}

export interface HeatmapChart extends ChartBase {
  kind: 'heatmap'
  rows: string[]
  cols: string[]
  values: number[][]
  valueFormat?: ValueFormat
  /** 'sequential' one hue (default) or 'diverging' around 0. */
  scale?: 'sequential' | 'diverging'
}

export interface DonutChart extends ChartBase {
  kind: 'donut'
  data: { name: string; value: number }[]
  valueFormat?: ValueFormat
  /** Text shown in the middle (e.g. total). */
  center?: string
}

export interface ScatterChart extends ChartBase {
  kind: 'scatter'
  xLabel: string
  yLabel: string
  groups: { label: string; data: { x: number; y: number }[] }[]
}

export interface RadarChart extends ChartBase {
  kind: 'radar'
  axes: string[]
  series: { label: string; values: number[] }[]
  max?: number
}

export type ChartSpec =
  | LineChart | BarChart | ImportanceChart | RocChart | ConfusionChart
  | HeatmapChart | DonutChart | ScatterChart | RadarChart

/* ───────────────────────────── interactive demo ───────────────────────────── */

export interface DemoInput {
  key: string
  label: string
  type: 'range' | 'select' | 'text' | 'textarea'
  min?: number
  max?: number
  step?: number
  default: number | string
  options?: string[]
  unit?: string
  hint?: string
}

export interface DemoResult {
  /** Big verdict, e.g. "LOW RISK" or "Approve". */
  headline: string
  /** 0–1 confidence / probability drawn as a meter. */
  score: number
  tone: Tone
  /** Secondary facts. */
  details: { label: string; value: string }[]
  /** Reason codes (SHAP-style): positive pushes toward the headline, negative against. */
  reasons?: { label: string; weight: number }[]
}

/**
 * A real model, trained by scripts/train_tabular.py on a public dataset and
 * evaluated in the browser. When present the DemoPanel uses it instead of
 * `evaluate`, which stays as the offline fallback.
 */
export interface DemoModel {
  /** e.g. "/models/loan/model.json" */
  url: string
  /** Short provenance line shown on the badge. */
  label: string
  /** Map the demo's input values onto the model's feature names (unmapped features take the training median). */
  map: (values: Record<string, number | string>) => Record<string, number | undefined>
  /** Turn the probability + attributions into the verdict shown to the user. */
  interpret: (prob: number, values: Record<string, number | string>) => Pick<DemoResult, 'headline' | 'tone' | 'details'>
}

export interface DemoSpec {
  title: string
  description: string
  inputs: DemoInput[]
  ctaLabel?: string
  /** Pure client-side scorer ported from the project's dashboard heuristics. */
  evaluate: (values: Record<string, number | string>) => DemoResult
  /** Optional real model that replaces `evaluate` once loaded. */
  model?: DemoModel
  /** Small print under the demo, e.g. "Heuristic port of the model's decision surface". */
  disclaimer?: string
}

/* ───────────────────────────── project ───────────────────────────── */

export interface Buyer {
  name: string
  /** Company web domain, used for the logo (Google favicon service). */
  domain: string
  useCase?: string
  value?: string
}

export interface Feature {
  title: string
  description: string
  icon?: ElementType
  /** Screenshot file under /media/<slug>/ to illustrate the feature. */
  image?: string
}

export interface Screenshot { file: string; caption: string; w?: number; h?: number }

export interface PipelineStep {
  title: string
  description: string
  tech?: string
  icon?: ElementType
}

export interface ModelRow {
  component: string
  model: string
  purpose: string
  metric?: string
}

export interface ResultRow {
  metric: string
  value: string
  note?: string
  /** 0–100 for a meter. */
  pct?: number
}

export interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
}

export interface ProjectApp {
  slug: Slug
  num: number
  name: string
  short: string
  category: Category
  icon: ElementType
  /** Brand hex from the original portfolio, used for the hero gradient only. */
  accent: string
  tagline: string
  /** 2–3 sentence summary shown under the hero. */
  summary: string
  hero: { image?: string; alt: string; credit?: { name: string; link: string } }
  buyers: Buyer[]
  dataset: {
    name: string
    size: string
    source?: { label: string; url: string }
    description: string
    facts: { label: string; value: string }[]
  }
  stack: { name: string; group: 'ML' | 'NLP' | 'Vision' | 'Serving' | 'Data' | 'MLOps' | 'XAI' | 'LLM' }[]
  /** Exactly 4 headline metrics. */
  metrics: Metric[]
  problem: string[]
  solution: string[]
  features: Feature[]
  screenshots: Screenshot[]
  /** "demo.mp4" when a recording exists. */
  video?: string
  pipeline: PipelineStep[]
  models: ModelRow[]
  results: ResultRow[]
  charts: {
    overview?: ChartSpec[]
    dashboard: ChartSpec[]
    model: ChartSpec[]
    data: ChartSpec[]
  }
  demo?: DemoSpec
  api: {
    port: number
    endpoints: Endpoint[]
    sample?: { endpoint: string; request: string; response: string }
  }
  report: {
    executiveSummary: string[]
    impact: { label: string; value: string }[]
    recommendations: { title: string; body: string }[]
    date: string
  }
  links: { github: string; demo?: string; report?: string }
  ports: { api: number; dashboard: number }
}
