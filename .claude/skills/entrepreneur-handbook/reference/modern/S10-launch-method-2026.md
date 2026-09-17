# S10 — Launch method: product-market fit, discovery, strategy (2026 layer)
Supplements: `02-opportunity.md` (Timmons' opportunity test, the market-evaluation worksheet, the
lean-startup box, the business-model canvas) and `03-business-model-and-strategy.md` (the five
founder questions, Magretta's narrative/numbers tests, Johnson's model analogies, Porter's three
positions and five forces, the network-effects box). Also feeds stages 1-4 of `00-journey-map.md`.
Scope: how founders actually find and hold product-market fit in 2026 — discovery, validation,
strategy, pricing and timing. Load when a user is choosing an idea, testing demand, deciding
whether they have PMF, picking a business model or pricing, or writing a "why now".

## What changed since 2018
- **PMF stopped being binary.** First Round (Todd Jackson, Apr 2024) publishes four *levels* —
  Nascent, Developing, Strong, Extreme — each with its own ARR band, retention, margin and burn
  thresholds; extreme PMF takes 2-6 years, and PMF can be lost again [1].
- **The 40% survey became the industry default *and* acquired critics.** Rahul Vohra's Superhuman
  engine (First Round Review, 2018-19) turned Sean Ellis's single question into a quarterly
  operating loop [4]; practitioners now warn the 40% line was never published with vertical or
  geography and is noise below ~100 responses [7].
- **Discovery became a weekly habit, not a project phase.** Teresa Torres's *Continuous Discovery
  Habits* (2021) — one customer interview a week by the product trio, mapped onto an
  opportunity-solution tree — displaced the one-off "customer development" sprint [9].
- **Building an MVP got ~free; learning did not.** Lovable, Bolt, v0 and Replit Agent compress a
  prototype to hours, but audits find 45% of AI-generated code carries an OWASP Top 10 flaw and
  ~70% of sampled Lovable apps shipped with row-level security off [35][36].
- **Pricing moved off the seat.** In Kyle Poyar's 2026 survey of 230 B2B software/AI companies,
  hybrid pricing (subscription + consumption) rose from 25% to 37% in twelve months and 29% now
  sell AI credits [16].
- **Strategy shifted from position to power, and from goals to problems.** Helmer's *7 Powers*
  (2016), Rumelt's *The Crux* (2022) and McGrath's transient advantage now sit on top of the
  Porter material in chapter 3 [29][30][33]; NFX attributes ~70% of tech value created since 1994
  to network effects and catalogues 16 types [23][24].
- **"Why now" became the highest-weighted slide.** Sequoia's template always had it; in 2024-26
  practice a "why now" that fails to name a specific recent enabler is treated as a red flag [52].
- **Capital now demands evidence of fit before seed.** Africa's H1 2026 funding rose 73% to $3.3bn
  while deal count fell ~10% — fewer, more-validated companies [41]; Southeast Asia's 2025 total
  fell 33.9% to $5.37bn across 461 deals [45][46].

## Core ideas (current consensus)
- **PMF is a dynamic equilibrium across three dimensions** — satisfaction, demand, efficiency —
  and you move between levels by adjusting the 4Ps: persona, problem, promise, product
  (First Round / Todd Jackson, 2024) [1].
- **Level 1 is about satisfaction only.** Churn, gross margin and burn multiple are irrelevant at
  3-5 customers; the only question is whether you have moved out of the "friend zone" into genuine
  need (First Round, 2024) [1].
- **Make PMF a number and a quarterly OKR.** Vohra (Superhuman, 2018-19): segment to the users who
  would be "very disappointed", write a high-expectation-customer profile, ignore the
  not-disappointed, and split the roadmap ~50/50 between deepening love and removing blockers [4].
- **Retention that flattens is the real fit signal**; the survey is a leading indicator of it
  (Rachitsky, 2020; Winters) [5].
- **Talk about their life, not your idea** — Fitzpatrick, *The Mom Test* (2013): specific past
  behaviour, never hypothetical future purchases. Moesta (*Demand-Side Sales 101*, 2020) adds the
  instrument: reconstruct the switch on a timeline and read the four forces — push, pull, habit,
  anxiety — instead of pitching features [10].
- **Look for a well, not a puddle.** Paul Graham (2012): the best ideas are organic (you wanted
  it), you can build them, and few others see the value; a small group that desperately needs the
  thing beats a large group that mildly wants it [11]. His companion rule (2013): recruit users
  manually and over-serve them — the unscalable phase is a stage, not a failure [12][13].
- **Monopoly, not competition.** Peter Thiel, *Zero to One* (2014): dominate a small market first,
  then expand concentrically; "what important truth do few people agree with you on" is the
  idea-generating question.
- **Design the product around the price.** Ramanujam & Tacke, *Monetizing Innovation* (2016):
  have the willingness-to-pay conversation *before* you build; 72% of innovations miss their
  financial targets, mostly for pricing reasons, not product reasons [17][18].
- **Power beats position.** Helmer (2016): a business is worth owning only if it holds one of seven
  powers (scale economies, network economies, counter-positioning, switching costs, branding,
  cornered resource, process power); Porter sizes the opportunity, Helmer says whether you can keep
  the value [33].
- **Strategy is a diagnosis of the crux, not a list of goals.** Rumelt (2011, 2022): find the one
  addressable challenge that unlocks the most progress and concentrate action on it [29]. And
  assume it expires — McGrath (2013 onward): hold a portfolio of arenas and disengage from eroding
  advantages early rather than defending them [30][31][32].
