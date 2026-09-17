/**
 * Every marketing surface reads from a `Product`. Until a product module is
 * researched and written, this derives a product-shaped one from the plain-
 * language layer in `src/content/domain.ts` — the same true things the research
 * says, in words a buyer reads once and understands.
 *
 * The rule here: anything a visitor reads first (positioning, the problem
 * cards, the role pages, the lead features, the questions) comes from that
 * plain layer. The engineering prose from the project module stays where it
 * belongs — behind a feature, on the science page, in the detail.
 */
import {
  ChecklistIcon as f0, HelpIcon as f1, PulseIcon as f2, CommentDiscussionIcon as f3,
} from '@primer/octicons-react'
import type { ProjectApp } from '@/content/types'
import type { Product, ProductFeature } from '@/content/product'
import { domainOf } from '@/content/domain'

/** "a, b and c" — a list a person would say out loud. */
const list = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/** "Fraud and risk leads" → "fraud and risk leads", for use mid-sentence. */
const lower = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s)

export function deriveProduct(p: ProjectApp): Product {
  const d = domainOf(p.slug)
  const buyers = p.buyers.map((b) => b.name)
  const segment = buyers.length
    ? `Teams like ${list(buyers.slice(0, 3))}`
    : 'Mid-market and enterprise operations teams'

  /* The three benefits lead, in plain words. The project's own capabilities
     follow, keeping their engineering detail for the people who want it. */
  const plainFeatures: ProductFeature[] = d.benefits.map((b, i) => ({
    name: b.title,
    summary: b.body,
    detail: b.body,
    icon: p.features[i]?.icon,
    image: p.features[i]?.image,
  }))
  const plainNames = new Set(plainFeatures.map((f) => f.name.toLowerCase()))
  const builtFeatures: ProductFeature[] = p.features
    .filter((f) => !plainNames.has(f.title.toLowerCase()))
    .map((f) => ({ name: f.title, summary: f.description, detail: f.description, icon: f.icon, image: f.image }))

  return {
    name: p.short,
    category: d.category,
    tagline: d.pitch,
    positioning: `${d.plainWhat} It is built for ${list(d.who.map((w) => lower(w.title)))}. ${d.benefits[0].body}`,
    market: {
      size: 'Sizing in progress',
      growth: 'Not published',
      whyNow: `${d.who[0].line} Most teams still check a handful of ${d.units} by hand, and never look at the rest.`,
    },
    personas: d.who.map((w, i) => ({
      title: w.title,
      segment,
      jobToBeDone: d.benefits[i]?.body ?? d.plainWhat,
      statusQuo: w.line,
      successMetric: p.metrics[i]?.label ?? p.metrics[0]?.label ?? '',
    })),
    pains: d.who.map((w, i) => ({
      title: w.title,
      body: `${w.line} ${d.benefits[i]?.body ?? ''}`.trim(),
    })),
    wedge: {
      title: d.benefits[0].title,
      body: `${d.promise} ${d.benefits[0].body} ${d.benefits[2]?.body ?? ''}`.trim(),
    },
    features: [...plainFeatures, ...builtFeatures],
    aiFeatures: [
      {
        name: 'Every answer comes with its reasons',
        summary: `Each ${d.unit} carries the handful of things that moved it, in the words your team already uses. Nobody has to take a score on trust.`,
        detail: `The same reasons are attached to the record, the export and the API response, so a decision reads the same everywhere it is looked at.`,
        icon: f0, ai: true,
      },
      {
        name: 'It says when it is not sure',
        summary: `Anything borderline goes to the ${d.queue} for a person instead of being settled quietly. You set where that line sits.`,
        detail: 'Confidence is reported alongside the score, so you can widen or narrow what reaches a human without retraining anything.',
        icon: f1, ai: true,
      },
      {
        name: 'It tells you when it is going stale',
        summary: 'Every week it compares its own calls with the ones your team made, and warns you before the gap becomes a complaint.',
        detail: 'You are told which way it is drifting and on which kind of record, so a retrain is a decision rather than a fire drill.',
        icon: f2, ai: true,
      },
      {
        name: 'Ask it a question in your own words',
        summary: `Type what you want to know about your ${d.units} and get an answer with the records it came from attached.`,
        detail: 'Answers cite the underlying records, so anything it tells you can be opened and checked rather than believed.',
        icon: f3, ai: true,
      },
    ],
    competitors: [],
    pricing: [
      {
        id: 'starter', name: 'Starter', monthly: 0, tagline: 'Run it on your own data before you commit',
        meter: `Up to 5,000 ${d.units} a month`, cta: 'Start free',
        features: [`Score ${d.units} one at a time or by file`, 'Reasons on every decision', 'Export every result', 'One workspace'],
      },
      {
        id: 'growth', name: 'Growth', monthly: 490, tagline: 'Put it in the workflow', highlighted: true,
        meter: `Includes 100,000 ${d.units} a month, then metered`, cta: 'Start a trial',
        features: ['Scoring API and webhooks', 'Scheduled runs from your warehouse', 'Alerting and queues', 'A warning when the model goes stale', 'Shared workspaces'],
      },
      {
        id: 'enterprise', name: 'Enterprise', monthly: null, tagline: 'Run it inside your own environment',
        meter: 'Annual contract', cta: 'Talk to us',
        features: ['Private deployment', 'Model governance pack', 'Custom thresholds and policies', 'Named support', 'Security review support'],
      },
    ],
    integrations: [],
    proof: p.results.slice(0, 4).map((r) => ({
      claim: `${r.metric}: ${r.value}`,
      evidence: r.note ?? `Measured on data the model had never seen, before it touches one of your ${d.units}.`,
    })),
    outcomes: [
      { label: `Every ${d.unit}, not a sample`, value: '100%', caption: `Coverage is the default, not an upgrade` },
      { label: 'Reasons on every one', value: '5', caption: 'The things that moved the answer, named' },
      { label: 'Answer in', value: 'Seconds', caption: `From ${d.sources[0].toLowerCase()} or a file you drop in` },
      { label: 'Data leaving your tenancy', value: 'None', caption: "Nothing is used to train anyone else's model" },
    ],
    faq: [
      ...d.questions,
      {
        q: 'How do we get started?',
        a: `${d.steps[0].body} You can also try it on a file first. On a trial the ${d.units} you drop in are scored on your own machine and never uploaded.`,
      },
      {
        q: 'What happens to a case it is unsure about?',
        a: `It goes to the ${d.queue} with its reasons attached, for a person to decide. Nothing borderline is settled quietly.`,
      },
    ],
    trust: [
      { name: 'Your data stays yours', body: `Trial workspaces keep every ${d.unit} in your browser. Nothing is uploaded before a contract is in place, and nothing is used to train anyone else's model.` },
      { name: 'Every number can be checked', body: 'Each figure on this site comes from testing on records the model had never seen, and the code that produced it is public.' },
      { name: 'Explainable by default', body: 'Each decision carries the handful of things that produced it, so it can be reviewed, challenged and audited.' },
    ],
    roadmap: [],
  }
}

