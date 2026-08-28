// Phoxta — dossier-run: generates one section of a business dossier.
//
// ONE SECTION PER CALL, NOT THE WHOLE DOSSIER IN A LOOP
//
// Supabase kills a function at 150s idle and a full dossier is several minutes
// of model time, so a single request that "does everything" would die partway
// with some sections saved and no record of where it stopped. The client drives
// the chain and this advances it one section, which means a dropped connection
// costs one section rather than the document, and a reload resumes from what is
// already stored. Same shape as idea-run, for the same reason.
//
// TWO SCOPES, ONE FUNCTION
//
//   scope: "blueprint" — the shared dossier every buyer of that blueprint reads.
//     Written once, owned by nobody, gated on platform_admins. There is no row
//     to scope by, so the gate is a ROLE check rather than a row filter.
//
//   scope: "org" — one owner's own version, generated only after they have
//     answered the context questions. Org-scoped and gated on org membership at
//     admin level, because it spends the model budget.
//
// They share this file rather than being written twice because what differs is
// forty lines of auth and destination, while the section registry they both
// drive is several hundred. Two copies of that registry would drift, and a
// drifted prompt is the kind of failure that keeps working, just wrongly.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, requireUser } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";
import { searchStock } from "../_shared/stock.ts";
import { ORDER, PROMPTS, type Section } from "./sections.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** Each earlier section, trimmed. The whole dossier would crowd out the
 *  instruction by section nine — nine sections is more than idea-run's seven,
 *  so the per-section slice is tighter than its 2500. */
const CARRY = 1400;
/** The shared section being localised gets more room: it is the thing being
 *  rewritten, not background. */
const CARRY_GLOBAL = 3000;

type Row = { section: string; content: Json };

function contextFrom(rows: Row[], section: Section, heading: string): string {
  const done = new Map(rows.map((r) => [r.section, r.content]));
  const earlier = ORDER.slice(0, ORDER.indexOf(section)).filter((k) => done.has(k));
  if (earlier.length === 0) return "";
  const parts = earlier.map((k) => `## ${k}\n${JSON.stringify(done.get(k)).slice(0, CARRY)}`);
  return `${heading}\n\n${parts.join("\n\n")}\n\n---\n`;
}

/** Money as the buyer sees it on the listing, so the model prices against the
 *  real outlay rather than a guess at it. */
function priceLine(cents: unknown, currency: unknown): string {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return "";
  const cur = typeof currency === "string" && currency ? currency : "GBP";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur, maximumFractionDigits: 0 })
      .format(n / 100);
  } catch {
    return `${cur} ${Math.round(n / 100)}`;
  }
}

function blueprintBrief(bp: Json): string {
  const price = priceLine(bp?.price_cents, bp?.currency);
  return [
    `${bp?.name ?? "A ready-made online business"} — ${bp?.tagline ?? ""}`.trim(),
    String(bp?.description ?? "").trim(),
    bp?.vertical ? `Trade: ${bp.vertical}.` : "",
    // NO COUNTRY HERE. This brief writes the SHARED dossier, which every owner of
    // this blueprint reads wherever they are — so naming one country makes the
    // general analysis wrong for everyone outside it. The country arrives later,
    // from the owner's own answers, on the localised path only.
    "It is sold by Phoxta as a ready-made online business. It can be run from any country, and the reader could be anywhere, so treat this as the international view of the trade rather than one market's.",
    price ? `The buyer pays ${price} once for the storefront and the operating console that runs it.` : "",
    "Assume the buyer is one person or a very small team, often new to this trade, with the website and back office already built and no customers yet.",
  ].filter(Boolean).join(" ");
}

/** The owner's six answers, as a paragraph the model can actually use. */
function contextBrief(ctx: Json): string {
  const line = (label: string, v: unknown) => {
    const s = String(v ?? "").trim();
    return s ? `${label}: ${s}.` : "";
  };
  return [
    line("Where they will trade", ctx?.location),
    line("The slice of the market they intend to go for", ctx?.market),
    line("Who they say their customer is", ctx?.customer),
    line("What they can invest to launch", ctx?.budget),
    line("When they want to be open", ctx?.timeline),
    line("What they already have", ctx?.assets),
  ].filter(Boolean).join(" ");
}

