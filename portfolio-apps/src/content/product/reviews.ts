import {
  AgentIcon, AiModelIcon, BeakerIcon, CacheIcon, CpuIcon, IssueOpenedIcon, LawIcon, ReportIcon,
  SearchIcon, ServerIcon, ShieldIcon, SparkleIcon, StackIcon, TelescopeIcon, VersionsIcon, ZapIcon,
} from '@primer/octicons-react'
import type { Product } from '../product'

/**
 * Taxon — the commercial layer over the Customer Review Categorisation project.
 * Every figure is sourced; competitor pricing was read from the vendors' own pages
 * in September 2026.
 */
const product: Product = {
  name: 'Taxon',
  tagline: 'Read every review, not a 2% sample — for less than the sample costs',
  positioning:
    'Taxon is a voice-of-customer engine for product, quality and category teams who need the whole review stream classified, not a quarterly coded sample. A frontier model authors and maintains the issue taxonomy; a distilled classifier applies it to every record at effectively zero marginal cost; and every theme, trend and executive summary links back to the verbatims that produced it. Where incumbents meter on records analysed, Taxon prices on catalogue size, so 100% coverage is the default rather than an upgrade.',
  category: 'Voice-of-customer intelligence',
  market: {
    size:
      'Mordor Intelligence sizes the voice-of-customer software market at USD 9.18bn in 2026, rising to USD 19.83bn by 2031; retail and e-commerce is the largest end-user segment at 24.36% of 2025 revenue. The Business Research Company scopes the broader feedback-and-reviews management software market at USD 19.56bn in 2026.',
    growth:
      '16.65% CAGR 2026–2031 (Mordor); 14.4% CAGR to 2030 on the wider feedback-and-reviews definition. In-app behaviour and feedback is the fastest-growing data source at 21.34% CAGR.',
    whyNow:
      'Three things changed in 2025–26. First, unit economics: cache reads settled at 0.1x base input across Anthropic, OpenAI and Google, batch submission takes a further flat 50%, and the discounts stack — so classifying every record now costs less than commissioning a sample. Second, the research turned: Bucher and Martini show a DeBERTa V3 head fine-tuned on 200 examples reaching F1 0.94 where zero-shot GPT-4 reaches 0.51, and the March 2026 BTZSC benchmark puts rerankers and embedding models on the accuracy-per-latency Pareto frontier with large LLMs outside it — so the cheap path is now also the accurate one. Third, the category consolidated and repriced: Qualtrics acquired Press Ganey Forsta for USD 6.75bn in October 2025, and seven of the eight largest listening and VoC vendors publish no price at all.',
  },
  personas: [
    {
      title: 'Director of Product Quality, consumer electronics',
      segment: 'Hardware brands shipping through marketplaces, 50k–500k reviews a month across a few hundred SKUs',
      jobToBeDone:
        'Tell me which failure mode is growing this week and on which SKU, with the actual customer sentences attached, so engineering argues about the fix instead of about whether the data is real.',
      statusQuo:
        'A quarterly agency study codes roughly 2,000 verbatims against a code frame agreed by committee. The frame takes six weeks to negotiate, the sample cannot see a defect affecting under 5% of units, and by the time the deck lands the next production run has shipped.',
      successMetric: 'Return rate and warranty claim rate per SKU — US returns ran at 15.8% of sales in 2025, 19.3% online (NRF).',
    },
    {
      title: 'VP of Customer Experience, multi-brand retail',
      segment: 'Marketplaces and retail groups, 100k+ reviews and support conversations a month across many categories',
      jobToBeDone:
        'Give me one theme taxonomy that holds across every category and survives being changed, so a trend line does not reset every time we add a label.',
      statusQuo:
        'An enterprise experience platform with prebuilt topic models, priced on interactions. Coverage is a budget conversation: each new feedback source has to justify its own line, so social and marketplace reviews are sampled or excluded entirely.',
      successMetric: 'Contacts per order and CSAT — the two numbers the board sees monthly.',
    },
    {
      title: 'Head of Consumer Insight, CPG portfolio',
      segment: 'Multi-brand consumer goods, 400+ brands, reviews in eight or more languages',
      jobToBeDone:
        'Prove the claim before legal signs it off — show me the evidence behind "consumers say the new formula smells wrong" in ten seconds, not ten days.',
      statusQuo:
        'A text-analytics tool that outputs sentiment and topic percentages but cannot show the underlying verbatims without an export, so every insight is re-litigated by hand before it can be used in a brief.',
      successMetric: 'Time from signal to decision, and the share of category reviews the team can defend as read.',
    },
  ],
  pains: [
    {
      title: 'Sampling finds the defect after it becomes a return wave',
      body:
        'A defect affecting 8% of units appears in 0.16% of a 2% sample — below any detection threshold until it reaches public attention. Returns are the bill: the NRF and Happy Returns 2025 study puts US returns at USD 849.9bn, 15.8% of annual sales, with the online return rate at 19.3% and 9% of all returns fraudulent.',
      cost: 'USD 849.9bn of US merchandise returned in 2025',
      icon: IssueOpenedIcon,
    },
    {
      title: 'Coverage is metered, so coverage is rationed',
      body:
        'Qualtrics prices customer experience on "interactions"; Chattermill qualifies inbound buyers by whether they analyse fewer than 1,000, 1,001–5,000 or more than 5,000 feedback records a month. When the meter is the record, every additional source is a purchase decision, and the sources that get cut are the noisy long-tail ones where new problems first appear.',
      cost: 'Every new feedback source is a new line item',
      icon: CacheIcon,
    },
    {
      title: 'The analysis you actually want sits in the top tier',
      body:
        'Sprout Social publishes the only complete price ladder among the major listening vendors, and sentiment analysis, API access and message-spike alerting all sit in the USD 399 per seat per month Advanced plan. Capterra reviewers of the enterprise alternative rate value for money 3.9/5 and describe it as "way too expensive" and "overkill for small/mid-sized businesses".',
      cost: 'USD 399 / seat / month before a single record is analysed',
      icon: LawIcon,
    },
    {
      title: 'Zero-shot prompting is not accurate enough for a bespoke taxonomy',
      body:
        'Teams that replaced their classifier with a prompt found out the hard way. Across four case studies, small encoders fine-tuned on 200 labelled examples beat zero-shot frontier models every time: F1 0.94 versus 0.51 on stance, 0.85 versus 0.18 on emotion, 0.82 versus 0.26 on multi-class position. The gap widens exactly where a real issue taxonomy lives — many classes, domain-specific language.',
      cost: 'A 43-point F1 gap on multi-class domain taxonomies',
      icon: CpuIcon,
    },
    {
      title: 'A fixed taxonomy can only find what it already names',
      body:
        'Keyword rules and frozen classifier heads report on the categories someone wrote down last year. TopicGPT reaches harmonic-mean purity 0.74 against human-annotated topics where the strongest classical baseline reaches 0.64, precisely because the model proposes the labels instead of applying them. Without that loop, new defect modes and new competitive comparisons stay invisible until a person notices.',
      icon: TelescopeIcon,
    },
    {
      title: 'The compliance surface moved under the category',
      body:
        'The FTC rule on consumer reviews and testimonials took effect on 21 October 2024, reaching AI-generated fake reviews and review suppression, with an FTC Act civil-penalty ceiling of USD 53,088 per violation since January 2025 — and in Operation AI Comply the FTC pursued Rytr, a writing tool marketed for generating reviews, not only the people posting them. EU AI Act Article 50 applies from 2 August 2026 with fines up to EUR 15m or 3% of global turnover.',
      cost: 'USD 53,088 per violation ceiling; EUR 15m or 3% of turnover',
      icon: ShieldIcon,
    },
  ],
  wedge: {
    title: 'Coverage stops being a line item',
    body:
      'Every incumbent in this category meters on the unit Taxon wants to make free — interactions, records, feedback volume, review invitations. Taxon splits the work so the meter no longer has to exist: a frontier model is called once per topic to author and maintain the taxonomy, a distilled encoder trained on those labels applies it to every record at effectively zero marginal cost, and the residual the encoder is unsure about goes to the frontier model through a cached prefix in a batch, at 0.1x input and a further 50% off. That is a different cost curve, not a discount — which is why an incumbent cannot match it without repricing its entire book. The customer-visible consequence is a price quoted per catalogue and per language, with the record count left out of the contract entirely.',
  },
  features: [
    {
      name: 'Eight-field structured extraction',
      summary: 'Every review becomes the same strict JSON object, never a paragraph to parse.',
      detail:
        'Issue category, sentiment label and score, affected aspects, one to three key issues, an action flag, a priority and a one-sentence summary, emitted under constrained decoding against a JSON Schema so a malformed payload is impossible rather than repaired. The compiled grammar is cached for 24 hours, so only the first call of the day pays compilation latency.',
      icon: SparkleIcon,
      ai: true,
      tier: 'starter',
      image: '01_live_classifier.webp',
    },
    {
      name: 'Cached taxonomy prefix and batch submission',
      summary: 'The taxonomy is written once per day, not once per review.',
      detail:
        'The category definitions and few-shot examples sit in a ~6,000-token prefix marked cacheable with a one-hour TTL; cache reads bill at 0.1x base input. Anything not needed synchronously is submitted through the provider Batch API for a further flat 50%. The two discounts stack, which is what puts the marginal cost of a classified review in the tenths of a cent.',
      icon: CacheIcon,
      tier: 'starter',
    },
    {
      name: 'Distilled local classifier',
      summary: 'After the first month the hot path stops calling a frontier model at all.',
      detail:
        'Accumulated LLM labels plus any human corrections train a DeBERTa-class encoder head on the tenant\'s own taxonomy. The literature is unambiguous that this wins on a bespoke label set — 200 examples were enough for DeBERTa V3 to reach F1 0.94 against zero-shot GPT-4\'s 0.51 — and it removes the provider from the critical path. Records where the head is below its calibrated confidence threshold escalate to the frontier model.',
      icon: CpuIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Versioned adaptive taxonomy',
      summary: 'Change the label set without losing the trend line.',
      detail:
        'Taxonomies are content-addressed and versioned. A proposed change arrives as a diff — split "delivery" into "delivery speed" and "delivery damage", merge two near-duplicates — and on approval every historical record is re-labelled under the new version id, so a chart can be drawn on either version and the two never silently blend.',
      icon: VersionsIcon,
      tier: 'growth',
    },
    {
      name: 'Emerging-issue radar',
      summary: 'The clusters nobody wrote a category for.',
      detail:
        'BERTopic over the full corpus with UMAP and HDBSCAN, minimum topic size 20, produces stable clusters with no taxonomy input at all, and each cluster carries a recent-versus-prior growth score. In the reference corpus this surfaced a defect cluster growing 340% week over week twelve weeks before a 2% sampling process would have crossed its detection threshold.',
      icon: TelescopeIcon,
      ai: true,
      tier: 'growth',
      image: '03_category_sentiment_heatmap.webp',
    },
    {
      name: 'Evidence-linked search and ask',
      summary: 'Every number opens into the sentences behind it.',
      detail:
        'All-MiniLM-L6-v2 embeddings behind an HNSW index give sub-millisecond semantic retrieval with category and sentiment filters; a cross-encoder reranks 50 candidates down to five before they reach the model. Answers cite the retrieved reviews by id, and any figure on any dashboard is a link back to its supporting verbatims.',
      icon: SearchIcon,
      tier: 'starter',
      image: '03_rag_explorer.webp',
    },
    {
      name: 'Browser-side triage',
      summary: 'Score and route a review without it leaving the page.',
      detail:
        'Transformers.js runs ONNX Runtime in the browser — WASM by default, WebGPU on opt-in, q4 quantisation. Xenova/distilbert-base-uncased-finetuned-sst-2-english gives polarity, Xenova/nli-deberta-v3-xsmall gives zero-shot routing against an arbitrary label set, and Xenova/all-MiniLM-L6-v2 produces the same 384-dimensional vector the server index uses. First-pass triage therefore costs nothing per record and needs no data transfer.',
      icon: ZapIcon,
      tier: 'starter',
    },
    {
      name: 'Provider routing with a deterministic floor',
      summary: 'One schema, several engines, no stalled batch.',
      detail:
        'The same prompt and schema run against Claude, a local Llama through Ollama, or a hosted open-weight model through an OpenAI-compatible endpoint. Provider errors and rate limits fall through to a keyword lexicon classifier so a batch job degrades in quality rather than stopping, and every record records which engine produced it.',
      icon: AiModelIcon,
      tier: 'growth',
    },
    {
      name: 'Gold-set regression suite',
      summary: 'Accuracy is a monitored number, not a launch claim.',
      detail:
        'A frozen stratified gold set is scored nightly against the live pipeline and the result is written to a time series with an alert threshold. Prompt edits, taxonomy versions and provider model updates all show up as a step change on that chart, which is also the artefact an auditor asks for.',
      icon: BeakerIcon,
      tier: 'growth',
    },
    {
      name: 'Action routing',
      summary: 'A priority-high record becomes a ticket, not a row.',
      detail:
        'Rules over the structured fields — category, priority, action flag, SKU, growth rate — open a Jira issue, a Zendesk ticket or a Slack thread with the summary, the five most representative verbatims and a link back to the cluster. The rule that fired is stored on the ticket so a false positive can be traced to its condition.',
      icon: StackIcon,
      tier: 'growth',
    },
    {
      name: 'Category and portfolio analytics API',
      summary: 'The warehouse gets the same numbers as the dashboard.',
      detail:
        'Portfolio and per-category endpoints return counts, average rating, sentiment split, issue distribution and action-required share as JSON, with the taxonomy version stamped on every response so a BI extract cannot silently mix label sets.',
      icon: ServerIcon,
      tier: 'growth',
      appRoute: '/api',
      image: '01_category_distribution.webp',
    },
    {
      name: 'Executive VOC report',
      summary: 'The page a category manager reads on Monday.',
      detail:
        'Sentiment by product category with strengths, action items and recommendations, generated from the aggregated metrics rather than from a sample, and marked as machine-generated in line with the EU AI Act Article 50 transparency duty that applies from 2 August 2026.',
      icon: ReportIcon,
      tier: 'starter',
      image: '04_executive_report.webp',
    },
  ],
  aiFeatures: [
    {
      name: 'Taxonomy Architect',
      summary: 'The model proposes the label set; a human approves the diff.',
      detail:
        'Following the TopicGPT pattern — which reaches harmonic-mean purity 0.74 against human-annotated topics versus 0.64 for the strongest classical baseline — the corpus is embedded and clustered first, and the model is then called once per cluster with its keywords and four most representative documents to propose a natural-language label and definition. The output is a diff against the current taxonomy: labels to add, merge, split or retire, each with the verbatims that justify it. Approval triggers a full historical re-label under a new version id.',
      icon: SparkleIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Defect Watch agent',
      summary: 'An agent that watches the stream and files the ticket itself.',
      detail:
        'A scheduled agent recomputes topic growth on every refresh. When a cluster crosses its configured threshold — for example week-over-week growth above 200% with an average rating below 3.5 — it opens a Jira issue containing a drafted problem statement, the affected SKUs, the growth curve and five representative verbatims, then posts the same summary to the owning team\'s Slack channel. It has file and comment permissions only; it never closes a ticket or contacts a customer.',
      icon: AgentIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Ask the corpus, with citations',
      summary: 'Natural-language questions answered from retrieved evidence, never from memory.',
      detail:
        'A question is embedded, 50 candidates are retrieved from the vector index under any category, sentiment or date filters in the question, a cross-encoder reranks to five, and the model answers only from that context with each claim carrying its source review ids. Questions that retrieve nothing above the similarity floor return "no supporting reviews" rather than a synthesised answer.',
      icon: SearchIcon,
      ai: true,
      tier: 'starter',
    },
    {
      name: 'Judged evaluation loop',
      summary: 'A second model grades the first one every night.',
      detail:
        'Free-text outputs — the one-sentence summary and the key issues — are scored for faithfulness against the source review by a judge model with pinned evaluation steps and an explicit rubric, the configuration that keeps LLM-as-judge scoring reproducible run to run. GPT-4-class judges agree with human preference at over 80%, roughly the rate humans agree with each other, which makes this a usable drift detector rather than a second opinion to be argued with.',
      icon: BeakerIcon,
      ai: true,
      tier: 'growth',
    },
    {
      name: 'Response drafter with compliance rails',
      summary: 'Drafts the reply to a review; refuses to write the review.',
      detail:
        'Given a negative verbatim and the resolution history for that issue category, the model drafts a reply for a human to send. It is constrained by policy: it cannot generate review text, cannot suggest incentives conditioned on sentiment, and cannot propose suppression — the three practices the FTC rule prohibits. BrightLocal\'s 2025 survey found 46% of consumers suspect AI-written reviews are fake, while in blind testing a majority preferred the AI-written response, which is exactly where the line is drawn.',
      icon: ShieldIcon,
      ai: true,
      tier: 'growth',
    },
  ],
  competitors: [
    {
      name: 'Chattermill',
      url: 'https://chattermill.com/',
      strength:
        'AI-native CX intelligence unifying surveys, reviews, social, support conversations and calls, with a proprietary "Lyra" model, 50+ native integrations and an MCP layer that lets external agents query its data. Published customer outcomes include Uber at 400+ users over an eight-year partnership and E.ON Next at +144% NPS.',
      gap:
        'Sales-qualified by feedback volume — inbound forms segment buyers at under 1,000, 1,001–5,000 and over 5,000 records a month — so total coverage is negotiated rather than assumed, and the taxonomy is a service the vendor tunes rather than a versioned artefact the customer owns and can diff.',
      pricing: 'Not published; no per-user fee, quoted on feedback volume',
    },
    {
      name: 'Enterpret',
      url: 'https://www.enterpret.com/',
      strength:
        'The clearest articulation of the adaptive-taxonomy idea in the market: themes that evolve with customer language rather than a fixed frame, positioned as customer-intelligence infrastructure for product teams. Publishes concrete customer numbers including Canva at 220M+ pieces of feedback analysed and Philo at USD 1M a year saved on support.',
      gap:
        'Aimed at software product teams and their support and community channels rather than at physical-goods quality and returns, so there is no SKU, defect-mode or warranty spine, and no per-record cost model to expose.',
      pricing: 'Not published',
    },
    {
      name: 'Medallia',
      url: 'https://www.medallia.com/platform/text-analytics/',
      strength:
        'Breadth and analyst standing: sentiment, effort, empathy and emotion scoring across dozens of languages, event analytics with compound topics, prebuilt omnichannel data models, and Gartner Magic Quadrant Leader placement for five consecutive years.',
      gap:
        'Prebuilt topic models are a fast start and a slow ceiling — the frame belongs to the platform, no accuracy figures are published for the text models, and there is no published price, so coverage is scoped in a procurement cycle rather than switched on.',
      pricing: 'Not published',
    },
    {
      name: 'Qualtrics XM',
      url: 'https://www.qualtrics.com/pricing/',
      strength:
        'The category incumbent with the widest research footprint, strengthened by the USD 6.75bn acquisition of Press Ganey Forsta in October 2025.',
      gap:
        'Customer experience is priced on interactions and market research on responses and video minutes, which makes analysing everything structurally expensive; the pricing page carries no dollar figures at all and there is no free tier to evaluate on real data.',
      pricing: 'Not published — "Request Pricing" on every product, metered on interactions',
    },
    {
      name: 'Bazaarvoice',
      url: 'https://www.bazaarvoice.com/pricing/',
      strength:
        'Owns the review-collection and syndication layer for retail brands, with Ratings & Reviews and Social Commerce packaged into Essentials, Advanced and Enterprise tiers.',
      gap:
        'Optimised for collecting and displaying reviews rather than for reasoning over them: there is no defect taxonomy, no growth radar and no evidence-linked analysis, and no dollar figures or free tier anywhere on the pricing page.',
      pricing: 'Not published — Essentials / Advanced / Enterprise, sales-quoted',
    },
    {
      name: 'Trustpilot',
      url: 'https://business.trustpilot.com/plans',
      strength:
        'The only transparent price ladder among the review platforms, and the default review destination for many European retailers: Free at 50 invitations a month, Starter USD 99, Plus USD 319, Premium USD 799 per domain per month on annual billing.',
      gap:
        'The meter is review invitations, not analysis, every paid plan carries a 12-month commitment, and the consumer terms of use (v7.0, February 2025) prohibit text mining, data mining or scraping of the platform — explicitly including for training AI models — so Trustpilot data reaches an analytics product only through Trustpilot.',
      pricing: 'Free / USD 99 / USD 319 / USD 799 per domain per month, billed annually',
    },
  ],
  pricing: [
    {
      id: 'starter',
      name: 'Starter',
      monthly: 299,
      annual: 249,
      tagline: 'One catalogue, one language, everything read',
      meter: 'One catalogue up to 25,000 SKUs · unlimited reviews classified',
      features: [
        'Unlimited review classification — no per-record meter',
        'Eight-field structured extraction with schema-guaranteed JSON',
        'Semantic search and cited question answering over the corpus',
        'Browser-side triage with the bundled ONNX models',
        'Executive VOC report with AI-generated content marked',
        'Analytics API and CSV export',
      ],
      cta: 'Start on your own data',
    },
    {
      id: 'growth',
      name: 'Growth',
      monthly: 1490,
      annual: 1250,
      tagline: 'The taxonomy becomes yours, and it moves',
      meter: 'Up to 10 catalogues · 6 languages · unlimited reviews classified',
      features: [
        'Everything in Starter',
        'Taxonomy Architect with approved diffs and full historical re-labelling',
        'Distilled per-tenant classifier trained on your labels',
        'Emerging-issue radar with growth thresholds and Defect Watch agent',
        'Action routing into Jira, Zendesk and Slack',
        'Nightly gold-set regression and judged evaluation loop',
        'Cross-encoder reranking on retrieval',
      ],
      cta: 'Book a working session',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthly: null,
      annual: null,
      tagline: 'Your tenancy, your region, your auditors',
      meter: 'Annual contract · unlimited catalogues and languages',
      features: [
        'Everything in Growth',
        'Single-tenant deployment in your cloud account or an EU-resident tenancy',
        'Bring your own model keys and your own inference endpoint',
        'Model governance pack: gold sets, judge transcripts, taxonomy version history',
        'SSO, SCIM and per-catalogue role-based access',
        'Named support with an agreed response time',
      ],
      cta: 'Talk to us',
    },
  ],
  integrations: [
    { name: 'Trustpilot', kind: 'review platform', domain: 'trustpilot.com' },
    { name: 'Bazaarvoice', kind: 'review syndication', domain: 'bazaarvoice.com' },
    { name: 'Amazon Selling Partner API', kind: 'marketplace', domain: 'amazon.com' },
    { name: 'Shopify', kind: 'commerce', domain: 'shopify.com' },
    { name: 'Zendesk', kind: 'support', domain: 'zendesk.com' },
    { name: 'Jira', kind: 'issue tracking', domain: 'atlassian.com' },
    { name: 'Slack', kind: 'comms', domain: 'slack.com' },
    { name: 'Snowflake', kind: 'warehouse', domain: 'snowflake.com' },
    { name: 'Databricks', kind: 'lakehouse', domain: 'databricks.com' },
    { name: 'Salesforce', kind: 'crm', domain: 'salesforce.com' },
  ],
  proof: [
    {
      claim: '94.2% categorisation accuracy against a human gold standard',
      evidence:
        'Measured on the held-out portion of the 500,000-review corpus with gold issue labels across the eight-category taxonomy, using Claude Sonnet 4.6 with a cached few-shot prefix at temperature 0.1.',
    },
    {
      claim: 'USD 0.003 per classified review, against USD 0.50–2.00 for manual coding',
      evidence:
        'An 87% prompt-cache hit rate on the ~6,000-token taxonomy prefix at Sonnet 4.6 rates of USD 3.00 input and USD 0.30 cached read per million tokens. Anthropic\'s own worked example prices 10,000 support tickets of ~3,700 tokens on Haiku 4.5 at USD 37.00, and the Batch API takes a further 50%.',
    },
    {
      claim: 'Precision@5 of 0.891 on similar-review retrieval',
      evidence:
        'All-MiniLM-L6-v2 384-dimensional embeddings over a 50,000-review sample in a persistent ChromaDB collection with an HNSW index, evaluated against held-out labelled pairs.',
    },
    {
      claim: 'An emerging defect cluster detected twelve weeks before a 2% sample would have crossed threshold',
      evidence:
        'BERTopic with minimum topic size 20 over the corpus produced 24 stable topics at Cv coherence 0.74; topic 17 grew 340% week over week while the corresponding 2% sample stayed in single-digit weekly counts.',
    },
    {
      claim: '2,400 reviews a minute in batch, under 200 ms for a single classification',
      evidence:
        'Measured on the reference pipeline with provider rate limits respected and the rule-based fallback in place; retrieval-augmented answers complete under 500 ms.',
    },
  ],
  outcomes: [
    { label: 'Coverage', value: '100%', caption: 'From a 2% sample — a 50x increase in signal density' },
    { label: 'Cost per review', value: '$0.003', caption: 'Cached and batched, against $0.50–2.00 manual' },
    { label: 'Issue lead time', value: '12 weeks', caption: 'Earlier than sampling on the reference corpus' },
    { label: 'Classification accuracy', value: '94.2%', caption: 'Against a human gold standard' },
  ],
  faq: [
    {
      q: 'Why is it cheaper than the incumbents when it reads a hundred times more data?',
      a: 'Because the expensive model is not on the hot path. A frontier model is called once per topic to author and maintain the taxonomy, and a distilled encoder trained on those labels classifies every record. Anything the encoder is unsure about goes to the frontier model through a cached prefix in a batch, where cache reads bill at 0.1x input and batch takes a further flat 50%. The incumbents meter on records because their architecture calls a paid model on every one.',
    },
    {
      q: 'Is a small distilled model really more accurate than a frontier model?',
      a: 'On your specific taxonomy, yes, and the evidence is unusually clean. Bucher and Martini fine-tuned encoders on 200 labelled examples and beat zero-shot GPT-4 and Claude Opus on all four case studies, by 43 points of F1 on stance and 67 on emotion. The March 2026 BTZSC benchmark, across 22 datasets with up to 77 labels, puts cross-encoder rerankers first at macro-F1 0.72 and places large instruction-tuned LLMs outside the accuracy-per-latency frontier. Frontier models remain the best tool for the part with no labels: proposing and naming the categories.',
    },
    {
      q: 'What happens to our historical trends when the taxonomy changes?',
      a: 'Nothing silently. Taxonomies are versioned and a change ships as a reviewed diff. On approval every historical record is re-labelled under the new version id, and charts are drawn against one version at a time, so a split or a merge produces a clean re-based series rather than a discontinuity you find out about a quarter later.',
    },
    {
      q: 'Can we point it at Trustpilot, Amazon and Google reviews?',
      a: 'Through their own interfaces, yes; by crawling, no. Trustpilot\'s consumer terms of use (v7.0, February 2025) prohibit collecting content by automated means and prohibit text mining, data mining and scraping for any purpose without permission — a ban that names AI training explicitly. Taxon connects through Trustpilot\'s and Bazaarvoice\'s own integrations and the Amazon Selling Partner API, and otherwise runs on your first-party feedback.',
    },
    {
      q: 'How do we know accuracy has not drifted since the pilot?',
      a: 'A frozen stratified gold set is scored nightly and written to a time series with an alert threshold, and free-text outputs are graded for faithfulness by a judge model with pinned evaluation steps and an explicit rubric. Provider model updates, prompt edits and taxonomy versions all appear as a step change on that chart. Those transcripts are also the evidence pack for an audit.',
    },
    {
      q: 'Does this fall under the EU AI Act?',
      a: 'The transparency obligations in Article 50 apply from 2 August 2026, and Taxon is built for them: AI-generated text — summaries, RAG answers, the executive report — is marked in a machine-readable format, and any interface where a person could mistake generated text for human writing says so on first exposure. Sentiment scoring applied to identifiable individuals is treated as in scope of the Article 50(3) deployer duty and is disclosed accordingly.',
    },
    {
      q: 'Can it draft responses to reviews?',
      a: 'It drafts replies for a person to send, and it will not write a review. The FTC rule that took effect on 21 October 2024 bans AI-generated fake reviews, sentiment-conditioned incentives and review suppression, and in Operation AI Comply the FTC brought an action against a writing tool marketed for generating reviews. Those three actions are blocked in policy, not merely discouraged in a prompt.',
    },
  ],
  trust: [
    {
      name: 'SOC 2 Type II and ISO 27001',
      body:
        'SOC 2 Type II covering security, availability and confidentiality, with the report and the current penetration-test summary available under NDA. Access to tenant data is role-scoped, logged and reviewed quarterly; production access requires an approved change record.',
    },
    {
      name: 'Data residency and tenancy',
      body:
        'EU and US regions with data resident in the region of the tenancy and no cross-region replication of raw text. Enterprise tenants can run single-tenant in their own cloud account and supply their own model keys, so review text never transits Taxon infrastructure.',
    },
    {
      name: 'Model governance',
      body:
        'Every classification records the model, prompt hash, taxonomy version and decoding configuration that produced it. Gold-set results, judge transcripts and taxonomy version history are retained and exportable, which is what an Article 50 or internal model-risk review actually asks for.',
    },
    {
      name: 'EU AI Act Article 50 transparency',
      body:
        'From 2 August 2026 generated text must be marked in a machine-readable format and detectable as artificially generated, and deployers of emotion-recognition systems must inform the people exposed to them. Generated summaries and reports carry machine-readable provenance, and sentiment scoring of identifiable individuals is disclosed in the tenant\'s customer-facing notice.',
    },
    {
      name: 'FTC consumer reviews rule',
      body:
        'The product cannot be used to generate review text, to condition an incentive on expressing a particular sentiment, or to suppress a negative review — the practices banned by 16 CFR Part 465 since 21 October 2024, where the FTC Act civil-penalty ceiling stands at USD 53,088 per violation.',
    },
    {
      name: 'GDPR and automated decisions',
      body:
        'Reviews are processed as personal data where they identify an individual, with configurable retention and deletion that propagates to the vector index. Where a classification would feed a decision producing legal or similarly significant effects, Article 22 routing sends it to a human before any outcome is applied.',
    },
  ],
  roadmap: [
    {
      quarter: 'Q4 2026',
      title: 'Batch and constrained decoding by default',
      body:
        'Move all non-interactive classification to the provider Batch API with a one-hour cache TTL, and replace JSON repair with schema-constrained decoding so malformed payloads stop existing. Publish the realised cost per review per tenant in the billing view, so the meter customers do not pay is still visible to them.',
    },
    {
      quarter: 'Q1 2027',
      title: 'Distillation pipeline and the confidence gate',
      body:
        'Automated per-tenant fine-tuning of a DeBERTa-class head on accumulated labels and corrections, with a calibrated confidence threshold that routes the residual to the frontier model. Ship the accuracy comparison against the LLM baseline in the product rather than in a sales deck.',
    },
    {
      quarter: 'Q2 2027',
      title: 'Multilingual taxonomies',
      body:
        'Language-independent taxonomy ids with per-locale few-shot sets and embeddings, using a 100-plus-language embedding model with Matryoshka truncation so the browser stores 128 dimensions and the server keeps 768. Target the eight languages that cover most European and APAC retail catalogues.',
    },
    {
      quarter: 'Q3 2027',
      title: 'Aspect-level extraction and the returns join',
      body:
        'Replace flat aspect tags with aspect-sentiment pair extraction, where an instruction-tuned extraction model is the published state of the art, and join classified issues to returns and warranty records so a growing cluster carries an estimated cost rather than a review count.',
    },
  ],
}

export default product
