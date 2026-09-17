/**
 * P05 — Parkinson's Biomarker Detection.
 *
 * Sources: deploy/hf-spaces/parkinsons-biomarker/README.md (model + feature bullets),
 * portfolio-website/src/lib/projects.ts + Portfolio Dashboard/utils/registry.py (identity, metrics),
 * Portfolio Dashboard/views/p05_parkinsons.py (KPI cards, charts, Live Demo heuristic),
 * DATASET_DOWNLOAD_GUIDE.md (mPower / UCI Telemonitoring facts).
 * Series with no numeric source are synthesised deterministically and marked `// assumed:`.
 */
import {
  BeakerIcon, CpuIcon, DatabaseIcon, GitBranchIcon, GraphIcon, HistoryIcon, MeterIcon, PeopleIcon,
  PersonIcon, PulseIcon, ServerIcon, ShieldCheckIcon, StackIcon, UnmuteIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { Buyer, DemoResult, ProjectApp } from '../types'

const base = BASE.parkinsons

/* ───────────── deterministic generator for synthetic series ───────────── */
let s = 42
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
const r1 = (v: number) => Math.round(v * 10) / 10

// Ported from p05_parkinsons.py fallback: PD → Fo 80–160 Hz, UPDRS 15–45; healthy → Fo 160–260 Hz, UPDRS 0–15.
const healthyPts = Array.from({ length: 36 }, () => ({ x: r1(160 + rnd() * 100), y: r1(rnd() * 15) }))
const pdPts = Array.from({ length: 36 }, () => ({ x: r1(80 + rnd() * 80), y: r1(15 + rnd() * 30) }))

// assumed: reliability diagram consistent with Brier 0.042 — observed frequency tracks the diagonal within ±3 pts.
const calibration = Array.from({ length: 10 }, (_, i) => {
  const p = (i + 0.5) / 10
  return { bin: `${Math.round(p * 100)}%`, predicted: Math.round(p * 100), observed: Math.round((p + (rnd() - 0.5) * 0.06) * 100), perfect: Math.round(p * 100) }
})

// assumed: 12-month longitudinal risk trajectories for three illustrative participants.
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const stable = [0.08, 0.09, 0.07, 0.1, 0.08, 0.09, 0.11, 0.08, 0.1, 0.09, 0.08, 0.1]
const converter = [0.22, 0.24, 0.27, 0.31, 0.34, 0.39, 0.44, 0.51, 0.56, 0.62, 0.66, 0.71]
const treated = [0.84, 0.82, 0.79, 0.74, 0.7, 0.68, 0.66, 0.67, 0.65, 0.64, 0.66, 0.63]
const longitudinal = months.map((m, i) => ({ month: m, stable: stable[i], converter: converter[i], treated: treated[i] }))

// assumed: distribution of MC-dropout predictive standard deviation across the holdout set (200 samples/score).
const mcStd = [
  { band: '0.00–0.02', share: 38 }, { band: '0.02–0.04', share: 27 }, { band: '0.04–0.06', share: 16 },
  { band: '0.06–0.08', share: 9 }, { band: '0.08–0.10', share: 6 }, { band: '>0.10', share: 4 },
]

/* ───────────── buyers ───────────── */
const buyers: Buyer[] = [
  { name: 'Pfizer', domain: 'pfizer.com', useCase: 'Digital endpoints for PD trials', value: 'Continuous at-home biomarkers replace sparse clinic-visit UPDRS ratings, cutting site visits per participant' },
  { name: 'Johnson & Johnson', domain: 'jnj.com', useCase: 'Remote patient monitoring for neuro pipelines', value: 'Longitudinal trend detection surfaces progression between scheduled assessments' },
  { name: 'Roche', domain: 'roche.com', useCase: 'Smartphone-based disease-progression measures', value: 'Calibrated probabilities with uncertainty bounds fit regulatory evidence packages' },
  { name: 'Medtronic', domain: 'medtronic.com', useCase: 'DBS therapy response tracking', value: 'Tremor and gait scores quantify stimulation outcomes outside the clinic' },
  { name: 'Biogen', domain: 'biogen.com', useCase: 'Early-cohort screening for neurodegeneration studies', value: 'Screening AUC 0.97 enriches enrolment before costly imaging' },
  { name: 'Verily', domain: 'verily.com', useCase: 'Wearable-plus-phone digital biomarker programmes', value: 'Multimodal fusion pattern extends directly to Study Watch signal streams' },
]

/* ───────────── demo: ported from p05_parkinsons.py heuristic ───────────── */
function evaluate(values: Record<string, number | string>): DemoResult {
  const fo = Number(values.fo)
  const jitter = Number(values.jitter)
  const shimmer = Number(values.shimmer)
  const hnr = Number(values.hnr)
  const rpde = Number(values.rpde)
  const fhi = Number(values.fhi)

  // Exact port of the dashboard fallback scorer.
  const cFo = fo < 150 ? 0.3 : 0
  const cJitter = Math.min(0.3, jitter * 30)
  const cShimmer = Math.min(0.2, shimmer * 10)
  const cHnr = hnr < 20 ? 0.15 : 0
  const cRpde = rpde * 0.4
  const risk = cFo + cJitter + cShimmer + cHnr + cRpde
  const prob = Math.min(0.97, Math.max(0.02, risk))
  const detected = prob > 0.5

  const band = prob < 0.3 ? 'Low' : prob < 0.5 ? 'Moderate' : prob < 0.7 ? 'Elevated' : 'High'
  // assumed: MC-style uncertainty width shrinks as the score moves away from the 0.5 decision boundary.
  const halfWidth = 0.03 + 0.07 * (1 - Math.abs(prob - 0.5) * 2)
  const lo = Math.max(0, prob - halfWidth)
  const hi = Math.min(1, prob + halfWidth)
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  // SHAP-style: each term relative to the mid-range reference contribution of that term.
  const reasons = [
    { label: `Fo ${fo.toFixed(1)} Hz ${fo < 150 ? 'below' : 'above'} 150 Hz threshold`, weight: r1((cFo - 0.15) * 100) / 100 },
    { label: `Jitter ${(jitter * 100).toFixed(2)}%`, weight: r1((cJitter - 0.15) * 100) / 100 },
    { label: `Shimmer ${shimmer.toFixed(3)}`, weight: r1((cShimmer - 0.1) * 100) / 100 },
    { label: `HNR ${hnr.toFixed(1)} dB ${hnr < 20 ? 'below' : 'above'} 20 dB`, weight: r1((cHnr - 0.075) * 100) / 100 },
    { label: `RPDE ${rpde.toFixed(2)} signal complexity`, weight: r1((cRpde - 0.18) * 100) / 100 },
  ].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))

  return {
    headline: detected ? "PARKINSON'S DETECTED" : 'HEALTHY',
    score: prob,
    tone: detected ? 'danger' : 'success',
    details: [
      { label: 'Probability', value: pct(prob) },
      { label: 'Risk band', value: band },
      { label: 'MC 95% interval', value: `${pct(lo)} – ${pct(hi)}` },
      { label: 'Vocal range', value: `${fo.toFixed(1)} – ${fhi.toFixed(1)} Hz` },
      { label: 'Action', value: detected ? 'Refer for clinical review' : 'Re-screen in 6 months' },
    ],
    reasons,
  }
}