- **AI has made the functional layer copyable.** 2026 commentary converges on workflow depth,
  proprietary data and distribution as what survives commoditisation; inference prices fell >280x
  between Nov 2022 and Oct 2024, so "clever model call" is not a business [53][54][55].

## Frameworks & playbooks

| Framework | Author / year | What it says | Use when |
|---|---|---|---|
| Levels of PMF (4 levels, 3 dimensions, 4Ps) | Todd Jackson / First Round Capital, Apr 2024 | Nascent → Developing → Strong → Extreme, each with thresholds; score satisfaction, demand, efficiency; move levels by changing persona, problem, promise or product [1][2] | Diagnosing where you actually are and what to ignore at this level |
| The Sean Ellis test | Sean Ellis, ~2009 (classic) | "How would you feel if you could no longer use this product?" ≥40% "very disappointed" ≈ PMF, benchmarked on ~100 startups [4][6] | A quick, repeatable fit reading once you have real users |
| The PMF Engine | Rahul Vohra / Superhuman, 2018-19 | Segment to supporters → build the HXC profile → analyse the "somewhat disappointed" who value the main benefit → 50/50 roadmap → re-run quarterly as the top OKR [4] | You scored below 40% and need a route upward, not a verdict |
| Continuous Discovery Habits + opportunity-solution tree | Teresa Torres, 2021 | Weekly customer touchpoints by the product trio; map outcome → opportunities → solutions → assumption tests; test assumptions before building [8][9] | Turning discovery into a cadence the team sustains |
| The Mom Test | Rob Fitzpatrick, 2013 (classic) | Past behaviour, specifics, commitments; never ask if they like your idea | Every interview in stages 1-3 |
| Jobs to Be Done / Four Forces / Switch interview | Clayton Christensen (2016 *Competing Against Luck*); Bob Moesta, 2020 | Push of the situation, pull of the new, habit of the present, anxiety of the new; timeline-reconstruct the moment of switch [10] | Understanding why people actually bought or didn't |
| Do things that don't scale | Paul Graham / YC, 2013 | Recruit manually, delight insanely, do the work by hand; startups take off because founders push [12][13] | First 10-100 users; concierge-style delivery |
| How to get startup ideas / Zero to One | Paul Graham, Nov 2012; Peter Thiel, 2014 | Notice, don't brainstorm; live in the future; organic > made-up; prefer a well to a puddle; drop the schlep and unsexy filters [11]. Thiel adds: secrets, monopoly, dominate a small market first, and the seven questions | Idea generation and screening (extends Timmons in ch 2) |
| Smoke test / fake door | Practitioner canon; current guidance 2025-26 | Landing page or in-product tile measures intent before build; a smoke test validates a concept, a fake door validates one feature; disclose after the click and offer a waitlist [50][51] | Cheapest demand signal; pre-build |
| Concierge & Wizard of Oz MVP | Lean-startup canon; CRV MVP guide 2025 | Deliver the service manually (concierge) or fake the automation behind a real interface (Wizard of Oz) to test value before engineering it [50] | Service-shaped or AI-shaped products |
| 7 Powers | Hamilton Helmer, 2016 | Seven durable powers; each needs a benefit *and* a barrier; scale economies and switching costs are the most common [33] | Deciding whether a win is keepable (layer onto Porter, ch 3) |
| Playing to Win — strategy choice cascade | A.G. Lafley & Roger Martin, 2013; essays 2024-25 | Winning aspiration → where to play → how to win → capabilities → management systems; where-to-play and how-to-win are inseparable [27][28] | Writing a one-page strategy a team can act on |
| Good Strategy/Bad Strategy kernel + The Crux | Richard Rumelt, 2011 / 2022 | Kernel = diagnosis, guiding policy, coherent action; the crux is the surmountable challenge with the biggest payoff; run a "strategy foundry" [29] | When the plan is a list of goals rather than a strategy |
| Transient advantage / arenas | Rita McGrath, 2013-2025 | Compete in arenas not industries; launch, ramp, exploit, reconfigure, disengage; watch for inflection points [30][31][32] | Fast-moving or AI-exposed categories |
| Cold Start Problem / atomic network | Andrew Chen (a16z), 2021 | Build the smallest self-sustaining network, solve for the hard side first, then copy the network city-by-city or team-by-team [25][26] | Marketplaces, social, multi-sided models |
| Network Effects Manual (16 types) | NFX, 2019-2026 | Direct, 2-sided, data, tech-performance and social network effects, ranked by strength; network effects ≈70% of tech value since 1994 [23][24] | Choosing which network effect you are actually building |
| Monetizing Innovation (9 rules) | Madhavan Ramanujam & Georg Tacke, 2016 | WTP conversation first; segment by value not demographics; choose model, then packaging, then price; build the business case on price [17][18] | Before the first line of code and at every packaging change |
| Van Westendorp Price Sensitivity Meter | Peter van Westendorp, 1976 (classic) | Four price questions → acceptable range; cheap and fast, but stated-preference, single-product, no competitive context [19][20] | Early range-finding only; pair with Gabor-Granger, conjoint or a live A/B test |
| Hybrid pricing / AI credits | Kyle Poyar, Growth Unhinged, 2026 | Subscription base + consumption (usually credits) is now the dominant transition state; sell the work, not the seat [16] | Any product where AI does variable-cost work |
| Sequoia "why now" | Sequoia Capital business-plan template (popularised ~2015) | Name the specific technological, regulatory or behavioural change that makes this the moment; vague macro trends are penalised [52] | Pitch decks and go/no-go on timing |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| Level 1 (Nascent) | $0-500K ARR, 3-5 customers, <10 staff, 1 in 10-20 warm intros converts | B2B SaaS | [1] | 2024 |
| Level 2 (Developing) | $500K-5M ARR, 5-25 customers, NRR ≥100%, magic number 0.5-0.75, GM ≥50%, burn multiple ≤5x, first-call-to-close ~10%, regretted churn 10-20% | B2B SaaS | [1] | 2024 |
| Level 3 (Strong) | $5-25M ARR, NRR >110%, magic >0.75, CAC payback <18 mo, GM 60-70%+, burn multiple 1-3x, word of mouth >10% of inbound | B2B SaaS | [1] | 2024 |
| Level 4 (Extreme) | $25M+ ARR, NRR >120%, GM 80%+, burn multiple 0-1x, CAC payback <12 mo; 2-6 years to reach, 12-18 months spent at Level 1 | B2B SaaS | [1][3] | 2024 |
| Sean Ellis threshold | ≥40% "very disappointed"; benchmarked on ~100 startups | cross-sector | [4][6] | classic |
| Superhuman's own trajectory | 22% → 33% (one quarter) → 47% | single company | [4] | 2017-19 |
| Survey reliability floor | below ~100 responses the 40% line is too noisy | practitioner guidance (secondary) | [7] | 2026 |
| User retention, month 6 — good/great | consumer social 25/45%; consumer transactional 30/50%; consumer SaaS 40/70%; SMB-MM SaaS 60/80%; enterprise SaaS 70/90% | 20 growth practitioners + public data | [5] | 2020 |
| NRR, month 12 — good/great | consumer SaaS 55/80%; bottom-up SaaS 100/120%; SMB-MM land-and-expand 90/110%; enterprise 110/130% | same study | [5] | 2020 |
| Consumer AI retention | D30 >30% for top apps (Sora sub-8%); ChatGPT DAU/MAU 36%, month-12 desktop 50%, paid month-12 68% (Gemini 21/25/57%); only 9% pay for two AI subscriptions | app analytics + consumer panel | [39] | 2025 |
| B2B SaaS churn | 3.5% avg (2.6% voluntary, 0.8% involuntary); fixing involuntary lifts revenue 8.6% in yr 1; 52% of consumers cancelled a subscription for non-use | 76M subscribers, 2,200 merchants | [40] | 2025-26 |
| Pricing model mix | hybrid 37% (from 25% YoY); 29% offer multiple models (from 21%); per-seat 29% among >$150M ARR. Secondary aggregate: seat-based 21%→15%, Gartner sees ≥40% of enterprise SaaS spend usage/agent/outcome by 2030 | 230 B2B software/AI cos, Apr-May 2026 | [16][22] | 2026 |
| AI credits | 29% use them; 33% plan to within 6-12 months; ~50% of >$50M ARR planning; +126% adoption in 2025 | same survey | [16] | 2026 |
| Investor-preferred AI model / margin target | hybrid 35%, outcome 26%, usage 24%, flat 10%, per-seat 5%; median AI gross-margin target 50%, only 12% aim at 80%+ | same survey | [16] | 2026 |
| Innovations missing financial targets | 72% | Simon-Kucher research behind *Monetizing Innovation* | [17][18] | 2016 |
| Why startups fail | lack of market need 42% (postmortems); of 431 shutdowns since 2023: poor PMF 43%, bad timing 29%, unit economics 19%, ran out of cash 70% (proximate) | CB Insights; second figure via secondary summary | [14] | 2021-2026 |
| Network effects share of tech value | ~70% of value created since 1994; 16 catalogued types | NFX multi-year study | [23][24] | 2024-26 |
| AI-generated code defects | 45% of samples introduce an OWASP Top 10 vulnerability | 100+ LLMs tested (Veracode) | [35][36] | 2025-26 |
| Vibe-coded app exposure | ~70% of 1,645 sampled Lovable apps had RLS disabled; 2,000+ vulns, 400 exposed secrets, 175 PII leaks across 5,600 apps. Inference cost fell >280x (Nov 22→Oct 24), so thin wrappers trade at 3-8x revenue vs 25-40x for data+IP | Escape.tech / Tenzai scans; practitioner analysis | [35][53][54] | 2026 |
| AI coding productivity | experienced OSS devs were **19% slower** with AI; they predicted 24% faster and believed 20% faster | RCT, 16 devs, 246 real tasks | [34] | 2025 |
| Africa funding | $3.3bn in H1 2026, +73% YoY, deal count −10%; Nigeria $214M equity (ahead of Egypt's $183M), $254M incl. debt | ecosystem trackers | [41][42] | 2026 |
| Southeast Asia / India | SEA 2025: $5.37bn across 461 deals, −33.9% YoY; India early-stage valuations 30-50% below mature markets | ecosystem trackers | [45][46][47] | 2025-26 |
| Creator economy | $313.7bn (2025) → $387.8bn (2026), ~23.6% CAGR; Substack >5M paid subscriptions and >$500M processed; Patreon >8M paying members | market research + platform disclosures | [48][49] | 2025-26 |
| Nigeria WhatsApp economics | per-message charging from 1 Oct 2026; ~$0.0101 (≈₦14) per chargeable utility message | Meta pricing change coverage | [43][44] | 2026 |

## Decision rules & rules of thumb
- **If you have fewer than ~100 real users, do not run the 40% survey** — read retention curves
  and interviews instead; below that the score is noise [7]. And if you score under 40%, do not
  conclude "no PMF": segment to the sub-population that *is* very disappointed and reposition [4].
- **If you are at Level 1, ignore churn, gross margin and burn multiple.** The only metric is
  whether 3-5 customers genuinely need you; optimise satisfaction, not efficiency (First Round) [1].
- **If retention has not flattened, do not spend on acquisition** — paid growth leaks out the
  bottom [5]; and if NRR is under 100% at $500K-5M ARR you are below Level 2 and should not be
  raising on a PMF story [1]. If a customer will not pay, commit time or refer a colleague, you
  have interest, not demand (Fitzpatrick, 2013).
- **If the "why now" answer is a macro trend ("AI is big"), rewrite it.** Name a specific
  technological, regulatory or behavioural change dated in the last 24 months [52].
- **If you cannot name which of Helmer's seven powers you are building, you have a product, not a
  business** [33]. If your advantage is a prompt plus an API call, assume replication within a
  quarter and stack two moats — workflow depth, data, compliance or distribution [53][54].
- **If you are building a network business, get one atomic network self-sustaining before opening
  the second** (Chen, 2021) [25][26].
- **Price before you build.** Have the willingness-to-pay conversation in discovery; if nobody
  states a number you can live with, change the product, not the pitch [17][18]. Use van Westendorp
  for a *range*, never a price — stated preference overstates willingness to pay [19][20].
- **If AI does variable-cost work in your product, price hybrid** (base + credits) rather than
  per-seat; per-seat is the model most associated with an expansion-revenue problem, and AI gross
  margin below ~50% is a pricing bug, not a cost of doing business [16].
- **If you ship an AI-built MVP to real users, run a security pass first** — RLS/row policies,
  secrets out of client code, auth flows, webhook idempotency [35][36].
- **Do not scale headcount or spend before Level 2.** Premature scaling is Startup Genome's
  headline failure mode for high-growth startups [15].

## Process / steps
1. **Generate organically.** List problems you have personally hit in the last 12 months, plus the
   schleps others avoid. Score each against Timmons (ch 2) and Graham's well-vs-puddle test [11].
2. **Write the "why now".** One paragraph naming the specific enabler (technology, regulation,
   price curve, behaviour) dated within ~24 months. If you cannot, park the idea [52].
3. **Pick a beachhead you could dominate.** Smallest market where you could plausibly be the
   obvious choice (Thiel, 2014); make it a persona, not a vertical.
4. **Interview before building.** 15-25 switch interviews; past behaviour only; capture push, pull,
   habit and anxiety; record their words for the problem [10]. Map the results on an
   opportunity-solution tree: one outcome → opportunities → solutions → assumption tests [8][9].
5. **Have the money conversation early.** Willingness to pay per bundle; ask what they pay today
   for the workaround (Ramanujam) [17][18].
6. **Run the cheapest test that can kill the idea.** Smoke test or fake door for demand; concierge
   or Wizard-of-Oz for value; pre-order or paid pilot for commitment. Disclose after the click and
   offer a waitlist [50][51].
7. **Deliver manually to the first 10.** Over-serve; do the work by hand; instrument every step
   (Graham, 2013) [12][13].
8. **Instrument retention from day one.** Cohort curves by week/month; watch for the flattening
   point, not the absolute number [5].
9. **Run the PMF survey at ~100+ users**, quarterly, segmented; set the score as a company OKR and
   split the roadmap 50/50 (Vohra) [4].
10. **Locate your level.** Score satisfaction, demand and efficiency against First Round's
    thresholds; fix only what that level says matters [1].
11. **Write the strategy on one page.** Rumelt's kernel (diagnosis / guiding policy / coherent
    action) or Martin's cascade; name the crux, then name which of the 7 powers holds the value and
    what the barrier is [27][28][29][33].
