# S01 — Sales: founder-led to first sales team (2026 layer)
Supplements: stage 6 of `00-journey-map.md` (Launch & operate — the handbook has **no chapter on
sales**), and extends `02-opportunity.md` (customer discovery becomes discovery *calls*),
`03-business-model-and-strategy.md` (pricing model → pricing *conversation*; "plan discovery
inside the model") and `10-sustaining-growth.md` (hiring to scale; never outsource the
customer-facing link). Scope: the first 10-100 customers, B2B and B2C/DTC, then the first sales
hires. Load when a user asks how to find, qualify, pitch, price, close, keep or expand customers,
or when to hire a salesperson.

## What changed since 2018
- **Founder-led sales is now the named default, not a stopgap.** Bessemer (2025), SaaStr (2024),
  Techstars (2026) and Kazanjy (2020-26) all say the founder personally closes the first 10-25
  customers before anyone is hired [9][4][46][2][47].
- **Win rates and quota attainment fell.** Ebsta × Pavilion's 655K-opportunity dataset shows
  B2B win rates dropping from 29% (2024) to 19% (2025) [20]; Bridge Group finds only 48% of AEs at
  quota (2026, from 51% in 2024) and 60% of SDRs (2025, lowest on record) [22][23].
- **"No decision" is the main competitor.** Dixon & McKenna's 2.5M-call study: 40-60% of lost
  deals end in no decision, not in a rival win [13]; Dunford builds the whole pitch around it [16].
- **Buyers self-serve first.** Gartner (survey of ~650 B2B buyers, Aug-Sep 2025): 67% prefer a
  rep-free experience and 45% used AI during a recent purchase [27][28].
- **Product-led motions matured into product-led *sales*.** Verna's segmentation: self-serve for
  1-100-employee firms, product-led sales for 101-1,000, classic sales-led above that [11].
- **Outbound got regulated by the inbox, not the law.** Google/Yahoo bulk-sender rules (Feb 2024)
  and Microsoft (May 2025) require SPF/DKIM/DMARC, one-click unsubscribe and <0.3% complaints;
  non-compliant mail is now refused outright [31][32]. Average cold-email reply fell to 3.43% [30].
- **Expansion is the growth engine.** Expansion is 52% of new revenue in Ebsta × Pavilion 2025
  [19] and 40% of new ARR in Benchmarkit 2025 [24]; 38% of AEs now own renewals [22].
- **AI entered the sales floor.** 54% of sellers have used AI agents; average seller still spends
  only 40% of time selling (Salesforce, 4,050 sellers, 2026) [29]. Effects are mixed — see AI notes.
- **The first hire moved down-market.** "Founding AE" / half-AE-half-PM profiles replaced the early
  VP Sales; a VP is justified around $1-2M ARR with two reps already hitting quota [5][7][9].

## Core ideas (current consensus)
- **Sales is consulting with a bias** — Kazanjy (GTMnow, 2026): the seller helps a buyer understand
  the problem, believe it matters, and judge fit; founders are uniquely equipped for that [2].
- **Selling *is* product development at this stage** — Walsh/Techstars (2026): a hired rep becomes a
  buffer that filters the customer signal the founder needs; lead sales yourself for 1-2 years [46].
- **Readiness is retention, not revenue** — Roberge (Stage 2 Capital, *Science of Scaling*, 2025):
  product-market fit is "true" when P% of customers hit a leading-indicator event within T time;
  scale only when it holds, and pace hires so you can stop if it breaks [7][8].
- **Narrow the ICP until it is uncomfortable** — Bessemer (2025): first 10-20 customers by cold
  outreach, at least one won from a total skeptic; ACV decides how many logos $1M ARR needs [9].
- **Discovery beats persuasion** — Ebsta × Pavilion (2025): top reps are 55% better at discovery
  and 24% more likely to decline non-ICP deals early; ICP focus lifts quota attainment 90% [20].
- **The buyer fears messing up more than missing out** — Dixon & McKenna (2022): once intent
  exists, the customer optimises for "not failing"; 73% of average reps respond by pushing harder
  on status quo and lose 84% of those deals [13].
- **A pitch is an argument about alternatives, not features** — Dunford (*Sales Pitch*, 2023): set
  up the market insight, the alternatives (including do-nothing), the "perfect world"; then your
  differentiated value with proof [15][16].
- **Usage is the pipeline** — Verna (2023-24): in product-led sales, end-user usage creates the
  pipeline; score product-qualified accounts daily and route at a threshold [11][12].
- **Free-to-paid is a design choice** — Poyar with ChartMogul/ProductLed (2026, 200 products):
  median free-to-paid is 8%, but the top and bottom quintiles differ 10x; card-required trials
  convert ~30%, more than 5x card-free [10].
- **Hire two, not one** — Lemkin (SaaStr): a single rep cannot tell you whether the person or the
  process failed; hire in pairs and only after 10+ founder-closed customers [4][5].
- **Health is GRR before NRR** — SaaS Capital and Optifai warn that NRR above 100% can mask an
  eroding gross retention base; read both [25][26].

## Frameworks & playbooks

