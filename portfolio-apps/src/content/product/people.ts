/**
 * P04 · People Analytics Platform — the commercial layer.
 * Every competitor, price and figure below is drawn from a source that was opened;
 * pilot numbers are labelled as pilot numbers.
 */
import {
  AlertIcon, BeakerIcon, ChecklistIcon, CommentDiscussionIcon, CpuIcon, DatabaseIcon, EyeIcon, FileBadgeIcon,
  GraphIcon, HistoryIcon, LawIcon, MilestoneIcon, OrganizationIcon, PeopleIcon, PulseIcon, ShieldCheckIcon,
  StackIcon, StopIcon, TelescopeIcon, ZapIcon,
} from '@primer/octicons-react'
import type { Product } from '../product'

const product: Product = {
  name: 'Qini',
  category: 'Causal people analytics and workforce-compliance platform',
  tagline: 'The incremental effect of every retention decision, and the evidence a regulator will ask for, from the same model',
  positioning:
    'Qini is for people-analytics teams that have already been told who is likely to leave and now have to decide what to do about it. It estimates the incremental effect of each retention action on each individual — a promotion review, a pay correction, an overtime cap, a manager change — using doubly-robust causal estimators rather than correlation, and it targets a fixed retention budget against those estimates. The same fitted artefact emits the pay-gap regressions, parity tests, model cards and event logs that the EU Pay Transparency Directive, EU AI Act Annex III and NYC Local Law 144 each require, so the compliance work stops being a separate project run by a consultancy.',
  market: {
    size: 'The HR analytics market was USD 5.71 billion in 2026 and is forecast to reach USD 10.82 billion by 2031 (Mordor Intelligence). The adjacent pay-equity segment is already at scale: Syndio alone reports governing more than $1 trillion of compensation across 350-plus enterprises.',
    growth: '13.64% CAGR from 2026 to 2031 (Mordor Intelligence), with the compliance-driven portion growing fastest as EU reporting obligations land.',
    whyNow:
      'Two dates changed the buying behaviour. Member states had to transpose the EU Pay Transparency Directive (EU) 2023/970 by 7 June 2026, which turns an internal HR concern into a statutory reporting duty and gives employers a hard 5% unexplained-gap trigger to stay under. Four weeks later, on 2 August 2026, the EU AI Act entered general application; the Annex III high-risk obligations that cover worker management were moved to 2 December 2027 by the Digital Omnibus, which gives buyers a fifteen-month window to replace undocumented HR models with ones that ship their own evidence. Meanwhile Illinois HB 3773 took effect on 1 January 2026 and Colorado SB 189 lands on 1 January 2027, so the American disclosure duty arrives on a similar clock.',
  },
  personas: [
    {
      title: 'VP People Analytics',
      segment: 'Enterprises of 5,000–75,000 employees running Workday or SAP SuccessFactors as the core, with a two- to six-person analytics team',
      jobToBeDone:
        'My CHRO has eleven retention ideas and budget for three. I need to say which three actually keep people rather than which three correlate with people who were staying anyway, and I need to show my working when finance asks why.',
      statusQuo:
        'Visier, or a Snowflake and dbt stack feeding Tableau. Both produce excellent descriptive answers and a flight-risk score. Neither will estimate what a $6,000 pay correction does to the probability that a specific senior engineer stays, because neither has a causal layer.',
      successMetric: 'Regrettable attrition among top-two-quartile performers, and the cost per retained employee of the interventions actually funded.',
    },
    {
      title: 'Chief People Officer',
      segment: 'Multi-country employers of 2,000–20,000 people with EU and US entities and a European works council',
      jobToBeDone:
        'I want to walk into the board with one retention number and one pay-equity number, and be able to defend both — to the auditor, to the works council, and to a regulator who asks how the model works.',
      statusQuo:
        'An annual pay audit run by a consultancy, an engagement survey on a separate cycle, and an HRIS report that arrives six weeks after the quarter. The audit is a PDF that ages out before the next merit cycle, and none of it constitutes technical documentation for a high-risk system.',
      successMetric: 'Total voluntary-turnover cost as a share of payroll, and zero unremediated pay findings at the reporting deadline.',
    },
    {
      title: 'Head of Total Rewards / Compensation',
      segment: 'Reward functions at 1,000–25,000-employee employers running an annual merit and promotion cycle',
      jobToBeDone:
        'Put the merit budget where it changes somebody\'s mind, and produce the Article 9 report without three analysts and three months of spreadsheets.',
      statusQuo:
        'Syndio or a compensation consultant for the gap analysis, and Excel for the merit modelling. The two never meet, so the equity finding and the spending decision are made by different people from different data in different quarters.',
      successMetric: 'Unexplained pay gap held under 5% in every reportable category of workers, and merit spend per retained employee.',
    },
  ],
  pains: [
    {
      title: 'Retention budget is spent on the people least likely to be moved by it',
      body:
        'A flight-risk score ranks people by how likely they are to leave. Budget should be allocated by how much a given action changes that probability, and the two rankings are not the same list. The people at the very top of a risk score are frequently the ones already committed to leaving; the money lands on them and the model looks vindicated when they go anyway.',
      cost: 'Gallup puts US voluntary turnover at $1 trillion a year, with replacement of a single employee costing one-half to two times annual salary',
      icon: AlertIcon,
    },
    {
      title: 'The retention conversation happens after the decision',
      body:
        'Exit interviews collect the reason once it can no longer be acted on. Gallup finds that most departures were reachable and that nobody reached: a majority of leavers had no conversation about their satisfaction or their future in the quarter before they resigned.',
      cost: '52% of voluntarily exiting employees say their manager or organisation could have prevented it; 51% had no such conversation in their final three months (Gallup)',
      icon: CommentDiscussionIcon,
    },
    {
      title: 'The pay gap surfaces at the reporting deadline, not before it',
      body:
        'Under Article 10(1) of Directive (EU) 2023/970, an average pay difference of at least 5% in any category of workers that the employer cannot justify on objective, gender-neutral criteria and has not remedied within six months compels a joint pay assessment with worker representatives. An annual consultancy audit discovers that six months too late to fix it in the merit cycle.',
      cost: 'A mandatory joint pay assessment at any unexplained gap of 5% or more, with reporting from 7 June 2027 for employers of 150 or more workers',
      icon: LawIcon,
    },
    {
      title: 'Every replacement carries a cost nobody budgets for',
      body:
        'The recruiting invoice is the small part. SHRM\'s benchmarking puts average cost per hire near $4,700 but notes that only 30 to 40 per cent of the true cost is hard cost — the remaining 60 per cent is the time of the managers and colleagues absorbed into the hiring and ramp, which never appears on a cost centre.',
      cost: '$4,700 average cost per hire, of which roughly 60% is unbudgeted soft cost (SHRM)',
      icon: PeopleIcon,
    },
    {
      title: 'Correlation is being presented to executives as advice',
      body:
        'Every people-analytics dashboard in the market will tell a leadership team that overtime correlates with attrition. None of them will say what capping overtime would do, because feature importance is not a treatment effect and a SHAP value is an explanation of a prediction, not of an outcome. Acting on the first as though it were the second is how retention programmes fail quietly and expensively.',
      cost: 'Unmeasurable by construction — the counterfactual is never recorded, so the programme cannot be evaluated after the fact',
      icon: StopIcon,
    },
    {
      title: 'The compliance evidence is rebuilt by hand, three times, from the same data',
      body:
        'The Article 9 pay report, the NYC Local Law 144 bias audit and the Annex III technical file all draw on the same workforce data and the same model, and are all typically produced as separate manual exercises by separate vendors. In New York the penalty is $500 for a first violation and $500 to $1,500 for each subsequent one, with every day of non-compliant use counting separately.',
      cost: '$500–$1,500 per day of non-compliant AEDT use in New York City, plus the consultancy fees for each parallel exercise',
      icon: ChecklistIcon,
    },
  ],
  wedge: {
    title: 'One fitted model that both prices the intervention and proves the decision',
    body:
      'The incumbents are split down a seam. Visier, Workday and Eightfold own the workforce data and the prediction; Syndio owns the pay-equity statistics and the audit. Neither side estimates a causal effect, and neither side\'s output is shaped as regulatory evidence for the other side\'s problem. Qini sits on the seam deliberately: the conditional average treatment effect for each employee and each action is estimated from a covariate-adjusted, doubly-robust model, and that same fitted artefact — the same propensity model, the same outcome model, the same covariate set, the same version hash — is what produces the controlled pay-gap regression, the parity tests, the reason codes and the event log. The regulatory artefacts are not a reporting module bolted onto an analytics product; they are the residuals and coefficients of the model that made the recommendation. That pairing is structurally hard for an incumbent to copy quickly, for a reason that has nothing to do with engineering talent. A causal estimate requires variation in who received which intervention, recorded prospectively with the assignment mechanism attached. An HRIS vendor has fifteen years of outcomes and no record of assignment; a pay-equity vendor has the covariates but no treatment arm at all. Building the causal layer means changing how the customer records interventions from the first day of the contract, which is a product decision an incumbent with an installed base cannot retrofit, and a compliance artefact that is generated rather than written is only credible if the model it describes is the model that ran. Whoever ships the intervention ledger first accumulates the only asset that matters here: a growing record of what was tried, on whom, and what happened.',
  },
  features: [
    {
      name: 'Incremental effect per employee, per action',
      summary: 'What each retention action would actually change, for this specific person.',
      detail:
        'A doubly-robust learner estimates the conditional average treatment effect of each intervention arm — promotion review, pay correction, overtime cap, manager change, flexible location — against a covariate set drawn from the HRIS panel. The estimator is fitted with cross-fitting so the nuisance models never score their own training rows, and the output is a per-person, per-arm effect with a confidence interval rather than a single ranked list.',
      icon: ZapIcon,
      ai: true,
      tier: 'growth',
      appRoute: '/app/interventions',
    },
    {
      name: 'Budget-constrained targeting policy',
      summary: 'A retention budget in, a named list out, with the expected retained headcount attached.',
      detail:
        'The CATE estimates feed a policy learner that returns an explicit assignment rule under a stated budget: who receives which arm, and what the policy is expected to return relative to treating nobody and to treating everybody. Policies are scored with the Qini curve and AUUC using variance-reduced outcome adjustment, and with the rank-weighted average treatment effect, so the question "is this better than random" has a number rather than an anecdote.',
      icon: GraphIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Competing-risk survival, not a single probability',
      summary: 'When someone is likely to go, and whether they are going out or going sideways.',
      detail:
        'A discrete-time survival model over a person-period panel treats voluntary exit, involuntary exit and internal move as competing risks, so an internal transfer is not scored as a retention failure. Time-varying covariates — pay position, manager, span, level, location, leave — enter at the period in which they changed, and the model is evaluated on a time-dependent concordance index and a calibration curve rather than a single AUC.',
      icon: PulseIcon,
      tier: 'growth',
    },
    {
      name: 'Conformal risk sets with an explicit abstention',
      summary: 'The model says "I do not know" rather than emitting a number a manager will act on.',
      detail:
        'Split conformal prediction wraps the classifier to give distribution-free coverage at a stated level. Where the prediction set at that coverage contains both classes, the surface abstains: no score is displayed, no alert is raised, and the abstention is logged. Coverage is monitored per business unit, because a model calibrated on the whole workforce is routinely miscalibrated on a 200-person function.',
      icon: TelescopeIcon,
      tier: 'growth',
    },
    {
      name: 'Reason codes on every score',
      summary: 'Which factors raised this person\'s risk, and by how much.',
      detail:
        'SHAP TreeExplainer contributions are computed at scoring time across the full feature set and attached to the record, positive and negative. The reason codes are what the manager sees; the raw probability is deliberately secondary in the interface, because a ranked reason list produces a conversation and a decimal produces a judgement.',
      icon: EyeIcon,
      tier: 'starter',
    },
    {
      name: 'Controlled and uncontrolled pay-gap regression',
      summary: 'Both numbers, in the shape the Directive asks for.',
      detail:
        'A regression over the compensation panel produces the raw gap and the gap after controlling for level, role, location, tenure and performance, per category of workers as the Directive defines it, with the unexplained residual isolated and every control listed. The output is a report that can be filed, not a chart that has to be interpreted, and it flags any category crossing the 5% joint-pay-assessment trigger with the six-month remediation clock started.',
      icon: LawIcon,
      tier: 'starter',
    },
    {
      name: 'Promotion and progression parity testing',
      summary: 'Who advances, how fast, and whether the difference is real.',
      detail:
        'Years since last promotion and promotion rate are compared across cohorts with a Mann-Whitney U test, reported with the effect size and the significance level rather than a traffic light. The current build finds a 1.8x velocity disparity at p < 0.01 in the reference cohort, which is the kind of finding that is almost never explained by performance and almost always explained by nomination practice.',
      icon: MilestoneIcon,
      tier: 'starter',
    },
    {
      name: 'Cascade risk across the org network',
      summary: 'Whose departure takes three other people with it.',
      detail:
        'A directed graph of the reporting hierarchy and collaboration edges is scored with PageRank and betweenness centrality to find knowledge brokers — the people whose exit disconnects parts of the network rather than merely leaving a vacancy. Cascade exposure is the product of broker centrality and attrition risk, which reorders the retention list away from the loudest resignations and towards the structurally expensive ones.',
      icon: OrganizationIcon,
      tier: 'growth',
    },
    {
      name: 'Headcount forecast under scenarios',
      summary: 'Where the establishment lands under baseline, freeze and growth.',
      detail:
        'A Monte Carlo simulation propagates period-level exit hazards and hiring lags forward over six to thirty-six months, returning a median path and confidence bands per business unit. Baseline churn is calibrated against published quits rates by industry so a plan can be reconciled with the external labour market rather than only with last year.',
      icon: HistoryIcon,
      tier: 'growth',
    },
    {
      name: 'The evidence pack',
      summary: 'Model card, dataset manifest, event log and oversight record, generated per version.',
      detail:
        'Every promoted model version emits a model card with intended purpose, feature inventory, performance by cohort and known limitations; a dataset manifest with lineage and time boundaries; an append-only event log of every score served, every override and every abstention, attributed to a person; and the recorded human-oversight step. These map onto the Annex III technical documentation, record-keeping and human-oversight obligations, and export as a signed bundle.',
      icon: FileBadgeIcon,
      tier: 'enterprise',
    },
    {
      name: 'Annual bias-audit exporter',
      summary: 'The Local Law 144 artefact, ready for an independent auditor to sign.',
      detail:
        'Selection and impact ratios are computed by sex, by race and ethnicity, and by the intersectional categories the rule requires, with counts, scoring rates and score distributions, using Fairlearn MetricFrame underneath. The export is formatted for a third-party auditor to review and publish, since the auditor must be independent of the tool\'s development and of the employer.',
      icon: ChecklistIcon,
      tier: 'enterprise',
    },
    {
      name: 'No-adverse-action guard',
      summary: 'Scores are structurally unavailable to termination, discipline and redundancy surfaces.',
      detail:
        'The prohibition is enforced at the API rather than in a policy document. Scoring requests carrying a termination, discipline, performance-rating or redundancy-selection context are refused; the score fields are absent from those payloads entirely; every read is attributed and logged; and the access trail exports to an employee representative on request. A policy survives until the next reorganisation. A refused request does not need to.',
      icon: ShieldCheckIcon,
      tier: 'starter',
    },
    {
      name: 'Intervention ledger',
      summary: 'What was tried, on whom, when, and what happened next.',
      detail:
        'Every recommended action is written to an append-only ledger with the assignment mechanism recorded — targeted, randomised holdout, or manager discretion — and joined to the outcome once the period closes. This is the asset the causal model is fitted on, and it is why the estimates improve with tenure on the platform rather than staying flat.',
      icon: DatabaseIcon,
      tier: 'growth',
    },
  ],
  aiFeatures: [
    {
      name: 'Doubly-robust intervention engine',
      summary: 'Causal effect estimates that survive a misspecified model on either side.',
      detail:
        'The engine fits an outcome model and a propensity model and combines them in a doubly-robust pseudo-outcome, so the effect estimate stays consistent if either one is correct. It runs a doubly-robust learner, an X-Learner and a causal forest as an ensemble and reports where they disagree, because agreement across estimators is the closest thing to a validity check available without a randomised trial. Where the customer permits a small randomised holdout, the holdout is used to validate the observational estimate rather than to run the programme.',
      icon: ZapIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'On-device skills and sentiment tagging',
      summary: 'Free text is vectorised in the employee\'s browser and never transmitted.',
      detail:
        'Self-described skills, engagement comments and open-text survey responses are embedded in the page using ONNX models under transformers.js — Xenova/all-MiniLM-L6-v2 for 384-dimension sentence embeddings, Xenova/bge-small-en-v1.5 where retrieval quality matters more than size — and tagged against a skill taxonomy with Xenova/nli-deberta-v3-xsmall as a zero-shot classifier. Only vectors or tags leave the device. For a works council asking where the text goes, the answer is that it does not go anywhere.',
      icon: CpuIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'Skills graph from the customer\'s own job architecture',
      summary: 'A skills spine derived from your levelling guides, reconciled to a public standard.',
      detail:
        'Job descriptions, levelling guides and internal role titles are embedded and clustered into a skills graph specific to the employer, then reconciled against ESCO — 13,939 skills and 3,039 occupations across 28 languages — so the internal taxonomy stays portable and multilingual without buying an off-the-shelf ontology that does not match the job architecture the company actually runs.',
      icon: StackIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'Manager retention brief',
      summary: 'The reason codes turned into a conversation, not a score to react to.',
      detail:
        'Reason codes, tenure context, the recommended arm and its estimated effect are composed into a short brief for the manager: what appears to be driving the risk, what is worth asking about, and what the organisation is prepared to offer. The brief never states a probability, because a probability invites a manager to treat a person as a forecast, and it carries the abstention notice when the conformal set is uninformative.',
      icon: CommentDiscussionIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Drift watch and champion-challenger recalibration',
      summary: 'A model retires when the workforce changes, not when the calendar says so.',
      detail:
        'Population stability is tracked per feature, calibration drift on the score, and prequential AUC on a rolling window per business unit. Crossing a threshold schedules a retrain; the challenger must beat the incumbent on the same held-out calendar period before promotion, and the comparison is written into the model card so the version history explains itself to an auditor.',
      icon: BeakerIcon,
      ai: true,
      tier: 'enterprise',
    },
  ],
  competitors: [
    {
      name: 'Visier',
      url: 'https://www.visier.com/',
      strength:
        'The category-defining standalone people-analytics platform, with a governed workforce data model, deep benchmarking and Vee, an agent that surfaces insight without being asked. Published customer outcomes are strong: Sunstate Equipment reports a 50% fall in regrettable turnover and Providence $3M saved in caregiver replacement cost in a year.',
      gap:
        'Descriptive and predictive, not causal. It will tell a team who is likely to leave; it will not estimate what a specific action does to that probability, and its outputs are not shaped as Annex III technical documentation or as an Article 9 pay report. Retention advice and regulatory evidence remain two separate workstreams.',
      pricing: 'Quote-only. Visier publishes no price — visier.com/pricing and /plans both return 404, and G2 shows no pricing — with contracts scoped on headcount, module mix and term.',
    },
    {
      name: 'Workday Illuminate',
      url: 'https://www.workday.com/',
      strength:
        'It owns the system of record. Illuminate models are trained on more than 800 billion business transactions processed annually across 10,500-plus organisations including over 60% of the Fortune 500, and Skills Cloud gives the talent decisions a skills spine that no third party can assemble as cheaply.',
      gap:
        'The analytics see Workday data and infer from correlation. There is no treatment-effect estimation, no intervention ledger and no assignment mechanism recorded, so causal claims are not available at any price. Compliance evidence for the customer\'s own deployment remains the customer\'s obligation.',
      pricing: 'Bundled into the HCM subscription; Workday publishes no per-employee figure, and analytics modules are negotiated inside the enterprise agreement.',
    },
    {
      name: 'Eightfold AI',
      url: 'https://eightfold.ai/',
      strength:
        'The deepest skills-and-matching engine in the market, now positioned as a full-stack agentic platform that models skills, capabilities, aspirations and the work people actually perform, spanning hiring, internal mobility and workforce planning.',
      gap:
        'Acquisition- and mobility-first. There is no pay-equity engine, no survival model, no uplift estimation and no compliance export, and the platform publishes very little of substance about its own performance — the only quantified claim on the product page is a customer\'s 160 hours saved in two months.',
      pricing: 'Not published. Third-party analyst estimates put it at $7–$10 per employee per month, or roughly $150,000–$500,000+ a year on an enterprise contract, plus $5,000–$50,000 implementation.',
    },
    {
      name: 'Syndio',
      url: 'https://synd.io/',
      strength:
        'The deepest pay-equity practice available: statistical gap analysis, real-time governance of offers, promotions, merit and transfers, and genuine scale — 350-plus global enterprises including more than 30 of the Fortune 500, over $1 trillion of compensation governed and analysis across more than 10 million employee pay records.',
      gap:
        'Pay only. No attrition model, no survival analysis, no intervention targeting and no workforce forecast, so equity and retention stay two purchases with two data pipelines and two vendors. The forthcoming Predict module models downstream impact of a pay decision, which is adjacent to, but not the same as, a treatment effect on retention.',
      pricing: 'Not published; Syndio\'s own value case cites $5,000 saved per governed pay decision and a 70% reduction in pay-equity remediation costs.',
    },
    {
      name: 'Lattice',
      url: 'https://lattice.com/',
      strength:
        'Real published pricing, fast adoption, and ownership of the rituals managers already run — reviews, one-to-ones, goals and engagement surveys — which is where retention conversations actually happen. Analytics, an AI agent and integrations are included in every base product.',
      gap:
        'HR operations rather than analytics. There is no survival modelling, no causal estimation, no pay-gap regression against a statutory threshold and no regulatory export; the engagement data is a signal Qini consumes rather than a competitor to it.',
      pricing: 'Published: Performance $10/seat/month, Goals & OKRs $8, Engagement $4, with Compensation +$6 and Grow +$4; $4,000 minimum annual agreement, billed annually.',
    },
    {
      name: 'ChartHop',
      url: 'https://www.charthop.com/',
      strength:
        'The cheapest credible entry point into people data, with org charting, headcount planning and compensation cycles on one dataset and a genuinely transparent price list that makes it easy to start.',
      gap:
        'Planning and visualisation rather than inference. No attrition model, no causal layer, no fairness auditing and no compliance artefacts — the product answers what the organisation looks like, not what will happen to it or what to do about it.',
      pricing: 'Published: Core $5 per employee/month; HRIS, Headcount Planning, Compensation and Performance modules $4 each; Engagement and Goals $3 each, billed annually.',
    },
  ],
  pricing: [
    {
      id: 'starter',
      name: 'Starter',
      monthly: 2000,
      annual: 1600,
      tagline: 'Attrition scoring and a defensible pay-gap report for a single entity.',
      meter: 'Up to 500 employees, one legal entity — roughly $4 per employee per month at the cap',
      features: [
        'Attrition scoring with SHAP reason codes on every record',
        'Controlled and uncontrolled pay-gap regression in the Article 9 reporting shape',
        'Promotion and progression parity testing with significance levels',
        'No-adverse-action guard enforced at the API',
        'One HRIS connector and monthly snapshot ingestion',
        'Email and shared-channel support',
      ],
      cta: 'Start with one entity',
    },
    {
      id: 'growth',
      name: 'Growth',
      monthly: 9000,
      annual: 7500,
      tagline: 'The causal layer: incremental effects, budget-constrained targeting and the intervention ledger.',
      meter: 'Up to 2,500 employees across unlimited entities — roughly $3.60 per employee per month at the cap',
      features: [
        'Everything in Starter, across unlimited legal entities and countries',
        'Doubly-robust intervention engine with per-person, per-arm treatment effects',
        'Budget-constrained targeting policy scored on Qini, AUUC and RATE',
        'Competing-risk survival model with time-dependent concordance and calibration',
        'Conformal risk sets with explicit abstention',
        'Intervention ledger with recorded assignment mechanism and outcome join',
        'Cascade-risk network analysis and scenario headcount forecasting',
      ],
      cta: 'Price your headcount',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthly: null,
      annual: null,
      tagline: 'For regulated, multi-country employers who have to hand the evidence to somebody.',
      meter: 'Priced per employee per month above 2,500 employees, in volume bands from $2.50',
      features: [
        'Everything in Growth, with per-region data residency in the EU or the US',
        'Annex III evidence pack: model cards, dataset manifests, event logs and oversight records per version',
        'Local Law 144 bias-audit exporter formatted for an independent auditor',
        'On-device skills and sentiment tagging, with free text never leaving the browser',
        'Skills graph derived from your job architecture and reconciled to ESCO',
        'Drift watch with champion-challenger promotion gates',
        'Works-council export pack and named implementation support',
      ],
      cta: 'Talk to us',
    },
  ],
  integrations: [
    { name: 'Workday', kind: 'HRIS', domain: 'workday.com' },
    { name: 'SAP SuccessFactors', kind: 'HRIS', domain: 'sap.com' },
    { name: 'BambooHR', kind: 'HRIS', domain: 'bamboohr.com' },
    { name: 'ADP', kind: 'Payroll', domain: 'adp.com' },
    { name: 'Greenhouse', kind: 'ATS', domain: 'greenhouse.io' },
    { name: 'Lever', kind: 'ATS', domain: 'lever.co' },
    { name: 'Snowflake', kind: 'Warehouse', domain: 'snowflake.com' },
    { name: 'dbt', kind: 'Transformation', domain: 'getdbt.com' },
    { name: 'Slack', kind: 'Comms', domain: 'slack.com' },
    { name: 'Microsoft Teams', kind: 'Comms', domain: 'microsoft.com' },
    { name: 'Okta', kind: 'Identity', domain: 'okta.com' },
  ],
  proof: [
    {
      claim: 'AUC 0.9401 on the attrition benchmark, with 81.4% precision at a 0.35 alert threshold',
      evidence:
        'Held-out test set of the XGBoost 2.0 classifier over 58 engineered features, five-fold stratified cross-validation with a fold spread of 0.931 to 0.946. The benchmark is IBM\'s HR Analytics dataset, which is synthetic and holds 1,470 records with 237 positives, so the figure demonstrates that the pipeline works and says nothing reliable about production performance on real longitudinal HRIS data. Published work on the same file reaches F1 0.92 with a fine-tuned general-purpose language model, which is itself evidence that the dataset is doing much of the work.',
    },
    {
      claim: 'An 11.3% uncontrolled and 5.2% controlled gender pay gap identified in Engineering',
      evidence:
        'Fairlearn MetricFrame audit over the same cohort, with the controlled figure taken after adjusting for level, role, location and tenure. The controlled 5.2% sits above the 5% average-pay-difference threshold at which Article 10(1) of Directive (EU) 2023/970 obliges a joint pay assessment with worker representatives, which is precisely the class of finding the platform exists to surface before a reporting deadline rather than at one.',
    },
    {
      claim: 'A 1.8x promotion-velocity disparity, significant at p < 0.01',
      evidence:
        'Mann-Whitney U test on years since last promotion across cohorts, reported with the effect size and the significance level rather than as a rating.',
    },
    {
      claim: '2.1x lift over random intervention targeting',
      evidence:
        'S-Learner uplift model in the current build. This is reported honestly as lift versus random, which is a weaker claim than it sounds: the S-Learner is the meta-learner most prone to shrinking a treatment effect towards zero, and lift versus random is not a validated uplift metric. The Q4 2026 release replaces it with a doubly-robust learner and publishes Qini, AUUC and RATE.',
    },
    {
      claim: '23% reduction in attrition and $4.2M of annual savings',
      evidence:
        'Pilot figures from the June 2026 deployment, quantified at a 1.5x salary replacement multiple, which sits inside Gallup\'s published range of one-half to two times annual salary. These are pilot results from one deployment, not a customer average and not a randomised evaluation.',
    },
    {
      claim: 'Every score carries reason codes',
      evidence:
        'SHAP TreeExplainer contributions are computed across the full feature set at scoring time and returned with the record through the scoring endpoint, positive and negative contributions both.',
    },
  ],
  outcomes: [
    { label: 'Attrition model AUC', value: '0.9401', caption: 'Synthetic benchmark; five-fold spread 0.931–0.946' },
    { label: 'Precision at the alert threshold', value: '81.4%', caption: 'Eight in ten flagged employees left' },
    { label: 'Attrition reduction', value: '−23%', caption: 'June 2026 pilot, model-guided interventions' },
    { label: 'Annual savings quantified', value: '$4.2M', caption: 'Pilot, at a 1.5x salary replacement multiple' },
    { label: 'Uplift over random targeting', value: '2.1x', caption: 'S-Learner; Qini and AUUC not yet reported' },
    { label: 'Unexplained pay gap found', value: '5.2%', caption: 'Controlled, Engineering — above the 5% Article 10 trigger' },
  ],
  faq: [
    {
      q: 'Is this legal under the EU AI Act?',
      a: 'It is regulated, not prohibited. Annex III point 4(b) covers AI used to make decisions affecting the terms of work-related relationships, promotion or termination, and to monitor and evaluate performance and behaviour — attrition scoring and intervention targeting sit inside that. The obligations are technical documentation, record-keeping, transparency and human oversight, and the platform generates all four as model outputs rather than as documents somebody writes afterwards. The AI Act entered general application on 2 August 2026; the Digital Omnibus, provisionally agreed on 6 May 2026, moved the Annex III obligations to 2 December 2027. Nothing was repealed, so the deadline is a schedule, not a reprieve.',
    },
    {
      q: 'Will managers use these scores to decide who to fire?',
      a: 'They cannot reach them. The prohibition is enforced in the API: scoring requests that carry a termination, discipline, performance-rating or redundancy-selection context are refused, and the score fields are absent from those payloads entirely. Every read is attributed and logged, and the access trail exports to an employee representative on request. This is deliberately a structural control rather than a policy, because a policy survives exactly until the first reorganisation that finds it inconvenient.',
    },
    {
      q: 'Our HRIS data is messy and half of it lives in spreadsheets.',
      a: 'That is the normal starting state and it constrains the sequence rather than the outcome. Starter needs one HRIS connector and a monthly snapshot, which is enough for scoring, reason codes and the pay-gap regression. The causal layer needs something harder: a record of which interventions were applied to whom, and how they were assigned. Almost nobody has that on day one, which is why the intervention ledger starts recording from the first cycle and the treatment-effect estimates improve over the first two to three cycles rather than arriving complete.',
    },
    {
      q: 'How is this different from Visier?',
      a: 'Visier is a better product for the question "what does my workforce look like and who is likely to leave". It has the governed data model, the benchmarks and fifteen years of enterprise deployment behind it. Qini answers a different question — what would change the outcome, by how much, for whom, within a budget — and produces the regulatory evidence from the same fitted model. Several customers will reasonably run both: Visier as the reporting layer, Qini as the decision and evidence layer beside it.',
    },
    {
      q: 'Can it actually prove causality, or is this correlation with better marketing?',
      a: 'It cannot prove causality from observational data and does not claim to. What it does is estimate treatment effects under stated identifying assumptions, using doubly-robust estimators that stay consistent if either the outcome model or the propensity model is correct, with cross-fitting and an ensemble whose disagreements are surfaced rather than averaged away. Where a customer will permit a small randomised holdout on a low-stakes arm, that holdout validates the observational estimate. Every effect estimate carries its confidence interval and its assumptions, and estimates that cannot be identified are reported as unidentified rather than as zero.',
    },
    {
      q: 'The AUC is 0.94 on a synthetic dataset. Why should we believe it on our data?',
      a: 'You should not, and this is stated in the material rather than buried. IBM\'s HR Analytics file is synthetic, holds 1,470 rows with 237 positives, and produces figures that do not transfer to real longitudinal data with censoring, time-varying covariates and shifting class balance by business unit. What the benchmark establishes is that the pipeline, the feature engineering, the explanation layer and the fairness auditing all function end to end. Performance on your data is established during implementation on your own held-out calendar periods, reported as a time-dependent concordance index and a calibration curve, and that figure — not the benchmark — is what goes in the model card.',
    },
    {
      q: 'What do we tell the works council?',
      a: 'That consultation happens before deployment, not after, and that three specific commitments are contractual: attrition scores are structurally unavailable to any adverse-action surface, free-text employee input is processed on the employee\'s own device and never transmitted, and the access log plus the fairness report are exportable to employee representatives on request. Under Article 10 of the Pay Transparency Directive the joint pay assessment is a joint exercise with worker representatives in any case, so the reporting surfaces are built to be read by both sides rather than only by the employer.',
    },
  ],
  trust: [
    {
      name: 'SOC 2 Type II',
      body:
        'The platform is built to the SOC 2 Type II control set across security, availability and confidentiality — least-privilege access with mandatory SSO, encryption in transit and at rest, change management with reviewed deploys, vendor review, and continuous evidence collection. Certification is a point-in-time audit of an operating entity, so the report is provided under NDA once the observation window closes rather than claimed in advance.',
    },
    {
      name: 'Data residency: EU and US',
      body:
        'Workforce data is pinned to a single region for its lifetime — an EU region for EU entities, a US region for US entities — with no cross-region replication of employee-level records. Aggregate benchmarks are computed within region. On Enterprise, region is set per legal entity so a multi-country group is not forced into a single jurisdiction to get a single report.',
    },
    {
      name: 'Model governance',
      body:
        'Every promoted model version carries a model card stating intended purpose, feature inventory, performance by cohort, calibration and known limitations; a dataset manifest with lineage and time boundaries; and a champion-challenger comparison against the version it replaced. Versions are immutable and every score is stamped with the version hash that produced it, so a score can always be reproduced and explained after the fact.',
    },
    {
      name: 'Human in the loop, and no adverse action',
      body:
        'No score triggers an action on its own. A named person reviews the recommendation, records a decision and may override it, and the override is stored as training signal. Separately, scores are structurally withheld from termination, discipline, performance-rating and redundancy-selection contexts at the API layer; that prohibition is a product constraint, not a configuration option a customer can switch off.',
    },
    {
      name: 'GDPR Article 22 and employee rights',
      body:
        'Because no decision producing legal or similarly significant effects is taken solely by automated means, Article 22 is addressed by design rather than by consent. Employees receive the meaningful information about the logic involved that Articles 13 to 15 require, in the form of the reason codes that the manager sees; subject access, rectification and erasure requests propagate to the feature store and the intervention ledger, and erasure removes the person from subsequent training sets.',
    },
    {
      name: 'EU AI Act Annex III obligations',
      body:
        'The deployment is treated as a high-risk system under Annex III point 4(b). Technical documentation, automatic event logging, transparency to deployers and human-oversight measures are produced as pipeline outputs per version and exported as a signed bundle. The Annex III application date is 2 December 2027 following the Digital Omnibus agreement of 6 May 2026; the artefacts ship before it rather than in the quarter before it.',
    },
    {
      name: 'NYC Local Law 144 bias audit',
      body:
        'Where the platform touches hiring or promotion in New York City, it emits the audit artefact the law requires — selection and impact ratios by sex, by race and ethnicity and by intersectional category, with counts, scoring rates and score distributions — formatted for an independent auditor with no employment or financial relationship to the employer or the tool. Candidate notice ten business days ahead and publication of the audit summary remain the employer\'s duties; the platform supplies the evidence and the dates.',
    },
    {
      name: 'Works councils and employee representatives',
      body:
        'Deployment assumes consultation. The implementation pack includes the intended-purpose statement, the feature inventory, the fairness report and the adverse-action prohibition in a form written for employee representatives rather than for procurement, and the access log is exportable to them on request. Under Article 10 of Directive (EU) 2023/970 the joint pay assessment is conducted with worker representatives, so the pay surfaces are built to be read by both parties.',
    },
  ],
  roadmap: [
    {
      quarter: 'Q4 2026',
      title: 'The doubly-robust intervention engine',
      body:
        'Retire the S-Learner. Ship doubly-robust and X-Learner estimation with cross-fitting and a causal-forest cross-check, a budget-constrained policy learner, and honest evaluation on the Qini curve and AUUC with variance-reduced outcome adjustment plus the rank-weighted average treatment effect. Lift-versus-random stops being reported.',
    },
    {
      quarter: 'Q1 2027',
      title: 'Real panel data and competing-risk survival',
      body:
        'Person-period ingestion from Workday, SuccessFactors and ADP with time-varying covariates; a discrete-time survival model treating voluntary exit, involuntary exit and internal move as competing risks, with a deep competing-risk model as the benchmark comparator. Evaluation moves to a time-dependent concordance index and calibration curves on held-out calendar periods, and conformal abstention ships alongside it.',
    },
    {
      quarter: 'Q2 2027',
      title: 'The evidence pack',
      body:
        'Annex III technical documentation, automatic event logging, model cards and human-oversight records generated per version and exported as a signed bundle; the Local Law 144 bias-audit exporter; the Article 9 pay-report generator with the Article 10 joint-assessment trigger wired to the six-month clock; and the works-council export. Ahead of the 2 December 2027 Annex III date by two quarters.',
    },
    {
      quarter: 'Q3 2027',
      title: 'The browser-resident skills graph',
      body:
        'On-device embedding and zero-shot tagging under transformers.js, a skills graph derived from the customer\'s own job architecture and reconciled to ESCO, and internal mobility added as a second treatment arm — so a lateral move can be priced against a pay correction on the same scale, with the free text that describes it never leaving the employee\'s device.',
    },
  ],
}

export default product
