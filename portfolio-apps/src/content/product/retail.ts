import {
  AlertIcon, BellIcon, ChecklistIcon, ClockIcon, CpuIcon, DatabaseIcon, DeviceCameraVideoIcon,
  EyeIcon, FilterIcon, FlameIcon, GraphIcon, ImageIcon, LockIcon, MeterIcon, NumberIcon,
  PackageIcon, PeopleIcon, PlugIcon, SearchIcon, ShieldCheckIcon, SparkleIcon,
  StopwatchIcon, TagIcon, WorkflowIcon,
} from '@primer/octicons-react'
import type { Product } from '../product'

const product: Product = {
  name: 'Facingly',
  tagline: 'On-shelf availability from the cameras a store already owns',
  positioning:
    "Facingly turns installed store cameras into a continuous on-shelf availability feed: it detects voids, misplaced items and facing counts on an edge device, prices every gap in lost sales, and routes a ranked restock task to the nearest associate in under two seconds. It is sold per camera per month with no robot, no scan window and no capital purchase, so a single aisle can be piloted in a week rather than a quarter. Unlike the closed image-recognition catalogues that dominate the category, new SKUs and new fixture types are added as a text prompt against an open-vocabulary model, not as a vendor annotation ticket.",
  category: 'Shelf intelligence and on-shelf availability platform',
  market: {
    size:
      'The computer vision for retail market was valued at $4.23bn in 2025 and $5.24bn in 2026, forecast to reach $12.19bn by 2030 (The Business Research Company, January 2026). The loss it addresses is far larger: IHL Group measures global inventory distortion at $1.77tn, of which out-of-stocks account for $1.2tn and overstocks $562bn.',
    growth:
      'The category is compounding at roughly 23.5% a year to 2030, driven by falling camera hardware costs, rising store labour costs and the shift of model inference onto edge devices. Penetration is the striking number: an ECR Retail Loss study cited in the 2026 Pygmalios shelf-availability report found only 7% of retailers use video analytics for shelf monitoring at all.',
    whyNow:
      "Three things changed in the eighteen months to September 2026. Detection got cheap enough for existing hardware: Ultralytics YOLO26, released January 2026, reaches 40.9 mAP@50-95 on COCO with 2.4M parameters at 1.7 ms on a T4 and native NMS-free inference, and reports up to 43% faster CPU ONNX inference than YOLO11 - meaning a store server can now cover a full aisle bank without a GPU per camera. Detection also stopped being closed: Grounding DINO 1.5 Edge runs prompted zero-shot detection at 75.2 FPS under TensorRT, and Meta's SAM 3 (November 2025) segments any concept named in a noun phrase, so the annotation cost that made shelf vision a services business is collapsing. And the buying intent is measurable - IHL Group and Scandit found sales-winning retailers are 94% more likely than laggards to plan shelf-intelligence investment within twelve months, committing 208% more investment overall.",
  },
  personas: [
    {
      title: 'VP Store Operations, national grocery or mass-merchant chain',
      segment: 'Chains of 150-2,500 stores, 15,000-80,000 SKUs per store, existing IP camera estate',
      jobToBeDone:
        "Know which shelves are empty right now, across every store, without adding a headcount per store or waiting for the weekly audit. Turn that into a task an associate can close before the shopper walks out.",
      statusQuo:
        'Manual aisle walks on a fixed cadence, a handheld gap-scan app that associates skip when the store is busy, and a weekly exception report from the replenishment system that lists phantom inventory after the sales have already been lost.',
      successMetric: 'On-shelf availability percentage and same-day gap closure rate; world-class performers run 96-97% OSA against an 8.3% global out-of-stock rate.',
    },
    {
      title: 'Head of Replenishment, regional supermarket group',
      segment: 'Grocery and convenience groups of 40-400 stores with a central forecasting and ordering system',
      jobToBeDone:
        'Separate a genuine supply gap from a failure to move stock from the back room to the shelf, so ordering models stop reacting to a shelf problem as if it were a demand signal.',
      statusQuo:
        'Perpetual inventory numbers from the ERP that say the store has stock while the shelf is empty, plus a replenishment engine that has no view of the shelf at all and therefore cannot tell a distribution issue from a labour issue.',
      successMetric: 'Forecast accuracy and phantom-inventory rate; secondary metric is replenishment labour hours per store per week.',
    },
    {
      title: 'Category Manager, CPG supplier field organisation',
      segment: 'Branded manufacturers running perfect-store programmes across grocery, convenience and pharmacy accounts',
      jobToBeDone:
        'Prove share of shelf, facing counts and promotional compliance in accounts continuously rather than through a rep photograph taken once a cycle, and get paid the trade funds that depend on that evidence.',
      statusQuo:
        'Field reps photographing shelves on a mobile app, image recognition run in a vendor cloud, and results that arrive days later covering only the stores a rep physically reached that period.',
      successMetric: 'Share of shelf and planogram compliance by account, and the share of promotional spend with verified execution.',
    },
  ],
  pains: [
    {
      title: 'The gap is found on a schedule, not when it opens',
      body:
        'Audit cadence determines detection latency. A manual aisle walk takes 15-30 minutes and happens once or twice a shift; a shelf-scanning robot typically completes up to three passes a day, and a large supermarket needs 1.5-2 hours for a single pass. Anything that empties after a pass stays empty until the next one, which is precisely when a promotion or a weekend peak does the damage.',
      cost: 'The 8.3% worldwide out-of-stock rate means roughly 8 of every 100 items a shopper looks for are not on the shelf',
      icon: ClockIcon,
    },
    {
      title: 'Out-of-stocks are a trillion-dollar loss with 7% instrumentation',
      body:
        'IHL Group puts out-of-stocks at $1.2tn of a $1.77tn global inventory distortion problem, yet an ECR Retail Loss study cited in the 2026 Pygmalios report found only 7% of retailers use video analytics for shelf monitoring. The measurement gap, not the awareness gap, is what keeps the loss in place.',
      cost: '$1.2tn in global out-of-stock losses against 7% video-analytics penetration',
      icon: AlertIcon,
    },
    {
      title: 'Robots need capital, floor space and a scan window',
      body:
        'Robot-as-a-service removes the upfront purchase but not the constraints: one unit covers a store, scanning is a physical route through the aisles, and coverage is limited to what the robot can drive past when the floor is clear. A third-party 2026 review of Tally 3.0 models the unit at a $50,000 purchase price with a six-month payback and notes that Simbe publishes no list price at all, so evaluation starts with a sales cycle rather than a trial.',
      cost: 'Modelled $50,000 per unit and a store-by-store rollout before the first measurement',
      icon: PackageIcon,
    },
    {
      title: 'A new SKU means a vendor ticket, not a config change',
      body:
        'Closed image-recognition catalogues have to learn each product. Vendors quote turnaround in days for new SKUs, POSM and point-of-purchase material, and accuracy targets are stated as milestones reached weeks after project setup. Every category reset, seasonal range and promotional fixture re-opens that queue, and the retailer waits.',
      cost: 'Typical vendor onboarding for new SKUs is quoted in 48-hour cycles and 2-week accuracy ramps',
      icon: TagIcon,
    },
    {
      title: 'Streaming store video to a cloud is a privacy and bandwidth liability',
      body:
        'EDPB Guidelines 3/2019 require a documented lawful basis and a legitimate-interest balancing test for video devices, and treat any biometric template derived from that video as special-category data. Shipping raw frames off-site widens the assessment, the retention obligation and the breach surface at the same time - and multiplies WAN cost by camera count.',
      cost: 'A DPIA and a retention schedule per store, plus continuous uplink for every camera',
      icon: LockIcon,
    },
    {
      title: 'Alerts arrive unpriced, so the queue is worked in the wrong order',
      body:
        'Most shelf systems emit a flat list of gaps. An associate with 40 minutes and 300 alerts has no basis for choosing, so the queue is worked by aisle order or not at all. Without a revenue figure attached to each void, high-velocity end-cap gaps sit behind slow-moving tail SKUs.',
      cost: 'Labour is spent on the cheapest gaps first',
      icon: FilterIcon,
    },
  ],
  wedge: {
    title: 'The cameras are already there, the vocabulary is a prompt, and the frames never leave the store',
    body:
      "Facingly wins on three decisions competitors have made differently. It uses the retailer's existing IP cameras instead of a robot or a purpose-built fixture, so the unit of purchase is a camera subscription rather than a capital project and a pilot is one aisle, not one store. It pairs a fine-tuned closed detector with an open-vocabulary second stage, so a new SKU, fixture or facing type is a text prompt evaluated the same afternoon rather than a vendor annotation cycle. And it runs the whole detection and tracking loop on an edge appliance in the store - a 6.2 MB ONNX graph, under 45 ms per frame on a Jetson Orin - so frames are analysed and discarded, tracking identities stay geometric and session-scoped, and no biometric template is ever created. That last decision is what makes the legitimate-interest argument under EDPB Guidelines 3/2019 straightforward, and it keeps the system outside the EU AI Act Article 5 prohibitions and the Illinois BIPA consent regime by design rather than by exemption.",
  },
  features: [
    {
      name: 'Continuous void detection on installed cameras',
      summary: 'Every shelf in view is checked on every frame, not once a shift.',
      detail:
        'A YOLO-family detector fine-tuned on 506 real annotated store images (augmented to 2,024) classifies shelf_void, product_facing and misplaced_item at mAP@50 0.841 and mAP@50-95 0.613 on held-out real footage. It reads RTSP from existing IP cameras, so coverage scales by adding streams rather than routes. The training set is deliberately real - angled security-camera views, mixed colour temperature and partial occlusion - because detectors fitted to studio product photography lose accuracy on exactly those conditions.',
      icon: DeviceCameraVideoIcon,
      tier: 'starter',
      image: '02_live_detection.webp',
    },
    {
      name: 'Zone occupancy and planogram grading',
      summary: 'Detected facings against expected facings, per shelving zone, graded A to D.',
      detail:
        'Zones are defined once as fractional image coordinates, so a camera move only requires re-drawing rather than re-training. Each detection is assigned to a zone and occupancy is computed as detected facings over expected facings, with a 60% restock line, a 30% empty-shelf flag and an 80% planogram compliance target. The compliance score is emitted per zone and per store, with an A-D grade and a categorised deviation list rather than a single pass or fail.',
      icon: ChecklistIcon,
      tier: 'starter',
      image: '01_dashboard.webp',
    },
    {
      name: 'Revenue-ranked alert queue',
      summary: 'Every gap carries a dollar figure, so the queue sorts itself.',
      detail:
        'Each void is priced as duration x zone traffic x conversion rate x average transaction value, using the void-duration timer the tracker maintains and the zone traffic the same cameras measure. Alerts are then ordered by revenue at risk rather than by detection time or aisle number, and zone priority weights the result by traffic density. The same arithmetic rolls up to a per-store annualised recovery figure, which is what the operations review actually needs.',
      icon: NumberIcon,
      tier: 'starter',
      image: '03_oos_reduction.webp',
    },
    {
      name: 'Two-second task routing',
      summary: 'From detected gap to a task on the nearest associate device.',
      detail:
        'The alert path is deliberately short: detection on the edge appliance, rules evaluation in-process, and dispatch to the associate handheld or to a Slack or SMS channel, with an end-to-end budget under two seconds. Alerts carry type (EMPTY_SHELF, LONG_QUEUE, SHRINKAGE_RISK, ANOMALY), severity, zone and status, and close automatically when the next frames show occupancy back above the restock line - so the queue reflects the shelf, not the last button press.',
      icon: BellIcon,
      tier: 'starter',
      image: '04_reports.webp',
    },
    {
      name: 'Queue length and wait-time estimation',
      summary: 'Checkout pressure measured from the same feed as the shelf.',
      detail:
        'Person detections in the checkout zone are counted per frame and smoothed across tracks, then converted to an expected wait with an empirical model calibrated on observed service times (wait in minutes = 2.5 x queue length - 1.5). A LONG_QUEUE alert fires above five people. Because it reuses the shelf cameras and the shelf tracker, queue monitoring adds no hardware and no separate vendor.',
      icon: StopwatchIcon,
      tier: 'growth',
    },
    {
      name: 'Traffic, dwell and path heatmaps',
      summary: 'Where shoppers actually go, aggregated and anonymous.',
      detail:
        'Multi-object tracking produces per-zone dwell times, hourly traffic curves and a cumulative floor-plan heatmap. Identities are geometric and session-scoped: no face embeddings, no cross-visit re-identification and no demographic inference, which keeps the feature outside the EU AI Act Article 5(1)(g) biometric-categorisation prohibition rather than relying on an exemption. Output is aggregate counts and heat values, not tracks of individuals.',
      icon: FlameIcon,
      tier: 'growth',
      image: '03_analytics.webp',
    },
    {
      name: 'POS linkage',
      summary: 'Correlate shelf events with the sales that stopped.',
      detail:
        'Shelf-empty timestamps are joined to POS transaction series per SKU to produce a correlation coefficient, an impact lag and a restock priority score. This separates the two cases replenishment planners conflate: a shelf gap with a matching sales drop is a genuine availability loss, while a shelf gap with unchanged sales usually means a duplicate facing elsewhere. The scores feed automated reorder triggers where the retailer allows it.',
      icon: GraphIcon,
      tier: 'growth',
    },
    {
      name: 'Edge appliance with vendor-agnostic runtime',
      summary: 'A 6.2 MB ONNX graph on hardware in the stockroom.',
      detail:
        'The detector exports to ONNX at 6.2 MB and runs on ONNX Runtime across Jetson, CPU and GPU hosts, with TensorRT as an optional edge optimisation, at under 45 ms per frame on a Jetson Orin. Frames are processed in memory and discarded; only detections, counts and events leave the store. That removes continuous video uplink cost and narrows the data-protection assessment to metadata.',
      icon: CpuIcon,
      tier: 'starter',
    },
    {
      name: 'Model governance dashboard',
      summary: 'Per-class accuracy, latency by device and training curves for every release.',
      detail:
        'Each model release publishes per-class AP@50 and AP@50-95, a precision and recall table, inference speed by device class and the training loss curves for the run. Licence provenance for every model in the pipeline is recorded alongside the metrics, because the Ultralytics line ships under AGPL-3.0 and the alternatives do not. Retailers get a documented answer to "which model version made this decision" without a support ticket.',
      icon: MeterIcon,
      tier: 'growth',
      image: '01_model_performance.webp',
    },
    {
      name: 'Supplier compliance portal',
      summary: 'Continuous share-of-shelf evidence for the brands that fund the category.',
      detail:
        'The same detections that drive restock alerts produce facing counts, share of shelf, void frequency and promotional-display presence per brand and per store. Suppliers get a scoped, read-only view of their own categories with an export and an API, and the retailer controls what is shared. This turns a cost centre into a second revenue line without adding a single camera.',
      icon: PeopleIcon,
      tier: 'enterprise',
    },
    {
      name: 'Camera health and drift monitoring',
      summary: 'Catch the moved camera before it silently degrades the numbers.',
      detail:
        'Every stream is scored for blur, exposure shift, occlusion and framing change against its enrolment reference. A camera nudged by a pallet jack is the most common cause of a sudden compliance drop, and it presents as a data problem rather than a hardware problem. Drift in the detection distribution per zone is tracked over time and raises a maintenance task rather than a restock alert.',
      icon: EyeIcon,
      tier: 'growth',
    },
    {
      name: 'Open API and event stream',
      summary: 'Every detection, alert and score available as an endpoint or a webhook.',
      detail:
        'A REST surface exposes image and frame analysis, store analytics, the alert queue, compliance reports, lost-sales reports, POS linkage and planogram deviation, with zone configuration writable at runtime. Events are also pushed as webhooks so replenishment, workforce and BI systems consume the same stream the console does, with no polling and no CSV drop.',
      icon: PlugIcon,
      tier: 'growth',
    },
  ],
  aiFeatures: [
    {
      name: 'Prompted SKU onboarding',
      summary: 'Add a product or fixture type by describing it, not by labelling it.',
      detail:
        'An open-vocabulary detector runs as a second stage behind the fine-tuned head, taking classes as text prompts or image exemplars at inference time. Ultralytics YOLOE carries a 4,585-name built-in vocabulary and beats YOLO-Worldv2-S by 3.5 AP at a third of the training cost; Grounding DINO 1.5 Edge reaches 36.2 LVIS-minival zero-shot AP at 75.2 FPS under TensorRT for the higher-accuracy configuration. A category reset becomes a prompt list in a config file, evaluated the same day.',
      icon: SearchIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Concept-prompted auto-labelling',
      summary: 'Annotators verify machine proposals instead of drawing boxes.',
      detail:
        'Meta SAM 3, released 19 November 2025, performs promptable concept segmentation from a noun phrase or an image exemplar, reporting 65.0 CGF1 zero-shot on SA-Co and 47.0 LVIS zero-shot mask AP. Run offline over unlabelled store footage - its roughly 2,921 ms per image on GPU is irrelevant in a batch job - it proposes masks and boxes that human annotators accept or reject. This is the mechanism that takes a training set from hundreds of images toward the 11,743-image, 1.7M-box density of the public SKU-110K benchmark.',
      icon: SparkleIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'NMS-free edge detection',
      summary: 'The post-processing step removed from the latency budget entirely.',
      detail:
        'Ultralytics YOLO26, released January 2026, drops Distribution Focal Loss from the head and offers a one-to-one detection head that produces predictions without non-maximum suppression. YOLO26n reports 40.9 mAP@50-95 on COCO at 1.7 ms on a T4 with 2.4M parameters and 5.5 GFLOPs, against YOLOv8n at 37.3 mAP with 3.2M parameters, and up to 43% faster CPU ONNX inference than YOLO11n. Its small-target-aware label assignment targets the weakest class in shelf imagery: price tags and partially occluded facings.',
      icon: ImageIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Area-accurate facing measurement',
      summary: 'Occupancy as measured shelf area rather than a box count.',
      detail:
        'Box counting degrades where products are stacked, angled or pulled forward, and the error moves with camera angle. Segmentation masks give a pixel-accurate ratio of filled to expected shelf area, so the 60% restock line and 80% compliance target stop drifting between cameras. Segmentation runs on a slow cadence - roughly one frame in fifty - with the fast detector interpolating between passes, which keeps the per-frame budget intact.',
      icon: WorkflowIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'Non-biometric shopper tracking',
      summary: 'Dwell, queues and void duration without ever creating an identity.',
      detail:
        'Tracking uses geometric association only - an improved Kalman filter state, camera-motion compensation for pan-tilt-zoom drift, and IoU-based matching - in the BoT-SORT lineage that reports 80.5 MOTA, 80.2 IDF1 and 65.0 HOTA on MOT17. Camera-motion compensation matters in stores because vibration and PTZ movement break the constant-velocity assumption plain ByteTrack relies on. No face embedding is computed, no identifier persists past the session, and nothing is inferred about who the shopper is.',
      icon: ShieldCheckIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'Void-cost model with explainable inputs',
      summary: 'Every dollar figure decomposes into the five measurements behind it.',
      detail:
        'Lost sales for an event are duration x zone traffic x conversion x average transaction value, weighted by the fraction of the facing that is empty and by a zone velocity multiplier. Each of those inputs is either measured by the vision pipeline (duration, traffic, occupancy) or supplied by the retailer (conversion, basket, velocity), and the console shows the contribution of each term. Modelled figures are labelled as modelled, so operations reviews argue about the inputs rather than about the output.',
      icon: DatabaseIcon,
      ai: true,
      tier: 'growth',
    },
  ],
  competitors: [
    {
      name: 'Trax',
      url: 'https://traxretail.com/',
      strength:
        'The established image-recognition platform for CPG shelf measurement, with retail intelligence covering on-shelf availability, share of shelf, pricing and compliance, field execution tooling, and named brand customers including Anheuser-Busch InBev, Unilever, Heineken and Sanofi.',
      gap:
        'Built around the brand-side perfect-store programme and a rep-photograph or third-party-capture workflow, not around continuous coverage of a retailer\'s own camera estate. Measurement cadence is the visit cadence, and the SKU catalogue is a vendor-managed asset the retailer does not control.',
      pricing: 'No public pricing; the site directs all enquiries to a contact form.',
    },
    {
      name: 'Focal Systems',
      url: 'https://focal.systems/',
      strength:
        'Purpose-built shelf cameras with hourly coverage - "every product on every shelf, every hour of every day" - a model trained on over 2 billion images, and prioritised picklists that feed store workflow directly. Published time-and-motion studies claim a 2.5x improvement in stocker efficiency, and one customer states on-shelf availability of almost 99%.',
      gap:
        'The camera is proprietary hardware installed on the shelf edge, so the deployment is a fixture-fitting project across every aisle before the first number arrives, and coverage is bounded by what has been installed. The SKU taxonomy is closed and no pricing is published.',
      pricing: 'No public pricing; hardware plus subscription quoted per store.',
    },
    {
      name: 'Simbe Robotics',
      url: 'https://www.simberobotics.com/',
      strength:
        'Tally is the most mature shelf-scanning robot: Robot-as-a-Service with zero upfront cost, a monthly fee scaled by store size, SKU count and whether computer vision, RFID or both are used, and one unit covering stores up to 80,000 SKUs at 15,000-30,000 products scanned per hour.',
      gap:
        'Scanning is a physical route. Simbe documents up to three scans a day in a supermarket, with 1.5-2 hours per pass in a large store, so anything that empties between passes stays empty. The robot needs clear aisles, floor space and charging, and it cannot cover checkouts, end-caps and queues at the same time.',
      pricing: 'Robot-as-a-Service monthly fee, zero upfront cost, price on request; a third-party 2026 review models the unit at a $50,000 purchase price with a six-month payback.',
    },
    {
      name: 'Pensa Systems',
      url: 'https://www.pensasystems.com/',
      strength:
        'Vision AI that reconstructs shelf layouts and automatically generates planograms, with promotion auditing, comparative store-execution analysis and new-product distribution verification aimed at CPG brands and their retail accounts.',
      gap:
        'Positioned as periodic shelf intelligence for brand teams rather than a real-time operations feed for store associates. The public site publishes no accuracy figures, no hardware specification and no pricing, so a retailer cannot size the deployment before entering a sales cycle.',
      pricing: 'No public pricing.',
    },
    {
      name: 'Standard AI',
      url: 'https://standard.ai/',
      strength:
        'VISION runs on a retailer\'s existing cameras with an explicit privacy position - edge-based deployment and no facial recognition - measuring shopper awareness, engagement and conversion, movement patterns and staff interaction for layout and retail-media decisions.',
      gap:
        'The 2026 product is shopper-behaviour analytics, with no shelf-void detection, occupancy grading, planogram scoring or replenishment task routing. It answers what shoppers did in front of the shelf, not whether the shelf had anything on it.',
      pricing: 'No public pricing.',
    },
    {
      name: 'ParallelDots ShelfWatch',
      url: 'https://www.paralleldots.com/shelfwatch',
      strength:
        'Broad KPI coverage - planogram compliance, share of shelf, POSM and price-tag compliance, on-shelf availability, end-cap and gondola checks - with on-device image-quality assistance, an offline mode and a claimed 95% consistency on occluded or rotated SKUs, processing over 5 million images a month across 200,000+ general-trade outlets.',
      gap:
        'A mobile-capture workflow with cloud processing: someone has to take the photograph, and recognition runs off-site. Accuracy is quoted as 90%+ reached within two weeks of project setup and new SKUs onboarded through a 48-hour portal cycle, so the catalogue is still a vendor dependency and the cadence is still the visit.',
      pricing: 'No public pricing.',
    },
  ],
  pricing: [
    {
      id: 'starter',
      name: 'Aisle',
      monthly: 49,
      annual: 39,
      tagline: 'One store, one edge appliance, live in a week.',
      meter: 'per camera per month, minimum 6 cameras at one site',
      features: [
        'Void, facing and misplaced-item detection on existing RTSP cameras',
        'Zone occupancy with the 60% restock line and 30% empty-shelf flag',
        'Planogram compliance score and A-D grade per zone',
        'Revenue-ranked alert queue with the void-cost model',
        'Alert routing to email, SMS and Slack under a two-second budget',
        'Edge appliance image (ONNX Runtime, Jetson or x86 with GPU)',
        'Non-biometric tracking, frames processed and discarded on device',
        '30-day event history and CSV export',
      ],
      cta: 'Start a one-aisle pilot',
    },
    {
      id: 'growth',
      name: 'Estate',
      monthly: 35,
      annual: 28,
      tagline: 'Multi-site rollout with prompted vocabulary and system integrations.',
      meter: 'per camera per month from 25 cameras, unlimited sites',
      features: [
        'Everything in Aisle, at a lower per-camera rate',
        'Prompted SKU and fixture onboarding via the open-vocabulary second stage',
        'Queue length and wait-time estimation, traffic and dwell heatmaps',
        'POS linkage: shelf-event to sales-drop correlation and lag per SKU',
        'Camera health and detection-drift monitoring',
        'Replenishment and workforce integrations (RELEX, Blue Yonder, Manhattan, Zebra)',
        'Warehouse sync to Snowflake or Databricks',
        'Model governance dashboard with per-class AP and licence provenance',
        '13-month history, REST API and webhooks',
      ],
      cta: 'Roll out across the estate',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Chain',
      monthly: null,
      annual: null,
      tagline: 'Volume-tiered site licence with supplier monetisation and private deployment.',
      meter: 'per-site licence, volume-tiered from 100 sites; appliances and installation quoted separately',
      features: [
        'Everything in Estate, priced per site rather than per camera',
        'Supplier compliance portal with scoped read-only brand access and API',
        'Concept-prompted auto-labelling pipeline on the retailer\'s own footage',
        'Area-accurate facing measurement via segmentation masks',
        'Custom detection classes trained on the chain\'s fixtures and formats',
        'Private VPC or fully on-premise control plane',
        'SSO, SCIM, audit log export and regional data residency',
        'DPIA support pack, retention schedule templates and named CSM',
      ],
      cta: 'Talk to us',
    },
  ],
  integrations: [
    { name: 'RELEX Solutions', kind: 'Replenishment and space planning', domain: 'relexsolutions.com' },
    { name: 'Blue Yonder', kind: 'Supply chain planning and category management', domain: 'blueyonder.com' },
    { name: 'Manhattan Associates', kind: 'Store inventory and order management', domain: 'manh.com' },
    { name: 'Zebra Workcloud', kind: 'Associate devices and inventory optimisation', domain: 'zebra.com' },
    { name: 'Snowflake', kind: 'Data warehouse', domain: 'snowflake.com' },
    { name: 'Databricks', kind: 'Lakehouse and model training', domain: 'databricks.com' },
    { name: 'Slack', kind: 'Alert routing and workflows', domain: 'slack.com' },
    { name: 'Twilio', kind: 'SMS and WhatsApp task notifications', domain: 'twilio.com' },
    { name: 'Roboflow', kind: 'Annotation and dataset management', domain: 'roboflow.com' },
    { name: 'Hugging Face', kind: 'Model registry and ONNX distribution', domain: 'huggingface.co' },
  ],
  proof: [
    {
      claim: 'mAP@50 of 0.841 and mAP@50-95 of 0.613 for shelf void, facing and misplaced-item detection',
      evidence:
        'Measured on a held-out test split of real in-store photography - 506 hand-annotated images augmented to 2,024, split 70/20/10 at 640 x 640 - rather than on studio product imagery. Precision 0.79 and recall 0.71 across classes, with the best checkpoint at epoch 47 of a 50-epoch fine-tune.',
    },
    {
      claim: 'Under 45 ms per frame on a Jetson Orin from a 6.2 MB ONNX graph',
      evidence:
        'The detector exports to ONNX and runs on ONNX Runtime across Jetson, CPU and GPU hosts, with TensorRT available as an edge optimisation. The measured per-frame time leaves headroom inside the under-two-second detection-to-notification budget on commodity edge hardware.',
    },
    {
      claim: 'Shopper tracking at IDF1 0.74 with no biometric data created',
      evidence:
        'ByteTrack-style geometric association maintains identities for void-duration timing, dwell measurement and queue estimation. No face embedding is computed and no identifier survives the session, which is what keeps the deployment clear of EU AI Act Article 5 biometric categorisation and the Illinois BIPA consent regime.',
    },
    {
      claim: 'A 34% reduction in out-of-stock events per store after deployment',
      evidence:
        'Observed in pilot stores as weekly out-of-stock events fell from roughly 120 to roughly 80 once alert routing was switched on. This is a pilot result on a small store sample, not a chain-wide audited figure.',
    },
    {
      claim: 'An estimated $180,000 per store per year of recovered sales',
      evidence:
        'A modelled figure, not a measurement: void duration x zone traffic x conversion rate x average transaction value, summed across events and annualised. Every input is either measured by the vision pipeline or supplied by the retailer, and the console decomposes each term so the assumptions can be challenged directly.',
    },
    {
      claim: 'The public benchmark position is stated, not hidden',
      evidence:
        'The training set is 506 images against SKU-110K\'s 11,743 images and 1.7M boxes at roughly 147 objects per image, and no SKU-110K result has been published yet. That benchmark run is a committed roadmap item rather than an omission.',
    },
  ],
  outcomes: [
    { label: 'Out-of-stock events', value: '-34%', caption: 'Per store after deployment, pilot measurement' },
    { label: 'Recovered sales', value: '$180k / store / yr', caption: 'Modelled from duration x traffic x conversion x basket' },
    { label: 'Detection to task', value: 'Under 2 s', caption: 'Edge detection, rules evaluation and dispatch' },
    { label: 'Void detection accuracy', value: 'mAP@50 0.841', caption: 'Real held-out store imagery' },
    { label: 'Per-frame inference', value: 'Under 45 ms', caption: '6.2 MB ONNX graph on a Jetson Orin' },
    { label: 'Coverage cadence', value: 'Every frame', caption: 'Against up to three robot passes a day' },
  ],
  faq: [
    {
      q: 'Do we have to install new cameras?',
      a: 'Not usually. Facingly reads RTSP from the IP cameras already covering the aisle, and an enrolment pass scores each stream for framing, exposure and occlusion so gaps in coverage are identified before the contract, not after. Where an aisle genuinely has no usable view, adding a single camera is far cheaper than fitting shelf-edge hardware down every gondola or introducing a robot. The edge appliance is one box per store, not one per camera.',
    },
    {
      q: 'How is this different from a shelf-scanning robot?',
      a: 'Cadence and capital. Simbe documents Tally at up to three scans a day in a supermarket, with 1.5-2 hours for a single pass in a large store, and sells it as Robot-as-a-Service with a monthly fee and price on request. A fixed camera sees the shelf on every frame, covers checkouts and end-caps at the same time, and is bought per camera per month with no floor space, charging dock or clear-aisle requirement. The trade-off is honest: a robot gets closer to the shelf and reads price labels a ceiling camera cannot, which is why Facingly grades occupancy and voids rather than claiming per-label price audit.',
    },
    {
      q: 'What happens when we add a new SKU or reset a category?',
      a: "Nothing, in the normal case. The fine-tuned head detects voids, facings and misplaced items - categories that do not change when the products do. Where a new fixture or facing type genuinely needs recognising, the open-vocabulary second stage takes it as a text prompt or an image exemplar at inference time, using models in the YOLOE and Grounding DINO 1.5 line, so it is a configuration change evaluated the same day. Competitors that recognise each individual SKU have to onboard it: published vendor cycles run to 48 hours per new item and two weeks to reach target accuracy.",
    },
    {
      q: 'Does this track individual shoppers, and is that legal in the EU?',
      a: 'It tracks anonymous geometry, not people. Association is Kalman-filter and IoU based with camera-motion compensation; no face embedding is computed, no identifier persists past the session and nothing is inferred about demographics or emotion. EU AI Act Article 5(1)(g) prohibits biometric categorisation that infers protected characteristics and 5(1)(f) prohibits emotion inference in the workplace - Facingly stays outside both by construction. Under EDPB Guidelines 3/2019 the deployment still needs a documented lawful basis, a legitimate-interest balancing test and visible signage, and the enterprise plan ships a DPIA support pack and retention templates for that.',
    },
    {
      q: 'What about Illinois BIPA and US state biometric law?',
      a: 'BIPA carries liquidated damages of $1,000 to $5,000 per violation. The August 2024 amendment replaced per-scan with per-person accrual and the Seventh Circuit held in April 2026 that the limitation applies retroactively, so exposure is smaller than it was - but the notice, written consent and retention-schedule obligations are unchanged for anyone who collects a biometric identifier. Facingly does not collect one: body-only detection with no facial landmarks and no persistent identifier means the statute does not attach, which is a stronger position than complying with it.',
    },
    {
      q: 'Where does the $180,000 per store figure come from?',
      a: 'It is modelled, and labelled as modelled everywhere it appears. Each void event is priced as duration x zone traffic x conversion rate x average transaction value, weighted by the empty fraction of the facing and a zone velocity multiplier, then summed and annualised. Duration, traffic and occupancy are measured by the pipeline; conversion, basket value and velocity come from the retailer\'s own data. The console shows the contribution of each term so the number can be argued with rather than accepted. For context on the scale of the problem, IHL Group puts global out-of-stock losses at $1.2tn of a $1.77tn inventory-distortion total.',
    },
    {
      q: 'How accurate is it really, and what is it bad at?',
      a: 'On real held-out store imagery the detector reports mAP@50 0.841, mAP@50-95 0.613, precision 0.79 and recall 0.71. The weakest class is small, low-contrast objects such as price tags, at 0.489 AP@50-95, which is why the product grades occupancy and voids rather than auditing individual price labels. The training set is 506 real images against SKU-110K\'s 11,743, and no public-benchmark result has been published yet - that run is on the roadmap for Q4 2026 rather than quietly omitted.',
    },
  ],
  trust: [
    {
      name: 'SOC 2 Type II',
      body:
        'Controls covering security, availability and confidentiality are audited annually, with the report available under NDA and a summarised control matrix supplied during procurement. Sub-processors are listed publicly and changes are notified 30 days in advance. Penetration testing is performed annually against the control plane and the edge appliance image, with the executive summary shared on request.',
    },
    {
      name: 'Data residency and edge-first processing',
      body:
        'Video frames are analysed on the in-store appliance and discarded; only detections, counts, scores and events are transmitted. The control plane can be pinned to an EU, UK or US region, and on the Chain plan it can run in the retailer\'s own VPC or fully on-premise. Because raw footage never leaves the store, the data-protection assessment covers metadata rather than a continuous video archive.',
    },
    {
      name: 'Non-biometric by design',
      body:
        'No facial landmarks, no face embeddings, no re-identification across visits and no demographic, gender or emotion inference are computed at any point. Tracking identities are geometric and expire with the session. This is enforced in the pipeline rather than in policy: the deployed graph contains no face model, so the capability is absent rather than disabled.',
    },
    {
      name: 'GDPR and EDPB Guidelines 3/2019',
      body:
        'Deployments follow the EDPB video-device guidelines adopted 30 January 2020: a documented lawful basis before installation, a legitimate-interest balancing test against shopper expectations, visible signage at entry points naming the controller and purposes, and strict data minimisation. Facingly supplies a DPIA template, a signage pack, a retention and destruction schedule and a records-of-processing entry as part of onboarding, and acts as processor under a standard DPA.',
    },
    {
      name: 'EU AI Act posture',
      body:
        'Article 5 prohibitions have applied since 2 February 2025, the bulk of the Act from 2 August 2026 and the remaining high-risk obligations from 2 August 2027. Facingly is designed to sit outside the prohibited categories entirely - no biometric categorisation under 5(1)(g), no emotion inference under 5(1)(f) - and a written classification assessment for the deployed configuration is provided to every EU customer, refreshed on each material model change.',
    },
    {
      name: 'Model governance and licence provenance',
      body:
        'Every model release is versioned with per-class AP@50 and AP@50-95, precision and recall, latency by device class and the training curves for the run. The training data lineage, the augmentation recipe and the licence of every component model are recorded in the same release note - the Ultralytics line ships under AGPL-3.0 while RF-DETR is Apache-2.0, and a customer is told exactly which is running. Model changes are announced before rollout with the accuracy delta attached.',
    },
    {
      name: 'Retail operations safeguards',
      body:
        'Alerts are advisory: no automated ordering, markdown or labour action is triggered without an explicit retailer opt-in per workflow, and every automated action is logged with the model version and the detections that produced it. Shrinkage-risk scoring is a zone-level behavioural flag with no identity attached and no watchlist, and it is off by default. Any workflow that touches store staff performance requires a documented sign-off before it can be enabled.',
    },
  ],
  roadmap: [
    {
      quarter: 'Q4 2026',
      title: 'YOLO26 backbone and a published SKU-110K number',
      body:
        'Retrain the detector on YOLO26n with the one-to-one end-to-end head, removing NMS from the exported ONNX graph, and re-measure mAP and per-frame latency against the current 0.841 and 45 ms as the regression gate. In parallel, train and evaluate on SKU-110K - 2,936 test images at roughly 147 objects each - so the product carries an external benchmark figure alongside the in-domain one, and the dense-scene detection cap is stress-tested where it actually breaks.',
    },
    {
      quarter: 'Q1 2027',
      title: 'Open-vocabulary second stage in general availability',
      body:
        'Ship prompted SKU and fixture onboarding on the Estate plan: a YOLOE or Grounding DINO 1.5 Edge stage running behind the fine-tuned head on low-confidence regions and unseen fixtures, with prompts managed per store in the console and versioned like code. The measured goal is that a category reset requires no annotation work and no model release, taking new-fixture recognition from a multi-week vendor cycle to a same-day configuration change.',
    },
    {
      quarter: 'Q2 2027',
      title: 'Segmentation-grade occupancy and the auto-labelling pipeline',
      body:
        'Replace box-count occupancy with area-accurate segmentation masks on a one-in-fifty frame cadence, so the 60% restock line and 80% compliance target hold across camera angles. Open the SAM 3 concept-prompted auto-labelling pipeline to Chain customers on their own footage, with a hand-labelled holdout that auto-labels never touch, targeting an order-of-magnitude increase in per-customer training data without an order-of-magnitude increase in annotation cost.',
    },
    {
      quarter: 'Q3 2027',
      title: 'Supplier monetisation and tracker upgrade',
      body:
        'General availability of the supplier compliance portal: scoped, read-only share-of-shelf, facing-count and promotional-execution evidence sold to brands by the retailer, with the retailer controlling scope and revenue share. Alongside it, move tracking to the BoT-SORT lineage with camera-motion compensation to close the gap between the current IDF1 of 0.74 and the 80.2 reported on MOT17, which propagates directly into void-duration accuracy and therefore into every priced alert.',
    },
  ],
}

export default product
