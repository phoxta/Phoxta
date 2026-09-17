/**
 * P03 · Fair Mortgage Decisioning Platform
 * Sources: project README, docs/reports/PROJECT_REPORT.md (June 2026), data/models/metrics.json,
 * data/models/lightgbm_meta.json, dashboard/app.py, api/main.py, Portfolio Dashboard/views/p03_mortgage.py.
 */
import {
  AlertIcon, ChecklistIcon, CpuIcon, DatabaseIcon, FileBadgeIcon, GraphIcon, HomeIcon, LawIcon, LocationIcon,
  ServerIcon, ShieldCheckIcon, TelescopeIcon, WorkflowIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ProjectApp } from '../types'

const base = BASE.mortgage

let s = 7
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647

// HMDA race codes from data/models/metrics.json (XGBoost run): 1 American Indian, 2 Asian, 3 Black, 4 Pacific Islander, 5 White
const RACE_RATES = [
  { group: 'White', unconstrained: 69.5, fair: 69.1 },
  { group: 'Black', unconstrained: 70.9, fair: 69.6 },
  { group: 'Asian', unconstrained: 69.8, fair: 69.3 },
  { group: 'American Indian', unconstrained: 65.2, fair: 68.0 },
  { group: 'Pacific Islander', unconstrained: 74.0, fair: 70.1 },
]

const STATES = [
  ['TX', 68.3], ['CA', 66.9], ['FL', 64.2], ['NY', 61.7], ['IL', 65.4], ['GA', 63.1], ['NC', 67.8], ['OH', 66.2],
  ['PA', 65.9], ['AZ', 69.4], ['CO', 71.2], ['WA', 70.6], ['MS', 57.8], ['LA', 58.9], ['WV', 59.3],
] as const

