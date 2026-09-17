# S07 — The AI-native company: building and running a business with AI (2026 layer)
Supplements: every stage of `00-journey-map.md`, because the handbook (2018) pre-dates generative AI
entirely. It updates `02-opportunity.md` (what is now cheap to build and test),
`03-business-model-and-strategy.md` (defensibility, the moat debate, inference in the cost
structure), `06-startup-financing.md` / `08-angels-and-vc.md` (funding concentration),
`10-sustaining-growth.md` (the headcount-to-revenue curve), `A-financial-statements.md` /
`B-breakeven.md` (variable cost per unit of *usage*) and `04-legal-structure.md` (AI regulation and
IP). Load when a founder asks "how do I use AI in my business", "should I build an AI product",
"what's my moat", "can I stay small", or "what do the AI rules require of me".

## What changed since 2018
- **Software got cheap to write and expensive to trust.** Karpathy named "vibe coding" in Feb 2025 —
  describe intent, accept code you barely read — then declared it superseded by "agentic
  engineering" as tools got reliable around Dec 2025 [20][21].
- **The headcount-to-revenue curve broke at the top end.** Cursor/Anysphere ~$2B ARR on 300+ staff
  (~$6.7M/employee) [16]; Lovable $100M ARR at 45 FTE → $400M at 146 [14][15]. Median private SaaS
  is ~$130K/employee [14].
- **Adoption is wide but shallow.** 88% organisational adoption [8][9] and 50.4% of US businesses
  paying for AI by Mar 2026 [3] — yet only 17-20% of US firms tell the Census they actually *use* it
  in producing goods or services [4][5], and McKinsey finds 80% reporting productivity gains against
  37% reporting any EBIT impact, with "high performers" still 6% [6][7].
- **Inference became a real line of COGS.** AI-native gross margins ~52% in 2026 (from 41% in 2024)
  vs 75-85% for SaaS; inference is 20-23% of product cost [32][33].
- **Agents got a plumbing standard** — MCP went to the Linux Foundation's Agentic AI Foundation in
  Dec 2025, with native support from Anthropic, OpenAI, Google and Microsoft [39][40] — and
  **capital concentrated violently**: H1 2026 global venture hit a record $510B, with OpenAI and
  Anthropic alone taking $217B, 43% of *all* startup funding [42].
- **Law arrived, then slipped.** The EU Digital Omnibus (in force 27 Jul 2026) pushed high-risk AI
  duties to Dec 2027, but Art. 50 transparency still applies from 2 Aug 2026 [44][45].
- **Copyright got a price tag.** Anthropic's $1.5B author settlement was approved in July 2026 —
  training on lawfully obtained books was fair use; keeping pirated copies was not [50][51].
- **The backlash is evidenced.** MIT NANDA put 95% of enterprise genAI pilots at zero measurable
  P&L return [11]; METR's RCT found devs 19% *slower* while believing they were 20% faster [10].

## Core ideas (current consensus)
- **AI-native is an architecture claim, not a feature claim.** CRV's remove test (Mar 2026): turn the
  AI off — degrade = AI-enabled, stop = AI-native. The harder commercial test is the second: does a
  better foundation model make you more valuable, or replace you? [1]
- **It is an operating-model choice.** McKinsey's high performers are defined by workflow *redesign*
  (~75% vs ~25%) [6][7]; bolting a chatbot onto a human-shaped process is the modal failure.
- **Agents, not chat, are the 2026 unit.** Grady & Huang (Sequoia, Jan 2026): 2023-24 apps were
  "talkers", 2026-27 apps are "doers" — moving the market from software to services budgets [31].
- **Agentic workflows beat waiting for the next model.** Ng (AI Fund / YC): outline → search → draft
  → critique → revise gives a bigger quality jump than a model upgrade, and execution speed is the
  best predictor of startup success [56].
- **AI raises the floor and substitutes for a teammate** (randomised P&G experiment, 776
  professionals: individuals with AI matched two-person teams without it, at 16.4% less time
  [24][25]) — but **it also amplifies whatever your engineering system already is**: DORA finds
  adoption now correlates with throughput (a reversal) yet still negatively with stability [22][23].
- **The "GPT wrapper" sneer aged badly; so did "data moat".** Casado & Wang (a16z, 2026): value is
  accruing at the application layer and brand is becoming a real moat [28]; a16z argued in 2019 most
  data moats are empty [29]. Durable defensibility is still Currier's list — network effects,
  embedding, data loops [30].
- **Model choice is a routing decision, not an identity:** 81% of enterprises run 3+ model families
  in production (from 68%) [35][36] and open weights went 11% → 29% of gateway tokens between April
  and June 2026 [38].
- **Evals are the product discipline** — Husain & Shankar: 60-80% of production AI dev time is error
  analysis and evaluation; read real traces by hand first, keep judges binary, and treat a 100% pass
  rate as evals that are too easy [54][55]. **Agent security is likewise architectural**: Willison's
  lethal trifecta (private data + untrusted content + an outbound channel) is only fixed by removing
  a leg, not by a better system prompt [41].
- **Small is a strategy, not a phase.** YC's W26 batch: 3x as many companies at $1M annualised as
  W25, record 14% average week-on-week growth, 22 solo founders (11%) [18]; Tan says teams under
  ten reach ~$10M revenue [19].

### Evidence vs hype (read this before quoting any number above)
- **EVIDENCE (randomised / large-sample):** METR's RCT — 16 experienced devs, 246 real tasks, 19%
  slowdown against a self-reported 20% speedup [10]. The P&G field experiment — 776 professionals,
  randomised, 16.4% time saving and a team-equivalence effect [24]. DORA's throughput-up /
  stability-down pattern [22][23]. Census BTOS — nationally representative, and it says AI *use* is
  17-20%, not 80% [4][5].