| Framework | Author / year | What it says | Use when |
|---|---|---|---|
| Founder-led selling maturity stages | Pete Kazanjy, *Founding Sales* (2020) / GTMnow (2026) | Stage 0 hypothesis testing → Stage 1 5-10 customers from 30-50 prospects (30-50% win) → Stage 2 documented motion + first executor (15-25% win on qualified pipeline) → Stage 3 2-4 reps + leader; buyer journey = awareness, prioritisation, solution preference, agreement, championship [2][3] | Deciding what to document and whom to hire next |
| The Mom Test | Rob Fitzpatrick (2013, classic) | Talk about their life not your idea; ask about specific past behaviour, not hypotheticals; listen more than pitch [49] | Every early discovery conversation |
| SPICED | Jacco van der Kooij, Winning by Design | Situation, Pain, Impact, Critical Event, Decision — one qualification model shared by sales, CS and marketing, inside the Bowtie (pre- and post-sale funnel) [17][18] | Default discovery template for SMB/mid-market; CRM fields |
| MEDDIC / MEDDICC / MEDDPICC | Dick Dunkel & Jack Napoli (PTC, 1990s); MEDDPICC adds Paper Process | Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion (+Competition, +Paper process) [50] | Enterprise deals with procurement, legal, security |
| Challenger | Dixon & Adamson (2011, 6,000-rep study) | Teach, tailor, take control; relevant where buyers call purchases "very complex" (Gartner 2025: 77%) [50] | Category-creating or insight-led pitches |
| JOLT | Matt Dixon & Ted McKenna, *The JOLT Effect* (2022) | Judge the indecision, Offer a recommendation, Limit exploration, Take risk off the table [13][14] | Deals stalling at "I need to think about it" |
| Sales Pitch structure | April Dunford, *Sales Pitch* (2023) | Setup: market insight → alternatives (pros/cons incl. do-nothing) → perfect world. Follow-through: differentiated value → proof → objections → ask [15][16] | Building the founder's narrative; onboarding rep #1 |
| Science of Scaling | Mark Roberge, Stage 2 Capital / Wiley (2025) | PMF = "P% achieve E within T" (P 60-80%, T 1-3 months); GTM fit = LTV/CAC > 3, payback < 12 mo, magic number > 1; hire AE/PM hybrid; pay 50% on signature, 50% on retention indicator; pace 2 hires/month [7][8] | Deciding *whether* and *how fast* to add sellers |
| Product-led sales (PQA scoring) | Elena Verna (2023, 2024) | Add sales to PLG only with self-serve PMF, organic hand-raisers and deals above a ~$10K "sales floor"; score accounts on volume, velocity, breadth (+behaviour) [11][12] | SaaS with a free tier; storefront-style usage data |
| $1M ARR playbook | Bessemer Atlas (Feb 2025) | Founder cold outreach → narrow ICP → one motion (PLG, direct or channel) → one segment → playbook → avoid early VP Sales, use fractional leaders [9] | Seed-stage B2B |
| Customer advisory board → paid | Sahil Mansuri / Expa (2023) | Recruit 5-10 target customers as advisors, pilot 2 weeks-2 months, ask each for one referral, convert at a 50% early-adopter discount [48] | First 5-10 logos with no brand |
| Predictable Revenue (classic) | Aaron Ross & Marylou Tyler (2011) | Separate prospecting (SDR) from closing; "Cold Calling 2.0" via referrals and email [51]. No 2024-26 update verified here | Understanding why SDR/AE splits exist; treat volumes as dated |
| Two-rep test + 10-point hire checklist | Jason Lemkin, SaaStr (2024-25) | Close 10-20 yourself → hire 2 reps → head of sales at $1-2M ARR; hire only someone you'd buy from, who sold at your price point without a brand; interview ~30 [4][5][6] | Any first sales hire |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| B2B win rate | 19% (from 29%) | 655K opportunities, $48B pipeline | [20] | 2025 |
| Sellers missing quota | 76% | H1 2025, Ebsta × Pavilion (secondary summary) | [21] | 2025 |
| Win rate, deals closed ≤ 50 days | 47% vs ~20% for longer deals | same dataset (secondary summary) | [21] | 2025 |
| Early decision-maker involvement | +55% win rate | Ebsta × Pavilion | [19] | 2025 |
| Pipeline coverage required | 5.3x | Ebsta × Pavilion | [20] | 2025 |
| Revenue concentration | 14% of sellers → 80% of revenue | Ebsta × Pavilion | [19] | 2025 |
| Expansion share of new revenue | 52% / 40% | Ebsta × Pavilion / Benchmarkit | [19][24] | 2025 |
| Founder Stage 1 funnel | 30-50 prospects → 10-20 customers | Kazanjy | [2] | 2026 |
| Prospecting base before hiring | 75-100 target accounts | Kazanjy | [2] | 2026 |
| Founder-closed customers before hire | 10-20 (SaaStr, BVP); 10-25 (DDVC) | B2B SaaS | [4][9][47] | 2024-25 |
| VP/Head of Sales timing | ~$1M ARR (BVP); $1-2M ARR + 2 reps at quota (SaaStr) | B2B SaaS | [9][5] | 2024-25 |
| AE median OTE | $200K (from $190K in 2024) | 158 B2B cos, US-heavy | [22] | 2026 |
| AE quota / quota:OTE | $960K / 4.6x | same | [22] | 2026 |
| AEs at quota / ramp | 48% / 6.2 months (record high) | same | [22] | 2026 |
| SDR median OTE | $80K (68:32 → $55K base + $25K) | 351 B2B cos | [23] | 2025 |
| SDR activity → output | 112 activities/day (44 dials, 41 emails, 19 LinkedIn) → 4.1 quality conversations/day; ~10 meetings/month quota | same | [23] | 2025 |
| SDRs at quota / ramp / tenure | 60% / 3.0 mo / 1.9 yrs | same | [23] | 2025 |
| AE OTE by segment | SMB $110-160K; mid-market $160-220K; enterprise $230-270K+ | secondary aggregator | [53] | 2026 |
| Funnel (aggregated) | MQL→SQL 39% / 31%; SQL→opp 42% / 36%; opp→close 39% / 31% | SMB-MM / enterprise; 40+ studies pooled, not primary | [38] | 2025 |
| Sales cycle | ~84 days avg; SMB <$5K 30-90 (median 40); mid-market 60-120; enterprise 170+ | aggregated | [38] | 2025 |
| Median free-to-paid | 8%; top vs bottom quintile 10x | 200 B2B products, mostly $1-10M ARR | [10] | 2026 |
| Card-required trial conversion | ~30% (>5x card-free) | same | [10] | 2026 |
| Primary PLG entry | 57% free trial, 26% freemium, 7% reverse trial | same | [10] | 2026 |
| Sales floor for PLS | ~$10K/yr; rep costs $100-300K and must return 3-5x | Verna | [11] | 2024 |
| NRR median | 101% (GRR 88%) | Benchmarkit private SaaS | [24] | 2025 |
| NRR by ACV $25-50K | median 102%, top quartile 111%, bottom 97% | SaaS Capital survey, >$1M ARR | [25] | 2025 |
| NRR by segment | enterprise 118%, mid-market 108%, SMB 97% | Optifai 939 cos + ChartMogul 2,100 | [26] | 2026 |
| New-customer CAC ratio | $2.00 median (+14% YoY); payback +12.5% since 2022 | Benchmarkit | [24] | 2025 |
| Annual logo retention "world class" | > 90% | Roberge | [7] | 2025 |
| Cold email reply rate | 3.43% avg; >10% top; 58% of replies from email 1 | Instantly, billions of sends | [30] | 2026 |
| Cold email reply rate (managed infra) | 3.1-3.7% avg; 5%+ strong; 8-12% elite | Lacleo | [32] | 2026 |
| Deliverability thresholds | bounce <3% (best <1.5%); spam complaints <0.3% hard cap, <0.1% target | Amplemarket / Google | [31][32] | 2026 |
| Domain warm-up | 5-10 emails/day rising over 4-6 weeks | Lacleo | [32] | 2026 |
| Buyers preferring rep-free | 67%; 45% used AI in a recent purchase | ~650 B2B buyers | [27][28] | 2026 |
| Seller time actually selling | 40% (Gen Z 35%) | 4,050 sellers | [29] | 2026 |
| Human vs AI SDR reply | 4.7% vs 2.9%; hybrid pod 18.3 meetings/mo vs 9.4 human, 11.7 AI | "Digital Applied" blend, secondary | [33] | 2026 |
| AI SDR domain-reputation failures | 47% of deployments within 90 days | secondary | [33] | 2026 |
| DTC conversion rate | median 1.17% (IQR 0.92-1.52%) | 19 DTC stores, 17M sessions, Jul 25-Jun 26 | [36] | 2026 |
| DTC conversion rate (larger stores) | median 2.07%, 75th pct 2.59% | 21 Shopify stores, $417M rev | [37] | 2026 |
| Add-to-cart / checkout completion | 5.95% / 48.4% | same | [37] | 2026 |
| Mobile vs desktop CVR | 2.29% (86% of traffic) vs 3.74% | same | [37] | 2026 |
| Returning-customer effect | stores with 50%+ returning: 3.28% vs 1.61% | same | [37] | 2026 |
| Shopify CVR tiers | avg 1.4-1.8%; good 2.5-3%; top 10% > 4.7% | secondary | [54] | 2025 |

