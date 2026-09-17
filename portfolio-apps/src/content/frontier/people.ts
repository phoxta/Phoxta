/**
 * P04 · People Analytics Platform — the 2026 frontier.
 * Every claim below is backed by an entry in `sources`.
 */
import type { Frontier } from '../frontier'

const frontier: Frontier = {
  asOf: '2026-09',
  headline:
    'The modelling is competitive and the fairness work is ahead of most vendors, but the evidence base is a 1,470-row synthetic dataset and the causal layer is the weakest estimator in the family — both are fixable, and both must be fixed before the 2027 Annex III deadline turns this into regulated software.',
  summary: [
    'People analytics in 2026 is consolidating around three things the incumbents can all point at: a skills graph, an agent that answers questions in natural language, and a compliance story. Workday trains Illuminate on more than 800 billion business transactions a year across 10,500 organisations; SAP shipped four Joule agents into the 1H 2026 SuccessFactors release on top of a Talent Intelligence Hub that infers skills from CVs and profiles; Eightfold and Beamery sell the same skills-graph-plus-agent shape to enterprises that have already bought an HRIS. Syndio takes the narrower, deeper path — pay equity only — and reports governing more than $1 trillion of compensation across 350-plus enterprises using over 10 million employee pay records. What almost none of them sell is a defensible causal claim about which intervention actually changes an outcome.',
    'That is where the research frontier has moved. Uplift modelling and heterogeneous-treatment-effect estimation are now mature, open and well tooled: EconML v0.17.0, released on 31 July 2026 under the py-why umbrella, ships doubly-robust learners, X-Learners, causal forests and — importantly — policy learners (DRPolicyTree, DRPolicyForest) that turn a CATE estimate into a budget-constrained targeting rule. Uber\'s CausalML covers the same meta-learner family and adds validation that does not require knowing the true effect: DR-loss and the rank-weighted average treatment effect. Bokelmann and Lessmann showed in 2022 that the Qini curve and transformed-outcome MSE are themselves noisy enough to mislead, and proposed variance-reduced versions that should be the default. An S-Learner reporting "2.1× lift versus random" sits at the bottom of that ladder: it is the estimator most prone to regularising the treatment effect towards zero, and lift-versus-random is not an evaluation, it is a sales figure.',
    'The second gap is evidential rather than methodological. The IBM HR Analytics dataset is synthetic — built by IBM data scientists, 1,470 rows, 237 of them positive — and an AUC of 0.9401 on it says almost nothing about performance on real longitudinal HRIS data, where the labels are censored, the covariates are time-varying, the class balance shifts by business unit and the joiners and leavers are not exchangeable with the people who stayed. A fine-tuned GPT-3.5 reaches F1 0.92 on the same file; the fact that a general-purpose language model with no HR features beats tuned gradient boosting is the clearest possible signal that the dataset, not the model, is doing the work. The honest reading is that this project has built a good pipeline against a bad benchmark. The upgrades below re-point the same pipeline at a discrete-time survival model over real panel data, replace the S-Learner with a doubly-robust learner evaluated on Qini and RATE, and add the technical documentation, logging and bias-audit exports that Annex III of the EU AI Act will require of exactly this class of system from 2 December 2027.',
  ],
  stateOfTheArt: [
    {
      name: 'Workday Illuminate + Skills Cloud',
      org: 'Workday',
      what: 'The HRIS incumbent\'s AI layer: a set of agents that operate on behalf of the user across HR and finance, sitting on the same transactional substrate as the system of record, with Skills Cloud as the skills ontology beneath talent decisions.',
      metric: 'Models fuelled by more than 800 billion business transactions processed annually; 10,500+ organisations, more than 60% of the Fortune 500',
      url: 'https://newsroom.workday.com/2024-09-17-Announcing-Workday-Illuminate-TM-The-Next-Generation-of-Workday-AI',
      year: '2024–2026',
    },
    {
      name: 'Talent Intelligence Platform',
      org: 'Eightfold AI',
      what: 'A full-stack, agentic talent-intelligence platform that models skills, capabilities, aspirations and the work people actually perform, combining enterprise data with market signal to anticipate talent needs and close skill gaps.',
      metric: 'Published customer figure: 160+ hours saved in two months (STMicroelectronics); no platform-scale statistics disclosed',
      url: 'https://eightfold.ai/talent-intelligence-platform/',
      year: '2026',
    },
    {
      name: 'Talent Intelligence Hub + Joule agents',
      org: 'SAP SuccessFactors',
      what: 'Skills inferencing, career intelligence and succession recommendations under one hub, with four Joule agents shipped in the 1H 2026 release (Career & Talent, HR Service, Payroll, People Intelligence). Independent analysis places the combined Recruiting, Talent Intelligence Hub, Career Development and Performance footprint under both Annex III 4(a) and 4(b) of the EU AI Act.',
      metric: 'Four Joule agents GA in the 1H 2026 release; classified against Annex III 4(a) and 4(b)',
      url: 'https://www.praxikon.com/en/posts/ai-act-sap-successfactors-classification',
      year: '2026',
    },
    {
      name: 'Syndio (Essentials, Decisions, Predict)',
      org: 'Syndio',
      what: 'The narrow, deep pay-equity specialist: statistical gap analysis, real-time governance of offers, promotions, merit and transfers, and a forthcoming model of downstream impact before a decision is committed.',
      metric: '350+ global enterprises, 30+ of the Fortune 500; more than $1 trillion in compensation governed; analysis over 10 million+ employee pay records',
      url: 'https://synd.io/',
      year: '2026',
    },
    {
      name: 'Visier People + Vee',
      org: 'Visier',
      what: 'The category-defining standalone people-analytics platform: a governed workforce data model with benchmarking, plus Vee, an agent that surfaces insight and recommends an intervention without waiting to be asked.',
      metric: '85,000+ organisations; Sunstate Equipment reports a 50% fall in regrettable turnover, Providence $3M saved in caregiver replacement cost in one year',
      url: 'https://www.visier.com/',
      year: '2026',
    },
    {
      name: 'EconML v0.17.0',
      org: 'py-why (originally Microsoft Research ALICE)',
      what: 'The reference open-source library for heterogeneous treatment effects: doubly-robust learners (LinearDRLearner, ForestDRLearner), X-, T- and S-Learners, CausalForestDML, orthogonal random forests and dynamic DML for panel data — plus DRPolicyTree and DRPolicyForest, which turn a CATE estimate into an explicit, budget-constrained targeting policy.',
      metric: 'v0.17.0, released 31 July 2026',
      url: 'https://github.com/py-why/EconML',
      year: '2026',
    },
    {
      name: 'CausalML',
      org: 'Uber',
      what: 'Uplift modelling with the full meta-learner family (S-, T-, X- and R-Learner) and, more usefully, validation that does not require the counterfactual: a doubly-robust pseudo-outcome loss, a cross-fit T-Learner loss, and RATE — the rank-weighted average treatment effect, which scores whether a model ranks people by how much they benefit rather than by how likely they are to leave.',
      metric: 'DR-loss, T-Learner loss and RATE with targeting-operator-characteristic curves',
      url: 'https://causalml.readthedocs.io/en/latest/methodology.html',
      year: '2026',
    },
    {
      name: 'Browser-resident ONNX embeddings (transformers.js)',
      org: 'Xenova · Hugging Face',
      what: 'Sentence-embedding and zero-shot classification models converted to ONNX and run entirely in the page, so free-text HR data — self-described skills, engagement comments, exit-interview notes — can be vectorised and tagged without ever leaving the employee\'s browser. The strongest available answer to a works council asking where the text goes.',
      metric: 'Xenova/all-MiniLM-L6-v2: 384-dimension embeddings, ~2.7M downloads a month; Xenova/nli-deberta-v3-xsmall for zero-shot skill tagging',
      url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2',
      year: '2026',
    },
  ],
  benchmarks: [
    {
      name: 'Attrition precision, IBM HR Analytics',
      sota: 'Precision 0.91 (recall 0.94, F1 0.92) from a fine-tuned GPT-3.5',
      sotaBy: 'Ma, Liu, Zhao & Tukhvatulina, arXiv:2411.01353 (2024)',
      project: 'Precision 0.814 at a 0.35 threshold; AUC 0.9401',
      sotaValue: 0.91,
      projectValue: 0.814,
      unit: 'precision',
      higherIsBetter: true,
    },
    {
      name: 'Evaluation cohort size',
      sota: '10,000,000+ employee pay records analysed (Syndio); 800bn transactions a year across 10,500 organisations (Workday)',
      sotaBy: 'Syndio · Workday',
      project: '1,470 real employee records, extended to a 50,000-row synthetic training cohort',
      sotaValue: 10000000,
      projectValue: 1470,
      unit: 'employee records',
      higherIsBetter: true,
    },
    {
      name: 'Unexplained pay gap vs. the statutory trigger',
      sota: '5% — the average pay difference between women and men in a category of workers that obliges an employer to run a joint pay assessment',
      sotaBy: 'Directive (EU) 2023/970, Art. 10(1)',
      project: '5.2% controlled gap detected in Engineering (11.3% uncontrolled)',
      sotaValue: 5,
      projectValue: 5.2,
      unit: '% unexplained gap',
      higherIsBetter: false,
    },
    {
      name: 'Skills-graph coverage',
      sota: '13,939 skills and 3,039 occupations across 28 languages (ESCO v1.2.1, European Commission DG EMPL)',
      sotaBy: 'European Commission',
      project: 'No skills graph; 58 engineered features over nine job roles',
      sotaValue: 13939,
      projectValue: 0,
      unit: 'skills',
      higherIsBetter: true,
    },
    {
      name: 'Uplift-model validation',
      sota: 'Qini and AUUC with variance-reduced outcome adjustment, DR-loss and RATE, over a doubly-robust or R-Learner CATE estimate',
      sotaBy: 'Bokelmann & Lessmann (2022) · CausalML · EconML',
      project: 'S-Learner reporting 2.1× lift versus random targeting; no Qini, AUUC, RATE or policy-value figure published',
    },
    {
      name: 'Governance artefacts per model version',
      sota: 'Model card, versioned training data, automatic event logs, human-oversight record and an independent annual bias audit with a public summary',
      sotaBy: 'EU AI Act Annex III · NYC Local Law 144',
      project: 'A Fairlearn MetricFrame report and SHAP reason codes; no model card, no audit export, no logging',
    },
  ],
  upgrades: [
    {
      title: 'Replace the S-Learner with a doubly-robust learner, and score it properly',
      body:
        'The S-Learner fits one model with treatment as a feature, which regularises the treatment effect towards zero whenever the treatment signal is weak relative to the outcome signal — exactly the regime a salary adjustment sits in. Move to EconML\'s LinearDRLearner and ForestDRLearner with an X-Learner as a cross-check, and stop reporting lift-versus-random. Report the Qini curve and AUUC with Bokelmann and Lessmann\'s variance-reduced outcome adjustment, plus RATE from CausalML, and add DRPolicyForest so the output is an explicit targeting policy under a stated retention budget rather than a ranked list someone has to threshold by hand.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Move off IBM HR onto real longitudinal HRIS panel data',
      body:
        'The current benchmark is a 1,470-row synthetic file with 237 positives, and an AUC of 0.9401 on it does not transfer. Rebuild on a person-period panel from a real HRIS — monthly snapshots with time-varying covariates for pay, manager, level, span, location and leave — and fit a discrete-time survival model (person-period logistic regression as the interpretable baseline, Dynamic-DeepHit as the deep comparator for competing exits: voluntary, involuntary, internal move). Report the time-dependent concordance index and a calibration curve, not a single AUC, and hold out by calendar time rather than at random so the evaluation respects the direction the causality runs in.',
      impact: 'high',
      effort: 'months',
      status: 'planned',
    },
    {
      title: 'Conformal risk sets and an explicit abstention',
      body:
        'A per-employee attrition probability with no uncertainty attached is the single most dangerous artefact in the product. Wrap the classifier in split conformal prediction to get distribution-free coverage at a stated level, and use the width of the resulting set as an abstention rule: where the model cannot separate the two classes at the chosen coverage, the surface should say so rather than emit a number a manager will act on. Angelopoulos and Bates\'s treatment covers models that abstain directly, and the guarantee holds without assuming anything about the model or the distribution.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'A skills graph built in the browser, so the free text never leaves it',
      body:
        'Derive the skills layer from the customer\'s own job architecture — job descriptions, levelling guides, internal role titles — rather than buying an ontology. Embed titles and descriptions with Xenova/all-MiniLM-L6-v2 (384 dimensions) or Xenova/bge-small-en-v1.5 running as ONNX under transformers.js, tag free-text skill claims with Xenova/nli-deberta-v3-xsmall as a zero-shot classifier, and reconcile the result against ESCO v1.2.1 for a portable, multilingual spine. Everything runs in the page: self-described skills, engagement comments and exit notes are vectorised on the employee\'s own device and only the vectors — or only the tags — are ever transmitted. That is a materially better answer to a works council than any server-side pipeline can give.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'An EU AI Act Annex III technical-documentation and logging pack',
      body:
        'Annex III point 4(b) covers AI systems used to make decisions affecting the terms of work-related relationships, promotion or termination, and to monitor and evaluate performance and behaviour. That is a fair description of an attrition score shown to a manager. Build the compliance artefacts as pipeline outputs rather than documents: a model card per version, a versioned dataset manifest with lineage, automatic event logs of every score served and every override, a recorded human-oversight step, and the intended-purpose and known-limitations statements. The Digital Omnibus moved the Annex III application date to 2 December 2027, which is a reprieve rather than a reprieve from building it.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'A no-adverse-action guard enforced in the API, not in policy',
      body:
        'The fastest way to destroy the product is for a manager to use a flight-risk score to decide who to cut. Enforce it structurally: attrition scores are unavailable to any surface associated with termination, discipline, performance rating or redundancy selection; the scoring endpoint refuses requests carrying those contexts; every read is attributed and logged; and the audit trail is exportable to an employee representative. Policy documents do not survive a reorganisation. A 403 does.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'An annual bias-audit exporter in the Local Law 144 shape',
      body:
        'New York City requires an independent bias audit within one year of use, with a public summary and ten business days\' notice to candidates; penalties run at $500 for a first violation and $500 to $1,500 for each subsequent one, with each day of non-compliant use counting separately. Extend the existing Fairlearn MetricFrame work into a signed export: selection and impact ratios by sex, by race and ethnicity, and by the intersectional categories the law requires, with counts, scoring rates and the distribution of scores — formatted so an independent auditor can review and publish it without a data-engineering project.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Drift monitoring and scheduled recalibration',
      body:
        'A workforce model decays faster than a credit model because the population is reorganised deliberately. Track population stability on every feature, calibration drift on the score, and prequential AUC over a rolling window per business unit; trigger recalibration on a threshold rather than a calendar. Pair it with a champion-challenger slot so a retrained model has to beat the incumbent on the same held-out period before it is promoted, and record the comparison as part of the model card.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
  ],
  compliance: [
    {
      name: 'EU Pay Transparency Directive (EU) 2023/970',
      body:
        'Member states were required to transpose the directive by 7 June 2026 (Art. 27(1)). Employers with 250 or more workers report gender pay-gap data by 7 June 2027 and annually thereafter; those with 150 to 249 workers by 7 June 2027 and every three years; those with 100 to 149 workers by 7 June 2031 and every three years (Art. 9). Where reporting shows an average pay difference of at least 5% in any category of workers that the employer cannot justify on objective, gender-neutral criteria and has not remedied within six months, a joint pay assessment with worker representatives becomes mandatory (Art. 10(1)). The controlled 5.2% gap this project found in Engineering is over that line.',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023L0970',
    },
    {
      name: 'EU AI Act (Regulation (EU) 2024/1689), Annex III point 4',
      body:
        'Annex III 4(a) covers AI used for recruitment or selection; 4(b) covers AI used to make decisions affecting the terms of work-related relationships, promotion or termination, to allocate tasks on the basis of individual behaviour or personal traits, or to monitor and evaluate performance and behaviour. Attrition scoring, promotion-velocity analysis and intervention targeting all sit inside 4(b). Prohibitions have applied since 2 February 2025 and general application arrives on 2 August 2026, but the Digital Omnibus — provisionally agreed on 6 May 2026 and confirmed by the Council on 13 May — moved the Annex III high-risk obligations to 2 December 2027 and Annex I to 2 August 2028. Nothing was repealed.',
      url: 'https://artificialintelligenceact.eu/annex/3/',
    },
    {
      name: 'NYC Local Law 144 (automated employment decision tools)',
      body:
        'An employer using an AEDT in New York City must have it independently bias-audited within one year of use, publish a summary of the results, and give candidates and employees notice at least ten business days beforehand. Penalties are $500 for a first violation and between $500 and $1,500 for each subsequent violation, with each day of use counting as a separate violation. A December 2025 audit by the New York State Comptroller found DCWP enforcement to be ineffective, which is a reason to build the audit artefact rather than to skip it.',
      url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page',
    },
    {
      name: 'Colorado AI Act — SB 24-205 as replaced by SB 189',
      body:
        'The original Colorado AI Act, with its duty of care against algorithmic discrimination and its impact-assessment obligations, never took effect. Its 1 February 2026 date was pushed to 30 June 2026 by SB 25B-004, and on 14 May 2026 Governor Polis signed SB 189, which replaced the risk-based framework with a narrower disclosure regime effective 1 January 2027: a plain-language description of the automated decision system\'s role within 30 days of an adverse outcome, and a 60-day notice-and-cure period. Employment remains a consequential-decision domain, so the disclosure duty still applies.',
      url: 'https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/',
    },
    {
      name: 'Illinois HB 3773 (Illinois Human Rights Act amendment)',
      body:
        'Effective 1 January 2026, Illinois employers may not use AI that has the effect of subjecting employees to discrimination on the basis of a protected class in recruitment, hiring, promotion, renewal, training selection, discharge, discipline, tenure or the terms and conditions of employment, and may not use zip code as a proxy for a protected class. Notice to employees and applicants is required. Liability attaches to the discriminatory effect regardless of intent, which puts the burden on measurement rather than on documentation.',
      url: 'https://natlawreview.com/article/illinois-anti-discrimination-law-address-ai-goes-effect-1-january-2026',
    },
  ],
  sources: [
    { title: 'Directive (EU) 2023/970 on pay transparency — consolidated text', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023L0970', org: 'EUR-Lex', date: '2023-05' },
    { title: 'EU AI Act Annex III — high-risk AI systems referred to in Article 6(2)', url: 'https://artificialintelligenceact.eu/annex/3/', org: 'EU Artificial Intelligence Act', date: '2024-07' },
    { title: 'EU AI Act implementation timeline', url: 'https://artificialintelligenceact.eu/implementation-timeline/', org: 'EU Artificial Intelligence Act', date: '2026' },
    { title: 'EU AI Act Omnibus agreement — postponed high-risk deadlines and other key changes', url: 'https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/', org: 'Gibson Dunn', date: '2026-05' },
    { title: 'Automated Employment Decision Tools (AEDT) — Local Law 144', url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page', org: 'NYC Department of Consumer and Worker Protection', date: '2023-07' },
    { title: 'Colorado AI law in flux: comprehensive replacement bill signed', url: 'https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/', org: 'McDermott Will & Schulte', date: '2026-05' },
    { title: 'SAP SuccessFactors under the EU AI Act: Joule, Talent Intelligence Hub and the 4(a)/4(b) reality', url: 'https://www.praxikon.com/en/posts/ai-act-sap-successfactors-classification', org: 'Praxikon', date: '2026-05' },
    { title: 'Announcing Workday Illuminate: the next generation of Workday AI', url: 'https://newsroom.workday.com/2024-09-17-Announcing-Workday-Illuminate-TM-The-Next-Generation-of-Workday-AI', org: 'Workday', date: '2024-09' },
    { title: 'Talent Intelligence Platform', url: 'https://eightfold.ai/talent-intelligence-platform/', org: 'Eightfold AI', date: '2026' },
    { title: 'Pay equity and compensation governance platform', url: 'https://synd.io/', org: 'Syndio', date: '2026' },
    { title: 'EconML — ALICE: machine learning for heterogeneous treatment effects', url: 'https://github.com/py-why/EconML', org: 'py-why', date: '2026-07' },
    { title: 'CausalML methodology — meta-learners and validation', url: 'https://causalml.readthedocs.io/en/latest/methodology.html', org: 'Uber', date: '2026' },
    { title: 'Improving uplift model evaluation on RCT data (arXiv:2210.02152)', url: 'https://arxiv.org/abs/2210.02152', org: 'Bokelmann & Lessmann', date: '2022-10' },
    { title: 'Can large language models predict employee attrition? (arXiv:2411.01353)', url: 'https://arxiv.org/abs/2411.01353', org: 'Ma, Liu, Zhao & Tukhvatulina', date: '2024-11' },
    { title: 'DeepHit: a deep learning approach to survival analysis with competing risks', url: 'https://aaai.org/papers/11842-deephit-a-deep-learning-approach-to-survival-analysis-with-competing-risks/', org: 'Lee, Zame, Yoon & van der Schaar, AAAI', date: '2018' },
    { title: 'A gentle introduction to conformal prediction and distribution-free uncertainty quantification (arXiv:2107.07511)', url: 'https://arxiv.org/abs/2107.07511', org: 'Angelopoulos & Bates', date: '2021-07' },
    { title: 'What is ESCO — European Skills, Competences, Qualifications and Occupations (v1.2.1)', url: 'https://esco.ec.europa.eu/en/about-esco/what-esco', org: 'European Commission DG EMPL', date: '2025-12' },
    { title: 'Xenova/all-MiniLM-L6-v2 — ONNX sentence embeddings for transformers.js', url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2', org: 'Hugging Face', date: '2026' },
    { title: 'Xenova/bge-small-en-v1.5 — ONNX feature extraction for transformers.js', url: 'https://huggingface.co/Xenova/bge-small-en-v1.5', org: 'Hugging Face', date: '2026' },
    { title: 'Xenova/nli-deberta-v3-xsmall — ONNX zero-shot classification for transformers.js', url: 'https://huggingface.co/Xenova/nli-deberta-v3-xsmall', org: 'Hugging Face', date: '2026' },
  ],
}

export default frontier