12. **Choose the model and the meter** (subscription / usage / hybrid / outcome), the unit you
    meter, the tiers and the expansion path — then re-test the whole loop quarterly, because PMF is
    an equilibrium, not a trophy [16][22][1][30].

## Worksheets, checklists & questions
**Idea screen (extends Timmons, ch 2)**
- What did I personally struggle with in the last year that others also struggle with?
- Is demand a well (few people, desperate) or a puddle (many, mildly)? Which schlep or unsexy
  filter is keeping competitors out? [11]
- What important truth about this market do few people agree with me on? (Thiel, 2014)
- What changed in the last 24 months that makes this possible now? [52]

**Switch interview script (Moesta)** [10]
- Walk me back to when you first realised the old way wasn't working. What happened that day?
- What did you try first? What did you search for? Who else was involved?
- What almost stopped you? What did you give up, and what did you keep doing anyway?
- What would have to be true for you to go back?

**Demand-evidence ladder (weakest → strongest)**
1. Said they liked it → 2. Gave an email → 3. Booked a call → 4. Spent real time in a pilot →
5. Introduced a colleague → 6. Paid → 7. Renewed / expanded. Only 6-7 count as demand.

**PMF survey block**
- How would you feel if you could no longer use [product]? (very disappointed / somewhat / not)
- What is the main benefit you get? (verbatim) What type of person would benefit most?
- How can we improve it? — then: % very disappointed by persona and use case; target ≥40% within
  your best segment before broadening [4][6].

