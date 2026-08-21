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
/** Readable text from a markup body — for previews, search and the agent. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Both halves of a mail body, kept separate.
 *
 * This used to return one string and throw the markup away — text/html was
 * flattened with a tag strip, so every synced email arrived in the console as
 * one grey paragraph with its layout, headings, links and images gone. The HTML
 * is what a mail client renders; the text is what a preview and the agent read.
 */
function extractBody(p: Json): { text: string; html: string } {
  const out = { text: "", html: "" };
  const walk = (n: Json) => {
    if (!n) return;
    if (n.mimeType === "text/plain" && n.body?.data && !out.text) out.text = b64urlDecode(n.body.data);
    if (n.mimeType === "text/html" && n.body?.data && !out.html) out.html = b64urlDecode(n.body.data);
    for (const part of n.parts ?? []) walk(part);
  };
  walk(p);
  if (!out.text && out.html) out.text = htmlToText(out.html);
  return out;
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
    const parsed = extractBody(md.payload);
    const text = parsed.text || md.snippet || "";
    const html = parsed.html;
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
    // html goes in meta so the console renders the real message; body stays the
    // readable text that previews, search and the agent work from.
    await admin.from("conversation_messages").insert({
      organization_id: orgId, conversation_id: convId, role: "customer", channel_type: "email",
      body: text, provider_sid: id,
      meta: { subject, source: "gmail-sync", ...(html ? { html } : {}) },
    });
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
    imported++;
  }
  return { imported };
}

/**
 * Recover the HTML for mail that was imported before it was kept.
 *
 * The old extractBody preferred text/plain and dropped the markup, so every
 * message synced before that fix holds a sender's plain-text alternative — the
 * flattened "Docs ( https://... )" version — and nothing else. No amount of
 * client-side rendering can fix that: the HTML was never stored.
 *
 * It is still in Gmail though, and provider_sid holds the message id, so it can
 * be fetched again and filed into meta.html where the console looks for it.
 * Bounded per call, so a large mailbox is several passes rather than a timeout.
 */
type BackfillResult = {
  filled: number;
  checked: number;
  alreadyHad: number;
  noHtmlInGmail: number;
  fetchFailed: number;
  lastError?: string;
  error?: string;
};

async function backfillOrg(admin: SupabaseClient, orgId: string, limit: number): Promise<BackfillResult> {
  const out: BackfillResult = { filled: 0, checked: 0, alreadyHad: 0, noHtmlInGmail: 0, fetchFailed: 0 };

  const token = await getAccessToken(admin, orgId);
  if (!token) {
    out.error = "google not connected or token expired — reconnect in Settings";
    return out;
  }
  const gf = (p: string) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });

  // Any email message carrying a provider id is a candidate. Filtering on
  // meta->>source = 'gmail-sync' missed everything the Gmail app imported,
  // which writes source 'gmail' — a fetch that 404s costs one call and is
  // counted, which is cheaper than being wrong about who owns a row.
  const { data: rows, error } = await admin
    .from("conversation_messages")
    .select("id, provider_sid, meta")
    .eq("organization_id", orgId)
    .eq("channel_type", "email")
    .not("provider_sid", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    out.error = `read failed: ${error.message}`;
    return out;
  }

  for (const m of ((rows ?? []) as Json[])) {
    out.checked++;
    if (m.meta?.html) { out.alreadyHad++; continue; }

    const res = await gf(`/messages/${m.provider_sid}?format=full`);
    if (!res.ok) {
      // Counted and reported. Swallowing this is what made the first attempt
      // return "0 filled, all good" when the token was the problem.
      out.fetchFailed++;
      out.lastError = `gmail api ${res.status}`;
      continue;
    }
    const md = (await res.json()) as Json;
    const { html } = extractBody(md.payload);
    if (!html) { out.noHtmlInGmail++; continue; }

    const { error: upErr } = await admin
      .from("conversation_messages")
      .update({ meta: { ...(m.meta ?? {}), html } })
      .eq("id", m.id);
    if (upErr) {
      out.lastError = `write failed: ${upErr.message}`;
      continue;
    }
    out.filled++;
  }
  return out;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const admin = adminClient();
    // Parsed up front so the cron path can ask for a backfill too — it is the
    // only caller that can reach every org in one pass.
    const body = (await req.json().catch(() => ({}))) as { organizationId?: string; mode?: string; limit?: number };
    const backfill = body?.mode === "backfill";
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 50), 200));

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
          const r = backfill
            ? await backfillOrg(admin, c.organization_id, limit)
            : await syncOrg(admin, c.organization_id);
          total += backfill ? (r as BackfillResult).filled : (r as SyncResult).imported;
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
        mode: backfill ? "backfill" : "sync",
        orgs: list.map((c) => c.organization_id),
        [backfill ? "filled" : "imported"]: total,
        problems,
      });
    }
    const a = await authorize(req, body?.organizationId);
    if (a.error) return a.error;
    if (backfill) {
      const r = await backfillOrg(a.ok.admin, a.ok.org.id, limit);
      return json({ ok: !r.error, ...r, error: r.error ?? r.lastError ?? null });
    }
    const r = await syncOrg(a.ok.admin, a.ok.org.id);
    return json({ ok: !r.error, imported: r.imported, error: r.error ?? null });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
