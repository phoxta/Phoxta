/**
 * P15 · Facial Emotion Detection — the commercial layer.
 *
 * Positioning is constrained by law, not by taste. EU AI Act Article 5(1)(f) has prohibited
 * emotion inference in workplace and education contexts since 2 February 2025; every other
 * emotion-recognition system sits in Annex III point 1(c) as high risk, with Article 50(3)
 * transparency duties. The product therefore targets one lawful, consented market — advertising
 * and creative-effectiveness testing with explicit informed consent — and refuses the rest.
 */
import {
  AccessibilityIcon, BeakerIcon, ChecklistIcon, ClockIcon, CommentDiscussionIcon, CpuIcon,
  DatabaseIcon, EyeIcon, GraphIcon, HistoryIcon, HourglassIcon, LawIcon, MegaphoneIcon, MeterIcon,
  NumberIcon, PeopleIcon, PlayIcon, PulseIcon, ShieldSlashIcon, SparkleIcon, StopwatchIcon,
  XCircleIcon, ZapIcon,
} from '@primer/octicons-react'
import type { Product } from '../product'

const product: Product = {
  name: 'Assentia',
  tagline: 'Second-by-second audience response to creative, measured only on people who said yes',
  positioning:
    'Assentia measures the facial response of consented research panellists to advertising and entertainment creative, and returns a per-second attention and valence curve joined to the shot list. It is built for brand and agency creative-effectiveness teams, and it is deliberately unsellable for workplace monitoring, hiring or classroom use: those contexts are prohibited by EU AI Act Article 5(1)(f) and are refused at the API key, not in a contract clause. Where incumbents sell an inference about what a person felt, Assentia reports what the face did, how confident the measurement is, and when there was no measurable response at all.',
  category: 'Consented audience-response measurement for creative testing',
  market: {
    size:
      'The Business Research Company sizes global market research services at USD 93.37bn in 2025, forecast to USD 116.02bn by 2030 — a modelled estimate, not a measurement. Creative and advertising pre-testing is the slice Assentia sells into, alongside entertainment content testing.',
    growth:
      '4.6% CAGR on that forecast to 2030. The measurement layer inside it is growing faster than the research spend it sits on, because the number of creative variants requiring a decision has risen far faster than research budgets.',
    whyNow:
      'Three things changed between February 2025 and July 2026. First, Article 5(1)(f) took effect on 2 February 2025 and removed workplace and education emotion analytics from the European market entirely, which stranded the vendors whose revenue mixed prohibited and lawful uses. Second, the Digital Omnibus on AI entered into force on 27 July 2026 and moved the Annex III high-risk obligations from 2 August 2026 to 2 December 2027, giving a compliant vendor a defined fifteen-month window to build the technical documentation, logging and bias-audit exports the incumbents will have to retrofit. Third, Realeyes — the best-known consented webcam ad-testing vendor, with Google, Kantar, Mars, Meta, Nielsen, Procter & Gamble, Publicis, Snap and WPP on its client wall — now leads with VerifEye, a human-verification product for onboarding and account recovery. The category leader has moved to identity, and its ad-testing buyers have no roadmap.',
  },
  personas: [
    {
      title: 'Head of Creative Effectiveness, global FMCG advertiser',
      segment: 'Brands spending USD 100m+ a year in working media across 20+ markets',
      jobToBeDone:
        'Decide which of forty cut-downs of the same campaign go to air, and be able to show the CMO why — at the level of "the product shot at 0:07 loses them", not "the ad scored 62".',
      statusQuo:
        'A survey-based copy test with a 200-person sample and a two-week turnaround, plus a facial-coding add-on from a vendor that will not publish a price, will not disclose per-group accuracy, and reports seven basic emotions that the brand"s own data-science team does not believe.',
      successMetric: 'Share of campaigns where the pre-test prediction matched the in-market brand-lift result',
    },
    {
      title: 'Insights Director, creative and media agency',
      segment: 'Agencies running 50-300 creative tests a year on behalf of client brands',
      jobToBeDone:
        'Turn a client argument about which edit is better into a defensible measurement inside the production window, without a lab booking or a hardware shipment.',
      statusQuo:
        'Either a lab study on a biosensor platform whose modules are quoted individually and whose vendor states that every quote is unique, or an unmoderated qualitative panel that captures what people say afterwards rather than what happened during.',
      successMetric: 'Tests completed per quarter, and the proportion of client creative decisions with evidence attached',
    },
    {
      title: 'VP Content Research, streaming and entertainment',
      segment: 'Studios and streamers testing trailers, cold opens, key art and pilot episodes',
      jobToBeDone:
        'Find the exact second a trailer loses a consented test audience, across territories, before spending the marketing budget behind it.',
      statusQuo:
        'Dial testing and post-view recall in a facility, with a panel too small to cut by territory and a signal too coarse to locate a problem inside a 90-second cut.',
      successMetric: 'Trailer completion and click-through in market versus the pre-test drop-off prediction',
    },
  ],
  pains: [
    {
      title: 'Variant count has outrun the research budget',
      body: 'A campaign that shipped four edits in 2022 now ships forty, because generating the variants is nearly free and choosing between them is not. Survey-based pre-testing prices per respondent per cell, so testing forty variants properly costs ten times what testing four cost, and the honest answer inside most brands is that thirty-six of them go to air untested.',
      cost: 'Most variants reach air with no measurement attached',
      icon: HourglassIcon,
    },
    {
      title: 'Post-view self-report cannot locate the problem',
      body: 'Asking someone what they thought after a 60-second spot returns an average over 60 seconds. It tells a team the ad underperformed; it does not tell them that attention collapsed at 0:07 and never recovered. The decision that needs evidence is an edit decision, and an edit decision needs a timeline.',
      cost: 'A score, when what is needed is a timestamp',
      icon: ClockIcon,
    },
    {
      title: 'The seven-emotion claim does not survive scrutiny',
      body: 'Barrett and colleagues meta-analysed 47 studies in Psychological Science in the Public Interest and found average effect sizes of r = .32, with category-specific proportions between .15 and .25, concluding that facial configurations lack sufficient reliability and specificity across contexts, individuals and cultures to be diagnostic of any emotional state. Any vendor dashboard whose headline is "this ad made 34% of viewers happy" is making a claim the literature does not support, and a competent client-side data-science team will say so in the review.',
      cost: 'The measurement gets thrown out in the room it was bought for',
      icon: BeakerIcon,
    },
    {
      title: 'Legal blocks the purchase, and is right to',
      body: 'Since 2 February 2025 the EU AI Act has prohibited emotion inference in workplace and education contexts, with fines up to EUR 35,000,000 or 7% of total worldwide annual turnover. Procurement now asks whether the vendor also sells into those contexts, whether consent is explicit and recorded, and what the Article 50(3) disclosure looks like. Most emotion-AI vendors cannot answer the first question with a clean no.',
      cost: 'Up to EUR 35m or 7% of global turnover for the prohibited-use tier',
      icon: LawIcon,
    },
    {
      title: 'Nobody in the category publishes a price',
      body: 'Across the vendors a buyer would shortlist — Affectiva, Realeyes, iMotions, Tobii, UserTesting and Zappi — not one publishes a list price. iMotions states plainly that a precise price overview is difficult because every quote is unique; UserTesting says pricing varies by users, types and features; Zappi routes to sales for subscription plus credit bundles. Budgeting a test programme therefore requires a sales cycle before a number exists.',
      cost: 'Six vendor sites checked, zero published prices',
      icon: NumberIcon,
    },
    {
      title: 'Consented panel time is the real unit cost, and it is opaque too',
      body: 'Prolific is the rare vendor that publishes: a minimum participant rate of GBP 6.00 / USD 8.00 per hour, a recommended GBP 9.00 / USD 12.00, and a commercial service fee of 42.8% (33.3% for academic and non-profit users). That puts a five-minute consented session at roughly USD 1.40-1.70 in incentive alone. Teams that cannot see that number cannot tell whether a quote is mostly panel or mostly margin.',
      cost: 'USD 1.40-1.70 per five-minute consented session in incentive before any platform fee',
      icon: PeopleIcon,
    },
  ],
  wedge: {
    title: 'The consent record is the product',
    body: 'Every other vendor treats consent as paperwork attached to a measurement. Assentia inverts it: the measurement does not exist without a session-level consent artefact that names the purpose, the jurisdiction, the retention position and the withdrawal route, and every row in every export carries that artefact"s identifier. Deployment context is a required, attested field on the API key, and workplace, hiring and education contexts are refused at the token — so the answer to procurement"s first question is a documented no rather than a promise. That is not a compliance feature bolted on the side. It is the reason a brand"s legal team can approve the purchase in the fifteen months before the Annex III obligations bite on 2 December 2027.',
  },
  features: [
    {
      name: 'Session consent ledger',
      summary: 'Every measurement is joined to a signed, specific consent artefact.',
      detail:
        'Before a webcam is enabled the panellist sees a purpose-specific disclosure and gives explicit, recorded consent under GDPR Article 9(2)(a), with the stimulus, the sponsor category, the retention position and the withdrawal route stated in plain language. The artefact is hashed, timestamped and written to an append-only ledger; every downstream row — curve, frame vector, aggregate — carries its identifier, so withdrawing consent deletes a traceable set rather than triggering a search. Illinois panellists additionally receive the written notice and release BIPA requires before a face scan.',
      icon: ChecklistIcon,
      tier: 'starter',
    },
    {
      name: 'Prohibited-context refusal at the key',
      summary: 'Workplace, hiring and education studies cannot be run, not merely must not be.',
      detail:
        'Deployment context is a required attested field on every API key and every study: market research, entertainment testing, accessibility research or academic study. Workplace, employee, recruitment, candidate-assessment and education-institution contexts are rejected at token issue and again at study creation, and the refusal is logged. Article 5(1)(f) carries fines up to EUR 35,000,000 or 7% of worldwide annual turnover, so the control is enforced in code and repeated in the contract rather than the other way round.',
      icon: ShieldSlashIcon,
      tier: 'starter',
    },
    {
      name: 'On-device measurement in the browser',
      summary: 'The frame never leaves the panellist"s machine.',
      detail:
        'Detection and expression inference run client-side on ONNX Runtime through Transformers.js, over WASM on CPU and WebGPU where the browser supports it. A nano YOLOv11 face detector (WIDER FACE AP 0.942 easy, 0.921 medium, 0.810 hard) crops and aligns; a quantised ViT expression graph and the multi-task head run on the crop. What leaves the device is a per-frame vector and the derived curve, never an image and never a video stream, which removes both the bandwidth cost and the largest category of panellist objection.',
      icon: CpuIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'Per-second response curves',
      summary: 'Attention and valence over the timeline, aligned to the shot list.',
      detail:
        'Frame-level outputs are resampled to a fixed grid and aggregated across the panel into a median curve with a bootstrap interval, then aligned to stimulus timecode. Upload an EDL or a shot list and each cut, product reveal, brand frame and voice-over line gets its own segment statistics, so the output is "the response falls 0.31 valence across the cut at 0:07" rather than a single score for the asset.',
      icon: GraphIcon,
      tier: 'starter',
    },
    {
      name: 'Valence and arousal as the primary signal',
      summary: 'A continuous two-dimensional reading, with the categorical label demoted to an annotation.',
      detail:
        'The regression head returns a continuous position on the circumplex in [-1, 1] on each axis, which is smoother across a clip than a seven-way argmax and does not require committing to a category the science does not support. The categorical output is retained as a secondary field for teams with existing norms, clearly marked as a lower-confidence derived value. Valence and arousal are reported and scored separately because they behave differently: the 10th ABAW leader reached CCC 0.6078 on valence and 0.7073 on arousal on Aff-Wild2.',
      icon: PulseIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'FACS action-unit evidence trail',
      summary: 'The muscle movements behind every reading, and the attention map that produced them.',
      detail:
        'A multi-label sigmoid head returns facial action units (AU1 inner-brow raise, AU4 brow lowerer, AU6 cheek raiser, AU12 lip-corner pull and the rest), and the learned spatial attention map used for pooling is exported as an overlay. An analyst defending a finding can show which regions the model weighted and which action units fired, rather than asserting a label. Mouth, eyes and brows carry the majority of the attention mass, which is the same evidence a human FACS coder uses.',
      icon: EyeIcon,
      tier: 'growth',
    },
    {
      name: 'Explicit no-signal state',
      summary: 'The system is allowed to say there was no measurable response.',
      detail:
        'A softmax always returns a class, which is exactly the failure mode that discredits the category: in a 2025 driving-simulator study, 15 of 24 participants showed no detectable facial reaction to a critical event at all. Assentia gates every reading on calibrated top-1 confidence after temperature scaling, attention-map entropy and an action-unit activation floor, and returns a no-reliable-signal state below the gate. Coverage is reported next to every curve, so a flat line is legible as absence of evidence rather than evidence of neutrality.',
      icon: XCircleIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Real-time multi-face batching',
      summary: 'Co-viewing sessions cost little more than solo sessions.',
      detail:
        'All faces detected in a frame are batched into a single ONNX run, so a household watching together is measured in one pass. Single-face inference is 17.3 ms on CPU, under the 30 ms per-frame budget, and per-face cost falls with batch size, which keeps a co-viewing panel inside a real-time frame budget on ordinary laptop hardware.',
      icon: StopwatchIcon,
      tier: 'growth',
    },
    {
      name: 'Article 50(3) disclosure kit',
      summary: 'The transparency artefact the deployer is required to show, generated per study.',
      detail:
        'Article 50(3) obliges the deployer of an emotion-recognition system to inform the natural persons exposed to it of the system"s operation and to process their data under the GDPR. Assentia generates the disclosure text, the localised panellist-facing notice, the DPIA input pack and the record-of-processing entry for each study from the study"s own configuration, so the artefact matches what actually ran rather than a template written once.',
      icon: MegaphoneIcon,
      tier: 'growth',
    },
    {
      name: 'Per-group performance reporting',
      summary: 'Accuracy and abstention broken out by group, published with the study.',
      detail:
        'The ICO"s standing warning about emotion analysis is bias and inaccuracy, and the Annex III regime will demand the evidence from 2 December 2027. Every study ships a performance appendix cutting accuracy, calibration error and abstention rate by apparent age band, skin tone, spectacles, facial hair and head yaw against a held-out reference set, with the worst group reported alongside the mean. Studies whose panel composition leaves a group below the sample floor are flagged before fielding, not after.',
      icon: AccessibilityIcon,
      tier: 'growth',
    },
    {
      name: 'Stimulus library and cut comparison',
      summary: 'Version the creative, not just the study.',
      detail:
        'Assets are stored with their timecode, EDL and metadata, and variants are linked as a family so a 30-second cut, its 15 and its 6 share a comparison view. Differential curves show where two cuts of the same asset diverge, with the segment-level statistics that support or refute the change, which is the artefact an agency actually takes into a client review.',
      icon: PlayIcon,
      tier: 'growth',
    },
    {
      name: 'Study API and warehouse export',
      summary: 'Curves, segments and consent identifiers land in the warehouse alongside brand-lift data.',
      detail:
        'A REST API exposes study creation, panel targeting, stimulus upload, per-frame vectors, aggregated curves and segment statistics, with signed webhooks on completion. Scheduled exports write partitioned Parquet to Snowflake or object storage with the consent artefact identifier on every row, so a deletion request propagates through the warehouse and so in-market brand-lift results can be joined back to the pre-test prediction.',
      icon: DatabaseIcon,
      tier: 'enterprise',
    },
  ],
  aiFeatures: [
    {
      name: 'Attention-pooled multi-task backbone',
      summary: 'One EfficientNet-B4 pass produces the category, the continuous position and the action units.',
      detail:
        'A learned spatial attention map replaces global average pooling over the 7x7 feature grid, so the head reads mouth, eyes and brows rather than background, and the map doubles as the explanation. Three heads share the pooled vector: a seven-way softmax, a two-output regression for valence and arousal, and a multi-label AU sigmoid. Training the continuous targets jointly acts as regularisation on the categorical head — the deployed model reaches 72.4% on the FER2013 private test set, against roughly 65% human annotator agreement on that corpus.',
      icon: SparkleIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'Temporal sequence model over pooled features',
      summary: 'Response is read from the transition, not from the frame.',
      detail:
        'A bidirectional recurrent layer runs over the pooled per-frame vectors of a sliding window before the heads, replacing exponential-moving-average smoothing, which can only filter a signal it has already been given. The published evidence for the design is unambiguous: at the 8th ABAW challenge a DDAMFN-plus-LSTM entry lifted valence-arousal CCC from an official baseline of 0.22 to 0.479 and action-unit F1 from 0.39 to 0.451 on the same features.',
      icon: HistoryIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Open-vocabulary description head',
      summary: 'A sentence about what the face did, instead of one of seven boxes.',
      detail:
        'A distilled description layer in the AffectGPT and Emotion-LLaMA direction emits a short natural-language description of the observed movement and its trajectory, deliberately phrased about the face rather than about an inner state. The design follows the field: AffectGPT"s MER-Caption corpus spans over 2,000 fine-grained emotion categories across 115K samples precisely because a seven-class taxonomy does not survive contact with real footage.',
      icon: CommentDiscussionIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Calibration and per-respondent baselining',
      summary: 'Every reading is scored against that person"s own resting face.',
      detail:
        'Each session opens with a neutral-stimulus calibration segment that fixes a per-respondent baseline for valence, arousal and AU activation, so a naturally expressive panellist and a naturally flat one are comparable. Confidences are temperature-scaled on a held-out split and reported with reliability curves, and panel aggregates are computed on baseline-corrected deltas rather than raw scores.',
      icon: MeterIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Creative diagnostic agent',
      summary: 'Turns a curve and a shot list into the three edit notes worth acting on.',
      detail:
        'A language model reads the segment statistics, the action-unit trail, the abstention pattern and the stimulus metadata, and writes the diagnosis: which segments moved the panel, which lost it, where coverage was too thin to say anything, and what the differential against the sibling cut implies. It is constrained to cite the segment and the interval behind every statement, and is instructed to report insufficient evidence rather than narrate noise.',
      icon: ZapIcon,
      ai: true,
      tier: 'enterprise',
    },
  ],
  competitors: [
    {
      name: 'Affectiva (Smart Eye)',
      url: 'https://www.affectiva.com/',
      strength:
        'The incumbent data moat: Media Analytics plus an Emotion SDK, built on what the company calls the world"s largest emotion database — 18 years of data from 90 countries, 17.4M face videos and 8B facial frames — and used by, on its own figures, 90% of the world"s largest advertisers and 26% of the Global Fortune 500.',
      gap:
        'The same company sells In-Cabin Sensing AI for driver and occupant monitoring. A buyer who needs to certify that its measurement vendor has no prohibited or contested-use surface cannot get that assurance from a vendor whose second product line is exactly the use the 2025 automated-driving literature found unreliable. No pricing is published.',
      pricing: 'Not published',
    },
    {
      name: 'Realeyes',
      url: 'https://realeyes.ai/',
      strength:
        'The best-known consented-webcam name in advertising research, with Google, Kantar, Mars, Meta, Nielsen, Procter & Gamble, Publicis, Snap and WPP shown as clients.',
      gap:
        'The company now leads with VerifEye, a human-verification suite (Onboard, Reverify, Protect, Recover) for sign-up, re-confirmation, high-risk transactions and account recovery. Attention and emotion metrics no longer appear on the front of the site. Creative-effectiveness buyers are on a platform whose roadmap has moved to identity.',
      pricing: 'Not published',
    },
    {
      name: 'iMotions',
      url: 'https://imotions.com/pricing/',
      strength:
        'The most complete multimodal research lab in the category: eye tracking (screen, VR, glasses, webcam), facial expression analysis including a multiface variant, EDA/GSR, EEG, ECG, EMG, voice and motion capture, under academic and commercial licences.',
      gap:
        'It is lab software sold by the module, with an explicitly bespoke quote — the FAQ states that a precise price overview is difficult because every quote is unique. There is no self-serve path from a creative brief to a fielded consented panel, and the panel is the customer"s problem.',
      pricing: 'Per-module subscriptions, quoted individually; no list price',
    },
    {
      name: 'Tobii',
      url: 'https://www.tobii.com/products/software',
      strength:
        'The eye-tracking standard. Tobii Pro Lab for screen-based studies, Glasses Explore for field work, and Tobii Sticky as a market-research platform for packaging, advertising and usability studies, with free SDKs and APIs around the hardware.',
      gap:
        'Gaze answers where attention went, not how the viewer responded, and the strongest configurations are anchored to hardware and a facility. Nothing in the research software line is priced publicly.',
      pricing: 'Not published; SDKs and Eye Tracker Manager are free',
    },
    {
      name: 'UserTesting',
      url: 'https://www.usertesting.com/plans',
      strength:
        'The largest managed participant network for unmoderated research, with Advanced, Ultimate and Ultimate+ plans and two consumption models — test-based (pay by tests run, unlimited users) or team-based unlimited within a defined enterprise scope.',
      gap:
        'The output is recorded video and self-report, which is qualitative depth rather than a calibrated timeline. There is no continuous per-second response signal to align to a cut, and pricing is negotiated by users, types and features rather than published.',
      pricing: 'Not published; test-based or team-based unlimited consumption',
    },
    {
      name: 'Zappi',
      url: 'https://www.zappi.io/web/pricing/',
      strength:
        'Automated consumer-insight testing at scale with a clean commercial model — a Premium subscription for a single brand or Enterprise for global scale, funded by credit bundles, with a price estimator for existing customers.',
      gap:
        'Survey-instrument based. It returns what respondents report after exposure, so it cannot locate a problem inside a 90-second cut, and it has no facial-response layer to add one. No dollar figures are published on the pricing page.',
      pricing: 'Subscription plus credit bundles; no published figures',
    },
  ],
  pricing: [
    {
      id: 'starter',
      name: 'Study',
      monthly: 490,
      annual: 390,
      tagline: 'One team, one live study at a time, full consent and disclosure machinery from day one.',
      meter: '500 consented sessions per month · 1 concurrent study · 3 seats',
      features: [
        'Session consent ledger and withdrawal handling',
        'Prohibited-context refusal at the API key',
        'On-device browser measurement — frames never leave the panellist device',
        'Per-second attention and valence curves with bootstrap intervals',
        'Valence and arousal as the primary signal; categorical label as annotation',
        'Bring your own panel, or connect Prolific or UserTesting',
        'EU or UK data residency',
      ],
      cta: 'Start a study',
    },
    {
      id: 'growth',
      name: 'Panel',
      monthly: 2400,
      annual: 1990,
      tagline: 'For teams running creative testing as a programme rather than a project.',
      meter: '5,000 consented sessions per month · unlimited concurrent studies · 15 seats',
      features: [
        'Everything in Study',
        'FACS action-unit trail and attention-map overlays',
        'Explicit no-signal state with per-study coverage reporting',
        'Temporal sequence model over pooled features',
        'Open-vocabulary description head',
        'Per-respondent calibration and baseline correction',
        'Article 50(3) disclosure kit and DPIA input pack per study',
        'Per-group performance appendix on every study',
        'Stimulus library with cut-family differential comparison',
      ],
      cta: 'Talk to research',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Programme',
      monthly: null,
      annual: null,
      tagline: 'Global creative measurement with your own panel, your own warehouse and your own auditors.',
      meter: '50,000+ consented sessions per month · unlimited seats · own panel and residency',
      features: [
        'Everything in Panel',
        'Study API with signed webhooks and partitioned Parquet export',
        'Snowflake and object-storage sync with consent identifiers on every row',
        'Creative diagnostic agent with segment-level citation',
        'Model version pinning, per-version performance history and change logs',
        'Annex III technical documentation pack ahead of 2 December 2027',
        'Named research engineer and quarterly bias-audit review',
        'Regional residency, SSO, SCIM and custom retention',
      ],
      cta: 'Book a compliance review',
    },
  ],
  integrations: [
    { name: 'Prolific', kind: 'Participant panel', domain: 'prolific.com' },
    { name: 'UserTesting', kind: 'Participant panel', domain: 'usertesting.com' },
    { name: 'Qualtrics', kind: 'Survey and experience platform', domain: 'qualtrics.com' },
    { name: 'Zappi', kind: 'Automated creative testing', domain: 'zappi.io' },
    { name: 'iMotions', kind: 'Multimodal biosensor lab', domain: 'imotions.com' },
    { name: 'Tobii', kind: 'Eye tracking', domain: 'tobii.com' },
    { name: 'Figma', kind: 'Static stimulus and key art', domain: 'figma.com' },
    { name: 'YouTube', kind: 'Video stimulus hosting', domain: 'youtube.com' },
    { name: 'Snowflake', kind: 'Data warehouse', domain: 'snowflake.com' },
    { name: 'Slack', kind: 'Alerts and study notifications', domain: 'slack.com' },
  ],
  proof: [
    {
      claim: '72.4% on the FER2013 private test set, above the roughly 65% at which human annotators agree on that corpus',
      evidence:
        'Measured on the 3,589-face private split. Reported with the caveat that FER2013 is a 48x48 grayscale benchmark the 2026 leaders no longer compete on, and that the per-class picture is uneven: Happy 0.891 F1, Disgust 0.432 F1 on 547 training images.',
    },
    {
      claim: '17.3 ms per face on CPU, inside the 30 ms real-time budget',
      evidence:
        'ONNX Runtime, single face, commodity CPU, no GPU. Faces in a frame are batched into one run, so per-face cost falls further on co-viewing sessions. The same graph runs client-side under Transformers.js over WASM or WebGPU.',
    },
    {
      claim: 'No image is ever stored, transmitted or returned',
      evidence:
        'Detection, alignment and inference run in the panellist"s browser; only per-frame vectors and derived curves are transmitted. The service returns labels, continuous values and action units and has no image-persistence path.',
    },
    {
      claim: 'Temporal modelling, not a bigger backbone, is where the accuracy is',
      evidence:
        'At the 8th ABAW challenge a DDAMFN-plus-LSTM entry moved valence-arousal CCC from an official baseline of 0.22 to 0.479 and action-unit F1 from 0.39 to 0.451. Static architecture progress over the same period was worth about half a point: POSTER++ 92.21% on RAF-DB in 2023, SRE-FER 92.76% in August 2026.',
    },
    {
      claim: 'The product claim is bounded by the literature it cites',
      evidence:
        'Barrett et al. (2019), Psychological Science in the Public Interest 20(1), 1-68, meta-analysed 47 studies and found average effect sizes of r = .32 with category proportions of .15 to .25. Assentia therefore reports observed facial movement, continuous valence and arousal, and calibrated uncertainty — never an assertion about what a person felt.',
    },
    {
      claim: 'Prohibited uses are refused, and the refusal is auditable',
      evidence:
        'Deployment context is attested at key issue and re-checked at study creation; workplace, hiring, candidate-assessment and education-institution contexts are rejected and logged. Article 5(1)(f) has applied since 2 February 2025 and Article 99 sets the ceiling at EUR 35,000,000 or 7% of total worldwide annual turnover.',
    },
  ],
  outcomes: [
    { label: 'Per-face inference', value: '17.3 ms', caption: 'ONNX Runtime on CPU, under the 30 ms real-time budget' },
    { label: 'Images retained', value: '0', caption: 'Frames are discarded after client-side inference; only vectors leave the device' },
    { label: 'Consent artefacts per session', value: '1', caption: 'Purpose, jurisdiction, retention and withdrawal route, hashed and joined to every exported row' },
    { label: 'Prohibited contexts served', value: '0', caption: 'Workplace, hiring and education contexts are refused at the API key and the refusal logged' },
    { label: 'Timeline resolution', value: '1 second', caption: 'Curves and segment statistics are reported per second and aligned to stimulus timecode' },
    { label: 'Incentive cost per 5-minute session', value: '≈ USD 1.40-1.70', caption: 'Modelled from Prolific"s published rates: USD 8-12 per participant-hour plus a 42.8% commercial service fee. A benchmark for buyers, not an Assentia charge.' },
  ],
  faq: [
    {
      q: 'Is emotion AI not banned in the EU?',
      a: 'Partly, and the boundary is precise. EU AI Act Article 5(1)(f) prohibits the use of AI systems to infer emotions of a natural person in the areas of workplace and education institutions, except where the system is intended for medical or safety reasons; that prohibition has applied since 2 February 2025. Consented market and advertising research is not in the prohibited set. It is listed in Annex III point 1(c) as high risk, which means conformity assessment, technical documentation, logging, human oversight and bias evidence — obligations the Digital Omnibus on AI, in force 27 July 2026, deferred from 2 August 2026 to 2 December 2027. Article 50(3) transparency duties, informing exposed persons of the system"s operation, apply in addition. Assentia is built for the Annex III path and refuses the Article 5 path.',
    },
    {
      q: 'Can we use this to screen candidates, monitor employee wellbeing, or measure classroom engagement?',
      a: 'No, and the platform will not let you. Those are the exact contexts Article 5(1)(f) prohibits, with fines up to EUR 35,000,000 or 7% of total worldwide annual turnover under Article 99. Deployment context is a required attested field on every API key; workplace, employee, recruitment, candidate-assessment and education-institution values are rejected at token issue and again at study creation, and the refusal is written to the audit log. If that is the use case, Assentia is the wrong product and no configuration changes that.',
    },
    {
      q: 'The science says facial expressions do not reliably map to emotions. Why should we buy a system built on that assumption?',
      a: 'It is not built on that assumption. Barrett and colleagues meta-analysed 47 studies and reported average effect sizes of r = .32, with category-specific proportions of .15 to .25, concluding that facial configurations lack sufficient reliability and specificity to be diagnostic displays of any emotional state. Assentia treats that as a design constraint rather than an inconvenience: the primary output is continuous valence and arousal with a confidence interval, the evidence trail is the action units and the attention map, and the system returns an explicit no-reliable-signal state instead of forcing a label. The categorical seven-class output is retained as a secondary annotation for teams with legacy norms, and is marked as such.',
    },
    {
      q: 'Do you store faces or video?',
      a: 'No. Face detection, alignment and expression inference run in the panellist"s browser on ONNX Runtime through Transformers.js. Only per-frame feature vectors and the derived curves are transmitted; there is no image-persistence path in the service. This also disposes of the Illinois BIPA exposure at the root — but panellists in Illinois are still shown the written notice and give the written release BIPA requires, because the statute provides liquidated damages of USD 1,000 for a negligent violation and USD 5,000 for an intentional or reckless one, capped since Public Act 103-0769 (2 August 2024) at one recovery per person per method of collection.',
    },
    {
      q: 'How is this different from Affectiva or Realeyes, who have far more data?',
      a: 'Affectiva has more data — 17.4M face videos and 8B facial frames across 90 countries, on its own figures — and also sells In-Cabin Sensing AI, so a buyer certifying that its vendor carries no prohibited or contested-use exposure cannot get a clean answer. Realeyes has the client roster but now leads with VerifEye, a human-verification product for onboarding, re-verification and account recovery; the roadmap has moved to identity. Assentia competes on the two things a data moat does not supply: an enforced lawful-use boundary with a per-session consent record, and a claim structure that survives a client-side data-science review.',
    },
    {
      q: 'What does it actually cost, and why do you publish a price when nobody else does?',
      a: 'Study is USD 490 a month (USD 390 billed annually) for 500 consented sessions; Panel is USD 2,400 a month (USD 1,990 annually) for 5,000; Programme is quoted above 50,000. Publishing is the point: of the six vendors a buyer would shortlist — Affectiva, Realeyes, iMotions, Tobii, UserTesting and Zappi — none publishes a list price, and iMotions states that a precise price overview is difficult because every quote is unique. The one published number in the chain is Prolific"s participant economics (USD 8-12 per participant-hour plus a 42.8% commercial fee, so roughly USD 1.40-1.70 for a five-minute session), which is the floor a buyer should be measuring any quote against.',
    },
    {
      q: 'What happens when the model cannot tell?',
      a: 'It says so. Every reading passes a gate on temperature-scaled top-1 confidence, attention-map entropy and an action-unit activation floor; below the gate the frame is reported as no reliable signal rather than assigned a class. Coverage — the proportion of frames that cleared the gate — is printed next to every curve. This matters more than it sounds: in a 2025 driving-simulator study, 15 of 24 participants showed no detectable facial reaction to a critical event, and a system obliged to emit a label would have emitted a wrong one for every one of them.',
    },
  ],
  trust: [
    {
      name: 'Prohibited uses are refused, not disclaimed',
      body: 'Assentia is not sold for workplace monitoring, employee wellbeing, hiring, candidate assessment, proctoring or classroom engagement. EU AI Act Article 5(1)(f) prohibits emotion inference in workplace and education institutions from 2 February 2025, with only a narrow medical-or-safety carve-out, and Article 99 sets the ceiling at EUR 35,000,000 or 7% of total worldwide annual turnover. The restriction is enforced in the product: deployment context is attested at key issue, re-validated at study creation, refused for those values and logged. The prohibition is also stated in the master agreement, and breach is grounds for immediate termination. Adjacent uses the project once contemplated — anonymous in-store sentiment at checkout and in-cabin driver monitoring — are outside scope: the first is emotion inference on people who have not consented and, in a retail workplace, on staff as well; the second is a safety application whose evidence base a 2025 simulator study found wanting.',
    },
    {
      name: 'Explicit consent and lawful basis',
      body: 'Every session is preceded by purpose-specific explicit consent in the terms of GDPR Article 9(2)(a), recorded as a hashed, timestamped artefact naming the stimulus, sponsor category, retention position and withdrawal route. Article 9(1) treats biometric data processed for the purpose of uniquely identifying a natural person as a special category; Assentia does not perform identification, so that limb is not the operative one, but consent is obtained on the Article 9 standard regardless rather than relying on the distinction. A DPIA input pack is generated for each study, and withdrawal deletes a traceable set of rows across the platform and any connected warehouse.',
    },
    {
      name: 'Transparency to the people measured',
      body: 'Article 50(3) requires the deployer of an emotion-recognition system to inform the natural persons exposed to it of the operation of the system. Assentia generates the panellist-facing notice and the deployer disclosure from each study"s own configuration, localised to the fielding markets, so the artefact matches what ran. Panellists can see what was recorded about their session, and withdraw, from a link that remains live for the retention period.',
    },
    {
      name: 'US state biometric law',
      body: 'Illinois panellists receive the written notice and give the written release required by BIPA (740 ILCS 14) before any face scan, with the retention schedule published. BIPA provides liquidated damages of USD 1,000 for a negligent violation and USD 5,000 for an intentional or reckless one; Public Act 103-0769, effective 2 August 2024, limits recovery to one award per person per method of collection, and the Seventh Circuit has held that amendment retroactive. Equivalent notice-and-consent flows are applied in Texas and Washington fielding.',
    },
    {
      name: 'Data residency and retention',
      body: 'Studies are pinned to an EU, UK or US region at creation and neither raw vectors nor derived curves leave it. Because detection and inference run in the browser, no image or video frame is transmitted, stored or returned at any tier. Vectors are retained for the study"s declared retention window and then deleted; aggregate curves may be retained longer only where the consent artefact says so. Sub-processors are listed publicly and changes are notified in advance.',
    },
    {
      name: 'Model governance and bias evidence',
      body: 'Every model version is pinned, hashed and change-logged, and a study records the version that produced it so results are reproducible. Each release is evaluated on a held-out reference set with accuracy, expected calibration error and abstention rate broken out by apparent age band, skin tone, spectacles, facial hair and head yaw, and gated on the worst group rather than the mean. Performance history is published per version. This is the evidence the ICO"s 2022 warning about bias and inaccuracy in emotion analysis asked for, and the evidence Annex III will require from 2 December 2027.',
    },
    {
      name: 'Security controls and audit',
      body: 'The platform runs under a SOC 2 Type II control set covering security, availability and confidentiality, with encryption in transit and at rest, least-privilege access with SSO and SCIM on Programme, immutable audit logging of study creation, context attestation, refusals and exports, annual penetration testing and a published vulnerability-disclosure process. Consent-ledger writes are append-only and independently verifiable.',
    },
  ],
  roadmap: [
    {
      quarter: 'Q4 2026',
      title: 'Browser pipeline and consent ledger to general availability',
      body: 'Ship the client-side two-stage pipeline — nano YOLOv11 face detection with ONNX weights, then the quantised ViT expression graph, both under Transformers.js on WASM with WebGPU where available — so no frame leaves the device on any plan. Ship the append-only consent ledger, context attestation at key issue, and the Article 50(3) disclosure generator. Publish RAF-DB and AffectNet-7/-8 evaluations of the deployed graph alongside the existing FER2013 figure, so the model is comparable to POSTER++ and SRE-FER rather than to a retired benchmark.',
    },
    {
      quarter: 'Q1 2027',
      title: 'Continuous signal becomes the headline',
      body: 'Replace exponential-moving-average smoothing with a bidirectional sequence model over pooled per-frame features and report valence CCC and arousal CCC separately on Aff-Wild2, against the 10th ABAW reference points of 0.6078 and 0.7073. Promote valence and arousal to the primary product signal and demote the seven-class label to a marked annotation. Ship the explicit no-signal state with per-study coverage reporting, and per-respondent baseline calibration.',
    },
    {
      quarter: 'Q2 2027',
      title: 'Describing model and creative diagnostics',
      body: 'Ship the open-vocabulary description head, distilled in the AffectGPT and Emotion-LLaMA direction, phrased about observed movement rather than inner state. Ship the creative diagnostic agent with mandatory segment-level citation and an insufficient-evidence response. Ship cut-family differential comparison and the EDL-aligned segment statistics, and publish the first per-group performance appendix as a standing artefact on every study.',
    },
    {
      quarter: 'Q3 2027',
      title: 'Annex III conformity pack ahead of the deadline',
      body: 'Complete the technical documentation, risk-management file, data-governance record, logging design and human-oversight specification required of Annex III point 1(c) systems, and make the pack exportable per deployer so customers inherit it rather than rebuild it. Close out third-party bias audit and penetration testing, publish per-version performance history, and be conformity-ready with a full quarter in hand before the obligations apply on 2 December 2027.',
    },
  ],
}

export default product
