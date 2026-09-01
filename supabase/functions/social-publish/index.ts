// Phoxta — social-publish: the queue that puts scheduled posts out.
//
// Pinged every five minutes by the worker-cron tick on the Oracle VM, which is
// what makes this "always on" — nothing here depends on a browser being open.
//
// One row per (post, channel), claimed atomically. Two overlapping ticks
// publishing the same post twice is the one mistake a scheduler cannot take
// back, so the claim is a SECURITY DEFINER update with FOR UPDATE SKIP LOCKED
// rather than a read-then-write in this file.
//
// A post is 'published' only when every one of its channels is; if some worked
// and some did not it settles on 'part', because "it went out" and "it went out
// to LinkedIn but not Instagram" are different things to tell someone.
//
// ── TWO WAYS IN, ONE PUBLISHER ──────────────────────────────────────────────
//
// The cron leg sweeps everything that is due. The member leg — "Send now" in
// the console — names ONE post and skips the wait.
//
// They share this file on purpose. The Instagram token refresh below, the
// marking of an account the platform has rejected, and the settling of a post
// to published/part/failed are the parts that are easy to get subtly wrong,
// and a second publisher written for a button is a second place for them to
// drift. So the button does not publish; it asks this worker to, for one post.
//
// The narrowing happens inside the claim, not around it, which is what makes
// the two legs safe to run at the same instant: FOR UPDATE SKIP LOCKED means
// a person pressing Send now while the tick is already carrying that post
// claims nothing rather than posting it twice.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, isCronRequest } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { renderDesign, designChangedSinceExport } from "../_shared/render.ts";
import { publish, type SocialAccount } from "../_shared/social.ts";
import { refreshInstagram } from "../_shared/socialOauth.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const BATCH = 10;
/** A claim this old with no outcome written is a run that died mid-publish. */
const STALE_MINUTES = 10;

/**
 * The reaper. The claim (0122) retries a row left 'sending' after ten minutes
 * — but only while attempts < 3. A row that crashed on its THIRD attempt met
 * neither branch: not claimable, never settled, 'sending' for ever, and because
 * settle() skips a post with any 'sending' row, the post itself stayed 'queued'
 * for ever too, with "It is going out right now" as the only explanation.
 * Those rows are failed here with a reason, and their posts handed to settle.
 */
