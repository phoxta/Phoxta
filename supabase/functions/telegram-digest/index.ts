// Phoxta — telegram-digest: the operator texts the owner FIRST.
//
// The single biggest thing Telegram unlocks over WhatsApp: no 24-hour window,
// no template approval, no per-message fee — so a proactive morning brief just
// sends. This runs on the schedule (worker-cron), walks the linked owners, has
// the operator produce a short brief for each, and delivers it. Bounded per tick
// and idempotent by the brief-stamp so a double tick doesn't double-send.
import { json } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import { esc, sendMessage } from "../_shared/telegram.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const PER_TICK = Math.max(1, Number(Deno.env.get("TELEGRAM_DIGEST_PER_TICK") ?? "40"));

const BRIEF =
  "Write a SHORT morning brief for the owner (max ~6 lines): today/overnight orders and revenue, " +
  "anything that needs their attention (unfulfilled orders, waiting customers, unpaid invoices), and " +
  "one suggestion if there's an obvious one. Plain, warm, concrete. No preamble.";

Deno.serve(async (req) => {
  const gate = requireCron(req);
  if (gate.error) return gate.error;
  const admin = adminClient();

  // Housekeeping rides along so it needs no schedule of its own.
  await admin.rpc("app_telegram_gc").then(() => {}, () => {});

  // Owners who haven't already had a brief today (stamp on the link row).
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const { data: links } = await admin.from("telegram_links")
    .select("telegram_user_id, user_id, organization_id, last_brief_at")
    .or(`last_brief_at.is.null,last_brief_at.lt.${startOfDay.toISOString()}`)
    .limit(PER_TICK);

  let sent = 0;
  for (const l of (links as Json[] ?? [])) {
    try {
      // Claim the send first (idempotent): stamp before doing the work so a
      // second tick that overlaps skips this owner.
      const { data: claimed } = await admin.from("telegram_links")
        .update({ last_brief_at: new Date().toISOString() })
        .eq("telegram_user_id", l.telegram_user_id)
        .or(`last_brief_at.is.null,last_brief_at.lt.${startOfDay.toISOString()}`)
        .select("telegram_user_id").maybeSingle();
      if (!claimed) continue;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-operator`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}`, ...(await internalProofHeaders()) },
        body: JSON.stringify({ organizationId: l.organization_id, internalUserId: l.user_id, message: BRIEF, stream: false }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = String(data?.reply ?? "").trim();
      if (res.ok && reply) {
        await sendMessage(l.telegram_user_id, `☀️ <b>Morning brief</b>\n\n${esc(reply)}`);
        sent++;
      } else if (data?.limitReached) {
        // Over the plan cap — don't burn the day's brief on a courtesy line.
        await admin.from("telegram_links").update({ last_brief_at: null }).eq("telegram_user_id", l.telegram_user_id);
      }
    } catch (e) {
      console.error("[phoxta] telegram-digest:", e instanceof Error ? e.message : String(e));
    }
  }
  return json({ sent, considered: (links as Json[] ?? []).length });
});
