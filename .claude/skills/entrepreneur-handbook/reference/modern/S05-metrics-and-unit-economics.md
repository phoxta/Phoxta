# S05 — Metrics and unit economics: CAC, LTV, retention, burn, Rule of 40 (2026 layer)
Supplements: `A-financial-statements.md` (three statements + classic ratios, but **no modern startup
metric** — no CAC, LTV, churn, NRR, burn multiple or Rule of 40), `B-breakeven.md` (unit contribution
margin, extended here to customer and cohort level), `C-valuation.md` (the metrics that now drive
private multiples), `05-business-plan.md` and `08-angels-and-vc.md` (what a 2026 investor diligences),
and stage 7 of `00-journey-map.md`. Cross-reference `S01-sales.md` for funnel, NRR/GRR, CAC-ratio and
DTC-conversion benchmarks — not repeated at length. Load when a founder asks "what should I measure",
"are my unit economics good", "how long is my runway", "what will investors want to see", or when
building any calculator or dashboard.

## What changed since 2018
- **Efficiency replaced growth as the first screen.** Benchmarkit's 2026 panel shows median Rule of
  40 jumping 15% → 25% (largest one-year gain in five years) while median private B2B SaaS growth
  fell to 22%, from 25% in 2024, across 1,000+ companies [15][19].
- **The burn multiple became the default capital-efficiency metric.** Sacks published it in 2020
  (net burn ÷ net new ARR) as "a catch-all metric"; VCs now quote its bands publicly [4][22].
  **CAC payback stretched badly** out of the historic 12-14-month range — CRV tells Series A founders
  ~20 months is typical [22]. Payback, not LTV:CAC, is what investors trust.
- **Gross retention is eroding.** Median GRR 88% → 84%, top-quartile 95% → 91%; NRR now depends on
  pricing model — usage-based 108% vs seat-based 98% [15].
- **T2D3 stopped describing reality.** Agrawal's 2015 "triple, triple, double, double, double"
  remains the aspiration [10]; Battery reframed it around the founder-to-CEO journey [11], SaaStr
  argues top AI-era companies run "T3D3" [12], and Bessemer's Cloud 100 averages 7.5 years to $100M
  ARR — 5.7 for AI companies [13].
- **AI broke the 80% gross-margin assumption.** Inference is COGS, not R&D: AI-native margins cluster
  at 50-60% vs SaaS 70-85%, and only 12% of companies target 80%+ [26][30][27].
- **Pricing fragmented, so revenue metrics fragmented.** Hybrid pricing overtook everything (37%, up
  from 25% in a year); seats fell to 18%, outcome-based reached 6%. "ARR" now needs a quality note —
  recurring vs pilot vs services [30][22]. **Rounds also moved further apart**: median time between
  rounds is near two years against a median seed runway of ~10.8 months [46][47].
- **Marketplaces moved from GMV to retention and liquidity** — a16z calls GMV retention "the metric
  most ignore" [35]; Tavel calls raw GMV vanity and scores "happy GMV" [37][38]. **Attribution
  broke, so blended metrics won in DTC**; platform-ROAS-only brands over-spend on paid 20-40% [40][55].

## Core ideas (current consensus)
- **Unit economics is breakeven at customer level.** Appendix B's contribution margin per unit becomes
  margin per *customer* over a *lifetime*: does one customer repay the cost of getting them? [1][2]
- **Payback beats ratios.** Skok pairs LTV:CAC > 3 with CAC recovery under 12 months, best-in-class
  5-7 [1]. A ratio can be gamed by an optimistic lifetime; payback cannot. And **LTV is a tool, not a
  strategy** — Gurley (2012, still the definitive critique): the variables are "interdependent, not
  independent" and spending more raises CAC [3].
- **Every channel decays** — Chen's Law of Shitty Clickthroughs, restated 2025 as "every marketing
  channel sucks right now" [51][52]. Model CAC as rising, not flat. **The burn multiple is the
  catch-all** — product, churn, pricing and hiring problems all end up as more burn per dollar of net
  new ARR [4].
- **Cohorts, not aggregates.** A flattening retention curve is the strongest evidence of PMF;
  aggregate churn hides whether the product is improving [32][22]. And **read GRR before NRR** —
  expansion masks an eroding base, exactly Benchmarkit's pattern [15][21].
- **GMV is a marketplace vanity metric** — measure happy GMV, liquidity and cohort GMV retention
  instead (Tavel; a16z) [37][38][35]. **Take rate is earned by work done** — Tidemark's layer cake [36].
- **In DTC only contribution margin after marketing is honest** — the median compressed from ~35%
  (2021) to ~22% (2025) [40]. **In AI the *direction* of gross margin matters more than the level**
  (CRV, 2026): tripling revenue can triple compute spend [22][25].
- **Rule of 40 is a scorecard, not a law** — popularised by Feld and Wilson in 2015 for companies at
  scale (~$50M+ revenue) [5][6]; ICONIQ applies it from about $25M ARR [16].

## Frameworks & playbooks

### A. Acquisition, payback and lifetime value

| Metric | Formula | Notes |
|---|---|---|
| CAC (blended) | Total S&M spend in period ÷ new customers acquired in period | Skok [2]; include salaries, commissions, tools, agency fees. DTC form: total marketing spend ÷ all new customers [40] |
| CAC (paid) / fully-loaded CAC | Paid acquisition spend ÷ new customers from paid; fully-loaded = (S&M + onboarding/implementation cost) ÷ new customers | Paid CAC is the number that scales [40]; use fully-loaded where onboarding is heavy (services, enterprise) |
| CAC ratio | S&M spend ÷ net new ARR, same period | "$ of S&M per $1 of new ARR"; blended median $1.30 [15] |
| ARPA / ARPU | Recurring revenue in period ÷ active accounts (or users) | Pick account or user and stay consistent |
| Customer lifetime (months) | 1 ÷ monthly customer churn rate | 3%/mo churn → 33 months [2] |
| LTV (simple / gross-margin) | ARPA ÷ monthly churn rate; gross-margin version = (ARPA × gross margin %) ÷ monthly churn rate | **Use the gross-margin version** — the simple one overstates value [2] |
| LTV (with expansion) | Discounted sum over t of (a + m·t)·(1−c)^t, where a = initial monthly ARPA × GM%, m = monthly ARPA growth per account, c = monthly churn | Skok's "complex version"; assumes roughly fixed ARPA growth [2] |
| LTV:CAC | LTV ÷ CAC | > 3 healthy; best SaaS 7-8x [1]. Meaningless pre-PMF [3] |
| CAC payback (months) | CAC ÷ (ARPA × gross margin %) | Skok's "months to recover CAC" [2] |
| CAC payback (ARR form) | S&M spend in quarter ÷ (net new ARR × gross margin %) × 12 | The version Benchmarkit and ICONIQ report [15][16] |
| MER / break-even MER | Total revenue ÷ total marketing spend; break-even MER = 1 ÷ contribution margin % | MER is blended ROAS, nothing double-counted; 30% CM → 3.3x, 40% CM → 2.5x [43] |

