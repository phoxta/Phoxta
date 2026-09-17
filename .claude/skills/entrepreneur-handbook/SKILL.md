---
name: entrepreneur-handbook
description: Advise founders and build "launch and grow your business" product features, using the distilled frameworks of HBR's Entrepreneur's Handbook (2018) plus a researched 2026 layer covering what the book skips or gets dated on. Use whenever a task involves evaluating a business idea, validating a market or measuring product-market fit, business model and strategy, pricing, choosing a legal form, writing a business plan / pitch deck / investor memo, financing (bootstrapping, loans, crowdfunding, SAFEs, angels, VC, term sheets, dilution, IPO), financial statements, breakeven, unit economics (CAC, LTV, churn, burn, Rule of 40), sales, marketing, hiring and equity splits, operations and cadence, using or building with AI, scaling and founder leadership, country-specific rules, or selling/exiting a business. Also use when designing or coding modules, quizzes, calculators, checklists or AI-advisor flows for a founder-facing web app.
---

# Entrepreneur Handbook

Two layers on one journey.

1. **The handbook** — *HBR's Entrepreneur's Handbook: Everything You Need to Launch and Grow Your
   New Business* (Harvard Business Review Press, 2018), distilled into one file per chapter and
   appendix. Every framework, table, question list, checklist and threshold kept; restated, not
   transcribed. This layer supplies the **method**: the questions a founder must answer and the
   order to answer them in.
2. **The 2026 layer** — thirteen researched supplements in `reference/modern/`, written September
   2026 from primary sources with roughly 800 cited URLs. This layer supplies the **current
   answers**: the functions the book never covered (sales, marketing execution, hiring,
   operations, modern metrics, AI) and fresh numbers where the book went stale (financing, legal,
   product-market fit, leadership, exit, and a world beyond the US).

Use it to advise a founder, or to build the product.

## How to use it

1. Read `reference/00-journey-map.md` first. Ten stages, the gate each must pass, and **two
   routing tables** from the user's question to the one or two files to load.
2. Load the handbook chapter for the method and the matching `modern/S*` supplement for what is
   true now. Most questions need one of each; many need only the supplement.
3. Answer in this shape: framework name and chapter → the book's rule → the current benchmark
   with its source and year → the founder's own numbers applied → the gate verdict → next step.
4. When a founder states a market share, price, volume or growth rate, ask for their confidence
   and how they will test it. That discipline is from chapter 2 and still the most useful habit
   in the book.
5. Ask where the founder is incorporated before answering anything legal, tax or funding related.
   Every supplement has a Regional notes section for exactly this.
6. For product work start from `app/module-spec.md`, then `app/worked-example.md`, then build the
   screens with the `phoxta-builder` skill.

## The journey in one glance

| Stage | Question | Handbook | 2026 layer |
|---|---|---|---|
| 0 Founder fit | Am I the right person for this? | `01-founder-fit.md` | `modern/S13` |
| 1 Opportunity | Real problem, real market, real profit? | `02-opportunity.md`, `B-breakeven.md` | `modern/S10` |
| 2 Model & strategy | How do we make money, and why us? | `03-business-model-and-strategy.md` | `modern/S10`, `S05` |
| 3 Legal form | Which entity, and what is written down? | `04-legal-structure.md` | `modern/S09` |
| 4 Plan & pitch | Can a stranger back this in two minutes? | `05-business-plan.md` | `modern/S13`, `S02` |
| 5 Startup money | How much to open, from where? | `06-startup-financing.md` | `modern/S06` |
| 6 Launch & operate | How do I get customers and run the place? | `A-financial-statements.md`, `B-breakeven.md` | `modern/S01`–`S05` |
| 7 Growth money | Debt, equity or cash flow, from whom? | `07-growth-financing.md`, `08-angels-and-vc.md` | `modern/S06`, `S05` |
| 8 Scale | Can the organisation keep up? | `10`, `11`, `12` | `modern/S11`, `S03` |
| 9 Harvest | What is it worth, and how do I cash out? | `13`, `C-valuation.md`, `09-going-public.md` | `modern/S12` |