async function reapStuckTargets(admin: SupabaseClient, onlyPost: string | null): Promise<string[]> {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  let q = admin
    .from("social_targets")
    .update({ status: "failed", error: "gave up after 3 attempts" })
    .eq("status", "sending")
    .lt("claimed_at", cutoff)
    .gte("attempts", 3);
  if (onlyPost) q = q.eq("post_id", onlyPost);
  const { data } = await q.select("post_id");
  return [...new Set(((data as { post_id: string }[] | null) ?? []).map((r) => r.post_id))];
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // The cron leg carries no JWT that means anything; the shared secret is the
  // whole gate. Compared before any work so an unauthenticated caller cannot
  // even measure the queue. Constant-time, and false when no secret is set.
  const isCron = isCronRequest(req);

  const admin = adminClient();
  // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
  // proving the loop that pings it is alive. Scheduled leg only: a person
  // pressing Send now is not evidence the schedule is working.
  const beat = async (ok: boolean, detail: string) => {
    if (!isCron) return;
    try { await admin.rpc("app_cron_beat", { p_worker: "social-publish", p_ok: ok, p_detail: detail }); } catch { /* the tick still ran */ }
  };

  /** Set on the member leg: the single post this call is allowed to touch. */
  let onlyPost: string | null = null;

  if (!isCron) {
    const body = (await req.json().catch(() => ({}))) as Json;
    const postId = String(body?.postId ?? "");
    // No secret and no post id is not a member asking for one post, it is
    // somebody knocking. Nothing is measured or revealed.
    if (!postId) return json({ error: "Not authorised." }, 401);

    const a = await authorize(req, body?.organizationId);
    if (a.error) return a.error;

    // Membership in SOME business is not permission to publish THIS post —
    // without this the id alone would be enough to put another business's
    // post on the wire.
    const { data: owned } = await admin
      .from("social_posts").select("id")
      .eq("id", postId).eq("organization_id", a.ok.org.id).maybeSingle();
    if (!owned) return json({ error: "That post is not in this business." }, 404);

    onlyPost = postId;
  }

  try {
    // Reap before claiming, so a post whose last channel died on its third try
    // is settled this tick rather than never.
    const touched = new Set<string>();
    const reaped = await reapStuckTargets(admin, onlyPost);
    for (const postId of reaped) touched.add(postId);

    const { data: claimed, error } = await admin.rpc("app_claim_social_targets", {
      p_limit: BATCH,
      p_post_id: onlyPost,
    });
    if (error) {
      await beat(false, `claim failed: ${error.message}`);
      return json({ error: error.message }, 500);
    }
    const targets = (claimed ?? []) as Json[];
    if (targets.length === 0 && touched.size === 0) {
      // The sweep finding nothing is the normal case and needs no words. A
      // person pressing a button and being told "0" is being told nothing —
      // so the member leg works out WHY there was nothing to claim.
      await beat(true, "nothing due");
      return json({ ok: true, claimed: 0, note: onlyPost ? await whyNothing(admin, onlyPost) : "" });
    }

    let sent = 0, failed = 0, simulated = 0, deferred = 0;

    for (const t of targets) {
      touched.add(t.post_id);

      const { data: post } = await admin
        .from("social_posts").select("caption, media_url, options, design_id").eq("id", t.post_id).maybeSingle();
      const { data: acct } = await admin
        .from("social_accounts")
        .select("id, platform, external_id, handle, access_token, refresh_token, token_expiry, status")
        .eq("id", t.account_id).maybeSingle();

      if (!post || !acct) {
        await admin.from("social_targets")
          .update({ status: "failed", error: "The post or the account is gone." }).eq("id", t.id);
        failed++;
        continue;
      }
      if (acct.status !== "connected") {
        await admin.from("social_targets")
          .update({ status: "failed", error: `The ${acct.platform} account needs reconnecting.` }).eq("id", t.id);
        failed++;
        continue;
      }

      /**
       * Renew an Instagram token before it lapses, not after.
       *
       * They last 60 days and are refreshed by presenting the token itself.
       * One refreshed inside its window gets another 60 days; one left to
       * expire cannot be recovered at all and the owner has to reconnect by
       * hand — so this runs on the way past rather than waiting for a failure.
       * A week's margin covers a business that schedules nothing for a while.
       */
      if (acct.platform === "instagram" && acct.token_expiry) {
        const daysLeft = (new Date(acct.token_expiry).getTime() - Date.now()) / 86_400_000;
        if (daysLeft < 7) {
          const fresh = await refreshInstagram(acct.access_token);
          if (fresh) {
            acct.access_token = fresh.accessToken;
            await admin.from("social_accounts").update({
              access_token: fresh.accessToken,
              token_expiry: new Date(Date.now() + fresh.expiresIn * 1000).toISOString(),
            }).eq("id", acct.id);
          }
          // A failed refresh is not fatal here: the token may still have days
          // left on it, so the post is attempted and the real error reported.
        }
      }

      /**
       * A planned post carries a design and no picture until the day it goes.
       *
       * The content planner writes a month of posts at once; rendering thirty
       * pictures there would spend a minute of a request's budget on images for
       * days that are weeks away, and most of them would be re-rendered anyway
       * if the plan were edited. So the render happens here, once, on the way
       * past — and is written back onto the post, so the second channel of the
       * same post reuses it rather than rendering it again. JPEG, because the
       * platforms re-encode everything anyway and it uploads in a fraction of
       * the bytes.
       *
       * A FAILED RENDER IS NOT ONE KIND OF FAILURE, and treating it as one was
       * the bug that killed whole month-plans: three ticks against a down
       * renderer burned all three attempts and failed every post, over an
       * outage that was never a fact about any of them. The kinds (see
       * _shared/render.ts) each get the response they deserve:
       *
       *   unreachable / config — a fact about the box, not the post. Publish
       *     the last saved export if there is one (with an honest note), else
       *     hand the claim back WITHOUT spending an attempt so the next tick
       *     retries past the outage.
       *   unrenderable — a fact about THIS design: the same doc gets the same
       *     422 for ever, so retrying is spending attempts on a certainty.
       *     Failed now, with the reason.
       *   data — our own side (row or storage). Worth the normal retry budget.
       */
      let media = String(post.media_url ?? "");
      let staleNote = "";

      // The design row feeds two decisions: is the stored picture stale, and
      // is there a saved export to fall back on when the renderer is down.
      let design: Json = null;
      if (post.design_id) {
        const { data: d } = await admin.from("designs")
          .select("png_url, png_at, updated_at")
          .eq("id", post.design_id).eq("organization_id", t.organization_id).maybeSingle();
        design = d;
      }

      // A stored media_url is only reused while it still shows the design as
      // it now stands — whoever edited the design after the earlier export
      // meant the edit to be what publishes.
      if (post.design_id && (!media || designChangedSinceExport(design))) {
        const shot = await renderDesign(admin, String(t.organization_id), String(post.design_id), { format: "jpeg" });
        if (!("error" in shot)) {
          media = shot.url;
          await admin.from("social_posts").update({ media_url: media }).eq("id", t.post_id);
        } else if (shot.kind === "unreachable" || shot.kind === "config") {
          const stale = media || String(design?.png_url ?? "");
          if (stale) {
            // A slightly-old picture that goes out on time beats a post that
            // dies over an outage on our side — and the note travels on the
            // settled target so nobody is told it was the current export.
            media = stale;
            staleNote = "posted from the last saved export — the renderer was unreachable";
          } else {
            // Nothing saved to fall back on: DEFER. The claim (0122) set
            // status='sending', claimed_at=now() and attempts+1 — handing the
            // row back means undoing all three, so the outage costs waiting,
            // not budget. The reaper cannot touch it either: it only fails
            // rows still 'sending'.
            await admin.from("social_targets").update({
              status: "pending",
              claimed_at: null,
              attempts: Math.max(0, Number(t.attempts) - 1),
              error: `Waiting for the renderer: ${shot.error}`,
            }).eq("id", t.id);
            deferred++;
            continue;
          }
        } else if (shot.kind === "unrenderable") {
          await admin.from("social_targets")
            .update({ status: "failed", error: `The picture could not be made: ${shot.error}` })
            .eq("id", t.id);
          failed++;
          continue;
        } else {
          // "data": the normal failure path, on the normal retry budget.
          await admin.from("social_targets")
            .update({ status: t.attempts >= 3 ? "failed" : "pending", error: `The picture could not be made: ${shot.error}` })
            .eq("id", t.id);
          failed++;
          continue;
        }
      }

      const r = await publish(acct as SocialAccount, post.caption ?? "", media, post.options ?? {});
      if (r.ok) {
        if (r.status === "simulated") simulated++; else sent++;
        await admin.from("social_targets").update({
          status: "sent",
          external_post_id: r.externalId ?? "",
          permalink: r.permalink ?? "",
          // A simulated send is a success with a reason attached, so the
          // console can say "nothing actually went out, and here is why" —
          // and a send that used the last saved export carries its own honest
          // note beside anything the platform said.
          error: [staleNote, r.error || (r.status === "simulated" ? "Simulated — no app configured." : "")]
            .filter(Boolean).join(" · "),
          sent_at: new Date().toISOString(),
        }).eq("id", t.id);
      } else {
        failed++;
        await admin.from("social_targets")
          .update({ status: t.attempts >= 3 ? "failed" : "pending", error: r.error ?? "It did not go out." })
          .eq("id", t.id);
        // A token the platform has rejected is worth marking, or every later
        // post queues behind an account that will never accept one.
        if (/401|invalid|expired|revoked/i.test(r.error ?? "")) {
          await admin.from("social_accounts")
            .update({ status: "expired", last_error: (r.error ?? "").slice(0, 300) }).eq("id", acct.id);
        }
      }
    }

    // Settle each post that had work in this batch (or a reaped channel).
    for (const postId of touched) {
      const { data: rows } = await admin
        .from("social_targets").select("status").eq("post_id", postId);
      const all = rows ?? [];
      if (all.some((r: Json) => r.status === "pending" || r.status === "sending")) continue;
      const ok = all.filter((r: Json) => r.status === "sent").length;
      const status = ok === 0 ? "failed" : ok === all.length ? "published" : "part";
      await admin.from("social_posts").update({ status }).eq("id", postId);
    }

    const detail =
      `${sent} sent, ${simulated} simulated, ${failed} failed of ${targets.length} claimed` +
      (deferred ? `; ${deferred} deferred until the renderer is reachable` : "") +
      (reaped.length ? `; gave up on channels of ${reaped.length} post(s) after 3 attempts` : "");
    // Every claimed channel failing is a broken tick (a platform down, an app
    // misconfigured), and a broken tick says so in its status code: the VM log
    // sees only that. A tick where everything deferred is broken too — the
    // renderer being down is exactly what the alarm exists for, and the detail
    // names it. A member's single post failing is a 200 with the reason.
    const totalFailure = isCron && targets.length > 0 && sent === 0 && simulated === 0;
    await beat(!totalFailure, detail);
    return json({ ok: !totalFailure, claimed: targets.length, sent, simulated, failed, deferred, reaped: reaped.length }, totalFailure ? 502 : 200);
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    await beat(false, msg);
    return json({ error: msg }, 500);
  }
});