## Decision rules & rules of thumb
- **If you have < 10 paying customers, the founder sells.** Do not hire sales before 10-20
  founder-closed deals and a written playbook (Lemkin; Bessemer; Data Driven VC) [4][9][47].
- **If you hire, hire two at once** and compare them; if neither converts like the founder did,
  the process is broken, not the people (Lemkin) [5]. Kazanjy's transition test: rep conversion
  metrics match the founder's [2].
- **If two reps hit quota and ARR is $1-2M, hire a head of sales**; earlier and they will spend
  90-180 days on decks and headcount plans instead of closing (Lemkin; Bessemer) [5][9].
- **If your leading-indicator retention event is not met by 60-80% of customers, do not scale
  sellers** (Roberge). GTM fit before pacing hires: LTV/CAC > 3, payback < 12 months [7].
- **If ACV is enterprise, 5-10 deals can reach $1M ARR; if SMB, plan for hundreds** and design
  the motion (self-serve or high-velocity) accordingly (Bessemer) [9].
- **If deals average under ~$10K, do not attach a human salesperson** — the sales floor; route
  below it to self-serve or success (Verna) [11].
- **If a prospect says "let me think about it", switch from status-quo pressure to JOLT**: judge
  indecision, recommend, limit options, de-risk; high-indecision deals close 6% of the time [13].
- **If a deal passes 50 days, treat it as at risk** — win rate roughly halves after that (Ebsta
  summary) [21]; ask for the critical event (SPICED) — 76% of B-player deals lack one [20].
- **If the economic buyer is not in the first meetings, get them in**: +55% win rate [19].
- **If your cold-email complaint rate nears 0.1%, stop and fix targeting**; 0.3% is Google's
  hard ceiling and mail is now rejected, not filtered [31][32].
- **If you run a free trial and want conversion over volume, require a card** (~30% vs <6%) —
  but expect fewer signups; choose by CAC and sales floor (Poyar) [10].