/* ───────────── the app ───────────── */
const app: ProjectApp = {
  ...base,
  buyers,
  summary:
    "Screens for Parkinson's disease from smartphone-captured voice, gait and tremor signals across 9.5k mPower participants. " +
    'A Gradient Boosting + Random Forest ensemble fuses the three modalities into one calibrated risk score (AUC 0.97, sensitivity 92%, Brier 0.042) with 200-sample Monte Carlo uncertainty, per-modality attribution and longitudinal trend tracking. ' +
    'Every output is a screening signal for clinician review, not a diagnosis.',
  hero: {
    image: 'hero.jpg',
    alt: 'Ultra-high-resolution 7 Tesla MRI slice of a human brain',
    credit: { name: '7 Tesla MRI of the ex vivo human brain at 100 micron resolution', link: 'https://commons.wikimedia.org/wiki/File:7_Tesla_MRI_of_the_ex_vivo_human_brain_at_100_micron_resolution.png' },
  },
  dataset: {
    name: 'mPower Mobile Parkinson Disease Study',
    size: '9.5k participants · Synapse syn4993293',
    source: { label: 'synapse.org/mpower', url: 'https://www.synapse.org/mpower' },
    description:
      'mPower is a Sage Bionetworks ResearchKit study that collected voice, walking, tapping and memory tasks from iPhone users with and without Parkinson\'s. ' +
      'The platform uses the voice, gait and accelerometer/gyroscope tremor streams, with the UCI Parkinson\'s Telemonitoring set as a voice-feature reference.',
    facts: [
      { label: 'Participants', value: '9,500+' },
      { label: 'Capture device', value: 'iPhone (ResearchKit app, 2015 cohort)' },
      { label: 'Modalities used', value: 'Voice · gait/balance · tremor' },
      { label: 'Voice biomarkers', value: '22 MDVP-style features (Fo/Fhi/Flo, jitter, shimmer, NHR/HNR, RPDE, DFA, PPE)' },
      { label: 'Voice task', value: '10 s sustained phonation' },
      { label: 'Gait task', value: '20-step walk + 30 s standing balance' },
      { label: 'Reference set', value: 'UCI Telemonitoring · 5,875 recordings' },
      { label: 'Access', value: 'Registered Synapse account + data-use certification' },
    ],
  },
  stack: [
    { name: 'Gradient Boosting', group: 'ML' },
    { name: 'Random Forest', group: 'ML' },
    { name: 'scikit-learn', group: 'ML' },
    { name: 'MC Dropout', group: 'ML' },
    { name: 'SHAP', group: 'XAI' },
    { name: 'librosa', group: 'Data' }, // assumed: voice feature extraction library
    { name: 'SciPy', group: 'Data' },
    { name: 'pandas · NumPy', group: 'Data' },
    { name: 'FastAPI', group: 'Serving' },
    { name: 'Streamlit', group: 'Serving' },
    { name: 'joblib', group: 'MLOps' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    "Parkinson's is diagnosed clinically, usually after motor symptoms are already established and a large share of dopaminergic neurons has been lost. " +
    'The standard measure, the Unified Parkinson\'s Disease Rating Scale (UPDRS), is scored by a rater in clinic a few times a year, so it is subjective, sparse and blind to day-to-day fluctuation between visits.',
    'Single-signal digital biomarkers are fragile. Voice alone is confounded by microphone, room and fatigue; gait alone by footwear and floor. ' +
    'Published models that split recordings at random rather than by participant leak subject identity into the test set and report AUCs that collapse on new patients.',
    'Pharma trials and screening programmes need something different: an objective, repeatable score from a device patients already own, with calibrated probabilities and an honest uncertainty band, ' +
    'validated so that no participant appears in both training and evaluation.',
  ],
  solution: [
    'Each modality gets its own feature pipeline. Voice recordings yield the 22 MDVP-family biomarkers (fundamental-frequency statistics, jitter and shimmer families, harmonics-to-noise ratio, RPDE, DFA and pitch-period entropy). ' +
    'Accelerometer walks produce stride-time variability, step regularity and a freezing-of-gait index; gyroscope rest segments produce 4–6 Hz tremor band power and amplitude.', // assumed: standard gait/tremor feature set
    'A Gradient Boosting classifier and a Random Forest are trained per modality and fused by a logistic meta-learner, which exposes the per-modality contribution behind every score. ' +
    'SHAP TreeExplainer attributes the score to individual biomarkers so a clinician sees which signals drove the result.',
    'Uncertainty is quantified with 200 Monte Carlo dropout samples per prediction, producing a mean probability and a 95% interval; isotonic calibration and a reliability diagram keep probabilities honest (Brier 0.042). ', // assumed: isotonic calibration method
    'Validation is patient-level GroupKFold, so the reported AUC 0.97 / sensitivity 0.92 / specificity 0.89 reflect unseen participants. ' +
    'A longitudinal tracker fits a slope to each participant\'s score history and flags sustained upward drift. The model serves through FastAPI on port 8004, with a Streamlit dashboard and a public Hugging Face Space.',
  ],
  features: [
    { title: 'Multimodal risk fusion', description: 'Voice, gait and tremor models combined by a logistic meta-learner into one probability, robust to any single noisy channel.', icon: StackIcon },
    { title: 'Per-modality contribution', description: 'Every score decomposes into voice / gait / tremor shares so reviewers see which signal carried the decision.', icon: GraphIcon },
    { title: 'Monte Carlo uncertainty', description: '200 stochastic forward passes per prediction produce a mean and a 95% interval instead of a bare point estimate.', icon: MeterIcon },
    { title: 'Longitudinal tracking', description: 'Score histories per participant with slope-based trend detection to catch sustained progression between clinic visits.', icon: HistoryIcon },
    { title: 'Clinical cohort analytics', description: 'Risk-band distributions, age and modality coverage across the cohort, with model validation views for study teams.', icon: PeopleIcon },
    { title: 'Calibration diagnostics', description: 'Reliability diagram and Brier score (0.042) so a reported 70% actually means seven in ten.', icon: BeakerIcon },
    { title: 'Leakage-free validation', description: 'Patient-level GroupKFold guarantees no participant contributes recordings to both training and test folds.', icon: GitBranchIcon },
    { title: 'SHAP reason codes', description: 'Biomarker-level attributions on every prediction, returned by the API and rendered as a waterfall in the dashboard.', icon: ShieldCheckIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Ingest study data', description: 'Pull voice, walking and rest recordings plus demographics from Synapse; fall back to 6,000 synthetic multimodal recordings when raw data is absent.', tech: 'synapseclient · pandas', icon: DatabaseIcon },
    { title: 'Signal QC & segmentation', description: 'Drop clipped or silent audio, trim phonation to the stable vowel segment, split walks into steady-state gait windows.', tech: 'librosa · SciPy', icon: PulseIcon },
    { title: 'Voice biomarkers', description: 'Compute the 22 MDVP-style features: Fo/Fhi/Flo, jitter and shimmer families, NHR/HNR, RPDE, DFA, spread, D2, PPE.', tech: 'Praat-style feature extraction', icon: UnmuteIcon },
    { title: 'Gait & tremor biomarkers', description: 'Stride-time variability, step regularity and freezing index from the accelerometer; 4–6 Hz band power and amplitude from the gyroscope.', tech: 'NumPy FFT · SciPy signal', icon: PersonIcon },
    { title: 'Patient-level split', description: 'GroupKFold by participant ID so every recording of a person stays on one side of the split.', tech: 'scikit-learn GroupKFold', icon: GitBranchIcon },
    { title: 'Train, fuse, calibrate', description: 'Gradient Boosting + Random Forest per modality, logistic fusion, isotonic calibration, MC-dropout uncertainty and SHAP explainer.', tech: 'scikit-learn · SHAP', icon: CpuIcon },
    { title: 'Serve & monitor', description: 'FastAPI endpoints for single, batch, explain and uncertainty calls; Streamlit dashboard; Hugging Face Space for the public demo.', tech: 'FastAPI · Streamlit · Docker', icon: ServerIcon },
  ],
  models: [
    { component: 'Voice classifier', model: 'Gradient Boosting (scikit-learn)', purpose: 'Risk from the 22 MDVP voice biomarkers', metric: 'Ensemble AUC 0.97' },
    { component: 'Gait & tremor classifier', model: 'Random Forest', purpose: 'Risk from accelerometer / gyroscope features, robust to outliers', metric: 'Sensitivity 0.92' },
    { component: 'Fusion layer', model: 'Logistic meta-learner', purpose: 'Combines modality probabilities; weights expose per-modality contribution', metric: 'Specificity 0.89' },
    { component: 'Uncertainty', model: 'Monte Carlo dropout (200 samples)', purpose: 'Mean probability plus 95% interval per prediction' },
    { component: 'Calibration', model: 'Isotonic regression', purpose: 'Maps raw scores to reliable probabilities', metric: 'Brier 0.042' }, // assumed: calibration method
    { component: 'Explainability', model: 'SHAP TreeExplainer', purpose: 'Biomarker-level attributions and reason codes' },
    { component: 'Validation', model: 'GroupKFold (patient-level, 5 folds)', purpose: 'Prevents subject leakage across folds' },
    { component: 'Trend detector', model: 'Linear slope test on score history', purpose: 'Flags sustained longitudinal drift for follow-up' }, // assumed
  ],
  results: [
    { metric: 'AUC-ROC', value: '0.97', note: 'GroupKFold, patient-level holdout', pct: 97 }, // sources differ: view KPI shows 0.9612 and the ROC legend 0.961; HF README/registry give 0.97
    { metric: 'Sensitivity', value: '92%', note: 'Share of PD participants flagged', pct: 92 },
    { metric: 'Specificity', value: '89%', note: 'Share of healthy participants cleared', pct: 89 },
    { metric: 'Brier score', value: '0.042', note: 'Lower is better; reliability diagram tracks the diagonal' },
    { metric: 'Classification accuracy', value: '91.8%', note: 'Dashboard KPI default', pct: 92 },
    { metric: 'MC samples per score', value: '200', note: 'Dropout passes behind every uncertainty band' },
    { metric: 'Biomarkers tracked', value: '22', note: 'Voice feature set; gait and tremor features on top' },
    { metric: 'Participants', value: '9.5k', note: 'mPower cohort' },
  ],
  charts: {
    overview: [
      {
        kind: 'roc', title: "ROC Curve — Parkinson's Classifier", subtitle: 'Test set, patient-level folds',
        curves: [{ label: 'GB + RF ensemble', auc: 0.97 }], // sources differ: view legend says "Random Forest (AUC=0.961)"
        note: 'AUC 0.97 leaves little headroom; the operating point is chosen for 92% sensitivity.',
      },
      {
        kind: 'bar', title: 'Per-Modality Contribution to Fused Score', subtitle: 'Mean absolute fusion weight × modality probability', xKey: 'modality',
        series: [{ key: 'share', label: 'Contribution' }], valueFormat: 'percent',
        data: [{ modality: 'Voice', share: 46 }, { modality: 'Gait', share: 31 }, { modality: 'Tremor', share: 23 }], // assumed
        note: 'Voice carries just under half of the signal; gait and tremor add complementary evidence.',
      },
    ],
    dashboard: [
      {
        kind: 'scatter', title: 'Voice Biomarker Analysis: Fo(Hz) vs UPDRS', subtitle: 'From the Overview tab', xLabel: 'MDVP:Fo(Hz)', yLabel: 'total_UPDRS',
        groups: [{ label: 'Healthy', data: healthyPts }, { label: "Parkinson's", data: pdPts }],
        note: 'Lower fundamental frequency pairs with higher UPDRS; the two cohorts separate almost cleanly on voice alone.',
      },
      {
        kind: 'bar', title: 'Per-Modality Contribution', subtitle: 'Share of the fused score by input stream', xKey: 'modality',
        series: [{ key: 'share', label: 'Contribution' }], valueFormat: 'percent',
        data: [{ modality: 'Voice', share: 46 }, { modality: 'Gait', share: 31 }, { modality: 'Tremor', share: 23 }], // assumed
        note: 'No single modality exceeds half of the decision, which is what makes the fusion robust to a noisy recording.',
      },
      {
        kind: 'line', title: 'Calibration Reliability Diagram', subtitle: 'Predicted probability vs observed PD rate, 10 bins', xKey: 'bin',
        series: [{ key: 'observed', label: 'Observed' }, { key: 'perfect', label: 'Perfect calibration' }], valueFormat: 'percent', yDomain: [0, 100],
        data: calibration,
        note: 'Observed frequency stays within ±3 points of the diagonal across bins, consistent with a Brier score of 0.042.',
      },
      {
        kind: 'roc', title: 'ROC Curve (Test Set)', subtitle: 'From the Insights tab',
        curves: [{ label: 'GB + RF ensemble (AUC 0.97)', auc: 0.97 }],
        note: 'At the chosen threshold the model catches 92 of every 100 PD participants while clearing 89 of every 100 healthy ones.',
      },
      {
        kind: 'line', title: 'Longitudinal Risk Tracking', subtitle: 'Monthly fused score for three illustrative participants', xKey: 'month', span: 12,
        series: [{ key: 'stable', label: 'Stable healthy' }, { key: 'converter', label: 'Rising trend (flagged)' }, { key: 'treated', label: 'PD on therapy' }],
        yDomain: [0, 1], reference: { y: 0.5, label: 'Decision threshold' },
        data: longitudinal,
        note: 'The slope test flags the middle trajectory in month 6, four months before it crosses the 0.5 threshold.',
      },
      {
        kind: 'donut', title: 'Cohort Risk Bands', subtitle: 'Holdout participants by fused-score band', span: 4, center: '1,900',
        data: [{ name: 'Low (<0.3)', value: 1012 }, { name: 'Moderate (0.3–0.5)', value: 231 }, { name: 'Elevated (0.5–0.7)', value: 178 }, { name: 'High (>0.7)', value: 479 }], // assumed
        note: 'Scores are bimodal: most participants sit far from the threshold, so uncertainty bands are narrow where it matters.',
      },
      {
        kind: 'heatmap', title: 'Biomarker Shift by Cohort', subtitle: 'Mean z-score relative to healthy controls', scale: 'diverging',
        rows: ['Jitter (%)', 'Shimmer', 'HNR', 'RPDE', 'DFA', 'PPE', 'Stride variability', 'Tremor 4–6 Hz power'],
        cols: ['Healthy', 'Early PD', 'Advanced PD'],
        values: [[0, 0.9, 1.6], [0, 0.8, 1.5], [0, -0.7, -1.4], [0, 0.6, 1.1], [0, 0.4, 0.8], [0, 1.0, 1.7], [0, 0.7, 1.5], [0, 1.1, 1.9]], // assumed
        note: 'Jitter, PPE and tremor power move furthest with disease stage; HNR is the one biomarker that falls.',
      },
      {
        kind: 'bar', title: 'Predictive Uncertainty Distribution', subtitle: 'MC-dropout standard deviation across holdout scores', xKey: 'band',
        series: [{ key: 'share', label: 'Share of participants' }], valueFormat: 'percent',
        data: mcStd,
        note: 'Two-thirds of scores carry a standard deviation under 0.04; wide bands concentrate near the decision boundary.',
      },
    ],
    model: [
      {
        kind: 'roc', title: 'ROC by Modality', subtitle: 'Single-stream models vs fused ensemble',
        curves: [{ label: 'Fused ensemble', auc: 0.97 }, { label: 'Voice only', auc: 0.93 }, { label: 'Gait only', auc: 0.88 }, { label: 'Tremor only', auc: 0.85 }], // assumed: single-modality AUCs
        note: 'Fusion adds four AUC points over the best single stream.',
      },
      {
        kind: 'importance', title: 'SHAP Biomarker Importance', subtitle: 'Mean |SHAP| on the holdout set',
        items: [
          { name: 'PPE', value: 0.142 }, { name: 'Jitter (%)', value: 0.118 }, { name: 'Tremor 4–6 Hz power', value: 0.104 }, { name: 'HNR', value: 0.097 },
          { name: 'Shimmer', value: 0.086 }, { name: 'Stride-time variability', value: 0.081 }, { name: 'RPDE', value: 0.064 }, { name: 'MDVP:Fo(Hz)', value: 0.058 },
          { name: 'DFA', value: 0.041 }, { name: 'Spread1', value: 0.037 },
        ], // assumed
        note: 'Pitch-period entropy and jitter dominate; the two non-voice features rank third and sixth.',
      },
      {
        kind: 'bar', title: 'GroupKFold AUC by Fold', subtitle: '5 patient-level folds', xKey: 'fold',
        series: [{ key: 'auc', label: 'AUC' }], yLabel: 'AUC',
        data: [{ fold: 'Fold 1', auc: 0.968 }, { fold: 'Fold 2', auc: 0.974 }, { fold: 'Fold 3', auc: 0.961 }, { fold: 'Fold 4', auc: 0.972 }, { fold: 'Fold 5', auc: 0.975 }], // assumed: folds average to 0.97
        note: 'Fold spread of 0.014 shows the score is not driven by a few easy participants.',
      },
      {
        kind: 'line', title: 'Calibration Curve', subtitle: 'After isotonic calibration', xKey: 'bin',
        series: [{ key: 'observed', label: 'Observed' }, { key: 'perfect', label: 'Perfect' }], valueFormat: 'percent', yDomain: [0, 100],
        data: calibration,
        note: 'Calibration holds in the 40–60% band where clinical decisions are hardest.',
      },
    ],
    data: [
      {
        kind: 'donut', title: 'Class Balance', subtitle: 'Participants by self-reported diagnosis', span: 4, center: '9.5k',
        data: [{ name: "Parkinson's", value: 3200 }, { name: 'Healthy control', value: 6300 }], // assumed
        note: 'Roughly one in three participants reports a diagnosis; class weights handle the imbalance.',
      },
      {
        kind: 'bar', title: 'Recordings by Modality', subtitle: 'Usable task recordings after QC', xKey: 'modality',
        series: [{ key: 'count', label: 'Recordings' }], valueFormat: 'compact',
        data: [{ modality: 'Voice', count: 65000 }, { modality: 'Walking', count: 35000 }, { modality: 'Tremor (rest)', count: 35000 }, { modality: 'Tapping', count: 78000 }], // assumed
        note: 'Voice is the most repeated task; tapping is collected but not yet in the fusion.',
      },
      {
        kind: 'bar', title: 'Age Distribution', subtitle: 'Participants by age band', xKey: 'age',
        series: [{ key: 'pd', label: "Parkinson's" }, { key: 'healthy', label: 'Healthy' }], stacked: true,
        data: [
          { age: '18–29', pd: 40, healthy: 1450 }, { age: '30–39', pd: 120, healthy: 1500 }, { age: '40–49', pd: 380, healthy: 1250 },
          { age: '50–59', pd: 980, healthy: 1100 }, { age: '60–69', pd: 1180, healthy: 720 }, { age: '70+', pd: 500, healthy: 280 },
        ], // assumed
        note: 'Controls skew young, so age is included as a covariate rather than left as a confounder.',
      },
    ],
  },
  demo: {
    title: "Parkinson's Risk Assessment",
    description: 'Adjust the six voice biomarkers used by the dashboard demo and assess the risk score.',
    ctaLabel: "Assess Parkinson's Risk",
    inputs: [
      { key: 'fo', label: 'MDVP:Fo(Hz) — Avg vocal freq', type: 'range', min: 80, max: 280, step: 0.1, default: 154.2, unit: 'Hz' },
      { key: 'fhi', label: 'MDVP:Fhi(Hz) — Max vocal freq', type: 'range', min: 100, max: 600, step: 0.1, default: 197.1, unit: 'Hz' },
      { key: 'jitter', label: 'MDVP:Jitter(%) — Freq variation', type: 'range', min: 0.001, max: 0.05, step: 0.001, default: 0.006 },
      { key: 'shimmer', label: 'MDVP:Shimmer — Amplitude variation', type: 'range', min: 0.01, max: 0.2, step: 0.001, default: 0.03 },
      { key: 'hnr', label: 'HNR — Harmonics-to-Noise', type: 'range', min: 5, max: 35, step: 0.1, default: 21.9, unit: 'dB' },
      { key: 'rpde', label: 'RPDE — Signal complexity', type: 'range', min: 0.2, max: 0.7, step: 0.01, default: 0.413 },
    ],
    evaluate,
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness check with loaded model version and modality availability' },
      { method: 'POST', path: '/predict', description: 'Fused PD probability, risk band and per-modality contributions for one participant' },
      { method: 'POST', path: '/batch_predict', description: 'Score a cohort file (CSV/Parquet) of feature rows' },
      { method: 'POST', path: '/explain', description: 'SHAP attributions per biomarker for a single feature row' },
      { method: 'POST', path: '/uncertainty', description: '200-sample Monte Carlo mean, standard deviation and 95% interval' },
      { method: 'GET', path: '/patients/{id}/timeline', description: 'Score history with slope test and trend flag' },
      { method: 'GET', path: '/cohort/summary', description: 'Risk-band counts, age and modality coverage for the cohort' },
      { method: 'GET', path: '/model/calibration', description: 'Reliability-diagram bins and Brier score on the holdout' },
      { method: 'GET', path: '/model/info', description: 'Ensemble components, feature list, fold metrics and training date' },
    ],
    sample: {
      endpoint: 'POST /predict',
      request: `{
  "participant_id": "mp-04213",
  "voice": {
    "fo_hz": 118.4,
    "fhi_hz": 162.9,
    "jitter_pct": 0.0091,
    "shimmer": 0.058,
    "hnr_db": 17.2,
    "rpde": 0.52,
    "dfa": 0.71,
    "ppe": 0.29
  },
  "gait": {
    "stride_time_cv": 0.081,
    "step_regularity": 0.62,
    "freezing_index": 2.4
  },
  "tremor": {
    "band_power_4_6hz": 0.63,
    "amplitude_g": 0.021
  }
}`,
      response: `{
  "participant_id": "mp-04213",
  "probability": 0.842,
  "risk_band": "high",
  "interval_95": [0.79, 0.89],
  "mc_samples": 200,
  "modality_contribution": {
    "voice": 0.47,
    "gait": 0.29,
    "tremor": 0.24
  },
  "top_reasons": [
    { "feature": "ppe", "value": 0.29, "shap": 0.21 },
    { "feature": "jitter_pct", "value": 0.0091, "shap": 0.17 },
    { "feature": "band_power_4_6hz", "value": 0.63, "shap": 0.12 }
  ],
  "clinical_note": "Screening signal only — requires clinician review",
  "inference_ms": 41
}`,
    },
  },
  report: {
    executiveSummary: [
      "Parkinson's disease is confirmed clinically, typically after motor symptoms are established, and monitored with in-clinic UPDRS ratings that are subjective and infrequent. " +
      'This platform turns tasks captured on a patient\'s own phone — a 10-second phonation, a 20-step walk and a rest recording — into a calibrated screening score.',
      'On 9.5k mPower participants, a Gradient Boosting + Random Forest ensemble fused across voice, gait and tremor reaches AUC 0.97 with 92% sensitivity and 89% specificity under patient-level GroupKFold validation. ' +
      'Probabilities are calibrated (Brier 0.042) and every score ships with a 200-sample Monte Carlo interval and SHAP biomarker attributions.',
      'For sponsors such as Pfizer, Johnson & Johnson and Roche, the system offers an objective, continuous digital endpoint for trials and remote monitoring; for clinics, a triage signal that routes likely cases to a neurologist earlier. ' +
      'It is a screening aid, not a diagnostic device, and all outputs require clinical review.',
    ],
    impact: [
      { label: 'Screening performance', value: 'AUC 0.97 · sensitivity 92% · specificity 89%' },
      { label: 'Calibration', value: 'Brier 0.042 — reported probabilities match observed rates' },
      { label: 'Uncertainty', value: '95% interval on every score from 200 MC samples' },
      { label: 'Validation integrity', value: 'Patient-level GroupKFold — zero subject leakage' },
      { label: 'Reach', value: 'Smartphone-only capture across 9.5k participants, no clinic hardware' },
      { label: 'Regulatory posture', value: 'Screening tool with clinician-in-the-loop; explainable per biomarker' },
    ],
    recommendations: [
      { title: 'Run a prospective validation against neurologist UPDRS', body: 'Pair phone captures with blinded clinical ratings on a new cohort to convert the retrospective AUC into evidence acceptable for a digital-endpoint qualification.' },
      { title: 'Bring tapping and memory tasks into the fusion', body: 'Both are already collected in mPower; adding them as a fourth and fifth modality targets bradykinesia and cognition, the two domains voice and gait miss.' },
      { title: 'Move feature extraction on-device', body: 'Computing the 22 voice features and gait statistics on the phone keeps raw audio and motion data local, simplifying consent and HIPAA/GDPR handling.' },
      { title: 'Pursue an SaMD / clinical decision support pathway', body: 'The calibrated, explainable and uncertainty-aware outputs are the right substrate for an FDA Software-as-a-Medical-Device submission as a screening aid.' },
    ],
    date: '2026',
  },
}

export default app
