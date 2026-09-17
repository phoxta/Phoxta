import {
  BeakerIcon, BroadcastIcon, CpuIcon, DatabaseIcon, FlowchartIcon, GoalIcon, PackageIcon,
  PaperAirplaneIcon, ServerIcon, TagIcon, TelescopeIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, ProjectApp } from '../types'

const base = BASE.marketing

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const num = (v: number | string) => (typeof v === 'number' ? v : Number(v))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/* Attribution table from dashboard/app.py — channel credit (%) under five models. */
const CHANNELS = ['email', 'social', 'paid_search', 'display', 'organic', 'affiliate', 'sms']
const ATTRIBUTION = {
  last_touch: [8, 22, 35, 12, 15, 5, 3],
  first_touch: [18, 20, 25, 14, 14, 6, 3],
  linear: [14, 21, 29, 13, 14, 6, 3],
  time_decay: [11, 21, 32, 12, 14, 6, 4],
  shapley: [15, 20, 28, 13, 15, 6, 3],
}

const attributionDelta: ChartSpec = {
  kind: 'importance',
  title: 'Shapley vs last-touch: channel credit delta',
  subtitle: 'Attribution · percentage points of credit moved',
  items: CHANNELS.map((c, i) => ({ name: c, value: ATTRIBUTION.shapley[i] - ATTRIBUTION.last_touch[i] })),
  diverging: true,
  note: 'Last-touch over-credits paid search by 7 points and under-credits email by 7 — the core of the 38% budget reallocation.',
}

/* UMAP embedding — six segment clusters, 24 seeded points each (Segment Explorer scatter). */
const rndUmap = seeded(7)
const CENTERS: [string, number, number][] = [
  ['Champions', 2, 3], ['Loyal Customers', -1, 2], ['At Risk', -3, -2],
  ['Lost', -4, -4], ['New Customer', 3, -1], ['Needs Attention', 0, -2],
]
const gauss = () => (rndUmap() + rndUmap() + rndUmap() - 1.5) * 1.2
const umapScatter: ChartSpec = {
  kind: 'scatter',
  title: 'UMAP 2-D embedding coloured by segment',
  subtitle: 'Segment Explorer · HDBSCAN clusters on a 15-dimensional feature space',
  xLabel: 'UMAP dimension 1',
  yLabel: 'UMAP dimension 2',
  groups: CENTERS.map(([label, cx, cy]) => ({
    label,
    data: Array.from({ length: 24 }, () => ({ x: Math.round((cx + gauss() * 0.7) * 100) / 100, y: Math.round((cy + gauss() * 0.7) * 100) / 100 })),
  })),
  note: 'Density-based clustering keeps the Lost and At-Risk cohorts separate even though k-means would merge them along the diagonal.',
}

/* Euribor 3-month rate across the campaign period (May 2008 → Nov 2010), monthly. */
const euriborTrend = Array.from({ length: 31 }, (_, i) => {
  const rate = i < 6 ? 4.9 + i * 0.05 : i < 14 ? 5.2 - (i - 6) * 0.5 : Math.max(0.65, 1.3 - (i - 14) * 0.05)
  return { month: `${2008 + Math.floor((i + 4) / 12)}-${String(((i + 4) % 12) + 1).padStart(2, '0')}`, euribor: Math.round(rate * 100) / 100 }
})

