// Phoxta — everything true about a business, gathered once, for the content engine.
//
// WHY THIS EXISTS
//
// The content planner used to read four columns: the org's name, its vertical,
// its branding and twenty product names. Everything that makes a post worth
// reading — what actually sells, what customers actually ask, what people
// actually said in a review, which offer is actually running this week — was
// sitting in the same database, unread. That is the whole difference between
// this and a generic caption tool: a stranger's AI can write "New arrivals are
// here!"; only this one can write "Three left in the oat linen, and four people
// asked for it by name last week."
//
// SO THE RULE HERE IS: READ REAL ROWS, COUNT THEM HONESTLY, AND SAY WHAT WAS
// MISSING. `coverage` is not diagnostics — it is a product surface. A business
// with no reviews connected should be told that the plan was written without
// social proof, because that is both the honest thing and the thing that makes
// them go and connect it.
//
// WHY DIRECT QUERIES RATHER THAN THE READ TOOLS IN tools.ts
//
// Those tools are shaped for a model-driven loop: paged, twenty rows, and
// deliberately narrow (`list_products` returns no description, which is the one
// field a writer actually needs). This is a single deterministic pass that wants
// aggregates and full text. It does reuse the one thing tools.ts gets right that
// nothing else does — the untrusted-text frame, imported from retrieve.ts.
//
// CUSTOMER TEXT IS FENCED. A prompt injection buried in a support ticket is a
// nuisance in a chat reply and a published statement here — it goes out under
// the business's name, to their whole audience, on a schedule, weeks later, with
// nobody watching. Inbox and review text therefore reaches the model only
// through `fenceCustomer`.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import { fenceCustomer } from "./retrieve.ts";
import { memoryContext } from "./tools.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const money = (cents?: number | null, ccy = "USD") =>
  typeof cents === "number" ? `${ccy} ${(cents / 100).toFixed(2)}` : "";

/** Trim free text to something a prompt can carry without drowning. */
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export type Coverage = { source: string; rows: number; note: string };

export type BusinessContext = {
  org: {
    name: string;
    vertical: string;
    tagline: string;
    description: string;
    timezone: string;
    hours: Json;
    address: string;
    phone: string;
    email: string;
  };
  /** How this business already talks, until org_voice exists (Phase 3). */
  voice: { persona: string; tone: string; procedures: string; memory: string };
  catalogue: {
    products: { name: string; description: string; price: string; stock: number; status: string }[];
    services: { name: string; description: string; price: string; durationMin: number }[];
  };
  /** Real, live, unexpired offers. The only thing a campaign may be anchored on. */
  offers: { code: string; what: string; expires: string | null }[];
  /** Real reviews. The only source a "customers say" claim may draw on. */
  proof: { rating: number; title: string; body: string; author: string }[];
  /** What actually sold, aggregated — not a list of orders. */
  sells: { name: string; units: number; revenueCents: number }[];
  demand: { bookings30d: number; reservations30d: number; busiestDays: string[] };
  audience: {
    segments: { name: string; criteria: string; size: number }[];
    stages: { stage: string; count: number }[];
  };
  /** Customer-authored. Never interpolated raw — see digest(). */
  inbox: { intents: { intent: string; count: number }[]; questions: { source: string; text: string }[] };
  channels: { platform: string; handle: string }[];
  /** So this month builds on last month instead of repeating it. */
  history: { lastPlanTitle: string; recentAngles: string[]; recentCaptions: string[] };
  /** Positioning already thought through, when a dossier exists. */
  dossier: { section: string; summary: string }[];
  coverage: Coverage[];
};

/**
 * A count plus the sentence an owner should read when it is zero.
 *
 * `failed` is NOT the same as empty, and conflating them would defeat the point
 * of coverage entirely: a broken read reported as "no reviews yet" tells the
 * owner to go and collect reviews they already have. Same distinction findStock
 * draws between "no photograph matched" and "Pexels could not be asked".
 */
function cover(source: string, rows: number, emptyNote: string, failed?: unknown): Coverage {
  if (failed) {
    return { source, rows: 0, note: `Could not read ${source} — the plan was written without it. This is a fault, not an empty table.` };
  }
  return { source, rows, note: rows === 0 ? emptyNote : "" };
}

