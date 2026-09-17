import type { Tool } from "../types";

// Stage 3 - Legal structure.
// Chapter 4 supplies the six forms, the comparison table and the six issues a
// partnership agreement must settle. It is US law as of 2018, so the 2026 layer
// (S09) supplies what has actually changed and what the rest of the world does.
//
// Nothing in this file is legal or tax advice. Every figure below carries its
// source and year, anything the research note could not confirm against a
// primary source is marked "verify with counsel", and every tool tells the
// founder to take the decision to a qualified professional in their own country.

const LEGAL_FORM: Tool = {
    id: "legal-form",
    slug: "legal-form",
    stage: "legal",
    kind: "quiz",
    title: "Which legal form?",
    blurb:
        "Six questions about owners, money and exit. The right answer differs by country, so the result names the form where you are, and the questions you must take to a lawyer. This is general information, not legal advice.",
    ref: "04-legal-structure.md + modern/S09-legal-and-structure-2026.md",
    basedOn:
        "HBR's Entrepreneur's Handbook (2018), ch 4 and Table 4-1; jurisdiction and 2026 rules from S09",
    featured: true,
    spec: {
        questions: [
            {
                id: "owners",
                prompt: "Who will own this, and what kind of owner are they?",
                group: "Owners",
                help: "The handbook is blunt that the choice is driven chiefly by your objectives and your investors' objectives, with tax and liability playing a supporting part (ch 4, p63). Owner count and owner type decide what is even available to you.",
                options: [
                    {
                        label: "Just me",
                        score: 0,
                        note: "A single owner can use the simplest form anywhere. Nigeria's CAMA 2020 also permits a single director and a single shareholder in a private limited company, so being alone is not a reason to stay unincorporated (S09, 2026).",
                    },
                    {
                        label: "Two or three founders, all individuals in one country",
                        score: 1,
                        note: "With more than one owner and nothing written down, the default in a general partnership is ugly: the partnership ends on any partner's death or withdrawal, and every partner is jointly and severally liable for the others' actions, whatever their share or fault (ch 4, pp66-68).",
                    },
                    {
                        label: "Several owners, or owners in more than one country",
                        score: 2,
                        note: "Cross-border ownership starts to rule things out. A US S corporation must be wholly owned by US citizens, which is one of several reasons it suits very few startups (ch 4, p73).",
                    },
                    {
                        label: "Companies or funds will hold shares, or employees will",
                        score: 3,
                        note: "This is the rule that decides it in the US: S corporation shareholders can only be individuals, estates and certain trusts, so no corporation or partnership can hold the stock, and institutional venture funds are partnerships or LLCs (ch 4, p73; S09, 2026). Employee equity also needs a form that can issue shares and options at all.",
                    },
                ],
            },
            {
                id: "investors",
                prompt: "How likely is it that outside investors buy equity in this business?",
                group: "Financing",
                help: "S09's first rule is that entity choice is a financing decision first and a tax decision second. Cooley's stated reason for the Delaware default is investor familiarity with the structure, not tax (Cooley GO, reviewed July 2025).",
                options: [
                    { label: "Never; this will be funded by its own cash and by borrowing", score: 0 },
                    { label: "Possibly friends and family, but no institutions", score: 1 },
                    {
                        label: "Local angels or a grant body in my own country",
                        score: 2,
                        note: "Keep the entity clean for whatever local scheme your angels rely on. In the UK that means SEIS and EIS: about a quarter of advance assurance applications were refused in 2025-26, with approval rates of 76% SEIS and 72% EIS, down from 85% and 76% the year before (HMRC statistics, May 2026).",
                    },
                    {
                        label: "Institutional venture capital, from funds in my own country",
                        score: 3,
                        note: "Institutional funds expect standard documents. In the US that is a Delaware C corporation with bylaws, founder restricted stock purchase agreements, IP assignment and 83(b) elections, which is what Series A diligence looks for (Cooley GO incorporation package, reviewed July 2025).",
                    },
                    {
                        label: "US venture capital, or US investors are already asking",
                        score: 4,
                        note: "Do not flip to Delaware until a US investor actually requires it. Transferring shares to a new US parent can be a taxable event at home, and IRC section 7874 makes flipping back out impractical, so treat it as one way (S09, 2026). Ask who is asking: a term sheet, or a blog post.",
                    },
                ],
            },
            {
                id: "geography",
                prompt: "Where will the company be registered, and where will its market be?",
                group: "Financing",
                help: "S09's rule is to pick the jurisdiction where your investors live, not the one your tax adviser dreams about. If your customers, revenue and investors are all local, a foreign holding company buys you nothing and costs you filings and possibly a tax event.",
                options: [
                    {
                        label: "Registered where I live, selling where I live",
                        score: 0,
                        note: "This is the right answer far more often than founder folklore suggests. If you operate in your home state or country you will have to register there anyway, so an exotic domicile buys little (Cooley GO, reviewed July 2025).",
                    },
                    {
                        label: "Registered where I live, selling internationally",
                        score: 1,
                        note: "Selling abroad is not by itself a reason to incorporate abroad. A local subsidiary usually solves what a holding company is being proposed for.",
                    },
                    {
                        label: "Registered where I live, but a foreign holding company is being discussed",
                        score: 2,
                        note: "Substance matters. Singapore's start-up tax exemption excludes pure investment holding companies, and treaty benefits under the India to Singapore limitation of benefits clause turn on real local operating spend, quoted as at least SGD 200,000 a year, which S09 marks verify with counsel (S09, 2026).",
                    },
                    {
                        label: "US market, US investors, and a US parent company is the plan",
                        score: 3,
                        note: "Delaware is still the venture default, though no longer unchallenged: its share of new IPO incorporations fell to 62% in 2025, with Nevada around 17% and Texas around 4% (Foley & Lardner, 2026). For a private venture-backed startup that contest is a distraction; the standard documents are still Delaware documents.",
                    },
                ],
            },
            {
                id: "losses",
                prompt: "What do the first two or three years look like on paper?",
                group: "Money shape",
                help: "The handbook's rule: large early losses that the owners can use against other income point to a partnership or an LLC, while a business needing long-term outside cash and harvested through a sale or a public offering points to a corporation (ch 4, pp74-75).",
                options: [
                    {
                        label: "Real losses, and the owners could use them against other income",
                        score: 0,
                        note: "This is the handbook's clearest argument for a flow-through form. Remember that losses are deductible only up to the capital you actually have at risk (ch 4, pp69-70).",
                    },
                    {
                        label: "Losses, but nobody can use them against other income",
                        score: 1,
                        note: "Then the flow-through advantage is theoretical, and the decision falls back on liability, investors and exit.",
                    },
                    {
                        label: "Roughly breakeven, paying the owners as it goes",
                        score: 2,
                        note: "In the US this is where the LLC with an S election still wins: one level of tax, plus up to a 20% qualified business income deduction under section 199A, which OBBBA made permanent in July 2025. The catch is that the owner must take a reasonable salary before distributions or the IRS recharacterises them (S09, 2026).",
                    },
                    {
                        label: "Profitable early, and every penny reinvested to grow",
                        score: 3,
                        note: "Watch the trap in flow-through entities: owners are taxed on income earned, not on cash distributed, so earnings you retain for growth still create a personal tax bill you must budget for (ch 4, p63).",
                    },
                ],
            },
            {
                id: "exit",
                prompt: "How does this end, in the version you actually believe?",
                group: "Exit",
                help: "The handbook asks you to choose for the stage you are entering and the next one, because every change of form is a legal and administrative project (ch 4, pp74-75).",
                options: [
                    { label: "It does not. I want income from it for as long as it works", score: 0 },
                    { label: "Sold one day, probably to someone I have not met", score: 1 },
                    { label: "Sale to a strategic buyer or a fund is the plan", score: 2 },
                    {
                        label: "A large sale or a public offering is the plan",
                        score: 3,
                        note: "If founder tax matters and you are US based, the clock argues for a C corporation now rather than later. Under OBBBA, enacted 4 July 2025, qualified small business stock acquired after that date reaches a 50% exclusion at three years, 75% at four and 100% at five, capped at the greater of $15M per issuer or 10 times basis, and the clock only starts when C corporation stock is issued (S09, 2026).",
                    },
                ],
            },
            {
                id: "liability",
                prompt: "How much liability does the work itself carry?",
                group: "Risk",
                help: "One of the handbook's own diagnostic questions: does the business carry real exposure through products, premises or professional advice? A sole proprietor's personal property is reachable by claimants, not just the business's assets (ch 4, pp63-66).",
                options: [
                    { label: "Very little. I advise or sell online, no premises, no staff", score: 0 },
                    { label: "Some. I hold customer money or personal data", score: 1 },
                    { label: "Moderate. Contracts with real obligations, or subcontractors", score: 2 },
                    {
                        label: "High. Products, premises, staff, or professional advice people rely on",
                        score: 3,
                        note: "Limited liability is worth the filing fee on its own here, whatever your funding plans. Note the limits: the veil is pierced for fraud, and officers stay personally liable for duties such as withholding and paying taxes (ch 4, pp70-72).",
                    },
                ],
            },
        ],
        bands: [
            {
                minPct: 58,
                label: "A company with transferable shares, formed now",
                verdict: "go",
                advice:
                    "You are on the track the handbook says should skip the intermediate forms: incorporate once rather than convert twice. In the UK that is a private company limited by shares (Ltd), with Companies House identity verification done first, kept clean for SEIS and EIS if UK angels are in the picture. In the US, a Delaware C corporation, because investor familiarity and the standard documents are the reason, not tax (Cooley GO, reviewed July 2025); do not elect S corporation status if you want venture money, since funds are partnerships or LLCs and cannot hold the stock. In Nigeria, a private limited company at CAC under CAMA 2020, which is also the precondition for the NITDA Startup Label. In India, a Pvt Ltd, which is the form DPIIT recognises, rather than an OPC or a proprietorship. In Singapore, a Pte Ltd via ACRA with at least one resident director. In the EU there is no single startup form yet: use a national one today, such as France's SAS at EUR 1 of capital with no notary, Germany's GmbH at EUR 25,000 nominal with a notary, or Estonia's OU; the proposed EU Inc 28th regime was published on 18 March 2026 and is a proposal, not law. If you are somewhere this toolkit's research does not cover, including South Africa, Kenya, the UAE, Canada and Australia, treat the shape of this answer as the question to ask a local corporate lawyer, not as the answer.",
            },
            {
                minPct: 30,
                label: "Limited liability now, shares when you need them",
                verdict: "learn",
                advice:
                    "You need the liability shield and a clean owner record, but not yet the whole apparatus of a venture-track company. In the UK that is still a Ltd, which is cheap and is the default; sole trader is fine only until you need limited liability, staff or investors. In the US it is an LLC, often with an S election and a reasonable owner salary, which since OBBBA made section 199A permanent carries up to a 20% qualified business income deduction; price the option honestly, because converting later costs time and money and the QSBS clock only starts when C corporation stock is issued. In Nigeria register a limited company at CAC rather than a business name, because the Startup Label requires a CAC-registered limited company under ten years old. In India a Pvt Ltd is what DPIIT recognises. Whatever you pick, write the owner agreement now: the handbook's six issues are capital contributions, profit and loss allocation, salaries and draws, management responsibilities, what happens on withdrawal, retirement, disability or death, and how the thing is dissolved (ch 4, pp67-68).",
            },
            {
                minPct: 0,
                label: "The simplest form still fits",
                verdict: "go",
                advice:
                    "One owner, no outside equity, modest exposure: the simplest form is the honest answer, and the handbook agrees that a sole proprietorship is the lowest-cost way to start trading. In the UK that is a sole trader, but note Making Tax Digital for Income Tax starts on 6 April 2026 for qualifying income above GBP 50,000, dropping to GBP 30,000 in 2027 and GBP 20,000 in 2028 (HMRC, 2026). In the US it is a sole proprietorship or a single-member LLC; a DBA or fictitious name certificate is needed to trade under a name that is not your own, and most states forbid Inc., Corp., Company or Co. in an unincorporated business's name (ch 4, p65). In Nigeria a business name at CAC costs about NGN 10,500, but it gives you no limited liability and does not qualify for the Startup Label. Two exceptions send you up a level anyway: if you answered that the work carries real liability through products, premises, staff or professional advice, buy the shield; and if there is more than one owner, get the agreement written, because without it the partnership dissolves on any partner's exit and each partner is jointly and severally liable for the rest (ch 4, pp66-68). Separate the money from day one: a dedicated business bank account, every receipt captured, expenses in the same categories your tax return uses (ch 4, p65).",
            },
        ],
        caveat:
            "This is general information, not legal or tax advice, and it cannot account for your facts. Confirm every point with a qualified lawyer and accountant in your own country before you file anything. Chapter 4 says the same in its own box on p64, and its content is US law as of 2018. Some of it has since moved: the book's 35-shareholder cap for an S corporation is stale, the statutory cap is 100 with families able to elect to count as one, which the 2026 research note marks verify with counsel. Three more things the note itself hedges: the UK EIS company limits from 6 April 2026, the Nigerian NDPC registration threshold, and how ownership of AI-generated work is treated, are all marked verify with counsel, so do not rely on them here. Finally, do not let an assistant settle this. Measured hallucination rates in legal research were 17% for Lexis+ AI, 33% for Westlaw AI-Assisted Research and 43% for GPT-4 (Stanford RegLab, 2024-25), and tracked court incidents involving AI-fabricated material passed 1,590 by mid-2026, up from around 640 in late 2024. Use AI to draft and to find questions, never to decide or to cite.",
    },
};

