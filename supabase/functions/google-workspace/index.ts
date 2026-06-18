// Phoxta — google-workspace: key-free Workspace operations using the connected
// admin's OAuth token. Provisions the essential business email addresses as
// Google Groups (that forward to the admin and accept external mail), and lists
// Drive files + upcoming Calendar events. Member-authed.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { getAccessToken } from "../_shared/google.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const ESSENTIAL = ["hello", "info", "support", "sales", "billing", "contact"];

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const a = await authorize(req, body?.organizationId);
    if (a.error) return a.error;
    const token = await getAccessToken(a.ok.admin, a.ok.org.id);
    if (!token) return json({ error: "Google Workspace isn't connected for this business." }, 400);
    const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const action = body?.action ?? "list_emails";

    // connected admin's email + domain
    const { data: conn } = await a.ok.admin.from("google_connections").select("email").eq("organization_id", a.ok.org.id).maybeSingle();
    const adminEmail = (conn as Json)?.email ?? "";
    const domain = adminEmail.split("@")[1] ?? "";

    if (action === "list_emails") {
      if (!domain) return json({ groups: [] });
      const r = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups?domain=${encodeURIComponent(domain)}`, { headers: H });
      const d = (await r.json()) as Json;
      if (d?.error) return json({ error: d.error?.message ?? "Couldn't list groups (need admin rights)." }, 200);
      return json({ groups: (d.groups ?? []).map((g: Json) => ({ email: g.email, name: g.name, members: g.directMembersCount })) });
    }

    if (action === "provision_emails") {
      if (!domain) return json({ error: "Couldn't determine your domain." }, 400);
      const forwardTo = String(body?.forwardTo || adminEmail);
      const locals: string[] = Array.isArray(body?.addresses) && body.addresses.length ? body.addresses : ESSENTIAL;
      const results: Json[] = [];
      for (const local of locals) {
        const email = `${local}@${domain}`;
        const status: Json = { email, created: false, forwarded: false, note: "" };
        // 1) create the group (200 ok, 409 already exists)
        const gr = await fetch("https://admin.googleapis.com/admin/directory/v1/groups", { method: "POST", headers: H, body: JSON.stringify({ email, name: `${local} (${a.ok.org.name})` }) });
        if (gr.ok) status.created = true;
        else if (gr.status === 409) status.note = "already exists";
        else { status.note = ((await gr.json()) as Json)?.error?.message ?? `error ${gr.status}`; results.push(status); continue; }
        // 2) add the forward-to address as a member
        const mr = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(email)}/members`, { method: "POST", headers: H, body: JSON.stringify({ email: forwardTo, role: "MEMBER" }) });
        status.forwarded = mr.ok || mr.status === 409;
        // 3) allow external senders to post (so customers can email it)
        await fetch(`https://www.googleapis.com/groups/v1/groups/${encodeURIComponent(email)}`, { method: "PUT", headers: H, body: JSON.stringify({ whoCanPostMessage: "ANYONE_CAN_POST", messageModerationLevel: "MODERATE_NONE", whoCanJoin: "INVITED_CAN_JOIN" }) }).catch(() => {});
        results.push(status);
      }
      return json({ ok: true, forwardTo, results });
    }

    if (action === "drive_list") {
      const parts = ["trashed = false"];
      if (body?.q) parts.push(`name contains '${String(body.q).replace(/'/g, "")}'`);
      if (body?.mime) parts.push(`mimeType = '${String(body.mime).replace(/'/g, "")}'`);
      const q = parts.join(" and ");
      const r = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=25&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)&q=${encodeURIComponent(q)}`, { headers: H });
      const d = (await r.json()) as Json;
      if (d?.error) return json({ error: d.error?.message ?? "Drive error." }, 200);
      return json({ files: d.files ?? [] });
    }

    if (action === "calendar_list") {
      const now = new Date().toISOString();
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=15&singleEvents=true&orderBy=startTime`, { headers: H });
      const d = (await r.json()) as Json;
      if (d?.error) return json({ error: d.error?.message ?? "Calendar error." }, 200);
      const events = (d.items ?? []).map((e: Json) => ({ id: e.id, summary: e.summary ?? "(no title)", start: e.start?.dateTime ?? e.start?.date ?? "", end: e.end?.dateTime ?? e.end?.date ?? "", link: e.htmlLink, location: e.location ?? "" }));
      return json({ events });
    }

    if (action === "calendar_create") {
      const ev: Json = { summary: body.summary || "(no title)", description: body.description || "", location: body.location || "", start: { dateTime: body.start }, end: { dateTime: body.end || body.start } };
      if (Array.isArray(body.attendees) && body.attendees.length) ev.attendees = body.attendees.map((e: string) => ({ email: e }));
      const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: H, body: JSON.stringify(ev) });
      const d = (await r.json()) as Json;
      if (d?.id) return json({ ok: true, id: d.id, link: d.htmlLink });
      return json({ ok: false, error: d?.error?.message ?? "Couldn't create the event." }, 200);
    }

    if (action === "docs_create") {
      const cr = await fetch("https://docs.googleapis.com/v1/documents", { method: "POST", headers: H, body: JSON.stringify({ title: body.title || "Untitled" }) });
      const doc = (await cr.json()) as Json;
      if (!doc?.documentId) return json({ ok: false, error: doc?.error?.message ?? "Couldn't create the doc." }, 200);
      if (body.text) {
        await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, { method: "POST", headers: H, body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: String(body.text) } }] }) }).catch(() => {});
      }
      return json({ ok: true, id: doc.documentId, link: `https://docs.google.com/document/d/${doc.documentId}/edit` });
    }

    if (action === "sheets_read") {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${body.spreadsheetId}/values/${encodeURIComponent(body.range || "A1:Z100")}`, { headers: H });
      const d = (await r.json()) as Json;
      if (d?.error) return json({ error: d.error.message }, 200);
      return json({ values: d.values ?? [] });
    }

    if (action === "sheets_append") {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${body.spreadsheetId}/values/${encodeURIComponent(body.range || "A1")}:append?valueInputOption=USER_ENTERED`, { method: "POST", headers: H, body: JSON.stringify({ values: body.rows ?? [] }) });
      const d = (await r.json()) as Json;
      if (d?.error) return json({ ok: false, error: d.error.message }, 200);
      return json({ ok: true, updated: d.updates?.updatedRows ?? 0 });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