/** Resolve the section's own photograph, once, and store it — so the slide never
 *  searches at render time and the same section always shows the same picture. A
 *  failure leaves the field unset and the page falls back to its curated set. */
async function attachImage(output: Json): Promise<void> {
  if (!output || typeof output !== "object") return;
  if (typeof output.imageQuery !== "string" || !output.imageQuery.trim()) return;
  const image = await searchStock(output.imageQuery);
  if (image) output.image = image;
}

/** Phoxta's own organisation, so Layer 1's spend lands in ai_usage like every
 *  other model call rather than being invisible. Null is survivable — metering
 *  must never be the reason a generation fails. */
async function platformOrgId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin
    .from("organizations").select("id").eq("vertical", "platform").limit(1).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const body = (await req.json().catch(() => ({}))) as Json;
  const scope = body?.scope === "org" ? "org" : "blueprint";
  const section = String(body?.section ?? "") as Section;
  const orgId = String(body?.orgId ?? "");
  const blueprintIdIn = String(body?.blueprintId ?? "");

  // The registry is the allowlist: an unknown section cannot reach the model.
  if (!PROMPTS[section]) return json({ error: "Unknown section." }, 400);

  const admin = adminClient();
  // Which parent row records a failure, so the catch below can write it there.
  const failTarget: { table: string; column: string; value: string } | null =
    scope === "org"
      ? (orgId ? { table: "org_dossiers", column: "organization_id", value: orgId } : null)
      : (blueprintIdIn ? { table: "blueprint_dossiers", column: "blueprint_id", value: blueprintIdIn } : null);

  try {
    const spec = PROMPTS[section];
    const started = Date.now();

    let brief = "";
    let ctx = "";
    let meterOrg: string | null = null;
    let blueprintId = blueprintIdIn;

    if (scope === "blueprint") {
      // ── Layer 1: the shared dossier ────────────────────────────────────
      const who = await requireUser(req);
      if ("error" in who) return who.error;
      if (!blueprintId) return json({ error: "Which blueprint?" }, 400);

      // No row to scope by — the dossier belongs to nobody — so the gate is the
      // platform_admins roster, the same predicate app_is_platform_admin() uses.
      const { data: isAdmin } = await admin
        .from("platform_admins").select("user_id").eq("user_id", who.userId).maybeSingle();
      if (!isAdmin) return json({ error: "Only a Phoxta admin can write a blueprint dossier." }, 403);

      const { data: bp } = await admin
        .from("blueprints")
        .select("id, slug, name, tagline, description, vertical, price_cents, currency")
        .eq("id", blueprintId).maybeSingle();
      if (!bp) return json({ error: "That blueprint was not found." }, 404);

      await admin.from("blueprint_dossiers")
        .upsert({ blueprint_id: blueprintId, run_started_at: new Date().toISOString(), run_error: null },
                { onConflict: "blueprint_id" });

      const { data: rows } = await admin
        .from("blueprint_dossier_sections").select("section, content").eq("blueprint_id", blueprintId);

      brief = blueprintBrief(bp);
      ctx = contextFrom((rows as Row[] | null) ?? [], section, "Sections of this dossier already written:");
      meterOrg = await platformOrgId(admin);
    } else {
      // ── Layer 2: one owner's own version ───────────────────────────────
      // Membership is not enough: this spends the model budget, so it takes the
      // same owner/admin gate as any other privileged action.
      const auth = await authorize(req, orgId, { requireAdmin: true });
      if (auth.error) return auth.error;

      const { data: dossier } = await admin
        .from("org_dossiers").select("organization_id, blueprint_id, context")
        .eq("organization_id", orgId).maybeSingle();
      if (!dossier) return json({ error: "Answer the questions first, then we can write your version." }, 400);

      blueprintId = String((dossier as Json).blueprint_id ?? "");
      const answers = contextBrief((dossier as Json).context);
      if (!answers) return json({ error: "Those answers came through empty — please fill at least one in." }, 400);

      // A CEILING ON WHAT ONE BUSINESS CAN SPEND HERE.
      //
      // Every call below is a complex-tier model turn, and nothing between the
      // authorize() above and callJson() asked whether this section was already
      // written or whether a run was already going. "Change my answers" is a
      // button: an owner leaning on it, or a script holding an admin session,
      // could run the nine-section chain round and round on the tenant's bill.
      //
      // Two limits, both cheap to check. A COOLDOWN, because a legitimate rewrite
      // is minutes apart and a loop is seconds apart. And a DAILY CEILING counted
      // off the meter's own record, so it holds across sessions, browser tabs and
      // restarts rather than trusting one client to behave. Both are per
      // organisation, and neither can be reached by an ordinary owner: nine
      // sections is one rewrite, so the ceiling is several rewrites a day.
      const cooldownMs = Number(Deno.env.get("DOSSIER_RUN_COOLDOWN_MS")) || 4000;
      const dailyCap = Number(Deno.env.get("DOSSIER_DAILY_SECTION_CAP")) || 60;

      const { data: running } = await admin
        .from("org_dossiers").select("run_started_at")
        .eq("organization_id", orgId).maybeSingle();
      const startedAt = Date.parse(String((running as Json)?.run_started_at ?? "")) || 0;
      if (startedAt && Date.now() - startedAt < cooldownMs) {
        return json({ error: "That is already being written — give it a moment." }, 429);
      }

      const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
      const { count: spentToday, error: countErr } = await admin
        .from("ai_usage")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("feature", "dossier-localise")
        .gte("created_at", since);
      // Deliberately fails OPEN, and says so out loud. Refusing a paid feature
      // because one count query hiccuped punishes the customer for our problem,
      // and the cooldown above still stops the runaway case this guards against.
      // Silence would be the mistake: without the log nobody learns the ceiling
      // stopped counting.
      if (countErr) console.warn("[phoxta] dossier daily cap unreadable:", countErr.message);
      if ((spentToday ?? 0) >= dailyCap) {
        return json({
          error: "This business has rewritten its playbook as many times as we allow in a day. It will be available again tomorrow.",
        }, 429);
      }

      await admin.from("org_dossiers")
        .update({ run_started_at: new Date().toISOString(), run_error: null })
        .eq("organization_id", orgId);

      let bp: Json = null;
      if (blueprintId) {
        const { data } = await admin
          .from("blueprints")
          .select("id, slug, name, tagline, description, vertical, price_cents, currency")
          .eq("id", blueprintId).maybeSingle();
        bp = data;
      }

      brief = [
        bp ? blueprintBrief(bp) : `A small online business called ${auth.ok.org.name}.`,
        `The business is called ${auth.ok.org.name}.`,
        `Its owner has told us: ${answers}`,
      ].join(" ");

      const { data: mine } = await admin
        .from("org_dossier_sections").select("section, content").eq("organization_id", orgId);

      // The shared version of THIS section, so localising is a rewrite of a
      // considered document rather than a fresh invention that happens to sit
      // under the same heading.
      let shared = "";
      if (blueprintId) {
        const { data: g } = await admin
          .from("blueprint_dossier_sections").select("content")
          .eq("blueprint_id", blueprintId).eq("section", section).maybeSingle();
        if (g) shared = JSON.stringify((g as Json).content).slice(0, CARRY_GLOBAL);
      }

      ctx = [
        "You are rewriting one section of a shared dossier for ONE specific business.",
        "Keep the structure and every honesty rule. Change the substance so each figure, channel, supplier type and risk is about this location, this slice of the market and this budget.",
        "Where the owner's answers make part of the shared version irrelevant, replace it rather than keeping both. Where their answers do not touch something, keep the shared judgement rather than inventing a difference for its own sake.",
        // NAMING A PLACE IS NOT KNOWING ABOUT IT. Without this, the rewrite reads
        // as better-researched than the general version it came from — the same
        // guesswork wearing a postcode — and the model raises its own confidence
        // to match, so the least reliable figures on the page arrive wearing the
        // greenest badge. Localising narrows the QUESTION; it adds no data.
        "CRITICAL: you have been given no data whatsoever about this location or this market. You are applying general reasoning to the owner's answers, which is useful, but it is not local research and must never read as if it were.",
        "So: do NOT raise `confidence` above the shared version's — a figure narrowed to one town is less certain than the broad one it came from, never more. If the shared version said medium, say medium or low.",
        "Do NOT invent local specifics you cannot derive from their answers: no street or district names, no named local competitors, no local rents, wages, footfall or population figures. Say what would have to be true and tell them how to check it locally.",
        "Every `basis` must state plainly that it reasons from their answers rather than from data about their area.",
        shared ? `\nThe shared version of this section:\n${shared}` : "",
        contextFrom((mine as Row[] | null) ?? [], section, "Sections of their own version already written:"),
        "---\n",
      ].filter(Boolean).join("\n");

      meterOrg = orgId;
    }

    const { data: output, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor(spec.tier),
      system: spec.system,
      user: spec.user(ctx, brief),
      maxTokens: spec.maxTokens,
    });

    await attachImage(output);

    // ── Store ────────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    if (scope === "blueprint") {
      const { error } = await admin.from("blueprint_dossier_sections").upsert(
        { blueprint_id: blueprintId, section, content: output, model, generated_at: now },
        { onConflict: "blueprint_id,section" },
      );
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin.from("org_dossier_sections").upsert(
        { organization_id: orgId, section, content: output, model, generated_at: now },
        { onConflict: "organization_id,section" },
      );
      if (error) return json({ error: error.message }, 500);
    }

    // What is stored NOW, so `next` is derived from the database rather than
    // from an index — a re-run of one section in the middle resumes correctly
    // instead of restarting the tail.
    const { data: after } = scope === "blueprint"
      ? await admin.from("blueprint_dossier_sections").select("section").eq("blueprint_id", blueprintId)
      : await admin.from("org_dossier_sections").select("section").eq("organization_id", orgId);
    const have = new Set(((after as { section: string }[] | null) ?? []).map((r) => r.section));
    const next = ORDER.find((k) => !have.has(k)) ?? null;
    const complete = next === null;

    const parentPatch: Json = { run_started_at: null, run_error: null };
    if (complete) parentPatch.run_finished_at = now;
    if (scope === "blueprint") {
      // Live only once every section exists: a half-written dossier should be
      // invisible to buyers rather than half-shown.
      if (complete) parentPatch.status = "live";
      await admin.from("blueprint_dossiers").update(parentPatch).eq("blueprint_id", blueprintId);
    } else {
      if (complete) parentPatch.status = "ready";
      await admin.from("org_dossiers").update(parentPatch).eq("organization_id", orgId);
    }

    if (meterOrg) {
      await meter(admin, {
        organizationId: meterOrg,
        model,
        feature: scope === "blueprint" ? "dossier-blueprint" : "dossier-localise",
        tier: spec.tier,
        inTok, outTok, cacheWriteTok, cacheReadTok,
        latencyMs: Date.now() - started,
      });
    }

    return json({ section, output, next, done: complete });
  } catch (err) {
    // Recorded on the parent row so a failed run shows why on reload rather
    // than looking idle.
    const reason = String((err as Error)?.message || err).slice(0, 300);
    if (failTarget) {
      try {
        await admin.from(failTarget.table)
          .update({ run_started_at: null, run_error: reason })
          .eq(failTarget.column, failTarget.value);
      } catch { /* the response below still carries the reason */ }
    }
    return json({ error: reason }, 500);
  }
});
