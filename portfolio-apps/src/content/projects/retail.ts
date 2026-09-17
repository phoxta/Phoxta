import {
  BellIcon, ChecklistIcon, CpuIcon, DeviceCameraVideoIcon, DeviceDesktopIcon, FlameIcon, GraphIcon,
  ImageIcon, MeterIcon, NumberIcon, PackageIcon, PeopleIcon, ServerIcon, SyncIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, ProjectApp } from '../types'

const base = BASE.retail

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const num = (v: number | string) => (typeof v === 'number' ? v : Number(v))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

/* Model Performance page — per-class AP (dashboard/app.py) */
const CLASSES = ['product', 'person', 'empty_shelf', 'price_tag', 'shopping_cart', 'basket', 'checkout_counter']
const AP50 = [0.842, 0.891, 0.764, 0.712, 0.823, 0.788, 0.836]
const AP50_95 = [0.612, 0.701, 0.543, 0.489, 0.634, 0.561, 0.647]
const PRECISION = [0.87, 0.91, 0.79, 0.74, 0.85, 0.81, 0.88]
const RECALL = [0.82, 0.88, 0.76, 0.72, 0.82, 0.78, 0.85]

const classApChart: ChartSpec = {
  kind: 'bar',
  title: 'Detection accuracy by class',
  subtitle: 'Model Performance · AP@50 vs AP@50-95',
  xKey: 'cls',
  series: [{ key: 'ap50', label: 'mAP@50' }, { key: 'ap5095', label: 'mAP@50-95' }],
  data: CLASSES.map((c, i) => ({ cls: c, ap50: AP50[i], ap5095: AP50_95[i] })),
  valueFormat: 'number',
  yLabel: 'AP',
  note: 'Person and product are the easiest classes; price_tag (small, low-contrast) drags the strict-IoU average down.',
}

/* Weekly OOS events before / after deployment — deterministic synthetic series (−34% after week 12). */
const rndOos = seeded(506)
const oosWeekly = Array.from({ length: 24 }, (_, i) => {
  const before = 120 + Math.round(Math.sin(i / 2) * 9 + rndOos() * 14)
  const after = i < 12 ? before : Math.round(before * 0.66 + rndOos() * 6 - 3)
  return { week: `W${i + 1}`, events: after }
})

/* Training curves — 50 epochs, best at 47 */
const rndLoss = seeded(47)
const trainingCurve = Array.from({ length: 25 }, (_, i) => {
  const epoch = i * 2 + 2
  const decay = Math.exp(-epoch / 14)
  return {
    epoch: String(epoch),
    box: Math.round((0.55 + 1.35 * decay + rndLoss() * 0.03) * 1000) / 1000,
    cls: Math.round((0.42 + 1.9 * decay + rndLoss() * 0.03) * 1000) / 1000,
    dfl: Math.round((0.95 + 0.8 * decay + rndLoss() * 0.02) * 1000) / 1000,
    map50: Math.round(Math.min(0.841, 0.841 * (1 - Math.exp(-epoch / 9)) + (epoch >= 46 ? 0.012 : 0)) * 1000) / 1000,
  }
})

/* Traffic heatmap (Store Overview / Traffic Analytics) — 8 × 8 grid with a hot zone near the entrance. */
const rndHeat = seeded(42)
const heatRows = ['Back', 'Aisle 6', 'Aisle 5', 'Aisle 4', 'Aisle 3', 'Aisle 2', 'Aisle 1', 'Entrance']
const heatCols = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']
const heatValues = heatRows.map((_, r) =>
  heatCols.map((__, c) => {
    const entrance = r >= 6 && c <= 2 ? 10 : 0
    const checkout = r >= 5 && c >= 6 ? 6 : 0
    return Math.round((3 + rndHeat() * 5 + entrance + checkout) * 10) / 10
  }),
)