Cross-cutting: `modern/S07` (AI in and as the business) and `modern/S08` (the founder's country).

## Rules of thumb worth reaching for first

**From the handbook (durable method).**
- Preparation beats passion; passion fades and does not predict success. (ch 1)
- Define the problem before the solution. Expense lines come from experience; revenue lines are
  hypotheses until customers exist. (ch 2)
- Reject anything below the risk-return line, and always compare against doing nothing. (ch 2)
- A model must pass both the narrative test and the numbers test. (ch 3)
- Choose the legal form for where you are going, not where you are. (ch 4)
- Plans are judged on people and model, not spreadsheets; say how investors get out. (ch 5)
- Size the launch capital first, then stack sources cheapest-first. (ch 6)
- Match asset life to financing term; stress-test with EBIT halved. (ch 7)
- Never outsource the customer-facing link. (ch 10)
- Breakeven = fixed costs ÷ unit contribution margin. Value is a range, never one number. (apps B, C)

**From the 2026 layer (current practice, each sourced in its file).**
- The founder personally closes the first 10-25 customers; hire two reps, not one. (`S01`)
- Win one channel before adding a second; discovery quality beats persuasion. (`S01`, `S02`)
- Product-market fit has levels, is measured continuously, and can be lost again. (`S10`)
- Retention curve first, growth second. Know your CAC payback and burn multiple before raising. (`S05`)
- Efficiency now gates growth: the Rule of 40 median rose while growth fell. (`S05`)
- SAFEs are the seed default; know your post-money cap and stacked dilution before signing. (`S06`)
- Prior same-industry experience predicts founder success better than any trait. (`S13`)
- AI raises individual output widely but reaches the P&L rarely; redesign the workflow, not the
  task. (`S07`)
- Selective founder depth beats blanket delegation, chosen per task rather than per personality. (`S11`)
- Liquidity no longer requires an exit: tender offers and secondaries are now a normal path. (`S12`)

## Guardrails
- **Not legal, tax or investment advice.** Anything touching entities, equity, securities or a
  sale ends with "take this to counsel / an accountant / an appraiser". `modern/S09` flags the
  items even its research could not settle.
- **Cite and date every number.** Handbook statistics are 2014-2017 and illustrative. Supplement
  benchmarks are September 2026 and carry a bracketed source; quote the source and the year.
  `modern/S06`, `S09`, `S12` and `S07` age fastest.
- **Keep the evidence hierarchy.** The supplements separate randomised trials and large primary
  datasets from vendor surveys and from opinion, and label their weaker citations. Carry those
  labels into your answer rather than flattening everything into fact.
- **Ask the country first.** Legal forms, tax reliefs, funding sources, payment rails and filing
  deadlines all differ. Never give a US answer to a non-US founder by default.
- **Show real disagreements.** `modern/00-index.md` lists seven places where the book and current
  practice genuinely conflict. Present both, then recommend.
- **Still uncovered by either layer:** product development and engineering management, specific
  industries, the founder's personal finances, family succession and liquidation. Say so and
  route to the Phoxta knowledge base rather than inventing.
- **Do not transcribe the book** into product copy or generated documents. Use the distilled
  frameworks and attribute HBR when naming one.

## Files
- `reference/00-journey-map.md` — stages, gates, artefacts, both routing tables. **Start here.**
- `reference/01-…13-*.md` — one file per handbook chapter.
- `reference/A-…D-*.md` — the appendices: financial statements, breakeven, valuation, Rule 144.
  Formula-complete, with book-stated and derived formulas labelled separately.
- `reference/glossary.md` — 87 terms, alphabetical then grouped by stage.
- `reference/further-reading.md` — the book's own 37 recommended sources.
- `reference/modern/00-index.md` — the 2026 layer's router, plus the conflicts table. Start here
  for anything current.
- `reference/modern/S01…S13` — the thirteen supplements. Each has the same fourteen sections and
  its own numbered Sources list.
- `app/module-spec.md` — the app's modules and tools, with inputs → outputs, the shared venture
  record, and a build order.
- `app/worked-example.md` — two Phoxta personas run through the frameworks end to end.
- `reference/_DISTILL_SPEC.md` and `reference/modern/_SUPPLEMENT_SPEC.md` — the two recipes used
  to build this skill. Reuse them to add another book, or to re-run the research when it ages.
