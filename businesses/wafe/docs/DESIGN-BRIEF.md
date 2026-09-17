# Wàfè — Design Brief & Product Requirements

**Integrated Family, Growth & Life Management**
*Version 1.0 · Full-capacity build · For the design and engineering team*

---

## 1. Vision & promise

Wàfè exists for what matters most — our love, our family, our legacy. It is a private family operating system that turns a household's values and goals into everyday actions: one place to plan, learn, grow, manage the home, and create together.

**The promise, in one sentence:** *Wàfè helps families turn the life they imagine into the life they live.*

Families today run their lives across WhatsApp, YouTube, Notion, Google Calendar, Notes, spreadsheets, Pinterest, fitness apps and a pile of PDFs. The cost is not just clutter; it is loss of sight. Nobody can answer, in one glance, *what are we building, what happens today, and how are we doing?* Wàfè answers those questions every morning and closes the day with a reflection every evening.

**Why it wins.** Competing products are either a single-purpose tool (a chore app, a budget app, a Bible app) or a general workspace with no opinion about family life. Wàfè combines three things no competitor does: (1) **connection** — every task, lesson, prayer, purchase and trip can trace back to a family value or goal, so effort is never orphaned; (2) **rituals** — a morning briefing, an evening check-in and a Sunday planning screen that make the product a daily habit rather than a filing cabinet; (3) **a companion, not a chatbot** — an AI that already knows the family's goals, calendar, budget, reading and prayers, and speaks in context from inside every module.

**The product is not "an app that does everything."** It is a daily family command centre that connects what matters (values, vision, goals) to what the family actually does. Nothing is deferred: all four pillars — Grow, Execute, Live, Create — plus Family (members, relatives, friends, communities, mentors) ship in this build at full capacity.

**What "done" looks like for a family.** A family is *set up* when they have a space, at least two members with roles, a written set of values, one goal with milestones, and one task each due today. A family is *living in Wàfè* when, on any given morning, a parent can answer from Home alone: *What do we need to do today? What are we learning? What are our current family goals? What is happening this week? What needs my attention? What are we spending? What should I prepare for?* — and a child can answer: *What are my lessons, chores and memory verse, and how am I doing?* These two definitions are the activation metric (§13) and the acceptance bar for Home (§5.1).

*For today. For tomorrow. For generations.*

---

## 2. Principles

1. **Values first, features second.** Every screen traces a line back to the family's blueprint (values → vision → plans → daily actions → growth). Values are first-class tags: tasks show which goal and value they serve; goals show which value they express.
2. **Private by default, shared on purpose.** Every record carries a visibility level and a sensitivity class. A child never sees something merely because they belong to the family; access is a function of role, age band and sensitivity. Guests are granted named objects, never modules.
3. **The loop is the product.** Morning briefing → do → evening check-in → Sunday planning. Everything else exists to make that loop richer.
4. **AI is a companion, not a chatbot.** It lives inside the modules, is grounded only in the family's own data the asking member may see, proposes rather than acts, and always shows its sources.
5. **The companion never asks for context the app already holds.** If the family has told Wàfè something, the companion knows it. If it cannot see something, it says so.
6. **Children get a real product, not a locked-down one.** Child mode is gamified, warm and age-appropriate — a first-class surface with its own feed, garden and rewards.
7. **Rituals over streaks.** Streaks rest on grace days, nothing shames, no sibling leaderboard by default, no loss-aversion mechanics. Celebrations are written to the family timeline.
8. **Calm, not noisy.** Follow-ups are gentle, capped at three reminders, respect quiet hours (defer, never drop) and collapse into a digest when the day gets loud.
9. **Faith is woven, not bolted on.** Scripture, prayer and giving sit in the daily rhythm and in the ledger, not in a separate corner.
10. **Lived-in from the first minute.** A new space can start from the demo family so every screen shows what "good" looks like; onboarding delivers value before configuration.

---

## 3. Who it is for

**Demo family used throughout: the Adeyemi family, Croydon, South London.** British-Nigerian, three children, church at the centre, relatives across London, Manchester and Ibadan.

**Ifeoluwa Adeyemi — Parent / Head of Household (space owner), 41.** Runs a small brand consultancy from home and home-educates the two younger children three mornings a week. Keeps the family's finances and vision. Judges Wàfè by: *can I see today, this week and our goals in under a minute?*

**Oluwafemi Adeyemi — Parent (co-admin), 44.** Product manager at a fintech in Canary Wharf; leads family Bible study, rides with Addiscombe Cycling Club and is organising Christmas in Lagos. Uses Wàfè on his phone at 06:30 and 21:00. Judges it by: *does the briefing tell me what needs me, and does Sunday planning take 25 minutes?*

**Children, by age band.** Age band drives layout, copy, content filters and reward mechanics. Parents set the band; it is never inferred.

| Band | Member | Can do | Looks like |
|---|---|---|---|
| **Little (4–6)** | Ayo, 5 (Reception) | Tap-to-complete chores and memory verses read aloud; picture-only lessons; no text input; no AI free text | Parent-launched session (no PIN); big tiles, icon + one word; max 6 tiles |
| **Junior (7–10)** | Tobi, 9 (Year 5, home-educated) | Assigned lessons, chores, habits; earns Sprouts; creative studio via prompt-picker | Simplified nav: Today · Learn · Do · Create · My Garden; PIN login; 18 px type |
| **Teen (11–14)** | — | Own habits, reading plans, private prayer list, moodboards; free-text companion with child-safety classifier | Full child layout with personal Me goals; sensitive modules hidden |
| **Young adult (15–17)** | Dami, 15 (Year 11, GCSEs) | Everything Teen plus own credentials, edit rights on own calendar events, projects, and a parent-granted personal budget envelope in Finance | Near-parent layout with explicit per-module grants |

Common child truths: they never see finances (beyond their own envelope), health notes, documents, other members' private prayers, parents' goals unless shared, or Family settings. Family goals appear to them as a child-safe summary ("We're saving for our own home"), never amounts.

**Mama Fọláké — Guest / Relative, 68.** Grandmother in Ibadan, hosting the Christmas trip. Granted: the prayer wall, the *Christmas in Lagos* trip, two shared albums, and the calendar events she is tagged on. Nothing else exists for her at the API.

**Pastor Dayo — Mentor guest.** Leads at Grace Chapel, Thornton Heath. Sees the mentor sessions he is part of and the notes explicitly shared with him.

