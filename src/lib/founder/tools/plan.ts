import type { Tool } from "../types";

// Stage 4 - Plan and pitch.
// Handbook ch 5 supplies the seven-section format, Sahlman's team questions and
// the marketing ten-point checklist. The 2026 layer (S13) supplies what readers
// actually do with a deck, which is short, measured and unflattering. S02
// supplies Dunford's positioning, because a plan written before the positioning
// is settled says "who is this for?" three different ways.

const PLAN_GENERATOR: Tool = {
    id: "plan-generator",
    slug: "business-plan-generator",
    stage: "plan",
    kind: "generator",
    title: "Business plan generator",
    blurb:
        "Answer seven questions about your business and get a plan back in the seven sections a funder expects, with the ask, the use of funds and the exit route already in it.",
    ref: "05-business-plan.md",
    basedOn:
        "HBR's Entrepreneur's Handbook, ch 5, Figure 5-1 prototype format; the 2026 deck, memo, one-pager and data-room stack (S13)",
    featured: true,
    spec: {
        task: "plan",
        produces: "business plan",
        fields: [
            {
                id: "problem",
                label: "What problem are you solving, and who has it?",
                help: "The problem, how big it is, and what is changing in the market that makes it worse or more urgent. Write this one without naming your product.",
                multiline: true,
            },
            {
                id: "solution",
                label: "What do you do about it?",
                help: "What you sell, what stage it is at, and anything you have already put in front of a real customer. The test Kevin Hale uses at Y Combinator: could someone who knows nothing about your business repeat this back to a friend?",
                multiline: true,
            },
            {
                id: "customer",
                label: "Who is the customer, and how many of them are there?",
                help: "The customer type you have to reach for the business to work, a count you could sanity-check yourself, and how they decide to buy. Count from the bottom up, not down from an industry total.",
                multiline: true,
            },
            {
                id: "money",
                label: "How do you make money?",
                help: "Where revenue comes from, what it costs you to deliver, what you charge, and why that difference survives a competitor copying your best seller.",
                multiline: true,
            },
            {
                id: "team",
                label: "Why you, and who else is on the team?",
                help: "Sahlman's rule: give the experience that bears on this specific problem, not a biography. Name the capability this plan needs that nobody on the team has yet.",
                multiline: true,
            },
            {
                id: "amount",
                label: "How much money do you need?",
                help: "One number, with the currency. If you are not raising anything, put in what you are funding it with yourself and say so.",
            },
            {
                id: "use",
                label: "What is the money for, and what does it buy you?",
                help: "Use of funds, the milestone it gets you to, and how anyone who puts money in eventually gets it back. Chapter 5 counts all three among the omissions that sink a plan.",
                multiline: true,
            },
        ],
    },
};