- **If NRR > 100% but GRR < ~85%, you have a churn problem hidden by upsells** (SaaS Capital;
  Optifai) [25][26].
- **If you must discount early, discount hard and grandfather**: Roberge's example is the first
  20 customers at 90% off for learning, not margin [7]; Expa's advisory-board conversion uses
  50% [48]. Never discount without a documented reason (reference, case study, logo).
- **If a candidate has not sold at your price point without a brand, pass** (Lemkin's checklist);
  interview ~30 to find one or two stage-appropriate fits [6].
- **If a rep shows no pipeline momentum by month 3-6, diagnose people/product/process, then act**
  (Data Driven VC) [47].

## Process / steps
1. **Write the ICP as three nested answers** (Kazanjy): which companies, who inside them, and what
   trigger makes it urgent now (funding, new hire, launch, missed quota) [2].
2. **Build a prospect base of 75-100 target accounts** with named contacts; source from your
   network, advisors, communities and warm intros before cold channels [2][48].
3. **Run 20-30 Mom-Test conversations** about their current workflow, cost and past attempts;
   no pitching; capture SPICED fields (situation, pain, impact, critical event, decision) [49][17].
4. **Write the narrative** in Dunford's order (insight → alternatives → perfect world → your
   differentiated value → proof) and produce it as talk track, deck, email and one-pager [15][2].
5. **Recruit 5-10 design partners / advisory customers**; pilot 2 weeks-2 months, scoped to one
   measurable outcome; agree the success metric and the price you will ask for up front [48].
6. **Outbound only after warm sources are exhausted**: authenticate the domain (SPF, DKIM, DMARC),
   one-click unsubscribe, warm up 4-6 weeks, send from a secondary domain, micro-segment, and
   judge by positive replies not opens [31][32][30].
7. **Qualify every opportunity** on SPICED (SMB/mid-market) or MEDDPICC (enterprise); log the
   critical event and economic buyer; drop non-ICP deals early [17][50][20].
8. **Close with a recommendation, not a menu** (JOLT): one option, a limited evaluation window,
   and risk removal (pilot terms, opt-out, guarantee, phased rollout) [13].
9. **Define the retention leading indicator** ("P% of customers do E within T") before hiring
   anyone; instrument it in the product or ops console [7].
10. **Document the playbook**: ICP, prospecting, discovery guide, demo script, objections, pricing
    rules, hand-off to success — then hire two reps who match the checklist [2][6].
11. **Pay for retention, not just signatures** (50/50 on signature and indicator) and pace hiring
    so you can stop if the indicator slips [7].
12. **Run expansion as a motion**: quarterly business reviews, usage-triggered upsell, C-suite
    relationships (Ebsta: engaged C-suite ↑ upsell potential 189%) [19].

## Worksheets, checklists & questions
**ICP and trigger worksheet**
- Which company types (size, sector, stack, region) have paid or piloted? Which said no and why?
- Who inside owns the pain, who signs, who blocks, who uses? (buying-group map) [2]
- What event makes this urgent this quarter? How would we detect it? [2]

**Discovery call sheet (SPICED)** [17]
- Situation: how do they do it today, with what tools, people, budget?
- Pain: what breaks, how often, who feels it?
- Impact: what does it cost in money, time, risk; what does fixing it unlock?
- Critical event: what dated deadline or consequence forces a decision?
- Decision: who decides, on what criteria, through what process and paper?

**Mom Test self-check** [49]
- Did I ask about their past behaviour, not my idea? Did I avoid "would you…?" hypotheticals?
- Did they give me a commitment (time, reputation, money) or only compliments?

**Indecision (JOLT) deal audit** [13]
- Is the stall about *which* option, *too much* information, or *fear of being blamed*?
- Have I made one recommendation? Set an evaluation end date? Removed the downside?

**Outbound compliance checklist** [31][32][39]
- SPF, DKIM, DMARC aligned; one-click unsubscribe header; physical address; true sender identity.
- Complaint rate < 0.1%; bounce < 2-3%; volume ramped over 4-6 weeks per new domain.
- Jurisdiction check: opt-out (US), corporate exemption (UK), legitimate-interest assessment (EU),
  opt-in (Germany, Spain, Italy), consent (Canada).

**First-sales-hire readiness gate** [4][7][9][47]
- 10-20 founder-closed customers; written playbook; retention indicator met by 60-80%.
- Budget for two reps; founder still on calls for 3-6 months; 30-day and 90-day checkpoints set.
- Candidate: sold at our price point, without a brand, thrived in chaos, I would buy from them.

**DTC funnel review** [36][37]
- Sessions → add-to-cart (benchmark ~6%) → checkout completion (~48-65%) → CVR (1.2-2.1% median).
- Mobile vs desktop gap; branded/email vs cold paid social; returning-customer share.

## Regional notes
- **US** — CAN-SPAM is opt-out: honest headers, postal address, working unsubscribe honoured
  within 10 business days; penalties up to $53,088 per email [39]. Comp benchmarks above are
  US-weighted (Bridge Group) — scale for local pay. Buyers expect self-serve first [27].
- **UK** — PECR Regulation 22 exempts *corporate subscribers* (Ltd, LLP work addresses) from the
  consent rule if the sender is identified and opt-out offered; sole traders and partnerships need
  consent; fines up to £500K [39]. Check ICO guidance before campaigns.
