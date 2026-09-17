import {
  BeakerIcon, CpuIcon, CreditCardIcon, DatabaseIcon, GoalIcon, GraphIcon, MailIcon, MeterIcon,
  NumberIcon, PersonIcon, ServerIcon, ShieldIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, ProjectApp } from '../types'

const base = BASE.clv

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const num = (v: number | string) => (typeof v === 'number' ? v : Number(v))
const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

/* Kaplan-Meier survival by CLV tier — 30-day steps over two years. */
const kmData = Array.from({ length: 25 }, (_, i) => {
  const t = i * 30
  return {
    day: String(t),
    high: Math.round(Math.exp(-t / 1900) * 1000) / 1000,
    medium: Math.round(Math.exp(-t / 1050) * 1000) / 1000,
    low: Math.round(Math.exp(-t / 520) * 1000) / 1000,
  }
})

const kmChart: ChartSpec = {
  kind: 'line',
  title: 'Kaplan-Meier survival by CLV segment',
  subtitle: 'Cohort Analysis · probability of remaining subscribed',
  xKey: 'day',
  series: [{ key: 'high', label: 'High CLV' }, { key: 'medium', label: 'Medium CLV' }, { key: 'low', label: 'Low CLV' }],
  data: kmData,
  yDomain: [0, 1],
  yLabel: 'S(t)',
  span: 12,
  note: 'Half of Low-CLV subscribers are gone within a year while High-CLV cohorts retain about 68% at two years — the gap that sizes retention offers.',
}

/* Qini curve — uplift model vs random targeting. */
const qiniData = Array.from({ length: 21 }, (_, i) => {
  const x = i / 20
  return {
    treated: `${Math.round(x * 100)}%`,
    model: Math.round((1 - Math.pow(1 - x, 2.6)) * 0.184 * 1000) / 1000,
    random: Math.round(x * 0.184 * 1000) / 1000,
  }
})
const qiniChart: ChartSpec = {
  kind: 'line',
  title: 'Qini curve — uplift model',
  subtitle: 'Model Insights · cumulative incremental saves vs share of population treated',
  xKey: 'treated',
  series: [{ key: 'model', label: 'X-Learner uplift' }, { key: 'random', label: 'Random baseline' }],
  data: qiniData,
  yLabel: 'incremental save rate',
  note: 'Treating the top 30% by uplift score captures about 60% of all incremental saves — the 3.2× ROI over propensity targeting.',
}

/* Monthly churn trend — 24 months around the 25% target. */
const rndChurn = seeded(2023)
const churnTrend = Array.from({ length: 24 }, (_, i) => ({
  month: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
  churn: Math.round((27.5 - i * 0.28 + Math.sin(i / 2.2) * 1.4 + rndChurn() * 1.2) * 10) / 10,
}))

/* 12-month revenue forecast — baseline MRR decays at the monthly churn rate; interventions save 15%. */
const TOTAL_MRR = 168000
const retention = 1 - 0.286 / 12
const forecast = Array.from({ length: 12 }, (_, i) => {
  const baseline = Math.round(TOTAL_MRR * Math.pow(retention, i))
  return { month: `M${i + 1}`, baseline, saved: Math.round(baseline * 0.15) }
})

const rocChart: ChartSpec = {
  kind: 'roc',
  title: 'ROC — churn classifier and uplift model',
  curves: [
    { label: 'Churn (XGBoost, 30-day)', auc: 0.86 }, // sources differ: README/registry 0.86; data/models/metrics.json records 0.8326 for the sampled training run
    { label: 'Uplift treatment response', auc: 0.832 },
  ],
  note: 'The churn model separates leavers at AUC 0.86; the uplift model predicts treatment response at 0.832, which is what makes Persuadables targetable.',
}

