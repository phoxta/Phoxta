import {
  AccessibilityIcon, AlertIcon, ArchiveIcon, BeakerIcon, CheckCircleIcon, ChecklistIcon,
  CpuIcon, DeviceCameraVideoIcon, EyeClosedIcon, GitCompareIcon, GlobeIcon, GraphIcon,
  LawIcon, LightBulbIcon, LocationIcon, MeterIcon, PersonIcon, PulseIcon, ReportIcon,
  StackIcon, SyncIcon, TelescopeIcon,
} from '@primer/octicons-react'
import type { Product } from '../product'

/**
 * Commercial layer for P08 — Workplace Ergonomics AI.
 * Competitor claims, prices and market figures are quoted from vendor and
 * regulator pages opened in September 2026; modelled numbers are labelled as such.
 */
const product: Product = {
  name: 'Plumbline',
  tagline: 'Ergonomic risk scored continuously, and honest about when it cannot be',
  positioning:
    'Plumbline turns the cameras already installed in a warehouse or on an assembly line into a continuous REBA and RULA instrument, so ergonomic assessment stops being a quarterly clipboard exercise covering a handful of jobs. It is built for the failure mode every published validation of camera-based ergonomics has found: single-camera pose estimation is reliable in the sagittal plane and unreliable when a worker stands oblique to the lens or a limb is occluded, so Plumbline gates every score on view geometry and per-joint confidence and reports coverage alongside risk. Unlike the safety-event platforms it competes with, it produces a standards-based score an ergonomist can defend, and publishes its measured agreement with certified human raters for each deployment.',
  category: 'Industrial ergonomics and MSD risk intelligence',

  market: {
    size:
      'The 2025 Liberty Mutual Workplace Safety Index puts the cost of serious workplace injuries at 58.78 billion dollars a year, with overexertion involving outside sources the single largest cause at 13.7 billion dollars, largely from manual material handling, ahead of falls on the same level at 10.5 billion. The index is built on data three years prior to publication. On the frequency side, BLS reported 492,140 days-away-from-work cases in private industry in the overexertion, repetitive motion and bodily conditions group, a rate of 23.2 per 10,000 full-time workers and a median of 14 days away, against 2.5 million total nonfatal injuries and illnesses in 2024. Globally the WHO fact sheet counts approximately 1.71 billion people with musculoskeletal conditions, 149 million years lived with disability or 17% of the world total, with low back pain the leading cause of disability in 160 countries and the main reason for premature exit from the workforce.',
    growth:
      'Nobody in this category publishes a price, which is itself the clearest signal of where it sits in its life cycle: every vendor checked, including TuMeke, VelocityEHS, Cority, Voxel, Intenseye and Protex AI, routes buyers to a sales conversation, and soteranalytics.com now redirects to soter.com whose pricing page lists plan names with no figures. The suites are absorbing the capability rather than competing on it: VelocityEHS advertises AI 3D Motion Capture with "60% Faster Assessments", "3X+ Average ROI within 12 months" and "75% Fewer MSD Injuries After Adoption", Cority now lists Industrial Ergonomics with AI Motion Capture next to its occupational-health modules, and kineticalabs.com resolves to ehs.com/kineticalabs. Independent best-of-breed options are getting scarcer, not more numerous.',
    whyNow:
      'Three things changed inside twelve months. Ultralytics shipped YOLO26-pose, whose nano variant runs at 40.3 ms per image on CPU ONNX against 131.8 ms for the YOLOv8n-pose generation, which moves continuous multi-camera scoring from a GPU budget to a commodity CPU budget. Verified browser-runnable exports appeared, with Xenova/yolov8n-pose down to a 3.76 MB uint8 file, so a prospect can run a real assessment in a tab without a single frame leaving their laptop. And the evaluation bar finally became concrete: a 2026 study reported Cohen kappa 0.710 and ICC(A,1) 0.886 against expert REBA raters, giving buyers a number to demand and vendors a number to beat. Meanwhile the EU AI Act made the compliance posture a purchasing criterion rather than a legal afterthought.',
  },

  personas: [
    {
      title: 'EHS Director, multi-site distribution network',
      segment: 'Warehousing, third-party logistics and parcel, 8 to 40 sites, 3,000 to 30,000 employees',
      jobToBeDone:
        'Find the jobs and shifts that are generating musculoskeletal claims across the whole network, before the claims arrive, and prove to a CFO that the abatement spend changed the number.',
      statusQuo:
        'An ergonomics consultant visits two or three sites a year and scores a dozen tasks per visit. Everything else is inferred from incident reports written after the injury. Overexertion is the largest line in the workers compensation bill and the least visible in the reporting.',
      successMetric: 'DART and TRIR rates, and workers compensation cost per 100 full-time equivalents.',
    },
    {
      title: 'Corporate Ergonomist',
      segment: 'Manufacturing and assembly, a central ergonomics function of one to six people covering 10 to 60 plants',
      jobToBeDone:
        'Score more jobs than one person physically can, defend every score against a union safety representative, and rank workstation redesigns by measured risk reduction per dollar rather than by who complained loudest.',
      statusQuo:
        'REBA and RULA worksheets filled in from video or on the floor. Scores drift between assessors and between visits, there is no before-and-after evidence once a lift-assist table is installed, and requests outrun capacity by an order of magnitude.',
      successMetric: 'Jobs assessed per quarter, and mean REBA reduction on jobs that received an intervention.',
    },
    {
      title: 'VP Operations, regional distribution',
      segment: 'Retail, grocery and e-commerce fulfilment, 500 to 5,000 associates per site',
      jobToBeDone:
        'Cut the absenteeism and overtime backfill that follows a back injury without adding headcount, slowing the line or triggering a works-council dispute over cameras.',
      statusQuo:
        'Injury data arrives as a lagging indicator once a quarter. Process changes are justified on throughput and their ergonomic consequences are discovered afterwards, in the claim.',
      successMetric: 'Cost per unit shipped, unplanned absence hours, and overtime spent covering restricted-duty workers.',
    },
  ],

  pains: [
    {
      title: 'Assessment coverage is a rounding error',
      body:
        'A trained ergonomist scores a handful of tasks per site visit. The other several hundred jobs, and every job at 2am on the late shift when posture degrades most, are never observed at all. Risk is managed on a sample so small it carries no statistical information about the population that is actually getting hurt.',
      cost: '492,140 days-away-from-work cases in the overexertion group in 2024, median 14 days away each (BLS)',
      icon: TelescopeIcon,
    },
    {
      title: 'The scores do not agree, and nobody publishes how badly',
      body:
        'Manual REBA drifts between assessors. Automated REBA drifts further. The most careful published validation of a 2D single-camera pipeline in a real factory found exact REBA score agreement with expert raters of 34.78%, 60.00% and 22.73% across three production lines, and exact RULA agreement as low as 9.09%, while risk-level agreement held between 65% and 80%. Every vendor in this category advertises injury reductions; none advertises its agreement with a human ergonomist.',
      cost: '22.73% to 60.00% exact REBA agreement in the closest published factory validation (Scientific Reports, 2024)',
      icon: GitCompareIcon,
    },
    {
      title: 'No evidence that the intervention worked',
      body:
        'A lift-assist table goes in, the ergonomist signs it off, and the risk reduction is asserted rather than measured. When claims later fall, the credit is contested; when they do not, nobody can tell whether the control failed or the exposure moved elsewhere. Capital requests for the next site have nothing to stand on.',
      icon: BeakerIcon,
    },
    {
      title: 'Overexertion is the most expensive thing that happens in the building',
      body:
        'Manual material handling is the single largest cause of serious workplace injury cost in the United States, and it is generated by postures that repeat thousands of times per shift and are individually unremarkable. The cost is concentrated, predictable and almost entirely invisible to the systems currently watching the floor.',
      cost: '13.7 billion dollars a year for overexertion involving outside sources (Liberty Mutual Workplace Safety Index, 2025 edition)',
      icon: AlertIcon,
    },
    {
      title: 'Camera projects die in legal review',
      body:
        'Per-worker posture scoring reads directly onto EU AI Act Annex III point 4, which classes as high-risk any system used "to monitor and evaluate the performance and behaviour of persons" in a work relationship. Add GDPR Article 88 and its explicit reference to "monitoring systems at the work place", and in Germany, France, the Netherlands and the Nordics a works council can stop the rollout before the first camera is enabled. Most deployments stall here, not on accuracy.',
      icon: LawIcon,
    },
  ],

  wedge: {
    title: 'Sold on agreement with a human ergonomist, not on keypoint accuracy',
    body:
      'Every competitor markets outcome percentages and none publishes the one number a safety committee will actually interrogate: how often the system agrees with a certified rater. Plumbline inverts that. It ships a calibration workflow that builds an expert-rated set from the customer own footage, reports exact-score agreement, risk-level agreement, Cohen kappa and ICC per site, and gates scoring on view geometry so it declines to emit a number when the camera angle or occlusion makes one indefensible. Coverage is reported next to risk. The published bar to clear is kappa 0.710 on REBA and 0.755 on RULA; a system that cannot state its own figure has not earned the right to put a number in a compliance file.',
  },

  features: [
    {
      name: 'Continuous REBA and RULA',
      summary: 'Standards-based ergonomic scores on every worker in frame, on every shift, from cameras already installed.',
      detail:
        'A pose model returns 17 COCO keypoints per detected worker; vector geometry between joints yields neck, trunk, upper-arm, lower-arm and wrist angles; an exponential moving average suppresses single-frame jitter before the angles enter the REBA Group A and Group B tables with load and coupling adjustments. Output is a 1 to 15 REBA score and band with its prescribed action, plus a 1 to 7 RULA score for seated and upper-limb tasks.',
      icon: AccessibilityIcon,
      tier: 'starter',
    },
    {
      name: 'Confidence-gated scoring',
      summary: 'The system refuses to score a frame it cannot score defensibly, and says so.',
      detail:
        'Every frame passes three gates before it reaches the scoring tables: each joint required by the active instrument must clear a confidence floor, the torso normal must lie within a configured angle of the image plane, and no scored limb may be truncated by the frame edge. Rejected frames are counted, not silently dropped, so each zone carries a usable-frame percentage. A zone at 40% coverage is surfaced as a camera-placement defect rather than averaged into a heatmap that looks authoritative and is not.',
      icon: CheckCircleIcon,
      tier: 'starter',
    },
    {
      name: 'Rater calibration studio',
      summary: 'Build the expert-rated set, then publish the agreement figure for this site.',
      detail:
        'Samples several hundred frames stratified across zones, shifts, tasks and camera angles, routes each to two certified ergonomists for independent blind scoring, and adjudicates disagreements in a third pass. The resulting reference set produces exact-score agreement, risk-level agreement, Cohen kappa and ICC for that specific deployment, recomputed whenever a camera moves or a model version ships. The figure goes in the customer own compliance file.',
      icon: ChecklistIcon,
      tier: 'growth',
    },
    {
      name: 'Zone and shift risk heatmaps',
      summary: 'Mean risk by zone and hour, so abatement money goes where the exposure actually is.',
      detail:
        'Observations roll up by zone, task, shift and hour with usable-frame coverage attached to every cell, so a hot cell backed by 12,000 scored frames is visually distinguished from one backed by 200. Ranking is by exposure-weighted risk, that is score multiplied by observed duration multiplied by headcount, rather than by peak score, because a REBA 9 held for four seconds an hour is not the problem a REBA 6 held all shift is.',
      icon: LocationIcon,
      tier: 'starter',
    },
    {
      name: 'Intervention ledger',
      summary: 'Every workstation change measured before and after, with an interval rather than a point.',
      detail:
        'An intervention is registered against a zone and task with a date, a cost and an owner. The ledger holds out the pre-change and post-change score distributions, reports the shift in mean and in the upper decile with a bootstrap confidence interval, and flags exposure that migrated to an adjacent task instead of disappearing. Capital requests for the next site cite the ledger.',
      icon: SyncIcon,
      tier: 'growth',
    },
    {
      name: 'Job and task dictionary',
      summary: 'One definition of every job across the network, so scores compare across sites.',
      detail:
        'Tasks are defined once with their camera view, the active instrument (REBA, RULA or manual handling), load and coupling defaults, and expected cycle. Sites inherit from the corporate dictionary and may override locally with the override recorded. Without this, a pallet lift in one distribution centre and a pallet lift in another are scored under different assumptions and the network comparison is meaningless.',
      icon: ArchiveIcon,
      tier: 'growth',
    },
    {
      name: 'Anonymous by default',
      summary: 'Zones and tasks are scored; individuals are not identified unless the customer deliberately turns that on.',
      detail:
        'The shipped configuration assigns a track identity that expires at the end of a camera pass and is never joined to an employee record, so the system produces exposure statistics for a job rather than a performance file on a person. Per-worker session history exists as an explicit, separately licensed, separately logged configuration with a named data controller, because that is the setting that changes the EU AI Act analysis and the works-council conversation.',
      icon: EyeClosedIcon,
      tier: 'starter',
    },
    {
      name: 'Edge inference on commodity CPU',
      summary: 'Frames are scored beside the camera; raw video never has to leave the site.',
      detail:
        'The pose model exports to ONNX at a few megabytes and runs on the CPU of a small industrial box on the site network. Only keypoint geometry, scores and coverage counts are transmitted; frames are discarded after scoring unless a customer explicitly enables a retention window for calibration. This removes the bandwidth cost, the cloud video-storage line item and most of the privacy objection at once.',
      icon: CpuIcon,
      tier: 'starter',
    },
    {
      name: 'Shift and regulator-format reporting',
      summary: 'The report the safety committee, the auditor and the insurer each actually want.',
      detail:
        'Scheduled exports give share of observations within an acceptable band per shift, exposure-weighted top jobs, intervention status and per-site agreement figures. In the United States the framing is evidence of a good-faith abatement programme, since OSHA has no ergonomics standard and addresses musculoskeletal hazards through the General Duty Clause. In Europe the report is structured around the Annex I risk-factor groups of the manual handling directive.',
      icon: ReportIcon,
      tier: 'growth',
    },
    {
      name: 'Manual-handling assessment',
      summary: 'Load, effort, environment and frequency scored against the four factor groups European law names.',
      detail:
        'Council Directive 90/269/EEC Annex I enumerates the risk factors an employer assessment must cover: load characteristics, physical effort including trunk twisting and unstable posture, working environment, and activity requirements such as over-frequent exertion and insufficient rest. Plumbline maps its measured angles, observed cycle rates and configured load values onto those four groups and produces the Article 4 assessment as a document rather than a dashboard.',
      icon: MeterIcon,
      tier: 'growth',
    },
    {
      name: 'VMS and camera connectors',
      summary: 'Reads from the video management system already in the building.',
      detail:
        'Pulls RTSP or ONVIF streams directly, or subscribes through an existing video management platform such as Milestone XProtect or Genetec Security Center rather than duplicating the camera estate. Camera metadata, including mounting height and view angle, is captured at onboarding because the geometry gate depends on it.',
      icon: DeviceCameraVideoIcon,
      tier: 'growth',
    },
    {
      name: 'In-browser assessment',
      summary: 'Score a clip in a browser tab with nothing uploaded anywhere.',
      detail:
        'A Transformers.js build runs the pose model client-side on verified ONNX weights, so a prospect, a works-council member or a plant ergonomist can drop in footage and watch the keypoints, angles, gates and REBA table resolve without an account and without a frame leaving the machine. It is the evaluation path and the privacy demonstration in one artefact.',
      icon: GlobeIcon,
      tier: 'starter',
    },
  ],

  aiFeatures: [
    {
      name: 'Current-generation pose backbone',
      summary: 'YOLO26n-pose replaces the YOLOv8n-pose generation: more accurate, smaller and roughly three times faster on CPU.',
      detail:
        'Ultralytics publishes YOLO26n-pose at 57.2 mAP50-95 and 83.3 mAP50 on COCO val with 2.9M parameters, 7.6B FLOPs and 40.3 ms per image on CPU ONNX, against YOLOv8n-pose at 50.4 and 80.1 with 3.3M parameters, 9.2B FLOPs and 131.8 ms on the same harness. The keypoint schema is unchanged, so the angle and scoring layers are untouched. Crowded multi-worker zones route instead to a one-stage estimator, since top-down cost scales with the number of people in frame while RTMO holds 74.8 AP on COCO val2017 at 141 FPS on a single V100.',
      icon: PersonIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'Temporal risk model',
      summary: 'A sequence model over joint trajectories, not a lookup table applied frame by frame.',
      detail:
        'Per-frame table lookup discards the information a human rater uses most, namely how long a posture is held and how load accumulates over a shift. Plumbline feeds windows of joint coordinates into a sequence model trained against the site expert-rated set, which is the architecture behind the strongest published result in this field: a MediaPipe plus ECAConv-LSTM hybrid reaching Cohen kappa 0.710 and ICC(A,1) 0.886 on REBA, kappa 0.755 on RULA and R-squared 0.941, evaluated on 32 workers. The rule-based table remains available as an auditable fallback and as the explanation surface.',
      icon: PulseIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: '3D lift for trunk and neck',
      summary: 'Body-frame angles that do not change when the camera moves.',
      detail:
        'Trunk and neck flexion dominate a REBA score and are exactly what a single oblique 2D view distorts. A 2025 systematic review of 20 studies found markerless capture at a mean joint-angle error of 2.31 degrees plus or minus 4.00 with excellent sagittal reliability (shoulder ICC at or above 0.97) but only moderate agreement in the coronal and transverse planes (ICC 0.520 to 0.608) and errors up to 14 degrees on some movements. A single-image mesh-recovery stage in the lineage of TokenHMR and Neural Localizer Fields returns angles in the body frame. TokenHMR central warning is designed in: validation is against 3D reference, never against 2D reprojection error, because fitting the image plane better can make the 3D pose worse.',
      icon: StackIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'Calibrated claim-risk model',
      summary: 'Time-to-claim fitted on the site own outcomes, with its calibration shown rather than asserted.',
      detail:
        'The starting position is a logistic curve on REBA distributions with a NIOSH-style prior, which is a scenario generator and is labelled as one. Once a site supplies twelve months of claim outcomes the model becomes a survival fit with proper handling of censoring, and every deployment surfaces a calibration curve and a Brier score next to the forecast. A forecast without a calibration plot is presented as an assumption, not a prediction.',
      icon: GraphIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'Control recommender',
      summary: 'Ranks the specific fix for a specific job, from what has already worked in the ledger.',
      detail:
        'Retrieves comparable jobs from the intervention ledger by task signature, dominant risk component and measured effect size, then drafts a ranked abatement list against the Annex I factor groups with the observed before-and-after distribution attached to each option. Every recommendation cites the interventions it was derived from, so an ergonomist can reject one on the evidence rather than on the tone.',
      icon: LightBulbIcon,
      ai: true,
      tier: 'growth',
    },
  ],

  competitors: [
    {
      name: 'TuMeke Ergonomics',
      url: 'https://www.tumeke.io/',
      strength:
        'The closest thing to a category-defining independent. Video-based assessment from a phone or device camera, no wearables, coaching cues on top of scoring, and more than 300 named customers including Delta, Siemens, Cargill, New Balance, Sanofi and Chubb. Claims "Reduce MSD injuries by up to 68%" and risk assessments "20 times faster than traditional manual methods".',
      gap:
        'The unit of work is a recorded assessment session, not a continuously watched line, so coverage is still bounded by how many clips somebody captures. The site does not state which instruments (REBA, RULA, NIOSH) sit behind the score, and no agreement-with-expert-rater figure is published anywhere.',
      pricing: 'Not published; tumeke.io/pricing returns HTTP 404 and the site routes to a demo request.',
    },
    {
      name: 'VelocityEHS Industrial Ergonomics',
      url: 'https://www.ehs.com/solutions/ergonomics/',
      strength:
        'AI 3D Motion Capture inside a full EHS suite, with AI hands and wrists assessment, AI/ML root cause analysis, recommended controls, workstation design guidelines and an ROI calculator. Advertises "60% Faster Assessments with AI-Motion Capture", "3X+ Average ROI within 12 months" and "75% Fewer MSD Injuries After Adoption".',
      gap:
        'Ergonomics is a module of a platform the buyer must otherwise adopt, which makes it a suite decision rather than a safety decision. It is also consolidating the independents: kineticalabs.com now redirects to ehs.com/kineticalabs. Plumbline is bought by an ergonomist without displacing the incumbent system of record, and integrates into it.',
      pricing: 'Not published on the solution page.',
    },
    {
      name: 'Cority',
      url: 'https://www.cority.com/',
      strength:
        'Occupational health, industrial hygiene, safety and now Industrial Ergonomics with AI Motion Capture in one record, so exposure sits next to the medical surveillance data it belongs with. Strong where the buyer is an occupational health function.',
      gap:
        'Health-record-centric and assessment-shaped: it is a better place to store a score than a system for generating scores continuously from a camera estate. Plumbline treats Cority as the destination of record rather than the competitor for it.',
      pricing: 'Not published.',
    },
    {
      name: 'Voxel',
      url: 'https://www.voxelai.com/',
      strength:
        'Genuinely continuous, on existing infrastructure. Advertises deployment "to any site in 48 hours using your existing camera" and compatibility with "over 95% of existing IP cameras", with customer results including a 73% reduction in workers compensation costs at MSI and an 86% drop in vehicle safety incidents at Piston Automotive, and named customers including CVS Health, Albertsons, Lowe and Port of Virginia.',
      gap:
        'Ergonomics is one detection class among forklifts, spills, PPE and pedestrian zones, and is surfaced as an event, an "improper bend", rather than a scored assessment. An EHS director gets an alert stream; an ergonomist gets nothing they can put on a REBA worksheet or take to a works council.',
      pricing: 'Not published.',
    },
    {
      name: 'Intenseye',
      url: 'https://www.intenseye.com/',
      strength:
        'The scale player. States it processes "over 22 billion frames daily", ships 50+ safety detections, holds SOC 2, and reports a 27% decrease in lost-day rate at Swire Coca-Cola, with Siemens, Unilever, Heineken and JTI among the logos.',
      gap:
        'Positioned on serious-injury-and-fatality prevention, where the value is detecting a discrete unsafe act. Cumulative musculoskeletal load is the opposite problem: nothing unsafe happens in any single frame. There is no standards-based scoring surface and no expert-agreement evidence.',
      pricing: 'Not published.',
    },
    {
      name: 'Protex AI',
      url: 'https://www.protex.ai/',
      strength:
        'The strongest privacy architecture in the category, and the one Plumbline must match. Event detection, blurring and encryption happen locally on edge devices, raw CCTV does not stream off-site, four anonymisation options are offered including a videoless mode where video is processed at the edge but never recorded or transmitted, and the company states ISO/IEC 27001:2022, GDPR, CCPA and EU AI Act alignment. Reports a 27% ergonomic risk reduction in the first 30 days and names Amazon, Sysco, Tesla, GM, FedEx and Caterpillar.',
      gap:
        'Behavioural event detection rather than an ergonomic instrument: overreaching and improper lifting are flagged as occurrences, not resolved into a REBA or RULA score with a prescribed action and an audit trail. No published agreement with expert raters.',
      pricing: 'Not published.',
    },
  ],

  pricing: [
    {
      id: 'starter',
      name: 'Line',
      monthly: 340,
      annual: 290,
      tagline: 'One site, one problem area, scored properly.',
      meter: '4 cameras at a single site; 90-day retention of scores and coverage counts, no video retained',
      features: [
        'Continuous REBA and RULA on 4 cameras',
        'Confidence and view-geometry gating with coverage reporting',
        'Zone and shift risk heatmaps',
        'Anonymous-by-default track identities',
        'Edge CPU inference; no raw video leaves the site',
        'In-browser assessment tool for ad hoc clips',
        'CSV and PDF shift reports',
      ],
      cta: 'Start with one line',
    },
    {
      id: 'growth',
      name: 'Network',
      monthly: 2400,
      annual: 2040,
      tagline: 'The whole estate, with a published agreement figure per site.',
      meter: '40 cameras across unlimited sites; 24-month score history',
      features: [
        'Everything in Line, across every site',
        'Rater calibration studio with per-site Cohen kappa and ICC',
        'Intervention ledger with bootstrap confidence intervals',
        'Corporate job and task dictionary with site overrides',
        'Temporal risk model and control recommender',
        'Manual-handling assessment against Directive 90/269/EEC Annex I',
        'Milestone, Genetec, VelocityEHS, Intelex and Cority connectors',
        'Works-council documentation pack',
      ],
      cta: 'Roll out across sites',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Estate',
      monthly: null,
      tagline: 'Regulated, unionised or multi-jurisdiction deployments.',
      meter: 'Per camera from 150 cameras, volume-tiered; on-premises or single-tenant private cloud',
      features: [
        'Everything in Network',
        '3D trunk and neck lift for oblique and multi-camera zones',
        'Calibrated claim-risk survival model fitted on site outcomes',
        'EU AI Act Annex III conformity pack: risk management, data governance, logging, human oversight, technical documentation',
        'Regional data residency and customer-managed encryption keys',
        'Model change control with per-version revalidation against the site reference set',
        'Snowflake share and warehouse export',
        'Named ergonomist success lead and quarterly calibration review',
      ],
      cta: 'Talk to us',
    },
  ],

  integrations: [
    { name: 'VelocityEHS', kind: 'ehs system of record', domain: 'ehs.com' },
    { name: 'Intelex', kind: 'ehsq system of record', domain: 'intelex.com' },
    { name: 'Cority', kind: 'occupational health', domain: 'cority.com' },
    { name: 'SAP EHS', kind: 'enterprise ehs', domain: 'sap.com' },
    { name: 'Workday', kind: 'hr and absence', domain: 'workday.com' },
    { name: 'ServiceNow', kind: 'workplace service management', domain: 'servicenow.com' },
    { name: 'Milestone XProtect', kind: 'video management', domain: 'milestonesys.com' },
    { name: 'Genetec Security Center', kind: 'video management', domain: 'genetec.com' },
    { name: 'Snowflake', kind: 'warehouse', domain: 'snowflake.com' },
    { name: 'Slack', kind: 'comms', domain: 'slack.com' },
  ],

  proof: [
    {
      claim: 'The pose figure the project quotes is correct, and it is also the weakest model in its own vendor table.',
      evidence:
        'Ultralytics publishes YOLOv8n-pose at 80.1 mAP50 and 50.4 mAP50-95 on COCO val with 3.3M parameters and 131.8 ms per image on CPU ONNX. The same vendor now ships YOLO26n-pose at 83.3 mAP50, 57.2 mAP50-95, 2.9M parameters and 40.3 ms.',
    },
    {
      claim: 'Confidence gating is a response to a measured failure, not a marketing feature.',
      evidence:
        'The Scientific Reports 2024 validation of a 2D single-camera pipeline across three production lines, 12 operators and 50 expert-scored frames reported exact REBA score agreement of 34.78%, 60.00% and 22.73%, and attributed the worst line to occlusion and operators standing oblique to the camera.',
    },
    {
      claim: 'There is a published bar for agreement with human raters, and it is the number Plumbline is built to report.',
      evidence:
        'A 2026 Sensors study combining MediaPipe 33-joint tracking with an ECAConv-LSTM reported Cohen kappa 0.710 and ICC(A,1) 0.886 on REBA, kappa 0.755 on RULA and 0.768 on OWAS, with R-squared 0.941, on 32 workers aged 42 plus or minus 5 in furniture manufacturing.',
    },
    {
      claim: 'Three dimensions matter specifically for the two angles that dominate a REBA score.',
      evidence:
        'A 2025 Sensors systematic review of 20 studies published 2013 to 2025 found markerless capture at a mean joint-angle error of 2.31 degrees plus or minus 4.00, with shoulder inter-rater ICC at or above 0.97 but coronal and transverse plane reliability at ICC 0.520 to 0.608 and errors up to 14 degrees on specific movements.',
    },
    {
      claim: 'The in-browser evaluation path runs on verified public weights, not a demo mock.',
      evidence:
        'Xenova/yolov8n-pose is a Transformers.js ONNX repository returning 17 keypoints as (x, y, visibility), with weights at 13.5 MB fp32, 6.79 MB fp16 and 3.76 MB uint8. It is AGPL-3.0, which constrains derivative licensing and is disclosed rather than glossed.',
    },
    {
      claim: 'The commercial outcome figures are modelled, and are labelled that way everywhere they appear.',
      evidence:
        'The 43% claims reduction and 380,000 dollars of annual saving for a 120-worker facility are outputs of a logistic model on REBA distributions with a NIOSH-style prior, applied to a cohort of 1,373 assessments of which 61% sat at Medium risk or above. They are not the result of a controlled trial and are never presented as one.',
    },
  ],

  outcomes: [
    { label: 'Assessments in the reference cohort', value: '1,373', caption: '61% at Medium risk or above, the population an abatement programme targets' },
    { label: 'Modelled MSD claim reduction', value: '−43%', caption: 'Modelled for a 120-worker facility from a NIOSH-style logistic prior, not a measured trial result' },
    { label: 'Modelled annual saving', value: '$380,000', caption: 'Same facility, same modelling assumptions' },
    { label: 'CPU latency per image', value: '40.3 ms', caption: 'YOLO26n-pose on the published Ultralytics CPU ONNX harness, against 131.8 ms for the previous generation' },
    { label: 'Pose weights on disk', value: '3.76 MB', caption: 'uint8 web export, small enough to run in a browser tab or on a site edge box' },
    { label: 'Target agreement with expert raters', value: 'κ 0.710', caption: 'The best published REBA agreement figure; each deployment reports its own' },
  ],

  faq: [
    {
      q: 'Is this worker surveillance?',
      a: 'The shipped configuration scores zones and tasks, not named people: track identities expire at the end of a camera pass and are never joined to an employee record, so the output is exposure statistics for a job. Per-worker history exists but is a deliberate, separately licensed and separately logged setting, because it is the setting that changes both the EU AI Act analysis and the works-council conversation. Annex III point 4 of the Act classes systems used to monitor and evaluate the behaviour of persons in a work relationship as high-risk, and that classification should be entered knowingly or not at all.',
    },
    {
      q: 'Does it infer fatigue, stress or attention?',
      a: 'No, and it will not. Article 5(1)(f) of the EU AI Act, applicable since 2 February 2025, prohibits AI systems used to infer emotions of a natural person in the workplace, with a narrow carve-out for medical or safety reasons. Scoring joint angles against the REBA and RULA tables infers biomechanical load, which the prohibition does not reach. Fatigue and affect inference from the same video would move the product towards that line, and the safety exception is narrower than vendors tend to assume, so posture and force are a hard architectural boundary rather than a roadmap choice.',
    },
    {
      q: 'How accurate is the score, honestly?',
      a: 'Two-dimensional single-camera scoring agrees with expert raters on the risk band far more often than on the exact score. The most careful published factory validation found 65% to 80% risk-level agreement but 22.7% to 60.0% exact-score agreement. Plumbline is designed around that: it gates out frames whose geometry cannot support a score, reports coverage next to every number, and runs a calibration study on the customer own footage so the site has its own kappa rather than a vendor average. Any deployment that has not completed calibration is marked as uncalibrated in the reporting.',
    },
    {
      q: 'Do we need new cameras or GPUs?',
      a: 'No. Inference runs on the CPU of a small box on the site network, reading existing RTSP or ONVIF streams or subscribing through a video management platform such as Milestone XProtect or Genetec Security Center. Current-generation pose models run at roughly 40 ms per image on commodity CPU, so a handful of cameras is a single box. What does matter is camera placement, since view angle drives the geometry gate, and the onboarding survey exists to catch that before anything is billed.',
    },
    {
      q: 'Where does the 43% claim reduction come from?',
      a: 'From a model, and it is labelled as one. A logistic claim-probability curve fitted on REBA distributions with a NIOSH-style prior, applied to a 120-worker facility, yields a 43% reduction and 380,000 dollars of annual saving under its stated assumptions. It is a scenario generator for building a business case, not evidence from a controlled trial. Once a site supplies twelve months of its own claim outcomes the forecast is refitted as a survival model and published with a calibration curve and a Brier score.',
    },
    {
      q: 'Will our works council approve it?',
      a: 'That is a negotiation, not a compliance checkbox, and it is where most camera projects in Europe fail. GDPR Article 88 permits Member States to set specific employee-data rules by law or collective agreement and calls out monitoring systems at the workplace directly, which in practice makes this a co-determination matter in Germany, France, the Netherlands and the Nordics. Plumbline ships the artefacts the council will ask for: a plain-language processing description, a retention schedule, the anonymisation switch in its default position, a per-zone opt-out and a record of who can see what.',
    },
    {
      q: 'Is there an OSHA standard we can certify against?',
      a: 'No. OSHA has had no ergonomics standard since the 1999 rule was withdrawn and addresses musculoskeletal hazards under Section 5(a)(1) of the OSH Act, the General Duty Clause, supported by voluntary industry guidelines. That means there is no threshold score to pass, and what an employer needs instead is documented evidence of a good-faith abatement programme: which jobs were assessed, what was found, what was changed and what happened next. Plumbline is built to produce that record continuously rather than to certify a number.',
    },
  ],

  trust: [
    {
      name: 'Video stays on site',
      body:
        'Scoring happens on the edge box; only keypoint geometry, scores and coverage counts leave the network. Frames are discarded after inference unless a customer explicitly enables a bounded retention window for calibration, in which case the window, its purpose and its expiry are recorded and shown in the console. This is the same architectural posture Protex AI has made the category expectation, and Plumbline treats it as table stakes rather than a premium tier.',
    },
    {
      name: 'Anonymous by default, identified only by decision',
      body:
        'Track identities are ephemeral and unlinked to employee records in the shipped configuration. Enabling per-worker history requires a named data controller, an explicit contract term and an entry in the audit log, and the console shows at all times which mode a site is in. A customer cannot end up identifying workers by accident.',
    },
    {
      name: 'Biometric and employee-data handling',
      body:
        'Joint coordinates derived from workplace video are employee personal data wherever GDPR applies, and several United States state biometric-privacy statutes impose notice and consent duties on body-derived identifiers. Plumbline stores geometry rather than imagery, never computes a face template, never attempts re-identification across cameras or sites, and supports deletion and export of any subject record on request. Regional data residency is available on the Estate plan.',
    },
    {
      name: 'Model governance and change control',
      body:
        'Every model version is pinned per site, and a version change triggers revalidation against that site expert-rated reference set before it is promoted, with the before-and-after agreement figures recorded. Scores carry the model version, the instrument, the gate thresholds and the coverage percentage that produced them, so any number in a compliance file can be reconstructed years later.',
    },
    {
      name: 'EU AI Act readiness',
      body:
        'Per-worker deployments fall under Annex III point 4 and attract Chapter III obligations: a risk-management system, data governance, technical documentation, logging, human oversight, conformity assessment and registration in the EU database. The Estate plan ships those artefacts as a maintained pack rather than as a consulting engagement, and the anonymous-by-default configuration exists precisely so that customers who do not need per-worker monitoring are not dragged into the regime by a default setting.',
    },
    {
      name: 'Human oversight is structural, not advisory',
      body:
        'No score triggers an automated consequence for a person. Outputs feed job-level abatement decisions taken by a qualified ergonomist or safety professional, the console has no disciplinary workflow and no per-worker ranking view, and the calibration studio exists to keep a human rater in the loop as the arbiter of what the model is allowed to claim.',
    },
    {
      name: 'Security certification',
      body:
        'The security programme is built to the SOC 2 Trust Services Criteria, with encryption in transit and at rest, single sign-on, role-based access control, tenant isolation and audit logging in place from the first release. The Type II observation window and the ISO/IEC 27001 certification are scheduled rather than held; the status of both is stated plainly on the security page rather than implied by a badge.',
    },
  ],

  roadmap: [
    {
      quarter: 'Q4 2026',
      title: 'Current-generation backbone and honest gating',
      body:
        'Swap YOLOv8n-pose for YOLO26n-pose, taking COCO val pose from 50.4 to 57.2 mAP50-95 and CPU ONNX latency from 131.8 ms to 40.3 ms per image with no change to the 17-keypoint schema. Ship the three-stage frame gate, per-zone coverage reporting and the Transformers.js in-browser assessment tool on verified public weights.',
    },
    {
      quarter: 'Q1 2027',
      title: 'Calibration studio and the first published kappa',
      body:
        'Release the two-rater blind scoring and adjudication workflow, and report exact-score agreement, risk-level agreement, Cohen kappa and ICC per deployment. Ship the temporal risk model trained against those reference sets, targeting the published bar of kappa 0.710 on REBA and 0.755 on RULA, with the rule-based table retained as the auditable explanation surface.',
    },
    {
      quarter: 'Q2 2027',
      title: 'Out of the image plane',
      body:
        'Add a single-image 3D mesh-recovery stage so trunk and neck angles are computed in the body frame rather than the camera frame, addressing the coronal and transverse plane weakness the 2025 systematic review documented. Validate on 3D reference rather than 2D reprojection, per the TokenHMR finding that 2D fit and 3D accuracy can move in opposite directions. Add one-stage estimation for crowded zones.',
    },
    {
      quarter: 'Q3 2027',
      title: 'Calibrated risk and the conformity pack',
      body:
        'Replace the NIOSH-style logistic prior with a survival model fitted on customer claim outcomes, shipped with a calibration curve and Brier score on every forecast. Release the EU AI Act Annex III conformity pack, regional data residency and customer-managed keys, and the model change-control workflow that revalidates each version against every site reference set before promotion.',
    },
  ],
}

export default product
