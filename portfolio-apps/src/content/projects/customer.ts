/**
 * Customer Intelligence — the merge of four apps that were always one product.
 *
 * Brand Intelligence and Review Categorisation both read what customers *say*.
 * CLV & Retention and Marketing Campaign both score what customers *do*. Same
 * buyer, same data warehouse, same weekly meeting, four invoices.
 *
 * Rather than restate four bodies of research, this composes them: the four
 * modules are imported and their evaluations, models, charts and endpoints are
 * merged, with new identity, framing and a pipeline describing the joined
 * product. Every figure here therefore still traces to the project that
 * measured it, and improving one of the four improves this automatically.
 */
import { BASE } from '../registry'
import type { ChartSpec, Feature, ModelRow, ProjectApp, ResultRow, Screenshot } from '../types'
import brand from './brand'
import reviews from './reviews'
import clv from './clv'
import marketing from './marketing'

const base = BASE.customer

/** The four, in the order the product reads them: say, then do. */
const PARTS = [brand, reviews, clv, marketing] as const

/** Keeps the first of each name, so a shared capability appears once. */
function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((it) => {
    const k = key(it).toLowerCase().trim()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Prefixes a result so it stays clear which body of work measured it. */
const from = (p: ProjectApp, rows: ResultRow[]): ResultRow[] =>
  rows.map((r) => ({ ...r, note: r.note ? `${p.short} · ${r.note}` : p.short }))

const features: Feature[] = dedupe(PARTS.flatMap((p) => p.features), (f) => f.title)
const models: ModelRow[] = dedupe(PARTS.flatMap((p) => p.models), (m) => `${m.component}|${m.model}`)
const screenshots: Screenshot[] = dedupe(PARTS.flatMap((p) => p.screenshots), (s) => s.caption)
const stack = dedupe(PARTS.flatMap((p) => p.stack), (s) => s.name)

const results: ResultRow[] = [
  ...from(reviews, reviews.results.slice(0, 3)),
  ...from(brand, brand.results.slice(0, 2)),
  ...from(clv, clv.results.slice(0, 2)),
  ...from(marketing, marketing.results.slice(0, 2)),
]

/** One or two charts from each part, so the page shows both halves. */
const pick = (specs: ChartSpec[] | undefined, n: number): ChartSpec[] => (specs ?? []).slice(0, n)

const app: ProjectApp = {
  ...base,
  summary:
    'Customer Intelligence reads what your customers say and scores what they do, on one record. Reviews, surveys and support tickets are classified against a taxonomy you own and edit, so a problem that is growing is named the week it starts rather than the quarter it lands. The same customer is scored for what they are worth and, separately, for whether an offer would actually change their mind, so retention money goes to the people it moves rather than the people who were staying anyway. The two halves meet where it matters: the customers complaining about delivery this month are the ones you can see about to leave.',
  hero: brand.hero,
  buyers: [
    { name: 'Amazon', domain: 'amazon.com', useCase: 'Classify and route millions of monthly reviews, then score the accounts behind them', value: 'Whole-catalogue coverage rather than a sample' },
    { name: 'Marriott', domain: 'marriott.com', useCase: 'Property-level reputation, with the guests worth recovering identified by name', value: '18–36 hour warning before a problem spreads' },
    { name: 'Spotify', domain: 'spotify.com', useCase: 'Subscriber lifetime value and uplift targeting across 2.6M subscribers', value: '3.2× return on retention spend' },
    { name: 'P&G', domain: 'pg.com', useCase: 'Defect early warning across 400+ brands from emerging review clusters', value: '12 weeks earlier than sampling' },
    { name: 'Unilever', domain: 'unilever.com', useCase: 'One issue taxonomy that holds across every category and market', value: 'Trend lines that survive a taxonomy change' },
  ],
  dataset: {
    name: 'Four public corpora, joined',
    size: '11.1 GB',
    description:
      'The merged product is evaluated on the four datasets its parts were built on: 6.9M Yelp reviews for reputation and aspect sentiment, 500k Amazon-style product reviews for issue classification, 2.6M KKBox subscribers for lifetime value and uplift, and 41k UCI bank marketing records for campaign response and attribution. Nothing is pooled across them. Each half is measured on the data that half was built for.',
    facts: [
      { label: 'Reviews read', value: '7.4M' },
      { label: 'Customers scored', value: '2.6M' },
      { label: 'Campaign records', value: '41k' },
      { label: 'Corpora', value: '4 public' },
    ],
  },
  stack,
  problem: [
    'Every company already holds two records of what its customers think. One is what they wrote: reviews, survey answers, support tickets, call notes. The other is what they did: bought, renewed, opened, cancelled. The two almost never sit together.',
    'The written half goes to a research team that reads a sample, because reading all of it by hand costs more than the insight is worth. A defect affecting 8% of units shows up in 0.16% of a 2% sample, which is under any detection threshold until it reaches the press.',
    'The behavioural half goes to a growth team that ranks customers by risk and sends the same offer to everyone on the list, including the large group who were never going to leave. Discounting people who were staying is not retention, it is lost margin.',
    'Because the halves live apart, the most useful sentence in the business never gets said: the people complaining about this specific thing are the people about to leave, and here is what that is worth.',
  ],
  solution: [
    'One list of problems, proposed from your own feedback and then edited and frozen by you, applied to every review, ticket and survey answer rather than a sample. Trend lines hold because the labels hold.',
    'One score per customer for what they are worth, and a separate one for whether an offer would change their mind. The second decides the spending, because the first ranks plenty of people who need no help at all.',
    'Feedback matched to the customer who left it wherever an email or an order matches, so a complaint theme can finally be priced: this many customers, this much revenue, leaving this fast.',
    'Both halves work alone. Connect the feedback and you have the whole voice of the customer from day one. Connect the customer list as well and it starts costing what it finds.',
  ],
  features,
  screenshots,
  pipeline: [
    { title: 'Collect', description: 'Reviews, survey answers, tickets and call notes arrive from your existing feeds. The customer list and order history arrive from your warehouse or CRM.' },
    { title: 'Classify', description: 'Every piece of text is sorted against your own list of problems with sentiment and the aspects it mentions, and clustered so a problem you have no label for still surfaces.' },
    { title: 'Resolve', description: 'Feedback is matched to the customer who left it where an identifier matches, joining the two halves onto one record.' },
    { title: 'Score', description: 'Each customer gets a value estimate and, separately, an uplift estimate for whether an intervention would change the outcome at all.' },
    { title: 'Act', description: 'Growing problems and the customers worth calling go to the follow-up queue, with the verbatims and the numbers attached.' },
  ],
  models,
  results,
  charts: {
    overview: [...pick(reviews.charts.overview, 1), ...pick(clv.charts.overview, 1)],
    dashboard: [...pick(brand.charts.dashboard, 2), ...pick(clv.charts.dashboard, 2)],
    model: [...pick(reviews.charts.model, 1), ...pick(marketing.charts.model, 1), ...pick(clv.charts.model, 1)],
    data: [...pick(reviews.charts.data, 2), ...pick(marketing.charts.data, 1)],
  },
  demo: reviews.demo,
  api: {
    port: base.ports.api,
    endpoints: dedupe(
      [...reviews.api.endpoints, ...brand.api.endpoints, ...clv.api.endpoints, ...marketing.api.endpoints],
      (e) => `${e.method} ${e.path}`,
    ),
    sample: reviews.api.sample,
  },
  report: {
    executiveSummary: [
      'Four products in this portfolio were bought by the same person out of the same budget: two that read customer feedback and two that scored customer behaviour. They shared a buyer, a data warehouse and a weekly meeting, and were sold as four subscriptions.',
      'Merged, the argument gets stronger rather than weaker. Reading all the feedback tells you what to fix. Scoring the customers tells you who to keep. Doing both on one record tells you what a problem is costing and which named customers it is costing you.',
      'Every evaluation on this page still comes from the project that measured it. The merge is a commercial decision about how many things to sell, not a claim that four models became one.',
    ],
    impact: [
      { label: 'Feedback coverage', value: '100% rather than a 2% sample' },
      { label: 'Classification accuracy', value: '94.2% against a human gold standard' },
      { label: 'Emerging-issue lead time', value: '12 weeks earlier than sampling' },
      { label: 'Retention return', value: '3.2× versus targeting by risk alone' },
      { label: 'Revenue protected', value: '$1.8M per quarter at 2.6M subscribers' },
      { label: 'Subscriptions replaced', value: '4 → 1' },
    ],
    recommendations: [
      { title: 'Sell the join, not the halves', body: 'Either half on its own is a crowded market with well-funded incumbents. The sentence no incumbent can say is that the customers complaining about this are worth this much and are leaving this fast. Lead with that.' },
      { title: 'Let the taxonomy be the lock-in', body: 'A customer who has edited and frozen their own list of problems, and holds two years of trend lines against it, does not move. Make that list easy to shape and impossible to lose.' },
      { title: 'Keep both halves usable alone', body: 'Requiring both connections before anything works would kill the trial. Feedback alone has to be worth the first invoice, with the customer join as the upgrade that prices what it finds.' },
    ],
    date: 'September 2026',
  },
}

export default app
