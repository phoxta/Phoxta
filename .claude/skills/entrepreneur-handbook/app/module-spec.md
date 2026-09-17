# App module spec — "Everything you need to launch and grow"

A product-shaped consolidation of the "Build ideas for the app" sections in every reference file.
Ten modules follow the journey stages in `reference/00-journey-map.md`. Each tool lists inputs →
outputs and the reference file that holds the exact questions, tables and formulas to implement.

## Design principles
1. **One venture document.** Every module reads and writes the same venture record, so the plan
   generator (module 4) can assemble a document from what earlier modules already captured. This
   mirrors how the book reuses the Electric Car Care Center and Amalgamated Hat Rack examples
   across chapters.
2. **Every number carries a confidence and a test.** Table 2-1's evaluation / confidence /
   unknowns / test format applies to every input that is a guess (market share, price, volume).
3. **Gates, not walls.** Each stage ends with a verdict (go / learn more / drop; ready / not yet).
   The founder can look ahead, but the dashboard shows which gates are open.
4. **Cite the source and the year.** Every AI answer names the framework and chapter it draws on.
   Every benchmark shows its source and date, because the 2026 figures will age.
5. **Ask the country once, then remember it.** Jurisdiction changes the legal form, the funding
   sources, the payment rails and the filing calendar. It is a first-class field on the venture
   record, not a footnote.
6. **Show the user where the experts disagree.** Founder mode versus delegation, the long plan
   versus the deck, blitzscaling versus efficiency. Present both and let the founder choose.
7. **Not legal, tax or investment advice.** Modules 3, 7, 9 and 16 end by pointing at counsel, an
   accountant or an appraiser.

## Venture record (shared data model, sketch)

```
venture
  founder      { fitScores{cluster: 1-5}, mustHaves{plan, execute, motivation}, background[] }
  opportunity  { problem, marketQuestions[{q, answer, confidence, test}],
                 canvas{block: [{hypothesis, status: untested|testing|validated|invalidated}]},
                 experiments[{hypothesis, mvp, target, metric, outcome}],
                 scorecard{value, profit, fit, durability, financeable},
                 riskReturn{expectedReturn, risk, riskFree},
                 economics{priceSetter, elasticity, substitutes[], costModel},
                 proForma{years[{revenue, lines{}}]}, competition{questions[], worstCase} }
  model        { fiveQuestions{}, revenueSources[], costDrivers[{name, kind: fixed|variable}],
                 investment{launch, workingCapital}, criticalSuccessFactors[], analogy,
                 positioning{basis, valueType}, strategy{steps[]}, discoveryPlan{}, scaleFlags{} }
  legal        { jurisdiction, form, evolutionPlan[], agreementTerms{} }
  plan         { sections{}, formats{execSummary, pitch100, pitch1, deckPresentation, deckReading},
                 assumptions[] }
  financing    { businessType: mainstreet|supplychain|highgrowth, launchCapital, openingBalanceSheet,
                 sources[{name, amount, cost}], loanReadiness{}, ratios{}, raise{route, timeline, dilution[]} }
  operations   { statements[{period, balanceSheet, incomeStatement, cashFlow}], breakeven{} }
  growth       { gate{q1,q2,q3}, capacityPlan, leadershipMode, boardCharter, cultureAudit{}, portfolio[] }
  exit         { motivation, mechanism, valuation{methods{}, range}, dealTerms{} }

  // added by the 2026 layer
  jurisdiction { founderCountry, entityCountry, entityForm, registrations[], incentives[],
                 qsbs{issuances[]}, filingCalendar[] }
  pmf          { level: nascent|developing|strong|extreme, survey{veryDisappointed%, n, date},
                 retentionCurve[{month, pct}], regrettedChurn, evidence[] }
  sales        { icp{}, pipeline[{stage, value, age, stakeholders}], motion: founder|plg|sales-led,
                 playbook{}, firstHireGate{} }
  marketing    { positioning{}, channels[{name, status, cac, payback}], loops[], launchPlan{} }
  people       { founders[{name, split, vesting}], hirePlan[], offers[{level, salary, equity}],
                 optionPool{reserved, used}, classifications[] }
  ops          { cadence{}, scorecard[{metric, target, actual}], cashForecast13w[], sops[],
                 automations[], complianceItems[] }
  metrics      { model: saas|marketplace|dtc|services|ai, cac, ltv, payback, grr, nrr,
                 burnMultiple, runwayMonths, ruleOf40, cohorts[] }
  ai           { nativeVsEnabled, workflowsRedesigned[], modelMix[], costPerOutcome,
                 agents[{name, dataAccess, risks[]}], evals{passRate}, regBurden[] }
```

