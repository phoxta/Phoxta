// Phoxta — email-studio: compose, save and send email built from blocks.
//
// Actions: list | get | save | delete | fromPost | render | test | send
//
// Gated by platform_admins, like the blog console, because everything here is
// Phoxta's own outbound mail rather than a tenant's.
//
// THE ONE RULE THIS FUNCTION EXISTS TO KEEP: the preview in the console and the
// message in the inbox are produced by the same call to the same renderer, from
// the same stored blocks. Nothing here stores or accepts HTML. A studio that
// saved HTML would fork the design the moment the template changed, and the
// drift only ever shows up in somebody's inbox.
import { preflight, json } from "../_shared/cors.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderBrochure, type Block } from "../../../packages/email/src/render.ts";
import { postToEmail, type PostIn } from "../../../packages/email/src/post.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const env = (k: string) => Deno.env.get(k);
const adminClient = () => createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!);
const userClient = (token: string) =>
  createClient(env("SUPABASE_URL")!, env("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

async function requirePlatformAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };
  const admin = adminClient();
  const { data: m } = await admin
    .from("platform_admins").select("user_id").eq("user_id", ud.user.id).maybeSingle();
  if (!m) return { error: json({ error: "Only a platform admin can do that." }, 403) };
  return { admin, userId: ud.user.id, email: ud.user.email ?? "" };
}

async function audit(admin: Json, actorEmail: string, action: string, target: string, detail: Json) {
  try {
    await admin.from("platform_audit").insert({ actor_email: actorEmail, action, target, detail });
  } catch (_) { /* the action still happened */ }
}

/** One place that turns a stored row into a rendered message. */
function renderRow(row: Json): { html: string; text: string; subject: string } {
  const blocks = (Array.isArray(row.blocks) ? row.blocks : []) as Block[];
  const { html, text } = renderBrochure({
    subject: row.subject || row.name || "Phoxta",
    preheader: row.preheader || "",
    strap: row.strap || "Phoxta",
    blocks,
    footnote: row.footnote || undefined,
  });
  return { html, text, subject: row.subject || row.name || "Phoxta" };
}

