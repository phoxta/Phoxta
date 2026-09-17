import type { Frontier } from '../frontier'

const frontier: Frontier = {
  asOf: '2026-09',
  headline:
    'The modelling is textbook-correct and the economics are right, but every head in the stack — a point-estimate BG/NBD, a linear Cox PH, a two-model uplift learner scored on response AUC rather than Qini — is one generation behind what the causal-ML and deep-survival literature now considers table stakes.',
  summary: [
    'Customer-lifetime-value work split into two lineages after 2019. The probabilistic lineage — BG/NBD with a Gamma-Gamma spend model, which is what this platform runs — is still the right prior when transactions are sparse and labels are absent, and it remains the most interpretable way to separate "how often" from "how much". The deep lineage began with Google’s zero-inflated lognormal (ZILN) loss, which stopped treating lifetime value as a number to regress and started treating it as a mixture of a zero point mass and a lognormal tail, scored by normalised Gini for discrimination and decile charts for calibration rather than by MAE. CIKM 2024’s OptDist pushed that further with a distribution-selection module that picks a sub-distribution per customer, and reports production deployment on a large-scale financial platform for acquisition marketing. A platform that reports "$4.21 MAE" is reporting the accuracy of a conditional mean on a heavy-tailed target — the single least informative summary of a distribution whose whole commercial value lies in its right tail.',
    'The causal lineage matured faster. Two-model and X-Learner uplift, which this platform uses, is now the baseline that newer work is measured against rather than the state of the art: EconML (PyWhy, out of Microsoft Research’s ALICE project, v0.17.0 in July 2026) ships doubly-robust learners, causal-forest DML and — the part that matters commercially — DRPolicyTree and DRPolicyForest, which learn a treatment *policy* directly rather than a score to threshold. Uber’s CausalML adds DR-Learner with cross-fitting and RATE, a rank-weighted average treatment effect with optional Qini weighting. The uncomfortable finding from KDD 2026 (Yang, Liu and Huang, "Evaluating Uplift Modeling under Structural Biases") is that uplift targeting and uplift prediction are distinct objectives, that model rankings are unstable under selection bias, spillover and measurement error, and that metric stability tracks how closely a metric approximates the ATE. This platform reports its uplift model at "AUC 0.832" — a treatment-response AUC, which is a propensity metric wearing a causal label. The Qini curve it draws is computed against a simulated control rather than a randomised holdout.',
    'On survival the gap is measurable on this platform’s own dataset. Kvamme, Borgan and Scheel built a survival variant of the same KKBox subscriber data (1,786,333 training observations, 15 covariates, roughly 28% censoring) and published a full comparison: a linear Cox model reaches a time-dependent concordance of 0.816, Cox-Time 0.861 and DeepHit 0.888. This platform fits a linear-covariate Cox proportional-hazards model and does not report a concordance index at all. SurvTRACE then showed transformers handling competing events on 476,746 SEER patients, which is exactly the structure retention needs — voluntary cancellation and involuntary payment failure are different events with different interventions, and a single Cox hazard cannot tell an offer from a card retry. The upgrades below are ordered so that the two that change decisions rather than metrics — a permanent randomised holdout and a budget-constrained policy — land first.',
  ],
  stateOfTheArt: [
    {
      name: 'Zero-inflated lognormal (ZILN) lifetime-value loss',
      org: 'Google',
      what:
        'Models lifetime value as a mixture of a zero point mass and a lognormal distribution, so one network head predicts the probability a customer returns at all and the parameters of the spend distribution if they do. The paper argues for normalised Gini to measure discrimination and decile charts to measure calibration, rather than a squared-error or absolute-error summary of a heavy-tailed target.',
      metric: 'Distributional head; scored by normalised Gini + decile calibration, not MAE',
      url: 'https://arxiv.org/abs/1912.07753',
      year: '2019',
    },
    {
      name: 'google/lifetime_value reference implementation',
      org: 'Google',
      what:
        'The open reference code for the ZILN loss, with worked pipelines on the Kaggle Acquire Valued Shoppers Challenge (roughly 350 million transaction rows across 300,000+ shoppers) and KDD Cup 98 (about 200,000 lapsed donors). It is the shortest path from a point-estimate CLV head to a distributional one.',
      metric: '350M transaction rows · 300k+ shoppers in the reference pipeline',
      url: 'https://github.com/google/lifetime_value',
      year: '2019',
    },
    {
      name: 'OptDist',
      org: 'Weng, Tang, Xu, Lyu, Liu, Sun and He · CIKM 2024',
      what:
        'Trains several candidate sub-distribution networks and adds a distribution-selection module that adaptively chooses which one applies to each customer, on the argument that a single parametric family cannot cover a mixed population. Reported as deployed on a large-scale financial platform for customer-acquisition marketing.',
      metric: 'Deployed in production for acquisition marketing (CIKM 2024)',
      url: 'https://arxiv.org/abs/2408.08585',
      year: '2024',
    },
    {
      name: 'Dragonnet + targeted regularisation',
      org: 'Shi, Blei and Veitch · Columbia University',
      what:
        'A three-headed network that exploits the sufficiency of the propensity score for adjustment — a shared representation trained to predict treatment, with separate outcome heads for treated and control — plus a targeted-regularisation term that biases training towards estimators with non-parametric asymptotic guarantees. It is the architecture that replaced hand-assembled two-model uplift in the research literature.',
      metric: 'Propensity-sufficient shared representation; asymptotically optimal by construction',
      url: 'https://arxiv.org/abs/1906.02120',
      year: '2019',
    },
    {
      name: 'EconML',
      org: 'PyWhy · originally Microsoft Research ALICE',
      what:
        'The reference library for heterogeneous treatment effects: LinearDML and NonParamDML, doubly-robust learners including ForestDRLearner, orthogonal random forests, instrumental-variable estimators, SHAP integration — and DRPolicyTree and DRPolicyForest, which learn an interpretable treatment policy directly from observational data rather than producing a score somebody then thresholds by hand.',
      metric: 'v0.17.0 (July 2026) · 4.8k GitHub stars · policy learners built in',
      url: 'https://github.com/py-why/EconML',
      year: '2026',
    },
    {
      name: 'CausalML',
      org: 'Uber',
      what:
        'S-, T-, X-, R- and DR-Learner meta-learners plus six uplift-tree families (KL, Euclidean and chi-square divergence, DDP, IDDP, interaction trees, causal-inference trees and contextual treatment selection), and the evaluation half that matters: a doubly-robust pseudo-outcome loss for model selection and RATE, the rank-weighted average treatment effect, with Qini weighting as a special case.',
      metric: 'DR pseudo-outcome model selection + RATE with Qini weighting',
      url: 'https://causalml.readthedocs.io/en/latest/methodology.html',
      year: '2026',
    },
    {
      name: 'Cox-Time, Cox-CC and DeepHit on the KKBox survival benchmark',
      org: 'Kvamme, Borgan and Scheel · University of Oslo',
      what:
        'The published deep-survival comparison on a survival variant of the same KKBox subscriber data this platform uses — 1,786,333 training observations, 15 covariates (7 numeric, 8 categorical), roughly 28% censoring. It is the only benchmark that puts a defensible number on how much a linear Cox model gives away on this exact population.',
      metric: 'KKBox Ctd: DeepHit 0.888 · RSF 0.870 · Cox-Time 0.861 · linear Cox-SGD 0.816',
      url: 'https://arxiv.org/abs/1907.00825',
      year: '2019',
    },
    {
      name: 'SurvTRACE',
      org: 'Wang and Sun · University of Illinois',
      what:
        'A transformer encoder over embedded numerical and categorical covariates, trained with auxiliary multi-task objectives, that makes no parametric assumption about the survival distribution and handles competing events natively. Validated on 476,746 SEER patients with breast cancer and heart disease as competing risks — structurally the same problem as separating voluntary cancellation from involuntary payment failure.',
      metric: 'SEER Ctd 0.902 / 0.882 / 0.864 at the 25/50/75% horizons for the common event; 0.797 / 0.788 / 0.775 for the rare one',
      url: 'https://arxiv.org/abs/2110.00855',
      year: '2021',
    },
  ],
  benchmarks: [
    {
      name: 'Time-to-churn discrimination on KKBox (time-dependent concordance)',
      sota: '0.888 (DeepHit); Cox-Time 0.861; random survival forest 0.870',
      sotaBy: 'Kvamme, Borgan & Scheel, on a survival variant of the same KKBox data',
      project:
        '0.816 — the published figure for the linear Cox class this platform fits. It reports no concordance index of its own, so this is the class benchmark, not a measured result.',
      sotaValue: 0.888,
      projectValue: 0.816,
      unit: 'C-index (Ctd)',
      higherIsBetter: true,
    },
    {
      name: 'Training scale actually used (rows)',
      sota: '1,786,333 training observations from the KKBox subscriber base',
      sotaBy: 'Kvamme, Borgan & Scheel benchmark split',
      project:
        '5,088 train / 898 validation / 1,057 test users in the recorded metrics run — roughly 0.3% of the benchmark split, against a 2.6M-subscriber, 2.1 GB dataset that is fully available.',
      sotaValue: 1786333,
      projectValue: 5088,
      unit: 'training rows',
      higherIsBetter: true,
    },
    {
      name: 'KKBox churn — competition-comparable score',
      sota: 'First place of 575 teams with gradient boosting over temporal features; the WSDM Cup 2018 task was scored on log loss',
      sotaBy: 'Bryan Gregory, WSDM Cup 2018',
      project:
        'AUC 0.86 and recall 0.78 on a self-defined 30-day label. Not leaderboard-comparable: different label window, different split, and a ranking metric rather than the competition’s probabilistic one.',
    },
    {
      name: 'CLV output type',
      sota: 'A predictive distribution — ZILN’s zero mass plus lognormal tail, or OptDist’s per-customer sub-distribution selection, scored on normalised Gini and decile calibration',
      sotaBy: 'Wang, Liu & Miao (Google); Weng et al. (CIKM 2024)',
      project:
        'A point estimate — BG/NBD × Gamma-Gamma expected value, MAE $4.21 over six months. Correct on average and silent about the tail, which is where offer sizing actually lives.',
    },
    {
      name: 'Uplift evaluation',
      sota: 'AUUC and Qini on a randomised holdout, plus DR pseudo-outcome loss or RATE for model selection — with the KDD 2026 caveat that rankings are unstable under selection bias, spillover and measurement error',
      sotaBy: 'CausalML (Uber); Yang, Liu & Huang, KDD 2026',
      project:
        'A Qini curve drawn against a simulated control, and a headline "uplift AUC 0.832" that is a treatment-response AUC — a propensity metric, not a causal one. The Qini coefficient itself is not reported as a number.',
    },
  ],
  upgrades: [
    {
      title: 'Cut a permanent randomised holdout and make it the unit of truth',
      body:
        'Every claim in the platform — 18.4% persuadable, 3.2× ROI, −23% churn — currently rests on a simulated treatment assignment. Reserve a fixed random share of every eligible cohort from all retention contact, persist assignment in the warehouse so it survives model retrains, and compute campaign results as the difference against that arm rather than as a save rate. Wayfair’s display-remarketing programme is the template: randomise into treatment and public-service-announcement control so the uplift curve is estimated from an experiment. Nothing downstream is trustworthy until this exists, which is why it is first.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Replace the threshold with a budget-constrained policy',
      body:
        'The platform targets everyone above an uplift cut-point of +0.10, which is only optimal if the budget is unlimited. Frame it correctly: maximise expected incremental margin subject to a spend cap, which is a knapsack over uplift-per-dollar with per-channel costs already in the planner ($2.50 email, $5.00 email+SMS, $15.00 with a call). Solve it with a greedy ratio sort with an LP relaxation for the boundary, and learn the policy directly with EconML’s DRPolicyTree or DRPolicyForest so the resulting rule is auditable rather than a score with a magic number attached.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Swap the two-model X-Learner for a DR-Learner, scored on AUUC and Qini',
      body:
        'Two independently fitted treatment and control GBMs differ everywhere the two populations differ, not only where treatment matters, and the difference of two noisy predictions is noisier than either. Move to a cross-fitted DR-Learner (CausalML or EconML), which stays unbiased if either the propensity model or the outcome model is right, and select models on the DR pseudo-outcome loss or RATE instead of response AUC. Report AUUC and a Qini coefficient as numbers on the holdout. Add Dragonnet as the neural comparator once the holdout has enough treated volume to fit it.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Predict a distribution, not a mean: a ZILN head on the CLV model',
      body:
        'Keep BG/NBD as the sparse-data prior and add a zero-inflated lognormal head over the same behavioural features — one output for the probability of any future value, two for the lognormal parameters of the spend given return. Score it the way Google’s paper argues for, on normalised Gini and decile calibration rather than MAE, and use the predicted quantiles to cap offers: an offer worth more than the 25th percentile of a customer’s value distribution is a loss made on purpose. OptDist is the follow-on if a single lognormal proves too tight for the multimodal base.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Discrete-time survival with competing risks in place of Cox PH',
      body:
        'Voluntary cancellation and involuntary payment failure are different events with different remedies — an offer against one, a card retry and dunning sequence against the other — and a single Cox hazard averages them into a number that recommends the wrong action for both. Replace it with a discrete-time hazard model over monthly intervals with a cause-specific head per risk, which drops the proportional-hazards assumption and yields a per-period hazard the campaign planner can consume directly. DeepHit reaches 0.888 Ctd on this dataset against 0.816 for the linear Cox class, and SurvTRACE demonstrates the competing-risks version at 476,746-patient scale.',
      impact: 'high',
      effort: 'months',
      status: 'planned',
    },
    {
      title: 'Learn features from the event stream instead of hand-building RFM',
      body:
        'The 25 modelled features are 28-day aggregates — listening days, completion rate, skips, unique tracks — that throw away order and timing. Feed the raw event sequence to a causal transformer or GRU encoder and let the churn, CLV and survival heads share it, which is the trick the deep-survival work uses to avoid feature engineering entirely. Keep the RFM features as a concatenated side input so the model cannot do worse than the current one, and keep SHAP on that branch so reason codes survive. Train on the full 2.6M subscribers rather than the 5,088-user sample.',
      impact: 'medium',
      effort: 'months',
      status: 'planned',
    },
    {
      title: 'Calibration and drift monitoring as a gate, not a chart',
      body:
        'The calibration curve is currently a panel in the Model Insights tab. Make it an operational control: expected calibration error per decile computed weekly on the holdout, population-stability index on every input feature, and an automatic policy freeze when calibration drifts beyond a set band — because a miscalibrated churn probability does not just mis-rank, it mis-prices every offer that is sized off it. Version model, feature set, policy and budget together so a result can be traced to the exact artefacts that produced it.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Score cancellation text in the browser so it never leaves the client',
      body:
        'Cancellation-reason free text and support-ticket bodies are the highest-signal, highest-sensitivity input in the whole system. Run the encoder on-device with transformers.js: Xenova/all-MiniLM-L6-v2 for 384-dimensional sentence embeddings, or Xenova/distilbert-base-uncased-finetuned-sst-2-english when a sentiment label is all that is needed. Only the vector or the label is transmitted, the raw text stays on the customer’s machine, and the same pipeline powers an in-page churn explainer in the demo without a server round trip.',
      impact: 'medium',
      effort: 'days',
      status: 'planned',
    },
  ],
  compliance: [
    {
      name: 'GDPR Article 22 — solely automated decisions',
      body:
        'A model that suppresses a customer from a retention offer, or prices their discount, is profiling. Article 22 gives a data subject the right not to be subject to a decision based solely on automated processing that produces legal effects or similarly significantly affects them, and where the decision runs on contract or explicit consent the controller must provide at least the right to obtain human intervention, to express a point of view and to contest the decision. In practice: keep a human-review route on suppression and offer-sizing decisions, log the SHAP reason codes that produced them, and never let special-category data enter the feature set.',
      url: 'https://gdpr-info.eu/art-22-gdpr/',
    },
    {
      name: 'ePrivacy Article 5(3) — consent for behavioural signals',
      body:
        'The EDPB’s Guidelines 2/2023 on the technical scope of Article 5(3), final version published in October 2024, pull far more than cookies into the consent perimeter: pixels, local storage, tracking links and IP-based tracking all count as storing or accessing information on a terminal device. The behavioural features that carry most of this model’s signal — listening days, completion rate, session recency — are consent-gated at source, so the pipeline needs consent state as a first-class column and a defined behaviour for customers who withheld it, not a silent join that quietly drops them.',
      url: 'https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en',
    },
    {
      name: 'EU AI Act Article 50 — transparency duties, applicable 2 August 2026',
      body:
        'Article 50’s transparency obligations came into force on 2 August 2026. Two bite on a retention platform: a system designed to interact directly with a person must make clear that the person is interacting with an AI system unless it is obvious from context, and synthetic text, audio, image or video output must be marked as artificially generated or manipulated in a machine-readable form. The generated subject lines, offer bodies and per-user narratives this platform produces fall inside that, and the information has to be given clearly at the point of first interaction.',
      url: 'https://artificialintelligenceact.eu/article/50/',
    },
    {
      name: 'CCPA/CPRA — opt-out of sale and sharing',
      body:
        'California consumers can require a business to stop selling or sharing their personal information, where "sharing" specifically means sharing for cross-context behavioural advertising, and a business must wait at least twelve months before asking them to opt back in. A retention platform that pushes uplift segments and CLV tiers into ad platforms for suppression or lookalike targeting is doing exactly this, so opt-out state has to propagate to every downstream destination — not just to the source table.',
      url: 'https://oag.ca.gov/privacy/ccpa',
    },
    {
      name: 'CCPA/CPRA — financial-incentive notice and non-discrimination',
      body:
        'This is the clause that governs CLV-tiered offers. A business may not deny goods or services, charge a different price, or provide a different level or quality of service because someone exercised their privacy rights; it may offer promotions and discounts in exchange for collecting, keeping or selling personal information, but only where the incentive is reasonably related to the value of that personal information. A discount ladder driven by a predicted lifetime value therefore needs a documented notice of financial incentive and a value estimate that stands up — the model’s CLV output is not automatically that justification.',
      url: 'https://oag.ca.gov/privacy/ccpa',
    },
  ],
  sources: [
    {
      title: 'A Deep Probabilistic Model for Customer Lifetime Value Prediction',
      url: 'https://arxiv.org/abs/1912.07753',
      org: 'Xiaojing Wang, Tianqi Liu, Jingang Miao (Google)',
      date: '2019-12',
    },
    {
      title: 'google/lifetime_value — ZILN reference implementation',
      url: 'https://github.com/google/lifetime_value',
      org: 'Google',
      date: '2019',
    },
    {
      title: 'OptDist: Learning Optimal Distribution for Customer Lifetime Value Prediction',
      url: 'https://arxiv.org/abs/2408.08585',
      org: 'Weng, Tang, Xu, Lyu, Liu, Sun, He · CIKM 2024',
      date: '2024-08',
    },
    {
      title: 'Adapting Neural Networks for the Estimation of Treatment Effects (Dragonnet)',
      url: 'https://arxiv.org/abs/1906.02120',
      org: 'Claudia Shi, David M. Blei, Victor Veitch · Columbia University',
      date: '2019-06',
    },
    {
      title: 'EconML — heterogeneous treatment effects and policy learning',
      url: 'https://github.com/py-why/EconML',
      org: 'PyWhy · Microsoft Research ALICE',
      date: '2026-07',
    },
    {
      title: 'CausalML methodology — meta-learners, uplift trees, DR pseudo-outcome loss and RATE',
      url: 'https://causalml.readthedocs.io/en/latest/methodology.html',
      org: 'Uber',
      date: '2026',
    },
    {
      title: 'Time-to-Event Prediction with Neural Networks and Cox Regression',
      url: 'https://arxiv.org/abs/1907.00825',
      org: 'Håvard Kvamme, Ørnulf Borgan, Ida Scheel · University of Oslo',
      date: '2019-07',
    },
    {
      title: 'SurvTRACE: Transformers for Survival Analysis with Competing Events',
      url: 'https://arxiv.org/abs/2110.00855',
      org: 'Zifeng Wang, Jimeng Sun · University of Illinois',
      date: '2021-10',
    },
    {
      title: 'Predicting Customer Churn: Extreme Gradient Boosting with Temporal Data',
      url: 'https://arxiv.org/abs/1802.03396',
      org: 'Bryan Gregory · WSDM Cup 2018, first of 575 teams',
      date: '2018-02',
    },
    {
      title: 'Benchmarking for Deep Uplift Modeling in Online Marketing',
      url: 'https://arxiv.org/abs/2406.00335',
      org: 'Liu, Tang, Qiao, Liu, Sun, He, Ming',
      date: '2024-06',
    },
    {
      title: 'Evaluating Uplift Modeling under Structural Biases: Metric Stability and Model Robustness',
      url: 'https://arxiv.org/abs/2603.20775',
      org: 'Yuxuan Yang, Dugang Liu, Yiyan Huang · KDD 2026',
      date: '2026-03',
    },
    {
      title: 'Uplift Modeling in Display Remarketing',
      url: 'https://www.aboutwayfair.com/2018/05/uplift-modeling-in-display-remarketing/',
      org: 'Jen Wang · Wayfair',
      date: '2018-05',
    },
    {
      title: 'Building Scalable and Performant Marketing ML Systems at Wayfair (WayLift)',
      url: 'https://www.aboutwayfair.com/careers/tech-blog/building-scalable-and-performant-marketing-ml-systems-at-wayfair',
      org: 'Jen Wang · Wayfair',
      date: '2021-07',
    },
    {
      title: 'Xenova/all-MiniLM-L6-v2 — ONNX sentence embeddings for transformers.js',
      url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2',
      org: 'Hugging Face',
      date: '2026',
    },
    {
      title: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english — in-browser text classification',
      url: 'https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      org: 'Hugging Face',
      date: '2026',
    },
  ],
}

export default frontier