Every benchmark the app displays carries `{value, source, year}` so a founder always sees where a
number came from and how old it is. Benchmarks live in one table keyed by supplement and source
number, refreshed when the research is re-run.

## Module catalogue

### M0 Founder Fit — `reference/01-founder-fit.md`
| Tool | Inputs → outputs |
|---|---|
| Founder Fit quiz | 20 trait statements (Table 1-1) scored 1-5 → radar by cluster, gap list, mitigations |
| Must-haves gate | plan / execution / motivation yes-no → readiness flag |
| Background signal | family, friends, startup experience → advisor tone setting |
| Passion reality-check | static card shown before any pitch module |

### M1 Opportunity Lab — `reference/02-opportunity.md`, `reference/B-breakeven.md`
| Tool | Inputs → outputs |
|---|---|
| Problem & Market Evaluator | 10 questions, confidence, test → Table 2-1 grid, ranked unknowns |
| Business Model Canvas board | 9 blocks of hypotheses with status → live canvas, pivot log |
| Experiment planner | hypothesis, MVP, conversation target, metric → tracked outcomes |
| Opportunity Scorecard | five characteristics 1-5 with evidence → go / learn more / drop |
| Risk-Return Plotter | expected return, risk, local risk-free rate → above/below the line |
| Breakeven calculator | price, variable cost, fixed costs → unit CM, CM ratio, BE units and revenue, target-profit volume, margin of safety |
| Pro Forma builder | revenue assumptions + expense lines (loan amortisation) → Table 2-2 for 3 years, revenue lines flagged untested |
| Competitor War-Game | six questions + worst-case scenario → impact on pro forma, planned response |
| Opportunity Comparator | several scorecards + "do nothing" baseline → ranked list |

### M2 Model & Strategy Studio — `reference/03-business-model-and-strategy.md`
| Tool | Inputs → outputs |
|---|---|
| Five Questions card | five short answers → one-page summary (gate before investor prep) |
| Business Model Builder | four groups + Table 3-1 analogy picker → model summary, narrative-test prompt |
| Numbers Test | price, volume, variable cost, fixed cost, labour → pro forma + breakeven + sensitivity |
| Hypothesis tracker | element, decision-or-assumption, confidence, test → risk register |
| Positioning picker | variety / need / access + value type → positioning statement |
| Strategy wizard | six steps with the book's question lists → strategy document |
| Discovery Plan canvas | channels, table-stakes vs creative tactics → marketing inside the model |
| Scale-readiness gauge | PMF, data, competition + Hoffman thresholds → scale / hold |

### M3 Legal Setup — `reference/04-legal-structure.md`
| Tool | Inputs → outputs |
|---|---|
| Legal Form Chooser | 14 diagnostic questions + jurisdiction → recommended form(s), triggering rules, next steps |
| Double-taxation calculator | profit, corporate rate, dividend, personal rate → C corp vs flow-through total tax |
| Agreement builder | six partnership issues as prompts → term sheet for counsel |
| S corp eligibility | five requirements → pass/fail (US only) |
| Sole-trader launch checklist | bank account, bookkeeping, name check, licences → tracked to done |
| Form evolution planner | milestones (co-founder, equity hire, round, exit) → when the form must change |

### M4 Plan & Pitch Generator — `reference/05-business-plan.md`
| Tool | Inputs → outputs |
|---|---|
| Business Plan Generator | venture record + guided Q&A per Figure 5-1 section → full plan with appendix stubs |
| Pitch Compressor | plan → 2-3 page summary, 100-word pitch, one sentence, overview slide, 2-minute video script |
| Deck Builder | section content → presentation deck (≤1 sentence/slide) or reading deck (≤15-word lines) |
| Team Credibility Check | Sahlman's 14 questions per member → gap list, Table 5-1, org chart, board slots |
| Marketing Ten-Point Screen | ten items with evidence → completeness score |
| Projection Tables | revenue by channel, expense by category, one assumption per cell → Tables 5-2/5-3 |
| Style Linter | paragraph > 200 words, complex sentences, empty phrases → inline fixes |
| Reader-Lens Review | five reader questions + presence of ask, use of funds, exit → red flags |