### B. Retention, churn and cohorts

| Metric | Formula | Notes |
|---|---|---|
| Logo (customer) churn / retention | Customers lost in period ÷ customers at start; retention = 1 − churn | "World-class" annual logo retention > 90% (`S01`) [2] |
| Gross revenue retention (GRR) | (Starting ARR − churned ARR − contraction ARR) ÷ starting ARR | Caps at 100%; the honest base [15][21] |
| Net revenue retention (NRR/NDR) | (Starting ARR − churn − contraction + expansion) ÷ starting ARR | ICONIQ: 1 + (expansion ARR − gross churn ARR) ÷ average(BOP, EOP ARR) [16] |
| Net MRR churn | (Churned MRR − expansion MRR) ÷ starting MRR | Negative = expansion exceeds losses [2] |
| SaaS quick ratio | (New MRR + expansion MRR) ÷ (churned MRR + contraction MRR) | Mamoon Hamid, Social Capital; > 4 was his investable bar [8][9] |
| Cohort retention (period n) | Cohort members active in period n ÷ cohort size at period 0 | Revenue version: cohort revenue in n ÷ cohort revenue in 0 (can exceed 100%). PMF = the curve flattens [32][22] |
| GMV retention (marketplace) | Retained cohort GMV ÷ initial cohort GMV × 100 | a16z; supply side typically higher than demand [35] |
| Repeat purchase rate (DTC) | Customers with ≥ 2 orders ÷ total customers in period | 10-55% by category [41] |
| 60-day repeat rate (DTC) | Cohort customers placing a 2nd order within 60 days ÷ cohort size | Fastest leading indicator of DTC LTV [40] |

### C. Growth, efficiency, burn and runway

| Metric | Formula | Notes |
|---|---|---|
| ARR | MRR × 12, contracted recurring revenue only | Exclude one-off services and unconverted pilots [22] |
| Net new ARR | New + expansion − churned − contraction ARR | Numerator of most efficiency metrics |
| YoY ARR growth | (EOP ARR − prior-year EOP ARR) ÷ prior-year EOP ARR | ICONIQ Enterprise Five #1 [16] |
| Gross burn / net burn | Total cash operating outflows per month; net burn = cash out − cash in | Net burn is the one runway uses [4] |
| Runway (months) | Cash on hand ÷ 3-month average monthly net burn | [46] |
| Default alive / dead | Does projected revenue at current growth cover costs before cash runs out? | Paul Graham's test (2015 classic) |
| Burn multiple | Net burn ÷ net new ARR, same period | David Sacks, 2020 [4] |
| Bessemer efficiency score | Net new ARR ÷ net burn | Inverse of burn multiple; < 0.5x good, 0.5-1.5x better, 1.5x+ best [14] |
| Magic number | (Current-quarter revenue − prior-quarter revenue) × 4 ÷ prior-quarter S&M spend | Scale Venture Partners; < 0.75 inefficient, 0.75-1.0 moderate, > 1.0 efficient [7] |
| Net magic number | Current-quarter net new ARR ÷ prior-quarter S&M opex | Enterprise Five #4; top quartile > 1.0x. Gross variant uses gross new ARR [16][7] |
| Rule of 40 | Revenue growth % + profitability margin % ≥ 40 | Margin = FCF (ICONIQ), EBITDA or operating — always state which [16][5][6] |
| ARR per FTE | EOP ARR ÷ EOP full-time employees | Enterprise Five #5; Benchmarkit median $175K [16][15] |
| Contribution margin (unit) | Price − variable cost per unit | `B-breakeven.md` definition, applied per customer |
| Gross margin | (Revenue − COGS) ÷ revenue | Software COGS = hosting, support, third-party APIs, **inference** [27] |

### D. Business-model-specific metrics

| Model | Metric | Formula | Notes |
|---|---|---|---|
| Marketplace | GMV | Total sales value transacted in period | Size, not value; vanity alone [34][37] |
| Marketplace | Take rate | Net revenue ÷ GMV | Rises with work performed (layer cake) [36] |
| Marketplace | Liquidity (demand) | Transactions ÷ intent sessions | aka fill rate / search-to-fill [33][39] |
| Marketplace | Liquidity (supply) | Listings transacted ÷ total active listings | aka utilisation rate; pair with median time to match [39][34] |
| Marketplace | Concentration | % of GMV from top X buyers or sellers | Fragmented is healthier [34] |
| DTC | AOV / UPT | Revenue ÷ orders; units ÷ orders | AOV ~$35-$200+; UPT 1.5-2.3 [42][40] |
| DTC | CM1 / CM2 / CM3 | Revenue − COGS; CM1 − fulfilment, shipping, payment fees, returns; CM2 − marketing | CM3 is the fully-loaded unit margin and the real number [40] |
| DTC | True ROAS | Revenue adjusted for returns, cancellations, discounts, COGS ÷ ad spend | Platform ROAS over-states by 20-40% [40] |
| Services | Billable utilisation | Billable hours ÷ available hours | SPI target > 70% [44] |
| Services | Project (gross) margin | (Project revenue − delivery cost) ÷ project revenue | SPI target > 35% [44] |
| Services | Effective hourly rate | Project revenue ÷ total hours worked (billable + unbilled) | Exposes scope creep and leakage [45] |
| AI-native | Inference cost per request | Total inference spend ÷ requests served | Belongs in COGS, not R&D [27][25] |
| AI-native | Inference efficiency ratio | Revenue ÷ inference cost (or inference as % of revenue) | ~23% of revenue at scaling-stage AI B2B [27][28] |
| AI-native | Cost per successful outcome | Total variable AI cost ÷ successful outcomes delivered | The unit for outcome-based pricing [30] |
| AI-native | Gross-margin trend | Gross margin this quarter − last quarter | CRV: direction beats level [22] |

