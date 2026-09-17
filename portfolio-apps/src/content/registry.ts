/**
 * The registry of all 17 apps: identity, links and the headline facts every surface
 * (hub cards, app headers, prev/next) needs without loading a full content module.
 * Full content lives in `./projects/<slug>.ts` and spreads `BASE[slug]`.
 */
import {
  AccessibilityIcon, BeakerIcon, CommentDiscussionIcon, CreditCardIcon, DeviceCameraVideoIcon,
  HeartIcon, HomeIcon, MegaphoneIcon, NumberIcon, PackageDependenciesIcon, PeopleIcon, PulseIcon,
  ShieldCheckIcon, ShieldLockIcon, SmileyIcon, TagIcon, UnmuteIcon,
} from '@primer/octicons-react'
import type { Buyer, Category, Metric, ProjectApp, Slug } from './types'

export type { Slug }

/**
 * The products on sale. `brand`, `reviews`, `clv` and `marketing` are absent on
 * purpose: they were one product sold four times and are now `customer`, which
 * their URLs redirect to. Their entries survive in `BASE` and their research
 * modules on disk, because the merged product is built out of all four.
 */
export const SLUGS = [
  'customer', 'fraud', 'mortgage', 'people', 'parkinsons', 'supply-chain', 'retail', 'ergonomics',
  'ppe', 'automotive', 'loan', 'malaria', 'emotion', 'music',
] as const satisfies readonly Slug[]

export const CATEGORIES: Category[] = [
  'NLP & GenAI', 'ML Classification', 'ML Regression', 'Finance & Risk',
  'Customer Analytics', 'Recommendation', 'Computer Vision',
]

export type ProjectBase = Pick<
  ProjectApp,
  'slug' | 'num' | 'name' | 'short' | 'category' | 'icon' | 'accent' | 'tagline' | 'links' | 'ports' | 'buyers'
> & {
  /** Short dataset line for cards, e.g. "Yelp 2022 · 8.8 GB". */
  datasetLine: string
  /** Top-line stack names for cards. */
  stackLine: string[]
  /** Four headline metrics (also the default `metrics` of the app). */
  metrics: Metric[]
}

const GH = 'https://github.com/oluwafemiadeyemi/Portfolio'
const gh = (folder: string) => `${GH}/tree/main/${encodeURIComponent(folder)}`
const report = (folder: string) => `${GH}/blob/main/${encodeURIComponent(folder)}/docs/reports/PROJECT_REPORT.md`
const hf = (space: string) => `https://huggingface.co/spaces/oluwafemiadeyemi/${space}`

const B = (name: string, domain: string, useCase?: string, value?: string): Buyer => ({ name, domain, useCase, value })

