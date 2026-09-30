// Phoxta — startup-school-ai: the three AI features of the founder school.
//
//   brief    mentor-facing preparation for a 1:1, built from the venture record,
//            what the founder has worked through, where they scored badly, and
//            what was left open last time.
//   capture  after a 1:1: the transcript becomes draft shared notes and draft
//            action items, which a human then approves.
//   advise   a grounded, Socratic adviser over the handbook's frameworks.
//
// Why these three and not a chatbot. The best available evidence on AI tutoring
// is not encouraging about open-ended assistants: a randomised trial of ~1,000
// students found an ungoverned GPT tutor left them measurably WORSE on an
// unassisted exam, and a two-year trial of a carefully-built one found no gain
// at all because students engaged it in only ~17% of the moments they got
// something wrong. What did work in both literatures had a teacher in the loop.
// So every op here either serves the mentor, or produces a draft a human
// approves — and `advise` is explicitly forbidden from doing the founder's work.
//
// Metered like every other AI feature: assertWithinCap BEFORE the model, meter()
// after, against this school's org.
import { json, preflight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient, userClient } from "../_shared/supabaseAdmin.ts";
import { modelFor } from "../_shared/models.ts";
import { callJson } from "../_shared/anthropic.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Below this a transcript is a greeting, not a session. */
const MIN_TRANSCRIPT = 400;
const MAX_TRANSCRIPT = 40_000;
const MAX_QUESTION = 1_200;

type Brief = {
  headline: string;
  context: string[];
  openWith: string;
  watchFor: string[];
  carriedOver: string[];
};
type Capture = { notes: string; actions: string[] };
type Advice = { answer: string; framework: string; source: string; nextStep: string; refused?: boolean };

/**
 * The frameworks the adviser is allowed to reason from.
 *
 * Deliberately an index rather than the corpus: the point is that every answer
 * NAMES the framework and the chapter it came from, so a founder can go and read
 * the actual thing. An adviser that paraphrases a book without saying which book
 * is indistinguishable from one making it up.
 */
const FRAMEWORKS = `
STAGE 0 FOUNDER FIT (ch 1; 2026 layer S13)
  The three must-haves: a plan, the ability to execute it, motivation that lasts.
  Five trait clusters, scored with evidence. Gaps resolve as learn / hire / co-found.
  2026 correction: prior same-industry experience predicts success; personality traits do not.
STAGE 1 OPPORTUNITY (ch 2, appx B; S10)
  Ten market questions, each with a confidence and a test that could settle it.
  Five characteristics: value, profit, fit, durability, financeable. Risk-vs-return line.
  Breakeven = fixed costs / contribution per unit. War-game a competitor's -20% price.
  2026 correction: product-market fit has LEVELS, is measured continuously, and can be lost.
STAGE 2 MODEL AND STRATEGY (ch 3; S10)
  Five questions: value, capture, why you, why they stay, how they find you.
  Magretta's narrative test and numbers test. A strategy is defined by what it rules out.
  Recognise, search, then pivot or persevere. Do not scale before the search is done.
STAGE 3 LEGAL FORM (ch 4; S09)
  Six forms across liability, tax, ownership, cost, fundraising fit, continuity.
  Six founder-agreement terms: split, vesting, decision rights, roles, exit, deadlock.
  Always jurisdiction-dependent. Output a brief for local counsel, never advice.
STAGE 4 PLAN AND PITCH (ch 5; S13)
  Seven sections. People and model outrank the numbers. State the assumption behind each figure.
  Compressions: 100 words, one sentence, a presentation deck and a reading deck.
  2026 correction: the 40-page plan survives for banks, grants and visas; otherwise a one-pager, deck, memo and data room.
STAGE 5 STARTUP MONEY (ch 6, appx A; S06)
  Three business types: ~70% Main Street, ~17% supply-chain, ~3% high-growth.
  Size the opening balance sheet first, then stack sources cheapest-first.
STAGE 6 LAUNCH AND OPERATE (S01-S05)
  Founder-led sales to ~100 customers. Discovery asks about the past, not the future.
  Three statements and how they link. The 13-week rolling cash forecast.
  CAC, payback, cohort retention, burn and runway. Decide at nine months of runway, not three.
STAGE 7 GROWTH MONEY (ch 7-8; S06)
  The banker's three questions; five lender ratios; the matching principle.
  A venture fund needs one in ~15 to be very large; that is why the terms look as they do.
  Liquidation preference, anti-dilution, protective provisions. Four ways to delay equity.
STAGE 8 SCALE (ch 10-12; S11)
  Three post-startup questions. Content -> behaviours -> results -> context.
  Never outsource a customer-facing link or depend on a single partner.
  2026 tension: "founder mode" argues selective depth beats blanket delegation. Present both.
STAGE 9 HARVEST (ch 13, appx C; S12)
  Name the motivation before the mechanism. Three valuation approaches; hold a range.
  Diligence surfaces what you knew and did not fix. Run your own a year early.
CROSS-CUTTING AI (S07)
  The remove test: turn the AI off — degrade = AI-enabled, stop = AI-native.
  Agentic loop: outline, search, draft, self-critique, revise.
  Evals: read real traces by hand first; binary judges; a 100% pass rate means they are too easy.
  Lethal trifecta: private data + untrusted content + an outbound channel. Remove a leg.
`.trim();

