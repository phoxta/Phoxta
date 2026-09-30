-- ---------------------------------------------------------------------------
-- Phoxta Startup School - final founder curriculum
--
-- The school reuses the Coir Six `cs_*` tables under its own organisation:
-- every one is org-scoped, so a second school needs its own content, not a
-- second schema.
--
-- Ten outcome-led courses guide founders through one sequence:
-- IDEA -> PROBLEM -> MARKET -> CUSTOMER -> BUSINESS MODEL -> BRAND -> MVP ->
-- MARKETING -> LAUNCH -> GROWTH.
-- Each topic carries an objective, explanation, example, practical activity,
-- AI reflection prompt and template; every course ends with a business asset.
--
-- GENERATED from businesses/startup-school/packages/core/src/curriculum.ts
-- through seed.ts by scripts/gen-migration.mjs. Edit TypeScript and regenerate;
-- do not hand-edit the SQL or the bundled demo and live school will drift.
--
-- Idempotent: safe to re-run to refresh curriculum without touching
-- learner rows. Called by provisioning for the startup-school blueprint.
-- ---------------------------------------------------------------------------

-- Where a lesson's 2018 source has been overtaken. A separate column, not an
-- edit to the body: the learner has to be able to tell the two claims apart.
alter table public.cs_lessons add column if not exists revision text not null default '';

alter table public.cs_courses add column if not exists final_project_title text not null default '';
alter table public.cs_courses add column if not exists final_project_description text not null default '';

create table if not exists public.cs_lesson_blocks (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  lesson_id text not null,
  type text not null,
  title text not null,
  content text not null,
  action_href text not null default '',
  action_label text not null default '',
  sort integer not null default 0,
  primary key (organization_id, id),
  foreign key (organization_id, lesson_id) references public.cs_lessons(organization_id, id) on delete cascade
);
create index if not exists idx_cs_lesson_blocks_lesson on public.cs_lesson_blocks(organization_id, lesson_id, sort);
alter table public.cs_lesson_blocks enable row level security;
grant select on public.cs_lesson_blocks to anon, authenticated;
drop policy if exists cs_lesson_blocks_read on public.cs_lesson_blocks;
create policy cs_lesson_blocks_read on public.cs_lesson_blocks for select to anon, authenticated using (true);

