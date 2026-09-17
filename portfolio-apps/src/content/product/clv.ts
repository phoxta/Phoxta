import {
  BeakerIcon, CommentDiscussionIcon, CpuIcon, CreditCardIcon, DatabaseIcon, GoalIcon, GraphIcon,
  HistoryIcon, HubotIcon, LawIcon, LightBulbIcon, MailIcon, MegaphoneIcon, MeterIcon, PulseIcon,
  ShieldCheckIcon, SlidersIcon, StopwatchIcon, TableIcon, TelescopeIcon, WorkflowIcon, XCircleIcon,
} from '@primer/octicons-react'
import type { Product } from '../product'

const product: Product = {
  name: 'Counterlift',
  category: 'Incremental retention platform',
  tagline: 'Retention budget graded on incremental margin, against a holdout that is never switched off',
  positioning:
    'Counterlift sits between the warehouse and the messaging stack and decides which customers are worth a retention offer, how large that offer should be, and whether the last campaign actually changed anything. It estimates the incremental effect of each intervention with doubly-robust causal models, optimises the targeting policy under a real spend cap rather than a hand-set score threshold, and grades every programme against a permanently reserved randomised holdout. It does not send messages, so it is the only layer in the stack with no reason to recommend sending more of them.',
  market: {
    size:
      'Mordor Intelligence estimates the customer-analytics market at USD 17.58bn in 2026, up from USD 14.82bn in 2025.',
    growth:
      'Forecast to USD 41.28bn by 2031, an 18.62% CAGR over the 2026–2031 period (Mordor Intelligence).',
    whyNow:
      'Two shifts landed within a year of each other. The EDPB’s Guidelines 2/2023, finalised in October 2024, pulled pixels, local storage, tracking links and IP-based tracking inside the Article 5(3) consent perimeter, so behavioural signal is now consent-gated at source and third-party enrichment is the least reliable input a retention team has — which raises the value of causal inference over first-party subscriber data a business already owns. At the same time the execution layer is metered on volume: Klaviyo bills on active profiles, Braze on monthly active users plus Action Credits. Neither vendor can credibly tell a customer to contact fewer people, and with discount budgets under CFO scrutiny that is precisely the question being asked. The EU AI Act’s Article 50 transparency duties, applicable from 2 August 2026, add a third pressure: generated offer copy now needs disclosure and a governance trail.',
  },
  personas: [
    {
      title: 'VP Growth / Retention',
      segment: 'Consumer subscription and DTC businesses, 100k–5M active customers',
      jobToBeDone:
        'I need to defend a seven-figure retention budget in a board review. Today I can show saves; I cannot show which of those saves would have happened anyway, so every number I present is soft.',
      statusQuo:
        'A propensity churn score exported from the warehouse into Klaviyo or Braze, a discount ladder set by intuition, and campaign reports that count responders rather than incremental customers.',
      successMetric: 'Net revenue retention, and incremental margin per pound of retention spend',
    },
    {
      title: 'Director of Lifecycle Marketing',
      segment: 'Retail and e-commerce teams already running Klaviyo, Braze or Iterable',
      jobToBeDone:
        'I want to stop discounting people who were going to renew regardless, without losing the ones who genuinely need the nudge — and I want to know which is which before I press send, not after.',
      statusQuo:
        'Segments built from RFM quintiles and a churn-risk decile, with an A/B split that gets collapsed as soon as one arm looks better in week one.',
      successMetric: 'Gross churn rate and discount cannibalisation — margin given away to customers who would have stayed',
    },
    {
      title: 'Head of Subscriber Analytics',
      segment: 'Media, telco and streaming, 1M+ subscribers, data already in Snowflake or BigQuery',
      jobToBeDone:
        'My churn model is fine. What I do not have is a defensible causal read on the offers we run against it, or the machinery to hold a clean control group across four quarters of retraining.',
      statusQuo:
        'An in-house gradient-boosted churn model, a dbt feature layer, and a notebook where someone re-derives lift by hand each quarter.',
      successMetric: 'Model-attributable revenue retained, and the width of the confidence interval on it',
    },
  ],
  pains: [
    {
      title: 'Most of the retention budget buys nothing',
      body:
        'A propensity model ranks who will leave, not who will respond. Wayfair’s own analysis of the same problem in advertising put the ceiling plainly: a perfect uplift model achieves the same incremental revenue as a perfect conversion model at roughly 40% of the marketing cost, with the rest spent on customers who would have converted anyway. Applied to retention, this platform’s modelling of the KKBox subscriber base found only 18.4% of at-risk customers were persuadable at all.',
      cost: 'Up to 60% of retention spend is structurally avoidable',
      icon: CreditCardIcon,
    },
    {
      title: 'The execution vendors are paid to increase contact volume',
      body:
        'Klaviyo meters on active profiles, with a free tier capped at 250 of them; Braze meters on monthly active users and a credit pool it calls Action Credits, and publishes no dollar figures at all. Both are excellent at delivery. Neither has any commercial reason to build the analysis that concludes a campaign should be halved, and neither ships a randomised holdout as a durable, protected object.',
      cost: 'Measurement owned by the party billed on volume',
      icon: MegaphoneIcon,
    },
    {
      title: 'Sleeping dogs — the offers that cause the churn they were sent to prevent',
      body:
        'A cancellation-flow discount reminds a dormant customer they are paying for something. Without a control arm this effect is invisible, because the customers it damages are counted as churners the campaign failed to save rather than churners the campaign created. In this platform’s scoring of the hundred riskiest KKBox subscribers, twelve fell into the segment that should not be contacted at all.',
      cost: '12 of every 100 targeted customers actively harmed by contact',
      icon: XCircleIcon,
    },
    {
      title: 'Having a churn model is not the same as having a policy',
      body:
        'The KDD 2026 study of uplift modelling under structural bias found that uplift targeting and uplift prediction are distinct objectives — being good at one does not imply being good at the other — and that model rankings are unstable under selection bias, spillover and measurement error. Teams that scored a model on AUC and then thresholded it have no basis for believing the resulting targeting rule is the right one.',
      cost: 'A ranking metric that does not predict targeting performance',
      icon: GraphIcon,
    },
    {
      title: 'Legacy survival tooling leaves accuracy on the table',
      body:
        'On a survival variant of exactly this KKBox subscriber data, a linear Cox proportional-hazards model reaches a time-dependent concordance of 0.816 while DeepHit reaches 0.888. Cox also collapses voluntary cancellation and involuntary payment failure into one hazard, so the model recommends a discount to a customer whose card simply expired.',
      cost: '0.07 C-index given away, and the wrong intervention on failed payments',
      icon: StopwatchIcon,
    },
    {
      title: 'Loyalty pricing is now a compliance surface',
      body:
        'A discount ladder driven by predicted lifetime value is a financial incentive under the CCPA. California law permits promotions in exchange for collecting or keeping personal information only where the incentive is reasonably related to the value of that information, and forbids charging a different price because someone exercised a privacy right. Most CLV-tiered offer ladders have no documented basis of that kind.',
      cost: 'Undocumented differential pricing across a whole customer base',
      icon: LawIcon,
    },
  ],
  wedge: {
    title: 'The holdout is a permanent object, and the budget is a constraint in the optimiser',
    body:
      'Counterlift reserves a fixed random share of every eligible cohort from all retention contact, persists that assignment in the warehouse so it survives retrains, segment changes and vendor migrations, and refuses to report a campaign result any other way. On top of it the targeting decision is posed correctly: maximise expected incremental margin subject to a spend cap, which is a knapsack over uplift-per-pound with per-channel costs attached, solved with a doubly-robust policy learner rather than a hand-set score threshold. That combination is not something Klaviyo or Braze can bolt on quickly, and the obstacle is commercial rather than technical. They are execution layers billed on contacts, monthly active users and message volume; a system whose most common recommendation is "contact 40% fewer people and spend the difference on the ones who respond" reduces the revenue of the party that would have to build it. Pecan and Faraday sell prediction, which is the input, not the decision. Counterlift never sends a message and never bills for one, so the recommendation to send fewer costs it nothing.',
  },
  features: [
    {
      name: 'Permanent holdout ledger',
      summary: 'A protected control group that survives retrains, migrations and reorganisations.',
      detail:
        'Assignment is deterministic on a hashed customer key with a per-programme salt, written to the warehouse as a slowly-changing dimension and enforced at suppression time, so a customer cannot drift between arms when a segment definition changes. The ledger records every assignment, every exclusion and every override with an actor and a timestamp, and campaign results can only be computed against the arm that was in force on the send date.',
      icon: BeakerIcon,
      tier: 'starter',
    },
    {
      name: 'Incremental margin, not saves',
      summary: 'Every campaign is graded on the difference against control, after the cost of the offer.',
      detail:
        'The reporting primitive is incremental gross margin: treated outcome minus control outcome, multiplied by contribution margin, minus offer cost and per-channel contact cost. Confidence intervals come from a bootstrap over the holdout rather than a normal approximation on a save rate, and the same figures drive the AUUC and Qini curves so the model score and the money agree by construction.',
      icon: MeterIcon,
      tier: 'starter',
    },
    {
      name: 'Budget-constrained policy optimiser',
      summary: 'Spend the budget you actually have, on the customers where each pound does the most work.',
      detail:
        'Targeting is solved as a knapsack over expected incremental margin per pound of spend, with per-channel costs supplied by the customer — an email, an email plus SMS, and an outbound call are three different price points against the same person. A greedy ratio ordering with a linear-programming relaxation at the boundary produces the frontier, and the resulting rule is fitted as a doubly-robust policy tree so it can be read, reviewed and signed off rather than trusted as a score.',
      icon: SlidersIcon,
      tier: 'growth',
    },
    {
      name: 'Warehouse-native scoring',
      summary: 'Models run where the data already lives; nothing needs to be copied out.',
      detail:
        'Feature definitions compile to SQL executed inside Snowflake, BigQuery or Databricks, driven by the customer’s existing dbt models, with scores written back as a table rather than shipped to a vendor cloud. For teams that prefer it, the same pipeline runs as a managed batch with a signed export; the zero-copy path is the default because it keeps residency, retention and access control under the customer’s existing policies.',
      icon: DatabaseIcon,
      tier: 'growth',
    },
    {
      name: 'Competing-risks survival',
      summary: 'Voluntary cancellation and payment failure are modelled as different events.',
      detail:
        'A discrete-time hazard model over monthly intervals fits a cause-specific head per risk, dropping the proportional-hazards assumption and emitting a per-period hazard the planner consumes directly. It matters because the two events take different remedies — an offer against intent, a card-retry and dunning sequence against involuntary failure — and a single blended hazard prescribes the wrong one for both.',
      icon: StopwatchIcon,
      tier: 'growth',
    },
    {
      name: 'Value distributions, not point estimates',
      summary: 'Offer caps are set from a customer’s value quantiles, not their expected value.',
      detail:
        'The lifetime-value head predicts a distribution — the probability of any future value and the parameters of the spend distribution given return — and is scored on normalised Gini and decile calibration rather than mean absolute error. Offer ceilings are then derived from a lower quantile rather than the mean, which is what stops a £40 win-back landing on a customer whose expected value only looks high because of a long tail.',
      icon: GoalIcon,
      tier: 'growth',
    },
    {
      name: 'Offer library with orchestration handoff',
      summary: 'Counterlift decides; your existing stack sends.',
      detail:
        'Offers are defined once as a template plus an economic envelope — channel, cost, discount ceiling, cooling-off period, eligibility rules — and the resulting audience, offer and suppression list is pushed to Braze, Klaviyo, Iterable or Salesforce through their audience APIs. Suppression is pushed as hard as targeting, so the holdout and the sleeping-dog segment are excluded in the sending tool rather than merely flagged in a dashboard.',
      icon: MailIcon,
      tier: 'starter',
    },
    {
      name: 'Cohort and channel value attribution',
      summary: 'Which acquisition sources produce customers worth retaining.',
      detail:
        'Value distributions are aggregated by acquisition cohort, channel and plan so the spread is visible at the point where acquisition budget is set. On the reference subscriber base the gap between the best and worst channel was 3.7× — £31.20 per referred customer against £8.50 per paid-social one — which is a larger lever than any downstream discount decision.',
      icon: TableIcon,
      tier: 'growth',
    },
    {
      name: 'Calibration and drift gating',
      summary: 'A miscalibrated probability mis-prices every offer sized from it.',
      detail:
        'Expected calibration error per decile is recomputed weekly on the holdout and population-stability indices are tracked on every input feature. Breaching the configured band freezes the policy and raises an alert rather than quietly degrading, because a churn probability that has drifted does not merely mis-rank customers — it corrupts the offer size derived from it.',
      icon: PulseIcon,
      tier: 'growth',
    },
    {
      name: 'Approval workflow for policy changes',
      summary: 'Nothing reaches customers without a reviewed diff.',
      detail:
        'A change to a targeting policy, an offer envelope or a holdout share is proposed as a diff showing the projected change in audience size, spend and incremental margin, and requires named approval before it takes effect. Approvals, rejections and emergency overrides are all recorded against the campaign they affected.',
      icon: WorkflowIcon,
      tier: 'enterprise',
    },
    {
      name: 'Versioned model and policy history',
      summary: 'Any past result can be reproduced from the artefacts that produced it.',
      detail:
        'Model weights, feature definitions, policy parameters, budget and holdout assignment are versioned together and stamped onto every score. A quarter-old campaign report can be regenerated exactly, and a regression can be traced to the specific artefact that changed — which is the practical prerequisite for defending a number to a finance team.',
      icon: HistoryIcon,
      tier: 'enterprise',
    },
    {
      name: 'Consent-aware feature layer',
      summary: 'Consent state is a column in the model, not an afterthought in the export.',
      detail:
        'Every behavioural feature carries the lawful basis it was collected under, and customers who withheld consent are handled by an explicit policy — excluded, or scored on a reduced feature set — rather than silently dropped by a join. Opt-out of sale or sharing propagates to every downstream destination, including audience pushes into advertising platforms.',
      icon: ShieldCheckIcon,
      tier: 'starter',
    },
  ],
  aiFeatures: [
    {
      name: 'Doubly-robust uplift estimation',
      summary: 'Incremental effect per customer, from a model that stays honest if either half is wrong.',
      detail:
        'A cross-fitted DR-Learner estimates the conditional average treatment effect of each offer, remaining unbiased if either the propensity model or the outcome model is correctly specified — unlike a two-model approach, where the difference of two independently fitted predictions is noisier than either and diverges wherever the treated and control populations differ for reasons unrelated to treatment. Models are selected on a doubly-robust pseudo-outcome loss and on RATE with Qini weighting, not on response AUC.',
      icon: CpuIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Sequence encoder over the raw event stream',
      summary: 'Behaviour learned from the event log rather than hand-built RFM buckets.',
      detail:
        'A causal transformer encoder runs over the raw ordered event sequence — sessions, plays, payments, support contacts — and shares one representation across the churn, value and survival heads, which recovers the order and timing that 28-day aggregates discard. The engineered RFM features are concatenated as a side input so the model cannot underperform the aggregate baseline, and attributions are computed on that branch so reason codes remain readable.',
      icon: HubotIcon,
      ai: true,
      tier: 'enterprise',
    },
    {
      name: 'On-device text encoding',
      summary: 'Cancellation reasons are encoded in the browser; the raw text never leaves the client.',
      detail:
        'Free-text cancellation reasons and support-ticket bodies are embedded on the customer’s own device with transformers.js — Xenova/all-MiniLM-L6-v2 for 384-dimensional sentence vectors, or Xenova/distilbert-base-uncased-finetuned-sst-2-english where a sentiment label is sufficient. Only the vector or the label is transmitted, which keeps the highest-signal and highest-sensitivity input in the system out of the data pipeline entirely.',
      icon: CommentDiscussionIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Reason codes and counterfactual explanations',
      summary: 'Why this customer, why this offer, why this size.',
      detail:
        'Every score carries SHAP attributions over the feature set plus a counterfactual statement of what would have to change for the decision to flip — the shortest path from suppressed to targeted, or from a 10% ceiling to a 20% one. The same artefacts back the human-review route required where an automated decision significantly affects a customer.',
      icon: LightBulbIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'Sequential incrementality testing',
      summary: 'Read results as they arrive without inflating the false-positive rate.',
      detail:
        'Programme results are evaluated with always-valid sequential bounds rather than a single fixed-horizon test, so a campaign can be stopped early for futility or harm without the peeking problem that makes most marketing A/B results indefensible. Bayesian posteriors on incremental margin sit alongside the frequentist interval, because the question a finance team asks is the probability the programme is positive, not whether a p-value cleared a threshold.',
      icon: TelescopeIcon,
      ai: true,
      tier: 'growth',
    },
  ],
  competitors: [
    {
      name: 'Klaviyo',
      url: 'https://www.klaviyo.com/pricing',
      strength:
        'The default execution layer for e-commerce email and SMS, with a customer-data tier attached and the deepest Shopify integration in the category.',
      gap:
        'Metered on active profiles, so growth in the account is growth in contactable people; measurement is campaign attribution rather than a protected control arm, and nothing in the product argues for sending less.',
      pricing: 'Free to 250 active profiles and 500 emails a month; the published pricing configurator shows a USD 45/month total',
    },
    {
      name: 'Braze',
      url: 'https://www.braze.com/pricing',
      strength:
        'Cross-channel orchestration at enterprise scale — push, in-app, email, SMS — with BrazeAI features layered into the campaign builder.',
      gap:
        'Priced on monthly active users plus an Action Credits pool, with no published dollar figures anywhere on the pricing page. The unit of measurement is the message, not the incremental customer, and holdouts are a campaign setting rather than a persistent object.',
      pricing: 'Braze Go / Select / Pro / Enterprise; MAU plus Action Credits, no public pricing',
    },
    {
      name: 'Amplitude',
      url: 'https://amplitude.com/pricing',
      strength:
        'Product analytics and experimentation over the event stream, strong at cohort and funnel diagnosis, and genuinely good at telling a team what happened.',
      gap:
        'Event-metered and descriptive. It will show that a cohort retained better; it will not size an offer, allocate a fixed budget across a customer base, or produce a doubly-robust estimate of what the campaign caused.',
      pricing: 'Free to 2M events a month; Plus starts at $0 and scales to 70M events; Growth and Enterprise quoted',
    },
    {
      name: 'Pecan AI',
      url: 'https://www.pecan.ai/pricing/',
      strength:
        'Predictive models built directly over warehouse data without a data-science team, with a fast path from a table to a scored churn or LTV column.',
      gap:
        'Sells prediction, which is the input rather than the decision. Metered on monthly prediction batches and stored rows, with no incremental measurement, no budget constraint and no holdout discipline in the product.',
      pricing: 'Starter / Team / Business metered on 2 / 10 / custom prediction batches and 500M / 2Bn / 5Bn rows; no published dollar figures',
    },
    {
      name: 'Faraday',
      url: 'https://faraday.ai/',
      strength:
        'Consumer enrichment at scale — 1,400+ attributes across 240 million US adults — with propensity, churn-risk and next-best-offer models exposed over an API and MCP, and no contract on the self-serve tier.',
      gap:
        'Third-party consumer data is the input most exposed by consent gating, and the models are propensity models. It answers who resembles a good customer, not what a given offer would change for a customer you already have.',
      pricing: 'Faraday Pro is pay-per-match with 200 free credits and no minimum; Enterprise is sales-led',
    },
    {
      name: 'Build it in-house on EconML and CausalML',
      url: 'https://github.com/py-why/EconML',
      strength:
        'The genuinely serious alternative. EconML ships DR-Learners, causal-forest DML and DRPolicyTree policy learning; Uber’s CausalML adds meta-learners, six uplift-tree families, a doubly-robust pseudo-outcome loss and RATE. Both are free and both are what Counterlift builds on.',
      gap:
        'They are libraries, not a system. There is no holdout ledger that survives a retrain, no budget optimiser, no orchestration handoff, no approval trail and no calibration gate — and the KDD 2026 work on metric instability under structural bias is a warning about exactly the part teams reimplement in a notebook.',
      pricing: 'Free and open source; the real cost is a causal-inference engineer and the platform around it',
    },
  ],
  pricing: [
    {
      id: 'starter',
      name: 'Starter',
      monthly: 600,
      annual: 500,
      tagline: 'One programme, one holdout, honest numbers from the first campaign.',
      meter: '100,000 scored customer profiles per month · one retention programme · one permanent holdout',
      features: [
        'Permanent holdout ledger with deterministic assignment',
        'Incremental margin reporting with bootstrap confidence intervals',
        'Churn and lifetime-value scoring on a managed batch pipeline',
        'SHAP reason codes and counterfactual explanations on every score',
        'Audience and suppression push to Klaviyo, Braze or Iterable',
        'Consent-aware feature layer with opt-out propagation',
      ],
      cta: 'Start a programme',
    },
    {
      id: 'growth',
      name: 'Growth',
      monthly: 2400,
      annual: 2000,
      tagline: 'The budget optimiser, the survival model and as many programmes as you run.',
      meter: '1,000,000 scored customer profiles per month · unlimited programmes, holdouts and offer policies',
      features: [
        'Everything in Starter',
        'Budget-constrained policy optimiser with per-channel costs',
        'Doubly-robust uplift estimation with AUUC, Qini and RATE reporting',
        'Competing-risks survival for voluntary and involuntary churn',
        'Distributional lifetime value with quantile-based offer caps',
        'Warehouse-native scoring in Snowflake, BigQuery or Databricks',
        'Calibration and drift gating with automatic policy freeze',
      ],
      cta: 'Talk to us about Growth',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthly: null,
      tagline: 'Multi-brand, multi-region, and auditable end to end.',
      meter: 'Metered on scored profiles across brands and regions · zero-copy deployment in your own warehouse',
      features: [
        'Everything in Growth',
        'Zero-copy deployment with data residency in your chosen region',
        'Sequence encoder over the raw event stream',
        'Approval workflow with reviewed policy diffs and named sign-off',
        'Versioned model, feature, policy and holdout history with full replay',
        'Model cards, governance review and a named solutions engineer',
        'SSO, SCIM provisioning and customer-managed encryption keys',
      ],
      cta: 'Request pricing',
    },
  ],
  integrations: [
    { name: 'Snowflake', kind: 'warehouse', domain: 'snowflake.com' },
    { name: 'Google BigQuery', kind: 'warehouse', domain: 'cloud.google.com' },
    { name: 'Databricks', kind: 'lakehouse', domain: 'databricks.com' },
    { name: 'dbt', kind: 'transformation', domain: 'getdbt.com' },
    { name: 'Segment', kind: 'event pipeline', domain: 'segment.com' },
    { name: 'Amplitude', kind: 'product analytics', domain: 'amplitude.com' },
    { name: 'Braze', kind: 'orchestration', domain: 'braze.com' },
    { name: 'Klaviyo', kind: 'orchestration', domain: 'klaviyo.com' },
    { name: 'Iterable', kind: 'orchestration', domain: 'iterable.com' },
    { name: 'Stripe', kind: 'billing', domain: 'stripe.com' },
    { name: 'Shopify', kind: 'commerce', domain: 'shopify.com' },
    { name: 'Salesforce', kind: 'crm', domain: 'salesforce.com' },
  ],
  proof: [
    {
      claim: '30-day churn classification at AUC 0.86 with recall 0.78',
      evidence:
        'XGBoost 2.0 on the KKBox WSDM 2018 subscriber dataset — 2.6M subscribers, 2.1 GB of membership, transaction and daily listening logs — on a held-out split. Stated honestly: this is a self-defined 30-day label, not the competition task, which was scored on log loss and won by a gradient-boosted temporal model placing first of 575 teams. The figures are not leaderboard-comparable.',
    },
    {
      claim: 'Six-month lifetime value at $4.21 mean absolute error',
      evidence:
        'BG/NBD with a Gamma-Gamma spend model on the same public KKBox dataset. MAE measures a conditional mean on a heavy-tailed target; the distributional head that replaces it is scored on normalised Gini and decile calibration instead, following Google’s zero-inflated lognormal work.',
    },
    {
      claim: '18.4% of at-risk customers are persuadable',
      evidence:
        'X-Learner segmentation over the KKBox base, with treatment and control simulated rather than randomly assigned. This is the number that motivated Counterlift’s permanent holdout: until it is reproduced against a real randomised arm it is a modelling result, not a measured one.',
    },
    {
      claim: '3.2× return on retention spend versus propensity targeting',
      evidence:
        'A single pilot programme, comparing uplift-targeted contact against a propensity-ranked baseline. One programme, one business, one quarter — reported as a pilot result and not as a platform average.',
    },
    {
      claim: '23% reduction in churn and $1.8M of revenue protected per quarter',
      evidence:
        'The same pilot, over one campaign cycle. Both figures come from the pilot business’s own revenue reporting rather than from a public benchmark.',
    },
    {
      claim: '3.7× spread in customer value between acquisition channels',
      evidence:
        'Cohort analysis on the pilot base: $31.20 average value per referred customer against $8.50 per paid-social customer. A within-business comparison, not an industry figure.',
    },
    {
      claim: 'Uplift model AUC 0.832',
      evidence:
        'Reported for completeness and flagged as the wrong metric. This is a treatment-response AUC, which measures propensity rather than incremental effect; AUUC, a Qini coefficient and RATE on a randomised holdout are the figures Counterlift publishes instead.',
    },
  ],
  outcomes: [
    { label: 'Persuadable share of at-risk base', value: '18.4%', caption: 'Modelled on 2.6M KKBox subscribers — the rest of the budget is avoidable' },
    { label: 'Retention ROI vs propensity targeting', value: '3.2×', caption: 'Single pilot programme, one campaign cycle' },
    { label: 'Churn reduction', value: '−23%', caption: 'Pilot, uplift-targeted interventions only' },
    { label: 'Revenue protected', value: '$1.8M / quarter', caption: 'Pilot business, self-reported' },
    { label: 'Acquisition-channel value spread', value: '3.7×', caption: '$31.20 referral against $8.50 paid social' },
    { label: 'Six-month CLV error', value: '$4.21 MAE', caption: 'BG/NBD + Gamma-Gamma on the public KKBox dataset' },
  ],
  faq: [
    {
      q: 'We already run Klaviyo and Braze. Why add another system?',
      a: 'Counterlift does not replace either — it decides what they should send and to whom, then pushes the audience and the suppression list into them through their audience APIs. The two products are metered on active profiles and monthly active users respectively, so the analysis that concludes a campaign should be smaller is one neither is structurally motivated to build. Counterlift never sends a message and never bills for one.',
    },
    {
      q: 'How do you actually prove incrementality rather than claiming it?',
      a: 'A fixed random share of every eligible cohort is reserved from all retention contact and persisted in your warehouse, so the arm survives model retrains, segment changes and vendor migrations. Campaign results are only ever reported as the difference against that arm, after offer and contact cost, with bootstrap confidence intervals — and results are read with always-valid sequential bounds so early looks do not inflate the false-positive rate. If you switch the holdout off, the reporting stops.',
    },
    {
      q: 'Do we have to move our data?',
      a: 'No. On Growth and Enterprise the feature definitions compile to SQL that runs inside your Snowflake, BigQuery or Databricks account against your existing dbt models, and scores are written back as a table. Nothing is copied to our infrastructure. A managed batch pipeline is available for teams that prefer it, and Starter uses that path by default.',
    },
    {
      q: 'Our churn model already works. What does this add?',
      a: 'A churn model ranks who will leave. It cannot tell you who will respond to an offer, and the KDD 2026 study of uplift modelling under structural bias found that being good at prediction does not imply being good at targeting — the two are distinct objectives with unstable rankings between them. Keep your model: Counterlift can consume its scores as a feature and add the causal layer, the budget optimiser and the holdout around it.',
    },
    {
      q: 'What about privacy and consent?',
      a: 'Consent state is a column in the feature layer with an explicit policy for customers who withheld it, rather than a silent join that drops them, and opt-out of sale or sharing propagates to every downstream destination including advertising audiences. Free-text cancellation reasons are embedded on the customer’s own device with transformers.js, so the raw text never reaches the pipeline. Every automated decision carries reason codes and a human-review route.',
    },
    {
      q: 'Is a value-based discount ladder legally safe?',
      a: 'It is a financial incentive under the CCPA, which permits promotions in exchange for collecting or keeping personal information only where the incentive is reasonably related to the value of that information, and forbids charging a different price because someone exercised a privacy right. Counterlift produces the documented value estimate and the audit trail that makes the notice defensible; it does not remove the obligation to publish one.',
    },
    {
      q: 'How long before we see a number we can take to the board?',
      a: 'The holdout can be cut and the first programme scored within a fortnight of warehouse access. The first defensible incremental-margin figure arrives at the end of that programme’s measurement window — typically 30 to 60 days, because incremental retention cannot be measured faster than customers churn. Anything claiming a causal result sooner is measuring responders.',
    },
  ],
  trust: [
    {
      name: 'SOC 2 Type II',
      body:
        'Controls audited over an observation window covering security, availability and confidentiality, with the report available under NDA. Penetration testing is annual and remediation is tracked to closure.',
    },
    {
      name: 'Data residency',
      body:
        'Processing pinned to EU, UK or US regions at the account level, with no cross-region replication of customer data. On the zero-copy deployment, subscriber-level data never leaves the customer’s own warehouse region at all.',
    },
    {
      name: 'Warehouse-native, zero-copy option',
      body:
        'Feature computation and scoring execute inside Snowflake, BigQuery or Databricks under the customer’s existing roles, retention rules and network policies. Counterlift stores model artefacts, policy definitions and aggregate results — not the subscriber table.',
    },
    {
      name: 'No personal identifiers in the feature set',
      body:
        'Models train on behavioural and transactional aggregates keyed by a hashed customer identifier. Names, addresses, contact details and payment instruments are excluded from feature computation, and special-category data is blocked at ingestion because Article 22 forbids basing an automated decision on it.',
    },
    {
      name: 'Model governance',
      body:
        'Every model ships with a model card recording training window, feature list, evaluation on the holdout, calibration by decile and known failure modes. Model, features, policy, budget and holdout assignment are versioned together and stamped onto each score, so any past decision is reproducible from the artefacts that produced it.',
    },
    {
      name: 'Holdout integrity',
      body:
        'Assignment is deterministic and immutable for the life of a programme, changes require named approval and are recorded with an actor and timestamp, and campaign reporting is disabled for any programme whose control arm has been contaminated. The control group is treated as an auditable asset rather than a campaign setting.',
    },
    {
      name: 'GDPR, CCPA and consent propagation',
      body:
        'Data-processing agreement with standard contractual clauses, documented lawful basis per feature, a human-review route on suppression and offer-sizing decisions, and opt-out state propagated to every downstream destination. Generated offer copy is marked as AI-generated in line with the EU AI Act’s Article 50 transparency duties, applicable since 2 August 2026.',
    },
  ],
  roadmap: [
    {
      quarter: 'Q4 2026',
      title: 'Holdout ledger and incremental reporting',
      body:
        'The permanent randomised holdout, deterministic assignment persisted to the warehouse, incremental gross-margin reporting with bootstrap intervals, and audience plus suppression push to Klaviyo, Braze and Iterable. The deliberate scope limit is that nothing else ships until the measurement layer is trustworthy.',
    },
    {
      quarter: 'Q1 2027',
      title: 'Doubly-robust uplift and the budget optimiser',
      body:
        'Cross-fitted DR-Learner estimation with model selection on the doubly-robust pseudo-outcome loss and RATE, AUUC and Qini reported as numbers on the holdout, and the knapsack policy optimiser with per-channel costs — plus doubly-robust policy trees so the resulting rule can be reviewed rather than trusted.',
    },
    {
      quarter: 'Q2 2027',
      title: 'Distributional value and competing-risks survival',
      body:
        'The zero-inflated lognormal lifetime-value head with quantile-based offer caps, scored on normalised Gini and decile calibration, and the discrete-time survival model with separate heads for voluntary cancellation and involuntary payment failure. Warehouse-native execution goes generally available across Snowflake, BigQuery and Databricks.',
    },
    {
      quarter: 'Q3 2027',
      title: 'Sequence encoder, governance and multi-brand',
      body:
        'The causal transformer encoder over the raw event stream sharing one representation across all three heads, on-device text encoding for cancellation reasons, approval workflow with reviewed policy diffs, and multi-brand and multi-region deployment with per-region residency and customer-managed keys.',
    },
  ],
}

export default product
