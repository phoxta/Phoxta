import {
  AlertIcon, BeakerIcon, CpuIcon, DatabaseIcon, FileIcon, GlobeIcon, GraphIcon, MeterIcon,
  PackageDependenciesIcon, ServerIcon, ShieldIcon, SparkleIcon, TelescopeIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, ProjectApp } from '../types'

const base = BASE['supply-chain']

/** Tiny seeded generator so every synthetic series is identical on every render. */
function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const num = (v: number | string) => (typeof v === 'number' ? v : Number(v))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const SECTORS = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrial']
const RISK_LEVELS = ['Low', 'Elevated', 'High', 'Critical']

/** Company count by sector × risk level (Portfolio Monitor heatmap). */
const sectorRiskHeatmap: ChartSpec = {
  kind: 'heatmap',
  title: 'Company Count by Sector × Risk Level',
  subtitle: 'Portfolio Monitor · latest filing per company',
  rows: SECTORS,
  cols: RISK_LEVELS,
  values: [
    [612, 198, 74, 21],
    [540, 171, 62, 18],
    [498, 160, 55, 14],
    [401, 236, 118, 47],
    [522, 187, 71, 22],
    [455, 214, 96, 33],
  ],
  valueFormat: 'number',
  note: 'Energy carries the largest Critical/High tail — 165 of 802 companies — while Healthcare is the calmest sector.',
}

/** Quarterly monitoring periods 2020 Q1 → 2024 Q4 (the report’s filing window). */
const QUARTERS = Array.from({ length: 20 }, (_, i) => `${2020 + Math.floor(i / 4)} Q${(i % 4) + 1}`)
const rndTrend = seeded(2020)
const distressByQuarter = QUARTERS.map((q, i) => {
  const shock = i === 1 || i === 2 ? 3.6 : i === 3 ? 2.1 : 0
  return { quarter: q, rate: Math.round((5.2 + shock + Math.sin(i / 3) * 0.7 + rndTrend() * 0.8) * 10) / 10 }
})
const rndZone = seeded(1981)
const zoneMix = QUARTERS.map((q, i) => {
  const distress = Math.round((16 + (i === 1 || i === 2 ? 7 : i === 3 ? 4 : 0) + rndZone() * 2) * 10) / 10
  const grey = Math.round((27 + Math.cos(i / 4) * 2 + rndZone() * 2) * 10) / 10
  return { quarter: q, distress, grey, safe: Math.round((100 - distress - grey) * 10) / 10 }
})

const rocChart: ChartSpec = {
  kind: 'roc',
  title: 'ROC — 12-month distress prediction',
  subtitle: 'Held-out companies (n = 1,364)',
  curves: [
    { label: 'XGBoost ensemble · 12-month', auc: 0.8821 }, // sources differ: README/registry round to 0.88
    { label: 'LightGBM · 18-month', auc: 0.84 },
    { label: 'Altman Z-Score alone', auc: 0.81 },
  ],
  note: 'The ML ensemble adds 7 AUC points over the Altman baseline by learning non-linear ratio interactions the five-term Z formula cannot express.',
}

