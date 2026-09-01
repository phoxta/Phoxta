// Phoxta — social-schedule: what the console calls to queue, cancel and read
// back a scheduled post. Member-authed, per business.
//
// Actions: accounts | list | schedule | update | cancel | retry | disconnect
//
// The publishing itself is social-publish, pinged by cron. This function only
// writes the queue, so a slow platform can never block the person pressing the
// button — and the queue survives the tab being closed, which is the whole
// point of scheduling rather than posting.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { LIMITS } from "../_shared/social.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/**
 * The per-platform options, cleaned on the way in.
 *
 * NOT trusted from the browser. These end up as parameters on a Meta API call,
 * and Instagram refuses the WHOLE container when one of them is malformed — so
 * a stray "@" on a username or a tag coordinate of 1.4 would not lose the tag,
 * it would lose the post, minutes later, in a worker, with the reason arriving
 * as a 400 nobody is watching. Cleaning here means the stored options are
 * always publishable.
 *
 * The caps are Instagram's own: 3 collaborators, 20 tags on an image, 1000
 * characters of alt text.
 */
function cleanOptions(v: Json): Json {
  const ig = (v?.instagram ?? {}) as Json;
  const handle = (x: unknown) => String(x ?? "").trim().replace(/^@+/, "").slice(0, 30);
  const unit = (x: unknown) => Math.min(1, Math.max(0, Number(x) || 0));

  const collaborators = (Array.isArray(ig.collaborators) ? ig.collaborators : [])
    .map(handle).filter(Boolean).slice(0, 3);
  const userTags = (Array.isArray(ig.userTags) ? ig.userTags : [])
    .map((t: Json) => ({ username: handle(t?.username), x: unit(t?.x), y: unit(t?.y) }))
    .filter((t: Json) => t.username).slice(0, 20);
  const altText = String(ig.altText ?? "").trim().slice(0, 1000);
  const alsoStory = Boolean(ig.alsoStory);

  const out: Json = {};
  if (collaborators.length || userTags.length || altText || alsoStory) {
    out.instagram = { collaborators, userTags, altText, alsoStory };
  }
  return out;
}

/**
 * The design's artboard shape, read where the queue is written.
 *
 * Instagram's FEED takes 4:5 through 1.91:1 and nothing else. A story-shaped
 * design (1080×1920, 9:16) is outside that range, and the refusal used to
 * arrive days later, in the worker, as an opaque container error nobody was
 * watching. That is the one hard, knowable-in-advance violation — so it is
 * refused at scheduling time, while the person can still fix it. Everything
 * softer stays advisory with no block: X crops, LinkedIn letterboxes and
 * TikTok pads, but they all TAKE the picture.
 *
 * Absent format means portrait (1080×1350) — every document saved before
 * formats existed is one (see designs/types). A carousel stores
 * { slides: [...] }; its slides share an artboard in the editor, so the first
 * slide speaks for the deck.
 */
async function designFormat(admin: Json, orgId: string, designId: string): Promise<string> {
  const { data } = await admin.from("designs")
    .select("doc").eq("id", designId).eq("organization_id", orgId).maybeSingle();
  const doc = (data as Json)?.doc;
  const fmt = Array.isArray(doc?.slides) ? doc.slides[0]?.format : doc?.format;
  return fmt === "square" || fmt === "story" ? fmt : "portrait";
}