- **EU** — B2B cold email rests on GDPR legitimate interest with a documented assessment, but
  ePrivacy varies by state: France and the Netherlands allow B2B without opt-in; Germany, Spain and
  Italy require consent even for B2B [39]. Germany's UWG §7 has no B2B exemption and competitor
  cease-and-desist letters are the usual enforcement; the ECJ *Inteligo Media* ruling (Nov 2025)
  narrowed the existing-customer exception — free-trial sign-ups do not automatically qualify [40].
- **Nigeria / Africa** — WhatsApp is the dominant B2B conversion channel; Lagos decision-makers
  answer on WhatsApp before cold email [41]. Expect long, relationship-driven cycles, currency
  volatility affecting naira vs dollar pricing, and heavy verification (WhatsApp, LinkedIn, physical
  visits, peer references) because of fraud history [42]. Distribution often runs through
  retailer/distributor networks — OmniRetail links 150,000 retailers, 145 manufacturers and 5,800
  distributors across 12 cities (₦1.8trn processed) [45]; chat-native payments are arriving (Xara:
  10,000 users, ₦135M within weeks) [43]. Pan-African B2B startups sell as "symbiotic" partners of
  banks and corporates and embed WhatsApp into the product (e.g. Jem HR) [44]. Check the Nigeria
  Data Protection Act 2023 for outreach consent rules (not researched here — unverified).
- **Canada / Australia** — consent-based regimes (CASL express/implied; Spam Act inferred consent)
  with 5-10 day unsubscribe honouring [39].
- **India, Southeast Asia, Middle East, LatAm** — not researched in this pass; treat all figures
  above as US/UK/EU-centric and re-benchmark locally (unverified).

## AI-era notes
- **Adoption is real; impact is uneven.** 54% of sellers have used AI agents and ~9 in 10 plan to
  by 2027; expected savings are 34% on research and 36% on drafting [29]. Bridge Group: firms with
  high AI engagement report 57% of AEs at quota vs 39% — but 10 of 11 AI use cases are rated "hit
  or miss" by the same respondents [22]. Best-evidenced uses: post-call summaries, account
  research, email personalisation [22].
- **AI SDRs: hype ahead of evidence.** Only 1% of Bridge Group's 2025 SDR respondents ran an "AI
  SDR" [23]. Secondary 2026 data puts AI-SDR raw reply rates below human (2.9% vs 4.7%), with 47%
  of deployments hitting domain-reputation trouble within 90 days and vendor churn estimated at
  50-70% a year; hybrid pods (one human + AI seats) out-produced both [33]. Artisan's CEO admitted
  the first generation "barely worked" with "extremely bad hallucinations" [34]. Vendor case
  studies (7x ROI, 5x meetings) exist but are unaudited [34][35].
- **AI-generated volume degraded the channel for everyone.** Instantly attributes the reply-rate
  drop to inbox saturation from AI outbound plus stricter sender rules [30]; the winning response is
  precision (micro-segments, problem-led lines), with elite teams letting agents do ~80% of research
  and sequencing while humans write the argument [30].
- **Buyers use AI too.** 45% of B2B buyers used AI in a recent purchase and 67% prefer no rep [27];
  your product pages, pricing and proof must be legible to an AI research agent as well as a human.
- **Frameworks are being encoded, not replaced.** Winning by Design now certifies "AI for GTM" with
  every output grounded in SPICED and written to the CRM [17]; the practical founder move is an AI
  note-taker that fills SPICED/MEDDPICC fields, then a human decides.
- **Where hype outruns evidence:** fully autonomous closing, "10x pipeline" claims, and AI voice
  agents for cold calls — no independent benchmark found in this research; Gartner's own data
  shows regret rises when complex purchases go rep-free (secondary summary) [55].

## The minds

| Person | Affiliation | Key contribution | Where to read |
|---|---|---|---|
| Pete Kazanjy | Founding Sales; Atrium; Modern Sales Pros | Founder-led selling maturity stages; sales as consulting; document-before-hire | *Founding Sales* (2020); Lenny's (2022); GTMnow playbook (2026) [1][2][3] |
| Jason Lemkin | SaaStr | Close 10-20 yourself; hire two reps; head of sales at $1-2M ARR; 10-point hire checklist | SaaStr posts (2024-25) [4][5][6] |
| Mark Roberge | Stage 2 Capital; ex-HubSpot CRO | Data definition of PMF; retention-linked comp; paced hiring | *The Science of Scaling* (Wiley, 2025) [7][8] |
| Jacco van der Kooij | Winning by Design | SPICED, Bowtie, Revenue Architecture; AI-for-GTM grounded in SPICED | winningbydesign.com courses (2025-26) [17][18] |
| Matt Dixon & Ted McKenna | DCM Insights; Challenger | Indecision as the #1 loss cause; JOLT | *The JOLT Effect* (2022); challengerinc.com research [13][14] |
| April Dunford | Positioning consultant | Pitch as guided comparison against alternatives incl. do-nothing | *Sales Pitch* (2023); Lenny's (2023) [15][16] |
| Kyle Poyar | Growth Unhinged; ex-OpenView (2016-24) | PLG/free-to-paid benchmarks; pricing and packaging data | Growth Unhinged newsletter; 2026 free-to-paid report [10][52] |
| Elena Verna | Growth advisor/operator (Dropbox, Amplitude, Lovable) | Product-led sales, PQA scoring, sales floor | elenaverna.com PLS guides (2023, 2024) [11][12] |
| Bessemer Atlas editors | Bessemer Venture Partners | $1M ARR founder playbook; VP-Sales timing | bvp.com/atlas (2025) [9] |
| Rob Fitzpatrick | Author, YC alum | The Mom Test rules for honest customer conversations | *The Mom Test* (2013) [49] |
| Andre Retterath & Jerome Jaggi | Data Driven VC | First-hire benchmarks, profile, 3-6-month checkpoint | DDVC newsletter (Aug 2025) [47] |
| Steve Walsh | Techstars mentor-in-residence | Why the first sales hire fails; founder sells 1-2 years | Techstars blog (Mar 2026) [46] |
| Ebsta × Pavilion research team | Ebsta / Pavilion | Largest open B2B pipeline dataset (655K opps) | 2025 GTM Benchmarks [19][20] |
| Trish Bertuzzi / Bridge Group | The Bridge Group | Definitive SDR and AE comp/metrics surveys | 2025 SDR and 2026 AE reports [22][23] |