- **EVIDENCE (credible survey, self-reported):** McKinsey 80%/37% [6][7]; ICONIQ's 305 AI-product
  executives on margins and inference [32][33]; Ramp's card panel [2][3]; a16z's CIO survey [35][36].
- **HYPE, or at least unaudited:** vendor resolution rates. Fin publishes 67-76%, its own case
  studies cluster at 42-50%, an independent 500-ticket test landed at 38%; Decagon self-reports 80%
  deflection against 49% in a head-to-head. Gartner's honest frame: ~45% deflected, ~14% fully
  self-resolved [52][53].
- **HYPE with a real kernel — "95% of AI pilots fail."** MIT NANDA rests on 52 interviews, 153 survey
  responses and 300 public deployments: directional, not a census, and challenged within weeks
  [11][12]. Its defensible core (only ~5% of *custom* tools reach production; failure is workflow
  fit, not model quality) matches McKinsey's 80/37 gap [6][11].
- **HYPE — the one-person billion-dollar company.** Altman's betting-pool remark is an anecdote; as
  of September 2026 no verified one-person $1B company exists. The strongest adjacent datapoint is
  a solo-built open-source agent (OpenClaw) acquired by OpenAI in Feb 2026 [17].
- **Hype in the *other* direction:** "AI does nothing" is also unsupported — 53% population adoption
  in three years and $172B/year of estimated US consumer value [8][9]. And watch the self-report
  gap: METR's participants were wrong about their own speed by ~39 points [10], so any "AI saves us X
  hours" without a control is a feeling, not a finding.

## Frameworks & playbooks

