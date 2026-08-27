// Phoxta — google-gmail: read & send the connected Workspace mailbox via the
// Gmail API (uses the org's stored OAuth token, auto-refreshed). Member-authed.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { getAccessToken, gmailSendMessage } from "../_shared/google.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

const b64urlDecode = (s: string): string => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(b, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
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
      // One implementation of "compose an RFC 822 message and send it as this
      // mailbox" (_shared/google.ts), shared with the agent's reply path. The
      // copy that used to live here folded the References chain down to a single
      // id, sent no MIME-Version, and wrote header values straight from caller
      // input — a newline in a subject would have injected a header.
      try {
        const sent = await gmailSendMessage(token, {
          to,
          subject,
          text,
          threadId: body.threadId ? String(body.threadId) : undefined,
          inReplyTo: body.inReplyTo ? String(body.inReplyTo) : undefined,
          references: body.references ? String(body.references) : undefined,
        });
        return json({ ok: true, id: sent.id, threadId: sent.threadId });
      } catch (e) {
        return json({ ok: false, error: String((e as Error)?.message || e) }, 200);
      }
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
      // `is_test` matters here for the same reason it does in gmail-sync,
      // email-inbound and agentCore.resolveConversation: an owner who has ever
      // exercised the Playground on the email channel with this address has a
      // SANDBOX thread that is the newest open email conversation for it, and an
      // imported message would be filed onto a conversation the console labels as
      // a test — where agent-catchup then marks everything else on the thread
      // "a sandbox conversation", permanently.
      const { data: existing } = await admin.from("conversations").select("id")
        .eq("organization_id", orgId).eq("channel_type", "email").eq("customer_email", fromEmail)
        .eq("is_test", false).neq("status", "closed")
        .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) convId = (existing as Json).id;
      else {
        const { data: conv } = await admin.from("conversations")
          .insert({ organization_id: orgId, channel_type: "email", customer_email: fromEmail, customer_name: from.replace(/<[^>]+>/, "").replace(/"/g, "").trim(), status: "open", summary: subject })
          .select("id").single();
        convId = (conv as Json).id;
      }
      // Scoped by ORGANISATION, not by conversation: one Gmail message belongs
      // to the business once, and the uniqueness index added in 0114 is
      // (organization_id, provider_sid) — a per-conversation check would let a
      // second insert through and the constraint would then reject it.
      const { data: dup } = await admin.from("conversation_messages").select("id").eq("organization_id", orgId).eq("provider_sid", md.id).maybeSingle();
      if (!dup) {
        await admin.from("conversation_messages").insert({
          organization_id: orgId, conversation_id: convId, role: "customer", channel_type: "email",
          body: text, provider_sid: md.id,
          // The threading keys, so a reply to a hand-imported message lands in
          // the same Gmail thread rather than opening a new one.
          meta: {
            subject, source: "gmail",
            gmail_thread_id: String(md.threadId ?? ""),
            message_id: String(h["message-id"] ?? ""),
            references: String(h["references"] ?? ""),
            internal_date: Number(md.internalDate ?? 0),
            imported_by_hand: true,
            // IMPORT IS A READING ACTION, NOT AN ANSWERING ONE.
            //
            // Storing the threading keys and source 'gmail' is exactly the shape
            // agent-catchup looks for, so without this a person browsing Sent,
            // Archive, Spam or a label and pressing Import could cause the agent
            // to mail a reply within five minutes — to a message that may be the
            // business's OWN outbound (the row is written role 'customer'
            // whatever its real direction, and the conversation is keyed on the
            // From header). Nothing in the console warns that Import can send.
            // Settled here, so it never becomes a candidate; a human who wants a
            // reply writes one, or presses reply in the Inbox.
            auto_reply: {
              answered: false,
              reason: "it was imported from Gmail by hand — import files a message, it does not answer it",
              retryable: false,
              at: new Date().toISOString(),
            },
          },
        });
        await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
      }
      return json({ ok: true, conversationId: convId });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