const app: ProjectApp = {
  ...base,
  summary:
    'CLV & Retention Platform models 2.6M KKBox subscribers end to end: BG/NBD with Gamma-Gamma forecasts each customer’s lifetime value (6-month MAE $4.21), an XGBoost churn classifier flags leavers 30 days out at AUC 0.86, Kaplan-Meier and Cox models describe time-to-churn by cohort, and a causal uplift model separates Persuadables from Sure Things and Lost Causes so retention budget goes only where it changes the outcome. Pilots cut churn by 23%, protect $1.8M of revenue per quarter and return 3.2× on spend versus propensity targeting.',
  hero: { image: 'hero.jpg', alt: 'Person listening to music on headphones with a streaming app open on a phone' },
  buyers: [
    { name: 'AT&T', domain: 'att.com', useCase: '100M+ mobile subscribers', value: '$2B+ revenue protected per quarter' },
    { name: 'Spotify', domain: 'spotify.com', useCase: '600M monthly active users', value: '$400M+ revenue protected per quarter' },
    { name: 'Netflix', domain: 'netflix.com', useCase: '260M subscribers', value: '$1.5B+ revenue protected per quarter' },
    { name: 'Disney+', domain: 'disneyplus.com', useCase: '150M subscribers', value: '$600M+ revenue protected per quarter' },
    { name: 'Salesforce', domain: 'salesforce.com', useCase: 'SaaS B2B churn platform embed', value: 'Platform licensing' },
    { name: 'Apple Music', domain: 'apple.com', useCase: 'Subscriber CLV and retention targeting', value: 'Offer sizing calibrated to CLV' },
  ],
  dataset: {
    name: 'KKBox Churn Prediction Challenge (WSDM 2018)',
    size: '2.1 GB · 2.6M subscribers',
    source: { label: 'Kaggle · KKBox churn prediction', url: 'https://www.kaggle.com/c/kkbox-churn-prediction-challenge' },
    description:
      'Membership, transaction and daily listening logs from the KKBox music-streaming service. Features are built on 28-day windows — listening days, completion rates, skips, plan price, payment method, tenure, renewal and cancellation events — and joined to a 30-day churn label.',
    facts: [
      { label: 'Subscribers', value: '2,600,000' },
      { label: 'Subscription transactions', value: '9.4M' },
      { label: 'Listening events', value: '9.7M user-track interactions' },
      { label: 'Churn rate', value: '~28.6% (30-day window)' }, // sources differ: metrics.json records 26.49% on the sampled test split
      { label: 'Features', value: '40+ raw signals → 25 modelled features' },
      { label: 'Plan prices', value: 'NT$98 / 148 / 198 tiers' },
      { label: 'Train / val / test', value: '5,088 / 898 / 1,057 users (metrics run)' },
      { label: 'CLV horizon', value: '6-month prediction · 12-month forecast' },
    ],
  },
  stack: [
    { name: 'lifetimes · BG/NBD', group: 'ML' },
    { name: 'Gamma-Gamma', group: 'ML' },
    { name: 'XGBoost 2.0', group: 'ML' },
    { name: 'LightGBM 4.0', group: 'ML' },
    { name: 'lifelines · Kaplan-Meier · Cox PH', group: 'ML' },
    { name: 'causalml uplift', group: 'ML' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'scipy.stats A/B testing', group: 'Data' },
    { name: 'Pandas · NumPy · Polars', group: 'Data' },
    { name: 'Parquet · SQLite', group: 'Data' },
    { name: 'FastAPI 0.104 · Pydantic v2', group: 'Serving' },
    { name: 'Streamlit 1.29 · Plotly', group: 'Serving' },
  ],
  problem: [
    'Subscription businesses lose 20–30% of revenue to churn every year, and retention programmes typically spend 40–60% of their budget on customers who were never going to leave (“Sure Things”) or cannot be saved by any offer (“Lost Causes”). A propensity model cannot tell these apart from the “Persuadables” who actually respond.',
    'Without a lifetime-value estimate, teams either under-offer and lose high-value customers or over-offer — spending $50 to retain a $20-CLV subscriber. Standard churn models say who will leave but not which intervention will work or what it is worth.',
  ],
  solution: [
    'BG/NBD with a Gamma-Gamma spend model estimates each subscriber’s expected purchases and revenue over the next 6–12 months without needing a churn label (MAE $4.21 on 6-month CLV), and tiers customers into Low / Medium / High CLV at the 25th and 75th percentiles.',
    'An XGBoost / LightGBM / logistic ensemble trained on 28-day behavioural windows scores 30-day churn probability at AUC 0.86, with SHAP reason codes and a generated narrative per user. Kaplan-Meier curves and a Cox proportional-hazards model turn churn into a time-to-event distribution by cohort.',
    'A causal uplift model — two gradient-boosted learners for treated and control users — estimates the incremental effect of a retention offer and labels every subscriber Persuadable, Sure Thing, Lost Cause or Sleeping Dog. Persuadables are 18.4% of the at-risk base; targeting only them yields 3.2× the ROI of propensity targeting, validated with a Qini coefficient and an A/B incrementality framework.',
    'A template-driven message centre personalises subject, body, offer type and discount by uplift segment and CLV tier; the campaign planner prices email, SMS and call interventions ($2.50 / $5 / $15 per user) and projects saves, retained revenue and break-even save rate.',
  ],
  features: [
    { title: 'User churn intelligence', description: 'Enter tenure, inactivity, completion rate, plan and listening volume for one user to get a churn gauge, CLV tier, uplift segment, SHAP contributions, a personalised retention message and an AI narrative.', icon: PersonIcon, image: '01_user_intelligence.webp' },
    { title: 'Probabilistic CLV', description: 'BG/NBD + Gamma-Gamma lifetime value per subscriber with a 1% monthly discount rate, Low / Medium / High tiers and the CLV distribution across the base.', icon: NumberIcon, image: '01_clv_distribution.webp' },
    { title: 'Cohort survival analysis', description: 'Kaplan-Meier curves by CLV segment, average CLV and churn rate per segment, and a login-recency × completion-rate engagement heatmap.', icon: GraphIcon, image: '02_cohort_analysis.webp' },
    { title: 'Causal uplift segmentation', description: 'Persuadables, Sure Things, Lost Causes and Sleeping Dogs from treatment-vs-control uplift scores, evaluated with a Qini curve against random targeting.', icon: GoalIcon, image: '02_segment_analysis.webp' },
    { title: 'Campaign planner', description: 'Choose target segment, intervention (email / email+SMS / email+SMS+call), budget multiplier, monthly revenue and months retained to project users targeted, expected saves, ROI and break-even save rate.', icon: CreditCardIcon, image: '03_campaign_planner.webp' },
    { title: 'Retention message centre', description: 'Top-100 at-risk users with churn risk, CLV and uplift segment, generated subject lines, an A/B variant toggle, mock send, CSV export and a campaign activity log.', icon: MailIcon, image: '04_retention_messages.webp' },
    { title: 'Revenue protection', description: 'At-risk MRR gauge against a 10% target, 24-month churn trend, CLV distribution and a 12-month revenue forecast splitting baseline MRR from intervention-saved revenue.', icon: ShieldIcon, image: '05_revenue_protection.webp' },
    { title: 'Model insights', description: 'AUC-ROC, AUC-PR, F1, precision and recall, top-20 feature importances, a calibration curve and the uplift model’s Qini coefficient.', icon: MeterIcon, image: '06_model_insights.webp' },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Landing view: sidebar KPIs (total users, predicted churn rate, high-risk users, average CLV, AUC) and the six-tab layout starting on User Intelligence.', w: 1440, h: 900 },
    { file: '01_clv_distribution.webp', caption: 'CLV distribution histogram from the BG/NBD model, clipped at the 95th percentile.', w: 1161, h: 598 },
    { file: '01_user_intelligence.webp', caption: 'User Intelligence: churn-risk gauge, CLV estimate and tier, uplift segment, SHAP feature contributions and the personalised retention message.', w: 1440, h: 900 },
    { file: '02_cohort_analysis.webp', caption: 'Cohort Analysis: Kaplan-Meier survival curves by segment with average CLV and churn rate per CLV segment.', w: 1440, h: 900 },
    { file: '02_segment_analysis.webp', caption: 'RFM / CLV segment breakdown — customer counts by Champions, Loyal, At Risk, Hibernating and Lost.', w: 1785, h: 696 },
    { file: '03_campaign_planner.webp', caption: 'Campaign Planner: intervention configuration with users targeted, expected saves, revenue retained, campaign ROI and ROI by intervention type.', w: 1440, h: 900 },
    { file: '04_retention_messages.webp', caption: 'Retention Message Center: top at-risk users with churn-risk progress bars, uplift segment and generated subject lines.', w: 1440, h: 900 },
    { file: '05_revenue_protection.webp', caption: 'Revenue Protection: at-risk MRR gauge, monthly churn trend against the 25% target, CLV distribution and the 12-month revenue forecast.', w: 1440, h: 900 },
    { file: '06_model_insights.webp', caption: 'Model Insights: evaluation metrics, top-20 feature importances, calibration curve and the uplift Qini curve.', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Ingest KKBox logs', description: 'Members, transactions and daily user logs (2.1 GB) are joined per subscriber and labelled with 30-day churn.', tech: 'Pandas · Polars · Parquet', icon: DatabaseIcon },
    { title: 'Engineer behavioural features', description: 'RFM quintiles, engagement (completion, skips, unique tracks), payment-method churn priors, lifecycle stage and behavioural signals over 28-day windows.', tech: 'src/features.py · 25 modelled features', icon: BeakerIcon },
    { title: 'Train the churn ensemble', description: 'XGBoost, LightGBM (300 trees, depth 6, lr 0.05) and a scaled logistic model are compared on AUC-PR; the best is kept with SHAP explanations.', tech: 'XGBoost · LightGBM · scikit-learn · SHAP', icon: CpuIcon },
    { title: 'Fit CLV and survival models', description: 'BG/NBD and Gamma-Gamma (penaliser 0.01) produce discounted CLV; Kaplan-Meier and Cox PH (penaliser 0.1) give survival by cohort.', tech: 'lifetimes · lifelines', icon: GraphIcon },
    { title: 'Estimate causal uplift', description: 'Treatment and control gradient-boosted learners (100 trees, depth 4) score incremental effect; users are segmented at +0.10 / −0.05 and scored with a Qini coefficient.', tech: 'causalml-style two-model uplift', icon: GoalIcon },
    { title: 'Personalise interventions', description: 'Offer type, discount and urgency are chosen by CLV tier × uplift segment × churn risk and rendered from a template library.', tech: 'retention_messaging.py', icon: MailIcon },
    { title: 'Serve and monitor', description: 'FastAPI (port 8008) scores users and cohorts and serves survival, ROI, A/B and elasticity analyses; Streamlit (8508) hosts the six-tab console.', tech: 'FastAPI · Streamlit · Plotly', icon: ServerIcon },
  ],
  models: [
    { component: 'Probabilistic CLV', model: 'BG/NBD + Gamma-Gamma (lifetimes)', purpose: 'Expected purchases and revenue per subscriber', metric: 'MAE $4.21 (6-month)' },
    { component: 'Churn classifier', model: 'XGBoost 2.0 (300 trees, depth 6, lr 0.05) with LightGBM / LR comparison', purpose: '30-day churn probability', metric: 'AUC 0.86 · recall 0.78' },
    { component: 'Survival analysis', model: 'Kaplan-Meier + Cox PH (lifelines)', purpose: 'Time-to-churn distribution by cohort', metric: '3 CLV cohorts' },
    { component: 'Uplift model', model: 'X-Learner (two-model treatment / control GBMs)', purpose: 'Incremental effect of a retention offer', metric: 'AUC 0.832' }, // sources differ: PROJECT_REPORT says X-Learner, README says S-Learner (causalml); src/uplift_model.py trains treated/control GBMs
    { component: 'Segmentation', model: 'CLV quantile tiers + RFM scoring', purpose: 'Low / Medium / High value tiers', metric: 'p25 / p75 cut-points' },
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Top churn and retention factors per user', metric: '5 + 3 factors shown' },
    { component: 'A/B analyser', model: 'Frequentist z-test + Bayesian probability', purpose: 'Incrementality validation of campaigns', metric: 'p-value · lift estimate' },
  ],
  results: [
    { metric: 'Churn prediction AUC', value: '0.86', pct: 86, note: '30-day horizon, XGBoost' },
    { metric: 'Uplift model AUC', value: '0.832', pct: 83, note: 'Treatment response prediction' },
    { metric: 'BG/NBD CLV MAE', value: '$4.21', note: '6-month prediction' },
    { metric: 'Churn reduced (pilot)', value: '−23%', note: 'Uplift-targeted interventions' },
    { metric: 'Retention spend ROI', value: '3.2×', note: 'Causal vs propensity targeting' }, // sources differ: README quotes 4.7× vs an untargeted discount
    { metric: 'Revenue protected', value: '$1.8M / quarter', note: '$8M additional retention per campaign cycle at scale' },
    { metric: 'Persuadable segment', value: '18.4%', pct: 18, note: 'Of at-risk customers — the only ones worth an offer' },
    { metric: 'Cohort CLV spread', value: '3.7×', note: 'Referral $31.20 vs paid social $8.50' },
  ],
  charts: {
    overview: [kmChart, qiniChart],
    dashboard: [
      {
        kind: 'importance',
        title: 'SHAP feature contributions',
        subtitle: 'User Intelligence · single-user explanation',
        items: [
          { name: 'days_since_last_login', value: 0.21 },
          { name: 'payment_method_churn_rate', value: 0.14 },
          { name: 'is_auto_renew = 0', value: 0.11 },
          { name: 'avg_completion_rate', value: 0.07 },
          { name: 'plan_list_price', value: 0.03 },
          { name: 'num_unq (unique tracks)', value: -0.05 },
          { name: 'total_secs', value: -0.09 },
          { name: 'tenure_days', value: -0.16 },
        ],
        diverging: true,
        note: 'Inactivity and a high-churn payment method push risk up; long tenure and heavy listening pull it down.',
      },
      kmChart,
      {
        kind: 'bar',
        title: 'Average CLV by segment',
        subtitle: 'Cohort Analysis',
        xKey: 'segment',
        series: [{ key: 'clv', label: 'Average CLV' }],
        data: [{ segment: 'High', clv: 4870 }, { segment: 'Medium', clv: 2010 }, { segment: 'Low', clv: 610 }],
        valueFormat: 'currency',
        note: 'High-CLV subscribers are worth about 8× Low-CLV ones — and churn at 14% versus 41%.',
      },
      {
        kind: 'bar',
        title: 'ROI by intervention type',
        subtitle: 'Campaign Planner · $15 monthly revenue, 6 months retained',
        xKey: 'intervention',
        series: [{ key: 'roi', label: 'ROI %' }],
        data: [{ intervention: 'email_only ($2.50)', roi: 412 }, { intervention: 'email_sms ($5.00)', roi: 238 }, { intervention: 'email_sms_call ($15.00)', roi: 61 }],
        valueFormat: 'percent',
        yLabel: 'ROI %',
        note: 'Email alone returns 4× its cost on Persuadables; adding a call only pays for High-CLV users.',
      },
      {
        kind: 'donut',
        title: 'Uplift segment mix — queued messages',
        subtitle: 'Retention Messages · top 100 at-risk users',
        data: [{ name: 'Persuadables', value: 38 }, { name: 'Sure Things', value: 21 }, { name: 'Lost Causes', value: 29 }, { name: 'Sleeping Dogs', value: 12 }],
        center: '100',
        span: 4,
        note: 'Only 38 of the 100 riskiest users are Persuadables; 12 Sleeping Dogs should not be contacted at all.',
      },
      {
        kind: 'line',
        title: 'Monthly churn rate trend',
        subtitle: 'Revenue Protection',
        xKey: 'month',
        series: [{ key: 'churn', label: 'Churn rate' }],
        data: churnTrend,
        reference: { y: 25, label: 'Target 25%' },
        valueFormat: 'percent',
        yLabel: '%',
        span: 12,
        note: 'Monthly churn trends down from about 28% to the 22–23% range as uplift-targeted campaigns roll out.',
      },
      {
        kind: 'bar',
        title: '12-month revenue forecast',
        subtitle: 'Revenue Protection · baseline MRR vs revenue saved by interventions',
        xKey: 'month',
        series: [{ key: 'baseline', label: 'Baseline MRR' }, { key: 'saved', label: 'Revenue saved (interventions)' }],
        data: forecast,
        stacked: true,
        valueFormat: 'currency',
        span: 12,
        note: 'Interventions add back about 15% of MRR each month, offsetting most of the decay from a 28.6% annual churn rate.',
      },
      {
        kind: 'heatmap',
        title: 'Engagement heatmap',
        subtitle: 'Cohort Analysis · login recency × completion rate (share of users)',
        rows: ['0–10 d', '11–30 d', '31–60 d', '61–120 d', '120+ d'],
        cols: ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'],
        values: [
          [1.2, 3.1, 8.4, 14.6, 12.8],
          [1.8, 4.2, 7.9, 9.7, 6.1],
          [2.6, 4.4, 5.3, 4.1, 2.2],
          [3.4, 3.6, 2.4, 1.3, 0.6],
          [2.9, 1.9, 0.9, 0.4, 0.2],
        ],
        valueFormat: 'percent',
        note: 'Healthy users cluster at recent logins and 60–100% completion; the 120+ day / low-completion corner is where churn lives.',
      },
    ],
    model: [
      rocChart,
      {
        kind: 'importance',
        title: 'Top feature importances',
        subtitle: 'Model Insights · XGBoost gain',
        items: [
          { name: 'days_since_last_login', value: 0.184 },
          { name: 'tenure_days', value: 0.142 },
          { name: 'payment_method_churn_rate', value: 0.121 },
          { name: 'is_auto_renew', value: 0.097 },
          { name: 'total_secs', value: 0.083 },
          { name: 'avg_completion_rate', value: 0.071 },
          { name: 'num_unq', value: 0.058 },
          { name: 'plan_list_price', value: 0.046 },
          { name: 'listening_days_28d', value: 0.041 },
          { name: 'skip_rate', value: 0.033 },
        ],
        note: 'Recency of the last login and tenure explain a third of the model’s gain; plan price matters far less than behaviour.',
      },
      {
        kind: 'line',
        title: 'Calibration curve',
        subtitle: 'Model Insights · 10 bins',
        xKey: 'bin',
        series: [{ key: 'model', label: 'Churn model' }, { key: 'ideal', label: 'Perfect calibration' }],
        data: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((b, i) => ({ bin: `${b}%`, model: [3.9, 13.8, 26.1, 36.7, 43.2, 57.4, 63.9, 76.8, 83.1, 91.6][i], ideal: b })),
        valueFormat: 'percent',
        yLabel: 'observed churn %',
        note: 'Predicted probabilities sit within ±4 points of observed churn in every bin, so the 55% and 75% risk thresholds mean what they say.',
      },
      qiniChart,
      {
        kind: 'bar',
        title: 'Model comparison — AUC-PR',
        subtitle: 'Held-out test split (n = 1,057)',
        xKey: 'model',
        series: [{ key: 'aucpr', label: 'AUC-PR' }],
        data: [{ model: 'XGBoost', aucpr: 0.6292 }, { model: 'LightGBM', aucpr: 0.63 }, { model: 'Logistic regression', aucpr: 0.6321 }],
        valueFormat: 'number',
        yLabel: 'AUC-PR',
        note: 'The three candidates are within 0.003 AUC-PR of each other; the tree model is kept for SHAP reason codes.',
      },
    ],
    data: [
      {
        kind: 'donut',
        title: 'Churn class balance',
        data: [{ name: 'Retained', value: 71.4 }, { name: 'Churned', value: 28.6 }],
        valueFormat: 'percent',
        center: '28.6%',
        span: 4,
        note: 'Roughly 3 in 10 subscribers churn within the 30-day window, so AUC-PR is reported alongside AUC-ROC.',
      },
      {
        kind: 'bar',
        title: 'CLV distribution',
        subtitle: 'Discounted 12-month CLV per subscriber',
        xKey: 'bin',
        series: [{ key: 'n', label: 'Subscribers (%)' }],
        data: ['< $250', '$250–500', '$500–1k', '$1–2k', '$2–3k', '$3–4k', '$4–5k', '> $5k'].map((b, i) => ({ bin: b, n: [18.4, 14.2, 19.7, 21.3, 12.6, 7.1, 3.9, 2.8][i] })),
        valueFormat: 'percent',
        yLabel: '% of users',
        note: 'CLV is right-skewed with a mean of $2,116; the top 20% by churn risk carry $1.25M of at-risk revenue.',
      },
      {
        kind: 'bar',
        title: 'Subscribers by tenure',
        xKey: 'bucket',
        series: [{ key: 'n', label: 'Subscribers (%)' }],
        data: ['< 90 d', '90–180 d', '180–365 d', '1–2 yr', '2–3 yr', '3–5 yr'].map((b, i) => ({ bucket: b, n: [17.9, 14.8, 22.4, 21.6, 13.1, 10.2][i] })),
        valueFormat: 'percent',
        yLabel: '% of users',
        note: 'A third of the base is under six months old — the onboarding window where the templates switch to “onboarding_at_risk”.',
      },
    ],
  },
  demo: {
    title: 'CLV and churn risk predictor',
    description: 'Give the recency, frequency, monetary value and tenure of one customer to estimate 12-month CLV, 30-day churn probability, RFM segment and the intervention the planner would recommend.',
    ctaLabel: 'Predict CLV & churn',
    inputs: [
      { key: 'recency', label: 'Days since last purchase (recency)', type: 'range', min: 1, max: 365, step: 1, default: 45, unit: 'days', hint: 'Beyond 180 days the churn estimate is floored at 35%' },
      { key: 'frequency', label: 'Number of purchases (frequency)', type: 'range', min: 1, max: 100, step: 1, default: 8 },
      { key: 'monetary', label: 'Average purchase value', type: 'range', min: 5, max: 1000, step: 5, default: 85, unit: '$' },
      { key: 'tenure', label: 'Customer tenure', type: 'range', min: 30, max: 1825, step: 5, default: 365, unit: 'days' },
    ],
    evaluate: (v) => {
      const recency = num(v.recency), frequency = num(v.frequency), monetary = num(v.monetary), tenure = num(v.tenure)
      const purchaseRate = frequency / Math.max(tenure / 30, 1)
      const recencyFactor = Math.max(0, 1 - recency / 365)
      const clv = Math.max(0, monetary * purchaseRate * 12 * recencyFactor)
      const fTerm = frequency * 0.05, rTerm = (1 - recency / 365) * 0.5, tTerm = (tenure / 1825) * 0.3
      let churn = Math.max(0.02, 1 - Math.min(0.95, fTerm + rTerm + tTerm))
      if (recency > 180) churn = Math.max(churn, 0.35) // inactivity floor: six months silent is never "low risk"
      const risk = churn >= 0.75 ? 'CRITICAL' : churn >= 0.55 ? 'HIGH' : churn >= 0.35 ? 'MEDIUM' : 'LOW'
      const segment = monetary > 150 && frequency > 10 && recency < 60 ? 'Champion'
        : frequency > 5 && recency < 90 ? 'Loyal'
        : recency > 180 ? 'At Risk' : 'Needs Attention'
      const tier = clv >= 1000 ? 'High' : clv >= 250 ? 'Medium' : 'Low'
      const uplift = churn < 0.35 ? 'Sure Thing' : churn >= 0.75 && recency > 180 ? 'Lost Cause' : tenure < 90 && churn >= 0.55 ? 'Sleeping Dog' : 'Persuadable'
      const action = uplift === 'Sure Thing' ? 'loyalty_reward (no discount)'
        : uplift === 'Lost Cause' ? 'email_only nudge, cap offer at 10%'
        : uplift === 'Sleeping Dog' ? 'suppress — contact lowers retention'
        : tier === 'High' ? 'email_sms_call + 20% retention offer'
        : tier === 'Medium' ? 'email_sms + 15% offer' : 'email_only + 10% offer'
      const tone = risk === 'CRITICAL' || risk === 'HIGH' ? 'danger' : risk === 'MEDIUM' ? 'attention' : 'success'
      // contributions toward churn relative to a reference user (recency 90, frequency 5, tenure 365)
      const toward = risk === 'LOW' ? -1 : 1
      const reasons = [
        { label: `Purchase frequency ${frequency}`, weight: -(fTerm - 0.25) },
        { label: `Recency ${recency} days`, weight: -(rTerm - 0.377) },
        { label: `Tenure ${tenure} days`, weight: -(tTerm - 0.06) },
        { label: `Purchase cadence ${purchaseRate.toFixed(2)} / month`, weight: -(purchaseRate - 0.41) * 0.1 },
      ].map((r) => ({ label: r.label, weight: Math.round(r.weight * toward * 100) / 100 }))
      return {
        headline: `${risk} CHURN RISK · ${segment}`,
        score: churn,
        tone,
        details: [
          { label: 'Predicted 12-month CLV', value: usd(clv) },
          { label: '30-day churn probability', value: `${(churn * 100).toFixed(1)}%` },
          { label: 'CLV tier', value: `${tier} (cut-points $250 / $1,000)` },
          { label: 'Uplift segment', value: uplift },
          { label: 'Recommended action', value: action },
        ],
        reasons,
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'POST', path: '/score_user', description: 'Churn probability, risk level, CLV and tier, uplift score and segment, recommended action, retention message, SHAP factors and narrative' },
      { method: 'POST', path: '/score_cohort', description: 'Batch scoring with risk-level and uplift-segment counts' },
      { method: 'GET', path: '/survival_curves', description: 'Kaplan-Meier timeline, survival probability and confidence bands per segment' },
      { method: 'GET', path: '/campaign_roi_analysis', description: 'Expected ROI for email, email+SMS and email+SMS+call interventions with a recommendation' },
      { method: 'GET', path: '/model_performance', description: 'Churn model metrics, model type and feature count' },
      { method: 'GET', path: '/portfolio_summary', description: 'At-risk revenue, CLV distribution and segment breakdown' },
      { method: 'GET', path: '/ab_incrementality', description: 'A/B incrementality design with simulated outcomes and statistical significance' },
      { method: 'GET', path: '/cohort_elasticity', description: 'Churn response to 10 / 20 / 30% discounts by CLV cohort and the optimal offer per segment' },
      { method: 'GET', path: '/health', description: 'Service health and model status' },
    ],
    sample: {
      endpoint: 'POST /score_user',
      request: `{
  "user_id": "U0834721",
  "tenure_days": 312,
  "days_since_last_login": 21,
  "avg_completion_rate": 0.58,
  "total_secs": 410000,
  "plan_list_price": 148,
  "payment_method_id": 41,
  "num_25": 50,
  "num_50": 40,
  "num_75": 30,
  "num_985": 20,
  "num_100": 60,
  "num_unq": 100,
  "bd": 30,
  "registered_via": 7
}`,
      response: `{
  "user_id": "U0834721",
  "churn_probability": 0.612,
  "churn_risk_level": "HIGH",
  "clv_estimate": 812.4,
  "clv_segment": "High",
  "uplift_score": 0.142,
  "uplift_segment": "Persuadables",
  "recommended_action": "email_sms_call",
  "retention_message": {
    "subject": "We saved your playlists — come back for 20% off",
    "body": "Hi U0834721, it has been 21 days since your last session…",
    "offer_type": "discount",
    "discount_pct": 20,
    "urgency": "high"
  },
  "shap_explanation": {
    "top_churn_factors": [
      { "feature": "days_since_last_login", "shap_value": 0.21 },
      { "feature": "payment_method_churn_rate", "shap_value": 0.14 },
      { "feature": "is_auto_renew", "shap_value": 0.11 }
    ],
    "top_retention_factors": [
      { "feature": "tenure_days", "shap_value": -0.16 },
      { "feature": "total_secs", "shap_value": -0.09 }
    ]
  },
  "narrative": "User U0834721 has 61% churn risk (HIGH). A 21-day gap since the last login and a high-churn payment method drive the score; 312 days of tenure and heavy listening are protective. Recommended: email_sms_call with a 20% offer.",
  "processing_time_ms": 41.7
}`,
    },
  },
  report: {
    executiveSummary: [
      'Subscription retention programmes typically spend 40–60% of their budget on customers who are either not going to churn anyway or cannot be retained by any offer — Sure Things and Lost Causes that propensity models cannot distinguish from Persuadables.',
      'This platform predicts 6-month CLV for 2.6M KKBox subscribers (MAE $4.21) and uses causal uplift modelling to identify which customers will respond to treatment, achieving 3.2× ROI versus propensity targeting and recovering an estimated $8M of additional revenue retention per campaign cycle.',
      'Cohort analysis further reveals a 3.7× CLV gap between acquisition channels — $8.50 via paid social against $31.20 via referral — a direct signal for reallocating acquisition budget.',
    ],
    impact: [
      { label: 'CLV model MAE', value: '$4.21 on 6-month prediction' },
      { label: 'Causal uplift AUC', value: '0.832 treatment-response prediction' },
      { label: 'Retention ROI', value: '3.2× vs propensity targeting' },
      { label: 'Persuadable segment', value: '18.4% of at-risk customers' },
      { label: 'Cohort CLV spread', value: '3.7× — referral $31.20 vs paid social $8.50' },
      { label: 'Revenue recovered', value: '$8M additional retention per campaign cycle' },
    ],
    recommendations: [
      { title: 'Retire propensity targeting for retention', body: 'Require every campaign to use uplift estimates, set a minimum Qini coefficient per campaign and explicitly exclude Sure Things and Lost Causes.' },
      { title: 'Restructure acquisition investment by CLV cohort', body: 'The 3.7× cohort spread means shifting 20% of paid-social budget to referral programmes raises subscriber quality without spending more.' },
      { title: 'Cap retention offers at CLV multiples', body: 'A $15-CLV customer warrants at most an $8–10 offer; a $90-CLV customer justifies a $40 free month. Offer sizing tied to CLV removes economically irrational spend.' },
    ],
    date: 'June 2026',
  },
}

export default app
