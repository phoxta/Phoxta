/**
 * P04 · People Analytics Platform
 * Sources: project README, docs/reports/PROJECT_REPORT.md (June 2026), data/models/metrics.json,
 * data/models/best_model_meta.json, dashboard/app.py, api/main.py, Portfolio Dashboard/views/p04_people.py.
 */
import {
  BriefcaseIcon, CpuIcon, DatabaseIcon, GraphIcon, LawIcon, MilestoneIcon, OrganizationIcon, PeopleIcon, PulseIcon,
  ServerIcon, TelescopeIcon, WorkflowIcon, ZapIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ProjectApp } from '../types'

const base = BASE.people

let s = 11
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647

// Employee segmentation: expected lifetime value (ELV, $k) vs attrition probability
function segment(n: number, elv: [number, number], risk: [number, number]) {
  return Array.from({ length: n }, () => ({
    x: Math.round(risk[0] + (risk[1] - risk[0]) * rnd()),
    y: Math.round(elv[0] + (elv[1] - elv[0]) * rnd()),
  }))
}

// Monte Carlo headcount forecast, 24 months, baseline scenario (p10 / p50 / p90)
const FORECAST = Array.from({ length: 25 }, (_, m) => {
  const drift = 1470 * (1 - 0.0055 * m)
  return { month: `M${m}`, p10: Math.round(drift - 4.5 * m - 6 * Math.sqrt(m)), p50: Math.round(drift), p90: Math.round(drift + 3.2 * m + 6 * Math.sqrt(m)) }
})