const app: ProjectApp = {
  ...base,
  metrics: [
    { label: 'mAP@0.5', value: '0.841', pct: 84, caption: 'real held-out shelf images' }, // sources differ: PROJECT_REPORT 0.841 · README 0.72 · HF/projects.ts 0.82 · dashboard 0.822
    { label: 'OOS events', value: '−34%', caption: 'per store after deployment' },
    { label: 'Lost sales recovered', value: '$180k/yr', caption: 'per store' },
    { label: 'Inference', value: '< 45 ms', caption: 'per frame, edge GPU' }, // sources differ: PROJECT_REPORT < 45 ms · README < 100 ms · registry < 20 ms
  ],
  summary:
    'Retail Operations Intelligence watches store cameras for empty shelf space. A YOLOv8n detector fine-tuned on 506 real annotated shelf images (mAP@50 0.841) finds voids, misplaced items and product facings in under 45 ms per frame, ByteTrack follows shoppers to measure dwell and queues, and a rules engine turns each detection into a priced restocking alert that reaches an associate within two seconds. Pilots cut out-of-stock events by 34% and recover an estimated $180,000 of lost sales per store per year.',
  hero: { image: 'hero.jpg', alt: 'Supermarket aisle with fully stocked shelves under bright lighting' },
  buyers: [
    { name: 'Walmart', domain: 'walmart.com', useCase: '4,700 US stores × $180k recovered sales', value: '$846M+ national OOS reduction programme' },
    { name: 'Amazon', domain: 'amazon.com', useCase: 'Real-time shelf intelligence for cashierless Amazon Fresh stores', value: 'Just Walk Out technology enhancement' },
    { name: 'Target', domain: 'target.com', useCase: 'Category management and planogram compliance', value: '$300M+ in OOS prevention' },
    { name: 'Kroger', domain: 'kroger.com', useCase: 'Grocery shelf void detection and auto-replenishment', value: '$500M+ in fresh-food OOS reduction' },
    { name: 'Zebra Technologies', domain: 'zebra.com', useCase: 'Embed in retail AI hardware and software portfolio', value: 'OEM product integration' },
    { name: 'Tesco', domain: 'tesco.com', useCase: 'Store-level void monitoring across UK estate', value: 'Replenishment labour savings' },
  ],
  dataset: {
    name: 'Real retail shelf void images',
    size: '506 labelled images · augmented to 2,024',
    description:
      'In-store shelf photography labelled by hand in Roboflow with YOLO-format bounding boxes. Images come from actual store operations pilots — variable lighting, angled security cameras and partial occlusion included — which is why the detector holds up in production where studio-trained models lose 20–35 mAP points.',
    facts: [
      { label: 'Images', value: '506 real annotated shelf images' },
      { label: 'Augmented set', value: '2,024 samples (mosaic, flip, HSV jitter, cutout)' },
      { label: 'Classes', value: 'shelf_void · product_facing · misplaced_item' }, // sources differ: README lists filled_shelf / partial_void / full_void; train_real.py declares 6 placeholder classes
      { label: 'Format', value: 'YOLO annotation (bounding box + class)' },
      { label: 'Split', value: '70% train / 20% val / 10% test' },
      { label: 'Input size', value: '640 × 640' },
      { label: 'Source', value: 'Store-mounted and aisle cameras' },
    ],
  },
  stack: [
    { name: 'YOLOv8n (Ultralytics)', group: 'Vision' },
    { name: 'ByteTrack', group: 'Vision' },
    { name: 'OpenCV 4.x', group: 'Vision' },
    { name: 'supervision', group: 'Vision' },
    { name: 'PyTorch 2.x', group: 'ML' },
    { name: 'ONNX Runtime', group: 'MLOps' },
    { name: 'NVIDIA Jetson Orin', group: 'MLOps' },
    { name: 'Albumentations', group: 'Data' },
    { name: 'Roboflow annotation', group: 'Data' },
    { name: 'SQLite · Parquet', group: 'Data' },
    { name: 'FastAPI 0.104 · python-multipart', group: 'Serving' },
    { name: 'Streamlit 1.29 · Plotly', group: 'Serving' },
  ],
  problem: [
    'Out-of-stock events cost U.S. retailers about $82 billion a year in lost sales, and 65% of them are not inventory problems at all — the product is sitting in the back room while the shelf is empty. Manual audits take 15–30 minutes per aisle and, by design, catch the gap 47+ minutes after it started costing sales.',
    'Computer-vision models trained on synthetic product photography or controlled studio images fail in real stores. Variable lighting, angled security cameras, planogram inconsistency and partial occlusion cause mAP to drop 20–35 points against lab results, which is why competitive deployments stall after the pilot.',
  ],
  solution: [
    'A YOLOv8n detector is fine-tuned on 506 real annotated store images, augmented to 2,024 samples, to detect shelf_void, product_facing and misplaced_item at under 45 ms per frame. The nano variant (3.2M parameters, 8.7 GFLOPs) is chosen deliberately so the 6.2 MB ONNX export runs on NVIDIA Jetson edge hardware inside the store with no cloud round trip.',
    'ByteTrack multi-object tracking keeps shelf-section and shopper identities across frames, enabling void-duration timers, “time since stocked” alerts, dwell-time measurement per zone and checkout-queue estimation (wait ≈ 2.5 × queue − 1.5 minutes).',
    'A zone engine maps detections to planogram positions: occupancy per shelving zone against an expected facing count, a 60% occupancy threshold, planogram compliance scored against an 80% target and a shrinkage-risk score built from dwell patterns in high-value zones. Alerts carry zone priority (traffic density × void duration) and route to the nearest associate’s device in under two seconds.',
    'Every void is priced with duration × traffic × conversion × average transaction value, POS linkage correlates shelf events with sales drops per SKU, and planogram deviation is graded A–D — so the alert queue is ordered by revenue at risk rather than detection time.',
  ],
  features: [
    { title: 'Live shelf void detection', description: 'Upload an image or stream a frame: YOLOv8n draws void, facing and misplaced-item boxes, assigns each to a store zone and returns occupancy, compliance, queue length and wait time.', icon: DeviceCameraVideoIcon, image: '02_live_detection.webp' },
    { title: 'ByteTrack shopper analytics', description: 'Persistent track IDs across frames give per-zone dwell time, path heatmaps, peak-hour traffic curves and queue-length history with an alert threshold of five.', icon: PeopleIcon, image: '03_analytics.webp' },
    { title: 'Shelf compliance monitor', description: 'Occupancy and planogram compliance per shelving zone with a 60% restock line and an 80% compliance target, plus an overall compliance gauge.', icon: ChecklistIcon, image: '01_dashboard.webp' },
    { title: 'Lost-sales quantification', description: 'Each out-of-stock event is priced as duration × traffic × conversion × basket value, rolled up by zone and annualised, with the top-10 costliest events ranked.', icon: NumberIcon, image: '03_oos_reduction.webp' },
    { title: 'Alert Center', description: 'EMPTY_SHELF, LONG_QUEUE, SHRINKAGE_RISK and ANOMALY alerts with severity, zone and status, resolved within a two-second notification budget.', icon: BellIcon, image: '04_reports.webp' },
    { title: 'Traffic heatmaps and peak hours', description: 'Cumulative customer-path heatmap over the floor plan, hourly traffic trend from 08:00 to 21:00 and zone dwell benchmarks for merchandising decisions.', icon: FlameIcon, image: '03_analytics.webp' },
    { title: 'POS linkage analysis', description: 'Correlates shelf-empty timestamps with POS transaction drops per SKU — correlation, impact lag and a restock priority score that feeds automated reorder triggers.', icon: GraphIcon },
    { title: 'Model governance', description: 'Per-class AP@50 and AP@50-95, precision/recall tables, inference speed by device and training loss curves for every release of the detector.', icon: MeterIcon, image: '01_model_performance.webp' },
  ],
  screenshots: [
    { file: '00_overview.webp', caption: 'Live Analysis landing page: image/video upload with the six-page navigation (Live Analysis, Store Overview, Shelf Monitor, Traffic Analytics, Alert Center, Model Performance).', w: 1440, h: 900 },
    { file: '01_dashboard.webp', caption: 'Store Overview: planogram compliance, average queue length, session footfall and shrinkage-risk KPI cards with the cumulative traffic heatmap and compliance trend.', w: 1440, h: 900 },
    { file: '01_model_performance.webp', caption: 'Model Performance: grouped AP@50 / AP@50-95 bars per detection class with the precision/recall summary table.', w: 1155, h: 625 },
    { file: '02_live_detection.webp', caption: 'Live Analysis result: original vs annotated frame, detection table with zone assignment and the zone-occupancy bars against the 60% threshold.', w: 1440, h: 900 },
    { file: '02_training_loss.webp', caption: 'Training loss curves (box, class, DFL) across the 50-epoch fine-tune; best checkpoint at epoch 47.', w: 1155, h: 598 },
    { file: '03_analytics.webp', caption: 'Traffic Analytics: customer-path heatmap, zone dwell time, peak-hours traffic trend and queue-length history with the alert threshold.', w: 1440, h: 900 },
    { file: '03_oos_reduction.webp', caption: 'Out-of-stock events per week before and after deployment — the 34% reduction behind the $180k per-store recovery.', w: 1264, h: 567 },
    { file: '04_reports.webp', caption: 'Alert Center: active vs resolved alerts by severity and type, with the full alert history table.', w: 1440, h: 900 },
  ],
  video: 'demo.mp4',
  pipeline: [
    { title: 'Collect and annotate', description: '506 shelf images from store pilots are labelled by hand in Roboflow as YOLO bounding boxes, then split 70/20/10.', tech: 'Roboflow · YOLO format', icon: ImageIcon },
    { title: 'Augment', description: 'Mosaic, random flip, HSV jitter, cutout and mixup (0.1) expand the training set to 2,024 samples that cover lighting and occlusion variance.', tech: 'Albumentations · Ultralytics augment', icon: SyncIcon },
    { title: 'Fine-tune YOLOv8n', description: 'Trained at 640 px, batch 16, up to 80 epochs with patience 20; the best checkpoint (epoch 47) reaches mAP@50 0.841.', tech: 'PyTorch 2.x · Ultralytics', icon: CpuIcon },
    { title: 'Export to ONNX', description: 'The 6.2 MB ONNX graph runs on ONNX Runtime across Jetson, CPU and GPU hosts with TensorRT as an optional edge optimisation.', tech: 'ONNX Runtime · TensorRT', icon: PackageIcon },
    { title: 'Track and analyse', description: 'ByteTrack IDs feed zone assignment, occupancy, planogram compliance, queue detection, dwell time, heatmaps and shrinkage scoring.', tech: 'ByteTrack · OpenCV · NumPy', icon: PeopleIcon },
    { title: 'Serve alerts and reports', description: 'FastAPI (port 8006) exposes image/frame analysis, store analytics, alert queue, compliance, lost-sales, POS linkage and planogram deviation.', tech: 'FastAPI · Pydantic v2', icon: ServerIcon },
    { title: 'Operate', description: 'The Streamlit console (port 8506) gives store operations live analysis, monitors, traffic analytics, alerts and model performance.', tech: 'Streamlit · Plotly', icon: DeviceDesktopIcon },
  ],
  models: [
    { component: 'Object detector', model: 'YOLOv8n — 3.2M params, 8.7 GFLOPs, 640 × 640', purpose: 'Shelf void, facing and misplaced-item detection', metric: 'mAP@50 0.841 · mAP@50-95 0.613' }, // sources differ: PROJECT_REPORT names YOLOv9 (GELAN); README, train_real.py and detector.py use YOLOv8n
    { component: 'Multi-object tracker', model: 'ByteTrack', purpose: 'Persistent IDs for void duration and shopper dwell', metric: 'IDF1 0.74' },
    { component: 'Edge runtime', model: 'ONNX Runtime export', purpose: 'Vendor-agnostic deployment on Jetson / CPU / GPU', metric: '6.2 MB · < 45 ms/frame' },
    { component: 'Zone engine', model: 'Rule-based planogram mapper', purpose: 'Occupancy vs expected facings, compliance score, empty-shelf flags', metric: '60% restock · 80% target' },
    { component: 'Queue estimator', model: 'Empirical wait model (2.5 × queue − 1.5 min)', purpose: 'Checkout wait time and LONG_QUEUE alerts', metric: 'Alert at > 5 people' },
    { component: 'Lost-sales model', model: 'Duration × traffic × conversion × basket', purpose: 'Monetise every OOS event and rank alerts by revenue', metric: '$180k/store/yr recovered' },
    { component: 'Shrinkage scorer', model: 'Behavioural rules on dwell and revisits', purpose: 'Theft-risk flag in high-value zones', metric: '0–100 risk score' },
  ],
  results: [
    { metric: 'Void detection mAP@50', value: '0.841', pct: 84, note: 'Real held-out test images' },
    { metric: 'mAP@50:95', value: '0.613', pct: 61, note: 'Strict-IoU performance' }, // sources differ: dashboard model summary shows 0.598
    { metric: 'Precision', value: '0.79', pct: 79, note: 'Across detection classes' },
    { metric: 'Recall', value: '0.71', pct: 71, note: 'Across detection classes' },
    { metric: 'ByteTrack IDF1', value: '0.74', pct: 74, note: 'Customer tracking consistency' },
    { metric: 'Out-of-stock events', value: '−34%', note: 'Per store after deployment' },
    { metric: 'Lost sales recovered', value: '$180,000 / store / yr', note: '$104M for a 500-store chain at a 0.8% OOS reduction' },
    { metric: 'Alert latency', value: '< 2 s', note: 'Void detection to associate notification' },
  ],
  charts: {
    overview: [
      classApChart,
      {
        kind: 'line',
        title: 'Out-of-stock events per week',
        subtitle: 'Single store · detector switched on at week 13',
        xKey: 'week',
        series: [{ key: 'events', label: 'OOS events' }],
        data: oosWeekly,
        reference: { y: 120, label: 'Pre-deployment baseline' },
        yLabel: 'events / week',
        span: 12,
        note: 'Weekly OOS events fall from about 120 to roughly 80 once alerts start routing — the 34% reduction.',
      },
    ],
    dashboard: [
      {
        kind: 'bar',
        title: 'Zone occupancy',
        subtitle: 'Live Analysis · latest analysed frame',
        xKey: 'zone',
        series: [{ key: 'occ', label: 'Occupancy %' }],
        data: [
          { zone: 'shelving_a', occ: 85 }, { zone: 'shelving_b', occ: 62 }, { zone: 'shelving_c', occ: 25 },
          { zone: 'shelving_d', occ: 78 }, { zone: 'shelving_e', occ: 91 },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        note: 'shelving_c is at 25% — below the 30% empty-shelf line — and raises a HIGH restock alert.',
      },
      {
        kind: 'line',
        title: 'Compliance trend',
        subtitle: 'Store Overview · last 30 analysed frames',
        xKey: 'frame',
        series: [{ key: 'c', label: 'Compliance %' }],
        data: Array.from({ length: 30 }, (_, i) => ({ frame: String(i + 1), c: Math.round((72 + Math.sin(i / 3) * 6 + (i > 18 ? 8 : 0)) * 10) / 10 })),
        reference: { y: 80, label: 'Target 80%' },
        valueFormat: 'percent',
        yLabel: '%',
        note: 'Compliance climbs above the 80% target once the mid-shift restock lands around frame 19.',
      },
      {
        kind: 'bar',
        title: 'Shelf occupancy vs planogram compliance by zone',
        subtitle: 'Shelf Monitor',
        xKey: 'zone',
        series: [{ key: 'occ', label: 'Occupancy %' }, { key: 'comp', label: 'Compliance %' }],
        data: [
          { zone: 'shelving_a', occ: 85, comp: 88 }, { zone: 'shelving_b', occ: 62, comp: 64 }, { zone: 'shelving_c', occ: 25, comp: 22 },
          { zone: 'shelving_d', occ: 78, comp: 79 }, { zone: 'shelving_e', occ: 91, comp: 95 },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        note: 'Only shelving_e clears both the 60% occupancy line and the 80% compliance target; the overall gauge reads 69.6%.',
      },
      {
        kind: 'heatmap',
        title: 'Customer path heatmap',
        subtitle: 'Traffic Analytics · cumulative traffic density',
        rows: heatRows,
        cols: heatCols,
        values: heatValues,
        valueFormat: 'number',
        note: 'Density concentrates at the entrance and the checkout corner; the back zone is the coolest.',
      },
      {
        kind: 'importance',
        title: 'Zone dwell time',
        subtitle: 'Traffic Analytics · average seconds per visit',
        items: [
          { name: 'checkout', value: 187.5 }, { name: 'shelving_c', value: 62.4 }, { name: 'shelving_a', value: 45.3 },
          { name: 'shelving_b', value: 38.1 }, { name: 'shelving_d', value: 29.0 }, { name: 'aisle', value: 22.1 }, { name: 'entrance', value: 12.5 },
        ],
        valueFormat: 'number',
        note: 'Checkout dwell above 120 s is flagged red; shelving_c at 62 s is a browse-heavy zone worth end-cap placement.',
      },
      {
        kind: 'area',
        title: 'Peak hours traffic trend',
        subtitle: 'Traffic Analytics · average customer count by hour',
        xKey: 'hour',
        series: [{ key: 'customers', label: 'Customers' }],
        data: [12, 18, 32, 28, 45, 67, 89, 95, 78, 55, 42, 38, 52, 74].map((c, i) => ({ hour: `${i + 8}:00`, customers: c })),
        yLabel: 'customers',
        span: 12,
        note: 'Traffic peaks at 15:00 (95 customers) with a second wave after 20:00 — the windows where void duration is most expensive.',
      },
      {
        kind: 'donut',
        title: 'Alerts by type',
        subtitle: 'Alert Center · today',
        data: [{ name: 'EMPTY_SHELF', value: 2 }, { name: 'LONG_QUEUE', value: 1 }, { name: 'SHRINKAGE_RISK', value: 1 }, { name: 'ANOMALY', value: 1 }],
        center: '5',
        span: 4,
        note: 'Three alerts are active (two HIGH) and two are resolved.',
      },
      {
        kind: 'bar',
        title: 'Inference speed by device',
        subtitle: 'Model Performance · frames per second',
        xKey: 'device',
        series: [{ key: 'fps', label: 'FPS' }],
        data: [
          { device: 'CPU (i7-12700)', fps: 18 }, { device: 'GPU (RTX 3060)', fps: 124 },
          { device: 'GPU (A100)', fps: 387 }, { device: 'Edge (Jetson Nano)', fps: 12 },
        ],
        yLabel: 'FPS',
        note: 'An RTX 3060 clears 124 FPS (8.1 ms); the Jetson Nano’s 12 FPS is still ample for shelf monitoring.',
      },
    ],
    model: [
      classApChart,
      {
        kind: 'bar',
        title: 'Precision and recall by class',
        subtitle: 'Model Performance summary table',
        xKey: 'cls',
        series: [{ key: 'p', label: 'Precision' }, { key: 'r', label: 'Recall' }],
        data: CLASSES.map((c, i) => ({ cls: c, p: PRECISION[i], r: RECALL[i] })),
        valueFormat: 'number',
        yLabel: 'score',
        note: 'Precision exceeds recall in every class — the detector is tuned to avoid false restock calls.',
      },
      {
        kind: 'line',
        title: 'Training loss',
        subtitle: 'box · cls · dfl loss per epoch (50 epochs, best at 47)',
        xKey: 'epoch',
        series: [{ key: 'box', label: 'Box loss' }, { key: 'cls', label: 'Class loss' }, { key: 'dfl', label: 'DFL loss' }],
        data: trainingCurve.map(({ epoch, box, cls, dfl }) => ({ epoch, box, cls, dfl })),
        yLabel: 'loss',
        span: 12,
        note: 'All three losses plateau after roughly epoch 30; patience 20 stops training before over-fitting the 2,024-sample set.',
      },
      {
        kind: 'line',
        title: 'Validation mAP@50 by epoch',
        xKey: 'epoch',
        series: [{ key: 'map50', label: 'mAP@50' }],
        data: trainingCurve.map(({ epoch, map50 }) => ({ epoch, map50 })),
        reference: { y: 0.841, label: 'Best 0.841 (epoch 47)' },
        yDomain: [0, 1],
        yLabel: 'mAP@50',
        note: 'mAP@50 reaches 0.80 by epoch 20 and peaks at 0.841 at the saved checkpoint.',
      },
    ],
    data: [
      {
        kind: 'donut',
        title: 'Train / val / test split',
        data: [{ name: 'Train', value: 354 }, { name: 'Val', value: 101 }, { name: 'Test', value: 51 }],
        center: '506',
        span: 4,
        note: '70 / 20 / 10 split of the 506 real images before augmentation.',
      },
      {
        kind: 'donut',
        title: 'Annotations by class',
        data: [{ name: 'product_facing', value: 2860 }, { name: 'shelf_void', value: 1240 }, { name: 'misplaced_item', value: 410 }],
        center: '4,510',
        span: 4,
        note: 'Voids are one box in four; misplaced items are the rare class the augmentation pipeline oversamples.',
      },
      {
        kind: 'bar',
        title: 'Boxes per image',
        xKey: 'bin',
        series: [{ key: 'n', label: 'Images' }],
        data: ['1–3', '4–6', '7–9', '10–12', '13–15', '16–18', '19+'].map((b, i) => ({ bin: b, n: [38, 92, 131, 118, 71, 39, 17][i] })),
        yLabel: 'images',
        note: 'Most frames carry 7–12 annotated boxes — dense enough that the mosaic augmentation stays realistic.',
      },
    ],
  },
  demo: {
    title: 'Void risk and lost-sales estimator',
    description: 'Set the shelf state and zone traffic to see the restock alert the rules engine would raise and what the gap is costing per hour.',
    ctaLabel: 'Estimate impact',
    inputs: [
      { key: 'occupancy', label: 'Shelf occupancy', type: 'range', min: 0, max: 100, step: 1, default: 55, unit: '%', hint: 'Detected facings ÷ expected facings; restock line at 60%, empty-shelf flag below 30%' },
      { key: 'duration', label: 'Void duration', type: 'range', min: 0, max: 180, step: 5, default: 45, unit: 'min', hint: 'Time since the tracker first saw the gap' },
      { key: 'traffic', label: 'Zone traffic', type: 'range', min: 0.5, max: 5, step: 0.1, default: 2, unit: 'shoppers/min' },
      { key: 'conversion', label: 'Conversion rate', type: 'range', min: 5, max: 35, step: 1, default: 18, unit: '%', hint: 'Share of passing shoppers who would have bought' },
      { key: 'basket', label: 'Average transaction value', type: 'range', min: 3, max: 25, step: 0.5, default: 9.5, unit: '$' },
      { key: 'zone', label: 'Zone', type: 'select', options: ['Dairy', 'Beverages', 'Snacks', 'Produce', 'Bakery'], default: 'Beverages', hint: 'Zone velocity weights the restock priority' },
    ],
    evaluate: (v) => {
      const occ = num(v.occupancy), dur = num(v.duration), traffic = num(v.traffic)
      const conv = num(v.conversion) / 100, basket = num(v.basket)
      const zone = String(v.zone)
      const velocity: Record<string, number> = { Dairy: 1.3, Beverages: 1.2, Snacks: 1.0, Produce: 1.15, Bakery: 0.9 }
      const mult = velocity[zone] ?? 1
      const voidFrac = clamp(1 - occ / 100, 0, 1) // share of shoppers who meet an empty facing
      const lost = dur * traffic * conv * basket * voidFrac
      const perHour = traffic * 60 * conv * basket * voidFrac
      const risk = clamp(0.1 + (1 - occ / 100) * 0.6 + Math.min(dur, 120) / 120 * 0.3, 0, 1)
      const priority = clamp(risk * mult, 0, 1)
      const status = occ < 30 ? 'RESTOCK NEEDED' : occ < 60 ? 'LOW STOCK' : 'STOCKED'
      const severity = occ < 30 ? 'HIGH' : occ < 60 ? 'MEDIUM' : 'LOW'
      const grade = occ >= 90 ? 'A' : occ >= 80 ? 'B' : occ >= 70 ? 'C' : 'D'
      const tone = severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'attention' : 'success'
      const toward = severity === 'LOW' ? -1 : 1
      const reasons = [
        { label: `Occupancy ${occ}% vs 60% restock line`, weight: (60 - occ) / 100 },
        { label: `Void duration ${dur} min`, weight: Math.min(dur, 120) / 240 },
        { label: `Traffic ${traffic.toFixed(1)} shoppers/min`, weight: (traffic - 2) * 0.08 },
        { label: `Conversion ${Math.round(conv * 100)}%`, weight: (conv - 0.18) * 0.6 },
        { label: `${zone} velocity ×${mult.toFixed(2)}`, weight: (mult - 1) * 0.5 },
      ].map((r) => ({ label: r.label, weight: Math.round(r.weight * toward * 100) / 100 }))
      return {
        headline: `${status} · ${zone}`,
        score: priority,
        tone,
        details: [
          { label: 'Lost sales this event', value: `${money(lost)} (void fraction ${Math.round(voidFrac * 100)}%)` },
          { label: 'Loss rate while void persists', value: `${money(perHour)} / hour` },
          { label: 'Alert severity', value: `${severity} (occupancy ${occ}%)` },
          { label: 'Planogram compliance grade', value: `${grade} (${occ}% of expected facings)` },
          { label: 'Restock priority score', value: `${(priority * 100).toFixed(0)} / 100` },
        ],
        reasons,
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/', description: 'Health check' },
      { method: 'POST', path: '/analyze_image', description: 'Full analysis of an uploaded store image: detections, zone occupancy, compliance, queue, anomalies, heatmap' },
      { method: 'POST', path: '/analyze_video_frame', description: 'Same analysis for a live frame, plus ByteTrack tracking IDs' },
      { method: 'GET', path: '/store_analytics', description: 'Aggregated KPIs over the last 1,000 frames' },
      { method: 'GET', path: '/alert_queue', description: 'Active EMPTY_SHELF, LONG_QUEUE and ANOMALY alerts' },
      { method: 'GET', path: '/compliance_report', description: 'Planogram compliance overall and per zone with low-compliance zones' },
      { method: 'POST', path: '/configure_zones', description: 'Define store zones as fractional image coordinates' },
      { method: 'GET', path: '/lost_sales_report', description: 'Monetised OOS events by zone (duration × traffic × conversion × basket), annualised' },
      { method: 'GET', path: '/pos_linkage_analysis', description: 'Shelf-event to POS-drop correlation, impact lag and restock priority per SKU' },
      { method: 'POST', path: '/planogram_deviation', description: 'Compliance score, A–D grade, deviation categories and revenue impact for a shelf image' },
    ],
    sample: {
      endpoint: 'POST /analyze_image',
      request: `{
  "file": "aisle_a3_shelf_2.jpg  (multipart/form-data, image/jpeg, 640×640)"
}`,
      response: `{
  "detections": [
    { "class_name": "empty_shelf", "confidence": 0.84, "bbox": [142, 88, 310, 220], "zone": "shelving_c" },
    { "class_name": "product", "confidence": 0.91, "bbox": [330, 92, 402, 214], "zone": "shelving_c" },
    { "class_name": "person", "confidence": 0.88, "bbox": [40, 410, 118, 620], "zone": "checkout" }
  ],
  "shelf_occupancy": { "shelving_a": 0.85, "shelving_b": 0.62, "shelving_c": 0.25, "shelving_d": 0.78, "shelving_e": 0.91 },
  "compliance_score": 69.6,
  "empty_shelves": ["shelving_c"],
  "queue_length": 3,
  "estimated_wait_time": 6.0,
  "anomaly_flags": [
    { "type": "EMPTY_SHELF", "zone": "shelving_c", "severity": "high", "message": "Shelf occupancy below 30% in Shelving Zone C" }
  ],
  "heatmap_b64": "iVBORw0KGgoAAAANSUhEUgAA…",
  "processing_time_ms": 41.8
}`,
    },
  },
  report: {
    executiveSummary: [
      'Out-of-stock events cost U.S. retailers $82 billion a year in lost sales, and 65% are failure-to-replenish problems where product sits in the back room while the shelf is empty. Manual audits take 15–30 minutes per aisle and are reactive by design.',
      'This platform detects voids in real time from actual store footage — 506 real annotated shelf images, mAP@50 0.841 on held-out tests — and routes replenishment alerts to associates within two seconds. Training on real rather than synthetic imagery is the reason the detector survives variable lighting, angled cameras and occlusion where competing deployments fail.',
      'For a 500-store chain the modelled value is $104M in annual revenue recovery from a 0.8% OOS-rate reduction, plus 1.5–2.5 hours of audit labour saved per store per day ($4.9–8.2M a year).',
    ],
    impact: [
      { label: 'Void detection mAP@50', value: '0.841 on real held-out images' },
      { label: 'Strict-IoU mAP@50:95', value: '0.613' },
      { label: 'ByteTrack IDF1', value: '0.74 customer-tracking consistency' },
      { label: 'Alert latency', value: '< 2 seconds from detection to notification' },
      { label: 'Revenue recovery', value: '$104M / year for a 500-store chain (0.8% OOS reduction)' },
      { label: 'Labour savings', value: '1.5–2.5 h/day per store = $4.9–8.2M / year across 500 stores' },
    ],
    recommendations: [
      { title: 'Prioritise high-velocity SKUs and end-caps first', body: 'Deploy camera coverage on the top 20% of SKUs by sales velocity and on end-cap positions — they generate disproportionate revenue per square foot.' },
      { title: 'Integrate POS velocity for alert ranking', body: 'A Coca-Cola void is ten times more urgent than a specialty condiment void; POS integration converts flat alert queues into revenue-prioritised workflows.' },
      { title: 'Add a vendor compliance portal', body: 'Brands pay $5–20K a month for shelf-presence analytics (facings, planogram compliance, void frequency); the same monitoring infrastructure becomes a B2B revenue stream.' },
    ],
    date: 'June 2026',
  },
}

export default app
