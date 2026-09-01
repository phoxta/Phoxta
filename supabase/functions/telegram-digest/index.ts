// Phoxta — telegram-digest: the operator's PROACTIVE tick. Runs on the worker-
// cron five-minute schedule and does two things, both idempotent so a repeated
// tick never double-sends:
//
//   1. Push approval cards. When a queued write is created OUTSIDE a Telegram
//      chat — by the autopilot, a scheduled automation, or the dashboard — the
//      owner isn't there to see it. This carries the decision to them: a
//      tap-to-approve card in Telegram, stamped so it goes once.
//
//   2. Morning brief. Once a day, in the owner's own morning (their org's
//      timezone), the operator writes a short brief and sends it. No 24-hour
//      window, no template, no fee — the whole reason the operator lives on
//      Telegram rather than WhatsApp.
import { json } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import { actionTitle } from "../_shared/actions.ts";
import { isAdminRole } from "../_shared/auth.ts";
import { esc, inlineKeyboard, sendMessage } from "../_shared/telegram.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const BRIEF_HOUR = Math.min(23, Math.max(0, Number(Deno.env.get("TELEGRAM_BRIEF_HOUR") ?? "8")));
const PUSH_PER_TICK = Math.max(1, Number(Deno.env.get("TELEGRAM_PUSH_PER_TICK") ?? "40"));
const BRIEF_PER_TICK = Math.max(1, Number(Deno.env.get("TELEGRAM_BRIEF_PER_TICK") ?? "30"));

const BRIEF =
  "Write a SHORT morning brief for the owner (max ~6 lines): today/overnight orders and revenue, " +
  "anything that needs their attention (unfulfilled orders, waiting customers, unpaid invoices), and " +
  "one suggestion if there's an obvious one. Plain, warm, concrete. No preamble.";

/** The linked Telegram users for an org who may APPROVE (owner/admin). */
async function adminChatsFor(admin: SupabaseClient, orgId: string): Promise<number[]> {
  const { data: links } = await admin.from("telegram_links")
    .select("telegram_user_id, user_id").eq("organization_id", orgId);
  const out: number[] = [];
  for (const l of (links as Json[] ?? [])) {
    const { data: m } = await admin.from("organization_memberships")
      .select("role").eq("organization_id", orgId).eq("user_id", l.user_id).maybeSingle();
    if (isAdminRole(String((m as Json)?.role ?? ""))) out.push(Number(l.telegram_user_id));
  }
  return out;
}

/** Current wall-clock hour in an IANA timezone (0–23). */
function localHour(tz: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz || "UTC" }).format(new Date());
    return Number(h) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

async function operatorBrief(orgId: string, userId: string): Promise<{ reply: string; limitReached: boolean }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-operator`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}`, ...(await internalProofHeaders()) },
    body: JSON.stringify({ organizationId: orgId, internalUserId: userId, message: BRIEF, stream: false }),
  });
  const data = await res.json().catch(() => ({}));
  return { reply: String(data?.reply ?? "").trim(), limitReached: !!data?.limitReached };
}

Deno.serve(async (req) => {
  const gate = requireCron(req);
  if (gate.error) return gate.error;
  const admin = adminClient();
  await admin.rpc("app_telegram_gc").then(() => {}, () => {});

  // ── 1. Push approval cards for actions queued outside a Telegram chat ──
  let pushed = 0;
  const { data: pend } = await admin.from("agent_actions")
    .select("id, tool, args, title, organization_id, source")
    .eq("status", "pending").is("tg_pushed_at", null)
    .order("created_at", { ascending: true }).limit(PUSH_PER_TICK);
  // Group by org so we resolve each org's admin chats once.
  const byOrg = new Map<string, Json[]>();
  for (const p of (pend as Json[] ?? [])) {
    if (!byOrg.has(p.organization_id)) byOrg.set(p.organization_id, []);
    byOrg.get(p.organization_id)!.push(p);
  }
  for (const [orgId, actions] of byOrg) {
    const chats = await adminChatsFor(admin, orgId);
    for (const p of actions) {
      // Stamp first (claim) so a second tick can't re-push even if a send is slow.
      const { data: claimed } = await admin.from("agent_actions")
        .update({ tg_pushed_at: new Date().toISOString() })
        .eq("id", p.id).is("tg_pushed_at", null).select("id").maybeSingle();
      if (!claimed) continue;
      if (!chats.length) continue; // nobody linked — the dashboard queue still has it
      const title = String(p.title ?? actionTitle(String(p.tool), p.args));
      const kb = inlineKeyboard([[{ text: "✓ Approve", data: `ok:${p.id}` }, { text: "✗ Reject", data: `no:${p.id}` }]]);
      const who = p.source === "autopilot" ? "Your autopilot" : p.source === "automation" ? "A scheduled automation" : "The agent";
      for (const chat of chats) {
        await sendMessage(chat, `⏳ <b>Needs your OK</b>\n${esc(who)} wants to:\n${esc(title)}`, { keyboard: kb });
        pushed++;
      }
    }
  }

  // ── 2. Morning brief, in each owner's local morning ──
  let briefed = 0;
  const twentyHoursAgo = new Date(Date.now() - 20 * 3600_000).toISOString();
  const { data: links } = await admin.from("telegram_links")
    .select("telegram_user_id, user_id, organization_id, last_brief_at, organizations(timezone)")
    .or(`last_brief_at.is.null,last_brief_at.lt.${twentyHoursAgo}`)
    .limit(BRIEF_PER_TICK);
  for (const l of (links as Json[] ?? [])) {
    const tz = String((l.organizations as Json)?.timezone ?? "UTC");
    if (localHour(tz) !== BRIEF_HOUR) continue; // not their morning yet
    try {
      const { data: claimed } = await admin.from("telegram_links")
        .update({ last_brief_at: new Date().toISOString() })
        .eq("telegram_user_id", l.telegram_user_id)
        .or(`last_brief_at.is.null,last_brief_at.lt.${twentyHoursAgo}`)
        .select("telegram_user_id").maybeSingle();
      if (!claimed) continue;
      const b = await operatorBrief(l.organization_id, l.user_id);
      if (b.reply) { await sendMessage(l.telegram_user_id, `☀️ <b>Morning brief</b>\n\n${esc(b.reply)}`); briefed++; }
      else if (b.limitReached) { await admin.from("telegram_links").update({ last_brief_at: null }).eq("telegram_user_id", l.telegram_user_id); }
    } catch (e) {
      console.error("[phoxta] telegram-digest brief:", e instanceof Error ? e.message : String(e));
    }
  }

  return json({ pushed, briefed });
});
