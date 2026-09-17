# S12 — Exit, liquidity and valuation (2026 layer)
Supplements: `13-harvest-and-exit.md` (harvest mechanisms, M&A, ESOP, MBO, timing),
`C-valuation.md` (the eight valuation methods — the appendix gives **no** multiple or discount-rate
defaults beyond two illustrative P/Es) and `09-going-public.md` (IPO candidacy, underwriting,
lockups), plus stage 8 of `00-journey-map.md`. The book was written in a 2016-17 market: IPOs were
shut to most companies, secondaries were a curiosity, "acquihire" was a footnote and search funds
were a Stanford niche. Load when a user asks "what is my company worth", "should I sell", "how do I
get cash out without selling", "who buys businesses like mine", or "how do I shut this down".

## What changed since 2018
- **The IPO window reopened, then punished the late buyers.** 202 US IPOs raised $44.0B in 2025,
  +35% on count and +49% on proceeds — the busiest year since 2021 [1]; Renaissance projects 200-230
  deals and $40-60B for 2026 [2]. The 2025 class split violently: CoreWeave +130% from its debut and
  Circle +62%, against Klarna −26% from its $40 IPO price and Chime −25%; Figma popped ~250% on day
  one then fell from a $143 peak to $73 by late December [3].
- **Exit is now an AI story.** 40% of 2025 US VC exit value traced to AI, across a record 317 AI
  exits [4]. Q2 2026 produced the most billion-dollar venture-backed exits since 2021 and the
  largest venture-backed exit ever (SpaceX) [6].
- **M&A, not IPO, is still the harvest — and it got enormous.** Announced global M&A hit a record
  $2.8T in H1 2026, +48% YoY and the highest first half since LSEG began tracking in 1980;
  technology led with $649B [8][9].
- **Time to exit roughly doubled.** Median time to IPO for tech companies is now ~11.5 years and 45%
  of unicorns have sat in portfolios nine years or more [5]. The book's Figure 9-1 trend never
  flattened.
- **Liquidity decoupled from exit.** A record 16,538 employees sold shares in Carta-administered
  tender offers in 2025 [11], and Carta ran 71 tenders worth ~$3B in H1 2026 alone — count +34% and
  value +200% YoY [10]. Secondary tenders totalled ~$35B in 2025 against ~$45B of IPO proceeds [13].
- **Continuation funds became a real exit route.** Global secondaries reached $240B in 2025 (+48%),
  of which GP-led was $116B [15][16]; continuation vehicles were 77-89% of GP-led volume [15][16],
  and forecasters expect 30-40% of all PE exits to run through them in 2026-27 [17].
- **The "reverse acquihire" was invented to sidestep merger review.** Between March 2024 and January
  2026 Google, Microsoft, Amazon and Meta spent over $20B hiring founding teams and licensing models
  without buying the companies [19].
- **Buying a business became a mainstream entrepreneurial path.** The Stanford search-fund study
  reports 33.9% aggregate IRR and 4.75x ROI across US/Canada funds since 1984 [35][36], and the
  non-US universe grew from 83 funds in 2018 to 503 by end-2025 [37].

## Core ideas (current consensus)
- **Sell at a local maximum, not a global one** — Jason Lemkin, SaaStr: you cannot time the peak, so
  sell when your own metrics and the category are both momentarily favourable [60].
- **The old SaaS exit ladder is broken.** Lemkin (Oct 2025): build to $20-50M ARR and a strategic or
  PE buyer appears — "not anymore"; software clears nearer 15x EBITDA than 25x, and 46% of Q2 2025
  SaaS M&A was vertical SaaS with embedded workflows [59].
- **Staying private is a gift and a curse** — Bill Gurley (2025): long private lives concentrate
  founder and employee wealth in illiquid paper while no one in the chain has an incentive to mark
  it accurately [70].
- **Valuation is triangulation, and the multiple comes from the market, not the model** — the
  handbook's rule survives, but the modern spread is enormous: the SaaS Capital Index median read
  3.8x ARR in July 2026 while the market-cap-weighted BVP Emerging Cloud Index read 6.3x [47][48].
- **Discount rates must be built, not borrowed** — Damodaran (2026): the forward-looking US equity
  risk premium was 4.23% at the start of 2026, while historical averages would say anywhere from
  5.5% to 14.5% depending on window and method [52][53].
- **Hold forever is a strategy** — Brent Beshore, Permanent Equity: ~30-year funds, little debt, no
  intention to sell, so the question becomes "who should own this next" [71]. Andrew Wilkinson built
  Tiny to 35+ businesses on the same decentralised holdco logic [73].
- **Employee ownership is the exit nobody pitches you.** 6,609 US ESOPs cover 15.1M participants and
  $2.1T of assets [41][42]; the UK reached 2,824 employee-owned businesses by March 2026, ~500 of
  them transitioning in 2025 alone [43].

## Frameworks & playbooks