**Level check (First Round)** [1] — ARR band, customer count, NRR, regretted churn, gross margin,
burn multiple, magic number, first-call-to-close, % inbound from word of mouth → which level, and
what this level tells me to *ignore*.

**Strategy one-pager**
- Diagnosis / crux (the one surmountable challenge) / guiding policy / 3-5 coherent actions [29].
- Where to play and how to win — are they inseparable? [27][28] Which of the 7 powers, and what is
  the barrier that stops a competitor copying it? [33]

**Pricing worksheet**
- What do they pay today for the workaround? What grows as they get more value (value metric)?
- Four van Westendorp prices → acceptable range → then a live test [19].
- Model: flat / per-seat / usage / hybrid / outcome — where does expansion revenue come from? If
  AI does the work: cost per unit, target gross margin ≥50%, credit-pack sizing [16].

## Regional notes
- **US** — the benchmark set above (First Round levels, Poyar's pricing survey, a16z consumer
  retention) is US-heavy; treat the thresholds as US B2B SaaS norms, not universal [1][16][39].
- **UK / EU** — the same discovery and PMF instruments apply, but consumer testing must respect
  GDPR consent for interview recordings and behavioural tracking; fake-door tests that collect
  emails need a lawful basis and a clear disclosure after the click [51]. EU B2B buyers'
  procurement adds cycle time, which distorts early conversion benchmarks.
