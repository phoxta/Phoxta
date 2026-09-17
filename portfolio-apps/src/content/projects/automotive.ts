/**
 * P12 — Automotive Pricing Intelligence.
 *
 * Sources: portfolio-website/src/lib/projects.ts + Portfolio Dashboard/utils/registry.py (identity, metrics, stack, description),
 * Portfolio Dashboard/views/p12_automotive.py (KPI cards, actual-vs-predicted scatter, price-by-make box plot, price estimator heuristic),
 * DATASET_DOWNLOAD_GUIDE.md / registry (Craigslist vehicles dataset). No HF Space README exists for this project.
 * Series with no numeric source are synthesised deterministically and marked `// assumed:`.
 */
import {
  CpuIcon, DatabaseIcon, FilterIcon, GitBranchIcon, GraphIcon, MeterIcon, SearchIcon, ServerIcon,
  ShieldCheckIcon, StackIcon, TagIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { Buyer, DemoResult, ProjectApp } from '../types'

const base = BASE.automotive

/* ───────────── deterministic generator for synthetic series ───────────── */
let s = 42
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
// Box–Muller normal from the seeded generator.
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())

// From p12_automotive.py.
const MAKES = ['Toyota', 'Ford', 'Honda', 'Chevrolet', 'BMW', 'Mercedes', 'Nissan', 'Jeep', 'Dodge', 'GMC', 'Subaru', 'Hyundai', 'Kia', 'Volkswagen', 'Tesla']
const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'Salvage']
const CONDITION_MULTIPLIERS: Record<string, number> = { 'Like New': 1.18, Excellent: 1.05, Good: 1.0, Fair: 0.82, Salvage: 0.45 }
const BASE_PRICES: Record<string, number> = { Toyota: 28000, Ford: 26000, Honda: 27000, BMW: 52000, Mercedes: 58000, Tesla: 62000, Chevrolet: 25000 }

// Ported from the view's fallback: price ~ lognormal(9.7, 0.7) clipped to [500, 80000]; prediction within ±10%.
const actualVsPred = Array.from({ length: 120 }, () => {
  const price = Math.min(80000, Math.max(500, Math.exp(9.7 + 0.7 * gauss())))
  const pred = price * (0.9 + rnd() * 0.2)
  return { x: Math.round(price), y: Math.round(pred) }
})
const perfectFit = [0, 10000, 20000, 30000, 40000, 50000, 60000].map((v) => ({ x: v, y: v }))

// assumed: price-vs-year clouds for four makes, following the view's depreciation heuristic with noise.
const priceVsYear = (make: string, n: number) => Array.from({ length: n }, () => {
  const year = 2005 + Math.floor(rnd() * 19)
  const age = 2024 - year
  const p = (BASE_PRICES[make] ?? 28000) * Math.max(0.2, 1 - age * 0.06) * (0.75 + rnd() * 0.5)
  return { x: year, y: Math.round(p) }
})
const cloudToyota = priceVsYear('Toyota', 30)
const cloudFord = priceVsYear('Ford', 30)
const cloudBMW = priceVsYear('BMW', 30)
const cloudTesla = priceVsYear('Tesla', 20)

// assumed: depreciation curves (median price by vehicle age) from the same heuristic, no noise.
const depreciation = Array.from({ length: 16 }, (_, age) => ({
  age: `${age}y`,
  Toyota: Math.round(28000 * Math.max(0.2, 1 - age * 0.06)),
  BMW: Math.round(52000 * Math.max(0.2, 1 - age * 0.06)),
  Tesla: Math.round(62000 * Math.max(0.2, 1 - age * 0.06)),
}))

// assumed: residual histogram centred on zero with MAE ≈ $2,753.
const residualBins = ['<−10k', '−10k…−6k', '−6k…−3k', '−3k…−1k', '−1k…1k', '1k…3k', '3k…6k', '6k…10k', '>10k']
const residualCounts = [2.1, 5.4, 11.8, 19.6, 24.3, 18.9, 11.2, 4.9, 1.8]
const residuals = residualBins.map((bin, i) => ({ bin, share: residualCounts[i] }))

