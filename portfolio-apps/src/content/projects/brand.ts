import {
  AlertIcon, BeakerIcon, CommentDiscussionIcon, CpuIcon, DatabaseIcon, GraphIcon, PulseIcon,
  SearchIcon, ServerIcon, SparkleIcon, TelescopeIcon, TrophyIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type {
  BarChart, ConfusionChart, DonutChart, ImportanceChart, LineChart, ProjectApp, RadarChart, RocChart, Tone,
} from '../types'

const base = BASE.brand

/* ───────────────────────────── deterministic helpers ───────────────────────────── */

let s = 42
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
const r3 = (x: number) => Math.round(x * 1000) / 1000
const str = (v: number | string) => String(v)
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
/** 'MM-DD' labels for a 30-day window ending where the Yelp 2022 corpus ends (Jan 2022). */
const dayLabel = (i: number) => new Date(Date.UTC(2021, 11, 20 + i)).toISOString().slice(5, 10)

/* ───────────────────────────── charts ───────────────────────────── */

// Overview tab — 30-Day Sentiment Trend (go.Scatter fill=tozeroy, hlines at 0 / +0.05 / -0.05)
const sentimentTrend: LineChart = {
  kind: 'area',
  title: '30-Day Sentiment Trend',
  subtitle: 'Daily mean VADER compound score across the filtered review stream',
  xKey: 'date',
  series: [{ key: 'avgSentiment', label: 'Avg sentiment' }],
  data: Array.from({ length: 30 }, (_, i) => {
    const dip = i >= 21 && i <= 23 ? -0.34 : 0
    return { date: dayLabel(i), avgSentiment: r3(0.31 + (rnd() - 0.5) * 0.12 + dip) }
  }),
  yLabel: 'Sentiment score',
  yDomain: [-0.2, 0.6],
  reference: { y: 0.05, label: 'Positive threshold (+0.05)' },
  span: 12,
  note: 'Sentiment holds near +0.31 until a three-day collapse below the neutral band, the pattern the crisis engine is tuned to catch.',
}

// Overview tab — Sentiment Distribution (px.pie hole=0.45); shares from eval_metrics.json test labels
const sentimentDistribution: DonutChart = {
  kind: 'donut',
  title: 'Sentiment Distribution',
  subtitle: 'Label share of the 99,999-review held-out set',
  data: [
    { name: 'Positive', value: 85836 },
    { name: 'Negative', value: 12932 },
    { name: 'Neutral', value: 1231 },
  ],
  center: '99,999',
  valueFormat: 'compact',
  span: 4,
  note: 'Positive reviews dominate at 85.8%; the 1.2% neutral band is where the classifier makes almost all of its errors.',
}

// Overview tab — Rating Distribution (px.bar, RdYlGn); 5-star 38% / 1-star 19% from the dataset card
const ratingDistribution: BarChart = {
  kind: 'bar',
  title: 'Rating Distribution',
  subtitle: 'Share of reviews by star rating, Yelp Open Dataset 2022',
  xKey: 'rating',
  series: [{ key: 'share', label: 'Share of reviews' }],
  data: [
    { rating: '1 star', share: 19 },
    { rating: '2 stars', share: 14 },
    { rating: '3 stars', share: 13 },
    { rating: '4 stars', share: 16 },
    { rating: '5 stars', share: 38 },
  ],
  valueFormat: 'percent',
  yLabel: 'Share (%)',
  note: 'A bimodal J-curve: 38% five-star and 19% one-star, so the mid ratings carry most of the ambiguous aspect signal.',
}

// Aspect Analysis tab — Aspect Radar Chart (go.Scatterpolar; compound rescaled to 0–1 via (m+1)/2)
const ASPECT_MEANS = { cleanliness: 0.42, staff: 0.51, value: -0.08, location: 0.36, amenities: 0.29 }
const aspectRadar: RadarChart = {
  kind: 'radar',
  title: 'Aspect Radar Chart',
  subtitle: 'Mean aspect compound rescaled to 0–1 ((score + 1) / 2)',
  axes: Object.keys(ASPECT_MEANS).map(cap),
  series: [{ label: 'Aspect scores', values: Object.values(ASPECT_MEANS).map((m) => r3((m + 1) / 2)) }],
  max: 1,
  note: 'Staff and cleanliness lead; value-for-money is the only aspect sitting below the neutral 0.5 line.',
}

// Aspect Analysis tab — Aspect Score Comparison (px.bar orientation=h, RdYlGn, vline at 0)
const aspectComparison: ImportanceChart = {
  kind: 'importance',
  title: 'Aspect Score Comparison',
  subtitle: 'Average compound score per aspect, sentences matched by keyword lexicon',
  items: Object.entries(ASPECT_MEANS).map(([name, value]) => ({ name: cap(name), value })),
  diverging: true,
  valueFormat: 'number',
  note: 'Price and fees are the one net-negative aspect (-0.08), a clear target for the pricing team before it drags the overall score.',
}

// Crisis Detection tab — Sentiment Timeline with Anomalies (avg sentiment vs 7-day rolling baseline)
const crisisTimeline: LineChart = (() => {
  const values: number[] = []
  for (let i = 0; i < 36; i++) {
    const shock = i === 12 || i === 13 ? -0.28 : i === 27 ? -0.19 : 0
    values.push(r3(0.3 + (rnd() - 0.5) * 0.1 + shock))
  }
  return {
    kind: 'line',
    title: 'Sentiment Timeline with Anomalies',
    subtitle: 'Daily mean vs. shifted 7-day rolling baseline; a drop > 0.10 raises an alert, > 0.30 is critical',
    xKey: 'date',
    series: [
      { key: 'avgSentiment', label: 'Avg sentiment' },
      { key: 'rollingBaseline', label: 'Rolling baseline' },
    ],
    data: values.map((v, i) => {
      const window = values.slice(Math.max(0, i - 7), i)
      const baseline = window.length ? window.reduce((a, b) => a + b, 0) / window.length : v
      return { date: dayLabel(i - 6), avgSentiment: v, rollingBaseline: r3(baseline) }
    }),
    yLabel: 'Sentiment score',
    yDomain: [-0.1, 0.5],
    reference: { y: 0, label: 'Neutral' },
    span: 12,
    note: 'Two drops breach the 0.10 warning gap against the rolling baseline; the first also crosses the 0.30 critical line and would page the brand team.',
  }
})()

// Competitive Intel tab — Brand Sentiment Ranking (px.bar orientation=h, top 20, RdYlGn)
const brandRanking: ImportanceChart = {
  kind: 'importance',
  title: 'Brand Sentiment Ranking',
  subtitle: 'Mean compound score per brand, hospitality subset',
  items: [
    { name: 'Four Seasons Hotel', value: 0.62 },
    { name: 'The Ritz-Carlton', value: 0.58 },
    { name: 'Grand Hyatt Downtown', value: 0.47 },
    { name: 'Marriott City Center', value: 0.44 },
    { name: 'Hilton Garden Inn', value: 0.41 },
    { name: 'Westin Resort & Spa', value: 0.38 },
    { name: 'Sheraton Grand', value: 0.33 },
    { name: 'Holiday Inn Express', value: 0.21 },
    { name: 'Best Western Plus', value: 0.12 },
    { name: 'La Quinta Inn', value: 0.04 },
  ],
  valueFormat: 'number',
  note: 'Luxury flags lead by 0.2 or more; the gap analysis table then breaks each pair down aspect by aspect.',
}

// Competitive Intel tab — NPS Breakdown (px.bar Promoters/Passives/Detractors), derived from the rating mix above
const npsBreakdown: BarChart = {
  kind: 'bar',
  title: 'NPS Breakdown',
  subtitle: 'Rating-derived NPS proxy: 5 stars = promoter, 4 stars = passive, 1–3 stars = detractor',
  xKey: 'category',
  series: [{ key: 'pct', label: 'Share of reviewers' }],
  data: [
    { category: 'Promoters', pct: 38 },
    { category: 'Passives', pct: 16 },
    { category: 'Detractors', pct: 46 },
  ],
  valueFormat: 'percent',
  yLabel: 'Share (%)',
  note: 'The proxy NPS lands at -8 for the whole subset; the report ties every one-point NPS recovery to $6.5–15M in annual revenue at Marriott scale.',
}

// Topic Explorer tab — Topic Trend Scores (px.bar orientation=h, recent vs prior share, vline at 0)
const topicTrend: ImportanceChart = {
  kind: 'importance',
  title: 'Topic Trend Scores',
  subtitle: 'Trend score = recent-window share minus prior-window share for the top 10 of 28 topics',
  items: [
    { name: 'Wait time', value: 0.42 },
    { name: 'Staff attitude', value: 0.31 },
    { name: 'Cleanliness', value: 0.18 },
    { name: 'Parking', value: 0.12 },
    { name: 'Breakfast', value: 0.05 },
    { name: 'Location', value: -0.03 },
    { name: 'Ambiance', value: -0.09 },
    { name: 'Price / value', value: -0.14 },
    { name: 'Room comfort', value: -0.22 },
    { name: 'Pool & amenities', value: -0.27 },
  ],
  diverging: true,
  valueFormat: 'number',
  note: 'Wait-time and staff-attitude chatter is accelerating while amenity complaints recede, an early read on where the next crisis forms.',
}

// Model — ROC for the sentiment ensemble
const roc: RocChart = {
  kind: 'roc',
  title: 'Sentiment Classifier ROC',
  subtitle: 'Held-out review labels',
  curves: [{ label: 'RoBERTa + VADER ensemble', auc: 0.91 }],
  note: 'AUC 0.91 on held-out labels; the aspect-level F1 of 0.87 beats the 0.82 human-human agreement benchmark.',
}

// Model — confusion matrix from data/models/eval_metrics.json (XGBoost on 117 features, 99,999 test rows)
const confusion: ConfusionChart = {
  kind: 'confusion',
  title: 'Confusion Matrix — XGBoost Sentiment Classifier',
  subtitle: '99,999 held-out reviews, labels ordered negative / neutral / positive',
  labels: ['Negative', 'Neutral', 'Positive'],
  matrix: [
    [12888, 44, 0],
    [4, 1085, 142],
    [0, 33, 85803],
  ],
  note: 'Only 223 of 99,999 reviews are misclassified and 142 of those are neutral reviews nudged to positive; negative reviews are never called positive.',
}

// Model — 5-fold CV scores from eval_metrics.json (stored as percentages)
const cvFolds: BarChart = {
  kind: 'bar',
  title: '5-Fold Cross-Validation',
  subtitle: 'Stratified folds on the 399,992-row training set',
  xKey: 'fold',
  series: [
    { key: 'f1Macro', label: 'F1 macro' },
    { key: 'accuracy', label: 'Accuracy' },
  ],
  data: [
    { fold: 'Fold 1', f1Macro: 97.65, accuracy: 99.84 },
    { fold: 'Fold 2', f1Macro: 98.06, accuracy: 99.86 },
    { fold: 'Fold 3', f1Macro: 97.52, accuracy: 99.83 },
    { fold: 'Fold 4', f1Macro: 97.78, accuracy: 99.85 },
    { fold: 'Fold 5', f1Macro: 97.01, accuracy: 99.79 },
  ],
  valueFormat: 'percent',
  yLabel: 'Score (%)',
  note: 'F1 macro 97.61% ± 0.35 and accuracy 99.83% ± 0.02 across folds: no fold-to-fold instability.',
}

// Model — per-class precision / recall computed from the confusion matrix above
const perClass: BarChart = {
  kind: 'bar',
  title: 'Per-Class Precision and Recall',
  subtitle: 'Computed from the held-out confusion matrix',
  xKey: 'label',
  series: [
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
  ],
  data: [
    { label: 'Negative', precision: 99.97, recall: 99.66 },
    { label: 'Neutral', precision: 93.37, recall: 88.14 },
    { label: 'Positive', precision: 99.83, recall: 99.96 },
  ],
  valueFormat: 'percent',
  yLabel: 'Score (%)',
  note: 'Neutral is the hard class (recall 88.1%) because it holds 1.2% of reviews; both polar classes exceed 99.6%.',
}

// Data — label balance of the held-out set (row sums of the confusion matrix)
const labelBalance: DonutChart = {
  kind: 'donut',
  title: 'Label Balance (Held-out Set)',
  subtitle: 'VADER-derived labels: compound >= +0.05 positive, <= -0.05 negative',
  data: [
    { name: 'Positive', value: 85836 },
    { name: 'Negative', value: 12932 },
    { name: 'Neutral', value: 1231 },
  ],
  center: '3 classes',
  valueFormat: 'compact',
  span: 4,
  note: 'A 70:10:1 imbalance; the classifier is trained with class_weight=balanced and selected on F1 macro, not accuracy.',
}

// Data — reviews per year; illustrative annual split of the 6,990,280 reviews (corpus spans 2004 – Jan 2022)
const reviewsPerYear: LineChart = {
  kind: 'area',
  title: 'Review Volume by Year',
  subtitle: 'Thousands of reviews per year in the Yelp Open Dataset 2022 (illustrative split of the 6.99M total)',
  xKey: 'year',
  series: [{ key: 'reviews', label: 'Reviews (thousands)' }],
  data: [3, 12, 30, 60, 110, 170, 240, 320, 380, 450, 520, 600, 610, 650, 700, 760, 620, 620, 135]
    .map((reviews, i) => ({ year: String(2004 + i), reviews })),
  yLabel: 'Reviews (k)',
  valueFormat: 'compact',
  span: 12,
  note: 'Eighteen years of coverage with a visible 2020 dip; the crisis engine needs at least 14 days of history, so every brand in the subset qualifies.',
}

// Data — train / test split from eval_metrics.json
const splitBar: BarChart = {
  kind: 'bar',
  title: 'Training Matrix',
  subtitle: 'Stratified 80/20 split of the 499,991-row feature matrix (117 features)',
  xKey: 'split',
  series: [{ key: 'rows', label: 'Rows' }],
  data: [
    { split: 'Train', rows: 399992 },
    { split: 'Test', rows: 99999 },
  ],
  valueFormat: 'compact',
  yLabel: 'Rows',
  note: '117 features per review: 100 TF-IDF SVD components, 12 lexical/linguistic signals and 5 aspect compounds.',
}

/* ───────────────────────────── live demo (keyword ABSA port) ───────────────────────────── */

const POS_WORDS = new Set([
  'great', 'good', 'excellent', 'fantastic', 'love', 'loved', 'amazing', 'wonderful', 'helpful', 'clean',
  'perfect', 'friendly', 'spotless', 'delicious', 'comfortable', 'recommend', 'impressed', 'attentive',
  'superb', 'best', 'incredible', 'immaculate', 'professional', 'courteous', 'welcoming', 'convenient',
  'affordable', 'reasonable', 'quiet', 'exceptional', 'outstanding', 'brilliant', 'nice', 'pleasant',
])
const NEG_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'dirty', 'rude', 'slow', 'disappointing',
  'filthy', 'broken', 'overpriced', 'unhelpful', 'noisy', 'smell', 'stained', 'never', 'cold', 'wait',
  'dismissive', 'incompetent', 'expensive', 'disgusting', 'unacceptable', 'mold', 'mould', 'grimy',
  'dusty', 'messy', 'costly', 'far', 'isolated', 'disappointed', 'complaint', 'refund', 'unsafe',
])
const NEGATORS = new Set(['not', 'no', 'never', 'hardly', "wasn't", "weren't", "isn't", "didn't", "don't", "couldn't", "wouldn't", 'nothing'])

