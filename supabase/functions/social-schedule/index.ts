// Phoxta — social-schedule: what the console calls to queue, cancel and read
// back a scheduled post. Member-authed, per business.
//
// Actions: accounts | list | schedule | cancel | retry | disconnect
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
          .select("id, design_id, media_url, caption, scheduled_at, status, created_at, social_targets(id, platform, status, permalink, error)")
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

        const { data: post, error } = await admin.from("social_posts").insert({
          organization_id: org.id,
          design_id: body?.designId ?? null,
          media_url: media,
          caption,
          scheduled_at: at.toISOString(),
          status: "queued",
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
