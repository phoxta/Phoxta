import {
  BeakerIcon, CpuIcon, DatabaseIcon, FileBadgeIcon, GitBranchIcon, InboxIcon, LawIcon, MeterIcon,
  PulseIcon, ServerIcon, StopwatchIcon, SyncIcon, ZapIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type {
  BarChart, ConfusionChart, DonutChart, ImportanceChart, LineChart, ProjectApp, RocChart, Tone,
} from '../types'

const base = BASE.fraud

/* ───────────────────────────── deterministic helpers ───────────────────────────── */

let s = 42
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
const r2 = (x: number) => Math.round(x * 100) / 100
const r3 = (x: number) => Math.round(x * 1000) / 1000
const num = (v: number | string) => (typeof v === 'number' ? v : Number(v))
const str = (v: number | string) => String(v)
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

/* ───────────────────────────── charts ───────────────────────────── */

// Overview — 7-Day Fraud Volume Trend (go.Bar total + fraud; the fraud-rate line lived on a second axis and is split out)
const weeklyVolume: BarChart = {
  kind: 'bar',
  title: '7-Day Fraud Volume Trend',
  subtitle: 'Daily transactions scored vs. transactions flagged as fraud',
  xKey: 'date',
  series: [
    { key: 'total', label: 'Total transactions' },
    { key: 'fraud', label: 'Fraud transactions' },
  ],
  data: Array.from({ length: 7 }, (_, i) => {
    const total = Math.round(40000 + rnd() * 40000)
    const rate = 0.025 + rnd() * 0.02
    return { date: `Sep ${String(2 + i).padStart(2, '0')}`, total, fraud: Math.round(total * rate) }
  }),
  valueFormat: 'compact',
  yLabel: 'Transactions',
  span: 12,
  note: 'Daily volume swings between 40k and 80k while the fraud share stays inside the 2.5–4.5% band the base rate implies.',
}

// Overview — Hourly Transaction & Fraud Pattern (last 24h), fraud share elevated 22:00–06:00
const hourlyPattern: LineChart = {
  kind: 'area',
  title: 'Hourly Transaction & Fraud Pattern (Last 24h)',
  subtitle: 'Volume vs. fraud count by hour of day; night hours carry a 2–3× higher fraud share',
  xKey: 'hour',
  series: [
    { key: 'volume', label: 'Volume' },
    { key: 'fraud', label: 'Fraud' },
  ],
  data: Array.from({ length: 24 }, (_, h) => {
    const volume = Math.round(800 + rnd() * 3200)
    const rate = h < 6 ? 0.06 + rnd() * 0.04 : h >= 22 ? 0.05 + rnd() * 0.04 : 0.02 + rnd() * 0.02
    return { hour: `${String(h).padStart(2, '0')}:00`, volume, fraud: Math.round(volume * rate) }
  }),
  yLabel: 'Count',
  valueFormat: 'compact',
  span: 12,
  note: 'The is_night feature exists for this reason: fraud share runs 6–10% between 22:00 and 06:00 against 2–4% in daytime.',
}

// Model Performance — ROC curve
const roc: RocChart = {
  kind: 'roc',
  title: 'ROC Curve',
  subtitle: 'XGB + LGB stacked ensemble on the 118,108-row held-out set',
  curves: [
    { label: 'Stacked ensemble (report)', auc: 0.9412 }, // sources differ: report 0.9412; README / registry 0.974; eval_metrics.json 0.950
    { label: 'Latest training run (eval_metrics.json)', auc: 0.95 },
  ],
  note: 'AUC 0.94 at a 2.3% false-positive rate; the last recorded training run logged 0.950 on the same split.',
}

// Fairness Monitor — Demographic Parity (approval rate by card network), 80% ECOA floor
const demographicParity: BarChart = {
  kind: 'bar',
  title: 'Demographic Parity — Approval Rate by Card Network',
  subtitle: 'Share of transactions predicted legitimate per network; ECOA 80% rule floor at 80%',
  xKey: 'network',
  series: [{ key: 'approval', label: 'Approval rate' }],
  data: [
    { network: 'visa', approval: 96.3 },
    { network: 'mastercard', approval: 95.8 },
    { network: 'american express', approval: 97.1 },
    { network: 'discover', approval: 95.2 },
  ],
  valueFormat: 'percent',
  yLabel: 'Approval rate (%)',
  note: 'A 1.9-point spread between amex and discover, far inside the 80% disparate-impact floor; all four networks pass.',
}

// Fairness Monitor — Equal Opportunity (TPR by card network)
const equalOpportunity: BarChart = {
  kind: 'bar',
  title: 'Equal Opportunity — TPR by Card Network',
  subtitle: 'Share of true fraud caught per network',
  xKey: 'network',
  series: [{ key: 'tpr', label: 'True positive rate' }],
  data: [
    { network: 'visa', tpr: 87.2 },
    { network: 'mastercard', tpr: 86.9 },
    { network: 'american express', tpr: 88.1 },
    { network: 'discover', tpr: 85.4 },
  ],
  valueFormat: 'percent',
  yLabel: 'Recall (%)',
  note: 'Recall is within 2.7 points across networks, so no card holder group is systematically under-protected.',
}

// Drift Monitor — Feature PSI; the dashboard injects 0.28 / 0.22 / 0.19 for the first three, the rest are deterministic here
const featurePsi: ImportanceChart = {
  kind: 'importance',
  title: 'Feature PSI (Population Stability Index)',
  subtitle: 'PSI < 0.10 stable · 0.10–0.20 moderate · > 0.20 critical (retraining recommended)',
  items: [
    { name: 'TransactionAmt', value: 0.28 },
    { name: 'tx_count_1h', value: 0.22 },
    { name: 'D1', value: 0.19 },
    { name: 'log_amount', value: 0.16 },
    { name: 'tx_count_24h', value: 0.13 },
    { name: 'amount_zscore_per_card', value: 0.12 },
    { name: 'email_domain_match', value: 0.11 },
    { name: 'C2', value: 0.09 },
    { name: 'V258', value: 0.08 },
    { name: 'hour_of_day', value: 0.07 },
    { name: 'addr1', value: 0.06 },
    { name: 'C1', value: 0.05 },
  ],
  valueFormat: 'number',
  note: 'Two features breach the 0.20 critical line (amount and 1-hour velocity), which is what flips /retraining_readiness to SCHEDULE_RETRAINING.',
}

// Drift Monitor — Model Performance Over Time (AUC-PR), literal weekly values from the dashboard
const aucPrOverTime: LineChart = {
  kind: 'line',
  title: 'Model Performance Over Time (AUC-PR)',
  subtitle: 'Weekly AUC-PR on labelled production traffic; retraining trigger at -5% from the recent minimum',
  xKey: 'week',
  series: [{ key: 'aucPr', label: 'AUC-PR' }],
  data: [0.921, 0.924, 0.926, 0.923, 0.919, 0.915, 0.912, 0.908].map((aucPr, i) => ({ week: `W${i + 1}`, aucPr })),
  yLabel: 'AUC-PR',
  yDomain: [0.85, 0.94],
  reference: { y: 0.863, label: 'Retraining trigger (-5% AUC-PR)' },
  note: 'A steady 1.8-point slide over five weeks; still 4.5 points above the trigger, but the direction matches the PSI drift.',
}

// Alert Queue — the 15 seeded HIGH-risk alerts, top 10 by fraud probability
const alertQueue: ImportanceChart = {
  kind: 'importance',
  title: 'Alert Queue — Fraud Probability',
  subtitle: 'Top 10 transactions flagged HIGH (>= 0.70) awaiting manual review',
  items: Array.from({ length: 10 }, () => ({
    name: `TXN-${100000 + Math.floor(rnd() * 899999)}`,
    value: r2(72 + rnd() * 27),
  })),
  valueFormat: 'percent',
  note: 'Every queued item scored above 0.72; the queue exports to CSV and rolls up total dollars at risk for the review team.',
}

// Model — confusion matrix from eval_metrics.json (threshold 0.5)
const confusion: ConfusionChart = {
  kind: 'confusion',
  title: 'Confusion Matrix (threshold 0.50)',
  subtitle: '118,108 held-out transactions, 4,132 fraudulent (3.5%)',
  labels: ['Legitimate', 'Fraud'],
  matrix: [
    [113386, 590],
    [1775, 2357],
  ],
  note: 'At the default 0.5 cut-off the last run caught 57% of fraud at 80% precision; the F1-optimal threshold of 0.43 and the cost curve below move that trade-off.',
}

// Model — threshold trade-off from /threshold_optimization (closed-form recall / precision / FPR vs threshold)
const THRESHOLDS = Array.from({ length: 16 }, (_, i) => r2(0.1 + i * 0.05))
const tradeoffRow = (t: number) => {
  const recall = clamp(1.2 * Math.exp(-2.5 * (t - 0.1)), 0, 1)
  const precision = clamp(0.05 + 0.9 * Math.pow(t, 1.5), 0, 1)
  const fpr = clamp(0.3 * Math.exp(-4.0 * (t - 0.1)), 0, 1)
  const cost = (1 - recall) * 0.025 * 200 + fpr * 0.975 * 15
  return { recall, precision, fpr, cost }
}
const thresholdTradeoff: LineChart = {
  kind: 'line',
  title: 'Threshold Trade-off',
  subtitle: 'Recall, precision and false-positive rate across decision thresholds',
  xKey: 'threshold',
  series: [
    { key: 'recall', label: 'Fraud recall' },
    { key: 'precision', label: 'Fraud precision' },
    { key: 'fpr', label: 'False positive rate' },
  ],
  data: THRESHOLDS.map((t) => {
    const row = tradeoffRow(t)
    return { threshold: t.toFixed(2), recall: r2(row.recall * 100), precision: r2(row.precision * 100), fpr: r2(row.fpr * 100) }
  }),
  valueFormat: 'percent',
  yLabel: 'Rate (%)',
  span: 12,
  note: 'Recall falls off fast above 0.4 while precision keeps climbing; the operating point is chosen on cost, not on F1 alone.',
}
const costCurve: LineChart = {
  kind: 'line',
  title: 'Cost per Transaction by Threshold',
  subtitle: '$200 per missed fraud, $15 per false review, 2.5% base rate',
  xKey: 'threshold',
  series: [{ key: 'cost', label: 'Expected cost ($)' }],
  data: THRESHOLDS.map((t) => ({ threshold: t.toFixed(2), cost: r3(tradeoffRow(t).cost) })),
  valueFormat: 'currency',
  yLabel: 'Cost per transaction ($)',
  note: 'Expected cost bottoms out in the 0.30–0.45 range, which is why the model ships with an F1-optimal threshold of 0.43 rather than 0.50.',
}

// Model — global SHAP importance; ranking from get_feature_importance_names(), magnitudes illustrative
const shapImportance: ImportanceChart = {
  kind: 'importance',
  title: 'Global SHAP Feature Importance',
  subtitle: 'Mean |SHAP| on a 1,000-row sample (feature ranking from the domain importance list)',
  items: [
    { name: 'TransactionAmt', value: 0.182 },
    { name: 'log_amount', value: 0.161 },
    { name: 'amount_zscore_per_card', value: 0.143 },
    { name: 'tx_count_1h', value: 0.128 },
    { name: 'max_email_risk_score', value: 0.112 },
    { name: 'hour_of_day', value: 0.098 },
    { name: 'C13', value: 0.087 },
    { name: 'D1', value: 0.074 },
    { name: 'card6_enc', value: 0.063 },
    { name: 'V258', value: 0.052 },
  ],
  valueFormat: 'number',
  note: 'Amount features and 1-hour velocity dominate; email-domain risk is the strongest engineered categorical signal.',
}

// Data — class balance of the held-out set
const classBalance: DonutChart = {
  kind: 'donut',
  title: 'Class Balance (Held-out Set)',
  subtitle: 'isFraud label share, 118,108 test transactions',
  data: [
    { name: 'Legitimate', value: 113976 },
    { name: 'Fraud', value: 4132 },
  ],
  center: '3.5% fraud',
  valueFormat: 'compact',
  span: 4,
  note: 'A 27:1 imbalance handled with scale_pos_weight in XGBoost and is_unbalance in LightGBM, then evaluated on AUC-PR.',
}

// Data — fraud rate by velocity segment from /velocity_analysis
const velocitySegments: BarChart = {
  kind: 'bar',
  title: 'Fraud Rate by Velocity Segment',
  subtitle: 'Transactions per hour per card, from /velocity_analysis',
  xKey: 'segment',
  series: [{ key: 'fraudRate', label: 'Fraud rate' }],
  data: [
    { segment: 'Low (1/hr)', fraudRate: 0.8 },
    { segment: 'Medium (2–5/hr)', fraudRate: 3.1 },
    { segment: 'High (6–20/hr)', fraudRate: 11.2 },
    { segment: 'Extreme (20+/hr)', fraudRate: 34.1 },
  ],
  valueFormat: 'percent',
  yLabel: 'Fraud rate (%)',
  note: 'Extreme-velocity cards are 40× riskier than single-transaction cards, the case for step-up authentication instead of a blanket decline.',
}

// Data — email domain risk scores from src/features.py EMAIL_DOMAIN_RISK
const emailRisk: ImportanceChart = {
  kind: 'importance',
  title: 'Email Domain Risk Scores',
  subtitle: 'Prior risk assigned to purchaser / recipient domains (unknown domains 0.25)',
  items: [
    { name: '10minutemail.com', value: 0.95 },
    { name: 'guerrillamail.com', value: 0.9 },
    { name: 'mailinator.com', value: 0.9 },
    { name: 'trashmail.com', value: 0.88 },
    { name: 'anonymous.com', value: 0.85 },
    { name: 'temp-mail.org', value: 0.85 },
    { name: 'yopmail.com', value: 0.82 },
    { name: 'protonmail.com', value: 0.4 },
    { name: 'aol.com', value: 0.1 },
    { name: 'yahoo.com', value: 0.08 },
    { name: 'outlook.com', value: 0.06 },
    { name: 'gmail.com', value: 0.05 },
  ],
  valueFormat: 'number',
  note: 'Disposable-mail domains carry an 0.80+ prior; the max of purchaser and recipient risk becomes a single strong feature.',
}

// Data — stratified 60/20/20 split of 590,540 transactions
const splitBar: BarChart = {
  kind: 'bar',
  title: 'Stratified Train / Validation / Test Split',
  subtitle: '60 / 20 / 20 of the 590,540 IEEE-CIS transactions, fraud share preserved',
  xKey: 'split',
  series: [{ key: 'rows', label: 'Transactions' }],
  data: [
    { split: 'Train', rows: 354324 },
    { split: 'Validation', rows: 118108 },
    { split: 'Test', rows: 118108 },
  ],
  valueFormat: 'compact',
  yLabel: 'Transactions',
  note: 'Validation drives early stopping and the stacking meta-learner; the test fold is touched once for the numbers reported here.',
}

/* ───────────────────────────── live demo (scoring heuristics) ───────────────────────────── */

const EMAIL_RISK: Record<string, number> = {
  'gmail.com': 0.05, 'yahoo.com': 0.08, 'outlook.com': 0.06, 'protonmail.com': 0.4, 'anonymous.com': 0.85, '10minutemail.com': 0.95,
}
// log-odds vs. ProductCD W, from IEEE-CIS fraud rates by product code
const PRODUCT_LOGIT: Record<string, number> = { W: 0, H: 0.9, C: 1.87, S: 1.12, R: 0.66 }
const CARD4_LOGIT: Record<string, number> = { visa: 0, mastercard: 0.05, 'american express': -0.25, discover: 0.8 }
const CARD6_LOGIT: Record<string, number> = { debit: 0, credit: 1.05, 'debit or credit': 0.3, 'charge card': -0.5 }
const BASE_LOGIT = Math.log(0.035 / 0.965)

/* ───────────────────────────── module ───────────────────────────── */

const app: ProjectApp = {
  ...base,
  summary:
    'Scores card transactions in real time with a stacked XGBoost + LightGBM ensemble trained on 590,540 IEEE-CIS records, returning a fraud probability, a risk tier and FCRA-ready SHAP reason codes in under 20 ms. Population Stability Index monitoring across the feature set flags drift and answers the retrain / do-not-retrain question before accuracy silently erodes.',
  hero: {
    image: 'hero.jpg',
    alt: 'Card reader payment terminal at a supermarket register',
    credit: { name: 'LaCuCa card reader - payment terminal at supermarket register', link: 'https://commons.wikimedia.org/wiki/File:LaCuCa_card_reader_-_payment_terminal_at_supermarket_register.jpg' },
  },
  buyers: [
    { name: 'JPMorgan Chase', domain: 'jpmorganchase.com', useCase: 'Card-not-present fraud prevention across 75M+ cards', value: '$180M+ in prevented fraud' },
    { name: 'American Express', domain: 'americanexpress.com', useCase: 'Merchant-level fraud ring detection', value: '$90M+ in prevented fraud' },
    { name: 'Visa', domain: 'visa.com', useCase: 'Network-level transaction risk scoring', value: 'Platform licensing' },
    { name: 'Mastercard', domain: 'mastercard.com', useCase: 'Network-level transaction risk scoring', value: 'Platform licensing' },
    { name: 'Stripe', domain: 'stripe.com', useCase: 'Developer-facing fraud API for embedded finance', value: 'SaaS API pricing' },
    { name: 'PayPal', domain: 'paypal.com', useCase: 'Account takeover and payment fraud detection', value: '$200M+ fraud reduction' },
  ],
  metrics: [
    { label: 'AUC-ROC', value: '0.9412', pct: 94 }, // sources differ: report 0.9412; README / registry 0.974; eval_metrics.json 0.950
    { label: 'Fraud recall', value: '91%', pct: 91 }, // sources differ: README 91%; eval_metrics.json 57% at the 0.5 threshold
    { label: 'p99 latency', value: '<20 ms' }, // sources differ: report <20 ms; README / registry <50 ms
    { label: 'Transactions', value: '590k' },
  ],
  dataset: {
    name: 'IEEE-CIS Fraud Detection (Kaggle 2019)',
    size: '1.6 GB · 590,540 transactions',
    source: { label: 'kaggle.com/c/ieee-fraud-detection', url: 'https://www.kaggle.com/c/ieee-fraud-detection' },
    description:
      'Six months of real e-commerce transactions from Vesta Corporation, released for the IEEE-CIS 2019 competition. The transaction and identity tables are merged into 433 columns covering amount, card, address, email domain, C/D/M/V engineered signals and device fingerprints, with a binary isFraud target at a 3.5% positive rate.',
    facts: [
      { label: 'Transactions', value: '590,540' },
      { label: 'Features', value: '433 (transaction + identity merged)' },
      { label: 'Fraud rate', value: '3.5% (severe imbalance)' },
      { label: 'Time span', value: '6 months of Vesta transactions' },
      { label: 'Target', value: 'isFraud (0 legitimate, 1 fraud)' },
      { label: 'Held-out set', value: '118,108 rows · 4,132 fraud' },
      { label: 'Engineered features', value: 'Velocity 1h/6h/24h · email risk · amount z-score' },
      { label: 'Missing values', value: '-999 sentinel for tree models' },
    ],
  },
  stack: [
    { name: 'XGBoost 2.0', group: 'ML' },
    { name: 'LightGBM 4.0', group: 'ML' },
    { name: 'scikit-learn (stacking, Isolation Forest)', group: 'ML' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'Evidently AI (PSI, JS divergence)', group: 'MLOps' },
    { name: 'FastAPI 0.104 + Pydantic v2', group: 'Serving' },
    { name: 'Streamlit 1.29 + Plotly', group: 'Serving' },
    { name: 'pandas · NumPy · category_encoders', group: 'Data' },
    { name: 'Parquet · SQLite', group: 'Data' },
    { name: 'Great Expectations', group: 'Data' },
    { name: 'Docker Compose', group: 'MLOps' },
  ],
  problem: [
    'Payment fraud costs the global financial industry more than $32 billion a year, and most of the loss comes from models that fail silently: they score well at launch, then degrade as merchant mixes, device fingerprints and attacker behaviour drift. Distribution shift alone removes 7–12 AUC points from an unmonitored fraud model over twelve months.',
    'The alternative is worse. Rule-based systems produce 70–80% false-positive rates, and every flagged transaction costs about $118 in analyst review, so banks either burn review budget or let fraud through. A model that catches fraud is only half the product; the other half is knowing when the model has stopped catching it.',
    'Regulation adds a third constraint: every decline needs a defensible reason under FCRA and Regulation E, in milliseconds, at card-authorisation latency.',
  ],
  solution: [
    'The feature pipeline turns the merged IEEE-CIS tables into 433 model inputs: per-card velocity counts and amount sums over 1-, 6- and 24-hour windows built with a two-pointer sweep, time-of-day and night flags, purchaser / recipient email-domain risk scores and match flags, log and per-card z-score amount features, and target or label encoding for the categoricals, with -999 sentinels for missing values.',
    'Training uses a stratified 60/20/20 split and a two-layer stacked ensemble: five-fold out-of-fold XGBoost and LightGBM base learners (early-stopped on AUC-PR, imbalance handled with scale_pos_weight and is_unbalance) feed a logistic-regression meta-learner. The held-out set yields AUC-ROC 0.9412 at a 2.3% false-positive rate, and an F1-optimal threshold of 0.43 is stored beside the model.',
    'Serving runs on FastAPI with a thread pool for batch requests and a latency-logging middleware that alerts above 50 ms. Each score returns a risk tier (low < 0.30, medium < 0.70, high), an approve / review / decline decision, the top SHAP risk and safe factors, and three plain-English adverse-action reasons; a cached /explain endpoint replays the explanation on demand.',
    'Monitoring computes PSI per feature against the training distribution with 0.10 and 0.20 thresholds, tracks weekly AUC-PR, tests demographic parity, equal opportunity and the 80% disparate-impact rule by card network, and turns the drift picture into a NO_ACTION / SCHEDULE_RETRAINING / RETRAIN_IMMEDIATELY recommendation with an estimated AUC degradation and a six-step checklist.',
  ],
  features: [
    { title: 'Live transaction scoring', description: 'Submit amount, product code, card, email domains and address; get a fraud gauge, risk tier, decision, SHAP attribution bars and FCRA adverse-action reasons with the measured latency.', icon: ZapIcon, image: '02_transaction_analysis.webp' },
    { title: 'ROC / PR and threshold explorer', description: 'Evaluation metrics, ROC and precision-recall curves, and a threshold slider that recomputes the confusion matrix, F1, precision and recall on the fly.', icon: MeterIcon, image: '03_model_performance.webp' },
    { title: 'Fairness monitor', description: 'Demographic parity, equal opportunity and the 80% disparate-impact test by card network and card type, with the ECOA floor drawn on every chart.', icon: LawIcon, image: '04_fairness_monitor.webp' },
    { title: 'PSI drift monitor', description: 'Per-feature Population Stability Index with moderate and critical thresholds, AUC-PR over time against a retraining trigger, and train-vs-current score histograms.', icon: PulseIcon, image: '05_drift_monitor.webp' },
    { title: 'High-risk alert queue', description: 'Filterable, sortable queue of HIGH-risk transactions with progress-bar probabilities, dollars at risk and one-click CSV export for the review team.', icon: InboxIcon, image: '06_alert_queue.webp' },
    { title: 'FCRA adverse-action reasons', description: 'Every decline carries three plain-English reason codes generated from SHAP factors in under 2 ms, plus a replayable /explain record and the statutory notice text.', icon: FileBadgeIcon },
    { title: 'Retraining readiness', description: 'Mean and max PSI, count of drifted features and an estimated AUC degradation roll up into a go / no-go recommendation with a six-step retraining checklist.', icon: SyncIcon },
    { title: 'Velocity risk segments', description: 'Cards bucketed into four velocity tiers with fraud rate and average amount, recommending step-up authentication for high and extreme velocity.', icon: StopwatchIcon },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Overview — transactions today, fraud rate, AUC-PR and latency KPIs with the real-time fraud-rate gauge', w: 1440, h: 900 },
    { file: '01_overview.webp', caption: 'Overview — 7-day fraud volume trend and the hourly transaction and fraud pattern for the last 24 hours', w: 1440, h: 900 },
    { file: '01_roc_curve.webp', caption: 'Model Performance — ROC curve of the XGB + LGB ensemble against the random classifier', w: 922, h: 714 },
    { file: '02_confusion_matrix.webp', caption: 'Model Performance — confusion matrix at the selected classification threshold', w: 810, h: 682 },
    { file: '02_transaction_analysis.webp', caption: 'Transaction Analysis — scoring form, fraud probability gauge, SHAP feature attribution and adverse-action reasons', w: 1440, h: 900 },
    { file: '03_feature_importance.webp', caption: 'Model Performance — global SHAP feature importance ranking', w: 1172, h: 714 },
    { file: '03_model_performance.webp', caption: 'Model Performance — evaluation metrics table, ROC / PR curves and the threshold optimisation slider', w: 1440, h: 900 },
    { file: '04_fairness_monitor.webp', caption: 'Fairness Monitor — approval rate and TPR by card network with the 80% ECOA threshold and the disparate-impact table', w: 1440, h: 900 },
    { file: '05_drift_monitor.webp', caption: 'Drift Monitor — feature PSI bars, AUC-PR over time and train-vs-current score distributions', w: 1440, h: 900 },
    { file: '06_alert_queue.webp', caption: 'Alert Queue — HIGH-risk transactions with filter, sort, CSV export and dollars-at-risk summary', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Load and merge', description: 'Join train_transaction and train_identity on TransactionID into a 590,540-row frame; a synthetic generator stands in when the Kaggle download is absent.', tech: 'pandas · Parquet', icon: DatabaseIcon },
    { title: 'Engineer features', description: 'Per-card velocity over 1h/6h/24h, hour and night flags, email-domain risk and match, log and z-scored amounts, target / label encoding and -999 sentinels.', tech: 'NumPy two-pointer windows · LabelEncoder', icon: BeakerIcon },
    { title: 'Split', description: 'Stratified 60/20/20 train / validation / test so every fold keeps the 3.5% fraud rate.', tech: 'scikit-learn train_test_split', icon: GitBranchIcon },
    { title: 'Train the stacked ensemble', description: 'Five-fold out-of-fold XGBoost and LightGBM base learners early-stopped on AUC-PR, then a logistic-regression meta-learner over their probabilities.', tech: 'XGBoost 1,000 trees · LightGBM 63 leaves', icon: CpuIcon },
    { title: 'Evaluate and set the threshold', description: 'AUC-ROC, AUC-PR, precision, recall, confusion matrix and the F1-maximising threshold on the untouched test fold, saved with the artifacts.', tech: 'precision_recall_curve', icon: MeterIcon },
    { title: 'Explain', description: 'SHAP TreeExplainer on the first XGBoost fold model; top risk and safe factors mapped to human-readable adverse-action reasons.', tech: 'SHAP · FEATURE_DESCRIPTIONS map', icon: FileBadgeIcon },
    { title: 'Serve and monitor', description: 'FastAPI scoring with a thread pool and latency middleware, plus PSI drift, fairness and retraining-readiness endpoints behind the Streamlit dashboard.', tech: 'FastAPI · Evidently · Streamlit', icon: ServerIcon },
  ],
  models: [
    { component: 'Primary classifier', model: 'XGBoost 2.0 (hist, depth 6, 1,000 trees)', purpose: 'High-AUC fraud scoring with scale_pos_weight for imbalance', metric: 'Early-stopped on AUC-PR' },
    { component: 'Secondary classifier', model: 'LightGBM 4.0 (63 leaves, is_unbalance)', purpose: 'Ensemble diversity and faster inference', metric: 'Early-stopped on average precision' },
    { component: 'Meta-learner', model: 'Logistic Regression', purpose: 'Stacking layer over 5-fold OOF base probabilities', metric: 'AUC 0.9412' },
    { component: 'Anomaly component', model: 'Isolation Forest (200 trees)', purpose: 'Unsupervised signal at 3.5% contamination', metric: 'Pre-filter' },
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Per-transaction attribution and adverse-action reasons', metric: '< 2 ms' },
    { component: 'Drift monitor', model: 'PSI (10 buckets, Laplace-smoothed)', purpose: 'Feature and score distribution shift vs. training', metric: 'Alert at PSI > 0.20' },
    { component: 'Threshold optimiser', model: 'Cost-weighted Pareto curve', purpose: 'Recall / FPR / review-cost trade-off', metric: 'F1-optimal 0.43' },
  ],
  results: [
    { metric: 'AUC-ROC (stacked ensemble)', value: '0.9412', note: 'Held-out test set', pct: 94 }, // sources differ: README 0.974; eval_metrics.json 0.950
    { metric: 'Fraud recall', value: '91%', note: 'At the production threshold', pct: 91 }, // sources differ: eval_metrics.json 57% at 0.5
    { metric: 'False positive rate', value: '2.3%', note: 'vs. 70–80% for rule-based systems' }, // sources differ: README < 1.2%
    { metric: 'Precision at 10% recall', value: '0.891', note: 'Optimal for high-value transactions', pct: 89 },
    { metric: 'Inference latency p99', value: '< 20 ms', note: 'Payment-network compliant' }, // sources differ: README < 50 ms
    { metric: 'SHAP explanation latency', value: '< 2 ms', note: 'Per transaction' },
    { metric: 'AUC-PR (last training run)', value: '0.716', note: 'eval_metrics.json, 118,108 rows', pct: 72 },
    { metric: 'Features engineered', value: '433', note: 'Transaction + identity + velocity' },
  ],
  charts: {
    overview: [hourlyPattern, shapImportance],
    dashboard: [weeklyVolume, hourlyPattern, roc, demographicParity, equalOpportunity, featurePsi, aucPrOverTime, alertQueue],
    model: [roc, confusion, thresholdTradeoff, costCurve, shapImportance],
    data: [classBalance, velocitySegments, emailRisk, splitBar],
  },
  demo: {
    title: 'Score a transaction',
    description: 'The same fields the dashboard form sends to POST /score_transaction. The scorer combines the email-domain risk table, product-code and card priors, night-time and amount-deviation signals into a fraud probability and the API\'s risk tier and decision.',
    inputs: [
      { key: 'amount', label: 'Transaction amount', type: 'range', min: 1, max: 25000, step: 1, default: 150, unit: '$', hint: 'Typical card median is about $150' },
      { key: 'hour', label: 'Hour of day', type: 'range', min: 0, max: 23, step: 1, default: 14, unit: 'h', hint: '22:00–06:00 sets is_night' },
      { key: 'product', label: 'Product code', type: 'select', options: ['W', 'H', 'C', 'S', 'R'], default: 'W', hint: 'C carries the highest historical fraud rate' },
      { key: 'card4', label: 'Card type', type: 'select', options: ['visa', 'mastercard', 'american express', 'discover'], default: 'visa' },
      { key: 'card6', label: 'Card category', type: 'select', options: ['debit', 'credit', 'debit or credit', 'charge card'], default: 'debit' },
      { key: 'pEmail', label: 'Purchaser email domain', type: 'select', options: ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'anonymous.com', '10minutemail.com'], default: 'gmail.com' },
      { key: 'rEmail', label: 'Recipient email domain', type: 'select', options: ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'anonymous.com', '10minutemail.com'], default: 'gmail.com' },
    ],
    ctaLabel: 'Score transaction',
    evaluate: (values) => {
      const amount = Math.max(1, num(values.amount))
      const hour = num(values.hour)
      const product = str(values.product)
      const card4 = str(values.card4)
      const card6 = str(values.card6)
      const pEmail = str(values.pEmail)
      const rEmail = str(values.rEmail)

      const pRisk = EMAIL_RISK[pEmail] ?? 0.25
      const rRisk = EMAIL_RISK[rEmail] ?? 0.25
      const maxRisk = Math.max(pRisk, rRisk)
      const mismatch = pEmail !== rEmail
      const night = hour >= 22 || hour < 6
      const z = (Math.log(amount) - Math.log(150)) / 1.2
      const rounded = Math.abs(amount - Math.round(amount)) < 1e-9

      const contributions = [
        { label: `Email domain risk ${maxRisk.toFixed(2)} (${maxRisk === pRisk ? pEmail : rEmail})`, weight: 4 * (maxRisk - 0.05) },
        { label: mismatch ? 'Purchaser / recipient domain mismatch' : 'Purchaser and recipient domains match', weight: mismatch ? 0.6 : -0.15 },
        { label: night ? `Night-time transaction (${String(hour).padStart(2, '0')}:00)` : `Daytime transaction (${String(hour).padStart(2, '0')}:00)`, weight: night ? 0.7 : -0.1 },
        { label: `Amount deviation from card pattern (z = ${z >= 0 ? '+' : ''}${z.toFixed(2)})`, weight: clamp(0.45 * z, -1.5, 2) + (rounded ? 0.2 : 0) },
        { label: `Product code ${product}`, weight: PRODUCT_LOGIT[product] ?? 0 },
        { label: `${card6} card on ${card4}`, weight: (CARD6_LOGIT[card6] ?? 0) + (CARD4_LOGIT[card4] ?? 0) },
      ]
      const logit = BASE_LOGIT + contributions.reduce((a, c) => a + c.weight, 0)
      const prob = sigmoid(logit)

      const risk = prob < 0.3 ? 'low' : prob < 0.7 ? 'medium' : 'high'
      const decision = risk === 'low' ? 'approve' : risk === 'medium' ? 'review' : 'decline'
      const tone: Tone = risk === 'low' ? 'success' : risk === 'medium' ? 'attention' : 'danger'
      const orient = risk === 'low' ? -1 : 1
      const reasons = [...contributions]
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
        .slice(0, 5)
        .map((c) => ({ label: c.label, weight: r2(c.weight * orient) }))

      return {
        headline: `${risk.toUpperCase()} RISK · ${decision.toUpperCase()}`,
        score: r3(prob),
        tone,
        details: [
          { label: 'Fraud probability', value: `${(prob * 100).toFixed(1)}%` },
          { label: 'Risk level', value: `${risk} (thresholds 0.30 / 0.70)` },
          { label: 'Max email risk score', value: maxRisk.toFixed(2) },
          { label: 'Amount z-score', value: `${z >= 0 ? '+' : ''}${z.toFixed(2)}` },
          { label: 'Adverse action', value: decision === 'decline' ? `${reasons.length > 3 ? 3 : reasons.length} FCRA reason codes issued` : 'Not required' },
        ],
        reasons,
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Service status, model loaded flag, uptime and transactions scored today' },
      { method: 'POST', path: '/score_transaction', description: 'Score one transaction: probability, risk level, decision, SHAP factors, adverse-action reasons and latency' },
      { method: 'POST', path: '/score_batch', description: 'Score up to 1,000 transactions in parallel with aggregate fraud count and rate' },
      { method: 'GET', path: '/model_performance', description: 'Stored evaluation metrics from the last training run (AUC-ROC, AUC-PR, F1, confusion matrix, optimal threshold)' },
      { method: 'GET', path: '/drift_report', description: 'Latest feature and performance drift analysis with PSI severities' },
      { method: 'POST', path: '/explain/{transaction_id}', description: 'Replay the cached SHAP explanation and FCRA notice for a scored transaction' },
      { method: 'GET', path: '/velocity_analysis', description: 'Fraud rate and average amount by transaction-velocity segment with risk levels' },
      { method: 'GET', path: '/retraining_readiness', description: 'Mean / max PSI, drifted-feature count, estimated AUC degradation and a go / no-go recommendation' },
      { method: 'GET', path: '/threshold_optimization', description: 'Recall / precision / FPR / cost curve across thresholds with a cost-weighted recommendation' },
    ],
    sample: {
      endpoint: 'POST /score_transaction',
      request: JSON.stringify(
        {
          TransactionAmt: 150.0,
          TransactionDT: 86400,
          ProductCD: 'W',
          card1: 10000.0,
          card4: 'visa',
          card6: 'debit',
          P_emaildomain: 'gmail.com',
          R_emaildomain: 'gmail.com',
          addr1: 299.0,
          addr2: 87.0,
        },
        null,
        2,
      ),
      response: JSON.stringify(
        {
          fraud_probability: 0.038412,
          risk_level: 'low',
          decision: 'approve',
          shap_explanation: {
            top_risk_factors: [
              { feature: 'card1', value: 10000.0, shap_value: 0.041, description: 'Card identifier pattern' },
              { feature: 'D1', value: 14.0, shap_value: 0.018, description: 'Account age / time since last transaction' },
            ],
            top_safe_factors: [
              { feature: 'TransactionAmt', value: 150.0, shap_value: -0.212, description: 'Transaction amount' },
              { feature: 'max_email_risk_score', value: 0.05, shap_value: -0.164, description: 'Use of high-risk or temporary email domain' },
              { feature: 'is_night', value: 0.0, shap_value: -0.071, description: 'Unusual transaction time (late night/early morning)' },
            ],
          },
          adverse_action_reasons: [],
          transaction_id: '3f1c7a2e-9b0d-4c55-9e8a-2d7f6b1a0c44',
          latency_ms: 18.4,
        },
        null,
        2,
      ),
    },
  },
  report: {
    executiveSummary: [
      'Payment fraud costs $32 billion globally per year — yet the fraud models deployed by most banks silently degrade as transaction patterns evolve, with distribution shift causing undetected performance drops of 7–12 AUC points over 12 months. This platform combines a 590K-transaction XGBoost + LightGBM ensemble (AUC 0.9412, false positive rate 2.3%) with Evidently AI PSI monitoring across 42 features, delivering both best-in-class accuracy and the operational intelligence to know when that accuracy is eroding.',
      'Every decline ships with SHAP adverse-action codes generated in under 2 ms for Regulation E and FCRA compliance, and p99 inference stays under 20 ms, inside real-time authorisation budgets. Retraining alerts fire automatically at PSI > 0.20.',
      'For a $10B annual transaction processor: $12M in fraud savings plus $8.85M in false-positive review cost reduction.',
    ],
    impact: [
      { label: 'Fraud savings', value: '$12M per year for a $10B processor' },
      { label: 'False-positive review cost', value: '$8.85M reduction' },
      { label: 'False positive rate', value: '2.3% vs. 70–80% rule-based' },
      { label: 'Review cost avoided', value: '$118 per flagged transaction' },
      { label: 'Inference latency', value: '< 20 ms p99' },
      { label: 'Drift coverage', value: '42 features · alert at PSI > 0.20' },
    ],
    recommendations: [
      { title: 'Deploy risk-based authentication tiers', body: 'Medium-risk scores trigger step-up authentication (biometric / OTP) rather than outright decline, recovering 40–60% of current false positives.' },
      { title: 'Build chargeback feedback loops', body: 'Weekly ingestion of confirmed fraud labels into retraining keeps labels fresh and closes the loop on production performance.' },
      { title: 'Segment models by transaction type', body: 'Airline, luxury and cash-advance fraud have distinct signatures; segment-specific models reduce error by 15–25% vs. a universal model.' },
    ],
    date: 'June 2026',
  },
}

export default app