### E. Named frameworks

| Framework | Author / year | What it says | Use when |
|---|---|---|---|
| SaaS Metrics 2.0 | David Skok, Matrix Partners (2010, upd. 2016) | LTV:CAC > 3 and CAC recovered in < 12 months (best 5-7) are the two viability tests [1][2] | Any subscription business, from the first paying customer |
| Dangerous seduction of LTV | Bill Gurley, Benchmark (2012) | LTV variables are interdependent; you need an advantage independent of marketing spend [3] | Sanity-checking any LTV-driven plan |
| Burn multiple | David Sacks, Craft (2020) | < 1 amazing, 1-1.5 great, 1.5-2 good, 2-3 suspect, > 3 bad; ~3x seed, ~2x Series A [4][22] | Board reporting; every raise from Series A |
| Rule of 40 / magic number | Feld & Wilson (2015); Scale Venture Partners | Growth % + margin % ≥ 40, from ~$25-50M ARR [5][6][16]; magic number > 1.0 = fund the sales engine [7] | Deciding to trade growth for margin, or to add S&M spend |
| T2D3 / T3D3 | Neeraj Agrawal, Battery (2015; update 2026) | Triple, triple, double, double, double from $1-2M → $100M ARR in 5-6 years [10][11][12] | Setting a top-quartile trajectory — aspiration, not plan |
| ICONIQ Enterprise Five | ICONIQ Growth (2025, 100+ companies) | YoY ARR growth, NDR, Rule of 40, net magic number, ARR per FTE [16] | Choosing the five numbers for a board deck |
| Hierarchy of marketplaces + GMV retention + take-rate layer cake | Sarah Tavel, Benchmark (2017-20); Olivia Moore, a16z (2022); Solomon & Yuan, Tidemark | Focus → minimum viable happiness → happy GMV → tipping the market [37][38]; cohort GMV retention per side, best-in-class supply > 100% by m12 [35]; take rate rises with how much of search-to-settle / lead-to-cash you perform [36] | Any marketplace or multi-vendor storefront |
| Law of shitty clickthroughs | Andrew Chen, a16z (2012; restated 2025) | All channels decay; CAC rises structurally [51][52] | Building any CAC forecast; pair with the CM1/CM2/CM3 ladder for DTC [40] |

### What investors look at, by stage (2026)

| Stage | What is actually diligenced | Source |
|---|---|---|
| Pre-seed / seed | Team, market, product. Quantitatively: cohort retention curves that *flatten*, engagement depth (B2B: WAU + feature adoption; B2C: DAU/WAU trend), a few unaffiliated paying customers, organic referral, waitlist/LOI conversion | [22] |
| Series A (software) | Clean recurring revenue first — $2.5M median in 2025 (up ~75% on 2021), competitive $2-5M+; NRR ≥ ~100%; GRR high-80s to low-90s; burn multiple < 2.0x; CAC payback ~20 months typical; LTV:CAC ≥ 3 | [22][23] |
| Series A (AI-native) | ARR bar ~$3.5M (≈3.5x the ~$1M bar three years earlier), 120%+ NRR, gross margin trending above 60%, pilot-to-production conversion, revenue per employee | [24] |
| Series B+ | Rule of 40 (from ~$25M ARR), net magic number > 1.0, ARR per FTE, NDR, burn multiple trending down | [16][15] |
| Growth / pre-IPO | Rule of 40, FCF margin, GRR, cohort payback, multiple context (Cloud 100 average 20x ARR in 2025; AI 24x vs non-AI 19x; public cloud ~8x) | [13] |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| Median growth rate | 22% (from 25% in 2024); bootstrapped 20% vs equity-backed 25%; 7.3% flat or negative | 1,000+ private B2B SaaS | [19] | 2026 |
| Rule of 40 / CAC ratio / gross margin | median Rule of 40 25% (from 15%), largest 1-year gain in 5 years; $1.30 of S&M per $1 of new ARR; 80% median software GM, stable 4 years | private B2B SaaS, CY22-CY25 | [15] | 2026 |
| GRR / NRR | GRR 88% → 84% median (top quartile 95% → 91%); NRR usage-based 108% vs seat-based 98% | same | [15] | 2026 |
| Expansion share / ARR per employee / R&D | expansion 40% of net new ARR (44% in low-growth cohort); ARR/FTE $175K median (+17% YoY, 3.2x P75:P25 spread); R&D 27% of revenue (−8 pts), top quartile 22% | same | [15] | 2026 |
| Median opex split | S&M 23% (15 sales + 8 marketing), R&D 22%, G&A 15%; at $3-5M ARR S&M 20%, R&D 24%, G&A 15% | 1,000+ private B2B SaaS, Mar 2026 | [20] | 2026 |
| NRR, larger private / public | 109% at $100M+ ARR private; ~109% public, trending down | ICONIQ Analytics + public data | [18] | 2026 |
| Burn multiple bands / CAC payback | < 1.0x amazing, 1.0-1.5 great, 1.5-2.0 good, 2.0-3.0 suspect, > 3.0 bad (~3x seed, ~2x Series A); CAC payback ~20 months typical at Series A vs historic 12-14 | Sacks; CRV expects < 2.0x at A | [4][22] | 2020/2026 |
| Series A ARR bar | $2.5M median (2025), competitive $2-5M+; AI-native ~$3.5M with 120%+ NRR and GM > 60% | CRV; Value Add VC | [22][23][24] | 2026 |
| Cloud 100: time to $100M / growth / multiple | 7.5 years average (5.7 for AI); 75% average YoY growth (from 55% in 2023); 20x ARR average, AI 24x vs non-AI 19x, public cloud ~8x | Bessemer Cloud 100 (100 private cos) | [13] | 2025 |
| AI-native gross margin / inference | 50-60% vs SaaS 70-85%; trajectory 45% (2025) → ~53% (2026) → ~59% (2027) projected; inference ~23% of revenue at scaling stage | a16z framing; AI COGS analysis | [26][27] | 2026 |
| AI gross-margin *target* / pricing mix | median target 50%, only 12% target 80%+; hybrid 37%, flat-fee 28%, seat 18%, usage 11%, outcome 6% | 230 software companies, Apr-May 2026 | [30] | 2026 |
| Time to $1M / $5M ARR | AI ~11.5 months to $1M; 24 months to $5M vs SaaS 37 | Stripe, top 100 AI cos | [29] | 2026 |
| Median runway / burn / round gap | seed ~10.8 mo, A 14.6, B 19.4; burn ~$87K/mo seed, ~$380K/mo A; ~696 days between rounds | secondary summary of Carta data | [46][47] | 2025-26 |
| Monthly churn, GOOD / GREAT | B2C SaaS 3-5% / < 2%; B2B SMB-MM 2.5-5% / < 1.5%; enterprise 1-2% / < 0.5% | 13,000 anonymised SaaS cos (ProfitWell) | [31] | 2022 |
| Marketplace GMV retention | demand m1 66%, m3 57%, m6 50%, m12 30%; supply m1-m3 80-95%, m12 45-50% (best-in-class 100%+) | a16z marketplace dataset | [35] | 2022 |
| Marketplace fill rate / take rate | fill < 5% (broad search) to > 80% (bottom-funnel); take 10-30% for match + transaction services, < 1% document/payment processing, ~20bps card networks | Lenny's panel; Tidemark | [33][36] | 2022/— |
| DTC contribution margin / MER | median CM 35% (2021) → 22% (2025); break-even MER = 1 ÷ CM% (30% CM → 3.3x, 40% → 2.5x), brands target 3-5x | DTC benchmark aggregation; DTC finance practice | [40][43] | 2026 |
| DTC repeat rate / AOV / returns | repeat 25-30% average (consumables 30-45%, beauty 25-40%, apparel 20-32%, home/durables < 18%), 60-day repeat strong 20-35%; AOV ~$35 (food) to $200+ (furniture); returns apparel 20-35%, consumables 2-6% | same | [41][40][42] | 2026 |
| Professional services | utilisation 66.4% (lowest in SPI history, target > 70%); project margin 37.7% (target > 35%); EBITDA 9.9% vs 13.8% 5-yr avg; revenue/consultant ~$210K | SPI, 509 orgs, $63B PS revenue | [44][45] | 2026 |
| African startup capital lost / round size | > $500M across 30+ startups (early 2024 - mid 2026); average round Nigeria ~$1.6M vs Kenya ~$6.9M | Launch Base Africa; ecosystem comparison | [48][50] | 2026 |