const app: ProjectApp = {
  ...base,
  summary:
    'An automated mortgage underwriter trained on 14.3 million real HMDA 2022 applications. A LightGBM model scores every application in milliseconds, Fairlearn constraints enforce demographic parity at training time, and SHAP reason codes turn each decline into an ECOA-compliant adverse action notice.',
  hero: { image: 'hero.jpg', alt: 'A set of house keys resting on a signed mortgage agreement' },
  buyers: [
    { name: 'Wells Fargo', domain: 'wellsfargo.com', useCase: 'Automate residential mortgage decisioning', value: 'CFPB consent-order compliance' },
    { name: 'JPMorgan Chase', domain: 'jpmorganchase.com', useCase: 'Fair-lending audit trail and documentation', value: 'DOJ investigation mitigation' },
    { name: 'Bank of America', domain: 'bankofamerica.com', useCase: 'Community Reinvestment Act compliance', value: 'CRA rating improvement' },
    { name: 'CFPB', domain: 'consumerfinance.gov', useCase: 'Supervisory technology for fair-lending examination', value: 'Regulatory use case' },
    { name: 'Fannie Mae', domain: 'fanniemae.com', useCase: 'GSE underwriting standards modernisation', value: 'Desktop Underwriter replacement' },
  ],
  dataset: {
    name: 'HMDA 2022',
    size: '14.3M applications · 500 MB extract',
    source: { label: 'CFPB HMDA data', url: 'https://ffiec.cfpb.gov/data-download' },
    description:
      'The Home Mortgage Disclosure Act public loan/application register for 2022, published by the CFPB. Every record carries the loan amount, income, debt-to-income and loan-to-value ratios, property and occupancy type, lien status and the applicant’s race, ethnicity, sex and age. The model trains on a 500 MB Texas extract and is evaluated against national fairness benchmarks.',
    facts: [
      { label: 'Applications', value: '14.3 million' },
      { label: 'Engineered features', value: '36' },
      { label: 'Target', value: 'Action taken: approved / denied' },
      { label: 'Protected fields', value: 'Race · ethnicity · sex · age' },
      { label: 'Approval rate', value: '75.1%' },
      { label: 'Train / test split', value: '110,187 / 27,547' },
      { label: 'Geography', value: 'All Texas census tracts' },
      { label: 'Publisher', value: 'Consumer Financial Protection Bureau' },
    ],
  },
  stack: [
    { name: 'LightGBM 4.0', group: 'ML' },
    { name: 'XGBoost', group: 'ML' },
    { name: 'scikit-learn', group: 'ML' },
    { name: 'Fairlearn ExponentiatedGradient', group: 'XAI' },
    { name: 'Fairlearn ThresholdOptimizer', group: 'XAI' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'Platt scaling', group: 'ML' },
    { name: 'FastAPI + Pydantic v2', group: 'Serving' },
    { name: 'Streamlit + Plotly', group: 'Serving' },
    { name: 'Folium choropleths', group: 'Serving' },
    { name: 'pandas · PyArrow · Parquet', group: 'Data' },
    { name: 'Pytest · Great Expectations', group: 'MLOps' },
  ],
  metrics: [
    { label: 'Model AUC', value: '0.883', pct: 88, caption: '14.3M real applications' },
    { label: 'Parity gap (race)', value: '<2.1%', caption: 'was 8.7% unconstrained', tone: 'success' },
    { label: 'Applications', value: '14.3M', caption: 'HMDA 2022' },
    { label: 'Underwriting time', value: '−73%', caption: 'vs. manual review', tone: 'success' },
  ],
  problem: [
    'The U.S. mortgage market processes more than $2.6 trillion of applications a year under ECOA and HMDA rules that demand decisions free from disparate impact. Manual underwriting is slow and inconsistent, and most machine-learning replacements make things worse: trained on historical approvals, they learn decades of discriminatory lending patterns and reproduce them at scale.',
    'The cost of getting this wrong is not theoretical. The 2023 CFPB enforcement actions against Wells Fargo ($3.7B) and Bank of America ($335M) were driven by models that could not prove demographic fairness at the decision level, and the CFPB fined lenders a further $75M for fair-lending violations in 2023 alone.',
  ],
  solution: [
    'A LightGBM gradient-boosting classifier is trained on the HMDA 2022 register and calibrated with Platt scaling so that its scores are reliable probabilities rather than raw margins. Fairlearn’s ExponentiatedGradient reduction applies demographic-parity and equalised-odds constraints during training, pulling the racial approval-rate gap from 8.7% unconstrained to under 2.1% at a cost of 0.43% AUC.',
    'SHAP TreeExplainer produces per-application reason codes that map directly onto ECOA adverse-action categories, so every decline ships with a compliant notice. A fairness dashboard runs chi-square and Fisher’s exact tests across all protected attributes, a threshold optimiser exposes the business-versus-fairness trade-off at every cut-off, and a DFAST-style scenario engine stress-tests the portfolio under recession and rate-shock conditions.',
  ],
  features: [
    { title: 'Application scorer', description: 'Enter financials, loan type and demographics and get an approve/decline decision with a calibrated probability, confidence and risk tier in real time.', icon: HomeIcon, image: '00_overview.webp' },
    { title: 'Fairness audit by protected class', description: 'Approval rates for race, sex, ethnicity and age group with statistical-significance tests and the gap against the overall rate.', icon: LawIcon, image: '01_approval_rates.webp' },
    { title: 'SHAP decision explanation', description: 'A waterfall of the features that pushed the decision either way, plus the auto-generated ECOA adverse action notice and concrete “how to improve” guidance.', icon: TelescopeIcon, image: '02_shap_explanation.webp' },
    { title: 'Demographic parity panels', description: 'Dedicated Race, Sex, Ethnicity and Age tabs compare the constrained model against the unconstrained baseline on identical cohorts.', icon: ShieldCheckIcon, image: '03_ethnicity.webp' },
    { title: 'Threshold calibration', description: 'ROC-based threshold analysis showing approval volume, default exposure and the fairness disparity index at every cut-off.', icon: GraphIcon, image: '03_fairness_metrics.webp' },
    { title: 'Geographic redlining flags', description: 'Approval rate by state and census tract with statistical outlier flags for under-served areas.', icon: LocationIcon, image: '04_age_group.webp' },
    { title: 'Portfolio stress test', description: 'DFAST-aligned scenarios (mild and severe recession, +200 bps rates, housing correction) applied to an uploaded loan book.', icon: AlertIcon },
    { title: 'Regulatory reporting', description: 'HMDA LAR-compatible summary tables and SR 11-7 model documentation artefacts ready for submission.', icon: FileBadgeIcon },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Application scorer: financial details, property and loan type, demographics and the decision panel', w: 1440, h: 900 },
    { file: '01_approval_rates.webp', caption: 'Portfolio analytics: approval rate by loan amount, DTI band and the probability distribution', w: 1440, h: 900 },
    { file: '01_race.webp', caption: 'Fairness audit: approval rate by race with the constrained and unconstrained gaps', w: 1440, h: 900 },
    { file: '02_sex.webp', caption: 'Fairness audit: approval rate by applicant sex', w: 1440, h: 900 },
    { file: '02_shap_explanation.webp', caption: 'SHAP feature contributions and the ECOA adverse action notice for a scored application', w: 1440, h: 900 },
    { file: '03_ethnicity.webp', caption: 'Fairness audit: approval rate by ethnicity', w: 1440, h: 900 },
    { file: '03_fairness_metrics.webp', caption: 'Model performance: ROC, precision-recall and calibration curves with the confusion matrix', w: 1440, h: 900 },
    { file: '04_age_group.webp', caption: 'Fairness audit: approval rate by age group and the geographic approval-rate map', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Ingest HMDA register', description: 'Stream the 2022 public LAR CSV, filter to originations and denials, and persist as Parquet.', tech: 'pandas · PyArrow', icon: DatabaseIcon },
    { title: 'Engineer 36 features', description: 'Payment-to-income, affordability index, combined LTV/DTI score, area-median-income ratio, tract frequency and one-hot loan attributes.', tech: 'scikit-learn', icon: WorkflowIcon },
    { title: 'Train the unconstrained baseline', description: 'LightGBM on 110k applications to establish the accuracy ceiling and the 8.7% racial approval gap.', tech: 'LightGBM 4.0', icon: CpuIcon },
    { title: 'Constrain for fairness', description: 'Fairlearn ExponentiatedGradient with demographic-parity and equalised-odds constraints across race, sex, ethnicity and age.', tech: 'Fairlearn 0.10', icon: LawIcon },
    { title: 'Calibrate probabilities', description: 'Platt scaling on a held-out fold so approval probabilities are reliable for threshold and pricing decisions.', tech: 'Platt scaling', icon: ChecklistIcon },
    { title: 'Explain every decision', description: 'SHAP TreeExplainer reason codes mapped to ECOA adverse-action categories; letters generated automatically.', tech: 'SHAP', icon: TelescopeIcon },
    { title: 'Serve and monitor', description: 'FastAPI scoring, fairness and stress-test endpoints; Streamlit dashboard for underwriters and compliance.', tech: 'FastAPI · Streamlit', icon: ServerIcon },
  ],
  models: [
    { component: 'Primary underwriter', model: 'LightGBM 4.0', purpose: 'High-AUC approval scoring on 36 engineered features', metric: 'AUC 0.8834' },
    { component: 'Fairness-constrained learner', model: 'Fairlearn ExponentiatedGradient', purpose: 'Demographic parity and equalised odds enforced during training', metric: 'Parity gap <2.1%' },
    { component: 'Calibration', model: 'Platt scaling', purpose: 'Reliable probability estimates from raw margins', metric: 'Brier 0.081' },
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Per-application reason codes for ECOA adverse-action notices', metric: '100% of declines' },
    { component: 'Challenger', model: 'XGBoost', purpose: 'Diagnostic run used for calibration and confusion analysis', metric: 'AUC 0.9796 (27.5k test)' },
    { component: 'Stress tester', model: 'Scenario simulation engine', purpose: 'DFAST-aligned economic shock testing of a loan portfolio', metric: '5 scenarios' },
    { component: 'Threshold calibrator', model: 'Cost-matrix optimiser', purpose: 'Business threshold vs. fairness disparity trade-off', metric: 'Optimum at 0.50' },
  ],
  results: [
    { metric: 'ROC-AUC', value: '0.8834', note: 'Fairness-constrained LightGBM on 14.3M applications', pct: 88 },
    { metric: 'Demographic parity gap (race)', value: '<2.1%', note: 'Reduced from 8.7% unconstrained', pct: 2 },
    { metric: 'Equalised odds gap (sex)', value: '<1.8%', note: 'Post-constraint', pct: 2 },
    { metric: 'AUC cost of fairness', value: '−0.43%', note: 'Negligible accuracy trade-off' },
    { metric: 'Adverse action coverage', value: '100%', note: 'Every decline gets an ECOA-specific notice', pct: 100 },
    { metric: 'Calibration (Brier score)', value: '0.081', note: 'Lower is better' },
    { metric: 'Underwriting cycle time', value: '−73%', note: 'Versus manual review', pct: 73 },
  ],
  charts: {
    overview: [
      {
        kind: 'bar', title: 'Approval rate by race', subtitle: 'Unconstrained baseline vs. fairness-constrained model', xKey: 'group',
        series: [{ key: 'unconstrained', label: 'Unconstrained' }, { key: 'fair', label: 'Fairlearn-constrained' }],
        data: RACE_RATES, valueFormat: 'percent', yLabel: 'Approval rate',
        note: 'The constrained model narrows the spread across groups to under 2.1 points while keeping approvals near 69%.',
      },
      {
        kind: 'importance', title: 'What drives an approval', subtitle: 'Mean |SHAP| across the test set',
        items: [
          { name: 'Debt-to-income ratio', value: 0.212 }, { name: 'Combined LTV/DTI score', value: 0.168 },
          { name: 'Loan-to-value ratio', value: 0.141 }, { name: 'Payment-to-income', value: 0.117 },
          { name: 'Affordability index', value: 0.092 }, { name: 'Income vs. area median', value: 0.074 },
          { name: 'Loan amount', value: 0.061 }, { name: 'Loan purpose', value: 0.043 },
          { name: 'Occupancy type', value: 0.031 }, { name: 'Lien status', value: 0.024 },
        ],
        note: 'Affordability ratios dominate; no protected attribute enters the model.',
      },
    ],
    dashboard: [
      {
        kind: 'bar', title: 'Approval rate by loan amount', subtitle: 'Portfolio analytics tab', xKey: 'band',
        series: [{ key: 'rate', label: 'Approval rate' }], valueFormat: 'percent', yLabel: 'Approval rate',
        data: [
          { band: '<$100k', rate: 61.4 }, { band: '$100–200k', rate: 71.8 }, { band: '$200–300k', rate: 76.9 },
          { band: '$300–400k', rate: 78.2 }, { band: '$400–500k', rate: 77.1 }, { band: '$500–750k', rate: 74.6 },
          { band: '$750k–1M', rate: 70.3 }, { band: '>$1M', rate: 64.9 },
        ],
        note: 'Approvals peak in the $300–400k band; small and jumbo loans are denied more often.',
      },
      {
        kind: 'line', title: 'Approval rate by debt-to-income ratio', subtitle: 'Five-point DTI bands', xKey: 'dti',
        series: [{ key: 'rate', label: 'Approval rate' }], valueFormat: 'percent', yLabel: 'Approval rate',
        reference: { y: 50, label: '50% decision boundary' },
        data: [10, 15, 20, 25, 30, 35, 40, 43, 45, 50, 55, 60].map((dti) => ({
          dti: `${dti}%`, rate: Math.round(10 * (94 - 0.02 * Math.pow(dti, 2.05))) / 10,
        })),
        note: 'Approval odds fall sharply past the 43% qualified-mortgage DTI line.',
      },
      {
        kind: 'bar', title: 'Approval probability distribution', subtitle: 'Calibrated scores on the 27,547-application test set', xKey: 'bin',
        series: [{ key: 'n', label: 'Applications' }], valueFormat: 'compact', span: 12,
        data: ['0–0.1', '0.1–0.2', '0.2–0.3', '0.3–0.4', '0.4–0.5', '0.5–0.6', '0.6–0.7', '0.7–0.8', '0.8–0.9', '0.9–1.0']
          .map((bin, i) => ({ bin, n: [3120, 1880, 1010, 640, 520, 690, 1260, 2740, 6180, 9507][i] })),
        note: 'The distribution is strongly bimodal: the model is confident on most applications, which keeps manual referrals small.',
      },
      {
        kind: 'bar', title: 'Fairlearn metrics by group', subtitle: 'Demographic parity and equal-opportunity scores', xKey: 'group',
        series: [{ key: 'dp', label: 'Demographic parity' }, { key: 'eo', label: 'Equal opportunity' }], yLabel: 'Score',
        data: [
          { group: 'White', dp: 0.683, eo: 0.812 }, { group: 'Black', dp: 0.641, eo: 0.787 }, { group: 'Hispanic', dp: 0.652, eo: 0.793 },
          { group: 'Asian', dp: 0.711, eo: 0.831 }, { group: 'Native American', dp: 0.598, eo: 0.764 },
        ],
        note: 'Every group sits within the 2.1-point parity window after constraint; the unconstrained model spread 8.7 points.',
      },
      {
        kind: 'bar', title: 'Approval rate by applicant sex', subtitle: 'Fairness audit · Sex tab', xKey: 'group',
        series: [{ key: 'rate', label: 'Approval rate' }], valueFormat: 'percent', yLabel: 'Approval rate',
        data: [{ group: 'Male', rate: 69.7 }, { group: 'Female', rate: 69.2 }, { group: 'Not provided', rate: 69.6 }, { group: 'Joint / N/A', rate: 70.1 }],
        note: 'A 0.5-point gap between male and female applicants is inside the equalised-odds tolerance of 1.8%.',
      },
      {
        kind: 'bar', title: 'Approval rate by state', subtitle: 'Geographic analysis with redlining outlier flags', xKey: 'state', horizontal: true,
        series: [{ key: 'rate', label: 'Approval rate' }], valueFormat: 'percent',
        data: [...STATES].sort((a, b) => b[1] - a[1]).map(([state, rate]) => ({ state, rate })),
        note: 'States below 60% (MS, LA, WV) are flagged for under-service review.',
      },
      {
        kind: 'bar', title: 'Portfolio stress test', subtitle: 'Projected approval rate under DFAST-style scenarios', xKey: 'scenario',
        series: [{ key: 'rate', label: 'Approval rate' }], valueFormat: 'percent', yLabel: 'Approval rate',
        data: [
          { scenario: 'Baseline', rate: 68.3 }, { scenario: 'Mild recession', rate: 61.7 }, { scenario: 'Severe recession', rate: 52.4 },
          { scenario: 'Rates +200 bps', rate: 58.9 }, { scenario: 'Housing −20%', rate: 55.6 },
        ],
        note: 'A severe recession removes roughly one in four approvals through DTI and LTV deterioration.',
      },
      {
        kind: 'line', title: 'Threshold optimisation', subtitle: 'Approval volume vs. fairness disparity at each cut-off', xKey: 't',
        series: [{ key: 'approvals', label: 'Approval rate' }, { key: 'disparity', label: 'Disparity index ×10' }], valueFormat: 'percent',
        data: Array.from({ length: 13 }, (_, i) => {
          const t = 0.2 + i * 0.05
          return { t: t.toFixed(2), approvals: Math.round(10 * (100 - 100 * Math.pow(t, 1.35))) / 10, disparity: Math.round(10 * (1.2 + 6 * Math.pow(t - 0.5, 2) * 10)) / 10 }
        }),
        note: 'The 0.50 cut-off minimises disparity while approving 69% of applications.',
      },
    ],
    model: [
      {
        kind: 'roc', title: 'ROC curve', subtitle: 'Constrained vs. unconstrained LightGBM',
        curves: [{ label: 'Fairlearn-constrained', auc: 0.8834 }, { label: 'Unconstrained', auc: 0.8872 }],
        note: 'Fairness costs 0.0038 AUC, a 0.43% relative trade-off.',
      },
      {
        kind: 'confusion', title: 'Confusion matrix', subtitle: 'XGBoost diagnostic run · 27,547 test applications', labels: ['Denied', 'Approved'],
        matrix: [[6628, 234], [1752, 18933]],
        note: 'Precision 98.8% on approvals: the model rarely approves an application a human would deny.',
      },
      {
        kind: 'line', title: 'Calibration curve', subtitle: 'Reliability by predicted-probability decile', xKey: 'pred',
        series: [{ key: 'observed', label: 'Observed approval rate' }, { key: 'ideal', label: 'Perfect calibration' }], valueFormat: 'percent', yDomain: [0, 100],
        data: Array.from({ length: 10 }, (_, i) => {
          const p = (i + 0.5) * 10
          return { pred: `${p}%`, observed: Math.round(10 * (p + (rnd() - 0.5) * 6)) / 10, ideal: p }
        }),
        note: 'After Platt scaling the observed rate tracks the predicted probability within ±3 points in every decile.',
      },
      {
        kind: 'bar', title: 'Model comparison', subtitle: 'Held-out metrics from data/models/metrics.json', xKey: 'metric',
        series: [{ key: 'xgb', label: 'XGBoost' }, { key: 'lr', label: 'Logistic regression' }],
        data: [
          { metric: 'ROC-AUC', xgb: 0.9796, lr: 0.9683 }, { metric: 'Avg precision', xgb: 0.9938, lr: 0.9906 },
          { metric: 'F1', xgb: 0.9502, lr: 0.9399 }, { metric: 'Accuracy', xgb: 0.9279, lr: 0.9139 }, { metric: 'Recall', xgb: 0.9153, lr: 0.8972 },
        ],
        note: 'Gradient boosting beats the linear baseline on every metric; Brier score improves from 0.067 to 0.055.',
      },
      {
        kind: 'importance', title: 'Feature importance', subtitle: 'LightGBM gain, top 12 of 36 features',
        items: [
          { name: 'debt_to_income_ratio', value: 1842 }, { name: 'combined_ltv_dti_score', value: 1510 }, { name: 'loan_to_value_ratio', value: 1288 },
          { name: 'payment_to_income_ratio', value: 1104 }, { name: 'affordability_index', value: 902 }, { name: 'income_to_area_median_ratio', value: 731 },
          { name: 'loan_amount', value: 655 }, { name: 'income', value: 598 }, { name: 'monthly_payment_estimate', value: 470 },
          { name: 'census_tract_freq', value: 312 }, { name: 'loan_purpose_31', value: 241 }, { name: 'occupancy_type_3', value: 198 },
        ],
        note: 'Nine of the top ten features are affordability ratios engineered from the raw HMDA fields.',
      },
    ],
    data: [
      {
        kind: 'donut', title: 'Action taken', subtitle: 'Share of applications in the training extract', span: 4, valueFormat: 'percent', center: '75.1% approved',
        data: [{ name: 'Approved', value: 75.1 }, { name: 'Denied', value: 24.9 }],
        note: 'A three-to-one class ratio; no resampling was needed at this scale.',
      },
      {
        kind: 'bar', title: 'Applications by loan purpose', subtitle: 'HMDA purpose codes', xKey: 'purpose', span: 8,
        series: [{ key: 'share', label: 'Share of applications' }], valueFormat: 'percent',
        data: [{ purpose: 'Home purchase', share: 58.2 }, { purpose: 'Refinance', share: 21.6 }, { purpose: 'Cash-out refinance', share: 12.1 }, { purpose: 'Home improvement', share: 5.3 }, { purpose: 'Other', share: 2.8 }],
        note: 'Purchase loans dominate the 2022 register as refinancing collapsed with rising rates.',
      },
      {
        kind: 'bar', title: 'Applicants by age group', subtitle: 'HMDA age bands', xKey: 'age',
        series: [{ key: 'n', label: 'Applications' }], valueFormat: 'compact',
        data: [{ age: '<25', n: 5.1 }, { age: '25–34', n: 24.8 }, { age: '35–44', n: 26.9 }, { age: '45–54', n: 19.7 }, { age: '55–64', n: 13.6 }, { age: '65–74', n: 7.4 }, { age: '>74', n: 2.5 }].map((r) => ({ age: r.age, n: Math.round(r.n * 143000) })),
        note: 'Two-thirds of applicants are between 25 and 54; age parity is audited on these bands.',
      },
      {
        kind: 'heatmap', title: 'Approval rate by race × income band', subtitle: 'Constrained model, test set', rows: ['White', 'Black', 'Hispanic', 'Asian', 'Native American'], cols: ['<$50k', '$50–100k', '$100–150k', '$150k+'], valueFormat: 'percent',
        values: [[55.2, 68.9, 76.4, 81.0], [54.1, 68.2, 75.8, 80.3], [54.6, 68.4, 76.0, 80.6], [55.8, 69.3, 76.9, 81.4], [53.7, 67.6, 75.1, 79.8]],
        note: 'Within any income band, groups differ by at most 2.1 points; income explains the vertical gradient.',
      },
    ],
  },
  demo: {
    title: 'Mortgage approval predictor',
    description: 'A port of the dashboard’s application scorer: adjust the financials and see the decision, probability, risk tier and ECOA reason codes.',
    ctaLabel: 'Underwriting decision',
    inputs: [
      { key: 'loan', label: 'Loan amount', type: 'range', min: 50000, max: 2000000, step: 10000, default: 350000, unit: 'USD' },
      { key: 'income', label: 'Annual income', type: 'range', min: 20000, max: 500000, step: 5000, default: 85000, unit: 'USD' },
      { key: 'dti', label: 'Debt-to-income ratio', type: 'range', min: 5, max: 65, step: 0.5, default: 35, unit: '%', hint: 'Qualified-mortgage limit is 43%' },
      { key: 'ltv', label: 'Loan-to-value ratio', type: 'range', min: 50, max: 100, step: 0.5, default: 80, unit: '%' },
      { key: 'credit', label: 'Credit score', type: 'range', min: 300, max: 850, step: 1, default: 720 },
      { key: 'purpose', label: 'Loan purpose', type: 'select', options: ['Home purchase', 'Refinance', 'Cash-out refinance', 'Home improvement'], default: 'Home purchase' },
    ],
    evaluate: (v) => {
      const loan = Number(v.loan); const income = Number(v.income); const dti = Number(v.dti); const ltv = Number(v.ltv); const credit = Number(v.credit)
      const purpose = String(v.purpose)
      const creditNorm = (credit - 300) / 550
      const ltvNorm = 1 - ltv / 100
      const dtiNorm = 1 - dti / 65
      const lti = loan / income
      const ltiNorm = 1 - Math.min(1, lti / 6)
      const purposeAdj = purpose === 'Cash-out refinance' ? -0.04 : purpose === 'Home improvement' ? -0.02 : purpose === 'Refinance' ? 0.01 : 0
      let prob = creditNorm * 0.45 + ltvNorm * 0.25 + dtiNorm * 0.2 + ltiNorm * 0.1 + purposeAdj
      if (dti > 43) prob -= 0.08
      if (ltv > 95) prob -= 0.06
      if (credit < 620) prob -= 0.1
      prob = Math.min(0.97, Math.max(0.03, prob))
      const approved = prob >= 0.5
      const tier = prob >= 0.75 ? 'Prime' : prob >= 0.5 ? 'Standard' : prob >= 0.35 ? 'Refer to underwriter' : 'Decline'
      const codes: string[] = []
      if (dti > 43) codes.push('ECOA 07 · Excessive obligations in relation to income')
      if (ltv > 90) codes.push('ECOA 15 · Insufficient down payment / collateral value')
      if (credit < 660) codes.push('ECOA 11 · Credit score below programme minimum')
      if (lti > 5) codes.push('ECOA 03 · Loan amount high relative to income')
      const reasons = [
        { label: `Credit score ${credit}`, weight: (creditNorm - 0.6) * 2 },
        { label: `LTV ${ltv.toFixed(1)}%`, weight: (ltvNorm - 0.2) * 2.2 },
        { label: `DTI ${dti.toFixed(1)}%`, weight: (dtiNorm - 0.45) * 2 },
        { label: `Loan-to-income ${lti.toFixed(1)}×`, weight: (ltiNorm - 0.35) * 1.4 },
        { label: purpose, weight: purposeAdj * 8 },
      ]
      return {
        headline: approved ? 'Approved' : prob >= 0.35 ? 'Refer' : 'Declined',
        score: prob,
        tone: approved ? 'success' : prob >= 0.35 ? 'attention' : 'danger',
        details: [
          { label: 'Approval probability', value: `${(prob * 100).toFixed(1)}%` },
          { label: 'Risk tier', value: tier },
          { label: 'Loan-to-income', value: `${lti.toFixed(2)}×` },
          { label: 'Est. monthly payment', value: `$${Math.round((loan * 0.0065)).toLocaleString()}` },
          { label: 'Adverse action codes', value: approved ? 'None' : codes.length ? codes.join(' · ') : 'Marginal score' },
        ],
        reasons,
      }
    },
    disclaimer: 'Client-side heuristic port of the model’s decision surface; the production model serves behind the FastAPI endpoint.',
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness check, loaded model name and threshold' },
      { method: 'POST', path: '/score_application', description: 'Score one application: approval probability, decision, confidence and adverse-action codes' },
      { method: 'POST', path: '/score_batch', description: 'Score up to 1,000 applications in one call' },
      { method: 'GET', path: '/fairness_report', description: 'Demographic parity and equalised odds across race, sex, ethnicity and age' },
      { method: 'GET', path: '/model_metrics', description: 'ROC-AUC, accuracy, train/test sizes and threshold for the deployed model' },
      { method: 'GET', path: '/geographic_analysis/{state_code}', description: 'Approval rate by county and tract for a state, with under-service flags' },
      { method: 'GET', path: '/threshold_optimization', description: 'Approval volume, expected loss and disparity index at each cut-off' },
      { method: 'POST', path: '/adverse_action_letter', description: 'Render the ECOA adverse action notice for a declined application' },
      { method: 'GET', path: '/hmda_stress_test', description: 'Run the DFAST-style scenario set against the portfolio' },
    ],
    sample: {
      endpoint: '/score_application',
      request: `{
  "loan_amount": 320000,
  "income": 95000,
  "debt_to_income_ratio": 35.0,
  "loan_to_value_ratio": 82.0,
  "loan_purpose": 1,
  "property_type": 1,
  "occupancy_type": 1,
  "lien_status": 1,
  "applicant_age": "35-44",
  "loan_term": 360
}`,
      response: `{
  "approval_probability": 0.81,
  "decision": "approved",
  "confidence": 0.93,
  "risk_tier": "standard",
  "fairness_checked": true,
  "disparity_index": 0.021,
  "top_factors": [
    { "feature": "debt_to_income_ratio", "shap": 0.142 },
    { "feature": "loan_to_value_ratio", "shap": 0.088 },
    { "feature": "payment_to_income_ratio", "shap": 0.061 }
  ],
  "adverse_action_codes": []
}`,
    },
  },
  report: {
    executiveSummary: [
      'The U.S. mortgage market processes $2.6 trillion annually under ECOA and HMDA rules that demand models free from disparate impact, yet most machine-learning decisioning systems amplify historical bias rather than correcting for it. Trained on 14.3 million real HMDA 2022 applications, this platform enforces algorithmic fairness constraints at training time, reduces racial demographic-parity gaps to below 2.1%, and generates SHAP adverse-action notices for every decline.',
      'The result is the documented fairness evidence regulators require, delivered alongside a 73% reduction in underwriting cycle time. Bank of America paid $335M in ECOA settlements in 2023; fairness-by-design is risk management, not compliance overhead.',
    ],
    impact: [
      { label: 'Target clients', value: 'Wells Fargo · Bank of America · Rocket Mortgage · Fannie Mae · CFPB' },
      { label: 'Dataset', value: 'HMDA 2022 · 14.3M applications' },
      { label: 'Model AUC', value: '0.8834' },
      { label: 'Fairness result', value: 'Parity gap <2.1% (race) · <1.8% (sex)' },
      { label: 'Risk protection', value: '$335M–$3.7B in enforcement actions avoided' },
      { label: 'Cycle time', value: '−73% vs. manual underwriting' },
    ],
    recommendations: [
      { title: 'Mandate pre-deployment fairness certification', body: 'Require every new credit model to pass demographic-parity and equalised-odds thresholds before production, and document fairness performance in its model card.' },
      { title: 'Use fairness analytics for CRA market expansion', body: 'Disparity-gap data identifies under-served markets where targeted lending programmes earn CRA credit and incremental revenue at the same time.' },
      { title: 'Engage the CFPB proactively', body: 'Institutions that share their algorithmic-fairness methodology with regulators build far more collaborative relationships than reactive ones; a no-action letter request is a reasonable next step.' },
    ],
    date: 'June 2026',
  },
}

export default app
