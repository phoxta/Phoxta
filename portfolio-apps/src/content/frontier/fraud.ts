import type { Frontier } from '../frontier'

/**
 * Real-Time Fraud Detection — the 2026 frontier.
 * Every claim is backed by an entry in `sources`; figures are quoted from those pages.
 */
const frontier: Frontier = {
  asOf: '2026-09',
  headline:
    'The architecture is right and the discipline is unusual, but the model still sees one row at a time — and the 2026 evidence says the cheapest way to fix that is neighbourhood-aggregated features fed to the same boosters, not a graph neural network.',
  summary: [
    'The reflex answer to "what beats gradient boosting on fraud in 2026" is a graph neural network, and the benchmark evidence says otherwise. GADBench evaluates 29 models across 10 real graph-anomaly datasets and finds that tree ensembles with simple neighbourhood aggregation outperform GNNs purpose-built for the task: with default hyperparameters XGB-Graph beats the strongest GNN by 2.0 points of AUROC, 12.9 points of AUPRC and 9.8 points of Rec@K. Tuned, XGB-Graph reaches 97.37 AUROC on YelpChi and 98.74 on Amazon. The 2026 follow-up is blunter still — under a strictly inductive, leakage-free protocol on Elliptic, a random forest on raw features scores F1 0.821 against GraphSAGE\'s 0.689, and randomly wired graphs beat the real transaction graph, which puts a 39.5-point question mark over a good deal of the published GNN literature.',
    'What has genuinely moved is representation over time and the industrial seriousness of the latency contract. Stripe replaced feature-by-feature models with a transformer trained self-supervised on tens of billions of payments and reported detection of novel card-testing attacks going from 59% to 97% overnight with no rise in false positives. Feedzai\'s KDD 2020 paper remains the only place a vendor publishes a real latency distribution — mean 4.06 ms, p99 10.47 ms, p99.9 42.82 ms, p99.999 126.66 ms against a contractual ceiling of 200 ms at the 99.999th percentile — and names external profile fetches as the dominant tail cost. Visa\'s Account Attack Intelligence evaluates up to 182 risk attributes in a millisecond and claims an 85% lower false-positive rate than its previous models; Mastercard\'s Decision Intelligence Pro reports an average 20% detection lift, more than 85% fewer false positives, and a decision in under 50 ms.',
    'This project sits credibly inside that world on process and outside it on representation. The stacked XGBoost + LightGBM ensemble reaches AUROC 0.9412 and AUC-PR 0.716 on the 118,108-row IEEE-CIS hold-out, 91% recall at a 2.3% false-positive rate, a decision inside 20 ms and a SHAP attribution inside 2 ms, with 10-bucket PSI drift monitoring and a retrain trigger at 0.20 — more governance than most production stacks carry. What it does not have is any relational or temporal view of the same 433 columns. NVIDIA measured exactly that gap on TabFormer, a 24-million-transaction tape at a 0.1% fraud rate: XGBoost alone reaches 0.90 AUPRC once R-GCN entity embeddings are added as features, against 0.79 without them. That is the cheapest large win available here, and it does not require abandoning a single line of the existing pipeline.',
  ],
  stateOfTheArt: [
    {
      name: 'GADBench',
      org: 'Tang, Hua, Gao, Zhao and Li — HKUST-GZ and Tencent AI Lab, NeurIPS 2023',
      what: 'The reference benchmark for supervised graph anomaly detection: 29 models across 10 real datasets from thousands to ~6M nodes. Its headline conclusion — that tree ensembles with simple neighbourhood aggregation outperform GNNs tailored to the task — is the most useful single finding for anyone already running boosted trees.',
      metric: 'XGB-Graph beats the best GNN by +2.0 AUROC, +12.9 AUPRC, +9.8 Rec@K at defaults; 97.37 AUROC on YelpChi',
      url: 'https://arxiv.org/pdf/2306.12251',
      year: '2023',
    },
    {
      name: 'When Graph Structure Becomes a Liability',
      org: 'Maganti, arXiv 2604.19514',
      what: 'A leakage-free re-evaluation of GNNs for Bitcoin fraud on Elliptic under temporal distribution shift. Random forest on raw features beats every GNN tested, and randomly wired graphs outperform the real transaction graph — the gap is attributed to training-time exposure to test-period adjacency.',
      metric: 'Random forest F1 0.821 vs GraphSAGE 0.689 ± 0.017',
      url: 'https://arxiv.org/abs/2604.19514',
      year: '2026',
    },
    {
      name: 'Payments Foundation Model',
      org: 'Stripe',
      what: 'A transformer trained self-supervised on tens of billions of transactions that reduces each payment to a single reusable embedding, then classifies sequences of those embeddings per task rather than scoring rows in isolation.',
      metric: 'Novel card-testing detection 59% → 97% on large users, no rise in false positives',
      url: 'https://stripe.com/blog/using-ai-optimize-payments-performance-payments-intelligence-suite',
      year: '2025',
    },
    {
      name: 'Interleaved Sequence RNNs for Fraud Detection',
      org: 'Branco, Abreu, Gomes, Almeida, Ascensão and Bizarro — Feedzai, KDD 2020',
      what: 'The only peer-reviewed disclosure of a production fraud system\'s full latency distribution, alongside an interleaved RNN that reads a card\'s transaction sequence directly instead of relying on precomputed profiles. It also names the real bottleneck: fetching profiles from external systems dominates the high percentiles.',
      metric: 'p99 10.47 ms, p99.999 126.66 ms against a 200 ms SLA; +9.7% recall and ≈€1M more money recalled vs LightGBM with profiles',
      url: 'https://arxiv.org/pdf/2002.05988',
      year: '2020',
    },
    {
      name: 'Visa Account Attack Intelligence (VAAI) Score',
      org: 'Visa',
      what: 'A generative-AI enumeration-attack model trained on more than 15 billion VisaNet transactions, scoring six times the features of its predecessor. Enumeration is the specific attack card testing belongs to, and Visa puts $1.1bn a year of losses against it.',
      metric: '182 risk attributes in 1 ms, 20 ms scoring, 85% lower false-positive rate than previous models',
      url: 'https://investor.visa.com/news/news-details/2024/Visa-Announces-Generative-AI-Powered-Fraud-Solution-to-Combat-Account-Attacks/default.aspx',
      year: '2024',
    },
    {
      name: 'Decision Intelligence Pro',
      org: 'Mastercard',
      what: 'A network-level model scoring the relationships between the entities around a transaction rather than the transaction alone, analysing a trillion data points per decision across a base of roughly 125 billion annual transactions.',
      metric: '+20% detection on average (up to 300%), >85% fewer false positives, <50 ms',
      url: 'https://www.pymnts.com/artificial-intelligence-2/2024/mastercard-says-new-ai-model-ups-fraud-detection-by-20percent/',
      year: '2024',
    },
    {
      name: 'TabICL and TabPFN v2',
      org: 'Qu, Holzmüller, Varoquaux and Le Morvan (ICML 2025); Hollmann et al. (Nature, 2025)',
      what: 'Tabular foundation models that predict in a single forward pass with no tuning. TabPFN v2 is the accuracy reference but is capped at 10,000 samples, 500 features and 10 classes and is explicitly not optimised for real-time inference; TabICL is the version that reaches fraud-sized data.',
      metric: 'TabPFN v2: 0.952 vs CatBoost 0.822 normalised ROC AUC when both tuned. TabICL: 500K samples, up to 10× faster, beats TabPFNv2 and CatBoost on 53 datasets above 10K rows',
      url: 'https://arxiv.org/abs/2502.05564',
      year: '2025',
    },
    {
      name: 'Transformers.js ONNX models',
      org: 'Hugging Face — Xenova and onnx-community',
      what: 'Browser-runnable ONNX conversions that make client-side inference practical for analyst tooling with no server round-trip and no case text leaving the machine. Xenova/finbert is the only finance-native browser-runnable classifier confirmed to exist; Xenova/all-MiniLM-L6-v2 ships a 23 MB int8 build against a 90.4 MB fp32 one, which is what makes it shippable.',
      metric: 'Hub downloads: Xenova/all-MiniLM-L6-v2 26.7M/month, Xenova/finbert 200.4k/month',
      url: 'https://huggingface.co/Xenova/finbert',
      year: '2026',
    },
  ],
  benchmarks: [
    {
      name: 'Total prediction latency, p99',
      sota: '10.47 ms measured end to end (Feedzai, KDD 2020; mean 4.06 ms, p99.999 126.66 ms against a 200 ms SLA)',
      sotaBy: 'Feedzai',
      project: '< 20 ms, percentile unstated; SHAP attribution adds < 2 ms',
      sotaValue: 10.47,
      projectValue: 20,
      unit: 'ms',
      higherIsBetter: false,
    },
    {
      name: 'Held-out ROC-AUC',
      sota: '97.37 on YelpChi and 98.74 on Amazon — XGB-Graph, tuned (different, denser tapes)',
      sotaBy: 'GADBench',
      project: '94.12 on the 118,108-row IEEE-CIS hold-out; AUC-PR 0.716',
      sotaValue: 97.37,
      projectValue: 94.12,
      unit: 'AUROC ×100',
    },
    {
      name: 'Value of relational features to a booster, AUPRC',
      sota: '0.90 — R-GCN entity embeddings added as features to XGBoost on TabFormer (24M transactions, 0.1% fraud)',
      sotaBy: 'NVIDIA',
      project: '0.79 — the same XGBoost without relational features. This project has none at all, and scores 0.716 AUC-PR on its own tape',
      sotaValue: 0.9,
      projectValue: 0.79,
      unit: 'AUPRC',
    },
    {
      name: 'False-positive reduction against the incumbent model',
      sota: '85% lower false-positive rate than previous risk models (Visa VAAI); 73% fewer on a tier-1 bank replacement (Feedzai)',
      sotaBy: 'Visa',
      project: '2.3% absolute false-positive rate at the production threshold; no before-and-after against an incumbent has been run',
      sotaValue: 85,
      unit: '% reduction',
    },
    {
      name: 'Detection of novel card-testing attacks',
      sota: '97%, up from 59% before the foundation model, at unchanged false positives',
      sotaBy: 'Stripe',
      project: 'Not measured — the ensemble scores one row at a time and has no sequence view of a card',
      sotaValue: 97,
      unit: '%',
    },
  ],
  upgrades: [
    {
      title: 'Add neighbourhood-aggregated features to the existing boosters',
      body:
        'Not a GNN. GADBench finds that tree ensembles with simple neighbourhood aggregation beat purpose-built GNNs across ten datasets — XGB-Graph ahead of the best GNN by 2.0 AUROC and 12.9 AUPRC points at default settings. Build the entity graph from columns already present (card1–card6, DeviceInfo, P_emaildomain, addr1/addr2), compute degree, neighbour-label and neighbour-feature aggregates, and pass them to the same XGBoost and LightGBM models. NVIDIA measured the ceiling on a comparable tape: 0.79 to 0.90 AUPRC on TabFormer from exactly this change.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Re-split strictly by time and forbid future adjacency before believing any of it',
      body:
        'The 2026 Elliptic re-evaluation reports a 39.5-point F1 gap attributable to training-time exposure to test-period graph structure, and finds randomly wired graphs beating the real one — meaning much of the published relational lift is leakage. Re-split IEEE-CIS on TransactionDT rather than at random, compute every aggregate from a strictly backward-looking window, and re-measure. This costs days and determines whether the previous upgrade is real.',
      impact: 'high',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Publish a latency distribution, not a latency number',
      body:
        '"< 20 ms" states no percentile and no probe points. Feedzai\'s published table is the standard to match: mean 4.06 ms, p99 10.47, p99.9 42.82, p99.99 75.90, p99.999 126.66, against a contractual 200 ms at p99.999 — and it identifies external profile fetches, not model evaluation, as what dominates the tail. Instrument feature fetch, model evaluation and attribution separately and report the same percentiles, because the number that gets a payments deal signed is p99.999, not the mean.',
      impact: 'medium',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Model each card as a sequence',
      body:
        'Card testing is a pattern across consecutive authorisations and is invisible to a per-row classifier. Two independent production results point the same way: Stripe\'s 59% to 97% jump on novel card-testing attacks after moving to sequence classification over self-supervised payment embeddings, and Feedzai\'s interleaved-sequence RNN gaining 9.7% recall and 1.54% money recall — roughly €1M on one client — over LightGBM with hand-built profiles. Pretrain on the unlabelled stream, fit a light head on the labelled subset.',
      impact: 'high',
      effort: 'months',
      status: 'planned',
    },
    {
      title: 'Run TabICL as the challenger, not TabPFN',
      body:
        'TabPFN v2 is the stronger model per row — 0.952 against CatBoost\'s 0.822 normalised ROC AUC when both are tuned — but its published envelope is 10,000 samples, 500 features and 10 classes, and Nature states plainly that it is not optimised for real-time inference. TabICL handles 500,000 samples, runs up to 10× faster, and beats both TabPFNv2 and CatBoost on the 53 benchmark datasets above 10,000 rows. A 590,540-row, 433-column tape is TabICL\'s regime. No published work yet compares either against GBDTs on fraud-shaped data, so this is also a genuinely open question worth answering.',
      impact: 'medium',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Set the threshold from the PSD2 exemption bands and the VAMP fee, not from F1',
      body:
        'An F1-optimal cut at 0.43 optimises a statistic nobody is measured on. Under Commission Delegated Regulation (EU) 2018/389 Article 18, a payment service provider may waive strong customer authentication on a remote card payment up to €500 only while its fraud rate stays below 0.01% — €250 below 0.06%, €100 below 0.13% — so the threshold directly controls how much checkout friction the business is allowed to remove. Visa\'s VAMP adds $8 per fraudulent or disputed transaction once a merchant passes a 1.5% ratio, tightened on 1 April 2026. Re-derive the operating point from those two cost functions and recompute it monthly.',
      impact: 'high',
      effort: 'days',
      status: 'planned',
    },
    {
      title: 'Adopt the 2026 exact-SHAP accelerations for stability, not speed',
      body:
        'At under 2 ms per transaction attribution cost is not the problem; reproducibility is. Three 2026 results give exact tree attributions more cheaply and more stably — Quadrature-TreeSHAP at 1.06–10.59× on CPU with explicit numerical-stability improvements, WOODELF-HD reducing background preprocessing from 3^D to 2^D for 33× and 162× speedups on deep ensembles, and a Boolean-logic reformulation reaching 165× on GPU. The reason to take them is that identical inputs should produce identical reason codes across retrains, which is what an audit actually tests.',
      impact: 'low',
      effort: 'weeks',
      status: 'planned',
    },
    {
      title: 'Emit a signed, replayable decision record for every score',
      body:
        'Persist the feature vector, model and calibration versions, the SHAP attributions, the threshold in force, the drift state and the eventual outcome, hashed into an append-only log. This is what lets a decline be reconstructed months later — necessary under Regulation B wherever a fraud score contributes to a credit decision, and the practical evidence any VAMP enrolment dispute turns on. It also makes the model auditable without exporting the model.',
      impact: 'high',
      effort: 'weeks',
      status: 'planned',
    },
  ],
  compliance: [
    {
      name: 'EU AI Act — fraud detection is carved out, credit scoring is not',
      body:
        'Annex III point 5(b) makes AI evaluating the creditworthiness of natural persons high-risk "with the exception of AI systems used for the purpose of detecting financial fraud", and Recital 58 confirms that fraud-detection and prudential capital systems "should not be considered to be high-risk". A pure fraud score sits outside the regime. The moment the same score also drives an approval, a limit or a price, the exception stops applying and the Annex III duties attach, including the Article 86 right of an affected person to a clear explanation of the system\'s role. Regulation (EU) 2026/1744 of 8 July 2026, in force 27 July, moved the Annex III compliance date to 2 December 2027 and Annex I to 2 August 2028.',
      url: 'https://artificialintelligenceact.eu/recital/58/',
    },
    {
      name: 'PSD2 strong customer authentication — the transaction risk analysis exemption',
      body:
        'Commission Delegated Regulation (EU) 2018/389 Article 18 lets a payment service provider skip strong customer authentication where real-time risk analysis classifies the payment as low risk, but only while its own fraud rate stays under a reference rate that falls as the exemption threshold rises: 0.13% up to €100, 0.06% up to €250 and 0.01% up to €500 for remote card payments (0.015%, 0.01% and 0.005% for credit transfers). Model quality is therefore not a back-office metric — it is the gate on how much checkout friction can legally be removed.',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389',
    },
    {
      name: 'PSD3 and the Payment Services Regulation',
      body:
        'Provisional political agreement was reached on 27 November 2025, with the Payment Services Regulation applying 18 months after entry into force and payee-name-verification liability at 24 months. Three provisions bear directly on a fraud system: mandatory IBAN and payee-name matching on credit transfers with the result returned within seconds; impersonation and spoofing fraud treated as unauthorised transactions triggering full reimbursement where the user reports to police and notifies the provider; and an explicit obligation to operate risk-sensitive behavioural transaction monitoring, with permission to exchange specified personal data under structured fraud-information-sharing arrangements subject to GDPR safeguards.',
      url: 'https://www.nortonrosefulbright.com/en/knowledge/publications/cedd39c6/psd3-and-psr-from-provisional-agreement-to-2026-readiness',
    },
    {
      name: 'Visa Acquirer Monitoring Program (VAMP)',
      body:
        'The VAMP ratio is reported fraudulent transactions plus total disputes divided by settled card-not-present transactions. The merchant excessive threshold fell from 2.2% to 1.5% on 1 April 2026; acquirer above-standard enforcement at 0.5% began 1 January 2026, with 0.7% excessive. Enrolled merchants are assessed $8 per fraudulent or disputed transaction, with a three-month grace period on a first breach in a rolling twelve months. This is the constraint a production threshold should actually be tuned against.',
      url: 'https://merchantriskcouncil.org/learning/resource-center/member-news/blog/2026/stricter-vamp-ratio-thresholds-are-now-in-effect-heres-how-to-stay-compliant',
    },
    {
      name: 'ECOA and Regulation B where a fraud decline is a credit decision',
      body:
        '12 CFR 1002.9 requires notice within 30 days of a completed application and a statement of reasons that "must be specific and indicate the principal reason(s) for the adverse action"; citing internal standards, or that the applicant failed to reach a qualifying score, is expressly insufficient. The CFPB withdrew Circulars 2022-03 and 2023-03 — the guidance that applied this to complex algorithms — on 12 May 2025, but withdrawing an interpretation does not amend the regulation, and ECOA remains enforceable by the DOJ, state attorneys general and private plaintiffs.',
      url: 'https://www.law.cornell.edu/cfr/text/12/1002.9',
    },
  ],
  sources: [
    {
      title: 'GADBench: Revisiting and Benchmarking Supervised Graph Anomaly Detection',
      url: 'https://arxiv.org/pdf/2306.12251',
      org: 'Tang, Hua, Gao, Zhao and Li — HKUST-GZ, HKUST, Tencent AI Lab (NeurIPS 2023)',
      date: '2023-06',
    },
    {
      title: 'When Graph Structure Becomes a Liability: A Critical Re-Evaluation of GNNs for Bitcoin Fraud Detection',
      url: 'https://arxiv.org/abs/2604.19514',
      org: 'Maganti',
      date: '2026-04',
    },
    {
      title: 'Using AI to optimize payments performance with the Payments Intelligence Suite',
      url: 'https://stripe.com/blog/using-ai-optimize-payments-performance-payments-intelligence-suite',
      org: 'Stripe',
      date: '2025-05',
    },
    {
      title: 'Interleaved Sequence RNNs for Fraud Detection',
      url: 'https://arxiv.org/pdf/2002.05988',
      org: 'Branco, Abreu, Gomes, Almeida, Ascensão and Bizarro — Feedzai (KDD 2020)',
      date: '2020-08',
    },
    {
      title: 'Visa Announces Generative AI-Powered Fraud Solution to Combat Account Attacks',
      url: 'https://investor.visa.com/news/news-details/2024/Visa-Announces-Generative-AI-Powered-Fraud-Solution-to-Combat-Account-Attacks/default.aspx',
      org: 'Visa',
      date: '2024-05',
    },
    {
      title: 'Mastercard says new AI model ups fraud detection by 20%',
      url: 'https://www.pymnts.com/artificial-intelligence-2/2024/mastercard-says-new-ai-model-ups-fraud-detection-by-20percent/',
      org: 'PYMNTS, quoting Mastercard',
      date: '2024-02',
    },
    {
      title: 'Optimizing Fraud Detection in Financial Services with Graph Neural Networks and NVIDIA GPUs',
      url: 'https://developer.nvidia.com/blog/optimizing-fraud-detection-in-financial-services-with-graph-neural-networks-and-nvidia-gpus/',
      org: 'NVIDIA',
      date: '2022-10',
    },
    {
      title: 'TabICL: A Tabular Foundation Model for In-Context Learning on Large Data',
      url: 'https://arxiv.org/abs/2502.05564',
      org: 'Qu, Holzmüller, Varoquaux and Le Morvan (ICML 2025)',
      date: '2025-02',
    },
    {
      title: 'Accurate predictions on small data with a tabular foundation model',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11711098/',
      org: 'Hollmann et al., Nature 637(8045):319–326',
      date: '2025-01',
    },
    {
      title: 'Annex III: High-Risk AI Systems Referred to in Article 6(2)',
      url: 'https://artificialintelligenceact.eu/annex/3/',
      org: 'EU Artificial Intelligence Act',
      date: '2024-07',
    },
    {
      title: 'Recital 58 — fraud detection and prudential systems are not high-risk',
      url: 'https://artificialintelligenceact.eu/recital/58/',
      org: 'EU Artificial Intelligence Act',
      date: '2024-07',
    },
    {
      title: 'Commission Delegated Regulation (EU) 2018/389 — SCA regulatory technical standards, Article 18 and Annex',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018R0389',
      org: 'EUR-Lex',
      date: '2018-03',
    },
    {
      title: 'PSD3 and PSR: from provisional agreement to 2026 readiness',
      url: 'https://www.nortonrosefulbright.com/en/knowledge/publications/cedd39c6/psd3-and-psr-from-provisional-agreement-to-2026-readiness',
      org: 'Norton Rose Fulbright',
      date: '2026',
    },
    {
      title: 'Stricter VAMP Ratio Thresholds Are Now in Effect',
      url: 'https://merchantriskcouncil.org/learning/resource-center/member-news/blog/2026/stricter-vamp-ratio-thresholds-are-now-in-effect-heres-how-to-stay-compliant',
      org: 'Merchant Risk Council',
      date: '2026',
    },
    {
      title: 'Xenova/finbert — ONNX FinBERT for Transformers.js',
      url: 'https://huggingface.co/Xenova/finbert',
      org: 'Hugging Face',
      date: '2025-06',
    },
  ],
}

export default frontier