## Decision rules & rules of thumb
- **If CAC payback exceeds 12 months, fix pricing or CAC before adding S&M spend** (Skok; best
  recover in 5-7) [1]. The ~20-month Series A tolerance is a market fact, not a target [22].
- **If LTV:CAC < 3, do not scale acquisition**; above 5-6 with payback under 6 months you are probably
  under-investing in growth [1]. **Never quote the ratio without gross margin and the churn window** —
  an LTV assuming a 5-year life for a 2-year-old company is fiction [3][2].
- **If burn multiple > 3, treat it as a company-wide alarm**, not a finance issue [4]; under 1.5 with
  growing net new ARR, raising is optional. Series A expects < 2.0x [4][22].
- **If magic number < 0.75, stop hiring sellers**; 0.75-1.0 hold; above 1.0 fund more S&M [7].
  **If runway is under 12 months you are already fundraising** — with ~24 months between rounds, plan
  24 months of cash or a credible default-alive path [46][47].
- **Apply Rule of 40 only from ~$25-50M ARR** — below that the sum is meaningless; use burn multiple
  and CAC payback instead, and always state which margin you used [5][6][16].
- **If NRR > 100% but GRR < 85%, you have a churn problem masked by upsell** [15][21] (see `S01`).
  **If the retention curve has not flattened, you do not have PMF** — no CAC optimisation will save
  you, and seed investors look at the curve before the revenue [22][32].
- **For marketplaces, ignore GMV growth until liquidity improves** — rising GMV with falling fill rate
  or supply utilisation means you are buying transactions [33][37][39].
- **For DTC, manage CM3 by channel weekly**; if blended MER falls below 1 ÷ contribution margin, the
  ad engine loses money whatever platform ROAS says [43][40]. **For services**, fix delivery before
  selling more if utilisation < ~70% or project margin < ~35% [44].
- **For AI products, inference above ~25% of revenue is a pricing problem, not a cost problem** —
  reprice to usage or outcome, or route to cheaper models [27][30].
- **Model CAC as rising 10-30% a year** beyond 12 months; a 30% CAC rise plus a 30% LTV fall can
  double time-to-profitability [51].

## Process / steps
1. **Pick the model** — subscription, marketplace, e-commerce, services or AI-native; the metric set
   in section D follows from that, not from taste. **Define the revenue unit**: what counts as
   recurring, excluding one-off services and unconverted pilots [22].
2. **Instrument the customer, not the invoice** — give every customer a cohort (month of first
   payment), a channel, a segment and a gross margin.
3. **Compute the base five monthly:** net new ARR (or net revenue), gross margin, net burn, runway,
   and one retention number (GRR for B2B, cohort retention for consumer/marketplace).
4. **Add the efficiency layer quarterly:** CAC, CAC payback, burn multiple, magic number, NRR,
   ARR per FTE; from $25M ARR add Rule of 40 [16][15].
5. **Build the cohort table** — rows = acquisition month, columns = months since, cells = retained
   customers, retained revenue and cumulative contribution margin; read down the columns to see
   whether newer cohorts are better [32][35]. **Find the payback line** where cumulative contribution
   margin crosses CAC — that is your real payback, not the formula estimate.