const STORY_TO_FEED =
  "That's a Story-shaped design — Instagram feed posts need portrait or square. Post it as a Story instead.";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const action = String(body?.action ?? "");

    const a = await authorize(req, body?.organizationId);
    if (a.error) return a.error;
    const { admin, org, userId } = a.ok;

    switch (action) {
      case "accounts": {
        // Never selects the token columns. The client has no business holding
        // them and RLS lets members read the row.
        const { data, error } = await admin
          .from("social_accounts")
          .select("id, platform, handle, display_name, avatar_url, status, last_error, updated_at")
          .eq("organization_id", org.id)
          .order("platform");
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, accounts: data ?? [], limits: LIMITS });
      }

      case "list": {
        const { data, error } = await admin
          .from("social_posts")
          .select("id, design_id, media_url, caption, scheduled_at, status, created_at, options, social_targets(id, account_id, platform, status, permalink, error, likes, comments, metrics_at)")
          .eq("organization_id", org.id)
          .order("scheduled_at", { ascending: false })
          .limit(60);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, posts: data ?? [] });
      }

      case "schedule": {
        const caption = String(body?.caption ?? "").trim();
        const media = String(body?.mediaUrl ?? "").trim();
        const when = String(body?.scheduledAt ?? "").trim();
        const accountIds: string[] = Array.isArray(body?.accountIds) ? body.accountIds : [];

        if (!media) return json({ error: "There is no picture to post." }, 400);
        if (accountIds.length === 0) return json({ error: "Choose at least one account." }, 400);
        const at = when ? new Date(when) : new Date();
        if (Number.isNaN(at.getTime())) return json({ error: "That date does not parse." }, 400);

        // The accounts must belong to THIS business. Without this check a
        // caller could post to another org's connected account by id.
        const { data: accts } = await admin
          .from("social_accounts")
          .select("id, platform, status")
          .eq("organization_id", org.id)
          .in("id", accountIds);
        const usable = (accts ?? []) as Json[];
        if (usable.length !== accountIds.length) return json({ error: "One of those accounts is not yours." }, 403);

        const tooLong = usable
          .map((x) => ({ p: x.platform as keyof typeof LIMITS, max: LIMITS[x.platform as keyof typeof LIMITS]?.caption ?? 2200 }))
          .filter((x) => caption.length > x.max);
        if (tooLong.length) {
          return json({ error: `That caption is too long for ${tooLong.map((t) => t.p).join(", ")}.` }, 400);
        }

        const options = cleanOptions(body?.options ?? {});
        // The one hard media-shape refusal (see designFormat). The story flag
        // in the options (`alsoStory` — the only story signal InstagramOptions
        // carries) is the person explicitly choosing the story surface for
        // this picture, so their choice stands and it goes through.
        if (body?.designId && usable.some((x) => x.platform === "instagram") && !options.instagram?.alsoStory) {
          if ((await designFormat(admin, org.id, String(body.designId))) === "story") {
            return json({ error: STORY_TO_FEED }, 400);
          }
        }

        const { data: post, error } = await admin.from("social_posts").insert({
          organization_id: org.id,
          design_id: body?.designId ?? null,
          media_url: media,
          caption,
          scheduled_at: at.toISOString(),
          status: "queued",
          options,
          created_by: userId,
        }).select("id").single();
        if (error || !post) return json({ error: error?.message ?? "Could not queue it." }, 500);

        const { error: tErr } = await admin.from("social_targets").insert(
          usable.map((x) => ({
            organization_id: org.id, post_id: post.id, account_id: x.id, platform: x.platform,
          })),
        );
        if (tErr) {
          // A post with no targets would sit 'queued' for ever, so it goes.
          await admin.from("social_posts").delete().eq("id", post.id);
          return json({ error: tErr.message }, 500);
        }
        return json({ ok: true, id: post.id, at: at.toISOString() });
      }

      /**
       * Change a post that has not gone out: the words, the time, the channels.
       *
       * THE RULE THAT SHAPES ALL OF THIS: a post is editable only while NO
       * channel has published it. Once Instagram has it, the caption in this
       * row stops being a plan and starts being a record of what is live —
       * editing it would leave the console describing a post that says
       * something else, and the owner would have no way to know. So a post
       * with a single sent channel is not edited; it is cancelled, or the
       * failed channels are retried as they are.
       *
       * A channel mid-flight is refused for the same reason a moment earlier:
       * the worker is holding that row and about to put the OLD caption out.
       */
      case "update": {
        const id = String(body?.id ?? "");
        const { data: post } = await admin.from("social_posts")
          .select("id, status, design_id, social_targets(id, account_id, platform, status, claimed_at)")
          .eq("organization_id", org.id).eq("id", id).maybeSingle();
        if (!post) return json({ error: "That post is not there." }, 404);

        const targets = ((post as Json).social_targets ?? []) as Json[];
        if ((post as Json).status === "published" || targets.some((t) => t.status === "sent")) {
          return json({ error: "Part of this has already gone out, so it can no longer be changed. Cancel it and schedule a new one." }, 409);
        }
        if ((post as Json).status === "cancelled") {
          return json({ error: "That post was cancelled." }, 409);
        }
        if (targets.some((t) => t.status === "sending")) {
          return json({ error: "It is going out right now — give it a moment." }, 409);
        }

        const caption = String(body?.caption ?? "").trim();
        const when = String(body?.scheduledAt ?? "").trim();
        const accountIds: string[] = Array.isArray(body?.accountIds) ? body.accountIds : [];
        if (accountIds.length === 0) return json({ error: "Choose at least one account." }, 400);

        const at = when ? new Date(when) : new Date();
        if (Number.isNaN(at.getTime())) return json({ error: "That date does not parse." }, 400);

        const { data: accts } = await admin
          .from("social_accounts").select("id, platform, status")
          .eq("organization_id", org.id).in("id", accountIds);
        const usable = (accts ?? []) as Json[];
        if (usable.length !== accountIds.length) return json({ error: "One of those accounts is not yours." }, 403);

        const tooLong = usable
          .map((x) => ({ p: x.platform as keyof typeof LIMITS, max: LIMITS[x.platform as keyof typeof LIMITS]?.caption ?? 2200 }))
          .filter((x) => caption.length > x.max);
        if (tooLong.length) {
          return json({ error: `That caption is too long for ${tooLong.map((t) => t.p).join(", ")}.` }, 400);
        }

        const options = cleanOptions(body?.options ?? {});
        // The same hard refusal as at schedule time: an edit can ADD Instagram
        // to a story-shaped post, and catching it here beats an opaque worker-
        // side refusal on the day.
        if ((post as Json).design_id && usable.some((x) => x.platform === "instagram") && !options.instagram?.alsoStory) {
          if ((await designFormat(admin, org.id, String((post as Json).design_id))) === "story") {
            return json({ error: STORY_TO_FEED }, 400);
          }
        }

        // Channels removed go entirely — a 'skipped' row would sit in the
        // console for ever saying nothing useful about a choice the owner
        // already reversed. Only unsent rows can be here at all; the guard
        // above saw to that.
        const keep = new Set(accountIds);
        const drop = targets.filter((t) => !keep.has(t.account_id)).map((t) => t.id);
        if (drop.length) await admin.from("social_targets").delete().in("id", drop);

        // Channels added come in fresh. The ones that were already there are
        // left alone rather than reinserted, so a failed attempt count is not
        // silently wiped by an unrelated edit to the wording.
        const had = new Set(targets.map((t) => t.account_id));
        const add = usable.filter((x) => !had.has(x.id));
        if (add.length) {
          const { error: aErr } = await admin.from("social_targets").insert(
            add.map((x) => ({
              organization_id: org.id, post_id: id, account_id: x.id, platform: x.platform,
            })),
          );
          if (aErr) return json({ error: aErr.message }, 500);
        }

        // Anything that failed earlier is put back in the queue with the new
        // wording: fixing a caption a platform refused and then having to
        // press Retry as well would be a step with no meaning behind it.
        await admin.from("social_targets")
          .update({ status: "pending", attempts: 0, error: "", claimed_at: null })
          .eq("post_id", id).eq("status", "failed");

        const { error: uErr } = await admin.from("social_posts").update({
          caption,
          scheduled_at: at.toISOString(),
          status: "queued",
          options,
        }).eq("organization_id", org.id).eq("id", id);
        if (uErr) return json({ error: uErr.message }, 500);

        return json({ ok: true, at: at.toISOString() });
      }

      case "cancel": {
        const { error } = await admin.from("social_posts")
          .update({ status: "cancelled" })
          .eq("organization_id", org.id).eq("id", body?.id)
          // Only something that has not gone out. Cancelling a published post
          // would say "cancelled" about something the world has already seen.
          .in("status", ["queued", "draft", "failed", "part"]);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "delete": {
        const { error } = await admin.from("social_posts")
          .delete()
          .eq("organization_id", org.id).eq("id", body?.id)
          .eq("status", "cancelled");
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "retry": {
        const { data: post } = await admin.from("social_posts")
          .select("id").eq("organization_id", org.id).eq("id", body?.id).maybeSingle();
        if (!post) return json({ error: "That post is not there." }, 404);
        // Only the channels that did not make it, and their attempt count goes
        // back to zero — a retry a person asked for is not the third automatic
        // one.
        await admin.from("social_targets")
          .update({ status: "pending", attempts: 0, error: "", claimed_at: null })
          .eq("post_id", post.id).in("status", ["failed"]);
        await admin.from("social_posts").update({ status: "queued" }).eq("id", post.id);
        return json({ ok: true });
      }

      case "disconnect": {
        const { error } = await admin.from("social_accounts")
          .update({ status: "revoked", access_token: "", refresh_token: "" })
          .eq("organization_id", org.id).eq("id", body?.id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
    }
    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