## Pitfalls
- Hiring a salesperson before the founder has a repeatable, documented motion [46][47][4].
- Hiring one rep and drawing conclusions from n = 1 [5]; hiring a big-company VP who needs a team [47].
- Treating "no decision" as a competitor loss and doubling down on status-quo fear [13].
- Pitching features before establishing alternatives and the customer's perfect world [16].
- Buying an AI SDR to replace prospecting rather than to assist it; burning the primary domain [33].
- Cold-emailing consumers or German/Spanish/Italian businesses without consent [39][40].
- Scaling on top-line growth while the retention leading indicator is unmet [7].
- Reading NRR without GRR [25][26]; celebrating logos below the sales floor that cost more to
  serve than they pay [11].
- Accepting non-ICP deals to hit a number — top reps decline them early [20].
- Comparing a DTC store to a mean inflated by low-AOV outliers; use the median [36].

## Key terms
`ICP` — ideal customer profile: which companies, which people, which trigger [2].
`trigger / critical event` — dated reason the buyer must decide now; the C and E of SPICED [17].
`SPICED` — Situation, Pain, Impact, Critical Event, Decision (Winning by Design) [17].
`MEDDPICC` — Metrics, Economic buyer, Decision criteria, Decision process, Paper process, Identify pain, Champion, Competition [50].
`JOLT` — Judge, Offer, Limit, Take risk off the table — the anti-indecision playbook [13].
`FOMU` — fear of messing up; dominates once purchase intent exists [13].
`no-decision loss` — deal that ends with the buyer doing nothing; 40-60% of losses [13][16].
`product-led sales (PLS)` — sales pipeline built from self-serve usage signals [11].
`PQA / PQL` — product-qualified account / lead: usage-scored readiness for sales [12].
`sales floor` — minimum deal size that justifies a human seller (~$10K) [11].
`reverse trial` — start on the paid tier, drop to free at trial end [10].
`NRR / GRR` — net / gross revenue retention; read together [25][26].
`CAC ratio` — sales & marketing spend per $1 of new ARR [24].
`pipeline coverage` — open pipeline ÷ quota; ~5.3x needed at 2025 win rates [20].
`OTE` — on-target earnings (base + variable at 100% quota) [22].
`quota:OTE` — quota divided by OTE; ~4.6x median [22].
`ramp time` — months to full productivity; 6.2 (AE), 3.0 (SDR) [22][23].
`founding AE` — first, full-stack seller who prospects, closes and writes process [47].
`leading indicator (retention)` — "P% of customers achieve E within T" [7].
`DMARC / one-click unsubscribe` — sender authentication and RFC 8058 header now required by Gmail, Yahoo, Outlook [32].
`hybrid pod` — one human seller plus AI seats for research and sequencing [33].
`bowtie` — Winning by Design's funnel extended through onboarding, retention and expansion [17].

## Build ideas for the app
- **ICP & trigger builder** — company/persona/trigger answers + won/lost list → ICP card, target-
  account list of 75-100, trigger-detection ideas → the prerequisite for every other sales tool [2].
- **SPICED call companion** — call notes or transcript → filled SPICED/MEDDPICC fields, missing-field
  alerts (no critical event, no economic buyer), next-step suggestion → qualification discipline [17][20].
- **Reverse pipeline calculator** — revenue target, ACV, benchmark or own conversion rates, cycle
  length → prospects, conversations and pipeline coverage needed per month → tells a founder how
  much selling time the plan implies [20][38].
- **Indecision risk scorer** — deal age, options on the table, stakeholder count, stated fears →
  indecision level and a JOLT action → rescues stalled deals [13].
- **First-hire readiness gate** — customers closed, playbook artefacts, retention indicator, LTV/CAC,
  budget for two → go/no-go with the hire profile and checklist → stops the classic early hire [4][7][47].
- **Outbound compliance & deliverability checker** — sending domain, target countries, list source
  → SPF/DKIM/DMARC status, jurisdiction rule, warm-up schedule, complaint-rate guardrails [31][32][39].
- **PQA scorer** — storefront/console usage (seats, velocity, feature breadth) → account score 0-100
  and route (self-serve / success nudge / sales) at a threshold [11][12].
- **DTC funnel benchmark card** — sessions, ATC, checkout, orders, device split → position vs
  medians (1.17-2.07% CVR, ~6% ATC, 48-65% checkout) and the highest-leverage fix [36][37].

