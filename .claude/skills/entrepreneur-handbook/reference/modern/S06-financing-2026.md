# S06 — Financing in 2026: instruments, rounds, alternatives, how to raise (2026 layer)
Supplements: `06-startup-financing.md` (startup capital: bootstrap, friends and family, banks,
crowdfunding, accelerators), `07-growth-financing.md` (bank debt, leverage, IPO) and
`08-angels-and-vc.md` (angels, VC, term sheets, dilution) — all three use 2014-2017 data, describe
convertible notes rather than post-money SAFEs, and pre-date the 2021 Reg CF $5M cap, the 2023 SVB
collapse, the 2022-24 reset and the 2025-26 AI concentration. Also extends `C-valuation.md`
(valuation norms), `05-business-plan.md` (what investors now read) and
`09-going-public.md` (IPO scarcity, secondaries as the substitute). Load when a user asks how much
to raise, on what instrument, from whom, at what valuation, what a term sheet should say, or
whether to raise at all.

## What changed since 2018
- **The post-money SAFE ate the early stage.** SAFEs were 93% of pre-priced deals and 89% of
  pre-priced dollars in Q4 2025, 93%/95% by Q2 2026; post-money SAFEs went from just over 60% of
  SAFEs in 2021 to almost 90% in 2025 [3][4][6]. The handbook's convertible-note default is now
  the minority instrument (7% of deals) [3][4].
- **Capital concentrated into AI and into fewer, larger cheques.** AI took 86% of US venture dollars
  in H1 2026 ($355.9B of $412.7B) and $100M+ megadeals 87.5% of capital, leaving seed, A and B the
  remaining 12.5%; three firms raised 48.1% of all new fund capital [10][11][12].
- **Graduation got much harder, then slightly easier.** Seed→A at 24 months is ~14-17% against ~30%
  in the boom; the 12-month rate recovered to 10-11% and median seed→A time fell to ~1.9 yrs [7][8].
- **Headline terms stayed founder-friendly; tail terms hardened.** Q1 2026: 98.2% of rounds 1x
  liquidation preference, 96.4% non-participating — but pay-to-play 7.3% (from 6.3%) and
  redemption rights 6.1% (from 1.8% a quarter earlier) [14][15].
- **SVB's failure rewired venture debt.** SVB held roughly half the market when it failed in March
  2023; US venture-debt value fell to $27.4B in 2023 then rebounded to $53.3B in 2024 through BDCs
  and specialist lenders [19], now priced at SOFR + 700-950bps with 3-10% warrant coverage [20].
- **Revenue-based financing peaked and consolidated.** Pipe, Clearco and Capchase all cut staff and
  pivoted as banks re-priced recurring-revenue lending; the instrument survives, the 2021 category
  thesis did not [22][23].
- **Equity crowdfunding is real but small, capped at $5M/12 months under Reg CF.** Wefunder, the
  largest portal, closed $109M across 367 deals in 2025; the market fell 28% YoY in Q1 2026 [24][25].
- **The IPO stopped being the liquidity event; tenders replaced it.** Carta administered 71 tender
  offers in H1 2026 worth ~$3B — count +34%, value +200% YoY, the highest H1 in six years [17].
- **Government money moved.** US SBIR/STTR lapsed on 30 Sep 2025 and was reauthorised only on
  13 Apr 2026 [31][32]; the UK raised EIS company limits to £10M/year and £24M lifetime from
  6 April 2026 [36]; the EIC Accelerator's 2026 budget is €634M [34][35].
- **Bank credit stayed hard for small firms.** SBA's June 2025 SOP pushed $350K-$500K loans out of
  streamlined processing, and approvals of ≤$500K loans fell about 38% by count [27][28].

## Core ideas (current consensus)
- **The instrument question is settled; the cap question is not.** Carta's Peter Walker (2026):
  capped post-money SAFEs are the default pre-seed mechanism, so the only real negotiation is the
  cap, which scales with the raise — ~$10M on sub-$250K rounds to ~$35M on $2.5M+ in Q2 2026 [6][9].
- **Post-money SAFEs make dilution certain and additive.** Each fixes the investor's percentage, so
  stacking three stacks the dilution and the founder absorbs it — Carta: $1-2.4M pre-seed rounds
  dilute 19-20% at the median, $2.5-4.9M mid-20s [3][4][5].
- **Raise for a milestone, not a runway number.** Lemkin (SaaStr, 2025-26): the Series A bar is
  ~$2M ARR ($1M in a hot space growing fast) at 100-150% growth; below that you are raising a seed
  extension, whatever you call it [65].
- **The market is bifurcated, not closed.** Lemkin (2025): AI-native companies scaling fast and
  exceptional SaaS at 100%+ growth get funded; a good company at $30M ARR growing 60-70% is
  "walking through the desert" for VC [64].
- **Ownership math beats valuation vanity.** Carta cap-table data: median founding teams hold ~56%
  after seed and ~36% after Series A — SAFEs and pool top-ups, not the round itself, do it [55b].
- **Speed of execution is the pre-seed signal.** Elizabeth Yin (Hustle Fund): with almost no data,
  investors underwrite how fast a team learns and ships; she caps fund size so small exits count [57][58].
- **Most companies should not raise venture at all.** Walling (TinySeed, MicroConf): small product
  on a platform → income replacement → standalone recurring revenue; TinySeed backs that with
  $120K-$220K for 10-12% and no 100x pressure [59][60].
- **Warrant-bearing debt is cheap equity only if you survive it.** 2026 venture debt: SOFR +
  700-950bps, 3-10% warrants, 2-5% end-of-term fee; it extends runway, it does not replace a round [20][21].
- **The AI boom is a capital cycle.** Bill Gurley (Benchmark, 2026): AI capex-to-sales heads for 34%
  in 2026 and 37% in 2028, above the ~32% dot-com peak — "One day, I just think we trip and run out
  of money"; he also warns toxic-high valuations kill good companies [61][62][63].
- **Angels became organised.** ACA's 2026 Angel Funders Report: group angel investment rose 12% to
  $491.3M in 2025 — bigger cheques, fewer companies, diligence-led syndicates and community models
  displacing spray-and-pray [53][54][56]; Canadian angel investment fell to a five-year low [55].