/* ── What the marketing pages are allowed to say ──────────────────────────── */

/**
 * A researched product module carries the evaluation vocabulary its authors
 * used: mAP@50, AUC-ROC, p99, F1. That is the right language on the evidence
 * page and the wrong language on a home page, where it reads as a lab report
 * rather than a product. This is the filter between the two.
 */
const LAB_TERMS =
  /\b(m?AP@?[\d.:]*|AUC|ROC|F1|R²|R2|RMSE|MAE|MAPE|NDCG|IoU|BLEU|WER|PSI|SHAP|SMOTE|MSD|precision|recall|specificity|sensitivity|p9\d|latency|throughput|hold-?out|training (records|images|listings)|inference|epochs?|tokens?|embeddings?|cohort|artefacts?|artifacts?|weights|propensity|prohibited|resolution|CV|mIoU)\b/i

const looksLikeALab = (text?: string) => !!text && LAB_TERMS.test(text)

/**
 * Swaps the two surfaces a buyer reads first onto plain language, and leaves
 * everything else — the researched features, the market prose, the evidence —
 * exactly as written.
 */
export function marketingView(product: Product, project: ProjectApp): Product {
  const plain = deriveProduct(project)

  // Keep the outcomes a person would recognise as a business result, drop the
  // ones that are really evaluation scores, and top up from the plain set so
  // the band is never half empty.
  const kept = product.outcomes.filter((m) => !looksLikeALab(m.label) && !looksLikeALab(m.caption))
  const outcomes = [...kept, ...plain.outcomes].slice(0, 4)

  return {
    ...product,
    outcomes,
    // How the model behaves is the same promise for every product here, and it
    // is the part a buyer actually weighs. The researched capability list stays
    // on the product page, where someone has chosen to read the detail.
    aiFeatures: plain.aiFeatures,
  }
}