**The Okonkwos (Bromley) — Friend guests.** View + pin on *Tobi's 10th birthday* board only.

Secondary: **couples without children** (Me / Us scopes with Family empty), **single parents**, and **multi-generational households**.

---

## 4. The loop & rituals

**Values → Vision → Plans → Daily actions → Family growth.** Four rituals, each with a screen, a time and a host.

| Ritual | When | Surface | What happens |
|---|---|---|---|
| **Morning briefing** | first open of the day, or 06:30 push | Home | AI synthesises today's scripture, events, due tasks, lessons, budget alerts (parents), weather (if location set) and one encouragement grounded in the family's goals. Falls back to a template if AI is unavailable. |
| **Do** | all day | every module | Tasks, chores, lessons, habits, prayers, purchases, pins. |
| **Evening check-in** | 20:30 prompt, closes 23:59 | Home | Three taps with side effects: *How was today?* (mood, 1–5 hearts), *What are we grateful for?* (one line, plus an optional prayer), *What's unfinished?* — each open task is rescheduled, delegated or dropped from the check-in itself. Parents see the family's combined reflection. |
| **Sunday planning** | Sunday 18:00 by default; 25 minutes by design | Home → This week | One orchestrated screen: review goals and OKRs → drag next week's tasks and chores (rota applied) → confirm the calendar → set the meal plan and grocery list priced against the food budget → approve purchases → assign learning → set three priorities. Produces a saved `weekly_reviews` record and next week's **Week focus** card on Home. |
| **Celebrate** | on goal completion, answered prayer, badge, milestone | Memories | Auto-drafted memory card with photo prompt; the moment is written to the family timeline. |

Plus a **quarterly review** (OKR roll-up, celebrate completed goals, re-plan) and an **annual blueprint** refresh; a December **"Our year"** reel is auto-drafted.

Children have a matching micro-loop: **Today (see) → Do (complete) → My Garden (grow) → Show (share with a parent).**

Core user flows retained from the client brief: **Family setup** (sign up → create space → add members → assign roles → set goals or load demo → dashboard), **Create a family goal** (goal → milestones → tasks → progress), **Turn content into learning** (add video/book → AI lesson → curriculum → members complete), **Daily management** (briefing → tasks → events → learning → goal update → check-in).

---

## 5. Product structure

Navigation: **Home · Grow · Execute · Live · Create · Family.** Routes are `/<area>/<module>`. Each module specifies purpose, capabilities, acceptance criteria (AC — "done" means every AC passes), permissions (**P** parent, **C** child, **G** guest), AI hooks and demo content. Module ids match the engineering plan; the machine-readable spec expands every AC list.

### 5.0 Demo family (used in every module)