| Framework | Author / year | What it says | Use when |
|---|---|---|---|
| Local-maximum selling | Jason Lemkin, SaaStr (2024-25) | You will not catch the top; sell when growth, category sentiment and a willing buyer coincide, not when you feel finished [60] | Any inbound offer; deciding whether to run a process |
| "Who will buy the SaaS companies?" screen | Lemkin, SaaStr (Oct 2025) | Strategics tuck in less; PE buys only category leaders with AI attach and a path to 40%+ EBITDA; vertical SaaS with switching costs is the bid [59] | Positioning software for sale 12-24 months out |
| Tender offer / structured secondary | Carta practice (2025-26) | Company-sanctioned, capped, priced sale window; median third-party cap 20% of holdings for employees and ex-employees [11][12] | Giving the team liquidity without an exit |
| Continuation vehicle (GP-led) | Secondaries practice; Lazard, Kroll (2025-26) | The fund sells the asset to a new vehicle it also manages; LPs choose cash or roll [15][17] | Investor-driven "we need liquidity but not a sale" |
| Reverse acquihire / licence-and-hire | Big Tech 2024-26 (Inflection, Character.AI, Windsurf, Scale) | Non-exclusive licence + hiring the founding team; the shell survives with a payout to holders [19][23] | Understanding a non-acquisition offer and its regulatory and fairness risk |
| Search fund / ETA | Stanford GSB (Kelly, Zenios, Ng, 2026); Deibel (2018) | Raise search capital, buy one profitable SMB, operate it; aggregate IRR 33.9%, ROI 4.75x since 1984 [35][36][72] | The buyer across the table in an SMB sale; or your own next act |
| Holdco / permanent capital | Brent Beshore (Permanent Equity), Andrew Wilkinson (Tiny) | Buy durable cash-generating businesses, minimal leverage, no forced exit, decentralised management [71][73] | Sellers who want continuity over maximum price |
| AI-enabled roll-up | General Catalyst, Thrive, Elad Gil et al. (2023-26) | Buy fragmented labour-intensive services at 5-15% margins, automate 30-70% of workflows, compound via acquisition [61][62] | Services owners; also a warning about future competitors |
| Berkus method | Dave Berkus (1990s, still standard) | Up to $500K each for prototype, team, customer, financial performance, advisors — ~$2M cap pre-revenue [55] | Pre-revenue with no comparable |
| Scorecard / Bill Payne method | Bill Payne | Weight against regional comparables: team 25%, opportunity 20%, product/tech 18%, sales/marketing 15%, funding need 10%, other 10% [55] | Angel-stage priced rounds |
| VC method | Classic (Sahlman); still taught 2026 | Terminal value ÷ required return, discounted at 30-70% by stage, adjusted for expected dilution [54] | Seed to Series A where an exit value is imaginable |
| DCF for young firms | Damodaran, *Valuing Young or Start-Up Firms* + annual data updates | Forecast to a stable state, build the discount rate from a current ERP, decay the cost of capital toward the mature-market number [52][54] | Growing firms a current-earnings multiple would undervalue |
| Deal-points benchmarking | ABA Private Target M&A Deal Points Study (2025 ed.) | Earnouts 18%, RWI 63%, no-survival 41% in middle-market deals — negotiate against the distribution, not anecdote [57][58] | Reading an LOI or SPA |
| Structured wind-down | SimpleClosure (2024-26); Carta dissolution guides | Board/stockholder approval → employee and creditor notice → asset sale → dissolution filings → final tax returns [45][46] | When the answer is "close it" |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| **Small-business cash-flow (SDE) multiple** | **2.7x** (2.61x in 2025, +1%) | US Main Street, BizBuySell closed deals | [33][31] | 2026 / 2025 |
| **Small-business revenue multiple** | **0.7x** (0.69x in 2025) | same | [33][31] | 2026 / 2025 |
| Small-business multiples by sector | earnings 2.0-3.3x (avg 2.58x); revenue 0.42-1.2x (avg 0.67x) | BizBuySell sector tables | [32] | 2025-26 |
| Median small-business sale price | $349,250 (−1% YoY); $350,000 in 2025, at 94% of asking | BizBuySell | [33][31] | 2026 / 2025 |
| **Public SaaS revenue multiple (equal-weighted median)** | **3.8x ARR** (3.2x in June 2026, a decade low) | SaaS Capital Index | [47] | Jul 2026 |
| **Public cloud multiple (market-cap weighted)** | **6.3x** | BVP Nasdaq Emerging Cloud Index | [48] | 2026 |
| Private SaaS multiple | median 4.5x; equity-backed 5.3x vs bootstrapped 4.8x | SaaS Capital survey | [47] | 2026 |
| **AI M&A EV/Revenue** | **mean 24.5x, median 13.1x** | AI acquisitions dataset | [49] | 2026 |
| AI multiples by type | foundation models ~37.5x; AI-native SaaS 25-30x; applications 8-20x | secondary aggregation of public and private comps | [49][50] | 2026 |
| AI sale reality check | defensible 8-12x revenue; narrative-only 3-5x | advisor observation | [51] | 2026 |
| Micro-SaaS / online business | ~2.85-6.13x annual profit; Empire Flippers ~40-50x monthly profit (≈3.3-4.2x annual) | Acquire.com / Flippa / Empire Flippers, secondary summary | [63][64] | 2025-26 |
| **VC-method discount rate** | **30-70%**, highest at pre-seed/seed, falling by stage | standard practice, secondary summary | [54] | 2026 |
| **Equity risk premium (forward-looking)** | **4.23%** at 1 Jan 2026; 4.45% US / 4.17% mature-market in July 2026 | Damodaran | [52][53] | 2026 |
| 409A common-vs-preferred | common ~10-30% of preferred at seed → 45-70% late stage; DLOM 20-35% at seed | 409A practice summary | [56] | 2026 |
| Earnouts in private-target deals | 18% (from 26% in the 2023 study) | ABA, deals $25M-$900M, CY2024-Q1 2025 | [57][58] | 2025 |
| Rep & warranty insurance / no-survival | RWI 63% (55% in 2023, 29% in 2016-17); no survival of reps 41% (from 30%) | same | [57][58] | 2025 |
| **Median time to IPO (tech)** | **11.5 years**; 45% of unicorns held ≥9 years | PitchBook | [5] | 2025 |
| US IPOs | 202 raising $44.0B (+35% count, +49% proceeds); 2026 forecast 200-230 deals, $40-60B | Renaissance Capital | [1][2] | 2025-26 |
| IPO lockup | 180 days standard; some issuers hard-wire shorter, early releases increasingly negotiated | Cooley | [18] | 2025 |
| Global announced M&A | record $2.8T in H1 2026, +48% YoY; technology $649B | LSEG data in mid-year reviews | [8][9] | 2026 |
| Unicorn M&A | 36 deals, $67B (all-time high); largest Wiz-Alphabet $32B | Crunchbase | [7] | 2025 |
| **Employees selling in tender offers** | **16,538** (record); 20% were former employees | Carta-administered tenders | [11] | 2025 |
| Tender offers administered | 71 in H1 2026, ~$3B; count +34%, value +200% YoY | Carta | [10] | 2026 |
| Tender participation / subscription | median participation 36.6% → 56%; median subscription 99.9% | Carta | [12] | 2025 |
| Secondary tenders vs IPO proceeds; pricing | ~$35B tenders vs ~$45B IPOs; venture secondaries average ~78% of NAV | Nasdaq Private Market | [13] | 2025 |
| Tracked private company value | $421B (2015) → $4.1T (Q3 2025) | Forge Global | [14] | 2025 |
| Secondaries market | $240B total (+48%); GP-led $116B; dry powder $315B | Lazard / PitchBook / Kroll | [15][16][17] | 2025 |
| Continuation vehicles | 77% of GP-led deals (Lazard: 86-89%); forecast 30-40% of PE exits 2026-27 | same | [15][16][17] | 2025-26 |
| **Search fund aggregate return** | **33.9% IRR, 4.75x ROI, 2.88 PME** (2024 study: 35.1%, 4.5x) | Stanford GSB, US/Canada funds since 1984, data to 31 Dec 2025 | [35][36] | 2026 |
| Search fund outcome distribution | 31% return <1x; 18.5% 1-2x; 25.5% 2-5x; 25% ≥5x (mean MOIC 2.80x) | Yale investor-level study | [37] | 2025 |
| International search funds | 320 funds, 18.1% IRR, 2.0x MOIC; universe 83 (2018) → 503 (end-2025) | IESE international study | [37] | 2024-26 |
| SBA 7(a) acquisition equity | ≥10% of total project cost; seller note counts only on full standby for the loan term | SOP 50 10 8, effective 1 Jun 2025 | [38] | 2025 |
| SBA 7(a) from 1 Oct 2026 | DSCR floor 1.25x on trailing (not projected) results; lender-ordered QoE at ≥$3M price; no 7(a) Small underwriting for change of ownership | SOP 50 10 8.1 | [39][40] | 2026 |
| **HSR size-of-transaction threshold** | **$133.9M** (from $126.4M); alt threshold $535.5M; size-of-person $267.8M / $26.8M | FTC, effective 17 Feb 2026 | [24][25] | 2026 |
| UK merger thresholds (DMCCA) | turnover threshold £70M → £100M; one party UK turnover > £10M | Bird & Bird / CMA | [27][28] | 2025-26 |
| US ESOPs | 6,609 plans at 6,411 companies; 15.1M participants; $2.1T assets; ~270 new/yr | NCEO | [41][42] | 2026 |
| UK employee-owned businesses | 2,824 (≈500 transitioned in 2025); ~547,971 employee owners | Employee Ownership Association, March 2026 | [43] | 2026 |
| Startup shutdowns | 966 (2024) vs 769 (2023), +25.6%; Series A shutdowns 2.5x YoY in 2025; Q1 2026 2.6x Q1 2025 | Carta / SimpleClosure | [45][46] | 2024-26 |