### M5 Startup Capital — `reference/06-startup-financing.md`, `reference/A-financial-statements.md`
| Tool | Inputs → outputs |
|---|---|
| Business Type Classifier | ambition, market, growth intent → Main Street / supply-chain / high-growth (gates M7 routes) |
| Startup Capital Calculator | runway, burn, inventory, prepaids, fixed assets → launch capital, Tables 6-1/6-2 |
| Source Stack Planner | savings, family, credit, crowdfunding, trade credit, loan → Table 6-3, gap alert, cost ranking |
| Crowdfunding Fit Check | reach, rewards, validation goals → go/no-go, rewards vs equity |
| Support Institution Chooser | needs → incubator / angel / accelerator / hybrid (Table 6-4) |
| Family Loan Agreement | amount, rate, schedule → written terms |

### M6 Money Basics (operate) — `reference/A-financial-statements.md`, `reference/B-breakeven.md`
| Tool | Inputs → outputs |
|---|---|
| Three-statement builder | line items → balance sheet, income statement, cash-flow statement |
| Statement reconciler | three statements → tie-out checks (A = L + E, NI → retained earnings, cash delta) |
| Ratio dashboard | statements → book-stated and derived ratios with traffic lights |
| Working-capital gauge | current items, inventory, COGS, sales → NWC, inventory days, DSO, payable days |
| Leverage simulator | equity, debt, exit-value slider → ROE vs asset return, wipe-out point |
| Profit-vs-cash explainer | sale amount, payment delay → P&L vs cash side by side |

### M7 Growth Funding — `reference/07-growth-financing.md`, `reference/08-angels-and-vc.md`
| Tool | Inputs → outputs |
|---|---|
| Loan-Readiness Scorecard | banker's three questions + sub-questions → score, gaps, document list |
| Lender Ratio Calculator | statements → current, acid-test, debt, D/E, TIE + "EBIT halved" stress |
| Debt Capacity Simulator | debt, EBIT, rate, TIE and D/E ceilings → max safe borrowing |
| Asset-Financing Matcher | assets with lives, funding with terms → mismatch flags |
| Funding-source router | stage, growth ceiling, 10x plausibility, exit horizon, control appetite → self-fund / angels / corporate VC / VC |
| Dilution & valuation calculator | pre-money, cheque, rounds → post-money, ownership over time, loan comparison |
| Term-sheet decoder | preferred, voting, cumulative dividends, liquidation preference, board seat → plain-English impact, questions to ask |
| Raise timeline planner | cash-need date → start date (6-8 months back) and milestones |
| Pitch rehearsal drill | investor question bank → rubric on calm, trust, coachability |

### M8 Scale-Up — `reference/10-sustaining-growth.md`, `11-leadership.md`, `12-entrepreneurial-spirit.md`
| Tool | Inputs → outputs |
|---|---|
| Growth gate | three post-startup questions with evidence → go / recalibrate |
| Support-function scaling checklist | revenue and headcount bands → functions to add now |
| Capacity planner | service vs product model, forecast, lead times → hiring or build/outsource plan |
| Outsourcing screener | activity list → customer-facing kept in-house, single-partner warnings |
| Leadership-mode diagnostic | size, staff experience, founder's week → current vs recommended mode (Table 11-1) |
| Professional-management scan | seven signals → urgency and next steps |
| Advisory-board builder | expertise gaps, contacts → seat profiles, charter with cadence and term limits |
| Creative-edge audit | seven questions → culture score, lever to work first |
| Innovation portfolio mapper | projects by market newness, technical challenge, resources → Figure 12-1 bubble chart, skew diagnosis |

### M9 Exit & Valuation — `reference/13-harvest-and-exit.md`, `C-valuation.md`, `09-going-public.md`, `D-rule-144.md`
| Tool | Inputs → outputs |
|---|---|
| Exit motivation diagnostic | five questions → diversify / end of line / begin anew / income → harvest vs shearing |
| Exit mechanism selector | feasibility inputs → ranked mechanisms with pros/cons |
| Earnings normaliser | reported income, one-offs, owner salary → normalised NI, EBIT, EBITDA |
| Multi-method valuation | statements, D&A, debt, comparable multiples, optional cash-flow forecast → eight methods side by side, range |
| Equity ⇄ enterprise value switcher | equity value + interest-bearing debt → EV and back |
| Deal term checker | payment mix, acquirer stock quality, post-deal role, asset vs stock → risk notes |
| IPO readiness gate | revenue, profitable quarters, audited years, team flags → ready / not yet (routes to private placement) |
| Rule 144 wizard | affiliate status, acquisition route and dates → earliest sale date and conditions (US only) |

## Modules from the 2026 layer

Modules M0-M9 above come from the handbook and teach the method. The modules below come from the
thirteen researched supplements in `reference/modern/`, and carry the current benchmarks a founder
is measured against. Tools marked **→ Mx** extend an existing module rather than standing alone.