## Sources
[1] Founder-led sales | Pete Kazanjy — Lenny's Newsletter — 15 Dec 2022 — https://www.lennysnewsletter.com/p/founder-led-sales-pete-kazanjy-founding
[2] The Founder-Led Sales Playbook (with Pete Kazanjy) — GTMnow / GTMfund — 27 Mar 2026 — https://gtmnow.com/the-founder-led-sales-playbook/
[3] Founding Sales — Table of Contents — Pete Kazanjy — 2020 — https://www.foundingsales.com/table-of-contents
[4] Dear SaaStr: When Should I Hire Our First Sales Person, and Who Should I Hire? — SaaStr / Jason Lemkin — 10 Aug 2024 — https://www.saastr.com/dear-saastr-when-should-i-hire-our-first-sales-person-and-who-should-i-hire/
[5] Should You Hire a Sales Rep First, Or a Sales Manager? — SaaStr / Jason Lemkin — https://www.saastr.com/should-i-hire-a-sales-rep-first-or-a-sales-manager/
[6] A 10 Point Checklist for Hiring Your First Few Sales Reps — SaaStr / Jason Lemkin — 2025 — https://www.saastr.com/a-10-point-checklist-for-hiring-your-first-few-sales-reps/
[7] The Science of Scaling: when and how fast to scale — Stage 2 Capital / Mark Roberge — 2025 — https://www.stage2.capital/science-of-scaling
[8] The Science of Scaling (book page) — Wiley / Mark Roberge — 2025 — https://www.wiley.com/en-us/the-science-of-scaling-using-data-to-decide-when-and-how-fast-to-scale-revenue-p-9781394319428
[9] The founder's playbook for scaling to $1 million ARR — Bessemer Venture Partners, Atlas — 11 Feb 2025 — https://www.bvp.com/atlas/the-founders-playbook-for-scaling-to-1-million-arr
[10] The 2026 free-to-paid conversion report — Growth Unhinged / Kyle Poyar with ChartMogul & ProductLed — 4 Feb 2026 — https://www.growthunhinged.com/p/free-to-paid-conversion-report
[11] Elena's 2024 B2B Product-Led Sales Guide — Elena Verna — 8 Aug 2024 — https://www.elenaverna.com/p/elenas-2024-b2b-product-led-sales
[12] B2B Product-Led Sales Guide — Elena Verna — 14 Apr 2023 — https://www.elenaverna.com/p/b2b-product-led-sales-guide
[13] Why are you losing to customer indecision? (The JOLT Effect research) — Challenger Inc / Dixon & McKenna — https://challengerinc.com/losing-to-customer-indecision/
[14] The JOLT Effect: How High Performers Overcome Customer Indecision — Dixon & McKenna — 2022 — https://www.amazon.com/JOLT-Effect-Performers-Overcome-Indecision/dp/0593538102
[15] A step-by-step guide to crafting a sales pitch that wins — April Dunford on Lenny's Newsletter — 22 Oct 2023 — https://www.lennysnewsletter.com/p/a-step-by-step-guide-to-crafting
[16] How to Build a Game-Changer Sales Pitch: April Dunford, SaaStock 2023 — Dualoop — 25 Oct 2023 — https://www.dualoop.com/blog/how-to-build-a-game-changer-sales-pitch-lessons-and-key-takeaways-from-april-dunford-saastock-2023
[17] Winning by Design — Revenue Architecture, Bowtie, SPICED, AI for GTM — 2026 — https://winningbydesign.com/
[18] Jacco van der Kooij: the architect behind Bowtie, SPICED and Revenue Architecture — Speakers Associates — https://www.speakersassociates.com/speaker/jacco-van-der-kooij/
[19] 2025 GTM Benchmarks — Ebsta × Pavilion — 2025 — https://www.joinpavilion.com/resource/2025-gtm-benchmarks-ebsta-pavilion
[20] SaaSletter — Ebsta + Pavilion's 2025 GTM Benchmarks — 3 Apr 2025 — https://www.saasletter.com/p/ebsta-2025-gtm-benchmarks
[21] 2025 B2B Sales Performance Benchmark Report (summary of Ebsta × Pavilion) — Hyperbound — 2025 — https://www.hyperbound.ai/blog/b2b-sales-performance-benchmark-2025
[22] AE Models, Motions & Metrics: 2026 Research Report — The Bridge Group — 22 Jun 2026 — https://www.bridgegroupinc.com/research/2026-ae-models-motions-metrics
[23] SDR Models, Motions & Metrics: 2025 Research Report — The Bridge Group — 6 Feb 2025 — https://www.bridgegroupinc.com/research/2025-sdr-models-metrics-report-the-bridge-group
[24] 2025 SaaS Performance Metrics — Benchmarkit — 2025 — https://www.benchmarkit.ai/2025benchmarks
[25] What is a Good Retention Rate for a Private SaaS Company in 2025? — SaaS Capital — 2025 — https://www.saas-capital.com/blog-posts/what-is-a-good-retention-rate-for-a-private-saas-company/
[26] B2B SaaS NRR Benchmarks — 939 Companies by Segment & ACV Tier — Optifai — 20 Apr 2026 — https://optif.ai/learn/questions/b2b-saas-net-revenue-retention-benchmark/
[27] Gartner Sales Survey Finds 67% of B2B Buyers Prefer a Rep-Free Experience — Gartner press release — 9 Mar 2026 — https://www.gartner.com/en/newsroom/press-releases/2026-03-09-gartner-sales-survey-finds-67-percent-of-b2b-buyers-prefer-a-rep-free-experience
[28] Gartner: 67% of B2B Buyers Prefer a Rep-Free Experience — Demand Gen Report — 17 Mar 2026 — https://www.demandgenreport.com/industry-news/news-brief/gartner-67-of-b2b-buyers-prefer-a-rep-free-experience/52142/
[29] Salesforce Announces State of Sales Report for 2026 — Salesforce — 3 Feb 2026 — https://www.salesforce.com/news/stories/state-of-sales-report-announcement-2026/
[30] Cold Email Benchmark Report 2026 — Instantly — 12 Jan 2026 — https://instantly.ai/cold-email-benchmark-report-2026
[31] The 2026 cold email benchmarks for bounce, open, reply and spam rates — Amplemarket — 23 Jun 2026 — https://www.amplemarket.com/blog/cold-email-benchmarks
[32] Cold Email Benchmarks 2026: Reply Rates, Deliverability and the New Sender Rules — Lacleo — 5 Aug 2026 — https://www.lacleo.ai/blog/cold-email-benchmarks-deliverability-2026
[33] AI SDRs in 2026: What Clay, 11x, and Artisan Actually Automate — Refonte Learning (secondary; cites "Digital Applied" 2026 benchmark) — 12 Aug 2026 — https://www.refontelearning.com/blog/ai-sdr-tools-clay-11x-artisan-compared
[34] Artisan vs 11x: AI SDR comparison (vendor) — 11x.ai — 1 May 2026 — https://www.11x.ai/guides/artisan-vs-11x
[35] Do AI SDRs actually work? What the data says (vendor) — Artisan — 23 Jul 2026 — https://www.artisan.co/blog/do-ai-sdrs-actually-work-what-the-data-says
[36] Ecommerce Conversion Rate Benchmark 2026: DTC Median 1.17% — Top Growth Marketing — 9 Aug 2026 (upd. 30 Aug 2026) — https://topgrowthmarketing.com/dtc-ecommerce-benchmarks/ecommerce-conversion-rate/
[37] Ecommerce Conversion Rate Benchmarks 2026: Real Data from 21 Shopify Stores — DTC Pages — 4 Apr 2026 (upd. 21 Jul 2026) — https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026
[38] 2025 B2B SaaS Funnel Benchmarks & Pipeline Audit Framework (aggregates 40+ studies) — The Digital Bloom — 22 Oct 2025 — https://thedigitalbloom.com/learn/pipeline-performance-benchmarks-2025/
[39] Is Cold Email Illegal? Legal Guide 2026 — Overloop — May 2026 — https://overloop.com/blog/cold-email-illegal
[40] Is Cold Email Legal in Germany? GDPR & UWG §7 — Overloop — 15 May 2026 — https://overloop.com/blog/b2b-cold-email-germany-gdpr-compliance
[41] B2B Lead Generation in Nigeria: What Actually Works in 2026 — Busnurd — 2026 — https://busnurd.com/b2b-lead-generation-nigeria/
[42] B2B SaaS Marketing Strategy in Nigeria: How to Turn Leads into Revenue (2026 Guide) — Busnurd — 2026 — https://busnurd.com/b2b-saas-marketing-strategy-nigeria/
[43] 7 African startups rethinking bookings, AI, credits, and commerce — TechCabal — 15 Aug 2025 — https://techcabal.com/2025/08/15/startups-on-our-radar-003/
[44] The Super-Niche Shift: A Taxonomy of 2025's Venture-Backed B2B Startups in Africa — Launch Base Africa — 26 Sep 2025 — https://launchbaseafrica.com/2025/09/26/the-super-niche-shift-a-taxonomy-of-2025s-venture-backed-b2b-startups-in-africa/
[45] Fastest-growing B2B startups in Nigeria to watch (2026 list) — Techpoint Africa — 2026 — https://techpoint.africa/guide/fastest-growing-b2b-startups-nigeria/
[46] Founders: Your First Sales Hire Is Probably a Mistake — Techstars / Steve Walsh — 30 Mar 2026 — https://www.techstars.com/blog/founder-advice/founders-your-first-sales-hire-is-probably-a-mistake
[47] The First Sales Hire: Avoiding Pitfalls, Benchmarks & When to Make a Change — Data Driven VC / Andre Retterath & Jerome Jaggi — 19 Aug 2025 — https://www.newsletter.datadrivenvc.io/p/the-first-sales-hire-avoiding-pitfalls
[48] Founder-led B2B sales: getting your first 5-10 customers — Expa / Sahil Mansuri — 21 Feb 2023 — https://www.expa.com/news/founder-led-b2b-sales-getting-your-first-5-10-customers
[49] The Mom Test — Rob Fitzpatrick — 2013 (classic) — https://www.momtestbook.com/
[50] Best Sales Methodologies for B2B SaaS Teams in 2026: MEDDIC, Challenger, SPICED — Sales Assembly — 2026 — https://www.salesassembly.com/blog/revenue-leadership/best-sales-methodologies-b2b-saas-2026/
[51] 15-Minute Summary of Predictable Revenue — Predictable Revenue / Aaron Ross & Marylou Tyler (2011 book) — https://predictablerevenue.com/blog/15-minute-summary-of-predictable-revenue/
[52] About — Kyle Poyar's Growth Unhinged — https://kylepoyar.substack.com/about
[53] Sales Compensation Benchmarks 2026: OTE, Pay Mix & Commission by Role (secondary) — Optymyze — 2026 — https://optymyze.com/blog/sales-compensation-benchmarks/
[54] Latest Shopify Conversion Rate Statistics (secondary) — Craftberry — 2025 — https://craftberry.co/articles/average-conversion-rate-for-shopify-stores-in-2025
[55] B2B Buying Statistics (2026): 55+ Data Points (secondary summary of Gartner research) — Omnibound — 2026 — https://www.omnibound.ai/blog/b2b-buying-statistics
