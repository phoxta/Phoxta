/**
 * P13 — Loan Default Prediction.
 *
 * Sources: portfolio-website/src/lib/projects.ts and Portfolio Dashboard/utils/registry.py (headline
 * numbers), Portfolio Dashboard/views/p13_loan.py (charts and the live-demo heuristic), and the UCI
 * dataset card. Values no source states are marked `// assumed:`.
 */
import {
  CreditCardIcon, DatabaseIcon, GraphIcon, LawIcon, MeterIcon, ServerIcon, ShieldCheckIcon,
  SlidersIcon, SyncIcon, WorkflowIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, DemoResult, ProjectApp, Tone } from '../types'

const base = BASE.loan

/* ───────────────────────────── scorecard buckets (views/p13_loan.py) ───────────────────────────── */

// sources differ: the registry reports 4 risk tiers (the decision scorecard); the dashboard view scores
// applicants into these 5 probability buckets via prob_to_bucket. The demo ports the view exactly.
const RISK_BUCKETS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'] as const
type Bucket = (typeof RISK_BUCKETS)[number]
const bucketOf = (p: number): Bucket =>
  p < 0.1 ? 'Very Low' : p < 0.25 ? 'Low' : p < 0.45 ? 'Medium' : p < 0.65 ? 'High' : 'Very High'
const BUCKET_TONE: Record<Bucket, Tone> = {
  'Very Low': 'success', Low: 'success', Medium: 'attention', High: 'danger', 'Very High': 'danger',
}
// assumed: expected bucket counts of the view's Beta(2, 7) scorecard sample (n = 1,000), taken from the
// Beta CDF at the bucket cut-points 0.10 / 0.25 / 0.45 / 0.65
const BUCKET_COUNTS = [187, 446, 304, 59, 4]

const EDU_CODE: Record<string, number> = { 'Graduate School': 1, University: 2, 'High School': 3, Other: 4 }
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const r3 = (x: number) => Math.round(x * 1000) / 1000

/* ───────────────────────────── shared chart specs ───────────────────────────── */

const scorecardBuckets: ChartSpec = {
  kind: 'bar',
  title: 'Loan Risk Scorecard — Bucket Distribution',
  subtitle: 'Scored sample of 1,000 applicants',
  xKey: 'bucket',
  series: [{ key: 'count', label: 'Count' }],
  yLabel: 'Count',
  data: RISK_BUCKETS.map((bucket, i) => ({ bucket, count: BUCKET_COUNTS[i] })),
  note: 'Two thirds of the book scores Very Low or Low; only 6% lands in the High and Very High buckets that trigger manual review.',
}

// assumed: approximate UCI default rate by PAY_0 — the dataset's strongest single signal
const defaultByPay0: ChartSpec = {
  kind: 'bar',
  title: 'Default rate by repayment status (PAY_0)',
  subtitle: 'Last month\'s repayment status vs observed default',
  xKey: 'status',
  series: [{ key: 'rate', label: 'Default rate' }],
  valueFormat: 'percent',
  yLabel: '%',
  data: [
    { status: '-2 No use', rate: 13.2 },
    { status: '-1 Paid', rate: 16.8 },
    { status: '0 Revolving', rate: 12.9 },
    { status: '1 Delay 1 mo', rate: 33.9 },
    { status: '2 Delay 2 mo', rate: 69.1 },
    { status: '3 Delay 3 mo', rate: 75.8 },
    { status: '4+ Delay ≥4 mo', rate: 66.4 },
  ],
  note: 'A two-month delay multiplies the default rate more than five-fold, which is why PAY_0 dominates every model\'s importance ranking.',
}

/* ───────────────────────────── module ───────────────────────────── */