const DECK_DOCTOR: Tool = {
    id: "deck-doctor",
    slug: "deck-doctor",
    stage: "plan",
    kind: "quiz",
    title: "Deck doctor",
    blurb:
        "Six questions about the deck you already have, scored against the largest published dataset of investors actually reading decks. You get the three things to fix first.",
    ref: "modern/S13-founder-evidence-and-pitching-2026.md",
    basedOn:
        "Papermark Fundraising Report 2026; DocSend Startup Index 2024-25; Geoff Ralston's YC demo-day guide; ch 5 on deck style",
    featured: true,
    spec: {
        questions: [
            {
                id: "length",
                prompt: "How many pages is your deck?",
                group: "Shape",
                help: "Count every page, including the title and any appendix you send in the same file.",
                options: [
                    {
                        label: "8 or fewer",
                        score: 1,
                        note: "Short is not the problem; unanswered questions are. Readers who run out of deck go and ask someone else instead of you.",
                    },
                    {
                        label: "9 to 16",
                        score: 3,
                        note: "The band 46% of founders land in. Twelve pages draws the most views, averaging 34 views and a 68% return rate (Papermark, 2026).",
                    },
                    {
                        label: "17 or 18",
                        score: 1,
                        note: "Completion falls to about 40% at 16 to 18 pages (Papermark, 2026). Move two pages into the memo.",
                    },
                    {
                        label: "19 or more",
                        score: 0,
                        note: "Fewer than half of readers reach the last page of any deck (Papermark, 2026). Past 18 you are writing for nobody.",
                    },
                ],
            },
            {
                id: "traction",
                prompt: "Where does your evidence that the market moved appear?",
                group: "Order",
                help: "Traction is anything real: revenue, users, pilots, letters of intent, a waiting list, a repeat buyer. Not a forecast.",
                options: [
                    { label: "There is no traction page", score: 0 },
                    { label: "Somewhere after page 6", score: 1 },
                    { label: "Pages 4 to 6", score: 2 },
                    {
                        label: "In the first three pages",
                        score: 3,
                        note: "Traction in the first three pages draws about 20% more views (Papermark, 2026).",
                    },
                ],
            },
            {
                id: "team",
                prompt: "What does your team page do?",
                group: "Content",
                options: [
                    {
                        label: "There is no team page",
                        score: 0,
                        note: "The team page is in 71% of decks and is the most-read page in the deck, at 5.7 seconds a view (Papermark, 2026). Leaving it out removes the page readers look at hardest.",
                    },
                    { label: "Names, titles and logos", score: 1 },
                    { label: "Names plus why these people can build this", score: 2 },
                    {
                        label: "Why these people for this problem, and the gap you are still hiring for",
                        score: 3,
                        note: "DocSend measured team-page attention up 40% at seed and 30% at pre-seed against 2023, while competition pages fell 48% (Dropbox DocSend, 2024). Investors are re-weighting toward the part that is hardest to fake.",
                    },
                ],
            },
            {
                id: "financials",
                prompt: "How are the numbers handled?",
                group: "Content",
                options: [
                    {
                        label: "There are none",
                        score: 0,
                        note: "Only 40% of decks include financials, and they get above-median attention (Papermark, 2026). You are leaving out a page readers want.",
                    },
                    { label: "One chart going up and to the right", score: 1 },
                    { label: "Projections, with the assumptions left unsaid", score: 2 },
                    {
                        label: "Projections with the assumptions behind them written down",
                        score: 3,
                        note: "Chapter 5 is blunt about this: state the assumptions behind every projection and why you made them, because experienced investors will ask.",
                    },
                ],
            },
            {
                id: "words",
                prompt: "How much text is on a typical page?",
                group: "Style",
                help: "A deck you present and a deck you send are different documents. A presented page carries a phrase; a sent page carries a point plus its evidence and should be scannable in 15 seconds.",
                options: [
                    { label: "Paragraphs", score: 0 },
                    { label: "Several sentences", score: 1 },
                    {
                        label: "One sentence",
                        score: 2,
                        note: "That is chapter 5's ceiling for a deck you present: no more than one sentence per page (Baehr and Loomis, Get Backed).",
                    },
                    {
                        label: "A phrase or a headline, seven words or fewer",
                        score: 3,
                        note: "Y Combinator's demo-day guide caps a presented page at seven words (Geoff Ralston, Y Combinator).",
                    },
                ],
            },
            {
                id: "ask",
                prompt: "How explicit is the ask?",
                group: "Content",
                options: [
                    { label: "The deck does not say what I want", score: 0 },
                    { label: "An amount, and nothing else", score: 1 },
                    { label: "An amount and what it will be spent on", score: 2 },
                    {
                        label: "Amount, use of funds, the milestone it buys, and how investors get their money out",
                        score: 3,
                        note: "Chapter 5 lists the funding ask, the use of funds and the exit route among the omissions that sink a plan. Investors want liquidity, sooner rather than later.",
                    },
                ],
            },
        ],
        bands: [
            {
                minPct: 78,
                label: "This deck gets finished",
                verdict: "go",
                advice: "The structure is right, so spend your remaining effort on the three things the data says separate a deck that closes from one that does not. One: rewrite page 1 until a stranger can say what you do in five seconds, because the biggest single drop-off is page 1 to page 2 and 16% of views end inside ten seconds. Two: strengthen the back half, since decks that closed their round held 37% more time per page there (Papermark, 2026). Three: send a tracked link rather than an attachment, watch where readers stop, and re-cut that page.",
            },
            {
                minPct: 45,
                label: "Sound bones, three fixes",
                verdict: "learn",
                advice: "Fix these three, in this order, before you send it again. One: get your evidence that the market moved into the first three pages, which is worth about 20% more views. Two: bring the deck inside 9 to 16 pages by moving detail into a 2 to 4 page memo, which is where the reasoning belongs anyway. Three: make the team page answer why these people for this problem, because it is the most-read page in the deck. Then check that the ask names an amount, a use of funds and an exit.",
            },
            {
                minPct: 0,
                label: "Rebuild before you send it",
                verdict: "stop",
                advice: "Sending this now spends introductions you cannot get back. Start again in this order. One: write the one-liner, the sentence a non-expert could repeat, and make it page 1. Two: build the skeleton as purpose, problem, solution, why now, market from the bottom up, traction early, product, model, competition, team, ask, and keep it inside 16 pages. Three: put one specific earned fact on every page, a customer quote, a real number, a thing you learned by being there. Generic decks are now pattern-recognised on sight, and some firms pre-screen with AI before a partner opens the file.",
            },
        ],
        caveat:
            "What this actually measures: attention, not outcomes. Papermark's 2026 report covers 24,541 decks, 358,672 investor views and 15.2 million page-level data points across 184 countries, and reports a median of 18 minutes of total attention per deck and 4.0 minutes per view. DocSend's index covers several hundred startups a year and puts seed review time at about 3 minutes 44 seconds. Both tell you where readers stop. Neither tells you whether the business works, and nothing in the 2024 to 2026 literature shows a well-read deck raising more money than a poorly-read one. The two datasets also disagree with each other: Papermark's band is 9 to 16 pages, while DocSend found about 20 slides in successful seed decks (DocSend Startup Index, 2024-25). Both samples are venture-track and heavily US. If your reader is a bank, an SBA lender, a grant body or a visa case worker, ignore this tool and write the long document they ask for.",
    },
};