6. **Decompose growth** into new, expansion, contraction and churn each period; this makes quick ratio
   and NRR diagnosable rather than decorative [8][2]. Then **stress-test** with CAC +30%, churn +50%
   and (for AI) flat rather than falling inference cost — a plan that only works on the base case is
   not a plan [51].
7. **Set the board pack** — five metrics on page one (Enterprise Five is a good default), cohort table
   on page two, cash and runway on page three [16]. Reconcile everything to the P&L and cash-flow
   statement in `A-financial-statements.md`; ARR that does not tie to billings is a flag.
8. **Re-benchmark twice a year** — Benchmarkit, SaaS Capital, ICONIQ and Bessemer publish annually and
   the medians have moved every year since 2022 [15][19][16][13].

## Worksheets, checklists & questions
**Unit-economics one-pager** — What does one customer cost to acquire (blended and paid), and what
gross margin do they carry? How many months until they repay that cost in gross profit? What lifetime
assumption are we using and what cohort evidence supports it? What happens if CAC rises 30%? [2][3][51]

**Cohort review (monthly)** — Is the curve flattening, and at what level? Are newer cohorts better than
older ones at the same age? What share of this month's revenue came from cohorts older than 12 months?
Which channel produces the best month-12 cohort value — not the best day-1 CAC? [32][22]

**Cash & runway review** — Net burn (3-month average), cash, runway. Burn multiple this quarter and the
previous three — trend, not level. Are we default alive; if not, what is the smallest change that makes
us so? If the next round takes 24 months, what must be true? [4][46]

**Investor-readiness checklist** [22][23][24] — Seed: flattening retention curve; ≥ 5 unaffiliated
paying customers; engagement depth; organic pull. Series A: $2-5M clean recurring ARR; NRR ≥ 100%;
GRR high-80s+; burn multiple < 2.0x; documented CAC payback; cohort table. Series A (AI): ~$3.5M ARR;
120%+ NRR; gross margin above 60% and *rising*; falling inference cost per request; pilot-to-production
conversion. Series B+: Rule of 40, net magic number > 1.0, ARR per FTE, GRR, burn-multiple trend.

**Model-specific quick checks** — Marketplace: fill rate, supply utilisation, time to match, GMV
retention by side, top-10 concentration, take rate vs work performed [33][34][35][36]. DTC: AOV, UPT,
CM1/CM2/CM3, 60-day repeat rate, blended MER vs break-even MER, return rate [40][43]. Services:
utilisation, project margin, effective hourly rate, revenue per consultant, leakage [44][45].
AI-native: inference cost per request and as % of revenue, margin trend, cost per successful outcome,
share of revenue on usage/outcome pricing [27][28][30].

## Regional notes
- **US** — every panel above (Benchmarkit, SaaS Capital, ICONIQ, Bessemer, CRV, Carta) is US-weighted.
  The $2-5M Series A ARR bar and ~20-month CAC payback are US SaaS norms, not global ones [22][15][19].
- **UK / EU** — no equivalent large open benchmark panel was found in this research; UK and EU founders
  are generally measured against the same US datasets, which flatters US-scale ACVs. Re-derive CAC
  payback in local currency and treat growth medians as directional (unverified).
- **Africa / Nigeria** — the binding constraints are FX and gross margin, not growth. Devaluation and
  25-30% inflation compress dollar returns while fuel, parts and software licences stay dollar-linked
  [49]. Launch Base Africa's post-mortem of 30+ collapses (> $500M lost, early 2024 - mid 2026) names a
  "full-stack cost trap" (warehousing, fleets, generators) incompatible with currency volatility,
  under-capitalised fintech ($1-2M seed rounds against $500-800K/year compliance baselines), and a
  willingness-to-pay chasm in discretionary categories; one venture was profitable per order (₦43,700
  basket) yet failed on volume [48]. So: report in both naira and USD, be contribution-margin positive
  per unit early, measure runway in hard currency, and expect less margin for error — average Nigerian
  round ~$1.6M vs Kenya ~$6.9M [50].
- **India / Southeast Asia / LatAm / Middle East** — not researched in this pass; assume lower ACVs,
  lower absolute CAC and longer payback locally, and re-benchmark rather than importing US medians
  (unverified).

## AI-era notes
- **Inference is COGS, and it changes the shape of the business.** AI-native gross margins sit at
  50-60% vs 70-85% for SaaS [26], with inference ~23% of revenue at scaling-stage AI B2B firms [27].
  An LTV built on an 80% margin assumption is simply wrong for an AI product.
- **Margins are improving, and the trend is the metric** — 45% (2025) → ~53% (2026) → ~59% (2027)
  projected, credited to model routing, prompt caching (~90% API discounts), batching and context
  compression, together cutting inference cost 50-70% with no measurable quality loss [27]. CRV:
  "the direction of the margin line is more informative than its current level" [22][25].
- **AI companies hit milestones far faster** — Stripe's top-100 AI cohort reached $1M ARR in a median
  ~11.5 months and $5M in 24 months against 37 for SaaS [29]. That compresses the stage gates and
  raises the bar.
- **Pricing moved from access to work performed.** Hybrid is the plurality model (37%), outcome-based
  6% and rising, a third plan AI credits within 6-12 months [30]; seat-based NRR (98%) looks weak
  beside usage-based (108%) [15]. New metrics follow: cost per successful outcome, credit burn-down,
  consumption cohort retention. And **"ARR" needs a quality footnote** — investors separate recurring
  from pilot revenue and add pilot-to-production conversion [22].
- **Dashboards: AI features are table stakes.** ChartMogul, Baremetrics and ProfitWell cover
  subscription analytics, Mosaic and Drivetrain sit on top as FP&A, and most $5M+ ARR companies run
  both; building your own re-creates revenue-recognition edge cases vendors already solved [53][54].
- **Where hype outruns evidence:** claims that AI collapses CAC. Chen's 2025 position is the opposite —
  channels saturate faster because AI made content and outbound cheap for everyone [52], consistent
  with `S01`'s cold-email decline. No independent 2024-26 dataset found showing AI lowering blended
  CAC at company level.

## The minds