- **"Land and expand" applies to investors too.** Mark Suster (Upfront): you are selling trust and
  a decade-long working relationship, so build it before you need the cheque [66].

## Frameworks & playbooks

| Framework | Author / year | What it says | Use when |
|---|---|---|---|
| Post-money SAFE (2018 revision) | Y Combinator, 2018; still the standard in 2026 | Investor's percentage is fixed at signing; cap is set on the post-money of the SAFE round itself. Variants: cap-only (≈2/3 of SAFEs), cap+discount, discount-only, MFN [3][4][6] | Any pre-seed or seed round under ~$4M raised on a rolling basis |
| YC Standard Deal | Y Combinator, since 2022 | $125K on an uncapped SAFE for a fixed 7% post-conversion (incl. option pool), plus $375K on an uncapped MFN SAFE that adopts the best terms issued before the next priced round [16] | Benchmarking accelerator terms; understanding MFN mechanics |
| Venture Deals term-sheet map | Brad Feld & Jason Mendelson, *Venture Deals* (4th ed., 2019) | Separate **economics** (price, liquidation preference, pay-to-play, vesting, pool) from **control** (board, protective provisions, drag-along); negotiate only the terms that matter in both buckets [67] | Reading any priced term sheet |
| Stair-step bootstrapping | Rob Walling, 2013-2026 | Step 1 a single small product in an existing ecosystem; Step 2 replicate until it replaces your income; Step 3 standalone SaaS with runway and reputation [59] | Founders with no network, no savings and no venture-scale market |
| TinySeed / calm capital | Rob Walling & Einar Vollset, 2018- | $120K-$220K for 10-12%, remote-first, no 100x mandate; profitability and dividends are acceptable outcomes [60] | B2B SaaS at $10-50K MRR that does not want the venture ladder |
| Hustle Fund pre-seed underwriting | Elizabeth Yin, 2017- | With no metrics, underwrite execution speed and learning velocity; small fund, small cheques, small exits still work [57][58] | Framing what to show at pre-seed |
| Milestone-based raise sizing | Common 2026 practice, e.g. Waveup / Eqvista AI playbooks (secondary) | Size the round to reach the *next* funding-grade milestone with 3-6 months of slack: seed AI application rounds of $2-5M targeting $1-2M ARR in 12-18 months [72][73] | Deciding the ask |
| Tender offer / structured secondary | Carta, 2025-26 | Company-run liquidity event at a set price for employees and early investors; ~70% of H1 2026 tenders were Series C+, but Nasdaq Private Market saw ~50% of its 2025 programs at Series A-C [17][18] | Retention and founder de-risking when IPO is far away |
| Venture debt sizing | Post-SVB lender practice, 2026 | 25-50% of the last equity round, drawn within 12 months of the round, priced SOFR + 700-950bps, 3-10% warrant coverage, 2-5% end-of-term fee, 2-3 year term [20][21] | Runway extension between priced rounds |
| Six-week raise sprint | Equidam, 2026 | Weeks 1-2 volume and first meetings (output: a shortlist); weeks 3-6 shortlisted investors in the data room; a round typically fills over 6-16 weeks [70] | Running the process |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| Median seed post-money | $24M (from $18M, $16M in prior two years) | Carta primary rounds, Q4 | [1] | 2025 |
| Median seed round | $24.3M post on $4.1M raised, 18% dilution | Carta, software only, last 6 months, no bridges | [2] | 2026 |
| Median Series A | $80M post on $14.4M raised, 18% dilution | same | [2] | 2026 |
| Median Series B | $191M post on $25M raised | same | [2] | 2026 |
| Median dilution, seed→Series C | fell ~18% → 16% over the year | Carta all rounds | [1] | 2025 |
| Founder ownership | ~56% after seed; ~36% after Series A | Carta cap-table data (secondary analysis) | [55b] | 2026 |
| SAFE share of pre-priced deals | 93% of deals / 89% of dollars; 93% / 95% by Q2 2026 | Carta; notes are the rest | [3][4][6] | 2025-26 |
| Post-money SAFE share of SAFEs | ~60% (2021) → ~90% (2025); cap-only ≈ two-thirds | Carta, 330,000+ SAFEs and notes since 2021 | [3][4][6] | 2025-26 |
| Median SAFE cap, Q2 2026 | $10M (<$250K) · $12M · $12.5M · $18M ($1-2.4M) · $35M ($2.5M+) | Carta via Finro | [6] | 2026 |
| Pre-seed dilution | $1-2.4M rounds 19-20% median; $2.5-4.9M mid-20s; <$250K 5-6% | Carta | [3][4] | 2025 |
| Seed→Series A graduation | 10-11% at 12 months (2025 cohort) vs 4-5% in 2022-23; 14-17% at 24 months vs ~30% in the boom | Carta / Peter Walker | [7][8] | 2026 |
| US venture, H1 2026 | $412.7B deployed; AI $355.9B = 86% | PitchBook-NVCA Venture Monitor | [10][11][12] | 2026 |
| Concentration | $100M+ megadeals 87.5% of capital; top 3 firms 48.1% of new fund capital; first-time funds on track for lowest year since 2016 | same | [11] | 2026 |
| Global venture, Q1 2026 | ~$300B (record); seed $12B, +31% YoY | Crunchbase | [13] | 2026 |
| Priced-round terms | 1x liq pref 98.2%; non-participating 96.4%; pay-to-play 7.3%; redemption 6.1%; accruing dividends 2.4% | Cooley, 165 deals / $39.9B | [14][15] | Q1 2026 |
| Round direction | up 86% · flat 2.6% · down 11.4% | Cooley | [14] | Q1 2026 |
| Bridge rounds | 16.6% of cash raised (Q2 2025) vs 11.8% (Q2 2024) — dollars, not deal count | Carta via secondary | [71] | 2025-26 |
| Venture debt | US value $53.3B (2024), +94.5% on the $27.4B 2023 trough; SVB was ~50% of the market pre-failure | secondary review | [19] | 2024-26 |
| Venture debt pricing | SOFR + 700-950bps · 3-10% warrant coverage · 2-5% end-of-term fee · 2-3 year facilities | lender-practice guides (secondary) | [20][21] | 2026 |
| Reg CF portals, 2025 | Wefunder $109M / 367 deals · StartEngine $89M · DealMaker $66M · Republic $20M | platform league table (secondary) | [24] | 2025 |
| SBA 7(a) | Small Loan cap cut to $350K (SOP 50 10 8, 1 Jun 2025); ≤$500K approvals -38% by count; $350-500K band -64% | SBA lender analyses | [27][28] | 2025-26 |
| SBA FY2026 fees | at statutory maximum; guaranty fee waived ≤$950K for small manufacturers (NAICS 31-33), lender flat fee ≤$2,500 | NAGGL | [29] | 2026 |
| Small-business loan approval | big banks ~13-15% · small banks ~18-20% · alternative lenders 25-30% | Biz2Credit-derived (secondary) | [30] | 2026 |
| SBIR/STTR | lapsed 30 Sep 2025, reauthorised 13 Apr 2026 (P.L. 119-83); awards fell from a 6,713/yr FY20-24 average to 4,729 in 2025 (~$490M gap); new Phase II "strategic breakthrough" awards up to $30M over ≤48 months | Crowell; Federal News Network; Granted AI | [31][32][33] | 2026 |
| EIC Accelerator | €634M indicative 2026 budget (€414M Open + €220M Challenges); grants up to €2.5M plus equity | European Innovation Council | [34][35] | 2026 |
| UK SEIS | company £250K (£350K gross); investor £200K/yr; unchanged at Budget 2025 | Farrer; British Business Bank | [36][37] | 2026 |
| UK EIS from 6 Apr 2026 | annual £10M (£20M knowledge-intensive), lifetime £24M (£40M KI) — up from £5M/£10M and £12M/£20M | Finance Act 2026 | [36][38] | 2026 |
| Europe | ~$44B raised in 2025 (vs $43B/$41B in 2023/24); ecosystem ~$4T ≈ 15% of GDP; ~40,000 funded tech companies vs 13,000 in 2016; $375B decade funding gap | Atomico State of European Tech via Sifted | [40] | 2025 |
| Africa 2025 | $4.1B equity+debt (+25%); debt $1.64B (+63% on $1.01B); Kenya $1.04B · South Africa $715M · Egypt $604M · Nigeria $572M (-3%, 102 deals); top four = 72% of capital | Partech | [42] | 2025 |
| Africa H1 2026 | ~$1.36B (Africa: The Big Deal); Egypt $327M (one Spiro deal) · Nigeria $254M total / $214M equity — largest equity market · Kenya $126M · South Africa $83M | African Business / The Big Deal | [43] | 2026 |
| Nigeria Q1 2026 | $78.6M, -28% YoY; Africa-wide debt raised >2x equity that quarter | Nairametrics; BusinessDay | [44][45] | 2026 |
| India | ~$16B VC + growth in 2025, second straight year of growth (from $13.7B in 2024) | Bain India Venture Capital Report 2026 | [48] | 2026 |
| Southeast Asia | $6.79B / 335 equity rounds in 2025 (+14%); e-Conomy counts $8B, DealStreetAsia $5.37B; 9M-2025 seed $110M, -72% YoY; H1 2025 229 deals, weakest in 6+ years; Singapore ~92% of H1 2025 funding | regional trackers | [49][50] | 2025-26 |
| MENA | 2025 $3.8B / 688 deals (+74%), international investors 49% of capital; Saudi $1.72B + UAE $1.58B = 86%; AI $858M / 194 deals | MAGNiTT via Arab News | [51] | 2025 |
| MENA H1 2026 | $1.35B, -22% YoY; 214 deals, -41%; lowest half-year since at least 2022 | MAGNiTT via Arab News | [52] | 2026 |
| Angels | ACA groups +12% to $491.3M in 2025 (bigger cheques, fewer companies); Canada C$113.79M / 490 deals, a five-year low (-22% capital, -20% deals) | ACA; NACO | [53][54][55] | 2026 |
| Secondaries | 71 tender offers in H1 2026, ~$3B, count +34% / value +200% YoY; ~70% Series C+; NPM ~50% of 2025 programs at Series A-C (from 30%) | Carta | [17][18] | 2026 |
| Accelerator terms | YC $500K = $125K uncapped SAFE for 7% + $375K uncapped MFN SAFE | Y Combinator | [16] | 2026 |
| Series A readiness | ~$2M ARR ($1M in a hot space growing fast), 100-150% growth, strong references | SaaStr / Lemkin | [65] | 2026 |
| AI capex cycle | capex-to-sales projected 34% (2026) and 37% (2028) vs ~32% at the dot-com peak | Gurley via Fortune | [61] | 2026 |

