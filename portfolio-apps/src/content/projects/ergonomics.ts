/**
 * P08 — Workplace Ergonomics AI.
 *
 * Sources: deploy/hf-spaces/workplace-ergonomics/README.md (features, model, business impact),
 * portfolio-website/src/lib/projects.ts + Portfolio Dashboard/utils/registry.py (identity, metrics, stack),
 * Portfolio Dashboard/views/p08_ergonomics.py (KPI cards, REBA distribution chart, REBA calculator, ROI calculator),
 * DATASET_DOWNLOAD_GUIDE.md (COCO keypoints facts).
 * Series with no numeric source are synthesised deterministically and marked `// assumed:`.
 */
import {
  AccessibilityIcon, CpuIcon, DeviceCameraVideoIcon, GraphIcon, HistoryIcon,
  LawIcon, LocationIcon, MeterIcon, PersonIcon, ReportIcon, ServerIcon, SyncIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { Buyer, DemoResult, ProjectApp } from '../types'

const base = BASE.ergonomics

/* ───────────── deterministic generator for synthetic series ───────────── */
let s = 42
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647

// From p08_ergonomics.py Overview tab — exact counts.
const rebaLevels = [
  { level: 'Negligible (1)', workers: 142 }, { level: 'Low (2-3)', workers: 389 }, { level: 'Medium (4-7)', workers: 521 },
  { level: 'High (8-10)', workers: 234 }, { level: 'Very High (11-15)', workers: 87 },
]
const totalAssessed = rebaLevels.reduce((a, b) => a + b.workers, 0) // 1,373

// assumed: 90-day claim probability by REBA score from a NIOSH-style logistic model (HF README: "logistic regression on REBA score distributions").
const claimCurve = Array.from({ length: 15 }, (_, i) => {
  const reba = i + 1
  const p = 1 / (1 + Math.exp(-(0.42 * reba - 4.6)))
  return { reba: String(reba), probability: Math.round(p * 1000) / 10 }
})

// assumed: 12-week claim forecast, baseline vs post-intervention; HF README gives −43% claims at steady state.
const forecast = Array.from({ length: 12 }, (_, i) => {
  const baseline = 3.6 + Math.sin(i / 2) * 0.4 + (rnd() - 0.5) * 0.3
  const ramp = Math.min(1, i / 7)
  return { week: `W${i + 1}`, baseline: Math.round(baseline * 10) / 10, withAI: Math.round(baseline * (1 - 0.43 * ramp) * 10) / 10 }
})

// assumed: 30-day shift compliance trend (share of observations at REBA ≤ 3).
const compliance = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`, compliant: Math.round((48 + i * 0.9 + (rnd() - 0.5) * 4) * 10) / 10,
}))

// Ported from the Insights-tab ROI calculator with its defaults (injury rate 35/1000, claim $28k, REBA 7 → 4).
const roiByFacility = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000].map((n) => {
  const before = 7, after = Math.max(1, before - 3)
  const reduction = (before - after) / before
  const prevented = Math.floor(n * (35 / 1000) * reduction)
  return { workers: String(n), prevented, savings: prevented * 28 * 1000 }
})

/* ───────────── buyers ───────────── */
const buyers: Buyer[] = [
  { name: 'Amazon', domain: 'amazon.com', useCase: 'Fulfilment-centre lifting and tote handling', value: 'Camera-based REBA on pick lines targets the largest MSD source in the network' },
  { name: 'FedEx', domain: 'fedex.com', useCase: 'Package sort and trailer loading', value: 'Zone heatmaps show which docks and shifts drive claims' },
  { name: 'Boeing', domain: 'boeing.com', useCase: 'Overhead and confined-space assembly', value: 'Upper-arm and neck scores flag sustained overhead work before it becomes a claim' },
  { name: 'DHL', domain: 'dhl.com', useCase: 'Warehouse and parcel hub ergonomics', value: '43% fewer MSD claims and $380k/year modelled for a 120-worker site' },
  { name: 'Toyota', domain: 'toyota.com', useCase: 'Assembly-line workstation design', value: 'Pre/post REBA comparison quantifies every kaizen change' },
  { name: 'UPS', domain: 'ups.com', useCase: 'Preload and driver-loading posture', value: 'Shift compliance reports slot into existing OSHA recordkeeping' },
]

/* ───────────── demo: exact port of compute_reba_score() ───────────── */
const COUPLING: Record<string, number> = { Good: 0, Fair: 1, Poor: 2 }
const ACTION: Record<string, string> = {
  Negligible: 'No action required', Low: 'Change may be needed', Medium: 'Further investigation and changes soon',
  High: 'Investigate and implement changes', 'Very High': 'Implement changes immediately',
}

function evaluate(values: Record<string, number | string>): DemoResult {
  const neck = Number(values.neck)
  const trunk = Number(values.trunk)
  const upperArm = Number(values.upperArm)
  const lowerArm = Number(values.lowerArm)
  const wrist = Number(values.wrist)
  const load = Number(values.load)
  const coupling = COUPLING[String(values.coupling)] ?? 1

  const neckScore = neck <= 20 ? 1 : neck <= 45 ? 2 : 3
  const trunkScore = trunk <= 5 ? 1 : trunk <= 20 ? 2 : trunk <= 60 ? 3 : 4
  const armScore = upperArm <= 20 ? 1 : upperArm <= 45 ? 2 : upperArm <= 90 ? 3 : 4
  const loadAdj = load < 5 ? 0 : load < 10 ? 1 : 2
  const reba = Math.min(15, Math.max(1, neckScore + trunkScore + armScore + loadAdj + coupling))
  const level = reba <= 1 ? 'Negligible' : reba <= 3 ? 'Low' : reba <= 7 ? 'Medium' : reba <= 10 ? 'High' : 'Very High'
  const tone = level === 'Negligible' || level === 'Low' ? 'success' : level === 'Medium' ? 'attention' : 'danger'

  // SHAP-style: each component relative to a neutral posture (neck 1, trunk 1, arm 1, load 0, coupling 0 → REBA 3).
  const reasons = [
    { label: `Neck ${neck}° → score ${neckScore}`, weight: neckScore - 1 },
    { label: `Trunk ${trunk}° → score ${trunkScore}`, weight: trunkScore - 1 },
    { label: `Upper arm ${upperArm}° → score ${armScore}`, weight: armScore - 1 },
    { label: `Load ${load.toFixed(1)} kg → +${loadAdj}`, weight: loadAdj },
    { label: `Grip ${String(values.coupling)} → +${coupling}`, weight: coupling },
  ].sort((a, b) => b.weight - a.weight)

  return {
    headline: `REBA ${reba} · ${level}`,
    score: reba / 15,
    tone,
    details: [
      { label: 'REBA score', value: `${reba} / 15` },
      { label: 'Risk level', value: level },
      { label: 'Action required', value: ACTION[level] },
      { label: 'Posture scores', value: `neck ${neckScore} · trunk ${trunkScore} · arm ${armScore}` },
      { label: 'Lower arm / wrist', value: `${lowerArm}° / ${wrist}° (recorded; not scored in the simplified table)` },
    ],
    reasons,
  }
}

/* ───────────── the app ───────────── */
const app: ProjectApp = {
  ...base,
  buyers,
  summary:
    'Real-time ergonomic risk scoring from ordinary workplace cameras: YOLOv8n-Pose extracts 17 COCO keypoints per worker, joint angles feed the REBA and RULA tables, and every observation lands in a 1–15 risk band with an action. ' +
    'Session histories, zone heatmaps, pre/post intervention tracking and a NIOSH-style 90-day claim forecast turn posture into a managed safety metric. ' +
    'Modelled impact for a 120-worker facility: 43% fewer musculoskeletal claims and $380k saved per year.',
  hero: {
    image: 'hero.jpg',
    alt: 'Warehouse worker lifting and installing a large glass panel',
    credit: { name: 'Worker installs a glass panel in a warehouse', link: 'https://commons.wikimedia.org/wiki/File:Worker_installs_a_glass_panel_in_a_warehouse.jpg' },
  },
  dataset: {
    name: 'COCO 2017 Keypoints (pre-trained pose model)',
    size: '17 keypoints · ~240 MB annotations',
    source: { label: 'cocodataset.org', url: 'https://cocodataset.org' },
    description:
      'The pose backbone is pre-trained on COCO 2017 person keypoints, so no site-specific training data is needed for inference. ' +
      'REBA/RULA scoring is rule-based on top of the detected joints; site footage is used only for calibration and validation of the angle thresholds.',
    facts: [
      { label: 'Keypoints per person', value: '17 (nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles)' },
      { label: 'Annotation download', value: 'annotations_trainval2017.zip · ~240 MB' },
      { label: 'Train / val images', value: '118k / 5k (2017 split)' }, // assumed: standard COCO 2017 split sizes
      { label: 'Pose model', value: 'YOLOv8n-Pose · ONNX 6.2 MB' },
      { label: 'Scoring standard', value: 'REBA (1–15) and RULA (1–7), validated against ISO 9241-110' },
      { label: 'Optional fine-tune set', value: 'NTU RGB+D 120 · 114,480 action samples (request access)' },
      { label: 'Training required for inference', value: 'None — pre-trained keypoints + rule-based scoring' },
    ],
  },
  stack: [
    { name: 'YOLOv8n-Pose', group: 'Vision' },
    { name: 'MediaPipe Pose', group: 'Vision' }, // sources differ: HF README runs MediaPipe Pose (33 landmarks); registry/stack list YOLOv8n-Pose (17 keypoints)
    { name: 'OpenCV', group: 'Vision' },
    { name: 'ONNX Runtime', group: 'MLOps' },
    { name: 'REBA / RULA tables', group: 'ML' },
    { name: 'Logistic regression (NIOSH)', group: 'ML' },
    { name: 'NumPy · pandas', group: 'Data' },
    { name: 'FastAPI', group: 'Serving' },
    { name: 'Streamlit', group: 'Serving' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    'Musculoskeletal disorders are the largest category of lost-time workplace injury in warehousing, logistics and assembly. ' +
    'Claims are expensive, slow to resolve, and driven by postures — bent trunks, raised arms, twisted necks under load — that repeat thousands of times per shift before anyone notices.',
    'Ergonomic assessment today is manual: a specialist observes a task, fills in a REBA or RULA worksheet, and comes back next quarter. ' +
    'Coverage is a handful of tasks per year, scores vary by assessor, and there is no way to see whether a workstation change actually lowered risk.',
    'Safety teams need continuous, consistent scoring across every zone and shift, an early-warning signal that links posture to expected claims, and a report format that fits OSHA recordkeeping.',
  ],
  solution: [
    'Existing cameras feed a YOLOv8n-Pose model exported to ONNX (6.2 MB) that detects each worker and returns 17 COCO keypoints per frame. ' +
    'Joint angles — neck flexion, trunk flexion, upper-arm elevation, lower-arm and wrist deviation — are computed from keypoint geometry and smoothed over a short window to suppress single-frame jitter.', // assumed: temporal smoothing step
    'The angles enter the standard REBA tables (Group A: neck, trunk, legs; Group B: upper arm, lower arm, wrist; plus load/force and coupling) to produce a 1–15 score and a risk band with a prescribed action; RULA runs alongside for seated and upper-limb tasks. ' +
    'The dashboard demo ships a simplified REBA heuristic so the decision surface can be explored without a camera.',
    'Every observation is stored against worker session, zone and shift. From that stream the platform builds zone risk heatmaps, per-worker trend lines, pre/post comparisons for interventions, and a logistic 90-day injury-claim forecast fitted on REBA score distributions following the NIOSH approach.',
    'Shift-level compliance and OSHA-format reports are generated automatically. A FastAPI service on port 8007 exposes scoring, sessions, forecasts and reports; the Streamlit dashboard and a Hugging Face Space provide the interactive views.',
  ],
  features: [
    { title: 'Real-time REBA & RULA scoring', description: 'Keypoints to joint angles to standard risk tables, on every frame, with the action each band prescribes.', icon: AccessibilityIcon },
    { title: 'Worker session history', description: 'Per-worker score trajectories across shifts, with trend flags when sustained high-risk posture appears.', icon: HistoryIcon },
    { title: 'Zone risk heatmaps', description: 'Mean REBA by zone and hour reveals which docks, lines and shifts generate the risk.', icon: LocationIcon },
    { title: 'Intervention tracking', description: 'Pre/post REBA comparison for workstation changes, so every fix is measured rather than assumed.', icon: SyncIcon },
    { title: '90-day injury forecast', description: 'Logistic claim-probability model on REBA distributions, in the NIOSH style, projected per zone and facility.', icon: GraphIcon },
    { title: 'Shift compliance reports', description: 'Share of observations within acceptable REBA, exported in OSHA-ready format per shift.', icon: ReportIcon },
    { title: 'Edge-ready inference', description: 'ONNX export at 6.2 MB runs on CPU beside the camera; no video leaves the site.', icon: CpuIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Capture', description: 'Frames from fixed workplace cameras or uploaded clips, resized and normalised for the pose model.', tech: 'OpenCV', icon: DeviceCameraVideoIcon },
    { title: 'Pose estimation', description: 'YOLOv8n-Pose (COCO pre-trained) detects each worker and returns 17 keypoints with confidences.', tech: 'YOLOv8n-Pose · ONNX Runtime', icon: PersonIcon },
    { title: 'Joint angles', description: 'Vector geometry between keypoints gives neck, trunk, upper-arm, lower-arm and wrist angles; low-confidence joints are interpolated.', tech: 'NumPy', icon: MeterIcon },
    { title: 'Temporal smoothing', description: 'Short exponential window on angles removes frame jitter before scoring.', tech: 'EMA filter', icon: SyncIcon }, // assumed
    { title: 'REBA / RULA scoring', description: 'Standard tables plus load and coupling adjustments produce a 1–15 score, risk band and action.', tech: 'Rule-based scorer', icon: LawIcon },
    { title: 'Aggregate & forecast', description: 'Observations roll up into sessions, zones and shifts; logistic model forecasts 90-day claim probability.', tech: 'pandas · scikit-learn', icon: GraphIcon },
    { title: 'Serve & report', description: 'FastAPI endpoints, Streamlit dashboard, OSHA-format shift reports.', tech: 'FastAPI · Streamlit', icon: ServerIcon },
  ],
  models: [
    { component: 'Pose estimator', model: 'YOLOv8n-Pose (COCO 2017 keypoints)', purpose: '17 keypoints per worker, exported to ONNX', metric: '6.2 MB · mAP50 80.1 on COCO val' }, // assumed: Ultralytics published figure for yolov8n-pose
    { component: 'Browser fallback', model: 'MediaPipe Pose', purpose: '33-landmark CPU inference used by the Hugging Face Space' }, // sources differ: HF README lists MediaPipe Pose
    { component: 'Angle extractor', model: 'Keypoint vector geometry', purpose: 'Neck, trunk, upper/lower arm and wrist angles from joints' },
    { component: 'REBA scorer', model: 'Rapid Entire Body Assessment tables', purpose: 'Whole-body score 1–15 with load and coupling adjustments', metric: 'Validated against ISO 9241-110' },
    { component: 'RULA scorer', model: 'Rapid Upper Limb Assessment tables', purpose: 'Upper-limb score 1–7 for seated and bench tasks' },
    { component: 'Injury forecaster', model: 'Logistic regression on REBA distributions', purpose: '90-day claim probability per worker and zone (NIOSH model)' },
    { component: 'Trend detector', model: 'Rolling-window slope on session scores', purpose: 'Flags sustained deterioration for supervisors' }, // assumed
  ],
  results: [
    { metric: 'MSD claims reduction', value: '−43%', note: 'Modelled for a 120-worker facility', pct: 43 },
    { metric: 'Annual savings', value: '$380k', note: 'Same 120-worker facility' },
    { metric: 'Keypoints tracked', value: '17', note: 'COCO body model per worker' },
    { metric: 'ONNX model size', value: '6.2 MB', note: 'YOLOv8n-Pose export, CPU-deployable' },
    { metric: 'REBA score range', value: '1 – 15', note: 'Five risk bands with prescribed actions' },
    { metric: 'Assessments in cohort', value: '1,373', note: 'Overview distribution; 61% at Medium or above' },
    { metric: 'Pose mAP50 (COCO val)', value: '80.1', note: 'Published YOLOv8n-Pose figure', pct: 80 }, // assumed
    { metric: 'Standard', value: 'ISO 9241-110', note: 'REBA/RULA scoring validated against it' },
  ],
  charts: {
    overview: [
      {
        kind: 'bar', title: 'Worker Posture Risk Distribution (REBA Assessment)', subtitle: 'From the Overview tab', xKey: 'level', yLabel: 'Worker Count',
        series: [{ key: 'workers', label: 'Workers' }],
        data: rebaLevels,
        note: '842 of 1,373 assessments (61%) sit at Medium risk or above — the population the intervention programme targets.',
      },
      {
        kind: 'line', title: '90-Day Injury Claim Forecast', subtitle: 'Expected claims per 1,000 workers per week', xKey: 'week', span: 12,
        series: [{ key: 'baseline', label: 'Baseline' }, { key: 'withAI', label: 'With intervention' }],
        data: forecast,
        note: 'Once interventions ramp in, the forecast settles 43% under baseline, matching the modelled claims reduction.',
      },
    ],
    dashboard: [
      {
        kind: 'bar', title: 'Worker Posture Risk Distribution (REBA Assessment)', subtitle: 'Worker count by risk level', xKey: 'level', yLabel: 'Worker Count',
        series: [{ key: 'workers', label: 'Workers' }],
        data: rebaLevels,
        note: 'Medium (4–7) is the modal band; 87 workers score Very High and need immediate change.',
      },
      {
        kind: 'donut', title: 'Risk Band Share', subtitle: 'Same cohort as a share of assessments', span: 4, center: String(totalAssessed),
        data: rebaLevels.map((r) => ({ name: r.level, value: r.workers })),
        note: 'Roughly one in four assessments is High or Very High.',
      },
      {
        kind: 'line', title: '90-Day Injury Claim Forecast', subtitle: 'Claims per 1,000 workers per week, baseline vs with AI', xKey: 'week', span: 12,
        series: [{ key: 'baseline', label: 'Baseline' }, { key: 'withAI', label: 'With intervention' }],
        data: forecast,
        note: 'The gap opens within seven weeks as workstation changes take effect.',
      },
      {
        kind: 'heatmap', title: 'Mean Joint Angle by Task', subtitle: 'Degrees from neutral, averaged over sessions',
        rows: ['Pallet lift', 'Overhead reach', 'Conveyor pick', 'Bin sort', 'Cart push', 'Drill assembly'],
        cols: ['Neck', 'Trunk', 'Upper arm', 'Lower arm', 'Wrist'],
        values: [[28, 48, 35, 95, 12], [42, 8, 112, 70, 18], [22, 24, 40, 100, 15], [35, 38, 30, 105, 22], [12, 15, 25, 110, 8], [30, 10, 55, 85, 28]], // assumed
        note: 'Pallet lifts load the trunk; overhead reach loads neck and upper arm — the two tasks that need different fixes.',
      },
      {
        kind: 'heatmap', title: 'Zone Risk Heatmap', subtitle: 'Mean REBA by zone and hour of shift',
        rows: ['Dock A', 'Dock B', 'Pack line 1', 'Pack line 2', 'Returns', 'Mezzanine'],
        cols: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
        values: [
          [5.2, 6.1, 7.4, 6.8, 7.9, 8.6, 8.1, 6.3], [4.8, 5.5, 6.2, 5.9, 6.6, 7.2, 7.5, 5.8], [3.9, 4.2, 4.8, 4.6, 5.1, 5.6, 5.3, 4.4],
          [4.1, 4.4, 5.0, 4.9, 5.4, 5.9, 5.7, 4.6], [6.0, 6.4, 7.1, 6.7, 7.3, 7.8, 7.6, 6.2], [5.5, 5.9, 6.5, 6.3, 6.9, 7.4, 7.0, 5.7],
        ], // assumed
        note: 'Risk climbs through the shift at every zone; Dock A after 16:00 is the hottest cell.',
      },
      {
        kind: 'bar', title: 'Intervention Effectiveness', subtitle: 'Mean REBA before vs after workstation changes', xKey: 'zone',
        series: [{ key: 'before', label: 'Before' }, { key: 'after', label: 'After' }],
        data: [
          { zone: 'Dock A', before: 7.8, after: 4.6 }, { zone: 'Dock B', before: 6.4, after: 4.1 }, { zone: 'Pack line 1', before: 4.9, after: 3.2 },
          { zone: 'Pack line 2', before: 5.2, after: 3.4 }, { zone: 'Returns', before: 7.1, after: 4.3 }, { zone: 'Mezzanine', before: 6.6, after: 4.0 },
        ], // assumed
        note: 'Every zone drops at least 1.7 REBA points; docks gain the most from lift-assist tables.',
      },
      {
        kind: 'line', title: 'Shift Compliance Trend', subtitle: 'Share of observations at REBA ≤ 3, last 30 days', xKey: 'day', span: 12,
        series: [{ key: 'compliant', label: 'Compliant observations' }], valueFormat: 'percent', yDomain: [0, 100], reference: { y: 70, label: 'Target' },
        data: compliance,
        note: 'Compliance climbs about a point a day as interventions roll out and crosses the 70% target in the final week.',
      },
      {
        kind: 'bar', title: 'Annual Savings by Facility Size', subtitle: 'Insights-tab ROI calculator at default inputs (35 injuries/1,000 · $28k claim · REBA 7 → 4)', xKey: 'workers',
        series: [{ key: 'savings', label: 'Annual savings' }], valueFormat: 'currency', yLabel: 'USD',
        data: roiByFacility.map((r) => ({ workers: r.workers, savings: r.savings })),
        note: 'Savings scale linearly at roughly $420 per worker per year under the default assumptions.',
      },
    ],
    model: [
      {
        kind: 'importance', title: 'REBA Component Contribution', subtitle: 'Mean score contribution across high-risk observations',
        items: [
          { name: 'Trunk flexion', value: 2.4 }, { name: 'Upper arm elevation', value: 2.1 }, { name: 'Neck flexion', value: 1.6 }, { name: 'Load / force', value: 1.2 },
          { name: 'Coupling (grip)', value: 0.9 }, { name: 'Wrist deviation', value: 0.7 }, { name: 'Lower arm', value: 0.5 }, { name: 'Legs / stance', value: 0.4 },
        ], // assumed
        note: 'Trunk and upper arm explain most of the score, so lift height and reach distance are the levers.',
      },
      {
        kind: 'line', title: 'Injury Probability vs REBA Score', subtitle: 'Logistic model, 90-day claim probability', xKey: 'reba', yLabel: '%',
        series: [{ key: 'probability', label: 'Claim probability' }], valueFormat: 'percent', yDomain: [0, 100],
        data: claimCurve,
        note: 'Probability accelerates past REBA 8 — the boundary between High and Very High bands.',
      },
      {
        kind: 'bar', title: 'Keypoint Detection Confidence', subtitle: 'Mean confidence by body region on site footage', xKey: 'region',
        series: [{ key: 'conf', label: 'Confidence' }], yLabel: 'Confidence',
        data: [
          { region: 'Nose', conf: 0.94 }, { region: 'Eyes', conf: 0.91 }, { region: 'Ears', conf: 0.87 }, { region: 'Shoulders', conf: 0.95 }, { region: 'Elbows', conf: 0.9 },
          { region: 'Wrists', conf: 0.84 }, { region: 'Hips', conf: 0.92 }, { region: 'Knees', conf: 0.88 }, { region: 'Ankles', conf: 0.8 },
        ], // assumed
        note: 'Wrists and ankles are the weakest joints under occlusion; the wrist score therefore carries a confidence gate.',
      },
      {
        kind: 'bar', title: 'Inference Latency by Runtime', subtitle: 'Per frame, 640 px input', xKey: 'runtime',
        series: [{ key: 'ms', label: 'Latency' }], valueFormat: 'ms',
        data: [{ runtime: 'ONNX CPU (4 cores)', ms: 38 }, { runtime: 'ONNX GPU', ms: 6 }, { runtime: 'PyTorch CPU', ms: 71 }, { runtime: 'MediaPipe CPU', ms: 22 }], // assumed
        note: 'ONNX on CPU keeps a single camera above 25 fps without a GPU.',
      },
    ],
    data: [
      {
        kind: 'donut', title: 'COCO Keypoints by Body Region', subtitle: '17-point skeleton', span: 4, center: '17',
        data: [{ name: 'Head (nose, eyes, ears)', value: 5 }, { name: 'Arms (shoulders, elbows, wrists)', value: 6 }, { name: 'Legs (hips, knees, ankles)', value: 6 }],
        note: 'Twelve of the seventeen points define the limbs that REBA scores.',
      },
      {
        kind: 'bar', title: 'REBA Score Histogram', subtitle: 'Observations per score in the assessed cohort', xKey: 'score',
        series: [{ key: 'count', label: 'Observations' }],
        data: [
          { score: '1', count: 142 }, { score: '2', count: 210 }, { score: '3', count: 179 }, { score: '4', count: 168 }, { score: '5', count: 151 }, { score: '6', count: 114 },
          { score: '7', count: 88 }, { score: '8', count: 102 }, { score: '9', count: 79 }, { score: '10', count: 53 }, { score: '11', count: 41 }, { score: '12+', count: 46 },
        ], // assumed: bins sum to the Overview-tab band counts
        note: 'Scores cluster at 2–5; the long right tail is what the injury model responds to.',
      },
      {
        kind: 'bar', title: 'Observations by Task', subtitle: 'Sessions scored per task type', xKey: 'task', horizontal: true,
        series: [{ key: 'count', label: 'Sessions' }],
        data: [{ task: 'Conveyor pick', count: 412 }, { task: 'Pallet lift', count: 318 }, { task: 'Bin sort', count: 247 }, { task: 'Cart push', count: 168 }, { task: 'Overhead reach', count: 131 }, { task: 'Drill assembly', count: 97 }], // assumed
        note: 'Coverage follows headcount; overhead reach is rare but the riskiest per observation.',
      },
    ],
  },
  demo: {
    title: 'Real-Time REBA Score Calculator',
    description: 'Adjust joint angles to compute the REBA ergonomic risk score.',
    ctaLabel: 'Compute REBA Score',
    inputs: [
      { key: 'neck', label: 'Neck Angle (degrees from neutral)', type: 'range', min: 0, max: 90, step: 1, default: 15, unit: '°' },
      { key: 'trunk', label: 'Trunk Angle (degrees from vertical)', type: 'range', min: 0, max: 90, step: 1, default: 20, unit: '°' },
      { key: 'upperArm', label: 'Upper Arm Angle (degrees from torso)', type: 'range', min: 0, max: 135, step: 1, default: 45, unit: '°' },
      { key: 'lowerArm', label: 'Lower Arm Angle (degrees from upper)', type: 'range', min: 60, max: 145, step: 1, default: 100, unit: '°' },
      { key: 'wrist', label: 'Wrist Angle (degrees from neutral)', type: 'range', min: 0, max: 45, step: 1, default: 10, unit: '°' },
      { key: 'load', label: 'Load / Force (kg)', type: 'range', min: 0, max: 25, step: 0.5, default: 5, unit: 'kg' },
      { key: 'coupling', label: 'Grip Quality', type: 'select', options: ['Good', 'Fair', 'Poor'], default: 'Fair' },
    ],
    evaluate,
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness check with pose model version and ONNX runtime provider' },
      { method: 'POST', path: '/predict', description: 'Image or frame in, keypoints, joint angles, REBA/RULA scores and risk band out' },
      { method: 'POST', path: '/batch_predict', description: 'Score a clip or a batch of frames; returns per-frame and session-level scores' },
      { method: 'POST', path: '/reba', description: 'Score joint angles directly (no image) — the calculator behind the demo' },
      { method: 'POST', path: '/explain', description: 'Component breakdown of a REBA score with the action each band prescribes' },
      { method: 'GET', path: '/sessions/{worker_id}', description: 'Session history and trend flag for one worker' },
      { method: 'GET', path: '/zones/heatmap', description: 'Mean REBA by zone and hour for the selected shift' },
      { method: 'GET', path: '/forecast/injury', description: '90-day claim probability by zone from the logistic model' },
      { method: 'GET', path: '/reports/shift', description: 'OSHA-format compliance report for a shift' },
      { method: 'GET', path: '/model/info', description: 'Pose model, keypoint schema, scoring tables and thresholds' },
    ],
    sample: {
      endpoint: 'POST /reba',
      request: `{
  "worker_id": "W-0412",
  "zone": "Dock A",
  "angles": {
    "neck": 32,
    "trunk": 48,
    "upper_arm": 70,
    "lower_arm": 95,
    "wrist": 18
  },
  "load_kg": 12.5,
  "coupling": "fair"
}`,
      response: `{
  "worker_id": "W-0412",
  "reba": 10,
  "rula": 6,
  "risk_level": "High",
  "action": "Investigate and implement changes",
  "components": {
    "neck": 2,
    "trunk": 3,
    "upper_arm": 3,
    "load": 2,
    "coupling": 1
  },
  "claim_probability_90d": 0.071,
  "inference_ms": 3
}`,
    },
  },
  report: {
    executiveSummary: [
      'Musculoskeletal disorders dominate lost-time injuries in warehousing, logistics and assembly, yet ergonomic assessment remains a quarterly clipboard exercise covering a handful of tasks. ' +
      'This platform makes REBA and RULA continuous: pre-trained YOLOv8n-Pose keypoints from existing cameras, joint angles, standard risk tables, and a score for every observation.',
      'On top of scoring it delivers the management layer safety teams lack — zone and shift heatmaps, per-worker trends, before/after measurement of interventions, a NIOSH-style 90-day claim forecast, and OSHA-format shift reports. ' +
      'In the assessed cohort, 61% of observations sit at Medium risk or above; targeting those with workstation changes is what drives the modelled 43% reduction in MSD claims and $380k annual savings for a 120-worker facility.',
      'The model is small (6.2 MB ONNX), runs on CPU beside the camera, and needs no site-specific training, so rollout is a configuration exercise rather than a data project.',
    ],
    impact: [
      { label: 'MSD claims', value: '−43% modelled for a 120-worker facility' },
      { label: 'Annual savings', value: '$380k at that facility; ~$420 per worker per year at default ROI inputs' },
      { label: 'Assessment coverage', value: 'Every worker, every shift — vs. a handful of manual worksheets per quarter' },
      { label: 'Intervention proof', value: 'Pre/post REBA on every workstation change' },
      { label: 'Deployment cost', value: 'Existing cameras + CPU inference; no GPU, no labelled data' },
    ],
    recommendations: [
      { title: 'Start with the docks and the late shift', body: 'Zone heatmaps put Dock A after 16:00 at the top of the risk table; lift-assist tables and rotation there yield the largest REBA drop per dollar.' },
      { title: 'Feed claim outcomes back into the forecaster', body: 'Replacing the NIOSH prior with the site\'s own claim history will tighten the 90-day forecast and let it be used for staffing decisions.' },
      { title: 'Add load estimation from the scene', body: 'Load and coupling are currently entered per task; estimating tote weight from labels or scale integration removes the last manual input.' },
      { title: 'Extend RULA to seated and bench stations', body: 'Packing and returns benches are upper-limb tasks where RULA is the better instrument; enable it per zone in the console.' },
    ],
    date: '2026',
  },
}

export default app
