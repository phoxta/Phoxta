# S09 — Legal structure and founder legal hygiene (2026 layer)
Supplements: `04-legal-structure.md` (Ch 4, Organizing Your Company) — which is US law as of 2018 and
stops at the six-form table — and touches `S06-financing-2026.md` (what investors require of the entity),
`05-business-plan.md` (the legal section) and `S12-exit-and-liquidity-2026.md` (QSBS, EOTs, flips). Scope: choosing and
forming an entity, keeping it financeable, and the founder hygiene (vesting, IP, cap table) that
decides whether a round closes. Load when a user asks "should I incorporate", "LLC or C-corp",
"Delaware or somewhere else", "how do I give my co-founder equity", "do I need to flip to the US",
or before any fundraise, first hire or exit module.

> **This is not legal or tax advice.** It is a research note for founders, current to September 2026.
> Entity and tax law changes fast and varies by jurisdiction and by facts. Every rule below carries a
> source and an effective date; anything marked "(verify with counsel)" was not confirmed against a
> primary source. Take any decision here to a qualified lawyer and accountant in your own country
> before acting — the handbook's own box on p. 64 says the same thing, and it is more true in 2026.

## What changed since 2018
- **Delaware is still the VC default, but it is no longer unchallenged.** Delaware's share of new IPO
  incorporations fell from 80-93% over the prior decade to **62% in 2025**, with Nevada ~17% and
  Texas ~4% [1]. Between Jan 2024 and Mar 2026, **49 Delaware public companies** filed re-domestication
  proposals; 26 of those in 2025 alone [1].
- **Delaware fought back with SB 21 (signed March 2025)**, narrowing entire-fairness exposure for
  conflicted and controller transactions (§144) and curbing books-and-records demands (§220); the
  Delaware Supreme Court upheld it on **27 February 2026** [1][7]. Texas (SB 29, signed 14 May 2025)
  and Nevada (AB 239, signed 30 May 2025) answered with codified business-judgment rules, derivative
  ownership thresholds, exclusive Texas/Nevada venue and **charter-level jury-trial waivers** [4][5][6][7].
- **QSBS got materially better — and tiered.** The One Big Beautiful Bill Act (enacted **4 July 2025**)
  created a 50%/75%/100% exclusion at **3/4/5 years**, raised the per-issuer cap from $10M to **$15M**
  (now inflation-indexed) and the issuer's gross-assets ceiling from $50M to **$75M** — all only for
  stock **acquired after 4 July 2025** [9][10][11]. This changed the C-corp-vs-LLC calculus more than
  anything since 2018. Two details that change the arithmetic: the cap is the **greater of $15M or
  10x the taxpayer's basis** (the 10x alternative survived unchanged), and gain *not* excluded on a
  3-to-4-year hold is taxed at **28%**, not the usual 20% [11].
- **The 83(b) election became a real IRS form.** Form 15620 was posted 7 Nov 2024 (Rev. 4-2025), and
  since **mid-2025 it can be filed online** through an IRS account instead of by certified mail
  [12][13][14]. The 30-day deadline did not move and still has essentially no exceptions [13].
- **The Corporate Transparency Act effectively stopped applying to US companies.** FinCEN's interim
  final rule of **26 March 2025** redefined "reporting company" to cover only foreign entities
  registered to do business in the US; a **final rule on 11 August 2026** made that permanent [15][16].
- **UK founders now have to prove who they are.** Companies House identity verification became
  mandatory on **18 November 2025** for directors, LLP members and PSCs under ECCTA 2023 [21][22][64].
- **UK employee equity got much wider.** Autumn Budget 2025 raised EMI's employee limit to 500, gross
  assets to £120M and the company option pool to £6M, and extended option life to 15 years, from
  **6 April 2026** [23][24][25][63].
- **Europe is building a 29th option.** The Commission proposed the "28th regime" / **EU Inc** on
  **18 March 2026** — an opt-in, digital-by-default EU company form, targeted at online formation in
  48 hours for ≤ €100 with no minimum capital — with agreement hoped for by end-2026 [32][33][34].
- **Formation is now a $400-500, two-day commodity in the US**, while Germany still requires a notary and
  €25,000 nominal capital for a GmbH [17][18][38][39]. The legal work that matters has moved from
  *forming* the company to *keeping it clean*. AI now drafts documents — and hallucinates in them:
  court AI-fabrication incidents rose from ~640 in late 2024 to **over 1,590 by mid-2026** [57][58].

## Core ideas (current consensus)
- **Entity choice is a financing decision first, a tax decision second.** Cooley's position is
  unchanged: Delaware because "corporate structures are familiar to many investors" and franchise tax
  is comparatively low — and if you operate in your home state you will register there anyway, so an
  exotic domicile buys little [8].
- **The 2018 rule "VCs won't hold S-corp stock" survives; the reason is unchanged.** Institutional
  funds are partnerships or LLCs and are ineligible S-corp shareholders. The book's "35 shareholders"
  figure is stale — the statutory cap is 100 (families may elect to count as one) (verify with counsel).
- **"LLC now, convert later" is a real but priced option, and QSBS is why.** Conversion costs time and
  money, and the **QSBS clock (5 years, or the new 3/4-year tiers) only starts when C-corp stock is
  issued** [9][11] — up to $15M per shareholder per issuer, stackable across founders [9][10][11].
- **Vesting is not negotiable, even for founders.** Carta's guidance and practitioner consensus is
  4 years with a 1-year cliff; advisors 2 years; early option pools 10-20%. Investors prefer no
  acceleration or double-trigger — single-trigger reads as a poison pill to acquirers [59].
- **The two things that stall a seed close are cap-table errors and missing IP assignments** — both
  fixable cheaply before you raise, expensive after [61].
- **A flip is a capital-markets move, not a tax trick — and it is close to one-way.** The Delaware flip
  makes a non-US company a wholly-owned subsidiary of a new Delaware C-corp so US investors can buy
  familiar preferred stock [54][56]; **IRC §7874 makes flipping back out very hard** [55]. If customers,
  revenue and investors are all local, a US holdco buys nothing and costs filings and a tax event [52][56].
