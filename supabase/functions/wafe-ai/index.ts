// Phoxta — wafe-ai: the Wàfè family companion.
//
// Every AI feature in Wàfè (businesses/wafe/src/lib/ai.ts) is ONE call to this
// function with an `action`: a contextual question, the morning briefing, a
// lesson plan from a video, a four-week course from a book, a meal plan inside
// the budget, a packing list, a song, a storyboard, a picture.
//
// THE COMPANION KNOWS ONLY WHAT IT IS TOLD. The client sends `grounding` — one
// summary per module, each already filtered for the asking member's role — and
// the system prompt forbids inventing anything beyond it. On top of that the
// prompt carries role rules (a child never hears about money; a guest hears only
// about the shared calendar, travel and the prayer wall), and the role itself is
// never taken from the body for a signed-in caller: it is read from their
// wf_members row. The body's `role` is only honoured for the demo, where there
// is no account to check and nothing private to protect.
//
// BILLING. A signed-in caller bills the organisation that owns their space; the
// demo bills the showcase organisation (slug 'wafe-demo') and is rate-limited
// per address so a stranger cannot spend the allowance. Every call is metered
// as feature "wafe-<action>" and checked against the monthly cap first.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { modelFor, type Tier } from "../_shared/models.ts";
import { callJson, callMessages } from "../_shared/anthropic.ts";
import { meter, assertWithinCap, CAP_REACHED_MESSAGE } from "../_shared/meter.ts";
import { hashIp } from "../_shared/clientIp.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// deno-lint-ignore no-explicit-any
type Json = any;
type Role = "parent" | "child" | "guest";

const ACTIONS = [
  "ask", "briefing", "reflect", "summarize", "learning-plan", "book-course",
  "suggest-tasks", "meal-plan", "packing", "outfit", "song", "storyboard", "image",
] as const;
type Action = typeof ACTIONS[number];
const isAction = (v: unknown): v is Action => typeof v === "string" && (ACTIONS as readonly string[]).includes(v);

/** What a role may ask for at all. The prompt rules govern WORDING; this
 *  governs the features themselves, so a guest cannot reach the meal planner by
 *  hand-crafting a request the UI would never make. Parents get everything. */
const GUEST_ACTIONS: ReadonlySet<Action> = new Set<Action>(["ask", "briefing", "reflect", "packing", "song", "storyboard", "image"]);
const CHILD_DENIED: ReadonlySet<Action> = new Set<Action>(["meal-plan"]); // it is a budget exercise

const GROUNDING_MAX = 12_000;
const EXTRA_MAX = 3_000;
const DEMO_HOURLY_CAP = 40;
const DEMO_ORG_SLUGS = ["wafe-demo", "phoxta"];
const IMAGE_MODEL = "gemini-2.5-flash-image";
const IMAGE_BUCKET = "catalog";
const IMAGE_UNAVAILABLE = "Image generation isn't available on this plan yet.";
const PARSE_FAILED = "The companion couldn't produce that. Try again.";