const POSITIONING: Tool = {
    id: "positioning",
    slug: "positioning",
    stage: "plan",
    kind: "worksheet",
    title: "Positioning worksheet",
    blurb:
        "Five components, worked in order, that settle why a buyer should choose you over what they would otherwise do. Do this before the deck, the website or the first hire.",
    ref: "modern/S02-marketing.md",
    basedOn: "April Dunford, Obviously Awesome (2019), the five components of positioning",
    spec: {
        intro:
            "April Dunford's argument is that positioning is defined against the alternatives, never in a vacuum, because the buyer's real question is why you rather than what they would otherwise do. So work these rows in the order they appear and choose your category last, not first. Her blunt version of the first row: if you cannot name the competitive alternative, you do not have positioning yet. If three people in your company answer \"who is this for?\" three different ways, this sheet is the fix.",
        rows: [
            {
                id: "alternatives",
                label: "What would your best customers use if you did not exist?",
                help: "Usually not a competitor. It is a spreadsheet, an agency, a junior hire, or doing nothing at all. Ask five real customers rather than guessing, because founders reliably name the wrong alternative.",
                placeholder: "e.g. a part-time bookkeeper and a shared spreadsheet, or nothing until it breaks.",
                wantsEvidence: true,
            },
            {
                id: "attributes",
                label: "What can you do that those alternatives cannot?",
                help: "Capabilities and features, stated plainly. Only things that are true today. Roadmap items are not positioning, they are hope.",
                placeholder: "e.g. reconciles automatically overnight; works without an accountant present.",
                wantsEvidence: true,
            },
            {
                id: "value",
                label: "What does each of those unlock for the customer, in their words?",
                help: "Translate the attribute into the outcome a customer would describe to a colleague. If you cannot make the translation, the attribute does not matter and should come out of the deck.",
                placeholder: "e.g. the month-end close stops eating a weekend.",
                wantsEvidence: true,
            },
            {
                id: "who",
                label: "Which customers care about that value most, and how would you recognise one?",
                help: "A characteristic you could screen for before the first call, not a persona sketch. Size, sector, a system they already run, a moment in their year.",
                placeholder: "e.g. 10 to 50 staff, no in-house finance person, already on one of two accounting packages.",
                wantsEvidence: true,
            },
            {
                id: "category",
                label: "What market category makes your value obvious?",
                help: "Chosen last, on purpose. The category sets what a buyer expects to compare you against and what they assume you cost, so the wrong one quietly prices you and frames you before you open your mouth.",
                placeholder: "e.g. bookkeeping automation, not accounting software, not business intelligence.",
                wantsEvidence: true,
            },
            {
                id: "trend",
                label: "What trend makes this urgent now?",
                help: "Dunford treats a trend as an optional amplifier, not a component you must have. Use one only if it is genuinely live for your buyer. A borrowed trend makes you sound like everyone else in the inbox.",
                placeholder: "Leave this blank rather than reaching for one.",
            },
        ],
    },
};