| Person | Affiliation | Key contribution | Where to read |
|---|---|---|---|
| David Skok | Matrix Partners; forEntrepreneurs | The canonical SaaS metric definitions: LTV, CAC, LTV:CAC > 3, CAC payback < 12 months | *SaaS Metrics 2.0* + definitions companion (2010, upd. 2016) [1][2] |
| David Sacks | Craft Ventures; ex-PayPal, Yammer | Burn multiple as the catch-all efficiency metric | *The Burn Multiple*, Bottom Up (Apr 2020) [4] |
| Bill Gurley | Benchmark | The definitive critique of LTV-driven strategy | *The Dangerous Seduction of the LTV Formula* (2012) [3] |
| Sarah Tavel | Benchmark | Hierarchy of marketplaces; "happy GMV"; minimum viable happiness | Medium essays, Levels 1-3 [37][38] |
| Andrew Chen | a16z | Law of shitty clickthroughs; the 13 marketplace metrics; 2025 restatement | andrewchen.com; Substack (2025); a16z [51][52][34] |
| Lenny Rachitsky | Lenny's Newsletter | Crowd-sourced retention, churn and marketplace benchmarks | Monthly-churn and marketplace-metrics issues (2022) [31][33] |
| Casey Winters | ex-Pinterest, Grubhub | Retention as the measure of PMF; benchmark study with Lenny | *What Is Good Retention* (2020) [32] |
| Kyle Poyar | Growth Unhinged; ex-OpenView | Annual monetisation surveys; seats → hybrid/outcome pricing | *State of B2B SaaS and AI Monetization 2026* (230 cos) [30] |
| Neeraj Agrawal | Battery Ventures | T2D3 growth trajectory to $100M ARR | Battery blog (2015; 2026 update) [10][11] |
| Mamoon Hamid; Fred Wilson & Brad Feld | Social Capital / Kleiner Perkins; USV / Foundry | SaaS quick ratio; popularised the Rule of 40 | Quick-ratio explainers [8][9]; *The 40% Rule*, AVC (Feb 2015) [5][6] |
| Olivia Moore; Dave Yuan & Bob Solomon | a16z; Tidemark | GMV retention as the missing marketplace metric; the take-rate "layer cake" | a16z (2022) [35]; Tidemark Vertical SaaS Knowledge Project [36] |
| ICONIQ / Benchmarkit / SaaS Capital research teams | ICONIQ Growth; Benchmarkit; SaaS Capital | The three annual private-company metric panels: Enterprise Five, AI-native metrics, 15 years of growth/spending/retention surveys | [16][17][15][19][20] |

## Pitfalls
- **Reporting LTV:CAC without gross margin or a defensible churn window** — the commonest way an early
  deck overstates unit economics by 2-3x [3][2]; and using LTV at all before the curve flattens [32].
- **Applying Rule of 40 at $2M ARR** — designed for scale, it rewards slowing down when a young company
  should invest [5][16]. **Blending self-serve and enterprise into one CAC**, and **treating churn as
  one number** — split by segment and channel; separate voluntary from involuntary, logo from revenue [31].
- **Celebrating NRR while GRR erodes** — the sector-wide version of this mistake [15][21]. **Marketplace
  GMV theatre** — subsidised transactions inflate GMV while liquidity and cohort GMV retention fall
  [37][35]. **DTC platform-ROAS optimisation** over-spends on paid by 20-40% [40]. **Services firms
  selling into a delivery bottleneck** — at 66.4% utilisation, more sold work often lowers margin [44].
- **AI plans that assume SaaS margins** — only 12% of surveyed companies even target 80%+ [30]; and
  **calling a pilot ARR**, which investors now test explicitly [22].
- **Raising on a 12-month runway** when the median gap between rounds is near 24 [46][47], or
  **benchmarking against 2021 medians** — growth, payback and GRR have all moved [15][19].

## Key terms
`CAC` — sales & marketing cost to acquire one new customer; `blended CAC` includes organic [2][40].
`CAC payback` — months of gross profit needed to repay CAC [2]. `CAC ratio` — S&M per $1 of new ARR [15].
`LTV` — gross-profit value of a customer over their expected life [2].
`contribution margin (CM1/CM2/CM3)` — margin after COGS / after variable fulfilment / after marketing [40].
`GRR` / `NRR (NDR)` — gross revenue retention (caps at 100%) / net revenue retention including expansion [15][16].
`SaaS quick ratio` — (new + expansion MRR) ÷ (churned + contraction MRR) [8][9].
`cohort` — customers grouped by acquisition period and tracked over time; `retention curve flattening` is the PMF signal [32][22].
`net burn` — cash out minus cash in per month; `runway` — cash ÷ net burn, in months [4][46].
`burn multiple` — net burn ÷ net new ARR [4]; `efficiency score` — Bessemer's inverse [14].
`magic number` — annualised incremental revenue ÷ prior-quarter S&M [7]; `net magic number` uses net new ARR [16].
`Rule of 40` — growth % + margin % ≥ 40 [5][6]; `T2D3` — triple, triple, double, double, double [10]; `ARR per FTE` — end-of-period ARR ÷ headcount [16].
`GMV` — value transacted through a marketplace [34]; `take rate` — net revenue ÷ GMV [36]; `GMV retention` — cohort GMV retained over time, per side [35].
`liquidity` — probability a listing sells or a search converts; `fill rate / search-to-fill` is its demand-side form [33][39].
`AOV / UPT` — average order value / units per transaction [40][42]; `MER` — revenue ÷ marketing spend, `break-even MER` = 1 ÷ contribution margin % [43].
`billable utilisation` — billable hours ÷ available hours [44]; `inference efficiency ratio` — revenue relative to inference cost [28].
`cost per successful outcome` — variable AI cost ÷ outcomes delivered; the unit of outcome pricing [30].
`default alive` — projected to reach profitability on current cash and growth (Paul Graham, 2015).

## Build ideas for the app
- **Unit-economics calculator** — CAC, ARPA, gross margin, monthly churn, expansion → LTV (three
  variants), LTV:CAC, CAC payback and a verdict against Skok's two rules, with assumptions printed
  alongside → stops founders quoting an unsupported ratio [1][2][3].
- **Cohort table builder** — customers with first-payment month, revenue by month, gross margin →
  retention curve, cohort revenue retention, cumulative contribution margin vs CAC and the real payback
  month; flags whether the curve has flattened → the seed-stage PMF evidence [32][22][35].
