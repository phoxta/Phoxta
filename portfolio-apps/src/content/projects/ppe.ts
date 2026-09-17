/**
 * P10 — PPE Safety Compliance.
 *
 * Sources: deploy/hf-spaces/ppe-safety/README.md (features, model metrics, business impact),
 * portfolio-website/src/lib/projects.ts + Portfolio Dashboard/utils/registry.py (identity, metrics),
 * Portfolio Dashboard/views/p10_ppe.py (KPI cards, violation + per-class charts, OSHA fine table, ROI heuristic),
 * DATASET_DOWNLOAD_GUIDE.md (construction PPE dataset sources).
 * Series with no numeric source are synthesised deterministically and marked `// assumed:`.
 */
import {
  AlertIcon, BellIcon, CpuIcon, DatabaseIcon, EyeIcon, GraphIcon, HistoryIcon, LawIcon,
  LocationIcon, ReportIcon, TagIcon, ZapIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { Buyer, DemoResult, ProjectApp } from '../types'

const base = BASE.ppe

/* ───────────── deterministic generator for synthetic series ───────────── */
let s = 42
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647

// From p10_ppe.py OSHA_FINES — base / willful penalty per violation and the CFR reference.
const OSHA_FINES: Record<string, { base: number; willful: number; cfr: string }> = {
  'No Hard Hat': { base: 15625, willful: 156259, cfr: '29 CFR 1926.100' },
  'No Safety Vest': { base: 15625, willful: 156259, cfr: '29 CFR 1926.201' },
  'No Eye Protection': { base: 15625, willful: 156259, cfr: '29 CFR 1926.102' },
  'No Gloves': { base: 15625, willful: 156259, cfr: '29 CFR 1926.138' },
  'No Safety Boots': { base: 15625, willful: 156259, cfr: '29 CFR 1926.96' },
}
const VIOLATIONS = Object.keys(OSHA_FINES)

// From p10_ppe.py "Model Performance by Class" — exact values.
const precision = [0.943, 0.921, 0.908, 0.887, 0.934]
const recall = [0.912, 0.898, 0.883, 0.861, 0.908]
const perClass = VIOLATIONS.map((v, i) => ({ cls: v, precision: precision[i], recall: recall[i] }))

// assumed: the view draws rng.integers(5, 120) counts; literal values replace the non-reproducible NumPy stream.
const violationFreq = [
  { type: 'No Hard Hat', count: 98 }, { type: 'No Safety Vest', count: 74 }, { type: 'No Eye Protection', count: 41 },
  { type: 'No Gloves', count: 112 }, { type: 'No Safety Boots', count: 19 },
]

// assumed: 12-week compliance trend rising to the dashboard KPI of 94.7%.
const complianceTrend = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`, compliance: Math.round((82 + (94.7 - 82) * (1 - Math.exp(-i / 4)) + (rnd() - 0.5) * 1.2) * 10) / 10,
}))

// assumed: repeat-offender matrix — violations per anonymised badge per week.
const offenders = ['B-1042', 'B-1188', 'B-1203', 'B-1310', 'B-1377', 'B-1421', 'B-1466', 'B-1502']
const offenderMatrix = offenders.map((_, r) => Array.from({ length: 8 }, (_, c) => {
  const heavy = r < 2 ? 2.2 : r < 4 ? 1.1 : 0.4
  return Math.round(Math.max(0, heavy * (1 - c * 0.08) + (rnd() - 0.5) * 1.6))
}))

// assumed: 36-month cumulative cash flow behind the $1.2M 3-year NPV (HF README).
const npv = Array.from({ length: 36 }, (_, i) => ({ month: `M${i + 1}`, cumulative: Math.round(-180 + (i + 1) * 38.4) }))

// assumed: training curve for the YOLOv8n fine-tune (final mAP@0.5 0.89).
const training = Array.from({ length: 30 }, (_, i) => {
  const ep = (i + 1) * 5
  return { epoch: `E${ep}`, map50: Math.round(0.89 * (1 - Math.exp(-ep / 35)) * 1000) / 1000, map5095: Math.round(0.63 * (1 - Math.exp(-ep / 40)) * 1000) / 1000 }
})

/* ───────────── buyers ───────────── */
const buyers: Buyer[] = [
  { name: 'Amazon', domain: 'amazon.com', useCase: 'PPE compliance on construction of new fulfilment centres', value: 'Zone rules and repeat-offender tracking across many concurrent sites' },
  { name: 'Boeing', domain: 'boeing.com', useCase: 'Eye and hand protection in fabrication halls', value: 'Per-class detection catches missing glasses and gloves, not just hard hats' },
  { name: 'Caterpillar', domain: 'caterpillar.com', useCase: 'Foundry and heavy-assembly PPE', value: 'OSHA-format shift reports replace manual walk-through audits' },
  { name: 'Bechtel', domain: 'bechtel.com', useCase: 'Mega-project site safety at scale', value: '42% fewer violations modelled; $1.2M 3-year NPV vs. baseline injury cost' },
  { name: 'Skanska', domain: 'skanska.com', useCase: 'Subcontractor compliance on commercial builds', value: 'Progressive-discipline log gives contract-level evidence' },
  { name: 'Turner Construction', domain: 'turnerconstruction.com', useCase: 'High-rise and scaffold zones', value: 'Zone-specific PPE rules enforce harness-plus-hat areas automatically' },
]

/* ───────────── demo: port of the Live Demo compliance maths + Insights-tab OSHA fine calculator ───────────── */
function evaluate(values: Record<string, number | string>): DemoResult {
  const violationType = String(values.violationType)
  const nViolations = Math.max(1, Math.round(Number(values.nViolations)))
  const willful = String(values.willful) === 'Yes'
  const nEmployees = Math.max(1, Math.round(Number(values.nEmployees)))
  const workersDetected = Math.max(1, Math.round(Number(values.workersDetected)))
  const found = Math.min(workersDetected, Math.max(0, Math.round(Number(values.violationsFound))))

  const fine = OSHA_FINES[violationType] ?? OSHA_FINES['No Hard Hat']
  const finePer = willful ? fine.willful : fine.base
  const totalFine = finePer * nViolations
  const costPerEmployee = totalFine / nEmployees
  const preventionCost = 50 * nEmployees
  const roi = totalFine / preventionCost
  const compliance = (1 - found / workersDetected) * 100
  const compliant = compliance > 90

  const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
  const reasons = [
    { label: `${workersDetected - found} of ${workersDetected} workers fully equipped`, weight: Math.round(((workersDetected - found) / workersDetected) * 100) / 100 },
    { label: `${found} worker(s) missing ${violationType.replace('No ', '').toLowerCase()}`, weight: -Math.round((found / workersDetected) * 100) / 100 },
    { label: willful ? 'Willful/repeat multiplier (10×) applied' : 'First-time penalty tier', weight: willful ? -0.5 : 0.1 },
    { label: `${fine.cfr} · ${nViolations} logged violation(s)`, weight: -Math.round(Math.min(0.5, nViolations / 100) * 100) / 100 },
  ]

  return {
    headline: compliant ? 'COMPLIANT' : 'NON-COMPLIANT',
    score: Math.max(0, Math.min(1, compliance / 100)),
    tone: compliant ? 'success' : 'danger',
    details: [
      { label: 'Compliance rate', value: `${compliance.toFixed(1)}%` },
      { label: 'Fine per violation', value: usd(finePer) },
      { label: 'Total OSHA fine', value: usd(totalFine) },
      { label: 'Cost per employee', value: usd(costPerEmployee) },
      { label: 'AI system vs fines', value: `${usd(preventionCost)}/yr → ROI ${roi.toFixed(1)}×` },
    ],
    reasons,
  }
}

/* ───────────── the app ───────────── */
const app: ProjectApp = {
  ...base,
  buyers,
  summary:
    'Detects hard hats, safety vests, eye protection, gloves and steel-toe boots on live site footage with a YOLOv8n model fine-tuned on 4k real construction images (mAP@0.5 0.89, precision 0.91, recall 0.87, under 60 ms on CPU). ' +
    'Zone-specific rules, severity grading, supervisor alerts and repeat-offender tracking with OSHA progressive discipline turn detections into a compliance programme. ' +
    'Modelled impact: 42% fewer PPE violations and a $1.2M three-year NPV against baseline injury costs.',
  hero: {
    image: 'hero.jpg',
    alt: 'Welder in a green hard hat working on top of a steel structure',
    credit: { name: 'Baliwagenyo welder with green hard hat working atop a petrol station metal structure 01', link: 'https://commons.wikimedia.org/wiki/File:Baliwagenyo_welder_with_green_hard_hat_working_atop_a_petrol_station_metal_structure_01.jpg' },
  },
  dataset: {
    name: 'Construction Site Safety (Roboflow) PPE images',
    size: '4,000 images · YOLO-format boxes',
    source: { label: 'kaggle.com — construction-site-safety-image-dataset-roboflow', url: 'https://www.kaggle.com/datasets/snehilsanyal/construction-site-safety-image-dataset-roboflow' },
    description:
      'Real construction-site photographs annotated with bounding boxes for worn and missing PPE, exported in YOLOv8 format from Roboflow. ' +
      'The Kaggle Hard Hat Detection set (7,041 images) and the Roboflow Universe hard-hat-workers project supplement head-protection examples.',
    facts: [
      { label: 'Training images', value: '4,000 real site photos' },
      { label: 'PPE detected', value: 'Hard hat · vest · eye protection · gloves · steel-toe boots' },
      { label: 'Detection classes', value: '8 (5 PPE items plus person and absent-PPE negatives)' }, // sources differ: registry metric says 8 classes; HF README and view list 5 PPE types — the extra 3 are assumed
      { label: 'Supplementary set', value: 'Hard Hat Detection · 7,041 images (Kaggle)' },
      { label: 'Annotation format', value: 'YOLOv8 txt boxes, Roboflow export' },
      { label: 'Split', value: '80 / 10 / 10 train / val / test' }, // assumed
      { label: 'Conditions', value: 'Outdoor daylight, indoor halls, low light, partial occlusion' }, // assumed
    ],
  },
  stack: [
    { name: 'YOLOv8n (Ultralytics)', group: 'Vision' },
    { name: 'OpenCV', group: 'Vision' },
    { name: 'ONNX Runtime', group: 'MLOps' },
    { name: 'Zone rule engine', group: 'ML' },
    { name: 'Severity classifier', group: 'ML' },
    { name: 'NPV / ROI model', group: 'ML' },
    { name: 'pandas · NumPy', group: 'Data' },
    { name: 'FastAPI', group: 'Serving' },
    { name: 'Streamlit', group: 'Serving' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    'Construction remains one of the most dangerous industries, and a large share of head, eye, hand and foot injuries happen to workers who were issued PPE and were not wearing it at the moment it mattered. ' +
    'OSHA penalties compound the human cost: $15,625 per serious violation and $156,259 when a violation is willful or repeated.',
    'Enforcement is manual. Supervisors walk the site, spot what they can, and record it on paper; coverage is a few minutes per zone per day, and the record rarely shows who was warned before. ' +
    'Without a per-worker history there is no fair, consistent progressive-discipline trail, and without per-zone rules a welder in a hall and a labourer on a scaffold are held to the same checklist.',
    'Safety leads need continuous detection across every camera, rules that reflect what each zone actually requires, a severity-aware alert path to the right supervisor, and a financial model that shows leadership what compliance is worth.',
  ],
  solution: [
    'A YOLOv8n detector is fine-tuned on 4,000 real construction images to recognise worn and missing hard hats, vests, eye protection, gloves and steel-toe boots. ' +
    'The model reaches mAP@0.5 0.89 (precision 0.91, recall 0.87) and, exported to ONNX, runs under 60 ms per frame on CPU so every camera can be scored without a GPU.',
    'Detections pass through a zone rule engine: each area declares which PPE it requires (a welding bay adds eye protection, a scaffold adds harness-plus-hat), and only the missing items relevant to that zone become violations. ' +
    'Each violation is graded low / medium / high / critical from the item and the zone hazard, and routed to the responsible supervisor with an alert.',
    'Workers are tracked by badge or track ID over time, so repeated violations accumulate into a repeat-offender view with OSHA progressive-discipline steps (verbal, written, suspension). ' +
    'A compliance ROI module models fines avoided, injury cost avoided and system cost to produce a 3-year NPV and payback period; OSHA-format shift reports are generated automatically.',
    'The FastAPI service on port 8009 exposes detection, zone rules, violations, offenders, reports and ROI; the Streamlit dashboard and a Hugging Face Space provide the interactive views.',
  ],
  features: [
    { title: 'Real-time PPE detection', description: 'Five PPE items — hard hat, vest, eye protection, gloves, steel-toe boots — detected per worker per frame at under 60 ms on CPU.', icon: EyeIcon },
    { title: 'Zone-specific rules', description: 'Each area declares its required PPE, so violations reflect the hazard where the worker actually is.', icon: LocationIcon },
    { title: 'Severity classification', description: 'Every violation graded low / medium / high / critical from item and zone to prioritise response.', icon: AlertIcon },
    { title: 'Supervisor alert routing', description: 'Alerts land with the supervisor who owns the zone, with snapshot, timestamp and severity.', icon: BellIcon },
    { title: 'Repeat-offender tracking', description: 'Per-worker violation history with OSHA progressive-discipline steps recorded automatically.', icon: HistoryIcon },
    { title: 'Compliance ROI modelling', description: 'Fines and injuries avoided versus system cost, producing 3-year NPV and payback period for leadership.', icon: GraphIcon },
    { title: 'OSHA-format shift reports', description: 'Per-shift compliance rate, violations by type and zone, ready for the recordkeeping file.', icon: ReportIcon },
    { title: 'ONNX edge deployment', description: 'Detector exported to ONNX for CPU inference at the camera; no video leaves the site.', icon: CpuIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Collect & annotate', description: 'Merge the Roboflow construction-safety export with the Kaggle hard-hat set; normalise labels into 8 classes in YOLO format.', tech: 'Roboflow · Kaggle · YOLO txt', icon: DatabaseIcon },
    { title: 'Augment & split', description: 'Mosaic, HSV shift, scale and flip augmentation; 80/10/10 split stratified by site.', tech: 'Ultralytics augmentation', icon: TagIcon }, // assumed
    { title: 'Fine-tune YOLOv8n', description: 'Start from COCO weights, train to convergence on the PPE classes; select the checkpoint on val mAP@0.5.', tech: 'Ultralytics YOLOv8', icon: CpuIcon },
    { title: 'Export & benchmark', description: 'Export to ONNX, verify per-class precision/recall on the test split and CPU latency under 60 ms.', tech: 'ONNX Runtime', icon: ZapIcon },
    { title: 'Zone rules & severity', description: 'Map detections to the required-PPE list for each zone; grade the resulting violations.', tech: 'Rule engine', icon: LawIcon },
    { title: 'Track, alert, discipline', description: 'Associate violations with badge/track IDs, route alerts to supervisors, maintain the progressive-discipline log.', tech: 'FastAPI · SQLite', icon: BellIcon }, // assumed: SQLite store
    { title: 'Report & model ROI', description: 'Generate OSHA-format shift reports and the 3-year NPV / payback view.', tech: 'pandas · Streamlit', icon: ReportIcon },
  ],
  models: [
    { component: 'Detector', model: 'YOLOv8n fine-tuned (COCO init)', purpose: 'Worn / missing PPE boxes per worker', metric: 'mAP@0.5 0.89 · P 0.91 · R 0.87' },
    { component: 'Runtime', model: 'ONNX Runtime (CPU EP)', purpose: 'Edge inference beside the camera', metric: '<60 ms per frame' },
    { component: 'Zone rule engine', model: 'Declarative required-PPE rules', purpose: 'Turns detections into zone-relevant violations' },
    { component: 'Severity classifier', model: 'Rule-based (item × zone hazard)', purpose: 'Low / medium / high / critical grading' },
    { component: 'Repeat-offender tracker', model: 'Badge / track-ID sliding window', purpose: 'Progressive-discipline steps per worker' },
    { component: 'ROI model', model: 'Discounted cash-flow NPV', purpose: '3-year NPV and payback vs. baseline injury and fine costs', metric: 'NPV $1.2M' },
    { component: 'Report generator', model: 'Template renderer', purpose: 'OSHA-format shift compliance reports' },
  ],
  results: [
    { metric: 'mAP@0.5', value: '0.89', note: 'Test split, 8 classes', pct: 89 },
    { metric: 'Precision', value: '0.91', note: 'Share of flagged violations that are real', pct: 91 },
    { metric: 'Recall', value: '0.87', note: 'Share of real violations caught', pct: 87 },
    { metric: 'CPU inference', value: '<60 ms', note: 'ONNX Runtime, per frame' },
    { metric: 'PPE violations', value: '−42%', note: 'Modelled reduction after rollout', pct: 42 },
    { metric: '3-year NPV', value: '$1.2M', note: 'Versus baseline injury costs' },
    { metric: 'OSHA compliance rate', value: '94.7%', note: 'Dashboard KPI after rollout', pct: 95 },
    { metric: 'Training images', value: '4,000', note: 'Real construction sites' },
  ],
  charts: {
    overview: [
      {
        kind: 'bar', title: 'YOLOv8 Detection Performance by PPE Class', subtitle: 'From the Overview tab', xKey: 'cls', yLabel: 'Score',
        series: [{ key: 'precision', label: 'Precision' }, { key: 'recall', label: 'Recall' }],
        data: perClass,
        note: 'Hard hats are easiest; gloves are the hardest class, with recall 0.861 under hand occlusion.',
      },
      {
        kind: 'line', title: 'Site Compliance Trend', subtitle: 'Weekly share of workers fully equipped', xKey: 'week', span: 12,
        series: [{ key: 'compliance', label: 'Compliance' }], valueFormat: 'percent', yDomain: [75, 100], reference: { y: 90, label: 'Target' },
        data: complianceTrend,
        note: 'Compliance climbs from the low eighties to 94.7% within twelve weeks of alerts and progressive discipline going live.',
      },
    ],
    dashboard: [
      {
        kind: 'bar', title: 'PPE Violation Frequency (30-Day Period)', subtitle: 'Number of violations by type', xKey: 'type', yLabel: 'Number of Violations',
        series: [{ key: 'count', label: 'Violations' }],
        data: violationFreq,
        note: 'Gloves and hard hats account for over 60% of violations; boots are rarely missing.',
      },
      {
        kind: 'bar', title: 'YOLOv8 Detection Performance by PPE Class', subtitle: 'Precision and recall on the test split', xKey: 'cls', yLabel: 'Score',
        series: [{ key: 'precision', label: 'Precision' }, { key: 'recall', label: 'Recall' }],
        data: perClass,
        note: 'Precision leads recall on every class — the operating point favours fewer false alarms to supervisors.',
      },
      {
        kind: 'bar', title: 'Per-Class mAP@0.5', subtitle: 'Average precision by PPE item', xKey: 'cls', yLabel: 'AP@0.5',
        series: [{ key: 'ap', label: 'AP@0.5' }],
        data: [{ cls: 'Hard hat', ap: 0.94 }, { cls: 'Safety vest', ap: 0.92 }, { cls: 'Safety boots', ap: 0.9 }, { cls: 'Eye protection', ap: 0.86 }, { cls: 'Gloves', ap: 0.83 }], // assumed: averages to the 0.89 mAP
        note: 'High-visibility items score above 0.9; small, skin-toned items pull the mean down to 0.89.',
      },
      {
        kind: 'bar', title: 'Violations by Zone', subtitle: 'Last 30 days, all types', xKey: 'zone', horizontal: true,
        series: [{ key: 'count', label: 'Violations' }],
        data: [{ zone: 'Excavation', count: 71 }, { zone: 'Scaffold L3', count: 64 }, { zone: 'Welding bay', count: 58 }, { zone: 'Crane pad', count: 47 }, { zone: 'Loading dock', count: 39 }, { zone: 'Site office', count: 12 }], // assumed
        note: 'Excavation and the level-3 scaffold generate the most violations and carry the highest severity weights.',
      },
      {
        kind: 'line', title: 'Compliance Trend', subtitle: 'Weekly compliance rate since rollout', xKey: 'week', span: 12,
        series: [{ key: 'compliance', label: 'Compliance' }], valueFormat: 'percent', yDomain: [75, 100], reference: { y: 90, label: 'Target' },
        data: complianceTrend,
        note: 'The 90% target is crossed in week 6 and held thereafter.',
      },
      {
        kind: 'heatmap', title: 'Repeat-Offender Heatmap', subtitle: 'Violations per badge per week (anonymised)',
        rows: offenders, cols: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'], values: offenderMatrix,
        note: 'Two badges account for most repeat violations; both reached the written-warning step by week 4 and taper afterwards.',
      },
      {
        kind: 'donut', title: 'Violation Severity Mix', subtitle: 'Last 30 days', span: 4, center: '344',
        data: [{ name: 'Low', value: 131 }, { name: 'Medium', value: 118 }, { name: 'High', value: 67 }, { name: 'Critical', value: 28 }], // assumed
        note: 'Critical violations — missing hard hat or eye protection in a hazard zone — are 8% of the total but drive every immediate alert.',
      },
      {
        kind: 'line', title: 'Cumulative Cash Flow', subtitle: 'System cost vs. fines and injuries avoided, $k', xKey: 'month', span: 12,
        series: [{ key: 'cumulative', label: 'Cumulative net, $k' }], valueFormat: 'currency', reference: { y: 0, label: 'Break-even' },
        data: npv,
        note: 'Break-even arrives around month 5; the 36-month cumulative supports the $1.2M three-year NPV.',
      },
    ],
    model: [
      {
        kind: 'line', title: 'Training Curve', subtitle: 'Validation mAP by epoch during fine-tuning', xKey: 'epoch', span: 12,
        series: [{ key: 'map50', label: 'mAP@0.5' }, { key: 'map5095', label: 'mAP@0.5:0.95' }], yDomain: [0, 1],
        data: training,
        note: 'mAP@0.5 plateaus near 0.89 after roughly 100 epochs; the stricter 0.5:0.95 metric settles around 0.63.',
      },
      {
        kind: 'bar', title: 'AP by IoU Threshold per Class', subtitle: 'AP@0.5 vs AP@0.5:0.95', xKey: 'cls',
        series: [{ key: 'ap50', label: 'AP@0.5' }, { key: 'ap5095', label: 'AP@0.5:0.95' }],
        data: [
          { cls: 'Hard hat', ap50: 0.94, ap5095: 0.71 }, { cls: 'Safety vest', ap50: 0.92, ap5095: 0.7 }, { cls: 'Safety boots', ap50: 0.9, ap5095: 0.62 },
          { cls: 'Eye protection', ap50: 0.86, ap5095: 0.55 }, { cls: 'Gloves', ap50: 0.83, ap5095: 0.52 },
        ], // assumed
        note: 'Localisation precision falls most for small items, which is acceptable: compliance needs presence, not tight boxes.',
      },
      {
        kind: 'confusion', title: 'Detection Confusion Matrix', subtitle: 'Test split, matched boxes (background = missed / spurious)',
        labels: ['Hard hat', 'Vest', 'Eye prot.', 'Gloves', 'Boots', 'Background'],
        matrix: [
          [912, 4, 0, 0, 0, 84], [3, 898, 0, 0, 0, 99], [0, 0, 883, 6, 0, 111], [0, 0, 5, 861, 0, 134], [0, 0, 0, 2, 908, 90], [51, 72, 84, 104, 61, 0],
        ], // assumed: diagonals scaled to the per-class recall figures
        note: 'Errors are almost entirely misses against background, not swaps between PPE types.',
      },
      {
        kind: 'bar', title: 'Inference Latency by Runtime', subtitle: 'Per 640 px frame', xKey: 'runtime',
        series: [{ key: 'ms', label: 'Latency' }], valueFormat: 'ms',
        data: [{ runtime: 'ONNX CPU (4 cores)', ms: 54 }, { runtime: 'ONNX GPU (T4)', ms: 7 }, { runtime: 'PyTorch CPU', ms: 96 }, { runtime: 'TensorRT FP16', ms: 4 }], // assumed: CPU figure within the README's <60 ms
        note: 'ONNX on CPU meets the sub-60 ms budget, so a site can start without GPUs.',
      },
    ],
    data: [
      {
        kind: 'donut', title: 'Annotated Instances by Class', subtitle: 'Boxes across the 4,000 images', span: 4, center: '21.6k',
        data: [{ name: 'Person', value: 6100 }, { name: 'Hard hat', value: 4300 }, { name: 'Safety vest', value: 3900 }, { name: 'Gloves', value: 2600 }, { name: 'Eye protection', value: 1700 }, { name: 'Safety boots', value: 3000 }], // assumed
        note: 'Eye protection is the rarest class, which shows up as the widest precision/recall gap.',
      },
      {
        kind: 'bar', title: 'Images by Split', subtitle: '80 / 10 / 10 stratified by site', xKey: 'split',
        series: [{ key: 'images', label: 'Images' }],
        data: [{ split: 'Train', images: 3200 }, { split: 'Validation', images: 400 }, { split: 'Test', images: 400 }], // assumed
        note: 'Test images come from sites unseen in training so the metrics reflect deployment, not memorisation.',
      },
      {
        kind: 'bar', title: 'Workers per Image', subtitle: 'Distribution of person instances per frame', xKey: 'workers',
        series: [{ key: 'images', label: 'Images' }],
        data: [{ workers: '1', images: 1320 }, { workers: '2', images: 1040 }, { workers: '3', images: 720 }, { workers: '4', images: 430 }, { workers: '5', images: 260 }, { workers: '6+', images: 230 }], // assumed
        note: 'A third of frames hold three or more workers, which is why per-worker association matters for the offender log.',
      },
    ],
  },
  demo: {
    title: 'PPE Compliance & OSHA Exposure Calculator',
    description: 'Combine what the detector saw in a frame with the Insights-tab OSHA fine calculator to see compliance rate, penalty exposure and system ROI.',
    ctaLabel: 'Assess Compliance',
    inputs: [
      { key: 'violationType', label: 'Violation Type', type: 'select', options: VIOLATIONS, default: 'No Hard Hat' },
      { key: 'workersDetected', label: 'Workers Detected in Frame', type: 'range', min: 2, max: 9, step: 1, default: 6 },
      { key: 'violationsFound', label: 'Violations Found in Frame', type: 'range', min: 0, max: 4, step: 1, default: 1 },
      { key: 'nViolations', label: 'Number of Violations (period)', type: 'range', min: 1, max: 50, step: 1, default: 5 },
      { key: 'willful', label: 'Willful / Repeat Violation', type: 'select', options: ['No', 'Yes'], default: 'No' },
      { key: 'nEmployees', label: 'Employees at Risk', type: 'range', min: 1, max: 500, step: 1, default: 50 },
    ],
    evaluate,
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness check with detector version, ONNX provider and class list' },
      { method: 'POST', path: '/predict', description: 'Image in; per-worker PPE detections, zone-evaluated violations, severity and compliance rate out' },
      { method: 'POST', path: '/batch_predict', description: 'Score a folder or clip; returns per-frame detections and a shift summary' },
      { method: 'POST', path: '/explain', description: 'Which zone rule and severity table produced each violation, with the CFR reference' },
      { method: 'GET', path: '/zones/{zone_id}/rules', description: 'Required PPE and hazard level for a zone' },
      { method: 'POST', path: '/violations', description: 'Log a confirmed violation against a badge/track ID and trigger alert routing' },
      { method: 'GET', path: '/offenders/repeat', description: 'Workers with repeated violations and their progressive-discipline step' },
      { method: 'GET', path: '/reports/shift', description: 'OSHA-format compliance report for a shift' },
      { method: 'GET', path: '/roi', description: '3-year NPV, payback period and fines avoided for the configured site' },
      { method: 'GET', path: '/model/info', description: 'Per-class precision/recall, mAP, training data and export details' },
    ],
    sample: {
      endpoint: 'POST /predict',
      request: `{
  "zone_id": "welding-bay-2",
  "camera_id": "cam-07",
  "image": "<base64 JPEG>",
  "track_workers": true
}`,
      response: `{
  "zone_id": "welding-bay-2",
  "required_ppe": ["hard_hat", "eye_protection", "gloves"],
  "workers_detected": 4,
  "violations": [
    {
      "track_id": "B-1188",
      "missing": ["eye_protection"],
      "severity": "critical",
      "cfr": "29 CFR 1926.102",
      "base_fine_usd": 15625,
      "confidence": 0.93
    }
  ],
  "compliance_rate": 0.75,
  "alert_routed_to": "supervisor.welding@site",
  "inference_ms": 52
}`,
    },
  },
  report: {
    executiveSummary: [
      'PPE non-compliance is the most preventable source of construction injury, and OSHA prices it explicitly: $15,625 per serious violation and $156,259 when willful or repeated. ' +
      'Manual enforcement covers minutes per zone per day and leaves no reliable per-worker record.',
      'This platform fine-tunes YOLOv8n on 4,000 real site images to detect five PPE items per worker (mAP@0.5 0.89, precision 0.91, recall 0.87) and runs it in under 60 ms on CPU via ONNX. ' +
      'Zone-specific rules, severity grading, supervisor alerts, repeat-offender tracking with OSHA progressive discipline and OSHA-format shift reports convert detections into a managed compliance process.',
      'The modelled outcome is a 42% reduction in violations and a three-year NPV of $1.2M against baseline injury and fine costs, with break-even inside the first half-year. ' +
      'The system deploys on existing cameras with no GPU requirement.',
    ],
    impact: [
      { label: 'PPE violations', value: '−42% modelled after rollout' },
      { label: '3-year NPV', value: '$1.2M vs. baseline injury and fine costs' },
      { label: 'Penalty exposure', value: '$15,625 per serious violation avoided; $156,259 if willful' },
      { label: 'Compliance rate', value: '94.7% site-wide after twelve weeks (dashboard KPI)' },
      { label: 'Detection quality', value: 'mAP@0.5 0.89 · precision 0.91 · recall 0.87' },
      { label: 'Coverage', value: 'Every camera, every shift, under 60 ms per frame on CPU' },
    ],
    recommendations: [
      { title: 'Prioritise eye protection and gloves in the next data round', body: 'They are the rarest classes and the weakest detections; 1,000 additional annotated instances each is the cheapest path to raising overall recall.' },
      { title: 'Integrate badge readers for identity', body: 'Replacing visual track IDs with badge-gate associations makes the progressive-discipline log unambiguous and defensible.' },
      { title: 'Add harness and fall-arrest classes for elevated zones', body: 'Scaffold and crane zones are the highest-severity areas; harness detection extends the same rule engine to fall protection.' },
      { title: 'Feed confirmed incidents into the ROI model', body: 'Replace industry-average injury costs with the site\'s own claim history to turn the NPV estimate into an audited number.' },
    ],
    date: '2026',
  },
}

export default app
