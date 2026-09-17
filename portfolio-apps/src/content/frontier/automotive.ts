/**
 * P12 · Automotive Pricing Intelligence — where the field is in September 2026.
 * Every claim below is backed by an entry in `sources`; each of those pages was opened
 * while writing this module.
 */
import type { Frontier } from '../frontier'

const frontier: Frontier = {
  asOf: '2026-09',
  headline:
    'The ensemble is competently built and the conformal intervals are more honest than anything the incumbents publish, but the system prices adverts rather than transactions and validates on a random split of a market that moves every week.',

  summary: [
    'Tabular machine learning stopped being a settled problem in 2025. TabPFN showed in Nature that a single pretrained transformer could beat tuned gradient boosting on tables under 10,000 rows, in 2.8 seconds against an ensemble of the strongest baselines tuned for four hours. TabPFN-2.5 lifted that ceiling to 50,000 rows and 2,000 features in November 2025 and matched AutoGluon 1.4 in one forward pass. TabPFN-3, published in May 2026, scales in-context learning to a million training rows and 200 features, beats eight-hour-tuned gradient-boosted-tree baselines across TabArena, and runs roughly twenty times faster than its predecessor. TabICL had already shown the direction of travel, surpassing both TabPFNv2 and CatBoost on the 53 TALENT datasets above 10,000 samples. A 367k-row used-vehicle corpus sat comfortably outside the foundation-model regime when this project was built. It no longer does.',
    'What separates a research price model from a commercial valuation, though, is not the learner. It is the price basis. Manheim computes the Used Vehicle Value Index from actual wholesale auction transactions: the index read 207.4 in mid-August 2026, down 1.2% from July and essentially flat year on year, with wholesale supply at 27.7 days, MMR retention averaging 99.5% of book and auction conversion at 56.9%. Black Book publishes VIN-specific values refreshed daily. CarGurus recomputes Instant Market Value from over a million live listings a day, and is candid that the number may not capture every nuance of a given vehicle, such as condition or maintenance history. This project learns from 367k scraped Craigslist adverts: asking prices, no VIN, no options or trim resolution, no condition grade, and no record of whether the car ever sold. A $2,753 mean absolute error is a reasonable result on that basis, and it is not comparable to a transacted-price model.',
    'The genuinely current part of the system is the uncertainty. Split conformal prediction delivers 94.6% empirical coverage against a 95% nominal target, and almost no commercial valuation ships an interval at all. The frontier has moved past constant-width bands: conformalised quantile regression adapts interval width to heteroscedasticity and produces shorter intervals at the same coverage, group-conditional variants restore coverage inside each segment rather than only on average, and adaptive conformal inference holds the coverage frequency when the data-generating distribution shifts over time. A market whose index moved 1.2% in a single month, where used EV values were up 5% year on year while falling 4.2% from July as off-lease supply arrived, is precisely the setting those methods were written for.',
  ],

  stateOfTheArt: [
    {
      name: 'TabPFN-3',
      org: 'Prior Labs',
      what: 'Third-generation tabular foundation model. Scales prior-fitted in-context learning to a million training rows and 200 features, so a corpus the size of this project now fits inside a single forward pass instead of a tuned ensemble.',
      metric: 'Beats 8-hour-tuned GBT baselines up to 1M rows; TabPFN-3-Plus scores 200+ Elo above the best non-TabPFN model on TabArena and runs ~20x faster than TabPFN-2.5',
      url: 'https://arxiv.org/abs/2605.13986',
      year: '2026',
    },
    {
      name: 'TabPFN-2.5',
      org: 'Prior Labs',
      what: 'The November 2025 release that made tabular foundation models practical at business scale, together with a distillation engine that compiles the model into a compact MLP or tree ensemble for low-latency serving.',
      metric: '50,000 samples and 2,000 features, a 20x increase in data cells over TabPFNv2; matches AutoGluon 1.4, a four-hour tuned ensemble, in a forward pass',
      url: 'https://priorlabs.ai/technical-reports/tabpfn-2-5-model-report',
      year: '2025',
    },
    {
      name: 'TabPFN (Nature)',
      org: 'Hollmann et al.',
      what: 'The paper that broke two decades of gradient-boosting dominance on small tables, by pretraining a transformer on synthetic tabular problems and treating a new dataset as context rather than as training data.',
      metric: 'Outperforms all previous methods on datasets up to 10,000 samples; 2.8 s versus a four-hour tuned baseline ensemble',
      url: 'https://www.nature.com/articles/s41586-024-08328-6',
      year: '2025',
    },
    {
      name: 'TabICL',
      org: 'Qu, Holzmüller, Varoquaux and Le Morvan (ICML 2025)',
      what: 'In-context tabular learning aimed squarely at larger tables, with an architecture that keeps inference affordable as row counts grow.',
      metric: 'Handles up to 500k samples; on the 53 TALENT datasets above 10k rows it surpasses both TabPFNv2 and CatBoost, and is up to 10x faster than TabPFNv2',
      url: 'https://arxiv.org/abs/2502.05564',
      year: '2025',
    },
    {
      name: 'CARTE',
      org: 'Kim, Grinsztajn and Varoquaux',
      what: 'Graph-attentional pretraining that learns across tables with unmatched columns, using string embeddings of entries and column names. The route to enriching a thin listing table with a larger external one without schema alignment.',
      metric: 'Outperforms a solid set of baselines including the best tree-based models when transferring to small tables',
      url: 'https://arxiv.org/abs/2402.16785',
      year: '2024',
    },
    {
      name: 'TabArena',
      org: 'Erickson, Purucker, Tschalzev, Holzmüller, Mutalik Desai, Salinas and Hutter',
      what: 'The first continuously maintained living benchmark for tabular machine learning, with a public leaderboard. It is the arena a price model should be measured in before anyone claims state of the art.',
      metric: 'Spotlight at the NeurIPS 2025 Datasets and Benchmarks Track; finds gradient-boosted trees still competitive, deep learning level under larger budgets with ensembling, and foundation models ahead on smaller data',
      url: 'https://arxiv.org/abs/2506.16791',
      year: '2025',
    },
    {
      name: 'Conformalised quantile regression and adaptive conformal inference',
      org: 'Romano, Patterson and Candès; Gibbs and Candès',
      what: 'The two results that define credible uncertainty for a price model. CQR makes interval width adapt to heteroscedasticity instead of holding constant across the input space; adaptive conformal inference keeps the coverage frequency valid when the distribution shifts over time rather than assuming exchangeability.',
      metric: 'Valid finite-sample coverage with no distributional assumptions and shorter intervals than constant-width conformal; ACI provably achieves the target coverage frequency over long horizons irrespective of the data-generating process',
      url: 'https://arxiv.org/abs/1905.03222',
      year: '2019',
    },
    {
      name: 'Manheim Used Vehicle Value Index and CarGurus IMV',
      org: 'Cox Automotive; CarGurus',
      what: 'The two production valuations this project is really competing with. Manheim is built on transacted wholesale auction prices; CarGurus IMV is built on over a million live retail listings recomputed daily, with deal ratings layered on top.',
      metric: 'MUVVI 207.4 mid-August 2026, down 1.2% from July; wholesale supply 27.7 days; MMR retention 99.5%; auction conversion 56.9%',
      url: 'https://www.coxautoinc.com/insights/manheim-used-vehicle-value-index-mid-august-2026-trends/',
      year: '2026',
    },
  ],

  benchmarks: [
    {
      name: '95% prediction-interval coverage',
      sota: 'Conformalised quantile regression attains the nominal level with locally adaptive width and shorter intervals than constant-width conformal',
      sotaBy: 'Romano, Patterson and Candès',
      project: '94.6% empirical against a 95% nominal target, from constant-width split conformal',
      sotaValue: 95,
      projectValue: 94.6,
      unit: '% coverage',
      higherIsBetter: true,
    },
    {
      name: 'Training rows a tabular foundation model absorbs in one pass',
      sota: 'TabPFN-3 handles 1M training rows and 200 features and still beats 8-hour-tuned gradient-boosted-tree baselines',
      sotaBy: 'Prior Labs, May 2026',
      project: '294k training rows fitted by a hand-tuned LightGBM, XGBoost and CatBoost stack under Optuna search',
      sotaValue: 1000000,
      projectValue: 294000,
      unit: 'rows',
      higherIsBetter: true,
    },
    {
      name: 'Price basis',
      sota: 'Transacted wholesale prices. MMR retention averaged 99.5% of book across early-August 2026 auctions, so the reference value tracks what buyers actually paid',
      sotaBy: 'Manheim · Cox Automotive',
      project: 'Craigslist asking prices, with no VIN, no options or trim resolution, no condition grade and no record of sale',
    },
    {
      name: 'Refresh cadence against a moving market',
      sota: 'VIN-level values recomputed daily; CarGurus analyses over a million listings a day, and the Manheim index moved 1.2% inside a single month',
      sotaBy: 'Black Book · CarGurus',
      project: 'One static model fitted to a single snapshot and split at random, so the test set contains market conditions the training set has already seen',
    },
    {
      name: 'Tuning budget to reach best-in-class tabular accuracy',
      sota: 'One forward pass. TabPFN-2.5 matches AutoGluon 1.4, a four-hour tuned ensemble, and TabPFN-3 is roughly 20x faster again',
      sotaBy: 'Prior Labs',
      project: 'Optuna TPE search per base learner on validation MAE, then a Ridge meta-learner over out-of-fold predictions',
    },
  ],

  upgrades: [
    {
      title: 'Price the transaction, not the advert',
      body:
        'Replace scraped asking prices with a licensed transacted-price feed and resolve every row to a decoded VIN, so trim, factory options, drivetrain and build date stop being inferred from a free-text title. This is the single change that closes most of the gap to Manheim and Black Book: the current $2,753 MAE is measured against what a seller hoped for, not against what a buyer paid. Craigslist terms also prohibit commercial reuse of the corpus, so a licensed feed is the only lawful production path.',
      impact: 'high',
      effort: 'months',
      status: 'planned',
    },
    {
      title: 'Split validation in time and retrain on a rolling window',
      body:
        'A random 80/20 split lets the model see August while it is scored on July. Move to a forward-chaining split with a strict cut date, report error by weeks-since-training, and retrain on a rolling window. The Manheim index fell 1.2% in a single month and used EV values fell 4.2% from July while remaining up 5% year on year, so a model that cannot be refitted weekly is stale before it is deployed.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Conformalised quantile regression for heteroscedastic bands',
      body:
        'Split conformal gives one interval width to a $3,000 sedan and a $90,000 truck. Fit LightGBM quantile heads at the 2.5th and 97.5th percentiles and conformalise the residuals, which yields valid coverage with width that tracks local variance and, per Romano et al., shorter intervals at the same nominal level. The reported MAPE of 27.9% is dominated by sub-$5k listings, and an adaptive band is the correct way to say that the model is genuinely less certain there.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Group-conditional conformal per make, model and region',
      body:
        'Marginal coverage of 94.6% is compatible with 99% coverage on Camrys and 70% on Wranglers. Partition the calibration set by make, model, body style and region, calibrate within each stratum, and publish a coverage table per segment. A dealer pricing a niche trim needs to know the band is honest for that trim, not on average across the corpus.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Adaptive conformal inference to hold coverage online',
      body:
        'Wrap the conformal layer in the Gibbs and Candès online update, which re-estimates a single time-varying miscoverage parameter from realised errors and provably achieves the target coverage frequency over long horizons irrespective of the true data-generating process. It converts the interval from a one-off calibration into a control loop that survives the next off-lease wave without a retrain.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'A tabular foundation model for the long tail',
      body:
        'Rare trims with a handful of comparables are where the stack is weakest and where TabPFN is strongest. Route thin segments to TabPFN-3 in-context over the nearest comparables, keep the boosted stack for dense segments, and choose between them on out-of-fold error per segment. TabPFN-2.5 also ships a distillation engine that compiles the model to a compact MLP or tree ensemble, which keeps the sub-10 ms serving budget intact.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Condition scoring from listing photographs, in the browser',
      body:
        'Condition is the largest unmodelled term, and CarGurus names it as the blind spot in its own valuation. Run a zero-shot image pass over the listing photographs with Xenova/clip-vit-base-patch32 or onnx-community/dinov2-small-ONNX through Transformers.js, scoring panel damage, tyre wear, interior state and shot coverage on the dealer machine before upload. No image leaves the browser, and the resulting condition vector becomes a first-class feature rather than a missing one.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'A price-versus-days-to-turn curve instead of a point price',
      body:
        'Add a survival head over time-to-sale so the output is a demand curve rather than a number: at $18,400 this unit turns in 34 days, at $17,600 in 19. With wholesale supply at 27.7 days and auction conversion at 56.9%, the decision a used-car director actually makes is a trade-off between gross and velocity, and no point estimate can express it.',
      impact: 'high',
      effort: 'months',
      status: 'planned',
    },
  ],

  compliance: [
    {
      name: 'Licensing of the training corpus',
      body:
        'Craigslist terms of use prohibit collecting content via robots, spiders, scripts, scrapers or crawlers, and separately prohibit aggregating, displaying, copying, reproducing, distributing, licensing, selling or otherwise exploiting that content for any purpose without express written consent, with liquidated damages of $3,000 for each day of violation. The 367k-listing corpus is therefore a research artefact only. A commercial deployment has to be rebuilt on licensed listing and transaction feeds, which is the same constraint that gives the incumbents their moat.',
      url: 'https://www.craigslist.org/about/terms.of.use',
    },
    {
      name: 'FTC truth in advertising and substantiation',
      body:
        'Any price a system publishes to a car buyer is an advertising claim. The FTC requires claims in advertisements to be truthful, not deceptive or unfair, and evidence-based, and expects the advertiser to hold its proof before the claim is made. A valuation product therefore has to retain the model version, the comparable set and the coverage statistics behind every number it displays, which is an argument for shipping the interval rather than only the point estimate.',
      url: 'https://www.ftc.gov/business-guidance/advertising-marketing',
    },
    {
      name: 'California automated decision-making technology rules',
      body:
        'The California Privacy Protection Agency adopted its combined package of CCPA updates, insurance, cybersecurity audit, risk assessment and automated decision-making technology regulations in September 2025. Where an algorithmic price feeds a consumer-facing offer or a financing decision, notice, opt-out and risk-assessment obligations attach, and the model documentation has to exist before the regulator asks for it.',
      url: 'https://cppa.ca.gov/regulations/',
    },
  ],

  sources: [
    { title: 'TabPFN-3: Technical Report', url: 'https://arxiv.org/abs/2605.13986', org: 'Prior Labs', date: '2026-05' },
    { title: 'TabPFN-2.5 Model Report', url: 'https://priorlabs.ai/technical-reports/tabpfn-2-5-model-report', org: 'Prior Labs', date: '2025-11' },
    { title: 'Accurate predictions on small data with a tabular foundation model', url: 'https://www.nature.com/articles/s41586-024-08328-6', org: 'Nature 637, 319–326', date: '2025-01' },
    { title: 'A Closer Look at TabPFN v2: Understanding Its Strengths and Extending Its Capabilities', url: 'https://arxiv.org/abs/2502.17361', org: 'Ye, Liu and Chao', date: '2025-02' },
    { title: 'TabICL: A Tabular Foundation Model for In-Context Learning on Large Data', url: 'https://arxiv.org/abs/2502.05564', org: 'ICML 2025', date: '2025-02' },
    { title: 'CARTE: Pretraining and Transfer for Tabular Learning', url: 'https://arxiv.org/abs/2402.16785', org: 'Kim, Grinsztajn and Varoquaux', date: '2024-02' },
    { title: 'TabArena: A Living Benchmark for Machine Learning on Tabular Data', url: 'https://arxiv.org/abs/2506.16791', org: 'NeurIPS 2025 Datasets and Benchmarks Track', date: '2025-06' },
    { title: 'Conformalized Quantile Regression', url: 'https://arxiv.org/abs/1905.03222', org: 'Romano, Patterson and Candès', date: '2019-05' },
    { title: 'Adaptive Conformal Inference Under Distribution Shift', url: 'https://arxiv.org/abs/2106.00170', org: 'Gibbs and Candès', date: '2021-06' },
    { title: 'Manheim Used Vehicle Value Index: Mid-August 2026 Trends', url: 'https://www.coxautoinc.com/insights/manheim-used-vehicle-value-index-mid-august-2026-trends/', org: 'Cox Automotive', date: '2026-08' },
    { title: 'Market Insights: Manheim index, inventory and sales forecast', url: 'https://www.coxautoinc.com/market-insights/', org: 'Cox Automotive', date: '2026-09' },
    { title: 'What is Instant Market Value (IMV)?', url: 'https://www.cargurus.com/Cars/instantMarketValue.action', org: 'CarGurus' },
    { title: 'Vehicle valuation data and analytics', url: 'https://www.blackbook.com/', org: 'Black Book' },
    { title: 'Terms of Use', url: 'https://www.craigslist.org/about/terms.of.use', org: 'craigslist' },
    { title: 'Advertising and Marketing business guidance', url: 'https://www.ftc.gov/business-guidance/advertising-marketing', org: 'US Federal Trade Commission' },
    { title: 'Rulemaking: CCPA updates, cybersecurity audits, risk assessments and ADMT', url: 'https://cppa.ca.gov/regulations/', org: 'California Privacy Protection Agency', date: '2025-09' },
    { title: 'Xenova/clip-vit-base-patch32 — ONNX build for Transformers.js', url: 'https://huggingface.co/Xenova/clip-vit-base-patch32', org: 'Hugging Face' },
    { title: 'onnx-community/dinov2-small-ONNX — image feature extraction in the browser', url: 'https://huggingface.co/onnx-community/dinov2-small-ONNX', org: 'Hugging Face' },
  ],
}

export default frontier