/**
 * One pass over everything the engine can know. Every query is org-scoped and
 * every failure is survivable: a business with no orders, no reviews and no
 * inbox still gets a plan, it just gets one whose `coverage` says so.
 */
export async function gatherBusinessContext(
  admin: SupabaseClient,
  orgId: string,
  opts?: { windowDays?: number },
): Promise<BusinessContext> {
  const days = opts?.windowDays ?? 90;
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const nowIso = new Date().toISOString();

  const [
    orgRes, cfgRes, memRes,
    productsRes, servicesRes,
    promoRes, reviewsRes,
    itemsRes, bookingsRes, reservationsRes,
    segmentsRes, contactsRes,
    convosRes, ticketsRes, faqsRes,
    accountsRes, plansRes, postsRes, dossierRes,
  ] = await Promise.all([
    admin.from("organizations").select("name, vertical, branding, timezone, profile").eq("id", orgId).maybeSingle(),
    admin.from("agent_config").select("persona, tone, procedures").eq("organization_id", orgId).maybeSingle(),
    memoryContext(admin, orgId).catch(() => ""),
    admin.from("products").select("name, description, price_cents, currency, stock, status").eq("organization_id", orgId).limit(40),
    admin.from("services").select("name, description, price_cents, currency, duration_min").eq("organization_id", orgId).eq("active", true).limit(25),
    admin.from("promo_codes").select("code, kind, value, min_cents, expires_at").eq("organization_id", orgId).eq("active", true).limit(10),
    admin.from("reviews").select("rating, title, body, author_name").eq("organization_id", orgId).eq("status", "published").gte("rating", 4).order("created_at", { ascending: false }).limit(12),
    admin.from("order_items").select("name, quantity, unit_price_cents, orders!inner(created_at, status)").eq("organization_id", orgId).gte("orders.created_at", since).limit(400),
    admin.from("bookings").select("start_at").eq("organization_id", orgId).gte("start_at", since).limit(300),
    admin.from("reservations").select("start_date").eq("organization_id", orgId).gte("start_date", since.slice(0, 10)).limit(300),
    admin.from("segments").select("name, criteria, contact_ids").eq("organization_id", orgId).limit(10),
    admin.from("crm_contacts").select("stage").eq("organization_id", orgId).limit(500),
    admin.from("conversations").select("intent, summary").eq("organization_id", orgId).gte("created_at", since).limit(120),
    admin.from("tickets").select("subject").eq("organization_id", orgId).gte("created_at", since).limit(60),
    admin.from("faqs").select("question, body").eq("organization_id", orgId).eq("active", true).limit(25),
    admin.from("social_accounts").select("platform, handle").eq("organization_id", orgId).eq("status", "connected"),
    admin.from("content_plans").select("title, starts_on").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1),
    admin.from("social_posts").select("caption, angle").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30),
    admin.from("org_dossier_sections").select("section, content").eq("organization_id", orgId).limit(12),
  ]);

  const org = (orgRes.data ?? {}) as Json;
  const branding = (org.branding ?? {}) as Json;
  const profile = (org.profile ?? {}) as Json;
  const cfg = (cfgRes.data ?? {}) as Json;

  const products = ((productsRes.data ?? []) as Json[]).map((p) => ({
    name: clip(p.name, 90),
    description: clip(p.description, 220),
    price: money(p.price_cents, p.currency ?? "USD"),
    stock: Number(p.stock ?? 0),
    status: String(p.status ?? ""),
  }));

  const services = ((servicesRes.data ?? []) as Json[]).map((s) => ({
    name: clip(s.name, 90),
    description: clip(s.description, 220),
    price: money(s.price_cents, s.currency ?? "USD"),
    durationMin: Number(s.duration_min ?? 0),
  }));

  // Unexpired only. An offer that ran out last week is not something to build a
  // campaign on, and the model must never see it as if it were live.
  const offers = ((promoRes.data ?? []) as Json[])
    .filter((c) => !c.expires_at || String(c.expires_at) > nowIso)
    .map((c) => ({
      code: String(c.code ?? ""),
      what: c.kind === "percent" ? `${c.value}% off` : `${money(Number(c.value))} off`,
      expires: c.expires_at ? String(c.expires_at).slice(0, 10) : null,
    }));

  const proof = ((reviewsRes.data ?? []) as Json[]).map((r) => ({
    rating: Number(r.rating ?? 0),
    title: clip(r.title, 120),
    body: clip(r.body, 320),
    author: clip(r.author_name, 60),
  }));

  // Aggregate, don't list. "Which product sold most" is one line; sixty order
  // rows is a model working out arithmetic it should never have been handed.
  const sellMap = new Map<string, { units: number; revenueCents: number }>();
  for (const it of ((itemsRes.data ?? []) as Json[])) {
    const name = clip(it.name, 90) || "Unnamed";
    const cur = sellMap.get(name) ?? { units: 0, revenueCents: 0 };
    cur.units += Number(it.quantity ?? 0);
    cur.revenueCents += Number(it.quantity ?? 0) * Number(it.unit_price_cents ?? 0);
    sellMap.set(name, cur);
  }
  const sells = [...sellMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayTally = new Array(7).fill(0);
  for (const b of ((bookingsRes.data ?? []) as Json[])) {
    const d = new Date(String(b.start_at));
    if (!isNaN(d.getTime())) dayTally[d.getUTCDay()]++;
  }
  for (const r of ((reservationsRes.data ?? []) as Json[])) {
    const d = new Date(`${String(r.start_date)}T12:00:00Z`);
    if (!isNaN(d.getTime())) dayTally[d.getUTCDay()]++;
  }
  const busiestDays = dayTally
    .map((n, i) => ({ n, day: DOW[i] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((x) => x.day);

  const segments = ((segmentsRes.data ?? []) as Json[]).map((s) => ({
    name: clip(s.name, 80),
    criteria: clip(s.criteria, 160),
    size: Array.isArray(s.contact_ids) ? s.contact_ids.length : 0,
  }));

  const stageMap = new Map<string, number>();
  for (const c of ((contactsRes.data ?? []) as Json[])) {
    const s = String(c.stage ?? "unknown");
    stageMap.set(s, (stageMap.get(s) ?? 0) + 1);
  }
  const stages = [...stageMap.entries()].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count);

  const intentMap = new Map<string, number>();
  const questions: { source: string; text: string }[] = [];
  for (const c of ((convosRes.data ?? []) as Json[])) {
    const i = clip(c.intent, 40);
    if (i) intentMap.set(i, (intentMap.get(i) ?? 0) + 1);
    const s = clip(c.summary, 200);
    if (s && questions.length < 25) questions.push({ source: "conversations", text: s });
  }
  for (const t of ((ticketsRes.data ?? []) as Json[])) {
    const s = clip(t.subject, 160);
    if (s && questions.length < 40) questions.push({ source: "tickets", text: s });
  }
  for (const f of ((faqsRes.data ?? []) as Json[])) {
    const q = clip(f.question, 160);
    if (q && questions.length < 55) questions.push({ source: "faqs", text: q });
  }
  const intents = [...intentMap.entries()].map(([intent, count]) => ({ intent, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const posts = (postsRes.data ?? []) as Json[];
  const history = {
    lastPlanTitle: clip((plansRes.data ?? [])[0]?.title, 120),
    // The typed angle when the post has one; the caption's opening line when it
    // predates the column. Posts written before the content engine existed are
    // still evidence of what this business has already said.
    recentAngles: posts
      .map((p) => clip(p.angle, 80) || clip(String(p.caption ?? "").split("\n")[0], 80))
      .filter(Boolean).slice(0, 20),
    recentCaptions: posts.map((p) => clip(p.caption, 140)).filter(Boolean).slice(0, 10),
  };

  const dossier = ((dossierRes.data ?? []) as Json[])
    .map((d) => ({ section: String(d.section ?? ""), summary: clip(JSON.stringify(d.content ?? {}), 700) }))
    .filter((d) => d.section);

  const channels = ((accountsRes.data ?? []) as Json[]).map((a) => ({
    platform: String(a.platform ?? ""),
    handle: String(a.handle ?? ""),
  }));

  const ctx: BusinessContext = {
    org: {
      name: clip(org.name, 120) || "this business",
      vertical: clip(org.vertical, 60),
      tagline: clip(branding.tagline, 160),
      description: clip(branding.description, 400),
      timezone: String(org.timezone ?? "UTC"),
      hours: profile.hours ?? null,
      address: clip(profile.address, 160),
      phone: clip(profile.phone, 40),
      email: clip(profile.email, 80),
    },
    voice: {
      persona: clip(cfg.persona, 300),
      tone: clip(cfg.tone, 40),
      procedures: clip(cfg.procedures, 900),
      memory: clip(memRes as string, 900),
    },
    catalogue: { products, services },
    offers,
    proof,
    sells,
    demand: {
      bookings30d: (bookingsRes.data ?? []).length,
      reservations30d: (reservationsRes.data ?? []).length,
      busiestDays,
    },
    audience: { segments, stages },
    inbox: { intents, questions },
    channels,
    history,
    dossier,
    coverage: [],
  };

  ctx.coverage = [
    cover("products", products.length, "No products listed — the plan cannot name what you sell.", productsRes.error),
    cover("services", services.length, "", servicesRes.error),
    cover("offers", offers.length, "No live promo codes, so no campaign is anchored on a real offer.", promoRes.error),
    cover("reviews", proof.length, "No published reviews yet — nothing to quote as social proof. Collecting these is the single biggest upgrade to next month's plan.", reviewsRes.error),
    cover("orders", sells.length, "No sales in this window, so the plan cannot lead with what actually sells.", itemsRes.error),
    cover("conversations", intents.length, "No inbox history — the plan is written without your customers' own words.", convosRes.error),
    cover("segments", segments.length, "No audience segments defined; the plan writes to a general audience.", segmentsRes.error),
    cover("channels", channels.length, "No social accounts connected.", accountsRes.error),
    cover("dossier", dossier.length, "No business dossier written — strategy reasons from your catalogue alone.", dossierRes.error),
    cover("history", history.recentAngles.length, "", postsRes.error),
  ];

  // A failed read is a fault, and a fault nobody can see is a fault that stays.
  for (const [name, res] of Object.entries({
    products: productsRes, services: servicesRes, promos: promoRes, reviews: reviewsRes,
    orderItems: itemsRes, conversations: convosRes, tickets: ticketsRes, faqs: faqsRes,
    segments: segmentsRes, contacts: contactsRes, bookings: bookingsRes,
    reservations: reservationsRes, accounts: accountsRes, plans: plansRes,
    posts: postsRes, dossier: dossierRes, org: orgRes, config: cfgRes,
  })) {
    const err = (res as Json)?.error;
    if (err) console.error(`businessContext: ${name} read failed for org ${orgId}:`, err.message ?? err);
  }

  return ctx;
}

/** The coverage rows worth showing an owner: the gaps, most useful first. */
export function coverageOf(ctx: BusinessContext): Coverage[] {
  return ctx.coverage;
}

/**
 * The context as a prompt block.
 *
 * `budget` is a character ceiling; sections are emitted in priority order and
 * the block stops when the budget is spent, so a business with a huge catalogue
 * cannot crowd out its own reviews.
 */
export function contextDigest(ctx: BusinessContext, budget = 9000): string {
  const parts: string[] = [];
  let spent = 0;
  const push = (s: string) => {
    if (!s) return;
    if (spent + s.length > budget) return;
    parts.push(s);
    spent += s.length;
  };

  const o = ctx.org;
  push([
    `THE BUSINESS: ${o.name}${o.vertical ? `, trading in ${o.vertical}` : ""}.`,
    o.tagline ? `Tagline: ${o.tagline}` : "",
    o.description ? `About: ${o.description}` : "",
    o.address ? `Where: ${o.address}` : "",
    `Timezone: ${o.timezone}`,
  ].filter(Boolean).join("\n"));

  if (ctx.voice.persona || ctx.voice.tone || ctx.voice.procedures || ctx.voice.memory) {
    push([
      "\nHOW THIS BUSINESS ALREADY TALKS (match it — this is them, not a style you are choosing):",
      ctx.voice.persona ? `Persona: ${ctx.voice.persona}` : "",
      ctx.voice.tone ? `Tone: ${ctx.voice.tone}` : "",
      ctx.voice.procedures ? `The owner's own rules:\n${ctx.voice.procedures}` : "",
      ctx.voice.memory ? `What we remember about them:\n${ctx.voice.memory}` : "",
    ].filter(Boolean).join("\n"));
  }

  if (ctx.offers.length) {
    push([
      "\nLIVE OFFERS — these are REAL and are the ONLY discounts, codes or deadlines you may mention. Never invent another:",
      ...ctx.offers.map((f) => `- ${f.code}: ${f.what}${f.expires ? `, expires ${f.expires}` : ""}`),
    ].join("\n"));
  } else {
    push("\nLIVE OFFERS: none. Do not mention a discount, a code or a deadline — this business has none running.");
  }

  if (ctx.sells.length) {
    push([
      `\nWHAT ACTUALLY SELLS (last 90 days, real orders):`,
      ...ctx.sells.map((s) => `- ${s.name}: ${s.units} sold`),
    ].join("\n"));
  }

  if (ctx.catalogue.products.length) {
    push([
      "\nPRODUCTS:",
      ...ctx.catalogue.products.slice(0, 25).map((p) =>
        `- ${p.name}${p.price ? ` (${p.price})` : ""}${p.stock ? `, ${p.stock} in stock` : ""}${p.description ? ` — ${p.description}` : ""}`),
    ].join("\n"));
  }
  if (ctx.catalogue.services.length) {
    push([
      "\nSERVICES:",
      ...ctx.catalogue.services.map((s) =>
        `- ${s.name}${s.price ? ` (${s.price})` : ""}${s.durationMin ? `, ${s.durationMin} min` : ""}${s.description ? ` — ${s.description}` : ""}`),
    ].join("\n"));
  }

  if (ctx.proof.length) {
    push([
      "\nWHAT CUSTOMERS SAID — real published reviews. A 'customers love…' claim may only rest on these:",
      fenceCustomer(ctx.proof.map((r) => ({
        source: "reviews",
        text: `${r.rating}/5${r.title ? ` — ${r.title}` : ""}: ${r.body}`,
      }))),
    ].join("\n"));
  }

  if (ctx.inbox.intents.length || ctx.inbox.questions.length) {
    push([
      "\nWHAT CUSTOMERS ACTUALLY ASK — their words, from the inbox and the FAQ. The best posts answer one of these:",
      ctx.inbox.intents.length ? `Most common intents: ${ctx.inbox.intents.map((i) => `${i.intent} (${i.count})`).join(", ")}` : "",
      fenceCustomer(ctx.inbox.questions.slice(0, 20)),
    ].filter(Boolean).join("\n"));
  }

  if (ctx.audience.segments.length || ctx.audience.stages.length) {
    push([
      "\nWHO THEY SELL TO:",
      ...ctx.audience.segments.map((s) => `- Segment "${s.name}" (${s.size} people)${s.criteria ? `: ${s.criteria}` : ""}`),
      ctx.audience.stages.length ? `Pipeline: ${ctx.audience.stages.map((s) => `${s.stage} ${s.count}`).join(", ")}` : "",
    ].filter(Boolean).join("\n"));
  }

  if (ctx.demand.busiestDays.length) {
    push(`\nDEMAND: busiest days are ${ctx.demand.busiestDays.join(", ")} (${ctx.demand.bookings30d + ctx.demand.reservations30d} bookings/reservations in the window).`);
  }

  if (ctx.channels.length) {
    push(`\nCONNECTED CHANNELS: ${ctx.channels.map((c) => `${c.platform}${c.handle ? ` (@${c.handle})` : ""}`).join(", ")}.`);
  }

  if (ctx.history.recentAngles.length) {
    push([
      "\nWHAT THEY POSTED RECENTLY — do not repeat these angles; build on them:",
      ...ctx.history.recentAngles.slice(0, 15).map((a) => `- ${a}`),
    ].join("\n"));
  }

  if (ctx.dossier.length) {
    push([
      "\nTHEIR OWN STRATEGY WORK (from the business dossier — treat as settled positioning):",
      ...ctx.dossier.map((d) => `## ${d.section}\n${d.summary}`),
    ].join("\n"));
  }

  const gaps = ctx.coverage.filter((c) => c.note);
  if (gaps.length) {
    push([
      "\nWHAT YOU COULD NOT SEE — say so rather than inventing around it:",
      ...gaps.map((g) => `- ${g.note}`),
    ].join("\n"));
  }

  return parts.join("\n");
}
