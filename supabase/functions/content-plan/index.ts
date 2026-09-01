// Phoxta — content-plan: a month of posts, planned once and approved once.
//
// WHY THIS IS NOT objective-planner. That one is deliberately ONE ACTION PER
// TICK — its own comment says a planner returning five actions has to be
// trusted about all five at once, while a planner returning one is checked
// against reality before it is asked again. That is the right shape for an
// autopilot reacting to a business, and the wrong shape for a content calendar,
// which is a single artefact a person wants to read end to end and change
// before any of it happens.
//
// So the trade is made explicitly and paid for elsewhere: the plan is bigger
// than one action, and in exchange NOTHING IN IT CAN GO OUT until a human
// approves the whole thing. Its posts are written as `draft`, and the publisher
// only ever claims `queued` — so an unapproved plan is not a promise to post,
// it is a document.
//
// THE PICTURES ARE NOT RENDERED HERE. Thirty designs at two seconds each would
// spend a minute of a request's budget, and most of those pictures are for days
// that are weeks away. Each post carries its design_id and an empty media_url;
// social-publish renders on the way past, once, on the day. The console can
// render any of them sooner by calling design-render, which is what a preview
// does.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { isTrustedTransport } from "../_shared/internalProof.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";
import { findStock } from "../_shared/stock.ts";
import { makeImage, IMAGE_DAILY_CAP_MESSAGE } from "../_shared/openai.ts";
import { LIMITS } from "../_shared/social.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** A month is the unit people think in; beyond that the plan is fiction. */
const MAX_DAYS = 60;
/** More than this and nobody reads the plan they are approving. */
const MAX_POSTS = 30;
/** Generated pictures land here, in the business's own public bucket. */
const IMAGE_BUCKET = "design-assets";

/**
 * The layouts, as the client knows them.
 *
 * Sent with the request rather than listed here, exactly as design-generate
 * does it and for the reason written there: a hand-written server-side copy
 * listed six templates while the pack had eighteen, and the failure of a
 * duplicated list is that it keeps working, just wrongly.
 *
 * Client-supplied is fine here — it only decides which of that same client's
 * own layouts its own designs use — and every id that comes back is checked
 * against this list before it reaches a row.
 */
type Layout = { id: string; purpose: string };

function readCatalogue(v: unknown): Layout[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t: Json) => t && typeof t.id === "string")
    .slice(0, 40)
    .map((t: Json) => ({ id: String(t.id).slice(0, 20), purpose: String(t.purpose ?? "").slice(0, 200) }));
}

const HOUSE = [
  "You plan social content for small businesses, and you are good at it, which means the month has a shape rather than being thirty unrelated posts.",
  "",
  "WHAT A GOOD MONTH LOOKS LIKE: a mix of angles — what the business sells, how it is made, who it is for, what people ask, what is happening this month. The same angle twice in a row is how a feed starts being scrolled past.",
  "",
  "NEVER WRITE: unlock, elevate, game-changer, dive in, in today's fast-paced world, we are thrilled to announce, or a rhetorical question as an opener.",
  "",
  "THE HARD RULE: you may only say what the business details below actually say. Do not invent a price, a discount, a deadline, a delivery time, an opening hour, a stock level, an award or a statistic. If you have no reason to promise anything, write the honest post instead — a plan that invents an offer is published under their name and they find out when a customer arrives expecting it.",
].join("\n");

/**
 * A local wall-clock hour on a date, in the business's own IANA timezone,
 * resolved to the UTC instant stored in scheduled_at.
 *
 * The planner picks a plain hour (say 10). Written as `${date}T10:00:00` and
 * parsed by the Deno runtime (UTC), that became 10:00 UTC for EVERY business —
 * so a New York shop's "10am" post went out at 6am its own time. Intl gives the
 * zone's offset for that exact date (DST included); adding it back turns the
 * local 10:00 into the correct UTC instant. Returns null on a date that will not
 * parse, so the post is skipped rather than scheduled at a wrong or invalid time.
 *
 * The single hour of a DST transition can land an hour off — a social post is
 * not worth solving spring-forward for — and an IANA name Intl does not know
 * falls back to UTC (the pre-change behaviour) rather than losing the post.
 */