export const BASE: Record<Slug, ProjectBase> = {
  customer: {
    slug: 'customer', num: 1, name: 'Customer Intelligence Platform', short: 'Customer Intelligence',
    category: 'Customer Analytics', icon: PeopleIcon, accent: '#7E22CE',
    tagline: 'What to fix, and who to call — from everything your customers say and do',
    buyers: [B('Amazon', 'amazon.com'), B('Marriott', 'marriott.com'), B('Spotify', 'spotify.com')],
    datasetLine: '6.9M reviews · 2.6M subscribers · 41k campaign records',
    stackLine: ['RoBERTa', 'BERTopic', 'BG/NBD', 'X-Learner uplift', 'LightGBM'],
    metrics: [
      { label: 'Reviews read', value: '7.4M' },
      { label: 'Customers scored', value: '2.6M' },
      { label: 'Retention ROI', value: '3.2×' },
      { label: 'Revenue protected', value: '$1.8M/qtr' },
    ],
    links: { github: GH },
    ports: { api: 8017, dashboard: 8517 },
  },
  brand: {
    slug: 'brand', num: 1, name: 'Brand Intelligence Platform', short: 'Brand Intelligence',
    category: 'NLP & GenAI', icon: TagIcon, accent: '#E74C3C',
    tagline: 'Real-time aspect-based sentiment and crisis alerts from 6.9M Yelp reviews',
    buyers: [B('Marriott', 'marriott.com'), B('Hilton', 'hilton.com'), B('Starbucks', 'starbucks.com')],
    datasetLine: 'Yelp 2022 · 8.8 GB · 6.9M reviews', stackLine: ['RoBERTa', 'BERTopic', 'VADER', 'Llama 3.2', 'FastAPI'],
    metrics: [
      { label: 'Reviews analysed', value: '6.9M' },
      { label: 'Sentiment AUC', value: '0.91', pct: 91 },
      { label: 'Crisis lead time', value: '18–36 h' },
      { label: 'Aspect F1', value: '0.87', pct: 87 },
    ],
    links: { github: gh('Brand Intelligence Platform'), demo: hf('brand-intelligence'), report: report('Brand Intelligence Platform') },
    ports: { api: 8000, dashboard: 8500 },
  },
  fraud: {
    slug: 'fraud', num: 2, name: 'Real-Time Fraud Detection', short: 'Fraud Detection',
    category: 'ML Classification', icon: ShieldLockIcon, accent: '#E67E22',
    tagline: 'Sub-50 ms fraud scoring with SHAP reason codes and PSI drift monitoring',
    buyers: [B('JPMorgan', 'jpmorganchase.com'), B('American Express', 'americanexpress.com'), B('Visa', 'visa.com')],
    datasetLine: 'IEEE-CIS · 1.6 GB · 590k transactions', stackLine: ['XGBoost', 'LightGBM', 'SHAP', 'Evidently', 'FastAPI'],
    metrics: [
      { label: 'AUC-ROC', value: '0.974', pct: 97 },
      { label: 'Fraud recall', value: '91%', pct: 91 },
      { label: 'p99 latency', value: '<50 ms' },
      { label: 'Transactions', value: '590k' },
    ],
    links: { github: gh('Real-Time Fraud Detection'), demo: hf('fraud-detection'), report: report('Real-Time Fraud Detection') },
    ports: { api: 8001, dashboard: 8501 },
  },
  mortgage: {
    slug: 'mortgage', num: 3, name: 'Fair Mortgage Decisioning Platform', short: 'Fair Mortgage',
    category: 'ML Classification', icon: HomeIcon, accent: '#27AE60',
    tagline: 'ECOA-compliant AI underwriting on 14M HMDA applications, audited with Fairlearn',
    buyers: [B('Wells Fargo', 'wellsfargo.com'), B('JPMorgan', 'jpmorganchase.com'), B('CFPB', 'consumerfinance.gov')],
    datasetLine: 'HMDA 2022 · 500 MB · 14.3M applications', stackLine: ['LightGBM', 'Fairlearn', 'SHAP', 'FastAPI'],
    metrics: [
      { label: 'Model AUC', value: '0.883', pct: 88 },
      { label: 'Parity gap (race)', value: '<2.1%' },
      { label: 'Applications', value: '14.3M' },
      { label: 'Underwriting time', value: '−73%' },
    ],
    links: { github: gh('Fair Mortgage Decisioning Platform'), demo: hf('fair-mortgage'), report: report('Fair Mortgage Decisioning Platform') },
    ports: { api: 8002, dashboard: 8502 },
  },
  people: {
    slug: 'people', num: 4, name: 'People Analytics Platform', short: 'People Analytics',
    category: 'ML Classification', icon: PeopleIcon, accent: '#2980B9',
    tagline: 'Attrition prediction, DEI scorecards and org-network analysis for HR leaders',
    buyers: [B('Google', 'google.com'), B('Deloitte', 'deloitte.com'), B('McKinsey', 'mckinsey.com')],
    datasetLine: 'IBM HR Analytics · 1,470 employees', stackLine: ['XGBoost', 'NetworkX', 'Fairlearn', 'SHAP'],
    metrics: [
      { label: 'Attrition AUC', value: '0.94', pct: 94 },
      { label: 'Attrition reduced', value: '−23%' },
      { label: 'Annual savings', value: '$4.2M' },
      { label: 'Pay-gap detected', value: '11.3%' },
    ],
    links: { github: gh('People Analytics Platform'), demo: hf('people-analytics'), report: report('People Analytics Platform') },
    ports: { api: 8003, dashboard: 8503 },
  },
  parkinsons: {
    slug: 'parkinsons', num: 5, name: "Parkinson's Biomarker Detection", short: "Parkinson's Biomarker",
    category: 'ML Classification', icon: PulseIcon, accent: '#8E44AD',
    tagline: 'Multimodal voice, gait and tremor biomarkers with calibrated uncertainty',
    buyers: [B('Pfizer', 'pfizer.com'), B('Johnson & Johnson', 'jnj.com'), B('Roche', 'roche.com')],
    datasetLine: 'mPower · 9.5k participants', stackLine: ['Gradient Boosting', 'Random Forest', 'SHAP', 'MC Dropout'],
    metrics: [
      { label: 'AUC-ROC', value: '0.97', pct: 97 },
      { label: 'Sensitivity', value: '92%', pct: 92 },
      { label: 'Brier score', value: '0.042' },
      { label: 'Participants', value: '9.5k' },
    ],
    links: { github: gh('Parkinsons Biomarker Detection'), demo: hf('parkinsons-biomarker') },
    ports: { api: 8004, dashboard: 8504 },
  },
  'supply-chain': {
    slug: 'supply-chain', num: 6, name: 'Supply Chain Risk Intelligence', short: 'Supply Chain Risk',
    category: 'Finance & Risk', icon: PackageDependenciesIcon, accent: '#1ABC9C',
    tagline: 'Altman Z-Score, ML distress prediction and Llama-read SEC filings for supplier risk',
    buyers: [B('Goldman Sachs', 'goldmansachs.com'), B('Deloitte', 'deloitte.com'), B('EY', 'ey.com')],
    datasetLine: 'SEC EDGAR · 5,000+ filings', stackLine: ['XGBoost', 'LightGBM', 'NetworkX', 'Llama 3.2'],
    metrics: [
      { label: '12-month AUC', value: '0.88', pct: 88 },
      { label: 'Early warning', value: '6–12 mo' },
      { label: 'Catch rate', value: '84%', pct: 84 },
      { label: 'Filings analysed', value: '5,000+' },
    ],
    links: { github: gh('Supply Chain Risk Intelligence'), demo: hf('supply-chain-risk'), report: report('Supply Chain Risk Intelligence') },
    ports: { api: 8005, dashboard: 8505 },
  },
  retail: {
    slug: 'retail', num: 7, name: 'Retail Operations Intelligence', short: 'Retail Operations',
    category: 'Computer Vision', icon: DeviceCameraVideoIcon, accent: '#3498DB',
    tagline: 'YOLO shelf-void detection and ByteTrack shopper analytics on real store footage',
    buyers: [B('Walmart', 'walmart.com'), B('Amazon', 'amazon.com'), B('Target', 'target.com')],
    datasetLine: 'Retail shelf voids · 506 annotated images', stackLine: ['YOLOv8', 'ByteTrack', 'ONNX', 'FastAPI'],
    metrics: [
      { label: 'mAP@0.5', value: '0.84', pct: 84 },
      { label: 'OOS events', value: '−34%' },
      { label: 'Lost sales recovered', value: '$180k/yr' },
      { label: 'Inference', value: '<20 ms' },
    ],
    links: { github: gh('Retail Operations Intelligence'), demo: hf('retail-operations'), report: report('Retail Operations Intelligence') },
    ports: { api: 8006, dashboard: 8506 },
  },
  ergonomics: {
    slug: 'ergonomics', num: 8, name: 'Workplace Ergonomics AI', short: 'Ergonomics AI',
    category: 'Computer Vision', icon: AccessibilityIcon, accent: '#E67E22',
    tagline: 'YOLOv8-Pose with REBA/RULA scoring to prevent musculoskeletal injuries',
    buyers: [B('Amazon', 'amazon.com'), B('FedEx', 'fedex.com'), B('Boeing', 'boeing.com')],
    datasetLine: 'COCO 2017 keypoints · pre-trained', stackLine: ['YOLOv8n-Pose', 'REBA/RULA', 'ONNX', 'FastAPI'],
    metrics: [
      { label: 'MSD claims', value: '−43%' },
      { label: 'Annual savings', value: '$380k' },
      { label: 'Keypoints tracked', value: '17' },
      { label: 'ISO standard', value: '9241-110' },
    ],
    links: { github: gh('Workplace Ergonomics AI'), demo: hf('workplace-ergonomics') },
    ports: { api: 8007, dashboard: 8507 },
  },
  clv: {
    slug: 'clv', num: 9, name: 'CLV & Retention Platform', short: 'CLV & Retention',
    category: 'Customer Analytics', icon: HeartIcon, accent: '#D35400',
    tagline: 'BG/NBD lifetime value and causal uplift targeting on 2.6M KKBox subscribers',
    buyers: [B('AT&T', 'att.com'), B('Spotify', 'spotify.com'), B('Netflix', 'netflix.com')],
    datasetLine: 'KKBox · 2.1 GB · 2.6M subscribers', stackLine: ['BG/NBD', 'X-Learner uplift', 'LightGBM', 'SHAP'],
    metrics: [
      { label: 'Churn AUC', value: '0.86', pct: 86 },
      { label: 'Retention ROI', value: '3.2×' },
      { label: 'Revenue protected', value: '$1.8M/qtr' },
      { label: 'Subscribers', value: '2.6M' },
    ],
    links: { github: gh('CLV Retention Platform'), demo: hf('clv-retention'), report: report('CLV Retention Platform') },
    ports: { api: 8008, dashboard: 8508 },
  },
  ppe: {
    slug: 'ppe', num: 10, name: 'PPE Safety Compliance', short: 'PPE Safety',
    category: 'Computer Vision', icon: ShieldCheckIcon, accent: '#F39C12',
    tagline: 'YOLOv8 fine-tuned on 4k real construction images with OSHA compliance scoring',
    buyers: [B('Amazon', 'amazon.com'), B('Boeing', 'boeing.com'), B('Caterpillar', 'caterpillar.com')],
    datasetLine: 'Construction PPE · 4k images', stackLine: ['YOLOv8', 'ONNX', 'OSHA scoring', 'FastAPI'],
    metrics: [
      { label: 'mAP@0.5', value: '0.89', pct: 89 },
      { label: 'Violations', value: '−42%' },
      { label: '3-year NPV', value: '$1.2M' },
      { label: 'PPE classes', value: '8' },
    ],
    links: { github: gh('PPE Safety Compliance'), demo: hf('ppe-safety') },
    ports: { api: 8009, dashboard: 8509 },
  },
  marketing: {
    slug: 'marketing', num: 11, name: 'Marketing Campaign Intelligence', short: 'Marketing Campaign',
    category: 'ML Classification', icon: MegaphoneIcon, accent: '#16A085',
    tagline: 'Campaign response, HDBSCAN segments, Shapley attribution and basket rules on 41k records',
    buyers: [B('P&G', 'pg.com'), B('Unilever', 'unilever.com'), B('Meta', 'meta.com')],
    datasetLine: 'UCI Bank Marketing · 41k records', stackLine: ['LightGBM', 'HDBSCAN', 'UMAP', 'Shapley', 'FP-Growth'],
    metrics: [
      { label: 'Response AUC', value: '0.82', pct: 82 },
      { label: 'Segments found', value: '8' },
      { label: 'Budget reallocation', value: '38%' },
      { label: 'Association rules', value: '127' },
    ],
    links: { github: gh('Marketing Campaign Intelligence'), demo: hf('marketing-campaign'), report: report('Marketing Campaign Intelligence') },
    ports: { api: 8010, dashboard: 8510 },
  },
  automotive: {
    slug: 'automotive', num: 12, name: 'Automotive Pricing Intelligence', short: 'Automotive Pricing',
    category: 'ML Regression', icon: NumberIcon, accent: '#F39C12',
    tagline: 'Stacked ensemble on 367k real Craigslist listings with conformal price intervals',
    buyers: [B('AutoNation', 'autonation.com'), B('CarMax', 'carmax.com'), B('TrueCar', 'truecar.com')],
    datasetLine: 'Craigslist vehicles · 367k listings', stackLine: ['LightGBM', 'XGBoost', 'CatBoost', 'SHAP', 'Conformal'],
    metrics: [
      { label: 'MAE', value: '$2,753' },
      { label: 'R²', value: '0.87', pct: 87 },
      { label: 'Training listings', value: '294k' },
      { label: 'MAPE', value: '27.9%' },
    ],
    links: { github: gh('Automotive Pricing Intelligence'), demo: hf('automotive-pricing') },
    ports: { api: 8011, dashboard: 8511 },
  },
  loan: {
    slug: 'loan', num: 13, name: 'Loan Default Prediction', short: 'Loan Default',
    category: 'ML Classification', icon: CreditCardIcon, accent: '#C0392B',
    tagline: 'Credit-risk ensemble with SMOTE, Platt calibration and ECOA adverse-action codes',
    buyers: [B('JPMorgan', 'jpmorganchase.com'), B('Goldman Sachs', 'goldmansachs.com'), B('Experian', 'experian.com')],
    datasetLine: 'UCI Credit Card · 30k records', stackLine: ['LightGBM', 'XGBoost', 'CatBoost', 'SMOTE', 'Fairlearn'],
    metrics: [
      { label: 'Best AUC', value: '0.78', pct: 78 },
      { label: 'Default rate', value: '22.1%' },
      { label: 'Training records', value: '24k' },
      { label: 'Risk tiers', value: '4' },
    ],
    links: { github: gh('Loan Default Prediction'), demo: hf('loan-default') },
    ports: { api: 8012, dashboard: 8512 },
  },
  malaria: {
    slug: 'malaria', num: 14, name: 'Malaria Detection', short: 'Malaria Detection',
    category: 'Computer Vision', icon: BeakerIcon, accent: '#E74C3C',
    tagline: 'EfficientNetV2 and ViT parasite detection with Grad-CAM, exported to ONNX for the edge',
    buyers: [B('World Health Organization', 'who.int'), B('Gates Foundation', 'gatesfoundation.org'), B('Roche', 'roche.com')],
    datasetLine: 'NIH malaria cells · 27.5k images', stackLine: ['EfficientNetV2-S', 'ViT', 'Grad-CAM', 'ONNX', 'FastAPI'],
    metrics: [
      { label: 'AUC-ROC', value: '0.97', pct: 97 },
      { label: 'Sensitivity', value: '94%', pct: 94 },
      { label: 'Cell images', value: '27.5k' },
      { label: 'Deployment', value: 'ONNX edge' },
    ],
    links: { github: gh('Malaria Detection'), demo: hf('malaria-detection') },
    ports: { api: 8013, dashboard: 8513 },
  },
  emotion: {
    slug: 'emotion', num: 15, name: 'Facial Emotion Detection', short: 'Facial Emotion',
    category: 'Computer Vision', icon: SmileyIcon, accent: '#F1C40F',
    tagline: 'EfficientNet-B4 with attention pooling: 7 emotions in under 30 ms per face',
    buyers: [B('Disney', 'disney.com'), B('Netflix', 'netflix.com'), B('Walmart', 'walmart.com')],
    datasetLine: 'FER2013 + AffectNet · 450k images', stackLine: ['EfficientNet-B4', 'Attention', 'ONNX', 'FastAPI'],
    metrics: [
      { label: 'Emotion classes', value: '7' },
      { label: 'Inference', value: '<30 ms' },
      { label: 'Training images', value: '450k' },
      { label: 'Datasets', value: 'FER2013 + RAF' },
    ],
    links: { github: gh('Facial Emotion Detection'), demo: hf('facial-emotion') },
    ports: { api: 8014, dashboard: 8514 },
  },
  music: {
    slug: 'music', num: 16, name: 'Music Recommendation System', short: 'Music Recommendation',
    category: 'Recommendation', icon: UnmuteIcon, accent: '#1DB954',
    tagline: 'Hybrid ALS + FAISS recommender trained on 9.7M real listening events',
    buyers: [B('Spotify', 'spotify.com'), B('Apple Music', 'apple.com'), B('YouTube', 'youtube.com')],
    datasetLine: 'Spotify / Last.fm · 9.7M events', stackLine: ['ALS', 'FAISS', 'Implicit', 'FastAPI'],
    metrics: [
      { label: 'Users', value: '962k' },
      { label: 'Listening events', value: '9.7M' },
      { label: 'Tracks', value: '50k' },
      { label: 'ALS factors', value: '128' },
    ],
    links: { github: gh('Music Recommendation System'), demo: hf('music-recommendation') },
    ports: { api: 8015, dashboard: 8515 },
  },
  reviews: {
    slug: 'reviews', num: 17, name: 'Customer Review Categorisation', short: 'Review Intelligence',
    category: 'NLP & GenAI', icon: CommentDiscussionIcon, accent: '#9B59B6',
    tagline: 'LLM structured extraction, ChromaDB RAG and BERTopic discovery over 500k reviews',
    buyers: [B('Amazon', 'amazon.com'), B('Walmart', 'walmart.com'), B('P&G', 'pg.com')],
    datasetLine: '500k Amazon-style reviews', stackLine: ['Claude Sonnet', 'Llama 3.2', 'ChromaDB', 'BERTopic', 'FastAPI'],
    metrics: [
      { label: 'Classification accuracy', value: '94.2%', pct: 94 },
      { label: 'Cost per review', value: '$0.003' },
      { label: 'Cache hit rate', value: '87%', pct: 87 },
      { label: 'Reviews indexed', value: '500k' },
    ],
    links: { github: gh('Customer Review Categorisation'), demo: hf('customer-review'), report: report('Customer Review Categorisation') },
    ports: { api: 8016, dashboard: 8516 },
  },
}