const FOUNDER_HYGIENE: Tool = {
    id: "founder-hygiene",
    slug: "founder-hygiene",
    stage: "legal",
    kind: "checklist",
    title: "Founder hygiene: the will-this-round-close list",
    blurb:
        "The paperwork that actually blocks deals. Two items stall more seed closes than everything else here combined, and both are cheap to fix before you raise and expensive after. Country-specific items appear only for the country on your profile. General information, not legal advice: have a qualified lawyer and accountant in your country confirm all of it.",
    ref: "modern/S09-legal-and-structure-2026.md",
    basedOn:
        "S09's founder hygiene checklist; Cooley GO incorporation package (reviewed Jul 2025); Carta vesting guidance (2025); YC-ecosystem diligence practice (2026)",
    featured: true,
    spec: {
        groups: [
            {
                title: "Ownership and IP",
                items: [
                    {
                        id: "cap-table",
                        label: "Cap table in a real system, reconciled to the stock ledger, every SAFE modelled to conversion",
                        help: "One of the two things S09 names as what stalls a seed close. A spreadsheet nobody updated is not a cap table. Model every convertible instrument through to the shares it becomes, so you know what you actually own. For context on where this ends up: median founder ownership is about 56% at seed and about 36% at Series A (Carta, 2026).",
                        critical: true,
                    },
                    {
                        id: "ip-assignment",
                        label: "IP assignment and confidentiality signed by every founder, employee and contractor",
                        help: "The other deal-stalling item. Scope it by subject matter rather than by date so it covers pre-incorporation work. Check three things a buyer's lawyer will check: nothing core sitting in a founder's personal name, no claim from a prior employer's invention clause, and no open-source licence contamination in the codebase (S09, 2026).",
                        critical: true,
                    },
                    {
                        id: "founder-stock",
                        label: "Founder stock issued and priced, subject to vesting, with a written agreement",
                        help: "Issue it immediately at a nominal price rather than leaving ownership as an understanding. The standard is 4 years with a 1-year cliff, monthly after that (Carta guidance, 2025). Work through the vesting designer in this stage before you sign.",
                    },
                    {
                        id: "acceleration",
                        label: "Acceleration terms decided, and double-trigger if you have any",
                        help: "Investors prefer no acceleration or double-trigger, meaning vesting accelerates only on both a change of control and a qualifying termination. Single-trigger acceleration reads as a poison pill to an acquirer (S09, 2026).",
                    },
                    {
                        id: "option-pool",
                        label: "Option plan adopted, pool sized, and a current valuation in hand",
                        help: "Do this before an offer letter promises anyone 0.5%. Early pools typically run 10 to 20%, with advisors at 0.1 to 1.0% over two years (Carta guidance, 2025). The valuation is a 409A in the US and an agreed HMRC valuation for EMI in the UK.",
                    },
                    {
                        id: "consents",
                        label: "Board and stockholder consents signed for every issuance",
                        help: "Every share, option and convertible has a paper trail behind it. Missing consents are the quiet version of a cap-table error.",
                    },
                    {
                        id: "ai-provenance",
                        label: "A record of what was generated by which AI tool, under which terms",
                        help: "Diligence teams now ask about IP provenance for AI-generated code and content: training data, open-source licence contamination, and who owns purely machine-generated output. S09 marks the ownership question verify with counsel, so keep the record and get advice rather than assuming either answer.",
                    },
                ],
            },
            {
                title: "Company filings",
                items: [
                    {
                        id: "entity-formed",
                        label: "Entity formed where your investors expect it, charter and constitutional documents on file",
                        help: "Formation is now a commodity: Stripe Atlas quotes $500 one-off including the first year's registered agent, in about two business days, with EIN, founder stock and the 83(b) filing included (2026). The work that matters is not forming the company, it is keeping it clean.",
                    },
                    {
                        id: "annual-filings",
                        label: "Registered agent, annual return and franchise tax diarised",
                        help: "For a Delaware company, budget roughly $300 a year of franchise tax plus about $100 for the registered agent, which S09 marks as worth verifying against current rates (2026).",
                    },
                    {
                        id: "uk-idv",
                        label: "Companies House identity verification completed for every director and PSC",
                        help: "Mandatory from 18 November 2025 under ECCTA 2023 for directors, LLP members and people with significant control. It is free via GOV.UK One Login, or can be done through an authorised corporate service provider. New appointments need it before incorporation; existing directors at the next confirmation statement (S09, 2026).",
                        region: "GB",
                    },
                    {
                        id: "us-boi",
                        label: "Beneficial ownership reporting checked, which for a US-formed company now means checking that it does not apply",
                        help: "FinCEN's interim final rule of 26 March 2025, made permanent by a final rule on 11 August 2026, narrowed reporting companies to foreign entities registered to do business in the US. So a US-formed entity does not file, but a foreign entity in your group that is registered in a US state still does (S09, 2026).",
                        region: "US",
                    },
                    {
                        id: "ng-cac",
                        label: "Registered at CAC as a private limited company under CAMA 2020",
                        help: "A single director and a single shareholder are permitted. Fees scale with share capital: roughly NGN 60,000 at NGN 1M of share capital, at about NGN 20,000 per NGN 1M (2026). A business name registration at about NGN 10,500 is cheaper but is not a company and does not qualify for the Startup Label.",
                        region: "NG",
                    },
                    {
                        id: "in-mca",
                        label: "Incorporated as a Pvt Ltd through MCA SPICe+, not as an OPC or a proprietorship",
                        help: "Pvt Ltd is the form India's startup regime recognises. An LLP is accepted for DPIIT recognition too, but the Pvt Ltd is the form investors expect (S09, 2026).",
                        region: "IN",
                    },
                    {
                        id: "sg-acra",
                        label: "Pte Ltd incorporated at ACRA with at least one resident director",
                        help: "ACRA's fee is S$315 (S$15 name plus S$300 registration) and minimum capital is S$1. If you are buying a nominee director, note that services run roughly S$1,800 to S$3,500 a year and that individuals have been barred from acting by way of business since 9 June 2025 under the CSP Act 2024 (S09, 2026).",
                        region: "SG",
                    },
                    {
                        id: "eu-form",
                        label: "A national company form chosen, with the cost of capital and notary understood",
                        help: "There is no EU-wide startup form yet. France's SAS needs EUR 1 of capital and no notarial deed. Germany's GmbH needs EUR 25,000 nominal, half paid at formation, plus a mandatory notary at roughly EUR 350 to 850 for standard articles, with the UG as a EUR 1 route that must retain profits until it reaches EUR 25,000. Estonia's OU costs EUR 150 for e-Residency plus EUR 265 to register, with EUR 0.01 of capital. The EU Inc 28th regime, proposed 18 March 2026, targets online formation in 48 hours for under EUR 100 with no minimum capital, but it is a proposal and agreement was only hoped for by the end of 2026 (S09, 2026).",
                        region: "EU",
                    },
                ],
            },
            {
                title: "Tax and incentives",
                items: [
                    {
                        id: "us-83b",
                        label: "83(b) election filed within 30 days of every unvested issuance, with proof stored",
                        help: "The deadline is 30 days from transfer with essentially no exception. Since 2025 it can be filed online through an IRS account or by mail on Form 15620 (Rev. 4-2025), but never both. Send a copy to the company and keep the confirmation with the stock records (S09, 2026).",
                        region: "US",
                    },
                    {
                        id: "us-qsbs",
                        label: "Every stock issuance date-stamped for the QSBS clock, with gross assets recorded at issuance",
                        help: "OBBBA, enacted 4 July 2025, created a tiered exclusion of 50% at three years, 75% at four and 100% at five, raised the per-issuer cap to the greater of $15M or ten times basis, and lifted the issuer gross-assets ceiling to $75M. All of it applies only to stock acquired after 4 July 2025; earlier stock keeps the old five-year rule. Gain that is not excluded on a three to four year hold is taxed at 28%, not 20%. Converting an LLC to a C corporation restarts the clock (S09, 2026).",
                        region: "US",
                    },
                    {
                        id: "gb-advance-assurance",
                        label: "SEIS or EIS advance assurance obtained before the raise, not after",
                        help: "Not a formality: approval rates fell to 76% SEIS and 72% EIS in 2025-26, from 85% and 76% the year before (HMRC statistics, May 2026). SEIS limits are unchanged at GBP 250,000 company lifetime and GBP 200,000 per investor per year, at 50% relief. S09 marks the EIS company limits from 6 April 2026 verify with counsel, so check them with an adviser rather than relying on a summary.",
                        region: "GB",
                    },
                    {
                        id: "gb-emi",
                        label: "EMI eligibility re-checked against the limits that apply from 6 April 2026",
                        help: "The Autumn Budget 2025 raised the employee limit to 500 from 250, gross assets to GBP 120M from GBP 30M, the company option pool to GBP 6M from GBP 3M, and option life to 15 years from 10, applied retrospectively. The individual limit is unchanged at GBP 250,000. Companies that failed the old tests may now qualify, so do not assume the old answer (S09, 2026).",
                        region: "GB",
                    },
                    {
                        id: "gb-mtd",
                        label: "Making Tax Digital for Income Tax handled if you also trade personally",
                        help: "Quarterly digital reporting starts 6 April 2026 for qualifying income above GBP 50,000, then GBP 30,000 in 2027 and GBP 20,000 in 2028. Around 864,000 sole traders and landlords are in scope at launch (HMRC, 2026).",
                        region: "GB",
                    },
                    {
                        id: "ng-startup-label",
                        label: "Startup Label applied for at NITDA under the Nigeria Startup Act 2022",
                        help: "It requires a CAC-registered limited company under ten years old. It unlocks pioneer status relief of three years plus two, an enhanced R&D deduction of 120% under the Nigeria Tax Act 2025, and import duty and VAT relief (S09, 2026). Do CAC first, then the label.",
                        region: "NG",
                    },
                    {
                        id: "in-dpiit",
                        label: "DPIIT recognition obtained, and section 80-IAC treated as a separate application",
                        help: "DPIIT recognition is free and takes 1 to 3 days for a company under 10 years old, 20 for deep tech, with turnover up to INR 200 crore, INR 300 crore for deep tech. It is not the tax holiday. Section 80-IAC gives a 100% profit deduction for any three consecutive years in the first ten and needs a separate IMB application taking 3 to 12 months. Angel tax was repealed from FY 2025-26 (S09, 2026).",
                        region: "IN",
                    },
                    {
                        id: "sg-sute",
                        label: "Start-Up Tax Exemption eligibility confirmed, including the holding-company exclusion",
                        help: "SUTE gives 75% exemption on the first S$100,000 of chargeable income and 50% on the next S$100,000, for the first three years of assessment. Pure investment-holding companies are excluded, so a shell holdco gets nothing and invites substance questions (S09, 2026).",
                        region: "SG",
                    },
                ],
            },
            {
                title: "Records",
                items: [
                    {
                        id: "counsel-review",
                        label: "A qualified lawyer and accountant in your own country have reviewed the structure and the founder documents",
                        help: "Everything in this toolkit is general information, not legal or tax advice. The handbook says the same in chapter 4's own box on p64, and its process ends with consulting a qualified tax attorney or accountant before deciding. Any statute, threshold or deadline you have read here, including in this checklist, should be checked against the primary source or a professional before you act on it.",
                    },
                    {
                        id: "self-diligence",
                        label: "You have diligenced yourself 90 days before any raise",
                        help: "Run your own data room check well before you need it: clean ledger, every share and instrument modelled, all IP assigned, all elections filed. The point of doing it early is that these things are cheap to fix before a process starts and expensive during one (S09, 2026).",
                    },
                    {
                        id: "bank-books",
                        label: "A dedicated business bank account, with every receipt and payment running through it",
                        help: "The handbook's advice for the very smallest business and still the first thing an accountant asks for: keep household and business money apart, capture every receipt, and use the same expense categories your tax return uses (ch 4, p65).",
                    },
                    {
                        id: "filing-vault",
                        label: "Proof of every filing stored somewhere you will find it in four years",
                        help: "Election confirmations, incorporation certificates, verification records, signed consents and assignments in one place. The buyer's lawyer will ask for all of it, and elections with no cure such as the 83(b) can only be proved by the receipt.",
                    },
                    {
                        id: "data-protection",
                        label: "Data-protection registration checked against the threshold where you operate",
                        help: "In Nigeria the operative instrument is GAID 2025, which replaced the NDPR in September 2025 with a three-tier classification, and NDPC registration is triggered by processing the personal data of a stated 200 or more individuals in any six months. S09 marks that threshold verify with counsel, so confirm it rather than relying on the number (2026).",
                        region: "NG",
                    },
                    {
                        id: "compliance-calendar",
                        label: "A compliance calendar exists, with every recurring filing on it",
                        help: "Annual return or confirmation statement, franchise tax, registered agent renewal, tax filings, data-protection renewals, and any incentive scheme that has to be re-qualified. The point is that none of these fail loudly until they fail expensively.",
                    },
                ],
            },
        ],
    },
};