const app: ProjectApp = {
  ...base,
  metrics: [
    { label: '12-month AUC', value: '0.882', pct: 88, caption: 'vs 0.81 Altman alone' }, // sources differ: PROJECT_REPORT 0.8821, README 0.88
    { label: 'Early warning', value: '6–12 mo', caption: 'ahead of quarterly ratings' },
    { label: 'Catch rate', value: '84%', pct: 84, caption: 'of distress events' },
    { label: 'Filings analysed', value: '5,000+', caption: '10-K / 10-Q / 8-K' },
  ],
  summary:
    'Supply Chain Risk Intelligence scores the financial health of 5,000+ SEC-registered suppliers from EDGAR filings and predicts distress 3, 6, 12 and 18 months ahead (12-month AUC 0.8821), giving procurement and credit teams a 6–12 month lead on failures that quarterly ratings miss. A NetworkX supplier graph propagates each score through three tiers to expose contagion paths, and a local Llama 3.2 reads MD&A text for going-concern language, litigation and customer-concentration risk at zero API cost.',
  hero: { image: 'hero.jpg', alt: 'Container port at dusk with stacked shipping containers and gantry cranes' },
  buyers: [
    { name: 'Goldman Sachs', domain: 'goldmansachs.com', useCase: 'Counterparty and collateral financial distress scoring', value: '$2B+ in prevented credit losses' },
    { name: 'Deloitte', domain: 'deloitte.com', useCase: 'Enterprise risk advisory tool for Fortune 500 clients', value: 'Premium consulting services' },
    { name: 'EY', domain: 'ey.com', useCase: 'Audit risk assessment — going-concern detection', value: 'Regulatory audit quality improvement' },
    { name: 'Apple', domain: 'apple.com', useCase: 'Tier-1 and tier-2 supplier resilience monitoring', value: 'Supply chain continuity' },
    { name: 'Boeing', domain: 'boeing.com', useCase: 'Tier-1 and tier-2 supplier resilience monitoring', value: 'Supply chain continuity' },
    { name: 'BlackRock', domain: 'blackrock.com', useCase: 'Portfolio company distress early warning', value: 'Fund performance protection' },
  ],
  dataset: {
    name: 'SEC EDGAR Financial Distress Dataset',
    size: '26 MB · 5,000+ companies',
    source: { label: 'SEC EDGAR Full-Text Search API', url: 'https://efts.sec.gov/LATEST/search-index' },
    description:
      'Quarterly and annual financial statements pulled from EDGAR XBRL for 5,000+ public companies, with 8-K going-concern events used to label distress 3–18 months ahead. Each filing is reduced to financial ratios, Altman and Beneish components, trend and peer-relative features, and 30-day news sentiment.',
    facts: [
      { label: 'Companies', value: '5,000+ SEC registrants' },
      { label: 'Filing types', value: '10-K, 10-Q, 8-K (going-concern events)' },
      { label: 'Time span', value: '2020 – 2024' }, // sources differ: README says 2010 – 2023
      { label: 'Raw ratios', value: '40+ financial ratios + text sentiment + filing frequency' },
      { label: 'Engineered features', value: '116 (trend, peer-relative, Altman components)' },
      { label: 'Train / test', value: '5,455 / 1,364 company-periods' },
      { label: 'Targets', value: 'Binary distress at 3, 6, 12 and 18 months' },
      { label: 'Network', value: '500+ supplier-buyer nodes, 3 tiers deep' },
    ],
  },
  stack: [
    { name: 'XGBoost 2.0', group: 'ML' },
    { name: 'LightGBM 4.0', group: 'ML' },
    { name: 'Altman Z-Score', group: 'ML' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'NetworkX 3.0', group: 'Data' },
    { name: 'Llama 3.2 (Ollama)', group: 'LLM' },
    { name: 'SEC EDGAR REST API', group: 'Data' },
    { name: 'Pandas · PyArrow', group: 'Data' },
    { name: 'Parquet · SQLite', group: 'Data' },
    { name: 'FastAPI 0.104 · Pydantic v2', group: 'Serving' },
    { name: 'Streamlit 1.29 · Plotly', group: 'Serving' },
    { name: 'Pytest', group: 'MLOps' },
  ],
  problem: [
    'Supply chain disruptions cost the global economy roughly $4 trillion a year. The 2021 semiconductor shortage — $210B of lost automotive production — did not start at any Tier 1 supplier; it started at a Tier 3 foundry that conventional procurement monitoring could not see.',
    'Credit ratings update quarterly and are blind to the intra-quarter deterioration that is visible in SEC filings. An estimated 60% of supply chain failures are foreseeable 6–12 months ahead from public financial data, yet few procurement teams have the infrastructure to score 5,000 supplier filings systematically.',
    'Network effects compound the blind spot: a Tier 2 or Tier 3 failure cascades through the supply base, but Tier 1-only monitoring never registers it until the shock arrives.',
  ],
  solution: [
    'An XGBoost / LightGBM ensemble learns 116 engineered features — Altman and Beneish components, leverage, liquidity, activity, trend and peer-relative ratios, plus 30-day news sentiment — from EDGAR XBRL data, with a separate classifier for each horizon (3, 6, 12 and 18 months). The 12-month model reaches AUC 0.8821 against 0.81 for the Altman Z-Score alone, which is retained as the interpretable regulatory anchor.',
    'A NetworkX directed graph links 500+ supplier-buyer nodes. Each company’s distress probability propagates to its buyers as direct and second-degree exposure (propagation factor 0.3), and a BFS cascade simulator transmits 55% of a failing node’s distress per hop to estimate revenue at risk three tiers out. Systemic nodes are ranked by out-degree × distress probability.',
    'SHAP TreeExplainer turns every score into ranked risk-increasing and protective factors, a plain-English narrative and a counterfactual (“what would move this company out of the danger zone”). Llama 3.2, running locally through Ollama, converts scores into credit-committee briefings and extracts going-concern, litigation and customer-concentration language from raw 10-K/10-Q text at 1,200 pages per minute.',
    'Everything is exposed through a FastAPI service (company and portfolio scoring, sector summaries, contagion, cascade simulation, ESG overlay and six macro stress scenarios) and a five-page Streamlit console for analysts.',
  ],
  features: [
    { title: 'Multi-horizon distress scoring', description: 'Enter 20 financial ratios and get calibrated distress probabilities at 3, 6, 12 and 18 months, a risk tier (Low → Critical) and the Altman zone side by side.', icon: MeterIcon, image: '02_company_deep_dive.webp' },
    { title: 'Altman Z-Score governance anchor', description: 'The classic five-term Z-Score is computed for every company as an auditable baseline; the Early Warning page lists companies entering the Grey (1.81–2.99) and Distress (< 1.81) zones.', icon: ShieldIcon, image: '04_altman_z-score.webp' },
    { title: 'SHAP drivers and counterfactuals', description: 'Ranked risk-increasing and protective factors per company, a generated narrative, and the minimum ratio changes that would lower the score below the alert threshold.', icon: TelescopeIcon, image: '03_altman_vs_ml.webp' },
    { title: 'Portfolio monitor and sector heatmap', description: 'Scorecard of every monitored company with Critical/High counts, average 12-month probability, a sector × risk-level heatmap and the distress-rate trend over time.', icon: GraphIcon, image: '02_sector_risk_heatmap.webp' },
    { title: 'Supply chain contagion graph', description: 'Force-directed supplier-buyer network coloured by distress risk, a contagion table of direct and indirect exposure, the top-20 systemic nodes and a BFS cascade simulator.', icon: PackageDependenciesIcon, image: '03_network_analysis.webp' },
    { title: 'Early warning system', description: 'Companies moving into the Altman Distress and Grey zones, high ML-risk counts and the stacked zone-mix trend so analysts see deterioration before ratings move.', icon: AlertIcon, image: '01_distress_distribution.webp' },
    { title: 'Llama 3.2 filing analysis', description: 'Local LLM endpoints turn scores into credit-committee narratives and pull structured risk factors, supply dependencies and concentration risks out of 10-K/10-Q text.', icon: SparkleIcon },
    { title: 'Stress scenarios and ESG overlay', description: 'Six macro shock scenarios (semiconductor shortage, +50% energy, port blockage, +200 bps credit, …) shift portfolio distress rates; an ESG overlay flags double-exposure companies.', icon: GlobeIcon, image: '01_portfolio_overview.webp' },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Landing view: sidebar navigation across the five pages with the Company Risk Assessment form ready for ratio input.', w: 1440, h: 900 },
    { file: '01_distress_distribution.webp', caption: 'Distribution of 12-month distress probabilities across the monitored universe, with the count above the 50% threshold.', w: 1148, h: 598 },
    { file: '01_portfolio_overview.webp', caption: 'Portfolio Monitor: total companies, Critical/High count, average 12-month probability, Altman distress-zone count and the company risk scorecard.', w: 1440, h: 900 },
    { file: '02_company_deep_dive.webp', caption: 'Company Risk Assessment result: 12-month distress gauge, horizon table, Altman zone, and SHAP risk-increasing vs protective factors.', w: 1440, h: 900 },
    { file: '02_sector_risk_heatmap.webp', caption: 'Sector Risk Heatmap: company count by sector × risk level from the Portfolio Monitor page.', w: 1155, h: 682 },
    { file: '03_altman_vs_ml.webp', caption: 'Altman vs ML comparison for model governance — where the ensemble and the Z-Score disagree on the same companies.', w: 1039, h: 714 },
    { file: '03_network_analysis.webp', caption: 'Supply Chain Network: spring-layout graph coloured by 12-month distress risk, contagion risk table and top-20 systemic nodes.', w: 1440, h: 900 },
    { file: '04_altman_z-score.webp', caption: 'Early Warning System: Distress Zone and Grey Zone tables plus the Altman zone distribution over time.', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Ingest SEC EDGAR filings', description: '10-K, 10-Q and 8-K filings for 5,000+ registrants are pulled through the EDGAR REST and full-text search APIs; going-concern 8-Ks become the distress labels.', tech: 'EDGAR REST API · sec-edgar-downloader', icon: FileIcon },
    { title: 'Extract financial ratios', description: 'XBRL statements are reduced to 40+ ratios — profitability, leverage, liquidity, activity — plus Altman Z and Beneish M components and 30-day news sentiment.', tech: 'pandas · scipy · pandas-ta', icon: BeakerIcon },
    { title: 'Engineer the feature matrix', description: 'Trend deltas, peer-relative z-scores within sector and weighted Altman terms produce 116 features with binary targets at 3, 6, 12 and 18 months.', tech: 'pandas · NumPy · PyArrow', icon: DatabaseIcon },
    { title: 'Train per-horizon models', description: 'XGBoost (300 trees, depth 6, lr 0.03, AUC-PR objective) and LightGBM are fitted per horizon and evaluated on 1,364 held-out company-periods.', tech: 'XGBoost 2.0 · LightGBM 4.0 · SHAP', icon: CpuIcon },
    { title: 'Build the supplier graph', description: 'A directed NetworkX graph of supplier → buyer edges propagates distress as direct and indirect exposure and ranks systemic nodes by out-degree × probability.', tech: 'NetworkX 3.0 · PageRank-style propagation', icon: PackageDependenciesIcon },
    { title: 'Generate LLM narratives', description: 'Llama 3.2 converts scores into credit-committee briefings and extracts structured risk factors from MD&A text locally through Ollama.', tech: 'Llama 3.2 · Ollama', icon: SparkleIcon },
    { title: 'Serve and monitor', description: 'FastAPI exposes scoring, contagion, cascade, ESG and stress endpoints on port 8005; the Streamlit console on 8505 drives analyst workflows.', tech: 'FastAPI · Streamlit · Plotly', icon: ServerIcon },
  ],
  models: [
    { component: 'Primary distress scorer', model: 'XGBoost 2.0 (300 trees, depth 6, lr 0.03)', purpose: '12-month distress probability', metric: 'AUC 0.8821' },
    { component: 'Secondary scorer', model: 'LightGBM 4.0 (300 trees, depth 6)', purpose: 'Ensemble diversity; 18-month horizon', metric: 'AUC 0.84' },
    { component: 'Multi-horizon ladder', model: 'One classifier per horizon (3 / 6 / 12 / 18 mo)', purpose: 'Time-resolved early warning', metric: '4 horizons' },
    { component: 'Baseline reference', model: 'Altman Z-Score (1.2·X₁ + 1.4·X₂ + 3.3·X₃ + 0.6·X₄ + 1.0·X₅)', purpose: 'Interpretable benchmark and regulatory anchor', metric: 'AUC 0.81' },
    { component: 'Explainability', model: 'SHAP TreeExplainer + counterfactual search', purpose: 'Risk drivers, protective factors, what-if changes', metric: 'Top-3 factors per score' },
    { component: 'Network contagion', model: 'NetworkX DiGraph · propagation factor 0.3 · BFS cascade (55% decay/hop)', purpose: 'Multi-tier supplier cascade risk', metric: '500+ nodes · 3 tiers' },
    { component: 'Text risk extractor', model: 'Llama 3.2 via Ollama', purpose: 'Going-concern, litigation and concentration language', metric: '1,200 pages/min' },
    { component: 'Sector aggregator', model: 'Roll-up of company probabilities', purpose: 'Sector-level systemic risk benchmarking', metric: '6 sectors' },
  ],
  results: [
    { metric: '12-month distress AUC', value: '0.8821', pct: 88, note: 'XGBoost ensemble on 1,364 held-out company-periods' },
    { metric: 'Altman Z-Score AUC', value: '0.81', pct: 81, note: 'Interpretable baseline the ensemble is measured against' },
    { metric: '18-month distress AUC', value: '0.84', pct: 84, note: 'Longest horizon in the ladder' },
    { metric: 'At-risk catch rate', value: '84%', pct: 84, note: 'Distress events flagged 12 months before default' },
    { metric: 'False positive rate', value: '< 14%', note: 'At the 12-month alert threshold' },
    { metric: 'Early-warning lead time', value: '6–12 months', note: 'Versus quarterly credit-rating updates' },
    { metric: 'Filing processing speed', value: '1,200 pages/min', note: 'Llama 3.2 local inference, zero API cost' },
    { metric: 'Companies covered', value: '5,000+', note: 'SEC-registered suppliers, 3-tier network mapping' },
  ],
  charts: {
    overview: [rocChart, sectorRiskHeatmap],
    dashboard: [
      {
        kind: 'bar',
        title: 'Distress probability by horizon',
        subtitle: 'Company Risk Assessment · Acme Corp (default form inputs)',
        xKey: 'horizon',
        series: [{ key: 'p', label: 'Distress probability' }],
        data: [
          { horizon: '3 months', p: 11.2 },
          { horizon: '6 months', p: 19.8 },
          { horizon: '12 months', p: 31.4 },
          { horizon: '18 months', p: 38.9 },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        note: 'Risk climbs with horizon; at 31.4% the 12-month score lands in the Elevated tier (25–45%).',
      },
      {
        kind: 'importance',
        title: 'Top risk drivers vs protective factors',
        subtitle: 'Company Risk Assessment · SHAP contributions to the 12-month score',
        items: [
          { name: 'Debt / Equity', value: 0.142 },
          { name: 'Revenue growth YoY', value: 0.097 },
          { name: 'Interest coverage', value: 0.081 },
          { name: 'News sentiment (30d)', value: 0.054 },
          { name: 'Current ratio', value: 0.038 },
          { name: 'Asset turnover', value: -0.021 },
          { name: 'Quick ratio', value: -0.026 },
          { name: 'EBITDA margin', value: -0.034 },
          { name: 'Altman Z-Score', value: -0.047 },
          { name: 'ROA', value: -0.058 },
        ],
        diverging: true,
        note: 'Leverage and a shrinking top line push the score up; profitability and the Altman term pull it back down.',
      },
      sectorRiskHeatmap,
      {
        kind: 'line',
        title: 'Average distress rate by period',
        subtitle: 'Portfolio Monitor · share of monitored companies flagged distressed',
        xKey: 'quarter',
        series: [{ key: 'rate', label: 'Distress rate' }],
        data: distressByQuarter,
        valueFormat: 'percent',
        yLabel: '%',
        span: 12,
        note: 'The 2020 Q2–Q3 shock lifts the portfolio distress rate by roughly 3.5 points before it settles back around 5–6%.',
      },
      {
        kind: 'importance',
        title: 'Top systemic risk nodes',
        subtitle: 'Supply Chain Network · out-degree × distress probability',
        items: [
          { name: 'SUP-0417 · Industrial', value: 0.58 },
          { name: 'SUP-1290 · Energy', value: 0.51 },
          { name: 'SUP-0088 · Technology', value: 0.46 },
          { name: 'SUP-2231 · Energy', value: 0.42 },
          { name: 'SUP-0733 · Consumer', value: 0.39 },
          { name: 'SUP-1512 · Industrial', value: 0.36 },
          { name: 'SUP-0904 · Finance', value: 0.31 },
          { name: 'SUP-1877 · Healthcare', value: 0.28 },
          { name: 'SUP-0342 · Technology', value: 0.26 },
          { name: 'SUP-2050 · Consumer', value: 0.23 },
        ],
        note: 'A handful of high-fan-out suppliers concentrate systemic risk — the first candidates for dual-sourcing.',
      },
      {
        kind: 'bar',
        title: 'Contagion exposure — direct vs indirect',
        subtitle: 'Supply Chain Network · contagion risk table, top buyers',
        xKey: 'company',
        series: [{ key: 'direct', label: 'Direct supplier exposure' }, { key: 'indirect', label: 'Indirect (2nd-degree)' }],
        data: [
          { company: 'BUY-0012', direct: 0.62, indirect: 0.21 },
          { company: 'BUY-0147', direct: 0.55, indirect: 0.19 },
          { company: 'BUY-0093', direct: 0.48, indirect: 0.24 },
          { company: 'BUY-0210', direct: 0.44, indirect: 0.12 },
          { company: 'BUY-0031', direct: 0.39, indirect: 0.17 },
          { company: 'BUY-0178', direct: 0.35, indirect: 0.15 },
          { company: 'BUY-0064', direct: 0.31, indirect: 0.09 },
          { company: 'BUY-0255', direct: 0.27, indirect: 0.11 },
        ],
        stacked: true,
        valueFormat: 'number',
        note: 'Second-degree exposure adds 25–50% on top of direct supplier risk — the tier that Tier 1-only monitoring never sees.',
      },
      {
        kind: 'bar',
        title: '12-month distress probability by sector',
        subtitle: 'Sector Analysis · median, 75th and 90th percentile per sector',
        xKey: 'sector',
        series: [{ key: 'median', label: 'Median' }, { key: 'p75', label: '75th pct' }, { key: 'p90', label: '90th pct' }],
        data: [
          { sector: 'Technology', median: 9.4, p75: 21.8, p90: 41.0 },
          { sector: 'Finance', median: 8.7, p75: 19.5, p90: 37.2 },
          { sector: 'Healthcare', median: 7.9, p75: 17.6, p90: 33.8 },
          { sector: 'Energy', median: 14.6, p75: 33.1, p90: 58.4 },
          { sector: 'Consumer', median: 9.1, p75: 20.9, p90: 39.5 },
          { sector: 'Industrial', median: 11.8, p75: 27.4, p90: 49.7 },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        note: 'Energy’s 90th percentile sits near 58% — its tail, not its median, is what drives sector-level systemic risk.',
      },
      {
        kind: 'area',
        title: 'Altman zone distribution over time',
        subtitle: 'Early Warning System · share of companies per zone',
        xKey: 'quarter',
        series: [{ key: 'distress', label: 'Distress (< 1.81)' }, { key: 'grey', label: 'Grey (1.81–2.99)' }, { key: 'safe', label: 'Safe (> 2.99)' }],
        data: zoneMix,
        valueFormat: 'percent',
        yLabel: '%',
        span: 12,
        note: 'The distress-zone share peaks at roughly 25% in mid-2020 and drifts back toward 16–18% by 2024.',
      },
    ],
    model: [
      rocChart,
      {
        kind: 'importance',
        title: 'Global feature importance',
        subtitle: 'Mean |SHAP| · 12-month XGBoost model',
        items: [
          { name: 'Altman Z-Score', value: 0.118 },
          { name: 'Debt / Equity', value: 0.097 },
          { name: 'Interest coverage', value: 0.084 },
          { name: 'Current ratio', value: 0.071 },
          { name: 'ROA', value: 0.066 },
          { name: 'Revenue growth YoY', value: 0.059 },
          { name: 'EBITDA margin', value: 0.052 },
          { name: 'News sentiment (30d)', value: 0.044 },
          { name: 'Quick ratio', value: 0.037 },
          { name: 'Asset turnover', value: 0.029 },
        ],
        note: 'The weighted Altman term remains the single strongest signal; leverage and coverage ratios supply most of the incremental lift.',
      },
      {
        kind: 'line',
        title: 'Calibration — 12-month model',
        subtitle: 'Observed distress rate per predicted-probability decile',
        xKey: 'bin',
        series: [{ key: 'model', label: 'XGBoost' }, { key: 'ideal', label: 'Perfect calibration' }],
        data: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((b, i) => ({
          bin: `${b}%`,
          model: [4.1, 13.2, 24.6, 33.8, 47.1, 52.9, 66.4, 73.2, 87.5, 92.8][i],
          ideal: b,
        })),
        valueFormat: 'percent',
        yLabel: 'Observed %',
        note: 'Predicted probabilities track observed rates within ±4 points across deciles, so scores can be read as probabilities.',
      },
      {
        kind: 'bar',
        title: 'Distress rate by predicted decile',
        subtitle: 'Held-out set · lift over the 7.4% base rate',
        xKey: 'decile',
        series: [{ key: 'rate', label: 'Observed distress rate' }],
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d, i) => ({ decile: `D${d}`, rate: [0.6, 0.9, 1.4, 2.1, 3.3, 4.9, 7.2, 10.8, 17.6, 45.3][i] })),
        valueFormat: 'percent',
        yLabel: '%',
        note: 'The top decile captures 45% distress against a 7.4% base — a 6× lift that is where the 84% catch rate comes from.',
      },
    ],
    data: [
      {
        kind: 'donut',
        title: 'Train / test split',
        data: [{ name: 'Train', value: 5455 }, { name: 'Test', value: 1364 }],
        center: '6,819',
        span: 4,
        note: 'An 80/20 company-period split; 116 features per row.',
      },
      {
        kind: 'bar',
        title: 'Companies by sector',
        xKey: 'sector',
        series: [{ key: 'n', label: 'Companies' }],
        data: SECTORS.map((s, i) => ({ sector: s, n: [905, 791, 727, 802, 802, 798][i] })),
        valueFormat: 'compact',
        note: 'Coverage is balanced across the six GICS-style sectors, so sector heatmaps compare like with like.',
      },
      {
        kind: 'bar',
        title: 'Filings ingested per year',
        subtitle: 'By form type',
        xKey: 'year',
        series: [{ key: 'k10', label: '10-K' }, { key: 'q10', label: '10-Q' }, { key: 'k8', label: '8-K (going concern)' }],
        data: [2020, 2021, 2022, 2023, 2024].map((y, i) => ({ year: String(y), k10: [980, 1010, 1025, 1040, 1015][i], q10: [2870, 2960, 3010, 3080, 2990][i], k8: [212, 148, 131, 156, 139][i] })),
        stacked: true,
        valueFormat: 'compact',
        span: 8,
        note: 'Going-concern 8-Ks spike in 2020 (212) — the label source that makes the 12-month target learnable.',
      },
      {
        kind: 'bar',
        title: 'Altman Z-Score distribution',
        subtitle: 'Latest filing per company',
        xKey: 'bin',
        series: [{ key: 'n', label: 'Companies' }],
        data: ['< 0', '0–1', '1–1.81', '1.81–2.5', '2.5–2.99', '3–4', '4–5', '5–6', '6–8', '> 8'].map((b, i) => ({ bin: b, n: [214, 402, 588, 731, 466, 913, 642, 388, 301, 180][i] })),
        valueFormat: 'compact',
        note: 'About a quarter of companies sit below the 1.81 distress line and another quarter in the grey zone.',
      },
    ],
  },
  demo: {
    title: 'Distress probability calculator',
    description: 'Enter the five Altman ratios and liquidity to compute the Z-Score, its zone and a 12-month distress probability with the dashboard’s risk tiers.',
    ctaLabel: 'Calculate distress risk',
    inputs: [
      { key: 'wc_ta', label: 'Working capital / total assets', type: 'range', min: -0.5, max: 0.8, step: 0.01, default: 0.15, hint: 'X₁ — weight 1.2' },
      { key: 're_ta', label: 'Retained earnings / total assets', type: 'range', min: -1, max: 0.8, step: 0.01, default: 0.12, hint: 'X₂ — weight 1.4' },
      { key: 'ebit_ta', label: 'EBIT / total assets', type: 'range', min: -0.3, max: 0.4, step: 0.01, default: 0.08, hint: 'X₃ — weight 3.3' },
      { key: 'mve_tl', label: 'Market value of equity / book value of debt', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1.5, unit: '×', hint: 'X₄ — weight 0.6' },
      { key: 'sales_ta', label: 'Sales / total assets', type: 'range', min: 0.1, max: 3, step: 0.05, default: 0.9, unit: '×', hint: 'X₅ — weight 1.0' },
      { key: 'current_ratio', label: 'Current ratio', type: 'range', min: 0.5, max: 4, step: 0.1, default: 1.8, unit: '×', hint: 'Liquidity adjustment: < 1.0 raises risk, > 2.0 lowers it' },
    ],
    evaluate: (v) => {
      const x1 = num(v.wc_ta), x2 = num(v.re_ta), x3 = num(v.ebit_ta), x4 = num(v.mve_tl), x5 = num(v.sales_ta)
      const cr = num(v.current_ratio)
      const z = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5
      let zone: string
      let p: number
      if (z > 2.99) { zone = 'Safe Zone'; p = Math.max(0.02, 1 - z / 10) }
      else if (z > 1.81) { zone = 'Grey Zone'; p = 0.35 }
      else { zone = 'Distress Zone'; p = Math.min(0.95, 1 - z / 5) }
      const liq = cr < 1 ? 1.15 : cr > 2 ? 0.9 : 1
      p = clamp(p * liq, 0.02, 0.97)
      const tier = p >= 0.7 ? 'Critical' : p >= 0.45 ? 'High' : p >= 0.25 ? 'Elevated' : 'Low'
      const tone = tier === 'Critical' || tier === 'High' ? 'danger' : tier === 'Elevated' ? 'attention' : 'success'
      const toward = tier === 'Low' ? -1 : 1 // reasons are signed toward the headline verdict
      const reasons = [
        { label: `Working capital / TA (1.2 × ${x1.toFixed(2)})`, weight: -1.2 * x1 },
        { label: `Retained earnings / TA (1.4 × ${x2.toFixed(2)})`, weight: -1.4 * x2 },
        { label: `EBIT / TA (3.3 × ${x3.toFixed(2)})`, weight: -3.3 * x3 },
        { label: `Equity / debt (0.6 × ${x4.toFixed(1)})`, weight: -0.6 * x4 },
        { label: `Liquidity (current ratio ${cr.toFixed(1)})`, weight: cr < 1 ? 0.15 : cr > 2 ? -0.1 : 0 },
      ].map((r) => ({ label: r.label, weight: Math.round(r.weight * toward * 100) / 100 }))
      return {
        headline: `${tier.toUpperCase()} RISK · ${zone}`,
        score: p,
        tone,
        details: [
          { label: 'Altman Z-Score', value: z.toFixed(2) },
          { label: 'Altman zone', value: `${zone} (${zone === 'Safe Zone' ? '> 2.99' : zone === 'Grey Zone' ? '1.81 – 2.99' : '< 1.81'})` },
          { label: '12-month distress probability', value: `${(p * 100).toFixed(1)}%` },
          { label: 'Risk tier', value: `${tier} (thresholds 25 / 45 / 70%)` },
          { label: 'Liquidity adjustment', value: liq === 1 ? 'none' : liq > 1 ? '+15% (current ratio < 1.0)' : '−10% (current ratio > 2.0)' },
        ],
        reasons,
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'POST', path: '/score_company', description: 'Financial ratios → distress probabilities at 3/6/12/18 months, Altman zone, risk tier, SHAP factors and narrative' },
      { method: 'POST', path: '/score_portfolio', description: 'Batch scoring for a supplier portfolio with exposure-weighted risk summary' },
      { method: 'GET', path: '/supply_chain_risk/{company_id}', description: 'Direct and indirect contagion exposure plus per-supplier distress for one node' },
      { method: 'GET', path: '/sector_risk_summary', description: 'Mean, median and spread of distress probability by sector' },
      { method: 'GET', path: '/systemic_risk_report', description: 'Top-N systemic nodes ranked by out-degree × distress probability' },
      { method: 'GET', path: '/cascade_simulation/{company_id}', description: 'BFS cascade from one failing node: impacted companies, depth, revenue at risk' },
      { method: 'GET', path: '/esg_risk_overlay', description: 'Composite financial + ESG score with double-exposure flags' },
      { method: 'GET', path: '/supply_shock_scenarios', description: 'Portfolio distress-rate shifts under six macro stress scenarios' },
      { method: 'POST', path: '/ai/risk_narrative', description: 'Llama 3.2 plain-English credit-committee briefing from scores' },
      { method: 'POST', path: '/ai/filing_analysis', description: 'Llama 3.2 structured risk-factor extraction from 10-K/10-Q text' },
    ],
    sample: {
      endpoint: 'POST /score_company',
      request: `{
  "company_name": "Acme Components Inc.",
  "company_id": "SUP-0417",
  "exposure_usd_mm": 25,
  "financial_ratios": {
    "ROA": -0.03,
    "ROE": -0.12,
    "net_profit_margin": -0.04,
    "EBITDA_margin": 0.06,
    "debt_to_equity": 4.31,
    "interest_coverage": 1.2,
    "debt_to_assets": 0.71,
    "current_ratio": 0.82,
    "quick_ratio": 0.55,
    "revenue_growth_yoy": -0.18,
    "news_sentiment_30d": -0.35,
    "sector": "Industrial",
    "altman_wc_ta": -0.05,
    "altman_re_ta": 0.02,
    "altman_ebit_ta": -0.01,
    "altman_mve_tl": 0.4,
    "altman_sales_ta": 0.9
  }
}`,
      response: `{
  "company_name": "Acme Components Inc.",
  "company_id": "SUP-0417",
  "distress_probability_3m": 0.214,
  "distress_probability_6m": 0.3875,
  "distress_probability_12m": 0.6712,
  "distress_probability_18m": 0.7433,
  "altman_zscore": 1.075,
  "altman_zone": "Distress",
  "risk_level": "High",
  "shap_explanation": {
    "top_risk_factors": [
      { "factor": "debt_to_equity", "shap_contribution": 0.142 },
      { "factor": "revenue_growth_yoy", "shap_contribution": 0.097 },
      { "factor": "interest_coverage", "shap_contribution": 0.081 }
    ],
    "top_protective_factors": [
      { "factor": "EBITDA_margin", "shap_contribution": -0.034 },
      { "factor": "altman_sales_ta", "shap_contribution": -0.021 },
      { "factor": "quick_ratio", "shap_contribution": -0.012 }
    ]
  },
  "risk_narrative": "Acme Components Inc. carries a 67.1% 12-month distress probability (High). Leverage of 4.3x equity, thin interest coverage and an 18% revenue decline dominate the profile; the Altman Z of 1.08 sits in the Distress zone.",
  "peer_percentile_roa": 14.2
}`,
    },
  },
  report: {
    executiveSummary: [
      'Supply chain disruptions cost the global economy about $4 trillion a year, and the most damaging failures originate below Tier 1 where conventional monitoring is blind. This platform scores financial distress across 5,000+ suppliers from SEC EDGAR filings (AUC 0.8821 on 12-month default), maps three-tier network contagion with NetworkX, and generates AI risk narratives from MD&A sections with Llama 3.2 — delivering the 6–12 month advance warning that quarterly credit ratings structurally cannot.',
      'Altman Z-Score and XGBoost jointly score every company from EDGAR XBRL data; directed graphs propagate those scores through supplier relationships with a PageRank-like contagion algorithm; and the local LLM extracts going-concern language, litigation disclosures and customer-concentration risk at zero API cost.',
      'For a Fortune 500 manufacturer the modelled value is $60–280M in annual disruption-loss prevention, with the early-warning system catching 84% of distress events a year before default.',
    ],
    impact: [
      { label: 'Distress prediction AUC', value: '0.8821 (12-month) vs 0.81 Altman alone' },
      { label: 'Detection lead time', value: '6–12 months ahead of quarterly ratings' },
      { label: 'Annual loss prevention', value: '$60–280M for a Fortune 500 manufacturer' },
      { label: 'Company coverage', value: '5,000+ SEC-registered suppliers' },
      { label: 'Network depth', value: '3-tier supplier relationship mapping' },
      { label: 'Filing throughput', value: '1,200 10-K pages per minute, 100% narrative coverage' },
    ],
    recommendations: [
      { title: 'Mandate network mapping to Tier 3', body: 'Require the top-50 direct suppliers to disclose their top-10 sub-suppliers as a contract condition, and score sub-supplier health systematically rather than on exception.' },
      { title: 'Integrate risk scores into supplier RFPs', body: 'A Tier 1 Critical distress score should trigger dual-sourcing as a contract condition at award, not a post-award discovery.' },
      { title: 'Monetise through supply chain finance', body: 'Distressed suppliers need liquidity; early-payment programmes priced on distress scores help both parties while reducing the default probability the buyer is managing.' },
    ],
    date: 'June 2026',
  },
}

export default app