// ---------------------------------------------------------------------------
// Small clamps — everything the model returns passes through one of these
// before a screen sees it, so a malformed reply degrades to an empty field
// rather than a crash in the UI.
// ---------------------------------------------------------------------------
const clampStr = (v: unknown, max: number, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const strList = (v: unknown, maxItems: number, maxLen = 300): string[] =>
  Array.isArray(v) ? v.map((x) => clampStr(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];
const objList = (v: unknown, maxItems: number): Json[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object" && !Array.isArray(x)).slice(0, maxItems) : [];
const isRole = (v: unknown): v is Role => v === "parent" || v === "child" || v === "guest";
/** The demo's space id is not a uuid ("space-okafor"); anything else in a
 *  storage path is a caller poking at us. */
const safeSegment = (v: unknown): string => String(v ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "space";

/** A request we can answer with a specific status, not a generic 500. */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const bad = (msg: string) => new HttpError(400, msg);

// ---------------------------------------------------------------------------
// The shared system prompt
// ---------------------------------------------------------------------------
const PERSONA =
  "You are Wàfè, the family's companion inside their family app. You know only what the grounding below says about this family; " +
  "never invent facts about them. Be warm, concrete and brief. British English. " +
  "Faith-friendly: the family may keep Bible study and prayer; speak of it naturally, never preach.";

const ROLE_RULES: Record<Role, string> = {
  parent:
    "The asking member is a PARENT. They may see everything the grounding contains, including money.",
  child:
    "The asking member is a CHILD. Be age-appropriate and encouraging, in short sentences. " +
    "Never discuss money, finances, budgets, prices or private/adult matters — even if asked, say kindly that a parent can help with that. " +
    "Never be scary, graphic or discouraging. Celebrate effort.",
  guest:
    "The asking member is a GUEST (extended family). Speak only about the shared calendar, travel plans and the prayer wall. " +
    "Say nothing about goals, finances, tasks, private notes or the children's learning — if asked, say warmly that that is for the family to share.",
};

function systemPrompt(role: Role, grounding: string, extra: string): string {
  return [
    PERSONA,
    ROLE_RULES[role],
    "GROUNDING:\n" + (grounding || "(nothing shared yet)"),
    extra ? "EXTRA CONTEXT FROM THE SCREEN:\n" + extra : "",
  ].filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Who is asking, and who pays
// ---------------------------------------------------------------------------
type Caller = {
  orgId: string;
  role: Role;
  userId: string | null;
  demo: boolean;
};

/** A signed-in caller: their wf_members row for this space decides both the
 *  billing organisation and the role. The body's role is not consulted. */
async function memberCaller(admin: SupabaseClient, userId: string, spaceId: string): Promise<Caller> {
  if (!spaceId) throw bad("Which family?");
  const { data } = await admin
    .from("wf_members")
    .select("organization_id, role")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as { organization_id?: string; role?: string } | null;
  if (!row?.organization_id) throw new HttpError(403, "You don't belong to that family.");
  // A role we do not recognise is treated as the least privileged one.
  const role: Role = isRole(row.role) ? row.role : "guest";
  return { orgId: row.organization_id, role, userId, demo: false };
}

let demoOrgCache: string | null = null;

/** The organisation the showcase bills to: 'wafe-demo', else the platform's
 *  own 'phoxta' org, else the oldest organisation there is — logged, because a
 *  fallback that runs for months is a misconfiguration nobody noticed. */
async function demoOrgId(admin: SupabaseClient): Promise<string> {
  if (demoOrgCache) return demoOrgCache;
  for (const slug of DEMO_ORG_SLUGS) {
    const { data } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    const id = (data as { id?: string } | null)?.id;
    if (id) {
      if (slug !== DEMO_ORG_SLUGS[0]) console.warn(`[wafe-ai] no '${DEMO_ORG_SLUGS[0]}' organisation — demo calls billed to '${slug}'`);
      return (demoOrgCache = id);
    }
  }
  const { data } = await admin.from("organizations").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new HttpError(503, "The demo companion isn't set up yet.");
  console.warn("[wafe-ai] no demo organisation by slug — demo calls billed to the first organisation");
  return (demoOrgCache = id);
}

// The demo's per-address ledger. Bootstrapped lazily over SUPABASE_DB_URL on
// first use (`supabase db push` is not available here — same pattern as
// demo-access). RLS on with no policies: only the service role reads or writes.
const DEMO_DDL = `
create table if not exists public.wf_ai_demo_calls (
  id bigserial primary key,
  ip_hash text not null,
  action text not null default '',
  at timestamptz not null default now()
);
create index if not exists idx_wf_ai_demo_calls_ip on public.wf_ai_demo_calls(ip_hash, at desc);
alter table public.wf_ai_demo_calls enable row level security;
`;

let demoSchemaReady = false;
async function ensureDemoSchema(): Promise<void> {
  if (demoSchemaReady) return;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) throw new Error("SUPABASE_DB_URL not available to this function.");
  const sql = postgres(dbUrl, { prepare: false });
  try {
    await sql.unsafe(DEMO_DDL);
    demoSchemaReady = true;
  } finally {
    await sql.end({ timeout: 3 });
  }
}

/** Count this address's demo calls in the last hour, creating the table on the
 *  first miss. The DDL is not run on every cold start: PostgREST answers the
 *  count in one hop, and a missing relation is the only reason to open a
 *  Postgres connection at all. */
async function demoCallsLastHour(admin: SupabaseClient, ipHash: string): Promise<number> {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const count = () =>
    admin.from("wf_ai_demo_calls").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("at", hourAgo);
  let r = await count();
  if (r.error) {
    await ensureDemoSchema();
    r = await count();
    if (r.error) throw new Error(`demo ledger unavailable: ${r.error.message}`);
  }
  return r.count ?? 0;
}

/** The demo: no account, so the body's role is honoured — but a role that
 *  says child gets child semantics regardless of anything else, and an
 *  unknown one gets guest. Rate-limited per address; the row is written before
 *  the model call so a failing call still counts. */
async function demoCaller(req: Request, admin: SupabaseClient, body: Json): Promise<Caller> {
  const ipHash = await hashIp(req);
  const used = await demoCallsLastHour(admin, ipHash);
  if (used >= DEMO_HOURLY_CAP) {
    throw new HttpError(429, "The demo companion has answered a lot from here this hour. Try again a little later, or sign up to keep going.");
  }
  const { error } = await admin.from("wf_ai_demo_calls").insert({ ip_hash: ipHash, action: String(body.action ?? "") });
  if (error) console.error("[wafe-ai] demo ledger insert failed:", error.message);
  const role: Role = body.role === "child" ? "child" : isRole(body.role) ? body.role : "guest";
  return { orgId: await demoOrgId(admin), role, userId: null, demo: true };
}

async function resolveCaller(req: Request, admin: SupabaseClient, body: Json): Promise<Caller> {
  const who = await requireUser(req);
  // requireUser admits the scheduler as "cron"; the companion has no scheduled
  // leg, and "cron" is not a uuid a wf_members row could carry.
  if ("userId" in who && who.userId !== "cron") return memberCaller(admin, who.userId, String(body.spaceId ?? ""));
  if (body.demo === true) return demoCaller(req, admin, body);
  throw new HttpError(401, "Please sign in again.");
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type Usage = { inTok: number; outTok: number; cacheWriteTok: number; cacheReadTok: number; model: string };
type Out = { text: string; data?: Json; usage: Usage; tier: Tier; unavailable?: string };
type Ctx = { body: Json; payload: Json; role: Role; system: string; spaceId: string; admin: SupabaseClient };

const zeroUsage = (model: string): Usage => ({ inTok: 0, outTok: 0, cacheWriteTok: 0, cacheReadTok: 0, model });

/** Every JSON action: the strict shape goes in the system prompt, the caller's
 *  material goes in the user turn, the result comes back for clamping. */
async function structured<T>(c: Ctx, tier: Tier, task: string, shape: string, user: string, maxTokens: number): Promise<{ data: T; usage: Usage }> {
  const system = `${c.system}\n\nTASK: ${task}\nReturn STRICT JSON with exactly this shape:\n${shape}`;
  const r = await callJson<T>({ model: modelFor(tier), system, user, maxTokens });
  return { data: r.data, usage: r };
}

async function prose(c: Ctx, tier: Tier, user: string, maxTokens: number, taskNote?: string): Promise<{ text: string; usage: Usage }> {
  const system = taskNote ? `${c.system}\n\nTASK: ${taskNote}` : c.system;
  const r = await callMessages({ model: modelFor(tier), system, messages: [{ role: "user", content: user }], maxTokens });
  return { text: r.text, usage: r };
}

const describe = (label: string, v: unknown): string => (v === undefined || v === null || v === "" ? "" : `${label}: ${typeof v === "string" ? v : JSON.stringify(v)}`);

async function ask(c: Ctx): Promise<Out> {
  const q = clampStr(c.body.prompt, 2_000);
  if (!q) throw bad("Ask the companion something.");
  const r = await prose(c, "balanced", q, 700, "Answer the member's question from the grounding. If the grounding does not say, say so plainly and suggest where in the app to look.");
  return { text: r.text, usage: r.usage, tier: "balanced" };
}

async function briefing(c: Ctx): Promise<Out> {
  const when = c.payload.when === "evening" ? "evening" : "morning";
  const budgetRule = c.role === "parent"
    ? "Include ONE short budget note if the grounding has finance information."
    : "Do not mention money or budgets at all.";
  const r = await prose(
    c, "balanced",
    `Write my ${when} briefing.`,
    500,
    `A ${when} briefing of 120-180 words for the asking member (greet them by FIRST name — see "Asking:" in the grounding). ` +
      "Structure: a one-line greeting; the THREE things that matter today, drawn from the grounding (tasks, events, learning, prayer) as short paragraphs or a tight list; " +
      `${budgetRule} ` +
      "Close with one encouraging line tied to the family's stated values. No headings, no markdown tables.",
  );
  return { text: r.text, usage: r.usage, tier: "balanced" };
}

async function reflect(c: Ctx): Promise<Out> {
  const { data, usage } = await structured<Json>(
    c, "balanced",
    "An evening reflection for the asking member: three short questions to sit with, and a two-sentence summary of what the family did today according to the grounding.",
    `{"questions":["<short question>","<short question>","<short question>"],"summary":"<two sentences>"}`,
    clampStr(c.body.prompt, 1_000, "Help me reflect on today."),
    600,
  );
  const questions = strList(data?.questions, 3, 200);
  const summary = clampStr(data?.summary, 600);
  if (questions.length === 0 || !summary) throw new HttpError(502, PARSE_FAILED);
  return { text: summary, data: { questions, summary }, usage, tier: "balanced" };
}

async function summarize(c: Ctx): Promise<Out> {
  const p = c.payload;
  const title = clampStr(p.title, 200);
  if (!title) throw bad("What are we summarising? Send a title.");
  const source = ["youtube", "article", "chapter"].includes(p.source) ? p.source : "article";
  const material = [
    describe("Title", title),
    describe("Source", source),
    describe("Description", clampStr(p.description, 2_000)),
    describe("Transcript", clampStr(p.transcript, 20_000)),
    describe("Notes", clampStr(p.notes, 2_000)),
  ].filter(Boolean).join("\n");
  const { data, usage } = await structured<Json>(
    c, "balanced",
    "Summarise this material for the family: the key takeaways, what to do about it, and prompts for a family discussion. Work only from the material given; if there is no transcript, say what can honestly be drawn from the title and description.",
    `{"takeaways":["<5 to 7 concise takeaways>"],"actions":["<3 concrete actions>"],"discussion":["<3 discussion prompts>"],"forKids":"<two sentences a 6-9 year old would understand>"}`,
    material,
    900,
  );
  const takeaways = strList(data?.takeaways, 7, 300);
  if (takeaways.length === 0) throw new HttpError(502, PARSE_FAILED);
  const out = {
    takeaways,
    actions: strList(data?.actions, 3, 300),
    discussion: strList(data?.discussion, 3, 300),
    forKids: clampStr(data?.forKids, 400) || undefined,
  };
  return { text: takeaways.join("\n"), data: out, usage, tier: "balanced" };
}

async function learningPlan(c: Ctx): Promise<Out> {
  const p = c.payload;
  const title = clampStr(p.title, 200);
  if (!title) throw bad("What is the lesson about? Send a title.");
  const audience = ["family", "adult", "child"].includes(p.audience) ? p.audience : "family";
  const minutes = clampInt(p.minutes, 5, 180, 30);
  const { data, usage } = await structured<Json>(
    c, "balanced",
    `A lesson plan for a ${audience} audience, about ${minutes} minutes in total. Steps are hands-on and specific; check questions test understanding, not recall alone.`,
    `{"title":"<lesson title>","objective":"<one sentence>","steps":[{"title":"<step>","minutes":<int>,"activity":"<what to do, 1-2 sentences>"}],"checkQuestions":["<3-5 questions>"]}`,
    [describe("Topic", title), describe("Description", clampStr(p.description, 3_000)), describe("Audience", audience), describe("Minutes", minutes)].filter(Boolean).join("\n"),
    900,
  );
  const steps = objList(data?.steps, 10).map((s) => ({
    title: clampStr(s.title, 120),
    minutes: clampInt(s.minutes, 1, 120, 10),
    activity: clampStr(s.activity, 500),
  })).filter((s) => s.title);
  if (steps.length === 0) throw new HttpError(502, PARSE_FAILED);
  const out = { title: clampStr(data?.title, 200, title), objective: clampStr(data?.objective, 400), steps, checkQuestions: strList(data?.checkQuestions, 5, 300) };
  return { text: out.objective, data: out, usage, tier: "balanced" };
}

async function bookCourse(c: Ctx): Promise<Out> {
  const p = c.payload;
  const title = clampStr(p.title, 200);
  if (!title) throw bad("Which book? Send a title.");
  const audience = clampStr(p.audience, 40, "family");
  const { data, usage } = await structured<Json>(
    c, "complex",
    `A FOUR-week reading course on this book for a ${audience} audience. Each week: a theme, which chapters to read, one assignment, discussion questions, and a short multiple-choice quiz (answer is the 0-based index into options). Use the outline if given; otherwise rely on what is widely known about the book and do not invent chapter titles.`,
    `{"title":"<course title>","weeks":[{"week":<1-4>,"theme":"<theme>","chapters":"<which chapters>","assignment":"<one assignment>","discussion":["<3 questions>"],"quiz":[{"q":"<question>","options":["<4 options>"],"answer":<0-3>}]}]}`,
    [describe("Book", title), describe("Author", clampStr(p.author, 120)), describe("Outline", clampStr(p.outline, 6_000)), describe("Audience", audience)].filter(Boolean).join("\n"),
    2_500,
  );
  const weeks = objList(data?.weeks, 4).map((w, i) => ({
    week: clampInt(w.week, 1, 4, i + 1),
    theme: clampStr(w.theme, 200),
    chapters: clampStr(w.chapters, 200),
    assignment: clampStr(w.assignment, 500),
    discussion: strList(w.discussion, 5, 300),
    quiz: objList(w.quiz, 5).map((q) => {
      const options = strList(q.options, 4, 200);
      return { q: clampStr(q.q, 300), options, answer: clampInt(q.answer, 0, Math.max(0, options.length - 1), 0) };
    }).filter((q) => q.q && q.options.length >= 2),
  })).filter((w) => w.theme);
  if (weeks.length === 0) throw new HttpError(502, PARSE_FAILED);
  const out = { title: clampStr(data?.title, 200, title), weeks };
  return { text: weeks.map((w) => `Week ${w.week}: ${w.theme}`).join("\n"), data: out, usage, tier: "complex" };
}

async function suggestTasks(c: Ctx): Promise<Out> {
  const p = c.payload;
  const goal = clampStr(p.goal, 500);
  if (!goal) throw bad("Which goal are we breaking down?");
  const members = objList(p.members, 12).map((m) => ({
    id: clampStr(m.id, 80),
    name: clampStr(m.name, 80),
    relation: clampStr(m.relation, 40),
    role: isRole(m.role) ? m.role : "guest",
  })).filter((m) => m.id && m.name);
  const memberIds = new Set(members.map((m) => m.id));
  const { data, usage } = await structured<Json>(
    c, "balanced",
    "Break this goal (or milestone) into 5-8 concrete tasks for the family. Assign each to the best-suited member by id, or null for the whole family. Chores given to children carry points between 10 and 40; adult tasks carry no points. dueInDays counts from today.",
    `{"tasks":[{"title":"<task>","memberId":"<member id or null>","dueInDays":<int>,"points":<int or omit>,"note":"<one helpful line>"}]}`,
    [describe("Goal", goal), describe("Milestone", clampStr(p.milestone, 300)), describe("Due", clampStr(p.due, 40)), describe("Members", members)].filter(Boolean).join("\n"),
    900,
  );
  const tasks = objList(data?.tasks, 8).map((t) => {
    const memberId = typeof t.memberId === "string" && memberIds.has(t.memberId) ? t.memberId : null;
    const isChild = memberId !== null && members.find((m) => m.id === memberId)?.role === "child";
    const points = t.points === undefined || t.points === null ? undefined : clampInt(t.points, 0, 100, 0);
    return {
      title: clampStr(t.title, 160),
      memberId,
      dueInDays: clampInt(t.dueInDays, 0, 365, 7),
      // Points are a child's currency; an adult "earning" 25 points is noise.
      points: isChild ? (points ?? 10) : undefined,
      note: clampStr(t.note, 300),
    };
  }).filter((t) => t.title);
  if (tasks.length === 0) throw new HttpError(502, PARSE_FAILED);
  return { text: tasks.map((t) => `• ${t.title}`).join("\n"), data: { tasks }, usage, tier: "balanced" };
}

async function mealPlan(c: Ctx): Promise<Out> {
  const p = c.payload;
  const budgetCents = clampInt(p.budgetCents, 0, 10_000_000, 0);
  const currency = clampStr(p.currency, 8, "GBP");
  const days = clampInt(p.days, 1, 14, 7);
  const people = clampInt(p.people, 1, 20, 4);
  const { data, usage } = await structured<Json>(
    c, "balanced",
    `A ${days}-day meal plan for ${people} people within a budget of ${budgetCents} minor units of ${currency} (${(budgetCents / 100).toFixed(2)} ${currency}). Simple, realistic home cooking; reuse ingredients across days; honour the preferences. The grocery list is consolidated (one line per item) with estimated costs in minor units, and totalCents is their sum — it must not exceed the budget.`,
    `{"days":[{"day":"<Day 1 / Monday>","breakfast":"<meal>","lunch":"<meal>","dinner":"<meal>"}],"grocery":[{"item":"<item>","qty":"<quantity>","estCents":<int>}],"totalCents":<int>,"note":"<one line on how the budget was used>"}`,
    [describe("Budget (minor units)", budgetCents), describe("Currency", currency), describe("Days", days), describe("People", people), describe("Preferences", clampStr(p.preferences, 1_000))].filter(Boolean).join("\n"),
    1_500,
  );
  const dayRows = objList(data?.days, days).map((d, i) => ({
    day: clampStr(d.day, 40, `Day ${i + 1}`),
    breakfast: clampStr(d.breakfast, 200),
    lunch: clampStr(d.lunch, 200),
    dinner: clampStr(d.dinner, 200),
  }));
  const grocery = objList(data?.grocery, 60).map((g) => ({
    item: clampStr(g.item, 120),
    qty: clampStr(g.qty, 60),
    estCents: clampInt(g.estCents, 0, 1_000_000, 0),
  })).filter((g) => g.item);
  if (dayRows.length === 0) throw new HttpError(502, PARSE_FAILED);
  // The model's own sum is not trusted: the list is what the family will buy.
  const totalCents = grocery.reduce((s, g) => s + g.estCents, 0) || clampInt(data?.totalCents, 0, 10_000_000, 0);
  const out = { days: dayRows, grocery, totalCents, note: clampStr(data?.note, 400) };
  return { text: dayRows.map((d) => `${d.day}: ${d.dinner}`).join("\n"), data: out, usage, tier: "balanced" };
}

async function packing(c: Ctx): Promise<Out> {
  const p = c.payload;
  const trip = p.trip && typeof p.trip === "object" ? p.trip : {};
  const destination = clampStr(trip.destination, 120);
  if (!destination) throw bad("Where is the trip to?");
  const members = objList(p.members, 12).map((m) => ({ name: clampStr(m.name, 80), ageBand: clampStr(m.ageBand, 20, "adult") })).filter((m) => m.name);
  const { data, usage } = await structured<Json>(
    c, "cheap",
    "A packing list for this trip: one list per travelling member, suited to their age band and the destination, dates and kind of trip, plus a short shared checklist for the household (documents, chargers, the house before leaving). Practical, not exhaustive.",
    `{"lists":[{"memberName":"<name>","items":["<item>"]}],"checklist":["<shared item>"]}`,
    [
      describe("Destination", destination), describe("From", clampStr(trip.from, 40)), describe("To", clampStr(trip.to, 40)),
      describe("Kind", clampStr(trip.kind, 60)), describe("Travellers", members.length ? members : "the family"),
    ].filter(Boolean).join("\n"),
    900,
  );
  const lists = objList(data?.lists, 12).map((l) => ({ memberName: clampStr(l.memberName, 80), items: strList(l.items, 30, 100) })).filter((l) => l.memberName && l.items.length);
  if (lists.length === 0) throw new HttpError(502, PARSE_FAILED);
  const out = { lists, checklist: strList(data?.checklist, 15, 150) };
  return { text: lists.map((l) => `${l.memberName}: ${l.items.join(", ")}`).join("\n"), data: out, usage, tier: "cheap" };
}

async function outfit(c: Ctx): Promise<Out> {
  const p = c.payload;
  const occasion = clampStr(p.occasion, 200);
  if (!occasion) throw bad("What is the occasion?");
  const closet = objList(p.closet, 80).map((i) => ({
    id: clampStr(i.id, 80), name: clampStr(i.name, 80), category: clampStr(i.category, 40), color: clampStr(i.color, 40), season: clampStr(i.season, 40),
  })).filter((i) => i.id && i.name);
  if (closet.length === 0) throw bad("The closet is empty — add a few items first.");
  const ids = new Set(closet.map((i) => i.id));
  const { data, usage } = await structured<Json>(
    c, "cheap",
    "Pick one outfit from the closet for the occasion (and weather, if given). Use ONLY item ids from the closet — never invent items. Explain the choice in one or two warm sentences.",
    `{"itemIds":["<closet item id>"],"why":"<1-2 sentences>"}`,
    [describe("Occasion", occasion), describe("Weather", clampStr(p.weather, 120)), describe("Closet", closet)].filter(Boolean).join("\n"),
    400,
  );
  const itemIds = strList(data?.itemIds, 8, 80).filter((id) => ids.has(id));
  if (itemIds.length === 0) throw new HttpError(502, PARSE_FAILED);
  const why = clampStr(data?.why, 400);
  return { text: why, data: { itemIds, why }, usage, tier: "cheap" };
}

async function song(c: Ctx): Promise<Out> {
  const p = c.payload;
  const kind = ["family", "worship", "lullaby", "birthday"].includes(p.kind) ? p.kind : "family";
  const names = strList(p.names, 10, 60);
  const theme = clampStr(p.theme, 300, kind);
  const { data, usage } = await structured<Json>(
    c, "balanced",
    `Write an original ${kind} song for this family — singable, simple chords a beginner could play, and lyrics that use the names given. Never copy an existing song. Structure it verse/chorus/bridge as suits the kind.`,
    `{"title":"<title>","key":"<e.g. G major>","tempo":"<e.g. 76 bpm, gentle>","structure":[{"section":"<Verse 1 / Chorus / Bridge>","chords":"<chord line, e.g. G  D  Em  C>","lyrics":"<the lines, separated by \\n>"}]}`,
    [describe("Kind", kind), describe("Names", names.length ? names.join(", ") : "the family"), describe("Theme", theme)].filter(Boolean).join("\n"),
    900,
  );
  const structure = objList(data?.structure, 10).map((s) => ({ section: clampStr(s.section, 40), chords: clampStr(s.chords, 200), lyrics: clampStr(s.lyrics, 1_200) })).filter((s) => s.lyrics);
  if (structure.length === 0) throw new HttpError(502, PARSE_FAILED);
  const out = { title: clampStr(data?.title, 120, theme), key: clampStr(data?.key, 40), tempo: clampStr(data?.tempo, 60), structure };
  const lyrics = structure.map((s) => `[${s.section || "Section"}]\n${s.lyrics}`).join("\n\n");
  return { text: lyrics, data: out, usage, tier: "balanced" };
}

async function storyboard(c: Ctx): Promise<Out> {
  const p = c.payload;
  const prompt = clampStr(p.prompt ?? c.body.prompt, 1_000);
  if (!prompt) throw bad("What is the story about?");
  const audience = clampStr(p.audience, 60, "family");
  const scenes = clampInt(p.scenes, 3, 10, 6);
  const { data, usage } = await structured<Json>(
    c, "balanced",
    `A visual story in exactly ${scenes} scenes for a ${audience} audience. Each scene has a caption (one line), a visual description an illustrator could draw, and the narration read aloud (2-3 sentences). Gentle, hopeful and age-appropriate.`,
    `{"title":"<title>","scenes":[{"n":<1..${scenes}>,"caption":"<one line>","visual":"<what we see>","narration":"<2-3 sentences>"}]}`,
    [describe("Story", prompt), describe("Audience", audience)].filter(Boolean).join("\n"),
    1_200,
  );
  const rows = objList(data?.scenes, scenes).map((s, i) => ({
    n: clampInt(s.n, 1, scenes, i + 1), caption: clampStr(s.caption, 160), visual: clampStr(s.visual, 500), narration: clampStr(s.narration, 700),
  })).filter((s) => s.narration);
  if (rows.length === 0) throw new HttpError(502, PARSE_FAILED);
  const out = { title: clampStr(data?.title, 120, prompt.slice(0, 60)), scenes: rows };
  return { text: rows.map((s) => `${s.n}. ${s.caption}`).join("\n"), data: out, usage, tier: "balanced" };
}

/** Pictures go straight to Gemini's image model over REST — the shared client
 *  is text-only. A key that is missing, unpaid or rate-limited is a plan
 *  matter, not an error: the screen shows `unavailable` and moves on. */
async function image(c: Ctx): Promise<Out> {
  const prompt = clampStr(c.body.prompt ?? c.payload.prompt, 1_500);
  if (!prompt) throw bad("Describe the picture you want.");
  const key = Deno.env.get("GEMINI_API_KEY");
  const soft: Out = { text: "", unavailable: IMAGE_UNAVAILABLE, usage: zeroUsage(IMAGE_MODEL), tier: "complex" };
  if (!key) return soft;

  // The role rules travel with the prompt so a child's picture request stays a
  // child's picture; the family grounding is not needed to draw and would only
  // cost tokens, so the persona and the rules go alone.
  const guide = c.role === "child"
    ? "Gentle, bright, child-friendly illustration; nothing frightening or violent."
    : "Warm, family-friendly illustration.";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${guide}\n${prompt}` }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
    signal: AbortSignal.timeout(60_000),
  }).catch((e) => {
    console.error("[wafe-ai] image request failed:", e instanceof Error ? e.message : String(e));
    return null;
  });
  if (!res || !res.ok) {
    if (res) console.warn(`[wafe-ai] image model ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    return soft;
  }
  const data = await res.json().catch(() => null) as Json;
  const parts: Json[] = data?.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.map((p) => p?.inlineData ?? p?.inline_data).find((d) => d && typeof d.data === "string");
  if (!inline) {
    console.warn("[wafe-ai] image model returned no inline image");
    return soft;
  }
  const mime = typeof inline.mimeType === "string" ? inline.mimeType : typeof inline.mime_type === "string" ? inline.mime_type : "image/png";
  const bytes = Uint8Array.from(atob(inline.data), (ch) => ch.charCodeAt(0));
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const path = `wafe/${safeSegment(c.spaceId)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await c.admin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(`Couldn't save the picture: ${error.message}`);
  const url = c.admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { text: "", data: { url }, usage: zeroUsage(IMAGE_MODEL), tier: "complex" };
}

const HANDLERS: Record<Action, (c: Ctx) => Promise<Out>> = {
  "ask": ask,
  "briefing": briefing,
  "reflect": reflect,
  "summarize": summarize,
  "learning-plan": learningPlan,
  "book-course": bookCourse,
  "suggest-tasks": suggestTasks,
  "meal-plan": mealPlan,
  "packing": packing,
  "outfit": outfit,
  "song": song,
  "storyboard": storyboard,
  "image": image,
};

/** callJson's two parse failures — an apology instead of JSON, or JSON cut off
 *  at maxTokens — are the companion's fault, not the provider's, and the person
 *  should be told to try again rather than shown a stack of provider text. */
const looksLikeParseFailure = (msg: string) => /valid JSON|was cut off/i.test(msg);

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    if (!isAction(body.action)) return json({ error: "Unknown action." }, 400);
    const action: Action = body.action;

    const admin = adminClient();
    const caller = await resolveCaller(req, admin, body);

    if (caller.role === "guest" && !GUEST_ACTIONS.has(action)) return json({ error: "That isn't something a guest can ask the companion for." }, 403);
    if (caller.role === "child" && CHILD_DENIED.has(action)) return json({ error: "A parent can help with that one." }, 403);

    const allowance = await assertWithinCap(admin, caller.orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    const ctx: Ctx = {
      body,
      payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      role: caller.role,
      system: systemPrompt(caller.role, clampStr(body.grounding, GROUNDING_MAX), clampStr(body.extraContext, EXTRA_MAX)),
      spaceId: String(body.spaceId ?? ""),
      admin,
    };

    const t0 = Date.now();
    let out: Out;
    try {
      out = await HANDLERS[action](ctx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof HttpError) throw e;
      if (looksLikeParseFailure(msg)) {
        // The tokens were spent even though nothing usable came back; a
        // failed row keeps the cap and the cost dashboard honest.
        await meter(admin, { organizationId: caller.orgId, userId: caller.userId, model: modelFor("balanced"), feature: `wafe-${action}`, tier: "balanced", inTok: 0, outTok: 0, latencyMs: Date.now() - t0, status: "failed" });
        return json({ error: PARSE_FAILED }, 502);
      }
      throw e;
    }

    await meter(admin, {
      organizationId: caller.orgId,
      userId: caller.userId,
      model: out.usage.model,
      feature: `wafe-${action}`,
      tier: out.tier,
      inTok: out.usage.inTok,
      outTok: out.usage.outTok,
      cacheWriteTok: out.usage.cacheWriteTok,
      cacheReadTok: out.usage.cacheReadTok,
      latencyMs: Date.now() - t0,
      status: out.unavailable ? "unavailable" : "ok",
    });

    if (out.unavailable) return json({ text: "", unavailable: out.unavailable });
    return json({ text: out.text, data: out.data, model: out.usage.model });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message, ...(err.status === 429 ? { limitReached: true } : {}) }, err.status);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
