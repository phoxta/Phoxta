// Phoxta — google-gmail: read & send the connected Workspace mailbox via the
// Gmail API (uses the org's stored OAuth token, auto-refreshed). Member-authed.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { getAccessToken } from "../_shared/google.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

const b64urlDecode = (s: string): string => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(b, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
const b64urlEncode = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const headerMap = (payload: Json): Record<string, string> =>
  Object.fromEntries((payload?.headers ?? []).map((h: Json) => [String(h.name).toLowerCase(), h.value]));
function extractBody(payload: Json): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) return b64urlDecode(payload.body.data);
  for (const p of payload.parts ?? []) {
    const t = extractBody(p);
    if (t) return t;
  }
  if (payload.mimeType === "text/html" && payload.body?.data) return b64urlDecode(payload.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const a = await authorize(req, body?.organizationId);
    if (a.error) return a.error;
    const token = await getAccessToken(a.ok.admin, a.ok.org.id);
    if (!token) return json({ error: "Google Workspace isn't connected for this business." }, 400);
    const gf = (path: string, init?: RequestInit) =>
      fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });

    const action = body?.action ?? "list";

    if (action === "list") {
      const q = body?.q || "in:inbox";
      const r = await gf(`/messages?maxResults=15&q=${encodeURIComponent(q)}`);
      const d = (await r.json()) as Json;
      const ids: string[] = (d.messages ?? []).map((m: Json) => m.id);
      const messages = await Promise.all(ids.map(async (id) => {
        const mr = await gf(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
        const md = (await mr.json()) as Json;
        const h = headerMap(md.payload);
        return { id, threadId: md.threadId, from: h.from ?? "", subject: h.subject ?? "(no subject)", date: h.date ?? "", snippet: md.snippet ?? "", unread: (md.labelIds ?? []).includes("UNREAD") };
      }));
      return json({ messages });
    }

    if (action === "get") {
      const r = await gf(`/messages/${body.id}?format=full`);
      const md = (await r.json()) as Json;
      const h = headerMap(md.payload);
      return json({ id: body.id, threadId: md.threadId, from: h.from ?? "", to: h.to ?? "", subject: h.subject ?? "", date: h.date ?? "", body: extractBody(md.payload) || md.snippet || "" });
    }

    if (action === "send") {
      const to = String(body.to ?? "").trim();
      const subject = String(body.subject ?? "").trim();
      const text = String(body.text ?? "");
      if (!to || !text) return json({ error: "Recipient and message required." }, 400);
      const headers = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=UTF-8"];
      if (body.inReplyTo) headers.push(`In-Reply-To: ${body.inReplyTo}`, `References: ${body.inReplyTo}`);
      const raw = b64urlEncode(`${headers.join("\r\n")}\r\n\r\n${text}`);
      const r = await gf(`/messages/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw, threadId: body.threadId }) });
      const d = (await r.json()) as Json;
      if (d?.id) return json({ ok: true, id: d.id });
      return json({ ok: false, error: d?.error?.message || "Send failed." }, 200);
    }

    if (action === "import") {
      // Pull a Gmail message into the unified Inbox as an email conversation.
      const r = await gf(`/messages/${body.id}?format=full`);
      const md = (await r.json()) as Json;
      const h = headerMap(md.payload);
      const from = h.from ?? "";
      const subject = h.subject ?? "(no subject)";
      const text = extractBody(md.payload) || md.snippet || "";
      const fromEmail = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
      const admin = a.ok.admin;
      const orgId = a.ok.org.id;
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
      const { data: dup } = await admin.from("conversation_messages").select("id").eq("conversation_id", convId).eq("provider_sid", md.id).maybeSingle();
      if (!dup) {
        await admin.from("conversation_messages").insert({ organization_id: orgId, conversation_id: convId, role: "customer", channel_type: "email", body: text, provider_sid: md.id, meta: { subject, source: "gmail" } });
        await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
      }
      return json({ ok: true, conversationId: convId });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