## Decision rules & rules of thumb
- **Under ~$4M raised on a rolling basis, use a cap-only post-money SAFE** — 93%+ of the market, so
  negotiate the cap, not the form [3][4][6].
- **If you take more than two SAFEs, model the stack before signing the third.** They are additive
  and the dilution lands on founders and employees; $1-2.4M raised already implies 19-20% [3][4].
- **If your cap is above what the next round can support, take less money at a lower cap** — you
  must grow into the cap or face a down round or a structured one (Gurley's "toxic" case) [62].
- **If you are not at ~$2M ARR growing 100%+, do not run a Series A process** — run a seed
  extension or an insider bridge instead (Lemkin) [65]. Bridges are normal: 16.6% of dollars [71].
- **If you can reach the next milestone without outside equity, do.** 86% of US venture dollars
  went to AI, so a non-AI company is competing for a shrinking pool [10][11].
- **If the business is Main Street or services, the ladder is credit, not equity.** Expect big-bank
  approval around 13-15% and plan for small banks, CDFIs or fintech lenders [30].
- **If you are US deep-tech or hardware, chase SBIR/STTR first** — non-dilutive, with a new $30M
  Phase II tier; budget schedule risk after the six-month lapse [31][32][33].
- **If you are UK-based, get SEIS/EIS advance assurance before you talk to angels.** SEIS £250K and,
  from 6 April 2026, EIS annual £10M / lifetime £24M (£20M/£40M knowledge-intensive) [36][37][38].
- **If you take venture debt, size it at 25-50% of the last equity round and draw it early.** Price
  warrant coverage and end-of-term fees as real cost; the covenants are what kill you [20][21].
- **If a term sheet is 1x non-participating with a 2-1-1 board, the economics are market.** Argue
  pay-to-play, redemption, accruing dividends and pool top-up instead [14][15][67].
- **If employees are 4+ years in and an IPO is not in sight, plan a tender** — H1 2026 tender value
  tripled year on year [17].
- **If choosing between crowdfunding and angels, ask what the cheque brings.** Reg CF caps at
  $5M/12 months, shrank 28% YoY, and buys a marketing asset and a long register — not advice
  [24][25][26].

## Process / steps
1. **Decide whether to raise.** Write the milestone the money buys and what happens without it. If
   the answer is "grow slower", price bootstrapping, RBF or debt first [59][60].
2. **Pick the ladder.** Venture (pre-seed → seed → A → B), calm capital (TinySeed-style), credit
   (bank/SBA/fintech), grants (SBIR, Innovate UK, EIC), crowd (Reg CF / Crowdcube), or a blend.
3. **Set the ask from the milestone:** cost to reach the next funding-grade milestone (e.g. $1-2M
   ARR in 12-18 months for an AI app company) plus 3-6 months of slack [72][73].
4. **Choose the instrument.** Under ~$4M rolling: post-money SAFE, cap only. Above that, or with a
   lead setting price: a priced round on NVCA/BVCA documents [3][6][67].
5. **Model the cap table before the first meeting** — stack every SAFE at its cap, add the pool
   top-up, check founder ownership against the ~56% / ~36% medians [55b].
6. **Build the data room one or two quarters early** — round story and use of proceeds, financials
   and model, fully diluted cap table, stage metrics, core legal [68][69][75].
7. **Warm the list for 1-2 quarters** with monthly investor updates; convert the warmest into the
   lead conversation [66].
8. **Run the process as a sprint.** Weeks 1-2: volume of first meetings, output a shortlist. Weeks
   3-6: shortlist into the data room, answer in hours. Rounds fill over 6-16 weeks [70].
9. **Negotiate economics and control separately** (price, preference, pool, vesting | board,
   protective provisions, drag) [67].
10. **Close, then keep the discipline:** convert SAFEs, update the cap table, file SEIS/EIS or
    equivalent, restart the investor-update cadence for the next round.
11. **Plan liquidity deliberately.** At Series C+ — earlier if retention demands it — run a
    company tender rather than ad hoc secondary sales [17][18].

## Worksheets, checklists & questions
- **Should we raise?** What milestone does the money buy? What is the plan without it? What
  percentage are we selling, at what implied next-round price?
- **Instrument choice:** rolling or fixed close? Is there a lead willing to set price? How many
  SAFEs are outstanding, at what caps?
- **Cap sanity test:** at this cap, what ARR/valuation must we hit in 18-24 months for the next
  round to be an up round — and is that plan credible?
- **Dilution model:** founders / employees / investors today → after all SAFEs convert → after the
  pool top-up → after the priced round. Compare to the 56% / 36% medians [55b].
- **Data room checklist:** round story and use of proceeds; 24-month model; historical financials;
  fully diluted cap table with all SAFEs; metrics pack (ARR, growth, retention, burn multiple,
  payback); incorporation; IP assignments; key contracts; option docs; debt and covenants
  [68][69][75].
- **Investor update (monthly):** headline metric, growth, cash and runway, three wins, three
  misses, one specific ask, one hire needed.
- **Term-sheet review:** preference multiple and participation; pay-to-play; redemption; accruing
  dividends; pool size and whether pre- or post-money; board; protective provisions; pro rata;
  drag-along; founder vesting reset [14][67].
- **Non-dilutive screen:** do we qualify for SBIR/STTR, Innovate UK, EIC Accelerator, SEIS/EIS
  relief for our investors, an SBA 7(a) loan, or a revenue-based facility? [27][31][34][36]
- **Debt covenant stress test:** at 70% of plan do we breach, what is the cure period, and what
  does the lender control on a breach?

## Regional notes
- **US.** Deepest and most concentrated: $412.7B in H1 2026, 86% to AI, 87.5% in $100M+ rounds
  [10][11][12]. Post-money SAFE + Delaware C-corp is the default stack; Reg CF allows $5M/12 months
  from the public [24]. Credit is the real channel for non-venture firms — SBA's June 2025 SOP cut
  ≤$500K approvals ~38% by count [27][28] and big banks approve ~13-15% of applications [30].
  SBIR/STTR is back after a six-month lapse, with a new $30M Phase II tier [31][33].
- **UK.** SEIS/EIS is the structural advantage: SEIS £250K per company (£350K gross), £200K per
  investor per year [36][37]; EIS rose on 6 April 2026 to £10M/year and £24M lifetime (£20M/£40M
  knowledge-intensive) [36][38]. Get advance assurance first — angels will ask. Crowdcube and
  Seedrs are mainstream (£100K-£500K raises, ~7.5% commission) under FCA rules shifting toward a
  formal public-offer regime [39]; the British Business Bank underwrites much of the supply [37].
- **EU.** Europe raised ~$44B in 2025 and $44.5B in H1 2026 against a $375B decade-long gap and a
  government-heavy capital base [40][41]. The EIC Accelerator is the flagship non-dilutive route —
  €634M in 2026, grants to €2.5M plus possible equity [34][35] — but slow: a parallel track, not
  the plan.
- **Africa / Nigeria.** 2025 rebounded to $4.1B (+25%), but the growth was **debt**: $1.64B, +63%
  [42]. Nigeria raised $572M across 102 deals in 2025 (-3%) [42], fell to $78.6M in Q1 2026 (-28%
  YoY) [44], then reclaimed the top *equity* spot in H1 2026 with $214M equity / $254M total [43];
  Africa-wide, debt raised more than twice as much as equity in Q1 2026 [45]. FX is the structural
  term-sheet issue — naira revenue against dollar capital, so investors price devaluation and ask
  for dollar-linked contracts [44]. The Nigeria Startup Act gives labelled startups three years of
  tax relief (+2 via NIPC) and mandates ≥₦10bn a year to the Startup Investment Seed Fund, but
  labelling and access remain bottlenecked [46][47].
- **India.** ~$16B of VC and growth capital in 2025, a second consecutive year of growth, led by
  fintech and SaaS with AI cross-cutting, and improving exits on strong public markets [48].
  Domestic capital plus IPO exits make India less dependent on US risk appetite than most peers.
- **Southeast Asia.** Barbelled and shrinking at the bottom: 2025 counted between $5.37B and $8B
  depending on the tracker; seed fell 72% to $110M over the first nine months of 2025 while
  late-stage rose; H1 2025 had 229 deals, the weakest in six years; Singapore took ~92% of H1 2025
  dollars [49][50]. Plan to domicile in Singapore and to raise smaller, for longer.
- **Gulf / MENA.** 2025 was a record: $3.8B across 688 deals (+74%), Saudi ($1.72B) and the UAE
  ($1.58B) taking 86%, international investors supplying 49% of capital [51]. H1 2026 reversed —
  $1.35B (-22%) across 214 deals (-41%), the weakest half since at least 2022 [52]. Sovereign-linked
  funds dominate; a local entity and a regional commitment are usually preconditions for the cheque.

## AI-era notes
- **AI is the market, not a sector.** 86% of US venture dollars in H1 2026 and 42.5% of Q1 2026
  deal count [10][11]; globally AI took $212B in 2025, +85% YoY [13]. If you are not AI-native,
  assume a smaller pool and a longer process.
- **The concentration is structural, not a cycle.** Deal counts sit at their lowest since 2018 even
  as dollars hit records [74] — a record headline is not evidence your seed round got easier.
- **"AI" is table stakes; efficiency is the differentiator.** 2026 seed diligence centres on burn
  multiple, gross margin after inference cost, and a credible $1-2M ARR milestone [72][73].
- **AI lowers the cost of building, which changes the ask.** Smaller teams reach revenue, so raise
  what your traction justifies; capital efficiency is a pitch asset, not an apology [72].
- **AI helps you run the raise.** Deck narrative, data-room assembly and Q&A, monthly investor
  updates and SAFE-stack modelling are all assistant-tractable — and 2026 data-room guidance
  assumes near-instant diligence responses [68][70].
- **Where the hype outruns the evidence.** (a) *Bubble risk is named by insiders*: Gurley projects
  AI capex-to-sales above dot-com peaks and the classic overinvestment → overcapacity → price
  collapse sequence [61][62]. (b) *A high cap is not validation* — it is a hurdle for the next
  round [62]. (c) *Retail access to private AI deals* is being marketed hard; Gurley warns against
  it [63]. (d) No reliable public evidence yet that AI-assisted diligence raises investor hit
  rates — treat "AI-native VC" claims as marketing.

## The minds

| Person | Affiliation | Key contribution | Where to read |
|---|---|---|---|
| Peter Walker | Head of Insights, Carta | The primary-data voice on rounds, SAFEs, caps, dilution and graduation rates; publishes quarterly [1][2][7][8][9] | Carta Data Desk; LinkedIn; *The Product Market Fit Show* (2025-26) |
| Brad Feld | Foundry Group | Split the term sheet into economics vs control; the founder's standard reference [67] | *Venture Deals* (4th ed., 2019); feld.com |
| Jason Lemkin | SaaStr / SaaStr Fund | The current Series A bar and the 2025-26 bifurcation of the funding market [64][65] | saastr.com (2024-26) |
| Elizabeth Yin | Hustle Fund | Pre-seed underwriting on execution speed; deliberately small fund sizes [57][58] | elizabethyin.com; Sacra interview |
| Rob Walling | TinySeed, MicroConf | Stair-step bootstrapping and "calm capital" as a legitimate alternative ladder [59][60] | robwalling.com; *The SaaS Playbook* |
| Bill Gurley | Benchmark | The AI capital-cycle warning; toxic valuations; scepticism on retail VC access [61][62][63] | Above the Crowd; BG2 podcast (2025-26) |
| Mark Suster | Upfront Ventures | "Land and expand" investor relationships; fundraising as a decade-long trust sale [66] | Both Sides of the Table |
| Fred Wilson | Union Square Ventures | Longest-running VC blog; annual predictions and seed-market commentary (2026 posts focus on consumer crypto UX) | avc.com |
| Garry Tan | Y Combinator | Steward of the $500K standard deal and the post-money SAFE that the whole pre-seed market copies [16] | ycombinator.com/blog |
| Partech Africa team | Partech | The annual Africa Tech VC Report — the reference series for African equity and debt volumes [42] | partechpartners.com/africa-reports |
| Africa: The Big Deal | independent tracker | Half-yearly and monthly African funding counts used across African media [43] | via African Business, TechBuild Africa |
| MAGNiTT | MAGNiTT | The MENA venture data standard, quarterly [51][52] | magnitt.com/research |
| Atomico | Atomico | State of European Tech — the European funding-gap argument [40] | stateofeuropeantech.com via Sifted |
| Bain India VC team | Bain & Company | India Venture Capital Report — annual India totals and exit picture [48] | bain.com/insights |
| Cooley (venture practice) | Cooley LLP | Quarterly Venture Financing Report — the term-sheet fact base (preference, pay-to-play, redemption) [14][15] | cooley.com / cooleygo.com/data |

## Pitfalls
- **Stacking post-money SAFEs without modelling them** — percentages add, and founders find out
  only at the priced round [3][4][55b]. **Optimising the cap instead of the business** is the twin
  error: a cap you cannot grow into becomes a down round, a pay-to-play or a recap [14][62].
- **Reading record headline funding as a healthy market.** Dollars are at records while deal counts
  sit at multi-year lows and 87.5% of capital goes to $100M+ rounds [11][14][74].
- **Calling a seed extension a Series A** — graduation at 24 months is 14-17%, and investors price
  the gap to the ~$2M ARR bar precisely [7][65].
- **Treating venture debt as free**, and concentrating cash plus debt with one venture lender —
  the covenant, not the coupon, ends companies, and that was the 2023 SVB failure mode [19][20][21].
- **Launching a Reg CF raise as the fundraising plan.** The channel shrank 28% YoY in Q1 2026 and
  works best as a community event on top of a lead [24][25].
- **Ignoring the option pool in the "pre-money" number** — a pre-money top-up is a price cut, and
  it is why founders hold ~36% after a Series A that nominally sold ~20% [55b][67].
- **Missing SEIS/EIS advance assurance (UK) or startup labelling (Nigeria)** before approaching
  local investors — both gate the money, and both take weeks [36][46][47].
- **Building the data room after the first meeting**, and selling secondary shares ad hoc instead
  of running a tender — both read as disorganisation and set awkward marks [17][18][68][70].

## Key terms
`post-money SAFE` — YC's 2018 revision: the investor's percentage is fixed at signing, so SAFEs
dilute founders additively rather than diluting each other.
`valuation cap` — the maximum conversion valuation on a SAFE or note; the main negotiated term.
`MFN (most-favoured-nation)` — an uncapped, undiscounted SAFE that adopts the best terms issued
before the next priced round; the form of YC's $375K tranche.
`pay-to-play` — forces existing investors to join a new round or lose preferred rights; 7.3% [14].
`redemption right` — lets an investor make the company buy its shares back; 6.1% of deals [14].
`participating preferred` — preference plus a share of remaining proceeds ("double dip"); rare,
since 96.4% of Q1 2026 rounds were non-participating [14].
`bridge / extension` — capital between priced rounds, usually a SAFE or note at or near the last cap.
`warrant coverage` — the equity warrants a venture lender takes, as a percentage of the drawn loan.
`revenue-based financing (RBF)` — repaid as a fixed percentage of monthly revenue to a cap multiple;
non-dilutive, expensive, and now a consolidated market.
`tender offer` — a company-run liquidity event letting employees and early investors sell a portion
of their shares at a set price.
`Reg CF` — US Regulation Crowdfunding: up to $5M per issuer per 12 months from the public via a
registered portal.
`SEIS / EIS` — UK tax-relief schemes that make early angel investment much cheaper for the investor.
`graduation rate` — the share of a seed cohort raising a Series A within a given window.
`burn multiple` — net burn divided by net new ARR; the efficiency metric 2026 investors lead with.

## Build ideas for the app
- **SAFE Stack Modeller** — each SAFE's amount, cap, discount, type (pre/post/MFN) + planned round
  and pool top-up → fully diluted cap table at conversion, ownership split against the ~56% / ~36%
  medians [55b], and a warning when the cap looks unreachable.
- **Round Sizer** — current metrics, target milestone, burn, hiring plan → recommended raise,
  runway, implied cap range from Carta's by-round-size medians [3][6], and the ARR the next round
  will demand.
- **Funding Ladder Router** — country, sector, revenue, growth, assets, dilution appetite → a ranked
  ladder (bootstrap / grant / bank-SBA / RBF / venture debt / angel / VC / crowd) with local
  programmes (SBIR, Innovate UK, EIC, SEIS/EIS, Nigeria Startup Act) [27][31][34][36][46].
- **Term Sheet Checker** — pasted terms → each clause scored against Cooley's 2026 norms (1x 98.2%,
  non-participating 96.4%, pay-to-play 7.3%, redemption 6.1%) with negotiation priority [14][15].