- **Runway & burn-multiple monitor** — cash, monthly in/out, net new ARR → runway, 3-month average
  burn, burn multiple with Sacks' bands, default-alive verdict and a "raise by" date from a 24-month
  round gap [4][46].
- **Metric picker + benchmark card** — pick SaaS / marketplace / e-commerce / services / AI-native →
  the 5-8 metrics that matter with formulas, then position any entered value against the 2024-26
  medians and quartiles with source and year shown [34][40][44][27][15][19][16][13].
- **Investor-readiness scorecard** — stage + current metrics → gap analysis against the 2026 bar (ARR,
  NRR, GRR, burn multiple, CAC payback, margin trend), red/amber/green per line [22][23][24].
- **AI margin analyser** — revenue, token/API spend, requests, model mix → gross margin, inference as %
  of revenue, cost per request, margin trend, routing/caching/batching levers ranked [27][28][25].
- **DTC contribution-margin dashboard** — orders, AOV, COGS, shipping, fees, returns, ad spend by channel
  → CM1/CM2/CM3, blended CAC, MER vs break-even MER, 60-day repeat rate [40][43][55].

## Sources
[1] SaaS Metrics 2.0 — A Guide to Measuring and Improving what Matters — David Skok, forEntrepreneurs — 2010, upd. 2016 — https://www.forentrepreneurs.com/saas-metrics-2/
[2] SaaS Metrics 2.0 — Detailed Definitions — David Skok, forEntrepreneurs — https://www.forentrepreneurs.com/saas-metrics-2-definitions/
[3] The Dangerous Seduction of the Lifetime Value (LTV) Formula — Bill Gurley, Above the Crowd — 4 Sep 2012 — https://abovethecrowd.com/2012/09/04/the-dangerous-seduction-of-the-lifetime-value-ltv-formula/
[4] The Burn Multiple — David Sacks, Bottom Up — 23 Apr 2020 — https://sacks.substack.com/p/the-burn-multiple-51a7e43cb200
[5] The 40% Rule — Fred Wilson, AVC — Feb 2015 — https://avc.com/2015/02/the-40-rule/
[6] Rule of 40 (origin: Feld & Wilson, 2015) — Wikipedia — https://en.wikipedia.org/wiki/Rule_of_40
[7] SaaS Magic Number — Formula + Calculator — Wall Street Prep — https://www.wallstreetprep.com/knowledge/saas-magic-number/
[8] SaaS Quick Ratio — Formula + Calculator — Wall Street Prep — https://www.wallstreetprep.com/knowledge/saas-quick-ratio/
[9] What is SaaS Quick Ratio (Mamoon Hamid, Social Capital) — Chargebee Glossaries — https://www.chargebee.com/resources/glossaries/what-is-saas-quick-ratio/
[10] Helping Entrepreneurs "Triple, Triple, Double, Double, Double" to a Billion-Dollar Company — Neeraj Agrawal, Battery Ventures — 2015 — https://www.battery.com/blog/helping-entrepreneurs-triple-triple-double-double-double-to-a-billion-dollar-company/
[11] T2D3 Software Update: Embracing the Founder to CEO (F2C) Journey — Battery Ventures — https://www.battery.com/blog/t2d3-software-update-embracing-the-founder-to-ceo-f2c-journey/
[12] Is It Now "Triple, Triple, Triple, Double, Double, Double" — T3D3 — For Top Tier SaaS Startups? — SaaStr — https://www.saastr.com/is-it-now-triple-triple-triple-double-double-double-t3d3-for-top-tier-saas-startups-probably/
[13] The Cloud 100 Benchmarks Report 2025 — Bessemer Venture Partners — 3 Sep 2025 — https://www.bvp.com/atlas/the-cloud-100-benchmarks-report
[14] Bessemer's 2026 State of the Cloud Report, Decoded — Capitaly (secondary) — https://www.capitaly.vc/blog/bessemer-2026-state-of-cloud-report-decoded
[15] 2026 SaaS & AI-Native Metrics — Benchmarkit — 2026 — https://www.benchmarkit.ai/2026-saas-ai-native-metrics
[16] The ICONIQ Enterprise Five — ICONIQ Growth (100+ enterprise software businesses) — 2025 — https://www.iconiq.com/growth/reports/the-iconiq-enterprise-five
[17] 2026 State of AI Report: The Builder's Economy — ICONIQ Growth — 2026 — https://www.iconiq.com/growth/reports/state-of-ai-2026
[18] 2026 State of GTM — Benchmarks & Data — OnlyCFO (using ICONIQ Analytics + public data) — 2026 — https://www.onlycfo.io/p/2026-state-of-gtm-gtm-benchmarks
[19] 2026 Private B2B SaaS Company Growth Rate Benchmarks — SaaS Capital (15th annual survey, 1,000+ companies) — 2026 — https://www.saas-capital.com/research/private-saas-company-growth-rate-benchmarks/
[20] 2026 Spending Benchmarks for Private B2B SaaS Companies — SaaS Capital — Mar 2026 — https://www.saas-capital.com/blog-posts/spending-benchmarks-for-private-b2b-saas-companies/
[21] What is a Good Retention Rate for a Private SaaS Company? — SaaS Capital — https://www.saas-capital.com/blog-posts/what-is-a-good-retention-rate-for-a-private-saas-company/
[22] Startup KPIs VCs Track at Seed & Series A in 2026 — CRV — 16 Jul 2026 — https://www.crv.com/content/key-performance-indicators
[23] Series A Metrics VCs Expect in 2026 — CRV — https://www.crv.com/content/series-a-metrics-vcs-expect
[24] Series A AI Startup Requirements 2026: $3.5M ARR, 120% NRR, 60%+ Gross Margin — Value Add VC — 2026 — https://valueaddvc.com/blog/what-series-a-investors-are-looking-for-in-ai-startups-in-2026
[25] The True Cost of Running an AI Product in 2026: GPU, API and Inference Bills — Value Add VC — 2026 — https://valueaddvc.com/blog/the-true-cost-of-running-an-ai-product-in-2026-gpu-api-and-inference-bills
[26] AI Startup Gross Margins Run 50 to 60 Percent, Not the SaaS 80 Percent — Avante Ventures (restating a16z's 2020 "The New Business of AI") — 2026 — https://avanteventures.com/en/library/ai-startup-gross-margin-benchmark-2026
[27] The AI COGS Problem: SaaS Gross Margin Compression 2026 — SaaS Mag — 2026 — https://www.saasmag.com/ai-cogs-saas-gross-margin-compression/
[28] How to Calculate the Inference Efficiency Ratio — The SaaS CFO — https://www.thesaascfo.com/how-to-calculate-the-inference-efficiency-ratio/
[29] Indexing the AI economy — Stripe (top 100 AI companies on Stripe) — https://stripe.com/guides/indexing-the-ai-economy
[30] The 2026 State of B2B SaaS and AI Monetization Report — Kyle Poyar, Growth Unhinged (230 companies, Apr-May 2026) — https://www.growthunhinged.com/p/the-state-of-b2b-monetization-in-2026
[31] What is good monthly churn — Lenny Rachitsky with ProfitWell (13,000 companies) — 8 Feb 2022 — https://www.lennysnewsletter.com/p/monthly-churn-benchmarks
[32] What Is Good Retention: An Exhaustive Benchmark Study — Casey Winters & Lenny Rachitsky — 6 Jul 2020 — https://www.caseyaccidental.com/p/what-is-good-retention-an-exhaustive-benchmark-study-with-lenny-rachitsky
[33] The most important marketplace metrics to track — Lenny Rachitsky (10 marketplace operators/investors) — 29 Mar 2022 — https://www.lennysnewsletter.com/p/the-most-important-marketplace-metrics
[34] 13 Metrics for Marketplace Companies — Jeff Jordan, Li Jin, D'Arcy Coolican, Andrew Chen, a16z — 21 Feb 2020 — https://a16z.com/13-metrics-for-marketplace-companies/
[35] GMV Retention: The Marketplace Metric Most Ignore — Olivia Moore, a16z — 28 Apr 2022 — https://a16z.com/gmv-retention-the-marketplace-metric-most-ignore/
[36] Marketplace Take Rates — Bob Solomon & Dave Yuan, Tidemark Vertical SaaS Knowledge Project — https://www.tidemarkcap.com/vskp-chapter/marketplace-take-rates
[37] The Hierarchy of Marketplaces — Introduction and Level 1 — Sarah Tavel — https://sarahtavel.medium.com/the-hierarchy-of-marketplaces-introduction-and-level-1-983995aa218e
[38] Hierarchy of Marketplaces — Level 3 — Sarah Tavel — https://sarahtavel.medium.com/hierarchy-of-marketplaces-level-3-1d1a5772ea08
[39] What is marketplace liquidity — everything you need to know — Dittofi — 2025 — https://www.dittofi.com/learn/what-is-marketplace-liquidity
[40] D2C Metrics 2026: CAC, LTV, ROAS & Contribution Margin — Fairview (citing Common Thread Collective, Shopify Plus, Klaviyo, Northbeam 2025 reports) — 2026 — https://getfairview.com/d2c-metrics
[41] Repeat Purchase Rate Benchmarks 2026: 10-55% — Prooflytics — 2026 — https://prooflytics.io/blog/repeat-purchase-rate-benchmarks
[42] DTC Average Order Value Benchmarks by Category 2026 — MHI Growth Engine — 2026 — https://mhigrowthengine.com/blog/dtc-average-order-value-benchmarks/
[43] Blended ROAS vs breakeven MER: is your ad engine profitable? — Eightx — https://eightx.co/blog/blended-roas-vs-breakeven-mer
[44] 2026 Professional Services Maturity Benchmark (SPI Research, 509 organisations, $63B PS revenue) — Rocketlane — 2026 — https://www.rocketlane.com/blogs/professional-services-maturity-index-2026
[45] Analyzing the 2026 SPI Research Professional Services Maturity Benchmark Report — Certinia — 2026 — https://www.certinia.com/blog/analyzing-the-2026-spi-research-professional-services-maturity-benchmark-report/
[46] Startup Runway Statistics 2026: Burn Rates, Failure Rates and Survival Benchmarks — Stealth Agents (secondary, cites Carta) — 2026 — https://stealthagents.com/research/startup-runway-statistics-2026
[47] State of Private Markets: Q1 2026 — Carta — 2026 — https://carta.com/data/state-of-private-markets-q1-2026/
[48] Over $500M Lost in Two Years: Eight Graphs That Map the Blind Spots Behind Recent African Startup Collapses — Launch Base Africa — 30 Jul 2026 — https://launchbaseafrica.com/2026/07/30/over-500m-lost-in-two-years-eight-graphs-that-map-the-blind-spots-behind-recent-african-startup-collapses/
[49] Why Africa's 2026 Startup Ecosystem is Swapping Compounding Scale for Cash-Flow Realism — Index Prima — 2026 — https://indexprima.com/why-africas-2026-startup-ecosystem-is-swapping-compounding-scale-for-cash-flow-realism/
[50] Kenya vs Nigeria vs Egypt: Which Country Has the Strongest Startup Ecosystem in 2026? — Tech In Africa — 2026 — https://www.techinafrica.com/kenya-vs-nigeria-vs-egypt-strongest-startup-ecosystem-2026/
[51] The Law of Shitty Clickthroughs — Andrew Chen — https://andrewchen.com/the-law-of-shitty-clickthroughs/
[52] Every marketing channel sucks right now — Andrew Chen — 2025 — https://andrewchen.substack.com/p/every-marketing-channel-sucks-right
[53] Build vs. Buy in 2026: Should You Vibe-Code Your Own SaaS Metrics Dashboard? — Baremetrics — 2026 — https://baremetrics.com/blog/build-vs-buy-saas-analytics
[54] 8 Best SaaS Analytics Tools in 2026 (By ARR Stage) — Daymark — 2026 — https://www.usedaymark.io/blog/best-data-analysis-tools-for-saas
[55] Ecommerce Conversion Rate Benchmarks 2026: Real Data from 21 Shopify Stores — DTC Pages — 2026 — https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026