- **Africa / Nigeria** — capital is concentrating: H1 2026 raised $3.3bn (+73%) on ~10% fewer
  deals, so investors ask for evidence of fit earlier; Nigeria led equity funding with $214M
  in H1 2026 [41][42]. Distribution is WhatsApp-first: it is storefront, catalogue and support
  desk in one, and from 1 Oct 2026 Meta charges per delivered message (~$0.0101 / ≈₦14 for a
  chargeable utility message), so unit economics now carry a messaging line item [43][44]. Launch
  method: manual WhatsApp onboarding, spreadsheets and short paid pilots before software; localise
  price points, payment rails and language (Pidgin/Hausa/Yoruba/Igbo for promos, English for OTPs
  and receipts); validate per-city, not per-country [43].
- **India** — early-stage valuations run 30-50% below mature markets, and tier-II/III city
  demand is a distinct segment from metro demand; validate willingness to pay in the tier you
  intend to serve, not the tier you live in [47].
- **Southeast Asia** — funding fell 33.9% in 2025 to $5.37bn across 461 deals, the lowest in six
  years; assume a longer pre-seed runway, and treat SEA as six atomic networks, not one [45][46].
- **Middle East / LatAm** — not separately sourced; the 2025-26 pattern (fewer deals, larger
  cheques, PMF evidence demanded pre-seed) is reported across emerging ecosystems [41][46].

## AI-era notes
- **Building is cheap; the discovery bottleneck moved.** Prompt-to-app tools (Lovable, Bolt, v0,
  Replit Agent) can produce a working prototype in hours, which makes the smoke-test/concierge
  sequence *cheaper*, not obsolete — the constraint is now customer access, not engineering [36][35].
- **The documented pitfalls are real and specific.** 45% of AI-generated code samples introduce an
  OWASP Top 10 vulnerability; ~70% of 1,645 sampled Lovable apps had row-level security disabled;
  a scan of 5,600 vibe-coded apps found 2,000+ vulnerabilities, 400 exposed secrets and 175 PII
  leaks. AI tools ship happy-path code — unhandled API errors, missing retries, non-idempotent
  webhooks, half-built auth [35][36]. Ship the prototype to *design partners*, not the public,
  until it has had a security pass.
- **Speed claims outrun the evidence.** METR's randomised trial found experienced open-source
  developers were 19% *slower* with early-2025 AI tools while believing they were 20% faster — a
  strong caution against planning your launch schedule on perceived AI speed-up [34].
- **Synthetic users are a rehearsal, not a substitute.** 2025 studies find LLM personas produce
  plausible narratives but wrong magnitudes, poor minority representation and no contextual
  friction; use them to sharpen the guide and pre-test surveys [37][38]. Where AI does help is
  the analysis layer — transcribing, tagging and clustering interviews, drafting the
  opportunity-solution tree, holding the weekly cadence; the interview itself stays human [8].
- **Monetisation has been rebuilt around AI work.** Hybrid pricing is at 37% and rising, 29% sell
  AI credits, and investors prefer hybrid (35%) and outcome-based (26%) over per-seat (5%);
  outcome pricing brings genuine accounting complexity (when is revenue recognised if you are paid
  per resolved ticket?) that Deloitte now publishes guidance on [16][21].
- **PMF is harder to *hold*.** Inference costs fell >280x in two years, so feature-level advantage
  commoditises fast; the surviving moats are workflow depth, data flywheels, compliance and
  distribution, stacked at least two deep [53][54][55]. Consumer AI shows the novelty gap: top apps
  clear 30% D30, Sora sat under 8%, and the market is winner-concentrated [39].
- **Hype watch:** "AI found our PMF", "we replaced user research with synthetic personas" and
  "we shipped in a weekend" are the three claims the 2025-26 evidence does not support [34][37][35].

## The minds