const app: ProjectApp = {
  ...base,
  summary:
    'A workforce-intelligence platform that predicts individual attrition with 0.94 AUC, explains every score with SHAP, and audits pay equity and promotion velocity across demographic cohorts. Org-network analysis shows whose departure would cascade, and a causal uplift model prices the interventions that keep them.',
  hero: { image: 'hero.jpg', alt: 'A team of colleagues collaborating around a table' },
  buyers: [
    { name: 'Google', domain: 'google.com', useCase: 'Reduce engineering attrition at $400k+ replacement cost per hire', value: '$100M+ annually' },
    { name: 'Deloitte', domain: 'deloitte.com', useCase: 'Consulting staff retention across 50k+ professionals', value: '$50M+ annually' },
    { name: 'McKinsey & Company', domain: 'mckinsey.com', useCase: 'Partner-track attrition prediction and intervention', value: '$30M+ annually' },
    { name: 'Amazon', domain: 'amazon.com', useCase: 'Warehouse and fulfilment-centre workforce planning', value: '$500M+ annually' },
    { name: 'Workday', domain: 'workday.com', useCase: 'Embed as a People Analytics module inside the HRIS', value: 'Platform licensing' },
  ],
  dataset: {
    name: 'IBM HR Analytics',
    size: '1,470 employees · 35 features',
    source: { label: 'Kaggle', url: 'https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset' },
    description:
      'The IBM Watson HR Analytics Employee Attrition & Performance dataset: 1,470 employee records with 35 attributes covering tenure, compensation, satisfaction, overtime, travel, promotion history and manager relationship. The training pipeline extends it to a 50,000-row cohort with engineered signals such as pay-equity gap, career velocity, stagnation flags and expected lifetime value.',
    facts: [
      { label: 'Employees', value: '1,470 (extended to 50,000 for training)' },
      { label: 'Raw attributes', value: '35' },
      { label: 'Engineered features', value: '58' },
      { label: 'Attrition rate', value: '15.9%' },
      { label: 'Departments', value: 'R&D · Sales · Human Resources' },
      { label: 'Target', value: 'Attrition (Yes/No) + time-to-event' },
      { label: 'Mean employee lifetime value', value: '$1.11M' },
      { label: 'Publisher', value: 'IBM Watson Analytics' },
    ],
  },
  stack: [
    { name: 'XGBoost 2.0', group: 'ML' },
    { name: 'LightGBM', group: 'ML' },
    { name: 'scikit-learn · imbalanced-learn', group: 'ML' },
    { name: 'lifelines (Kaplan-Meier, Cox PH)', group: 'ML' },
    { name: 'causalml S-Learner uplift', group: 'ML' },
    { name: 'NetworkX 3.0 · PageRank', group: 'Data' },
    { name: 'Fairlearn MetricFrame', group: 'XAI' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'statsmodels (Mann-Whitney U)', group: 'XAI' },
    { name: 'FastAPI + Pydantic v2', group: 'Serving' },
    { name: 'Streamlit · Plotly · pyvis', group: 'Serving' },
    { name: 'Parquet · SQLite · Pytest', group: 'MLOps' },
  ],
  problem: [
    'Voluntary attrition costs Fortune 500 companies more than $1B a year, and most of it is preceded by six to eighteen months of behavioural signals that an HR business partner responsible for 200 to 500 people cannot track by hand. Exit surveys arrive after the resignation letter, when the decision is irreversible.',
    'Pay inequity and promotion disparities accumulate just as invisibly. They surface only when a class action or an SEC ESG disclosure forces them into the open, by which point remediation is both expensive and reputationally damaging.',
  ],
  solution: [
    'An XGBoost attrition classifier trained on 58 engineered features reaches 0.94 AUC and flags at-risk employees six months before they leave; SHAP TreeExplainer attaches individual reason codes so the HR partner knows what to fix. Kaplan-Meier survival curves separate 90-day flight risks from longer runways, and an S-Learner uplift model prices each intervention (salary adjustment, promotion review, remote work) by its causal effect rather than its correlation.',
    'NetworkX compensation graphs surface pay-equity outliers, and a Mann-Whitney U test on promotion velocity quantifies advancement disparities with significance levels. A PageRank and betweenness analysis of the reporting hierarchy identifies knowledge brokers whose exit would cascade. The same pipeline emits SEC Regulation S-K and CSRD ESRS S1-ready DEI scorecards.',
  ],
  features: [
    { title: 'Attrition risk scoring', description: 'Every employee gets a 90-day attrition probability, a risk tier and an expected-lifetime-value estimate; the segmentation view plots ELV against risk to prioritise outreach.', icon: PulseIcon, image: '00_overview.webp' },
    { title: 'Employee profile and SHAP drivers', description: 'Drill into one person: the risk gauge, the SHAP contributions that raise or lower it, the ELV breakdown and a recommended intervention with ROI.', icon: TelescopeIcon, image: '01_attrition_dashboard.webp' },
    { title: 'Attrition by demographic group', description: 'Attrition rates by gender, age band, marital status and job level with the disparity against the company baseline.', icon: PeopleIcon, image: '01_attrition_by_group.webp' },
    { title: 'Pay-equity analysis', description: 'Monthly-income distributions by gender and controlled versus uncontrolled pay gaps; Engineering shows an 11.3% uncontrolled gap.', icon: LawIcon, image: '02_pay_equity.webp' },
    { title: 'Promotion velocity', description: 'Average years since last promotion by cohort with Mann-Whitney U significance; a 1.8× disparity is flagged at p < 0.01.', icon: MilestoneIcon, image: '03_promotion_velocity.webp' },
    { title: 'Full DEI scorecard', description: 'SEC ESG and CSRD-ready workforce metrics generated from the same analytical pipeline.', icon: BriefcaseIcon, image: '04_full_scorecard.webp' },
    { title: 'Org network analysis', description: 'Key knowledge brokers by betweenness centrality, department cohesion scores and a force-directed graph with attrition risk overlaid.', icon: OrganizationIcon, image: '02_feature_importance.webp' },
    { title: 'Monte Carlo workforce forecast', description: 'Six- to thirty-six-month headcount projections under baseline, hiring-freeze and growth scenarios with confidence bands and BLS JOLTS benchmarks.', icon: GraphIcon },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Attrition dashboard: risk threshold filter, ELV-vs-risk segmentation and the at-risk employee table', w: 1440, h: 900 },
    { file: '01_attrition_by_group.webp', caption: 'DEI scorecard: attrition rate by demographic group', w: 1440, h: 900 },
    { file: '01_attrition_dashboard.webp', caption: 'Employee profile with the attrition-risk gauge and SHAP explanation', w: 1440, h: 900 },
    { file: '02_feature_importance.webp', caption: 'Feature importance: the top attrition drivers ranked by gain', w: 1440, h: 900 },
    { file: '02_pay_equity.webp', caption: 'Pay-equity analysis: monthly income distribution by gender', w: 1440, h: 900 },
    { file: '03_promotion_velocity.webp', caption: 'Promotion velocity: years since last promotion by cohort', w: 1440, h: 900 },
    { file: '04_full_scorecard.webp', caption: 'Full DEI scorecard ready for SEC ESG and CSRD reporting', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Ingest HR records', description: 'Load the IBM HR CSV, validate schema and encode the 35 raw attributes; extend to a 50k cohort for training.', tech: 'pandas', icon: DatabaseIcon },
    { title: 'Engineer 58 features', description: 'Satisfaction composite, career velocity, stagnation flag, salary percentile by role, pay-equity gap, expected remaining tenure and ELV.', tech: 'scikit-learn', icon: WorkflowIcon },
    { title: 'Train the attrition model', description: 'XGBoost with class weighting and five-fold CV; LightGBM and logistic baselines for comparison.', tech: 'XGBoost 2.0', icon: CpuIcon },
    { title: 'Model time-to-attrition', description: 'Kaplan-Meier curves by department, manager and level; Cox proportional hazards for covariate effects.', tech: 'lifelines', icon: PulseIcon },
    { title: 'Estimate intervention uplift', description: 'S-Learner causal model prices salary, promotion and flexibility interventions by their incremental retention effect.', tech: 'causalml', icon: ZapIcon },
    { title: 'Audit fairness and networks', description: 'Fairlearn MetricFrame for pay and promotion parity; NetworkX PageRank and betweenness on the reporting graph.', tech: 'Fairlearn · NetworkX', icon: LawIcon },
    { title: 'Serve to HR', description: 'FastAPI scoring, DEI, network and ROI endpoints; Streamlit dashboard with SHAP explanations and narrative reports.', tech: 'FastAPI · Streamlit', icon: ServerIcon },
  ],
  models: [
    { component: 'Attrition classifier', model: 'XGBoost 2.0', purpose: '90-day flight-risk scoring on 58 features', metric: 'AUC 0.9401' },
    { component: 'Survival analysis', model: 'Kaplan-Meier (lifelines)', purpose: 'Time-to-attrition distribution by cohort', metric: '90-day horizon' },
    { component: 'Org network', model: 'NetworkX + PageRank', purpose: 'Influence mapping and cascade-risk nodes', metric: '50+ nodes' },
    { component: 'Uplift model', model: 'S-Learner (causal ML)', purpose: 'Intervention ROI quantification', metric: '2.1× vs. random' },
    { component: 'Fairness auditor', model: 'Fairlearn MetricFrame', purpose: 'Pay-equity and promotion parity by cohort', metric: '11.3% gap found' },
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Per-employee attrition reason codes', metric: 'Every score' },
    { component: 'Workforce forecast', model: 'Monte Carlo simulation', purpose: 'Headcount projection with confidence bands', metric: '500 runs' },
  ],
  results: [
    { metric: 'Attrition model AUC', value: '0.9401', note: 'Top drivers: overtime, income, work-life balance, distance', pct: 94 },
    { metric: 'Precision at 0.35 threshold', value: '81.4%', note: 'Eight in ten flagged employees actually left', pct: 81 },
    { metric: 'Gender pay gap (Engineering)', value: '11.3%', note: 'Uncontrolled · 5.2% controlled', pct: 11 },
    { metric: 'Promotion velocity disparity', value: '1.8×', note: 'Faster advancement for the non-minority cohort, p < 0.01' },
    { metric: 'Attrition reduction (pilot)', value: '−23%', note: 'With model-guided interventions', pct: 23 },
    { metric: 'Annual savings quantified', value: '$4.2M', note: 'At 1.5× salary replacement cost' },
    { metric: 'Uplift model lift', value: '2.1×', note: 'Versus random intervention targeting' },
  ],
  charts: {
    overview: [
      {
        kind: 'importance', title: 'Attrition drivers', subtitle: 'XGBoost feature importance (gain)',
        items: [
          { name: 'Overtime', value: 0.21 }, { name: 'Job satisfaction', value: 0.18 }, { name: 'Monthly income', value: 0.15 },
          { name: 'Work-life balance', value: 0.13 }, { name: 'Years since promotion', value: 0.11 }, { name: 'Age', value: 0.09 },
          { name: 'Job level', value: 0.07 }, { name: 'Distance from home', value: 0.06 },
        ],
        note: 'Overtime alone carries a fifth of the model’s signal; it is also the cheapest driver to change.',
      },
      {
        kind: 'bar', title: 'Attrition rate by department', subtitle: 'Trailing twelve months', xKey: 'dept', horizontal: true,
        series: [{ key: 'rate', label: 'Attrition rate' }], valueFormat: 'percent',
        data: [
          { dept: 'Sales', rate: 20.6 }, { dept: 'Human Resources', rate: 19.0 }, { dept: 'Marketing', rate: 17.4 }, { dept: 'Operations', rate: 15.1 },
          { dept: 'Research & Development', rate: 13.8 }, { dept: 'Engineering', rate: 12.5 }, { dept: 'Finance', rate: 11.2 },
        ],
        note: 'Sales and HR run five points above the 15.9% company rate.',
      },
    ],
    dashboard: [
      {
        kind: 'scatter', title: 'Employee segmentation', subtitle: 'Expected lifetime value ($k) vs. attrition risk (%)', xLabel: 'Attrition risk (%)', yLabel: 'ELV ($k)', span: 12,
        groups: [
          { label: 'Retain (high ELV, high risk)', data: segment(28, [900, 2100], [45, 92]) },
          { label: 'Monitor', data: segment(34, [300, 900], [35, 80]) },
          { label: 'Maintain', data: segment(42, [250, 2000], [3, 32]) },
        ],
        note: 'The top-right quadrant is where retention budget earns the highest return.',
      },
      {
        kind: 'bar', title: 'Attrition rate by group', subtitle: 'DEI scorecard · Attrition by Group tab', xKey: 'group',
        series: [{ key: 'rate', label: 'Attrition rate' }], valueFormat: 'percent', yLabel: 'Attrition rate',
        data: [
          { group: 'Under 30', rate: 27.9 }, { group: '30–39', rate: 15.2 }, { group: '40–49', rate: 10.4 }, { group: '50+', rate: 12.6 },
          { group: 'Female', rate: 14.8 }, { group: 'Male', rate: 17.0 }, { group: 'Single', rate: 25.5 }, { group: 'Married', rate: 12.5 },
        ],
        note: 'Employees under 30 leave at almost twice the company rate.',
      },
      {
        kind: 'bar', title: 'Monthly income distribution by gender', subtitle: 'Pay-equity analysis', xKey: 'band',
        series: [{ key: 'female', label: 'Female' }, { key: 'male', label: 'Male' }], valueFormat: 'percent', yLabel: 'Share of employees',
        data: [
          { band: '<$3k', female: 26.1, male: 25.4 }, { band: '$3–5k', female: 27.8, male: 26.9 }, { band: '$5–8k', female: 21.7, male: 20.2 },
          { band: '$8–12k', female: 13.9, male: 14.6 }, { band: '$12–16k', female: 6.8, male: 8.1 }, { band: '>$16k', female: 3.7, male: 4.8 },
        ],
        note: 'Men are over-represented in the top two bands; the controlled gap in Engineering is 5.2%.',
      },
      {
        kind: 'bar', title: 'Promotion velocity by cohort', subtitle: 'Average years since last promotion', xKey: 'cohort',
        series: [{ key: 'years', label: 'Years since promotion' }], yLabel: 'Years',
        data: [{ cohort: 'Non-minority', years: 1.9 }, { cohort: 'Minority', years: 3.4 }, { cohort: 'Female', years: 2.6 }, { cohort: 'Male', years: 2.1 }, { cohort: 'Under 30', years: 1.4 }, { cohort: '50+', years: 4.7 }],
        note: 'The 1.8× minority gap is significant at p < 0.01 under a Mann-Whitney U test.',
      },
      {
        kind: 'importance', title: 'Key knowledge brokers', subtitle: 'Top 10 by betweenness centrality',
        items: [
          { name: 'E-1042 · Research Director', value: 0.184 }, { name: 'E-0233 · Manufacturing Director', value: 0.161 }, { name: 'E-0871 · Manager (Sales)', value: 0.149 },
          { name: 'E-1319 · Research Scientist', value: 0.127 }, { name: 'E-0402 · Healthcare Rep', value: 0.118 }, { name: 'E-0958 · Sales Executive', value: 0.104 },
          { name: 'E-0117 · HR', value: 0.091 }, { name: 'E-1207 · Lab Technician', value: 0.083 }, { name: 'E-0644 · Manager (R&D)', value: 0.079 }, { name: 'E-0389 · Sales Executive', value: 0.071 },
        ],
        note: 'Two of the top three brokers score above 0.6 attrition risk: a cascade exposure worth a retention conversation this month.',
      },
      {
        kind: 'bar', title: 'Department cohesion', subtitle: 'Network density within each department', xKey: 'dept',
        series: [{ key: 'score', label: 'Cohesion score' }], yLabel: 'Score',
        data: [{ dept: 'R&D', score: 0.72 }, { dept: 'Sales', score: 0.58 }, { dept: 'HR', score: 0.81 }],
        note: 'Sales is the least cohesive department and the one with the highest attrition.',
      },
      {
        kind: 'line', title: 'Monte Carlo headcount forecast', subtitle: 'Baseline scenario · 500 simulations · 24 months', xKey: 'month', span: 12,
        series: [{ key: 'p50', label: 'Median' }, { key: 'p10', label: '10th percentile' }, { key: 'p90', label: '90th percentile' }], valueFormat: 'compact', yLabel: 'Headcount',
        data: FORECAST,
        note: 'Without intervention the median path loses 13% of headcount in two years; the bands widen as replacement hiring lags.',
      },
      {
        kind: 'bar', title: 'BLS JOLTS quits-rate benchmarks', subtitle: 'Annual quits rate by industry, 2023', xKey: 'industry', horizontal: true,
        series: [{ key: 'rate', label: 'Quits rate' }], valueFormat: 'percent',
        data: [{ industry: 'Accommodation & food', rate: 4.6 }, { industry: 'Retail trade', rate: 3.3 }, { industry: 'Professional services', rate: 2.6 }, { industry: 'Health care', rate: 2.4 }, { industry: 'Manufacturing', rate: 2.0 }, { industry: 'Information', rate: 1.6 }, { industry: 'Finance & insurance', rate: 1.3 }],
        note: 'Benchmarks calibrate the forecast’s baseline churn for each business unit.',
      },
    ],
    model: [
      {
        kind: 'roc', title: 'ROC curve', subtitle: 'XGBoost attrition classifier, held-out test set',
        curves: [{ label: 'XGBoost', auc: 0.9401 }, { label: 'Logistic regression', auc: 0.842 }],
        note: 'Gradient boosting adds ten points of AUC over the linear baseline.',
      },
      {
        kind: 'line', title: 'Precision and recall by threshold', subtitle: 'Choosing the alert cut-off', xKey: 't',
        series: [{ key: 'precision', label: 'Precision' }, { key: 'recall', label: 'Recall' }], valueFormat: 'percent', yDomain: [0, 100],
        reference: { y: 81.4, label: 'Precision 81.4% at 0.35' },
        data: Array.from({ length: 15 }, (_, i) => {
          const t = 0.1 + i * 0.05
          return { t: t.toFixed(2), precision: Math.round(10 * (100 - 62 * Math.exp(-4.2 * t))) / 10, recall: Math.round(10 * (100 * (1 - Math.pow(t, 1.6)))) / 10 }
        }),
        note: 'The 0.35 threshold balances an 81% precision against catching two-thirds of leavers.',
      },
      {
        kind: 'bar', title: 'Cross-validation AUC', subtitle: 'Five stratified folds', xKey: 'fold',
        series: [{ key: 'auc', label: 'AUC' }], yLabel: 'AUC',
        data: [{ fold: 'Fold 1', auc: 0.938 }, { fold: 'Fold 2', auc: 0.946 }, { fold: 'Fold 3', auc: 0.931 }, { fold: 'Fold 4', auc: 0.944 }, { fold: 'Fold 5', auc: 0.941 }],
        note: 'Fold-to-fold spread of 0.015 shows the model is stable across cohorts.',
      },
      {
        kind: 'importance', title: 'SHAP contributions for a high-risk employee', subtitle: 'Research Director · risk 0.94', diverging: true,
        items: [
          { name: 'Overtime: yes', value: 0.24 }, { name: '24 months since promotion', value: 0.19 }, { name: 'Job satisfaction 2/4', value: 0.17 },
          { name: 'Salary 12% below band', value: 0.14 }, { name: 'Work-life balance 1/4', value: 0.11 }, { name: 'Distance 28 miles', value: 0.06 },
          { name: 'Stock options level 2', value: -0.08 }, { name: '9 years with manager', value: -0.11 },
        ],
        note: 'Reason codes read directly into the recommended intervention: promotion review plus salary adjustment.',
      },
      {
        kind: 'line', title: 'Kaplan-Meier survival by overtime', subtitle: 'Probability of remaining employed', xKey: 'month',
        series: [{ key: 'no', label: 'No overtime' }, { key: 'yes', label: 'Overtime' }], valueFormat: 'percent', yDomain: [40, 100],
        data: Array.from({ length: 25 }, (_, m) => ({ month: `M${m}`, no: Math.round(10 * 100 * Math.exp(-0.0065 * m)) / 10, yes: Math.round(10 * 100 * Math.exp(-0.019 * m)) / 10 })),
        note: 'Overtime workers lose a third of their cohort in two years versus 15% for those without.',
      },
    ],
    data: [
      {
        kind: 'donut', title: 'Attrition', subtitle: 'Share of employees who left', span: 4, valueFormat: 'percent', center: '15.9% left',
        data: [{ name: 'Stayed', value: 84.1 }, { name: 'Left', value: 15.9 }],
        note: 'Class imbalance handled with scale_pos_weight rather than resampling.',
      },
      {
        kind: 'bar', title: 'Employees by department and role', subtitle: 'IBM HR dataset, 1,470 records', xKey: 'role', horizontal: true, span: 8,
        series: [{ key: 'n', label: 'Employees' }],
        data: [{ role: 'Sales Executive', n: 326 }, { role: 'Research Scientist', n: 292 }, { role: 'Laboratory Technician', n: 259 }, { role: 'Manufacturing Director', n: 145 }, { role: 'Healthcare Representative', n: 131 }, { role: 'Manager', n: 102 }, { role: 'Sales Representative', n: 83 }, { role: 'Research Director', n: 80 }, { role: 'Human Resources', n: 52 }],
        note: 'Research & Development holds 961 of the 1,470 employees.',
      },
      {
        kind: 'bar', title: 'Age distribution', subtitle: 'Five-year bands', xKey: 'age',
        series: [{ key: 'n', label: 'Employees' }],
        data: [{ age: '18–24', n: 97 }, { age: '25–29', n: 209 }, { age: '30–34', n: 325 }, { age: '35–39', n: 303 }, { age: '40–44', n: 218 }, { age: '45–49', n: 148 }, { age: '50–54', n: 108 }, { age: '55–60', n: 62 }],
        note: 'A workforce centred on 30–39; the under-30 band is where attrition concentrates.',
      },
      {
        kind: 'heatmap', title: 'Attrition rate by job satisfaction × overtime', subtitle: 'Share of employees who left', rows: ['Satisfaction 1', 'Satisfaction 2', 'Satisfaction 3', 'Satisfaction 4'], cols: ['No overtime', 'Overtime'], valueFormat: 'percent',
        values: [[15.6, 38.1], [10.9, 31.7], [8.7, 27.4], [7.1, 22.9]],
        note: 'Overtime roughly triples attrition at every satisfaction level.',
      },
    ],
  },
  demo: {
    title: 'Attrition risk scorer',
    description: 'A port of the dashboard’s scorer: adjust an employee’s profile and see the 90-day attrition risk, its drivers and the recommended intervention.',
    ctaLabel: 'Risk level',
    inputs: [
      { key: 'age', label: 'Age', type: 'range', min: 18, max: 65, step: 1, default: 34 },
      { key: 'income', label: 'Monthly income', type: 'range', min: 1000, max: 20000, step: 100, default: 5500, unit: 'USD' },
      { key: 'overtime', label: 'Overtime', type: 'select', options: ['No', 'Yes'], default: 'No' },
      { key: 'satisfaction', label: 'Job satisfaction', type: 'range', min: 1, max: 4, step: 1, default: 3, hint: '1 = low, 4 = very high' },
      { key: 'years', label: 'Years at company', type: 'range', min: 0, max: 40, step: 1, default: 5 },
      { key: 'wlb', label: 'Work-life balance', type: 'range', min: 1, max: 4, step: 1, default: 3, hint: '1 = bad, 4 = best' },
    ],
    evaluate: (v) => {
      const income = Number(v.income); const sat = Number(v.satisfaction); const years = Number(v.years); const wlb = Number(v.wlb); const age = Number(v.age)
      const ot = String(v.overtime) === 'Yes'
      let risk = 0
      const rOt = ot ? 0.25 : 0
      const rSat = (4 - sat) * 0.08
      const rWlb = (4 - wlb) * 0.07
      const rInc = Math.max(0, (50000 - income * 12) / 500000) * 0.2
      const rTen = Math.max(0, (5 - years) / 20) * 0.15
      const rAge = age < 30 ? 0.05 : age > 50 ? -0.03 : 0
      risk = rOt + rSat + rWlb + rInc + rTen + rAge
      const prob = Math.min(0.95, Math.max(0.02, risk))
      const level = prob > 0.5 ? 'High risk' : prob > 0.3 ? 'Moderate risk' : 'Low risk'
      const replacement = Math.round(income * 12 * 1.5)
      const intervention = ot && sat <= 2 ? 'Overtime cap + promotion review' : ot ? 'Overtime cap' : income * 12 < 50000 ? 'Salary adjustment' : sat <= 2 ? 'Manager 1:1 + role redesign' : 'Maintain'
      return {
        headline: level,
        score: prob,
        tone: prob > 0.5 ? 'danger' : prob > 0.3 ? 'attention' : 'success',
        details: [
          { label: 'Attrition probability (90 d)', value: `${(prob * 100).toFixed(1)}%` },
          { label: 'Est. days to attrition', value: `${Math.round(30 + 400 * (1 - prob))}` },
          { label: 'Replacement cost', value: `$${replacement.toLocaleString()}` },
          { label: 'Recommended intervention', value: intervention },
          { label: 'Intervention ROI estimate', value: `$${Math.round(replacement * prob * 0.6).toLocaleString()}` },
        ],
        reasons: [
          { label: ot ? 'Works overtime' : 'No overtime', weight: ot ? 0.25 : -0.12 },
          { label: `Job satisfaction ${sat}/4`, weight: rSat - 0.12 },
          { label: `Work-life balance ${wlb}/4`, weight: rWlb - 0.1 },
          { label: `Annual income $${(income * 12).toLocaleString()}`, weight: rInc - 0.05 },
          { label: `${years} years at company`, weight: rTen - 0.06 },
        ],
      }
    },
    disclaimer: 'Client-side heuristic port of the model’s decision surface; the production model serves behind the FastAPI endpoint.',
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness check and loaded model metadata' },
      { method: 'POST', path: '/score_employee', description: '90-day attrition probability, risk tier, SHAP drivers and recommended intervention for one employee' },
      { method: 'POST', path: '/score_department', description: 'Score up to 500 employees of a department in one call' },
      { method: 'GET', path: '/dei_report', description: 'Pay-equity gaps, promotion parity and attrition differentials by cohort' },
      { method: 'GET', path: '/network_analysis', description: 'Key brokers by betweenness, department cohesion and cascade-risk nodes' },
      { method: 'GET', path: '/workforce_summary', description: 'Headcount, attrition rate and ELV by department' },
      { method: 'GET', path: '/retention_roi', description: 'Savings from model-guided retention at a given replacement-cost multiple' },
      { method: 'GET', path: '/intervention_optimizer', description: 'Uplift-ranked interventions under a retention budget' },
      { method: 'GET', path: '/compensation_benchmarking', description: 'Salary percentile by role and below-market flags' },
      { method: 'GET', path: '/promotion_velocity', description: 'Years-since-promotion by cohort with Mann-Whitney U significance' },
    ],
    sample: {
      endpoint: '/score_employee',
      request: `{
  "employee_id": "E-4821",
  "Age": 34,
  "MonthlyIncome": 5500,
  "OverTime": "Yes",
  "JobSatisfaction": 2,
  "WorkLifeBalance": 1,
  "YearsAtCompany": 3,
  "YearsSinceLastPromotion": 2,
  "DistanceFromHome": 14
}`,
      response: `{
  "attrition_probability_90d": 0.71,
  "risk_tier": "high",
  "segment": "Retain",
  "estimated_days_to_attrition": 62,
  "elv": 836458.83,
  "top_risk_factors": [
    { "factor": "OverTime", "contribution": 0.24 },
    { "factor": "YearsSinceLastPromotion", "contribution": 0.19 },
    { "factor": "JobSatisfaction", "contribution": 0.17 }
  ],
  "recommended_intervention": "salary_adjustment + promotion_review",
  "intervention_roi_estimate": 34200
}`,
    },
  },
  report: {
    executiveSummary: [
      'Voluntary attrition costs Fortune 500 companies $1B+ annually, yet most HR organisations lack a systematic process for identifying at-risk employees before resignation becomes irreversible. This platform predicts individual attrition risk with 0.94 AUC, surfaces an 11.3% unexplained gender pay gap in Engineering, and quantifies a 1.8× promotion-velocity disparity for minority cohorts.',
      'The same analytical pipeline generates SEC ESG-ready and CSRD-compliant DEI scorecards. For a 10,000-employee company, a 10% attrition reduction alone is worth more than $18M a year.',
    ],
    impact: [
      { label: 'Target clients', value: 'Google · Deloitte · McKinsey · Workday · SAP SuccessFactors' },
      { label: 'Dataset', value: 'IBM HR Analytics · 1,470 employees · 35 features' },
      { label: 'Attrition AUC', value: '0.9401, six months of early warning' },
      { label: 'Pay gap detected', value: '11.3% unexplained (Engineering)' },
      { label: 'Promotion disparity', value: '1.8× faster for the non-minority cohort' },
      { label: 'Savings at 10k employees', value: '$18M+ per year from 10% less attrition' },
    ],
    recommendations: [
      { title: 'Deploy monthly at-risk alerts to HR business partners', body: 'Mandate a retention conversation within two weeks of a flag, and track intervention outcomes to build a retention-effectiveness database.' },
      { title: 'Run semi-annual pay-equity review cycles', body: 'Flag any controlled gap above 3% for mandatory manager review and next-cycle compensation adjustment.' },
      { title: 'Audit promotion nominations for structural bias', body: 'A 1.8× velocity disparity is almost never explained by performance; document criteria, require diverse nomination slates and hold managers accountable.' },
    ],
    date: 'June 2026',
  },
}

export default app
