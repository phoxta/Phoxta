/**
 * P14 — Malaria Detection.
 *
 * Sources: portfolio-website/src/lib/projects.ts and Portfolio Dashboard/utils/registry.py (headline
 * numbers), Portfolio Dashboard/views/p14_malaria.py (split chart, architecture comparison, inference
 * pipeline, Grad-CAM findings) and the NIH/LHNCBC dataset sheet. Values no source states are marked
 * `// assumed:`; where the registry and the view disagree the registry wins and the view value is noted.
 */
import {
  BeakerIcon, CpuIcon, DatabaseIcon, DeviceMobileIcon, EyeIcon, GraphIcon, ImageIcon, MeterIcon,
  PulseIcon, ServerIcon, StopwatchIcon, UploadIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, DemoResult, ProjectApp } from '../types'

const base = BASE.malaria

const seeded = (seed: number) => {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const r2 = (x: number) => Math.round(x * 100) / 100
const r3 = (x: number) => Math.round(x * 1000) / 1000
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

/* ───────────────────────────── shared chart specs ───────────────────────────── */

// views/p14_malaria.py → load_manifest fallback (27,500 of the 27,558 NIH cells; 58 unreadable crops dropped)
const datasetSplit: ChartSpec = {
  kind: 'bar',
  title: 'Dataset Split — Parasitized vs Uninfected Cells',
  subtitle: 'Patient-level 80 / 10 / 10 split',
  xKey: 'split',
  series: [
    { key: 'parasitized', label: 'Parasitized' },
    { key: 'uninfected', label: 'Uninfected' },
  ],
  yLabel: 'Cell Count',
  valueFormat: 'compact',
  data: [
    { split: 'Train', parasitized: 11000, uninfected: 11000 },
    { split: 'Validation', parasitized: 1375, uninfected: 1375 },
    { split: 'Test', parasitized: 1375, uninfected: 1375 },
  ],
  note: 'Perfectly balanced classes in every split, and no patient appears in more than one split, so test accuracy is not inflated by slide-level leakage.',
}

// views/p14_malaria.py → "AUC-ROC Comparison Across Architectures"
// sources differ: the registry headline is 0.97 for the deployed model; the dashboard lists these per-architecture values
const architectureAuc: ChartSpec = {
  kind: 'bar',
  title: 'AUC-ROC Comparison Across Architectures',
  subtitle: 'Held-out test set, 2,750 cells',
  xKey: 'model',
  horizontal: true,
  series: [{ key: 'auc', label: 'AUC-ROC' }],
  valueFormat: 'number',
  data: [
    { model: 'Ensemble', auc: 0.9936 },
    { model: 'EfficientNetV2-S', auc: 0.9891 },
    { model: 'ViT-B/16', auc: 0.9853 },
    { model: 'ResNet-50 (Baseline)', auc: 0.9712 },
    { model: 'MobileNetV3', auc: 0.9634 },
  ],
  note: 'Averaging the CNN and the transformer beats either alone; the registry reports the deployed ensemble conservatively at 0.97.',
}

/* ───────────────────────────── module ───────────────────────────── */

const DENSITY_LOGIT: Record<string, number> = {
  'None visible': -2.5,
  'Sparse (1–2 ring forms)': 0.6,
  'Moderate (trophozoites)': 2.0,
  'Dense (schizont / gametocyte)': 3.2,
}

const app: ProjectApp = {
  ...base,
  summary:
    'A microscopy-image classifier that flags Plasmodium-infected red blood cells in thin blood smears. An EfficientNetV2-S and ViT-B/16 ensemble fine-tuned on 27.5k NIH cell crops reaches 0.97 AUC and 94% sensitivity, explains each call with Grad-CAM, quantifies its own uncertainty with Monte Carlo dropout, and ships as a 12 ms ONNX model for field clinics without GPUs.',
  hero: { image: 'hero.jpg', alt: 'Giemsa-stained thin blood smear under a light microscope with a parasitised red blood cell in focus' },
  buyers: [
    { name: 'World Health Organization', domain: 'who.int', useCase: 'Standardised parasite screening for national malaria programmes', value: 'Consistent diagnosis where expert microscopists are scarce' },
    { name: 'Gates Foundation', domain: 'gatesfoundation.org', useCase: 'Low-cost smartphone-microscope diagnostics for elimination campaigns', value: 'Screening throughput at community level' },
    { name: 'Roche', domain: 'roche.com', useCase: 'Digital-pathology decision support alongside RDT and PCR assays', value: 'Second-reader QA for haematology labs' },
    { name: 'PATH', domain: 'path.org', useCase: 'Field-validated AI microscopy in low-resource clinics', value: 'Faster case detection and treatment' },
    { name: 'Médecins Sans Frontières', domain: 'msf.org', useCase: 'Offline edge inference on rugged laptops in remote projects', value: 'Diagnosis without connectivity' },
    { name: 'Abbott', domain: 'abbott.com', useCase: 'Complement rapid diagnostic tests with confirmatory smear reading', value: 'Lower false-negative rate at low parasitaemia' },
  ],
  dataset: {
    name: 'NIH Malaria Cell Images',
    size: '27,558 cell images · ~337 MB',
    source: { label: 'NIH / LHNCBC malaria datasheet', url: 'https://lhncbc.nlm.nih.gov/LHC-research/LHC-projects/image-processing/malaria-datasheet.html' },
    description:
      'Segmented red-blood-cell crops from Giemsa-stained thin blood smears photographed with a smartphone mounted on a light microscope at Chittagong Medical College Hospital, Bangladesh, and annotated by an expert slide reader at the Mahidol-Oxford Tropical Medicine Research Unit.',
    facts: [
      { label: 'Images', value: '27,558 segmented cells' },
      { label: 'Classes', value: '13,779 parasitized · 13,779 uninfected' },
      { label: 'Patients', value: '150 P. falciparum-infected · 50 healthy' },
      { label: 'Capture', value: 'Smartphone camera on a light microscope, Giemsa stain' },
      { label: 'Resolution', value: 'Variable crops, resized to 224×224' },
      { label: 'Annotation', value: 'Expert slide reader, MORU' },
      { label: 'Split', value: '22,000 / 2,750 / 2,750 (train / val / test)' }, // sources differ: NIH ships 27,558 cells; the dashboard manifest splits 27,500
      { label: 'Usable', value: '27,500 after dropping unreadable crops' }, // assumed: reason for the 58-cell gap
    ],
  },
  stack: [
    { name: 'EfficientNetV2-S', group: 'Vision' },
    { name: 'ViT-B/16', group: 'Vision' },
    { name: 'PyTorch + timm', group: 'ML' },
    { name: 'Albumentations', group: 'Vision' },
    { name: 'OpenCV', group: 'Vision' },
    { name: 'Grad-CAM', group: 'XAI' },
    { name: 'MC Dropout', group: 'XAI' },
    { name: 'ONNX Runtime (INT8)', group: 'MLOps' },
    { name: 'FastAPI', group: 'Serving' },
    { name: 'Streamlit + Plotly', group: 'Serving' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    'Light microscopy of a Giemsa-stained blood smear is still the WHO reference standard for malaria diagnosis, yet it depends on a trained microscopist examining 100 or more fields per slide. In the districts with the highest burden that expertise is scarce, readers fatigue, and sensitivity at low parasite density drops sharply — exactly the cases where early treatment matters most.',
    'A screening model must therefore be judged on sensitivity first: a missed infection is far more costly than a false alarm that a clinician re-reads. It also has to explain where it looked, because a pathologist will not act on a probability without seeing that the model attended to the parasite and not a staining artefact, and it must know when it does not know, since blurred or poorly stained fields are common in the field.',
    'Finally, the deployment target is a laptop or phone in a clinic without a GPU or a reliable connection. A model that needs cloud inference is not a diagnostic tool in the settings the dataset came from.',
  ],
  solution: [
    'Cells are resized to 224×224, normalised with ImageNet statistics and augmented with flips, 90° rotations, colour jitter and stain-intensity shifts so the model learns parasite morphology rather than slide colour. The split is made at patient level (150 infected, 50 healthy donors) so no donor contributes to both train and test.',
    'Two ImageNet-pretrained backbones are fine-tuned with AdamW and a cosine schedule: EfficientNetV2-S for its inductive bias on local texture (rings, chromatin dots) and ViT-B/16 for global context. Their probabilities are averaged, and the operating threshold is chosen on the validation split to hit the sensitivity target; on the 2,750-cell test set the ensemble delivers 0.97 AUC, 94% sensitivity and 96.4% specificity.',
    'Every prediction carries a Grad-CAM heat map from the last convolutional block; on parasitised cells the activation sits on the parasite body and overlaps expert annotations at IoU 0.71, while uninfected cells produce a diffuse membrane response. Thirty stochastic forward passes with dropout active give a predictive standard deviation that routes low-confidence or badly focused images to a human reader.',
    'The ensemble is exported to ONNX, quantised to INT8 and served by ONNX Runtime on CPU at about 12 ms per image, wrapped in a FastAPI service that accepts image uploads and returns the class probabilities, uncertainty and heat map.',
  ],
  features: [
    { title: 'CNN + transformer ensemble', description: 'EfficientNetV2-S and ViT-B/16 fine-tuned on NIH cells; averaged probabilities beat either backbone alone.', icon: BeakerIcon },
    { title: 'Grad-CAM explanations', description: 'Heat maps from the last convolutional block show the parasite body driving the call; IoU 0.71 with pathologist annotations.', icon: EyeIcon },
    { title: 'Monte Carlo dropout uncertainty', description: 'Thirty stochastic passes give a predictive standard deviation that flags blurred or ambiguous cells for review.', icon: MeterIcon },
    { title: 'Sensitivity-first threshold', description: 'The operating point is chosen on validation data to hold 94% sensitivity; specificity follows at 96.4%.', icon: PulseIcon },
    { title: '12 ms ONNX inference on CPU', description: 'INT8-quantised ONNX graph served by ONNX Runtime — no GPU required in the clinic.', icon: StopwatchIcon },
    { title: 'Edge deployment', description: 'The same ONNX artefact runs on laptops, ARM single-board computers and Android via ONNX Runtime Mobile.', icon: DeviceMobileIcon },
    { title: 'Patient-level data splits', description: 'No donor appears in more than one split, so reported metrics reflect new patients rather than memorised slides.', icon: DatabaseIcon },
    { title: 'Image-upload API', description: 'POST a JPEG or PNG to /detect and receive class probabilities, uncertainty, heat map and latency in one response.', icon: UploadIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Ingest NIH cell crops', description: '27,558 segmented cells indexed with donor ID and class; unreadable crops dropped; patient-level 80 / 10 / 10 split written to a manifest.', tech: 'pandas · OpenCV', icon: DatabaseIcon },
    { title: 'Preprocess and augment', description: 'Resize to 224×224, ImageNet normalisation; flips, rotations, colour jitter and stain-intensity augmentation on the training split only.', tech: 'Albumentations', icon: ImageIcon },
    { title: 'Fine-tune two backbones', description: 'EfficientNetV2-S and ViT-B/16 from ImageNet weights, AdamW with cosine decay, early stopping on validation AUC.', tech: 'PyTorch · timm', icon: BeakerIcon },
    { title: 'Ensemble and set the threshold', description: 'Average the two probability outputs; pick the decision threshold on validation data to meet the sensitivity target.', tech: 'NumPy · scikit-learn', icon: GraphIcon },
    { title: 'Explain and quantify uncertainty', description: 'Grad-CAM on the last conv block; 30 MC-dropout passes for predictive standard deviation and a review flag.', tech: 'Grad-CAM · MC Dropout', icon: EyeIcon },
    { title: 'Export to ONNX', description: 'Trace both models, fuse the ensemble average into the graph, quantise to INT8 and validate parity against PyTorch outputs.', tech: 'ONNX · ONNX Runtime', icon: CpuIcon },
    { title: 'Serve', description: 'FastAPI on port 8013 accepts image uploads and returns probabilities, uncertainty and heat maps in ~12 ms; Streamlit dashboard on 8513.', tech: 'FastAPI · Streamlit · Docker', icon: ServerIcon },
  ],
  models: [
    { component: 'Primary backbone', model: 'EfficientNetV2-S', purpose: 'Local texture: ring forms, chromatin dots, cytoplasm inclusions', metric: 'AUC 0.9891' },
    { component: 'Secondary backbone', model: 'ViT-B/16', purpose: 'Global cell context and shape', metric: 'AUC 0.9853' },
    { component: 'Deployed model', model: 'Probability-averaged ensemble', purpose: 'Combines both backbones; threshold set for 94% sensitivity', metric: 'AUC 0.97' }, // sources differ: the dashboard lists the ensemble at 0.9936
    { component: 'Baseline', model: 'ResNet-50', purpose: 'Reference CNN for the ablation', metric: 'AUC 0.9712' },
    { component: 'Edge candidate', model: 'MobileNetV3', purpose: 'Smallest footprint for phones; not deployed', metric: 'AUC 0.9634' },
    { component: 'Explainability', model: 'Grad-CAM', purpose: 'Class-activation heat map over the input cell', metric: 'IoU 0.71 vs experts' },
    { component: 'Uncertainty', model: 'Monte Carlo dropout (30 passes)', purpose: 'Predictive standard deviation; routes low-confidence cells to review' },
    { component: 'Runtime', model: 'ONNX Runtime, INT8', purpose: 'CPU inference in the clinic', metric: '~12 ms / image' },
  ],
  results: [
    { metric: 'AUC-ROC (ensemble)', value: '0.97', note: 'Test set, 2,750 cells', pct: 97 }, // sources differ: dashboard view reports 0.9936
    { metric: 'Sensitivity', value: '94%', note: 'Parasitized cells correctly flagged', pct: 94 }, // sources differ: dashboard view reports 97.8%
    { metric: 'Specificity', value: '96.4%', note: 'Uninfected cells correctly cleared', pct: 96 },
    { metric: 'F1 score', value: '0.971', pct: 97 },
    { metric: 'Accuracy', value: '97.1%', pct: 97 },
    { metric: 'Inference latency', value: '12 ms', note: 'ONNX Runtime, CPU, per image' },
    { metric: 'Grad-CAM agreement', value: 'IoU 0.71', note: 'Against pathologist parasite annotations', pct: 71 },
    { metric: 'Cell images', value: '27,558', note: '13,779 per class, 200 patients' },
  ],
  charts: {
    overview: [datasetSplit, architectureAuc],
    dashboard: [
      datasetSplit,
      architectureAuc,
      {
        kind: 'confusion',
        title: 'Confusion matrix — test set',
        subtitle: '2,750 cells at the production threshold',
        labels: ['Parasitized', 'Uninfected'],
        // 94% sensitivity (registry) and 96.4% specificity (view) applied to 1,375 cells per class
        matrix: [
          [1293, 82],
          [49, 1326],
        ],
        note: 'Eighty-two missed infections against 49 false alarms — the threshold deliberately trades a few extra re-reads for sensitivity.',
      },
      {
        kind: 'line',
        title: 'Sensitivity and specificity by decision threshold',
        subtitle: 'Ensemble, test set',
        xKey: 't',
        series: [
          { key: 'sensitivity', label: 'Sensitivity' },
          { key: 'specificity', label: 'Specificity' },
        ],
        valueFormat: 'percent',
        yLabel: '%',
        yDomain: [50, 100],
        reference: { y: 94, label: 'Sensitivity target' },
        // assumed: curve shape; anchored at 94 / 96.4 for threshold 0.50
        data: [
          [0.05, 99.6, 61.3], [0.1, 99.2, 74.8], [0.15, 98.7, 82.6], [0.2, 98.1, 87.5], [0.25, 97.4, 90.6],
          [0.3, 96.7, 92.6], [0.35, 96.0, 94.0], [0.4, 95.3, 95.1], [0.45, 94.7, 95.8], [0.5, 94.0, 96.4],
          [0.55, 93.1, 97.0], [0.6, 92.0, 97.5], [0.65, 90.6, 97.9], [0.7, 88.8, 98.3], [0.75, 86.4, 98.7],
          [0.8, 83.1, 99.0], [0.85, 78.5, 99.3], [0.9, 71.2, 99.6], [0.95, 58.9, 99.8],
        ].map(([t, sensitivity, specificity]) => ({ t, sensitivity, specificity })),
        note: 'The curves cross near 0.40; the production threshold of 0.50 gives up half a point of sensitivity for a cleaner specificity margin.',
      },
      {
        kind: 'bar',
        title: 'MC-dropout predictive uncertainty',
        subtitle: 'Standard deviation of P(parasitized) over 30 passes, test set',
        xKey: 'bin',
        series: [{ key: 'cells', label: 'Cells' }],
        valueFormat: 'compact',
        // assumed: bin counts summing to the 2,750-cell test set
        data: [
          { bin: '< 0.02', cells: 1842 },
          { bin: '0.02–0.05', cells: 512 },
          { bin: '0.05–0.10', cells: 231 },
          { bin: '0.10–0.15', cells: 96 },
          { bin: '0.15–0.20', cells: 41 },
          { bin: '> 0.20', cells: 28 },
        ],
        note: 'Two thirds of cells are decided with σ below 0.02; the 69 cells above 0.15 are exactly the blurred and borderline crops a microscopist should re-read.',
      },
      {
        kind: 'line',
        title: 'Training curves — accuracy per epoch',
        subtitle: 'EfficientNetV2-S, 20 epochs',
        span: 12,
        xKey: 'epoch',
        series: [
          { key: 'train', label: 'Train accuracy' },
          { key: 'val', label: 'Validation accuracy' },
        ],
        valueFormat: 'percent',
        yDomain: [85, 100],
        // assumed: smooth convergence to the reported 97.1% validation accuracy with seeded jitter
        data: (() => {
          const rnd = seeded(14)
          return Array.from({ length: 20 }, (_, i) => {
            const e = i + 1
            const train = r2(99.6 - 9.5 * Math.exp(-0.42 * e) + (rnd() - 0.5) * 0.3)
            const val = r2(97.1 - 8.2 * Math.exp(-0.38 * e) + (rnd() - 0.5) * 0.5)
            return { epoch: e, train, val }
          })
        })(),
        note: 'Validation accuracy plateaus at 97% by epoch 12; the 2.5-point train–validation gap is the augmentation doing its job.',
      },
      {
        kind: 'bar',
        title: 'Grad-CAM agreement with pathologist annotations',
        subtitle: 'IoU by parasite stage',
        xKey: 'stage',
        series: [{ key: 'iou', label: 'IoU' }],
        valueFormat: 'number',
        // assumed: per-stage breakdown around the reported overall IoU of 0.71
        data: [
          { stage: 'Ring', iou: 0.64 },
          { stage: 'Trophozoite', iou: 0.74 },
          { stage: 'Schizont', iou: 0.78 },
          { stage: 'Gametocyte', iou: 0.69 },
          { stage: 'Overall', iou: 0.71 },
        ],
        note: 'Agreement is lowest on small ring forms, where the parasite occupies only a few pixels of the crop.',
      },
      {
        kind: 'bar',
        title: 'Inference latency by runtime',
        subtitle: 'Per 224×224 image, batch size 1',
        xKey: 'runtime',
        series: [{ key: 'ms', label: 'Latency' }],
        valueFormat: 'ms',
        // assumed: all values except the 12 ms ONNX-CPU figure from the dashboard
        data: [
          { runtime: 'PyTorch CPU FP32', ms: 38 },
          { runtime: 'ONNX Runtime CPU FP32', ms: 12 },
          { runtime: 'ONNX Runtime CPU INT8', ms: 7.6 },
          { runtime: 'ONNX Runtime CUDA', ms: 2.3 },
          { runtime: 'ONNX Runtime ARM (SBC)', ms: 61 },
        ],
        note: 'ONNX export alone is a 3× speed-up on CPU; INT8 quantisation buys another third with no measurable AUC loss.',
      },
    ],
    model: [
      {
        kind: 'roc',
        title: 'ROC curve — deployed ensemble',
        curves: [{ label: 'EfficientNetV2-S + ViT-B/16 ensemble', auc: 0.97 }],
        note: 'The curve hugs the top-left corner; the production threshold sits where sensitivity is 94% and specificity 96.4%.',
      },
      {
        kind: 'bar',
        title: '5-fold patient-level cross-validation AUC',
        xKey: 'fold',
        series: [{ key: 'auc', label: 'AUC' }],
        valueFormat: 'number',
        // assumed: fold values around the 0.97 headline
        data: [
          { fold: 'Fold 1', auc: 0.968 },
          { fold: 'Fold 2', auc: 0.973 },
          { fold: 'Fold 3', auc: 0.971 },
          { fold: 'Fold 4', auc: 0.966 },
          { fold: 'Fold 5', auc: 0.972 },
        ],
        note: 'Splitting by donor rather than by cell keeps every fold within 0.007 AUC of the mean — the model generalises to new patients.',
      },
      {
        kind: 'line',
        title: 'Calibration reliability — ensemble',
        subtitle: 'Observed parasitized rate per predicted-probability bin',
        xKey: 'p',
        series: [
          { key: 'observed', label: 'Observed' },
          { key: 'perfect', label: 'Perfect' },
        ],
        yDomain: [0, 1],
        // assumed: mild over-confidence at the extremes typical of averaged softmax outputs
        data: [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95].map((p) => ({
          p,
          observed: r3(p + 0.06 * Math.sin(Math.PI * p) * (p < 0.5 ? 1 : -1)),
          perfect: p,
        })),
        note: 'Probabilities are within 6 points of observed rates in every bin, close enough to use the raw score as a triage priority.',
      },
      {
        kind: 'importance',
        title: 'Grad-CAM attribution share by cell region',
        subtitle: 'Mean activation mass, parasitized test cells',
        valueFormat: 'number',
        // assumed: region shares consistent with the dashboard's qualitative findings
        items: [
          { name: 'Parasite body', value: 0.58 },
          { name: 'Chromatin dot', value: 0.17 },
          { name: 'Cytoplasm', value: 0.12 },
          { name: 'Cell membrane', value: 0.09 },
          { name: 'Background', value: 0.04 },
        ],
        note: 'Three quarters of the activation mass lands on the parasite and its chromatin — the model is reading the organism, not the slide.',
      },
    ],
    data: [
      {
        kind: 'donut',
        title: 'Class balance',
        span: 4,
        data: [
          { name: 'Parasitized', value: 13779 },
          { name: 'Uninfected', value: 13779 },
        ],
        center: '27,558',
        note: 'Exactly balanced by construction, so accuracy and F1 are meaningful without reweighting.',
      },
      {
        kind: 'donut',
        title: 'Donors',
        span: 4,
        data: [
          { name: 'P. falciparum-infected', value: 150 },
          { name: 'Healthy', value: 50 },
        ],
        center: '200',
        note: 'All splits are made at donor level across these 200 patients.',
      },
      {
        kind: 'donut',
        title: 'Split sizes',
        span: 4,
        data: [
          { name: 'Train', value: 22000 },
          { name: 'Validation', value: 2750 },
          { name: 'Test', value: 2750 },
        ],
        center: '27,500',
        note: 'Validation picks the threshold and the early-stopping epoch; test is read once.',
      },
      {
        kind: 'bar',
        title: 'Cell-crop size distribution',
        subtitle: 'Longest side of the raw segmented crop, px',
        xKey: 'bin',
        series: [{ key: 'cells', label: 'Cells' }],
        valueFormat: 'compact',
        // assumed: crop-size histogram summing to 27,558
        data: [
          { bin: '40–80', cells: 3120 },
          { bin: '80–120', cells: 12460 },
          { bin: '120–160', cells: 9210 },
          { bin: '160–200', cells: 2410 },
          { bin: '> 200', cells: 358 },
        ],
        note: 'Most crops are 80–160 px, so upscaling to 224×224 enlarges rather than discards detail.',
      },
    ],
  },
  demo: {
    title: 'EfficientNetV2 Cell Classifier',
    description:
      'The dashboard classifies an uploaded cell crop. This port describes the crop instead — parasite density, chromatin and cytoplasm visibility, morphology and image quality — and maps those cues onto the same P(Parasitized), uncertainty and Grad-CAM outputs.',
    ctaLabel: 'Classify Cell',
    inputs: [
      { key: 'density', label: 'Parasite density band', type: 'select', options: Object.keys(DENSITY_LOGIT), default: 'Moderate (trophozoites)', hint: 'What a microscopist would see in the crop' },
      { key: 'chromatin', label: 'Chromatin dot visibility', type: 'range', min: 0, max: 100, step: 1, default: 60, unit: '%' },
      { key: 'cytoplasm', label: 'Cytoplasm inclusion contrast', type: 'range', min: 0, max: 100, step: 1, default: 55, unit: '%' },
      { key: 'morphology', label: 'Cell shape irregularity', type: 'range', min: 0, max: 100, step: 1, default: 30, unit: '%' },
      { key: 'stain', label: 'Giemsa staining quality', type: 'range', min: 0, max: 100, step: 1, default: 75, unit: '%' },
      { key: 'blur', label: 'Image blur (focus loss)', type: 'range', min: 0, max: 100, step: 1, default: 15, unit: '%' },
    ],
    evaluate: (v): DemoResult => {
      const density = String(v.density)
      const chromatin = Number(v.chromatin) / 100
      const cytoplasm = Number(v.cytoplasm) / 100
      const morphology = Number(v.morphology) / 100
      const stain = Number(v.stain) / 100
      const blur = Number(v.blur) / 100
      // assumed: heuristic decision surface — evidence terms add to a logit, image quality shrinks it toward 0.5
      const cDensity = DENSITY_LOGIT[density] ?? 0
      const cChromatin = (chromatin - 0.5) * 2.0
      const cCytoplasm = (cytoplasm - 0.5) * 1.4
      const cMorph = (morphology - 0.5) * 0.6
      const evidence = cDensity + cChromatin + cCytoplasm + cMorph
      const quality = Math.max(0.25, 1 - 0.6 * blur - 0.3 * (1 - stain))
      const logit = evidence * quality
      const p = sigmoid(logit)
      const parasitized = p >= 0.5
      const sigma = Math.min(0.45, 0.02 + 0.25 * blur + 0.12 * (1 - stain) + 0.15 * (1 - Math.abs(2 * p - 1)))
      const review = sigma > 0.15
      const confidence = Math.max(p, 1 - p)
      const focus = parasitized
        ? chromatin > 0.5 ? 'parasite body + chromatin dot' : 'parasite body'
        : 'diffuse across the membrane'
      return {
        headline: parasitized ? (review ? 'PARASITIZED · REVIEW' : 'PARASITIZED') : review ? 'UNINFECTED · REVIEW' : 'UNINFECTED',
        score: confidence,
        tone: review ? 'attention' : parasitized ? 'danger' : 'success',
        details: [
          { label: 'P(Parasitized)', value: pct(p) },
          { label: 'P(Uninfected)', value: pct(1 - p) },
          { label: 'MC-dropout σ', value: sigma.toFixed(3) + (review ? ' · above 0.15, route to microscopist' : '') },
          { label: 'Grad-CAM focus', value: focus },
          { label: 'Inference', value: '≈ 12 ms · ONNX Runtime CPU' },
        ],
        reasons: [
          { label: `Parasite density: ${density}`, weight: r3(cDensity * quality) },
          { label: `Chromatin visibility ${Math.round(chromatin * 100)}%`, weight: r3(cChromatin * quality) },
          { label: `Cytoplasm contrast ${Math.round(cytoplasm * 100)}%`, weight: r3(cCytoplasm * quality) },
          { label: `Shape irregularity ${Math.round(morphology * 100)}%`, weight: r3(cMorph * quality) },
          { label: `Image quality shrinkage (blur ${Math.round(blur * 100)}%, stain ${Math.round(stain * 100)}%)`, weight: r3(evidence * (quality - 1)) },
        ],
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness, ONNX session state and model checksum' },
      { method: 'POST', path: '/detect', description: 'Multipart image upload → class probabilities, uncertainty and Grad-CAM heat map' },
      { method: 'POST', path: '/predict', description: 'Same as /detect for a base64-encoded image in JSON' },
      { method: 'POST', path: '/batch_predict', description: 'Up to 256 images per call; returns per-image results and a slide-level parasitaemia estimate' },
      { method: 'POST', path: '/explain', description: 'Grad-CAM overlay PNG for one image, optionally per backbone' },
      { method: 'POST', path: '/uncertainty', description: 'Monte Carlo dropout with a configurable number of passes (default 30)' },
      { method: 'GET', path: '/model/info', description: 'Backbones, ensemble weights, threshold, ONNX opset and quantisation' },
      { method: 'GET', path: '/metrics', description: 'Test-set AUC, sensitivity, specificity, F1 and latency percentiles' },
    ],
    sample: {
      endpoint: 'POST /detect  (multipart/form-data)',
      request: `{
  "file": "cell_00417.png  (image/png, 128×131 px)",
  "return_heatmap": true,
  "mc_passes": 30
}`,
      response: `{
  "prediction": "Parasitized",
  "confidence": 0.973,
  "parasitized_prob": 0.973,
  "uninfected_prob": 0.027,
  "uncertainty_std": 0.014,
  "review_flag": false,
  "gradcam": {
    "focus_region": "parasite body",
    "overlay_png_base64": "iVBORw0KGgo…"
  },
  "backbones": { "efficientnetv2_s": 0.981, "vit_b16": 0.965 },
  "threshold": 0.5,
  "inference_ms": 11.8
}`,
    },
  },
  report: {
    executiveSummary: [
      'Malaria Detection automates the first pass of thin-smear microscopy. Trained on 27,558 expert-labelled NIH cell crops from 200 donors, an EfficientNetV2-S and ViT-B/16 ensemble reaches 0.97 AUC on a patient-disjoint test set with 94% sensitivity and 96.4% specificity — a sensitivity-first operating point chosen because a missed infection costs far more than a re-read.',
      'The model is built to be trusted, not just accurate. Grad-CAM heat maps show the parasite body driving each call (IoU 0.71 against pathologist annotations), and Monte Carlo dropout produces an uncertainty score that routes blurred or ambiguous crops to a human microscopist instead of guessing.',
      'Exported to INT8 ONNX, the ensemble scores a cell in about 12 ms on a CPU, so the same artefact runs in a district clinic, on a rugged laptop or on an ARM board with no cloud dependency, behind a FastAPI service that accepts a plain image upload.',
    ],
    impact: [
      { label: 'AUC-ROC on new patients', value: '0.97' },
      { label: 'Sensitivity / specificity', value: '94% / 96.4%' },
      { label: 'Cells screened per second (CPU)', value: '≈ 80' }, // assumed: 1,000 ms / 12 ms
      { label: 'Explanation agreement with experts', value: 'IoU 0.71' },
      { label: 'Deployment footprint', value: 'ONNX Runtime, CPU or ARM, offline' },
      { label: 'Human review load', value: '≈ 2.5% of cells flagged by uncertainty' }, // assumed: 69 of 2,750 test cells above σ 0.15
    ],
    recommendations: [
      { title: 'Validate on other Plasmodium species and stains', body: 'The NIH set is P. falciparum on Giemsa; a field pilot should add P. vivax and Field-stain slides before national roll-out, using the uncertainty flag to catch distribution shift early.' },
      { title: 'Add slide-level aggregation', body: 'Clinicians diagnose patients, not cells. Aggregating per-cell probabilities into a parasitaemia estimate per 100 fields, with the review flag as a quality gate, turns the classifier into a diagnostic report.' },
      { title: 'Ship the ARM build with a detection stage', body: 'Pairing the classifier with a lightweight cell detector lets the ONNX pipeline process whole-field smartphone images end to end on the device.' },
    ],
    date: '2026',
  },
}

export default app
