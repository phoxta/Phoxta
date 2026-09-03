// Phoxta — content-plan-run: one stage of a month's thinking per request.
//
// WHY THE BROWSER DRIVES THE CHAIN, exactly as dossier-run does it. Supabase
// kills an edge function at 150 seconds idle. A month is six stages and, for a
// thirty-post plan, four more production batches — comfortably past that as one
// call. Run as one request it would die halfway with nothing to show; run as
// one request per stage, a dropped connection costs ONE stage, and the client
// picks up where the database says it got to.
//
// `next` IS DERIVED FROM THE DATABASE, never from an index the client sends.
// That is what makes resume work, and what makes "rewrite the strategy" work:
// delete the strategy section and everything after it, ask again, and the chain
// recomputes what is missing. A client-held cursor would have to be trusted to
// be honest about where it was.
//
// WHAT THIS FUNCTION REFUSES TO DO. It does not publish. Production writes
// social_posts as `draft`, campaigns and blog posts as `draft`, and the
// publisher only ever claims `queued` — so an unapproved plan is a document,
// not a promise, no matter how far the chain has run.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";
import { findStock } from "../_shared/stock.ts";
import { contextDigest, gatherBusinessContext, type BusinessContext } from "../_shared/businessContext.ts";
import { normaliseSchedule, learnedWindows, wallClockToUtc, type Slot } from "../_shared/cadence.ts";
import { voiceBlock } from "../_shared/voice.ts";
import { ORDER, PROMPTS, PRODUCTION_BATCH, type Stage } from "./stages.ts";
import { validateStrategy, validateCalendar, validateSituation, validateOffers, type Dropped } from "./validate.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** How much of each earlier stage the next one carries. Budgets differ on
 *  purpose: the strategy IS the instruction for the stages after it, while the
 *  situation is background by then. One uniform number would either starve the
 *  strategy or drown everything in the context dump. */
const CARRY: Record<string, number> = {
  context: 3000,
  situation: 1200,
  audience: 900,
  strategy: 2500,
  calendar: 1200,
};

type SectionRow = { section: string; content: Json };

/**
 * A rebuilt reference, described the way the built-in layouts describe
 * themselves — so the writer knows how much copy fits where.
 *
 * The character budgets are the same arithmetic as `catalogue()` in
 * src/lib/designs/templates.ts: how many glyphs fit across the box at this
 * size, times how many lines fit down it. Without them a headline written for
 * a 900px box lands in a 300px one and is published with an ellipsis through
 * the middle of it.
 */
function lookLayout(doc: Json, look: Json): Json {
  const slots: Json[] = [];
  const images: Record<string, string> = {};
  for (const l of (doc.layers ?? []) as Json[]) {
    if (l.type === "image") {
      images[l.slot] = String(look?.feels ?? "a photograph that suits this business").slice(0, 80);
      continue;
    }
    if (l.type !== "text" && l.type !== "chip") continue;
    if (slots.some((s) => s.slot === l.slot)) continue;
    const size = Math.max(8, Number(l.size) || 32);
    const perLine = Math.max(1, Math.floor(Number(l.w) / (size * 0.55)));
    const lines = Math.max(1, Math.round(Number(l.h) / (size * (l.type === "text" ? (Number(l.lineHeight) || 1.2) : 1.2))));
    slots.push({ slot: l.slot, max: Math.min(400, perLine * lines) });
  }
  return {
    id: String(doc.templateId ?? "v1"),
    purpose: `The owner's own design — ${String(look?.composition ?? look?.feels ?? "use it as it is")}`.slice(0, 300),
    slots,
    images,
  };
}

/** What the next stage reads: earlier stages, trimmed to their budgets. */
function stageContext(rows: SectionRow[], stage: Stage): string {
  const wanted = ORDER.slice(0, ORDER.indexOf(stage));
  const parts: string[] = [];
  for (const key of wanted) {
    const row = rows.find((r) => r.section === key);
    if (!row) continue;
    // The context stage is already prose; everything else is JSON the next
    // stage reads as a brief.
    const body = key === "context"
      ? String(row.content?.digest ?? "")
      : JSON.stringify(row.content ?? {});
    parts.push(`## ${key}\n${body.slice(0, CARRY[key] ?? 1000)}`);
  }
  return parts.join("\n\n");
}