| Person | Affiliation | Key contribution | Where to read |
|---|---|---|---|
| Todd Jackson | First Round Capital | The four levels of PMF and the PMF Method programme | firstround.com/levels and /pmf (2024) [1][2] |
| Rahul Vohra (on Sean Ellis) | Superhuman; Ellis at GrowthHackers | Ellis set the 40% "very disappointed" test (*Hacking Growth*, 2017); Vohra turned it into a quarterly PMF engine with the HXC profile | First Round Review essay (2018-19) [4][6] |
| Lenny Rachitsky (with Casey Winters) | Lenny's Newsletter | Category-by-category retention benchmarks; the atomic-network explainer | lennysnewsletter.com, caseyaccidental.com (2020-26) [5][25] |
| Teresa Torres | Product Talk | Continuous discovery habits; opportunity-solution tree | *Continuous Discovery Habits* (2021) [8][9] |
| Rob Fitzpatrick | author | The Mom Test — how to ask questions that cannot be flattered | *The Mom Test* (2013) |
| Bob Moesta | Re-Wired Group | Demand-side sales, four forces of progress, the switch interview; carries Christensen's JTBD (*Competing Against Luck*, 2016) forward | *Demand-Side Sales 101* (2020) [10] |
| Paul Graham | Y Combinator | How to get startup ideas; do things that don't scale | paulgraham.com (2012, 2013) [11][12] |
| Peter Thiel | Founders Fund | Monopoly over competition; dominate a small market first | *Zero to One* (2014) |
| Hamilton Helmer | Strategy Capital | 7 Powers — benefit + barrier as the test of durable advantage | *7 Powers* (2016) [33] |
| Roger Martin | Rotman (emeritus) | Strategy choice cascade; where-to-play and how-to-win are inseparable | *Playing to Win* (2013); Medium essays (2024-25) [27][28] |
| Richard Rumelt | UCLA Anderson | The kernel; strategy as diagnosis of the crux | *Good Strategy/Bad Strategy* (2011), *The Crux* (2022) [29] |
| Rita McGrath | Columbia | Transient advantage; arenas; inflection points | *The End of Competitive Advantage* (2013), *Seeing Around Corners* (2019) [30][32] |
| Andrew Chen | a16z | Atomic networks, the hard side, the cold start problem | *The Cold Start Problem* (2021) [26] |
| James Currier / NFX | NFX | 16 types of network effects; ~70% of tech value since 1994 | nfx.com Network Effects Bible & Manual [23][24] |
| Madhavan Ramanujam | Simon-Kucher | Design the product around the price; WTP conversation first | *Monetizing Innovation* (2016); Lenny's Podcast [17][18] |
| Kyle Poyar | Growth Unhinged / Tremont | Annual state of B2B and AI monetisation; hybrid pricing data | growthunhinged.com (2026) [16] |

## Pitfalls
- **Treating PMF as a binary switch** and declaring victory at the first good quarter; it is an
  equilibrium that competitors, markets and model releases can break [1]. Its twin is premature
  scaling — hiring or buying growth before Level 2, Startup Genome's signature failure [15].
- **Running the 40% survey on too few, or too broad, a sample** — then averaging away the one
  segment that loves you [7][4]. Related: reading NRR as health while gross churn erodes the base [1].
- **Fake doors without disclosure** — implying availability you cannot deliver burns the audience
  you are recruiting; disclose after the click and offer a waitlist [51].
- **Shipping an AI-generated MVP straight to the public** with client-side keys, disabled RLS and
  half-built auth [35][36] — and planning the schedule on perceived, not measured, AI speed [34].
- **Substituting synthetic respondents for customers** at the validation stage [37][38].
- **Pricing last**, or per-seat on an AI product with no expansion path: building for two years
  then finding willingness to pay is a third of the assumption sits behind the 72% figure [17][18][16].
- **Calling a strategy "grow 3x" ** — a goal, not a diagnosis; Rumelt's definition of bad
  strategy [29].
- **Claiming a moat you cannot name.** If it is not one of the seven powers plus a barrier, assume
  it is a head start [33] — and do not open five networks before one is self-sustaining [25].

## Key terms
`levels of PMF` — First Round's four-stage model (Nascent, Developing, Strong, Extreme) with
per-level thresholds; the `4Ps` (persona, problem, promise, product) are the levers between them.
`Sean Ellis score` — % of users "very disappointed" to lose the product; ≥40% is the fit line.
`HXC (high-expectation customer)` — the most discerning person who would still be delighted.
`opportunity-solution tree` — Torres's map: outcome → opportunities → solutions → assumption tests.
`four forces of progress` — push, pull, habit, anxiety: the forces acting on a switch decision,
surfaced by a `switch interview` (timeline reconstruction of the moment a customer changed).
`smoke test` — a landing page or ad that measures intent for a concept that does not exist yet.
`fake door` — the same test for a single feature inside a live product.
`concierge MVP` — delivering the service manually to test value before automating it; a
`Wizard of Oz MVP` is a real interface with humans behind it.
`atomic network` — the smallest group that makes a network product useful on its own; the
`hard side` is its scarcer, harder-to-recruit side (drivers, sellers, creators).
`7 powers` — Helmer's durable advantages: scale economies, network economies, counter-positioning,
switching costs, branding, cornered resource, process power.
`crux` — Rumelt's term for the surmountable challenge whose solution unlocks the most progress.
`value metric` — the unit you charge for that grows with delivered value.
`hybrid pricing` — subscription base plus consumption (often AI credits).
`outcome-based pricing` — charging per achieved result rather than per seat or unit consumed;
`van Westendorp PSM` — four-question survey producing an acceptable price range. `transient
advantage` — McGrath's view that advantages must be launched, exploited and exited in cycles.
`burn multiple` — net burn ÷ net new ARR; `magic number` — net new ARR ÷ prior-quarter S&M.
`why now` — the dated, specific change that makes this the right moment for this solution.

## Build ideas for the app
- **PMF Level Diagnostic** — inputs: ARR, customers, NRR, regretted churn, gross margin, burn
  multiple, magic number, WOM share → outputs: current First Round level, the two metrics that
  matter at that level, the metrics to *stop* tracking, and the graduation checklist [1].