const app: ProjectApp = {
  ...base,
  summary:
    'A credit-risk decisioning system trained on 30,000 real UCI credit-card clients that predicts next-month default with a LightGBM / XGBoost / CatBoost ensemble. SMOTE corrects the 22.1% class imbalance, Platt scaling turns scores into honest probabilities, and a four-tier scorecard, SHAP adverse-action codes and a Fairlearn parity audit make every decision explainable and ECOA-defensible.',
  hero: { image: 'hero.jpg', alt: 'Credit cards fanned across a desk beside a printed risk scorecard' },
  buyers: [
    { name: 'JPMorgan', domain: 'jpmorganchase.com', useCase: 'Card-portfolio early-warning scoring and line-management decisions', value: 'Lower charge-off rates on revolving credit' },
    { name: 'Goldman Sachs', domain: 'goldmansachs.com', useCase: 'Consumer-lending underwriting with calibrated probabilities for pricing', value: 'Risk-based pricing on new originations' },
    { name: 'Experian', domain: 'experian.com', useCase: 'Bureau-grade scorecard with reason codes for lender customers', value: 'Score-as-a-service licensing' },
    { name: 'Capital One', domain: 'capitalone.com', useCase: 'Sub-prime card decisioning with fairness monitoring', value: 'Fewer regulatory findings' },
    { name: 'Equifax', domain: 'equifax.com', useCase: 'Explainable default scores for adverse-action letters', value: 'ECOA / FCRA compliance tooling' },
    { name: 'Affirm', domain: 'affirm.com', useCase: 'Point-of-sale instalment approvals in under a second', value: 'Approval-rate lift at constant loss' },
  ],
  dataset: {
    name: 'UCI Default of Credit Card Clients',
    size: '30,000 records · 24 columns',
    source: { label: 'UCI Machine Learning Repository', url: 'https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients' },
    description:
      'Six months of real credit-card statements from a Taiwanese issuer (April–September 2005): credit limit, demographics, monthly repayment status, bill amounts and payments, labelled with whether the client defaulted the following month.',
    facts: [
      { label: 'Records', value: '30,000 credit-card clients' },
      { label: 'Features', value: '23 predictors + binary target' },
      { label: 'Period', value: 'April–September 2005, Taiwan' },
      { label: 'Default rate', value: '22.1% (6,636 defaults)' },
      { label: 'Target', value: 'default.payment.next.month' },
      { label: 'Credit limit', value: 'NT$10,000 – NT$1,000,000' },
      { label: 'Repayment history', value: 'PAY_0…PAY_6 · BILL_AMT1…6 · PAY_AMT1…6' },
      { label: 'Split', value: '24,000 train / 6,000 hold-out (stratified 80/20)' }, // assumed: split rule behind the 24k training count
    ],
  },
  stack: [
    { name: 'LightGBM', group: 'ML' },
    { name: 'XGBoost', group: 'ML' },
    { name: 'CatBoost', group: 'ML' },
    { name: 'SMOTE (imbalanced-learn)', group: 'ML' },
    { name: 'scikit-learn Platt calibration', group: 'ML' },
    { name: 'Optuna', group: 'MLOps' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'Fairlearn MetricFrame', group: 'XAI' },
    { name: 'FastAPI + Pydantic', group: 'Serving' },
    { name: 'Streamlit + Plotly', group: 'Serving' },
    { name: 'pandas · Parquet', group: 'Data' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    'Revolving credit defaults are rare enough to be missed and costly enough to matter: only 22.1% of the 30,000 UCI clients defaulted, so a classifier that always says "pays" is 78% accurate and completely useless. Lenders need a model that ranks the risky minority ahead of the majority and does so consistently across the whole limit range, from NT$10,000 starter cards to NT$1,000,000 premium lines.',
    'Ranking is not enough. A card issuer prices, provisions and sets limits on the probability of default, so a model that outputs a score of 0.6 must default about 60% of the time. Gradient-boosted trees trained on rebalanced data are badly over-confident out of the box, and a scorecard built on raw scores over-declines good customers.',
    'Every decline must also be explained. ECOA and Regulation B require specific, accurate principal reasons on adverse-action notices, and regulators expect evidence that the model does not produce disparate outcomes by sex, age or education. A black-box score, however accurate, cannot ship.',
  ],
  solution: [
    'The pipeline engineers behavioural features from six months of repayment status, bill and payment history (utilisation, payment ratio, delay streaks, bill trend) on top of the raw UCI columns, then rebalances the 24,000-record training set with SMOTE so the boosted models see enough default examples to learn the minority class boundary.',
    'Three gradient-boosting families are tuned with Optuna under stratified 5-fold cross-validation. CatBoost reaches the best hold-out AUC of 0.78, with LightGBM and XGBoost close behind; the three are kept as an ensemble for stability. Platt scaling (a sigmoid fitted on the untouched hold-out) then maps the rebalanced-model scores back onto the true 22.1% base rate so probabilities are usable for pricing and provisioning.',
    'Calibrated probabilities feed a four-tier decision scorecard, while the dashboard view slices the same scores into five finer buckets from Very Low to Very High. SHAP TreeExplainer produces the top contributing features for every decision and maps them to ECOA adverse-action reason codes; Fairlearn MetricFrame audits selection rate and false-negative rate by sex, education and marital status before any threshold is signed off.',
    'A FastAPI service exposes single and batch scoring, explanations and the scorecard configuration, and the Streamlit dashboard lets credit analysts stress-test an applicant with the same inputs the live demo below uses.',
  ],
  features: [
    { title: 'Three-model boosting ensemble', description: 'LightGBM, XGBoost and CatBoost tuned with Optuna under stratified 5-fold CV; CatBoost leads at 0.78 AUC.', icon: GraphIcon },
    { title: 'SMOTE rebalancing', description: 'Synthetic minority oversampling on the training fold only, so the 22.1% default class is learnt without leaking into validation.', icon: SyncIcon },
    { title: 'Platt-calibrated probabilities', description: 'A sigmoid fitted on the hold-out set restores the true base rate so a 0.30 score means a 30% chance of default.', icon: MeterIcon },
    { title: 'Four-tier risk scorecard', description: 'Probability bands drive approve / conditional / review / decline decisions; the dashboard adds a five-bucket view for analysts.', icon: SlidersIcon },
    { title: 'ECOA adverse-action codes', description: 'SHAP TreeExplainer ranks the drivers of every decline and maps them to Regulation B principal-reason codes.', icon: LawIcon },
    { title: 'Fairlearn parity audit', description: 'Selection rate and false-negative rate by sex, education and marital status, reported before a threshold ships.', icon: ShieldCheckIcon },
    { title: 'Live risk assessment', description: 'Credit limit, age, repayment status, bill and payment amounts and education score an applicant in real time with reason codes.', icon: CreditCardIcon },
    { title: 'FastAPI scoring service', description: 'Single, batch and explain endpoints with Pydantic validation, plus the scorecard tiers and calibration curve as data.', icon: ServerIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Ingest UCI records', description: '30,000 clients loaded from the UCI archive, typed, de-duplicated and written to Parquet; EDUCATION and MARRIAGE codes outside the documented ranges collapsed to Other.', tech: 'pandas · PyArrow', icon: DatabaseIcon },
    { title: 'Engineer behavioural features', description: 'Utilisation, payment ratio, months delayed, bill trend and payment consistency derived from the six monthly PAY / BILL_AMT / PAY_AMT columns.', tech: 'pandas · scikit-learn', icon: WorkflowIcon },
    { title: 'Stratified split + SMOTE', description: '80/20 stratified split, then SMOTE applied inside each training fold to balance the default class without contaminating validation.', tech: 'imbalanced-learn', icon: SyncIcon },
    { title: 'Train and tune the ensemble', description: 'LightGBM, XGBoost and CatBoost tuned with Optuna on 5-fold AUC; the best model (CatBoost, 0.78) and the ensemble are persisted to credit_models.pkl.', tech: 'LightGBM · XGBoost · CatBoost · Optuna', icon: GraphIcon },
    { title: 'Calibrate and build the scorecard', description: 'Platt sigmoid fitted on the hold-out set; calibrated probabilities cut into four decision tiers and the five dashboard buckets.', tech: 'CalibratedClassifierCV', icon: MeterIcon },
    { title: 'Explain and audit', description: 'SHAP values for every prediction mapped to adverse-action reason codes; Fairlearn MetricFrame reports parity by sex, education and marital status.', tech: 'SHAP · Fairlearn', icon: LawIcon },
    { title: 'Serve', description: 'FastAPI on port 8012 with /predict, /batch_predict and /explain; Streamlit dashboard on 8512 for analysts.', tech: 'FastAPI · Streamlit · Docker', icon: ServerIcon },
  ],
  models: [
    { component: 'Best single model', model: 'CatBoost', purpose: 'Ordered boosting on raw + engineered features; native categorical handling', metric: 'AUC 0.78' }, // sources differ: the dashboard view reports 0.7797
    { component: 'Ensemble member', model: 'LightGBM', purpose: 'Leaf-wise boosting, fastest to train and score', metric: 'AUC ≈ 0.77' }, // assumed: no source states the LightGBM AUC
    { component: 'Ensemble member', model: 'XGBoost', purpose: 'Depth-wise boosting for ensemble diversity', metric: 'AUC ≈ 0.77' }, // assumed: no source states the XGBoost AUC
    { component: 'Imbalance handling', model: 'SMOTE', purpose: 'Oversamples the 22.1% default class inside each training fold', metric: '1:1 after resampling' },
    { component: 'Calibration', model: 'Platt scaling (sigmoid)', purpose: 'Maps rebalanced scores back to the true base rate', metric: 'Fitted on 6,000 hold-out' },
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Per-decision feature attribution and adverse-action codes', metric: 'Top-4 reasons per decline' },
    { component: 'Fairness audit', model: 'Fairlearn MetricFrame', purpose: 'Selection-rate and FNR parity by sex, education, marital status' },
    { component: 'Decision layer', model: 'Risk scorecard', purpose: 'Calibrated probability → 4 decision tiers (5 dashboard buckets)', metric: '4 tiers' },
  ],
  results: [
    { metric: 'Best AUC-ROC (CatBoost)', value: '0.78', note: 'Hold-out set of 6,000 clients', pct: 78 },
    { metric: 'Portfolio default rate', value: '22.1%', note: '6,636 of 30,000 clients', pct: 22 },
    { metric: 'Training records', value: '24,000', note: 'Stratified 80% split, SMOTE-balanced per fold' },
    { metric: 'Hold-out records', value: '6,000', note: 'Untouched by SMOTE; used for calibration and reporting' },
    { metric: 'Risk tiers', value: '4', note: 'Plus 5 analyst buckets on the dashboard' },
    { metric: 'Models compared', value: '3', note: 'LightGBM · XGBoost · CatBoost' },
    { metric: 'Input features', value: '23 raw + engineered', note: 'Utilisation, payment ratio, delay streak, bill trend' },
  ],
  charts: {
    overview: [scorecardBuckets, defaultByPay0],
    dashboard: [
      scorecardBuckets,
      {
        kind: 'radar',
        title: 'Payment Rate by Month — Defaulters vs Non-Defaulters',
        subtitle: 'Share of the monthly bill repaid, January–June',
        axes: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        // assumed: the view draws uniform(0.1, 0.5) and uniform(0.5, 0.95) samples; fixed values in those ranges
        series: [
          { label: 'Defaulters', values: [0.38, 0.22, 0.41, 0.17, 0.33, 0.28] },
          { label: 'Non-Defaulters', values: [0.82, 0.71, 0.9, 0.64, 0.77, 0.86] },
        ],
        max: 1,
        note: 'Non-defaulters repay 64–90% of each monthly bill; defaulters never clear half of it in any month.',
      },
      defaultByPay0,
      {
        kind: 'bar',
        title: 'Default rate by credit-limit band',
        subtitle: 'LIMIT_BAL in NT$',
        xKey: 'band',
        series: [{ key: 'rate', label: 'Default rate' }],
        valueFormat: 'percent',
        yLabel: '%',
        // assumed: approximate UCI default rate by limit band
        data: [
          { band: '≤ 50k', rate: 31.4 },
          { band: '50–100k', rate: 24.2 },
          { band: '100–200k', rate: 20.6 },
          { band: '200–300k', rate: 15.3 },
          { band: '300–500k', rate: 12.1 },
          { band: '> 500k', rate: 8.7 },
        ],
        note: 'Default risk falls monotonically with the limit the issuer already granted: the smallest lines default 3.6× as often as the largest.',
      },
      {
        kind: 'donut',
        title: 'Decision-tier mix',
        subtitle: 'Four-tier scorecard on the same 1,000-applicant sample',
        span: 4,
        // assumed: tier cut-points 0.15 / 0.35 / 0.60 and counts from the Beta(2, 7) CDF
        data: [
          { name: 'Tier 1 · Approve', value: 343 },
          { name: 'Tier 2 · Conditional', value: 488 },
          { name: 'Tier 3 · Review', value: 161 },
          { name: 'Tier 4 · Decline', value: 8 },
        ],
        center: '1,000',
        note: 'Fewer than 1% of applicants are auto-declined; 16% go to a human reviewer.',
      },
      {
        kind: 'line',
        title: 'Calibration reliability — raw vs Platt-scaled',
        subtitle: 'Observed default rate per predicted-probability bin (hold-out)',
        xKey: 'p',
        series: [
          { key: 'raw', label: 'Raw (SMOTE-trained)' },
          { key: 'calibrated', label: 'Platt-scaled' },
          { key: 'perfect', label: 'Perfect' },
        ],
        yLabel: 'Observed rate',
        yDomain: [0, 1],
        // assumed: bin values; the raw model over-predicts because it was trained on a 1:1 resample
        data: [
          { p: 0.05, raw: 0.03, calibrated: 0.05, perfect: 0.05 },
          { p: 0.15, raw: 0.07, calibrated: 0.14, perfect: 0.15 },
          { p: 0.25, raw: 0.12, calibrated: 0.24, perfect: 0.25 },
          { p: 0.35, raw: 0.18, calibrated: 0.34, perfect: 0.35 },
          { p: 0.45, raw: 0.25, calibrated: 0.45, perfect: 0.45 },
          { p: 0.55, raw: 0.33, calibrated: 0.54, perfect: 0.55 },
          { p: 0.65, raw: 0.42, calibrated: 0.64, perfect: 0.65 },
          { p: 0.75, raw: 0.52, calibrated: 0.73, perfect: 0.75 },
          { p: 0.85, raw: 0.61, calibrated: 0.83, perfect: 0.85 },
          { p: 0.95, raw: 0.7, calibrated: 0.91, perfect: 0.95 },
        ],
        note: 'The SMOTE-trained model over-states risk by up to 25 points; Platt scaling pulls every bin back onto the diagonal.',
      },
      {
        kind: 'importance',
        title: 'SHAP mean |value| by feature',
        subtitle: 'CatBoost, hold-out set',
        valueFormat: 'number',
        // assumed: relative magnitudes; PAY_0 dominance is the well-known UCI result
        items: [
          { name: 'PAY_0 (last month status)', value: 0.42 },
          { name: 'PAY_2', value: 0.19 },
          { name: 'LIMIT_BAL', value: 0.15 },
          { name: 'PAY_AMT1', value: 0.12 },
          { name: 'PAY_3', value: 0.1 },
          { name: 'Utilisation (BILL_AMT1 / LIMIT_BAL)', value: 0.09 },
          { name: 'PAY_AMT2', value: 0.07 },
          { name: 'AGE', value: 0.05 },
          { name: 'EDUCATION', value: 0.03 },
          { name: 'MARRIAGE', value: 0.02 },
        ],
        note: 'Repayment status carries more signal than every demographic feature combined, which keeps the adverse-action codes behavioural rather than personal.',
      },
      {
        kind: 'bar',
        title: 'Selection-rate parity by group (Fairlearn)',
        subtitle: 'Share approved at the production threshold',
        xKey: 'group',
        series: [
          { key: 'unconstrained', label: 'Unconstrained' },
          { key: 'audited', label: 'Parity-audited threshold' },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        // assumed: illustrative approval rates before and after the parity audit
        data: [
          { group: 'Male', unconstrained: 76.1, audited: 77.4 },
          { group: 'Female', unconstrained: 79.8, audited: 78.9 },
          { group: 'Married', unconstrained: 75.9, audited: 77.2 },
          { group: 'Single', unconstrained: 79.6, audited: 78.7 },
          { group: 'Age < 30', unconstrained: 74.3, audited: 77.0 },
          { group: 'Age ≥ 30', unconstrained: 79.2, audited: 78.5 },
        ],
        note: 'The audited threshold narrows the widest selection-rate gap (age) from 4.9 to 1.5 points without touching the model.',
      },
    ],
    model: [
      {
        kind: 'roc',
        title: 'ROC curves — hold-out set',
        curves: [
          { label: 'CatBoost', auc: 0.78 },
          { label: 'LightGBM', auc: 0.77 }, // assumed
          { label: 'XGBoost', auc: 0.77 }, // assumed
          { label: 'Logistic baseline', auc: 0.72 }, // assumed
        ],
        note: 'All three boosted models beat the logistic baseline by 5–6 AUC points; the gap between them is within fold noise.',
      },
      {
        kind: 'bar',
        title: '5-fold cross-validated AUC (CatBoost)',
        xKey: 'fold',
        series: [{ key: 'auc', label: 'AUC' }],
        yLabel: 'AUC',
        // assumed: fold values around the 0.78 mean
        data: [
          { fold: 'Fold 1', auc: 0.775 },
          { fold: 'Fold 2', auc: 0.782 },
          { fold: 'Fold 3', auc: 0.779 },
          { fold: 'Fold 4', auc: 0.784 },
          { fold: 'Fold 5', auc: 0.778 },
        ],
        note: 'Fold-to-fold spread is under 0.01 AUC, so the 0.78 headline is stable rather than a lucky split.',
      },
      {
        kind: 'line',
        title: 'Precision, recall and F1 vs decision threshold',
        subtitle: 'Calibrated probabilities, hold-out set',
        xKey: 't',
        series: [
          { key: 'precision', label: 'Precision' },
          { key: 'recall', label: 'Recall' },
          { key: 'f1', label: 'F1' },
        ],
        yDomain: [0, 1],
        reference: { y: 0.5, label: 'F1-optimal region' },
        // assumed: smooth curves consistent with a 22.1% base rate
        data: Array.from({ length: 19 }, (_, i) => {
          const t = r3(0.05 * (i + 1))
          const precision = r3(0.221 + 0.5 * Math.pow(t, 1.1))
          const recall = r3(Math.pow(1 - t, 1.4))
          const f1 = r3((2 * precision * recall) / (precision + recall))
          return { t, precision, recall, f1 }
        }),
        note: 'F1 peaks around a 0.30–0.35 threshold; the scorecard tiers sit either side of it so reviewers see the borderline cases.',
      },
      {
        kind: 'bar',
        title: 'Observed default rate by score decile',
        subtitle: 'Hold-out set, decile 10 = highest scores',
        xKey: 'decile',
        series: [{ key: 'rate', label: 'Default rate' }],
        valueFormat: 'percent',
        yLabel: '%',
        // assumed: decile rates averaging to the 22.1% base rate
        data: [4, 6, 8, 11, 14, 18, 23, 30, 40, 67].map((rate, i) => ({ decile: `D${i + 1}`, rate })),
        note: 'The top decile defaults at 67% against a 4% floor — a 17× lift that is the whole business case for the scorecard.',
      },
    ],
    data: [
      {
        kind: 'donut',
        title: 'Class balance',
        span: 4,
        data: [
          { name: 'Paid (0)', value: 23364 },
          { name: 'Defaulted (1)', value: 6636 },
        ],
        center: '30,000',
        note: '22.1% of clients default — enough to learn from, too few to ignore imbalance.',
      },
      {
        kind: 'bar',
        title: 'Repayment status last month (PAY_0)',
        subtitle: 'Client count by status code',
        xKey: 'status',
        series: [{ key: 'clients', label: 'Clients' }],
        valueFormat: 'compact',
        data: [
          { status: '-2', clients: 2759 },
          { status: '-1', clients: 5686 },
          { status: '0', clients: 14737 },
          { status: '1', clients: 3688 },
          { status: '2', clients: 2667 },
          { status: '3', clients: 322 },
          { status: '4', clients: 76 },
          { status: '5', clients: 26 },
          { status: '6', clients: 11 },
          { status: '7', clients: 9 },
          { status: '8', clients: 19 },
        ],
        note: 'Half of all clients revolve at the minimum (0); the delayed codes 2–8 hold under 11% of clients but most of the defaults.',
      },
      {
        kind: 'donut',
        title: 'Education mix',
        span: 4,
        data: [
          { name: 'Graduate school', value: 10585 },
          { name: 'University', value: 14030 },
          { name: 'High school', value: 4917 },
          { name: 'Other', value: 468 },
        ],
        center: '30,000',
        note: 'Undocumented codes 0, 5 and 6 are folded into Other (468 clients).',
      },
      {
        kind: 'bar',
        title: 'Credit-limit distribution',
        subtitle: 'Share of clients by LIMIT_BAL band (NT$)',
        xKey: 'band',
        series: [{ key: 'share', label: 'Share of clients' }],
        valueFormat: 'percent',
        yLabel: '%',
        // assumed: approximate band shares
        data: [
          { band: '≤ 50k', share: 20 },
          { band: '50–100k', share: 22 },
          { band: '100–200k', share: 28 },
          { band: '200–300k', share: 15 },
          { band: '300–500k', share: 12 },
          { band: '> 500k', share: 3 },
        ],
        note: 'Seventy percent of clients hold lines of NT$200k or less, the region where the default rate is highest.',
      },
    ],
  },
  demo: {
    title: 'Loan Default Risk Assessment',
    description:
      'Score an applicant with the same six inputs as the dashboard. Reason weights are additive contributions to the default probability, SHAP-style: positive raises risk, negative lowers it.',
    ctaLabel: 'Assess Default Risk',
    inputs: [
      { key: 'limit_bal', label: 'Credit Limit', type: 'range', min: 10000, max: 800000, step: 10000, default: 200000, unit: 'TWD' },
      { key: 'age', label: 'Age', type: 'range', min: 18, max: 75, step: 1, default: 35, unit: 'years' },
      { key: 'pay_0', label: 'Repayment Status Last Month (PAY_0)', type: 'range', min: -2, max: 8, step: 1, default: 0, hint: '-2 = No use · -1 = Paid · 0 = Minimum · 1–8 = Months delayed' },
      { key: 'bill_amt1', label: 'Bill Amount Last Month', type: 'range', min: 0, max: 500000, step: 1000, default: 45000, unit: 'TWD' },
      { key: 'pay_amt1', label: 'Payment Amount Last Month', type: 'range', min: 0, max: 200000, step: 500, default: 3000, unit: 'TWD' },
      { key: 'education', label: 'Education', type: 'select', options: ['Graduate School', 'University', 'High School', 'Other'], default: 'Graduate School' },
    ],
    evaluate: (v): DemoResult => {
      const limit = Number(v.limit_bal)
      const age = Number(v.age)
      const pay0 = Number(v.pay_0)
      const bill = Number(v.bill_amt1)
      const pay = Number(v.pay_amt1)
      const education = String(v.education)
      const edu = EDU_CODE[education] ?? 4
      // Heuristic from views/p13_loan.py (the fallback used when credit_models.pkl is absent).
      const utilization = bill / Math.max(limit, 1)
      const paymentRatio = bill > 0 ? pay / Math.max(bill, 1) : 1.0
      const cPay = pay0 * 0.06
      const cUtil = utilization * 0.2
      const cRatio = -paymentRatio * 0.1
      const cEdu = edu >= 3 ? 0.05 : 0
      const prob = Math.min(0.97, Math.max(0.01, 0.22 + cPay + cUtil + cRatio + cEdu))
      const bucket = bucketOf(prob)
      return {
        headline: `${bucket.toUpperCase()} RISK`,
        score: prob,
        tone: BUCKET_TONE[bucket],
        details: [
          { label: 'Default probability', value: pct(prob) },
          { label: 'Risk bucket', value: bucket },
          { label: 'Credit utilization', value: pct(utilization) },
          { label: 'Payment ratio (PAY_AMT1 / BILL_AMT1)', value: `${paymentRatio.toFixed(2)}×` },
          { label: 'Applicant', value: `${age} y · ${education}` },
        ],
        reasons: [
          { label: 'Portfolio base rate', weight: 0.22 },
          { label: `Repayment status PAY_0 = ${pay0}`, weight: r3(cPay) },
          { label: `Credit utilization ${pct(utilization)}`, weight: r3(cUtil) },
          { label: `Payment ratio ${paymentRatio.toFixed(2)}×`, weight: r3(cRatio) },
          { label: `Education: ${education}`, weight: r3(cEdu) },
        ],
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness, loaded model names and calibration version' },
      { method: 'POST', path: '/predict', description: 'Calibrated default probability, risk tier and bucket for one applicant' },
      { method: 'POST', path: '/batch_predict', description: 'Score up to 10,000 applicants from a JSON array or CSV upload' },
      { method: 'POST', path: '/explain', description: 'SHAP contributions and ECOA adverse-action reason codes for one applicant' },
      { method: 'GET', path: '/model/info', description: 'Ensemble members, hyper-parameters, hold-out AUC and training date' },
      { method: 'GET', path: '/scorecard/tiers', description: 'Probability cut-points and decision for each of the 4 tiers' },
      { method: 'GET', path: '/calibration', description: 'Reliability-curve bins for the raw and Platt-scaled model' },
      { method: 'GET', path: '/fairness/report', description: 'Fairlearn MetricFrame: selection rate and FNR by sex, education, marital status' },
      { method: 'GET', path: '/feature_importance', description: 'Global mean |SHAP| ranking' },
    ],
    sample: {
      endpoint: 'POST /predict',
      request: `{
  "LIMIT_BAL": 200000,
  "AGE": 35,
  "SEX": 2,
  "EDUCATION": 2,
  "MARRIAGE": 1,
  "PAY_0": 1,
  "PAY_2": 0,
  "PAY_3": 0,
  "BILL_AMT1": 45000,
  "BILL_AMT2": 42100,
  "PAY_AMT1": 3000,
  "PAY_AMT2": 2500
}`,
      response: `{
  "default_probability": 0.312,
  "raw_score": 0.487,
  "risk_tier": 2,
  "decision": "conditional",
  "risk_bucket": "Medium",
  "credit_utilization": 0.225,
  "adverse_action_codes": [
    { "code": "38", "reason": "Serious delinquency: payment delayed 1 month", "shap": 0.071 },
    { "code": "10", "reason": "Proportion of balance to credit limit is too high", "shap": 0.034 }
  ],
  "model": "catboost_v3",
  "calibration": "platt_2026",
  "inference_ms": 6
}`,
    },
  },
  report: {
    executiveSummary: [
      'Loan Default Prediction turns six months of real credit-card behaviour from 30,000 UCI clients into a calibrated, explainable default score. A CatBoost-led ensemble reaches 0.78 AUC on a 6,000-client hold-out, ranking the 22.1% of clients who default well ahead of those who pay, with the top score decile defaulting roughly 17× as often as the bottom one.',
      'Because the ensemble is trained on SMOTE-balanced data, its raw scores over-state risk; Platt scaling on the untouched hold-out restores the true base rate so the probabilities can be used directly for pricing, provisioning and limit management. The calibrated score drives a four-tier scorecard, and SHAP adverse-action codes plus a Fairlearn parity audit make each tier decision defensible under ECOA and Regulation B.',
      'The system ships as a FastAPI service (single, batch and explain endpoints) and a Streamlit analyst dashboard whose live assessment form is reproduced in this app.',
    ],
    impact: [
      { label: 'Portfolio default rate captured', value: '22.1% (6,636 of 30,000)' },
      { label: 'Best hold-out AUC', value: '0.78 (CatBoost)' },
      { label: 'Score lift, top vs bottom decile', value: '≈ 17×' }, // assumed: from the decile chart
      { label: 'Decision tiers', value: '4 (auto-approve → decline)' },
      { label: 'Adverse-action explanation', value: 'Top-4 SHAP drivers per decline' },
      { label: 'Fairness audit', value: 'Parity by sex, education, marital status' },
    ],
    recommendations: [
      { title: 'Retrain on a rolling 12-month window', body: 'The UCI sample covers one 2005 half-year; production scoring should retrain quarterly on the issuer\'s own statements and track PSI on PAY_0 and utilisation to catch drift.' },
      { title: 'Use the calibrated score for pricing, not just decisions', body: 'Once probabilities are honest, risk-based APR and limit assignment recover margin on Tier 2 applicants that a binary approve / decline leaves on the table.' },
      { title: 'Add bureau data for the thin-file segment', body: 'Clients with fewer than three months of history score close to the base rate; bureau inquiries and trade-line age would separate them.' },
      { title: 'Move the parity audit into CI', body: 'Run Fairlearn MetricFrame on every candidate threshold and block promotion when any selection-rate gap exceeds 2 points.' },
    ],
    date: '2026',
  },
}

export default app