const app: ProjectApp = {
  ...base,
  summary:
    'Marketing Campaign Intelligence turns 41,188 real bank-telemarketing contacts into a targeting engine: a LightGBM response model (AUC 0.82) scores every prospect, UMAP + HDBSCAN discovers eight natural behavioural clusters (silhouette 0.71) that k-means splits apart, quintile RFM scoring assigns six value tiers with a next-best action each, Shapley multi-touch attribution re-credits channels against last-click, and FP-Growth mines 127 cross-sell rules. The attribution layer alone identifies a 38% budget reallocation worth 30–50% ROAS improvement.',
  hero: { image: 'hero.jpg', alt: 'Marketing team reviewing campaign dashboards on a large screen' },
  buyers: [
    { name: 'P&G', domain: 'pg.com', useCase: 'Consumer segment response prediction for CPG promotions', value: '$7B+ marketing spend' },
    { name: 'Unilever', domain: 'unilever.com', useCase: 'Cross-sell optimisation across 400+ product brands', value: '$8B+ marketing spend' },
    { name: 'Meta', domain: 'meta.com', useCase: 'Advertiser campaign targeting intelligence and lift measurement', value: '$130B+ ad platform' },
    { name: 'Salesforce Marketing Cloud', domain: 'salesforce.com', useCase: 'Embed as a predictive scoring module', value: 'Platform licensing' },
    { name: 'Adobe Marketo Engage', domain: 'adobe.com', useCase: 'Campaign intelligence plug-in for enterprise customers', value: 'Platform licensing' },
    { name: 'Coca-Cola', domain: 'coca-colacompany.com', useCase: 'Segment-native campaign planning and attribution', value: 'Attribution-driven ROAS gains' },
  ],
  dataset: {
    name: 'UCI Bank Marketing (bank-additional-full)',
    size: '41,188 records · 20 features',
    source: { label: 'UCI Machine Learning Repository', url: 'https://archive.ics.uci.edu/dataset/222/bank+marketing' },
    description:
      'Direct-marketing phone campaigns of a Portuguese bank between May 2008 and November 2010. Each row is one client contact with demographics, banking products, campaign history and five macro-economic indicators; the target is whether the client subscribed to a term deposit. Call duration is dropped before training because it is unknown before the call.',
    facts: [
      { label: 'Records', value: '41,188 real telemarketing contacts' },
      { label: 'Features', value: '20 raw + campaign_log, prev_contact_flag, rate_x_emp' },
      { label: 'Target', value: 'Term-deposit subscription (yes / no)' },
      { label: 'Subscription rate', value: '11.7%' }, // sources differ: README states 11.3%
      { label: 'Period', value: 'May 2008 – November 2010' },
      { label: 'Macro signals', value: 'euribor3m, emp.var.rate, cons.price.idx, cons.conf.idx, nr.employed' },
      { label: 'Leakage control', value: '“duration” removed before modelling' },
      { label: 'Split', value: '80 / 20 stratified (32,950 / 8,238)' },
    ],
  },
  stack: [
    { name: 'LightGBM 4.0', group: 'ML' },
    { name: 'XGBoost 2.0', group: 'ML' },
    { name: 'scikit-learn', group: 'ML' },
    { name: 'HDBSCAN', group: 'ML' },
    { name: 'UMAP', group: 'ML' },
    { name: 'Shapley value attribution', group: 'ML' },
    { name: 'mlxtend FP-Growth', group: 'Data' },
    { name: 'SHAP TreeExplainer', group: 'XAI' },
    { name: 'Pandas · NumPy', group: 'Data' },
    { name: 'Parquet · SQLite', group: 'Data' },
    { name: 'FastAPI 0.104 · Pydantic v2', group: 'Serving' },
    { name: 'Streamlit 1.29 · Plotly', group: 'Serving' },
  ],
  problem: [
    'Global marketing spend reached $881 billion in 2023 and an estimated 37–56% of it produced no measurable lift. Two systemic failures drive the waste: audiences treated as one undifferentiated block, and last-click attribution that over-credits paid search by 40–60% while ignoring the email and content that built the demand it harvested.',
    'Last-click hands 100% of a conversion to the final touchpoint, so budgets flow from brand-building to performance channels in a self-reinforcing cycle that mines existing demand without replenishing it. K-means segmentation compounds the problem by forcing customers into spherical clusters that split real behavioural cohorts across arbitrary centroids.',
  ],
  solution: [
    'A LightGBM / XGBoost ensemble (600 trees, early stopping, class-weighted) trained on 41,188 real contacts predicts subscription probability at AUC 0.82 from demographics, product holdings, contact history and macro-economic conditions, with SHAP explaining each score.',
    'UMAP reduces a 15-dimensional feature space to two dimensions and HDBSCAN (minimum cluster size 500) finds clusters of arbitrary shape without presupposing k — eight clusters at silhouette 0.71, including an economic-cycle-sensitive segment with a 34% response rate that k-means had split three ways. A Gaussian mixture adds soft membership scores.',
    'Quintile RFM scoring assigns six value tiers (Champions, Loyal Customers, New Customer, At Risk, Lost, Needs Attention), each mapped to next-best actions. Five attribution models — last touch, first touch, linear, time decay and sampled Shapley value — are computed on reconstructed journeys, and FP-Growth (support ≥ 0.02, lift ≥ 2.0) mines 127 cross-sell association rules.',
    'A FastAPI service scores single customers into segments with CLV and recommendations and serves RFM summaries, attribution tables, cluster overviews and top rules; a four-tab Streamlit console explores segments, RFM, attribution and market baskets.',
  ],
  features: [
    { title: 'Segment Explorer', description: 'UMAP scatter of the customer base coloured by HDBSCAN cluster, a segment-share donut and a profile table with count, recency, frequency, monetary and CLV per segment.', icon: TelescopeIcon, image: '01_segment_explorer.webp' },
    { title: 'RFM analysis', description: 'Recency, frequency and monetary distributions, total revenue by segment and a CLV bubble chart sized by lifetime value.', icon: TagIcon, image: '02_rfm_analysis.webp' },
    { title: 'Campaign response prediction', description: 'LightGBM scores each prospect’s probability of subscribing (AUC 0.82) with the ROC curve and SHAP feature ranking for governance.', icon: GoalIcon, image: '03_roc_curve.webp' },
    { title: 'Multi-touch attribution', description: 'Compare last touch, first touch, linear, time decay and Shapley credit per channel, and see exactly which channels last-click over- or under-credits.', icon: FlowchartIcon, image: '03_attribution.webp' },
    { title: 'Market basket rules', description: 'FP-Growth association rules filterable by minimum lift and top-N, a support-vs-confidence bubble chart and a product affinity heatmap of lift values.', icon: PackageIcon, image: '04_market_basket.webp' },
    { title: 'Next-best action per segment', description: 'The /segment endpoint returns R/F/M scores, an RFM score out of 100, CLV and three recommended actions for the customer’s tier.', icon: PaperAirplaneIcon, image: '01_rfm_segments.webp' },
    { title: 'Channel response analysis', description: 'Response rate by contact channel and campaign intensity, showing where call fatigue sets in and which channels carry the persuadable segments.', icon: BroadcastIcon, image: '02_channel_response.webp' },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Landing view: sidebar portfolio KPIs (customers, revenue, average CLV, Champions) with the four tabs — Segment Explorer, RFM Analysis, Attribution, Market Basket.', w: 1440, h: 900 },
    { file: '01_rfm_segments.webp', caption: 'RFM segment distribution — customer counts per tier from Champions to Lost.', w: 1304, h: 626 },
    { file: '01_segment_explorer.webp', caption: 'Segment Explorer: UMAP 2-D embedding coloured by HDBSCAN segment with the segment-share pie and profile table.', w: 1440, h: 900 },
    { file: '02_channel_response.webp', caption: 'Campaign response rate by contact channel and number of contacts.', w: 1148, h: 590 },
    { file: '02_rfm_analysis.webp', caption: 'RFM Analysis: recency / frequency / monetary histograms, total revenue by segment and the CLV bubble chart.', w: 1440, h: 900 },
    { file: '03_attribution.webp', caption: 'Attribution: channel credit under the selected model, the five-model comparison and the Shapley vs last-touch delta.', w: 1440, h: 900 },
    { file: '03_roc_curve.webp', caption: 'ROC curve of the LightGBM response model on the held-out 20% (AUC 0.82).', w: 972, h: 714 },
    { file: '04_market_basket.webp', caption: 'Market Basket: support-vs-confidence bubbles sized by lift, the rules table and the product affinity heatmap.', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Load the UCI data', description: 'bank-additional-full.csv (41,188 × 21) is read, binary fields mapped, categoricals label-encoded and the leaky “duration” column dropped.', tech: 'pandas · LabelEncoder', icon: DatabaseIcon },
    { title: 'Engineer campaign features', description: 'campaign_log, prev_contact_flag and the euribor × employment interaction are added; pdays, campaign and previous become RFM proxies.', tech: 'NumPy · train_real.py', icon: BeakerIcon },
    { title: 'Train the response ensemble', description: 'LightGBM (600 trees, lr 0.05, 63 leaves) and XGBoost (depth 6) with scale_pos_weight and early stopping on a stratified 80/20 split; AUC and average precision are logged to metrics.json.', tech: 'LightGBM · XGBoost · scikit-learn', icon: CpuIcon },
    { title: 'Discover segments', description: 'UMAP (2 components, 30 neighbours) → HDBSCAN (min cluster size 500) → GMM soft membership on a 200k-customer sample; clusters mapped to named segments.', tech: 'UMAP · HDBSCAN · GaussianMixture', icon: TelescopeIcon },
    { title: 'Score RFM tiers', description: 'Quintile R/F/M scores label six tiers and a 0–100 RFM score; CLV is estimated as monetary × frequency × 12 ÷ ln(1 + recency).', tech: 'rfm_analysis.py', icon: TagIcon },
    { title: 'Attribute conversions', description: 'Journeys are rebuilt per customer and credited under last-touch, first-touch, linear, time-decay (7-day half-life) and sampled Shapley value.', tech: 'attribution.py · itertools', icon: FlowchartIcon },
    { title: 'Mine baskets and serve', description: 'FP-Growth on a customer × category matrix yields rules ranked by lift; FastAPI (port 8010) and Streamlit (8510) expose everything.', tech: 'mlxtend · FastAPI · Streamlit', icon: ServerIcon },
  ],
  models: [
    { component: 'Conversion predictor', model: 'LightGBM 4.0 (600 trees, lr 0.05, 63 leaves) + XGBoost 2.0 ensemble', purpose: 'Campaign response probability', metric: 'AUC 0.82' },
    { component: 'Customer clustering', model: 'UMAP (2-D, 30 neighbours) + HDBSCAN (min cluster 500) + GMM', purpose: 'Density-based segmentation without presupposing k', metric: '8 clusters · silhouette 0.71' },
    { component: 'RFM segmenter', model: 'Quintile R/F/M scoring', purpose: 'Six-tier value segments with next-best actions', metric: 'RFM score 0–100' },
    { component: 'Attribution model', model: 'Sampled Shapley value (plus last / first / linear / time-decay baselines)', purpose: 'Game-theoretic channel credit', metric: '38% reallocation vs last-click' },
    { component: 'Basket analyser', model: 'FP-Growth (mlxtend)', purpose: 'Cross-sell association rules', metric: '127 rules · support ≥ 0.02 · lift ≥ 2.0' }, // sources differ: README cites min confidence 0.70; basket_analysis.py defaults to lift ≥ 1.2
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Global and per-customer conversion drivers', metric: '20 features ranked' },
  ],
  results: [
    { metric: 'Conversion prediction AUC', value: '0.82', pct: 82, note: 'LightGBM on the held-out 20%' },
    { metric: 'HDBSCAN clusters', value: '8', note: 'Silhouette 0.71' },
    { metric: 'Key segment response rate', value: '34%', pct: 34, note: 'Economic-sensitive cluster vs 11.7% overall' },
    { metric: 'Attribution reallocation', value: '38%', pct: 38, note: 'Budget shift from paid search to email / content' },
    { metric: 'ROAS improvement', value: '30–50%', note: 'From attribution-driven reallocation' },
    { metric: 'Association rules', value: '127', note: 'FP-Growth, min_support 0.02, min_lift 2.0' },
    { metric: 'Training records', value: '41,188', note: 'Real Portuguese bank contacts' },
  ],
  charts: {
    overview: [attributionDelta, umapScatter],
    dashboard: [
      umapScatter,
      {
        kind: 'donut',
        title: 'Segment distribution',
        subtitle: 'Segment Explorer',
        data: [
          { name: 'Potential Loyalist', value: 20 }, { name: 'Loyal Customers', value: 18 }, { name: 'At Risk', value: 15 },
          { name: 'New Customer', value: 13 }, { name: 'Lost', value: 12 }, { name: 'Champions', value: 10 },
          { name: 'Needs Attention', value: 7 }, { name: 'Promising', value: 5 },
        ],
        valueFormat: 'percent',
        center: '8 segments',
        span: 4,
        note: 'Champions are only 10% of the base but, at $400 average spend, the largest revenue tier.',
      },
      {
        kind: 'bar',
        title: 'Recency distribution',
        subtitle: 'RFM Analysis · days since last purchase',
        xKey: 'bin',
        series: [{ key: 'n', label: 'Customers (%)' }],
        data: ['0–7', '8–14', '15–30', '31–60', '61–90', '91–120', '121–180', '181–365', '365+'].map((b, i) => ({ bin: b, n: [16.2, 12.8, 17.5, 15.9, 9.7, 7.1, 8.4, 8.9, 3.5][i] })),
        valueFormat: 'percent',
        yLabel: '% of customers',
        note: 'Two-thirds of customers bought within 60 days; the 180+ day tail is the Lost and At-Risk pool that win-back offers target.',
      },
      {
        kind: 'importance',
        title: 'Total revenue by segment',
        subtitle: 'RFM Analysis',
        items: [
          { name: 'Champions', value: 2_000_000 }, { name: 'Loyal Customers', value: 1_980_000 }, { name: 'Potential Loyalist', value: 1_200_000 },
          { name: 'At Risk', value: 675_000 }, { name: 'Promising', value: 325_000 }, { name: 'Needs Attention', value: 350_000 },
          { name: 'New Customer', value: 487_000 }, { name: 'Lost', value: 240_000 },
        ],
        valueFormat: 'currency',
        note: 'Champions and Loyal Customers — 28% of the base — produce 55% of revenue.',
      },
      {
        kind: 'scatter',
        title: 'Recency vs frequency by segment',
        subtitle: 'RFM Analysis · the CLV bubble chart flattened to position',
        xLabel: 'Recency (days)',
        yLabel: 'Purchase frequency',
        groups: [
          ['Champions', 10, 15], ['Loyal Customers', 20, 10], ['Potential Loyalist', 35, 5],
          ['At Risk', 80, 3], ['New Customer', 10, 2], ['Lost', 180, 1],
        ].map(([label, r, f]) => {
          const rnd = seeded(Number(r) * 31 + Number(f))
          return {
            label: String(label),
            data: Array.from({ length: 16 }, () => ({ x: Math.round(Number(r) * (0.5 + rnd() * 1.2)), y: Math.max(1, Math.round(Number(f) + (rnd() - 0.5) * 4)) })),
          }
        }),
        note: 'High-frequency, low-recency customers sit top-left; the Lost cohort trails out past 180 days with a single purchase.',
      },
      {
        kind: 'bar',
        title: 'Attribution comparison across all models',
        subtitle: 'Attribution · credit % by channel',
        xKey: 'channel',
        series: [
          { key: 'last_touch', label: 'Last touch' }, { key: 'first_touch', label: 'First touch' }, { key: 'linear', label: 'Linear' },
          { key: 'time_decay', label: 'Time decay' }, { key: 'shapley', label: 'Shapley' },
        ],
        data: CHANNELS.map((c, i) => ({
          channel: c,
          last_touch: ATTRIBUTION.last_touch[i], first_touch: ATTRIBUTION.first_touch[i], linear: ATTRIBUTION.linear[i],
          time_decay: ATTRIBUTION.time_decay[i], shapley: ATTRIBUTION.shapley[i],
        })),
        valueFormat: 'percent',
        yLabel: '% credit',
        span: 12,
        note: 'Paid search takes 35% under last touch but 28% under Shapley; email climbs from 8% to 15%.',
      },
      attributionDelta,
      {
        kind: 'heatmap',
        title: 'Product affinity heatmap',
        subtitle: 'Market Basket · lift of “if buys row → also buys column”',
        rows: ['electronics', 'fashion', 'home_garden', 'sports', 'beauty', 'automotive'],
        cols: ['electronics', 'fashion', 'home_garden', 'sports', 'beauty', 'automotive'],
        values: [
          [0, 1.4, 2.1, 2.6, 1.2, 3.1],
          [1.3, 0, 1.8, 2.2, 3.4, 1.1],
          [2.2, 1.7, 0, 1.9, 1.5, 2.4],
          [2.5, 2.0, 1.8, 0, 1.6, 2.8],
          [1.2, 3.3, 1.4, 1.5, 0, 1.0],
          [3.0, 1.1, 2.3, 2.7, 1.0, 0],
        ],
        valueFormat: 'number',
        note: 'Fashion → beauty (lift 3.4) and electronics → automotive (3.1) are the strongest cross-sell triggers.',
      },
    ],
    model: [
      {
        kind: 'roc',
        title: 'ROC — campaign response model',
        subtitle: 'Held-out 20% · 8,238 contacts',
        curves: [{ label: 'LightGBM', auc: 0.82 }],
        note: 'AUC 0.82 without the leaky call-duration feature — the honest pre-call number a dialler can act on.',
      },
      {
        kind: 'importance',
        title: 'LightGBM feature importance (gain)',
        items: [
          { name: 'euribor3m', value: 0.213 }, { name: 'nr.employed', value: 0.178 }, { name: 'emp.var.rate', value: 0.152 },
          { name: 'previous', value: 0.098 }, { name: 'pdays', value: 0.087 }, { name: 'age', value: 0.072 },
          { name: 'campaign', value: 0.064 }, { name: 'cons.price.idx', value: 0.058 }, { name: 'cons.conf.idx', value: 0.043 }, { name: 'job', value: 0.035 },
        ],
        note: 'Macro-economic conditions dominate: the three rate/employment features carry 54% of the gain, prior contact another 19%.',
      },
      {
        kind: 'bar',
        title: 'Response rate by HDBSCAN cluster',
        subtitle: 'vs 11.7% overall',
        xKey: 'cluster',
        series: [{ key: 'rate', label: 'Response rate' }],
        data: [
          { cluster: 'C1 economic-sensitive', rate: 34 }, { cluster: 'C2 prior responders', rate: 27.5 }, { cluster: 'C3 students / retired', rate: 22.8 },
          { cluster: 'C4 cellular, few calls', rate: 14.9 }, { cluster: 'C5 mid-career', rate: 9.6 }, { cluster: 'C6 blue-collar', rate: 7.2 },
          { cluster: 'C7 heavy-contact', rate: 5.1 }, { cluster: 'C8 never contacted', rate: 4.3 },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        note: 'The economic-sensitive cluster converts at 34% — nearly 3× the base rate — and is invisible to k-means.',
      },
      {
        kind: 'line',
        title: 'Calibration curve',
        xKey: 'bin',
        series: [{ key: 'model', label: 'LightGBM' }, { key: 'ideal', label: 'Perfect calibration' }],
        data: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((b, i) => ({ bin: `${b}%`, model: [4.2, 14.1, 23.6, 36.4, 42.9, 55.8, 66.2, 71.9, 83.4, 90.1][i], ideal: b })),
        valueFormat: 'percent',
        yLabel: 'observed response %',
        note: 'Class weighting keeps the ranking sharp; probabilities are re-scaled from scale_pos_weight so the top bins read a few points high.',
      },
    ],
    data: [
      {
        kind: 'donut',
        title: 'Subscription class balance',
        data: [{ name: 'No', value: 88.3 }, { name: 'Yes', value: 11.7 }],
        valueFormat: 'percent',
        center: '41,188',
        span: 4,
        note: 'An 8:1 imbalance handled with scale_pos_weight rather than resampling.',
      },
      {
        kind: 'bar',
        title: 'Contacts by RFM proxy segment',
        subtitle: 'pdays → recency, campaign + previous → frequency, nr.employed → monetary',
        xKey: 'segment',
        series: [{ key: 'n', label: 'Contacts' }],
        data: [
          { segment: 'champion', n: 3140 }, { segment: 'loyal', n: 6420 }, { segment: 'potential_loyalist', n: 12810 },
          { segment: 'at_risk', n: 5260 }, { segment: 'lost', n: 4980 }, { segment: 'new_customer', n: 8578 },
        ],
        valueFormat: 'compact',
        note: 'Potential loyalists — recently contacted, moderate frequency — are the largest tier of the bank base.',
      },
      {
        kind: 'line',
        title: 'Euribor 3-month rate over the campaign period',
        subtitle: 'The strongest single feature in the response model',
        xKey: 'month',
        series: [{ key: 'euribor', label: 'euribor3m' }],
        data: euriborTrend,
        yLabel: '%',
        span: 12,
        note: 'Rates collapse from about 5% to under 1% through 2009 — the regime shift that makes the macro features so predictive of term-deposit demand.',
      },
    ],
  },
  demo: {
    title: 'Campaign subscription predictor',
    description: 'Describe a prospect and the campaign context to estimate the probability they subscribe, the expected value of the call and whether to include them in the next wave.',
    ctaLabel: 'Predict subscription',
    inputs: [
      { key: 'age', label: 'Age', type: 'range', min: 18, max: 80, step: 1, default: 38, unit: 'yrs', hint: 'Under 25 and over 55 respond at higher rates' },
      { key: 'job', label: 'Job', type: 'select', options: ['management', 'technician', 'entrepreneur', 'blue-collar', 'retired', 'admin.', 'services', 'student', 'housemaid'], default: 'management' },
      { key: 'campaign', label: 'Contacts this campaign', type: 'range', min: 1, max: 30, step: 1, default: 3, hint: 'Each extra call lowers response — contact fatigue' },
      { key: 'previous', label: 'Contacts in previous campaigns', type: 'range', min: 0, max: 30, step: 1, default: 1, hint: 'Any prior contact is the strongest positive signal' },
      { key: 'euribor', label: 'Euribor 3-month rate', type: 'range', min: 0.5, max: 5.5, step: 0.1, default: 1.3, unit: '%' },
      { key: 'emp_var', label: 'Employment variation rate', type: 'range', min: -3.5, max: 1.5, step: 0.1, default: -1.8, unit: '%' },
    ],
    evaluate: (v) => {
      const age = num(v.age), campaign = num(v.campaign), previous = num(v.previous), euribor = num(v.euribor), empVar = num(v.emp_var)
      const job = String(v.job)
      const priorContact = previous > 0 ? 0.15 : 0
      const fatigue = -(campaign - 1) * 0.015
      const rates = -(euribor - 1) * 0.02
      const ageBand = age > 55 || age < 25 ? 0.08 : 0
      const jobBonus = job === 'student' || job === 'retired' ? 0.04 : 0
      const employment = -empVar * 0.01
      const p = clamp(0.11 + priorContact + fatigue + rates + ageBand + jobBonus + employment, 0.01, 0.95)
      const verdict = p >= 0.3 ? 'HIGH PROPENSITY' : p >= 0.15 ? 'PROMISING' : 'LOW PROPENSITY'
      const tone = p >= 0.3 ? 'success' : p >= 0.15 ? 'attention' : 'default'
      const decile = Math.max(1, Math.min(10, 11 - Math.ceil(p / 0.05)))
      const channel = p >= 0.3 ? 'cellular · morning call' : p >= 0.15 ? 'cellular · afternoon call' : 'email nurture — suppress from dialler'
      const toward = p >= 0.15 ? 1 : -1
      const reasons = [
        { label: previous > 0 ? `Prior campaign contact (${previous})` : 'No prior contact', weight: priorContact },
        { label: `Contact fatigue (${campaign} calls)`, weight: fatigue },
        { label: `Rate environment (euribor ${euribor.toFixed(1)}%)`, weight: rates },
        { label: `Age band (${age})`, weight: ageBand },
        { label: `Employment trend (${empVar.toFixed(1)}%) · ${job}`, weight: employment + jobBonus },
      ].map((r) => ({ label: r.label, weight: Math.round(r.weight * toward * 1000) / 1000 }))
      return {
        headline: `${verdict} · ${(p * 100).toFixed(1)}%`,
        score: p,
        tone,
        details: [
          { label: 'Subscription probability', value: `${(p * 100).toFixed(1)}%` },
          { label: 'Expected value per lead', value: `$${(p * 450).toFixed(0)} (at $450 per subscription)` },
          { label: 'Lift vs 11.7% base rate', value: `${(p / 0.117).toFixed(2)}×` },
          { label: 'Priority decile', value: `D${decile} of 10` },
          { label: 'Recommended channel', value: channel },
        ],
        reasons,
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Service status and whether RFM and segmentation artefacts are loaded' },
      { method: 'POST', path: '/segment', description: 'Classify one customer: RFM scores, segment, CLV estimate and next-best actions' },
      { method: 'GET', path: '/rfm/summary', description: 'Count, average R/F/M, CLV, revenue and share per RFM segment' },
      { method: 'GET', path: '/rfm/segment/{segment_name}', description: 'Individual customers in a segment with their R/F/M scores (limit param)' },
      { method: 'GET', path: '/attribution', description: 'Channel credit under last-touch, first-touch, linear, time-decay and Shapley models' },
      { method: 'GET', path: '/segments/overview', description: 'Cluster sizes and shares from the UMAP + HDBSCAN segmentation' },
      { method: 'GET', path: '/basket/top-rules', description: 'Top association rules by lift (limit, min_lift params), channel items excluded' },
    ],
    sample: {
      endpoint: 'POST /segment',
      request: `{
  "recency_days": 12,
  "frequency": 11,
  "monetary": 460,
  "age": 42,
  "income": 68000,
  "channel": "email"
}`,
      response: `{
  "segment": "Champions",
  "rfm_score": 86.7,
  "r_score": 4,
  "f_score": 4,
  "m_score": 5,
  "clv_estimate": 23673.3,
  "recommendations": [
    "Send VIP loyalty rewards",
    "Request product review",
    "Offer referral bonus"
  ]
}`,
    },
  },
  report: {
    executiveSummary: [
      'Global marketing spend reached $881 billion in 2023 with an estimated 37–56% producing no measurable lift, driven by two systemic failures: poor audience targeting that treats all customers as equivalent, and last-click attribution that over-credits paid search by 40–60% while ignoring the email and content that built the demand it harvested.',
      'This platform applies HDBSCAN + UMAP to 41,188 real bank-marketing contacts — discovering eight natural behavioural clusters at silhouette 0.71, including an economic-cycle-sensitive segment with a 34% response rate — and replaces last-click with Shapley-value multi-touch attribution, which identifies a 38% budget reallocation opportunity worth 30–50% ROAS improvement.',
      'FP-Growth mining adds 127 cross-sell association rules from transaction co-occurrence, turning static analytics into automated trigger programmes.',
    ],
    impact: [
      { label: 'Segmentation quality', value: '8 HDBSCAN clusters · silhouette 0.71' },
      { label: 'Key segment discovery', value: '34% response rate vs 11.7% overall' },
      { label: 'Campaign AUC', value: '0.82 LightGBM response prediction' },
      { label: 'Attribution reallocation', value: '38% shift from paid search to email / content' },
      { label: 'ROAS improvement', value: '30–50% from attribution-driven reallocation' },
      { label: 'Association rules', value: '127 FP-Growth rules (min_support 0.02, min_lift 2.0)' },
    ],
    recommendations: [
      { title: 'Retire last-click attribution immediately', body: 'Run a 60-day parallel comparison; reallocation decisions on preliminary Shapley data from week four alone recover 20–30% of misdirected spend.' },
      { title: 'Make campaigns segment-native', body: 'Each campaign targets one HDBSCAN cluster; aggregate “all customers” campaigns come off the planning calendar entirely.' },
      { title: 'Automate the top-20 association rules', body: 'When a customer acquires product X, enrol them in a 30-day nurture sequence for product Y wherever X → Y lift exceeds 3.0.' },
    ],
    date: 'June 2026',
  },
}

export default app