const TEAM_CHECK: Tool = {
    id: "team-check",
    slug: "team-check",
    stage: "plan",
    kind: "worksheet",
    title: "Team credibility check",
    blurb:
        "The section readers weigh most, answered before someone else asks. Sahlman's questions condensed, plus the capability gap founders leave out.",
    ref: "05-business-plan.md",
    basedOn:
        "William Sahlman's team questions as set out in HBR's Entrepreneur's Handbook, ch 5",
    spec: {
        intro:
            "Sahlman's line, quoted in the handbook: without the right team, none of the other parts really matter. The 2026 reading data agrees with him, for what that is worth. The team page is in 71% of decks and is the most-read page in the deck at 5.7 seconds a view (Papermark, 2026). His fourteen questions are condensed here into what a reader is actually trying to work out. Write a few lines per row, about the people who are on the team now. No biographies: the handbook's pattern for a credential line is the name, the years, the function, the employers a reader would recognise, and one concrete accomplishment. Full CVs go in the appendix. The last three rows ask the question founders skip.",
        rows: [
            {
                id: "people",
                label: "Who is on the team, where do they come from, and what do they do here?",
                help: "For each person: years, function, the employers a reader would recognise, and their role in this business. A few lines each is enough.",
                placeholder: "Name, twelve years in X at two named employers, now responsible for Y here.",
            },
            {
                id: "record",
                label: "What has each of them actually accomplished?",
                help: "One concrete thing per person. The handbook's worked example is the extrusion process behind two successful snack brands, not fifteen years of industry experience.",
                placeholder: "The specific thing they built, sold, shipped or fixed, and what it produced.",
            },
            {
                id: "relevance",
                label: "Which parts of that experience bear directly on this opportunity?",
                help: "This is the row a reader is really scoring. Experience that does not touch this problem is decoration, however impressive it looks.",
                placeholder: "Map each person's experience onto a thing this plan needs done.",
                wantsEvidence: true,
            },
            {
                id: "reputation",
                label: "What is this team's standing in the industry, and who would vouch for you?",
                help: "Name the people a diligent reader could ring. If you cannot think of anyone who would take that call, that is itself the finding, and it is fixable in months.",
                placeholder: "Three named referees and what each of them would say.",
                wantsEvidence: true,
            },
            {
                id: "realism",
                label: "How realistic are you about the chances and about what is coming?",
                help: "Sahlman asks this on purpose, because plans are written by optimists. Write down the three things most likely to go wrong and what each would cost you.",
                placeholder: "Three failure modes, with the cost and the early warning sign of each.",
                wantsEvidence: true,
            },
            {
                id: "adversity",
                label: "How has this team behaved when things went badly before?",
                help: "Use a real episode, not a hypothetical. Include whether the hard call got made, who made it, and how long it took.",
                placeholder: "What happened, what you decided, and how long you left it before deciding.",
                wantsEvidence: true,
            },
            {
                id: "commitment",
                label: "How committed is each person, and what is motivating them?",
                help: "Full time or not, paid or not, what each of them gave up to be here, and what they want out of it in five years. Unequal commitment is survivable. Unspoken unequal commitment is not.",
                placeholder: "Per person: hours, pay, what they left, and what they are here for.",
                wantsEvidence: true,
            },
            {
                id: "gap",
                label: "What capability does this plan need that nobody here has?",
                help: "Read your own strategy back and list what it demands: a sales motion, regulatory work, manufacturing, marketing, a technical build. Name the gap before a reader names it for you, because they will.",
                placeholder: "The capability, and the part of the plan that fails without it.",
                wantsEvidence: true,
            },
            {
                id: "cover",
                label: "How does that gap get covered, by when, and would that person come?",
                help: "Hire, co-founder, adviser, board seat, or outsourced. Say which, say when, and say whether you have a specific person in mind who would say yes this quarter.",
                placeholder: "The route, the date, and the name if you have one.",
                wantsEvidence: true,
            },
            {
                id: "growth",
                label: "How must the team grow over the life of this plan?",
                help: "Chapter 5 wants a table of names, titles and salaries, an org chart if the reporting lines are not obvious, and for a company with a board, each director's background and history with you. Sketch that table here.",
                placeholder: "Role, when you hire it, what it costs, and who it reports to.",
            },
        ],
    },
};

export const PLAN_TOOLS: Tool[] = [PLAN_GENERATOR, DECK_DOCTOR, POSITIONING, TEAM_CHECK];