- **Compliance is now identity-based.** Companies House IDV, NDPC/GAID registration in Nigeria and the
  EU Business Wallet all point one way: the state wants a verified human behind the entity [21][35][45].

## Frameworks & playbooks

| Framework / playbook | Author / source, year | What it says | Use when |
|---|---|---|---|
| Delaware C-corp default stack | Cooley GO Incorporation Package (reviewed Jul 2025) | DE C-corp + bylaws + founder restricted stock purchase agreements + CIIAA (IP assignment) + 83(b) — the documents Series A diligence expects [8][62] | Any venture-track US company |
| Domicile comparison (DE / NV / TX) | Sullivan & Cromwell (Jun 2025); Alston & Bird (Jan 2026) | Compare litigation forum, jury waiver, derivative thresholds, franchise cost; the three states have converged on defendant-friendly governance [7] | Reincorporation questions, controller-heavy cap tables |
| QSBS clock planning | Holland & Knight / Mintz / DWT (Jul 2025) | Date-stamp every issuance; pre- and post-4 Jul 2025 stock lives under different regimes; track the $15M per-issuer cap and $75M gross-asset test at issuance [9][10][11] | Incorporating, converting, or issuing new stock |
| 83(b) 30-day drill | IRS Form 15620; Goodwin (Jul 2025) | On any grant of unvested stock: file within 30 days, online or by mail (never both), give a copy to the company, keep proof [12][13][14] | Every founder and early restricted-stock grant |
| Founder vesting standard | Carta / practitioner consensus (2025-26) | 4-year vest, 1-year cliff, monthly thereafter; ~70% of employee grants carry a cliff vs ~half of management grants; double-trigger only [59] | Co-founder agreements, first hires |
| Cap-table hygiene before the raise | YC-ecosystem diligence practice (2025-26) | Clean ledger, every share and SAFE modelled to conversion, all IP assigned, all 83(b)s filed — before Demo Day, not after [61] | 60-90 days before any priced round |
| Delaware flip | LathamDrive; Wilson Sonsini (UK tax) | New DE C-corp issues mirror-image shares; local company becomes a 100% subsidiary; IP and contracts migrate on agreed terms [53][54] | Raising from US funds, US-centric revenue |
| Reverse-flip caution | Vircon Legal | §7874 anti-inversion effectively bars unwinding a US holdco; treat the flip as one-way [55] | Before flipping "just in case" |
| SEIS/EIS advance assurance | HMRC; Farrer & Co (Finance Act 2026) | Get HMRC's pre-investment view before the raise; approval is not automatic — 76% SEIS / 72% EIS approved in 2025-26 [26][27] | Any UK pre-seed/seed raise from UK angels |
| Startup Label (Nigeria) / DPIIT (India) | Nigeria Startup Act 2022, NITDA; Startup India/DPIIT | CAC-registered Ltd ≤ 10 yrs → NITDA label → tax and duty incentives [41][42][44]. Pvt Ltd or LLP ≤ 10 yrs, turnover ≤ ₹200 crore → free recognition, then a *separate* IMB application for §80-IAC [48][49] | Post-registration, before claiming any incentive |
| Singapore holdco | ACRA/IRAS rules (2026) | Pte Ltd, ≥ 1 resident director, ≥ S$1 capital; SUTE gives 75% / 50% exemption on first two S$100k slices for 3 years — but **pure investment-holding companies are excluded** [50][51] | Asian regional holdco, but not a shell |

## Benchmarks & numbers (2024-2026)

