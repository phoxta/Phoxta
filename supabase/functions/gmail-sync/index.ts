// Phoxta — gmail-sync: pulls recent Gmail inbox messages into the unified Inbox
// as email conversations (deduped by Gmail message id). Two modes:
//   • cron  : POST with header x-cron-secret: $CRON_SECRET → syncs ALL connected orgs
//   • manual: member-authed { organizationId } → syncs that one business
// Deploy with --no-verify-jwt (the cron path has no Supabase JWT).
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { getAccessToken } from "../_shared/google.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

const b64urlDecode = (s: string): string => {
  try { return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))); } catch { return ""; }
};
const headerMap = (p: Json): Record<string, string> => Object.fromEntries((p?.headers ?? []).map((h: Json) => [String(h.name).toLowerCase(), h.value]));
function extractBody(p: Json): string {
  if (!p) return "";
  if (p.mimeType === "text/plain" && p.body?.data) return b64urlDecode(p.body.data);
  for (const part of p.parts ?? []) { const t = extractBody(part); if (t) return t; }
  if (p.mimeType === "text/html" && p.body?.data) return b64urlDecode(p.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}

/** Why a sync produced nothing. "no new mail" and "the connection is dead" both
 *  used to return 0, so a revoked Google token looked exactly like a quiet
 *  inbox: the cron logged HTTP 200 forever and nobody learned email had stopped
 *  arriving. The caller now gets the reason. */
type SyncResult = { imported: number; error?: string };

async function syncOrg(admin: SupabaseClient, orgId: string): Promise<SyncResult> {
  const token = await getAccessToken(admin, orgId);
  if (!token) {
    // Either never connected, or the refresh token was revoked/expired — both
    // need a human to reconnect Google, so both must be visible.
    return { imported: 0, error: "google not connected or token expired — reconnect in Settings" };
  }
  const gf = (p: string) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });
  const r = await gf(`/messages?maxResults=20&q=${encodeURIComponent("in:inbox newer_than:2d")}`);
  if (!r.ok) {
    return { imported: 0, error: `gmail api ${r.status}` };
  }
  const ids: string[] = (((await r.json()) as Json).messages ?? []).map((m: Json) => m.id);
  let imported = 0;
  for (const id of ids) {
    const { data: dup } = await admin.from("conversation_messages").select("id").eq("organization_id", orgId).eq("provider_sid", id).maybeSingle();
    if (dup) continue;
    const md = (await (await gf(`/messages/${id}?format=full`)).json()) as Json;
    const h = headerMap(md.payload);
    const from = h.from ?? "";
    const subject = h.subject ?? "(no subject)";
    const text = extractBody(md.payload) || md.snippet || "";
    const fromEmail = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
    let convId: string;
    const { data: existing } = await admin.from("conversations").select("id")
      .eq("organization_id", orgId).eq("channel_type", "email").eq("customer_email", fromEmail).neq("status", "closed")
      .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) convId = (existing as Json).id;
    else {
      const { data: conv } = await admin.from("conversations")
        .insert({ organization_id: orgId, channel_type: "email", customer_email: fromEmail, customer_name: from.replace(/<[^>]+>/, "").replace(/"/g, "").trim(), status: "open", summary: subject })
        .select("id").single();
      convId = (conv as Json).id;
    }
    await admin.from("conversation_messages").insert({ organization_id: orgId, conversation_id: convId, role: "customer", channel_type: "email", body: text, provider_sid: id, meta: { subject, source: "gmail-sync" } });
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
    imported++;
  }
  return { imported };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const admin = adminClient();
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
      const { data: conns } = await admin.from("google_connections").select("organization_id");
      const list = (conns as Json[] | null) ?? [];
      let total = 0;
      // One broken connection must not stop the others, but it must be reported:
      // swallowing it is what made a dead mailbox indistinguishable from a quiet one.
      const problems: { org: string; error: string }[] = [];
      for (const c of list) {
        try {
          const r = await syncOrg(admin, c.organization_id);
          total += r.imported;
          if (r.error) problems.push({ org: c.organization_id, error: r.error });
        } catch (e) {
          problems.push({ org: c.organization_id, error: String((e as Error)?.message || e) });
        }
      }
      // Which orgs were synced, not just how many: "1 connection" does not tell
      // you WHICH mailbox is wired up, which is the first question when mail is
      // not arriving where you expect.
      return json({
        ok: problems.length === 0,
        orgs: list.map((c) => c.organization_id),
        imported: total,
        problems,
      });
    }
    const body = await req.json().catch(() => ({}));
    const a = await authorize(req, (body as { organizationId?: string })?.organizationId);
    if (a.error) return a.error;
    const r = await syncOrg(a.ok.admin, a.ok.org.id);
    return json({ ok: !r.error, imported: r.imported, error: r.error ?? null });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