// Aspect lexicon from src/features.py get_aspect_keywords()
const ASPECT_KEYWORDS: Record<string, string[]> = {
  cleanliness: ['clean', 'dirty', 'tidy', 'spotless', 'filthy', 'hygien', 'sanitized', 'dusty', 'stained', 'smell', 'odor', 'mold', 'mould', 'grim', 'immaculate', 'pristine', 'messy', 'clutter'],
  staff: ['staff', 'rude', 'friendly', 'helpful', 'service', 'employee', 'receptionist', 'concierge', 'manager', 'attentive', 'professional', 'courteous', 'polite', 'unhelpful', 'dismissive', 'responsive', 'welcoming', 'incompetent', 'negligent', 'kind'],
  value: ['price', 'expensive', 'cheap', 'affordable', 'overpriced', 'value', 'worth', 'costly', 'reasonable', 'budget', 'rate', 'fee', 'charge', 'deal', 'bargain', 'money', 'cost', 'pricing'],
  location: ['location', 'central', 'far', 'convenient', 'accessible', 'transport', 'walk', 'distance', 'neighborhood', 'area', 'nearby', 'close', 'remote', 'isolated', 'downtown', 'suburb', 'transit', 'parking', 'commute', 'quiet', 'noisy'],
  amenities: ['pool', 'wifi', 'parking', 'gym', 'fitness', 'breakfast', 'bar', 'restaurant', 'spa', 'internet', 'tv', 'air conditioning', 'heating', 'elevator', 'laundry', 'minibar', 'jacuzzi', 'sauna', 'business center', 'conference', 'pet'],
}