function wallClockToUtc(dateStr: string, hour: number, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!m) return null;
  const naiveUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, 0, 0);
  if (Number.isNaN(naiveUtc)) return null;
  let offsetMs = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(naiveUtc));
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    // The wall clock the zone shows for `naiveUtc`, read back as if it were UTC:
    // its distance from naiveUtc IS the zone's offset at that date.
    const asUtc = Date.UTC(
      Number(p.year), Number(p.month) - 1, Number(p.day),
      Number(p.hour), Number(p.minute), Number(p.second),
    );
    offsetMs = asUtc - naiveUtc;
  } catch {
    offsetMs = 0; // an IANA name Intl does not know — treat as UTC
  }
  const t = new Date(naiveUtc - offsetMs);
  return Number.isNaN(t.getTime()) ? null : t;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    if (!orgId) return json({ error: "Choose a business first." }, 400);

    /**
     * Two ways in, and the second is narrow on purpose.
     *
     * A person calls this with their own session. The OPERATOR calls it as
     * itself, from agent-operator, which has no user JWT to present — so it
     * proves it is one of our own functions with the shared HMAC and names the
     * owner it is acting for. The proof is not authority on its own; it says
     * "this call came from inside", and the acting user is still recorded on
     * everything the plan creates, so an operator-made plan is attributable to
     * the person whose session asked for it.
     */
    let actingUser: string | null;
    if (await isTrustedTransport(req)) {
      actingUser = req.headers.get("x-acting-user") || null;
    } else {
      const auth = await authorize(req, orgId);
      if (auth.error) return auth.error;
      actingUser = auth.ok.userId;
    }
    const admin = adminClient();

    const action = String(body?.action ?? "generate");

    // ── read a plan back ────────────────────────────────────────────────────
    if (action === "list") {
      const { data } = await admin.from("content_plans")
        .select("id, title, brief, starts_on, days, status, rationale, approved_at, created_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20);
      return json({ plans: data ?? [] });
    }

    if (action === "get") {
      const id = String(body?.planId ?? "");
      const { data: plan } = await admin.from("content_plans")
        .select("*").eq("id", id).eq("organization_id", orgId).maybeSingle();
      if (!plan) return json({ error: "No such plan." }, 404);
      const { data: posts } = await admin.from("social_posts")
        .select("id, design_id, caption, scheduled_at, status, media_url, social_targets(platform, status)")
        .eq("plan_id", id).order("scheduled_at");
      return json({ plan, posts: posts ?? [] });
    }

    // ── approve the month ───────────────────────────────────────────────────
    //
    // One statement, in the database, because a loop here could queue half a
    // month and then fail — leaving the owner with fifteen posts going out and
    // no way to tell which fifteen.
    if (action === "approve") {
      const id = String(body?.planId ?? "");
      const { data, error } = await admin.rpc("app_approve_content_plan", { p_plan: id });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, queued: data ?? 0 });
    }

    if (action === "reject") {
      const id = String(body?.planId ?? "");
      const { error } = await admin.from("content_plans")
        .update({ status: "rejected" }).eq("id", id).eq("organization_id", orgId);
      if (error) return json({ error: error.message }, 400);
      // Its posts stay `draft` and are therefore unpublishable, which is the
      // whole point of drafting them rather than queueing them.
      return json({ ok: true });
    }

    // ── edit one planned post ───────────────────────────────────────────────
    //
    // THROUGH THE FUNCTION, NOT AT THE TABLE. social_posts is SELECT-only for
    // members under RLS, so the console's old direct UPDATE matched zero rows
    // and reported success — the edit showed locally, and on the day the OLD
    // caption published. The rules the rest of the plan lives by are enforced
    // where the write happens: only a draft can change (an approved post's
    // caption is a plan the owner already signed off), and the caption obeys
    // the same per-platform caps social-schedule enforces on its own queue.
    if (action === "update_post") {
      // The entry gate above authorised body.orgId; update_post's documented
      // body names the org as organizationId, like the other member endpoints.
      // The two must agree — reading organizationId unchecked would let a
      // member of one business aim the write at another's post.
      const claimedOrg = String(body?.organizationId ?? orgId);
      if (claimedOrg !== orgId) return json({ error: "That post is not in this business." }, 403);

      const planId = String(body?.planId ?? "");
      const postId = String(body?.postId ?? "");
      if (!planId || !postId) return json({ error: "Which post?" }, 400);

      // Belongs to the plan AND the org — the ids arrive separately, and each
      // alone proves nothing about the other.
      const { data: post } = await admin.from("social_posts")
        .select("id, status")
        .eq("id", postId).eq("plan_id", planId).eq("organization_id", orgId).maybeSingle();
      if (!post) return json({ error: "That post is not in this plan." }, 404);
      if ((post as Json).status !== "draft") {
        return json({ error: "Only drafts can be edited — this post is already queued." }, 409);
      }

      const patch: Json = {};
      if (body?.caption !== undefined) {
        const caption = String(body.caption ?? "").trim();
        // The same caps social-schedule checks, against the channels this post
        // is actually going to: a cap discovered at publish time is a failed
        // post, a cap discovered here is a red field.
        const { data: targets } = await admin.from("social_targets")
          .select("platform").eq("post_id", postId);
        const platforms = [...new Set(((targets ?? []) as Json[]).map((t) => String(t.platform)))];
        const tooLong = platforms.filter((p) => caption.length > (LIMITS[p as keyof typeof LIMITS]?.caption ?? 2200));
        if (tooLong.length) {
          return json({ error: `That caption is too long for ${tooLong.join(", ")}.` }, 400);
        }
        patch.caption = caption;
      }
      if (body?.scheduledAt !== undefined) {
        const at = new Date(String(body.scheduledAt));
        if (Number.isNaN(at.getTime())) return json({ error: "That date does not parse." }, 400);
        patch.scheduled_at = at.toISOString();
      }
      if (Object.keys(patch).length === 0) return json({ error: "Nothing to change." }, 400);

      const { data: updated, error: uErr } = await admin.from("social_posts")
        .update(patch).eq("id", postId).eq("organization_id", orgId)
        // The same shape `get` returns per post, so the console can swap the
        // row in place rather than refetching the whole plan.
        .select("id, design_id, caption, scheduled_at, status, media_url, social_targets(platform, status)")
        .single();
      if (uErr || !updated) return json({ error: uErr?.message ?? "The post could not be saved." }, 500);
      return json({ post: updated });
    }

    // ── plan a month ────────────────────────────────────────────────────────
    const brief = String(body?.brief ?? "").trim().slice(0, 1000);
    const days = Math.min(MAX_DAYS, Math.max(1, Number(body?.days) || 30));
    const count = Math.min(MAX_POSTS, Math.max(1, Number(body?.posts) || 12));
    const startsOn = String(body?.startsOn ?? "").trim() || new Date().toISOString().slice(0, 10);
    /**
     * Where the pictures come from.
     *
     * STOCK BY DEFAULT, and that is not timidity. Pexels is real photography,
     * free, and instant; generated imagery costs real money per picture, and a
     * month of it is thirty charges for a plan the owner has not approved yet.
     * A business that wants a look nothing in a stock library has can ask for
     * it — and pays for it knowingly.
     */
    const imagery = String(body?.imagery ?? "stock") === "generated" ? "generated" : "stock";

    const layouts = readCatalogue(body?.catalogue);
    const asked = String(body?.templateId ?? "").trim();
    // Varying is only possible when the caller told us what the layouts are.
    // The operator calls this with no catalogue, so it gets one consistent
    // look rather than a month of layouts picked from a list we do not have.
    const wantVary = asked === "vary" && layouts.length > 1;

    const { data: org } = await admin.from("organizations")
      .select("name, vertical, branding, timezone").eq("id", orgId).maybeSingle();
    // The business's own zone (migration 0129). The planner picks an HOUR — local,
    // "when a customer is on their phone" — and scheduled_at must hold the UTC
    // instant of that local hour (see wallClockToUtc). 'UTC' when unset reproduces
    // the old, schedule-everything-in-UTC behaviour.
    const tz = String((org as Json)?.timezone ?? "").trim() || "UTC";

    // Only channels that can actually receive it. Planning for a platform the
    // business has not connected produces a month that half fails on the day.
    const { data: accts } = await admin.from("social_accounts")
      .select("id, platform, handle").eq("organization_id", orgId).eq("status", "connected");
    const channels = (accts ?? []) as Json[];
    if (channels.length === 0) {
      return json({ error: "No social accounts are connected, so there is nowhere for a plan to go. Connect one in Graphics → Accounts." }, 400);
    }

    // What the business sells, so the plan is about it rather than about
    // small businesses in general.
    const { data: products } = await admin.from("products")
      .select("name, description").eq("organization_id", orgId).eq("status", "active").limit(20);

    const user = [
      `THE BUSINESS: ${(org as Json)?.name ?? "a small business"}${(org as Json)?.vertical ? `, trading in ${(org as Json).vertical}` : ""}.`,
      products?.length
        ? `WHAT IT SELLS:\n${products.map((p: Json) => `- ${p.name}${p.description ? `: ${String(p.description).slice(0, 140)}` : ""}`).join("\n")}`
        : "It has no catalogue loaded, so write about the trade rather than about specific products.",
      brief ? `\nWHAT THE OWNER WANTS FROM THIS MONTH: ${brief}` : "",
      "",
      `PLAN ${count} POSTS across ${days} days starting ${startsOn}. Spread them — not one a day for ${count} days and then nothing.`,
      `Times are the business's own local time (${tz}) — pick the hour a customer there is actually on their phone; Phoxta converts it to the right moment.`,
      `They are going to: ${[...new Set(channels.map((c) => c.platform))].join(", ")}.`,
      wantVary
        ? "\nTHE LAYOUTS YOU MAY USE, and what each is for. Pick the one that suits each post rather than the same one every time:\n" +
          layouts.map((l) => `- ${l.id}: ${l.purpose}`).join("\n")
        : "",
      "",
      "Return JSON only:",
      "{",
      '  "title": string — a short name for this month\'s plan,',
      '  "rationale": string — two or three sentences on the shape you gave the month and why,',
      '  "posts": [{',
      '    "date": "YYYY-MM-DD",',
      `    "hour": number — 0-23, the business's local hour (${tz}) it should go out,`,
      '    "angle": string — what this post is doing, in three or four words,',
      '    "headline": string — the words ON the picture. Under 60 characters,',
      '    "subhead": string — a supporting line on the picture, under 90 characters. May be empty,',
      '    "caption": string — the post caption, WITHOUT hashtags,',
      '    "hashtags": string[] — a handful, each starting with #,',
      '    "imageQuery": string — what the photograph behind it should be of, in a few words' +
        (wantVary ? "," : ""),
      wantVary
        ? '    "layout": string — the id of the layout that suits THIS post, from the list above'
        : "",
      "  }]",
      "}",
    ].filter(Boolean).join("\n");

    // Don't spend a model turn a plan the business cannot afford would only
    // waste. The same monthly cap every other AI feature checks (assertWithinCap):
    // over it we refuse BEFORE the call, not after billing for it.
    const cap = await assertWithinCap(admin, orgId);
    if (!cap.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    const started = Date.now();
    const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor("balanced"),
      system: HOUSE,
      user,
      maxTokens: 8000,
    });

    const items = (Array.isArray(out?.posts) ? out.posts : []).slice(0, count);
    if (items.length === 0) return json({ error: "Nothing came back — try again." }, 502);

    const { data: plan, error: planErr } = await admin.from("content_plans").insert({
      organization_id: orgId,
      title: String(out?.title ?? "Content plan").slice(0, 120),
      brief, starts_on: startsOn, days,
      rationale: String(out?.rationale ?? "").slice(0, 2000),
      status: "draft",
      created_by: actingUser,
    }).select("id").single();
    if (planErr || !plan) return json({ error: planErr?.message ?? "Could not save the plan." }, 500);

    // Which layout each post uses. A single id pins the month to one look;
    // "vary" lets the planner choose per post from the catalogue, matching the
    // layout's stated purpose to what that post is doing — which is what the
    // purpose field is for.
    const fallbackTemplate = layouts[0]?.id ?? "v1";
    const fixedTemplate = wantVary ? "" : (layouts.some((l) => l.id === asked) ? asked : fallbackTemplate);

    // Degradations discovered while filling the month, reported at the end
    // rather than thrown: the plan is thirty posts, and one exhausted image
    // budget or one unreachable photo service must not cost the other
    // twenty-nine.
    let imageCapReason = "";
    let stockUnavailable = "";
    let stockUnavailablePosts = 0;

    let made = 0;
    for (const it of items) {
      // The hour is the business's LOCAL hour; wallClockToUtc turns it into the
      // real UTC instant so scheduled_at is not the same clock time in every zone.
      const hour = Math.min(23, Math.max(0, Number(it?.hour) || 10));
      const when = wallClockToUtc(String(it?.date ?? startsOn), hour, tz);
      if (!when) continue;

      // An id the model invented is not an error worth losing the post over —
      // it falls back to the first real layout.
      const templateId = wantVary
        ? (layouts.some((l) => l.id === String(it?.layout)) ? String(it.layout) : fallbackTemplate)
        : fixedTemplate;

      const query = String(it?.imageQuery ?? "");
      let image: Json = null;
      if (imagery === "generated" && !imageCapReason) {
        try {
          // admin+orgId turn the shared client's metering ON: the monthly cap
          // and the daily image backstop are checked BEFORE each picture and
          // the spend is booked into ai_usage after — a month of generated
          // imagery used to be invisible to both.
          const bytes = await makeImage(query, { admin, orgId, userId: actingUser, feature: "content-plan-image" });
          const path = `${orgId}/${crypto.randomUUID()}.png`;
          try { await admin.storage.createBucket(IMAGE_BUCKET, { public: true }); } catch { /* exists */ }
          const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
          if (!error) {
            image = { url: admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl, alt: query, source: "generated" };
          }
        } catch (e) {
          const why = String((e as Error)?.message ?? e);
          // The two budget refusals are the contract, compared exactly. Either
          // one holds for the REST of this request too — a cap does not reset
          // mid-plan — so the remaining posts degrade straight to stock
          // without asking again, and the reason travels back on the response
          // rather than failing a month the model already wrote.
          if (why === CAP_REACHED_MESSAGE || why === IMAGE_DAILY_CAP_MESSAGE) {
            imageCapReason = why;
          } else {
            // One picture failing must not lose the month. It falls back to
            // stock, which is a worse picture and a finished plan.
            console.error("generated image failed, falling back to stock:", why);
          }
        }
      }
      if (!image) {
        // findStock, not searchStock: "no photograph matched" and "Pexels
        // could not be asked" are different answers, and the second used to
        // land as a silent no-photo post. The org id feeds the per-tenant
        // hourly bucket in stock.ts.
        const found = await findStock(query, { orgId });
        if (found.photo) {
          const photo = found.photo;
          image = { url: photo.url, alt: photo.alt ?? "", photographer: photo.photographer, photographerUrl: photo.photographerUrl, source: "pexels" };
        } else if (found.unavailable) {
          stockUnavailablePosts++;
          if (!stockUnavailable) stockUnavailable = found.unavailable;
        }
      }

      const doc = {
        templateId,
        content: {
          title: String(it?.headline ?? "").slice(0, 120),
          subtitle: String(it?.subhead ?? "").slice(0, 160),
        },
        images: image ? { image1: image } : {},
      };

      const { data: design } = await admin.from("designs").insert({
        organization_id: orgId,
        title: String(it?.angle ?? "Planned post").slice(0, 120),
        template_id: templateId,
        doc,
        brief: String(it?.angle ?? ""),
        created_by: actingUser,
      }).select("id").single();
      if (!design) continue;

      const tags = (Array.isArray(it?.hashtags) ? it.hashtags : [])
        .map((h: unknown) => String(h).trim()).filter(Boolean)
        .map((h: string) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 8);
      const caption = [String(it?.caption ?? "").trim(), tags.join(" ")].filter(Boolean).join("\n\n");

      // DRAFT, not queued. The publisher only claims `queued`, so nothing here
      // can go out until the whole plan is approved.
      const { data: post } = await admin.from("social_posts").insert({
        organization_id: orgId, plan_id: plan.id, design_id: design.id,
        media_url: "", caption, scheduled_at: when.toISOString(),
        status: "draft", created_by: actingUser,
      }).select("id").single();
      if (!post) continue;

      await admin.from("social_targets").insert(
        channels.map((c) => ({ organization_id: orgId, post_id: post.id, account_id: c.id, platform: c.platform })),
      );
      made++;
    }

    await meter(admin, {
      organizationId: orgId, userId: actingUser, feature: "content-plan",
      tier: "balanced", model, inTok, outTok, cacheWriteTok, cacheReadTok,
      latencyMs: Date.now() - started,
    });

    // What degraded and why, said plainly. social_posts has no notes column,
    // so the honest record of "these posts have stock instead of generated" or
    // "these have no photograph" is the response the console shows the person
    // who asked — a silent downgrade would read as the planner's choice.
    const notes: string[] = [];
    if (imageCapReason) {
      notes.push(`Some posts use stock photography instead of generated imagery: ${imageCapReason}`);
    }
    if (stockUnavailablePosts > 0) {
      notes.push(
        `${stockUnavailablePosts} post(s) have no photograph — stock could not be searched (${stockUnavailable}). ` +
        "Their designs still work; add pictures in the editor or regenerate later.",
      );
    }

    return json({
      ok: true, planId: plan.id,
      title: String(out?.title ?? ""), rationale: String(out?.rationale ?? ""),
      posts: made,
      ...(notes.length ? { notes } : {}),
      note: "Nothing goes out until the plan is approved.",
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