const clean = (v: unknown, max = 400): string => String(v ?? "").trim().slice(0, max);
const list = (v: unknown, n: number, max = 300): string[] =>
  (Array.isArray(v) ? v : []).map((x) => clean(x, max)).filter(Boolean).slice(0, n);

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const t0 = Date.now();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      op?: string;
      organizationId?: string;
      bookingId?: string;
      question?: string;
      force?: boolean;
    };
    const op = String(body.op ?? "");
    const orgId = String(body.organizationId ?? "");
    if (!UUID_RE.test(orgId)) return json({ error: "Missing school." }, 400);
    if (!["brief", "capture", "advise"].includes(op)) return json({ error: "Unknown operation." }, 400);

    const u = await requireUser(req);
    if ("error" in u) return u.error;
    const admin = adminClient();
    const scopedUser = userClient((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
    if (op === "advise") {
      const { data: paid, error: accessError } = await scopedUser.rpc("cs_has_access", { p_org: orgId, p_min_plan: "self_study" });
      if (accessError || paid !== true) return json({ error: "Active learner admission is required for the adviser." }, 403);
    } else {
      const { data: booking } = await admin.from("cs_bookings").select("mentor_id,user_id").eq("organization_id", orgId).eq("id", String(body.bookingId ?? "")).maybeSingle();
      if (!booking) return json({ error: "This mentoring session is not available." }, 403);
      const { data: allowed } = await scopedUser.rpc("cs_mentor_access", { p_org: orgId, p_mentor: booking.mentor_id, p_learner: booking.user_id });
      if (allowed !== true) return json({ error: "An active assignment to this founder is required." }, 403);
    }

    // Enrolled at this school? The same proof the classroom uses.
    const { data: profile } = await admin
      .from("cs_profiles")
      .select("user_id, name")
      .eq("organization_id", orgId)
      .eq("user_id", u.userId)
      .maybeSingle();
    if (!profile) return json({ error: "That school could not be found." }, 404);

    // ---- advise ------------------------------------------------------------
    if (op === "advise") {
      const question = clean(body.question, MAX_QUESTION);
      if (question.length < 8) return json({ error: "Ask a fuller question." }, 400);

      const [{ data: venture }, { data: experiments }] = await Promise.all([
        admin
          .from("cs_ventures")
          .select("name, one_liner, stage, country, doc")
          .eq("organization_id", orgId)
          .eq("user_id", u.userId)
          .maybeSingle(),
        admin
          .from("cs_experiments")
          .select("title, hypothesis, threshold, status, evidence, result, decision, next_step, updated_at")
          .eq("organization_id", orgId)
          .eq("user_id", u.userId)
          .order("updated_at", { ascending: false })
          .limit(12),
      ]);

      const allowance = await assertWithinCap(admin, orgId);
      if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE }, 429);

      const system = [
        "You are an adviser inside a founder school. You reason ONLY from the framework index below.",
        "",
        "Rules, in order of importance:",
        "1. NEVER do the founder's work for them. If asked to write their plan, their pitch, their",
        "   positioning statement or their market analysis, refuse and hand back the question that",
        "   would let them write it themselves. Set refused=true when you do this.",
        "2. Name the framework and the chapter you are drawing on, every time, so they can go and",
        "   read it. If no framework in the index applies, say so rather than improvising one.",
        "3. Ask before you answer when the answer depends on something you were not told —",
        "   especially the country, which changes legal form, funding sources and payment rails.",
        "4. Where the 2018 handbook and the 2026 layer disagree, present both and say which is which.",
        "5. Never give legal, tax or investment advice. Point at counsel, an accountant or an appraiser.",
        "6. A Phoxta turnkey system is a starting point, not validation. When the venture record says",
        "   path=phoxta_turnkey or hybrid, focus on local customer proof, operation, quality and unit economics.",
        "7. Plain British English. No encouragement padding, no 'great question'.",
        "",
        "FRAMEWORK INDEX:",
        FRAMEWORKS,
        "",
        'Return JSON: { "answer": string (3-6 sentences), "framework": string (the one you used),',
        '"source": string (chapter or supplement, e.g. "ch 2 / S10"), "nextStep": string (one concrete',
        'thing to do this week), "refused": boolean }',
      ].join("\n");

      const v = venture as { name?: string; one_liner?: string; stage?: string; country?: string; doc?: unknown } | null;
      const user = [
        v
          ? `The founder's venture: ${v.name || "unnamed"} — ${v.one_liner || "no one-liner yet"}. Stage: ${v.stage}. Country: ${v.country || "NOT SET — ask"}.`
          : "The founder has not filled in a venture record yet. Say so if the answer depends on it.",
        v?.doc ? `Venture record: ${JSON.stringify(v.doc).slice(0, 6000)}` : "",
        (experiments ?? []).length
          ? `Recent proof loop: ${JSON.stringify(experiments).slice(0, 6000)}`
          : "No field experiments have been captured yet. Help the founder design the smallest credible one.",
        "",
        `Question: ${question}`,
      ].filter(Boolean).join("\n");

      const r = await callJson<Advice>({ model: modelFor("balanced"), system, user, maxTokens: 700 });
      await meter(admin, {
        organizationId: orgId, userId: u.userId, model: r.model, feature: "startup-school-advise",
        tier: "balanced", inTok: r.inTok, outTok: r.outTok,
        cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0,
      });

      const advice: Advice = {
        answer: clean(r.data?.answer, 1800),
        framework: clean(r.data?.framework, 120),
        source: clean(r.data?.source, 60),
        nextStep: clean(r.data?.nextStep, 300),
        refused: Boolean(r.data?.refused),
      };
      if (!advice.answer) return json({ error: "The adviser came back empty. Try again." }, 502);
      return json({ advice });
    }

    // Both remaining ops are about one booking.
    const bookingId = String(body.bookingId ?? "");
    if (!UUID_RE.test(bookingId)) return json({ error: "Missing session." }, 400);

    const { data: booking } = await admin
      .from("cs_bookings")
      .select("id, user_id, mentor_id, agenda, brief, shared_notes, starts_at")
      .eq("organization_id", orgId)
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return json({ error: "That session could not be found." }, 404);
    const b = booking as {
      user_id: string; mentor_id: string; agenda?: string;
      brief?: Brief | null; shared_notes?: string; starts_at?: string;
    };

    // Who is asking: the founder, or the mentor on this booking?
    const { data: mentorRow } = await admin
      .from("cs_mentors").select("id, name")
      .eq("organization_id", orgId).eq("id", b.mentor_id).eq("user_id", u.userId)
      .maybeSingle();
    const isMentor = Boolean(mentorRow);
    const isFounder = b.user_id === u.userId;
    if (!isMentor && !isFounder) return json({ error: "That session is not yours." }, 403);

    // ---- brief -------------------------------------------------------------
    if (op === "brief") {
      // The brief is FOR the mentor. A founder may not read the version that
      // tells a mentor how to open with them.
      if (!isMentor) return json({ error: "Only the mentor can prepare a session." }, 403);

      if (b.brief && !body.force) return json({ brief: b.brief, cached: true });

      // One RPC rather than six reads, and it enforces its own access rule.
      //
      // Called with the CALLER'S token, not the service key: cs_session_context
      // is security definer and decides what to return from auth.uid(), which
      // is null under the service role — so the admin client would be told to
      // sign in. Running it as the user also means its rule is checked a second
      // time, independently of the mentor check above.
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: ctx, error: ctxErr } = await userClient(token).rpc("cs_session_context", {
        p_org: orgId, p_booking: bookingId,
      });
      if (ctxErr) {
        console.error("cs_session_context failed:", ctxErr.message);
        return json({ error: "Could not gather the session context." }, 500);
      }

      // The mentor is authorised for this booking above. Give the model a
      // bounded proof trail, not broad access to the founder's private data.
      const { data: proof } = await admin
        .from("cs_experiments")
        .select("title, status, threshold, evidence, result, decision, next_step, updated_at")
        .eq("organization_id", orgId)
        .eq("user_id", b.user_id)
        .order("updated_at", { ascending: false })
        .limit(10);

      const allowance = await assertWithinCap(admin, orgId);
      if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE }, 429);

      const system = [
        "You prepare a mentor for a 1:1 with a founder, in a founder school.",
        "The mentor has fifteen minutes and has met many founders. Be brief and specific.",
        "",
        "Use only the context given. Never invent a fact, a number, a customer or a metric.",
        "Where the context is empty, say what is missing rather than filling it in — 'no venture",
        "record yet' is a useful thing for a mentor to know before they open.",
        "The single most valuable line is usually the quiz they got wrong: it is evidence of a",
        "misunderstanding they have not noticed.",
        "Plain British English. No preamble.",
        "",
        'Return JSON: { "headline": string (one line: who this is and what they want),',
        '"context": string[] (3-5 facts worth knowing), "openWith": string (one question the mentor',
        'should actually open with), "watchFor": string[] (0-3 likely misunderstandings or risks),',
        '"carriedOver": string[] (0-4 open items from last time) }',
      ].join("\n");

      const r = await callJson<Brief>({
        model: modelFor("balanced"),
        system,
        user: `CONTEXT:\n${JSON.stringify({ session: ctx, proof: proof ?? [] }).slice(0, 14_000)}`,
        maxTokens: 800,
      });
      await meter(admin, {
        organizationId: orgId, userId: u.userId, model: r.model, feature: "startup-school-brief",
        tier: "balanced", inTok: r.inTok, outTok: r.outTok,
        cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0,
      });

      const brief: Brief = {
        headline: clean(r.data?.headline, 240),
        context: list(r.data?.context, 5),
        openWith: clean(r.data?.openWith, 300),
        watchFor: list(r.data?.watchFor, 3),
        carriedOver: list(r.data?.carriedOver, 4),
      };
      if (!brief.headline) return json({ error: "The brief came back empty. Try again." }, 502);

      const { error: saveErr } = await admin
        .from("cs_bookings")
        .update({ brief, brief_at: new Date().toISOString() })
        .eq("organization_id", orgId).eq("id", bookingId);
      if (saveErr) console.warn("startup-school-ai: brief not cached:", saveErr.message);

      return json({ brief, cached: false });
    }

    // ---- capture -----------------------------------------------------------
    // Produces a DRAFT. The mentor edits and saves it; nothing here writes to
    // the shared notes or the action list on its own, because a summary of a
    // conversation about someone's business is exactly the wrong thing to
    // publish unreviewed.
    if (!isMentor) return json({ error: "Only the mentor can write up a session." }, 403);

    const { data: lines } = await admin
      .from("cs_booking_transcript")
      .select("speaker_name, text")
      .eq("organization_id", orgId).eq("booking_id", bookingId)
      .order("said_at", { ascending: true }).limit(4000);

    const spoken = ((lines ?? []) as { speaker_name?: string; text?: string }[])
      .map((l) => `${l.speaker_name || "Someone"}: ${l.text ?? ""}`)
      .join("\n");

    if (spoken.length < MIN_TRANSCRIPT) {
      return json({
        error: "There isn't enough of this session recorded to write it up. Turn captions on during the call.",
      }, 422);
    }

    const allowance = await assertWithinCap(admin, orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE }, 429);

    const system = [
      "You write up a 1:1 mentoring session for a founder school, as a DRAFT the mentor will edit.",
      "",
      "Two artefacts, and they are different:",
      "- notes: what was decided and why, in 3-6 sentences, addressed to the founder. Not a",
      "  transcript summary — the decisions and the reasoning behind them.",
      "- actions: concrete things the FOUNDER agreed to do, in their own words where possible.",
      "  Only include something that was actually agreed. An empty list is a correct answer.",
      "",
      "Never invent a number, a name, a date or a commitment. If the session ended without",
      "agreeing anything, say so in the notes and return no actions.",
      "Plain British English, second person, no filler.",
      "",
      'Return JSON: { "notes": string, "actions": string[] (0-6) }',
    ].join("\n");

    const r = await callJson<Capture>({
      model: modelFor("balanced"),
      system,
      // Trim the tail: a session opens with what it is about.
      user: [`Agenda: ${b.agenda || "(none set)"}`, "", "TRANSCRIPT:", spoken.slice(0, MAX_TRANSCRIPT)].join("\n"),
      maxTokens: 900,
    });
    await meter(admin, {
      organizationId: orgId, userId: u.userId, model: r.model, feature: "startup-school-capture",
      tier: "balanced", inTok: r.inTok, outTok: r.outTok,
      cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0,
    });

    const capture: Capture = { notes: clean(r.data?.notes, 2000), actions: list(r.data?.actions, 6) };
    if (!capture.notes) return json({ error: "The write-up came back empty. Try again." }, 502);

    return json({ capture });
  } catch (err) {
    console.error("startup-school-ai error", err);
    return json({ error: "That could not be completed. Please try again." }, 500);
  }
});