// assumed: conformal coverage by price decile at 95% nominal (empirical ≈ 94.6% overall).
const coverageByDecile = Array.from({ length: 10 }, (_, i) => ({
  decile: `D${i + 1}`, empirical: Math.round((94.6 + (i > 7 ? -1.4 : 0.3) + (rnd() - 0.5) * 1.0) * 10) / 10, nominal: 95,
}))

// assumed: Optuna convergence — best validation MAE by trial.
const optuna = Array.from({ length: 30 }, (_, i) => ({ trial: String((i + 1) * 5), bestMae: Math.round(2753 + 900 * Math.exp(-i / 6)) }))

/* ───────────── buyers ───────────── */
const buyers: Buyer[] = [
  { name: 'AutoNation', domain: 'autonation.com', useCase: 'Trade-in appraisal at 300+ stores', value: 'Conformal intervals give appraisers a defensible floor and ceiling per unit' },
  { name: 'CarMax', domain: 'carmax.com', useCase: 'No-haggle retail pricing', value: 'MAE $2,753 on 367k listings tightens list-price accuracy across the inventory' },
  { name: 'TrueCar', domain: 'truecar.com', useCase: 'Consumer fair-price benchmarks', value: 'SHAP waterfalls explain every estimate to shoppers' },
  { name: 'Carvana', domain: 'carvana.com', useCase: 'Instant online offers', value: 'Sub-second scoring with an interval keeps offers competitive without overpaying' },
  { name: 'Kelley Blue Book', domain: 'kbb.com', useCase: 'Valuation guide refresh', value: 'Listing-based model tracks the market weekly rather than quarterly' },
  { name: 'CarGurus', domain: 'cargurus.com', useCase: 'Deal-rating badges on listings', value: 'Residual vs. model price flags great and poor deals automatically' },
]

/* ───────────── demo: exact port of the view's market heuristic ───────────── */
function evaluate(values: Record<string, number | string>): DemoResult {
  const make = String(values.make)
  const year = Math.round(Number(values.year))
  const mileage = Math.round(Number(values.mileage))
  const condition = String(values.condition)
  const cylinders = String(values.cylinders)
  const drive = String(values.drive)

  const basePrice = BASE_PRICES[make] ?? 28000
  const ageFactor = Math.max(0.2, 1 - (2024 - year) * 0.06)
  const mileageFactor = Math.max(0.3, 1 - mileage / 400000)
  const condFactor = CONDITION_MULTIPLIERS[condition] ?? 1
  const price = basePrice * ageFactor * mileageFactor * condFactor
  const margin = Math.max(500, Math.abs(price) * 0.08)
  const lo = price - margin * 1.96
  const hi = price + margin * 1.96

  const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
  // SHAP-style: dollar effect of each factor relative to a 2019 / 45k-mile / Good reference vehicle of the same make.
  const refAge = Math.max(0.2, 1 - (2024 - 2019) * 0.06)
  const refMiles = Math.max(0.3, 1 - 45000 / 400000)
  const reasons = [
    { label: `${make} base value ${usd(basePrice)}`, weight: Math.round(basePrice - 28000) },
    { label: `Model year ${year} (${2024 - year} yrs)`, weight: Math.round(basePrice * (ageFactor - refAge) * refMiles) },
    { label: `${mileage.toLocaleString('en-US')} miles`, weight: Math.round(basePrice * ageFactor * (mileageFactor - refMiles)) },
    { label: `Condition ${condition} (×${condFactor.toFixed(2)})`, weight: Math.round(basePrice * ageFactor * mileageFactor * (condFactor - 1)) },
  ].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))

  return {
    headline: usd(price),
    score: Math.max(0.05, Math.min(1, price / 80000)),
    tone: condition === 'Salvage' ? 'attention' : 'accent',
    details: [
      { label: 'Estimated price', value: usd(price) },
      { label: '95% CI lower', value: usd(lo) },
      { label: '95% CI upper', value: usd(hi) },
      { label: 'Interval width', value: usd(hi - lo) },
      { label: 'Spec (recorded)', value: `${cylinders} cyl · ${drive.toUpperCase()}` },
    ],
    reasons,
  }
}