- **PMF Survey Runner + Retention Curve Reader** — inputs: user list, cohort export, category →
  outputs: the four-question survey, a <100-response reliability warning, % very disappointed by
  persona, HXC profile, 50/50 roadmap split, cohort curves and the good/great line [4][5][7].
- **Switch Interview Coach** — inputs: recording or transcript → outputs: timeline of the switch,
  the four forces tagged, verbatim problem language, and the leading questions the founder should
  stop asking (Mom Test checker) [10].
- **Validation Sequencer** — inputs: idea type (B2B tool, marketplace, consumer app, service) →
  outputs: the cheapest kill-test sequence (smoke test → concierge → paid pilot), a disclosure
  template for the fake door, and the pass/fail threshold for each step [50][51].
- **Why-Now & Moat Audit** — inputs: idea, market, data assets, integrations, switching cost →
  outputs: a dated-enabler "why now" paragraph with a specificity score, which of the 7 powers
  apply and their barriers, a wrapper-risk flag, and the two moats to stack [33][52][53][54].
- **Pricing Designer** — inputs: workaround cost, value metric candidates, AI cost per unit of
  work → outputs: van Westendorp range, model recommendation (flat/seat/usage/hybrid/outcome),
  credit-pack sizing and a gross-margin check against the 50% median target [16][19].
- **AI-MVP Safety Gate** — inputs: repo or deploy URL of a prompt-built app → outputs: checklist
  for RLS, client-side secrets, auth completeness, webhook idempotency, plus the benchmark that
  45% of AI-generated code carries an OWASP Top 10 flaw [35][36].