| Metric | Value | Segment / context | Source | Year |
|---|---|---|---|---|
| Delaware share of new IPO incorporations | 62% (was 80-93% prior decade) | US public markets | [1] | 2025 |
| Nevada / Texas share of new IPO incorporations | ~17% / ~4% | same | [1] | 2025 |
| Delaware re-domestication proposals | 49 total Jan 2024-Mar 2026; 26 in 2025 | US public companies; 13 of 18 2025 proposals chose Nevada | [1][2][3] | 2026 |
| Coinbase reincorporation to Texas | approved by ~78% of voting power, 15 Dec 2025 | largest single DExit | [1] | 2025 |
| QSBS per-issuer exclusion cap | $15M (from $10M), inflation-indexed | stock acquired after 4 Jul 2025 | [9][10] | 2025 |
| QSBS issuer gross-assets ceiling | $75M (from $50M), inflation-indexed | same | [9][10] | 2025 |
| QSBS tiered exclusion | 50% @ 3 yrs, 75% @ 4 yrs, 100% @ 5 yrs | same; pre-4 Jul 2025 stock keeps the 5-year rule | [9][11] | 2025 |
| 83(b) filing deadline | 30 days from transfer, no practical exception | US restricted stock | [13] | 2025 |
| BOI reporting population | US-formed entities exempt; only foreign registrants report | final rule 11 Aug 2026 | [15][16] | 2026 |
| Stripe Atlas formation | $500 one-time incl. first-year registered agent; ~2 business days; EIN, founder stock, 83(b) filing included | DE C-corp or LLC | [17] | 2026 |
| Clerky / Firstbase / Delaware ongoing | ~$425 + $99/yr / ~$399 / ~$300 franchise tax + ~$100 agent per year | secondary comparison (verify current rates) | [18] | 2026 |
| Companies House IDV | mandatory from 18 Nov 2025; free via GOV.UK One Login or via an ACSP | UK directors, LLP members, PSCs | [21][22] | 2025 |
| EMI limits from 6 Apr 2026 | employees 500 (from 250); gross assets £120M (from £30M); company pool £6M (from £3M); option life 15 yrs (from 10, retrospective); individual limit unchanged at £250k | UK | [23][24][25] | 2026 |
| EIS company limits from 6 Apr 2026 | annual £10M (from £5M), £20M knowledge-intensive; lifetime £24M, £40M KIC; gross assets £30M pre-investment | UK (verify with counsel) | [27][28] | 2026 |
| SEIS limits | unchanged: £250k company lifetime; £200k per investor per year; 50% relief | UK | [26][27] | 2026 |
| EIS/VCT sunset | shares issued before 6 April 2035; SEIS has no sunset | UK | [27] | 2024-26 |
| Advance assurance approval rate | 76% SEIS / 72% EIS (from 85% / 76% prior year) | HMRC statistics | [26] | 2025-26 |
| Making Tax Digital for Income Tax | from 6 Apr 2026 at £50k qualifying income; £30k in 2027, £20k in 2028 | UK sole traders and landlords | [29] | 2026 |
| MTD population in scope at launch | ~864,000 sole traders and landlords | UK | [29] | 2026 |
| EOT rules from 30 Oct 2024 | clawback window extended to end of the 4th tax year after disposal; trustees must be UK resident as a body; former owners/connected persons < 50% of trustees | UK | [30][31] | 2024 |
| EU Inc target | online formation in 48 hours, ≤ €100, no minimum capital | proposal of 18 Mar 2026 | [32][33][34] | 2026 |
| Estonian e-Residency | 5,556 companies founded by e-residents in 2025 (+15%); 13,828 new e-residents (+20%); €125M state revenue | Estonia | [36][37] | 2025 |
| Estonian OÜ cost | €150 e-Residency fee; €265 online registration; €0.01 minimum capital | Estonia | [36] | 2026 |
| German GmbH / UG | €25,000 nominal capital (half payable at formation) / €1 for a UG, profits retained until €25,000; notary ~€350-850 incl. tax for standard articles | Germany, notarial deed mandatory | [38][39] | 2026 |
| French SAS capital | €1 minimum; no notarial deed required for SAS/SARL | France | [40] | 2026 |
| Nigeria CAC | business name ~₦10,500; Ltd from ~₦60,000 at ₦1M share capital; ₦20,000 per ₦1M of capital; single director/shareholder permitted under CAMA 2020 | Nigeria | [47][65] | 2026 |
| Nigeria Startup Label | CAC-registered Ltd, ≤ 10 years old; unlocks PSI tax holiday (3 + 2 years), R&D deduction (120% under the Nigeria Tax Act 2025), import duty/VAT relief | Nigeria | [41][43][44] | 2025-26 |
| NDPC registration trigger | personal data of 200+ individuals in any six months; GAID 2025 replaced the NDPR in Sept 2025, three-tier classification | Nigeria (verify threshold with counsel) | [45] | 2026 |
| DPIIT recognition | free, 1-3 days; ≤ 10 years (20 deep tech); turnover ≤ ₹200 crore (₹300 crore deep tech); angel tax repealed from FY 2025-26 | India | [48][49] | 2026 |
| India §80-IAC | 100% profit deduction for any 3 consecutive years in the first 10; separate IMB application, 3-12 months | India | [48][49] | 2026 |
| Singapore Pte Ltd | ACRA fee S$315 (S$15 name + S$300); ≥ 1 resident director; ≥ S$1 capital; nominee director S$1,800-3,500/yr and individuals barred from acting "by way of business" since 9 Jun 2025 (CSP Act 2024) | Singapore | [50] | 2026 |
| Singapore SUTE | 75% exemption on first S$100k, 50% on next S$100k, first 3 YAs; investment-holding companies excluded | Singapore | [51] | 2026 |
| India-Singapore treaty LOB | ≥ SGD 200,000 annual operating spend in Singapore to claim benefits | India/Singapore (verify with counsel) | [52] | 2026 |
| Median founder ownership | ~56% at seed; ~36% at Series A | Carta cap tables, rounds 2021-2025 | [60] | 2026 |
| Founder vesting norm | 4 years / 1-year cliff; ~70% of employee grants carry a cliff vs ~half of management grants; early pool 10-20%, advisors 0.1-1.0% over 2 years | Carta guidance | [59] | 2025 |
| Legal-AI hallucination rates | Lexis+ AI 17%, Westlaw AI-AR 33%, GPT-4 43%; >1,590 court incidents by mid-2026 (from ~640 late 2024) | Stanford RegLab study; tracker | [57][58] | 2025-26 |

## Decision rules & rules of thumb
- **If you intend to raise institutional venture capital, incorporate as a Delaware C-corp on day one.**
  Investor familiarity and standard documents, not tax, are the reason [8][62].
- **If you are a US public company with a controlling stockholder and heavy litigation exposure,
  Nevada or Texas is now a genuine alternative** — jury waivers, codified business-judgment rules,
  derivative thresholds [4][5][6][7]. For a private venture-backed startup it is still a distraction [1][8].
- **If founder economics matter and you are US-based, the QSBS clock argues for a C-corp now, not later**
  — post-4 Jul 2025 stock reaches 50% exclusion at three years; an LLC issues no qualifying stock [9][11].
- **If the business is a cash-generating services firm with no outside equity, an LLC (often with an
  S election) still wins** — one level of tax plus, since OBBBA made §199A permanent, up to a 20% QBI
  deduction; but the owner must take a *reasonable salary* before distributions or the IRS recharacterises
  them [19][20].
- **If you receive stock subject to vesting, file the 83(b) within 30 days.** File online *or* by mail,
  never both; send a copy to the company; keep proof [12][13][14].
- **If you are US-formed, you no longer file BOI** — but check whether any *foreign* entity in your
  group registered to do business in a US state still does [15][16].
- **If you are a UK director, LLP member or PSC, verify your identity now** — new appointments require it
  before incorporation, existing directors at the next confirmation statement [21][22].
- **If you are a UK company issuing options, re-run EMI eligibility after 6 April 2026** — companies
  that failed the 250-employee or £30M gross-assets tests may now qualify [23][24][25]. If you are a UK
  sole trader over £50k of qualifying income, you are in MTD from the same date [29].
- **If you are selling a UK business to an EOT, budget for a four-year tail**: the CGT relief can be
  clawed back until the end of the fourth tax year after disposal, and the trustee board must be UK
  resident with former owners in a minority [30][31].
- **If you are a Nigerian tech company, do CAC first, then the Startup Label, then NDPC** — the label
  requires a CAC-registered limited company under 10 years old, and NDPC registration bites once you
  process personal data at scale [41][44][45].
- **If you are an Indian startup, DPIIT recognition is free and fast but is not the tax holiday** —
  §80-IAC needs a separate IMB application that takes months [48][49].