- **Data Room Builder** — stage and entity type → tailored checklist, completeness score, shareable
  diligence index [68][69][75].
- **Investor Update Engine** — monthly metrics from the app's own data → a drafted update (metric,
  growth, runway, wins, misses, ask) plus a cadence, feeding the "land and expand" warm-up [66].
- **Raise Sprint Tracker** — investor list and conversation stages → a 6-week pipeline board with
  conversion ratios, response-time alerts and a 6-16 week close forecast [70].
- **Regional Benchmark Lens** — country and stage → local round sizes, dilution, active investor
  types and FX cautions (e.g. naira revenue vs dollar capital), from Partech, MAGNiTT, Bain and
  Atomico [40][42][44][48][51].

## Sources
[1] State of Private Markets: 2025 in Review — Carta — 2026 — https://carta.com/data/state-of-private-markets-q4-2025/
[2] VC Startup Fundraising Benchmarks From 1,000 Rounds — Carta — Jul 2026 — https://carta.com/data/linkedin-vc-fundraising-benchmarks-2026/
[3] State of Pre-Seed: 2025 in Review — Carta — 2026 — https://carta.com/data/state-of-pre-seed-2025/
[4] Carta State of Pre-Seed 2025 Explained (secondary summary of [3]) — VC Lens — 2026 — https://vclens.substack.com/p/carta-state-of-preseed-2025-explained
[5] State of Pre-Seed: Q1 2026 — Carta — 2026 — https://carta.com/data/state-of-pre-seed-q1-2026/
[6] SAFE Valuation Caps in 2026 (citing Carta Q2 2026) — Finro — 2026 — https://www.finrofca.com/news/safe-valuation-caps-2026
[7] What Is a Good Seed to Series A Graduation Rate — Carta — https://carta.com/data/linkedin-seed-to-series-a-graduation-rates/
[8] Series A in 2026: What the Data Says You Actually Need (Peter Walker, Carta) — The Product Market Fit Show — 2026 — https://www.pmf.show/blog/series-a-2026-benchmarks-venture-capital-trends
[9] What the Data Actually Says About Pre-Seed Right Now, with Peter Walker — Sierra Ventures — 2026 — https://www.sierraventures.com/ascend/what-the-data-actually-says-about-pre-seed-right-now-with-peter-walker
[10] Q2 2026 PitchBook-NVCA Venture Monitor — NVCA/PitchBook — Jul 2026 — https://nvca.org/wp-content/uploads/2026/07/Q2-2026-PitchBook-NVCA-Venture-Monitor.pdf
[11] The Q2 2026 Venture Monitor: Record Numbers, Narrow Recovery — NonPublic — 2026 — https://www.nonpublic.com/resources/the-q2-2026-venture-monitor-record-numbers-narrow-recovery
[12] US Venture Hits $412.7B in H1 2026, AI Takes 86% — AI Weekly — 2026 — https://aiweekly.co/alerts/us-venture-hits-4127b-in-h1-2026-ai-takes-86
[13] Q1 2026 Shatters Venture Funding Records As AI Boom Pushes Startup Investment To $300B — Crunchbase News — 2026 — https://news.crunchbase.com/venture/record-breaking-funding-ai-global-q1-2026/
[14] Q1 2026 Venture Financing Report — Cooley — Apr 2026 — https://www.cooley.com/news/insight/2026/2026-04-29-q1-2026-venture-financing-report
[15] Q4 2025 Venture Financing Report — Cooley — Feb 2026 — https://www.cooley.com/news/insight/2026/2026-02-09-q4-2025-venture-financing-report
[16] YC's $500,000 Standard Deal — Y Combinator — https://www.ycombinator.com/blog/ycs-500-000-standard-deal
[17] Tender-Offer Activity Reaches a Four-Year High (H1 2026) — Carta — 2026 — https://carta.com/data/tender-offer-update-h1-2026/
[18] How VC secondaries became a 'release valve' for startup liquidity pressures — Carta — 2025 — https://carta.com/data/vc-secondary-trends-q2-2025/
[19] Navigating the Venture Debt Market Post-SVB Collapse — Queen's Business Review — https://www.queensbusinessreview.com/articles/navigating-the-venture-debt-market-post-svb-collapse
[20] Venture Debt and Recurring Revenue Loans in 2026: A Founder's Guide — Beancount.io — May 2026 — https://beancount.io/blog/2026/05/14/venture-debt-recurring-revenue-loans-series-a-b-startups-runway-extension-warrant-coverage-mrr-financing-non-dilutive-growth-capital-guide
[21] Venture Debt Playbook: Active Lenders & Terms Post-SVB — StartupFundraising — https://startupfundraising.com/venture-debt-fundraising
[22] Pipe Layoffs 2025: 200 Employees Affected in Fintech Restructuring (secondary) — InterviewPal — 2025 — https://www.interviewpal.com/layoffs/pipe
[23] Capchase vs Pipe vs Clearco: SaaS & eCommerce Revenue-Based Financing (2026) — Elite Funders — https://elitefunders.com/compare/capchase-vs-pipe-vs-clearco
[24] Wefunder vs Republic vs StartEngine: Which Raises More? — Angel Investors Network — 2026 — https://angelinvestorsnetwork.com/market-analysis/wefunder-vs-republic-vs-startengine-for-raising-capital
[25] StartEngine Review 2026 — Angel Investors Network — 2026 — https://angelinvestorsnetwork.com/capital-raising/startengine-review-2026-equity-crowdfunding-platform
[26] Equity Crowdfunding Trends 2026 — GECA — 2026 — https://thegeca.org/blogs/equity-crowdfunding-trends-2026-coordinated-capital-regulation-ai-liquidity/
[27] 7 SBA Rule Changes in 2025 That Will Decide Your 2026 Loan Approval — FastWaySBA — https://www.fastwaysba.com/blog/7-sba-rule-changes-in-2025-that-will-decide-your-2026-loan-approval
[28] SBA 7(a) Loan Data & Program Performance: FY2026 Analysis — Lumos — 2026 — https://www.lumosdata.com/blog/sba-7a-program-performance-fy2026
[29] FY 2026 Loan Fees and Clarification of Fee Calculation — NAGGL — 2025 — https://www.naggl.org/fy-2026-loan-fees-and-clarification-of-fee-calculation-for-multiple-wcp-or-ewcp-loans/
[30] Small Business Loan Approval Rate Statistics: What the Data Says in 2026 (Biz2Credit-derived, secondary) — Crestmont Capital — https://www.crestmontcapital.com/blog/small-business-loan-approval-rate-statistics
[31] SBIR/STTR Programs Reauthorized After Six-Month Lapse — Crowell & Moring — Apr 2026 — https://www.crowell.com/en/insights/client-alerts/sbirsttr-programs-reauthorized-after-six-month-lapse
[32] The SBIR restart won't be easy — Federal News Network — Apr 2026 — https://federalnewsnetwork.com/commentary/2026/04/the-sbir-restart-wont-be-easy/
[33] SBIR/STTR Reauthorization (S. 3971): Strategic Breakthrough awards — Granted AI — 2026 — https://grantedai.com/blog/sbir-sttr-reauthorization-s-3971-april-2026-strategic-breakthrough-30-million-foreign-affiliation-proposal-caps-strategy
[34] EIC 2026 Work Programme — European Innovation Council — 2026 — https://eic.ec.europa.eu/eic-funding-opportunities/eic-2026-work-programme_en
[35] EIC Accelerator: funding, grants, deadlines 2025-2026 — Euro-Funding — https://euro-funding.com/en/eic-accelerator/
[36] Using EIS and SEIS to attract investment following Finance Act 2026 — Farrer & Co — 2026 — https://www.farrer.co.uk/news-and-insights/using-eis-and-seis-to-attract-investment-the-benefits-and-some-traps-to-avoid/
[37] What is the Seed Enterprise Investment Scheme (SEIS)? — British Business Bank — https://www.british-business-bank.co.uk/business-guidance/guidance-articles/finance/what-is-the-seed-enterprise-investment-scheme-seis
[38] UK Budget 2025: Support for Scale-Ups — Wilson Sonsini — 2025 — https://www.wsgr.com/en/insights/uk-budget-2025-support-for-scale-ups.html
[39] UK Crowdfunding Guide: Kickstarter, Crowdcube, Seedrs (2026) — UK Startup — https://www.ukstartup.co.uk/funding/crowdfunding
[40] 10 key findings from Atomico's State of European Tech report — Sifted — 2025 — https://sifted.eu/articles/state-european-tech-report-2025
[41] European startup funding this quarter (2026) — Causo Hub — 2026 — https://hub.causo.ai/guides/european-startup-funding-this-quarter
[42] 2025 Partech Africa Tech VC Report: African tech funding rebounds to US$4.1B — Partech — Feb 2026 — https://partechpartners.com/news/2025-partech-africa-tech-vc-report-african-tech-funding-rebounds-to-us41b-driven-by-record-debt-activity-and-disciplined-equity-growth
[43] Egypt leads Africa's start-up funding revival as Nigeria regains momentum — African Business — Jul 2026 — https://african.business/2026/07/innov-africa-deals/egypt-leads-africas-start-up-funding-revival-as-nigeria-regains-momentum
[44] Nigerian startup funding falls 28% YoY to $78.6m in Q1 2026 — Nairametrics — Apr 2026 — https://nairametrics.com/2026/04/23/nigerian-startup-funding-falls-28-yoy-to-78-6m-in-q1-2026/
[45] Debt boom lifts Africa startup funding to $600m in Q1 2026 — BusinessDay NG — 2026 — https://businessday.ng/technology/article/debt-boom-lifts-africa-startup-funding-to-600m-in-q1-2026/
[46] The Nigeria Startup Act and Its Incentives — Mondaq — https://www.mondaq.com/nigeria/corporate-and-company-law/1462372/empowering-innovation-and-fostering-investment-the-nigeria-startup-act-and-its-incentives
[47] NITDA Moves to Accelerate Implementation of Nigeria's Startup Act Incentives — TechAfrica News — Aug 2026 — https://techafricanews.com/2026/08/14/nitda-moves-to-accelerate-implementation-of-nigerias-startup-act-incentives/
[48] India Venture Capital Report 2026 — Bain & Company — 2026 — https://www.bain.com/insights/india-venture-capital-report-2026/
[49] The State of the Startup Ecosystem in Southeast Asia 2026 — Second Talent — 2026 — https://www.secondtalent.com/resources/state-of-startup-ecosystem-sea/
[50] Southeast Asia's Startup Funding Navigates Turbulent Waters Amid Market Transformation — Thailand Business News — https://www.thailand-business-news.com/finance/274979-capital-sea-southeast-asias-startup-funding-navigates-turbulent-waters-amid-market-transformation
[51] Startup Wrap: MENA startup funding stands at $1.7bn in H1 2026 (MAGNiTT data) — Arab News — 2026 — https://www.arabnews.com/node/2651443/business-economy
[52] Regional conflict drags MENA startup funding down 22% (MAGNiTT data) — Arab News — 2026 — https://www.arabnews.com/node/2650728/business-economy
[53] Building a Stronger Angel Ecosystem: 2025 Impact and 2026 Priorities — Angel Capital Association — 2026 — https://angelcapitalassociation.org/blog/building-a-stronger-angel-ecosystem-2025-impact-and-2026-priorities/
[54] Angel Group Rankings and Market Data 2026 — Angel Investors Network — 2026 — https://angelinvestorsnetwork.com/angel-investing/angel-group-rankings-market-data-2026
[55] Early-stage angel investing falls to five-year low (NACO data) — The Globe and Mail — May 2026 — https://www.theglobeandmail.com/business/article-early-stage-angel-investing-report-national-angel-capital-organization/
[55b] A 20% Series A Cannot Take You From 56% to 36% (Carta ownership data, secondary analysis) — Capitaly — 2026 — https://capitaly.substack.com/p/a-20-series-a-cannot-take-you-from
[56] Angel Investing in 2026: Why Community-Led Models Are Outperforming — Hustle Fund — 2026 — https://www.hustlefund.vc/post/angel-squad-angel-investing-in-2026-why-community-led-models-are-outperforming
[57] Elizabeth Yin on early-stage valuations in a frothy market — Sacra — https://sacra.com/p/elizabeth-yin-hustlefund-interview/
[58] Tactical fundraising essays — Elizabeth Yin — https://elizabethyin.com/
[59] The Stair Step Method of Bootstrapping (classic, 2015; still taught 2026) — Rob Walling — https://robwalling.com/essays/2015/03/26/the-stair-step-method-of-bootstrapping
[60] How Rob Walling Built an Empire Without Venture Capital (TinySeed terms; secondary) — Startup Anatomy — 2026 — https://startupanatomy.substack.com/p/how-rob-walling-built-an-empire-without
[61] Is AI a bubble? Bill Gurley on running out of money — Fortune — Mar 2026 — https://fortune.com/2026/03/17/is-ai-bubble-bill-gurley-run-out-of-money
[62] Benchmark's Bill Gurley: the AI bubble is about to burst — Yahoo Finance — 2026 — https://finance.yahoo.com/news/benchmark-bill-gurley-ai-bubble-172307387.html
[63] Bill Gurley on hyper-curiosity, AI and warnings on retail VC access — TBPN Digest — Feb 2026 — https://www.tbpndigest.com/story/2026-02-24/bill-gurley-on-running-down-a-dream-hyper-curiosity-as-a-career-edge-ai-as-a-superpower-for-self-learners-and-warnings-on-retail-vc-access
[64] VC Funding in the AI Era: What's Actually Getting Funded — SaaStr (Jason Lemkin) — 2025 — https://www.saastr.com/new-saastr-ai-live-with-jason-lemkin-vc-funding-in-the-ai-era-whats-actually-getting-funded-in-2025-and-why-your-b2b-startup-might-be-left-behind/
[65] Dear SaaStr: When is a Startup Ready to Raise Venture Capital These Days? — SaaStr — https://www.saastr.com/dear-saastr-when-is-a-startup-ready-to-raise-venture-capital-these-days/
[66] How to Improve Your Odds of Getting to Yes with a VC — "Land and Expand" — Mark Suster, Both Sides of the Table — https://bothsidesofthetable.com/how-to-improve-your-odds-of-getting-to-yes-with-a-vc-land-and-expand-b46a0a102a07
[67] Venture Deals: Be Smarter Than Your Lawyer and Venture Capitalist (4th ed., 2019) — Brad Feld & Jason Mendelson — https://venturedeals.com/
[68] How to Build a VC Data Room for Your Fundraise — Burkland — May 2026 — https://burklandassociates.com/2026/05/12/how-to-build-a-vc-data-room-for-your-fundraise/
[69] Data Room Setup: How to Prepare for Fundraising — CRV — https://www.crv.com/content/data-room-setup
[70] The Q1 Sprint: Your 6-Week Fundraising Timeline for Early 2026 — Equidam — 2026 — https://www.equidam.com/q1-sprint-2026-fundraising-timeline-strategy-planning/
[71] Down rounds 2026: the real rate, source by source — Causo Hub — 2026 — https://hub.causo.ai/guides/down-rounds-and-bridges-this-year-2026
[72] How to Raise Money for an AI Startup in 2026 (Playbook) — Waveup — 2026 — https://waveup.com/blog/how-to-raise-money-for-ai-startup/
[73] AI Startup Fundraising Trends 2026 (Seed to Series B) — Eqvista — 2026 — https://eqvista.com/ai-startup-fundraising-trends/
[74] AI Venture Funding 2026: Where the $242 Billion Went — Digital Applied — 2026 — https://www.digitalapplied.com/blog/ai-venture-funding-2026-where-242b-went-data-atlas
[75] The Ultimate Startup Data Room Checklist: What to Include in 2026 — Papermark — 2026 — https://www.papermark.com/blog/startup-data-room-checklist