## Sources
[1] Levels of PMF — First Round Capital (Todd Jackson) — 8 Apr 2024 — https://www.firstround.com/levels
[2] PMF Method — First Round Capital — https://www.firstround.com/pmf
[3] A framework for finding product-market fit (Todd Jackson) — Lenny's Newsletter — 2024 — https://www.lennysnewsletter.com/p/a-framework-for-finding-product-market
[4] How Superhuman Built an Engine to Find Product/Market Fit — First Round Review (Rahul Vohra) — https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/
[5] What is good retention — Lenny Rachitsky — 9 Jun 2020 — https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29
[6] Sean Ellis on how to tell if you have product/market fit — Startup Archive — https://www.startuparchive.org/p/sean-ellis-on-how-to-tell-if-you-have-product-market-fit
[7] Sean Ellis Test: The 40% Rule for Product-Market Fit (2026 guide, secondary) — Koji — https://www.koji.so/docs/sean-ellis-test-product-market-fit
[8] Continuous Discovery Habits in 2026: operationalizing Teresa Torres's framework — Perspective AI — 2026 — https://getperspective.ai/blog/continuous-discovery-habits-in-2026-operationalizing-teresa-torres-s-framework-with-ai-conversations
[9] Continuous Discovery Habits with Teresa Torres — Business of Software — https://businessofsoftware.org/talks/continuous-discovery/
[10] Demand-Side Sales 101 — Bob Moesta, Business of Software talk — https://businessofsoftware.org/talks/demand-side-sales-101-bob-moesta-online/
[11] How to Get Startup Ideas — Paul Graham — Nov 2012 — https://paulgraham.com/startupideas.html
[12] Do Things that Don't Scale — Paul Graham — Jul 2013 — https://paulgraham.com/ds.html
[13] Do things that don't scale — YC Startup Library — https://www.ycombinator.com/library/96-do-things-that-don-t-scale
[14] Why Startups Fail: Top reasons — CB Insights — https://www.cbinsights.com/research/report/startup-failure-reasons-top/
[15] Premature Scaling: A Deep Dive — Startup Genome — https://startupgenome.com/insights/premature-scaling-a-deep-dive
[16] The 2026 State of B2B SaaS and AI Monetization Report — Kyle Poyar, Growth Unhinged — Apr-May 2026 — https://www.growthunhinged.com/p/the-state-of-b2b-monetization-in-2026
[17] The art and science of pricing — Madhavan Ramanujam on Lenny's Newsletter — https://www.lennysnewsletter.com/p/the-art-and-science-of-pricing-madhavan
[18] Monetizing Innovation — interview with Madhavan Ramanujam — The Marketing Journal — https://www.marketingjournal.org/monetizinginnovation/
[19] Van Westendorp Pricing Model: definition and how it works — Sawtooth Software — https://sawtoothsoftware.com/resources/blog/posts/van-westendorp-pricing-sensitivity-meter
[20] Making the Case Against the Van Westendorp Price Sensitivity Meter — Relevant Insights — https://www.relevantinsights.com/articles/van-westendorp-price-sensitivity-meter/
[21] Accounting for Outcome-Based Pricing in an Agentic AI Software Product — Deloitte (DART) — 4 Jun 2026 — https://dart.deloitte.com/USDART/home/publications/deloitte/industry/technology/accounting-outcome-based-pricing-agentic-ai
[22] The 2026 Guide to SaaS, AI, and Agentic Pricing Models (aggregator, secondary) — Monetizely — 2026 — https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models
[23] 70% of Value in Tech is Driven by Network Effects — NFX — https://www.nfx.com/post/70-percent-value-network-effects
[24] The Network Effects Manual: 16 Different Network Effects — NFX — https://www.nfx.com/post/network-effects-manual
[25] The Atomic Network — Lenny Rachitsky (with Andrew Chen) — https://www.lennysnewsletter.com/p/atomic-network
[26] Solve a Hard Problem (Tinder), ch. 8 of The Cold Start Problem — Andrew Chen — https://andrewchen.com/solve-a-hard-problem-cold-start-problem/
[27] The Hidden Where-to-Play Element in Strategy — Roger Martin — 2025 — https://rogermartin.medium.com/the-hidden-where-to-play-element-in-strategy-7cb355c9f9b7
[28] Why the How-to-Win Strategy Choice is So Hard — Roger Martin — Nov 2025 — https://rogermartin.medium.com/why-the-how-to-win-strategy-choice-is-so-hard-8de222d62f5c
[29] The Crux with Richard Rumelt — BCG Henderson Institute — https://bcghendersoninstitute.com/the-crux-with-richard-rumelt/
[30] The End of Competitive Advantage — Rita McGrath — https://www.ritamcgrath.com/book/the-end-of-competitive-advantage/
[31] Transient Advantage — Rita Gunther McGrath, Harvard Business Review — Jun 2013 — https://hbr.org/2013/06/transient-advantage
[32] Rita McGrath: Inflection Points and the Future of Strategic Advantage — Guy Kawasaki — 2025 — https://guykawasaki.com/rita-mcgrath-inflection-points-and-the-future-of-strategic-advantage/
[33] 7 Powers: Hamilton Helmer's Durable Moats and the AI Reframe — RoadmapOne — 2026 — https://roadmap.one/blog/posts/blog46-2-seven-powers/
[34] Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity — METR — 10 Jul 2025 — https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
[35] Vibe Coding Security Debt: AI-Generated Vulnerabilities at Scale — Cloud Security Alliance Labs — 2026 — https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-codegen-vulnerability-debt-20260406-csa/
[36] The Risks of Vibe Coding: security vulnerabilities and enterprise pitfalls — Retool — https://retool.com/blog/vibe-coding-risks
[37] A Review of Experiments with Synthetic Users — MeasuringU — 2025 — https://measuringu.com/review-of-experiments-with-synthetic-users/
[38] Synthetic Sample in Social Research: significant limitations of AI-generated responses — Verian — 2025 — https://www.veriangroup.com/news-and-insights/synthetic-sample-in-social-research
[39] State of Consumer AI 2025: Product Hits, Misses, and What's Next — a16z — 2025 — https://a16z.com/state-of-consumer-ai-2025-product-hits-misses-and-whats-next/
[40] State of Subscriptions 2026: Benchmarks & Insights — Recurly — 2026 — https://recurly.com/resources/report/state-of-subscriptions/
[41] Africa's startup funding rebound puts record first half within reach — African Business — Jun 2026 — https://m.african.business/2026/06/innov-africa-deals/africas-startup-funding-rebound-puts-record-first-half-within-reach
[42] Egypt Tops Africa's H1 2026 Startup Funding, But Nigeria Reclaims the Equity Crown — Tech In Africa — 2026 — https://www.techinafrica.com/egypt-tops-africas-h1-2026-startup-funding-but-nigeria-reclaims-the-equity-crown/
[43] The 2026 WhatsApp Business API Price Guide — NaijaTechGuide — 2026 — https://www.naijatechguide.com/whatsapp-business-api-price-guide.html
[44] WhatsApp to Charge Businesses for Customer Replies From October 2026 — MSME Africa — 2026 — https://msmeafricaonline.com/whatsapp-to-charge-businesses-for-customer-replies-from-october-2026/
[45] The State of the Startup Ecosystem in Southeast Asia 2026 — Second Talent — 2026 — https://www.secondtalent.com/resources/state-of-startup-ecosystem-sea/
[46] Southeast Asia Startup Funding Hits Record Low — TechTimes — 31 Aug 2026 — https://www.techtimes.com/articles/326106/20260831/southeast-asia-startup-funding-hits-record-low-pan-asia-giants-absorb-billions.htm
[47] South Asia Startup Guide 2025 — Lolita Taub — 2025 — https://lolitataub.medium.com/south-asias-startup-guide-e364acde176d
[48] Creator Economy Statistics: 20 Numbers That Actually Matter in 2026 — Neal Schaffer — 2026 — https://nealschaffer.com/creator-economy-statistics/
[49] Creator Economy Market Size, Share, Growth Report — Fortune Business Insights — 2025-26 — https://www.fortunebusinessinsights.com/creator-economy-market-116180
[50] MVP Methodology: A Complete Guide to Building and Testing — CRV — https://www.crv.com/content/mvp-methodology
[51] Fake Door Test — Umbrex (product-management frameworks) — https://umbrex.com/resources/frameworks/product-management-frameworks/fake-door-test/
[52] How to Supercharge the Sequoia Pitch Deck Template (2026) — Waveup — 2026 — https://waveup.com/blog/how-to-supercharge-sequoia-pitch-deck-template/
[53] Moat or Wrapper? The 2026 Test for AI Founders — Foundra — 2026 — https://www.foundra.ai/key-reads/ai-product-moat-or-wrapper-defensibility-test-2026
[54] Proprietary Data Moats and AI Startup Defensibility in 2026 — The Innovation Attorney (Michael Kimball) — 2026 — https://theinnovationattorney.substack.com/p/proprietary-data-moats-and-ai-startup
[55] AI-Native Product-Market Fit Is About Demand You Can Deliver — Chargebee — 2026 — https://blog.chargebee.com/blog/ai-native-product-market-fit-is-about-demand-you-can-deliver/