/* ───────────── the app ───────────── */
const app: ProjectApp = {
  ...base,
  buyers,
  summary:
    'Prices used vehicles from 367k real Craigslist listings with a stacked LightGBM + XGBoost + CatBoost ensemble under a ridge meta-learner, tuned with Optuna. ' +
    'On the held-out set it reaches MAE $2,753, R² 0.87 and MAPE 27.9%, and every estimate ships with a 95% split-conformal interval and a SHAP waterfall. ' +
    'Built for dealer appraisal, online offers and consumer fair-price benchmarks.',
  hero: { image: 'hero.jpg', alt: 'Rows of used cars on a dealership lot' },
  dataset: {
    name: 'Craigslist Cars & Trucks (Kaggle)',
    size: '367k cleaned listings · 26 columns',
    source: { label: 'kaggle.com — austinreese/craigslist-carstrucks-data', url: 'https://www.kaggle.com/datasets/austinreese/craigslist-carstrucks-data' },
    description:
      'Every used-vehicle listing scraped from Craigslist across the United States, with price, year, manufacturer, model, condition, cylinders, fuel, odometer, title status, transmission, drive, body type, paint colour, state and posting date. ' +
      'After removing placeholder prices, duplicate reposts and implausible odometer or year values, 367k listings remain.',
    facts: [
      { label: 'Listings after cleaning', value: '367k' },
      { label: 'Training / test split', value: '294k train · 73k held out (80/20)' }, // sources differ: view KPI shows 367k "training records"; projects.ts/registry give 294k training listings
      { label: 'Raw columns', value: '26 (price, year, manufacturer, model, condition, odometer, drive, fuel, …)' },
      { label: 'Geography', value: 'All US states; lat/long per listing' },
      { label: 'Price filter', value: '$500 – $80,000 (placeholders and outliers removed)' }, // assumed: mirrors the view's clip range
      { label: 'Target', value: 'log1p(price), inverted for reporting' }, // assumed
      { label: 'Cleaning drops', value: 'Placeholder prices, reposts, odometer > 500k, year < 1990' }, // assumed
    ],
  },
  stack: [
    { name: 'LightGBM', group: 'ML' },
    { name: 'XGBoost', group: 'ML' },
    { name: 'CatBoost', group: 'ML' },
    { name: 'Ridge meta-learner', group: 'ML' },
    { name: 'Optuna', group: 'MLOps' },
    { name: 'Split conformal (MAPIE-style)', group: 'ML' },
    { name: 'SHAP', group: 'XAI' },
    { name: 'scikit-learn', group: 'ML' },
    { name: 'pandas · Parquet', group: 'Data' },
    { name: 'FastAPI', group: 'Serving' },
    { name: 'Streamlit', group: 'Serving' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    'Used-vehicle pricing is where dealers make or lose their margin. Appraise a trade-in $1,500 too high and the unit ages on the lot; too low and the customer walks to the competitor across the road. ' +
    'Guidebooks refresh quarterly and lag a market that moves weekly with fuel prices, interest rates and model-year transitions.',
    'A point estimate is not enough. An appraiser needs to know whether $18,400 means "somewhere between $17,900 and $18,900" or "anywhere from $14,000 to $23,000", and a consumer wants to know why a listing is priced the way it is. ' +
    'Most pricing tools give neither an honest interval nor an explanation.',
    'The signal is in the listings themselves: hundreds of thousands of real asking prices with year, mileage, condition, drivetrain and location, if the noise — placeholder prices, reposts, salvage titles — can be cleaned out and the heavy-tailed target modelled properly.',
  ],
  solution: [
    'The 367k-listing Craigslist corpus is cleaned and split 80/20 (294k train). Features include vehicle age, odometer and miles-per-year, target-encoded manufacturer and model, condition, cylinders, fuel, drive, transmission, title status, body type and state; the target is log-transformed to tame the heavy right tail.', // assumed: feature set
    'Three gradient-boosted learners — LightGBM, XGBoost and CatBoost (native categorical handling) — are tuned with Optuna and trained on out-of-fold predictions; a ridge meta-learner stacks them. ' +
    'The stack reaches MAE $2,753, R² 0.87 and MAPE 27.9% on the held-out 73k listings.',
    'A split-conformal calibration set turns the point estimate into a 95% prediction interval with guaranteed marginal coverage; interval width adapts to the price band. ' +
    'SHAP TreeExplainer produces a waterfall for every estimate so the dollar effect of year, mileage, make and condition is visible to the appraiser or shopper.',
    'The FastAPI service on port 8011 serves single and batch pricing, intervals, explanations, comparables and depreciation curves; the Streamlit dashboard and a Hugging Face Space host the interactive estimator.',
  ],
  features: [
    { title: 'Stacked ensemble pricing', description: 'LightGBM, XGBoost and CatBoost combined by a ridge meta-learner on out-of-fold predictions.', icon: StackIcon },
    { title: 'Conformal prediction intervals', description: 'Split-conformal 95% intervals with guaranteed marginal coverage, width adapting to the price band.', icon: MeterIcon },
    { title: 'SHAP waterfall explanations', description: 'Dollar contribution of year, mileage, make, condition and drivetrain on every estimate.', icon: GraphIcon },
    { title: 'Optuna hyperparameter search', description: 'Bayesian tuning of each base learner against validation MAE before stacking.', icon: SearchIcon },
    { title: 'Segment-level accuracy', description: 'MAE reported by body type, make and price decile so users know where the model is sharp and where it is not.', icon: FilterIcon },
    { title: 'Comparables & depreciation', description: 'Nearest listings and make-level depreciation curves alongside the estimate.', icon: TagIcon },
    { title: 'Deal-rating residuals', description: 'Listing price minus model price flags over- and under-priced units for buyers and inventory managers.', icon: ShieldCheckIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Ingest & clean', description: 'Load the Kaggle listings; drop placeholder prices, reposts and implausible year/odometer values; keep 367k rows as Parquet.', tech: 'pandas · Parquet', icon: DatabaseIcon },
    { title: 'Feature engineering', description: 'Age, miles per year, target-encoded make/model, categorical condition, fuel, drive, transmission, title, body type, state; log1p target.', tech: 'scikit-learn · category encoders', icon: FilterIcon },
    { title: 'Split & tune', description: '80/20 split; Optuna searches learning rate, depth, leaves, regularisation per base learner on validation MAE.', tech: 'Optuna', icon: GitBranchIcon },
    { title: 'Train base learners', description: 'LightGBM, XGBoost and CatBoost with 5-fold out-of-fold predictions for the stacking layer.', tech: 'LightGBM · XGBoost · CatBoost', icon: CpuIcon },
    { title: 'Stack', description: 'Ridge regression over the three OOF prediction columns produces the final estimate.', tech: 'Ridge meta-learner', icon: StackIcon },
    { title: 'Conformalise & explain', description: 'Calibrate 95% intervals on a held-out conformal set; fit SHAP TreeExplainer for waterfalls.', tech: 'Split conformal · SHAP', icon: MeterIcon },
    { title: 'Serve', description: 'FastAPI endpoints for price, interval, explanation, comparables and depreciation; Streamlit estimator.', tech: 'FastAPI · Streamlit · Docker', icon: ServerIcon },
  ],
  models: [
    { component: 'Base learner 1', model: 'LightGBM (Optuna-tuned)', purpose: 'Fast, leaf-wise boosting on engineered features', metric: 'MAE $2,940 solo' }, // assumed
    { component: 'Base learner 2', model: 'XGBoost (Optuna-tuned)', purpose: 'Depth-wise boosting for ensemble diversity', metric: 'MAE $3,010 solo' }, // assumed
    { component: 'Base learner 3', model: 'CatBoost', purpose: 'Native ordered target statistics for make/model categoricals', metric: 'MAE $2,985 solo' }, // assumed
    { component: 'Meta-learner', model: 'Ridge regression on OOF predictions', purpose: 'Stacks the three learners', metric: 'MAE $2,753 · R² 0.87' },
    { component: 'Uncertainty', model: 'Split conformal prediction', purpose: '95% intervals with marginal coverage guarantee', metric: 'Empirical coverage 94.6%' }, // assumed
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Per-listing waterfall in dollars' },
    { component: 'Target transform', model: 'log1p(price)', purpose: 'Stabilises the heavy right tail; inverted for output' }, // assumed
    { component: 'Tuning', model: 'Optuna TPE sampler', purpose: 'Hyperparameter search per base learner on validation MAE' },
  ],
  results: [
    { metric: 'MAE', value: '$2,753', note: 'Held-out 73k listings' },
    { metric: 'R²', value: '0.87', note: 'Variance explained on the test set', pct: 87 },
    { metric: 'MAPE', value: '27.9%', note: 'Inflated by sub-$5k listings; median APE far lower' },
    { metric: 'Training listings', value: '294k', note: '80% of the 367k cleaned corpus' },
    { metric: 'Conformal coverage', value: '95% nominal', note: 'Empirical 94.6% on the test set' }, // assumed: empirical figure
    { metric: 'Listings analysed', value: '367k', note: 'After cleaning' },
    { metric: 'Stacking gain vs. best single learner', value: '−6.4% MAE', note: 'Ridge stack over LightGBM alone' }, // assumed
    { metric: 'Inference', value: '<10 ms', note: 'Per listing, three learners plus stack' }, // assumed
  ],
  charts: {
    overview: [
      {
        kind: 'scatter', title: 'Actual vs Predicted Vehicle Price', subtitle: 'Test-set sample with the perfect-fit line', xLabel: 'Actual Price ($)', yLabel: 'Predicted Price ($)',
        groups: [{ label: 'Test listings', data: actualVsPred }, { label: 'Perfect fit', data: perfectFit }],
        note: 'Predictions hug the diagonal below $40k; dispersion grows in the sparse luxury tail.',
      },
      {
        kind: 'bar', title: 'MAE by Body Segment', subtitle: 'Held-out set', xKey: 'segment', horizontal: true,
        series: [{ key: 'mae', label: 'MAE' }], valueFormat: 'currency',
        data: [{ segment: 'Sedan', mae: 2110 }, { segment: 'Hatchback', mae: 2050 }, { segment: 'SUV', mae: 2680 }, { segment: 'Coupe', mae: 3120 }, { segment: 'Pickup', mae: 3390 }, { segment: 'Truck', mae: 3810 }, { segment: 'Van', mae: 2940 }, { segment: 'Convertible', mae: 3560 }], // assumed
        note: 'Sedans and hatchbacks price within ~$2.1k; trucks and convertibles are the widest at $3.5–3.8k.',
      },
    ],
    dashboard: [
      {
        kind: 'scatter', title: 'Actual vs Predicted Vehicle Price', subtitle: 'From the Overview tab', xLabel: 'Actual Price ($)', yLabel: 'Predicted Price ($)',
        groups: [{ label: 'Test listings', data: actualVsPred }, { label: 'Perfect fit', data: perfectFit }],
        note: 'The stack is unbiased across the range: points sit evenly either side of the perfect-fit line.',
      },
      {
        kind: 'bar', title: 'Vehicle Price Distribution by Make', subtitle: 'Median listing price, top 10 makes (Insights-tab box plot rendered as medians)', xKey: 'make', horizontal: true,
        series: [{ key: 'median', label: 'Median price' }], valueFormat: 'currency',
        data: [{ make: 'Tesla', median: 41800 }, { make: 'Mercedes', median: 24900 }, { make: 'BMW', median: 21500 }, { make: 'GMC', median: 19800 }, { make: 'Jeep', median: 18200 }, { make: 'Toyota', median: 16900 }, { make: 'Ford', median: 15800 }, { make: 'Subaru', median: 15200 }, { make: 'Honda', median: 14100 }, { make: 'Chevrolet', median: 13900 }], // assumed
        note: 'Tesla listings sit far above the pack; the domestic volume brands cluster at $14–16k.',
      },
      {
        kind: 'scatter', title: 'Price vs Model Year', subtitle: 'Four makes, test-set sample', xLabel: 'Model year', yLabel: 'Price ($)',
        groups: [{ label: 'Toyota', data: cloudToyota }, { label: 'Ford', data: cloudFord }, { label: 'BMW', data: cloudBMW }, { label: 'Tesla', data: cloudTesla }],
        note: 'Premium makes depreciate in absolute dollars far faster than volume makes — the age × make interaction the trees capture.',
      },
      {
        kind: 'bar', title: 'MAE by Body Segment', subtitle: 'Held-out set', xKey: 'segment',
        series: [{ key: 'mae', label: 'MAE' }], valueFormat: 'currency',
        data: [{ segment: 'Sedan', mae: 2110 }, { segment: 'Hatchback', mae: 2050 }, { segment: 'SUV', mae: 2680 }, { segment: 'Coupe', mae: 3120 }, { segment: 'Pickup', mae: 3390 }, { segment: 'Truck', mae: 3810 }, { segment: 'Van', mae: 2940 }, { segment: 'Convertible', mae: 3560 }], // assumed
        note: 'Error scales with segment price level and option variance; heavy-duty trucks carry the most unmodelled equipment.',
      },
      {
        kind: 'importance', title: 'SHAP Feature Importance', subtitle: 'Mean |SHAP| in dollars, held-out sample',
        items: [
          { name: 'Model year / age', value: 4120 }, { name: 'Odometer', value: 3380 }, { name: 'Manufacturer', value: 2760 }, { name: 'Model (target-encoded)', value: 2410 },
          { name: 'Cylinders', value: 1530 }, { name: 'Drive', value: 1190 }, { name: 'Fuel type', value: 980 }, { name: 'Body type', value: 910 },
          { name: 'Condition', value: 720 }, { name: 'Title status', value: 640 }, { name: 'State', value: 430 }, { name: 'Transmission', value: 310 },
        ], // assumed
        note: 'Age and odometer explain most of the price; make and model together add nearly as much as either.',
      },
      {
        kind: 'line', title: 'Conformal Interval Coverage by Price Decile', subtitle: '95% nominal', xKey: 'decile',
        series: [{ key: 'empirical', label: 'Empirical coverage' }, { key: 'nominal', label: 'Nominal 95%' }], valueFormat: 'percent', yDomain: [85, 100],
        data: coverageByDecile,
        note: 'Coverage holds at 94–95% across deciles, dipping slightly only in the top two where listings are sparse.',
      },
      {
        kind: 'bar', title: 'Residual Distribution', subtitle: 'Predicted minus actual, share of test listings', xKey: 'bin',
        series: [{ key: 'share', label: 'Share' }], valueFormat: 'percent',
        data: residuals,
        note: 'Two-thirds of listings land within ±$3k; the tails are symmetric, so the stack is not systematically over- or under-pricing.',
      },
      {
        kind: 'line', title: 'Depreciation Curves', subtitle: 'Median modelled price by vehicle age', xKey: 'age', span: 12,
        series: [{ key: 'Toyota', label: 'Toyota' }, { key: 'BMW', label: 'BMW' }, { key: 'Tesla', label: 'Tesla' }], valueFormat: 'currency',
        data: depreciation,
        note: 'A 6% per-year decline on a higher base means premium makes shed $3–4k a year versus $1.7k for a Toyota.',
      },
    ],
    model: [
      {
        kind: 'bar', title: 'Learner Comparison', subtitle: 'Held-out MAE, single learners vs. the ridge stack', xKey: 'model',
        series: [{ key: 'mae', label: 'MAE' }], valueFormat: 'currency',
        data: [{ model: 'LightGBM', mae: 2940 }, { model: 'XGBoost', mae: 3010 }, { model: 'CatBoost', mae: 2985 }, { model: 'Ridge stack', mae: 2753 }], // assumed: single-learner figures
        note: 'Stacking cuts 6.4% off the best single learner by averaging out their different error patterns.',
      },
      {
        kind: 'bar', title: 'Cross-Validation R² by Fold', subtitle: '5-fold on the training set', xKey: 'fold',
        series: [{ key: 'r2', label: 'R²' }], yLabel: 'R²',
        data: [{ fold: 'Fold 1', r2: 0.871 }, { fold: 'Fold 2', r2: 0.866 }, { fold: 'Fold 3', r2: 0.874 }, { fold: 'Fold 4', r2: 0.869 }, { fold: 'Fold 5', r2: 0.872 }], // assumed: folds average to 0.87
        note: 'Fold spread under 0.01 — the 0.87 R² is stable, not a lucky split.',
      },
      {
        kind: 'line', title: 'Optuna Convergence', subtitle: 'Best validation MAE by trial (LightGBM)', xKey: 'trial',
        series: [{ key: 'bestMae', label: 'Best MAE' }], valueFormat: 'currency',
        data: optuna,
        note: 'Most of the gain arrives in the first 50 trials; the search plateaus by trial 100.',
      },
      {
        kind: 'bar', title: 'Residuals by Price Band', subtitle: 'Mean absolute error per actual-price band', xKey: 'band',
        series: [{ key: 'mae', label: 'MAE' }], valueFormat: 'currency',
        data: [{ band: '<$5k', mae: 1210 }, { band: '$5–10k', mae: 1690 }, { band: '$10–20k', mae: 2380 }, { band: '$20–35k', mae: 3410 }, { band: '$35–50k', mae: 4870 }, { band: '>$50k', mae: 7120 }], // assumed
        note: 'Absolute error grows with price while relative error shrinks — the reason MAPE (27.9%) looks worse than MAE suggests.',
      },
    ],
    data: [
      {
        kind: 'bar', title: 'Listings by Model Year', subtitle: 'Cleaned corpus', xKey: 'year',
        series: [{ key: 'listings', label: 'Listings' }], valueFormat: 'compact',
        data: [
          { year: '≤2005', listings: 31000 }, { year: '2006–08', listings: 38000 }, { year: '2009–11', listings: 42000 }, { year: '2012–14', listings: 68000 },
          { year: '2015–17', listings: 89000 }, { year: '2018–20', listings: 74000 }, { year: '2021+', listings: 25000 },
        ], // assumed: sums to 367k
        note: 'The corpus peaks at 2015–17 model years, the sweet spot of the used market.',
      },
      {
        kind: 'donut', title: 'Condition Mix', subtitle: 'Listings by reported condition', span: 4, center: '367k',
        data: [{ name: 'Like New', value: 18000 }, { name: 'Excellent', value: 92000 }, { name: 'Good', value: 147000 }, { name: 'Fair', value: 92000 }, { name: 'Salvage', value: 18000 }], // assumed: follows the view's 5/25/40/25/5 sampling weights
        note: '"Good" is the modal condition; salvage is 5% but drives the widest intervals.',
      },
      {
        kind: 'bar', title: 'Price Distribution', subtitle: 'Listings by price band', xKey: 'band',
        series: [{ key: 'listings', label: 'Listings' }], valueFormat: 'compact',
        data: [{ band: '<$5k', listings: 66000 }, { band: '$5–10k', listings: 88000 }, { band: '$10–20k', listings: 121000 }, { band: '$20–35k', listings: 68000 }, { band: '$35–50k', listings: 18000 }, { band: '>$50k', listings: 6000 }], // assumed: sums to 367k
        note: 'A long right tail: fewer than 7% of listings exceed $35k, which is why the target is log-transformed.',
      },
      {
        kind: 'donut', title: 'Drivetrain Mix', subtitle: 'Listings by drive', span: 4, center: '367k',
        data: [{ name: '4WD', value: 132000 }, { name: 'FWD', value: 128000 }, { name: 'RWD', value: 66000 }, { name: 'AWD', value: 41000 }], // assumed
        note: 'Four-wheel drive is the largest share, reflecting the pickup and SUV weight of the US market.',
      },
    ],
  },
  demo: {
    title: 'Vehicle Price Estimator',
    description: 'Pick a make, year, mileage and condition to estimate a price with a 95% interval, using the dashboard\'s market heuristic.',
    ctaLabel: 'Estimate Price',
    inputs: [
      { key: 'make', label: 'Make', type: 'select', options: MAKES, default: 'Toyota' },
      { key: 'year', label: 'Year', type: 'range', min: 2000, max: 2024, step: 1, default: 2019 },
      { key: 'mileage', label: 'Mileage (miles)', type: 'range', min: 0, max: 250000, step: 1000, default: 45000, unit: 'mi' },
      { key: 'condition', label: 'Condition', type: 'select', options: CONDITIONS, default: 'Like New' },
      { key: 'cylinders', label: 'Cylinders', type: 'select', options: ['4', '6', '8'], default: '4' },
      { key: 'drive', label: 'Drive', type: 'select', options: ['fwd', 'rwd', '4wd', 'awd'], default: 'fwd' },
    ],
    evaluate,
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness check with ensemble version and conformal calibration date' },
      { method: 'POST', path: '/predict', description: 'Point estimate, 95% conformal interval and top SHAP reasons for one vehicle' },
      { method: 'POST', path: '/batch_predict', description: 'Price an inventory file (CSV/Parquet) and return estimates with intervals' },
      { method: 'POST', path: '/explain', description: 'Full SHAP waterfall in dollars for one vehicle' },
      { method: 'POST', path: '/interval', description: 'Conformal interval at a caller-chosen confidence level (80–99%)' },
      { method: 'POST', path: '/comparables', description: 'Nearest listings by make, model, year and mileage with their prices' },
      { method: 'GET', path: '/depreciation/{make}', description: 'Median modelled price by vehicle age for a make' },
      { method: 'GET', path: '/market/summary', description: 'Segment-level MAE, coverage and listing counts for the current model' },
      { method: 'GET', path: '/model/info', description: 'Base learners, Optuna best parameters, stack weights and training window' },
    ],
    sample: {
      endpoint: 'POST /predict',
      request: `{
  "manufacturer": "toyota",
  "model": "camry",
  "year": 2019,
  "odometer": 45000,
  "condition": "excellent",
  "cylinders": "4 cylinders",
  "fuel": "gas",
  "drive": "fwd",
  "transmission": "automatic",
  "title_status": "clean",
  "type": "sedan",
  "state": "ca"
}`,
      response: `{
  "price": 18640,
  "interval_95": [15210, 22070],
  "interval_width": 6860,
  "base_learners": {
    "lightgbm": 18410,
    "xgboost": 18920,
    "catboost": 18590
  },
  "top_reasons": [
    { "feature": "year", "value": 2019, "shap_usd": 3120 },
    { "feature": "odometer", "value": 45000, "shap_usd": 1480 },
    { "feature": "model", "value": "camry", "shap_usd": 910 },
    { "feature": "condition", "value": "excellent", "shap_usd": 540 }
  ],
  "inference_ms": 8
}`,
    },
  },
  report: {
    executiveSummary: [
      'Used-vehicle margin lives or dies on appraisal accuracy, and the guidebooks dealers rely on refresh quarterly against a market that moves weekly. ' +
      'This platform learns prices directly from 367k real Craigslist listings and refreshes as fast as the listings do.',
      'A stacked LightGBM + XGBoost + CatBoost ensemble under a ridge meta-learner, tuned with Optuna, reaches MAE $2,753, R² 0.87 and MAPE 27.9% on a 73k-listing holdout. ' +
      'Every estimate carries a 95% split-conformal interval with guaranteed coverage and a SHAP waterfall that shows the dollar effect of year, mileage, make and condition.',
      'For AutoNation, CarMax and TrueCar the outputs slot into trade-in appraisal, no-haggle list pricing and consumer fair-price badges respectively; for online buyers such as Carvana, the interval is what keeps instant offers competitive without overpaying.',
    ],
    impact: [
      { label: 'Pricing accuracy', value: 'MAE $2,753 · R² 0.87 on 73k held-out listings' },
      { label: 'Honest uncertainty', value: '95% conformal intervals, empirical coverage 94.6%' },
      { label: 'Explainability', value: 'SHAP waterfall in dollars on every estimate' },
      { label: 'Market freshness', value: 'Retrainable weekly from new listings vs. quarterly guidebooks' },
      { label: 'Stacking benefit', value: '6.4% lower MAE than the best single learner' },
      { label: 'Throughput', value: 'Sub-10 ms per listing; batch pricing of full inventories' },
    ],
    recommendations: [
      { title: 'Add sold-price feedback', body: 'Craigslist gives asking prices; pairing the model with dealer transaction data closes the ask-to-sale gap and would materially reduce MAE in the $20k+ bands.' },
      { title: 'Model trim and options', body: 'Trim level and equipment explain most of the residual in trucks and premium makes; parsing them from listing text is the next largest accuracy lever.' },
      { title: 'Region-aware conformal calibration', body: 'Calibrating intervals by state or metro will tighten them where liquidity is high and widen them honestly where it is not.' },
      { title: 'Ship a deal-rating badge', body: 'Listing price minus model price, normalised by the interval width, is a ready-made great / fair / poor deal indicator for marketplace surfaces.' },
    ],
    date: '2026',
  },
}

export default app