## Decision rules & rules of thumb
- **If you want liquidity but not an exit, run a tender before you run a process.** Tenders clear
  (99.9% median subscription) and participation is now a majority of eligible holders [12].
- **If your ARR multiple conversation starts above 6x, ask which index.** Equal-weighted private-SaaS
  medians (3.8-4.5x) and market-cap-weighted public cloud (6.3x) are not the same number [47][48].
- **If you are a services business, expect ~2.5-3x SDE, not a software multiple** [32][33].
- **If you are pre-revenue, do not run a DCF.** Use Berkus (five $500K milestones, ~$2M ceiling) or
  Scorecard against regional comparables, then sanity-check with the VC method [55].
- **If you use the VC method, pick the discount rate by stage (30-70%) and say it out loud** — the
  rate, not the terminal value, is where the argument actually is [54].
- **Build the discount rate from a current ERP, not a historical average** (4.23% forward vs a
  5.5-14.5% historical range at the start of 2026) [52][53]. Keep terminal growth below long-run
  nominal GDP — Damodaran's growth cap [54].
- **If a fast-growing firm is offered a multiple of current earnings, insist on DCF** — the
  handbook's own rule, still routinely ignored (`C-valuation.md`).
- **If the deal price is $133.9M or more (US, 2026), assume an HSR filing** — and assume that being
  below it is not safety, because the 2023 Guidelines reach serial acquisitions and labour effects
  [24][26][29].
- **If a buyer proposes "we hire your team and license the IP", treat it as a sale with none of the
  protections** — regulators now call these reportable-shaped, and shareholders left in the shell may
  have claims [19][20][21].
- **Buying with SBA 7(a): the seller note only counts as equity on full standby**, and from 1 Oct
  2026 the deal must clear 1.25x DSCR on trailing results, with a QoE above $3M [38][39][40].
- **Sell into optimism** — the handbook's timing rule, refined by Lemkin: aim for a local maximum you
  can actually recognise, not a top you cannot [60].

## Process / steps

**A. Deciding the route (2-4 weeks)**
1. Name the motivation using the handbook's four: diversify / end of the line / begin anew / retire.
2. Separate **liquidity** from **exit** — if you need cash but the business compounds, price a
   tender, a shearing plan or a debt recap first [10][12].
3. Screen the routes against your facts: IPO (≥$100M revenue, profitable quarters, 11.5-year median
   clock [5]); strategic M&A; PE or roll-up; search-fund/individual buyer; ESOP or EOT; management
   buyout; holdco; wind-down.
4. Identify the *live* buyer classes in your category now — in 2026 that includes AI roll-up holdcos
   for services businesses [61][62] and vertical-SaaS consolidators [59].

**B. Getting valuation-ready (1-3 months)**
5. Normalise earnings: add back owner compensation and one-offs; produce SDE and EBITDA side by side.
6. Pull **recent comparable transactions**, not index levels — date, size, sector, and whether the
   multiple was on revenue, SDE or EBITDA.