async function sendOne(
  admin: Json, to: string, subject: string, html: string, text: string,
  kind: string, templateId: string | null, opts: { skipLedger?: boolean } = {},
) {
  const key = env("RESEND_API_KEY");
  const from = env("RESEND_FROM");
  if (!key || !from) return { ok: false, error: "Email is not configured." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to, subject, html, text,
      reply_to: env("RESEND_REPLY_TO") || "hello@phoxta.com",
    }),
  });
  const detail = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: detail };
  const id = (detail as { id?: string })?.id ?? "";
  // A test to yourself is not a send and must not burn the recipient's one
  // copy of the campaign.
  if (!opts.skipLedger) {
    await admin.from("platform_email_sends")
      .insert({ email: to, resend_id: id, kind, subject, template_id: templateId });
  }
  return { ok: true, id };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const action = String(body?.action ?? "");

    const who = await requirePlatformAdmin(req);
    if ("error" in who) return who.error;
    const { admin, userId, email: actor } = who;

    switch (action) {
      case "list": {
        const { data, error } = await admin
          .from("email_templates")
          .select("id,name,kind,subject,preheader,status,source_slug,updated_at")
          .order("updated_at", { ascending: false })
          .limit(200);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, templates: data ?? [] });
      }

      case "get": {
        const { data, error } = await admin
          .from("email_templates").select("*").eq("id", body.id).maybeSingle();
        if (error || !data) return json({ error: "That email is not there." }, 404);
        return json({ ok: true, template: data });
      }

      case "save": {
        const row = {
          name: String(body.name ?? "Untitled email").slice(0, 160),
          kind: ["campaign", "post", "brochure"].includes(body.kind) ? body.kind : "campaign",
          subject: String(body.subject ?? "").slice(0, 240),
          preheader: String(body.preheader ?? "").slice(0, 400),
          strap: String(body.strap ?? "").slice(0, 80),
          footnote: String(body.footnote ?? "").slice(0, 500),
          blocks: Array.isArray(body.blocks) ? body.blocks : [],
          source_slug: body.sourceSlug ?? null,
          updated_at: new Date().toISOString(),
        };
        const q = body.id
          ? admin.from("email_templates").update(row).eq("id", body.id).select("id").single()
          : admin.from("email_templates").insert({ ...row, created_by: userId }).select("id").single();
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        await audit(admin, actor, body.id ? "email.update" : "email.create", data.id, { name: row.name });
        return json({ ok: true, id: data.id });
      }

      case "delete": {
        const { error } = await admin.from("email_templates").delete().eq("id", body.id);
        if (error) return json({ error: error.message }, 500);
        await audit(admin, actor, "email.delete", String(body.id), {});
        return json({ ok: true });
      }

      // Pull a published blog post in as an editable email. The blocks land in
      // the studio, so the sender can cut a section or add a note at the top
      // before it goes — which is the difference between a newsletter and an
      // RSS relay.
      case "fromPost": {
        const { data, error } = await admin
          .from("platform_posts").select("*").eq("slug", body.slug).maybeSingle();
        if (error || !data) return json({ error: "That post is not there." }, 404);
        const post: PostIn = {
          slug: data.slug, title: data.title, excerpt: data.excerpt,
          category: data.category, hero: data.hero, author: data.author,
          date: new Date(data.published_at ?? data.created_at)
            .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          readMinutes: data.read_minutes,
          body: Array.isArray(data.body) ? data.body : [],
        };
        const t = postToEmail(post);
        return json({ ok: true, template: {
          name: t.name, subject: t.subject, preheader: t.preheader, strap: t.strap,
          footnote: t.footnote, blocks: t.blocks, kind: "post", source_slug: t.sourceSlug,
        } });
      }

      case "render": {
        const { html, text } = renderRow(body);
        return json({ ok: true, html, text });
      }

      case "test": {
        const to = String(body.to ?? "").trim().toLowerCase();
        if (!to.includes("@")) return json({ error: "A recipient is required." }, 400);
        const { html, text, subject } = renderRow(body);
        const r = await sendOne(admin, to, "[test] " + subject, html, text, "test", body.id ?? null, { skipLedger: true });
        return json(r, 200);
      }

      case "send": {
        const to = String(body.to ?? "").trim().toLowerCase();
        if (!to.includes("@")) return json({ error: "A recipient is required." }, 400);
        const kind = String(body.kind ?? "campaign");

        const { data: gone, error: goneErr } = await admin
          .from("platform_optouts").select("email").eq("email", to).limit(1);
        // A suppression check that fails open is not a suppression check.
        if (goneErr) return json({ error: "Could not check the opt-out list." }, 500);
        if (gone && gone.length) return json({ ok: false, skipped: "opted out" }, 200);

        // A GUARD AGAINST A DOUBLE-CLICK, NOT AGAINST EVER SENDING AGAIN.
        //
        // This used to refuse any (address, kind, subject) that appeared in the
        // ledger at all, with no time bound — so the first send of a design
        // permanently barred every later one, and the only way back was a
        // `force` flag no screen ever set. Re-sending is an ordinary thing to
        // want: you fix a typo, the recipient asks for it again, you are testing
        // against your own address.
        //
        // What is actually worth preventing is the same mail going twice from
        // one intent — a double-clicked button, a retried request. That happens
        // within seconds, so the window is minutes and the ledger keeps its full
        // history for everything else. Past the window there is no prompt at all.
        const windowMs = Number(Deno.env.get("EMAIL_RESEND_WINDOW_MS")) || 2 * 60_000;
        const since = new Date(Date.now() - windowMs).toISOString();
        const { data: already } = await admin
          .from("platform_email_sends").select("sent_at")
          .eq("email", to).eq("kind", kind).eq("subject", String(body.subject ?? ""))
          .gte("sent_at", since)
          .order("sent_at", { ascending: false }).limit(1);
        if (!body.force && already && already.length) {
          // `resendable` tells the screen this is a question, not a refusal:
          // it asks, and sends with force if the answer is yes. Contrast the
          // opt-out check above, which is a hard no and carries no such flag.
          return json({
            ok: false,
            skipped: "already sent",
            at: already[0].sent_at,
            resendable: true,
          }, 200);
        }

        const { html, text, subject } = renderRow(body);
        const r = await sendOne(admin, to, subject, html, text, kind, body.id ?? null);
        if (r.ok && body.id) {
          await admin.from("email_templates").update({ status: "sent" }).eq("id", body.id);
        }
        await audit(admin, actor, "email.send", to, { subject, kind });
        return json(r, 200);
      }
    }
    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});