/**
 * Why "Send now" claimed nothing.
 *
 * There are four honest reasons and they need four different responses from
 * the person, so "nothing happened" is the one answer that must not be given.
 * Read after the claim rather than checked before it: checking first would be
 * a second read of state the claim is already racing on, and would sometimes
 * describe a world that changed in between.
 */
async function whyNothing(admin: Json, postId: string): Promise<string> {
  const { data: post } = await admin
    .from("social_posts").select("status, scheduled_at").eq("id", postId).maybeSingle();
  if (!post) return "That post is gone.";
  if (post.status === "published") return "It has already gone out.";
  if (post.status === "cancelled") return "That post was cancelled.";
  // The claim only ever takes queued posts. These two settled otherwise, and
  // Retry is what puts the channels that failed back in the queue.
  if (post.status === "failed") return "It did not go out — press Retry, then Send now.";
  if (post.status === "part") return "Some channels have it and some do not — press Retry to try those again.";

  const { data: rows } = await admin
    .from("social_targets").select("status, attempts, claimed_at").eq("post_id", postId);
  const all = (rows ?? []) as Json[];
  if (all.length === 0) return "It has no channels — edit it and choose where it should go.";

  const busy = all.some((t) => t.status === "sending");
  if (busy) return "It is going out right now — give it a moment.";

  const stuck = all.filter((t) => t.status === "failed" || t.attempts >= 3);
  if (stuck.length && stuck.length === all.filter((t) => t.status !== "sent").length) {
    return "Every channel has already been tried three times — press Retry to reset them.";
  }
  if (all.every((t) => t.status === "sent")) return "Every channel has already had it.";
  return "There was nothing left to send.";
}