7. Run three methods (the appendix's rule): a market multiple, a DCF with a built-up discount rate,
   and an asset/liquidation floor. Reconcile the spread in writing.
8. Fix the cap table and 409A history; "cheap stock" findings move price or delay closing [56].
9. Commission a quality-of-earnings report if the likely price is ≥$3M and SBA financing is
   plausible — from 1 Oct 2026 the lender requires one anyway [39][40].

**C. Running the process (3-9 months)**
10. Appoint advisers before you talk price: M&A lawyer, accountant, broker or banker sized to the
    deal (brokers still cluster under ~$20M, the handbook's threshold).
11. Solicit more than one bidder. A single bidder sets the price; two set the market.
12. Negotiate the LOI against benchmarks — earnouts 18%, RWI 63%, no-survival 41% [57][58] — and
    decide asset vs stock sale (handbook rule: stock sale favours the seller).
13. Clear regulatory: HSR if ≥$133.9M [24]; UK if target turnover exceeds £100M or the share-of-
    supply test bites [27][28].
14. Fix the post-close role and its authority explicitly — the handbook's third M&A issue, still the
    one founders concede for free.

**D. Liquidity without exit (6-10 weeks per event)**
15. Set eligibility (tenure, employee vs ex-employee), a cap (~20% median) and a price basis.
16. Get board and investor consent; check ROFR and transfer restrictions.
17. Price off the last round or a fresh 409A and disclose the basis; run the window — expect
    near-full subscription and majority participation [12]. Repeat on a cadence so it is policy,
    not a favour.

**E. Winding down (4-12 weeks)**
18. Board resolution and stockholder approval; stop incurring new obligations.
19. Notify employees (WARN where applicable) and pay final wages and benefits.
20. Sell or license assets — IP, domains, customer lists — before they decay [45].
21. Notice creditors, settle or reserve, file dissolution and final tax returns, close payroll and
    state registrations; then write the post-mortem and return remaining cash.

## Worksheets, checklists & questions

**Liquidity-vs-exit triage**
- How much cash do I personally need, and by when?
- Would selling 10-20% of my holdings solve it? Would the board approve a tender?

**Valuation prep (extends the handbook's checklist)**
- Normalised SDE and EBITDA for three years, with add-backs listed and defensible.
- Three to five comparable transactions with date, size and multiple basis.
- Discount-rate build-up: risk-free + current ERP [52][53] + size/illiquidity premium; state the
  stage discount if using the VC method (30-70%) [54]. Terminal growth below long-run nominal GDP.
- Customer concentration, contracted vs non-contracted revenue, NRR/GRR, churn.
- 409A history and current common/preferred ratio [56].

**Buyer-readiness (what diligence will find)**
- Are IP assignments signed by every contributor, including contractors and AI-tool output?
- Is there a single source of truth for the cap table, including SAFEs and option grants?
- Do the top-10 customer contracts assign on change of control?
- What happens to the business if you leave in six months?

**Offer evaluation**
- Headline price vs actual cash at close: escrow, earnout, holdback, rollover equity, seller note.
- If stock: is it liquid, and would you buy it with cash today? (The handbook's test, unchanged.)
- If earnout: who controls the metric, and what covenant binds the buyer? [57]
- If licence-and-hire: what do remaining shareholders receive, and who signs the fairness opinion?
  [19][20]

**Employee ownership and wind-down**
- Do I want continuity of culture more than maximum headline price? Can we afford an annual
  independent valuation? US: does an ESOP fit S-corp treatment [41][42]? UK: EOT, and have I checked
  the current Budget-year rules [43][44]?
- Wind-down: cash runway to close properly; assets worth selling (IP, brand, domains, data);
  personal guarantees, director liabilities and unpaid payroll taxes — the three that follow you.

## Regional notes
- **US.** HSR size-of-transaction $133.9M from 17 Feb 2026 [24][25]; the 2023 Merger Guidelines reach
  serial acquisitions, labour markets and partial interests [26]. SBA 7(a) is the dominant SMB
  acquisition financing and tightened twice (SOP 50 10 8 from Jun 2025, 50 10 8.1 from Oct 2026)
  [38][39][40]. ESOPs are a mature, tax-advantaged exit at ~270 new plans a year [42].
- **UK.** The DMCCA raised the merger turnover threshold from £70M to £100M with a £10M floor for one
  party [27]; CMA jurisdiction and procedure guidance was reissued in October 2025 [28]. **Employee
  Ownership Trusts are the fastest-growing owner exit**: 2,824 employee-owned businesses by March
  2026, ~500 transitioning in 2025, ~548,000 employee owners [43]; check the Budget 2025 changes to
  EOT relief before modelling the tax [44]. The listing route is the LSE Main Market or AIM, not the
  SEC process in chapter 9.
- **EU / Germany.** The Bundeskartellamt found Microsoft's hire-and-licence of Inflection staff was a
  **reportable concentration** in substance, declining only for lack of local nexus [21] — a European
  acquirer cannot assume the acquihire structure escapes merger control.
- **India.** A genuine domestic IPO exit market: 18 startups listed in 2025 raising a record ₹41,248
  crore, with 29 DRHPs already filed for 2026 [65]. Indian founders can plan a listing exit at a
  scale the handbook reserves for US companies.
- **Africa (Nigeria especially).** IPOs remain rare; M&A is the route and rose ~72% in 2025, but the
  buyer mix localised — foreign acquirers fell from 56% of exits in 2020 to 33% in 2025 [66]. 2025
  funding: Kenya $1.04B (+72%), South Africa $715M, Egypt $604M, Nigeria $572M (−3%) [67]. Plan for a
  local or pan-African strategic buyer, longer holds, and secondaries as realistic liquidity.
- **Southeast Asia.** The hardest exit market here: PE deal value fell ~10% to ~$14B across 84 deals
  in 2025, Singapore recorded four exits and Vietnam zero, with exit difficulty cited as investors'
  top concern [68]; the Golden Gate Ventures × INSEAD exit study is the regional reference [69].
- **Everywhere.** Rule 144, lockups, ESOP qualification and the US broker associations named in
  chapter 13 are US-only. The economic logic transfers; the rulebook does not.

## AI-era notes
- **AI is the exit market.** 40% of 2025 US VC exit value and a record 317 AI exits [4]; technology
  led H1 2026 M&A with $649B of announced volume [8].
- **AI multiples are a different asset class — and widely dispersed.** AI M&A averaged 24.5x
  EV/Revenue against a 13.1x median, so a handful of strategic deals carry the average [49].
  Foundation models ~37.5x, AI-native SaaS 25-30x, applications 8-20x [49][50] — yet advisors report
  that in an actual sale defensible AI companies clear 8-12x revenue and narrative-only ones 3-5x
  [51]. **Where hype outruns evidence:** the headline multiple is a public-comp and mega-deal
  artefact; price your own company off closed deals in your band.
- **The reverse acquihire is an AI-era invention and a founder trap.** Inflection (~$650M: $620M
  licence + $33M for employee claims) [21], Character.AI ($2.7B) [19], Windsurf ($2.4B, July 2025)
  [23] and Scale-Meta set the pattern: the team and the model leave, the company is not bought, and
  investors and non-joining employees can be left holding a shell.
- **Regulators are closing the gap.** The FTC chair said the agency will examine whether acquihire
  structures trigger HSR and the DOJ Antitrust Division's acting head called them a "red flag" for
  merger-review avoidance [20]; the FTC opened an investigation into Microsoft-Inflection [22];
  Germany's FCO held the structure was a concentration in substance [21].
- **AI roll-ups are a new buyer for unglamorous businesses.** General Catalyst's $1.5B allocation, its
  70-category map and 10 automatable categories; Titan ($74M, Aug 2025, acquired MSP RFA) and Long
  Lake (~$670M raised, $100M EBITDA in under two years) [61]; >$3B committed across GC, Thrive,
  Khosla, Elad Gil, Bessemer and GV [62]. A services firm on 5-15% margins now has a bidder class
  that did not exist in 2018 — and a competitor class too.
- **AI in the deal process** speeds diligence (document review, QoE prep, data-room Q&A) but does not
  change what diligence finds; BizBuySell's own 2026 framing is stabilisation plus "stricter
  underwriting, deeper financial scrutiny" [30][33]. Clean books still beat an AI story.

## The minds

| Person | Affiliation | Key contribution | Where to read |
|---|---|---|---|
| Aswath Damodaran | NYU Stern | Annual ERP and cost-of-capital data updates; the standard method for valuing young firms | *Data Update 5 for 2026: Risk and Hurdle Rates* (2026); ERP 2026 edition, SSRN [52][53][54] |
| Jason Lemkin | SaaStr | "Sell at a local maximum"; the 2025 thesis that the SaaS exit ladder has broken | saastr.com, *Who Will Buy The SaaS Companies?* (Oct 2025) [59][60] |
| Bill Gurley | Benchmark (emeritus) | Long-running critique of IPO underpricing and direct listings; 2025 on the cost of staying private | BG2 podcast; *The Gift and The Curse of Staying Private* (2025) [70] |
| Peter Walker | Carta, Head of Insights | The primary public dataset on tender offers, secondaries and startup equity outcomes | carta.com/data tender-offer updates (2025-26) [10][11][12] |
| Kelly, Zenios & Ng | Stanford GSB | The biennial Search Fund Study — the return benchmark for entrepreneurship through acquisition | *2026 Search Fund Study: Selected Observations* (E967) [34][35] |
| Walker Deibel | Acquisition Lab | Made "buy, then build" a mainstream founder path | *Buy Then Build* (2018) [72] |
| Brent Beshore | Permanent Equity | ~30-year funds, low leverage, no forced exit — permanent capital for SMBs | permanentequity.com; *Unqualified Opinions* [71] |
| Andrew Wilkinson | Tiny | Decentralised internet holdco, 35+ businesses; the case for and against roll-ups | The Knowledge Project ep. 143 [73] |
| ABA M&A Committee | American Bar Association | Private Target Deal Points Study — the empirical baseline for private M&A terms | 2025 edition, Business Law Today (Dec 2025) [57][58] |
| Dori Yona | SimpleClosure | Made structured wind-downs a product; publishes shutdown data | *State of Startup Shutdowns 2025* [45] |
| NCEO (Corey Rosen et al.) | National Center for Employee Ownership | The ESOP evidence base — prevalence, performance, participant outcomes | nceo.org research pages [41][42] |
| Employee Ownership Association | UK | Tracks the EOT transition wave and lobbies on its tax treatment | EOA statistics, March 2026 [43] |

## Pitfalls
- **Quoting a public index multiple as your own.** The gap between an equal-weighted private median
  and a market-cap-weighted public index is not negotiating room [47][48].
- **Anchoring on AI headline multiples.** A 24.5x mean built from a few strategic deals will not be
  offered to a $3M-ARR application company [49][51].
- **Treating "we'll license your model and hire your team" as flattering.** It is an exit for the
  founders, a shell for everyone else, and live regulatory risk [19][20][21].
- **Assuming a sub-threshold deal is invisible.** Below $133.9M there is no HSR filing but there is
  still enforcement interest, especially for serial acquirers [24][26][29].
- **Accepting an earnout without an operating covenant** — only 14% of deals require the buyer to run
  the business as before [57]; the metric you negotiated is the buyer's to move.
- **Waiting for the "right" market.** Median time to tech IPO is 11.5 years [5]; the option you hold
  for free is expensive in founder years and employee illiquidity.
- **Shutting down slowly.** The 2025-26 cohort dies later with more capital and more obligations;
  every month of drift adds liabilities and destroys salvageable asset value [45].

## Key terms
`tender offer` — a company-sanctioned window in which holders may sell a capped share of their equity at a set price.
`continuation vehicle (CV)` — a new fund, managed by the same GP, that buys assets from an older fund so LPs can take cash or roll.
`reverse acquihire` — hiring a startup's founding team plus a non-exclusive technology licence, instead of acquiring the company.
`SDE (seller's discretionary earnings)` — small-business earnings with owner compensation and discretionary items added back; the base for Main Street multiples.
`quality of earnings (QoE)` — an independent review testing whether reported earnings are real, recurring and transferable.
`representations and warranties insurance (RWI)` — a policy backstopping breaches of a seller's reps, replacing escrow and indemnity.
`earnout` — deferred purchase price contingent on post-close performance.
`seller note / standby` — vendor financing paid over time; "standby" means no principal or interest is paid, which is what makes it count as SBA equity injection.
`HSR filing` — the US pre-merger notification required above the annually adjusted size-of-transaction threshold.
`409A valuation` — an independent appraisal of common stock fixing option strike prices under US tax rules; `DLOM` is its discount for lack of marketability.
`ETA / search fund` — entrepreneurship through acquisition: raising capital to find, buy and personally run one company.
`EOT (Employee Ownership Trust)` — UK structure in which a trust buys a controlling stake on behalf of all employees.
`local maximum` — a temporarily favourable moment for your own metrics and your category, as distinct from the market peak.

## Build ideas for the app
- **Exit route selector** — inputs: revenue, EBITDA/SDE, growth, sector, ownership, founder goal,
  region → outputs: ranked routes (strategic M&A, PE/roll-up, SMB sale, ESOP/EOT, MBO, holdco, IPO,
  wind-down) with the threshold each one passes or fails, sourced.
- **Three-method valuation engine** — inputs: normalised earnings, growth, comparables, stage →
  outputs: market multiple, DCF with a built-up discount rate (current ERP + stage premium) and an
  asset floor, plus a reconciliation narrative to take to an appraiser.
- **Benchmark multiple lookup** — inputs: sector, revenue band, model → outputs: the published range
  (BizBuySell SDE, SaaS Capital ARR, AI EV/Revenue) with source and date.
- **Tender-offer designer** — inputs: cap table, eligibility rules, cap %, price basis → outputs: a
  policy document, participation model and consent checklist.
- **Deal-terms benchmarker** — paste an LOI's key terms → flags where they sit against the ABA
  distributions (earnout, RWI, survival, escrow) and drafts the counter-ask.
- **Readiness scorer** — a diligence pre-mortem (IP assignments, cap-table hygiene, 409A currency,
  change-of-control clauses, concentration, key-person risk) → a 0-100 score and fix list.

## Sources
[1] US IPO Market 2025 Annual Review — Renaissance Capital — Dec 2025/Jan 2026 — https://www.renaissancecapital.com/review/2025USReview_Press.pdf
[2] IPO Outlook 2026 — Renaissance Capital — Dec 2025 — https://www.renaissancecapital.com/review/IPO_Outlook_2026_Public.pdf
[3] IPO Bloodletting after the "Pop" in 2025 — Wolf Street — 29 Dec 2025 — https://wolfstreet.com/2025/12/29/ipo-bloodletting-after-the-pop-in-2025-venture-global-coreweave-figma-klarna-bullish-circle-internet-naven-firefly-fermi/
[4] In 2025 so far, 40% of VC exit value stems from AI, according to PitchBook — Fortune — 9 Oct 2025 — https://fortune.com/2025/10/09/in-2025-so-far-40-of-vc-exit-value-stems-from-ai-according-to-pitchbook/
[5] As the window widens, PE firms rush to exit — PitchBook — 2025 — https://pitchbook.com/news/articles/as-the-window-widens-pe-firms-rush-to-exit
[6] Q2 Brought The Most Billion-Dollar Startup Exits Since 2021 — Crunchbase News — 2026 — https://news.crunchbase.com/public/data-billion-dollar-startup-exits-ma-ipo-spcx-q2-2026/
[7] Billion-dollar exits and IPOs 2025: cyber and AI — Crunchbase News — 2025 — https://news.crunchbase.com/ma/billion-dollar-exits-ipo-2025-cyber-ai/
[8] Global M&A industry trends: 2026 mid-year outlook — PwC — 2026 — https://www.pwc.com/gx/en/services/deals/trends.html
[9] Global M&A Report 2026 — Bain & Company — 2026 — https://www.bain.com/insights/topics/m-and-a-report/
[10] Tender-Offer Activity Reaches a Four-Year High (H1 2026) — Carta — 2026 — https://carta.com/data/tender-offer-update-h1-2026/
[11] Startup Tender Offers Hit Record 16K Employees in 2025 — Carta — 2026 — https://carta.com/data/linkedin-startup-tender-offers-employee-liquidity-2025/
[12] Tender offers are helping fill the gap left by venture capital's IPO lull — Carta — 2025 — https://carta.com/data/tender-offers-q2-2025/
[13] Secondary Scene: 2026 Outlook — Nasdaq Private Market — 2026 — https://www.nasdaqprivatemarket.com/insights/market-reports/secondary-scene-npm-annual-private-market-report/
[14] Late-Stage Private Companies: The New Growth Investing — Forge Global — 2025 — https://forgeglobal.com/insights/late-stage-private-companies-the-new-growth-investing/
[15] Secondary Market Report 2025 — Lazard — 2026 — https://www.lazard.com/media/gjzjxh1x/lazard-2025-secondary-market-report_vff.pdf
[16] Continuation funds drive a record year for the secondaries market — PitchBook — 2026 — https://pitchbook.com/news/articles/continuation-funds-drive-a-record-year-for-the-secondaries-market
[17] Secondary market evolution: continuation funds as an alternative to traditional exits — Kroll — 2025 — https://www.kroll.com/en/publications/transaction-opinions/secondary-market-evolution-continuation-funds-alternative-traditional-exits
[18] Early Lock-Up Releases: Overview and Trends — Cooley CapitalXchange — 20 Jan 2025 — https://capx.cooley.com/2025/01/20/early-lock-up-releases-overview-and-trends/
[19] Reverse Acquihires Reveal Antitrust's Need To Update Its Conceptual Understanding of Hiring — ProMarket — 27 Apr 2026 — https://www.promarket.org/2026/04/27/reverse-acquihires-reveal-antitrusts-need-to-update-its-conceptual-understanding-of-hiring/
[20] Acquihires and Antitrust: When Buying the Team Isn't Buying the Company — Truth on the Market — 9 Apr 2026 — https://truthonthemarket.com/2026/04/09/acquihires-and-antitrust-when-buying-the-team-isnt-buying-the-company/
[21] FCO Finds Microsoft's Hiring of Inflection Employees and Licensing Constitutes a Reportable Concentration — Cleary Antitrust Watch — Dec 2024 — https://www.clearyantitrustwatch.com/2024/12/fco-finds-that-microsofts-hiring-of-key-inflection-employees-and-licensing-of-inflection-technology-constitutes-a-reportable-concentration-but-declines-jurisdiction-due-to-lack-of-sufficient-local/
[22] Microsoft's weird Inflection AI deal is now in the antitrust spotlight — Quartz — 2024 — https://qz.com/microsoft-inflection-ai-ftc-antitrust-1851523752
[23] Windsurf drama shows how poaching is a new norm for AI deals — Emerging Tech Brew — 17 Jul 2025 — https://www.emergingtechbrew.com/stories/2025/07/17/windsurf-google-ai-talent
[24] FTC Announces 2026 Update of Jurisdictional and Fee Thresholds for Premerger Notification Filings — FTC — 14 Jan 2026 — https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-announces-2026-update-jurisdictional-fee-thresholds-premerger-notification-filings
[25] FTC Updates HSR Filing Fees and Revises Thresholds for 2026 — Akin — Jan 2026 — https://www.akingump.com/en/insights/alerts/ftc-updates-hsr-filing-fees-and-revises-thresholds-for-2026-minimum-size-for-reportable-transactions-increases-to-dollar1339-million
[26] Merger Guidelines — US DOJ and FTC — 18 Dec 2023 — https://www.ftc.gov/system/files/ftc_gov/pdf/2023_merger_guidelines_final_12.18.2023.pdf
[27] New Year, New Merger Control Rules (DMCCA) — Bird & Bird — 2025 — https://www.twobirds.com/en/insights/2025/uk/new-year---newmerger-control-rules
[28] Mergers: Guidance on the CMA's jurisdiction and procedure (CMA2) — UK Competition and Markets Authority — 28 Oct 2025 — https://assets.publishing.service.gov.uk/media/6900e39e87219d3b21b9aa9c/mergers_guidance_on_the_CMA_s_jurisdiction_and_procedure.pdf
[29] How Do the FTC's 2026 Merger Enforcement Changes Affect Startup Acquisitions? — Primum Law — 2026 — https://primumlaw.com/how-do-the-ftcs-2026-merger-enforcement-changes-affect-startup-acquisitions/
[30] Business Acquisitions Stabilize as Buyers Get Selective (Q4 2025 Insight Report) — BizBuySell — Jan 2026 — https://www.bizbuysell.com/news/bizbuysell-2025-fourth-quarter-insight-report/
[31] 2025 Year in Review: BizBuySell Market Recap — BizBuySell — 2026 — https://www.bizbuysell.com/blog/2025-year-in-review/
[32] Business Valuation Multiples by Industry: Revenue & Earnings (SDE) — BizBuySell — 2026 — https://www.bizbuysell.com/learning-center/industry-valuation-multiples/
[33] BizBuySell's Q2 2026 Insight Report: Three Takeaways — Sundance Financial (secondary summary of BizBuySell data) — 2026 — https://sundancefg.com/resources/bizbuysell-q2-2026-insight-report
[34] 2026 Search Fund Study: Selected Observations (case E967) — Peter Kelly, Stefanos Zenios, Dom Ng, Stanford GSB — 2026 — https://www.gsb.stanford.edu/faculty-research/case-studies/2026-search-fund-study-selected-observations
[35] Search Funds Keep Offering a Proven Path to Ownership — Stanford GSB Insights — 2026 — https://www.gsb.stanford.edu/insights/search-funds-keep-offering-proven-path-ownership
[36] The 2026 Stanford Search Fund Study: What It Means for Investors — ClearlyAcquired (secondary summary) — 2026 — https://www.clearlyacquired.com/blog/2026-stanford-search-fund-study
[37] Search Fund Outcomes 2026: Stanford-Yale MOIC Divergence — CT Acquisitions (secondary summary of the Stanford, Yale and IESE studies) — 2026 — https://ctacquisitions.com/guides/search-fund-outcomes-2026/
[38] SBA Issues SOP 50 10 8: Key Changes Impacting SBA 7(a) Lending — Whiteford, Taylor & Preston — 2025 — https://www.whitefordlaw.com/news-events/client-alert-sba-issues-sop-50-10-8-key-changes-impacting-sba-7a-lending
[39] New SBA Rules for Business Acquisitions Take Effect October 1, 2026 — Accredited — 2026 — https://joinaccredited.com/blog/sba-sop-50-10-8-1-acquisition-rules
[40] SBA Expansion Acquisition Rules 2026: SOP 50 10 8.1 vs 50 10 8 — Pioneer Capital Advisory — 2026 — https://www.pioneercapitaladvisory.com/sba-expansion-acquisition-rules-sop-50-10-8-1
[41] Employee Ownership by the Numbers — National Center for Employee Ownership — 2026 — https://www.nceo.org/research/employee-ownership-by-the-numbers
[42] National ESOP Database 2026 — NCEO — 2026 — https://www.nceo.org/research/data/national-esop-database
[43] How Many Employee Ownership Trusts Are There In the UK? — Go EO (citing Employee Ownership Association, March 2026) — 2026 — https://goeo.uk/blog/how-many-employee-ownership-trusts-are-there-in-the-uk
[44] Budget 2025: Employee Ownership Trusts — House of Commons Library — 2025 — https://commonslibrary.parliament.uk/research-briefings/cbp-10437/
[45] State of Startup Shutdowns 2025 — SimpleClosure — 2026 — https://simpleclosure.com/blog/posts/state-of-startup-shutdowns-2025/
[46] Carta abandons startup shutdown business, instead backs SimpleClosure's $15M Series A — TechCrunch — 7 May 2025 — https://techcrunch.com/2025/05/07/carta-abandons-startup-shutdown-business-instead-backs-simpleclosures-15m-series-a
[47] SaaS Capital Index 2026: Median Multiple, Methodology, Live Reading — saasvaluationmultiple.com (tracker of SaaS Capital data) — 2026 — https://saasvaluationmultiple.com/saas-capital-index
[48] SaaS Valuation Multiples 2026: Bessemer at 6.3x, Private SaaS Closes at 3.7x — Nate Lind (tracking the BVP Nasdaq Emerging Cloud Index) — 2026 — https://www.natelind.com/blog/saas-valuation-multiples-2026-bessemer-cloud-index
[49] AI Valuation Multiples — Aventis Advisors — 2026 — https://aventis-advisors.com/ai-valuation-multiples/
[50] Q2 2026 AI M&A Multiples by Funding Stage: What 156 Acquisitions Reveal — Finro — 2026 — https://www.finrofca.com/news/ai-ma-multiples-by-funding-stage-q2-2026
[51] AI M&A Trends 2026: Why Acquirers Pay Premium Multiples — FE International — 2026 — https://www.feinternational.com/blog/ai-ma-trend
[52] Data Update 5 for 2026: Risk and Hurdle Rates — Aswath Damodaran — 2026 — https://aswathdamodaran.substack.com/p/data-update-5-for-2026-risk-and-hurdle
[53] Equity Risk Premiums (ERP): Determinants, Estimates and Implications — The 2026 Edition — Aswath Damodaran, SSRN — 2026 — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6361419
[54] Valuing Young or Start-Up Firms (Investment Valuation, ch. 23) — Aswath Damodaran, NYU Stern — undated chapter, still the standard reference — https://pages.stern.nyu.edu/~adamodar/pdfiles/val3ed/c23.pdf
[55] Berkus Method vs. Other Valuation Models — Allied Venture Partners (summarising Berkus and the Payne Scorecard) — 2026 — https://www.allied.vc/guides/berkus-method-vs-other-valuation-models
[56] 409A: How Common Stock vs Preferred Stock Valuations Differ — 409a-valuation.com — 2026 — https://409a-valuation.com/insights/409a-common-stock-vs-preferred-stock-valuation
[57] Announcing the ABA's 2025 Private Target Mergers & Acquisitions Deal Points Study — ABA Business Law Today — Dec 2025 — https://businesslawtoday.org/2025/12/announcing-aba-2025-private-target-mergers-acquisitions-deal-points-study/
[58] 2025 ABA Private Target Mergers & Acquisitions Deal Points Study — K&L Gates — 19 Dec 2025 — https://www.klgates.com/2025-ABA-Private-Target-Mergers-Acquisitions-Deal-Points-Study-12-19-2025
[59] Who Will Buy The SaaS Companies? — Jason Lemkin, SaaStr — Oct 2025 — https://www.saastr.com/who-will-buy-the-saas-companies/
[60] Acquisitions — If You Do Sell, Try to Make Sure It's At a Local Maximum — Jason Lemkin, SaaStr — https://www.saastr.com/saas-acquisitions-if-you-sell-do-it-at-a-local-maximum/
[61] The General Catalyst Behind $1.5 Billion of AI Roll-Ups — Capital & Clarity — 2026 — https://capitalandclarity.substack.com/p/the-general-catalyst-behind-15-billion
[62] AI Roll-Up Deals Accelerate as Top VC Firms Edge Towards Private Equity — Newcomer — 2026 — https://www.newcomer.co/p/ai-roll-up-deals-accelerate-as-top
[63] Microacquire/Acquire.com (2026): The SaaS and Ecommerce Marketplace — CT Acquisitions (secondary summary of Acquire.com, Flippa and Empire Flippers data) — 2026 — https://ctacquisitions.com/microacquire-acquire-com-platform-guide/
[64] AI Startups Valuation Multiples: Key Considerations — Flippa — 2026 — https://flippa.com/blog/ai-startups-valuation-multiples-key-considerations/
[65] Indian Startup IPO Tracker 2026 — Inc42 — 2026 — https://inc42.com/features/indian-startup-ipo-tracker-2026/
[66] Africa's startup exit problem deepens as investors struggle to cash out — BusinessDay NG — 2026 — https://businessday.ng/companies/article/africas-startup-exit-problem-deepens-as-investors-struggle-to-cash-out/
[67] 2025 Africa Tech Venture Capital Report — Partech — 2026 — https://partechpartners.com/africa-reports/2025-africa-tech-venture-capital-report
[68] Southeast Asia private equity faces prolonged exit pressures amid selective deal recovery in 2025 — Bain & Company — 2026 — https://www.bain.com/about/media-center/press-releases/sea/southeast-asias-private-equity-2026/
[69] Southeast Asia Exit Landscape: A New Frontier — Golden Gate Ventures × INSEAD — https://www.insead.edu/sites/default/files/assets/dept/centres/gpei/docs/golden-gate-ventures-insead-sea-exit-landscape.pdf
[70] Bill Gurley — The Gift and The Curse of Staying Private (Invest Like the Best) — 2025 — https://podcasts.apple.com/us/podcast/bill-gurley-the-gift-and-the-curse-of-staying-private/id1154105909?i=1000712224752
[71] Brent Beshore, Founder & CEO — Permanent Equity — https://www.permanentequity.com/brent-beshore
[72] Buy Then Build: How Acquisition Entrepreneurs Outsmart the Startup Game — Walker Deibel — 2018 — https://buythenbuild.com/
[73] Andrew Wilkinson: Building Tiny (The Knowledge Project ep. 143) — Farnam Street — https://fs.blog/knowledge-project-podcast/andrew-wilkinson/