/**
 * Which stage still needs doing. Read from what is stored, never from input.
 *
 * Production is measured against the CALENDAR, not against the posts the owner
 * originally asked for. The calendar is what was actually decided — asking for
 * twelve and planning nine means nine, and counting against twelve would leave
 * the chain trying forever; planning fifteen and counting against twelve would
 * silently abandon three pieces the strategy depends on.
 */
async function nextStage(
  admin: Json, planId: string,
): Promise<{ stage: Stage | null; done: number; total: number }> {
  const { data: rows } = await admin
    .from("content_plan_sections").select("section, content").eq("plan_id", planId);
  const stored = (rows ?? []) as SectionRow[];
  const have = new Set(stored.map((r) => r.section));

  for (const key of ORDER) {
    if (key === "production") break;
    if (!have.has(key)) return { stage: key, done: 0, total: 0 };
  }

  const slots = stored.find((r) => r.section === "calendar")?.content?.slots;
  const total = Array.isArray(slots) ? slots.length : 0;

  // Which slots have actually been produced, tracked on the plan itself.
  //
  // It cannot be derived from social_posts: an email slot writes a `campaigns`
  // row and a blog slot writes a `blog_posts` row, neither of which carries a
  // plan_slot_id. Counting social rows alone would leave every email and
  // article permanently "not done" and the chain rewriting them forever — which
  // is both an infinite loop and a bill.
  const produced = stored.find((r) => r.section === "production")?.content?.produced;
  const done = Array.isArray(produced) ? produced.length : 0;

  return { stage: done < total ? "production" : null, done, total };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  /** Which plan to blame if this throws. Set as soon as the body is read. */
  let failingPlanId = "";

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    const planId = String(body?.planId ?? "");
    failingPlanId = planId;
    if (!orgId) return json({ error: "Which business is this for?" }, 400);

    const auth = await authorize(req, orgId);
    if (auth.error) return auth.error;
    const admin = adminClient();
    const userId = auth.ok.userId;

    // ── create: the parent row, before any thinking happens ─────────────────
    if (String(body?.action ?? "") === "create") {
      // The cooldown belongs here: starting a month is the button an owner can
      // lean on, and every plan started is a chain of model calls behind it.
      // A legitimate second plan is minutes apart; a loop is seconds apart.
      const cooldownMs = Number(Deno.env.get("CONTENT_PLAN_COOLDOWN_MS")) || 15000;
      const { data: recent } = await admin
        .from("content_plans").select("created_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const lastAt = Date.parse(String((recent as Json)?.created_at ?? "")) || 0;
      if (lastAt && Date.now() - lastAt < cooldownMs) {
        return json({ error: "A plan was just started — give it a moment before starting another." }, 429);
      }

      const inputs = (body?.inputs ?? {}) as Json;
      const startsOn = String(inputs?.startsOn ?? "").trim() || new Date().toISOString().slice(0, 10);
      const days = Math.min(60, Math.max(1, Number(inputs?.days) || 30));
      const posts = Math.min(30, Math.max(1, Number(inputs?.posts) || 12));

      const { data: plan, error } = await admin.from("content_plans").insert({
        organization_id: orgId,
        title: "Planning…",
        brief: String(inputs?.brief ?? "").slice(0, 1000),
        starts_on: startsOn,
        days,
        posts_target: posts,
        inputs,
        status: "draft",
        created_by: userId,
      }).select("id").single();
      if (error || !plan) return json({ error: error?.message ?? "Could not start the plan." }, 500);
      return json({ ok: true, planId: plan.id, next: ORDER[0] });
    }

    if (!planId) return json({ error: "Which plan?" }, 400);

    const { data: plan } = await admin
      .from("content_plans")
      .select("id, organization_id, brief, starts_on, days, posts_target, inputs, run_started_at")
      .eq("id", planId).eq("organization_id", orgId).maybeSingle();
    if (!plan) return json({ error: "That plan is not in this business." }, 404);

    // ── drop stages, so "change the strategy" can rewind ────────────────────
    // The client names where to rewind TO; everything from there on goes, and
    // `next` then recomputes it. Posts produced from the old calendar go with
    // it — leaving them would mean a month half-written to a strategy nobody
    // approved.
    if (String(body?.action ?? "") === "rewind") {
      const from = String(body?.stage ?? "strategy") as Stage;
      const idx = ORDER.indexOf(from);
      if (idx < 0) return json({ error: "Unknown stage." }, 400);
      // `production` goes too, always: it is the record of which slots were
      // made, and leaving it behind would make the chain believe pieces from a
      // discarded calendar had already been written.
      const doomed = [...ORDER.slice(idx), "production"];
      await admin.from("content_plan_sections").delete().eq("plan_id", planId).in("section", doomed);
      await admin.from("social_posts").delete().eq("plan_id", planId).not("plan_slot_id", "is", null);
      await admin.from("content_plans").update({ run_error: null }).eq("id", planId);
      return json({ ok: true, next: from });
    }

    // ── run one stage ───────────────────────────────────────────────────────
    const target = await nextStage(admin, planId);
    if (!target.stage) {
      await admin.from("content_plans")
        .update({ run_finished_at: new Date().toISOString(), run_error: null }).eq("id", planId);
      return json({ ok: true, next: null, done: true });
    }
    const stage = target.stage;

    // Guards, lifted from dossier-run for the same reasons written there: a
    // cooldown because a legitimate re-run is minutes apart and a loop is
    // seconds apart, and a daily ceiling counted off the meter so it holds
    // across tabs and restarts rather than trusting one client to behave.
    //
    // NOTE ON THE COOLDOWN: it lives on `create`, NOT here. A chain advancing
    // through its stages calls this endpoint back to back by design — that is
    // what the whole browser-driven design does — so a per-stage cooldown
    // rejects the legitimate case and lets nothing through. It cost a 429 in
    // the middle of the first real UI run. Rapid repeats of the SAME work are
    // bounded by the daily ceiling below and by the fact that a finished stage
    // is stored: asking again advances rather than repeats.
    const dailyCap = Number(Deno.env.get("CONTENT_PLAN_DAILY_STAGE_CAP")) || 120;
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count: spentToday, error: countErr } = await admin
      .from("ai_usage").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).eq("feature", "content-plan-run").gte("created_at", since);
    // Fails OPEN, and says so: refusing a paid feature because a count query
    // hiccuped punishes the customer for our problem, and the cooldown still
    // stops the runaway this guards against.
    if (countErr) console.warn("[phoxta] content-plan daily cap unreadable:", countErr.message);
    if ((spentToday ?? 0) >= dailyCap) {
      return json({ error: "This business has planned as much content as we allow in a day. It will be available again tomorrow." }, 429);
    }

    await admin.from("content_plans")
      .update({ run_started_at: new Date().toISOString(), run_error: null }).eq("id", planId);

    const fail = async (message: string, status = 500) => {
      await admin.from("content_plans").update({ run_error: message }).eq("id", planId);
      return json({ error: message }, status);
    };

    const { data: sectionRows } = await admin
      .from("content_plan_sections").select("section, content").eq("plan_id", planId);
    const rows = (sectionRows ?? []) as SectionRow[];
    const inputs = (plan.inputs ?? {}) as Json;
    // The window, stated explicitly. A model asked for dates with nothing to
    // anchor them to answers with a year it half-remembers — the first run of
    // this came back entirely in 2024 — and while validateCalendar now pulls
    // stray dates back into range, a model told the actual month produces a
    // sensible spread rather than a repaired one.
    const startsOn = String(plan.starts_on ?? "").slice(0, 10);
    const spanDays = Number(plan.days) || 30;
    const lastDay = new Date(Date.parse(`${startsOn}T12:00:00Z`) + (spanDays - 1) * 86400_000)
      .toISOString().slice(0, 10);
    const windowLine =
      `PLANNING WINDOW: ${startsOn} to ${lastDay} inclusive (${spanDays} days). Today is ${new Date().toISOString().slice(0, 10)}. Every date you give must fall inside that window.`;

    const brief = [
      windowLine,
      String(plan.brief ?? ""),
      inputs?.goal ? `Goal: ${inputs.goal}.` : "",
      Array.isArray(inputs?.featured) && inputs.featured.length ? `Feature these: ${inputs.featured.join(", ")}.` : "",
      Array.isArray(inputs?.offers) && inputs.offers.length ? `Anchor on: ${inputs.offers.join(", ")}.` : "",
      Array.isArray(inputs?.segments) && inputs.segments.length ? `Talking to: ${inputs.segments.join(", ")}.` : "",
      inputs?.steer ? String(inputs.steer) : "",
    ].filter(Boolean).join(" ").slice(0, 1200);

    // ── stage 0: the facts. Deterministic — no model call, no spend. ────────
    if (stage === "context") {
      const ctx = await gatherBusinessContext(admin, orgId);
      if (!ctx.channels.length) {
        return await fail("No social accounts are connected, so there is nowhere for a plan to go. Connect one in Graphics → Accounts.", 400);
      }
      await admin.from("content_plan_sections").upsert({
        plan_id: planId, organization_id: orgId, section: "context",
        content: { digest: contextDigest(ctx), coverage: ctx.coverage, channels: ctx.channels },
        generated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "plan_id,section" });
      const after = await nextStage(admin, planId);
      return json({ ok: true, stage, next: after.stage, coverage: ctx.coverage });
    }

    // Everything below spends. The plan's monthly allowance applies here as it
    // does to every other AI feature.
    const allowance = await assertWithinCap(admin, orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    // The context row is the business's facts; every later stage needs the real
    // objects (not just the digest) to validate against.
    const ctx = await gatherBusinessContext(admin, orgId);
    const spec = PROMPTS[stage as Exclude<Stage, "context">];
    const carried = stageContext(rows, stage);

    // How this business sounds, carried only into the stages that put words on
    // a page. The situation, audience and calendar stages are analysis — giving
    // them a voice spec would spend tokens teaching a model to write prose it
    // is not being asked to write, and risks it dressing up findings.
    const voice = (stage === "production" || stage === "strategy")
      ? await voiceBlock(admin, orgId)
      : "";
    const systemFor = (base: string) => (voice ? `${base}\n\n${voice}` : base);

    // ── production: batches, each writing real rows ─────────────────────────
    if (stage === "production") {
      const calendar = rows.find((r) => r.section === "calendar")?.content ?? {};
      const strategy = rows.find((r) => r.section === "strategy")?.content ?? {};
      const allSlots: Json[] = Array.isArray(calendar?.slots) ? calendar.slots : [];

      const producedBefore: string[] = Array.isArray(
        rows.find((r) => r.section === "production")?.content?.produced,
      ) ? rows.find((r) => r.section === "production")!.content.produced : [];
      const made = new Set(producedBefore.map(String));
      const todo = allSlots.filter((s) => !made.has(String(s?.slotId))).slice(0, PRODUCTION_BATCH);
      if (!todo.length) {
        await admin.from("content_plans")
          .update({ run_finished_at: new Date().toISOString(), run_error: null }).eq("id", planId);
        return json({ ok: true, stage, next: null, done: true });
      }

      // THE LOOK, IF THE OWNER AGREED ONE. Two quite different things arrive
      // here under the same name, and the difference is whether it carries a
      // document:
      //
      //   look.doc  — their own artwork, rebuilt as a layout. It REPLACES the
      //               eighteen built-ins for this month, so every post is made
      //               in their design rather than in ours.
      //   look only — a direction: palette, type, how the page breathes. The
      //               built-in layouts still apply; the colours and the brief
      //               change.
      const look = (plan.inputs ?? {}).look as Json;
      const lookDoc = look?.doc && Array.isArray(look.doc.layers) && look.doc.layers.length ? look.doc : null;

      const catalogueIn = Array.isArray(body?.catalogue) ? body.catalogue : [];
      // A reference-derived layout has to describe itself the same way the
      // built-ins do, or the model has no idea how much copy fits where. Same
      // arithmetic as catalogue() in src/lib/designs/templates.ts.
      const layouts: Json[] = lookDoc ? [lookLayout(lookDoc, look)] : catalogueIn;

      const layoutMenu = layouts.slice(0, 40).map((t: Json) =>
        `- ${t.id}: ${t.purpose ?? ""}\n  slots: ${(t.slots ?? []).map((s: Json) => `${s.slot} (max ${s.max})`).join(", ")}\n  photos: ${Object.keys(t.images ?? {}).join(", ") || "none"}`,
      ).join("\n");

      // What the look asks of the words, said to the writer. A layout with one
      // 40-character headline needs different copy from one with a paragraph,
      // and the composition note is the difference between copy that fits and
      // copy that gets truncated with an ellipsis.
      const lookBrief = look
        ? [
          `\nTHE LOOK THIS MONTH IS MADE IN — "${String(look.name ?? "").slice(0, 60)}".`,
          look.feels ? String(look.feels).slice(0, 300) : "",
          look.composition ? `Composition: ${String(look.composition).slice(0, 300)}` : "",
          lookDoc
            ? "This is the owner's OWN design, rebuilt. Every post uses it, so write to its slots exactly — there is no other layout to fall back to."
            : "",
        ].filter(Boolean).join("\n")
        : "";

      const t0 = Date.now();
      const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
        model: modelFor(spec.tier),
        system: systemFor(spec.system),
        user: spec.user(
          [
            carried, lookBrief,
            "\nTHE SLOTS TO WRITE:", JSON.stringify(todo),
            layoutMenu ? `\nLAYOUTS:\n${layoutMenu}` : "",
          ].filter(Boolean).join("\n"),
          brief,
        ),
        maxTokens: spec.maxTokens,
      });
      await meter(admin, {
        organizationId: orgId, userId, feature: "content-plan-run", tier: spec.tier,
        model, inTok, outTok, cacheWriteTok, cacheReadTok, latencyMs: Date.now() - t0,
      });

      const written: Json[] = Array.isArray(out?.posts) ? out.posts : [];
      const tz = ctx.org.timezone || "UTC";
      const notes: string[] = [];
      const producedNow: string[] = [];
      let count = 0;

      for (const slot of todo) {
        const w = written.find((p) => String(p?.slotId) === String(slot?.slotId));
        if (!w) continue;
        const channel = String(slot?.channel ?? "social");

        if (channel === "email") {
          const { error } = await admin.from("campaigns").insert({
            organization_id: orgId,
            name: String(w?.email?.subject ?? slot?.angle ?? "Planned email").slice(0, 120),
            channel: "email",
            subject: String(w?.email?.subject ?? "").slice(0, 200),
            body: String(w?.email?.body ?? ""),
            status: "draft",
          });
          if (error) { notes.push(`An email could not be saved: ${error.message}`); continue; }
          count++; producedNow.push(String(slot?.slotId ?? ""));
          continue;
        }

        if (channel === "blog") {
          const title = String(w?.article?.title ?? slot?.angle ?? "Untitled").slice(0, 160);
          const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${crypto.randomUUID().slice(0, 6)}`;
          const { error } = await admin.from("blog_posts").insert({
            organization_id: orgId, slug, title,
            excerpt: String(w?.article?.excerpt ?? "").slice(0, 400),
            body: String(w?.article?.body ?? ""),
            status: "draft",
          });
          if (error) { notes.push(`An article could not be saved: ${error.message}`); continue; }
          count++; producedNow.push(String(slot?.slotId ?? ""));
          continue;
        }

        // ── social ──────────────────────────────────────────────────────────
        const layoutId = String(w?.layout ?? slot?.layout ?? layouts[0]?.id ?? "");
        const layout = layouts.find((l: Json) => l.id === layoutId) ?? layouts[0];
        const content: Record<string, string> = {};
        for (const s of (layout?.slots ?? [])) {
          const raw = String((w?.content ?? {})[s.slot] ?? "").trim();
          if (!raw) continue;
          const max = Math.max(3, Math.min(400, Number(s.max) || 60));
          content[s.slot] = raw.length > max ? `${raw.slice(0, max - 1).trimEnd()}…` : raw;
        }
        const images: Record<string, Json> = {};
        for (const photoSlot of Object.keys(layout?.images ?? {})) {
          const q = String((w?.imageQueries ?? {})[photoSlot] ?? "").trim() || String(slot?.angle ?? "");
          const found = await findStock(q, { orgId });
          if (found.photo) {
            const ph = found.photo;
            images[photoSlot] = { url: ph.url, alt: ph.alt ?? "", photographer: ph.photographer, photographerUrl: ph.photographerUrl, source: "pexels" };
          }
        }

        // The document the post is drawn from.
        //
        // With a rebuilt reference, every post carries the owner's OWN layers,
        // format and palette, and only the words and photographs differ — which
        // is what "make the month in my design" has to mean to be worth having.
        // With a direction, the built-in layout stands and only the palette
        // moves. With neither, this is exactly what it always was.
        const doc: Json = lookDoc
          ? {
            ...lookDoc,
            // Layers are copied rather than shared: they are stored per design,
            // and a later edit to one post must not silently restyle the other
            // twenty-nine.
            layers: (lookDoc.layers ?? []).map((l: Json) => ({ ...l })),
            content,
            images,
          }
          : { templateId: layout?.id ?? "", content, images };

        // A direction's palette applies on top; a rebuilt reference already
        // carries its own, and overwriting it would undo the thing that made it
        // look like theirs.
        if (!lookDoc && look?.palette && typeof look.palette === "object") {
          const pal: Record<string, string> = {};
          for (const [role, v] of Object.entries(look.palette as Record<string, unknown>)) {
            if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) pal[role] = v;
          }
          if (Object.keys(pal).length) doc.palette = pal;
        }

        const { data: design } = await admin.from("designs").insert({
          organization_id: orgId,
          title: String(slot?.angle ?? "Planned post").slice(0, 120),
          template_id: String(doc.templateId ?? layout?.id ?? ""),
          doc,
          brief: String(slot?.hook ?? slot?.angle ?? ""),
          created_by: userId,
        }).select("id").single();
        if (!design) continue;

        const when = wallClockToUtc(String(slot?.date ?? plan.starts_on), Number(slot?.hour) || 10, tz);
        if (!when) continue;

        // social_posts.captions holds FINISHED TEXT per platform — the exact
        // words that go out — because that is what the publisher sends and what
        // the queue editor shows. The model returns caption and hashtags apart,
        // so they are joined here rather than stored apart: two shapes in one
        // column meant the publisher had to guess which it was holding, and
        // String()-ing the wrong one publishes "[object Object]".
        const raw = (w?.captions ?? {}) as Record<string, Json>;
        const platforms: string[] = Array.isArray(slot?.platforms) ? slot.platforms : [];
        const captions: Record<string, string> = {};
        for (const pf of platforms) {
          const v = raw[pf];
          const text = String(v?.caption ?? "").trim();
          if (!text) continue;
          const tg = (Array.isArray(v?.hashtags) ? v.hashtags : [])
            .map((h: unknown) => String(h).trim()).filter(Boolean)
            .map((h: string) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 8);
          captions[pf] = tg.length ? `${text}\n\n${tg.join(" ")}` : text;
        }
        // The canonical caption stays the first platform's, so everything that
        // reads social_posts.caption today keeps working unchanged.
        const canonical = platforms.map((pf) => captions[pf]).find(Boolean) ?? "";

        const { data: post, error: postErr } = await admin.from("social_posts").insert({
          organization_id: orgId, plan_id: planId, design_id: design.id,
          media_url: "", caption: canonical, captions,
          scheduled_at: when.toISOString(), status: "draft", created_by: userId,
          plan_slot_id: String(slot?.slotId ?? ""),
          pillar: String(slot?.pillar ?? ""), funnel_stage: String(slot?.funnel ?? ""),
          angle: String(slot?.angle ?? ""), campaign_key: slot?.campaign ? String(slot.campaign) : null,
        }).select("id").single();
        // A duplicate slot means this batch was submitted twice; the unique
        // index did its job and the post already exists.
        if (postErr || !post) continue;

        const { data: accts } = await admin.from("social_accounts")
          .select("id, platform").eq("organization_id", orgId).eq("status", "connected");
        const targets = ((accts ?? []) as Json[]).filter((a) => platforms.includes(String(a.platform)));
        if (targets.length) {
          await admin.from("social_targets").insert(
            targets.map((a) => ({ organization_id: orgId, post_id: post.id, account_id: a.id, platform: a.platform })),
          );
        }
        count++; producedNow.push(String(slot?.slotId ?? ""));
      }

      // Record what this batch produced BEFORE deciding what is left, so a
      // crash between the two costs a repeat of one batch rather than an
      // endless one. Slots that failed to write are deliberately absent, so
      // the next batch retries exactly them.
      await admin.from("content_plan_sections").upsert({
        plan_id: planId, organization_id: orgId, section: "production",
        content: { produced: [...producedBefore, ...producedNow] },
        generated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "plan_id,section" });

      const after = await nextStage(admin, planId);
      if (!after.stage) {
        await admin.from("content_plans")
          .update({ run_finished_at: new Date().toISOString(), run_error: null }).eq("id", planId);
      }
      return json({
        ok: true, stage, next: after.stage, made: count,
        done: after.done, total: after.total,
        ...(notes.length ? { notes } : {}),
      });
    }

    // ── the thinking stages ─────────────────────────────────────────────────
    const t0 = Date.now();
    const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor(spec.tier),
      system: systemFor(spec.system),
      user: spec.user(carried || contextDigest(ctx), brief),
      maxTokens: spec.maxTokens,
    });
    await meter(admin, {
      organizationId: orgId, userId, feature: "content-plan-run", tier: spec.tier,
      model, inTok, outTok, cacheWriteTok, cacheReadTok, latencyMs: Date.now() - t0,
    });
    if (!out || typeof out !== "object") return await fail("Nothing came back — try that stage again.", 502);

    // What the model said, checked against what is actually true. Everything
    // dropped is reported: a plan quietly missing the campaign it was built
    // around is worse than one that says why.
    let content: Json = out;
    let dropped: Dropped[] = [];

    if (stage === "situation") {
      const a = validateSituation(content);
      const b = validateOffers(a.situation, ctx);
      content = b.situation;
      dropped = [...a.dropped, ...b.dropped];
    }
    if (stage === "strategy") {
      const r = validateStrategy(content, ctx);
      content = r.strategy;
      dropped = r.dropped;
    }
    if (stage === "calendar") {
      const strategy = rows.find((r) => r.section === "strategy")?.content ?? {};
      const r = validateCalendar(content, strategy, ctx, {
        startsOn: String(plan.starts_on ?? "").slice(0, 10),
        days: Number(plan.days) || 30,
      });
      content = r.calendar;
      dropped = r.dropped;

      // The model proposes; code disposes. Timing is fixed deterministically
      // here, before a single word of copy has been paid for.
      const learned = await learnedWindows(admin, orgId).catch(() => null);
      const settings = (plan.inputs ?? {}) as Json;
      const { slots, changes } = normaliseSchedule(
        (content.slots ?? []).map((s: Json): Slot => ({
          slotId: String(s.slotId), date: String(s.date), hour: Number(s.hour) || 10,
          platforms: Array.isArray(s.platforms) ? s.platforms : [],
        })),
        { timezone: ctx.org.timezone || "UTC", learned, blackout: Array.isArray(settings?.blackout) ? settings.blackout : [] },
      );
      const byId = new Map(slots.map((s) => [s.slotId, s]));
      content.slots = (content.slots ?? []).map((s: Json) => {
        const moved = byId.get(String(s.slotId));
        return moved ? { ...s, date: moved.date, hour: moved.hour } : s;
      });
      content.changes = changes;
    }

    await admin.from("content_plan_sections").upsert({
      plan_id: planId, organization_id: orgId, section: stage,
      content, model, generated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "plan_id,section" });

    // The plan's own title and one-line thesis, denormalised so the existing
    // list UI keeps working without reading a section row.
    if (stage === "strategy") {
      await admin.from("content_plans").update({
        title: String(content?.title ?? "Content plan").slice(0, 120),
        rationale: String(content?.thesis ?? "").slice(0, 2000),
      }).eq("id", planId);
    }

    const after = await nextStage(admin, planId);
    return json({ ok: true, stage, next: after.stage, content, ...(dropped.length ? { dropped } : {}) });
  } catch (err) {
    // Record it on the plan, not only in this response. A stage that threw —
    // a model timeout, a bad JSON body — otherwise leaves `run_error` null and
    // the failure invisible the moment the browser that saw the 500 is closed,
    // which is exactly when someone comes asking why their month stopped.
    const message = String((err as Error)?.message || err);
    try {
      // `failingPlanId` is captured as soon as the body is parsed — the request
      // body is a stream and has long been consumed by the time we get here.
      if (failingPlanId) {
        await adminClient().from("content_plans").update({ run_error: message }).eq("id", failingPlanId);
      }
    } catch { /* the original error is what matters */ }
    return json({ error: message }, 500);
  }
});