create or replace function public.ss_seed_org(p_org uuid) returns void
language plpgsql security definer set search_path = public as $seed$
begin

  update cs_courses set published = false where organization_id = p_org and id = any(array['c-fit', 'c-opportunity', 'c-model', 'c-legal', 'c-plan', 'c-startup-money', 'c-growth-money', 'c-vc', 'c-sell', 'c-operate', 'c-metrics', 'c-scale', 'c-ai', 'c-exit']::text[]);

  insert into cs_categories (organization_id, id, name, blurb, sort)
  select p_org, v.* from (values
    ('start', 'Validate', 'Turn an idea into an evidence-backed opportunity and a business model.', 0),
    ('fund', 'Build', 'Build the brand, MVP and financial foundation your business needs.', 1),
    ('grow', 'Launch & Grow', 'Find customers, launch with focus and build repeatable growth.', 2)
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

  insert into cs_courses (organization_id, id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, final_project_title, final_project_description, published_at, published)
  select p_org, v.* from (values
    ('c-opportunity', 'from-idea-to-opportunity', 'From Idea to Opportunity', 'Turn a promising idea into a specific, testable opportunity before you invest serious time or money.', 'A startup is not built on an idea alone. It is built on a problem that a defined group of people experiences often enough, painfully enough, and urgently enough to change what they do. This course helps founders move from intuition to an opportunity they can explain, test and improve.', 'start', 'm-leonardo', 'Beginner', 'start', NULL, 4.9, 0, '["Separate a customer problem from a product idea","Write an evidence-led opportunity brief","Map the people, pain and alternatives around a problem","Choose the next test instead of guessing"]'::jsonb, 'Opportunity Brief', 'A concise case for the opportunity: the customer, problem, existing alternatives, evidence, assumptions and immediate validation plan.', '2026-09-19T00:00:00.000Z'::timestamptz, true),
    ('c-market', 'market-research-and-validation', 'Market Research & Validation', 'Replace broad market claims with customer evidence, a clear segment and a practical validation report.', 'Good market research does not try to make an idea look inevitable. It helps you learn where demand exists, who experiences it most sharply, what alternatives they use and which assumptions could make your plan wrong.', 'start', 'm-amara', 'Beginner', 'fund', NULL, 4.9, 0, '["Define a reachable market segment","Estimate TAM, SAM and SOM transparently","Run useful customer interviews and surveys","Produce a Market Validation Report with evidence and caveats"]'::jsonb, 'Market Validation Report', 'A documented view of your market, segment, competitors, customer evidence, demand tests and the assumptions that still require validation.', '2026-09-20T00:00:00.000Z'::timestamptz, true),
    ('c-business-model', 'build-your-business-model', 'Build Your Business Model', 'Design how your startup creates value, reaches customers and earns enough to continue serving them.', 'A business model is the logic of your business: who you serve, what they value, how they find you, what they pay, what it takes to deliver and where the economics can break. This course takes founders from disconnected ideas to a working, testable model.', 'start', 'm-leonardo', 'Intermediate', 'grow', NULL, 4.9, 0, '["Define each Business Model Canvas building block","Make explicit choices about customers, value and revenue","Test the assumptions behind a business model","Complete a Business Model Canvas that guides experiments"]'::jsonb, 'Business Model Canvas', 'A complete, testable view of customer segments, value proposition, channels, relationships, revenues, resources, activities, partners and cost structure.', '2026-09-21T00:00:00.000Z'::timestamptz, true),
    ('c-brand', 'brand-strategy', 'Brand Strategy for Startups', 'Build a brand people can recognise, trust and choose before visual design becomes the whole conversation.', 'Brand is the meaning people attach to your business after every interaction. It gives founders a disciplined way to make decisions about audience, positioning, message, name and visual expression so the business feels coherent as it grows.', 'fund', 'm-mei', 'Beginner', 'mint', NULL, 4.9, 0, '["Define a purposeful brand position","Create a focused customer persona","Develop a recognisable voice and story","Produce a practical Brand Strategy Document"]'::jsonb, 'Brand Strategy Document', 'A clear foundation for how your business is positioned, expressed and differentiated for its first customers.', '2026-09-22T00:00:00.000Z'::timestamptz, true),
    ('c-mvp', 'mvp-blueprint', 'Plan & Test Your MVP', 'Define the smallest product that can produce a learning loop with your earliest customers.', 'An MVP is not a small version of everything you imagine. It is the smallest credible experience that lets a defined customer make progress and lets your team learn what to build next. This course turns that principle into a tested product blueprint.', 'fund', 'm-leonardo', 'Beginner', 'peach', NULL, 4.9, 0, '["Define the core user and problem","Prioritise a focused first release","Create a user journey and product requirements","Produce and test an MVP Blueprint"]'::jsonb, 'MVP Blueprint', 'A focused plan for your earliest user, core problem, workflow, must-have features, prototype approach, test and feedback loop.', '2026-09-23T00:00:00.000Z'::timestamptz, true),
    ('c-marketing', 'go-to-market-marketing', 'Go-to-Market & Marketing', 'Turn a focused offer into a practical plan for reaching, converting and learning from your first market.', 'Go-to-market connects audience, position, message, channel, offer and measurement. It is how a startup earns the right to scale marketing spend by first learning which messages and routes create qualified demand.', 'grow', 'm-mei', 'Intermediate', 'grow', NULL, 4.9, 0, '["Build a go-to-market strategy around a defined audience","Create focused positioning and messaging","Choose channels that match the customer journey","Finish a measurable 90-Day Marketing Plan"]'::jsonb, '90-Day Marketing Plan', 'A ninety-day plan with audience, positioning, message, channel experiments, content, campaign calendar, budget assumptions and review metrics.', '2026-09-24T00:00:00.000Z'::timestamptz, true),
    ('c-sales', 'customer-acquisition-and-sales', 'Customer Acquisition & Sales', 'Build a repeatable, customer-respectful sales system from first outreach through retention.', 'Early sales are how founders learn whether their positioning, product and price make sense in the real world. This course gives you a practical system for creating conversations, qualifying opportunities, running discovery and earning repeat business.', 'grow', 'm-mei', 'Beginner', 'mint', NULL, 4.9, 0, '["Generate relevant leads","Qualify opportunities without wasting a quarter","Run discovery and sales conversations","Build a Customer Acquisition System"]'::jsonb, 'Customer Acquisition System', 'A documented sales motion covering your ideal customer, lead sources, qualification, funnel stages, outreach, discovery, proposal, closing and retention.', '2026-09-25T00:00:00.000Z'::timestamptz, true),
    ('c-finance', 'startup-finance-essentials', 'Startup Finance Essentials', 'Use financial fundamentals to price clearly, manage cash and make funding decisions with your eyes open.', 'Startup finance is not an accounting exercise reserved for later. It is how a founder understands the economic choices behind pricing, costs, cash, growth and funding. This course builds the working model you need to make those choices responsibly.', 'fund', 'm-padhang', 'Beginner', 'fund', NULL, 4.9, 0, '["Understand revenue, cost, margin and break-even","Build a practical cash-flow and forecast model","Compare funding paths","Complete a 12-Month Financial Model"]'::jsonb, '12-Month Financial Model', 'A twelve-month model with revenue assumptions, costs, gross margin, break-even, cash flow, scenarios, funding needs and investor-readiness notes.', '2026-09-26T00:00:00.000Z'::timestamptz, true),
    ('c-launch', 'launch-your-startup', 'Launch Your Startup', 'Plan a focused launch that earns early customers, captures feedback and creates a repeatable next step.', 'A launch is not a single announcement. It is a coordinated period of preparation, offer-making, customer contact, delivery and learning. This course gives founders a launch plan that turns attention into evidence instead of noise.', 'grow', 'm-mei', 'Beginner', 'peach', NULL, 4.9, 0, '["Prepare a launch-ready offer and assets","Build a focused launch strategy","Reach and learn from early customers","Complete a measurable Launch Plan"]'::jsonb, 'Launch Plan', 'A complete pre-launch, launch-week and post-launch plan with offer, audience, assets, customer actions, feedback system and performance measures.', '2026-09-27T00:00:00.000Z'::timestamptz, true),
    ('c-growth', 'growth-and-scale', 'Growth & Scale', 'Build durable growth through customer value, disciplined metrics, systems and responsible expansion.', 'Growth is not simply more customers. It is the ability to create, deliver and retain value at a larger scale without breaking the economics, team or customer experience that made the business work. This course helps founders choose growth deliberately.', 'grow', 'm-bayu', 'Intermediate', 'grow', NULL, 4.9, 0, '["Define sustainable growth and its metrics","Improve retention and referral loops","Use automation and AI responsibly","Complete a practical Growth Strategy"]'::jsonb, 'Growth Strategy', 'A growth strategy covering your growth goal, metrics, retention, referrals, automation, operating capacity, team needs, systems and guardrails.', '2026-09-28T00:00:00.000Z'::timestamptz, true)
  ) as v(id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, final_project_title, final_project_description, published_at, published)
  on conflict (organization_id, id) do update set
    slug = excluded.slug, title = excluded.title, blurb = excluded.blurb, description = excluded.description,
    category_id = excluded.category_id, mentor_id = excluded.mentor_id, level = excluded.level, theme = excluded.theme,
    cover_url = excluded.cover_url, rating = excluded.rating, learners = excluded.learners,
    outcomes = excluded.outcomes, final_project_title = excluded.final_project_title,
    final_project_description = excluded.final_project_description, published_at = excluded.published_at, published = excluded.published;

  insert into cs_modules (organization_id, id, course_id, title, sort)
  select p_org, v.* from (values
    ('c-opportunity-m-1', 'c-opportunity', 'Find the problem worth solving', 0),
    ('c-opportunity-m-2', 'c-opportunity', 'Frame and assess the opportunity', 1),
    ('c-opportunity-m-final', 'c-opportunity', 'Build your Opportunity Brief', 2),
    ('c-market-m-1', 'c-market', 'Understand the market', 0),
    ('c-market-m-2', 'c-market', 'Learn from customers', 1),
    ('c-market-m-3', 'c-market', 'Make an evidence-led decision', 2),
    ('c-market-m-final', 'c-market', 'Build your Market Validation Report', 3),
    ('c-business-model-m-1', 'c-business-model', 'Create and deliver value', 0),
    ('c-business-model-m-2', 'c-business-model', 'Reach and retain customers', 1),
    ('c-business-model-m-3', 'c-business-model', 'Make the economics work', 2),
    ('c-business-model-m-final', 'c-business-model', 'Build your Business Model Canvas', 3),
    ('c-brand-m-1', 'c-brand', 'Define the foundation', 0),
    ('c-brand-m-2', 'c-brand', 'Make the brand human', 1),
    ('c-brand-m-3', 'c-brand', 'Express and protect the difference', 2),
    ('c-brand-m-final', 'c-brand', 'Build your Brand Strategy Document', 3),
    ('c-mvp-m-1', 'c-mvp', 'Focus the first version', 0),
    ('c-mvp-m-2', 'c-mvp', 'Design the learning loop', 1),
    ('c-mvp-m-3', 'c-mvp', 'Test and improve', 2),
    ('c-mvp-m-final', 'c-mvp', 'Build your MVP Blueprint', 3),
    ('c-marketing-m-1', 'c-marketing', 'Build the go-to-market foundation', 0),
    ('c-marketing-m-2', 'c-marketing', 'Choose and run channels', 1),
    ('c-marketing-m-3', 'c-marketing', 'Launch campaigns and learn', 2),
    ('c-marketing-m-final', 'c-marketing', 'Build your 90-Day Marketing Plan', 3),
    ('c-sales-m-1', 'c-sales', 'Create qualified conversations', 0),
    ('c-sales-m-2', 'c-sales', 'Run the sales process', 1),
    ('c-sales-m-3', 'c-sales', 'Close and retain', 2),
    ('c-sales-m-final', 'c-sales', 'Build your Customer Acquisition System', 3),
    ('c-finance-m-1', 'c-finance', 'Understand the economics', 0),
    ('c-finance-m-2', 'c-finance', 'Price and plan cash', 1),
    ('c-finance-m-3', 'c-finance', 'Fund responsibly', 2),
    ('c-finance-m-final', 'c-finance', 'Build your 12-Month Financial Model', 3),
    ('c-launch-m-1', 'c-launch', 'Prepare for launch', 0),
    ('c-launch-m-2', 'c-launch', 'Reach early customers', 1),
    ('c-launch-m-3', 'c-launch', 'Learn and improve', 2),
    ('c-launch-m-final', 'c-launch', 'Build your Launch Plan', 3),
    ('c-growth-m-1', 'c-growth', 'Grow what works', 0),
    ('c-growth-m-2', 'c-growth', 'Use leverage responsibly', 1),
    ('c-growth-m-3', 'c-growth', 'Build systems that can scale', 2),
    ('c-growth-m-final', 'c-growth', 'Build your Growth Strategy', 3)
  ) as v(id, course_id, title, sort)
  on conflict (organization_id, id) do update set course_id = excluded.course_id, title = excluded.title, sort = excluded.sort;

  insert into cs_lessons (organization_id, id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, revision, sort)
  select p_org, v.* from (values
    ('c-opportunity-l-1', 'c-opportunity', 'c-opportunity-m-1', 'What Makes a Business Opportunity?', 'article', 420, NULL, NULL, '', 'Distinguish an opportunity from an interesting concept.

An opportunity connects a specific customer problem to a feasible way of creating and capturing value. Ideas become opportunities only when the problem, customer, timing and economics can all withstand scrutiny.

Apply it now: Write your idea in one sentence, then rewrite it as: A specific customer struggles with a specific problem because...', '', 0),
    ('c-opportunity-l-2', 'c-opportunity', 'c-opportunity-m-1', 'Ideas vs Problems', 'article', 420, NULL, NULL, '', 'Start with an existing struggle rather than a preferred solution.

Ideas describe what you want to build; problems describe what another person is already trying to solve. Starting with the problem protects you from building a polished answer to a question nobody asked.

Apply it now: List three moments when your intended customer currently loses time, money, certainty or status. Do not mention your product.', '', 1),
    ('c-opportunity-l-3', 'c-opportunity', 'c-opportunity-m-1', 'Identifying Real Customer Problems', 'article', 420, NULL, NULL, '', 'Recognise evidence that a problem is real and active.

Real problems leave traces: workarounds, repeated complaints, budget, delays, risk or emotional friction. Interest in a future solution is weak evidence; past behaviour and present cost are stronger.

Apply it now: Collect five verbatim examples of what people do today to handle the problem and what that workaround costs.', '', 2),
    ('c-opportunity-l-4', 'c-opportunity', 'c-opportunity-m-1', 'Understanding Pain Points', 'article', 420, NULL, NULL, '', 'Describe the functional, financial and emotional cost of a problem.

A pain point is more than an inconvenience. Identify what the customer cannot achieve, what it costs them, who feels the consequence, and what happens if nothing changes.

Apply it now: Complete a pain statement: When ___ tries to ___, they struggle because ___. This costs ___ and leaves them feeling ___.', '', 3),
    ('c-opportunity-l-5', 'c-opportunity', 'c-opportunity-m-2', 'Opportunity Mapping', 'article', 420, NULL, NULL, '', 'Map the ecosystem around a customer problem.

Opportunity mapping connects the user, buyer, influencer, current alternative, constraint and trigger. It prevents a founder from interviewing one friendly person and mistaking them for the whole market.

Apply it now: Draw your map. Mark who experiences the problem, who approves a purchase, who pays, and who could block adoption.', '', 4),
    ('c-opportunity-l-6', 'c-opportunity', 'c-opportunity-m-2', 'Market Need', 'article', 420, NULL, NULL, '', 'Estimate whether the need is frequent and urgent enough to matter.

Need is not measured by how much people agree with you. Look for frequency, severity, urgency, willingness to switch and a reachable group of customers with the same underlying job to be done.

Apply it now: Score the need from one to five for frequency, cost, urgency and willingness to change. Explain every score with evidence or mark it as a guess.', '', 5),
    ('c-opportunity-l-7', 'c-opportunity', 'c-opportunity-m-2', 'Problem-Solution Fit', 'article', 420, NULL, NULL, '', 'Form a clear hypothesis about how your approach reduces the customer''s pain.

Problem-solution fit is a hypothesis, not a launch milestone. State the customer, problem, promised outcome and the mechanism you believe creates that outcome; then find the cheapest way to challenge it.

Apply it now: Write one testable statement: We believe ___ will use ___ to achieve ___ because ___. Name the smallest test you can run this week.', '', 6),
    ('c-opportunity-l-8', 'c-opportunity', 'c-opportunity-m-2', 'Opportunity Assessment', 'article', 420, NULL, NULL, '', 'Decide whether to pursue, reshape or pause an opportunity.

Assess opportunities across customer pain, market access, founder fit, feasibility, economics and defensibility. A weak score is useful when it tells you what to test next; it is dangerous only when it is hidden.

Apply it now: Create your Opportunity Brief and mark each major claim as guess, evidence or proven. Choose one claim to test before moving forward.', '', 7),
    ('c-opportunity-final', 'c-opportunity', 'c-opportunity-m-final', 'Opportunity Brief: course assessment', 'quiz', 600, NULL, NULL, '', 'A concise case for the opportunity: the customer, problem, existing alternatives, evidence, assumptions and immediate validation plan.

Complete the five-question check, then use the project template to finish and share your own Opportunity Brief.', '', 8),
    ('c-market-l-1', 'c-market', 'c-market-m-1', 'Understanding Your Market', 'article', 420, NULL, NULL, '', 'Define a market around a customer job and context.

A market is not everybody who could possibly use a product. Define it by the customer, the job they are trying to do, the setting in which it happens and the alternatives they consider.

Apply it now: Write a market definition that begins with a customer type and a job, not an industry label.', '', 0),
    ('c-market-l-2', 'c-market', 'c-market-m-1', 'TAM, SAM & SOM', 'article', 420, NULL, NULL, '', 'Use market sizing to make choices rather than decorate a deck.

TAM is conceivable demand, SAM is what your offer can serve, and SOM is the share you can credibly reach first. Every number needs an assumption about price, customer count, geography and adoption.

Apply it now: Show your TAM, SAM and first-year SOM calculation. Put a source or assumption beside every number.', '', 1),
    ('c-market-l-3', 'c-market', 'c-market-m-1', 'Identifying Market Segments', 'article', 420, NULL, NULL, '', 'Choose an initial segment that is specific enough to learn from.

Segments differ in problem intensity, buying process, ability to pay and reachability. A narrow early segment is a way to learn quickly enough to earn expansion.

Apply it now: List three possible segments. Rank them by pain, access, urgency and ability to pay. Select one beachhead.', '', 2),
    ('c-market-l-4', 'c-market', 'c-market-m-1', 'Competitor Research', 'article', 420, NULL, NULL, '', 'Research direct competitors, substitutes and do-nothing behaviour.

Customers compare you with more than businesses with similar technology. They compare you with spreadsheets, agencies, a staff member, delay and doing nothing.

Apply it now: Create a table of five alternatives with their promise, price, strengths, weaknesses and customer.', '', 3),
    ('c-market-l-5', 'c-market', 'c-market-m-2', 'Competitor Positioning', 'article', 420, NULL, NULL, '', 'Find the open position an early customer can understand.

Positioning chooses who you serve, the category you belong to, the outcome you promise and the alternative you replace. It should make the right customer say this is for me.

Apply it now: Write: For ___ who need ___, we are the ___ that ___ unlike ___.', '', 4),
    ('c-market-l-6', 'c-market', 'c-market-m-2', 'Customer Research', 'article', 420, NULL, NULL, '', 'Plan research around decisions you need to make.

Research is useful when it reduces a decision risk. State what you need to learn, who can answer from experience and what answer would change your next move.

Apply it now: Create three decision questions, the people to speak to and the evidence that would change your mind.', '', 5),
    ('c-market-l-7', 'c-market', 'c-market-m-2', 'Surveys & Interviews', 'article', 420, NULL, NULL, '', 'Use interviews for stories and surveys for patterns.

Interviews uncover context and language; surveys test a pattern once you know what to ask. Avoid leading questions and future promises. Ask for a recent event, steps taken and the cost of the current approach.

Apply it now: Write five interview questions in the past tense and recruit five people from your beachhead segment.', '', 6),
    ('c-market-l-8', 'c-market', 'c-market-m-2', 'Testing Demand', 'article', 420, NULL, NULL, '', 'Run a small demand test before building the full product.

Demand tests ask for a meaningful action: a deposit, booked call, pilot commitment, email reply or time configuring a prototype. Select the smallest action that exposes the assumption you most need to know.

Apply it now: Define the audience, offer, action, success threshold and review date for one demand test.', '', 7),
    ('c-market-l-9', 'c-market', 'c-market-m-3', 'Validating Assumptions', 'article', 420, NULL, NULL, '', 'Track assumptions explicitly and update confidence with evidence.

Every early plan rests on assumptions about customer, problem, value, willingness to pay and reachability. An assumption log turns uncertainty into a managed work queue.

Apply it now: Create an assumption log with ten important claims. Mark the riskiest and schedule its test.', '', 8),
    ('c-market-l-10', 'c-market', 'c-market-m-3', 'Interpreting Research', 'article', 420, NULL, NULL, '', 'Turn research findings into a decision, not a scrapbook.

Evidence is not a vote count. Look for repeated patterns, counterexamples, source quality and what changed behaviour. State what the evidence supports, what it does not support and which decision follows.

Apply it now: Finish your Market Validation Report with three findings, two open risks and one decision: continue, reshape or pause.', '', 9),
    ('c-market-final', 'c-market', 'c-market-m-final', 'Market Validation Report: course assessment', 'quiz', 600, NULL, NULL, '', 'A documented view of your market, segment, competitors, customer evidence, demand tests and the assumptions that still require validation.

Complete the five-question check, then use the project template to finish and share your own Market Validation Report.', '', 10),
    ('c-business-model-l-1', 'c-business-model', 'c-business-model-m-1', 'What Is a Business Model?', 'article', 420, NULL, NULL, '', 'Explain the model as the system that creates, delivers and captures value.

A business model describes connected choices that make a company work. It is not a mission statement or feature list; it shows how a customer benefit becomes a repeatable, viable business.

Apply it now: Describe your model in four sentences: customer, value, delivery and how money returns.', '', 0),
    ('c-business-model-l-2', 'c-business-model', 'c-business-model-m-1', 'Customer Segments', 'article', 420, NULL, NULL, '', 'Separate users, buyers and stakeholders into useful segments.

A segment groups people who share a meaningful problem, context and buying logic. When user and buyer differ, design for both rather than assuming one message works for everyone.

Apply it now: Name your primary user, economic buyer, influencer and gatekeeper. Write what each needs to believe.', '', 1),
    ('c-business-model-l-3', 'c-business-model', 'c-business-model-m-1', 'Value Proposition', 'article', 420, NULL, NULL, '', 'State the outcome your chosen customer receives and why it matters.

A value proposition links a painful job to a clear, credible improvement. It should compare directly with the current alternative and name an outcome the customer cares about.

Apply it now: Write: We help ___ achieve ___ without ___. Add the evidence needed for the claim to be believable.', '', 2),
    ('c-business-model-l-4', 'c-business-model', 'c-business-model-m-1', 'Revenue Models', 'article', 420, NULL, NULL, '', 'Choose a revenue mechanism that matches how value is delivered.

Subscription, transaction, usage, licence, service and marketplace models each change cash flow, sales motion and incentives. Pick a mechanism customers understand and that funds profitable delivery.

Apply it now: Compare two revenue models. State when the customer pays, what triggers payment and what could make economics fail.', '', 3),
    ('c-business-model-l-5', 'c-business-model', 'c-business-model-m-2', 'Pricing', 'article', 420, NULL, NULL, '', 'Set a starting price from value, alternatives and delivery economics.

Price signals who the product is for and funds the experience you promise. Start with customer value and alternatives, then check the margin, sales effort and support requirements.

Apply it now: Choose a test price, what it includes and the trade you will make if a customer asks for a discount.', '', 4),
    ('c-business-model-l-6', 'c-business-model', 'c-business-model-m-2', 'Distribution Channels', 'article', 420, NULL, NULL, '', 'Select the route by which a customer discovers, evaluates and buys.

Channels belong inside the model, not in a campaign after the product is ready. A channel should be trusted by your segment, repeatable and affordable relative to the value created.

Apply it now: Map awareness to paid use. Mark the highest-friction step and one experiment to reduce it.', '', 5),
    ('c-business-model-l-7', 'c-business-model', 'c-business-model-m-2', 'Customer Relationships', 'article', 420, NULL, NULL, '', 'Decide how customers will be acquired, supported and kept.

Relationship design ranges from high-touch advisory work to self-service adoption. Choose it from customer complexity, willingness to pay and support cost rather than a preference for automation.

Apply it now: Define the relationship at acquisition, onboarding, first value, support and renewal.', '', 6),
    ('c-business-model-l-8', 'c-business-model', 'c-business-model-m-2', 'Key Activities', 'article', 420, NULL, NULL, '', 'Identify the capabilities that must work for your model to deliver value.

Key activities are not every item on a to-do list. They create the value proposition, reach the segment or keep the economics intact.

Apply it now: List three key activities. For each, state what failure looks like and how you will know early.', '', 7),
    ('c-business-model-l-9', 'c-business-model', 'c-business-model-m-3', 'Key Resources', 'article', 420, NULL, NULL, '', 'Name the assets and capabilities without which the model cannot operate.

Resources can be people, data, technology, capital, intellectual property, trust or access. The important question is whether you control enough of what the model depends on.

Apply it now: List five resources. Mark which you own, rent, borrow or still need to obtain.', '', 8),
    ('c-business-model-l-10', 'c-business-model', 'c-business-model-m-3', 'Key Partners', 'article', 420, NULL, NULL, '', 'Choose partners that strengthen the model without becoming a hidden dependency.

Partners can improve reach, capability or economics, but every partner adds risk. Decide what they contribute, what motivates them and what happens if their terms change.

Apply it now: For each key partner, write the value exchanged, dependency risk and an alternative.', '', 9),
    ('c-business-model-l-11', 'c-business-model', 'c-business-model-m-3', 'Cost Structure', 'article', 420, NULL, NULL, '', 'Understand the fixed, variable and step costs behind the promise.

Cost structure reveals whether growth improves or worsens the business. Separate costs that rise per customer from those that remain fixed until a capacity threshold.

Apply it now: List your ten biggest costs. Label each fixed, variable or step-fixed and identify the likely surprise.', '', 10),
    ('c-business-model-l-12', 'c-business-model', 'c-business-model-m-3', 'Building the Business Model Canvas', 'article', 420, NULL, NULL, '', 'Combine the nine building blocks into a coherent, testable whole.

A canvas is useful only when its blocks agree. Read it as a story: this customer receives this value through this channel, pays this way, and the business can deliver it with these activities and costs.

Apply it now: Complete your canvas. Circle three blocks built on the weakest evidence and turn each into an experiment.', '', 11),
    ('c-business-model-final', 'c-business-model', 'c-business-model-m-final', 'Business Model Canvas: course assessment', 'quiz', 600, NULL, NULL, '', 'A complete, testable view of customer segments, value proposition, channels, relationships, revenues, resources, activities, partners and cost structure.

Complete the five-question check, then use the project template to finish and share your own Business Model Canvas.', '', 12),
    ('c-brand-l-1', 'c-brand', 'c-brand-m-1', 'Brand vs Business', 'article', 420, NULL, NULL, '', 'Apply brand vs business to make a clear decision for your startup.

The business is what you do; the brand is the pattern of meaning, expectation and memory that makes people interpret what you do. A strong brand makes a useful business easier to recognise and choose.

Apply it now: List three things your business does and three feelings or expectations customers should attach to it.', '', 0),
    ('c-brand-l-2', 'c-brand', 'c-brand-m-1', 'Brand Purpose', 'article', 420, NULL, NULL, '', 'Apply brand purpose to make a clear decision for your startup.

Purpose explains the change your business exists to create beyond making a sale. It gives choices a direction, but it must connect to a real customer outcome rather than a broad slogan.

Apply it now: Write one purpose statement that names the customer change you want to make.', '', 1),
    ('c-brand-l-3', 'c-brand', 'c-brand-m-1', 'Brand Positioning', 'article', 420, NULL, NULL, '', 'Apply brand positioning to make a clear decision for your startup.

Positioning chooses the place you want to occupy in a customer''s mind relative to an alternative. It is a decision about audience, category, promise and proof.

Apply it now: Write a positioning statement and name the alternative you want to replace.', '', 2),
    ('c-brand-l-4', 'c-brand', 'c-brand-m-1', 'Target Audience', 'article', 420, NULL, NULL, '', 'Apply target audience to make a clear decision for your startup.

A target audience is a priority group, not a demographic bucket. Define its context, unmet need, trigger, buying power and where it already pays attention.

Apply it now: Describe your priority audience in five observable characteristics.', '', 3),
    ('c-brand-l-5', 'c-brand', 'c-brand-m-2', 'Customer Persona', 'article', 420, NULL, NULL, '', 'Apply customer persona to make a clear decision for your startup.

A persona turns a segment into a decision tool by showing goals, frustrations, language, constraints and buying behaviour. It should be based on research, not a fictional biography.

Apply it now: Create a one-page persona using interview evidence and flag every unsupported assumption.', '', 4),
    ('c-brand-l-6', 'c-brand', 'c-brand-m-2', 'Brand Personality', 'article', 420, NULL, NULL, '', 'Apply brand personality to make a clear decision for your startup.

Personality gives the brand a consistent manner. Choose a small number of traits and their opposites so teams know how the brand should and should not behave.

Apply it now: Choose three personality traits and three traits you will deliberately avoid.', '', 5),
    ('c-brand-l-7', 'c-brand', 'c-brand-m-2', 'Brand Voice', 'article', 420, NULL, NULL, '', 'Apply brand voice to make a clear decision for your startup.

Voice is how personality sounds in words: vocabulary, rhythm, point of view and level of formality. It should help a customer understand and act, not merely sound clever.

Apply it now: Write a voice guide with five do rules, five do-not rules and one sample message.', '', 6),
    ('c-brand-l-8', 'c-brand', 'c-brand-m-2', 'Naming', 'article', 420, NULL, NULL, '', 'Apply naming to make a clear decision for your startup.

A good name is memorable, pronounceable, distinctive and appropriate for the category and future direction. Test it with real people, domains and local language before committing.

Apply it now: Generate ten names, score them for clarity and distinctiveness, then test your strongest three.', '', 7),
    ('c-brand-l-9', 'c-brand', 'c-brand-m-3', 'Visual Identity', 'article', 420, NULL, NULL, '', 'Apply visual identity to make a clear decision for your startup.

Visual identity translates the strategy into repeatable signals such as colour, typography, imagery and layout. It should support recognition and accessibility, not conceal a weak position.

Apply it now: Create a visual-direction mood board with three principles and three references to avoid.', '', 8),
    ('c-brand-l-10', 'c-brand', 'c-brand-m-3', 'Brand Story', 'article', 420, NULL, NULL, '', 'Apply brand story to make a clear decision for your startup.

A brand story gives customers a meaningful before, tension and after. The customer is the hero; the business is the guide that helps them move forward.

Apply it now: Write a 150-word story that starts with the customer''s world before your business exists.', '', 9),
    ('c-brand-l-11', 'c-brand', 'c-brand-m-3', 'Brand Differentiation', 'article', 420, NULL, NULL, '', 'Apply brand differentiation to make a clear decision for your startup.

Differentiation is valuable when it is relevant, credible and difficult to copy. A claim becomes a position only when customers can see proof in the product and experience.

Apply it now: List your three proposed differentiators and attach a proof point or an experiment to each.', '', 10),
    ('c-brand-final', 'c-brand', 'c-brand-m-final', 'Brand Strategy Document: course assessment', 'quiz', 600, NULL, NULL, '', 'A clear foundation for how your business is positioned, expressed and differentiated for its first customers.

Complete the five-question check, then use the project template to finish and share your own Brand Strategy Document.', '', 11),
    ('c-mvp-l-1', 'c-mvp', 'c-mvp-m-1', 'What Is an MVP?', 'article', 420, NULL, NULL, '', 'Apply what is an mvp? to make a clear decision for your startup.

An MVP is the smallest credible product or service that delivers a core outcome and produces evidence. Its job is learning, not impressing people with a reduced feature list.

Apply it now: State the smallest outcome a customer must achieve for your MVP to be useful.', '', 0),
    ('c-mvp-l-2', 'c-mvp', 'c-mvp-m-1', 'MVP vs Full Product', 'article', 420, NULL, NULL, '', 'Apply mvp vs full product to make a clear decision for your startup.

A full product solves many adjacent needs reliably at scale; an MVP proves the most important customer and value assumptions. Confusing the two leads to overbuilding before learning.

Apply it now: Create a two-column list: necessary to test now and valuable only after evidence.', '', 1),
    ('c-mvp-l-3', 'c-mvp', 'c-mvp-m-1', 'Defining the Core User', 'article', 420, NULL, NULL, '', 'Apply defining the core user to make a clear decision for your startup.

Choose one early user whose context and pain are specific enough to guide product decisions. Broad user definitions produce conflicting features and weak onboarding.

Apply it now: Write the core user''s role, trigger, current workaround and success moment.', '', 2),
    ('c-mvp-l-4', 'c-mvp', 'c-mvp-m-1', 'Defining the Core Problem', 'article', 420, NULL, NULL, '', 'Apply defining the core problem to make a clear decision for your startup.

A core problem is the high-value obstacle in one user journey, not every inconvenience around it. Identify the moment where failure has a costly consequence.

Apply it now: Map the user''s current steps and circle the one failure your MVP will address first.', '', 3),
    ('c-mvp-l-5', 'c-mvp', 'c-mvp-m-2', 'Feature Prioritisation', 'article', 420, NULL, NULL, '', 'Apply feature prioritisation to make a clear decision for your startup.

Prioritise features by their contribution to the core outcome, evidence risk, effort and dependency. A feature that does not help a user reach first value belongs in the not-now list.

Apply it now: Score each proposed feature as must-have, supporting or not-now, then remove one apparent must-have.', '', 4),
    ('c-mvp-l-6', 'c-mvp', 'c-mvp-m-2', 'User Journey', 'article', 420, NULL, NULL, '', 'Apply user journey to make a clear decision for your startup.

A user journey shows how a person moves from trigger to first value and repeat use. It reveals friction that feature lists hide, especially before and after the main task.

Apply it now: Sketch the happy path in five to seven steps and label the likely drop-off at each step.', '', 5),
    ('c-mvp-l-7', 'c-mvp', 'c-mvp-m-2', 'Product Requirements', 'article', 420, NULL, NULL, '', 'Apply product requirements to make a clear decision for your startup.

Requirements explain the user outcome, rules, constraints and success criteria without prematurely prescribing every technical implementation. Good requirements make a testable promise.

Apply it now: Write a requirement for one workflow with user, need, acceptance criteria and a measure of success.', '', 6),
    ('c-mvp-l-8', 'c-mvp', 'c-mvp-m-2', 'No-Code MVPs', 'article', 420, NULL, NULL, '', 'Apply no-code mvps to make a clear decision for your startup.

No-code tools, concierge services and manual back-office processes can test demand and workflow before custom software. The customer should experience the value even if the system behind it is temporary.

Apply it now: Choose a no-code or manual route to deliver your core outcome within two weeks.', '', 7),
    ('c-mvp-l-9', 'c-mvp', 'c-mvp-m-3', 'AI-Assisted MVP Development', 'article', 420, NULL, NULL, '', 'Apply ai-assisted mvp development to make a clear decision for your startup.

AI can accelerate prototypes, copy, research synthesis and routine implementation, but it does not validate the underlying customer problem. Keep a human review and test the result with customers.

Apply it now: Choose one AI-assisted task and define the quality check a human must perform before use.', '', 8),
    ('c-mvp-l-10', 'c-mvp', 'c-mvp-m-3', 'Testing Your MVP', 'article', 420, NULL, NULL, '', 'Apply testing your mvp to make a clear decision for your startup.

An MVP test needs a defined audience, task, observation method and threshold for what counts as evidence. Watch behaviour before asking for opinion.

Apply it now: Recruit five target users and write the task you will ask each person to complete.', '', 9),
    ('c-mvp-l-11', 'c-mvp', 'c-mvp-m-3', 'Gathering Feedback', 'article', 420, NULL, NULL, '', 'Apply gathering feedback to make a clear decision for your startup.

Useful feedback captures what the customer tried to do, where they hesitated, what they expected and what they did next. Requests for features are clues, not instructions.

Apply it now: Create a feedback script with observation notes, three follow-ups and a post-test debrief.', '', 10),
    ('c-mvp-l-12', 'c-mvp', 'c-mvp-m-3', 'Iterating', 'article', 420, NULL, NULL, '', 'Apply iterating to make a clear decision for your startup.

Iteration is a decision to keep, change or remove something based on evidence. Change one important variable at a time where possible, so the next result teaches you something.

Apply it now: Choose the one change you will make after your test and the evidence that would justify a different change.', '', 11),
    ('c-mvp-final', 'c-mvp', 'c-mvp-m-final', 'MVP Blueprint: course assessment', 'quiz', 600, NULL, NULL, '', 'A focused plan for your earliest user, core problem, workflow, must-have features, prototype approach, test and feedback loop.

Complete the five-question check, then use the project template to finish and share your own MVP Blueprint.', '', 12),
    ('c-marketing-l-1', 'c-marketing', 'c-marketing-m-1', 'Understanding Go-To-Market', 'article', 420, NULL, NULL, '', 'Apply understanding go-to-market to make a clear decision for your startup.

Go-to-market is the coordinated plan for how a defined audience discovers, understands, buys and receives value from an offer. It aligns product, sales and marketing around the same first customer.

Apply it now: Describe your route from first awareness to first value in one page.', '', 0),
    ('c-marketing-l-2', 'c-marketing', 'c-marketing-m-1', 'Target Audience', 'article', 420, NULL, NULL, '', 'Apply target audience to make a clear decision for your startup.

Marketing becomes efficient when it starts with a priority audience, their trigger, current behaviour and trusted sources of information. Reachability matters as much as size.

Apply it now: Define the audience for your first ninety days and list where they already pay attention.', '', 1),
    ('c-marketing-l-3', 'c-marketing', 'c-marketing-m-1', 'Positioning', 'article', 420, NULL, NULL, '', 'Apply positioning to make a clear decision for your startup.

Marketing positioning repeats the business choice in language a buyer can use. It should make the product''s category, promise and contrast with alternatives immediately clear.

Apply it now: Write a homepage headline, subheading and comparison line for your chosen position.', '', 2),
    ('c-marketing-l-4', 'c-marketing', 'c-marketing-m-1', 'Messaging', 'article', 420, NULL, NULL, '', 'Apply messaging to make a clear decision for your startup.

Messaging translates positioning into claims, proof, objections and calls to action for a specific stage of the journey. Good messaging is specific enough to be tested.

Apply it now: Create three message pillars, the proof behind each and one customer objection each must answer.', '', 3),
    ('c-marketing-l-5', 'c-marketing', 'c-marketing-m-2', 'Marketing Channels', 'article', 420, NULL, NULL, '', 'Apply marketing channels to make a clear decision for your startup.

Channels should be selected for audience fit, intent, speed of learning, cost and repeatability. Start with a few channel experiments rather than spreading effort across every platform.

Apply it now: Choose three channels to test and set one success metric for each.', '', 4),
    ('c-marketing-l-6', 'c-marketing', 'c-marketing-m-2', 'Content Strategy', 'article', 420, NULL, NULL, '', 'Apply content strategy to make a clear decision for your startup.

Content earns attention by helping an audience make progress before it asks for a purchase. Anchor content in recurring customer questions, proof and useful points of view.

Apply it now: Plan four pieces of content that answer a real customer question at different buying stages.', '', 5),
    ('c-marketing-l-7', 'c-marketing', 'c-marketing-m-2', 'Social Media', 'article', 420, NULL, NULL, '', 'Apply social media to make a clear decision for your startup.

Social media works when the format, platform and point of view match an existing audience behaviour. It is not a substitute for a clear offer or a way to avoid direct customer conversations.

Apply it now: Choose one platform, one audience behaviour and a four-week posting experiment.', '', 6),
    ('c-marketing-l-8', 'c-marketing', 'c-marketing-m-2', 'Email Marketing', 'article', 420, NULL, NULL, '', 'Apply email marketing to make a clear decision for your startup.

Email is most useful when it follows a permission-based relationship with a relevant message and one clear next action. Segment by customer context, not just by list size.

Apply it now: Draft a three-email sequence for a new lead: problem, proof and invitation.', '', 7),
    ('c-marketing-l-9', 'c-marketing', 'c-marketing-m-3', 'Paid Advertising', 'article', 420, NULL, NULL, '', 'Apply paid advertising to make a clear decision for your startup.

Paid advertising can accelerate a message that already has some evidence, but it will amplify an unclear offer just as efficiently. Begin with small controlled tests and measure qualified action, not impressions.

Apply it now: Write one paid-test hypothesis with audience, message, spend cap and qualified-lead threshold.', '', 8),
    ('c-marketing-l-10', 'c-marketing', 'c-marketing-m-3', 'Partnerships', 'article', 420, NULL, NULL, '', 'Apply partnerships to make a clear decision for your startup.

Partnerships work when both sides gain a clear outcome and reach an audience neither could serve as effectively alone. Treat them as a joint offer, not a request for free promotion.

Apply it now: Identify three potential partners and write the value exchange for each.', '', 9),
    ('c-marketing-l-11', 'c-marketing', 'c-marketing-m-3', 'Launch Campaign', 'article', 420, NULL, NULL, '', 'Apply launch campaign to make a clear decision for your startup.

A campaign coordinates one audience, offer, message, timeline and call to action. It becomes manageable when every asset serves the same promise instead of announcing many things at once.

Apply it now: Build a two-week campaign calendar with pre-launch, launch-day and follow-up actions.', '', 10),
    ('c-marketing-l-12', 'c-marketing', 'c-marketing-m-3', 'Measuring Marketing Performance', 'article', 420, NULL, NULL, '', 'Apply measuring marketing performance to make a clear decision for your startup.

Measure each stage from attention to qualified action to revenue. A metric is useful only if its movement leads to a decision about audience, message, offer or channel.

Apply it now: Choose five metrics for your plan and state the decision each one will inform.', '', 11),
    ('c-marketing-final', 'c-marketing', 'c-marketing-m-final', '90-Day Marketing Plan: course assessment', 'quiz', 600, NULL, NULL, '', 'A ninety-day plan with audience, positioning, message, channel experiments, content, campaign calendar, budget assumptions and review metrics.

Complete the five-question check, then use the project template to finish and share your own 90-Day Marketing Plan.', '', 12),
    ('c-sales-l-1', 'c-sales', 'c-sales-m-1', 'Understanding Sales', 'article', 420, NULL, NULL, '', 'Apply understanding sales to make a clear decision for your startup.

Sales is a mutual decision process: diagnose whether a real problem exists, establish whether your offer can help and agree on a fair next step. It works best when it is built on evidence rather than pressure.

Apply it now: Write the customer decision your sales conversation should help them make.', '', 0),
    ('c-sales-l-2', 'c-sales', 'c-sales-m-1', 'Lead Generation', 'article', 420, NULL, NULL, '', 'Apply lead generation to make a clear decision for your startup.

Lead generation creates a focused list of people or organisations likely to have the problem you solve. Quality comes from segment fit and a credible reason to contact them, not from the size of a spreadsheet.

Apply it now: Choose two lead sources and create a first list of twenty relevant prospects.', '', 1),
    ('c-sales-l-3', 'c-sales', 'c-sales-m-1', 'Lead Qualification', 'article', 420, NULL, NULL, '', 'Apply lead qualification to make a clear decision for your startup.

Qualification protects your time by checking pain, fit, urgency, authority and a workable buying path. It is respectful to disqualify a poor fit early rather than force a long sales process.

Apply it now: Set five qualification questions and define the answer that means you should not proceed.', '', 2),
    ('c-sales-l-4', 'c-sales', 'c-sales-m-1', 'Sales Funnels', 'article', 420, NULL, NULL, '', 'Apply sales funnels to make a clear decision for your startup.

A funnel makes the sales process visible from lead to conversation, proposal, win and renewal. It helps you see where prospects stop moving and what activity is needed at the top to create outcomes at the bottom.

Apply it now: Draw your funnel stages and set one conversion measure for each.', '', 3),
    ('c-sales-l-5', 'c-sales', 'c-sales-m-2', 'Outreach', 'article', 420, NULL, NULL, '', 'Apply outreach to make a clear decision for your startup.

Effective outreach is short, relevant and based on a reason to believe the recipient has the problem. It earns a conversation by showing understanding, not by sending a product catalogue.

Apply it now: Write a three-step outreach sequence for one qualified segment.', '', 4),
    ('c-sales-l-6', 'c-sales', 'c-sales-m-2', 'Discovery Calls', 'article', 420, NULL, NULL, '', 'Apply discovery calls to make a clear decision for your startup.

Discovery asks about the customer''s past: what happened, what they tried, what it cost and who was affected. Past behaviour is stronger evidence than a promise about what they might buy.

Apply it now: Write six discovery questions that cannot be answered with a polite yes.', '', 5),
    ('c-sales-l-7', 'c-sales', 'c-sales-m-2', 'Presenting Your Solution', 'article', 420, NULL, NULL, '', 'Apply presenting your solution to make a clear decision for your startup.

A solution presentation should connect the customer''s stated problem to a focused outcome and relevant proof. Demonstrate the workflow that matters rather than touring every feature.

Apply it now: Create a ten-minute demo or presentation outline using the customer''s own language.', '', 6),
    ('c-sales-l-8', 'c-sales', 'c-sales-m-2', 'Handling Objections', 'article', 420, NULL, NULL, '', 'Apply handling objections to make a clear decision for your startup.

Objections are information about risk, value, timing or buying process. Clarify which one you are hearing before answering; discounting is rarely the first or best response.

Apply it now: List five likely objections, the question you will ask to understand each, and the proof you can offer.', '', 7),
    ('c-sales-l-9', 'c-sales', 'c-sales-m-3', 'Closing', 'article', 420, NULL, NULL, '', 'Apply closing to make a clear decision for your startup.

Closing is the act of agreeing a clear next commitment after value, fit and risk have been addressed. It should make the decision easy, specific and reversible enough for an early customer to trust.

Apply it now: Write the next-step ask for your current offer, including scope, price, start date and success measure.', '', 8),
    ('c-sales-l-10', 'c-sales', 'c-sales-m-3', 'Customer Retention', 'article', 420, NULL, NULL, '', 'Apply customer retention to make a clear decision for your startup.

Retention begins with the promise made in the sale and the first value delivered after it. Track adoption, outcomes, risks and renewal conversations before the contract is due.

Apply it now: Design a thirty-day onboarding and check-in plan for a new customer.', '', 9),
    ('c-sales-final', 'c-sales', 'c-sales-m-final', 'Customer Acquisition System: course assessment', 'quiz', 600, NULL, NULL, '', 'A documented sales motion covering your ideal customer, lead sources, qualification, funnel stages, outreach, discovery, proposal, closing and retention.

Complete the five-question check, then use the project template to finish and share your own Customer Acquisition System.', '', 10),
    ('c-finance-l-1', 'c-finance', 'c-finance-m-1', 'Understanding Startup Finance', 'article', 420, NULL, NULL, '', 'Apply understanding startup finance to make a clear decision for your startup.

Finance translates your operating choices into numbers you can compare. Founders need enough fluency to see the difference between revenue, profit, cash and the assumptions beneath each.

Apply it now: Write the three financial questions you need answered before committing to your next major decision.', '', 0),
    ('c-finance-l-2', 'c-finance', 'c-finance-m-1', 'Revenue', 'article', 420, NULL, NULL, '', 'Apply revenue to make a clear decision for your startup.

Revenue is money earned from delivering a product or service, measured with a clear rule for when it is recognised. Separate recurring, one-off, contracted and collected revenue so the picture is honest.

Apply it now: List your revenue streams and the trigger that creates each one.', '', 1),
    ('c-finance-l-3', 'c-finance', 'c-finance-m-1', 'Costs', 'article', 420, NULL, NULL, '', 'Apply costs to make a clear decision for your startup.

Costs include direct delivery costs, operating expenses and the working-capital effects that do not appear in a simple feature plan. Categorising them makes pricing and forecast decisions more realistic.

Apply it now: List ten costs and label each direct, operating, fixed, variable or step-fixed.', '', 2),
    ('c-finance-l-4', 'c-finance', 'c-finance-m-1', 'Gross Margin', 'article', 420, NULL, NULL, '', 'Apply gross margin to make a clear decision for your startup.

Gross margin is what remains after the direct cost of serving customers. It tells you whether each additional sale helps fund the business or creates more work without enough return.

Apply it now: Calculate a first gross-margin estimate for one customer or unit of service.', '', 3),
    ('c-finance-l-5', 'c-finance', 'c-finance-m-2', 'Pricing', 'article', 420, NULL, NULL, '', 'Apply pricing to make a clear decision for your startup.

Financial pricing checks whether a value-based price also supports delivery, sales effort, support and a sustainable margin. Price is a strategic choice, but it must survive the arithmetic.

Apply it now: Test three price points against your direct costs and expected customer volume.', '', 4),
    ('c-finance-l-6', 'c-finance', 'c-finance-m-2', 'Break-Even', 'article', 420, NULL, NULL, '', 'Apply break-even to make a clear decision for your startup.

Break-even identifies the sales volume at which contribution covers fixed costs. It is a planning tool, not a promise; test it against realistic conversion, capacity and cash timing.

Apply it now: Calculate your contribution per sale and the number of sales needed to cover monthly fixed costs.', '', 5),
    ('c-finance-l-7', 'c-finance', 'c-finance-m-2', 'Cash Flow', 'article', 420, NULL, NULL, '', 'Apply cash flow to make a clear decision for your startup.

Cash flow tracks when money actually enters and leaves the business. A profitable business can fail if customers pay late, inventory is bought early or debt payments arrive before cash does.

Apply it now: Create a thirteen-week cash view with opening cash, expected receipts, payments and closing cash.', '', 6),
    ('c-finance-l-8', 'c-finance', 'c-finance-m-2', 'Financial Forecasting', 'article', 420, NULL, NULL, '', 'Apply financial forecasting to make a clear decision for your startup.

Forecasting turns assumptions into scenarios so you can see the decision points before they become emergencies. Update it frequently and compare forecast with actual results to improve judgement.

Apply it now: Build base, upside and downside cases for the next twelve months.', '', 7),
    ('c-finance-l-9', 'c-finance', 'c-finance-m-3', 'Funding', 'article', 420, NULL, NULL, '', 'Apply funding to make a clear decision for your startup.

Funding is appropriate when it buys a specific path to evidence or growth that the business cannot finance from cash alone. Match the source and terms to the business model, asset life and risk.

Apply it now: Write what a funding round would buy, the milestone it must achieve and what happens if it takes twice as long.', '', 8),
    ('c-finance-l-10', 'c-finance', 'c-finance-m-3', 'Bootstrapping', 'article', 420, NULL, NULL, '', 'Apply bootstrapping to make a clear decision for your startup.

Bootstrapping uses customer revenue, founder resources and disciplined scope to fund progress. It preserves control but still requires an honest view of opportunity cost, runway and pace.

Apply it now: List three ways to reduce cash need without reducing the learning you must achieve.', '', 9),
    ('c-finance-l-11', 'c-finance', 'c-finance-m-3', 'Investor Readiness', 'article', 420, NULL, NULL, '', 'Apply investor readiness to make a clear decision for your startup.

Investors look for a coherent story supported by evidence: market, team, traction, economics, use of funds and risks. Readiness is not a polished deck without underlying answers.

Apply it now: Create an investor-readiness checklist and mark the evidence you can show today.', '', 10),
    ('c-finance-final', 'c-finance', 'c-finance-m-final', '12-Month Financial Model: course assessment', 'quiz', 600, NULL, NULL, '', 'A twelve-month model with revenue assumptions, costs, gross margin, break-even, cash flow, scenarios, funding needs and investor-readiness notes.

Complete the five-question check, then use the project template to finish and share your own 12-Month Financial Model.', '', 11),
    ('c-launch-l-1', 'c-launch', 'c-launch-m-1', 'Pre-Launch Planning', 'article', 420, NULL, NULL, '', 'Apply pre-launch planning to make a clear decision for your startup.

Pre-launch aligns the audience, offer, promise, assets, operations and success measure before attention arrives. A launch plan should explain what happens when an interested customer says yes.

Apply it now: Write a pre-launch checklist covering offer, audience, delivery capacity and measurement.', '', 0),
    ('c-launch-l-2', 'c-launch', 'c-launch-m-1', 'Building Your Launch Strategy', 'article', 420, NULL, NULL, '', 'Apply building your launch strategy to make a clear decision for your startup.

A launch strategy makes a deliberate choice about audience, moment, offer, channel and desired action. It prioritises the learning or revenue outcome that matters most now.

Apply it now: Write your launch objective and the single customer action that will prove progress.', '', 1),
    ('c-launch-l-3', 'c-launch', 'c-launch-m-1', 'Launch Assets', 'article', 420, NULL, NULL, '', 'Apply launch assets to make a clear decision for your startup.

Assets include the materials that let a customer understand, trust and act: message, demo, landing page, proof, FAQs, onboarding and support. Create only what supports the chosen action.

Apply it now: List every launch asset and label it essential, useful later or unnecessary.', '', 2),
    ('c-launch-l-4', 'c-launch', 'c-launch-m-1', 'Landing Page', 'article', 420, NULL, NULL, '', 'Apply landing page to make a clear decision for your startup.

A landing page should make the audience, problem, promise, proof and next action easy to understand. It earns a conversion by reducing uncertainty, not by explaining every feature.

Apply it now: Draft a landing-page outline with headline, problem, promise, proof, FAQs and one call to action.', '', 3),
    ('c-launch-l-5', 'c-launch', 'c-launch-m-2', 'Social Launch', 'article', 420, NULL, NULL, '', 'Apply social launch to make a clear decision for your startup.

Social launch works when it gives a defined audience a useful reason to pay attention and a clear action to take. Use customer language and proof instead of announcing that you are excited.

Apply it now: Create three launch posts: problem insight, product proof and invitation.', '', 4),
    ('c-launch-l-6', 'c-launch', 'c-launch-m-2', 'Email Launch', 'article', 420, NULL, NULL, '', 'Apply email launch to make a clear decision for your startup.

Email launch lets you speak directly to people who have already granted permission. Segment the message, keep the promise clear and give each email one decision to make.

Apply it now: Draft launch emails for an existing contact, a warm referral and a new lead.', '', 5),
    ('c-launch-l-7', 'c-launch', 'c-launch-m-2', 'Early Customers', 'article', 420, NULL, NULL, '', 'Apply early customers to make a clear decision for your startup.

Early customers are collaborators in learning, not a crowd to acquire at any cost. Set expectations, provide high-touch support and make the success criteria explicit.

Apply it now: Create an early-customer pilot offer with scope, price, onboarding and success measures.', '', 6),
    ('c-launch-l-8', 'c-launch', 'c-launch-m-2', 'Collecting Feedback', 'article', 420, NULL, NULL, '', 'Apply collecting feedback to make a clear decision for your startup.

Launch feedback should combine behaviour, outcomes and honest conversations. Build the collection method before launch so positive noise does not drown out the evidence you need.

Apply it now: Set three feedback moments: onboarding, first value and two weeks after use.', '', 7),
    ('c-launch-l-9', 'c-launch', 'c-launch-m-3', 'Measuring Launch Performance', 'article', 420, NULL, NULL, '', 'Apply measuring launch performance to make a clear decision for your startup.

Measure performance from reach to qualified action to delivery and retention. Select metrics that tell you which decision to make about message, channel, offer or product.

Apply it now: Choose five launch metrics and define the threshold that triggers a change.', '', 8),
    ('c-launch-l-10', 'c-launch', 'c-launch-m-3', 'Post-Launch Optimisation', 'article', 420, NULL, NULL, '', 'Apply post-launch optimisation to make a clear decision for your startup.

Post-launch work turns results into a clear decision: keep, improve, stop or repeat. Review the evidence with your original assumptions visible so the team learns rather than merely celebrates activity.

Apply it now: Run a post-launch review: what happened, why, what surprised you and what you will change next.', '', 9),
    ('c-launch-final', 'c-launch', 'c-launch-m-final', 'Launch Plan: course assessment', 'quiz', 600, NULL, NULL, '', 'A complete pre-launch, launch-week and post-launch plan with offer, audience, assets, customer actions, feedback system and performance measures.

Complete the five-question check, then use the project template to finish and share your own Launch Plan.', '', 10),
    ('c-growth-l-1', 'c-growth', 'c-growth-m-1', 'Understanding Growth', 'article', 420, NULL, NULL, '', 'Apply understanding growth to make a clear decision for your startup.

Growth is the repeated expansion of customer value and business capacity. It becomes dangerous when acquisition rises faster than retention, margin, support or operational quality.

Apply it now: Write the condition that must be true before you deliberately accelerate growth.', '', 0),
    ('c-growth-l-2', 'c-growth', 'c-growth-m-1', 'Growth Metrics', 'article', 420, NULL, NULL, '', 'Apply growth metrics to make a clear decision for your startup.

Growth metrics connect customer behaviour to a business outcome. Choose a north-star measure that reflects delivered value, then supporting measures for acquisition, activation, retention, margin and capacity.

Apply it now: Choose one north-star metric and four supporting measures. State the decision each informs.', '', 1),
    ('c-growth-l-3', 'c-growth', 'c-growth-m-1', 'Customer Retention', 'article', 420, NULL, NULL, '', 'Apply customer retention to make a clear decision for your startup.

Retention measures whether customers continue to receive enough value to stay. Improve it by understanding activation, usage, outcomes, risk signals and the moments a customer decides to leave.

Apply it now: Map your retention journey and identify the earliest signal that a customer is at risk.', '', 2),
    ('c-growth-l-4', 'c-growth', 'c-growth-m-1', 'Referral Systems', 'article', 420, NULL, NULL, '', 'Apply referral systems to make a clear decision for your startup.

Referrals work when a satisfied customer has a natural moment, reason and easy path to introduce someone similar. Incentives can help, but they cannot create genuine value or trust.

Apply it now: Design a referral loop with trigger, message, recipient, reward and measurement.', '', 3),
    ('c-growth-l-5', 'c-growth', 'c-growth-m-2', 'Automation', 'article', 420, NULL, NULL, '', 'Apply automation to make a clear decision for your startup.

Automation removes repeated low-judgement work and improves consistency when the underlying process is already understood. Automating a broken process simply produces errors faster.

Apply it now: List five repeated processes. Choose one stable process to automate and one that still needs human learning.', '', 4),
    ('c-growth-l-6', 'c-growth', 'c-growth-m-2', 'AI for Business', 'article', 420, NULL, NULL, '', 'Apply ai for business to make a clear decision for your startup.

AI can help with research synthesis, drafting, support triage and internal workflows, but it needs defined inputs, review, privacy boundaries and evaluation. Use it to augment judgement, not manufacture customer evidence.

Apply it now: Choose one AI use case, its expected benefit, a human reviewer and the harm you must prevent.', '', 5),
    ('c-growth-l-7', 'c-growth', 'c-growth-m-2', 'Operations', 'article', 420, NULL, NULL, '', 'Apply operations to make a clear decision for your startup.

Operations turn a growing business into dependable delivery through ownership, cadence, capacity planning and visible handoffs. The aim is consistency without losing the customer signal at the edge.

Apply it now: Define the operating rhythm for weekly priorities, customer issues, metrics and decisions.', '', 6),
    ('c-growth-l-8', 'c-growth', 'c-growth-m-2', 'Hiring', 'article', 420, NULL, NULL, '', 'Apply hiring to make a clear decision for your startup.

Hiring should solve a clear capacity or capability constraint, not just signal momentum. Define the outcome, level of ownership, success measures and support before opening a role.

Apply it now: Write a role scorecard for your next hire: mission, outcomes, capabilities, first ninety days and interview evidence.', '', 7),
    ('c-growth-l-9', 'c-growth', 'c-growth-m-3', 'Systems & Processes', 'article', 420, NULL, NULL, '', 'Apply systems & processes to make a clear decision for your startup.

Systems make good work repeatable through a clear owner, trigger, steps, decision rights and review. Document the process that creates the most customer value before documenting every internal preference.

Apply it now: Document one critical process so a capable new teammate can run it without you.', '', 8),
    ('c-growth-l-10', 'c-growth', 'c-growth-m-3', 'Scaling Responsibly', 'article', 420, NULL, NULL, '', 'Apply scaling responsibly to make a clear decision for your startup.

Responsible scale preserves customer value, financial resilience, team health, security and compliance while capacity grows. Set explicit guardrails so growth decisions do not create damage that appears later.

Apply it now: Write three scale guardrails: one for customers, one for cash and one for team or risk.', '', 9),
    ('c-growth-final', 'c-growth', 'c-growth-m-final', 'Growth Strategy: course assessment', 'quiz', 600, NULL, NULL, '', 'A growth strategy covering your growth goal, metrics, retention, referrals, automation, operating capacity, team needs, systems and guardrails.

Complete the five-question check, then use the project template to finish and share your own Growth Strategy.', '', 10)
  ) as v(id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, revision, sort)
  on conflict (organization_id, id) do update set
    course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title, kind = excluded.kind,
    duration_sec = excluded.duration_sec, video_url = excluded.video_url, captions_url = excluded.captions_url,
    source = excluded.source, body = excluded.body, revision = excluded.revision, sort = excluded.sort;

  insert into cs_lesson_blocks (organization_id, id, lesson_id, type, title, content, action_href, action_label, sort)
  select p_org, v.* from (values
    ('c-opportunity-l-1-objective', 'c-opportunity-l-1', 'objective', 'Learning objective', 'Distinguish an opportunity from an interesting concept.', '', '', 0),
    ('c-opportunity-l-1-learn', 'c-opportunity-l-1', 'learn', 'Learn', 'An opportunity connects a specific customer problem to a feasible way of creating and capturing value. Ideas become opportunities only when the problem, customer, timing and economics can all withstand scrutiny.', '', '', 1),
    ('c-opportunity-l-1-example', 'c-opportunity-l-1', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-1-activity', 'c-opportunity-l-1', 'activity', 'Put it into practice', 'Write your idea in one sentence, then rewrite it as: A specific customer struggles with a specific problem because...', '', '', 3),
    ('c-opportunity-l-1-ai', 'c-opportunity-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-1-template', 'c-opportunity-l-1', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-2-objective', 'c-opportunity-l-2', 'objective', 'Learning objective', 'Start with an existing struggle rather than a preferred solution.', '', '', 0),
    ('c-opportunity-l-2-learn', 'c-opportunity-l-2', 'learn', 'Learn', 'Ideas describe what you want to build; problems describe what another person is already trying to solve. Starting with the problem protects you from building a polished answer to a question nobody asked.', '', '', 1),
    ('c-opportunity-l-2-example', 'c-opportunity-l-2', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-2-activity', 'c-opportunity-l-2', 'activity', 'Put it into practice', 'List three moments when your intended customer currently loses time, money, certainty or status. Do not mention your product.', '', '', 3),
    ('c-opportunity-l-2-ai', 'c-opportunity-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-2-template', 'c-opportunity-l-2', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-3-objective', 'c-opportunity-l-3', 'objective', 'Learning objective', 'Recognise evidence that a problem is real and active.', '', '', 0),
    ('c-opportunity-l-3-learn', 'c-opportunity-l-3', 'learn', 'Learn', 'Real problems leave traces: workarounds, repeated complaints, budget, delays, risk or emotional friction. Interest in a future solution is weak evidence; past behaviour and present cost are stronger.', '', '', 1),
    ('c-opportunity-l-3-example', 'c-opportunity-l-3', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-3-activity', 'c-opportunity-l-3', 'activity', 'Put it into practice', 'Collect five verbatim examples of what people do today to handle the problem and what that workaround costs.', '', '', 3),
    ('c-opportunity-l-3-ai', 'c-opportunity-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-3-template', 'c-opportunity-l-3', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-4-objective', 'c-opportunity-l-4', 'objective', 'Learning objective', 'Describe the functional, financial and emotional cost of a problem.', '', '', 0),
    ('c-opportunity-l-4-learn', 'c-opportunity-l-4', 'learn', 'Learn', 'A pain point is more than an inconvenience. Identify what the customer cannot achieve, what it costs them, who feels the consequence, and what happens if nothing changes.', '', '', 1),
    ('c-opportunity-l-4-example', 'c-opportunity-l-4', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-4-activity', 'c-opportunity-l-4', 'activity', 'Put it into practice', 'Complete a pain statement: When ___ tries to ___, they struggle because ___. This costs ___ and leaves them feeling ___.', '', '', 3),
    ('c-opportunity-l-4-ai', 'c-opportunity-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-4-template', 'c-opportunity-l-4', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-5-objective', 'c-opportunity-l-5', 'objective', 'Learning objective', 'Map the ecosystem around a customer problem.', '', '', 0),
    ('c-opportunity-l-5-learn', 'c-opportunity-l-5', 'learn', 'Learn', 'Opportunity mapping connects the user, buyer, influencer, current alternative, constraint and trigger. It prevents a founder from interviewing one friendly person and mistaking them for the whole market.', '', '', 1),
    ('c-opportunity-l-5-example', 'c-opportunity-l-5', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-5-activity', 'c-opportunity-l-5', 'activity', 'Put it into practice', 'Draw your map. Mark who experiences the problem, who approves a purchase, who pays, and who could block adoption.', '', '', 3),
    ('c-opportunity-l-5-ai', 'c-opportunity-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-5-template', 'c-opportunity-l-5', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-6-objective', 'c-opportunity-l-6', 'objective', 'Learning objective', 'Estimate whether the need is frequent and urgent enough to matter.', '', '', 0),
    ('c-opportunity-l-6-learn', 'c-opportunity-l-6', 'learn', 'Learn', 'Need is not measured by how much people agree with you. Look for frequency, severity, urgency, willingness to switch and a reachable group of customers with the same underlying job to be done.', '', '', 1),
    ('c-opportunity-l-6-example', 'c-opportunity-l-6', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-6-activity', 'c-opportunity-l-6', 'activity', 'Put it into practice', 'Score the need from one to five for frequency, cost, urgency and willingness to change. Explain every score with evidence or mark it as a guess.', '', '', 3),
    ('c-opportunity-l-6-ai', 'c-opportunity-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-6-template', 'c-opportunity-l-6', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-7-objective', 'c-opportunity-l-7', 'objective', 'Learning objective', 'Form a clear hypothesis about how your approach reduces the customer''s pain.', '', '', 0),
    ('c-opportunity-l-7-learn', 'c-opportunity-l-7', 'learn', 'Learn', 'Problem-solution fit is a hypothesis, not a launch milestone. State the customer, problem, promised outcome and the mechanism you believe creates that outcome; then find the cheapest way to challenge it.', '', '', 1),
    ('c-opportunity-l-7-example', 'c-opportunity-l-7', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-7-activity', 'c-opportunity-l-7', 'activity', 'Put it into practice', 'Write one testable statement: We believe ___ will use ___ to achieve ___ because ___. Name the smallest test you can run this week.', '', '', 3),
    ('c-opportunity-l-7-ai', 'c-opportunity-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-7-template', 'c-opportunity-l-7', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-opportunity-l-8-objective', 'c-opportunity-l-8', 'objective', 'Learning objective', 'Decide whether to pursue, reshape or pause an opportunity.', '', '', 0),
    ('c-opportunity-l-8-learn', 'c-opportunity-l-8', 'learn', 'Learn', 'Assess opportunities across customer pain, market access, founder fit, feasibility, economics and defensibility. A weak score is useful when it tells you what to test next; it is dangerous only when it is hidden.', '', '', 1),
    ('c-opportunity-l-8-example', 'c-opportunity-l-8', 'example', 'Example', 'A founder begins with an idea for a clinic-booking app. Interviews reveal the opportunity is not booking itself: multi-site clinic managers lose revenue when receptionists cannot see another branch''s availability. The useful problem is specific, costly and testable.', '', '', 2),
    ('c-opportunity-l-8-activity', 'c-opportunity-l-8', 'activity', 'Put it into practice', 'Create your Opportunity Brief and mark each major claim as guess, evidence or proven. Choose one claim to test before moving forward.', '', '', 3),
    ('c-opportunity-l-8-ai', 'c-opportunity-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-opportunity-l-8-template', 'c-opportunity-l-8', 'template', 'Opportunity Brief template', '1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Open My Venture', 5),
    ('c-market-l-1-objective', 'c-market-l-1', 'objective', 'Learning objective', 'Define a market around a customer job and context.', '', '', 0),
    ('c-market-l-1-learn', 'c-market-l-1', 'learn', 'Learn', 'A market is not everybody who could possibly use a product. Define it by the customer, the job they are trying to do, the setting in which it happens and the alternatives they consider.', '', '', 1),
    ('c-market-l-1-example', 'c-market-l-1', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-1-activity', 'c-market-l-1', 'activity', 'Put it into practice', 'Write a market definition that begins with a customer type and a job, not an industry label.', '', '', 3),
    ('c-market-l-1-ai', 'c-market-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-1-template', 'c-market-l-1', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-2-objective', 'c-market-l-2', 'objective', 'Learning objective', 'Use market sizing to make choices rather than decorate a deck.', '', '', 0),
    ('c-market-l-2-learn', 'c-market-l-2', 'learn', 'Learn', 'TAM is conceivable demand, SAM is what your offer can serve, and SOM is the share you can credibly reach first. Every number needs an assumption about price, customer count, geography and adoption.', '', '', 1),
    ('c-market-l-2-example', 'c-market-l-2', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-2-activity', 'c-market-l-2', 'activity', 'Put it into practice', 'Show your TAM, SAM and first-year SOM calculation. Put a source or assumption beside every number.', '', '', 3),
    ('c-market-l-2-ai', 'c-market-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-2-template', 'c-market-l-2', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-3-objective', 'c-market-l-3', 'objective', 'Learning objective', 'Choose an initial segment that is specific enough to learn from.', '', '', 0),
    ('c-market-l-3-learn', 'c-market-l-3', 'learn', 'Learn', 'Segments differ in problem intensity, buying process, ability to pay and reachability. A narrow early segment is a way to learn quickly enough to earn expansion.', '', '', 1),
    ('c-market-l-3-example', 'c-market-l-3', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-3-activity', 'c-market-l-3', 'activity', 'Put it into practice', 'List three possible segments. Rank them by pain, access, urgency and ability to pay. Select one beachhead.', '', '', 3),
    ('c-market-l-3-ai', 'c-market-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-3-template', 'c-market-l-3', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-4-objective', 'c-market-l-4', 'objective', 'Learning objective', 'Research direct competitors, substitutes and do-nothing behaviour.', '', '', 0),
    ('c-market-l-4-learn', 'c-market-l-4', 'learn', 'Learn', 'Customers compare you with more than businesses with similar technology. They compare you with spreadsheets, agencies, a staff member, delay and doing nothing.', '', '', 1),
    ('c-market-l-4-example', 'c-market-l-4', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-4-activity', 'c-market-l-4', 'activity', 'Put it into practice', 'Create a table of five alternatives with their promise, price, strengths, weaknesses and customer.', '', '', 3),
    ('c-market-l-4-ai', 'c-market-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-4-template', 'c-market-l-4', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-5-objective', 'c-market-l-5', 'objective', 'Learning objective', 'Find the open position an early customer can understand.', '', '', 0),
    ('c-market-l-5-learn', 'c-market-l-5', 'learn', 'Learn', 'Positioning chooses who you serve, the category you belong to, the outcome you promise and the alternative you replace. It should make the right customer say this is for me.', '', '', 1),
    ('c-market-l-5-example', 'c-market-l-5', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-5-activity', 'c-market-l-5', 'activity', 'Put it into practice', 'Write: For ___ who need ___, we are the ___ that ___ unlike ___.', '', '', 3),
    ('c-market-l-5-ai', 'c-market-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-5-template', 'c-market-l-5', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-6-objective', 'c-market-l-6', 'objective', 'Learning objective', 'Plan research around decisions you need to make.', '', '', 0),
    ('c-market-l-6-learn', 'c-market-l-6', 'learn', 'Learn', 'Research is useful when it reduces a decision risk. State what you need to learn, who can answer from experience and what answer would change your next move.', '', '', 1),
    ('c-market-l-6-example', 'c-market-l-6', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-6-activity', 'c-market-l-6', 'activity', 'Put it into practice', 'Create three decision questions, the people to speak to and the evidence that would change your mind.', '', '', 3),
    ('c-market-l-6-ai', 'c-market-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-6-template', 'c-market-l-6', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-7-objective', 'c-market-l-7', 'objective', 'Learning objective', 'Use interviews for stories and surveys for patterns.', '', '', 0),
    ('c-market-l-7-learn', 'c-market-l-7', 'learn', 'Learn', 'Interviews uncover context and language; surveys test a pattern once you know what to ask. Avoid leading questions and future promises. Ask for a recent event, steps taken and the cost of the current approach.', '', '', 1),
    ('c-market-l-7-example', 'c-market-l-7', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-7-activity', 'c-market-l-7', 'activity', 'Put it into practice', 'Write five interview questions in the past tense and recruit five people from your beachhead segment.', '', '', 3),
    ('c-market-l-7-ai', 'c-market-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-7-template', 'c-market-l-7', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-8-objective', 'c-market-l-8', 'objective', 'Learning objective', 'Run a small demand test before building the full product.', '', '', 0),
    ('c-market-l-8-learn', 'c-market-l-8', 'learn', 'Learn', 'Demand tests ask for a meaningful action: a deposit, booked call, pilot commitment, email reply or time configuring a prototype. Select the smallest action that exposes the assumption you most need to know.', '', '', 1),
    ('c-market-l-8-example', 'c-market-l-8', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-8-activity', 'c-market-l-8', 'activity', 'Put it into practice', 'Define the audience, offer, action, success threshold and review date for one demand test.', '', '', 3),
    ('c-market-l-8-ai', 'c-market-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-8-template', 'c-market-l-8', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-9-objective', 'c-market-l-9', 'objective', 'Learning objective', 'Track assumptions explicitly and update confidence with evidence.', '', '', 0),
    ('c-market-l-9-learn', 'c-market-l-9', 'learn', 'Learn', 'Every early plan rests on assumptions about customer, problem, value, willingness to pay and reachability. An assumption log turns uncertainty into a managed work queue.', '', '', 1),
    ('c-market-l-9-example', 'c-market-l-9', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-9-activity', 'c-market-l-9', 'activity', 'Put it into practice', 'Create an assumption log with ten important claims. Mark the riskiest and schedule its test.', '', '', 3),
    ('c-market-l-9-ai', 'c-market-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-9-template', 'c-market-l-9', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-market-l-10-objective', 'c-market-l-10', 'objective', 'Learning objective', 'Turn research findings into a decision, not a scrapbook.', '', '', 0),
    ('c-market-l-10-learn', 'c-market-l-10', 'learn', 'Learn', 'Evidence is not a vote count. Look for repeated patterns, counterexamples, source quality and what changed behaviour. State what the evidence supports, what it does not support and which decision follows.', '', '', 1),
    ('c-market-l-10-example', 'c-market-l-10', 'example', 'Example', 'The clinic-booking founder first calls the market all healthcare. Research narrows the initial segment to independent Nigerian clinics with two to five locations, a central booking team and visible no-show losses. The smaller segment is far more useful because it can be reached and interviewed.', '', '', 2),
    ('c-market-l-10-activity', 'c-market-l-10', 'activity', 'Put it into practice', 'Finish your Market Validation Report with three findings, two open risks and one decision: continue, reshape or pause.', '', '', 3),
    ('c-market-l-10-ai', 'c-market-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-market-l-10-template', 'c-market-l-10', 'template', 'Market Validation Report template', '1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-1-objective', 'c-business-model-l-1', 'objective', 'Learning objective', 'Explain the model as the system that creates, delivers and captures value.', '', '', 0),
    ('c-business-model-l-1-learn', 'c-business-model-l-1', 'learn', 'Learn', 'A business model describes connected choices that make a company work. It is not a mission statement or feature list; it shows how a customer benefit becomes a repeatable, viable business.', '', '', 1),
    ('c-business-model-l-1-example', 'c-business-model-l-1', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-1-activity', 'c-business-model-l-1', 'activity', 'Put it into practice', 'Describe your model in four sentences: customer, value, delivery and how money returns.', '', '', 3),
    ('c-business-model-l-1-ai', 'c-business-model-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-1-template', 'c-business-model-l-1', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-2-objective', 'c-business-model-l-2', 'objective', 'Learning objective', 'Separate users, buyers and stakeholders into useful segments.', '', '', 0),
    ('c-business-model-l-2-learn', 'c-business-model-l-2', 'learn', 'Learn', 'A segment groups people who share a meaningful problem, context and buying logic. When user and buyer differ, design for both rather than assuming one message works for everyone.', '', '', 1),
    ('c-business-model-l-2-example', 'c-business-model-l-2', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-2-activity', 'c-business-model-l-2', 'activity', 'Put it into practice', 'Name your primary user, economic buyer, influencer and gatekeeper. Write what each needs to believe.', '', '', 3),
    ('c-business-model-l-2-ai', 'c-business-model-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-2-template', 'c-business-model-l-2', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-3-objective', 'c-business-model-l-3', 'objective', 'Learning objective', 'State the outcome your chosen customer receives and why it matters.', '', '', 0),
    ('c-business-model-l-3-learn', 'c-business-model-l-3', 'learn', 'Learn', 'A value proposition links a painful job to a clear, credible improvement. It should compare directly with the current alternative and name an outcome the customer cares about.', '', '', 1),
    ('c-business-model-l-3-example', 'c-business-model-l-3', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-3-activity', 'c-business-model-l-3', 'activity', 'Put it into practice', 'Write: We help ___ achieve ___ without ___. Add the evidence needed for the claim to be believable.', '', '', 3),
    ('c-business-model-l-3-ai', 'c-business-model-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-3-template', 'c-business-model-l-3', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-4-objective', 'c-business-model-l-4', 'objective', 'Learning objective', 'Choose a revenue mechanism that matches how value is delivered.', '', '', 0),
    ('c-business-model-l-4-learn', 'c-business-model-l-4', 'learn', 'Learn', 'Subscription, transaction, usage, licence, service and marketplace models each change cash flow, sales motion and incentives. Pick a mechanism customers understand and that funds profitable delivery.', '', '', 1),
    ('c-business-model-l-4-example', 'c-business-model-l-4', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-4-activity', 'c-business-model-l-4', 'activity', 'Put it into practice', 'Compare two revenue models. State when the customer pays, what triggers payment and what could make economics fail.', '', '', 3),
    ('c-business-model-l-4-ai', 'c-business-model-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-4-template', 'c-business-model-l-4', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-5-objective', 'c-business-model-l-5', 'objective', 'Learning objective', 'Set a starting price from value, alternatives and delivery economics.', '', '', 0),
    ('c-business-model-l-5-learn', 'c-business-model-l-5', 'learn', 'Learn', 'Price signals who the product is for and funds the experience you promise. Start with customer value and alternatives, then check the margin, sales effort and support requirements.', '', '', 1),
    ('c-business-model-l-5-example', 'c-business-model-l-5', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-5-activity', 'c-business-model-l-5', 'activity', 'Put it into practice', 'Choose a test price, what it includes and the trade you will make if a customer asks for a discount.', '', '', 3),
    ('c-business-model-l-5-ai', 'c-business-model-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-5-template', 'c-business-model-l-5', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-6-objective', 'c-business-model-l-6', 'objective', 'Learning objective', 'Select the route by which a customer discovers, evaluates and buys.', '', '', 0),
    ('c-business-model-l-6-learn', 'c-business-model-l-6', 'learn', 'Learn', 'Channels belong inside the model, not in a campaign after the product is ready. A channel should be trusted by your segment, repeatable and affordable relative to the value created.', '', '', 1),
    ('c-business-model-l-6-example', 'c-business-model-l-6', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-6-activity', 'c-business-model-l-6', 'activity', 'Put it into practice', 'Map awareness to paid use. Mark the highest-friction step and one experiment to reduce it.', '', '', 3),
    ('c-business-model-l-6-ai', 'c-business-model-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-6-template', 'c-business-model-l-6', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-7-objective', 'c-business-model-l-7', 'objective', 'Learning objective', 'Decide how customers will be acquired, supported and kept.', '', '', 0),
    ('c-business-model-l-7-learn', 'c-business-model-l-7', 'learn', 'Learn', 'Relationship design ranges from high-touch advisory work to self-service adoption. Choose it from customer complexity, willingness to pay and support cost rather than a preference for automation.', '', '', 1),
    ('c-business-model-l-7-example', 'c-business-model-l-7', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-7-activity', 'c-business-model-l-7', 'activity', 'Put it into practice', 'Define the relationship at acquisition, onboarding, first value, support and renewal.', '', '', 3),
    ('c-business-model-l-7-ai', 'c-business-model-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-7-template', 'c-business-model-l-7', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-8-objective', 'c-business-model-l-8', 'objective', 'Learning objective', 'Identify the capabilities that must work for your model to deliver value.', '', '', 0),
    ('c-business-model-l-8-learn', 'c-business-model-l-8', 'learn', 'Learn', 'Key activities are not every item on a to-do list. They create the value proposition, reach the segment or keep the economics intact.', '', '', 1),
    ('c-business-model-l-8-example', 'c-business-model-l-8', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-8-activity', 'c-business-model-l-8', 'activity', 'Put it into practice', 'List three key activities. For each, state what failure looks like and how you will know early.', '', '', 3),
    ('c-business-model-l-8-ai', 'c-business-model-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-8-template', 'c-business-model-l-8', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-9-objective', 'c-business-model-l-9', 'objective', 'Learning objective', 'Name the assets and capabilities without which the model cannot operate.', '', '', 0),
    ('c-business-model-l-9-learn', 'c-business-model-l-9', 'learn', 'Learn', 'Resources can be people, data, technology, capital, intellectual property, trust or access. The important question is whether you control enough of what the model depends on.', '', '', 1),
    ('c-business-model-l-9-example', 'c-business-model-l-9', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-9-activity', 'c-business-model-l-9', 'activity', 'Put it into practice', 'List five resources. Mark which you own, rent, borrow or still need to obtain.', '', '', 3),
    ('c-business-model-l-9-ai', 'c-business-model-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-9-template', 'c-business-model-l-9', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-10-objective', 'c-business-model-l-10', 'objective', 'Learning objective', 'Choose partners that strengthen the model without becoming a hidden dependency.', '', '', 0),
    ('c-business-model-l-10-learn', 'c-business-model-l-10', 'learn', 'Learn', 'Partners can improve reach, capability or economics, but every partner adds risk. Decide what they contribute, what motivates them and what happens if their terms change.', '', '', 1),
    ('c-business-model-l-10-example', 'c-business-model-l-10', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-10-activity', 'c-business-model-l-10', 'activity', 'Put it into practice', 'For each key partner, write the value exchanged, dependency risk and an alternative.', '', '', 3),
    ('c-business-model-l-10-ai', 'c-business-model-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-10-template', 'c-business-model-l-10', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-11-objective', 'c-business-model-l-11', 'objective', 'Learning objective', 'Understand the fixed, variable and step costs behind the promise.', '', '', 0),
    ('c-business-model-l-11-learn', 'c-business-model-l-11', 'learn', 'Learn', 'Cost structure reveals whether growth improves or worsens the business. Separate costs that rise per customer from those that remain fixed until a capacity threshold.', '', '', 1),
    ('c-business-model-l-11-example', 'c-business-model-l-11', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-11-activity', 'c-business-model-l-11', 'activity', 'Put it into practice', 'List your ten biggest costs. Label each fixed, variable or step-fixed and identify the likely surprise.', '', '', 3),
    ('c-business-model-l-11-ai', 'c-business-model-l-11', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-11-template', 'c-business-model-l-11', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-business-model-l-12-objective', 'c-business-model-l-12', 'objective', 'Learning objective', 'Combine the nine building blocks into a coherent, testable whole.', '', '', 0),
    ('c-business-model-l-12-learn', 'c-business-model-l-12', 'learn', 'Learn', 'A canvas is useful only when its blocks agree. Read it as a story: this customer receives this value through this channel, pays this way, and the business can deliver it with these activities and costs.', '', '', 1),
    ('c-business-model-l-12-example', 'c-business-model-l-12', 'example', 'Example', 'For the clinic-booking startup, the user is the receptionist, the buyer is the clinic manager and the value is fewer missed appointments across locations. That distinction changes the sales conversation, onboarding and price model.', '', '', 2),
    ('c-business-model-l-12-activity', 'c-business-model-l-12', 'activity', 'Put it into practice', 'Complete your canvas. Circle three blocks built on the weakest evidence and turn each into an experiment.', '', '', 3),
    ('c-business-model-l-12-ai', 'c-business-model-l-12', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-business-model-l-12-template', 'c-business-model-l-12', 'template', 'Business Model Canvas template', 'Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Open My Venture', 5),
    ('c-brand-l-1-objective', 'c-brand-l-1', 'objective', 'Learning objective', 'Apply brand vs business to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-1-learn', 'c-brand-l-1', 'learn', 'Learn', 'The business is what you do; the brand is the pattern of meaning, expectation and memory that makes people interpret what you do. A strong brand makes a useful business easier to recognise and choose.', '', '', 1),
    ('c-brand-l-1-example', 'c-brand-l-1', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-1-activity', 'c-brand-l-1', 'activity', 'Put it into practice', 'List three things your business does and three feelings or expectations customers should attach to it.', '', '', 3),
    ('c-brand-l-1-ai', 'c-brand-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-1-template', 'c-brand-l-1', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-2-objective', 'c-brand-l-2', 'objective', 'Learning objective', 'Apply brand purpose to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-2-learn', 'c-brand-l-2', 'learn', 'Learn', 'Purpose explains the change your business exists to create beyond making a sale. It gives choices a direction, but it must connect to a real customer outcome rather than a broad slogan.', '', '', 1),
    ('c-brand-l-2-example', 'c-brand-l-2', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-2-activity', 'c-brand-l-2', 'activity', 'Put it into practice', 'Write one purpose statement that names the customer change you want to make.', '', '', 3),
    ('c-brand-l-2-ai', 'c-brand-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-2-template', 'c-brand-l-2', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-3-objective', 'c-brand-l-3', 'objective', 'Learning objective', 'Apply brand positioning to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-3-learn', 'c-brand-l-3', 'learn', 'Learn', 'Positioning chooses the place you want to occupy in a customer''s mind relative to an alternative. It is a decision about audience, category, promise and proof.', '', '', 1),
    ('c-brand-l-3-example', 'c-brand-l-3', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-3-activity', 'c-brand-l-3', 'activity', 'Put it into practice', 'Write a positioning statement and name the alternative you want to replace.', '', '', 3),
    ('c-brand-l-3-ai', 'c-brand-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-3-template', 'c-brand-l-3', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-4-objective', 'c-brand-l-4', 'objective', 'Learning objective', 'Apply target audience to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-4-learn', 'c-brand-l-4', 'learn', 'Learn', 'A target audience is a priority group, not a demographic bucket. Define its context, unmet need, trigger, buying power and where it already pays attention.', '', '', 1),
    ('c-brand-l-4-example', 'c-brand-l-4', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-4-activity', 'c-brand-l-4', 'activity', 'Put it into practice', 'Describe your priority audience in five observable characteristics.', '', '', 3),
    ('c-brand-l-4-ai', 'c-brand-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-4-template', 'c-brand-l-4', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-5-objective', 'c-brand-l-5', 'objective', 'Learning objective', 'Apply customer persona to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-5-learn', 'c-brand-l-5', 'learn', 'Learn', 'A persona turns a segment into a decision tool by showing goals, frustrations, language, constraints and buying behaviour. It should be based on research, not a fictional biography.', '', '', 1),
    ('c-brand-l-5-example', 'c-brand-l-5', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-5-activity', 'c-brand-l-5', 'activity', 'Put it into practice', 'Create a one-page persona using interview evidence and flag every unsupported assumption.', '', '', 3),
    ('c-brand-l-5-ai', 'c-brand-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-5-template', 'c-brand-l-5', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-6-objective', 'c-brand-l-6', 'objective', 'Learning objective', 'Apply brand personality to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-6-learn', 'c-brand-l-6', 'learn', 'Learn', 'Personality gives the brand a consistent manner. Choose a small number of traits and their opposites so teams know how the brand should and should not behave.', '', '', 1),
    ('c-brand-l-6-example', 'c-brand-l-6', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-6-activity', 'c-brand-l-6', 'activity', 'Put it into practice', 'Choose three personality traits and three traits you will deliberately avoid.', '', '', 3),
    ('c-brand-l-6-ai', 'c-brand-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-6-template', 'c-brand-l-6', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-7-objective', 'c-brand-l-7', 'objective', 'Learning objective', 'Apply brand voice to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-7-learn', 'c-brand-l-7', 'learn', 'Learn', 'Voice is how personality sounds in words: vocabulary, rhythm, point of view and level of formality. It should help a customer understand and act, not merely sound clever.', '', '', 1),
    ('c-brand-l-7-example', 'c-brand-l-7', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-7-activity', 'c-brand-l-7', 'activity', 'Put it into practice', 'Write a voice guide with five do rules, five do-not rules and one sample message.', '', '', 3),
    ('c-brand-l-7-ai', 'c-brand-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-7-template', 'c-brand-l-7', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-8-objective', 'c-brand-l-8', 'objective', 'Learning objective', 'Apply naming to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-8-learn', 'c-brand-l-8', 'learn', 'Learn', 'A good name is memorable, pronounceable, distinctive and appropriate for the category and future direction. Test it with real people, domains and local language before committing.', '', '', 1),
    ('c-brand-l-8-example', 'c-brand-l-8', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-8-activity', 'c-brand-l-8', 'activity', 'Put it into practice', 'Generate ten names, score them for clarity and distinctiveness, then test your strongest three.', '', '', 3),
    ('c-brand-l-8-ai', 'c-brand-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-8-template', 'c-brand-l-8', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-9-objective', 'c-brand-l-9', 'objective', 'Learning objective', 'Apply visual identity to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-9-learn', 'c-brand-l-9', 'learn', 'Learn', 'Visual identity translates the strategy into repeatable signals such as colour, typography, imagery and layout. It should support recognition and accessibility, not conceal a weak position.', '', '', 1),
    ('c-brand-l-9-example', 'c-brand-l-9', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-9-activity', 'c-brand-l-9', 'activity', 'Put it into practice', 'Create a visual-direction mood board with three principles and three references to avoid.', '', '', 3),
    ('c-brand-l-9-ai', 'c-brand-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-9-template', 'c-brand-l-9', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-10-objective', 'c-brand-l-10', 'objective', 'Learning objective', 'Apply brand story to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-10-learn', 'c-brand-l-10', 'learn', 'Learn', 'A brand story gives customers a meaningful before, tension and after. The customer is the hero; the business is the guide that helps them move forward.', '', '', 1),
    ('c-brand-l-10-example', 'c-brand-l-10', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-10-activity', 'c-brand-l-10', 'activity', 'Put it into practice', 'Write a 150-word story that starts with the customer''s world before your business exists.', '', '', 3),
    ('c-brand-l-10-ai', 'c-brand-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-10-template', 'c-brand-l-10', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-brand-l-11-objective', 'c-brand-l-11', 'objective', 'Learning objective', 'Apply brand differentiation to make a clear decision for your startup.', '', '', 0),
    ('c-brand-l-11-learn', 'c-brand-l-11', 'learn', 'Learn', 'Differentiation is valuable when it is relevant, credible and difficult to copy. A claim becomes a position only when customers can see proof in the product and experience.', '', '', 1),
    ('c-brand-l-11-example', 'c-brand-l-11', 'example', 'Example', 'The clinic-booking product is not branded as another scheduling tool. It is positioned as the calm operating system for independent clinics that want every patient to reach the right branch the first time.', '', '', 2),
    ('c-brand-l-11-activity', 'c-brand-l-11', 'activity', 'Put it into practice', 'List your three proposed differentiators and attach a proof point or an experiment to each.', '', '', 3),
    ('c-brand-l-11-ai', 'c-brand-l-11', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-brand-l-11-template', 'c-brand-l-11', 'template', 'Brand Strategy Document template', 'Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-1-objective', 'c-mvp-l-1', 'objective', 'Learning objective', 'Apply what is an mvp? to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-1-learn', 'c-mvp-l-1', 'learn', 'Learn', 'An MVP is the smallest credible product or service that delivers a core outcome and produces evidence. Its job is learning, not impressing people with a reduced feature list.', '', '', 1),
    ('c-mvp-l-1-example', 'c-mvp-l-1', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-1-activity', 'c-mvp-l-1', 'activity', 'Put it into practice', 'State the smallest outcome a customer must achieve for your MVP to be useful.', '', '', 3),
    ('c-mvp-l-1-ai', 'c-mvp-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-1-template', 'c-mvp-l-1', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-2-objective', 'c-mvp-l-2', 'objective', 'Learning objective', 'Apply mvp vs full product to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-2-learn', 'c-mvp-l-2', 'learn', 'Learn', 'A full product solves many adjacent needs reliably at scale; an MVP proves the most important customer and value assumptions. Confusing the two leads to overbuilding before learning.', '', '', 1),
    ('c-mvp-l-2-example', 'c-mvp-l-2', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-2-activity', 'c-mvp-l-2', 'activity', 'Put it into practice', 'Create a two-column list: necessary to test now and valuable only after evidence.', '', '', 3),
    ('c-mvp-l-2-ai', 'c-mvp-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-2-template', 'c-mvp-l-2', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-3-objective', 'c-mvp-l-3', 'objective', 'Learning objective', 'Apply defining the core user to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-3-learn', 'c-mvp-l-3', 'learn', 'Learn', 'Choose one early user whose context and pain are specific enough to guide product decisions. Broad user definitions produce conflicting features and weak onboarding.', '', '', 1),
    ('c-mvp-l-3-example', 'c-mvp-l-3', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-3-activity', 'c-mvp-l-3', 'activity', 'Put it into practice', 'Write the core user''s role, trigger, current workaround and success moment.', '', '', 3),
    ('c-mvp-l-3-ai', 'c-mvp-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-3-template', 'c-mvp-l-3', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-4-objective', 'c-mvp-l-4', 'objective', 'Learning objective', 'Apply defining the core problem to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-4-learn', 'c-mvp-l-4', 'learn', 'Learn', 'A core problem is the high-value obstacle in one user journey, not every inconvenience around it. Identify the moment where failure has a costly consequence.', '', '', 1),
    ('c-mvp-l-4-example', 'c-mvp-l-4', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-4-activity', 'c-mvp-l-4', 'activity', 'Put it into practice', 'Map the user''s current steps and circle the one failure your MVP will address first.', '', '', 3),
    ('c-mvp-l-4-ai', 'c-mvp-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-4-template', 'c-mvp-l-4', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-5-objective', 'c-mvp-l-5', 'objective', 'Learning objective', 'Apply feature prioritisation to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-5-learn', 'c-mvp-l-5', 'learn', 'Learn', 'Prioritise features by their contribution to the core outcome, evidence risk, effort and dependency. A feature that does not help a user reach first value belongs in the not-now list.', '', '', 1),
    ('c-mvp-l-5-example', 'c-mvp-l-5', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-5-activity', 'c-mvp-l-5', 'activity', 'Put it into practice', 'Score each proposed feature as must-have, supporting or not-now, then remove one apparent must-have.', '', '', 3),
    ('c-mvp-l-5-ai', 'c-mvp-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-5-template', 'c-mvp-l-5', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-6-objective', 'c-mvp-l-6', 'objective', 'Learning objective', 'Apply user journey to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-6-learn', 'c-mvp-l-6', 'learn', 'Learn', 'A user journey shows how a person moves from trigger to first value and repeat use. It reveals friction that feature lists hide, especially before and after the main task.', '', '', 1),
    ('c-mvp-l-6-example', 'c-mvp-l-6', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-6-activity', 'c-mvp-l-6', 'activity', 'Put it into practice', 'Sketch the happy path in five to seven steps and label the likely drop-off at each step.', '', '', 3),
    ('c-mvp-l-6-ai', 'c-mvp-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-6-template', 'c-mvp-l-6', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-7-objective', 'c-mvp-l-7', 'objective', 'Learning objective', 'Apply product requirements to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-7-learn', 'c-mvp-l-7', 'learn', 'Learn', 'Requirements explain the user outcome, rules, constraints and success criteria without prematurely prescribing every technical implementation. Good requirements make a testable promise.', '', '', 1),
    ('c-mvp-l-7-example', 'c-mvp-l-7', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-7-activity', 'c-mvp-l-7', 'activity', 'Put it into practice', 'Write a requirement for one workflow with user, need, acceptance criteria and a measure of success.', '', '', 3),
    ('c-mvp-l-7-ai', 'c-mvp-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-7-template', 'c-mvp-l-7', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-8-objective', 'c-mvp-l-8', 'objective', 'Learning objective', 'Apply no-code mvps to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-8-learn', 'c-mvp-l-8', 'learn', 'Learn', 'No-code tools, concierge services and manual back-office processes can test demand and workflow before custom software. The customer should experience the value even if the system behind it is temporary.', '', '', 1),
    ('c-mvp-l-8-example', 'c-mvp-l-8', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-8-activity', 'c-mvp-l-8', 'activity', 'Put it into practice', 'Choose a no-code or manual route to deliver your core outcome within two weeks.', '', '', 3),
    ('c-mvp-l-8-ai', 'c-mvp-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-8-template', 'c-mvp-l-8', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-9-objective', 'c-mvp-l-9', 'objective', 'Learning objective', 'Apply ai-assisted mvp development to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-9-learn', 'c-mvp-l-9', 'learn', 'Learn', 'AI can accelerate prototypes, copy, research synthesis and routine implementation, but it does not validate the underlying customer problem. Keep a human review and test the result with customers.', '', '', 1),
    ('c-mvp-l-9-example', 'c-mvp-l-9', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-9-activity', 'c-mvp-l-9', 'activity', 'Put it into practice', 'Choose one AI-assisted task and define the quality check a human must perform before use.', '', '', 3),
    ('c-mvp-l-9-ai', 'c-mvp-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-9-template', 'c-mvp-l-9', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-10-objective', 'c-mvp-l-10', 'objective', 'Learning objective', 'Apply testing your mvp to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-10-learn', 'c-mvp-l-10', 'learn', 'Learn', 'An MVP test needs a defined audience, task, observation method and threshold for what counts as evidence. Watch behaviour before asking for opinion.', '', '', 1),
    ('c-mvp-l-10-example', 'c-mvp-l-10', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-10-activity', 'c-mvp-l-10', 'activity', 'Put it into practice', 'Recruit five target users and write the task you will ask each person to complete.', '', '', 3),
    ('c-mvp-l-10-ai', 'c-mvp-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-10-template', 'c-mvp-l-10', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-11-objective', 'c-mvp-l-11', 'objective', 'Learning objective', 'Apply gathering feedback to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-11-learn', 'c-mvp-l-11', 'learn', 'Learn', 'Useful feedback captures what the customer tried to do, where they hesitated, what they expected and what they did next. Requests for features are clues, not instructions.', '', '', 1),
    ('c-mvp-l-11-example', 'c-mvp-l-11', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-11-activity', 'c-mvp-l-11', 'activity', 'Put it into practice', 'Create a feedback script with observation notes, three follow-ups and a post-test debrief.', '', '', 3),
    ('c-mvp-l-11-ai', 'c-mvp-l-11', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-11-template', 'c-mvp-l-11', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-mvp-l-12-objective', 'c-mvp-l-12', 'objective', 'Learning objective', 'Apply iterating to make a clear decision for your startup.', '', '', 0),
    ('c-mvp-l-12-learn', 'c-mvp-l-12', 'learn', 'Learn', 'Iteration is a decision to keep, change or remove something based on evidence. Change one important variable at a time where possible, so the next result teaches you something.', '', '', 1),
    ('c-mvp-l-12-example', 'c-mvp-l-12', 'example', 'Example', 'The clinic startup does not begin with a full health platform. Its MVP lets a receptionist see open appointment slots across two branches, move a patient and send a confirmation. Everything else waits until that workflow is proven useful.', '', '', 2),
    ('c-mvp-l-12-activity', 'c-mvp-l-12', 'activity', 'Put it into practice', 'Choose the one change you will make after your test and the evidence that would justify a different change.', '', '', 3),
    ('c-mvp-l-12-ai', 'c-mvp-l-12', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-mvp-l-12-template', 'c-mvp-l-12', 'template', 'MVP Blueprint template', 'Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-1-objective', 'c-marketing-l-1', 'objective', 'Learning objective', 'Apply understanding go-to-market to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-1-learn', 'c-marketing-l-1', 'learn', 'Learn', 'Go-to-market is the coordinated plan for how a defined audience discovers, understands, buys and receives value from an offer. It aligns product, sales and marketing around the same first customer.', '', '', 1),
    ('c-marketing-l-1-example', 'c-marketing-l-1', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-1-activity', 'c-marketing-l-1', 'activity', 'Put it into practice', 'Describe your route from first awareness to first value in one page.', '', '', 3),
    ('c-marketing-l-1-ai', 'c-marketing-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-1-template', 'c-marketing-l-1', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-2-objective', 'c-marketing-l-2', 'objective', 'Learning objective', 'Apply target audience to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-2-learn', 'c-marketing-l-2', 'learn', 'Learn', 'Marketing becomes efficient when it starts with a priority audience, their trigger, current behaviour and trusted sources of information. Reachability matters as much as size.', '', '', 1),
    ('c-marketing-l-2-example', 'c-marketing-l-2', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-2-activity', 'c-marketing-l-2', 'activity', 'Put it into practice', 'Define the audience for your first ninety days and list where they already pay attention.', '', '', 3),
    ('c-marketing-l-2-ai', 'c-marketing-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-2-template', 'c-marketing-l-2', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-3-objective', 'c-marketing-l-3', 'objective', 'Learning objective', 'Apply positioning to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-3-learn', 'c-marketing-l-3', 'learn', 'Learn', 'Marketing positioning repeats the business choice in language a buyer can use. It should make the product''s category, promise and contrast with alternatives immediately clear.', '', '', 1),
    ('c-marketing-l-3-example', 'c-marketing-l-3', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-3-activity', 'c-marketing-l-3', 'activity', 'Put it into practice', 'Write a homepage headline, subheading and comparison line for your chosen position.', '', '', 3),
    ('c-marketing-l-3-ai', 'c-marketing-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-3-template', 'c-marketing-l-3', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-4-objective', 'c-marketing-l-4', 'objective', 'Learning objective', 'Apply messaging to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-4-learn', 'c-marketing-l-4', 'learn', 'Learn', 'Messaging translates positioning into claims, proof, objections and calls to action for a specific stage of the journey. Good messaging is specific enough to be tested.', '', '', 1),
    ('c-marketing-l-4-example', 'c-marketing-l-4', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-4-activity', 'c-marketing-l-4', 'activity', 'Put it into practice', 'Create three message pillars, the proof behind each and one customer objection each must answer.', '', '', 3),
    ('c-marketing-l-4-ai', 'c-marketing-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-4-template', 'c-marketing-l-4', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-5-objective', 'c-marketing-l-5', 'objective', 'Learning objective', 'Apply marketing channels to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-5-learn', 'c-marketing-l-5', 'learn', 'Learn', 'Channels should be selected for audience fit, intent, speed of learning, cost and repeatability. Start with a few channel experiments rather than spreading effort across every platform.', '', '', 1),
    ('c-marketing-l-5-example', 'c-marketing-l-5', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-5-activity', 'c-marketing-l-5', 'activity', 'Put it into practice', 'Choose three channels to test and set one success metric for each.', '', '', 3),
    ('c-marketing-l-5-ai', 'c-marketing-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-5-template', 'c-marketing-l-5', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-6-objective', 'c-marketing-l-6', 'objective', 'Learning objective', 'Apply content strategy to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-6-learn', 'c-marketing-l-6', 'learn', 'Learn', 'Content earns attention by helping an audience make progress before it asks for a purchase. Anchor content in recurring customer questions, proof and useful points of view.', '', '', 1),
    ('c-marketing-l-6-example', 'c-marketing-l-6', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-6-activity', 'c-marketing-l-6', 'activity', 'Put it into practice', 'Plan four pieces of content that answer a real customer question at different buying stages.', '', '', 3),
    ('c-marketing-l-6-ai', 'c-marketing-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-6-template', 'c-marketing-l-6', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-7-objective', 'c-marketing-l-7', 'objective', 'Learning objective', 'Apply social media to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-7-learn', 'c-marketing-l-7', 'learn', 'Learn', 'Social media works when the format, platform and point of view match an existing audience behaviour. It is not a substitute for a clear offer or a way to avoid direct customer conversations.', '', '', 1),
    ('c-marketing-l-7-example', 'c-marketing-l-7', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-7-activity', 'c-marketing-l-7', 'activity', 'Put it into practice', 'Choose one platform, one audience behaviour and a four-week posting experiment.', '', '', 3),
    ('c-marketing-l-7-ai', 'c-marketing-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-7-template', 'c-marketing-l-7', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-8-objective', 'c-marketing-l-8', 'objective', 'Learning objective', 'Apply email marketing to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-8-learn', 'c-marketing-l-8', 'learn', 'Learn', 'Email is most useful when it follows a permission-based relationship with a relevant message and one clear next action. Segment by customer context, not just by list size.', '', '', 1),
    ('c-marketing-l-8-example', 'c-marketing-l-8', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-8-activity', 'c-marketing-l-8', 'activity', 'Put it into practice', 'Draft a three-email sequence for a new lead: problem, proof and invitation.', '', '', 3),
    ('c-marketing-l-8-ai', 'c-marketing-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-8-template', 'c-marketing-l-8', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-9-objective', 'c-marketing-l-9', 'objective', 'Learning objective', 'Apply paid advertising to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-9-learn', 'c-marketing-l-9', 'learn', 'Learn', 'Paid advertising can accelerate a message that already has some evidence, but it will amplify an unclear offer just as efficiently. Begin with small controlled tests and measure qualified action, not impressions.', '', '', 1),
    ('c-marketing-l-9-example', 'c-marketing-l-9', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-9-activity', 'c-marketing-l-9', 'activity', 'Put it into practice', 'Write one paid-test hypothesis with audience, message, spend cap and qualified-lead threshold.', '', '', 3),
    ('c-marketing-l-9-ai', 'c-marketing-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-9-template', 'c-marketing-l-9', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-10-objective', 'c-marketing-l-10', 'objective', 'Learning objective', 'Apply partnerships to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-10-learn', 'c-marketing-l-10', 'learn', 'Learn', 'Partnerships work when both sides gain a clear outcome and reach an audience neither could serve as effectively alone. Treat them as a joint offer, not a request for free promotion.', '', '', 1),
    ('c-marketing-l-10-example', 'c-marketing-l-10', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-10-activity', 'c-marketing-l-10', 'activity', 'Put it into practice', 'Identify three potential partners and write the value exchange for each.', '', '', 3),
    ('c-marketing-l-10-ai', 'c-marketing-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-10-template', 'c-marketing-l-10', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-11-objective', 'c-marketing-l-11', 'objective', 'Learning objective', 'Apply launch campaign to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-11-learn', 'c-marketing-l-11', 'learn', 'Learn', 'A campaign coordinates one audience, offer, message, timeline and call to action. It becomes manageable when every asset serves the same promise instead of announcing many things at once.', '', '', 1),
    ('c-marketing-l-11-example', 'c-marketing-l-11', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-11-activity', 'c-marketing-l-11', 'activity', 'Put it into practice', 'Build a two-week campaign calendar with pre-launch, launch-day and follow-up actions.', '', '', 3),
    ('c-marketing-l-11-ai', 'c-marketing-l-11', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-11-template', 'c-marketing-l-11', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-marketing-l-12-objective', 'c-marketing-l-12', 'objective', 'Learning objective', 'Apply measuring marketing performance to make a clear decision for your startup.', '', '', 0),
    ('c-marketing-l-12-learn', 'c-marketing-l-12', 'learn', 'Learn', 'Measure each stage from attention to qualified action to revenue. A metric is useful only if its movement leads to a decision about audience, message, offer or channel.', '', '', 1),
    ('c-marketing-l-12-example', 'c-marketing-l-12', 'example', 'Example', 'The clinic product starts with a direct message to clinic managers about missed appointments and cross-branch confusion, followed by a short demo and pilot offer. It does not begin with generic posts about digital transformation.', '', '', 2),
    ('c-marketing-l-12-activity', 'c-marketing-l-12', 'activity', 'Put it into practice', 'Choose five metrics for your plan and state the decision each one will inform.', '', '', 3),
    ('c-marketing-l-12-ai', 'c-marketing-l-12', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-marketing-l-12-template', 'c-marketing-l-12', 'template', '90-Day Marketing Plan template', 'Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Open My Venture', 5),
    ('c-sales-l-1-objective', 'c-sales-l-1', 'objective', 'Learning objective', 'Apply understanding sales to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-1-learn', 'c-sales-l-1', 'learn', 'Learn', 'Sales is a mutual decision process: diagnose whether a real problem exists, establish whether your offer can help and agree on a fair next step. It works best when it is built on evidence rather than pressure.', '', '', 1),
    ('c-sales-l-1-example', 'c-sales-l-1', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-1-activity', 'c-sales-l-1', 'activity', 'Put it into practice', 'Write the customer decision your sales conversation should help them make.', '', '', 3),
    ('c-sales-l-1-ai', 'c-sales-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-1-template', 'c-sales-l-1', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-2-objective', 'c-sales-l-2', 'objective', 'Learning objective', 'Apply lead generation to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-2-learn', 'c-sales-l-2', 'learn', 'Learn', 'Lead generation creates a focused list of people or organisations likely to have the problem you solve. Quality comes from segment fit and a credible reason to contact them, not from the size of a spreadsheet.', '', '', 1),
    ('c-sales-l-2-example', 'c-sales-l-2', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-2-activity', 'c-sales-l-2', 'activity', 'Put it into practice', 'Choose two lead sources and create a first list of twenty relevant prospects.', '', '', 3),
    ('c-sales-l-2-ai', 'c-sales-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-2-template', 'c-sales-l-2', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-3-objective', 'c-sales-l-3', 'objective', 'Learning objective', 'Apply lead qualification to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-3-learn', 'c-sales-l-3', 'learn', 'Learn', 'Qualification protects your time by checking pain, fit, urgency, authority and a workable buying path. It is respectful to disqualify a poor fit early rather than force a long sales process.', '', '', 1),
    ('c-sales-l-3-example', 'c-sales-l-3', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-3-activity', 'c-sales-l-3', 'activity', 'Put it into practice', 'Set five qualification questions and define the answer that means you should not proceed.', '', '', 3),
    ('c-sales-l-3-ai', 'c-sales-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-3-template', 'c-sales-l-3', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-4-objective', 'c-sales-l-4', 'objective', 'Learning objective', 'Apply sales funnels to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-4-learn', 'c-sales-l-4', 'learn', 'Learn', 'A funnel makes the sales process visible from lead to conversation, proposal, win and renewal. It helps you see where prospects stop moving and what activity is needed at the top to create outcomes at the bottom.', '', '', 1),
    ('c-sales-l-4-example', 'c-sales-l-4', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-4-activity', 'c-sales-l-4', 'activity', 'Put it into practice', 'Draw your funnel stages and set one conversion measure for each.', '', '', 3),
    ('c-sales-l-4-ai', 'c-sales-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-4-template', 'c-sales-l-4', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-5-objective', 'c-sales-l-5', 'objective', 'Learning objective', 'Apply outreach to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-5-learn', 'c-sales-l-5', 'learn', 'Learn', 'Effective outreach is short, relevant and based on a reason to believe the recipient has the problem. It earns a conversation by showing understanding, not by sending a product catalogue.', '', '', 1),
    ('c-sales-l-5-example', 'c-sales-l-5', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-5-activity', 'c-sales-l-5', 'activity', 'Put it into practice', 'Write a three-step outreach sequence for one qualified segment.', '', '', 3),
    ('c-sales-l-5-ai', 'c-sales-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-5-template', 'c-sales-l-5', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-6-objective', 'c-sales-l-6', 'objective', 'Learning objective', 'Apply discovery calls to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-6-learn', 'c-sales-l-6', 'learn', 'Learn', 'Discovery asks about the customer''s past: what happened, what they tried, what it cost and who was affected. Past behaviour is stronger evidence than a promise about what they might buy.', '', '', 1),
    ('c-sales-l-6-example', 'c-sales-l-6', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-6-activity', 'c-sales-l-6', 'activity', 'Put it into practice', 'Write six discovery questions that cannot be answered with a polite yes.', '', '', 3),
    ('c-sales-l-6-ai', 'c-sales-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-6-template', 'c-sales-l-6', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-7-objective', 'c-sales-l-7', 'objective', 'Learning objective', 'Apply presenting your solution to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-7-learn', 'c-sales-l-7', 'learn', 'Learn', 'A solution presentation should connect the customer''s stated problem to a focused outcome and relevant proof. Demonstrate the workflow that matters rather than touring every feature.', '', '', 1),
    ('c-sales-l-7-example', 'c-sales-l-7', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-7-activity', 'c-sales-l-7', 'activity', 'Put it into practice', 'Create a ten-minute demo or presentation outline using the customer''s own language.', '', '', 3),
    ('c-sales-l-7-ai', 'c-sales-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-7-template', 'c-sales-l-7', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-8-objective', 'c-sales-l-8', 'objective', 'Learning objective', 'Apply handling objections to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-8-learn', 'c-sales-l-8', 'learn', 'Learn', 'Objections are information about risk, value, timing or buying process. Clarify which one you are hearing before answering; discounting is rarely the first or best response.', '', '', 1),
    ('c-sales-l-8-example', 'c-sales-l-8', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-8-activity', 'c-sales-l-8', 'activity', 'Put it into practice', 'List five likely objections, the question you will ask to understand each, and the proof you can offer.', '', '', 3),
    ('c-sales-l-8-ai', 'c-sales-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-8-template', 'c-sales-l-8', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-9-objective', 'c-sales-l-9', 'objective', 'Learning objective', 'Apply closing to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-9-learn', 'c-sales-l-9', 'learn', 'Learn', 'Closing is the act of agreeing a clear next commitment after value, fit and risk have been addressed. It should make the decision easy, specific and reversible enough for an early customer to trust.', '', '', 1),
    ('c-sales-l-9-example', 'c-sales-l-9', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-9-activity', 'c-sales-l-9', 'activity', 'Put it into practice', 'Write the next-step ask for your current offer, including scope, price, start date and success measure.', '', '', 3),
    ('c-sales-l-9-ai', 'c-sales-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-9-template', 'c-sales-l-9', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-sales-l-10-objective', 'c-sales-l-10', 'objective', 'Learning objective', 'Apply customer retention to make a clear decision for your startup.', '', '', 0),
    ('c-sales-l-10-learn', 'c-sales-l-10', 'learn', 'Learn', 'Retention begins with the promise made in the sale and the first value delivered after it. Track adoption, outcomes, risks and renewal conversations before the contract is due.', '', '', 1),
    ('c-sales-l-10-example', 'c-sales-l-10', 'example', 'Example', 'The clinic startup''s founder does not call every health business. She targets multi-site private clinics, qualifies for scheduling pain and authority, asks about the last missed appointment incident and offers a time-bound pilot with clear success measures.', '', '', 2),
    ('c-sales-l-10-activity', 'c-sales-l-10', 'activity', 'Put it into practice', 'Design a thirty-day onboarding and check-in plan for a new customer.', '', '', 3),
    ('c-sales-l-10-ai', 'c-sales-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-sales-l-10-template', 'c-sales-l-10', 'template', 'Customer Acquisition System template', 'Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Open My Venture', 5),
    ('c-finance-l-1-objective', 'c-finance-l-1', 'objective', 'Learning objective', 'Apply understanding startup finance to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-1-learn', 'c-finance-l-1', 'learn', 'Learn', 'Finance translates your operating choices into numbers you can compare. Founders need enough fluency to see the difference between revenue, profit, cash and the assumptions beneath each.', '', '', 1),
    ('c-finance-l-1-example', 'c-finance-l-1', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-1-activity', 'c-finance-l-1', 'activity', 'Put it into practice', 'Write the three financial questions you need answered before committing to your next major decision.', '', '', 3),
    ('c-finance-l-1-ai', 'c-finance-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-1-template', 'c-finance-l-1', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-2-objective', 'c-finance-l-2', 'objective', 'Learning objective', 'Apply revenue to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-2-learn', 'c-finance-l-2', 'learn', 'Learn', 'Revenue is money earned from delivering a product or service, measured with a clear rule for when it is recognised. Separate recurring, one-off, contracted and collected revenue so the picture is honest.', '', '', 1),
    ('c-finance-l-2-example', 'c-finance-l-2', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-2-activity', 'c-finance-l-2', 'activity', 'Put it into practice', 'List your revenue streams and the trigger that creates each one.', '', '', 3),
    ('c-finance-l-2-ai', 'c-finance-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-2-template', 'c-finance-l-2', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-3-objective', 'c-finance-l-3', 'objective', 'Learning objective', 'Apply costs to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-3-learn', 'c-finance-l-3', 'learn', 'Learn', 'Costs include direct delivery costs, operating expenses and the working-capital effects that do not appear in a simple feature plan. Categorising them makes pricing and forecast decisions more realistic.', '', '', 1),
    ('c-finance-l-3-example', 'c-finance-l-3', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-3-activity', 'c-finance-l-3', 'activity', 'Put it into practice', 'List ten costs and label each direct, operating, fixed, variable or step-fixed.', '', '', 3),
    ('c-finance-l-3-ai', 'c-finance-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-3-template', 'c-finance-l-3', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-4-objective', 'c-finance-l-4', 'objective', 'Learning objective', 'Apply gross margin to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-4-learn', 'c-finance-l-4', 'learn', 'Learn', 'Gross margin is what remains after the direct cost of serving customers. It tells you whether each additional sale helps fund the business or creates more work without enough return.', '', '', 1),
    ('c-finance-l-4-example', 'c-finance-l-4', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-4-activity', 'c-finance-l-4', 'activity', 'Put it into practice', 'Calculate a first gross-margin estimate for one customer or unit of service.', '', '', 3),
    ('c-finance-l-4-ai', 'c-finance-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-4-template', 'c-finance-l-4', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-5-objective', 'c-finance-l-5', 'objective', 'Learning objective', 'Apply pricing to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-5-learn', 'c-finance-l-5', 'learn', 'Learn', 'Financial pricing checks whether a value-based price also supports delivery, sales effort, support and a sustainable margin. Price is a strategic choice, but it must survive the arithmetic.', '', '', 1),
    ('c-finance-l-5-example', 'c-finance-l-5', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-5-activity', 'c-finance-l-5', 'activity', 'Put it into practice', 'Test three price points against your direct costs and expected customer volume.', '', '', 3),
    ('c-finance-l-5-ai', 'c-finance-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-5-template', 'c-finance-l-5', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-6-objective', 'c-finance-l-6', 'objective', 'Learning objective', 'Apply break-even to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-6-learn', 'c-finance-l-6', 'learn', 'Learn', 'Break-even identifies the sales volume at which contribution covers fixed costs. It is a planning tool, not a promise; test it against realistic conversion, capacity and cash timing.', '', '', 1),
    ('c-finance-l-6-example', 'c-finance-l-6', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-6-activity', 'c-finance-l-6', 'activity', 'Put it into practice', 'Calculate your contribution per sale and the number of sales needed to cover monthly fixed costs.', '', '', 3),
    ('c-finance-l-6-ai', 'c-finance-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-6-template', 'c-finance-l-6', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-7-objective', 'c-finance-l-7', 'objective', 'Learning objective', 'Apply cash flow to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-7-learn', 'c-finance-l-7', 'learn', 'Learn', 'Cash flow tracks when money actually enters and leaves the business. A profitable business can fail if customers pay late, inventory is bought early or debt payments arrive before cash does.', '', '', 1),
    ('c-finance-l-7-example', 'c-finance-l-7', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-7-activity', 'c-finance-l-7', 'activity', 'Put it into practice', 'Create a thirteen-week cash view with opening cash, expected receipts, payments and closing cash.', '', '', 3),
    ('c-finance-l-7-ai', 'c-finance-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-7-template', 'c-finance-l-7', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-8-objective', 'c-finance-l-8', 'objective', 'Learning objective', 'Apply financial forecasting to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-8-learn', 'c-finance-l-8', 'learn', 'Learn', 'Forecasting turns assumptions into scenarios so you can see the decision points before they become emergencies. Update it frequently and compare forecast with actual results to improve judgement.', '', '', 1),
    ('c-finance-l-8-example', 'c-finance-l-8', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-8-activity', 'c-finance-l-8', 'activity', 'Put it into practice', 'Build base, upside and downside cases for the next twelve months.', '', '', 3),
    ('c-finance-l-8-ai', 'c-finance-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-8-template', 'c-finance-l-8', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-9-objective', 'c-finance-l-9', 'objective', 'Learning objective', 'Apply funding to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-9-learn', 'c-finance-l-9', 'learn', 'Learn', 'Funding is appropriate when it buys a specific path to evidence or growth that the business cannot finance from cash alone. Match the source and terms to the business model, asset life and risk.', '', '', 1),
    ('c-finance-l-9-example', 'c-finance-l-9', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-9-activity', 'c-finance-l-9', 'activity', 'Put it into practice', 'Write what a funding round would buy, the milestone it must achieve and what happens if it takes twice as long.', '', '', 3),
    ('c-finance-l-9-ai', 'c-finance-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-9-template', 'c-finance-l-9', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-10-objective', 'c-finance-l-10', 'objective', 'Learning objective', 'Apply bootstrapping to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-10-learn', 'c-finance-l-10', 'learn', 'Learn', 'Bootstrapping uses customer revenue, founder resources and disciplined scope to fund progress. It preserves control but still requires an honest view of opportunity cost, runway and pace.', '', '', 1),
    ('c-finance-l-10-example', 'c-finance-l-10', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-10-activity', 'c-finance-l-10', 'activity', 'Put it into practice', 'List three ways to reduce cash need without reducing the learning you must achieve.', '', '', 3),
    ('c-finance-l-10-ai', 'c-finance-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-10-template', 'c-finance-l-10', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-finance-l-11-objective', 'c-finance-l-11', 'objective', 'Learning objective', 'Apply investor readiness to make a clear decision for your startup.', '', '', 0),
    ('c-finance-l-11-learn', 'c-finance-l-11', 'learn', 'Learn', 'Investors look for a coherent story supported by evidence: market, team, traction, economics, use of funds and risks. Readiness is not a polished deck without underlying answers.', '', '', 1),
    ('c-finance-l-11-example', 'c-finance-l-11', 'example', 'Example', 'The clinic product charges per location. Its model separates onboarding and support costs from recurring software revenue, then shows that a customer can look profitable on paper while delayed payments still create a cash-flow problem.', '', '', 2),
    ('c-finance-l-11-activity', 'c-finance-l-11', 'activity', 'Put it into practice', 'Create an investor-readiness checklist and mark the evidence you can show today.', '', '', 3),
    ('c-finance-l-11-ai', 'c-finance-l-11', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-finance-l-11-template', 'c-finance-l-11', 'template', '12-Month Financial Model template', 'Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Open My Venture', 5),
    ('c-launch-l-1-objective', 'c-launch-l-1', 'objective', 'Learning objective', 'Apply pre-launch planning to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-1-learn', 'c-launch-l-1', 'learn', 'Learn', 'Pre-launch aligns the audience, offer, promise, assets, operations and success measure before attention arrives. A launch plan should explain what happens when an interested customer says yes.', '', '', 1),
    ('c-launch-l-1-example', 'c-launch-l-1', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-1-activity', 'c-launch-l-1', 'activity', 'Put it into practice', 'Write a pre-launch checklist covering offer, audience, delivery capacity and measurement.', '', '', 3),
    ('c-launch-l-1-ai', 'c-launch-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-1-template', 'c-launch-l-1', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-2-objective', 'c-launch-l-2', 'objective', 'Learning objective', 'Apply building your launch strategy to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-2-learn', 'c-launch-l-2', 'learn', 'Learn', 'A launch strategy makes a deliberate choice about audience, moment, offer, channel and desired action. It prioritises the learning or revenue outcome that matters most now.', '', '', 1),
    ('c-launch-l-2-example', 'c-launch-l-2', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-2-activity', 'c-launch-l-2', 'activity', 'Put it into practice', 'Write your launch objective and the single customer action that will prove progress.', '', '', 3),
    ('c-launch-l-2-ai', 'c-launch-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-2-template', 'c-launch-l-2', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-3-objective', 'c-launch-l-3', 'objective', 'Learning objective', 'Apply launch assets to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-3-learn', 'c-launch-l-3', 'learn', 'Learn', 'Assets include the materials that let a customer understand, trust and act: message, demo, landing page, proof, FAQs, onboarding and support. Create only what supports the chosen action.', '', '', 1),
    ('c-launch-l-3-example', 'c-launch-l-3', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-3-activity', 'c-launch-l-3', 'activity', 'Put it into practice', 'List every launch asset and label it essential, useful later or unnecessary.', '', '', 3),
    ('c-launch-l-3-ai', 'c-launch-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-3-template', 'c-launch-l-3', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-4-objective', 'c-launch-l-4', 'objective', 'Learning objective', 'Apply landing page to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-4-learn', 'c-launch-l-4', 'learn', 'Learn', 'A landing page should make the audience, problem, promise, proof and next action easy to understand. It earns a conversion by reducing uncertainty, not by explaining every feature.', '', '', 1),
    ('c-launch-l-4-example', 'c-launch-l-4', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-4-activity', 'c-launch-l-4', 'activity', 'Put it into practice', 'Draft a landing-page outline with headline, problem, promise, proof, FAQs and one call to action.', '', '', 3),
    ('c-launch-l-4-ai', 'c-launch-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-4-template', 'c-launch-l-4', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-5-objective', 'c-launch-l-5', 'objective', 'Learning objective', 'Apply social launch to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-5-learn', 'c-launch-l-5', 'learn', 'Learn', 'Social launch works when it gives a defined audience a useful reason to pay attention and a clear action to take. Use customer language and proof instead of announcing that you are excited.', '', '', 1),
    ('c-launch-l-5-example', 'c-launch-l-5', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-5-activity', 'c-launch-l-5', 'activity', 'Put it into practice', 'Create three launch posts: problem insight, product proof and invitation.', '', '', 3),
    ('c-launch-l-5-ai', 'c-launch-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-5-template', 'c-launch-l-5', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-6-objective', 'c-launch-l-6', 'objective', 'Learning objective', 'Apply email launch to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-6-learn', 'c-launch-l-6', 'learn', 'Learn', 'Email launch lets you speak directly to people who have already granted permission. Segment the message, keep the promise clear and give each email one decision to make.', '', '', 1),
    ('c-launch-l-6-example', 'c-launch-l-6', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-6-activity', 'c-launch-l-6', 'activity', 'Put it into practice', 'Draft launch emails for an existing contact, a warm referral and a new lead.', '', '', 3),
    ('c-launch-l-6-ai', 'c-launch-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-6-template', 'c-launch-l-6', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-7-objective', 'c-launch-l-7', 'objective', 'Learning objective', 'Apply early customers to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-7-learn', 'c-launch-l-7', 'learn', 'Learn', 'Early customers are collaborators in learning, not a crowd to acquire at any cost. Set expectations, provide high-touch support and make the success criteria explicit.', '', '', 1),
    ('c-launch-l-7-example', 'c-launch-l-7', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-7-activity', 'c-launch-l-7', 'activity', 'Put it into practice', 'Create an early-customer pilot offer with scope, price, onboarding and success measures.', '', '', 3),
    ('c-launch-l-7-ai', 'c-launch-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-7-template', 'c-launch-l-7', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-8-objective', 'c-launch-l-8', 'objective', 'Learning objective', 'Apply collecting feedback to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-8-learn', 'c-launch-l-8', 'learn', 'Learn', 'Launch feedback should combine behaviour, outcomes and honest conversations. Build the collection method before launch so positive noise does not drown out the evidence you need.', '', '', 1),
    ('c-launch-l-8-example', 'c-launch-l-8', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-8-activity', 'c-launch-l-8', 'activity', 'Put it into practice', 'Set three feedback moments: onboarding, first value and two weeks after use.', '', '', 3),
    ('c-launch-l-8-ai', 'c-launch-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-8-template', 'c-launch-l-8', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-9-objective', 'c-launch-l-9', 'objective', 'Learning objective', 'Apply measuring launch performance to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-9-learn', 'c-launch-l-9', 'learn', 'Learn', 'Measure performance from reach to qualified action to delivery and retention. Select metrics that tell you which decision to make about message, channel, offer or product.', '', '', 1),
    ('c-launch-l-9-example', 'c-launch-l-9', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-9-activity', 'c-launch-l-9', 'activity', 'Put it into practice', 'Choose five launch metrics and define the threshold that triggers a change.', '', '', 3),
    ('c-launch-l-9-ai', 'c-launch-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-9-template', 'c-launch-l-9', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-launch-l-10-objective', 'c-launch-l-10', 'objective', 'Learning objective', 'Apply post-launch optimisation to make a clear decision for your startup.', '', '', 0),
    ('c-launch-l-10-learn', 'c-launch-l-10', 'learn', 'Learn', 'Post-launch work turns results into a clear decision: keep, improve, stop or repeat. Review the evidence with your original assumptions visible so the team learns rather than merely celebrates activity.', '', '', 1),
    ('c-launch-l-10-example', 'c-launch-l-10', 'example', 'Example', 'The clinic product launches to twenty qualified managers with a pilot offer, a simple landing page, a demo calendar and a concierge onboarding process. It measures booked pilots and successful first appointments, not social-media reach.', '', '', 2),
    ('c-launch-l-10-activity', 'c-launch-l-10', 'activity', 'Put it into practice', 'Run a post-launch review: what happened, why, what surprised you and what you will change next.', '', '', 3),
    ('c-launch-l-10-ai', 'c-launch-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-launch-l-10-template', 'c-launch-l-10', 'template', 'Launch Plan template', 'Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Open My Venture', 5),
    ('c-growth-l-1-objective', 'c-growth-l-1', 'objective', 'Learning objective', 'Apply understanding growth to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-1-learn', 'c-growth-l-1', 'learn', 'Learn', 'Growth is the repeated expansion of customer value and business capacity. It becomes dangerous when acquisition rises faster than retention, margin, support or operational quality.', '', '', 1),
    ('c-growth-l-1-example', 'c-growth-l-1', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-1-activity', 'c-growth-l-1', 'activity', 'Put it into practice', 'Write the condition that must be true before you deliberately accelerate growth.', '', '', 3),
    ('c-growth-l-1-ai', 'c-growth-l-1', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-1-template', 'c-growth-l-1', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-2-objective', 'c-growth-l-2', 'objective', 'Learning objective', 'Apply growth metrics to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-2-learn', 'c-growth-l-2', 'learn', 'Learn', 'Growth metrics connect customer behaviour to a business outcome. Choose a north-star measure that reflects delivered value, then supporting measures for acquisition, activation, retention, margin and capacity.', '', '', 1),
    ('c-growth-l-2-example', 'c-growth-l-2', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-2-activity', 'c-growth-l-2', 'activity', 'Put it into practice', 'Choose one north-star metric and four supporting measures. State the decision each informs.', '', '', 3),
    ('c-growth-l-2-ai', 'c-growth-l-2', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-2-template', 'c-growth-l-2', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-3-objective', 'c-growth-l-3', 'objective', 'Learning objective', 'Apply customer retention to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-3-learn', 'c-growth-l-3', 'learn', 'Learn', 'Retention measures whether customers continue to receive enough value to stay. Improve it by understanding activation, usage, outcomes, risk signals and the moments a customer decides to leave.', '', '', 1),
    ('c-growth-l-3-example', 'c-growth-l-3', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-3-activity', 'c-growth-l-3', 'activity', 'Put it into practice', 'Map your retention journey and identify the earliest signal that a customer is at risk.', '', '', 3),
    ('c-growth-l-3-ai', 'c-growth-l-3', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-3-template', 'c-growth-l-3', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-4-objective', 'c-growth-l-4', 'objective', 'Learning objective', 'Apply referral systems to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-4-learn', 'c-growth-l-4', 'learn', 'Learn', 'Referrals work when a satisfied customer has a natural moment, reason and easy path to introduce someone similar. Incentives can help, but they cannot create genuine value or trust.', '', '', 1),
    ('c-growth-l-4-example', 'c-growth-l-4', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-4-activity', 'c-growth-l-4', 'activity', 'Put it into practice', 'Design a referral loop with trigger, message, recipient, reward and measurement.', '', '', 3),
    ('c-growth-l-4-ai', 'c-growth-l-4', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-4-template', 'c-growth-l-4', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-5-objective', 'c-growth-l-5', 'objective', 'Learning objective', 'Apply automation to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-5-learn', 'c-growth-l-5', 'learn', 'Learn', 'Automation removes repeated low-judgement work and improves consistency when the underlying process is already understood. Automating a broken process simply produces errors faster.', '', '', 1),
    ('c-growth-l-5-example', 'c-growth-l-5', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-5-activity', 'c-growth-l-5', 'activity', 'Put it into practice', 'List five repeated processes. Choose one stable process to automate and one that still needs human learning.', '', '', 3),
    ('c-growth-l-5-ai', 'c-growth-l-5', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-5-template', 'c-growth-l-5', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-6-objective', 'c-growth-l-6', 'objective', 'Learning objective', 'Apply ai for business to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-6-learn', 'c-growth-l-6', 'learn', 'Learn', 'AI can help with research synthesis, drafting, support triage and internal workflows, but it needs defined inputs, review, privacy boundaries and evaluation. Use it to augment judgement, not manufacture customer evidence.', '', '', 1),
    ('c-growth-l-6-example', 'c-growth-l-6', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-6-activity', 'c-growth-l-6', 'activity', 'Put it into practice', 'Choose one AI use case, its expected benefit, a human reviewer and the harm you must prevent.', '', '', 3),
    ('c-growth-l-6-ai', 'c-growth-l-6', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-6-template', 'c-growth-l-6', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-7-objective', 'c-growth-l-7', 'objective', 'Learning objective', 'Apply operations to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-7-learn', 'c-growth-l-7', 'learn', 'Learn', 'Operations turn a growing business into dependable delivery through ownership, cadence, capacity planning and visible handoffs. The aim is consistency without losing the customer signal at the edge.', '', '', 1),
    ('c-growth-l-7-example', 'c-growth-l-7', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-7-activity', 'c-growth-l-7', 'activity', 'Put it into practice', 'Define the operating rhythm for weekly priorities, customer issues, metrics and decisions.', '', '', 3),
    ('c-growth-l-7-ai', 'c-growth-l-7', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-7-template', 'c-growth-l-7', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-8-objective', 'c-growth-l-8', 'objective', 'Learning objective', 'Apply hiring to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-8-learn', 'c-growth-l-8', 'learn', 'Learn', 'Hiring should solve a clear capacity or capability constraint, not just signal momentum. Define the outcome, level of ownership, success measures and support before opening a role.', '', '', 1),
    ('c-growth-l-8-example', 'c-growth-l-8', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-8-activity', 'c-growth-l-8', 'activity', 'Put it into practice', 'Write a role scorecard for your next hire: mission, outcomes, capabilities, first ninety days and interview evidence.', '', '', 3),
    ('c-growth-l-8-ai', 'c-growth-l-8', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-8-template', 'c-growth-l-8', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-9-objective', 'c-growth-l-9', 'objective', 'Learning objective', 'Apply systems & processes to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-9-learn', 'c-growth-l-9', 'learn', 'Learn', 'Systems make good work repeatable through a clear owner, trigger, steps, decision rights and review. Document the process that creates the most customer value before documenting every internal preference.', '', '', 1),
    ('c-growth-l-9-example', 'c-growth-l-9', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-9-activity', 'c-growth-l-9', 'activity', 'Put it into practice', 'Document one critical process so a capable new teammate can run it without you.', '', '', 3),
    ('c-growth-l-9-ai', 'c-growth-l-9', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-9-template', 'c-growth-l-9', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-growth-l-10-objective', 'c-growth-l-10', 'objective', 'Learning objective', 'Apply scaling responsibly to make a clear decision for your startup.', '', '', 0),
    ('c-growth-l-10-learn', 'c-growth-l-10', 'learn', 'Learn', 'Responsible scale preserves customer value, financial resilience, team health, security and compliance while capacity grows. Set explicit guardrails so growth decisions do not create damage that appears later.', '', '', 1),
    ('c-growth-l-10-example', 'c-growth-l-10', 'example', 'Example', 'The clinic startup grows only after pilot clinics renew and use cross-branch scheduling reliably. Its growth strategy adds a referral loop for clinic groups, automates routine reminders and keeps a human support path for failed booking workflows.', '', '', 2),
    ('c-growth-l-10-activity', 'c-growth-l-10', 'activity', 'Put it into practice', 'Write three scale guardrails: one for customers, one for cash and one for team or risk.', '', '', 3),
    ('c-growth-l-10-ai', 'c-growth-l-10', 'ai_activity', 'Phoxta AI activity', 'Open the Adviser with your draft. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence for you.', '/adviser', 'Open Adviser', 4),
    ('c-growth-l-10-template', 'c-growth-l-10', 'template', 'Growth Strategy template', 'Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Open My Venture', 5),
    ('c-opportunity-final-project', 'c-opportunity-final', 'activity', 'Build your Opportunity Brief', 'A concise case for the opportunity: the customer, problem, existing alternatives, evidence, assumptions and immediate validation plan.

Use this structure:
1. Customer
2. Problem and consequences
3. Current alternatives
4. Why now
5. Evidence gathered
6. Assumptions to test
7. Next validation step', '/venture', 'Save in My Venture', 0),
    ('c-market-final-project', 'c-market-final', 'activity', 'Build your Market Validation Report', 'A documented view of your market, segment, competitors, customer evidence, demand tests and the assumptions that still require validation.

Use this structure:
1. Market definition
2. TAM, SAM and reachable SOM
3. Primary segment
4. Competitors and alternatives
5. Customer evidence
6. Demand-test results
7. Risks and next test', '/venture', 'Save in My Venture', 0),
    ('c-business-model-final-project', 'c-business-model-final', 'activity', 'Build your Business Model Canvas', 'A complete, testable view of customer segments, value proposition, channels, relationships, revenues, resources, activities, partners and cost structure.

Use this structure:
Customer segments
Value proposition
Channels
Customer relationships
Revenue streams
Key resources
Key activities
Key partners
Cost structure
Three assumptions to test', '/venture', 'Save in My Venture', 0),
    ('c-brand-final-project', 'c-brand-final', 'activity', 'Build your Brand Strategy Document', 'A clear foundation for how your business is positioned, expressed and differentiated for its first customers.

Use this structure:
Purpose
Audience and persona
Positioning
Personality
Voice
Name rationale
Visual direction
Brand story
Differentiation proof', '/venture', 'Save in My Venture', 0),
    ('c-mvp-final-project', 'c-mvp-final', 'activity', 'Build your MVP Blueprint', 'A focused plan for your earliest user, core problem, workflow, must-have features, prototype approach, test and feedback loop.

Use this structure:
Core user
Core problem
Promise
User journey
Must-have features
Not-now features
Prototype/MVP format
Test plan
Feedback questions
Iteration decision', '/venture', 'Save in My Venture', 0),
    ('c-marketing-final-project', 'c-marketing-final', 'activity', 'Build your 90-Day Marketing Plan', 'A ninety-day plan with audience, positioning, message, channel experiments, content, campaign calendar, budget assumptions and review metrics.

Use this structure:
Audience
Positioning
Message pillars
Offer
Channel experiments
Content calendar
Campaign timeline
Budget
Metrics
Weekly review cadence', '/venture', 'Save in My Venture', 0),
    ('c-sales-final-project', 'c-sales-final', 'activity', 'Build your Customer Acquisition System', 'A documented sales motion covering your ideal customer, lead sources, qualification, funnel stages, outreach, discovery, proposal, closing and retention.

Use this structure:
Ideal customer
Lead sources
Qualification criteria
Funnel stages
Outreach sequence
Discovery questions
Offer and proposal
Objection responses
Closing process
Retention plan', '/venture', 'Save in My Venture', 0),
    ('c-finance-final-project', 'c-finance-final', 'activity', 'Build your 12-Month Financial Model', 'A twelve-month model with revenue assumptions, costs, gross margin, break-even, cash flow, scenarios, funding needs and investor-readiness notes.

Use this structure:
Revenue assumptions
Pricing
Variable costs
Fixed costs
Gross margin
Break-even
Cash-flow forecast
Base, upside and downside scenarios
Funding need
Investor-readiness gaps', '/venture', 'Save in My Venture', 0),
    ('c-launch-final-project', 'c-launch-final', 'activity', 'Build your Launch Plan', 'A complete pre-launch, launch-week and post-launch plan with offer, audience, assets, customer actions, feedback system and performance measures.

Use this structure:
Launch objective
Audience
Offer
Success measure
Assets
Landing page
Social and email plan
Early-customer plan
Feedback process
Post-launch review', '/venture', 'Save in My Venture', 0),
    ('c-growth-final-project', 'c-growth-final', 'activity', 'Build your Growth Strategy', 'A growth strategy covering your growth goal, metrics, retention, referrals, automation, operating capacity, team needs, systems and guardrails.

Use this structure:
Growth goal
North-star and supporting metrics
Retention plan
Referral loop
Automation opportunities
AI guardrails
Operating capacity
Hiring needs
Systems
Risks and scale guardrails', '/venture', 'Save in My Venture', 0)
  ) as v(id, lesson_id, type, title, content, action_href, action_label, sort)
  on conflict (organization_id, id) do update set
    lesson_id = excluded.lesson_id, type = excluded.type, title = excluded.title, content = excluded.content,
    action_href = excluded.action_href, action_label = excluded.action_label, sort = excluded.sort;

  insert into cs_quiz_questions (organization_id, id, lesson_id, prompt, options, answer, explanation, sort)
  select p_org, v.* from (values
    ('c-opportunity-q-1', 'c-opportunity-final', 'What turns an idea into a business opportunity?', '["A clever feature","A specific problem, customer, timing and feasible value exchange","A large social-media following","A detailed logo"]'::jsonb, 1, 'An opportunity must join a real customer problem to a feasible and sustainable value exchange.', 0),
    ('c-opportunity-q-2', 'c-opportunity-final', 'Which signal is strongest evidence of a customer problem?', '["They say the idea sounds useful","They have already spent time or money on a workaround","They follow similar brands","They ask to be notified someday"]'::jsonb, 1, 'Past effort or spend demonstrates a real current cost.', 1),
    ('c-opportunity-q-3', 'c-opportunity-final', 'A good pain statement includes...', '["Only the product feature","The user, their job, the obstacle and its consequence","A market-size figure","Your company mission"]'::jsonb, 1, 'The statement should make the struggle and cost observable before it proposes a solution.', 2),
    ('c-opportunity-q-4', 'c-opportunity-final', 'Problem-solution fit is best treated as...', '["Proof that you are ready to scale","A hypothesis to test with customers","A patent application","A pricing decision"]'::jsonb, 1, 'Fit begins as a claim that must face evidence.', 3),
    ('c-opportunity-q-5', 'c-opportunity-final', 'What should you do with a weak opportunity-assessment score?', '["Hide it from the plan","Turn it into a specific validation test","Raise more money","Add features"]'::jsonb, 1, 'A visible weak score directs the next piece of learning.', 4),
    ('c-market-q-1', 'c-market-final', 'SOM should represent...', '["Every potential customer worldwide","The first share of the market you can credibly reach","Only venture-backed companies","Your total revenue goal"]'::jsonb, 1, 'SOM is the reachable early portion of a market, not a wishful share.', 0),
    ('c-market-q-2', 'c-market-final', 'The most useful interview question asks about...', '["A recent time the customer faced the problem","What they might do in the future","Whether they like your logo","Which feature they want first"]'::jsonb, 0, 'Past behaviour is much more reliable than a prediction or a compliment.', 1),
    ('c-market-q-3', 'c-market-final', 'A demand test should ask for...', '["A meaningful action","A five-star rating","An investor introduction","A long survey only"]'::jsonb, 0, 'A real action reveals more than stated interest.', 2),
    ('c-market-q-4', 'c-market-final', 'Competitor research should include...', '["Only identical products","Direct competitors, substitutes and the current workaround","Only market leaders","Only local businesses"]'::jsonb, 1, 'The incumbent workflow is often the alternative you must beat.', 3),
    ('c-market-q-5', 'c-market-final', 'An assumption log is used to...', '["Make plans look cautious","Turn uncertainty into testable work","Avoid customer research","Calculate TAM"]'::jsonb, 1, 'The log makes the riskiest beliefs visible and actionable.', 4),
    ('c-business-model-q-1', 'c-business-model-final', 'A business model explains...', '["Only how a company earns revenue","How value is created, delivered and captured","The founder''s personal goals","The marketing calendar"]'::jsonb, 1, 'Revenue is one part of the connected system that makes a business work.', 0),
    ('c-business-model-q-2', 'c-business-model-final', 'When the user and buyer differ, a founder should...', '["Treat them as one segment","Design for both roles and their distinct needs","Only speak to the user","Only speak to the buyer"]'::jsonb, 1, 'Both roles influence adoption and payment.', 1),
    ('c-business-model-q-3', 'c-business-model-final', 'Channels belong in the model because...', '["They determine how customers find and buy value","They matter only after launch","They replace a value proposition","They are always free"]'::jsonb, 0, 'A model without a viable route to customers is incomplete.', 2),
    ('c-business-model-q-4', 'c-business-model-final', 'A key activity is...', '["Every internal task","A capability critical to delivering value, reach or economics","A team social event","Any task a founder enjoys"]'::jsonb, 1, 'Focus on what the model cannot do without.', 3),
    ('c-business-model-q-5', 'c-business-model-final', 'The best use of a Business Model Canvas is to...', '["Present certainty","Expose connected assumptions that need testing","Avoid financial planning","Choose a logo"]'::jsonb, 1, 'The canvas makes the model testable rather than merely descriptive.', 4),
    ('c-brand-q-1', 'c-brand-final', 'Brand is best understood as...', '["Only visual design","The meaning and expectation people attach to a business","A company registration","A social-media account"]'::jsonb, 1, 'Visual identity is one expression of the wider brand.', 0),
    ('c-brand-q-2', 'c-brand-final', 'A positioning statement should name...', '["Every possible customer","Audience, category, promise and alternative","Only a logo colour","The founder biography"]'::jsonb, 1, 'Positioning makes a deliberate choice about who and what you stand for.', 1),
    ('c-brand-q-3', 'c-brand-final', 'A useful persona is based on...', '["Research about goals, context and behaviour","A made-up lifestyle","Age alone","The founder''s preferences"]'::jsonb, 0, 'Personas should help decisions because they are grounded in evidence.', 2),
    ('c-brand-q-4', 'c-brand-final', 'Brand voice describes...', '["How personality sounds in language","The company legal structure","Only the product name","A price list"]'::jsonb, 0, 'Voice makes the brand recognisable across written interactions.', 3),
    ('c-brand-q-5', 'c-brand-final', 'A differentiator needs...', '["A catchy claim only","Relevance, credibility and proof","A larger budget","More social-media posts"]'::jsonb, 1, 'Customers must be able to see why the difference matters and believe it.', 4),
    ('c-mvp-q-1', 'c-mvp-final', 'The primary job of an MVP is to...', '["Include every planned feature","Deliver a core outcome and create learning","Look complete to investors","Replace future product work"]'::jsonb, 1, 'An MVP is a focused learning instrument for a real customer outcome.', 0),
    ('c-mvp-q-2', 'c-mvp-final', 'A feature belongs in an MVP when it...', '["Is easy to build","Is necessary for the core user to reach first value","Was requested by one friend","Makes the product look advanced"]'::jsonb, 1, 'Prioritise the core outcome over appearance or novelty.', 1),
    ('c-mvp-q-3', 'c-mvp-final', 'A useful user journey maps...', '["Only screens","Steps from trigger to value and repeat use","The engineering roadmap","Your competitors"]'::jsonb, 1, 'Journeys expose the friction around the product''s core task.', 2),
    ('c-mvp-q-4', 'c-mvp-final', 'No-code or manual delivery can be valid because...', '["Customers never need quality","It can test the value before full automation","It removes the need for research","It always costs nothing"]'::jsonb, 1, 'The early question is whether the outcome matters, not whether every backend process is automated.', 3),
    ('c-mvp-q-5', 'c-mvp-final', 'After an MVP test, an iteration should be based on...', '["The loudest opinion","Observed evidence and a clear hypothesis","A longer feature list","Competitor announcements"]'::jsonb, 1, 'Evidence-led iteration helps the team learn what changed the result.', 4),
    ('c-marketing-q-1', 'c-marketing-final', 'Go-to-market connects...', '["Only paid ads","Audience, offer, channel, conversion and value delivery","A brand logo and website","Competitor research only"]'::jsonb, 1, 'A GTM plan coordinates the full path to first value.', 0),
    ('c-marketing-q-2', 'c-marketing-final', 'A sensible early channel strategy is to...', '["Use every channel at once","Run a few focused experiments","Avoid direct customer contact","Choose channels by follower count"]'::jsonb, 1, 'Focused tests create faster learning about audience-channel fit.', 1),
    ('c-marketing-q-3', 'c-marketing-final', 'Message pillars should include...', '["Claims, proof and objections they answer","Only slogans","All product features","The founder''s CV"]'::jsonb, 0, 'Claims need credible proof and must address the questions buyers actually have.', 2),
    ('c-marketing-q-4', 'c-marketing-final', 'Paid advertising is most useful when...', '["The offer is still unclear","You have a message worth testing against qualified action","You need vanity metrics","You have no audience hypothesis"]'::jsonb, 1, 'Spend should accelerate learning, not hide a weak offer.', 3),
    ('c-marketing-q-5', 'c-marketing-final', 'A useful marketing metric should...', '["Always increase","Inform a decision about the plan","Measure impressions only","Be copied from another startup"]'::jsonb, 1, 'Metrics earn their place when they change what the team does next.', 4),
    ('c-sales-q-1', 'c-sales-final', 'Qualification is valuable because it...', '["Makes every prospect buy","Protects time by identifying fit, pain and buying path","Eliminates discovery","Lets you skip pricing"]'::jsonb, 1, 'Qualification helps both sides avoid a process that cannot create value.', 0),
    ('c-sales-q-2', 'c-sales-final', 'Discovery questions should focus on...', '["Past behaviour and consequences","Future promises only","Your feature list","Competitor rumours"]'::jsonb, 0, 'Specific past events reveal real context and cost.', 1),
    ('c-sales-q-3', 'c-sales-final', 'The best solution presentation...', '["Covers every feature","Connects the customer''s problem to a relevant outcome and proof","Avoids questions","Begins with the company history"]'::jsonb, 1, 'A presentation should answer the decision the customer is making.', 2),
    ('c-sales-q-4', 'c-sales-final', 'When an objection arises, first...', '["Offer a discount","Clarify the risk or concern behind it","End the call","Add more features"]'::jsonb, 1, 'The same words can hide different concerns about timing, value, authority or risk.', 3),
    ('c-sales-q-5', 'c-sales-final', 'Retention begins...', '["At renewal time","With the promise made and first value delivered","After a complaint","When marketing sends a newsletter"]'::jsonb, 1, 'What happens immediately after the sale determines whether customers stay.', 4),
    ('c-finance-q-1', 'c-finance-final', 'Gross margin measures...', '["Revenue after direct delivery costs","Cash in the bank","All operating profit","Market share"]'::jsonb, 0, 'Gross margin shows whether serving additional customers creates contribution.', 0),
    ('c-finance-q-2', 'c-finance-final', 'A profitable business can run out of cash when...', '["Cash timing and working capital absorb money","It has no customers","Its logo is weak","It calculates margin"]'::jsonb, 0, 'Profit and cash are related but not the same measure.', 1),
    ('c-finance-q-3', 'c-finance-final', 'Break-even helps a founder understand...', '["The sales volume needed to cover fixed costs","The company valuation","Only tax due","A competitor''s price"]'::jsonb, 0, 'It links contribution per sale to the fixed-cost base.', 2),
    ('c-finance-q-4', 'c-finance-final', 'A useful forecast includes...', '["One optimistic number","Base, upside and downside assumptions","Only historic revenue","No cash timing"]'::jsonb, 1, 'Scenarios make the risks and choices visible.', 3),
    ('c-finance-q-5', 'c-finance-final', 'Funding should be matched to...', '["A vague desire to grow","A specific milestone, business model and risk","The largest available cheque","A competitor announcement"]'::jsonb, 1, 'The source and terms must fit what the money is meant to achieve.', 4),
    ('c-launch-q-1', 'c-launch-final', 'A launch is best understood as...', '["One announcement","A coordinated period of offer, delivery and learning","A finished product","A social-media campaign only"]'::jsonb, 1, 'The work continues through customer delivery and review.', 0),
    ('c-launch-q-2', 'c-launch-final', 'A landing page should primarily help a visitor...', '["Read every feature","Understand the promise, proof and next action","Meet the whole team","See every brand colour"]'::jsonb, 1, 'A focused page reduces uncertainty around one meaningful action.', 1),
    ('c-launch-q-3', 'c-launch-final', 'Early customers should be treated as...', '["A crowd to acquire at any cost","Collaborators in a clear learning and delivery process","Free testers with no support","Proof that research can stop"]'::jsonb, 1, 'Their experience and outcomes teach the team what to improve.', 2),
    ('c-launch-q-4', 'c-launch-final', 'Launch feedback should include...', '["Only positive comments","Behaviour, outcomes and conversations","Only social engagement","Only feature requests"]'::jsonb, 1, 'Different evidence types reveal different parts of the customer experience.', 3),
    ('c-launch-q-5', 'c-launch-final', 'A post-launch review should lead to...', '["More activity without changes","A decision to keep, improve, stop or repeat","A bigger logo","Ignoring original assumptions"]'::jsonb, 1, 'The purpose is a better next experiment or operating decision.', 4),
    ('c-growth-q-1', 'c-growth-final', 'Sustainable growth requires...', '["Acquisition alone","Customer value, retention, economics and operating capacity","A larger team only","More marketing posts"]'::jsonb, 1, 'Growth that breaks retention, margin or delivery is not durable.', 0),
    ('c-growth-q-2', 'c-growth-final', 'A north-star metric should reflect...', '["A vanity number","The customer value your business consistently delivers","Only employee activity","A competitor benchmark"]'::jsonb, 1, 'It is paired with supporting measures that explain how value is created.', 1),
    ('c-growth-q-3', 'c-growth-final', 'Automation should be applied first to...', '["A process nobody understands","Stable repeated work with clear rules","Every customer conversation","High-risk decisions without review"]'::jsonb, 1, 'Automating an unstable process scales the confusion.', 2),
    ('c-growth-q-4', 'c-growth-final', 'A responsible AI use case needs...', '["No human oversight","Defined inputs, review, privacy boundaries and evaluation","Only a prompt","Access to every data source"]'::jsonb, 1, 'Useful AI work must be accountable and safe in its real operating context.', 3),
    ('c-growth-q-5', 'c-growth-final', 'Scale guardrails help a founder...', '["Avoid all growth","Protect customer value, cash and risk while expanding","Hide problems","Replace operating metrics"]'::jsonb, 1, 'Guardrails make the cost of growth visible before it becomes damage.', 4)
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