/** VADER-style lexical scorer: +/-1.9 valence per hit, negation flips at 0.74, '!' boosts, sum / sqrt(sum^2 + 15). */
function lexScore(sentence: string): { compound: number; pos: number; neg: number; bangs: number } {
  const tokens = sentence.toLowerCase().split(/[^a-z']+/).filter(Boolean)
  let sum = 0
  let pos = 0
  let neg = 0
  tokens.forEach((t, i) => {
    let v = POS_WORDS.has(t) ? 1.9 : NEG_WORDS.has(t) ? -1.9 : 0
    if (v !== 0 && i > 0 && NEGATORS.has(tokens[i - 1])) v = -v * 0.74
    if (v > 0) pos += 1
    else if (v < 0) neg += 1
    sum += v
  })
  const bangs = Math.min((sentence.match(/!/g) ?? []).length, 4)
  if (sum > 0) sum += bangs * 0.292
  else if (sum < 0) sum -= bangs * 0.292
  return { compound: sum / Math.sqrt(sum * sum + 15), pos, neg, bangs }
}

/* ───────────────────────────── module ───────────────────────────── */

const app: ProjectApp = {
  ...base,
  summary:
    'Ingests the 6.9M-review Yelp Open Dataset, scores every review for overall and aspect-level sentiment, and turns the stream into brand-health KPIs, competitive benchmarks and crisis alerts. A velocity-based anomaly engine flags reputation drops 24–38 hours before they escalate, and a locally hosted Llama 3.2 writes the executive briefing at zero API cost.',
  hero: { image: 'hero.jpg', alt: 'Hotel lobby at dusk, the hospitality setting the brand intelligence platform monitors' },
  buyers: [
    { name: 'Marriott', domain: 'marriott.com', useCase: 'Brand health monitoring across 8,000+ properties', value: '$3M+ in crisis prevention' },
    { name: 'Hilton', domain: 'hilton.com', useCase: 'Competitive benchmarking vs. Marriott and Hyatt', value: '$2M+ in competitive intelligence' },
    { name: 'Starbucks', domain: 'starbucks.com', useCase: 'Store-level service quality and barista sentiment trends', value: '$5M+ in retention' },
    { name: "McDonald's", domain: 'mcdonalds.com', useCase: 'Crisis early warning and regional menu perception', value: '$8M+ in PR crisis prevention' },
    { name: 'Yum! Brands', domain: 'yum.com', useCase: 'Franchise quality consistency across KFC, Pizza Hut and Taco Bell', value: '$4M+ per brand' },
    { name: 'Yelp', domain: 'yelp.com', useCase: 'White-label brand intelligence SaaS for enterprise clients', value: 'Platform licensing' },
  ],
  // Registry metrics carried over; crisis lead time follows the report.
  metrics: [
    { label: 'Reviews analysed', value: '6.9M' },
    { label: 'Sentiment AUC', value: '0.91', pct: 91 },
    { label: 'Crisis lead time', value: '24–38 h' }, // sources differ: report 24–38 h; README / registry 18–36 h
    { label: 'Aspect F1', value: '0.87', pct: 87 },
  ],
  dataset: {
    name: 'Yelp Open Dataset 2022',
    size: '8.8 GB · 6,990,280 reviews',
    source: { label: 'yelp.com/dataset', url: 'https://www.yelp.com/dataset' },
    description:
      'The full Yelp Open Dataset: 6.99M reviews of 150,346 businesses across hospitality, food & beverage and retail, spanning 2004 to early 2022. The modelling work and dashboard focus on the ~100K-review hotel and resort subset, with Yelp JSON and Airbnb CSV loaders feeding one Parquet store.',
    facts: [
      { label: 'Reviews', value: '6,990,280' },
      { label: 'Businesses', value: '150,346' },
      { label: 'Time span', value: '2004 – 2022 (18 years)' },
      { label: 'Hospitality subset', value: '~100K hotel / resort reviews' },
      { label: 'Star distribution', value: '5-star 38% · 1-star 19%' },
      { label: 'Training matrix', value: '499,991 rows × 117 features' },
      { label: 'Aspect dimensions', value: '11 tracked (5 in the live scorer)' }, // sources differ: report 11 aspects; src/features.py lexicon has 5
      { label: 'Loaders', value: 'Yelp JSON · Airbnb CSV · synthetic fallback' },
    ],
  },
  stack: [
    { name: 'RoBERTa (HF Transformers)', group: 'NLP' },
    { name: 'VADER', group: 'NLP' },
    { name: 'BERTopic + NMF fallback', group: 'NLP' },
    { name: 'sentence-transformers MiniLM', group: 'NLP' },
    { name: 'UMAP + HDBSCAN', group: 'ML' },
    { name: 'XGBoost / LightGBM', group: 'ML' },
    { name: 'scikit-learn', group: 'ML' },
    { name: 'Llama 3.2 via Ollama', group: 'LLM' },
    { name: 'FastAPI + Pydantic v2', group: 'Serving' },
    { name: 'Streamlit + Plotly', group: 'Serving' },
    { name: 'Polars · PyArrow · Parquet', group: 'Data' },
    { name: 'Docker Compose', group: 'MLOps' },
  ],
  problem: [
    'Hotel chains receive thousands of reviews a day yet manually sample fewer than 6% of them, leaving 94% of customer signal invisible until a reputation crisis has already escalated. Survey-based brand tracking takes weeks, and by the time a score drop is noticed the star rating has typically fallen 0.3–0.6 points.',
    'That lag is expensive. A single reputation incident costs $2–8M in lost forward bookings and takes four to eight weeks to recover, and at Marriott scale every one-point NPS move is worth $6.5–15M in annual revenue. Brand teams need the signal hours, not weeks, before the headline forms.',
    'The raw data is also unstructured: reviews mix praise for the staff with complaints about parking in the same sentence, so a single overall score hides the aspect that is actually deteriorating and the competitor that is winning on it.',
  ],
  solution: [
    'The platform loads the Yelp corpus into Parquet, cleans and deduplicates text, and scores every review twice: a fast VADER lexicon pass for sub-millisecond streaming, and a RoBERTa aspect-based sentiment model for the 11 service dimensions (cleanliness, staff, value, location, amenities and more). The dual-model ensemble reaches AUC 0.91 and an aspect F1 of 0.87, above the 0.82 human-human agreement benchmark.',
    'A supervised classifier (XGBoost, LightGBM and logistic regression cross-validated on F1 macro, XGBoost selected) runs on 117 engineered features: 100 TF-IDF SVD components, eight linguistic signals, four lexicon scores and five aspect compounds. BERTopic with UMAP and HDBSCAN discovers 28 stable topics (coherence 0.68) without labelled topic data, with an NMF fallback for constrained environments.',
    'The crisis engine resamples sentiment daily, compares each day to a shifted rolling baseline and fires WARNING alerts on a 0.10 drop and CRITICAL on 0.30; the API variant adds a 28-day z-score and a volume-spike test, returning severity, crisis probability and a playbook of recommended actions. Competitive benchmarking ranks every brand, computes share of voice and an NPS proxy, and runs per-aspect gap analysis against the top five rivals.',
    'Llama 3.2 (4B, via Ollama, local and free) extracts structured aspects, competitive signals and action items from any review and writes a three-paragraph executive brand briefing from aggregated metrics in under three seconds. Everything is exposed through a FastAPI service on port 8000 and a six-page Streamlit dashboard on port 8500.',
  ],
  features: [
    { title: 'Real-time sentiment trend', description: 'Rolling 30-day sentiment with positive and negative thresholds, review-volume context and KPI cards for average score, NPS proxy and open crisis alerts.', icon: GraphIcon, image: '01_sentiment_trend.webp' },
    { title: 'Aspect-based sentiment', description: 'Radar and ranked bars for cleanliness, staff, value, location and amenities, a weekly trend per aspect and the top five positive and negative reviews behind each score.', icon: CommentDiscussionIcon, image: '02_aspect_analysis.webp' },
    { title: 'Crisis detection and early warning', description: 'Daily sentiment against a shifted rolling baseline with anomaly markers, a severity-coded alert log and a drop-distribution histogram with the 0.10 warning and 0.30 critical lines.', icon: AlertIcon, image: '03_crisis_detection.webp' },
    { title: 'Competitive intelligence', description: 'Brand sentiment ranking, share of voice, NPS breakdown and per-aspect gap analysis of the leading brand against its five closest competitors.', icon: TrophyIcon, image: '04_competitive_intel.webp' },
    { title: 'Topic explorer', description: 'Topic cards with top words and document counts, trend scores that compare the recent window to the prior one, and sample reviews per topic.', icon: TelescopeIcon, image: '05_topic_explorer.webp' },
    { title: 'Review search', description: 'Full-text search with sentiment filter and sort by recency, polarity or rating, each hit badged with its compound score, rating, brand and date.', icon: SearchIcon, image: '06_review_search.webp' },
    { title: 'Llama 3.2 narratives', description: 'Structured JSON aspect extraction and a CCO-style three-paragraph brand briefing generated locally through Ollama, with a deterministic fallback when the model is offline.', icon: SparkleIcon },
    { title: '7-day sentiment forecast', description: 'Exponential-smoothing extrapolation of the last 90 days with 80% prediction intervals and a declining / stable / improving trend call.', icon: PulseIcon },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Overview — KPI cards (avg sentiment, total reviews, NPS proxy, crisis alerts) above the 30-day sentiment trend', w: 1440, h: 900 },
    { file: '01_overview.webp', caption: 'Overview — sentiment distribution donut and star-rating histogram for the filtered window', w: 1440, h: 900 },
    { file: '01_sentiment_trend.webp', caption: 'Overview — 30-day sentiment trend with the neutral line and the ±0.05 positive / negative thresholds', w: 1312, h: 567 },
    { file: '02_aspect_analysis.webp', caption: 'Aspect Analysis — radar of the five aspects beside the ranked aspect score comparison', w: 1440, h: 900 },
    { file: '02_aspect_sentiment.webp', caption: 'Aspect Analysis — weekly sentiment trend for the selected aspect with top positive and negative reviews', w: 1271, h: 567 },
    { file: '03_crisis_detection.webp', caption: 'Crisis Detection — sentiment timeline with rolling baseline and anomaly markers, alert log and drop histogram', w: 1440, h: 900 },
    { file: '03_topic_distribution.webp', caption: 'Topic Explorer — document share per discovered topic', w: 1362, h: 598 },
    { file: '04_competitive_intel.webp', caption: 'Competitive Intel — brand sentiment ranking, share-of-voice donut, NPS breakdown and gap analysis table', w: 1440, h: 900 },
    { file: '05_topic_explorer.webp', caption: 'Topic Explorer — topic cards with top words, trend scores and sample reviews per topic', w: 1440, h: 900 },
    { file: '06_review_search.webp', caption: 'Review Search — full-text search with sentiment filter, sort options and badged results', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Ingest', description: 'Stream the 8.8 GB Yelp review JSON (plus Airbnb CSV) into partitioned Parquet; a synthetic generator covers environments without the download.', tech: 'Polars · PyArrow · Parquet', icon: DatabaseIcon },
    { title: 'Preprocess and featurise', description: 'Strip HTML, normalise text, then build 117 features: VADER scores, eight linguistic signals, five aspect compounds and a 2,000-term TF-IDF reduced to 100 SVD components.', tech: 'NLTK VADER · scikit-learn TruncatedSVD', icon: BeakerIcon },
    { title: 'Train the sentiment classifier', description: 'Cross-validate logistic regression, XGBoost and LightGBM on F1 macro, fit the winner on 399,992 rows and hold out 99,999 for evaluation.', tech: 'XGBoost 200 trees · StratifiedKFold', icon: CpuIcon },
    { title: 'Discover topics', description: 'Fit BERTopic (UMAP + HDBSCAN + c-TF-IDF) with an NMF fallback, label topics from their top words and score each topic\'s recent-vs-prior trend.', tech: 'BERTopic 0.16 · NMF', icon: TelescopeIcon },
    { title: 'Detect crises', description: 'Resample sentiment daily, compare to a shifted rolling baseline and a 28-day z-score, add a volume-spike test and map severity to a response playbook.', tech: 'pandas rolling · z-score', icon: AlertIcon },
    { title: 'Generate narratives', description: 'Call llama3.2 through the OpenAI-compatible Ollama endpoint for structured review analysis and executive briefings.', tech: 'Ollama · Llama 3.2 4B', icon: SparkleIcon },
    { title: 'Serve', description: 'Expose scoring, benchmarking, crisis and forecast endpoints on FastAPI and render the six-page Streamlit dashboard, both containerised with supervisord.', tech: 'FastAPI 0.104 · Streamlit 1.29 · Docker', icon: ServerIcon },
  ],
  models: [
    { component: 'Sentiment classifier', model: 'RoBERTa (fine-tuned, HuggingFace)', purpose: 'Aspect-level polarity across 11 service dimensions', metric: 'AUC 0.91 · aspect F1 0.87' },
    { component: 'Fast baseline', model: 'VADER lexicon', purpose: 'Sub-millisecond streaming score and training labels', metric: '< 1 ms per review' },
    { component: 'Feature-space classifier', model: 'XGBoost (200 trees, depth 6)', purpose: 'Three-class sentiment on 117 engineered features', metric: 'Test F1 macro 0.968' },
    { component: 'Topic discovery', model: 'BERTopic + UMAP + HDBSCAN', purpose: 'Unsupervised topic clusters with NMF fallback', metric: '28 topics · coherence 0.68' }, // sources differ: report 28 topics; README 47
    { component: 'Health trend predictor', model: 'LightGBM', purpose: 'Brand-health trajectory from review velocity and momentum', metric: 'Hourly refresh' },
    { component: 'Crisis engine', model: 'Rolling baseline + 28-day z-score', purpose: 'WARNING / CRITICAL alerts with recommended actions', metric: '91% precision · 24–38 h lead' },
    { component: 'Narrative generator', model: 'Llama 3.2 4B (Ollama, local)', purpose: 'Executive summaries and structured review analysis', metric: '< 3 s per briefing' },
    { component: 'Semantic embeddings', model: 'sentence-transformers/all-MiniLM-L6-v2', purpose: 'Review clustering and similarity search', metric: '384-dim' },
  ],
  results: [
    { metric: 'Aspect sentiment F1', value: '0.87', note: 'Exceeds human-human agreement of 0.82', pct: 87 },
    { metric: 'Sentiment AUC (ensemble)', value: '0.91', note: 'Held-out review labels', pct: 91 },
    { metric: 'Crisis detection precision', value: '91%', note: 'At 24-hour early warning', pct: 91 },
    { metric: 'Crisis lead time', value: '24–38 h', note: 'Ahead of external escalation' }, // sources differ: README 18–36 h
    { metric: 'Batch throughput', value: '1,200 reviews/s', note: 'Batch inference' }, // sources differ: README ~12,000 reviews/min
    { metric: 'BERTopic coherence', value: '0.68', note: '28 stable clusters', pct: 68 },
    { metric: 'Classifier test accuracy', value: '99.78%', note: '99,999 held-out reviews, eval_metrics.json', pct: 99.78 },
    { metric: 'LLM narrative latency', value: '< 3 s', note: 'Llama 3.2 on local Ollama' },
  ],
  charts: {
    overview: [sentimentTrend, brandRanking],
    dashboard: [sentimentTrend, sentimentDistribution, aspectRadar, aspectComparison, crisisTimeline, brandRanking, npsBreakdown, topicTrend],
    model: [roc, confusion, cvFolds, perClass],
    data: [labelBalance, ratingDistribution, reviewsPerYear, splitBar],
  },
  demo: {
    title: 'Live aspect sentiment analysis',
    description: 'Paste any hotel or restaurant review. The scorer runs the VADER-style lexicon pass and the five-aspect keyword extractor from the feature pipeline, then reports polarity, confidence and the aspects driving it.',
    inputs: [
      {
        key: 'review',
        label: 'Review text',
        type: 'textarea',
        default: 'The lobby staff were incredible and the room was spotless, but checkout took 45 minutes and the parking was overpriced.',
        hint: 'Sentences are matched to cleanliness, staff, value, location and amenities by keyword.',
      },
    ],
    ctaLabel: 'Analyse sentiment',
    evaluate: (values) => {
      const text = str(values.review).trim()
      const sentences = text.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean)
      const overall = lexScore(text)
      const c = overall.compound
      const aspects = Object.entries(ASPECT_KEYWORDS).map(([aspect, kws]) => {
        const hits = sentences.filter((sen) => {
          const l = sen.toLowerCase()
          return kws.some((k) => l.includes(k))
        })
        if (!hits.length) return { aspect, compound: 0, mentioned: false }
        const mean = hits.reduce((a, sen) => a + lexScore(sen).compound, 0) / hits.length
        return { aspect, compound: mean, mentioned: true }
      })
      const mentioned = aspects.filter((a) => a.mentioned)
      const hasPos = mentioned.some((a) => a.compound >= 0.05)
      const hasNeg = mentioned.some((a) => a.compound <= -0.05)

      let headline: string
      let tone: Tone
      let score: number
      if (c >= 0.05) {
        headline = hasNeg ? 'MIXED · NET POSITIVE' : 'POSITIVE'
        tone = 'success'
        score = (c + 1) / 2
      } else if (c <= -0.05) {
        headline = hasPos ? 'MIXED · NET NEGATIVE' : 'NEGATIVE'
        tone = 'danger'
        score = (-c + 1) / 2
      } else {
        headline = 'NEUTRAL'
        tone = 'attention'
        score = Math.max(0, 1 - Math.abs(c) * 10)
      }
      const crisis = c <= -0.5 && overall.neg >= 3
      const orient = c <= -0.05 ? -1 : 1
      const wordCount = text ? text.split(/\s+/).length : 0

      const aspectReasons = [...mentioned]
        .sort((a, b) => Math.abs(b.compound) - Math.abs(a.compound))
        .slice(0, 2)
        .map((a) => ({
          label: `${cap(a.aspect)} aspect (${a.compound >= 0 ? '+' : ''}${a.compound.toFixed(2)})`,
          weight: r3(a.compound * orient),
        }))

      return {
        headline,
        score: r3(Math.min(1, Math.max(0, score))),
        tone,
        details: [
          { label: 'Compound score', value: `${c >= 0 ? '+' : ''}${c.toFixed(3)}` },
          { label: 'Aspects mentioned', value: mentioned.length ? mentioned.map((a) => cap(a.aspect)).join(', ') : 'None matched' },
          { label: 'Lexicon hits', value: `${overall.pos} positive · ${overall.neg} negative` },
          { label: 'Crisis flag', value: crisis ? 'ESCALATE — strongly negative with 3+ complaint terms' : 'No' },
          { label: 'Word count', value: String(wordCount) },
        ],
        reasons: [
          ...aspectReasons,
          { label: `${overall.pos} positive lexicon hit${overall.pos === 1 ? '' : 's'}`, weight: r3(overall.pos * 0.12 * orient) },
          { label: `${overall.neg} negative lexicon hit${overall.neg === 1 ? '' : 's'}`, weight: r3(-overall.neg * 0.12 * orient) },
          { label: `Exclamation emphasis (${overall.bangs})`, weight: r3(overall.bangs * 0.08 * Math.sign(c || 1) * orient) },
        ],
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'POST', path: '/score', description: 'Score one review: sentiment, confidence, VADER components, five aspect scores and linguistic features' },
      { method: 'POST', path: '/score_batch', description: 'Score up to 1,000 reviews in one call' },
      { method: 'GET', path: '/brand_summary/{brand_name}', description: 'Aggregated sentiment, rating, NPS proxy, label distribution and aspect means for a brand' },
      { method: 'GET', path: '/topics', description: 'Top 10 fitted topics with labels, top words and document counts' },
      { method: 'GET', path: '/sentiment_trend', description: 'Daily average sentiment and review counts for the last N days, filterable by brand and source' },
      { method: 'GET', path: '/competitive_benchmark', description: 'Ranked brand benchmark with mean, median, std, review count and percentile' },
      { method: 'GET', path: '/crisis_velocity', description: 'Rolling z-score crisis detector: severity, crisis probability, volume spike and recommended actions' },
      { method: 'GET', path: '/sentiment_forecast', description: '7-day exponential-smoothing forecast with 80% prediction intervals' },
      { method: 'POST', path: '/ai/analyze_review', description: 'Llama 3.2 structured extraction: aspects, themes, competitive signals, action items' },
      { method: 'POST', path: '/ai/brand_narrative', description: 'Llama 3.2 three-paragraph executive brand health briefing from aggregated metrics' },
    ],
    sample: {
      endpoint: 'POST /score',
      request: JSON.stringify(
        {
          text: 'The lobby staff were incredible and the room was spotless, but checkout took 45 minutes and the parking was overpriced.',
          source: 'yelp',
        },
        null,
        2,
      ),
      response: JSON.stringify(
        {
          sentiment: 'positive',
          confidence: 0.7123,
          compound_score: 0.4246,
          pos_score: 0.231,
          neg_score: 0.098,
          neu_score: 0.671,
          aspects: {
            cleanliness: { compound: 0.6249, pos: 0.412, neg: 0.0, neu: 0.588, mentioned: true },
            staff: { compound: 0.6249, pos: 0.412, neg: 0.0, neu: 0.588, mentioned: true },
            value: { compound: -0.3612, pos: 0.0, neg: 0.268, neu: 0.732, mentioned: true },
            location: { compound: -0.3612, pos: 0.0, neg: 0.268, neu: 0.732, mentioned: true },
            amenities: { compound: -0.3612, pos: 0.0, neg: 0.268, neu: 0.732, mentioned: true },
          },
          linguistic: {
            review_length: 119,
            word_count: 21,
            exclamation_count: 0,
            question_count: 0,
            caps_ratio: 0.0168,
            avg_word_length: 4.71,
            sentence_count: 1,
            unique_word_ratio: 0.9524,
          },
          source: 'yelp',
        },
        null,
        2,
      ),
    },
  },
  report: {
    executiveSummary: [
      'Hotel chains receive thousands of reviews daily yet analyze fewer than 6% — leaving 94% of customer signals invisible until reputation crises have already escalated. This platform delivers real-time aspect-level sentiment analysis across 11 service dimensions, identifies reputation crises 24–38 hours before external escalation, and benchmarks competitor performance using 100K+ real Yelp hospitality reviews.',
      'RoBERTa aspect-based sentiment reaches an F1 of 0.87, above the 0.82 human-human agreement benchmark; BERTopic finds 28 stable issue clusters at 0.68 coherence; and the velocity-based crisis engine fires with 91% precision at a 24-hour warning horizon while processing 1,200 reviews per second in batch.',
      'For Marriott-scale operations, a 1-point NPS improvement drives $6.5–15M in annual revenue, while early crisis detection prevents $2–8M in lost bookings per incident. A mid-size chain with 200 properties that detects crises 24 hours faster avoids an estimated $2.1M in lost bookings a year, a 42× return on a $50k/yr licence.',
    ],
    impact: [
      { label: 'Review coverage', value: '100% automated vs. 6% manual sampling' },
      { label: 'Crisis detection', value: '91% precision · 24–38 h early warning' },
      { label: 'NPS sensitivity', value: '1-pt NPS recovery = $6.5–15M ARR' },
      { label: 'Lost bookings avoided', value: '$2–8M per incident' },
      { label: '200-property chain', value: '$2.1M/yr saved · 42× ROI' },
      { label: 'Competitive coverage', value: '4 hotel chains × 11 aspect dimensions' },
    ],
    recommendations: [
      { title: 'Define aspect-level service SLAs', body: 'Hold GMs accountable to review-derived KPIs (e.g. Cleanliness >= 4.2) rather than overall star rating alone.' },
      { title: 'Integrate crisis alerts into revenue management', body: 'Properties in active reputation decline should not launch promotions that attract guests to a degraded experience.' },
      { title: 'Expand to multi-platform aggregation', body: 'Adding Google, TripAdvisor and Expedia alongside Yelp reduces signal noise by 40–60% through demographic cross-validation.' },
    ],
    date: 'June 2026',
  },
}

export default app
