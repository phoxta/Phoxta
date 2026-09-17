-- ---------------------------------------------------------------------------
-- Phoxta Startup School — starter curriculum
--
-- The school reuses the Coir Six `cs_*` tables under its own organisation:
-- every one of them is org-scoped, `cs_courses.category_id` is plain text with
-- no check constraint, and `cs_categories` is per-org — so a second school
-- needs content, not schema.
--
-- Three tracks replace the three design subjects:
--   start  founder fit, opportunity, model, legal form, plan and pitch
--   fund   opening capital, growth capital, angels and venture
--   grow   selling, operating, measuring, scaling, harvest
--
-- Curriculum distilled from HBR's Entrepreneur's Handbook (fourteen chapters,
-- four appendices) plus the thirteen researched 2026 supplements in
-- .claude/skills/entrepreneur-handbook.
--
-- GENERATED from businesses/startup-school/packages/core/src/seed.ts by
-- _gen_migration.mjs. Edit the TypeScript and regenerate; do not hand-edit,
-- or the bundled demo and the live school will drift apart.
--
-- Idempotent: safe to re-run to refresh starter content without touching
-- learner rows. Called by provisioning for the startup-school blueprint,
-- the way cs_seed_org is called for coir-six.
-- ---------------------------------------------------------------------------

-- Where a lesson's 2018 source has been overtaken. A separate column, not an
-- edit to the body: the learner has to be able to tell the two claims apart.
alter table public.cs_lessons add column if not exists revision text not null default '';