### M10 Sales Engine — `modern/S01-sales.md`
| Tool | Inputs → outputs |
|---|---|
| ICP & trigger builder | Company, persona and trigger answers plus a won/lost list → ICP card and target list |
| SPICED call companion | Call notes or transcript → filled qualification fields, missing-field prompts, next step |
| Reverse pipeline calculator | Revenue target, deal size, conversion rates, cycle length → meetings and pipeline needed |
| Indecision risk scorer | Deal age, options open, stakeholders, stated fears → risk level and the JOLT move to make |
| First-hire readiness gate | Customers closed, playbook artefacts, retention indicator, payback → hire / not yet |
| Outbound deliverability checker | Sending domain, target countries, list source → authentication and compliance fixes |
| Expansion tracker | Account usage and renewal dates → expansion candidates and at-risk logos |

### M11 Marketing Engine — `modern/S02-marketing.md`
| Tool | Inputs → outputs |
|---|---|
| Positioning canvas | Alternatives, attributes, value, target segment, market trend → a positioning statement |
| Channel picker | Business type, budget, audience, price point → a ranked shortlist and one channel to prove |
| Growth-loop designer | Chosen channel and product facts → a loop diagram with the metric that compounds |
| Fully-loaded CAC calculator | Spend, tooling, people, creative by channel → true CAC and payback per channel |
| AI-citation checker | Ten buyer prompts → which brands the AI assistants cite, and the gaps to close |
| Lifecycle flow builder | Storefront and CRM state → which welcome, abandonment and win-back flows to build first |
| Brand vs performance splitter | Stage, category, budget → recommended split with the evidence behind it |
| Launch runbook | Launch date → a six-week waitlist, seeding and launch-day plan |

### M12 People & Hiring — `modern/S03-hiring-and-people.md`
| Tool | Inputs → outputs |
|---|---|
| Co-founder agreement builder | Roles, time committed, risk retired, decision rights → a split recommendation and term sheet |
| First-ten-hires sequencer | Product type, founder skills, stage, 18-month outcomes → an ordered hiring plan |
| Scorecard & interview-kit generator | Role and outcomes → scorecard, structured loop, rubrics, reference questions |
| Offer calculator | Role, level, location, stage → salary band and equity percentage with the benchmark cited |
| Contractor-or-employee checker | Six questions by country → classification risk and the compliant route |
| Onboarding tracker | Start date → a 30/60/90 plan with manager prompts |
| AI-hiring compliance register | Tools in use and candidate jurisdictions → which rules apply and what to disclose |

### M13 Operating System — `modern/S04-operations.md`
| Tool | Inputs → outputs |
|---|---|
| Cadence builder | Team size, business type, founder's calendar → a weekly, monthly and quarterly rhythm |
| Scorecard designer & weekly review runner | Revenue model and top goals → the numbers to read every week, and the meeting that reads them |
| 13-week cash cockpit | Bank balance, receivables, payables, payroll, tax dates → a rolling weekly cash forecast |
| Collections autopilot | Invoice list and terms → a reminder schedule and escalation path |
| SOP extractor | A screen recording or walkthrough → a one-page written procedure |
| Automation triage | Tasks with frequency and time per run → ranked automation candidates with payback |
| Compliance calendar | Country, entity, headcount, data processing → dated filing and renewal obligations |
| Ops hire diagnostic | Founder time audit and process count → whether it is time for an operations hire |

### M14 Metrics & Unit Economics — `modern/S05-metrics-and-unit-economics.md` (extends M6)
| Tool | Inputs → outputs |
|---|---|
| Unit-economics calculator | CAC, revenue per account, gross margin, churn, expansion → LTV, ratio, payback |
| Cohort table builder | Customers by first-payment month with revenue → retention curves and the shape verdict |
| Runway & burn-multiple monitor | Cash, monthly flows, net new revenue → runway, burn multiple, default-alive check |
| Metric picker & benchmark card | Business model → the right metric set and where the founder sits against 2026 medians |
| Investor-readiness scorecard | Stage and current metrics → gaps against what investors expect now |
| AI margin analyser | Revenue, model spend, request volume → gross margin and inference as a share of revenue |
| DTC contribution-margin dashboard | Orders, average order value, costs, returns, ad spend → margin after marketing |