- **If you use a Singapore holdco purely to hold shares, expect no SUTE and expect substance questions.**
  Investment-holding companies are excluded from the startup exemption, and treaty benefits need real
  local spend [51][52].
- **Do not flip to Delaware until a US investor requires it.** The share transfer can be a taxable event
  at home, and §7874 makes flipping back out impractical [52][55][56].
- **Never leave IP in a founder's personal name, a prior employer's scope or an unpaid contractor's
  hands** — assign everything in writing, including pre-incorporation work [61].

## Process / steps
1. **Decide the financing path first.** Venture-track, bootstrapped-services, or family business? That
   answer, not the tax rate, picks the form (Ch 4's point, still true) [8].
2. **Pick the jurisdiction where your investors live**, not where your tax adviser dreams. US venture →
   Delaware. UK angels → a UK Ltd, kept SEIS/EIS-clean. EU-only → a national form today, EU Inc if and
   when it is adopted [8][32].
3. **Form the entity.** US: Atlas/Clerky/Firstbase, ~$400-500, ~2 days [17][18]. UK: Companies House, but
   complete identity verification first [21]. Nigeria: CAC [46][47]. India: MCA/SPICe+ then DPIIT [48].
   Singapore: ACRA Bizfile with a resident director [50].
4. **Issue founder stock immediately, at a nominal price, subject to vesting** — 4 years, 1-year cliff —
   and record it on a real cap table, not a spreadsheet you forget to update [59].
5. **File 83(b) within 30 days** of each unvested issuance; store the confirmation with the stock
   certificate [12][13].
6. **Sign IP assignment and confidentiality agreements with every founder, employee and contractor**,
   scoped (not dated) to cover pre-incorporation work [61].
7. **Set up the option pool and the plan documents** before the first offer letter promises "0.5%".
   UK: check EMI eligibility under the new 6 Apr 2026 limits and get a valuation agreed [23][24].
8. **Get the regional stamp that unlocks incentives**: SEIS/EIS advance assurance (UK) [26][27]; Startup
   Label (Nigeria) [44]; DPIIT then IMB (India) [48][49].
9. **Register for the compliance regimes that now attach to the entity**: Companies House IDV [21],
   MTD for Income Tax if you also trade personally [29], NDPC/GAID if you process personal data [45],
   BOI only if a foreign entity registered in a US state [15].
10. **Diligence yourself 90 days before any raise** [61], and **revisit the structure at each financing,
    at 5 years (QSBS) and before any exit** — the moments when the wrong form becomes expensive [9][11].

## Worksheets, checklists & questions
**Entity-choice questions (2026 version of the book's 14)**
- Are you raising institutional venture capital in the next 24 months, and in which country do your
  first serious investors sit?
- Will US founders or US investors want QSBS? When would the clock start?
- Do you want flow-through losses, or will you reinvest everything?
- Will you give equity to employees, and under which country's tax-advantaged scheme?
- Do you have co-founders, and is every one of them on the same vesting terms?
- Is any IP sitting outside the company today?
- Do you process personal data at a scale that triggers registration where you operate, or have a
  foreign entity registered to do business in a US state?
- Is there an exit shape you already believe in (trade sale, EOT, IPO, none)?

**Founder hygiene checklist (the "will this round close" list)**
- [ ] Entity formed in the jurisdiction investors expect; charter and bylaws on file
- [ ] Founder stock issued, priced, and vesting (4 yrs / 1-yr cliff), double-trigger if any
- [ ] 83(b) filed within 30 days, receipt stored (US)
- [ ] IP assignment + confidentiality signed by every founder, employee and contractor; no
      prior-employer claim over the core IP; no open-source licence contamination
- [ ] Cap table in a real system, reconciled to the stock ledger, SAFEs modelled to conversion
- [ ] Option plan adopted, pool sized, valuation current (409A / EMI valuation)
- [ ] Board and stockholder consents signed for every issuance
- [ ] Identity verification complete (UK: Companies House/One Login)
- [ ] Regional stamp obtained (advance assurance / Startup Label / DPIIT)
- [ ] Registered agent, franchise tax, annual return and data-protection filings diarised

**Flip decision worksheet** — Who is actually asking for the flip, a term sheet or a blog post? What is
the local tax cost of transferring shares to the new parent? Where will IP, employees and customers sit
afterwards? Can you live with §7874 making it one-way? Would a US *subsidiary* solve the same problem?

## Regional notes
- **US.** Delaware remains the venture default [8], but the domicile market is genuinely competitive for
  the first time since the handbook was written [1][7]. QSBS is the dominant founder-tax consideration
  [9][10][11]; the CTA/BOI burden on US-formed entities is gone [15][16]; for non-venture small business
  the LLC + S election + reasonable salary + §199A stack is the mainstream answer [19][20].
- **UK.** The Ltd is the default; sole trader is fine until you need limited liability, staff or
  investors — but MTD for Income Tax now imposes quarterly digital reporting above £50k from 6 Apr 2026
  [29]. LLPs remain a professional-firm form. SEIS/EIS advance assurance shapes almost every UK seed
  round and approval rates are falling [26]; EMI just got much wider [23][24][25]; EOTs are a real
  alternative exit with a tougher four-year tail since Oct 2024 [30][31]; IDV is unavoidable [21][22].
- **EU.** No single startup form yet. EU Inc (the 28th regime) was proposed 18 Mar 2026 and is targeted
  at 48-hour, ≤ €100, zero-capital online formation, with agreement hoped for by end-2026 [32][33][34];
  the European Business Wallet is the complementary identity/document rail, Council position adopted
  9 Jun 2026 [35]. Until then: Estonia's OÜ via e-Residency is the cheapest EU entry (€150 + €265,
  €0.01 capital; 5,556 e-resident companies in 2025) [36][37]; France's **SAS** is flexible, €1 capital
  and needs no notary [40]; Germany's **GmbH** needs €25,000 nominal (half paid in) and a notary, with
  the **UG** as a €1 bootstrap that must retain profits until it reaches €25,000 [38][39].
- **Nigeria.** Register a private limited company at CAC under CAMA 2020 — a single director and single
  shareholder are permitted; fees scale with share capital (₦20,000 per ₦1M) [47][65]. The Nigeria
  Startup Act 2022 Startup Label (NITDA) unlocks pioneer status, R&D deductions enhanced by the Nigeria
  Tax Act 2025, and import duty/VAT relief [41][43][44]. NDPA compliance moved to the **GAID 2025**
  directive (replacing the NDPR in Sept 2025) with tiered NDPC registration [45]. Flipping to Delaware is
  common among funded Nigerian startups — and worth resisting until a US investor requires it [56].
- **India.** Pvt Ltd (not OPC, not proprietorship) is the recognised startup form; DPIIT recognition is
  free and quick, §80-IAC needs a separate IMB approval, and angel tax is gone from FY 2025-26
  [48][49]. Singapore holdcos are heavily scrutinised under GAAR and the treaty LOB clause [52].
- **Singapore.** Pte Ltd via ACRA for S$315 with at least one resident director; SUTE gives three years
  of partial exemption but **not** to investment-holding companies [50][51]. Nominee-director services
  are now regulated under the CSP Act 2024 (individuals barred from acting by way of business since
  9 Jun 2025) [50].

## AI-era notes
- **What AI genuinely does well in 2026:** first-draft NDAs, contractor agreements and board consents
  from a known template; summarising a data room; flagging unassigned IP or missing signatures across
  a folder; explaining a term sheet clause; translating a foreign filing requirement into a checklist.
  The formation platforms themselves are the real automation story — Atlas files the entity, gets the
  EIN, issues founder stock and files the 83(b) for $500 in two days [17].
- **Where it fails, with evidence.** The Stanford RegLab study found hallucination rates of **17%
  (Lexis+ AI), 33% (Westlaw AI-Assisted Research) and 43% (GPT-4)** on legal research, including
  "sycophancy" — generating support for a wrong premise rather than correcting it [57]. Tracked
  AI-fabrication incidents in court passed **1,590 by mid-2026**, up from ~640 in late 2024, with
  six-figure sanctions and a first indefinite licence suspension in the US [58].
- **The practical rule:** use AI to *draft and to find questions*, never to *decide or to cite*. Any
  statute, case, threshold or deadline an assistant gives you — including everything in this file —
  must be checked against the primary source before you act on it.
- **Hype to discount:** "AI replaces your startup lawyer." It does not replace the two things that
  actually cost money — judgement about which structure fits your financing path, and a signature that
  carries professional liability. RAG-based legal tools reduce but do not eliminate fabrication [57].
- **A real new risk:** AI-generated code and content raise IP-provenance questions (training data,
  open-source licence contamination, ownership of purely machine-generated output) that diligence teams
  now ask about. Keep a record of what was generated under which tool's terms (verify with counsel).

## The minds

| Person / body | Affiliation | Contribution | Where to read |
|---|---|---|---|
| Cooley GO editors | Cooley LLP | The free, maintained standard-document stack most US startups form on | cooleygo.com (reviewed Jul 2025) [8][62] |
| Foley & Lardner corporate team | Foley & Lardner | The clearest running count of DExit and Texas's maturation as a domicile | "DExit One Year Later", May 2026 [1] |
| Sullivan & Cromwell / Alston & Bird | law firms | Side-by-side of the 2025 Delaware, Nevada and Texas reforms | client memos, Jun 2025 / Jan 2026 [7] |
| Holland & Knight, Mintz, Davis Wright Tremaine tax teams | law firms | The definitive early reads on OBBBA's QSBS rewrite | client alerts, Jul 2025 [9][10][11] |
| IRS | US government | Form 15620 made the 83(b) election a filed form, then an online one | irs.gov/pub/irs-pdf/f15620.pdf [12] |
| FinCEN | US Treasury | Interim final rule (Mar 2025) and final rule (Aug 2026) exempting US entities from BOI | fincen.gov/boi [15] |
| Companies House / ECCTA team | UK government | Mandatory identity verification from 18 Nov 2025 | Companies House guidance; firm summaries [21][22] |
| Orrick / Freshfields / Birketts share-plan teams | law firms | The Autumn Budget 2025 EMI expansion, read for founders | client alerts, Nov 2025 [23][24][25] |
| HMRC | UK government | SEIS/EIS statistics, including falling advance-assurance approval rates | gov.uk statistics, May 2026 [26] |
| European Commission / European Parliament | EU | The 28th regime ("EU Inc") and the European Business Wallet | europarl.europa.eu; consilium.europa.eu [32][33][35] |
| e-Residency team | Republic of Estonia | The working proof that company formation can be fully digital and cross-border | e-resident.gov.ee, 2026 [36] |
| NITDA / NDPC (Nigeria); DPIIT (India) | governments | Startup Label and GAID 2025; DPIIT recognition and the §80-IAC route | startup.gov.ng; startupindia.gov.in [41][45][48] |
| Peter Walker | Carta (Head of Insights) | The public benchmark data on founder ownership, dilution and vesting norms | Carta Data / Founder Ownership Report 2026 [59][60] |
| Daniel E. Ho and the RegLab team | Stanford | Measured hallucination rates in commercial legal-research AI | "Hallucination-Free?", 2024-25 [57] |

## Pitfalls
- **Forming an LLC "for now" while planning to raise venture money** — you pay for the conversion and
  you restart the QSBS clock [9][11].
- **Missing the 83(b) 30-day window.** There is no cure, and the tax cost lands as the stock vests [13].
- **Assuming the book's S-corp numbers.** The 35-shareholder figure is stale (the cap is 100), and the
  passive-income and foreign-revenue tests have moved (verify with counsel).
- **Reincorporating out of Delaware because of headlines.** DExit is real but concentrated in public
  companies with controllers; for a private startup it fights investors' standard documents [1][8].
- **Believing the CTA is back on.** US-formed entities are exempt under the Aug 2026 final rule — but a
  foreign entity registered in a US state still reports [15][16].
- **Skipping Companies House IDV** and finding the next appointment or confirmation statement rejected [21].
- **Assuming EMI still fails you** on the old 250-employee / £30M gross-assets tests after 6 Apr 2026 [23][24].
- **Treating SEIS/EIS advance assurance as a formality** — about a quarter were refused in 2025-26 [26].
- **Selling to an EOT and spending the proceeds** before the four-year clawback window closes [30][31].
- **Flipping to Delaware to look serious**, triggering a local tax event and a one-way §7874 door [52][55].
- **Standing up a Singapore or Delaware holdco with no substance** — treaty benefits and GAAR challenges
  turn on real spend and real people [52].
- **Leaving contractor IP unassigned, or the cap table in a spreadsheet** [61].
- **Citing an AI-generated statute, threshold or case** without opening the primary source [57][58].

## Key terms
`QSBS` — qualified small business stock under IRC §1202; C-corp stock whose gain can be excluded, now 50/75/100% at 3/4/5 years up to $15M per issuer.
`OBBBA` — the One Big Beautiful Bill Act, enacted 4 July 2025; rewrote §1202 and made §199A permanent.
`Form 15620` — the IRS's official form for a §83(b) election, filable online since 2025.
`BOI report` — beneficial ownership information filed with FinCEN under the Corporate Transparency Act; now required only of foreign registrants.
`SB 21 / DExit` — Delaware's March 2025 DGCL amendments, and the 2024-26 movement of US companies reincorporating to Nevada or Texas.
`ECCTA identity verification` — the UK requirement (from 18 Nov 2025) that directors, LLP members and PSCs prove their identity.
`EMI` — Enterprise Management Incentives, the UK's tax-advantaged share option scheme; limits widened from 6 Apr 2026.
`SEIS / EIS advance assurance` — HMRC's pre-investment indication that a UK company's shares should qualify for investor relief.
`EOT` — Employee Ownership Trust; a UK exit route giving the seller CGT relief, with a four-year clawback tail.
`MTD for Income Tax` — HMRC's quarterly digital reporting regime for sole traders and landlords, from 6 Apr 2026 above £50k.
`28th regime / EU Inc` — the proposed opt-in, EU-wide, digital-by-default company form (proposed 18 Mar 2026).
`OÜ / UG / SAS` — the Estonian private limited company (€265 online, €0.01 capital); the German €1 "mini-GmbH" that retains profits until it reaches €25,000; France's flexible €1-capital SAS.
`Startup Label` — NITDA's certificate under the Nigeria Startup Act 2022 that unlocks tax and duty incentives.
`GAID 2025` — Nigeria's General Application and Implementation Directive, the operative data-protection instrument since Sept 2025.
`DPIIT recognition` — India's free startup certification; a precondition for, but not the same as, the §80-IAC tax holiday.
`SUTE` — Singapore's Start-Up Tax Exemption; three years of partial exemption, not available to investment-holding companies.
`Delaware flip / §7874` — reorganising a non-US company under a new Delaware C-corp parent; the US anti-inversion rule that makes reversing it impractical.
`Double-trigger acceleration` — vesting accelerates only on both a change of control and a qualifying termination.
`CIIAA` — confidential information and invention assignment agreement; the document that puts IP in the company.

## Build ideas for the app
- **Jurisdiction + form recommender (2026)** — inputs: country of founders and first investors, venture
  vs cash-flow intent, employee equity plans, exit shape → outputs: recommended entity and domicile, the
  incentives it unlocks (QSBS / SEIS-EIS / Startup Label / DPIIT / SUTE), the filings it creates, and a
  "take this to counsel" brief. Replaces Ch 4's US-only table.
- **QSBS clock tracker** — inputs: issuance dates, amounts, gross assets at issuance → outputs: per-holder
  exclusion at 3/4/5 years, pre- vs post-4 Jul 2025 treatment, and a restart warning on conversion [9][11].
- **83(b) 30-day alarm** — input: grant date → outputs: hard deadline, Form 15620 link, online-vs-mail
  choice, a copy-to-company reminder and a proof-of-filing vault [12][13].
- **Founder hygiene scorecard** — the checklist above scored 0-100, with the two red items (cap-table
  errors, unassigned IP) weighted heaviest because they are what stalls a close [61].
- **Vesting designer** — inputs: co-founder start dates, contributions, part-time periods → outputs: a
  4/1 schedule per founder, cliff dates, a double-trigger clause and a plain-English explainer [59].
- **Compliance calendar generator** — inputs: entity country, data processing scale, personal trading
  income → outputs: Companies House IDV and confirmation statement, franchise tax, MTD quarters, NDPC
  tier, BOI applicability — as diarised tasks [15][21][29][45].
- **Flip advisor** — inputs: where investors, revenue, IP and employees sit → outputs: flip / US
  subsidiary / do nothing, with the local tax event flagged and a §7874 one-way warning [52][55][56].
- **Incentive eligibility checker** — one screen per regime (SEIS/EIS, EMI post-Apr-2026, Startup Label,
  DPIIT/80-IAC, SUTE) with the current thresholds and the application route [23][26][44][48][51].

## Sources
[1] DExit One Year Later: An Assessment of SB21, the Continuing Pace of Reincorporation and the Maturation of Texas as a Corporate Domicile — Foley & Lardner — May 2026 — https://www.foley.com/insights/publications/2026/05/dexit-one-year-later-an-assessment-of-sb21-the-continuing-pace-of-reincorporation-and-the-maturation-of-texas-as-a-corporate-domicile/
[2] The State of US Reincorporation in 2025: The Growing Threat and Reality of "DEXIT" — Glass Lewis — 2025 — https://www.glasslewis.com/article/state-of-us-reincorporation-2025-growing-threat-reality-dexit
[3] The State of US Reincorporations: Post-Proxy Season 2025 — Harvard Law School Forum on Corporate Governance — 31 Mar 2026 — https://corpgov.law.harvard.edu/2026/03/31/the-state-of-us-reincorporations-post-proxy-season-2025/
[4] Passage of Senate Bill 29 Positions Texas as a Leading State for Incorporations — Foley & Lardner — May 2025 — https://www.foley.com/insights/publications/2025/05/passage-senate-bill-29-positions-texas-leading-state-incorporations/
[5] Texas Overhauls Business Organizations Code with SB 29 — Gibson Dunn — 2025 — https://www.gibsondunn.com/texas-overhauls-business-organizations-code-with-sb-29-key-changes-for-entity-governance-entity-administration-and-shareholder-rights/
[6] Nevada Adopts Significant Amendments to its Corporate Law — Fenwick — Jun 2025 — https://www.fenwick.com/insights/publications/nevada-legislature-adopts-significant-amendments-to-its-corporate-law-to-further-entice-corporations-to-incorporate-or-reincorporate-in-the-state
[7] Summary of Recent Changes to Delaware, Nevada, and Texas Corporate Law — Sullivan & Cromwell — Jun 2025 — https://www.sullcrom.com/insights/memo/2025/June/Summary-Recent-Changes-Delaware-Nevada-Texas-Corporate-Law
[8] Where Should You Incorporate? — Cooley GO — reviewed 10 Jul 2025 — https://www.cooleygo.com/where-should-you-incorporate/
[9] One Big Beautiful Bill Act Increases Tax Benefits for Qualified Small Business Stock — Holland & Knight — Jul 2025 — https://www.hklaw.com/en/insights/publications/2025/07/one-big-beautiful-bill-act-increases-tax-benefits-for-qualified-small
[10] QSBS Benefits Expanded Under One Big Beautiful Bill Act — Mintz — 9 Jul 2025 — https://www.mintz.com/insights-center/viewpoints/2906/2025-07-09-qsbs-benefits-expanded-under-one-big-beautiful-bill-act
[11] QSBS Just Got a Major Upgrade — Davis Wright Tremaine Startup Law Blog — Jul 2025 — https://www.dwt.com/blogs/startup-law-blog/2025/07/qsbs-big-beautiful-bill-tax-code-upgrades
[12] Form 15620, Section 83(b) Election (Rev. 4-2025) — Internal Revenue Service — 2025 — https://www.irs.gov/pub/irs-pdf/f15620.pdf
[13] Online Filing of Section 83(b) Elections Is Here! — Goodwin — 17 Jul 2025 — https://www.goodwinlaw.com/en/insights/publications/2025/07/alerts-practices-erisa-online-filing-of-section-83b-elections
[14] New Electronic Filing Option for Section 83(b) Elections — Mintz — 29 Jul 2025 — https://www.mintz.com/insights-center/viewpoints/2906/2025-07-29-new-electronic-filing-option-section-83b-elections
[15] Beneficial Ownership Information Reporting — FinCEN — final rule 11 Aug 2026 — https://www.fincen.gov/boi
[16] FinCEN Removes BOI Reporting Requirements for US Companies and US Persons — Morgan Lewis — Mar 2025 — https://www.morganlewis.com/pubs/2025/03/fincen-removes-boi-reporting-requirements-for-us-companies-and-us-persons
[17] Stripe Atlas — Stripe — 2026 — https://stripe.com/atlas
[18] Stripe Atlas vs. Clerky vs. LegalZoom: 2026 Incorporation Guide for Startup Founders — Rho — 2026 — https://www.rho.co/blog/stripe-atlas-vs-clerky
[19] S-Corp Reasonable Compensation Guide 2026 — SDO CPA — 2026 — https://www.sdocpa.com/s-corp-reasonable-compensation-guide/
[20] QBI Deduction 2026: Section 199A Guide for S-Corps — SDO CPA — 2026 — https://www.sdocpa.com/qualified-business-income-deduction-guide/
[21] Companies House confirms mandatory identity verification from 18 November 2025 — Penningtons Manches Cooper — 2025 — https://www.penningtonslaw.com/insights/companies-house-confirms-mandatory-identity-verification-from-18-november-2025-what-businesses-need-to-know/
[22] New identity verification requirements to start on 18 November 2025 — Taylor Wessing — Aug 2025 — https://www.taylorwessing.com/en/insights-and-events/insights/2025/08/new-identity-verification-requirements-to-start-on-18-november-2025
[23] UK Autumn Budget 2025: EMI Reform Announced — Orrick — Nov 2025 — https://www.orrick.com/en/Insights/2025/11/UK-Autumn-Budget-2025-EMI-Reform-Announced
[24] What the Autumn Budget 2025 Means for EMI Share Options — Birketts — Nov 2025 — https://www.birketts.co.uk/legal-update/autumn-budget-2025-changes-to-enterprise-management-incentives/
[25] Autumn Budget 2025: UK expands tax-advantaged EMI share incentive regime for growth companies — Freshfields — Nov 2025 — https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/autumn-budget-2025-uk-expands-tax-advantaged-emi-share-incentive-regime-for-grow-102lw9h
[26] Enterprise Investment Scheme and Seed Enterprise Investment Scheme: 2026 — GOV.UK (HMRC statistics) — May 2026 — https://www.gov.uk/government/statistics/enterprise-investment-scheme-and-seed-enterprise-investment-scheme-may-2026/enterprise-investment-scheme-and-seed-enterprise-investment-scheme-2026
[27] Using EIS and SEIS to attract investment following Finance Act 2026 — Farrer & Co — 2026 — https://www.farrer.co.uk/news-and-insights/using-eis-and-seis-to-attract-investment-the-benefits-and-some-traps-to-avoid/
[28] What's Changed: EMI and EIS Reforms from 6 April 2026 — FounderCatalyst — 2026 — https://www.foundercatalyst.com/blog/what-s-changed-emi-and-eis-reforms-from-6-april-2026
[29] Find out if and when you need to use Making Tax Digital for Income Tax — GOV.UK (HMRC) — 2026 — https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax
[30] Taxation of employee ownership trusts and employee benefit trusts (Autumn Budget 2024) — Deloitte Taxscape — Oct 2024 — https://taxscape.deloitte.com/measures-autumn-budget-2024/taxation-of-employee-ownership-trusts-and-employee-benefit-trusts.aspx
[31] Employee ownership trusts: a different business model — Lewis Silkin — 27 Apr 2026 — https://www.lewissilkin.com/insights/2026/04/27/employee-ownership-trusts-a-different-business-model
[32] EU Inc.: what is the 28th regime? — European Parliament — 2026 — https://www.europarl.europa.eu/topics/en/article/20260506STO42807/eu-inc-what-is-the-28th-regime
[33] The 28th Regime — a new legal framework for innovative companies — European Parliament Legislative Train Schedule — 2026 — https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-28th-regime-for-innovative-companies
[34] EU 28th Regime Explained: The Proposed 'EU Inc.' Corporate Framework — Matheson — 2026 — https://www.matheson.com/insights/eu-legislative-updates-edition-1-the-eu-28th-regime/
[35] European business wallets: Council adopts negotiating position — Council of the EU — 9 Jun 2026 — https://www.consilium.europa.eu/en/press/press-releases/2026/06/09/european-business-wallets-council-adopts-negotiating-position/
[36] E-residents generated a record €125 million state revenue in 2025 — e-Resident.gov.ee (Republic of Estonia) — 2026 — https://www.e-resident.gov.ee/blog/posts/e-residents-generated-record-state-revenue-2025/
[37] Estonian e-residency program brought in €125 million in 2025 — ERR News — 2026 — https://news.err.ee/1609934015/estonian-e-residency-program-brought-in-125-million-in-2025
[38] Unlocking Germany: The Incorporation Process for Foreign Start-ups — Osborne Clarke — https://www.osborneclarke.com/insights/unlocking-germany-incorporation-process-foreign-start-ups
[39] Share capital of the German GmbH/UG explained — firma.de — 2026 — https://www.firma.de/en/company-formation/gmbh-stammkapital-share-capital/
[40] How Much Does Incorporation of a Company Cost in France? — Commenda — 2026 — https://www.commenda.io/france/incorporation-cost
[41] Nigeria Startup Act, 2022 (official publication) — NITDA — 2022 — https://testlms.nitda.gov.ng/wp-content/uploads/2025/11/NIGERIA-STARTUP-ACT-2022-Final-Publication.pdf
[42] Startup Nigeria (Startup Label portal) — Federal Government of Nigeria — https://startup.gov.ng/
[43] The 2025 Tax Reform Acts and the Nigeria Startup Act — Anaje Olumide Oke Akinkugbe (AO2 Law) — 2025 — https://ao2law.com/the-2025-tax-reform-acts-and-the-nigeria-startup-act-reconciling-incentives-compliance-and-growth/
[44] Obtaining a Startup Label Under the Nigeria Startup Act, 2022 — Mondaq — 2025 — https://www.mondaq.com/nigeria/corporate-and-company-law/1703610/obtaining-a-startup-label-under-the-nigeria-startup-act-2022
[45] NDPC Registration: Who Must Register and How (2026 Guide) — NDPA Toolkit — 2026 — https://ndprtoolkit.com.ng/blog/ndpc-registration-guide-2026/
[46] Corporate Affairs Commission (CAC) — Federal Republic of Nigeria — https://www.cac.gov.ng/
[47] CAC Registration Cost in Nigeria 2026: The Complete Fee Breakdown — CAC Register Nigeria — 2026 — https://cacregister.com.ng/blog/cac-registration-cost-in-nigeria-2026
[48] DPIIT Startup Recognition 2026: Complete How-To Guide — Patron Accounting — 2026 — https://www.patronaccounting.com/blog/dpiit-startup-recognition-2026-guide
[49] Startup India 2026: DPIIT, 80-IAC, Angel Tax Abolished, ESOP & Labour Codes Guide — Gupta Chandan & Associates — 2026 — https://www.guptachandanassociates.com/startup-india-dpiit-recognition-tax-benefits/
[50] Singapore Pte Ltd Company Incorporation & ACRA Rules Guide 2026 — NationRules — 2026 — https://www.nationrules.com/singapore/acra-private-limited-company-incorporation-guide
[51] Startup Tax Exemption Singapore: Who Qualifies in 2026 — Sleek — 2026 — https://sleek.com/sg/resources/startup-tax-exemption-singapore/
[52] Startup Tax Structuring in India: Guide for Holding company or LLP — Treelife — 2026 — https://treelife.in/taxation/startup-tax-structuring-in-india/
[53] Key UK Tax Implications of the Delaware Flip — Wilson Sonsini — https://www.wsgr.com/en/insights/key-uk-tax-implications-of-the-delaware-flip.html
[54] Doing the Delaware Flip: Why and how do non-US companies re-incorporate in the US? — LathamDrive — https://www.lathamdrive.com/resources/insights/doing-the-delaware-flip-why-and-how-do-non-us-companies-re-incorporate-in-the-us
[55] Reverse Flip-Up: What It Is and Why Startups Do It — Vircon Legal — https://virconlegal.com/reverse-flip-up-explained/
[56] 3 reasons flipping from Africa to Delaware — and when not to — Raise — https://www.getraise.io/post/3-reasons-flipping-from-africa-to-delaware-and-when-not-to
[57] What the Science Says About Hallucinations in Legal Research (summarising the Stanford RegLab study) — AI Law Librarians — 19 Feb 2026 — https://www.ailawlibrarians.com/2026/02/19/what-the-science-says-about-hallucinations-in-legal-research/
[58] AI Hallucination Cases: The 1,598-Case Sanctions Tracker — HAQQ — 2026 — https://www.haqq.ai/blog/ai-legal-hallucination-audit
[59] Key Questions on Equity Splits — 2025 Benchmarks from Carta (Peter Walker) — CED NC — 2 Oct 2025 — https://cednc.org/equity-splits-peter-walker/
[60] Founder Ownership Report 2026 — Carta — 2026 — https://carta.com/data/founder-ownership-2026/
[61] Data Room for YC Startups 2026: 24 Documents and the Week You Save — Papermark — 2026 — https://www.papermark.com/blog/data-room-for-yc-startups
[62] Incorporation Package (Delaware) — Cooley GO Docs — https://www.cooleygo.com/documents/incorporation-package-delaware/
[63] UK Budget 2025: Support for Scale-Ups — Wilson Sonsini — Nov 2025 — https://www.wsgr.com/en/insights/uk-budget-2025-support-for-scale-ups.html
[64] Companies House announces identity verification implementation date — Norton Rose Fulbright — 2025 — https://www.nortonrosefulbright.com/en/knowledge/publications/b7345a86/08-companies-house-announces-identity-verification-implementation-date
[65] Companies and Allied Matters Act, 2020 — Wikipedia (overview; check the Act itself) — https://en.wikipedia.org/wiki/Companies_and_Allied_Matters_Act,_2020