const VESTING_DESIGNER: Tool = {
    id: "vesting-designer",
    slug: "vesting-designer",
    stage: "legal",
    kind: "worksheet",
    title: "Vesting and founder terms designer",
    blurb:
        "Write down what each founder brings, what they get, and what happens if they leave, while everyone still likes each other. Take the finished sheet to a lawyer in your country: this is general information, not legal advice, and it is not a substitute for drafted documents.",
    ref: "modern/S09-legal-and-structure-2026.md",
    basedOn:
        "Carta vesting guidance (2025); S09 founder hygiene; the six partnership-agreement issues from HBR's Entrepreneur's Handbook (2018), ch 4 pp67-68",
    spec: {
        intro:
            "The 2026 norm is four years of vesting with a one-year cliff and monthly vesting after that, per Carta's guidance and practitioner consensus (2025). The same source puts early option pools at 10 to 20% and advisors at 0.1 to 1.0% over two years, and notes that around 70% of employee grants carry a cliff against about half of management grants. Investors prefer either no acceleration or double-trigger acceleration, because single-trigger reads to an acquirer as a poison pill. The reason founders vest at all is arithmetic, not distrust: about one in four co-founder teams sees a departure by year four (Carta, 2025, via the toolkit's founder-evidence note). Fill one copy of this sheet per founder, then read all the copies side by side, because the disagreements show up in the differences. Then have it drafted properly. This worksheet is general information and not legal or tax advice, and nothing here is binding until documents are signed in your own jurisdiction.",
        rows: [
            {
                id: "contribution",
                label: "What does this founder actually bring, and what is already in the company?",
                help: "Be specific and separate the past from the future: cash put in, code or designs already written, a patent, customer relationships, a brand. The handbook's first partnership-agreement issue is the amount and nature of each partner's capital contribution, in cash or in kind (ch 4, p67). Anything already built must also appear in the IP assignment, or it is not the company's.",
                placeholder:
                    "Eight months of the prototype, written before we incorporated, plus GBP 6,000 of savings and the two pilot customers who came from my old job.",
                wantsEvidence: true,
            },
            {
                id: "time",
                label: "How much time is this founder committing, and from when?",
                help: "Full-time, part-time, or nights and weekends until a milestone. Say the milestone and the date. Unequal time with equal equity is the single most common source of a founder fight, and it is much easier to price now than to renegotiate in year two.",
                placeholder:
                    "Full-time from 1 March. Until then, three days a week while serving notice, with no salary from the company.",
                wantsEvidence: true,
            },
            {
                id: "start-date",
                label: "What is this founder's vesting start date, and why that date?",
                help: "The clock can start at incorporation, at the date the work genuinely began, or at the date this person went full-time, and the three are often different for each founder. Pick one per founder, write the reason down, and note that in the US the 83(b) election must be filed within 30 days of the actual transfer of stock, with essentially no exception (S09, 2026).",
                placeholder:
                    "1 November last year, the date she started building, backdated credit of four months agreed in writing by both of us.",
            },
            {
                id: "equity",
                label: "What percentage does this founder get, and of what?",
                help: "State it as a percentage of the issued shares today, and separately as a percentage after the option pool is created, because those are different numbers and people hear the bigger one. For a sense of the path: median founder ownership is about 56% at seed and about 36% at Series A (Carta, 2026). Equal splits are fine when contributions really are equal; they are a way of avoiding a conversation when they are not.",
                placeholder:
                    "45% of issued shares today, 40.5% after a 10% option pool. My co-founder has 45%, 10% reserved for the pool.",
                wantsEvidence: true,
            },
            {
                id: "vesting",
                label: "Vesting length and cliff for this founder",
                help: "The standard is four years with a one-year cliff, then monthly (Carta guidance, 2025). Deviating is allowed, but write down why: credit for work already done is usually better handled as a slice that is vested on day one, rather than by shortening the whole schedule. If you have already raised, check what your existing documents say before you promise anything different.",
                placeholder:
                    "4 years, 1-year cliff, monthly thereafter, with 6 months credited as already vested for pre-incorporation work.",
            },
            {
                id: "departure",
                label: "What happens to unvested and vested shares if this founder leaves?",
                help: "Cover four cases in plain words: they resign, you ask them to go, they become unable to work, or the company is sold. Say whether unvested shares simply stop, whether the company can buy back vested shares and at what price, and whether anything accelerates. The handbook's fifth partnership-agreement issue is exactly this, the consequences of withdrawal, retirement, disability or death (ch 4, pp67-68). On acceleration, the market answer is none or double-trigger, meaning both a change of control and a qualifying termination (S09, 2026).",
                placeholder:
                    "Unvested shares lapse on any departure. Vested shares stay, with a company right of first refusal on any sale. Double-trigger acceleration of 50% of unvested shares on a sale plus termination within 12 months.",
                wantsEvidence: true,
            },
            {
                id: "ip",
                label: "Is everything this founder has made assigned to the company, in writing?",
                help: "S09 names missing IP assignments as one of the two things that stall a seed close. Scope the assignment by subject matter rather than by date so that pre-incorporation work is covered, and check three risks before you sign: work done while employed elsewhere and caught by that employer's invention clause, open-source licences in the codebase, and anything still registered in a personal name, including domains, accounts and repositories.",
                placeholder:
                    "Confidentiality and invention assignment signed by both founders on incorporation, covering all prior work on the product. Domain and app store accounts transferred to the company. Prior employer contract reviewed by a solicitor, no claim.",
                wantsEvidence: true,
            },
        ],
    },
};

export const LEGAL_TOOLS: Tool[] = [LEGAL_FORM, FOUNDER_HYGIENE, VESTING_DESIGNER];