### M15 AI-Native Toolkit — `modern/S07-ai-native-company.md`
| Tool | Inputs → outputs |
|---|---|
| AI-native diagnostic | Remove-test and model-swap answers, workflows redesigned → AI-native, AI-enabled or neither |
| Moat auditor | Product, integrations, usage and retention → a scored defensibility read and what to deepen |
| AI unit-economics calculator | Model mix, tokens per task, success rate, price plan → cost per successful outcome |
| Agent safety gate | Each agent's data access, inputs and outbound channels → risk flags before it ships |
| Eval starter kit | Traces → failure-mode coding, judges, a pass-rate dashboard |
| Workflow redesign planner | Time-consuming processes with error cost and reversibility → what to redesign first |
| Regulatory one-pager | Jurisdictions, product surfaces, training practices → the disclosures and dates that apply |

### M16 Global & Jurisdiction — `modern/S08-global-lens.md`, `modern/S09-legal-and-structure-2026.md` (extends M3)
| Tool | Inputs → outputs |
|---|---|
| Domicile advisor | Investor type, customer geography, founder residence, exit intent → where to incorporate, and when |
| Country entry pack | Target country and business type → payment rails, hiring route, registrations, incentives |
| Landed-cost & tariff calculator | Product code, origin, destination, price, shipping → true landed cost |
| FX exposure monitor | Revenue and cost currencies, pricing terms → margin at risk and the hedge or repricing options |
| Incentive finder | Country, company age, sector, turnover → schemes the business qualifies for |
| QSBS clock tracker | Issuance dates, amounts, assets at issuance → per-holder exclusion status and dates (US) |
| 83(b) alarm | Grant date → the hard deadline and the filing route (US) |
| Flip advisor | Where investors, revenue, IP and staff sit → flip, wait, or do not flip, with the one-way warning |
| Founder hygiene scorecard | The legal checklist → a score, with cap-table and IP-assignment gaps flagged red |

### Tools that upgrade existing modules
| Tool | Extends | From |
|---|---|---|
| PMF level diagnostic, PMF survey runner, retention-curve reader | M1 | `S10` |
| Switch-interview coach, validation sequencer, why-now & moat audit | M1 | `S10` |
| Pricing designer, AI-MVP safety gate | M2 | `S10` |
| Founder-market fit score, base-rate buster, start-vs-buy comparator, founder health check | M0 | `S13` |
| One-pager → deck → memo → data room generator, deck doctor, investor update engine | M4 | `S13`, `S06` |
| SAFE stack modeller, round sizer, funding ladder router, term-sheet checker, raise sprint tracker | M7 | `S06` |
| Founder-mode audit, decision-rights builder, span & layer designer, goal-system chooser, culture pulse, work-model planner, board readiness kit | M8 | `S11` |
| Exit route selector, three-method valuation engine, benchmark multiple lookup, tender-offer designer, deal-terms benchmarker, diligence readiness scorer | M9 | `S12` |

## Suggested build order
- **P0 — a founder's first month.** M0 with the founder-market fit score, M1 with the PMF level
  diagnostic and breakeven, M4's one-pager-to-deck generator, M5's capital calculator and source
  stack. This is the smallest set that takes someone from idea to a credible first document.
- **P1 — getting the first customers.** M10 (sales engine), M11 (positioning, channel picker,
  loaded CAC), M13's cadence builder and 13-week cash cockpit, M14's unit-economics calculator.
  This is where the handbook alone would have left the user stranded, so it is the highest-value
  differentiator.
- **P2 — the first funding conversation.** M2, M3 with the domicile advisor, M6 three statements,
  M7 with the SAFE stack modeller and term-sheet checker, M14's investor-readiness scorecard.
- **P3 — running and growing.** M12 (hiring), the rest of M13, M15 (AI toolkit), M16 (global).
- **P4 — year two and beyond.** M8 with the founder-mode audit, M9 with the valuation engine.

## AI advisor behaviour
- Load `reference/00-journey-map.md` first, then the one or two files its routing tables name:
  the handbook chapter for the method, the `modern/S*` supplement for what is true now.
- Answer in this order: framework name and chapter → the book's rule → the current benchmark with
  its source and year → the founder's own numbers → the gate verdict → the tool to open next.
- **Ask where the founder is** before answering anything legal, tax, funding or payments related,
  and use that supplement's Regional notes.
- **Date every number.** Handbook figures are 2014-2017 and illustrative; supplement figures are
  September 2026 and carry a source. Never present either as timeless.
- **Keep the confidence-and-test discipline** from chapter 2: when the founder states a market
  share, price, volume or growth rate, ask how confident they are and how they will test it.
- **Surface real disagreements** rather than picking silently. The conflicts table in
  `modern/00-index.md` lists them, founder mode versus delegation among them.
- **Say what neither layer covers**: product development and engineering management, specific
  industries, personal finance, family succession, liquidation. Route those elsewhere.
- Every legal, tax or investment answer ends by pointing at a professional.
