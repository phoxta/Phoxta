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
import { meter } from "../_shared/meter.ts";
import { searchStock } from "../_shared/stock.ts";
import { makeImage } from "../_shared/openai.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** A month is the unit people think in; beyond that the plan is fiction. */
const MAX_DAYS = 60;
/** More than this and nobody reads the plan they are approving. */
const MAX_POSTS = 30;
/** Generated pictures land here, in the business's own public bucket. */
const IMAGE_BUCKET = "design-assets";

const HOUSE = [
  "You plan social content for small businesses, and you are good at it, which means the month has a shape rather than being thirty unrelated posts.",
  "",
  "WHAT A GOOD MONTH LOOKS LIKE: a mix of angles — what the business sells, how it is made, who it is for, what people ask, what is happening this month. The same angle twice in a row is how a feed starts being scrolled past.",
  "",
  "NEVER WRITE: unlock, elevate, game-changer, dive in, in today's fast-paced world, we are thrilled to announce, or a rhetorical question as an opener.",
  "",
  "THE HARD RULE: you may only say what the business details below actually say. Do not invent a price, a discount, a deadline, a delivery time, an opening hour, a stock level, an award or a statistic. If you have no reason to promise anything, write the honest post instead — a plan that invents an offer is published under their name and they find out when a customer arrives expecting it.",
].join("\n");

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

    const { data: org } = await admin.from("organizations")
      .select("name, vertical, branding").eq("id", orgId).maybeSingle();

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
      `They are going to: ${[...new Set(channels.map((c) => c.platform))].join(", ")}.`,
      "",
      "Return JSON only:",
      "{",
      '  "title": string — a short name for this month\'s plan,',
      '  "rationale": string — two or three sentences on the shape you gave the month and why,',
      '  "posts": [{',
      '    "date": "YYYY-MM-DD",',
      '    "hour": number — 0-23, when it should go out,',
      '    "angle": string — what this post is doing, in three or four words,',
      '    "headline": string — the words ON the picture. Under 60 characters,',
      '    "subhead": string — a supporting line on the picture, under 90 characters. May be empty,',
      '    "caption": string — the post caption, WITHOUT hashtags,',
      '    "hashtags": string[] — a handful, each starting with #,',
      '    "imageQuery": string — what the photograph behind it should be of, in a few words',
      "  }]",
      "}",
    ].filter(Boolean).join("\n");

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

    // The template every planned post starts from. One layout for the month
    // keeps it recognisably one business rather than a scrapbook.
    const templateId = String(body?.templateId ?? "v1");

    let made = 0;
    for (const it of items) {
      const when = new Date(`${String(it?.date ?? startsOn)}T${String(Math.min(23, Math.max(0, Number(it?.hour) || 10))).padStart(2, "0")}:00:00`);
      if (Number.isNaN(when.getTime())) continue;

      const query = String(it?.imageQuery ?? "");
      let image: Json = null;
      if (imagery === "generated") {
        try {
          const bytes = await makeImage(query);
          const path = `${orgId}/${crypto.randomUUID()}.png`;
          try { await admin.storage.createBucket(IMAGE_BUCKET, { public: true }); } catch { /* exists */ }
          const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
          if (!error) {
            image = { url: admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl, alt: query, source: "generated" };
          }
        } catch (e) {
          // One picture failing must not lose the month. It falls back to
          // stock, which is a worse picture and a finished plan.
          console.error("generated image failed, falling back to stock:", (e as Error)?.message);
        }
      }
      if (!image) {
        const photo = await searchStock(query).catch(() => null);
        if (photo) {
          image = { url: photo.url, alt: photo.alt ?? "", photographer: photo.photographer, photographerUrl: photo.photographerUrl, source: "pexels" };
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

    return json({
      ok: true, planId: plan.id,
      title: String(out?.title ?? ""), rationale: String(out?.rationale ?? ""),
      posts: made,
      note: "Nothing goes out until the plan is approved.",
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
