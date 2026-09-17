/**
 * The 2026 frontier for one project: where the field is, who leads it, how this
 * system compares, and the concrete upgrades that make it frontier-grade.
 * One module per project in `src/content/frontier/<slug>.ts`, `export default` a `Frontier`.
 * Every claim must be backed by an entry in `sources`.
 */
export interface FrontierSource {
  title: string
  url: string
  org?: string
  /** e.g. "2026-03" */
  date?: string
}

export interface FrontierEntry {
  name: string
  org: string
  /** What it is and why it matters, one or two sentences. */
  what: string
  /** Headline number, e.g. "AUC 0.97 on IEEE-CIS" or "1.2 ms/frame on Jetson". */
  metric?: string
  url?: string
  year?: string
}

export interface FrontierBenchmark {
  name: string
  /** Best published/production figure and who holds it. */
  sota: string
  sotaBy?: string
  /** This project's figure. */
  project: string
  /** Numeric versions for the comparison chart, same unit. */
  sotaValue?: number
  projectValue?: number
  unit?: string
  /** true when higher is better (default). */
  higherIsBetter?: boolean
}

export interface FrontierUpgrade {
  title: string
  body: string
  impact: 'high' | 'medium' | 'low'
  effort: 'days' | 'weeks' | 'months'
  status?: 'planned' | 'in-progress' | 'shipped'
}

export interface Frontier {
  /** e.g. "2026-09" */
  asOf: string
  /** One-sentence verdict on where this project stands vs. the frontier. */
  headline: string
  /** 2–3 paragraphs: the field in 2026, what leaders do differently, where this project sits. */
  summary: string[]
  /** 5–8 named systems, papers, products or benchmarks that define the frontier. */
  stateOfTheArt: FrontierEntry[]
  /** 3–6 metric comparisons. */
  benchmarks: FrontierBenchmark[]
  /** 5–8 concrete, sequenced upgrades. */
  upgrades: FrontierUpgrade[]
  /** Regulatory / ethical constraints that shape the design in 2026 (EU AI Act, CFPB, WHO…). */
  compliance?: { name: string; body: string; url?: string }[]
  /** 8–15 cited sources. */
  sources: FrontierSource[]
}
