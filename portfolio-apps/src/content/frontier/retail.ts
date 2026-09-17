import type { Frontier } from '../frontier'

const frontier: Frontier = {
  asOf: '2026-09',
  headline:
    "The detection pipeline is a generation behind (YOLOv8n against the January 2026 NMS-free YOLO26 line) and the 3-class head is closed-vocabulary, which is the real ceiling: in 2026 a new SKU or facing type should arrive as a text prompt, not a retraining run.",
  summary: [
    "Real-time detection moved twice between this project's YOLOv8n baseline and September 2026. First the real-time DETR line closed the accuracy gap: D-FINE reports 54.0 AP on COCO at 124 FPS on a T4 and 59.3 AP for D-FINE-X with Objects365 pretraining, DEIM lifts D-FINE-L to 54.7 AP at the same 124 FPS while halving training time, and Roboflow's RF-DETR became the first real-time model past 60 mAP on COCO (RF-DETR-Large, 60.5 mAP at roughly 40 ms on a T4) under an Apache-2.0 licence. Then Ultralytics shipped YOLO26 in January 2026: a DFL-free head, native end-to-end NMS-free inference, progressive loss with small-target-aware label assignment and the MuSGD optimiser. YOLO26n reaches 40.9 mAP@50-95 on COCO with 2.4M parameters and 5.5 GFLOPs at 1.7 ms on a T4, against YOLOv8n's 37.3 mAP with 3.2M parameters and 8.7 GFLOPs. The same nano budget now buys 3.6 more mAP points, a smaller graph and no NMS post-processing.",
    "The larger shift is open-vocabulary detection. YOLO-World reported 35.4 AP zero-shot on LVIS at 52.0 FPS on a V100; Grounding DINO 1.5 Pro reports 54.3 COCO AP and 55.7 LVIS-minival zero-shot AP, with a distilled Edge variant at 36.2 LVIS AP and 75.2 FPS under TensorRT; OWLv2 self-training raised LVIS rare-class AP from 31.2 to 44.6. Ultralytics YOLOE carries a built-in 4,585-name vocabulary and accepts text or image-exemplar prompts at inference, beating YOLO-Worldv2-S by 3.5 AP at a third of the training cost. Meta's SAM 3, released 19 November 2025 and integrated into the ultralytics package, adds promptable concept segmentation: 65.0 CGF1 zero-shot on SA-Co and 47.0 LVIS zero-shot mask AP from a noun-phrase prompt. For shelf work this changes the economics of the catalogue. A fixed shelf_void / product_facing / misplaced_item head has to be relabelled and retrained for every new facing type; a prompted head answers \"empty facing behind the price rail\" without touching the weights.",
    "This project is strong exactly where the frontier is weak and weak exactly where the frontier is strong. Its mAP@50 of 0.841 and mAP@50-95 of 0.613 come from real store cameras with angled views, variable lighting and occlusion, and its 6.2 MB ONNX export runs under 45 ms per frame on a Jetson Orin with an under-two-second alert path. That is a genuine deployment posture that most published work does not have. But 506 annotated images (2,024 after augmentation) is three orders of magnitude below SKU-110K's 11,743 images and over 1.7 million boxes at about 147 products per image, so no external benchmark number exists for it; ByteTrack at IDF1 0.74 sits well behind BoT-SORT's 80.2 IDF1 on MOT17; and the closed head means every catalogue change is an annotation project. The upgrade path is therefore: modernise the backbone, add a prompted second stage, use SAM 3 and Grounding DINO to auto-label a dataset large enough to publish against SKU-110K, and keep the tracker non-biometric so the EU AI Act and BIPA exposure stays at zero.",
  ],
  stateOfTheArt: [
    {
      name: 'Ultralytics YOLO26',
      org: 'Ultralytics',
      what:
        'The January 2026 Ultralytics release and the direct successor to the YOLOv8n backbone used here. Removes Distribution Focal Loss from the head, adds an optional one-to-one head for native end-to-end inference without NMS, and trains with progressive loss, small-target-aware label assignment and the MuSGD optimiser. Small-target-aware assignment matters directly for price tags and partial facings.',
      metric: 'YOLO26n 40.9 mAP@50-95 COCO · 1.7 ms T4 TensorRT10 · 2.4M params · 5.5 GFLOPs · up to 43% faster CPU ONNX than YOLO11n',
      url: 'https://docs.ultralytics.com/models/yolo26/',
      year: '2026',
    },
    {
      name: 'RF-DETR',
      org: 'Roboflow',
      what:
        "A real-time detection transformer combining LW-DETR with a pretrained DINOv2 backbone, released March 2025 and still being updated in June 2026. It is the first real-time model to pass 60 mAP on COCO and it leads RF100-VL, the benchmark for transfer to custom real-world datasets, which is the property that matters for a 506-image shelf domain. Apache-2.0, so it carries no copyleft obligation.",
      metric: 'RF-DETR-Large 60.5 COCO mAP at ~40 ms on a T4 · RF-DETR-Small ~54 mAP at ~15 ms (67 FPS)',
      url: 'https://blog.roboflow.com/rf-detr/',
      year: '2025',
    },
    {
      name: 'D-FINE',
      org: 'USTC',
      what:
        'Redefines DETR box regression as fine-grained distribution refinement with global optimal localisation self-distillation. It set the real-time accuracy bar that YOLO26 and RF-DETR now trade against, and the self-distillation idea transfers to any DETR-style head at negligible parameter cost.',
      metric: 'D-FINE-L 54.0 AP at 124 FPS (T4) · D-FINE-X 55.8 AP at 78 FPS · 57.1 / 59.3 AP with Objects365 pretraining',
      url: 'https://arxiv.org/abs/2410.13842',
      year: '2024',
    },
    {
      name: 'DEIM',
      org: 'Southern University of Science and Technology / City University of Hong Kong',
      what:
        'A matching and training framework that fixes DETR slow convergence with dense one-to-one matching and a matchability-aware loss. It cuts training time roughly in half, which is the difference between a quarterly and a monthly retraining cadence for a shelf model that has to keep up with planogram resets.',
      metric: 'DEIM-D-FINE-L 54.7 AP at 124 FPS (T4) · DEIM-D-FINE-X 56.5 AP at 78 FPS · DEIM-RT-DETRv2 53.2 AP in one day on a single RTX 4090',
      url: 'https://arxiv.org/abs/2412.04234',
      year: '2024',
    },
    {
      name: 'YOLOE',
      org: 'Ultralytics',
      what:
        'Open-vocabulary detection and instance segmentation at YOLO speed. Classes are supplied at inference time as text prompts, image exemplars, or drawn from a built-in 4,585-name vocabulary. This is the most direct replacement for a fixed three-class shelf head: a new facing type, a new promotional display or a seasonal SKU becomes a prompt rather than an annotation project.',
      metric: 'YOLOE-26s 30.8 mAP@50-95 with text prompts · YOLOE-v8s beats YOLO-Worldv2-S by 3.5 AP at a third of the training cost and 1.4x the inference speed',
      url: 'https://docs.ultralytics.com/models/yoloe/',
      year: '2025',
    },
    {
      name: 'Grounding DINO 1.5',
      org: 'IDEA Research',
      what:
        'The strongest open-set detector with a deployable edge variant. The Pro model is the accuracy reference for prompted detection; the Edge model is distilled for real-time use on constrained hardware, which is the configuration a store server or Jetson can actually run alongside the primary detector.',
      metric: 'Pro: 54.3 COCO AP, 55.7 LVIS-minival zero-shot AP · Edge: 36.2 LVIS-minival AP at 75.2 FPS with TensorRT',
      url: 'https://arxiv.org/abs/2405.10300',
      year: '2024',
    },
    {
      name: 'OWLv2 / OWL-ST',
      org: 'Google DeepMind',
      what:
        'Scales open-vocabulary detection by self-training on web image-text pairs with no human box annotations for the rare classes. It is the reference result for long-tail vocabulary coverage, which is the retail failure mode: the top 200 SKUs are easy and the tail of 100,000 is where the detector loses recall.',
      metric: 'LVIS rare-class AP improved from 31.2 to 44.6 (43% relative) with an L/14 architecture',
      url: 'https://arxiv.org/abs/2306.09683',
      year: '2023',
    },
    {
      name: 'SAM 3',
      org: 'Meta AI',
      what:
        'Released 19 November 2025 and integrated into the ultralytics package. Promptable concept segmentation returns every instance of a concept named by a noun phrase or shown as an image exemplar, and tracks it through video. Too slow for the live path at roughly 2,921 ms per image on GPU and 473.6M parameters, but ideal as an offline auto-labelling engine and as a mask source for exact facing counts.',
      metric: '65.0 CGF1 zero-shot on SA-Co (88% of the human lower bound) · 47.0 LVIS zero-shot mask AP · 60.1 J&F on MOSEv2',
      url: 'https://docs.ultralytics.com/models/sam-3/',
      year: '2025',
    },
    {
      name: 'BoT-SORT / BoT-SORT-ReID',
      org: 'Tel Aviv University',
      what:
        'The tracking baseline that superseded plain ByteTrack: an improved Kalman filter state, camera-motion compensation and a fused IoU-plus-ReID association cost. Camera-motion compensation is the part that matters in stores, where pan-tilt-zoom heads and vibration break the constant-velocity assumption ByteTrack relies on.',
      metric: 'MOT17 test: 80.5 MOTA, 80.2 IDF1, 65.0 HOTA - first tracker past 80 IDF1',
      url: 'https://arxiv.org/abs/2206.14651',
      year: '2022',
    },
    {
      name: 'Browser-runnable ONNX detection stack (Transformers.js)',
      org: 'Hugging Face / ONNX Community',
      what:
        "Four verified Transformers.js-compatible repositories put this project's core loop in a browser tab with no server: onnx-community/yolov10n for closed-set detection, onnx-community/grounding-dino-tiny-ONNX and Xenova/owlv2-base-patch16-ensemble for text-prompted zero-shot detection, and Xenova/slimsam-77-uniform for mask generation. The open-vocabulary pair is the interesting one for a live shelf demo, because a visitor can type \"empty shelf space\" and see the model respond without any retraining.",
      metric: 'zero-shot-object-detection and mask-generation pipelines, Apache-2.0, quantised ONNX weights',
      url: 'https://huggingface.co/onnx-community/grounding-dino-tiny-ONNX',
      year: '2026',
    },
    {
      name: 'SKU-110K',
      org: 'Bar-Ilan University / Trax',
      what:
        'The public reference dataset for densely packed retail shelves and the benchmark a shelf detector has to publish against to be taken seriously. Single detection class, extreme density, small objects, heavy overlap and repetitive packaging. It is the external yardstick this project currently has no number on.',
      metric: '11,743 images, over 1.7M annotated products, ~147 objects per image, 8,219 / 588 / 2,936 train-val-test split',
      url: 'https://docs.ultralytics.com/datasets/detect/sku-110k/',
      year: '2019',
    },
  ],
  benchmarks: [
    {
      name: 'Backbone COCO mAP@50-95 (nano class)',
      sota: 'YOLO26n, 40.9 (1.7 ms on T4 TensorRT10, 2.4M params)',
      sotaBy: 'Ultralytics, January 2026',
      project: 'YOLOv8n backbone, 37.3 (0.99 ms on A100 TensorRT, 3.2M params)',
      sotaValue: 40.9,
      projectValue: 37.3,
      unit: 'mAP@50-95',
      higherIsBetter: true,
    },
    {
      name: 'Detector size at the nano tier',
      sota: 'YOLO26n, 2.4M parameters and 5.5 GFLOPs',
      sotaBy: 'Ultralytics, January 2026',
      project: 'YOLOv8n, 3.2M parameters and 8.7 GFLOPs (6.2 MB ONNX export)',
      sotaValue: 2.4,
      projectValue: 3.2,
      unit: 'M parameters',
      higherIsBetter: false,
    },
    {
      name: 'Zero-shot open-vocabulary detection (LVIS AP)',
      sota: 'Grounding DINO 1.5 Pro, 55.7 LVIS-minival; Edge variant 36.2 at 75.2 FPS',
      sotaBy: 'IDEA Research, 2024',
      project: 'Zero - fixed 3-class head, every new facing type needs relabelling and a retrain',
      sotaValue: 55.7,
      projectValue: 0,
      unit: 'LVIS AP',
      higherIsBetter: true,
    },
    {
      name: 'Multi-object tracking identity consistency (IDF1)',
      sota: 'BoT-SORT-ReID, 80.2 IDF1 on MOT17 test',
      sotaBy: 'Aharon et al., 2022',
      project: 'ByteTrack, 74.0 IDF1 on in-store shopper tracks',
      sotaValue: 80.2,
      projectValue: 74.0,
      unit: 'IDF1',
      higherIsBetter: true,
    },
    {
      name: 'Shelf training-set scale',
      sota: 'SKU-110K, 11,743 images with over 1.7M boxes (~147 objects per image)',
      sotaBy: 'Goldman et al., CVPR 2019',
      project: '506 real annotated images, augmented to 2,024 samples',
      sotaValue: 11743,
      projectValue: 506,
      unit: 'annotated images',
      higherIsBetter: true,
    },
    {
      name: 'Edge inference latency per frame',
      sota: 'YOLO26n, 1.7 ms on a T4 with TensorRT10 (38.9 ms CPU ONNX)',
      sotaBy: 'Ultralytics, January 2026',
      project: 'Under 45 ms per frame on a Jetson Orin, 6.2 MB ONNX graph',
      sotaValue: 1.7,
      projectValue: 45,
      unit: 'ms / frame',
      higherIsBetter: false,
    },
  ],
  upgrades: [
    {
      title: 'Retrain the detector on YOLO26n with the end-to-end head',
      body:
        "Straight substitution of the backbone: same 640 px input, same 506-image dataset, same augmentation recipe. YOLO26n carries 2.4M parameters and 5.5 GFLOPs against YOLOv8n's 3.2M and 8.7, reports 40.9 against 37.3 COCO mAP@50-95, and its small-target-aware label assignment targets exactly the class this project is weakest on (price tags, at 0.489 AP@50-95). Exporting the one-to-one end-to-end head removes NMS from the ONNX graph, which is the largest fixed cost left in the sub-45 ms budget and the part that does not shrink with quantisation. Re-measure mAP@50, mAP@50-95 and per-frame latency on the Jetson Orin before and after; treat the existing 0.841 as the regression gate.",
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Add a prompted second stage so new facings need no retrain',
      body:
        'Keep the fine-tuned closed head as the fast path and run an open-vocabulary model as a second stage on low-confidence regions and on any SKU or fixture the head has never seen. YOLOE ships inside the ultralytics package with a 4,585-name vocabulary and accepts text or image-exemplar prompts; Grounding DINO 1.5 Edge is the higher-accuracy option at 36.2 LVIS AP and 75.2 FPS under TensorRT. The operational payoff is that a category reset or a new promotional fixture becomes a prompt string in a config file rather than an annotation cycle, which is the single largest hidden cost in every deployed shelf-vision system.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Auto-label with SAM 3 and Grounding DINO to reach publishable dataset scale',
      body:
        'SAM 3 returns every instance of a noun-phrase concept at 47.0 LVIS zero-shot mask AP and 65.0 CGF1 on SA-Co, and it runs offline where its ~2,921 ms per image does not matter. Pair it with Grounding DINO 1.5 for boxes, run it over unlabelled store footage, and have annotators verify rather than draw. Moving from 506 images toward the 11,743-image, 1.7M-box density of SKU-110K is what converts an internal 0.841 into a number a buyer can compare. Hold out a hand-labelled test split so the auto-labels never contaminate evaluation.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Publish a SKU-110K number',
      body:
        'The project has no external benchmark result, which is the weakest point in any technical due-diligence conversation. SKU-110K is the accepted public test for densely packed shelves: 2,936 test images at roughly 147 objects each, single class, heavy overlap. Train and evaluate the current pipeline on it as a second head and report mAP@50 and mAP@50-95 alongside the in-domain figures. It also stress-tests the NMS path at object densities far above anything in the 506-image set, which is where a fixed max-detections cap silently truncates.',
      impact: 'high',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Replace ByteTrack with BoT-SORT plus camera-motion compensation',
      body:
        "ByteTrack at IDF1 0.74 is six points behind BoT-SORT-ReID's 80.2 on MOT17, and the gap is concentrated in exactly the conditions stores produce: camera shake, pan-tilt-zoom drift and long occlusions behind gondola ends. BoT-SORT adds camera-motion compensation and an IoU-plus-ReID fused association cost. Identity consistency is not cosmetic here - dwell time, queue-wait estimation and the void-duration timer that prices every alert all depend on a track surviving an occlusion, so an IDF1 gain propagates straight into the lost-sales figure.",
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Ship a browser demo on Transformers.js',
      body:
        "Four verified repositories make a zero-install demo possible: onnx-community/yolov10n for the closed-set detector, onnx-community/grounding-dino-tiny-ONNX and Xenova/owlv2-base-patch16-ensemble for text-prompted detection, Xenova/slimsam-77-uniform for masks and Xenova/yolos-tiny as a small fallback. All run through the @huggingface/transformers zero-shot-object-detection and mask-generation pipelines on WebGPU or WASM. The prompted models are the demo: a visitor uploads a shelf photo, types \"empty shelf space\" and watches boxes appear, which communicates the open-vocabulary argument far better than a screenshot.",
      impact: 'medium',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Segment facings instead of counting boxes',
      body:
        'Occupancy is currently detected facings divided by expected facings, which is a box-count proxy and degrades where products are stacked, angled or partially pulled forward. SAM 3 masks give pixel-accurate shelf-area coverage, so occupancy becomes a measured area ratio and the 60% restock line and 80% planogram target stop drifting with camera angle. Run the segmentation on a slow cadence - one frame in fifty - and interpolate with the fast detector between them to keep the per-frame budget intact.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Settle the licence position before any commercial release',
      body:
        'Ultralytics YOLO26 ships under AGPL-3.0, which requires derivative works to be open-sourced unless a commercial licence is bought. A shelf product that embeds the weights in a closed edge binary is squarely a derivative work. There are two clean paths: buy the Ultralytics commercial licence, or move the production detector to RF-DETR, which is Apache-2.0 and reports 60.5 COCO mAP for the Large variant with no copyleft obligation. This is an engineering decision with a legal deadline, and it should be made before the first paying deployment, not after.',
      impact: 'high',
      effort: 'days',
      status: 'planned',
    },
  ],
  compliance: [
    {
      name: 'EU AI Act - keep shopper tracking non-biometric',
      body:
        "Article 5(1)(g) prohibits biometric categorisation systems that categorise natural persons to deduce or infer race, political opinions, trade union membership, religious or philosophical beliefs, sex life or sexual orientation; Article 5(1)(f) prohibits inferring emotions in the workplace, which covers store staff caught by the same cameras. Prohibitions have applied since 2 February 2025, the bulk of the Act from 2 August 2026 and the remaining high-risk obligations from 2 August 2027. The design consequence is concrete: ByteTrack identities must stay geometric and session-scoped, with no face embeddings, no re-identification across visits and no demographic or emotion inference. Doing so keeps the system outside the prohibited categories entirely rather than relying on an exemption.",
      url: 'https://artificialintelligenceact.eu/article/5/',
    },
    {
      name: 'GDPR video surveillance - EDPB Guidelines 3/2019',
      body:
        'Adopted 30 January 2020, these are the operative rules for any camera in a European store. A lawful basis is required before deployment; legitimate interest demands a documented balancing test against shopper expectations; biometric templates derived from video are special-category data with a much higher bar; signage must be visible at entry points and name the controller and purposes; and only what is necessary may be recorded or retained. A shelf-void system has a strong legitimate-interest case precisely because it does not need to identify anyone - the argument holds only while frames are processed on the edge device and discarded rather than streamed to a cloud archive.',
      url: 'https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32019-processing-personal-data-through-video_en',
    },
    {
      name: 'Illinois BIPA - reduced but not removed exposure',
      body:
        'BIPA carries liquidated damages of $1,000 to $5,000 per violation. The August 2024 amendment replaced per-scan accrual with per-person accrual, so repeated collection of the same person by the same method is a single violation, and in April 2026 the Seventh Circuit held that limitation applies retroactively to pending cases. Damages are smaller; the obligations are unchanged. Any system that derives a face geometry or other biometric identifier from Illinois store footage still needs written notice, informed written consent and a published retention and destruction schedule. Body-only detection with no facial landmarks and no persistent identifier avoids the statute rather than complying with it, which is the safer design.',
      url: 'https://www.foley.com/insights/publications/2026/04/bipa-alert-seventh-circuit-ruling-applies-bipa-amendments-retroactively-ending-per-scan-exposure-for-companies-operating-in-illinois/',
    },
    {
      name: 'Model licensing - AGPL-3.0 on the Ultralytics line',
      body:
        'YOLO26 and the Ultralytics package ship under AGPL-3.0, which requires derivative works to be released as open source unless a commercial licence is obtained. This applies to the fine-tuned weights and to any binary that links the runtime, including an edge appliance shipped to a retailer. RF-DETR is Apache-2.0 and reports 60.5 COCO mAP at the Large size, and SAM 3 weights are gated behind a separate request on Hugging Face. Licence provenance for every model in the pipeline belongs in the same governance record as the accuracy metrics.',
      url: 'https://blog.roboflow.com/yolo26/',
    },
  ],
  sources: [
    { title: 'Ultralytics YOLO26 - model documentation and COCO benchmark table', url: 'https://docs.ultralytics.com/models/yolo26/', org: 'Ultralytics', date: '2026-01' },
    { title: 'Ultralytics supported models index (YOLO26, YOLO12, YOLO11, RT-DETR, YOLO-World, YOLOE, SAM 3)', url: 'https://docs.ultralytics.com/models/', org: 'Ultralytics', date: '2026-09' },
    { title: 'YOLOv8 model documentation and COCO benchmark table', url: 'https://docs.ultralytics.com/models/yolov8/', org: 'Ultralytics' },
    { title: 'YOLO26: YOLO Model for Real-Time Vision AI', url: 'https://blog.roboflow.com/yolo26/', org: 'Roboflow', date: '2026-01' },
    { title: 'RF-DETR: a real-time detection transformer past 60 mAP on COCO', url: 'https://blog.roboflow.com/rf-detr/', org: 'Roboflow', date: '2026-06' },
    { title: 'D-FINE: Redefine Regression Task in DETRs as Fine-grained Distribution Refinement', url: 'https://arxiv.org/abs/2410.13842', org: 'arXiv 2410.13842', date: '2024-10' },
    { title: 'DEIM: DETR with Improved Matching for Fast Convergence', url: 'https://arxiv.org/abs/2412.04234', org: 'arXiv 2412.04234', date: '2024-12' },
    { title: 'YOLOE: real-time open-vocabulary detection and segmentation', url: 'https://docs.ultralytics.com/models/yoloe/', org: 'Ultralytics', date: '2025' },
    { title: 'YOLO-World: Real-Time Open-Vocabulary Object Detection', url: 'https://arxiv.org/abs/2401.17270', org: 'arXiv 2401.17270', date: '2024-01' },
    { title: 'Grounding DINO 1.5: Advance the "Edge" of Open-Set Object Detection', url: 'https://arxiv.org/abs/2405.10300', org: 'arXiv 2405.10300', date: '2024-05' },
    { title: 'Scaling Open-Vocabulary Object Detection (OWLv2 / OWL-ST)', url: 'https://arxiv.org/abs/2306.09683', org: 'arXiv 2306.09683', date: '2023-06' },
    { title: 'SAM 3 - promptable concept segmentation, benchmarks and Ultralytics integration', url: 'https://docs.ultralytics.com/models/sam-3/', org: 'Meta AI / Ultralytics', date: '2025-11' },
    { title: 'BoT-SORT: Robust Associations Multi-Pedestrian Tracking', url: 'https://arxiv.org/abs/2206.14651', org: 'arXiv 2206.14651', date: '2022-06' },
    { title: 'SKU-110K dataset - images, boxes, splits and object density', url: 'https://docs.ultralytics.com/datasets/detect/sku-110k/', org: 'Ultralytics' },
    { title: 'Precise Detection in Densely Packed Scenes (SKU-110K, CVPR 2019)', url: 'https://arxiv.org/abs/1904.00853', org: 'arXiv 1904.00853', date: '2019-04' },
    { title: 'Using Ultralytics YOLO26 for planogram compliance detection', url: 'https://www.ultralytics.com/blog/using-ultralytics-yolo26-for-planogram-compliance-detection', org: 'Ultralytics', date: '2026-04' },
    { title: 'onnx-community/grounding-dino-tiny-ONNX - browser zero-shot detection', url: 'https://huggingface.co/onnx-community/grounding-dino-tiny-ONNX', org: 'Hugging Face' },
    { title: 'Xenova/owlv2-base-patch16-ensemble - Transformers.js zero-shot detection', url: 'https://huggingface.co/Xenova/owlv2-base-patch16-ensemble', org: 'Hugging Face' },
    { title: 'onnx-community/yolov10n - Transformers.js object detection', url: 'https://huggingface.co/onnx-community/yolov10n', org: 'Hugging Face' },
    { title: 'Xenova/slimsam-77-uniform - Transformers.js mask generation', url: 'https://huggingface.co/Xenova/slimsam-77-uniform', org: 'Hugging Face' },
    { title: 'Xenova/yolos-tiny - Transformers.js object detection', url: 'https://huggingface.co/Xenova/yolos-tiny', org: 'Hugging Face' },
    { title: 'EU AI Act, Article 5 - prohibited AI practices', url: 'https://artificialintelligenceact.eu/article/5/', org: 'EU AI Act (artificialintelligenceact.eu)', date: '2025-02' },
    { title: 'EU AI Act implementation timeline', url: 'https://artificialintelligenceact.eu/implementation-timeline/', org: 'EU AI Act (artificialintelligenceact.eu)' },
    { title: 'EDPB Guidelines 3/2019 on processing of personal data through video devices', url: 'https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32019-processing-personal-data-through-video_en', org: 'European Data Protection Board', date: '2020-01' },
    { title: 'Seventh Circuit applies BIPA damages amendments retroactively', url: 'https://www.foley.com/insights/publications/2026/04/bipa-alert-seventh-circuit-ruling-applies-bipa-amendments-retroactively-ending-per-scan-exposure-for-companies-operating-in-illinois/', org: 'Foley & Lardner', date: '2026-04' },
  ],
}

export default frontier
