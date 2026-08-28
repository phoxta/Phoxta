// Phoxta — social-insights: how the posts that went out are doing.
//
// A SEPARATE FUNCTION FROM social-schedule, for the same reason social-caption
// is: this one talks to four external APIs on a metered budget, and a platform
// being slow or down must not make reading the queue slow or broken. The queue
// loads from our own tables and always works; the numbers arrive after, or do
// not arrive, and either way the list is there.
//
// THE BUDGET IS THE DESIGN CONSTRAINT. Instagram allows 200 calls an hour per
// account and publishing spends from the same allowance. So this refreshes at
// most BATCH rows per call, stalest first, and skips anything read within
// FRESH_MINUTES. A console tab left open cannot drain the hour and stop the
// business's posts going out.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { insights, type SocialAccount } from "../_shared/social.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** Read at most this many per call. */
const BATCH = 25;
/** Anything read this recently is left alone. */
const FRESH_MINUTES = 15;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    if (!orgId) return json({ error: "Choose a business first." }, 400);

    const auth = await authorize(req, orgId);
    if (auth.error) return auth.error;

    const admin = adminClient();
    const cutoff = new Date(Date.now() - FRESH_MINUTES * 60_000).toISOString();

    // Sent, has a platform id to ask about, and either never read or stale.
    // Ordered stalest first so a business with more posts than BATCH works
    // through all of them over successive refreshes rather than re-reading the
    // same twenty for ever.
    const { data: rows, error } = await admin
      .from("social_targets")
      .select("id, account_id, platform, external_post_id, permalink, metrics_at")
      .eq("organization_id", orgId)
      .eq("status", "sent")
      .neq("external_post_id", "")
      .or(`metrics_at.is.null,metrics_at.lt.${cutoff}`)
      .order("metrics_at", { ascending: true, nullsFirst: true })
      .limit(BATCH);
    if (error) return json({ error: error.message }, 500);

    const targets = (rows ?? []) as Json[];
    if (targets.length === 0) return json({ ok: true, refreshed: 0, unknown: 0 });

    // One account is usually behind many posts; fetching it once per post would
    // be the same row read twenty times.
    const ids = [...new Set(targets.map((t) => t.account_id))];
    const { data: accts } = await admin
      .from("social_accounts")
      .select("id, platform, external_id, handle, access_token, refresh_token, token_expiry")
      .in("id", ids);
    const byId = new Map((accts ?? []).map((a: Json) => [a.id, a]));

    let refreshed = 0, unknown = 0;
    const now = new Date().toISOString();

    for (const t of targets) {
      const acct = byId.get(t.account_id);
      if (!acct) { unknown++; continue; }

      const got = await insights(acct as SocialAccount, String(t.external_post_id));
      if (!got) {
        // Stamp the attempt even when it told us nothing, or the same
        // unreadable rows are retried on every refresh and the ones behind them
        // are never reached.
        await admin.from("social_targets").update({ metrics_at: now }).eq("id", t.id);
        unknown++;
        continue;
      }

      await admin.from("social_targets").update({
        likes: got.likes,
        comments: got.comments,
        metrics_at: now,
        // Instagram hands back the real permalink here. Anything already
        // stored stays: an empty string from a platform must not erase a link
        // that works.
        ...(got.permalink ? { permalink: got.permalink } : {}),
      }).eq("id", t.id);
      refreshed++;
    }

    return json({ ok: true, refreshed, unknown });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
