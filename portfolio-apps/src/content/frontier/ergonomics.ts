import type { Frontier } from '../frontier'

/**
 * Frontier review for P08 — Workplace Ergonomics AI.
 * Every figure below was read from the page cited in `sources` (or, for the
 * regulatory items, from the page cited on the compliance entry itself).
 */
const frontier: Frontier = {
  asOf: '2026-09',
  headline:
    'The pose backbone is two generations behind what Ultralytics now ships and the scoring layer has never been measured against a human ergonomist, which is the only number the field actually respects.',

  summary: [
    'Two-dimensional human pose estimation is a solved commodity in 2026. Ultralytics currently publishes YOLO26-pose, whose nano variant reaches 57.2 mAP50-95 and 83.3 mAP50 on COCO val with 2.9M parameters and 40.3 ms per image on CPU ONNX. The YOLOv8n-pose backbone this project uses reaches 50.4 mAP50-95 and 80.1 mAP50 with 3.3M parameters and 131.8 ms on the same CPU harness. The 80.1 figure carried in the project is therefore correct as published, but it is the loose mAP50 metric rather than the stricter mAP50-95 of 50.4, and it is now the weakest entry in Ultralytics own table. Above that sit the top-down specialists: RTMPose-m at 75.8 AP on COCO while sustaining more than 90 FPS on an Intel i7-11700 CPU, RTMO at 74.8 AP on COCO val2017 at 141 FPS on a single V100 for one-stage multi-person scenes, and ViTPose at 81.1 mAP on COCO keypoint test-dev. Meta Sapiens goes further again, pretraining on over 300 million in-the-wild human images and predicting 308 keypoints at 1024x768 native resolution, but the released checkpoints are CC-BY-NC-4.0 and therefore unusable in a commercial safety product.',

    'Keypoint accuracy is nevertheless the wrong scoreboard for an ergonomics system. The benchmark that decides whether a REBA number can be put in front of a safety committee is agreement with a trained human rater. The most rigorous published test of a pipeline architecturally identical to this one, a 2D RGB single-camera system scored against expert ergonomists across three production lines at a kitchen extractor hood manufacturer, reported REBA risk-level agreement of 65.22%, 80.00% and 72.73% per line, but exact REBA score agreement of only 34.78%, 60.00% and 22.73%, and exact RULA score agreement as low as 9.09%. Its authors concluded that such systems "do not seem capable of providing ergonomists with reliable and precise ergonomic assessments" while remaining "sufficiently accurate to implement a network of cameras" to monitor statistical trends. That is precisely the claim this project should be making, and precisely the claim it does not currently qualify.',

    'The 2026 leaders close that gap in two ways. First, they add a temporal model on top of per-frame geometry: a Sensors 2026 hybrid framework combining MediaPipe 33-joint tracking with an ECAConv-LSTM reached Cohen kappa 0.710 and ICC(A,1) 0.886 against expert REBA scores on 32 furniture workers, with kappa 0.755 on RULA. Second, they move out of the image plane. A 2025 Sensors systematic review of 20 studies published 2013-2025 found markerless capture achieving a mean joint-angle error of 2.31 degrees plus or minus 4.00 against marker-based reference, with excellent shoulder reliability (ICC at or above 0.97) but only moderate agreement in the coronal and transverse planes (ICC 0.520 to 0.608) and errors up to 14 degrees on specific movements. Trunk and neck flexion, the two inputs that dominate a REBA score, are exactly the angles a single oblique 2D camera distorts most, which is why 3D mesh recovery (TokenHMR, and Neural Localizer Fields at NeurIPS 2024) belongs on the roadmap rather than in the nice-to-have column.',
  ],

  stateOfTheArt: [
    {
      name: 'YOLO26-pose',
      org: 'Ultralytics',
      what: 'The pose family Ultralytics ships in 2026 and the direct drop-in replacement for the YOLOv8n-pose backbone used here. The nano variant is smaller, more accurate and materially faster on CPU than the model it replaces.',
      metric: 'YOLO26n-pose 57.2 mAP50-95 / 83.3 mAP50 on COCO val, 2.9M params, 7.6B FLOPs, 40.3 ms CPU ONNX; YOLO26x-pose 71.6 / 91.6',
      url: 'https://docs.ultralytics.com/tasks/pose/',
      year: '2026',
    },
    {
      name: 'RTMPose',
      org: 'OpenMMLab / MMPose',
      what: 'Top-down real-time pose framework built for industrial deployment. It is the accuracy-per-CPU-watt leader for the single-worker, fixed-camera case that dominates ergonomic assessment.',
      metric: 'RTMPose-m 75.8 AP on COCO with 90+ FPS on an Intel i7-11700 CPU and 430+ FPS on a GTX 1660 Ti; RTMPose-s 72.2 AP, 70+ FPS on a Snapdragon 865',
      url: 'https://arxiv.org/abs/2303.07399',
      year: '2023',
    },
    {
      name: 'RTMO',
      org: 'OpenMMLab / MMPose',
      what: 'One-stage multi-person estimator that avoids the detector-then-pose cascade, so cost stays flat as the number of workers in frame grows. The right architecture for crowded pick lines and sort docks where top-down latency scales with headcount.',
      metric: '74.8 AP on COCO val2017 at 141 FPS on a single V100; 1.1% higher AP than prior one-stage work at about 9x the speed with the same backbone',
      url: 'https://arxiv.org/abs/2312.07526',
      year: '2024',
    },
    {
      name: 'ViTPose / ViTPose++',
      org: 'University of Sydney and collaborators',
      what: 'Plain vision-transformer baselines that set the accuracy ceiling for 2D keypoints and scale cleanly from 100M to 1B parameters. ViTPose++ extends the result across MS COCO, AI Challenger, OCHuman, COCO-WholeBody, AP-10K and APT-36K simultaneously.',
      metric: 'ViTPose 81.1 mAP on MS COCO keypoint test-dev',
      url: 'https://arxiv.org/abs/2204.12484',
      year: '2022',
    },
    {
      name: 'Sapiens',
      org: 'Meta Reality Labs',
      what: 'Human-vision foundation model pretrained on more than 300 million in-the-wild human images, covering 2D pose, body-part segmentation, depth and surface normals at 1K native resolution. The released pose checkpoints predict 308 keypoints across body, face, hands and feet at 1024x768, which resolves wrist and hand detail that a 17-point COCO skeleton cannot. The licence is the blocker: CC-BY-NC-4.0, so it cannot be shipped commercially.',
      metric: '0.3B to 2B parameters; +7.6 mAP on Humans-5K pose, +17.1 mIoU on Humans-2K segmentation, 22.4% relative RMSE reduction on Hi4D depth, 53.5% relative angular-error improvement on THuman2 normals',
      url: 'https://huggingface.co/facebook/sapiens-pose-1b',
      year: '2024',
    },
    {
      name: 'Neural Localizer Fields (NLF)',
      org: 'NeurIPS 2024',
      what: 'Continuous neural field of body-point localiser functions that can be queried at arbitrary points in the human volume, trained across heterogeneous annotation formats without conversion. Current reference point for single-image 3D pose and shape, which is what supplies the true trunk and neck angles REBA needs.',
      metric: 'Reported state of the art on 3DPW, EMDB, EHF, SSP-3D and AGORA',
      url: 'https://arxiv.org/abs/2407.07532',
      year: '2024',
    },
    {
      name: 'TokenHMR',
      org: 'Max Planck Institute for Intelligent Systems (CVPR 2024)',
      what: 'Tokenised pose representation that restricts predictions to the space of valid human poses. Its central finding is a direct warning for this project: 3D accuracy can decline as 2D keypoint accuracy improves, because biased pseudo-ground-truth combined with an approximate camera projection model rewards fitting the image plane rather than the body.',
      metric: 'Improved 3D accuracy over prior state of the art on EMDB and 3DPW while training on in-the-wild data',
      url: 'https://arxiv.org/abs/2404.16752',
      year: '2024',
    },
    {
      name: 'Expert-agreement benchmarking for automated REBA/RULA',
      org: 'Sensors (Basel) 2026; Scientific Reports 2024',
      what: 'The evaluation protocol the ergonomics literature has converged on: score the system against trained human raters and report Cohen kappa and ICC, not keypoint AP. A MediaPipe plus ECAConv-LSTM hybrid reaches kappa 0.710 on REBA; a plain 2D single-camera pipeline of the kind used here reaches only 22.7% to 60.0% exact REBA score agreement in a real factory.',
      metric: 'Best published REBA agreement: Cohen kappa 0.710, ICC(A,1) 0.886, on 32 workers; RULA kappa 0.755; OWAS kappa 0.768; model R-squared 0.941',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12846281/',
      year: '2026',
    },
    {
      name: 'Browser-runnable pose in ONNX',
      org: 'Hugging Face (Transformers.js)',
      what: 'Three verified repositories make a live in-browser ergonomics demo practical with no server. Xenova/yolov8n-pose is the exact architecture this project already uses, ships 17 keypoints as (x, y, visibility) and is AGPL-3.0, which matters for any commercial derivative. onnx-community/vitpose-base-simple runs from the Transformers.js keypoint-detection pipeline directly. onnx-community/yolo26n-pose-ONNX is the current-generation export, already used by nine Spaces, but carries no model card.',
      metric: 'Xenova/yolov8n-pose ONNX weights: 13.5 MB fp32, 6.79 MB fp16, 3.76 MB uint8/quantized. onnx-community/vitpose-base-simple: 344 MB fp32 down to 50 MB q4f16',
      url: 'https://huggingface.co/Xenova/yolov8n-pose',
      year: '2026',
    },
  ],

  benchmarks: [
    {
      name: 'COCO val pose mAP50-95 (nano class)',
      sota: 'YOLO26n-pose, 57.2',
      sotaBy: 'Ultralytics, 2026',
      project: 'YOLOv8n-pose, 50.4',
      sotaValue: 57.2,
      projectValue: 50.4,
      unit: 'mAP50-95',
      higherIsBetter: true,
    },
    {
      name: 'COCO val pose mAP50',
      sota: 'YOLO26x-pose, 91.6',
      sotaBy: 'Ultralytics, 2026',
      project: 'YOLOv8n-pose, 80.1 (the figure cited by this project is correct as published)',
      sotaValue: 91.6,
      projectValue: 80.1,
      unit: 'mAP50',
      higherIsBetter: true,
    },
    {
      name: 'COCO AP, top-down specialist',
      sota: 'RTMPose-m, 75.8 AP at 90+ FPS on an Intel i7-11700 CPU',
      sotaBy: 'OpenMMLab, 2023',
      project: 'YOLOv8n-pose, 50.4 (mAP50-95, the comparable OKS metric)',
      sotaValue: 75.8,
      projectValue: 50.4,
      unit: 'AP',
      higherIsBetter: true,
    },
    {
      name: 'CPU ONNX latency per image, 640 px',
      sota: 'YOLO26n-pose, 40.3 ms (+/- 0.5)',
      sotaBy: 'Ultralytics, 2026',
      project: 'YOLOv8n-pose, 131.8 ms on the same published harness',
      sotaValue: 40.3,
      projectValue: 131.8,
      unit: 'ms',
      higherIsBetter: false,
    },
    {
      name: 'Agreement with expert REBA raters (Cohen kappa)',
      sota: '0.710, MediaPipe 33-joint tracking plus an ECAConv-LSTM temporal model, 32 workers',
      sotaBy: 'Sensors (Basel), 2026',
      project: 'Not measured. This project has no expert-rated validation set, so its agreement with a human ergonomist is unknown.',
      sotaValue: 0.71,
      unit: 'kappa',
      higherIsBetter: true,
    },
    {
      name: 'Exact REBA score agreement, single 2D camera',
      sota: 'Up to 89% across the markerless systems reviewed in Sensors 2025',
      sotaBy: 'Sensors (Basel) systematic review, 2025',
      project: '39.2% mean (34.78 / 60.00 / 22.73 across three production lines) is the published result for the closest comparable 2D pipeline in Scientific Reports 2024; this project has no site figure of its own',
      sotaValue: 89,
      projectValue: 39.2,
      unit: '% exact agreement',
      higherIsBetter: true,
    },
  ],

  upgrades: [
    {
      title: 'Swap the backbone to YOLO26n-pose',
      body: 'A same-class replacement that is better on every published axis: 57.2 versus 50.4 mAP50-95, 83.3 versus 80.1 mAP50, 2.9M versus 3.3M parameters, 7.6B versus 9.2B FLOPs, and 40.3 ms versus 131.8 ms per image on the CPU ONNX harness Ultralytics uses for both. The export path, the 17-keypoint COCO schema and every downstream angle calculation are unchanged, so this is a weights-and-config change with a regression run, not a rewrite. A verified web export already exists at onnx-community/yolo26n-pose-ONNX.',
      impact: 'high',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Build an expert-rated validation set and publish Cohen kappa',
      body: 'The project reports keypoint mAP and a modelled claims reduction but no measured agreement with a human ergonomist, which is the only figure a safety committee will accept. Have two certified ergonomists independently score several hundred frames sampled across zones, shifts and camera angles, adjudicate disagreements, then report exact-score agreement, risk-level agreement, Cohen kappa and ICC against that reference. The published targets to beat are kappa 0.710 on REBA and 0.755 on RULA. Until this exists, every claim about the scoring layer is unfalsifiable.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Add a temporal model between the angles and the score',
      body: 'The current pipeline smooths angles with an EMA filter and then applies the REBA table per frame. The 2026 result that reached kappa 0.710 did not: it fed a sequence of 33 joint coordinates into an ECAConv-LSTM and predicted the score, reaching ICC(A,1) 0.886 and R-squared 0.941. A sequence model captures what a per-frame table cannot, namely how long a posture is held and how risk accumulates across a shift, which is also the thing REBA worksheets are worst at.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Lift to 3D before scoring trunk and neck',
      body: 'REBA is dominated by trunk and neck flexion, and those are the angles a single oblique 2D camera distorts most. The 2025 systematic review found markerless capture reliable in the sagittal plane (shoulder ICC at or above 0.97) but only moderate in the coronal and transverse planes (ICC 0.520 to 0.608), with errors up to 14 degrees on some movements. Adding a single-image mesh-recovery stage (NLF or TokenHMR) gives body-frame angles that are invariant to camera placement. Heed the TokenHMR warning: optimising 2D keypoint fit against pseudo-ground-truth can make 3D pose worse, so validate on 3D, not on reprojection error.',
      impact: 'high',
      effort: 'months',
      status: 'planned',
    },
    {
      title: 'Gate every score on view geometry and per-joint confidence',
      body: 'The Scientific Reports validation traced its worst line (22.73% exact REBA agreement) to occlusion and operators standing oblique to the camera. The system should refuse to emit a score rather than emit a wrong one: reject frames where the required joints fall below a confidence floor, where the torso normal is beyond a set angle from the image plane, or where limbs are truncated. Coverage becomes a reported metric alongside the score, and a zone with 40% usable frames is flagged as a camera-placement problem rather than silently averaged into the heatmap.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Ship the in-browser demo on verified ONNX weights',
      body: 'Run the whole assessment client-side with Transformers.js so no frame leaves the visitor machine, which doubles as the privacy demonstration the compliance story needs. Xenova/yolov8n-pose is the exact current architecture and ships a 3.76 MB uint8 export and a 6.79 MB fp16 export, the latter close to the 6.2 MB figure this project quotes. onnx-community/vitpose-base-simple runs from the keypoint-detection pipeline in one line but is 50 MB even at q4f16, so it is the accuracy option rather than the default. Note that Xenova/yolov8n-pose is AGPL-3.0, which constrains any closed derivative.',
      impact: 'medium',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Move to RTMO where the frame is crowded',
      body: 'Top-down estimation costs one forward pass per detected worker, so latency on a busy sort dock scales with headcount. RTMO is one-stage and holds 74.8 AP on COCO val2017 at 141 FPS on a single V100, with cost roughly flat in the number of people. Route cameras by scene density: RTMPose or YOLO26 for single-operator workstations, RTMO for multi-worker zones.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Refit the claim forecast on site outcomes, and label it honestly until then',
      body: 'The 90-day forecast is a logistic curve on REBA distributions with a NIOSH-style prior, and the 43% claims reduction and 380k dollars of annual saving are modelled outputs of that prior, not measurements. Replace it with a survival model fitted on the site own claim history with time-to-event and censoring handled properly, report a calibration curve and a Brier score, and until a site has supplied at least a year of outcomes, present the forecast explicitly as a scenario rather than a prediction.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
  ],

  compliance: [
    {
      name: 'United States: no OSHA ergonomics standard, only the General Duty Clause',
      body: 'OSHA has had no ergonomics standard since the 1999 rule was withdrawn, and addresses musculoskeletal hazards through Section 5(a)(1) of the OSH Act, the General Duty Clause, supported by voluntary industry guidelines. This shapes the product rather than constraining it: there is no numeric REBA threshold to certify against, so the system sells on evidence of a good-faith abatement programme, not on compliance with a rule. The measurable regulatory surface is recordkeeping and the injury data itself. BLS reported 2.5 million nonfatal injuries and illnesses in private industry for 2024, and 492,140 days-away-from-work cases in the overexertion, repetitive motion and bodily conditions group, at a rate of 23.2 per 10,000 full-time workers and a median of 14 days away. Note that osha.gov returned HTTP 403 to automated retrieval during this review, so the OSHA position here is stated without a live citation; the BLS figures are cited.',
      url: 'https://www.bls.gov/news.release/osh.t02.htm',
    },
    {
      name: 'EU AI Act Annex III(4): worker monitoring is high-risk',
      body: 'Annex III point 4 classes as high-risk any AI system "intended to be used to make decisions affecting terms of work-related relationships, the promotion or termination of work-related contractual relationships, to allocate tasks based on individual behaviour or personal traits or characteristics or to monitor and evaluate the performance and behaviour of persons in such relationships". Per-worker posture scoring, worker session histories and trend flags for supervisors fall squarely inside "monitor and evaluate the behaviour of persons". The consequence is Chapter III obligations: a risk-management system, data governance, technical documentation, logging, human oversight, conformity assessment and registration in the EU database. The design lever is aggregation: a deployment that scores zones and tasks rather than named individuals has a materially different classification argument from one that ranks workers, and the product should make anonymous-by-default the shipped configuration.',
      url: 'https://artificialintelligenceact.eu/annex/3/',
    },
    {
      name: 'EU AI Act Article 5(1)(f): the emotion-inference ban is adjacent, not triggered',
      body: 'Article 5(1)(f), applicable since 2 February 2025, prohibits the use of AI systems "to infer emotions of a natural person in the areas of workplace and education institutions, except where the use of the AI system is intended to be put in place or into the market for medical or safety reasons". Scoring joint angles against the REBA and RULA tables infers biomechanical load, not emotion, so the prohibition does not bite. It becomes live the moment the roadmap adds fatigue, stress, distraction or affect inference from the same video, and the "safety reasons" carve-out is narrower than it looks and should not be treated as a general licence. The rule for this product is a hard architectural boundary: posture and force only, never facial affect, and never a derived state that a regulator would read as an emotion.',
      url: 'https://artificialintelligenceact.eu/article/5/',
    },
    {
      name: 'GDPR Article 88 and works-council consent',
      body: 'Article 88 lets Member States set more specific rules for employee data by law or by collective agreement, and requires "suitable and specific measures to safeguard the data subject human dignity, legitimate interests and fundamental rights, with particular regard to the transparency of processing... and monitoring systems at the work place". In practice, in Germany, France, the Netherlands and the Nordics, camera-based posture monitoring is a co-determination matter: the works council must agree before a single camera is enabled. That is a deployment gate, not a legal footnote, and the product should ship the artefacts the council will demand, namely a plain-language processing description, a retention schedule, an anonymisation switch and a per-zone opt-out.',
      url: 'https://gdpr-info.eu/art-88-gdpr/',
    },
    {
      name: 'EU manual handling: Directive 90/269/EEC',
      body: 'Council Directive 90/269/EEC of 29 May 1990 sets the minimum requirements for manual handling of loads where there is a risk particularly of back injury. Article 3 obliges employers to eliminate manual handling by organisational measures or mechanical equipment where possible, and Article 4 obliges them, where it cannot be avoided, to organise workstations to make handling safe and to "assess, in advance if possible, the health and safety conditions of the type of work involved". Annex I enumerates the risk factors the assessment must cover: load characteristics, physical effort including trunk twisting and unstable posture, working environment, and activity requirements such as over-frequent exertion and insufficient rest. Those four groups map directly onto what the system already measures, which makes the report format, not the model, the compliance deliverable in Europe.',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A31990L0269',
    },
  ],

  sources: [
    {
      title: 'Pose Estimation — YOLO26-pose COCO benchmark table',
      url: 'https://docs.ultralytics.com/tasks/pose/',
      org: 'Ultralytics',
      date: '2026-09',
    },
    {
      title: 'YOLOv8 model documentation — Pose (COCO) performance table',
      url: 'https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/yolov8.md',
      org: 'Ultralytics',
      date: '2026-09',
    },
    {
      title: 'RTMPose: Real-Time Multi-Person Pose Estimation based on MMPose',
      url: 'https://arxiv.org/abs/2303.07399',
      org: 'OpenMMLab',
      date: '2023-03',
    },
    {
      title: 'RTMO: Towards High-Performance One-Stage Real-Time Multi-Person Pose Estimation',
      url: 'https://arxiv.org/abs/2312.07526',
      org: 'OpenMMLab',
      date: '2023-12',
    },
    {
      title: 'ViTPose: Simple Vision Transformer Baselines for Human Pose Estimation',
      url: 'https://arxiv.org/abs/2204.12484',
      org: 'University of Sydney and collaborators',
      date: '2022-04',
    },
    {
      title: 'Sapiens: Foundation for Human Vision Models',
      url: 'https://arxiv.org/abs/2408.12569',
      org: 'Meta Reality Labs',
      date: '2024-08',
    },
    {
      title: 'facebook/sapiens-pose-1b model card — 308 keypoints, 1024x768, CC-BY-NC-4.0',
      url: 'https://huggingface.co/facebook/sapiens-pose-1b',
      org: 'Meta on Hugging Face',
      date: '2026-09',
    },
    {
      title: 'Neural Localizer Fields for Continuous 3D Human Pose and Shape Estimation',
      url: 'https://arxiv.org/abs/2407.07532',
      org: 'NeurIPS 2024',
      date: '2024-07',
    },
    {
      title: 'TokenHMR: Advancing Human Mesh Recovery with a Tokenized Pose Representation',
      url: 'https://arxiv.org/abs/2404.16752',
      org: 'Max Planck Institute for Intelligent Systems, CVPR 2024',
      date: '2024-04',
    },
    {
      title: 'Validation of computer vision-based ergonomic risk assessment tools for real manufacturing environments',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11561082/',
      org: 'Scientific Reports',
      date: '2024-11',
    },
    {
      title: 'A Systematic Review of the Accuracy, Validity, and Reliability of Markerless Versus Marker Camera-Based 3D Motion Capture for Industrial Ergonomic Risk Analysis',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12431202/',
      org: 'Sensors (Basel)',
      date: '2025',
    },
    {
      title: 'Aligning Computer Vision with Expert Assessment: An Adaptive Hybrid Framework for Real-Time Fatigue Assessment in Smart Manufacturing',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12846281/',
      org: 'Sensors (Basel)',
      date: '2026',
    },
    {
      title: 'Xenova/yolov8n-pose — Transformers.js ONNX pose model, 17 keypoints, AGPL-3.0',
      url: 'https://huggingface.co/Xenova/yolov8n-pose',
      org: 'Hugging Face',
      date: '2026-09',
    },
    {
      title: 'onnx-community/vitpose-base-simple — keypoint-detection pipeline for Transformers.js',
      url: 'https://huggingface.co/onnx-community/vitpose-base-simple',
      org: 'Hugging Face',
      date: '2026-09',
    },
    {
      title: 'onnx-community/yolo26n-pose-ONNX — current-generation web export',
      url: 'https://huggingface.co/onnx-community/yolo26n-pose-ONNX',
      org: 'Hugging Face',
      date: '2026-09',
    },
  ],
}

export default frontier