export const ORDERED: ProjectBase[] = SLUGS.map((s) => BASE[s])

export function neighbours(slug: Slug): { prev?: ProjectBase; next?: ProjectBase } {
  // A merged slug is not on the list, so it has no neighbours to offer.
  const i = (SLUGS as readonly Slug[]).indexOf(slug)
  return { prev: i > 0 ? BASE[SLUGS[i - 1]] : undefined, next: i < SLUGS.length - 1 ? BASE[SLUGS[i + 1]] : undefined }
}

const MODULES = import.meta.glob<{ default: ProjectApp }>('./projects/*.ts')
const PRODUCTS = import.meta.glob<{ default: unknown }>('./product/*.ts')
const FRONTIERS = import.meta.glob<{ default: unknown }>('./frontier/*.ts')

/** Loads the full research content module for an app (code-split per app). */
export async function loadProject(slug: Slug): Promise<ProjectApp> {
  const loader = MODULES[`./projects/${slug}.ts`]
  if (!loader) throw new Error(`No content module for "${slug}"`)
  const m = await loader()
  return m.default
}

/** Commercial positioning for a product; null until its module is written. */
export async function loadProduct<T>(slug: Slug): Promise<T | null> {
  const loader = PRODUCTS[`./product/${slug}.ts`]
  if (!loader) return null
  try {
    return (await loader()).default as T
  } catch {
    return null
  }
}

/** 2026 state-of-the-art comparison for a project; null until its module is written. */
export async function loadFrontier<T>(slug: Slug): Promise<T | null> {
  const loader = FRONTIERS[`./frontier/${slug}.ts`]
  if (!loader) return null
  try {
    return (await loader()).default as T
  } catch {
    return null
  }
}

export const hasProduct = (slug: Slug) => Boolean(PRODUCTS[`./product/${slug}.ts`])
export const hasFrontier = (slug: Slug) => Boolean(FRONTIERS[`./frontier/${slug}.ts`])