create or replace function public.ss_seed_org(p_org uuid) returns void
language plpgsql security definer set search_path = public as $seed$
begin

  insert into cs_categories (organization_id, id, name, blurb, sort)
  select p_org, v.* from (values
    ('start', 'Start', 'Founder fit, the opportunity, the model, the legal form and a plan a stranger can back', 0),
    ('fund', 'Fund', 'What it costs to open, where growth money comes from, and what each source costs you', 1),
    ('grow', 'Grow', 'Selling, operating, measuring, scaling past yourself and the eventual harvest', 2)
  ) as v(id, name, blurb, sort)
  on conflict (organization_id, id) do update set name = excluded.name, blurb = excluded.blurb, sort = excluded.sort;

  insert into cs_mentors (organization_id, id, name, role, bio, hue, photo_url, handle, followers, expertise, bookable, timezone, session_min, buffer_min, min_notice_min, horizon_days)
  select p_org, v.* from (values
    ('m-leonardo', 'Leonardo Samsul', 'Founder · Operator in residence', 'Started two companies, sold one and closed the other. Teaches the founder-fit and opportunity work he wishes someone had made him do before the second one.', 'mint', '/images/mentor-leonardo.jpg', 'leonardo', 14200, array['start']::text[], true, 'Europe/London', 45, 15, 240, 28),
    ('m-amara', 'Amara Osei', 'Angel investor · Mentor', 'Writes cheques into about six companies a year and sits on four boards. Reads plans for a living, so she can tell you in ninety seconds why yours is not being read.', 'lilac', '/images/mentor-amara.jpg', 'amara', 18700, array['fund', 'start']::text[], true, 'Africa/Lagos', 30, 10, 720, 21),
    ('m-padhang', 'Padhang Satrio', 'Fractional CFO · Mentor', 'Builds the three statements for companies that had been running on a bank balance and a feeling. Believes a thirteen-week cash forecast has saved more businesses than any pitch deck.', 'sky', '/images/mentor-padhang.jpg', 'padhang', 9100, array['fund', 'grow']::text[], true, 'Asia/Jakarta', 30, 10, 240, 28),
    ('m-mei', 'Mei Tanaka', 'Go-to-market lead · Mentor', 'Took a product from its first ten customers to its first thousand, doing the selling herself for the first two hundred. Teaches positioning as a decision, not a workshop.', 'plum', '/images/mentor-mei.jpg', 'mei', 12400, array['grow', 'start']::text[], true, 'America/New_York', 45, 15, 240, 28),
    ('m-zakir', 'Zakir Horizontal', 'Startup counsel · Mentor', 'Corporate lawyer who has unpicked more founder agreements than he has drafted. Wants you to write down what happens if one of you leaves, before one of you leaves.', 'peach', '/images/mentor-zakir.jpg', 'zakir', 6800, array['start']::text[], false, 'UTC', 30, 10, 240, 28),
    ('m-bayu', 'Bayu Salto', 'Chair · Scale and exit', 'Has been the founder who would not let go and the chair who had to say so. Teaches the handover from managing the work to managing the context, and what a sale actually feels like.', 'rose', '/images/mentor-bayu.jpg', 'bayu', 7600, array['grow']::text[], true, 'Europe/London', 60, 15, 1440, 42)
  ) as v(id, name, role, bio, hue, photo_url, handle, followers, expertise, bookable, timezone, session_min, buffer_min, min_notice_min, horizon_days)
  on conflict (organization_id, id) do update set
    name = excluded.name, role = excluded.role, bio = excluded.bio, hue = excluded.hue,
    photo_url = excluded.photo_url, handle = excluded.handle, followers = excluded.followers, expertise = excluded.expertise,
    bookable = excluded.bookable, timezone = excluded.timezone, session_min = excluded.session_min,
    buffer_min = excluded.buffer_min, min_notice_min = excluded.min_notice_min, horizon_days = excluded.horizon_days;

  insert into cs_courses (organization_id, id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, published_at)
  select p_org, v.* from (values
    ('c-fit', 'founder-fit', 'Founder fit: are you the right person for this one?', 'Not ''do you have what it takes'' — whether you have plan, execution and motivation for this particular business.', 'The handbook opens with an uncomfortable question and refuses to flatter you about it. Most founder assessments test personality; this one tests three specific things an investor will test anyway — whether you have a plan, whether you can execute it, and whether your motivation will survive month fourteen.

You will profile yourself against five trait clusters, list the gaps honestly, and decide for each one whether you learn it, hire it, or find a co-founder who already has it. The output is a page you can hand to someone who is considering backing you.', 'start', 'm-leonardo', 'Beginner', 'start', NULL, 4.8, 2140, '["Profile yourself against the five trait clusters","Name your three must-haves and your real gaps","Decide learn / hire / co-found for each gap","Answer the investor''s three questions about yourself"]'::jsonb, '2026-01-12T00:00:00.000Z'::timestamptz),
    ('c-opportunity', 'is-this-a-real-opportunity', 'Is this a real opportunity, or just a good idea?', 'Ten market questions, a confidence rating on each, and a test for every guess — before you spend a year finding out.', 'An idea becomes an opportunity when someone will pay for it, often enough, at a price that leaves something over. This course puts your idea through the handbook''s evaluation grid: ten customer and market questions, each answered with a confidence level and a test you could actually run this month.

Then the five-characteristic scorecard, the risk-versus-return line that tells you when to walk away, and a competitor war-game where you ask what happens if a funded rival cuts price twenty per cent. Most ideas do not survive this. That is the point of doing it in four weeks rather than four years.', 'start', 'm-amara', 'Beginner', 'fund', NULL, 4.9, 3180, '["Answer the ten market questions with a confidence and a test for each","Score the opportunity on all five characteristics","Place it against the risk-return line","War-game the worst thing a competitor could do to you"]'::jsonb, '2026-01-20T00:00:00.000Z'::timestamptz),
    ('c-model', 'business-model-and-strategy', 'The business model, and why anyone would pick you', 'Five questions that define a model, two tests that break it, and the difference between a model and a strategy.', 'A business model answers five questions: what value you create, how you take a share of it, why a customer picks you, how you keep them from being taken, and how anyone finds you in the first place. Most founders can answer three.

You will run Magretta''s two tests — does the narrative hold together, and do the numbers add up — then separate the model from the strategy, because a model says how the business works and a strategy says how it beats the alternatives. The course ends with a positioning statement and a discovery plan, which is the part people leave until after launch and should not.', 'start', 'm-leonardo', 'Intermediate', 'grow', NULL, 4.7, 1960, '["Answer the five model questions in one page","Apply the narrative test and the numbers test","Choose a position and say what you are deliberately not","Plan discovery inside the model rather than after it"]'::jsonb, '2026-02-02T00:00:00.000Z'::timestamptz),
    ('c-legal', 'choosing-your-legal-form', 'Choosing a legal form you will not have to undo', 'Six forms, the tax and liability trade-offs, and the founder agreement to write while everyone still likes each other.', 'The legal form is a decision most founders make by asking a friend, and a decision that is expensive to reverse once there are shareholders and a tax history. This course walks the comparison properly: liability, tax treatment, ownership flexibility, cost, fundraising fit and continuity.

The rules are simple once you see them. Early losses or cash distributions point one way; an exit by sale or an investor who needs preferred stock points another. Then the part nobody enjoys — the six issues a founder agreement must settle, written down before they are tested.

This is a course about frameworks, not advice. Every jurisdiction differs and the last lesson is a list of what to take to local counsel.', 'start', 'm-zakir', 'Beginner', 'peach', NULL, 4.6, 1520, '["Compare the six forms on liability, tax, ownership and continuity","Apply the triggering rules to your own case","Draft the six terms of a founder agreement","Leave with a brief for local counsel"]'::jsonb, '2026-02-09T00:00:00.000Z'::timestamptz),
    ('c-plan', 'plan-and-pitch', 'The plan, and the pitch that gets it read', 'Seven sections, two minutes for the summary, and the reader-lens check that catches what you cannot see.', 'A business plan is not a document you write to raise money. It is the thinking that survives being written down, and the executive summary has about two minutes to earn the rest.

You will build the seven-section plan, then compress it three ways — a hundred words, one sentence, and two deck variants for the two different jobs a deck does. Along the way: Sahlman''s fourteen questions about your team, the ten-point marketing checklist, and the rule that makes plans credible, which is stating the assumption behind every projection rather than hiding it.', 'start', 'm-mei', 'Intermediate', 'mint', NULL, 4.8, 2740, '["Write all seven sections at the right length","Cut an executive summary that wins two minutes","Produce a presentation deck and a reading deck","State the assumption behind every number you project"]'::jsonb, '2026-02-18T00:00:00.000Z'::timestamptz),
    ('c-startup-money', 'money-to-open', 'Money to open the doors', 'Size the number first, then stack the sources cheapest-first — and know which kind of business you are running.', 'Most founders start with the question ''who will fund me'' and should start with ''how much do I actually need''. This course does it in that order: an opening balance sheet that sizes the launch capital, then a source stack assembled from the cheapest money outward.

It also settles a question that quietly decides everything else — which of the three business types you are. Roughly seven in ten new businesses are Main Street, about one in six are supply-chain, and around three per cent are the high-growth kind venture capital is designed for. Founders who misidentify themselves raise the wrong money, or waste a year trying to.', 'fund', 'm-padhang', 'Beginner', 'fund', NULL, 4.8, 2380, '["Build an opening balance sheet and size the real number","Identify which of the three business types you are","Stack sources cheapest-first and see the gap","Set terms for money from family that survive Christmas"]'::jsonb, '2026-03-01T00:00:00.000Z'::timestamptz),
    ('c-growth-money', 'debt-equity-or-cash-flow', 'Debt, equity or cash flow', 'The banker''s three questions, five ratios they run before meeting you, and the matching principle that keeps you solvent.', 'Growth money is a different conversation from startup money, and debt is a different conversation from equity. A banker asks three questions — can you repay, will you repay, and what happens if you cannot — and runs five ratios before you walk in. You can run them yourself first.

The organising rule is the matching principle: short assets on short money, long assets on long money. Break it and a profitable business runs out of cash, which is the most common way profitable businesses die. You will also stress-test your own case with EBIT halved, because that is what the lender will do.', 'fund', 'm-amara', 'Intermediate', 'start', NULL, 4.7, 1640, '["Answer the banker''s three questions with evidence","Run the five lender ratios on your own numbers","Apply the matching principle to every financing choice","Stress-test the plan with EBIT halved"]'::jsonb, '2026-03-10T00:00:00.000Z'::timestamptz),
    ('c-vc', 'angels-venture-and-the-term-sheet', 'Angels, venture capital and the term sheet', 'How the money actually flows, why a VC needs a ten-times return, and how to read the document before you sign it.', 'Venture capital is a specific instrument for a specific kind of company, and most businesses are not it. Under one per cent of US companies ever raise venture capital; angels fund roughly sixteen times more companies than VCs do.

This course explains the machinery — the management fee, the carried interest, and the one-in-fifteen outcome the whole portfolio is built around — because once you understand why a fund needs a ten-times return in five to ten years, every term in the sheet stops being arbitrary. Then convertible preferred stock, feature by feature, and the four ways to delay giving away equity at all.', 'fund', 'm-amara', 'Advanced', 'grow', NULL, 4.9, 2050, '["Explain how a venture fund makes money and why that shapes the terms","Tell angel-shaped businesses from venture-shaped ones","Read convertible preferred stock feature by feature","Ask how a valuation was derived — and derive your own"]'::jsonb, '2026-03-22T00:00:00.000Z'::timestamptz),
    ('c-sell', 'founder-led-sales', 'Founder-led sales to your first hundred customers', 'You are the salesperson until roughly customer one hundred. This is how to be a good one.', 'Nobody can sell an early product except the person who decided to build it, because the pitch is still changing every week and only the founder can change it mid-sentence. This course covers discovery that finds a real problem, qualification that saves you from a quarter of wasted meetings, and the pricing conversation most founders avoid until it is too late to have well.

It finishes with the two questions that decide your next year: what the pipeline maths says you need at the top to hit the bottom, and when — genuinely — to make the first sales hire.', 'grow', 'm-mei', 'Intermediate', 'mint', NULL, 4.8, 2620, '["Run a discovery call that finds the problem, not the compliment","Qualify out early and without apology","Hold a pricing conversation without discounting first","Know the pipeline maths and when to hire for it"]'::jsonb, '2026-04-05T00:00:00.000Z'::timestamptz),
    ('c-operate', 'running-the-place', 'Running the place: cadence, cash and the three statements', 'A weekly rhythm someone other than you can run, and a thirteen-week cash forecast that stops surprises.', 'Operating is unglamorous and it is where most of the survival happens. The three financial statements, how they link, and why the profit-and-loss can look healthy while the bank account empties.

Then the operating system: a weekly cadence with an owner and an agenda, a monthly metrics review, and the thirteen-week rolling cash forecast that turns ''are we fine?'' into a number. The test of this course is whether the cadence still runs in a week when the founder is ill, which is the only honest test there is.', 'grow', 'm-padhang', 'Intermediate', 'fund', NULL, 4.7, 1880, '["Read the three statements and how they link","Run a thirteen-week rolling cash forecast","Install a weekly cadence with an owner and an agenda","Write the SOPs that let someone else run it"]'::jsonb, '2026-04-14T00:00:00.000Z'::timestamptz),
    ('c-metrics', 'the-numbers-that-tell-the-truth', 'The numbers that tell the truth', 'CAC, payback, retention and runway — and the specific metric set for your kind of business.', 'Most dashboards measure what is easy rather than what is decisive. This course builds the small set that actually predicts whether the business works: what it costs to acquire a customer, how long until that cost is repaid, what share of them are still there a year later, and how many months of runway remain at the current burn.

Then the variations, because the honest metric set for a marketplace is not the one for a services business or a hardware product. You will finish with a one-screen dashboard and, more usefully, a list of the vanity metrics you agree to stop reporting.', 'grow', 'm-padhang', 'Intermediate', 'start', NULL, 4.8, 2210, '["Calculate CAC, payback period and retention properly","Read a cohort table and see what it is telling you","Track burn and runway honestly","Pick the metric set that fits your business model"]'::jsonb, '2026-04-26T00:00:00.000Z'::timestamptz),
    ('c-scale', 'scaling-past-yourself', 'Scaling past yourself', 'The three post-startup questions, the four leadership modes, and the handover founders find hardest.', 'Growth strains exactly the four things that made the company work at the start, and the founder is usually one of them. This course starts with the three questions that decide whether to scale at all, then moves to the transition the handbook is most direct about: from managing the work, to managing behaviours, to managing results, to managing context.

Along the way, which support functions have to scale before the strain shows, how to build an advisory board that tells you the truth, and the seven signals that the company now needs professional management — including the ones founders explain away.', 'grow', 'm-bayu', 'Advanced', 'grow', NULL, 4.7, 1390, '["Answer the three post-startup questions before scaling","Identify which support functions must scale first","Move deliberately between the four leadership modes","Build a board that gives you objective feedback"]'::jsonb, '2026-05-06T00:00:00.000Z'::timestamptz),
    ('c-ai', 'building-an-ai-native-company', 'Building an AI-native company', 'What the word actually claims, what the randomised evidence says, and the three disciplines that separate a working AI product from a pilot.', 'Almost every deck now says AI-native and almost none of them mean anything by it. This course starts by making the claim testable, then spends most of its time on the evidence — including the trials that found AI made people slower while they believed it made them faster.

Then the three disciplines that decide whether an AI feature survives contact with users: designing agentic workflows rather than single prompts, evaluating them by reading real failures rather than counting passes, and closing the security hole that no system prompt can fix.

It is deliberately unexcited. The numbers here move fast and several are softer than they look, so each is quoted with what kind of evidence it is.', 'grow', 'm-leonardo', 'Advanced', 'start', NULL, 4.9, 1640, '["Apply the remove test and say honestly which side you are on","Separate the randomised evidence from the vendor numbers","Design an agentic workflow instead of a single prompt","Run error-analysis-first evals","Spot the lethal trifecta before you ship an agent"]'::jsonb, '2026-06-02T00:00:00.000Z'::timestamptz),
    ('c-exit', 'harvest-and-exit', 'Harvest: what it is worth and how to get out', 'Name the motivation first, then choose the mechanism — and get your own valuation before anyone offers you theirs.', 'The exit is the part founders think about constantly and prepare for least. This course insists on the order the handbook does: name why you are selling before you choose how, because the mechanism that suits a tired founder is not the one that suits a founder chasing scale.

Then valuation — three approaches, what a multiple actually encodes, and why the first number you hear should never be the only one you have. And the practical sequence: what a buyer will find in diligence, what to fix a year ahead, and what actually happens to the people who stay.', 'grow', 'm-bayu', 'Advanced', 'peach', NULL, 4.8, 1180, '["Name the motivation before choosing a mechanism","Value the business three ways and hold a defensible range","Prepare for diligence a year ahead of needing to","Understand what changes for the team on the day"]'::jsonb, '2026-05-18T00:00:00.000Z'::timestamptz)
  ) as v(id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, published_at)
  on conflict (organization_id, id) do update set
    slug = excluded.slug, title = excluded.title, blurb = excluded.blurb, description = excluded.description,
    category_id = excluded.category_id, mentor_id = excluded.mentor_id, level = excluded.level, theme = excluded.theme,
    cover_url = excluded.cover_url, rating = excluded.rating, learners = excluded.learners,
    outcomes = excluded.outcomes, published_at = excluded.published_at;

  insert into cs_modules (organization_id, id, course_id, title, sort)
  select p_org, v.* from (values
    ('mod-fit-1', 'c-fit', 'The honest inventory', 0),
    ('mod-fit-2', 'c-fit', 'Closing the gaps', 1),
    ('mod-opp-1', 'c-opportunity', 'Interrogate the market', 0),
    ('mod-opp-2', 'c-opportunity', 'Score it', 1),
    ('mod-opp-3', 'c-opportunity', 'Assume you are not alone', 2),
    ('mod-mod-1', 'c-model', 'Five questions', 0),
    ('mod-mod-2', 'c-model', 'Model versus strategy', 1),
    ('mod-leg-1', 'c-legal', 'The comparison', 0),
    ('mod-leg-2', 'c-legal', 'What you write down', 1),
    ('mod-pln-1', 'c-plan', 'The seven sections', 0),
    ('mod-pln-2', 'c-plan', 'Compress it', 1),
    ('mod-sum-1', 'c-startup-money', 'Size the number', 0),
    ('mod-sum-2', 'c-startup-money', 'Stack the sources', 1),
    ('mod-gro-1', 'c-growth-money', 'How a lender thinks', 0),
    ('mod-gro-2', 'c-growth-money', 'Matching and stress', 1),
    ('mod-vc-1', 'c-vc', 'How the money flows', 0),
    ('mod-vc-2', 'c-vc', 'Reading the sheet', 1),
    ('mod-sel-1', 'c-sell', 'Finding the problem', 0),
    ('mod-sel-2', 'c-sell', 'Price and pipeline', 1),
    ('mod-ops-1', 'c-operate', 'The statements', 0),
    ('mod-ops-2', 'c-operate', 'The cadence', 1),
    ('mod-met-1', 'c-metrics', 'The core four', 0),
    ('mod-met-2', 'c-metrics', 'Your model''s metrics', 1),
    ('mod-scl-1', 'c-scale', 'Should you scale?', 0),
    ('mod-scl-2', 'c-scale', 'The founder''s transition', 1),
    ('mod-ai-1', 'c-ai', 'The claim, and the evidence', 0),
    ('mod-ai-2', 'c-ai', 'Making it work', 1),
    ('mod-ext-1', 'c-exit', 'Motivation and mechanism', 0),
    ('mod-ext-2', 'c-exit', 'What it is worth', 1)
  ) as v(id, course_id, title, sort)
  on conflict (organization_id, id) do update set course_id = excluded.course_id, title = excluded.title, sort = excluded.sort;

  insert into cs_lessons (organization_id, id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, revision, sort)
  select p_org, v.* from (values
    ('l-fit-1', 'c-fit', 'mod-fit-1', 'Preparation beats passion', 'article', 480, NULL, NULL, '', 'The most repeated advice to founders is to follow their passion, and it is the advice most likely to bankrupt them. Passion is an input, not a qualification. It tells you that you will keep going; it says nothing about whether you should.

The handbook replaces it with three must-haves, and an investor will test all three whether or not you have.

**A plan.** Not a document — a coherent account of how this becomes a business. If you cannot describe the mechanism by which money arrives, you have an intention rather than a plan.

**The ability to execute it.** Specifically this plan, not plans in general. A brilliant operator with no access to the customer is not the right founder for a business that lives or dies on access to that customer.

**Motivation that survives.** The relevant question is not whether you are excited now. It is what you expect to be true in month fourteen, when the novelty is gone and the numbers are smaller than the plan said.

Write one honest paragraph on each. Where a paragraph is thin, you have found something to fix rather than something to hide.', '', 0),
    ('l-fit-2', 'c-fit', 'mod-fit-1', 'Five trait clusters, scored honestly', 'article', 540, NULL, NULL, '', 'The trait work is only useful if you are willing to score yourself badly. Take each cluster and mark yourself one to five, then — this is the part that matters — write the evidence.

Not ''I am resilient'' but ''I kept going for eleven months after the first product failed, and here is what I did in month nine''. A score with no evidence behind it is a preference, and preferences are exactly what this exercise is designed to get past.

The clusters cover how you handle uncertainty, how you relate to other people''s money, how you make decisions without complete information, how you respond to being wrong in public, and what you do with a complaint.

That last one is worth dwelling on. The handbook is blunt that complaints are the cheapest market research available, and that most founders treat them as an attack to be managed rather than a signal to be mined. How you scored yourself there will predict a good deal about the next two years.

When the five scores are down, do not average them. The average hides the one that will hurt you.', 'The trait clusters come from pre-2018 trait psychology, and the part that has held up is narrower than the chapter implies. Azoulay, Jones, Kim and Miranda (AER: Insights, 2020), working from US administrative data on the fastest-growing 0.1% of new ventures, found prior experience in the SPECIFIC industry to be the strong predictor — and the mean age at founding to be 45, not 25. A 2023 study of founder types (McCarthy et al.) found team personality DIVERSITY roughly doubled the odds of success, which is a claim about combinations rather than about any one person''s score. Score yourself honestly by all means; then score your access to the industry, because that is the number with the evidence behind it.', 1),
    ('l-fit-3', 'c-fit', 'mod-fit-2', 'Learn it, hire it, or find a co-founder', 'article', 500, NULL, NULL, '', 'Every gap has exactly three honest resolutions, and ''I will get better at it'' is only one of them.

**Learn it** when the gap is skill-shaped, the timeline allows, and the skill is close enough to something you already do. Reading financial statements is learnable in a month. Becoming a natural seller at forty-five, when you have never enjoyed it, generally is not.

**Hire it** when the gap is a function rather than a founding capability — bookkeeping, payroll, a specialist compliance task. Note that hiring requires money you may not yet have, which means this resolution often has a date attached rather than being available now.

**Find a co-founder** when the gap is both central and permanent. This is the expensive option: you are trading equity and autonomy, and you are acquiring a relationship that will be tested. It is also the only one that works when the missing capability is the one the business runs on.

The common failure is choosing ''learn it'' for a gap that is really co-founder-shaped, because learning feels cheaper. It is cheaper in equity and dearer in years.', '', 2),
    ('l-fit-4', 'c-fit', 'mod-fit-2', 'Module check: founder fit', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-opp-1', 'c-opportunity', 'mod-opp-1', 'Define the problem before the solution', 'article', 520, NULL, NULL, '', 'Almost every failed startup can describe its product in one sentence and needs five minutes for the problem. That is the wrong way round, and it is diagnostic.

Write the problem in the customer''s language, not yours. ''Small clinics lose about two hours a week reconciling appointments across three systems'' is a problem. ''There is no unified scheduling platform for healthcare SMEs'' is a solution wearing a problem''s coat — it presupposes that the absence of your product is the pain.

Then ask the question that separates an opportunity from an irritation: what does the customer do today instead? There is always something. If the answer is ''nothing, they live with it'', you are not looking at a market, you are looking at a preference. The existing workaround — the spreadsheet, the intern, the WhatsApp group — is your real competitor, and it is usually free and already installed.

A problem worth building on is one where the workaround visibly costs something the customer can name. If they cannot name the cost, they will not pay to remove it.', '', 0),
    ('l-opp-2', 'c-opportunity', 'mod-opp-1', 'Ten questions, a confidence, and a test', 'article', 600, NULL, NULL, '', 'The evaluation grid is the most useful single page in the handbook, and it works because of the third column.

For each of the ten customer and market questions — who exactly buys, how many of them there are, what they pay now, how they decide, how you reach them, and so on — you write three things: your answer, how confident you are, and **the test that would settle it**.

The confidence rating stops you presenting a guess as a fact. The test column stops the exercise being theatre.

A good test is cheap, fast and capable of proving you wrong. ''Interview twelve clinic managers and ask what they spent on scheduling last year'' is a test. ''Do more research'' is not. If a question''s test would take three months and cost real money, that itself is a finding: you have identified the expensive unknown, and it should be the first thing you attack rather than the last.

Run the grid before you build. Then run it again three months later and note which confidences moved. The direction of movement tells you more than any single answer.', '', 1),
    ('l-opp-3', 'c-opportunity', 'mod-opp-2', 'The five characteristics, and the risk-return line', 'article', 560, NULL, NULL, '', 'An opportunity has five characteristics, and a business that scores well on four is usually a business with a fatal flaw in the fifth.

**It creates value** for someone identifiable. **It is profitable** at a realistic price and cost. **It fits** you — your access, your skills, your appetite. **It is durable**: the value does not evaporate in eighteen months. **It is financeable**: someone, somewhere, would fund it on terms you would accept.

Score each one and refuse to average them.

Then place it against the risk-return line. The principle is simple and widely ignored: the return has to compensate for the risk, measured against the risk-free alternative of doing nothing at all. A venture with a plausible twelve per cent return and a serious chance of total loss sits below the line. Being excited about it does not move it.

The comparison that founders skip is against doing nothing — keeping the job, keeping the savings. Run it explicitly. It is not an argument for timidity; it is the only way to know what the venture actually has to clear.', 'The five characteristics are still the right screen, but the chapter treats fit as something you establish once and then build on. First Round''s 2024 work (Todd Jackson) splits product-market fit into four levels — nascent, developing, strong, extreme — each with its own thresholds across satisfaction, demand and efficiency. Extreme fit takes two to six years, you move between levels by changing one of persona, problem, promise or product, and fit can be LOST when the market moves. Practically: score the five characteristics to decide whether to start, then measure fit continuously afterwards. Teams that stopped measuring because they had declared it are the ones who lost it without noticing.', 2),
    ('l-opp-4', 'c-opportunity', 'mod-opp-2', 'Breakeven, before optimism sets in', 'article', 480, NULL, NULL, '', 'Breakeven is the least glamorous number in the plan and the one that most often turns out to be decisive.

Split costs into fixed and variable. Fixed costs are the ones that arrive whether or not you sell anything — rent, salaries, the software subscriptions nobody cancels. Variable costs move with each unit sold. The contribution per unit is price minus variable cost, and breakeven is simply fixed costs divided by that contribution.

The number it produces is usually uncomfortable, and the discomfort is the value. A founder who discovers they need four hundred customers a month at the current price has learned something specific: either the price is wrong, the cost base is wrong, or the market needs to be much larger than they assumed.

Run it at three prices. Watch how violently breakeven moves when price changes by twenty per cent, and notice that price is usually the easiest of the three to change and the last one founders touch.', '', 3),
    ('l-opp-5', 'c-opportunity', 'mod-opp-3', 'War-game the competitor', 'article', 500, NULL, NULL, '', 'The competition section of most plans lists rivals and explains why each is inferior. That is not analysis, it is reassurance.

The useful version is a war-game. Pick the best-funded competitor and ask, concretely, what is the worst thing they could reasonably do to you in the next twelve months?

The handbook''s standard case is a twenty per cent price cut. Model it. If a well-funded rival drops price twenty per cent, what happens to your breakeven, your runway, your pipeline? If the answer is that you are finished, you have not found a defensible position — you have found a window, and you should know that while it is still open.

Then the harder version: what happens if an incumbent with an existing customer base simply bundles something adequate into what they already sell? Adequate and already-installed beats excellent and unfamiliar more often than founders like to admit.

You are not looking for a scenario where you win every time. You are looking for the specific moves that would kill you, so you can watch for them.', '', 4),
    ('l-opp-6', 'c-opportunity', 'mod-opp-3', 'Module check: the opportunity', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 5),
    ('l-mod-1', 'c-model', 'mod-mod-1', 'The five questions a model answers', 'article', 520, NULL, NULL, '', 'A business model is not a revenue figure and it is not a canvas full of sticky notes. It is the answer to five questions, and the discipline is answering all five rather than the three you find interesting.

**What value do you create, and for whom?** Specifically — not ''we help businesses grow''.

**How do you capture a share of it?** The pricing model, not just the price. A per-seat subscription and a percentage of transactions describe very different businesses even at identical revenue.

**Why does a customer pick you over the alternative?** Including the alternative of continuing to do nothing.

**Why do you keep them?** What makes leaving cost something — data, habit, contract, integration, or genuinely just being better.

**How does anyone find out you exist?** This is the question founders defer, and deferring it is how a good product ends up with no customers. Discovery belongs inside the model, not in a marketing plan written afterwards.

One page, five answers. If any answer needs a paragraph of throat-clearing, it is not yet an answer.', '', 0),
    ('l-mod-2', 'c-model', 'mod-mod-1', 'The narrative test and the numbers test', 'article', 460, NULL, NULL, '', 'Magretta''s two tests are the fastest way to find out whether a model is real.

**The narrative test.** Tell the story of the business as a sequence of events involving an actual person. A clinic manager notices X, searches for Y, finds you because Z, tries it, and switches because W. If the story requires a step where someone behaves in a way people do not actually behave — ''and then they read our white paper'' — the model has a hole at exactly that step.

**The numbers test.** Do the economics work at the volumes the story produces? Not at the volumes you hope for. The narrative usually implies a conversion rate and a sales cycle; put those numbers in and see whether the result pays for the cost base.

Most broken models fail one test cleanly. A model that passes the narrative test and fails the numbers test is usually a pricing problem. A model that passes the numbers test and fails the narrative test is usually a distribution problem, and distribution problems are the more expensive of the two.', '', 1),
    ('l-mod-3', 'c-model', 'mod-mod-2', 'A model is not a strategy', 'article', 500, NULL, NULL, '', 'The distinction is worth being pedantic about, because conflating them produces companies that work on paper and lose anyway.

A **model** describes how the business creates and captures value. A **strategy** describes how it does that better than the alternatives, in a way that lasts.

Two companies can share a model exactly — same pricing, same customers, same cost structure — and have opposite strategies. One competes on being the cheapest and organises everything around cost. The other competes on being the most specialised and organises everything around depth in one vertical. Both are coherent. A company that has not chosen is neither.

The test of a strategy is what it rules out. If your positioning statement does not imply a set of customers you will decline and features you will not build, it is a description rather than a strategy.

Write the sentence that says what you are deliberately not. Founders find it uncomfortable, which is the sign it is doing work.', '', 2),
    ('l-mod-4', 'c-model', 'mod-mod-2', 'Do not scale early', 'article', 460, NULL, NULL, '', 'Premature scaling is among the most reliable ways to kill a company that would otherwise have worked, and it rarely feels like a mistake at the time — it feels like ambition.

The sequence the handbook insists on is recognise, search, then pivot or persevere. You recognise a pattern, you search deliberately for whether it holds, and only then do you commit. Scaling before the search is finished means hiring against an assumption and building infrastructure for a customer who does not exist yet.

The practical markers are unglamorous. Are customers renewing without being chased? Does the sales motion work when someone other than the founder runs it? Can you say, with evidence, why the last ten customers bought?

If any of those is unclear, more spend makes the uncertainty more expensive rather than resolving it. Scale amplifies whatever is actually there, including the parts that do not work.', '', 3),
    ('l-mod-5', 'c-model', 'mod-mod-2', 'Module check: model and strategy', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 4),
    ('l-leg-1', 'c-legal', 'mod-leg-1', 'Six forms and what actually separates them', 'article', 540, NULL, NULL, '', 'The forms differ on six axes, and founders usually consider only the first.

**Liability** — whether a creditor can reach your house. **Tax treatment** — whether profit is taxed once or twice, and whether early losses can offset your other income. **Ownership flexibility** — how easy it is to add, remove or differentiate owners. **Cost and admin** — formation and the annual burden. **Fundraising fit** — whether the investors you want can even invest. **Continuity** — what happens when an owner dies or leaves.

The triggering rules are simpler than the table suggests. If the business will make losses early and you have other income to offset, a pass-through form is attractive. If you intend to raise institutional equity or exit by sale, the corporate form investors expect is worth adopting before it becomes urgent, because converting later is an expense and a distraction at exactly the wrong moment.

And plan the evolution. Choosing a form is not a one-time decision; it is choosing a starting point and knowing what would make you change.', 'The six-way comparison is unchanged, but for US founders one input became financially material after the chapter was written. The One Big Beautiful Bill Act (4 July 2025) raised the QSBS per-issuer exclusion to $15M and the issuer gross-assets ceiling to $75M, and added tiers — 50% of the gain excluded at 3 years, 75% at 4, 100% at 5 — for stock acquired after that date; stock issued before it keeps the old 5-year rule. The clock only starts when C-corp stock is ISSUED, which prices the common ''LLC now, convert later'' path in a way the chapter does not discuss. Date-stamp every issuance. None of this is advice — it is the reason to raise QSBS with counsel before you incorporate rather than after.', 0),
    ('l-leg-2', 'c-legal', 'mod-leg-1', 'Your jurisdiction is the whole answer', 'article', 420, NULL, NULL, '', 'Everything in the previous lesson is a framework for thinking. None of it is advice, and the forms themselves differ by country in ways that are not cosmetic.

A founder in the United States is choosing between sole proprietorship, partnership forms, an LLC and the two corporate forms. A founder in the United Kingdom is choosing between sole trader, partnership, LLP and a private limited company — and the tax treatment, the filing burden and the investor expectations attached to each are different from the American equivalents even where the names rhyme.

The pattern holds elsewhere. Nigeria, India, Germany and Singapore each have forms that look adjacent to the American list and behave differently on liability, minimum capital and foreign ownership.

So the output of this course is not a decision. It is a shortlist, the reasoning behind it, and a specific brief for local counsel — which turns an open-ended and expensive conversation into a cheap and narrow one.', '', 1),
    ('l-leg-3', 'c-legal', 'mod-leg-2', 'Six things a founder agreement must settle', 'article', 560, NULL, NULL, '', 'Write this while everyone still likes each other. That is not a joke about relationships; it is the only time the terms can be negotiated without one party being in a weak position.

**Who owns what, and why.** Not just percentages — the reasoning, so it can be revisited honestly.

**Vesting.** What happens to equity if someone leaves in month eight. Without it, a founder who quits early keeps a founder''s stake for work they did not do, and every subsequent investor will make you fix it anyway.

**Decision rights.** What needs unanimity, what needs a majority, and what one person can simply decide. Most founder disputes are not about money; they are about someone believing they had a vote.

**Roles and commitment.** Full time or not, and from when. Written down, because memories diverge.

**What happens if someone leaves** — voluntarily, involuntarily, or through illness.

**How a deadlock is broken.** Two equal founders with no tiebreak is a structure that works right up until it does not.

Each of these costs an awkward hour now. Each has ended companies when left undiscussed.', '', 2),
    ('l-leg-4', 'c-legal', 'mod-leg-2', 'Module check: legal form', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-pln-1', 'c-plan', 'mod-pln-1', 'Seven sections, and what each is for', 'article', 560, NULL, NULL, '', 'The plan has seven sections and each answers a question a reader is actually asking. Written in that spirit, it stops being a chore.

**Executive summary** — can I understand this in two minutes and do I want to read on? Written last, read first, and the only section many readers finish.

**The opportunity** — is there a real market, and how do you know?

**Company, offering and strategy** — what exactly you sell, how the model works, how you win, and why that lasts.

**Team** — who is doing this and why them. Investors will tell you this section outranks the financials, and they mean it.

**Marketing** — how anyone finds out you exist. The section most often left thin, and the one most likely to be where the business fails.

**Operating** — how the thing actually gets made and delivered.

**Financial** — the numbers, with the assumption behind each one stated rather than buried.

Length follows importance, not enthusiasm. Founders routinely write nine pages of product and half a page of marketing, which tells a reader something the founder did not intend.', 'The seven sections are still what has to be true. The forty-page document is not still the artefact. Since about 2020 the same story is told at four depths — a one-pager, a deck, a written memo and a data room — and the long plan has retreated to the readers who require it: banks, SBA-style lenders, grant bodies and visa applications. If you are in one of those conversations, write it. Otherwise, write the sections as thinking and publish the compressions. One number worth knowing before you design a deck: Papermark''s 2026 analysis of 24,541 decks and 358,672 investor views found a median of 18 minutes of total attention per deck, 16% of views over inside ten seconds, and fewer than half reaching the last slide.', 0),
    ('l-pln-2', 'c-plan', 'mod-pln-1', 'People and model beat numbers', 'article', 480, NULL, NULL, '', 'A five-year projection is a work of fiction and every experienced reader knows it. What they are actually assessing is whether the people are capable and whether the model is coherent — because those two things determine what happens when the projection turns out to be wrong, which it will.

This has a practical consequence for how you write. Do not defend the numbers; explain the assumptions. ''We project four hundred customers in year two'' invites an argument. ''We project four hundred customers in year two, assuming the conversion rate we have seen across ninety trials holds and that we can sustain the current rate of outbound'' invites a conversation about the assumption, which is the conversation you want.

Sahlman''s team questions are the ones to pre-empt: what have these people done before, what do they know that others do not, who do they know, how hard are they willing to work, and — the one founders never answer — what happens if the plan needs to change completely?

Answer that last one in the plan. It signals that you have thought past your own optimism.', '', 1),
    ('l-pln-3', 'c-plan', 'mod-pln-2', 'Three compressions: 100 words, one sentence, two decks', 'article', 500, NULL, NULL, '', 'The plan is the thinking. The compressions are what people actually receive.

**One hundred words.** The email. Problem, who has it, what you do, why you, what you want. If it needs a second paragraph to make sense, the model is not yet clear enough to explain.

**One sentence.** Harder, and worth the afternoon. Not a slogan — a sentence a listener could repeat accurately to a colleague. The test is whether the repetition survives: if they relay it and get it wrong, the sentence is wrong.

**Two decks, because they do different jobs.** A presentation deck supports you speaking and should be nearly wordless; a reading deck is sent ahead and must stand alone. Founders who send their presentation deck are sending something incomprehensible, and founders who present their reading deck are reading slides aloud. Build both; it is mostly the same content at two densities.

And tell readers how they get their money out. A plan that never mentions exit leaves the most important question to the reader''s imagination.', '', 2),
    ('l-pln-4', 'c-plan', 'mod-pln-2', 'The reader-lens check', 'article', 440, NULL, NULL, '', 'Before sending anything, read it once as each of three people. This catches more than another round of editing.

**As a sceptical investor.** Where is the claim with no evidence? Which number would you challenge first? Is the ask specific, and does the use of funds actually follow from the plan?

**As a potential employee.** Would you leave a job for this? Is it clear what the company will be like to work in, or only what it sells?

**As the customer.** Is the problem described one you recognise, in words you would use? Founders drift into their own vocabulary within months, and the plan is usually where the drift first shows.

Mark every place where a reader would pause, and fix the pause rather than defending the sentence. A pause is a reader deciding whether to continue, and you do not get to argue with them at the time.', '', 3),
    ('l-pln-5', 'c-plan', 'mod-pln-2', 'Module check: plan and pitch', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 4),
    ('l-sum-1', 'c-startup-money', 'mod-sum-1', 'Which of the three businesses are you?', 'article', 500, NULL, NULL, '', 'This question decides which funding advice applies to you, and most bad funding advice is simply advice for a different type of business.

**Main Street.** The large majority of new businesses — roughly seven in ten. A restaurant, an agency, a clinic, a trade. Funded by savings, family, bank debt and revenue. Venture capital is not merely unavailable; it is unsuitable, because the returns that make the business excellent for its owner are far below what a fund requires.

**Supply-chain.** Around one in six. You sell into other businesses as a supplier or a component. Financing follows contracts and receivables, and the decisive relationship is with a small number of customers.

**High-growth.** About three per cent. Large addressable market, a model with strong operating leverage, and a plausible path to an outcome big enough to return a fund.

The cost of misidentifying is a year. Founders of Main Street businesses who spend that year pitching venture funds are not failing at fundraising; they are succeeding at proving they were never in that category.', '', 0),
    ('l-sum-2', 'c-startup-money', 'mod-sum-1', 'Compute the number before you ask for it', 'article', 520, NULL, NULL, '', 'The opening balance sheet is the answer to ''how much do you need?'', and it is embarrassing to be asked that question without one.

List what you must buy to open: equipment, deposits, initial stock, the legal and registration costs, any prepaid software. That is the capital side.

Then the part founders underestimate — working capital. You will pay suppliers and staff before customers pay you, and the gap has to be funded. Estimate months of operating cost until the business covers itself, and be pessimistic; the common error is assuming revenue starts in month two at the level the plan shows for month six.

Add a contingency and say what it is for.

The total is your launch capital. Now you can have a sensible conversation, because ''I need forty-two thousand, here is the sheet'' is a different conversation from ''I''m looking to raise some money''. The first invites scrutiny of your reasoning. The second invites doubt about your competence.', '', 1),
    ('l-sum-3', 'c-startup-money', 'mod-sum-2', 'Stack the sources, cheapest first', 'article', 540, NULL, NULL, '', 'Money has a price, and the price is not only interest. It is control, obligation, and what happens to the relationship if things go badly.

Stack from cheapest outward. **Your own savings** fund most startups, and the reason is not virtue — it is that no one else will price the risk at this stage. **Revenue** is the cheapest external money there is, which is why selling something early beats raising something early whenever it is possible.

**Family and friends** are cheap in interest and expensive in every other currency. If you take it, paper it: amount, terms, what happens if the business fails, and an explicit acknowledgement that they may lose it. The document is not for enforcement. It is so that everyone remembers the same conversation.

**Bank debt** arrives when there is something to lend against. **Angels** and **institutional equity** follow a track record, not a plan — which is why they are at the far end of the stack rather than the start of it.

When the stack does not reach the number, you have three moves: reduce the number, extend the timeline, or change the business. Pretending is not one of them.', '', 2),
    ('l-sum-4', 'c-startup-money', 'mod-sum-2', 'Module check: opening capital', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-gro-1', 'c-growth-money', 'mod-gro-1', 'The banker''s three questions', 'article', 520, NULL, NULL, '', 'A lender is not evaluating your ambition. They are answering three questions, and knowing them lets you prepare the actual meeting rather than a pitch.

**Can you repay?** Cash flow, not profit. They will look at whether the business generates enough cash to service the debt with room to spare, and they will do it on your historic numbers rather than your projections.

**Will you repay?** Character, in the old sense — track record, how you have handled obligations before, whether the story you tell matches the documents. This is why a tidy set of accounts matters beyond compliance.

**What if you cannot?** Collateral and personal guarantees. Understand precisely what you are pledging. A personal guarantee converts a business failure into a personal one, and founders sign them without reading them with a frequency that should worry everyone.

Prepare all three deliberately. The meeting goes differently when you answer the question they are actually asking.', '', 0),
    ('l-gro-2', 'c-growth-money', 'mod-gro-1', 'Five ratios they run before you arrive', 'article', 540, NULL, NULL, '', 'These are computed from your accounts before anyone meets you. Run them first.

**Current ratio** — current assets over current liabilities. Can you meet obligations due within the year?

**Acid-test** — the same, excluding stock. Stock can be hard to convert quickly, and a business that looks liquid only because the warehouse is full is not liquid.

**Debt ratio** — total debt over total assets. How much of the business is already someone else''s claim.

**Debt-to-equity** — how leveraged you are relative to what the owners put in. A high figure says the lender is taking risk the owners have not.

**Times-interest-earned** — earnings over interest. The margin between servicing debt comfortably and not servicing it.

Compute all five. Where one is weak, you have a choice: fix it before applying, or lead with it and explain. What does not work is hoping it goes unnoticed, because it is the first thing that gets noticed.', '', 1),
    ('l-gro-3', 'c-growth-money', 'mod-gro-2', 'Short money, short assets', 'article', 480, NULL, NULL, '', 'The matching principle is one line long and explains a large share of business failures: fund short-lived assets with short-term money, and long-lived assets with long-term money.

Buying a building with an overdraft is the obvious violation. The common one is subtler — funding a hiring spree, whose payoff is eighteen months out, from a facility repayable in ninety days. The business is profitable, growing, and insolvent, all at once.

The reverse error is quieter but real: financing stock that turns over monthly with a five-year loan means paying interest long after the asset is gone.

The test to run on every financing decision is simply: how long will this asset generate cash, and how long do I have this money for? If the second number is smaller than the first, you have introduced a refinancing risk, and refinancing risk has a habit of arriving at exactly the moment credit tightens.', '', 2),
    ('l-gro-4', 'c-growth-money', 'mod-gro-2', 'Stress-test with EBIT halved', 'article', 460, NULL, NULL, '', 'Take your projection and halve operating profit. Now re-run everything: the ratios, the covenants, the runway, the repayment schedule.

This is not pessimism for its own sake. It is what the lender''s credit committee will do, and it is a reasonable proxy for an ordinary bad year — a large customer leaving, a price war, a delayed launch. None of those is a catastrophe; all of them halve profit.

What you are looking for is the first thing that breaks. Usually it is a covenant rather than the ability to pay, and covenant breaches trigger consequences disproportionate to the miss.

If the business survives EBIT halved with the covenants intact, you have a financing structure with genuine margin, and you can say so. If it does not, you have learned the size of the buffer you need before taking the money — which is far cheaper to learn now than in the quarter it happens.', '', 3),
    ('l-gro-5', 'c-growth-money', 'mod-gro-2', 'Module check: growth money', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 4),
    ('l-vc-1', 'c-vc', 'mod-vc-1', 'How a venture fund actually makes money', 'article', 560, NULL, NULL, '', 'Every term in a term sheet follows from this structure, so it is worth understanding before you negotiate against it.

A fund raises capital from limited partners. It charges an annual management fee — typically in the region of two to three per cent — which pays salaries and keeps the lights on. The real money is **carried interest**, a share of the profits, commonly around twenty per cent.

The portfolio maths is the part founders miss. Most investments return little or nothing. A small number return capital. The fund''s entire result depends on roughly one in fifteen producing an outsized outcome.

So when a partner asks whether this could be very large, they are not being greedy or dismissive of a solid business. They are asking the only question their structure permits them to ask. A company that will reliably return three times their money is a bad venture investment and an excellent business — those are not contradictory statements.

Understanding this converts the conversation from a judgement on your worth into a question of fit. Which is what it always was.', '', 0),
    ('l-vc-2', 'c-vc', 'mod-vc-1', 'Angels fund far more companies than VCs', 'article', 480, NULL, NULL, '', 'The numbers are lopsided in a way that should change where most founders spend their time. Angels fund roughly sixteen times more companies than venture funds do, and well under one per cent of companies ever raise venture capital at all.

Angels also invest differently. They write smaller cheques, decide faster, and answer to nobody — which means an angel can back a business because they understand the sector personally, where a fund must justify it against a portfolio thesis.

They broadly finance three kinds of company: ones in an industry they know intimately, ones solving a problem they have had themselves, and ones introduced by someone whose judgement they already trust. Notice that all three are relationship-shaped rather than deck-shaped.

The practical implication: an introduction from someone credible is worth more than a superb cold approach, and building that network is work you do months before you need it. Line up a venture raise six to eight months ahead; line up angels earlier than that, by knowing them before you need them.', '', 1),
    ('l-vc-3', 'c-vc', 'mod-vc-2', 'Convertible preferred, feature by feature', 'article', 580, NULL, NULL, '', 'Investors do not buy the shares you own. They buy convertible preferred stock, and the features are where the economics live.

**Liquidation preference** — they get their money back before common shareholders get anything. At one times, non-participating, this is reasonable and standard. Multiples, or participation on top, change the outcome for founders dramatically in any sale that is not enormous. Model your own exit at several prices to see where you actually land.

**Conversion** — the right to convert to common, which they take when that pays better. It means they choose whichever branch is more favourable, and you should model both.

**Anti-dilution** — protection if a later round prices lower. Full-ratchet is punishing; broad-based weighted average is the common and more balanced form.

**Protective provisions** — the list of things you cannot do without their consent. Read this list slowly. It is where control actually sits, more than board seats do.

**Pro rata** — the right to maintain their percentage in later rounds.

None of these is unreasonable in itself. The combination determines what you own in the outcomes that actually happen.', '', 2),
    ('l-vc-4', 'c-vc', 'mod-vc-2', 'Four ways to delay giving away equity', 'article', 460, NULL, NULL, '', 'Equity is the most expensive money available, because you pay for it forever and you pay most when things go well. Delaying it is usually worth real effort.

**Sell something.** Revenue is non-dilutive and it prices your company far better later. A round raised after twelve months of growth is a fundamentally different conversation from one raised on a plan.

**Grants and competitions**, where they exist for your sector and geography. Slow and administratively tedious, and free.

**Customer funding** — deposits, prepayments, a design partner who funds development in exchange for early access or favourable terms. Common in B2B and underused.

**Debt against something real** — receivables, equipment, a contract. Available earlier than founders assume once there is an asset to lend against.

Each of these buys months, and months buy valuation. The founder who raises at month eighteen instead of month six frequently gives away half as much for the same money — and by then knows enough to spend it well.', '', 3),
    ('l-vc-5', 'c-vc', 'mod-vc-2', 'Module check: angels and venture', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 4),
    ('l-sel-1', 'c-sell', 'mod-sel-1', 'Discovery finds the problem, not the compliment', 'article', 520, NULL, NULL, '', 'The failure mode of early sales calls is that they go well. The prospect is encouraging, says it sounds interesting, and does not buy.

That happens because the founder asked about the solution. People are polite about solutions and honest about problems, so ask about problems.

The most productive question is about the past, not the future: ''tell me about the last time this happened''. A story about last month cannot be flattering in the way a prediction can. Follow it — what did you do, who else was involved, how long did it take, what did it cost?

What you are listening for is whether they have already tried to solve it. Someone who has built a spreadsheet, hired a temp, or bought something that did not work has demonstrated budget and intent. Someone who says ''yes, that is annoying'' has demonstrated politeness.

And when they compliment the idea, write it down and discount it. The only reliable signal at this stage is what they have already spent time or money on.', '', 0),
    ('l-sel-2', 'c-sell', 'mod-sel-1', 'Qualify out early, without apology', 'article', 460, NULL, NULL, '', 'The scarcest thing in early sales is not leads. It is the founder''s hours, and they leak into deals that were never going to close.

Qualify on four things, early and directly. Is there a real problem, of a size they can name? Is there budget, or could there be? Is this person able to decide, or do they need someone who has not been in any of these conversations? And is there a reason to act now, rather than next year?

A ''no'' on any of these is not a failure. It is an hour returned.

Founders resist this because every conversation feels like progress when there are so few. But a pipeline full of unqualified interest produces a forecast that is wrong in the specific direction that causes you to hire too early.

Say it plainly: ''It sounds like this is not a priority this year — should we talk again in the autumn?'' Most people are relieved. Some correct you, and those are the real deals.', '', 1),
    ('l-sel-3', 'c-sell', 'mod-sel-2', 'The pricing conversation', 'article', 540, NULL, NULL, '', 'Founders discount because they are afraid of the silence after they say the number. Everything else about pricing follows from managing that moment.

Say the price plainly and then stop talking. The pause is not rejection; it is arithmetic. Filling it with a concession teaches the customer that your prices are an opening position, and that lesson is permanent for the relationship.

When there is genuine pushback, find out what kind it is. ''It is more than we expected'' is about the value not being clear, and the answer is to re-establish the cost of their problem. ''We cannot afford it this quarter'' is about timing, and the answer is scope or phasing. ''We can get it cheaper'' is about a competitor, and the answer is either a real difference or a considered decision to lose the deal.

If you must move, trade rather than discount. A lower price for a longer commitment, a case study, or a reference is an exchange. A lower price for nothing is a repricing.', '', 2),
    ('l-sel-4', 'c-sell', 'mod-sel-2', 'Module check: founder-led sales', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-ops-1', 'c-operate', 'mod-ops-1', 'Three statements and how they link', 'article', 560, NULL, NULL, '', 'The three statements answer three different questions, and a founder who only reads one is usually reading the wrong one.

**The profit and loss** asks whether the business made money over a period. It is accrual-based: revenue is recorded when earned, costs when incurred, regardless of when cash moved.

**The balance sheet** asks what the business owns and owes at a moment. Assets on one side, liabilities and equity on the other, always in balance.

**The cash-flow statement** asks where the money actually went. This is the one that explains how a profitable business runs out.

The link matters. Profit flows into retained earnings on the balance sheet. Balance-sheet movements — a customer taking ninety days to pay, stock bought ahead of a season — explain the gap between profit and cash.

That gap is where businesses die. A company can show a healthy annual profit and be unable to make payroll in March, and nothing in the profit and loss will warn you.', '', 0),
    ('l-ops-2', 'c-operate', 'mod-ops-1', 'The thirteen-week cash forecast', 'article', 520, NULL, NULL, '', 'This is the single most useful operating document a small company can keep, and it takes about an hour a week.

Thirteen weeks, one column each. Opening balance, money in, money out, closing balance. Money in is by customer and by expected date, not by invoice date — what you believe will actually arrive. Money out is payroll, suppliers, rent, tax, and the recurring costs that are easy to forget until they clear.

Update it weekly by rolling the window forward one week and correcting the previous week''s guesses against what happened.

Two things make it valuable. First, it converts ''are we all right?'' into a number and a date. Second — and this is the part that surprises people — the weekly correction makes you a rapidly better forecaster, because you are confronted with your own optimism at seven-day intervals.

When the closing balance goes negative in week nine, you have nine weeks to act. Without the forecast you would have found out in week nine.', '', 1),
    ('l-ops-3', 'c-operate', 'mod-ops-2', 'A cadence that runs without you', 'article', 540, NULL, NULL, '', 'The test of an operating system is whether it still happens in a week when the founder is ill. Most do not, because the founder is the system.

The minimum is three rhythms.

**Weekly, sixty minutes.** Same time, fixed agenda, a named owner who is not necessarily you. What moved, what is stuck, what we are doing about it, what we decided. Decisions are written down in the same place every week.

**Monthly, ninety minutes.** The numbers. Management accounts, the metric set, the cash forecast. Comparison against what you expected — not just what happened, but why the expectation was wrong.

**Quarterly, half a day.** What are we doing next, what are we stopping, has anything changed about the plan.

Write each as an SOP: who runs it, what they prepare, what the output is and where it lives. An SOP feels bureaucratic for a team of four and is the reason a team of twelve can exist at all. Every cadence that only works because you remember to run it is a constraint on the size the company can reach.', '', 2),
    ('l-ops-4', 'c-operate', 'mod-ops-2', 'Module check: operating', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-met-1', 'c-metrics', 'mod-met-1', 'CAC, honestly calculated', 'article', 500, NULL, NULL, '', 'Customer acquisition cost is simple to define and almost universally calculated too favourably.

Take everything spent to acquire customers in a period — advertising, the sales and marketing salaries, the tools, the commissions, the events, the agency — and divide by the number of new customers acquired in that period.

The common errors all point the same way. Leaving out salaries, which are usually the largest component. Counting customers who arrived through word of mouth in the denominator while excluding no cost from the numerator, which flatters the figure. Blending an efficient channel with an expensive one and reporting the average, which hides that one of them does not work.

Calculate it per channel. The blended number is for the board; the per-channel number is what you act on.

And pair it with **payback period** — how many months of gross margin from that customer it takes to earn the cost back. CAC alone is meaningless; CAC against payback tells you whether growth is funding itself or consuming the balance sheet.', '', 0),
    ('l-met-2', 'c-metrics', 'mod-met-1', 'Retention is the metric that decides', 'article', 520, NULL, NULL, '', 'Acquisition gets the attention and retention decides the outcome. A business with excellent acquisition and poor retention is a business that must keep spending to stand still, and it will eventually meet a quarter where it cannot.

Measure it in cohorts. Take everyone who arrived in a given month and follow that group: what fraction is still there at three months, six, twelve? Do not take an overall churn figure — it averages your best customers with your worst and hides the trend.

What you are looking for is whether the curve flattens. A cohort that declines and then stabilises has found a group for whom the product genuinely works, and that plateau is the real business. A curve that keeps falling to zero means you have a leaky bucket, and no amount of acquisition fixes a leaky bucket.

Compare cohorts against each other over time. If March''s cohort retains better than January''s, something you changed worked. That comparison is the most reliable product feedback you will get.', '', 1),
    ('l-met-3', 'c-metrics', 'mod-met-2', 'Burn, runway, and what to do at nine months', 'article', 480, NULL, NULL, '', 'Runway is cash divided by net monthly burn, expressed in months, and it is the number that determines how many options you have.

Calculate it monthly and be strict about what counts as burn. Use actual cash out, not budget. Include the costs that arrive quarterly or annually, amortised — tax, insurance, the annual software renewals — because a runway figure that ignores them is wrong by exactly the amount that matters.

The thresholds are worth internalising. Below twelve months, a raise becomes urgent rather than optional, and urgency is expensive. Below six, you are negotiating from weakness and everyone in the room knows it. Below three, you are managing an emergency rather than a business.

So the decision point is at nine months, not three. That is when you either start the raise, cut to extend, or change the plan — while all three are still genuinely available. Founders who wait until six find that only one of them is.', '', 2),
    ('l-met-4', 'c-metrics', 'mod-met-2', 'Module check: the numbers', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-scl-1', 'c-scale', 'mod-scl-1', 'Three questions before you scale', 'article', 520, NULL, NULL, '', 'Scaling is not automatically the right move, and the three post-startup questions exist to make that a decision rather than a drift.

**Is the strategy still right?** The one that got you here was built for a smaller company in a market that has since moved. Check it rather than assuming it.

**Can the organisation keep up?** Growth strains the support functions first — finance, hiring, support, compliance — and they typically fail before the product does. Which of yours is closest to breaking?

**Is the founder still the right leader for what comes next?** Asked early and honestly, this is a question about which skills to acquire. Asked late, it is a question the board asks without you.

If the answer to any of these is unclear, the correct move is to resolve it before adding load. Scale amplifies whatever is already true, including what does not work — and it converts a manageable weakness into an expensive one.', 'The three questions survive. What changed is the default answer to ''how fast''. Hoffman and Yeh''s blitzscaling thesis — speed over efficiency while the outcome is uncertain — was the 2018 consensus and was repriced after 2022 towards capital efficiency, runway and staying default alive. There was no recantation; it was a shift in practice, and it showed up as efficiency ratios gating growth capital rather than growth rate alone. Read the chapter''s caution about scaling before the strategy is sustainable as the stronger claim it has become.', 0),
    ('l-scl-2', 'c-scale', 'mod-scl-1', 'What must never be outsourced', 'article', 460, NULL, NULL, '', 'Outsourcing buys capability without fixed cost, and it is genuinely useful. Two rules keep it from being a mistake.

**Never outsource a customer-facing link.** The moment the customer''s experience of you is delivered by someone whose incentives differ from yours, you have lost both the relationship and the information that comes with it. You also stop hearing complaints directly, which is the cheapest research you had.

**Never depend on a single partner for something you cannot quickly replace.** A sole supplier of a critical component is a decision to accept their pricing and their reliability, permanently. The mitigation is a second source, even a more expensive one kept small.

Within those limits, outsource freely — payroll, infrastructure, specialist compliance, anything that is a cost centre rather than a differentiator.

The test: if this partner disappeared on Monday, how long until we are operating again? Under a week is a supplier. Over a month is a dependency, and dependencies belong on the risk register with an owner and a plan.', '', 1),
    ('l-scl-3', 'c-scale', 'mod-scl-2', 'Content, behaviours, results, context', 'article', 560, NULL, NULL, '', 'The founder''s transition is the hardest thing in this course, and it has four stages that founders pass through in roughly this order — or fail to.

**Managing content.** You do the work. Correct at three people, and the reason the company exists.

**Managing behaviours.** You show people how you do the work and check that they do it that way. Necessary and temporary; founders who stay here become the bottleneck they complain about.

**Managing results.** You agree the outcome and let people choose the method. This is where most founders get stuck, because someone else''s method is visibly worse than yours at first, and the temptation to intervene is constant. It is also where the company starts being able to grow without you.

**Managing context.** You shape the environment — the goals, the information, the incentives, who is in which seat — and the results follow from the context rather than from your instruction.

The move from behaviours to results is the painful one. It requires tolerating work done worse than you would do it, in exchange for a company that can be larger than you. There is no version where you get both.', 'Content, behaviours, results, context is still the right chain. The chapter''s conclusion — that the founder''s job is to move up it and hire professional management — is now genuinely contested. Paul Graham''s 2024 ''founder mode'' argues that the founder''s unique asset is context rather than control, and that blanket delegation destroys exactly that. The reconciliation most operators land on is depth per TASK, not per personality: pick the handful of things where your context is irreplaceable and stay deep in those, delegate the rest properly rather than partially. Both positions are defensible; the question to answer is which functions, not whether.', 2),
    ('l-scl-4', 'c-scale', 'mod-scl-2', 'Module check: scaling', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3),
    ('l-ai-1', 'c-ai', 'mod-ai-1', 'The remove test', 'article', 520, NULL, NULL, '', 'Nearly every company now describes itself as AI-native, and the word has stopped carrying information. There is a test that restores it, and it takes one question.

**Turn the AI off. Does the product degrade, or does it stop?** If it degrades, you are AI-enabled: a real product with an AI feature on it. If it stops, you are AI-native. Neither is better — but only one of them is the claim you are making to investors.

The harder second question is the one founders avoid: **does a better foundation model make you more valuable, or redundant?** If the next release makes your product obviously better, you are riding the curve. If it makes your product unnecessary, you are a feature that has not been absorbed yet.

And the version that actually predicts outcomes is neither. The evidence is consistent that the firms getting measurable results are the ones that **redesigned the workflow** — roughly three quarters of high performers, against a quarter of everyone else. Bolting a chatbot onto a human-shaped process is the standard failure, and it fails quietly.', '', 0),
    ('l-ai-2', 'c-ai', 'mod-ai-1', 'What the evidence actually says', 'article', 640, NULL, NULL, '', 'This lesson exists because the numbers in this field are unusually unreliable, and a founder who cannot sort them will make an expensive decision on a press release.

**Randomised, and uncomfortable.** A controlled trial of sixteen experienced developers across 246 real tasks found them **19% slower** with AI tooling — while reporting they had been about 20% faster. They were wrong about their own speed by roughly forty points. Any claim of the form ‘AI saves us X hours’, with no control group, is a feeling rather than a finding.

**Randomised, and encouraging.** A field experiment with 776 professionals found individuals working with AI matched the output of two-person teams without it, in about 16% less time. Both results are real. AI substitutes for a teammate on some tasks and costs you time on others, and which is which is an empirical question about your work.

**The adoption gap.** Surveys report adoption near 90%. The nationally representative business survey puts the share of firms actually *using* AI in producing goods or services at **17-20%**. Roughly 80% of executives report productivity gains; about 37% report any effect on operating profit.

**Treat vendor resolution rates as marketing.** Published deflection figures cluster far above independent tests of the same products.

The honest summary: the floor has risen, the ceiling is unproven, and the gap between them is filled almost entirely with self-report.', '', 1),
    ('l-ai-3', 'c-ai', 'mod-ai-2', 'Agentic workflows beat better prompts', 'article', 540, NULL, NULL, '', 'The single highest-leverage technique in applied AI is also the least glamorous: stop asking the model for the answer, and give it a process.

The loop is **outline → search → draft → self-critique → revise**. Each step is an ordinary call; the quality jump comes from the structure, and it is consistently larger than the jump from upgrading the underlying model. It is slower and dearer per request, which is exactly why people skip it and then conclude the model is not good enough.

Two practical consequences.

**Pick concrete problems over vague ones.** ‘Summarise this’ has no evaluable output. ‘Extract the five commitments made in this call and flag the ones without an owner’ can be checked by a human in ten seconds, which means it can be improved.

**Optimise for iteration speed.** The best predictor of whether an AI feature gets good is how many times you can go round the loop in a week, not how clever the first version was.

And know which mode you are in. Accepting generated code without reading it is fine for a prototype you intend to throw away. It is not a way to run a system customers depend on, and the distinction is about the code’s destination rather than the tool.', '', 2),
    ('l-ai-4', 'c-ai', 'mod-ai-2', 'Evals: read the failures, then count them', 'article', 600, NULL, NULL, '', 'The moment an AI feature has users, evaluation becomes the product discipline — and practitioners report that **60-80% of production AI development time is error analysis**, not model work. Founders consistently budget for the opposite.

The method is unglamorous and it works.

**Read real traces by hand first.** Not synthetic cases — actual production conversations, fifty or a hundred of them, and write down what went wrong in your own words. Group those notes into failure modes. This is the step everyone skips and the one that tells you what to measure.

**Then build judges for the top failure modes, and keep them binary.** ‘Did the answer cite a real document: yes or no’ is checkable and stable. ‘Rate helpfulness one to five’ is neither, and will drift.

**Generate test cases from explicit dimensions**, not by asking a model to invent tests — otherwise you get what it finds easy to imagine.

**A 100% pass rate means your evals are too easy.** It is the most common sign a team has stopped learning anything from them.

One economic note, because it changes the business rather than the feature: inference is a real line of cost of goods. AI-native gross margins have been running near the low fifties against 75-85% for conventional software, with inference around a fifth of product cost. A model that is ten times better and three times dearer is not automatically the right choice.', '', 3),
    ('l-ai-5', 'c-ai', 'mod-ai-2', 'The lethal trifecta', 'article', 470, NULL, NULL, '', 'Before you give an agent tools, there is one security shape to learn, because it is the one no system prompt fixes.

An agent becomes exfiltration-capable when it has all three of:

1. **Access to private data**
2. **Exposure to untrusted content** — a web page, an email, a user upload, a document someone else wrote
3. **An outbound channel** — the ability to send, post, call an API, or write somewhere visible

With all three, untrusted content can instruct the agent to take private data and send it out. This is not a jailbreak to be patched; it is the architecture working as designed. Prompt-level defences reduce the rate and do not remove the capability.

**The fix is to remove a leg.** Read-only agents can see private data and untrusted content, and have nothing to send with. Agents that act can be restricted to trusted inputs. If you genuinely need all three, the answer is sandboxing and logging every action for review — not a better instruction.

Ask the question before the demo, not after the incident: which of the three does this agent have, and which one am I removing?', '', 4),
    ('l-ai-6', 'c-ai', 'mod-ai-2', 'Module check: AI-native', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 5),
    ('l-ext-1', 'c-exit', 'mod-ext-1', 'Name the motivation before the mechanism', 'article', 500, NULL, NULL, '', 'Founders choose an exit mechanism and then rationalise the reason. Doing it in that order produces exits people regret.

The honest motivations are few, and each points somewhere different.

**I am tired.** Legitimate, common, and rarely said aloud. It points toward a trade sale with a short earn-out, and away from anything requiring three more years of your energy.

**I want liquidity but not to leave.** Points toward a secondary sale or a partial recapitalisation, not a full exit.

**The company needs an owner I cannot be.** Capital, distribution, a market I cannot reach. Points toward a strategic acquirer.

**I want to maximise the number.** Points toward a competitive process, and toward waiting for the year that shows best.

These lead to different buyers, different timelines and different outcomes for your team. Naming the real one first is what makes the rest of the decisions coherent — and it is also the thing an adviser cannot do for you.', '', 0),
    ('l-ext-2', 'c-exit', 'mod-ext-1', 'What a buyer finds in diligence', 'article', 520, NULL, NULL, '', 'Diligence does not discover new problems. It discovers the problems you knew about and had not fixed, and it discovers them at the moment when fixing them is most expensive.

The recurring list: customer contracts that were never signed or have auto-renewed on unclear terms; intellectual property assigned to individuals rather than the company, especially from early contractors; a founder agreement that does not reflect what actually happened; revenue concentrated in a handful of customers; employment arrangements that were convenient and are not compliant; and accounts that require explanation rather than standing on their own.

Each of these is cheap to fix a year out and costly to fix under a signed exclusivity with a deadline, because at that point the buyer knows you cannot walk away easily.

So run your own diligence early — ideally a year before you intend to sell, and honestly before you intend anything. The list you produce is a to-do list; produced later, the same list becomes a price reduction.', '', 1),
    ('l-ext-3', 'c-exit', 'mod-ext-2', 'Three ways to value, one range to hold', 'article', 540, NULL, NULL, '', 'Get your own valuation before anyone gives you theirs. The first number you hear anchors everything that follows, and you want the anchor to be yours.

**Multiple of earnings.** The most common in practice. A multiple of profit, or of revenue for faster-growing companies, benchmarked against comparable transactions. The multiple is not arbitrary — it encodes growth rate, margin, customer concentration and how much of the business depends on you.

**Discounted cash flow.** Project the cash the business will generate and discount it to today. Rigorous in structure and extremely sensitive to assumptions, which means it can be made to produce almost any answer. Useful for understanding the drivers; dangerous as a single figure.

**Comparable transactions.** What similar businesses actually sold for. The hardest data to get and the most persuasive when you have it.

Run all three. They will disagree, and the disagreement is informative — it tells you which assumptions the value hangs on.

Hold a range with reasoning, not a number with hope. And when a buyer states a valuation, ask exactly how they derived it. The answer tells you what they think they are buying.', 'The appendix gives you the methods and deliberately no numbers, which was the right call in 2018 and leaves a gap when you need a sanity check. As of 2026: US Main Street businesses close around 2.7x SDE and 0.7x revenue (BizBuySell closed-deal data, sector range roughly 2.0-3.3x earnings); public SaaS trades near a 3.8x equal-weighted median ARR multiple after touching a decade low in June 2026; private SaaS medians sit near 4.5x. The 2021 comparables a founder is usually quoted are not a benchmark — software clears nearer 15x EBITDA than 25x now. Triangulate, hold a range, and say which index any multiple came from.', 2),
    ('l-ext-4', 'c-exit', 'mod-ext-2', 'Module check: harvest', 'quiz', 300, NULL, NULL, '', 'A short check on the module. Three questions; you can retake it as often as you like.', '', 3)
  ) as v(id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, revision, sort)
  on conflict (organization_id, id) do update set
    course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title, kind = excluded.kind,
    duration_sec = excluded.duration_sec, video_url = excluded.video_url, captions_url = excluded.captions_url,
    source = excluded.source, body = excluded.body, revision = excluded.revision, sort = excluded.sort;

  insert into cs_quiz_questions (organization_id, id, lesson_id, prompt, options, answer, explanation, sort)
  select p_org, v.* from (values
    ('q-fit-1', 'l-fit-4', 'The three must-haves for a founder are…', '["Passion, funding and a network","A plan, the ability to execute it, and lasting motivation","Experience, credentials and capital","An idea, a co-founder and a deadline"]'::jsonb, 1, 'Passion is an input, not a qualification. An investor tests plan, execution and durable motivation.', 0),
    ('q-fit-2', 'l-fit-4', 'You score badly on a capability the business fundamentally runs on. The usual right answer is…', '["Learn it — you have time","Ignore it and play to strengths","Find a co-founder who already has it","Hire a junior into the role"]'::jsonb, 2, 'Central and permanent gaps are co-founder-shaped. Choosing ''learn it'' because it feels cheaper costs years.', 1),
    ('q-fit-3', 'l-fit-4', 'Why does the handbook treat customer complaints as valuable?', '["They show engagement","They are the cheapest market research available","They improve retention when answered","They are required for compliance"]'::jsonb, 1, 'Complaints are free, specific and unsolicited — and most founders manage them as an attack rather than mining them.', 2),
    ('q-opp-1', 'l-opp-6', 'In the market-evaluation grid, the column that stops the exercise being theatre is…', '["Your answer","Your confidence","The test that would settle it","The source"]'::jsonb, 2, 'Naming a cheap, fast test that could prove you wrong converts an opinion into something resolvable.', 0),
    ('q-opp-2', 'l-opp-6', 'Your real competitor at the idea stage is usually…', '["The best-funded startup in the space","The incumbent market leader","Whatever workaround the customer uses today","A future entrant"]'::jsonb, 2, 'The spreadsheet, the intern or the WhatsApp group is free and already installed — that is what you displace.', 1),
    ('q-opp-3', 'l-opp-6', 'Breakeven is…', '["Revenue minus total costs","Fixed costs divided by contribution per unit","Variable costs divided by price","Total costs divided by units sold"]'::jsonb, 1, 'Contribution is price minus variable cost; breakeven is how many units of contribution cover the fixed base.', 2),
    ('q-mod-1', 'l-mod-5', 'Which question do founders most often leave out of their business model?', '["What value we create","How we capture value","How anyone discovers we exist","Who the customer is"]'::jsonb, 2, 'Discovery belongs inside the model. Deferring it is how a good product ends up with no customers.', 0),
    ('q-mod-2', 'l-mod-5', 'A model that passes the numbers test but fails the narrative test usually has…', '["A pricing problem","A distribution problem","A hiring problem","A legal problem"]'::jsonb, 1, 'The story breaks at the step where a real person would have to behave implausibly — normally how they find you.', 1),
    ('q-mod-3', 'l-mod-5', 'The test of a real strategy is…', '["That it is ambitious","That it is written down","What it rules out","That investors like it"]'::jsonb, 2, 'If it implies no customers you decline and no features you refuse, it is a description rather than a strategy.', 2),
    ('q-leg-1', 'l-leg-4', 'Early losses you can offset against other income point toward…', '["A C corporation","A pass-through form","A limited partnership only","Any form — it makes no difference"]'::jsonb, 1, 'Pass-through treatment lets early losses flow to the owners'' returns; a corporation traps them in the entity.', 0),
    ('q-leg-2', 'l-leg-4', 'Why does vesting matter in a founder agreement?', '["It reduces tax","It stops an early leaver keeping a founder''s stake for work they did not do","It is legally required","It increases valuation"]'::jsonb, 1, 'Without it, a founder who leaves in month eight keeps a full stake — and every later investor will force a fix anyway.', 1),
    ('q-leg-3', 'l-leg-4', 'The output of the legal-form course should be…', '["A registered company","A decision you act on immediately","A shortlist, the reasoning, and a brief for local counsel","A signed shareholders'' agreement"]'::jsonb, 2, 'Forms and tax treatment differ by jurisdiction; the framework narrows an expensive conversation into a cheap one.', 2),
    ('q-pln-1', 'l-pln-5', 'Experienced readers assess a plan mainly on…', '["The five-year projections","The people and the model","The size of the market","The quality of the design"]'::jsonb, 1, 'Projections will be wrong; people and model determine what happens when they are.', 0),
    ('q-pln-2', 'l-pln-5', 'Why build both a presentation deck and a reading deck?', '["Investors ask for two","They do different jobs — one supports you speaking, one must stand alone","To show effort","One is for email, one is for print"]'::jsonb, 1, 'Sending a presentation deck sends something incomprehensible; presenting a reading deck means reading slides aloud.', 1),
    ('q-pln-3', 'l-pln-5', 'The most credible way to present a projection is to…', '["Use conservative numbers","State the assumption behind it","Show three scenarios","Cite an analyst report"]'::jsonb, 1, 'Naming the assumption turns an argument about your number into a conversation about a premise — which you want.', 2),
    ('q-sum-1', 'l-sum-4', 'Roughly what share of new businesses are the high-growth type venture capital is designed for?', '["About a third","About 15%","About 3%","About half"]'::jsonb, 2, 'Around 70% are Main Street and about 17% supply-chain; roughly 3% are venture-shaped.', 0),
    ('q-sum-2', 'l-sum-4', 'The cost founders most often underestimate when sizing launch capital is…', '["Equipment","Working capital until the business covers itself","Legal fees","Marketing"]'::jsonb, 1, 'You pay staff and suppliers before customers pay you, and the gap has to be funded.', 1),
    ('q-sum-3', 'l-sum-4', 'Money from family should be documented mainly because…', '["Tax authorities require it","It makes enforcement possible","Everyone should remember the same conversation","Investors will ask for it"]'::jsonb, 2, 'The paper is not for enforcement. It records the terms and the acknowledgement that the money may be lost.', 2),
    ('q-gro-1', 'l-gro-5', 'A banker assessing ''can you repay'' looks primarily at…', '["Profit","Cash flow","Revenue growth","Market size"]'::jsonb, 1, 'Debt is serviced from cash, not from accrual profit — and from historic numbers rather than projections.', 0),
    ('q-gro-2', 'l-gro-5', 'The matching principle says…', '["Match revenue to costs in the same period","Fund short-lived assets with short money and long-lived assets with long money","Match debt to equity one to one","Match each loan to a specific customer"]'::jsonb, 1, 'Funding an eighteen-month payoff from ninety-day money is how a profitable, growing business becomes insolvent.', 1),
    ('q-gro-3', 'l-gro-5', 'When you stress-test with EBIT halved, the thing that usually breaks first is…', '["Payroll","A covenant","The tax bill","Supplier terms"]'::jsonb, 1, 'Covenant breaches trigger consequences out of proportion to the miss, which is why they break before payments do.', 2),
    ('q-vc-1', 'l-vc-5', 'A venture fund''s returns depend mainly on…', '["Steady returns across the portfolio","The management fee","Roughly one investment in fifteen producing an outsized outcome","Avoiding losses"]'::jsonb, 2, 'Most investments return little; the fund''s result rests on the rare very large outcome. Every term follows from that.', 0),
    ('q-vc-2', 'l-vc-5', 'Compared with venture funds, angels…', '["Invest larger amounts less often","Fund roughly sixteen times more companies","Only invest after a Series A","Require board seats"]'::jsonb, 1, 'Angels write smaller cheques, decide faster, and back relationships and sectors they know personally.', 1),
    ('q-vc-3', 'l-vc-5', 'Where does control most often actually sit in a term sheet?', '["Board composition","The protective provisions","The valuation","The option pool"]'::jsonb, 1, 'The list of things you cannot do without consent determines more day-to-day control than board seats do.', 2),
    ('q-sel-1', 'l-sel-4', 'The most reliable signal in a discovery call is…', '["That they say it sounds interesting","That they ask for a demo","That they have already spent time or money trying to solve it","That they introduce you to a colleague"]'::jsonb, 2, 'A spreadsheet, a temp or a failed purchase demonstrates budget and intent. Compliments demonstrate politeness.', 0),
    ('q-sel-2', 'l-sel-4', '''It is more than we expected'' usually means…', '["They cannot afford it","A competitor is cheaper","The value has not been established","They want a longer contract"]'::jsonb, 2, 'Price objections come in kinds. This one is answered by re-establishing what their problem costs them.', 1),
    ('q-sel-3', 'l-sel-4', 'If you must move on price, you should…', '["Discount quickly to keep momentum","Trade the reduction for something","Offer a free trial instead","Hold firm and lose the deal"]'::jsonb, 1, 'A lower price for a longer term or a reference is an exchange. A lower price for nothing is a repricing.', 2),
    ('q-ops-1', 'l-ops-4', 'A profitable business runs out of cash because…', '["Profit was miscalculated","Balance-sheet movements absorb cash the P&L does not show","Costs rose","Tax was underestimated"]'::jsonb, 1, 'Slow-paying customers and stock bought ahead consume cash while profit still looks healthy.', 0),
    ('q-ops-2', 'l-ops-4', 'The weekly discipline of the thirteen-week forecast makes you…', '["More conservative","A measurably better forecaster","Less reliant on accountants","Faster at invoicing"]'::jsonb, 1, 'Correcting last week''s guess against what happened confronts your own optimism at seven-day intervals.', 1),
    ('q-ops-3', 'l-ops-4', 'The honest test of an operating cadence is…', '["That the team likes it","That it produces a report","That it still runs in a week the founder is ill","That it takes under an hour"]'::jsonb, 2, 'A cadence that only happens because you remember to run it is a ceiling on how large the company can get.', 2),
    ('q-met-1', 'l-met-4', 'The most common error in calculating CAC is…', '["Including tool costs","Leaving out sales and marketing salaries","Using a quarterly period","Counting trials as customers"]'::jsonb, 1, 'Salaries are usually the largest component, and omitting them flatters the number in the direction you want.', 0),
    ('q-met-2', 'l-met-4', 'In a cohort retention curve, the thing to look for is…', '["The starting number","Whether the curve flattens","The average across cohorts","The steepest month"]'::jsonb, 1, 'A plateau means you have found people for whom the product genuinely works. A curve to zero is a leaky bucket.', 1),
    ('q-met-3', 'l-met-4', 'The point at which you should decide to raise, cut or change plan is…', '["Three months of runway","Six months of runway","Nine months of runway","Twelve months of runway"]'::jsonb, 2, 'At nine months all three options are still genuinely open. By six you are negotiating from weakness.', 2),
    ('q-scl-1', 'l-scl-4', 'Under growth, what typically breaks first?', '["The product","The support functions — finance, hiring, support, compliance","Pricing","The customer relationship"]'::jsonb, 1, 'Product usually holds longer than the functions around it, which is why the three questions ask about the organisation.', 0),
    ('q-scl-2', 'l-scl-4', 'Which should never be outsourced?', '["Payroll","Infrastructure","A customer-facing link","Specialist compliance"]'::jsonb, 2, 'You lose both the relationship and the information — including complaints, your cheapest research.', 1),
    ('q-scl-3', 'l-scl-4', 'The hardest step in the founder''s transition is from…', '["Content to behaviours","Behaviours to results","Results to context","Context to content"]'::jsonb, 1, 'It requires tolerating work done worse than you would do it, in exchange for a company larger than you.', 2),
    ('q-ai-1', 'l-ai-6', 'Under the remove test, a product that STOPS when you turn the AI off is…', '["AI-enabled","AI-native","Over-engineered","A wrapper"]'::jsonb, 1, 'Degrades = AI-enabled; stops = AI-native. Neither is better — only one is the claim you are making.', 0),
    ('q-ai-2', 'l-ai-6', 'A randomised trial of experienced developers using AI tooling found they were…', '["20% faster, as they reported","About the same","19% slower, while believing they were faster","Faster only on new code"]'::jsonb, 2, 'They misjudged their own speed by roughly forty points, which is why uncontrolled hours-saved claims are unusable.', 1),
    ('q-ai-3', 'l-ai-6', 'The lethal trifecta is private data, untrusted content and…', '["A large context window","An outbound channel","Tool access","A weak system prompt"]'::jsonb, 1, 'All three together make exfiltration possible by design. The fix is removing a leg, not a better prompt.', 2),
    ('q-ext-1', 'l-ext-4', 'The handbook insists you decide which first?', '["The mechanism","The valuation","The motivation","The adviser"]'::jsonb, 2, 'Different motivations lead to different buyers and timelines. Choosing the mechanism first produces regretted exits.', 0),
    ('q-ext-2', 'l-ext-4', 'Diligence mainly surfaces…', '["Problems nobody knew about","Problems you knew about and had not fixed","Accounting errors","Competitor threats"]'::jsonb, 1, 'Cheap to fix a year out; under signed exclusivity the same list becomes a price reduction.', 1),
    ('q-ext-3', 'l-ext-4', 'When a buyer states a valuation, the most useful question is…', '["Can you go higher?","How did you derive it?","Who else are you looking at?","When can you close?"]'::jsonb, 1, 'The derivation tells you what they think they are buying — and lets you argue the assumption rather than the number.', 2)
  ) as v(id, lesson_id, prompt, options, answer, explanation, sort)
  on conflict (organization_id, id) do update set
    lesson_id = excluded.lesson_id, prompt = excluded.prompt, options = excluded.options,
    answer = excluded.answer, explanation = excluded.explanation, sort = excluded.sort;

  -- Relative to seeding, so a freshly provisioned school always has a live
  -- timetable rather than one that expired before anyone signed in. live-2 is
  -- deliberately already under way (see seed.ts `inProgress`).
  insert into cs_live_lessons (organization_id, id, mentor_id, category_id, title, description, starts_at, duration_min, join_url)
  select p_org, v.* from (values
    ('live-1', 'm-amara', 'start', 'Opportunity clinic: bring one idea', 'Send your ten market questions in advance. We take three ideas apart on screen and find the expensive unknown in each.', now() - interval '18 days', 60, 'https://meet.example.com/startup-school/live-1'),
    ('live-2', 'm-mei', 'grow', 'Office hours: your pricing conversation', 'Bring the deal you are afraid to price. We rehearse the number, the silence afterwards, and the three kinds of pushback.', now() - interval '5 minutes', 45, 'https://meet.example.com/startup-school/live-2'),
    ('live-3', 'm-padhang', 'grow', 'Build a thirteen-week cash forecast, live', 'We build one from a blank sheet using a real set of numbers, then roll it forward a week so you can see the correction.', now() + interval '3 days', 60, 'https://meet.example.com/startup-school/live-3'),
    ('live-4', 'm-zakir', 'start', 'Founder agreement clinic', 'The six terms, why each one ends companies when left undiscussed, and what to take to counsel in your jurisdiction.', now() + interval '6 days', 50, 'https://meet.example.com/startup-school/live-4'),
    ('live-5', 'm-amara', 'fund', 'Read a term sheet with me', 'A real, anonymised sheet. We go clause by clause and model what each one does to the founders at three exit prices.', now() + interval '9 days', 75, 'https://meet.example.com/startup-school/live-5'),
    ('live-6', 'm-bayu', 'grow', 'The handover: managing results, not work', 'For founders stuck between behaviours and results. Bring the task you cannot stop doing yourself.', now() - interval '5 days', 90, 'https://meet.example.com/startup-school/live-6')
  ) as v(id, mentor_id, category_id, title, description, starts_at, duration_min, join_url)
  on conflict (organization_id, id) do update set
    mentor_id = excluded.mentor_id, category_id = excluded.category_id, title = excluded.title,
    description = excluded.description, starts_at = excluded.starts_at,
    duration_min = excluded.duration_min, join_url = excluded.join_url;

  insert into cs_availability (organization_id, id, mentor_id, weekday, on_date, start_time, end_time, closed)
  select p_org, v.* from (values
    ('av-leo-1', 'm-leonardo', 2::smallint, NULL::date, '14:00'::time, '17:00'::time, false),
    ('av-leo-2', 'm-leonardo', 4::smallint, NULL::date, '14:00'::time, '17:00'::time, false),
    ('av-ama-1', 'm-amara', 1::smallint, NULL::date, '09:00'::time, '12:00'::time, false),
    ('av-ama-2', 'm-amara', 3::smallint, NULL::date, '09:00'::time, '12:00'::time, false),
    ('av-ama-3', 'm-amara', 4::smallint, NULL::date, '15:00'::time, '18:00'::time, false),
    ('av-pad-1', 'm-padhang', 1::smallint, NULL::date, '18:00'::time, '21:00'::time, false),
    ('av-pad-2', 'm-padhang', 3::smallint, NULL::date, '18:00'::time, '21:00'::time, false),
    ('av-mei-1', 'm-mei', 1::smallint, NULL::date, '10:00'::time, '13:00'::time, false),
    ('av-mei-2', 'm-mei', 3::smallint, NULL::date, '10:00'::time, '13:00'::time, false),
    ('av-mei-3', 'm-mei', 5::smallint, NULL::date, '10:00'::time, '12:00'::time, false),
    ('av-bay-1', 'm-bayu', 3::smallint, NULL::date, '13:00'::time, '18:00'::time, false)
  ) as v(id, mentor_id, weekday, on_date, start_time, end_time, closed)
  on conflict (organization_id, id) do update set
    mentor_id = excluded.mentor_id, weekday = excluded.weekday, on_date = excluded.on_date,
    start_time = excluded.start_time, end_time = excluded.end_time, closed = excluded.closed;

  insert into cs_groups (organization_id, id, name, category_id, blurb, members, image_url)
  select p_org, v.* from (values
    ('g-cohort', 'This Cohort', 'start', 'Everyone who started this month. Weekly check-in: what moved, what is stuck, what you are asking for.', 214, '/images/group-cohort.jpg'),
    ('g-idea', 'Idea Clinic', 'start', 'Post the problem you think you have found. Get the ten questions asked back at you, hard but kindly.', 1180, '/images/group-idea.jpg'),
    ('g-raise', 'Raising Right Now', 'fund', 'Founders mid-raise comparing notes on terms, timelines and who actually replied. No introductions brokered here.', 640, '/images/group-raise.jpg'),
    ('g-sales', 'Founder-Led Sales', 'grow', 'Call recordings, objection handling and the pricing conversations that went badly. Especially those.', 905, '/images/group-sales.jpg'),
    ('g-numbers', 'The Numbers', 'grow', 'Cash forecasts, cohort tables and arguments about how to calculate CAC properly.', 508, '/images/group-numbers.jpg')
  ) as v(id, name, category_id, blurb, members, image_url)
  on conflict (organization_id, id) do update set
    name = excluded.name, category_id = excluded.category_id, blurb = excluded.blurb,
    members = excluded.members, image_url = excluded.image_url;

end $seed$;

grant execute on function public.ss_seed_org(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- To populate a school:  select ss_seed_org('<organization uuid>');
-- Re-running refreshes the catalogue and leaves learner rows untouched.
-- ---------------------------------------------------------------------------
