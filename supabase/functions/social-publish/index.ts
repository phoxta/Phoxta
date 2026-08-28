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
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { publish, type SocialAccount } from "../_shared/social.ts";
import { refreshInstagram } from "../_shared/socialOauth.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const env = (k: string) => Deno.env.get(k) ?? "";
const BATCH = 10;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // The cron leg carries no JWT that means anything; the shared secret is the
  // whole gate. Compared before any work so an unauthenticated caller cannot
  // even measure the queue.
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "Not authorised." }, 401);
  }

  const admin = adminClient();
  try {
    const { data: claimed, error } = await admin.rpc("app_claim_social_targets", { p_limit: BATCH });
    if (error) return json({ error: error.message }, 500);
    const targets = (claimed ?? []) as Json[];
    if (targets.length === 0) return json({ ok: true, claimed: 0 });

    const touched = new Set<string>();
    let sent = 0, failed = 0, simulated = 0;

    for (const t of targets) {
      touched.add(t.post_id);

      const { data: post } = await admin
        .from("social_posts").select("caption, media_url").eq("id", t.post_id).maybeSingle();
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

      const r = await publish(acct as SocialAccount, post.caption ?? "", post.media_url ?? "");
      if (r.ok) {
        if (r.status === "simulated") simulated++; else sent++;
        await admin.from("social_targets").update({
          status: "sent",
          external_post_id: r.externalId ?? "",
          permalink: r.permalink ?? "",
          // A simulated send is a success with a reason attached, so the
          // console can say "nothing actually went out, and here is why".
          error: r.status === "simulated" ? (r.error ?? "Simulated — no app configured.") : "",
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

    // Settle each post that had work in this batch.
    for (const postId of touched) {
      const { data: rows } = await admin
        .from("social_targets").select("status").eq("post_id", postId);
      const all = rows ?? [];
      if (all.some((r: Json) => r.status === "pending" || r.status === "sending")) continue;
      const ok = all.filter((r: Json) => r.status === "sent").length;
      const status = ok === 0 ? "failed" : ok === all.length ? "published" : "part";
      await admin.from("social_posts").update({ status }).eq("id", postId);
    }

    return json({ ok: true, claimed: targets.length, sent, simulated, failed });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