| Framework | Author / year | What it says | Use when |
|---|---|---|---|
| The remove test / model-improvement test | CRV, *What Is AI-Native?* (Mar 2026) | Turn the AI off: degrade = AI-enabled, stop = AI-native. Then ask whether better base models make you more valuable or redundant, and what remains valuable if the model were swapped tomorrow [1] | Positioning; deciding whether to claim "AI-native" to investors |
| Software 1.0 / 2.0 / 3.0 | Andrej Karpathy (2017, 2025) | 1.0 = written code, 2.0 = trained weights, 3.0 = prompts to a model as the program; English becomes a programming surface [21] | Explaining to a team why the build process changed |
| Vibe coding → agentic engineering | Karpathy (Feb 2025; Dec 2025 onward) | Vibe coding = accept AI output without reading it (fine for prototypes, throwaway tools); agentic engineering = specs, tests, review and agents run as a managed system [20] | Deciding what may be vibe-coded and what may not |
| Agentic workflow loop | Andrew Ng, AI Fund / YC (2024-26) | Outline → search → draft → self-critique → revise beats single-shot prompting; slower per call, much higher quality; pick *concrete* ideas over vague ones and optimise for speed of iteration [56] | Designing any AI feature that must be reliable |
| Lethal trifecta / Agents Rule of Two | Simon Willison (Jun 2025); Meta's formulation | An agent with private data **and** untrusted input **and** an outbound channel can be made to exfiltrate. Allow at most two; sandbox and log if you truly need all three [41] | Before giving any agent write access or tool access |
| Error-analysis-first evals | Hamel Husain & Shreya Shankar (2025-26) | Read real production traces by hand, open/axial-code the failures, *then* build a binary LLM-judge for the top failure modes; generate synthetic tests from explicit dimensions, not "make me test cases" [54][55] | The moment an AI feature has users |
| Defensibility trio | James Currier, NFX | Network effects, embedding (deep integration you can't rip out) and data loops are the durable moats; AI alone is not one [30] | The "what's your moat" question in any pitch |
| Value-accrual thesis | Martin Casado & Sarah Wang, a16z (2026) | Value is accruing at the application layer; brand is becoming a real moat; foundation labs keep moving up into applications, so pick a layer you can defend [28][29] | Deciding build-on-top vs build-the-model |
| Talkers → doers / services TAM | Pat Grady & Sonya Huang, Sequoia (Jan 2026) | Long-horizon agents make *services* addressable by software; price the outcome, not the seat [31] | Pricing and TAM slides for an agent product |
| AI-amplifier model | DORA (2025-26) | AI magnifies existing engineering strength or dysfunction; the ROI runs through code review, testing, version control and fast feedback [22][23] | Before scaling AI-written code volume |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| US businesses paying for AI | 50.4% (first crossing of 50%); by vendor Anthropic 43.8%, OpenAI 39.8%, 16% pay both (vs 8% a year earlier) | Ramp panel, 70,000+ firms | [2][3] | 2026 |
| Firms paying for open-weight models | 6.4% of AI-spending firms, 3.6% of all; top-1% AI spend $7,205/employee/month | same | [2] | Sep 2026 |
| Token price and mix | blended $0.68/M, −41% from a Mar 2026 peak of $1.15; frontier models 45% of token share, down from 53% | same | [2] | Sep 2026 |
| US firms *using* AI in operations | 17-20%; 20-23% expect to within 6 months; by size 37% (250+ staff); 32% (100-249); <20% (≤4 staff) | Census BTOS, nationally representative | [4][5] | Dec 2025-May 2026 |
| Global adoption | 88% organisational; 53% of population within 3 years (faster than PC or internet) | Stanford AI Index | [8][9] | 2026 |
| Productivity vs EBIT impact | 80% see individual gains, 37% report EBIT impact; "high performers" (≥5% EBIT from AI) are 6%, flat YoY, and ~75% of them redesigned workflows vs ~25% of others | McKinsey, 1,719 respondents | [6][7] | Aug 2026 |
| Enterprise LLM spend and model mix | $4.5M → $7M over two years, $11.6M expected by end-2026; growing ~75% YoY; innovation-budget share 25% → 7%; 81% run 3+ model families in production (from 68%) | a16z CIO survey | [35][36] | 2026 |
| Open-weight share of tokens | 11% (Apr) → 29% (Jun) on Vercel AI Gateway; ~61% of OpenRouter tokens were Chinese open-weight models by May | Vercel / OpenRouter, reported | [38] | 2026 |
| AI-native gross margin and cost mix | ~52% (2026) from 41% (2024), vs 75-85% for SaaS; trajectory 45% → 53% → 59% (2025-27); inference is 20-23%, talent 26-28% at GA/scaling; VC view 50-60% typical, fastest-scaling cohort ~25% and often negative | ICONIQ (305 execs) / Bessemer | [32][33][34] | 2026 |
| Revenue per employee | AI leaders: Cursor ~$6.7M, Lovable ~$2.77M ($100M ARR at 45 FTE → $400M at 146); earlier Midjourney $2M, OpenAI $1.5M. Median private SaaS ~$130K | company-reported / Dealroom | [13][14][15][16] | 2025-26 |
| YC W26 batch | 3x more companies at $1M annualised vs W25; 14% avg week-on-week growth (record); 22 solo founders (11%); ~25% of YC startups had 95% of code AI-written | Y Combinator / Garry Tan | [18][19] | 2026 |
| Venture funding, AI share, concentration | $510B in H1 2026 (vs $440B for all of 2025); >70% of global Q2 capital to AI (from ~50%); OpenAI + Anthropic $217B = 43% of all H1 funding; 3 deals = 67% of Q1 AI funding | Crunchbase / PitchBook | [42][43] | 2026 |
| Developer RCT and team equivalence | −19% actual speed vs +20% self-reported; 16 devs, 246 tasks; individual + AI ≈ two-person team without AI, −16.4% time | METR; 776 P&G professionals, randomised | [10][24] | 2025 |
| Trust and stability | ~30% little/no trust in AI code ("somewhat+" fell to ~70% from 87.9%); throughput ↑, stability still ↓ | DORA | [22][23] | 2025-26 |
| GenAI pilots with no P&L return | 95%; only ~5% of custom tools reach production | MIT NANDA (52 interviews, 153 surveys, 300 deployments) | [11] | 2025 |
| Workslop | 40% of workers hit it; ~2 hrs each; ~$186/worker/month; >$9M/yr at 10,000 staff | Stanford/BetterUp via HBR | [26][27] | 2025 |
| AI support resolution | vendor 67-80%, own case studies 42-50%, independent tests 38-73%; Gartner: ~45% deflected but only ~14% fully self-resolved | Fin/Decagon, independent, Gartner | [52][53] | 2026 |
| MCP ecosystem | ~97M monthly SDK downloads; 9,400+ public servers; 41% of software orgs in limited/broad production | MCP / Stacklok | [39][40] | 2026 |

## Decision rules & rules of thumb
- **If removing the AI only degrades the product, don't call it AI-native** — or price it as if it
  were. **If a better base model makes you redundant, you are a feature:** name what survives a model
  swap — workflow, distribution, brand, data loops, integrations [1][28][30].
- **If you have fewer than ~50 real production traces, don't build an LLM-judge** — hand error
  analysis first; budget 60-80% of AI engineering time for evaluation [54][55].
- **If an agent touches private data, untrusted input and an outbound channel, redesign it:** cut a
  leg, or sandbox + log + human approval on writes [41].
- **If gross margin is under ~50% and inference over ~25% of revenue, fix routing before you raise**
  [32][33]; **default to a cheap or open-weight model and escalate**, reserving frontier models for
  the hard minority, with a second provider wired for failover [2][37][38].
- **If AI writes a large share of your code, fix review, tests and rollback first** — throughput
  rises, stability falls, and the ROI runs through the control system [22][23]. **Vibe-code
  prototypes and internal tools; never vibe-code money, auth or personal data** [20].
- **If you can't measure it against a control, don't claim a productivity gain** — METR's
  participants were wrong about their own speed by ~39 points [10].
- **If output is generated faster than it can be consumed, you are manufacturing workslop** —
  measure the receiver's remediation time (~2 hrs per instance) [26][27].
- **If you sell a support agent, publish resolution (closed without escalation), not deflection** —
  buyers discount vendor numbers by 17-25 points [52][53].
- **If you have EU users and a bot or synthetic media, ship the disclosure now** (Art. 50, from
  2 Aug 2026), and **if you fine-tuned on scraped content, document provenance** — the Anthropic
  settlement turned on acquisition, not training [44][45][50][51].
- **If you are raising and you are not AI, assume a harder market**: >70% of global Q2 2026 venture
  dollars went to AI, and 43% of H1 funding to two companies [42].
- **Keep a human in the loop where being wrong is asymmetric** (refunds, pricing, contracts, anything
  irreversible); automate where errors are cheap and visible [11][41].

## Process / steps
1. **Map workflows before buying anything** — the 10 processes eating the most team hours; high
   performers are separated by redesign, not tool count [6][7].
2. **Classify each: automate, augment, leave alone.** Automate where errors are cheap and reversible;
   augment where judgement matters; leave alone where the relationship is the product.
3. **Instrument the baseline** (time, volume, error rate, cost) *before* the AI goes in — otherwise
   you will report a feeling, as METR's developers did [10].
4. **Build the thinnest agentic loop that works** — outline, retrieve, draft, critique, revise —
   rather than one mega-prompt [56].
5. **Collect 50-200 real traces, read them, code the failures** into named modes; then write binary
   judges for the top 2-3 [54][55].
6. **Do the security pass:** private data + untrusted content + outbound channel? Remove a leg, or
   sandbox, require approval on writes, log every tool call [41].
7. **Cost-engineer:** measure tokens per *successful task*; route to the cheapest model that passes
   evals; cache; set per-tenant spend caps [2][33][37].
8. **Set the reliability gate before launch** (target pass rate, escalation path, behaviour when the
   model is down or wrong) [54][55], then **publish the honest metric** — resolution not deflection,
   tasks completed not tokens processed [52][53].
9. **Re-run the redesign quarterly** — blended token price fell 41% in six months, so last quarter's
   architecture is often last quarter's cost [2].
10. **Write the compliance one-pager once** (jurisdictions, disclosures, data flows, training stance)
    [44][45][46][48], and **re-decide build vs buy every two quarters** — custom enterprise tools
    rarely reach production, so buy the commodity and build the differentiated slice [11].

## Worksheets, checklists & questions
**AI-native self-assessment** [1][6]
- Switch the AI off today: does the product degrade or stop? If the base model got 2x better, are we
  more valuable or less necessary? If it were swapped tomorrow, what of ours is still unique?
- Which workflows did we *redesign* (not just accelerate) in the last two quarters? What share of
  our cost base is inference, and is it rising or falling per successful task?

**Moat audit** [28][29][30]
- Network effects: does each new user measurably improve the product for the others? Embedding: what
  would a customer have to rip out to leave — how many integrations, how deep?
- Data loop: what do we accumulate that a rival with the same model can't buy or scrape in a quarter?
  Brand: who thinks of us first, in which category, and why?
- If all four are weak: is the plan speed, price, or a niche too small to interest the labs?

**Function-by-function AI plan** (per function: task, tool, human checkpoint, metric)
- Product/engineering: what may be vibe-coded; what needs specs + tests + review [20][22].
- Sales: research and drafting yes, the argument and the close human (`S01-sales.md`). Marketing:
  production scale is free, distinctiveness is not (`S02-marketing.md`).
- Support: publish resolution rate; define escalation and the "I don't know" path [52][53].
- Ops/finance: reconciliation, categorisation, drafting; approvals human and logged. Hiring: what did
  we tool instead of hiring this quarter? (`S03-hiring-and-people.md`)

**Agent safety checklist** [41]
- Private data? Untrusted content? Outbound channel? (All three: stop and redesign.)
- Least privilege per tool; read-only agents separated from write agents; human approval on
  irreversible actions; full tool-call audit log; kill switch; per-run spend cap; test with
  adversarial content planted in the documents or emails the agent will read.

**Eval readiness** [54][55]
- A labelled trace set, hand-read by a named person, with a date? Top three failure modes and the
  pass rate on each? Judges binary, pass rate under 100%? Do evals re-run on every prompt or model
  change, and what does production do when one fails?

**Unit-economics sheet** [2][32][33]
- Tokens and cost per *successful task*; gross margin per plan; margin if usage doubles.
- Model mix by volume and cost; share of calls downgradable without failing evals; cache hit rate;
  retry rate; the 5% of users generating most of the cost.

**Regulatory one-pager** [44][45][46][48][50]
- Which jurisdictions do our users sit in? Does Art. 50 disclosure apply to any surface? Are we a
  deployer or provider of anything classifiable high-risk (Annex III)? Which US state laws apply
  (CA SB 53 thresholds; CO SB 26-189 from Jan 2027)?
- What did we train or fine-tune on, and can we prove lawful acquisition? What customer data goes to
  which provider, under what retention and training terms?

## Regional notes
- **US** — loudest adoption numbers, most fragmented law. No federal AI statute; California's SB 53
  (frontier transparency above 10^26 FLOPs, up to $1M per violation for firms over $500M revenue)
  took effect 1 Jan 2026, and Colorado repealed its 2024 AI Act for the narrower SB 26-189 (duties
  from 1 Jan 2027). A Dec 2025 executive order and a DOJ litigation task force push preemption, but
  as of Aug 2026 no state AI law had been preempted [46][47].
- **EU** — the Digital Omnibus on AI (Reg (EU) 2026/1744, in force 27 Jul 2026) deferred Annex III
  high-risk duties to 2 Dec 2027 and Annex I to 2 Aug 2028. Still live for a small company: GPAI
  obligations (since Aug 2025) if you are a model provider, and Art. 50 transparency from 2 Aug
  2026. A new EU-level sandbox gives SMEs priority access; national ones are due 2 Aug 2027 [44][45].
- **UK** — deliberately no AI bill. The government dropped the proposed TDM exception with
  rights-holder opt-out; its 18 Mar 2026 Report on Copyright and AI changed no law and signalled
  wait-and-see plus industry licensing [48][49]. Effect: licence, or document provenance.
- **Africa / Nigeria** — the opportunity is applied AI on thin margins, not frontier models. African
  startups raised $3.42B in 2025 (+~45%) and $705M in Q1 2026 across 59 deals [57]; Nigeria (50),
  South Africa (49) and Kenya (31) host ~63% of tracked African AI startups [58], while Nigeria's Q1
  2026 funding fell 28% YoY to $78.6M [61]; ~40% of African corporates are experimenting with genAI
  [57]. Design constraints: power and connectivity costs, dollar-denominated inference against local
  revenue, data residency. Practical rule: price in local currency, meter inference hard, prefer
  small or open-weight models for routine calls [2][38].
- **India** — an MSME-scale wave: ~55% of Indian MSMEs are looking at AI adoption, 78% rank
  operational efficiency top, and government estimates put AI's contribution at up to $1.7T by 2035
  [60]; PwC India's MSME playbook is the local reference [59].
- **Middle East / Southeast Asia / LatAm** — not researched in this pass (unverified). Note too that
  the Ramp, Census, McKinsey and a16z figures above are US-weighted panels; Stanford's AI Index is
  the closest thing to a global baseline [8][9].

## AI-era notes — what to actually do this quarter
1. **Pick one workflow and redesign it end to end** (not "add AI to step 3") — the single behaviour
   separating McKinsey's 6% high performers from everyone else [6][7].
2. **Instrument before and after:** one baseline metric, one control if you can manage it — the
   cheapest defence against the METR self-report gap [10].
3. **Stand up an eval harness for your one AI-facing feature:** 50-200 traces, hand-read, three named
   failure modes, binary judges, and real engineering time budgeted for it [54][55].
4. **Run the lethal-trifecta audit on every agent already in production.** Most small companies find
   at least one agent that reads untrusted email, holds credentials and can send [41].
5. **Do a routing pass on cost:** measure cost per *successful task*, move the routine tail to a
   cheap or open-weight model, confirm with evals that quality holds. Prices moved 41% in six months
   — your last cost model is stale [2][38].
6. **Add a second provider for failover and test it** (81% of enterprises run 3+ model families)
   [35][36], and **adopt MCP for internal tool access** rather than bespoke integrations [39][40].
7. **Publish honest metrics:** "resolved without escalation" instead of deflection; "tasks completed
   per week" instead of hours saved [52][53].
8. **Write the workslop rule:** anything AI-drafted that goes to another human is reviewed and signed
   by the sender — receiver-side remediation is the hidden tax [26][27].
9. **Do the compliance one-pager.** EU users plus a chatbot or synthetic media? Ship the Art. 50
   disclosure now [45]; if you fine-tune, record provenance [50][51].
10. **Decide your defensibility story in one sentence** — network effect, embedding, data loop, brand
    or speed — and put next quarter's roadmap behind it [28][30]. Then **re-run the "hire or tool"
    question** on your next open role: the P&G evidence says one person with AI can match two
    without on cross-functional work [24]. It does not say zero people.

## The minds

| Person | Affiliation | Key contribution | Where to read |
|---|---|---|---|
| Andrej Karpathy | ex-OpenAI, ex-Tesla; Eureka Labs | Software 1.0/2.0/3.0; named "vibe coding" (2025) then "agentic engineering" (2025-26) | Talks and posts, summarised in The New Stack (2026) and Dealroom [20][21] |
| Ethan Mollick (with Dell'Acqua, Lakhani et al.) | Wharton; Harvard D^3 | The most readable evidence-first commentator on AI at work; the P&G cybernetic-teammate field experiment | oneusefulthing.org; SSRN working paper (2025) [24][25] |
| Andrew Ng | AI Fund; DeepLearning.AI; Stanford | Agentic workflows as the main near-term source of capability; speed and concreteness as startup predictors | YC Startup Library talk, *Building Faster with AI* [56] |
| Simon Willison | Datasette; independent | The lethal trifecta; the most practical running commentary on LLM security and tooling | simonwillison.net (2025-26) [41] |
| Hamel Husain & Shreya Shankar | Parlance Labs / UC Berkeley | Error-analysis-first evals; binary LLM judges; the de facto eval curriculum | Lenny's Newsletter (2025); Maven course; *Evals for AI Engineers* (O'Reilly, Oct 2026) [54][55] |
| Martin Casado & Sarah Wang | a16z | Where value accrues in AI; the "GPT wrapper" critique answered; brand as an emerging moat; the empty-data-moat argument | a16z podcast and essays (2019, 2026) [28][29] |
| Pat Grady & Sonya Huang | Sequoia | "Talkers → doers"; agents make services addressable by software; the 2026 agent thesis | *2026: This is AGI*; AI Ascent 2026 [31] |
| James Currier | NFX | Network effects, embedding and data loops as the durable moats; defensibility in the AI era | nfx.com library [30] |
| METR research team | METR | The only high-quality RCT on AI coding productivity, and honest about its own limits | metr.org (Jul 2025; design update Feb 2026) [10] |

Not verified in this pass (worth reading, currency unchecked): Elad Gil, Sarah Guo, Benedict Evans, Azeem Azhar.

## Pitfalls
- **Calling yourself AI-native because you shipped a chatbot** — investors now apply the remove and
  model-swap tests [1] — and **buying tools instead of redesigning work**, the behaviour separating
  the 6% who see EBIT impact from everyone else [6][7].
- **Building custom internal AI tools that never reach production**; buy the commodity, build only
  the differentiated slice [11].
- **Shipping an agent before shipping evals** — without hand-read traces you can't tell a regression
  from a bad day [54][55] — or **calling a system prompt a control** against the lethal trifecta [41].
- **Letting AI-written code outrun review and tests** — throughput up, stability down [22][23].
- **Pricing per seat while paying per token** — how AI-native margins land at 25% instead of 60%
  [33][34]. **Believing vendor resolution rates** (independent tests run 17-25 points lower) and
  **over-automating the relationship** — deflection is not resolution, 45% vs 14% [52][53].
- **Producing workslop:** volume that shifts cost to the reader (~2 hrs, ~$186/worker/month) [26][27].
- **Assuming the EU delay means nothing applies** — Art. 50 still bites from Aug 2026 [45] — and
  **treating training data as free**; $1.5B says provenance matters [50][51].
- **Planning a raise on "AI adjacency"** in a market where two companies took 43% of H1 2026 startup
  funding [42].
- **Reading tiny-team revenue-per-employee figures as a plan** — Cursor, Lovable and ElevenLabs are
  outliers in a once-a-decade demand wave [13][14][15][16]; most small firms use no AI at all [4].

## Key terms
`AI-native` / `AI-enabled` — AI is the architecture and removing it stops the product / AI enhances a
product whose value predates it; the `remove test` distinguishes them [1].
`vibe coding` / `agentic engineering` — accepting generated code without reading it (Karpathy, 2025)
/ running coding agents under specs, tests and review as a managed system [20].
`Software 3.0` — prompting a model as the program; English as a programming surface [21].
`agentic workflow` — plan → retrieve → draft → critique → revise, rather than one prompt [56].
`long-horizon agent` — an agent pursuing a multi-step goal over time with its own tool calls [31].
`MCP (Model Context Protocol)` — open standard connecting models to tools and data; a Linux
Foundation project since Dec 2025 [39][40]. `computer use` — an agent driving a GUI directly.
`lethal trifecta` — private data + untrusted content + outbound channel = exfiltration risk, via
`prompt injection`: instructions planted in content the agent reads [41].
`eval` / `LLM-as-judge` / `error analysis` — a repeatable output-quality test against labelled cases
/ a model scoring another's output, best kept binary / hand-reading production traces and coding
failure modes before building any metric [54][55].
`inference COGS` — variable compute cost of serving a request; 20-23% of AI product cost [33].
`cost per successful task` — compute divided by tasks that actually passed, not by calls made.
`model routing` — sending each request to the cheapest model that passes its evals [2][37].
`open-weight` / `frontier model` — published weights you can self-host (Llama, Qwen, DeepSeek) / top-
capability proprietary models, now 45% of paid token share and falling [2][37][38].
`deflection vs resolution` — conversations kept from a human vs problems actually solved [53].
`workslop` — AI output that looks like work and moves the real work to the receiver [26][27].
`GenAI Divide` — MIT NANDA's framing: high adoption, low transformation [11].
`revenue per employee` — the tiny-team scoreboard; ~$130K median SaaS vs $2-7M at AI leaders [14][16].
`Annex III high-risk` / `Art. 50 transparency` / `GPAI obligations` — EU AI Act duties starting
2 Dec 2027 / 2 Aug 2026 / already in force since Aug 2025 [44][45].

## Build ideas for the app
- **AI-native diagnostic** — remove-test and model-swap answers, workflow-redesign count, inference
  share → an AI-native/AI-enabled verdict plus the gap to close [1][6].
- **Moat auditor** — product description, integrations, usage and retention data → scored
  network-effect / embedding / data-loop / brand assessment and the weakest link [28][29][30].
- **AI unit-economics calculator** — model mix, tokens per task, success rate, price plan → cost per
  successful task, margin at 2x usage, biggest routing saving, vs the ~52% median [2][32][33].
- **Agent safety gate** — each agent's data access, input sources and outbound channels →
  lethal-trifecta verdict, least-privilege fixes, approvals and log points, as a pre-launch gate [41].
- **Eval starter kit** — traces → guided failure-mode coding, binary judges, pass-rate dashboard and
  a regression alarm on every model/prompt change → "it seems fine" becomes a number [54][55].
- **Workflow redesign planner** — top 10 time-consuming processes, error cost, reversibility →
  automate / augment / leave-alone split, with a baseline-metric prompt before any purchase [6][10].
- **Regulatory one-pager generator** — jurisdictions, product surfaces, training practices →
  applicable duties (EU Art. 50 / Annex III, CA SB 53, CO SB 26-189, UK) and a provenance checklist
  [44][45][46][48].
- **Tiny-team benchmark card** — revenue, headcount, function coverage → revenue per employee vs the
  SaaS median and AI-leader outliers, plus the "hire or tool" prompt for the next role [14][16][24].

## Sources
[1] What Is AI-Native? The Founder's Guide (2026) — CRV — 31 Mar 2026 — https://www.crv.com/content/what-is-ai-native
[2] September 2026 Ramp AI Index: Cracks in the AI thesis, part 2 — Ramp — Sep 2026 — https://ramp.com/data/ai-index-sept-2026
[3] Ramp AI Index (methodology and series) — Ramp — 2026 — https://ramp.com/data/ai-index
[4] Large Firms With at Least 20 Employees Biggest AI Users — US Census Bureau — May 2026 — https://www.census.gov/library/stories/2026/05/ai-use-businesses.html
[5] Monitoring AI Adoption in the U.S. Economy — Federal Reserve FEDS Notes — 3 Apr 2026 — https://www.federalreserve.gov/econres/notes/feds-notes/monitoring-ai-adoption-in-the-u-s-economy-20260403.html
[6] The State of AI: Global Survey 2026 — McKinsey / QuantumBlack — 2026 — https://www.mckinsey.com.br/capabilities/quantumblack/our-insights/the-state-of-ai
[7] McKinsey State of AI 2026: 80% productive, 37% EBIT (digest of the Aug 2026 survey, n=1,719) — explainx.ai — Aug 2026 — https://explainx.ai/blog/mckinsey-state-of-ai-2026-roi-agentic-coding-august-2026
[8] The 2026 AI Index Report — Stanford HAI — 2026 — https://hai.stanford.edu/ai-index/2026-ai-index-report
[9] Inside the AI Index: 12 Takeaways from the 2026 Report — Stanford HAI — 2026 — https://hai.stanford.edu/news/inside-the-ai-index-12-takeaways-from-the-2026-report
[10] Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity — METR — 10 Jul 2025 — https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
[11] MIT Finds 95% Of GenAI Pilots Fail Because Companies Avoid Friction (on MIT NANDA's "GenAI Divide") — Forbes / Jason Snyder — 26 Aug 2025 — https://www.forbes.com/sites/jasonsnyder/2025/08/26/mit-finds-95-of-genai-pilots-fail-because-companies-avoid-friction/
[12] That Viral MIT Study Claiming 95% of AI Pilots Fail? Don't Believe the Hype (methodology rebuttal) — Marketing AI Institute — 2025 — https://www.marketingaiinstitute.com/blog/mit-study-ai-pilots
[13] Revenue per employee across AI startups (Cursor $3.3M, Midjourney $2M, OpenAI $1.5M) — Dealroom — Apr 2025 — https://x.com/dealroomco/status/1914264599505018989
[14] How Many Employees Does It Take to Reach $100M ARR Now? — nazr.com — 2026 — https://nazr.com/blog/how-many-employees-100m-arr
[15] Lovable Revenue: The Real ARR Numbers, Dated (2026) — Visionary Talks — 2026 — https://visionarytalks.com/lovable-revenue/
[16] Working at Cursor (Anysphere) in 2026: ~300 Employees, $2B ARR — JobsByCulture — 2026 — https://jobsbyculture.com/blog/working-at-cursor-2026
[17] OpenAI Called The One Person AI Startup And Three Founders Proved It — Forbes / Sandy Carter — 4 Apr 2026 — https://www.forbes.com/sites/sandycarter/2026/04/04/openai-called-the-one-person-ai-startup-and-three-founders--proved-it/
[18] YC W26 Demo Day: Everything You Need to Know — The VC Corner — 2026 — https://www.thevccorner.com/p/yc-w26-demo-day-2026-complete-breakdown
[19] Y Combinator startups are fastest growing, most profitable in fund history because of AI — CNBC — 15 Mar 2025 — https://www.cnbc.com/2025/03/15/y-combinator-startups-are-fastest-growing-in-fund-history-because-of-ai.html
[20] Vibe coding is passé. Karpathy has a new name for the future of software — The New Stack — 2026 — https://thenewstack.io/vibe-coding-is-passe/
[21] Vibe Coding Was Just the Warmup — Andrej Karpathy on the Dawn of Software 3.0 — Dealroom — 2025 — https://app.dealroom.co/news/note/vibe-coding-was-just-the-warmup-andrej-karpathy-on-the-dawn-of-software-3-0
[22] ROI of AI-assisted Software Development report — DORA / Google Cloud — 2026 — https://dora.dev/ai/roi/report/
[23] New DORA Report Claims Strong Engineering Foundations Drive AI Return on Investment — InfoQ — May 2026 — https://www.infoq.com/news/2026/05/dora-roi-ai-assisted-dev-report/
[24] The Cybernetic Teammate: A Field Experiment on Generative AI Reshaping Teamwork and Expertise — Dell'Acqua, Ayoubi, Lifshitz-Assaf, Sadun, E. Mollick, L. Mollick, Han, Goldman, Nair, Taub, Lakhani — SSRN — 2025 — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5188231
[25] The Cybernetic Teammate — Ethan Mollick, One Useful Thing — 2025 — https://www.oneusefulthing.org/p/the-cybernetic-teammate
[26] AI "workslop" sabotages productivity, study finds (Stanford / BetterUp Labs via HBR) — Axios — 24 Sep 2025 — https://www.axios.com/2025/09/24/ai-workslop-workplace-efficiency-study
[27] Harvard Business Review warns AI "workslop" is rotting companies from the inside — TNW — 2025 — https://thenextweb.com/news/ai-workslop-knowledge-decay-harvard-business-review-productivity
[28] Where Value Will Accrue in AI: Martin Casado & Sarah Wang — a16z — 2026 — https://a16z.com/podcast/where-value-will-accrue-in-ai-martin-casado-sarah-wang/
[29] The Empty Promise of Data Moats — a16z — https://a16z.com/the-empty-promise-of-data-moats/
[30] James Currier — NFX Library (network effects, embedding, data loops; AI-era defensibility) — NFX — https://www.nfx.com/library/james-currier
[31] 2026: This is AGI — Pat Grady & Sonya Huang, Sequoia Capital — Jan 2026 — https://sequoiacap.com/article/2026-this-is-agi
[32] 2026 State of AI Report: The Builder's Economy — ICONIQ Growth — Jul 2026 — https://www.iconiq.com/growth/reports/state-of-ai-2026
[33] 2026 State of AI: Bi-Annual Snapshot — The Execution Era of AI (PDF) — ICONIQ Analytics — Jan 2026 — https://cdn.prod.website-files.com/65d0d38fc4ec8ce8a8921654/6979532decf89bd3df2163b0_ICONIQ_Analytics_Insights_2026_State_of_AI_Bi-Annual_Snapshot.pdf
[34] AI Startup Gross Margins Run 50 to 60 Percent, Not the SaaS 80 Percent — Avante Ventures — 2026 — https://avanteventures.com/en/library/ai-startup-gross-margin-benchmark-2026
[35] a16z: Enterprise AI Spending is Growing 75% a Year — SaaStr — 2026 — https://www.saastr.com/a16z-enterprise-ai-spending-is-growing-75-a-year/
[36] Deep Dive: AI Adoption in the Enterprise (a16z CIO survey digest) — Michael Burnett — 2026 — https://michaelburnett3.substack.com/p/deep-dive-ai-adoption-in-the-enterprise
[37] Open-Weight Models Are Gaining Ground in Enterprise AI — Constellation Research — 2026 — https://www.constellationr.com/research/blog/open-weight-models-are-gaining-ground-enterprise-ai
[38] The State of Open-Weight Models in 2026: Llama, Qwen, Mistral, DeepSeek — jamesm.blog — 2026 — https://www.jamesm.blog/ai/state-of-open-weight-models-2026/
[39] The 2026-07-28 Specification — Model Context Protocol blog — 28 Jul 2026 — https://blog.modelcontextprotocol.io/posts/2026-07-28/
[40] MCP Adoption Statistics 2026 (SDK downloads, public servers, Stacklok production share) — Digital Applied — 2026 — https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol
[41] The lethal trifecta for AI agents: private data, untrusted content, and external communication — Simon Willison — 16 Jun 2025 — https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
[42] Global Startup Investment Hit Record $510B In H1 2026 As AI Boom Accelerates Funding And Exits — Crunchbase News / Gené Teare — 2 Jul 2026 — https://news.crunchbase.com/venture/global-startup-exits-ipo-ma-soar-ai-q2-h1-2026/
[43] Q1 2026 AI funding blows past 2025 total with three deals accounting for 67% of capital — PitchBook — 2026 — https://pitchbook.com/news/articles/q1-2026-ai-funding-blows-past-2025-total-with-three-deals-accounting-for-67-of-capital
[44] EU AI Act Omnibus Agreement — Postponed High-Risk Deadlines and Other Key Changes — Gibson Dunn — 2026 — https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/
[45] EU AI Act News: Digital Omnibus on AI, New Guidance on Risk Classification, GPAI, and Transparency Obligations — Mayer Brown — Jul 2026 — https://www.mayerbrown.com/en/insights/publications/2026/07/eu-ai-act-news-digital-omnibus-on-ai-new-guidance-on-risk-classification-gpai-and-transparency-obligations
[46] New State AI Laws are Effective on January 1, 2026, But a New Executive Order Signals Disruption — King & Spalding — 2026 — https://www.kslaw.com/news-and-insights/new-state-ai-laws-are-effective-on-january-1-2026-but-a-new-executive-order-signals-disruption
[47] US State AI Laws Tracker: What Changed in 2026 — Glacis — 2026 — https://www.glacis.io/guide-state-ai-laws
[48] TDM and training AI models: UK Government provides updated statement on copyright and AI — DLA Piper — 2026 — https://www.dlapiper.com/en/insights/blogs/mse-today/2026/tdm-and-training-ai-models
[49] Report on Copyright and Artificial Intelligence (PDF) — UK Government (DSIT/DCMS) — 18 Mar 2026 — https://assets.publishing.service.gov.uk/media/69ba692226909a14239612e4/CP2602959_-_Report_on_Copyright_and_Artificial_Intelligence_web.pdf
[50] Anthropic's landmark $1.5B copyright settlement is approved — TechCrunch — 20 Jul 2026 — https://techcrunch.com/2026/07/20/anthropics-landmark-1-5b-copyright-settlement-is-approved/
[51] AI in litigation series: An update on AI copyright cases in 2026 — Norton Rose Fulbright — 2026 — https://www.nortonrosefulbright.com/en/knowledge/publications/ce8eaa5f/ai-in-litigation-series-an-update-on-ai-copyright-cases-in-2026
[52] How AI Customer Service Agents Compare in 2026 (vendor-published resolution rates) — Fin AI / Intercom — 2026 — https://fin.ai/learn/ai-customer-service-agents-compared
[53] 10 Best AI Customer Support Tools for 2026 (real resolution rates, per-ticket costs) — Superframeworks — 2026 — https://superframeworks.com/articles/best-ai-customer-support-tools
[54] Why AI evals are the hottest new skill for product builders — Hamel Husain & Shreya Shankar on Lenny's Newsletter — 2025 — https://www.lennysnewsletter.com/p/why-ai-evals-are-the-hottest-new-skill
[55] AI Evals For Engineers & PMs (course) — Hamel Husain & Shreya Shankar, Maven — 2025-26 — https://maven.com/parlance-labs/evals
[56] Andrew Ng: Building Faster with AI — Y Combinator Startup Library — 2025 — https://www.ycombinator.com/library/Mf-andrew-ng-building-faster-with-ai
[57] Africa's AI Funding Wave: A Founder's Field Guide — AVODA Group — 2026 — https://avodagroup.org/africa-ai-startup-funding-wave/
[58] Nigeria Leads Africa in AI Startups, Despite Funding Gap — Techmanly — 2026 — https://www.techmanly.com/nigeria-leads-africa-in-ai-startups-despite-funding-gap/
[59] Unlocking the AI Edge for MSMEs (PDF) — PwC India — Mar 2026 — https://www.pwc.in/assets/pdfs/unlocking-the-ai-edge-for-msmes.pdf
[60] Small Businesses, Big Shift: What's Next For India's MSMEs? — CIOL — 2026 — https://www.ciol.com/digital-transformation/msme-day-2026-india-small-businesses-ai-digital-adoption-12111317
[61] Kenya Startup Funding Slips to KES 16.3B as Egypt and Nigeria Pull Ahead — Khusoko — 28 Jul 2026 — https://khusoko.com/2026/07/28/kenya-startup-funding-h1-2026-egypt-nigeria/