**The Adeyemi family — Croydon.** Parents Ifeoluwa (owner) and Oluwafemi; children Dami (15, Young adult band), Tobi (9, Junior), Ayo (5, Little); relatives Mama Fọláké (Ibadan), Uncle Seun (Manchester), Aunty Bisi (Lagos); mentor Pastor Dayo; friends the Okonkwos; communities Grace Chapel, Croydon Home-Ed Co-op, Addiscombe Cycling Club. Values: *Faith · Love · Diligence · Generosity · Joy.* Mission: *"To raise a family that loves God, loves people and builds things that last."* Season: September 2026 — new school year (Dami's GCSE year); Christmas in Lagos 19 Dec–3 Jan being planned; saving for a first home. Currency GBP, time zone Europe/London.

---

### 5.1 `home` — Home (dashboards, briefing, check-in, attention)

**Purpose.** The family's command centre. Answers the seven parent questions and the child's three (§1) with no navigation.

**Capabilities.** Role-specific dashboards (§6); AI briefing card with "read aloud" and regenerate; three-tap evening check-in with inline task triage; **Needs attention** panel (overdue past three reminders, pending approvals, unanswered invitations, budget breaches, deadlines ≤ 48 h, passport/document expiry, unreviewed memory verses); **Week focus** card (three priorities from the last Sunday planning); family strip with presence and today's completion %; **On this day** across past years; quick-add (`Q`: task, event, prayer, expense, pin); greeting by time of day and member name.

**AC.** Parent Home renders all widgets in §6 in ≤ 1.5 s on cached data and answers all seven questions without navigation. Briefing generates once per member per day, is cached, shows its sources and falls back to a template when AI is unavailable. Check-in writes one row per member per day; rescheduling a task from the check-in updates its due date, delegating reassigns it, dropping archives it with reason "dropped at check-in". Attention items deep-link to their record. Nothing on a child's Home originates from a record the child is not granted. Empty states show a demo-load or a single next action, never a blank card.

**Permissions.** P full · C child dashboard only · G guest dashboard (granted objects only).

**AI hooks.** Briefing; "what needs me today?"; "prepare me for tomorrow"; check-in summariser.

**Demo.** Wednesday 9 September: 3 tasks due (buy Tobi's PE kit, submit Dami's options form, pay energy bill), 2 events (co-op 09:30, Bible study 19:30), lesson "Habits of the Household — week 2", verse Proverbs 22:6, groceries at 82 % of budget, approval pending: laptop for Dami; Week focus: "Settle the school rhythm · Book Lagos flights · Finish kitchen quotes".

---

### 5.2 `notifications` — Notification centre & follow-up engine

**Purpose.** One calm inbox for everything that needs a person, and the rules engine that produces gentle, timely nudges (§11).

**Capabilities.** Unified list grouped Today / Earlier; filters by module and member; mark read / snooze (1 h, tonight, tomorrow, next week) / act inline (complete, approve, RSVP); per-member channel preferences (in-app, email, web push), quiet hours and **per-category mute**; **digest mode** (single 18:00 email) that also engages automatically when a member would receive more than five nudges in a day; parent view of a child's notifications; rules editable by parents as data.

**AC.** Every rule in §11 has a scheduled job and an idempotency key `(rule, record, member, window)`. Overdue nudges stop after three reminders and the item moves to Needs attention. Quiet hours defer delivery to the next window, never drop. Digest replaces individual nudges above five per day. No notification is delivered for a record the recipient cannot read. Children receive in-app only. Snooze re-surfaces on time; unread count updates in real time.

**Permissions.** P own + children's, edits rules · C own (in-app) · G own, from granted objects only.

**AI hooks.** "Summarise what I missed"; nudge copy is templated, with an AI warm rewrite in the family's tone for the morning digest only.

**Demo.** 7 unread: "Return library books" parked in Needs attention after three reminders, packing list ready for Lagos, Mama Fọláké added a prayer request, Dami earned "Verse Master", groceries 82 %, laptop approval pending, mentor session Friday.

---

### 5.3 `family` — Family space, members, roles, permissions, values, settings

**Purpose.** The tenant and the trust boundary: who is in the family, what each person may see and do, and what the family stands for.

**Capabilities.** Space profile (name, photo, motto, locale, currency, time zone, week start); members with role (parent / child / guest), child age band (Little, Junior, Teen, Young adult), avatar, birthday, colour; invitations by email or link with role preset and 7-day expiry; **per-member module permissions** overriding band defaults; **object shares** (grant a guest a trip, board, course or the wall); child mode with **parent-PIN exit**; rhythms (briefing hour, check-in hour, planning day, grace days, purchase approval threshold); family **values** (max 7, each with a one-line meaning) and mission, mirrored in Goals and usable as tags everywhere; settings: notification defaults, AI plan and usage meter, data export, delete space; audit log.

**AC.** Only parents change roles, permissions or shares; a space always has ≥ 1 parent. Changing a child's age band updates default permissions without overwriting explicit overrides. Permission changes take effect on the next request and are audited. Exiting child mode requires a parent PIN. Removing a member revokes access within one request, reassigns their tasks to the owner and preserves history. Values appear as filter chips in Goals, Tasks and Bible. Export produces a ZIP of JSON + media.

**Permissions.** P full · C own profile card (avatar, colour) · G own profile.

**AI hooks.** "Draft our mission from these values"; recommended permission profile when adding a child.

**Demo.** As §5.0; Oluwafemi co-admin; Dami Young adult with £25/month envelope; Tobi Junior with prompt-picker; Ayo Little, parent-launched; grace day Sunday; approval threshold £250.

---

### 5.4 `people` — Relatives, friends, communities, mentors

**Purpose.** The family's relational world — the people and groups the family loves, learns from and serves.

**Capabilities.** **Directory** of relatives and friends (relationship, photo, birthdays, anniversaries, address, phone, notes, prayer needs, gift ideas, last contacted, linked guest account); **Communities** (church, co-op, club) with meeting rhythm, roles held, contacts, linked events, giving commitments; **Mentors** (member or guest) with **sessions** — date, participants, agenda, notes, follow-up tasks, "ask before next session"; **stay-in-touch cadence** per person; convert any contact into a scoped guest invitation.

**AC.** Birthdays and anniversaries create calendar entries and reminders (7 d, 1 d) with a drafted message. Overdue cadence appears in Needs attention. Mentor session notes default *Private* to the parent who wrote them. A mentor guest sees only their sessions and explicitly shared notes. Children see relatives' names and photos only, never contact details. Gift ideas push to the purchase pipeline.

**Permissions.** P full · C names, photos, birthdays · G own record and communities marked shared.

**AI hooks.** "Who haven't we called this month?"; "prepare me for my session with Pastor Dayo"; birthday message drafts.

**Demo.** 14 people, 3 communities, Pastor Dayo with 2 past sessions ("Leading family devotions", "Budgeting with generosity") and one Friday.

---

### 5.5 `learning` — Learning Hub (Grow)

**Purpose.** Transform passive YouTube watching into structured, shared learning.

**Capabilities.** Video importer (URL → title, channel, thumbnail, duration via oEmbed); personal and family playlists; YouTube IFrame player; **transcript** from public captions, else AI works from title + description + user notes and labels it so; AI summary → takeaways, action items (one tap → Tasks), discussion prompts, suggested band; **timestamped notes** (press `N` while playing to capture the current time; clicking a note seeks within ± 1 s); learning plans (ordered items, cadence, assignees, value tag); completion per member; child-safe flag required before a video appears in a child feed; the companion suggests next videos **only from saved items**, never open YouTube; children never free-browse.

**AC.** Import from any public URL in ≤ 3 s. Transcript source labelled. Completion requires ≥ 80 % watched (IFrame progress) or a parent mark. Notes persist and seek correctly. Completing an item updates plan progress and Sprouts. Playlists carry visibility.

**Permissions.** P full · C assigned playlists and child-safe videos only · G none.

**AI hooks.** Summarise; "turn this playlist into a 3-week plan"; "discussion prompts for a 9-year-old".

**Demo.** Family playlist "Money & Generosity" (5), Dami's "GCSE Physics" (8), Oluwafemi's "Cycling training" (private, 6), 2 plans in progress.

---

### 5.6 `books` — Library & Book-to-Course (Grow)

**Purpose.** Turn books into courses the family actually finishes.

**Capabilities.** Reading list (format, owner, status, progress, rating, notes); reading plans (pages/day, assignees, end date); **AI Book-to-Course**: from title (+ optional TOC) generate a 4-week curriculum — weekly chapter assignments, discussion questions, 5-question reflection quiz with key, family activity; enrolment and progress per member; quiz attempts; export course to Curricula.

**AC.** Course generated in ≤ 20 s and editable before publishing; unavailable AI shows a plan/usage message and leaves manual authoring intact. Completing all week items marks the week done. Quizzes store score and answers. Linked goal progress reflects reading progress.

**Permissions.** P full · C assigned books/courses · G a course explicitly shared (mentor-led).

**AI hooks.** Course generation; "summarise chapter 3 for the children"; "what did we say we'd change after week 1?".

**Demo.** 12 books; *Habits of the Household* week 2 of 4 (Dami, Tobi enrolled; Dami quiz 4/5); Ifeoluwa reading *Atomic Habits* (private).

---

### 5.7 `bible` — Bible, prayer & discipleship (Grow)

**Purpose.** Anchor daily family life in spiritual discipline and structured theology.

**Capabilities.** Pre-loaded and custom studies with sessions (passage, text/audio link, questions, prayer focus); topical studies; reading plans with daily passages (public-domain translation stored locally, links to preferred translation); **daily scripture** for the briefing; **memory verse cards** with spaced repetition (1-3-7-14-30) and hide-words practice; **prayer wall** (family + granted guests) with tags, "I prayed" reactions, **answered archive** with testimony; **private prayer lists** (sensitivity Private); value chips; guest-only card **"How to pray for us this week"**.

**AC.** Due cards surface on dashboards. Private prayers never appear on any wall, briefing or AI answer for anyone but the owner. Moving a prayer to Answered records the date, keeps the thread and writes a timeline event. Guests post only if granted. Session completion counts toward curricula and Sprouts.

**Permissions.** P full · C assigned studies, wall (child-safe tags), own verses and private list · G wall if granted, own requests.

**AI hooks.** "Explain this passage for a 9-year-old"; study from a passage; weekly wall summary for Sunday planning.

**Demo.** Plan "Proverbs in September" day 9; Dami 6 verses (2 due), Tobi 3, Ayo 1; wall 11 open / 27 answered (latest: "Uncle Seun's new job — answered 2 Sept").

---

### 5.8 `curricula` — Children's curricula (Grow)

**Purpose.** Manage home-education subjects, school support, character development and milestone tracks; feed the child dashboard.

**Capabilities.** Subjects per child with units and **assignments** (due, instructions, attachments, linked video/book/study, Sprouts); status assigned → submitted → graded; **grades** (numeric/letter, rubric, comment) with term reports; **skill badges** named for virtues and skills; **developmental milestones** by band with dates and photos; **character tracks** (one virtue per month tied to a family value, daily micro-challenges); **child feed** ordering today's assignments, chores, verse, habits, lesson, creative activity.

**AC.** Assignments due today are in the feed by 06:00. Grading updates the term average instantly. Badges animate and write to the timeline. Term report exports to PDF. A character challenge adds Sprouts and a reflection entry. Little band feed has no text input.

**Permissions.** P full · C own feed, submit, own grades if parents allow · G none.

**AI hooks.** Unit from a topic; rubric; monthly character track from a value; "how is Tobi doing in Maths?".

**Demo.** Dami: 8 GCSE subjects, 4 assignments this week, average 78 %, 7 badges. Tobi: 5 subjects, "Reading fluency" 70 %. Ayo: 3 picture subjects. September track: *Diligence*.

---

### 5.9 `tasks` — Tasks & chores (Execute)

**Purpose.** Everything the family must do, in the view each person prefers.

**Capabilities.** List, Kanban (To do / Doing / Done / Waiting), calendar views; fields: title, notes, assignees, due, priority, scope (Me/Us/Family), goal/milestone, project, value tag, checklist, attachments; recurring rules (RRULE); **chores** with Sprouts and optional photo proof; **chore rota** rotating a chore among children weekly; **rewards catalogue** (screen time, outing, pocket money) redeemable with Sprouts, parent-approved; overdue view; bulk assign; quick-add `Q`; value and goal filter chips; "link to a goal" affordance on orphaned tasks.

**AC.** Recurring tasks generate the next instance on completion. Rota reassigns on the planning day. Completing a chore credits Sprouts immediately with a celebration in child mode. Sprouts ledger is auditable. Kanban order persists. Milestone-linked tasks update progress. Approved purchases arrive as "Buy X" tasks.

**Permissions.** P full · C assigned tasks and chores; own Me tasks · G tasks assigned to them (e.g. trip prep).

**AI hooks.** "Suggest tasks for this goal"; "balance this week's chores"; notes → tasks.

**Demo.** 38 open tasks; rota "Empty dishwasher" Dami ↔ Tobi weekly; Tobi "Feed Bella" (10 Sprouts); Ayo "Tidy shoes" (5); reward: Saturday cinema (150).

---

### 5.10 `goals` — Vision blueprint, goals & OKR roadmap (Execute)

**Purpose.** Align personal and family actions with long-term vision.

**Capabilities.** **Blueprint**: values, mission, vision, 1-, 3-, 5-year goals by life area (Faith, Family, Home, Finance, Learning, Health, Work, Community), versioned; **Goals** (scope, owner, area, value, target date, progress mode: milestone-count / manual / linked metric) with milestones and linked tasks; **child-safe summary** field shown to children instead of the title; **quarterly OKRs**; **roadmap timeline** (quarters × areas); roll-up "Our Future 68 %"; **Celebrate** archive with shareable card; Sunday planning review panel; value filter chips.

**AC.** Progress is computed when milestones or metrics are linked. Any goal reachable in ≤ 2 clicks on the timeline. Last milestone prompts a celebration that writes to the timeline. Children see Family goals only as the child-safe summary, never amounts. Me goals private unless shared. Connection metrics (% tasks linked to a goal, % goals with milestones) computed nightly.

**Permissions.** P full · C Family goals as summaries; full on own Me goals · G none.

**AI hooks.** "Break this goal into milestones and tasks"; quarterly review draft; "which goals are stalling?".

**Demo.** *Prepare children for the new school year* (supplies 60 %), *Save a home deposit* (54 %, linked to Finance; child summary "We're saving for our own home"), *Read 4 books together* (2/4). Q3 OKR "Settle the new school rhythm".

---

### 5.11 `projects` — Projects & research vault (Execute)

**Purpose.** Bigger pieces of work with their boards, research and decisions together.

**Capabilities.** Projects (status, owner, members, board, timeline, Finance category, documents); **Research vault**: web clips (server-side readable snapshot), rich-text notes canvas, tags, folders, **comparison tables** (options × weighted criteria → ranking); **decision record** ("we chose X because…", date, who); links to goals and purchases.

**AC.** Clipping stores a readable snapshot. Scores recompute live. Board tasks are the same rows as Tasks. A decision record can be created from a comparison and is shown on the project header. Archive is read-only.

**Permissions.** P full · C member projects (child-safe); Young adult may own projects · G explicitly shared projects (view).

**AI hooks.** "Summarise this folder"; "compare these three schools"; project plan draft.

**Demo.** *Kitchen refresh* (£6,500, 14 tasks, decision "chose local joiner because…"), *Sixth-form search* (3 options, 9 clips), *Tobi's science fair* (Tobi member).

---

### 5.12 `calendar` — Family calendar (Execute)

**Purpose.** What is happening, for whom, when.

**Capabilities.** Day/week/month/agenda; events with members, location, colour, recurrence, reminders; overlays from tasks, milestones, assignments, bills, trips, birthdays (real data, toggleable); member filters; RSVP for guests; ICS per member and space; conflict warnings; "this week" widget; Sunday planning confirmation panel.

**AC.** Overlays are live references, not copies. ICS updates within 5 minutes. A child sees own + family events; a Young adult can edit own events. Guests see invited events only.

**Permissions.** P full · C view own + family; create own; Young adult edits own · G invited; RSVP.

**AI hooks.** "What's on this weekend?"; "find an evening this week for all five of us".

**Demo.** Co-op Tue/Thu, Bible study Wed, Grace Chapel Sun, Tobi's swimming Sat, Dami's mocks 5–9 Oct, Lagos 19 Dec–3 Jan.

---

### 5.13 `finance` — Household finances, budget, purchases & giving (Live)

**Purpose.** Know what we earn, spend, give and save — and decide together on big purchases.

**Capabilities.** **Ledger** (date, amount, currency, category, account, member, value tag, note, receipt); accounts; **categories** with monthly budgets (Tithe & Giving, Groceries, School, Housing, Utilities, Transport, Health, Savings, Fun); **recurring bills** with paid state; **alerts** at 80 % and 100 %; savings goals linked to Goals; **Purchase pipeline**: wish (name, link, price, requester, reason) → approval (approve / defer / decline with comment; **both parents above the threshold**) → planned month → bought (writes ledger entry, closes wish); approving creates a "Buy X" task for the chosen member; children request via a simplified form and see their own wish status on their dashboard; **Giving record** with recipients from People/Communities and annual % of income; **personal budget envelope** for Young adults; food budget exposed to Wellness; CSV import/export.

**AC.** Alerts fire once per category per threshold per month. Purchases above threshold need two distinct parent approvals. "Bought" writes the ledger entry. Giving summary equals giving-tagged entries. Finance is invisible to children and guests at the API (sensitivity Financial) except a Young adult's own envelope. Finance writes require re-auth after 15 minutes idle on shared devices.

**Permissions.** P full · C wish request; own envelope (Young adult) · G none.

**AI hooks.** "Where are we against budget?"; "what can we cut to reach the deposit by June?"; classify a receipt.

**Demo.** September budget £4,200; tithe 10 %; groceries £620 (82 %); bills: mortgage, energy (12th), broadband, council tax; pipeline: laptop £520 (pending both), fridge (deferred to November); giving YTD 11.4 %; Dami envelope £25, £11 left.

---

### 5.14 `travel` — Travel & holiday planner (Live)

**Purpose.** Plan trips well and arrive prepared.

**Capabilities.** Trips (destination, dates, travellers incl. guests, budget, value tag, status); **itinerary** by day with slots, map links, notes, cost; **bookings & documents** (sensitivity Documents; passport expiry check; 90/30-day expiry reminders); **packing lists per member** from templates, pulling wardrobe capsules; **pre-trip checklist** T-14/7/3/1; trip expenses to the ledger; album auto-created on return.

**AC.** Packing lists generate at T-14. A guest traveller sees the itinerary and their own list. Passport within 6 months of travel raises attention. Documents never reach a child or guest. Itinerary exports to PDF. Packing list readable offline.

**Permissions.** P full · C own trips; tick own list · G granted trips; own list.

**AI hooks.** "What do we need to do before our trip?"; itinerary draft; packing suggestions.

**Demo.** *Christmas in Lagos* 19 Dec–3 Jan: 5 travellers + Mama Fọláké hosting; flights booked; 3 days drafted; lists 4/5; checklist 2/9; Tobi's passport expires March → attention.

---

### 5.15 `wardrobe` — Wardrobe & closet manager (Live)

**Purpose.** A digital closet that makes dressing for events, trips and the week effortless.

**Capabilities.** Items (photo, owner, category, colour, season, size, occasion, status in use / outgrown / donate / handed down); filters; **outfit builder**; **weekly attire schedule**; event outfits; trip capsules → packing lists; **hand-me-down flow** (outgrown → next child's closet); **outgrown list** feeds both the purchase pipeline (replacement) and a donate task that can become a Giving entry.

**AC.** Scheduled outfit shows on the member's dashboard that day. Items attach to packing lists. Hand-me-down transfers ownership and keeps history. Photos compress to ≤ 300 KB.

**Permissions.** P full · C own closet and schedule · G none.

**AI hooks.** "Sunday outfit for Ayo"; capsule for Lagos.

**Demo.** 118 items across 5 members; 14 outfits; Tobi's coat handed down to Ayo; children's week scheduled.

---

### 5.16 `wellness` — Health, habits, fitness & food (Live)

**Purpose.** Bodies and routines that carry the family's mission.

**Capabilities.** **Habits** with targets, logs, streaks that rest on grace days plus one **streak freeze per week**, heatmaps; **workout plans** from templates with logs; **health notes** (sensitivity Health, parent-only; a Young adult may be granted their own); **meal plans** (week grid, recipes, cook) and **grocery list** priced against the food budget with a live remaining total; family challenges.

**AC.** Missed habit at check-in time triggers one nudge. Grace days and freezes never break a streak. Grocery total shows remaining food budget live and feeds Sunday planning. Health notes restricted by RLS. One-tap workout log from child dashboard.

**Permissions.** P full · C own habits/workouts; view meal plan · G none.

**AI hooks.** "What meals fit this week's grocery budget?"; workout plan from goal + time; habit coaching in the briefing.

**Demo.** Ifeoluwa water 12-day streak (Sunday rested); Oluwafemi cycling week 3; Dami sleep by 22:00 (4/7); meal plan with jollof Sunday; grocery £142 vs £112 remaining → warning.

---

### 5.17 `studio` — AI companion & generative studio (Create)

**Purpose.** The Family Concierge — one companion across Wàfè — plus a creative playground.

**Capabilities.** **Companion**: `⌘K` launcher everywhere, module-aware; grounded Q&A (§7); proposals (tasks, plan, event, budget change) the member confirms; private history. **Studio**: **Songs** — lyrics + chords + structure + tempo/key, printable lead sheet; **Images** via Gemini where the plan allows, degrading to a **styled typographic card** with the saved prompt; **Storyboards** — scene text + image slots (AI or family photos), played and shared through the reel player; creative projects per member; outputs saved with prompt, model, cost.

**AC.** Every answer lists sources; the companion says "I used…" and "I can't see that" rather than inventing. Little/Junior cannot free-type. Financial, Health, Documents never enter a child's or guest's context. Songs always include chords and structure. Image unavailability is explicit and produces the typographic alternative. Usage meter visible; cap enforced by the gateway.

**Permissions.** P full · C child mode + child-safe presets · G view shared outputs only.

**AI hooks.** All of §7.

**Demo.** Song "Adeyemi Evening Blessing" (G major); storyboard "Ayo and the Brave Ant" (6 scenes); 24 conversations.

---

### 5.18 `moodboards` — Moodboards & inspiration (Create)

**Purpose.** Pinterest-style visual collaboration for parties, interiors, style and ideas.

**Capabilities.** Boards (title, cover, visibility, collaborators); pins from URL, upload or the family media library; notes, tags, source, price; sections; drag order; comments and reactions; templates; link to project or trip; PDF export; party checklist → Tasks.

**AC.** Web pins cache a copy. Granted collaborators pin and comment. Tag filter across boards. Child-owned boards are child-safe by construction.

**Permissions.** P full · C own + child-safe family boards · G granted boards.

**AI hooks.** Palette from a board; party checklist.

**Demo.** *Kitchen refresh* (31), *Tobi's 10th — dinosaurs* (18, Okonkwos pin), *Sunday best* (private), *Lagos ideas* (Mama Fọláké).

---

### 5.19 `memories` — Albums, timeline & reels (Create)

**Purpose.** Keep and celebrate the story the family is living.

**Capabilities.** Albums with uploads, captions, people tags, locations; **timeline** merging albums, celebrations, answered prayers, milestones, badges, trips; **reels** — in-app Ken Burns slideshows with captions, transitions and a licensed or family-song track, **shared by link to members and guests; no video file is generated**; storyboards play through the same player; "On this day" across years; December "Our year" reel auto-drafted; quota by plan.

**AC.** A 60-photo reel plays at 30 fps on a mid-range phone and starts within 3 s. Timeline events link to sources. Guests see granted albums only. HEIC/JPEG/PNG/MP4 accepted with resizing. Share links expire.

**Permissions.** P full · C family albums; contribute where granted · G granted albums.

**AI hooks.** Captions; "make a reel of the school-year prep"; year-in-review narrative.

**Demo.** 9 albums, 412 photos; timeline to 2019; reel "Summer 2026"; "On this day: Tobi's first swim, 2022".

---

### 5.20 `auth` — Onboarding & access

**Purpose.** Get a family to value in under five minutes.

**Capabilities.** Email/password, magic link, Google; reset; verification; create space; invitations (role locked); child accounts by a parent: username + PIN (Junior+), parent-launched session (Little), own credentials (Young adult); family picker on shared devices; **first-run**: values chips → mission (AI draft) → members → *start empty* or *start from the Adeyemi demo* (badged, removable in one click) → Home with first briefing; sessions and device sign-out; multi-space membership; re-auth after 15 minutes for finance and permission changes.

**AC.** Sign-up to populated dashboard ≤ 5 min (≤ 90 s with demo). PIN login rate-limited. Invitations single-use, 7 days. Reset email under 60 s. Demo removal leaves the space clean.

**Permissions.** Space creation is open; everything else follows role.

**AI hooks.** Mission draft; first three goals from values.

---

## 6. Dashboards

**Parent Home.** Greeting + date · Family strip (avatars, completion %, presence) · **Briefing** (AI, read-aloud, template fallback) · **Week focus** (three priorities) · **Today** (tasks by member, events) · **Learning today** · **Our goals** (rings per area, "Our Future 68 %") · **Prayer & reflection** (scripture, wall highlights, check-in status) · **Budget alerts** · **Needs attention** · **This week** · **On this day** · Quick-add · Check-in card after 18:00 · Sunday planning entry on the planning day.

**Child Home (child mode).** Big tiles ordered for the day: **Lessons today** · **Chores** (Sprouts, photo proof) · **Memory verse** (read-aloud, practise) · **Habits** (one tap) · **My Garden** (Sprouts grow a sprig: seed → sprout → leaf → bloom → tree per 50 Sprouts, echoing the logo) · **Badges & rewards** · **My wishes** (own purchase requests and status) · **Create** · **Show** (share today's progress with a parent) · encouragement from the companion. Little: read-aloud everywhere, no text, max 6 tiles. Teen/Young adult add calendar, goal summaries, projects.

**Guest Home.** Literally the list of granted objects, no area nav: welcome from the family · **How to pray for us this week** · shared calendar items · prayer wall · granted trips (itinerary, my packing list) · granted albums and boards · mentor sessions (if mentor). Nothing else is rendered or fetchable.

---

## 7. AI companion

**Architecture.** Text model behind the metered gateway. A request = system prompt (family voice, faith-aware tone, role) + **context pack** + question + tool results. The context pack is built server-side **as the asking member** (RLS applies), so the model can only see what that member may see. Long content is chunked and embedded (pgvector) per space and retrieved with the same filter.

**Tools.** Read-only: `search_family_data`, `get_budget_position`, `get_schedule`, `get_progress`. Propose: `propose_tasks`, `propose_plan`, `propose_event`, `propose_budget_change` — draft cards the member confirms; nothing writes without confirmation. Every answer carries `sources[]` rendered as chips.

**Failure paths are product rules.** Briefing falls back to a template; generation buttons show a plan/usage message; nothing else degrades. The companion says "I used your tasks, calendar and groceries budget" and "I can't see that" rather than inventing.

**Guardrails.** Role-specific prompts; Little/Junior use a curated prompt-picker; Teen/Young adult free text with a child-safety classifier and "talk to a parent" redirect; Financial, Health, Documents, Private structurally excluded from child/guest packs; no browsing; refuse advice beyond the family's own numbers; PII stays in the space; per-space cap with 80 % warning; children's conversations visible to parents.

**Capabilities.** Summarisation (video, book, research); plan and course generation; task suggestion; briefing; check-in and Sunday planning summaries; contextual queries; songs with chords; storyboards; images where the plan allows.

---

## 8. Roles, sensitivity & privacy

**Roles.** *Parent* · *Child* (Little, Junior, Teen, Young adult) · *Guest* (relative, friend, mentor).

**Every record carries** `visibility ∈ {private, shared, family}`, `child_safe`, and `sensitivity ∈ {general, financial, health, private, documents, settings}`. Sensitivity classes other than *general* are **parent-only by class**: no share, grant or AI answer can expose them to a child or guest (exception: a Young adult's own envelope and, if granted, own health notes). Guests are granted named objects through `object_shares(object_type, object_id, member_id, level)`, never modules; the guest dashboard is that list.

**RLS `can_view`.** Parent: anything except another member's *private* records. Child: `family ∧ child_safe ∧ sensitivity = general ∧ module enabled for band`, or shared with them, or owned. Guest: an `object_shares` row exists and the module is guest-eligible. Writes follow view plus role.

| Module | Parent | Child | Guest |
|---|---|---|---|
| Home / Notifications | Full | Child dashboard, own | Granted objects |
| Family | Full | Own profile | Own profile |
| People | Full | Names, photos, birthdays | Self + shared communities |
| Learning / Books / Curricula | Full | Assigned | Shared course only |
| Bible & Prayer | Full | Assigned + wall + own | Wall if granted |
| Tasks / Calendar / Projects | Full | Assigned + own (YA edits own events, owns projects) | Assigned / invited / shared |
| Goals | Full | Summaries + own Me | — |
| Finance | Full | Wish; own envelope (YA) | — |
| Travel / Moodboards / Memories | Full | Own / child-safe | Granted objects |
| Wardrobe / Wellness | Full | Own | — |
| Studio | Full | Child mode | Shared outputs |

---

## 9. Design system & brand

**Wordmark.** *Wàfè* — accents always kept — in Fraunces 700, tight tracking. Tagline: *Integrated Family, Growth & Life Management*. Logo: deep-olive circle with a sprig line icon; the sprig is the favicon, the loading mark and the My Garden metaphor.

**Palette.** `--paper #F4EFE6` · `--olive #3E4A3A` · `--olive-light #5E6E52` (Grow) · `--terracotta #B5563D` (Execute, danger) · `--ochre #C09040` (Live, warning) · `--plum #8A5A6B` (Create) · `--ink #1F2320` · `--sage #7E8A74` · `--success #4F7A4A` · `--sun #E4B94A` (Sprouts, badges) · dark: paper `#1B1E1A`, ink `#EDE7DA`, olive `#8FA084`. Child mode lifts hues +12 % lightness.

**Type.** Fraunces for headings and numbers that matter; DM Sans for UI (self-hosted); 16 px base, 18 px in child mode; line-height 1.5; scale 1.25.

**Layout.** Left nav with the five areas (collapsible); top bar with greeting, `⌘K`, quick-add, notifications, member switcher; max-width 1280; cards 16 px radius, 1 px sage-20 border, no heavy shadows; warm photography of Black families in cream, earth-toned rooms, used sparingly.

**Voice.** Warm, intentional, plain. First person plural. Micro-copy celebrates ("Answered."), never shames ("3 tasks are waiting for you").

---

## 10. Data model overview

Supabase Postgres, multi-tenant; every table carries `space_id`, `created_by`, `visibility`, `sensitivity`, `child_safe`, `value_id`, timestamps; RLS via `is_member`, `member_role`, `can_view`, `can_write`. Tenants resolved by host and membership.

**Core:** `spaces`, `members`, `member_permissions`, `object_shares`, `invitations`, `values`, `mission_versions`, `check_ins`, `weekly_reviews`, `notifications`, `notification_prefs`, `follow_up_rules`, `audit_log`, `ai_conversations`, `ai_messages`, `ai_usage`, `media`, `embeddings`.

**Family & people:** `people`, `communities`, `community_memberships`, `mentors`, `mentor_sessions`.

**Grow:** `videos`, `playlists`, `playlist_items`, `video_notes`, `video_summaries`, `learning_plans`, `plan_items`, `completions`; `books`, `reading_progress`, `reading_plans`, `courses`, `course_weeks`, `course_items`, `quiz_attempts`; `bible_studies`, `study_sessions`, `bible_plans`, `plan_days`, `memory_verses`, `verse_reviews`, `prayers`, `prayer_reactions`; `subjects`, `units`, `assignments`, `submissions`, `grades`, `badges`, `badge_awards`, `milestones_dev`, `character_tracks`, `character_logs`.

**Execute:** `tasks`, `task_checklist`, `chore_rotas`, `sprouts_ledger`, `rewards`, `redemptions`; `blueprints`, `goals`, `milestones`, `okrs`, `key_results`, `celebrations`; `projects`, `project_members`, `clips`, `notes`, `comparisons`, `comparison_scores`, `decisions`; `events`, `event_members`, `rsvps`, `ics_tokens`.

**Live:** `accounts`, `categories`, `ledger_entries`, `bills`, `bill_payments`, `budget_alerts`, `wishlist_items`, `wish_approvals`, `envelopes`, `savings_goals`; `trips`, `travellers`, `itinerary_days`, `itinerary_items`, `bookings`, `travel_docs`, `packing_lists`, `packing_items`, `trip_checklist`; `wardrobe_items`, `outfits`, `outfit_items`, `attire_schedule`, `handdowns`; `habits`, `habit_logs`, `streak_freezes`, `workout_plans`, `workouts`, `workout_logs`, `health_notes`, `recipes`, `meal_plans`, `meal_slots`, `grocery_lists`, `grocery_items`, `challenges`.

**Create:** `songs`, `images`, `storyboards`, `storyboard_scenes`, `creative_projects`; `boards`, `board_sections`, `pins`, `pin_comments`; `albums`, `album_media`, `media_tags`, `timeline_events` (materialised), `reels`, `reel_frames`, `share_links`.

**Key edges.** `tasks → milestones → goals → blueprint/values`; `wishlist_items → tasks ("Buy X") → ledger_entries`; `wardrobe_items(outgrown) → wishlist_items + tasks(donate)`; `trips → events`, `packing_lists → wardrobe_items`; `completions` and `sprouts_ledger` unify progress and reward across modules; `timeline_events` derives from albums, celebrations, prayers, badges, milestones, trips.

---

## 11. Notifications & follow-ups

**Channels.** In-app (always), email, web push. Children: in-app only. Quiet hours default 21:00–07:00 local and **defer**. Digest collapses non-urgent items into one 18:00 email and engages automatically above five nudges per day. **General cap:** any nudge stops after three reminders and the item moves to Needs attention. Idempotency key `(rule, record, member, window)`; jobs on a 5-minute cadence plus event triggers.

| # | Trigger | Recipient | Timing | Limits |
|---|---|---|---|---|
| 1 | Task assigned | assignee | immediate | — |
| 2 | Task due tomorrow | assignee | 18:00 day before | once |
| 3 | Task overdue | assignee | 09:00 | 3 reminders, then Needs attention; parent copied on the third |
| 4 | Chore proof submitted | parent | immediate | approve inline |
| 5 | Habit not logged | member | check-in time | once/day; skipped on grace days |
| 6 | Milestone due | goal owner | T-7, T-1 | parent if missed |
| 7 | Goal stalled (21 d) | owner | weekly | once/week |
| 8 | Assignment due / graded | child / child + parent | 06:00 / immediate | — |
| 9 | Verse review due | member | 07:00 | 1-3-7-14-30 |
| 10 | Prayer posted / answered | family + granted guests | immediate | batched > 3/h |
| 11 | Budget 80 % / 100 % | parents | on entry | once per threshold per category per month |
| 12 | Bill due | parents | T-3, due day | then 3 reminders → Needs attention |
| 13 | Purchase requested / decided | parents / requester | immediate | second-parent request above threshold |
| 14 | Trip milestones | travellers | T-14, T-7, T-3, T-1 | passport < 6 months → attention |
| 15 | Document expiry | parents | 90 d, 30 d | — |
| 16 | Event reminder | attendees | default 1 h | — |
| 17 | Birthday / anniversary | parents | T-7, day | drafted message |
| 18 | Cadence overdue | parents | weekly | — |
| 19 | Mentor session | participants | T-1, T-1 h | — |
| 20 | Evening check-in | all | 20:30 | none if done |
| 21 | Briefing ready | parents | 06:30 | push if enabled |
| 22 | Badge / reward / celebration | child + parents | immediate | in-app |
| 23 | Invitation pending / accepted | inviter | 48 h / immediate | — |
| 24 | AI usage 80 % / cap | parents | threshold | once/month |
| 25 | Sunday planning ready | parents | planning day 16:00 | — |

**Needs attention** = unresolved items from rules 3, 4, 7, 11, 12, 13, 14, 15, 23, 24.

---

## 12. Non-functional requirements

**Privacy.** Private to the space by default; no cross-space queries; AI context under the asking member's RLS; children's conversations visible to parents; export and full deletion within 24 hours; analytics event-name-only.

**Security.** Supabase Auth; child PIN scoped to the family picker and rate-limited; parent PIN to exit child mode; **re-auth after 15 minutes** for finance and permission changes; RLS on every table with a CI matrix (every role × every table); sensitivity classes enforced by policy, not UI; per-space storage buckets with signed URLs; secrets in the gateway; **CSP allows only the YouTube IFrame, the AI gateway and the image API** as third-party origins; audit log for roles, permissions and shares.

**Responsive & offline.** Desktop-first shell; bottom tab bar under 768 px; child mode tuned for tablets; **PWA with offline reads of Home, today's tasks and the current packing list**, writes queued.

**Accessibility.** WCAG 2.1 AA; focus-visible; keyboard kanban and calendar; aria-live for celebrations; reduced motion honoured (reels pause Ken Burns); read-aloud in child mode; 44 px targets.

**Performance.** Home ≤ 1.5 s cached / ≤ 3 s cold; lists virtualised past 200 rows; images resized on upload; briefing cached; AI streamed; reel 30 fps on a mid-range phone.

**Reliability.** Idempotent, retried jobs; monitored schedules; nightly backups; media checksums.

---

## 13. Success metrics

**Activation.** ≥ 70 % of new spaces reach *set up* (space + ≥ 2 members with roles + values + one goal with milestones + one task each due today) in the first session; median time to first briefing ≤ 5 minutes.

**Living in Wàfè.** Parent dashboard visits ≥ 5 days/week; tasks completed ≥ 15/week; ≥ 3 learning or Bible activities; ≥ 1 goal updated; check-in ≥ 4 days; Sunday planning completed ≥ 3 of 4 weeks; child feed completion ≥ 60 %.

**Connection.** ≥ 40 % of tasks linked to a goal; ≥ 80 % of goals with a milestone; ≥ 50 % of ledger entries categorised against a budget.

**Retention.** Day-7 ≥ 55 %, Day-30 ≥ 40 %; child Day-30 ≥ 35 %.

**AI.** ≥ 10 queries per active family per week; ≥ 50 % of plans used; ≥ 40 % of proposals confirmed; briefing opened ≥ 4 days/week.

**Outcomes.** "We can see what we're building" ≥ 80 %; goals completed per quarter; giving recorded; answered prayers logged.

---

## 14. Build sequencing for the team

Everything ships in this build; sequencing exists so squads do not block each other.

**Sprint 0 — Foundations (2 weeks).** Tenant resolution; schema with common columns, sensitivity classes, `object_shares`, RLS helpers and CI matrix; tokens, shell, components; `auth` incl. bands, PIN and parent-launched sessions; `family`; demo seeder; AI gateway client, metering, context-builder contract; notification engine skeleton; integration contracts (`completions`, `sprouts_ledger`, `timeline_events`, rule registration, `can_view`, media, `sources[]`).

**Sprint 1 — Loop core, Home first (weeks 3–5).** `tasks` (views, recurrence, chores, Sprouts) → `goals` (blueprint, milestones) → `calendar` → **Home v1** assembled from these plus stub widgets, with the template briefing, three-tap check-in and Needs attention live. A family can set up and live in Wàfè by week 5.

**Sprints 2–4 — Four parallel squads (6 weeks), each replacing Home stub widgets as modules land.**
- *Execute:* rota and rewards, OKRs and roadmap, ICS, `projects` with decisions, Sunday planning screen.
- *Grow:* `bible` → `learning` → `books` → `curricula` and the child feed.
- *Live:* `finance` (pipeline, envelopes, giving) → `travel` → `wellness` → `wardrobe`.
- *Create & Companion:* `studio` (context builder, proposals, child mode, songs, images with fallback, storyboards) → `moodboards` → `memories` (reel player, timeline) → `people`.

**Sprint 5 — AI and the full loop (2 weeks).** AI briefing swaps in for the template; all 25 rules live; weekly reviews and week focus; On this day; "Our year" reel.

**Sprint 6 — Hardening (2 weeks).** RLS matrix 100 %; accessibility audit; performance budgets; PWA offline; export/delete; demo walkthrough of every screen; dark theme; launch.

**Definition of done per module.** All AC pass; RLS tests for parent/child (each band)/guest; demo data renders every screen; AI hooks wired with sources and failure paths; rules registered; empty states designed; keyboard and screen-reader pass; documented.

*Built for us. Built for our family. Private, intentional, and designed to fit the way we live and love.*