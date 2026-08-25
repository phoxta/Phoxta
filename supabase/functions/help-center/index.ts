// Phoxta — help-center: per-tenant public knowledge base (LibreDesk-style).
// Actions: list | save | delete | upload. Gated by ORG MEMBERSHIP (authorize()
// from _shared/auth.ts) — this is a tenant feature, not a platform_admins one.
//
// Published articles are read by the PUBLIC marketing site straight from the
// `help_articles` table with the anon key (RLS allows status='published' only),
// plus the app_help_org() RPC to resolve a business from its public slug — so
// the public read path needs no function call.
//
// The schema bootstraps lazily over SUPABASE_DB_URL the first time a member
// touches the function (`supabase db push` is not available in this
// environment — same approach as platform-posts). The DDL is idempotent and
// also recorded in supabase/migrations/0104_help_center.sql.
//
// On publish, the article's plain text is BEST-EFFORT fed into the org's
// knowledge pipeline (app_knowledge_autosave → knowledge_docs → the autosave
// trigger enqueues it for embed-worker), so the AI agent learns what the help
// center tells customers. Failures there never block the save.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// deno-lint-ignore no-explicit-any
type Json = any;

const DDL = `
create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  slug text not null,
  title text not null,
  excerpt text not null default '',
  category text not null default 'General',
  hero text not null default '',
  body jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists idx_help_articles_org on public.help_articles(organization_id);
alter table public.help_articles enable row level security;
-- The public help center reads published articles with the anon key; drafts
-- are only ever served through this function (service role) to org members.
drop policy if exists "public read published help articles" on public.help_articles;
create policy "public read published help articles" on public.help_articles
  for select using (status = 'published');
grant select on public.help_articles to anon, authenticated;

-- Resolve a business by its public slug (or id) for /help/:org. SECURITY
-- DEFINER because anon cannot read organizations; it returns only public-safe
-- fields, and only for orgs that actually have a published help article.
create or replace function public.app_help_org(p_slug text)
returns table (id uuid, name text, slug text, branding jsonb)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.slug, coalesce(o.branding, '{}'::jsonb)
  from organizations o
  where (o.slug = lower(p_slug) or o.id::text = p_slug)
    and exists (
      select 1 from help_articles h
      where h.organization_id = o.id and h.status = 'published'
    )
  limit 1;
$$;
grant execute on function public.app_help_org(text) to anon, authenticated;
`;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) throw new Error("SUPABASE_DB_URL not available to this function.");
  const sql = postgres(dbUrl, { prepare: false });
  try {
    await sql.unsafe(DDL);
    schemaReady = true;
  } finally {
    await sql.end({ timeout: 3 });
  }
}

/** Every write lands in the tenant's own audit trail, best-effort. */
async function audit(admin: Json, orgId: string, tool: string, args: Json, summary: string) {
  try {
    await admin.from("agent_audit_log").insert({ organization_id: orgId, actor: "owner", tool, args, status: "ok", summary });
  } catch (_) { /* audited actions still ran */ }
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Flatten ArticleBlock[] to plain prose for the knowledge pipeline. */
function blocksToText(blocks: Json[]): string {
  const parts: string[] = [];
  for (const b of blocks ?? []) {
    switch (b?.kind) {
      case "lead": case "p": case "h": parts.push(String(b.text ?? "")); break;
      case "quote": parts.push(`"${String(b.text ?? "")}"${b.cite ? ` — ${b.cite}` : ""}`); break;
      case "list": parts.push(((b.items ?? []) as string[]).map((i) => `- ${i}`).join("\n")); break;
      case "duo": parts.push(`${b.left?.h ?? ""}: ${b.left?.p ?? ""}\n${b.right?.h ?? ""}: ${b.right?.p ?? ""}`); break;
      case "table": {
        const head = ((b.head ?? []) as string[]).join(" | ");
        const rows = ((b.rows ?? []) as string[][]).map((r) => r.join(" | ")).join("\n");
        parts.push(`${head}\n${rows}`);
        break;
      }
      case "figure": if (b.caption) parts.push(String(b.caption)); break;
    }
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

/** BEST-EFFORT: teach the org's AI agent this article (or unlearn it).
 *  app_knowledge_autosave upserts a knowledge_docs row whose trigger enqueues
 *  embedding; it refuses to touch a manual doc with the same key, which is the
 *  behaviour we want. Any failure is swallowed — publishing never blocks. */
async function feedKnowledge(admin: Json, orgId: string, row: Json, published: boolean) {
  const key = `help-article:${row.slug}`;
  try {
    if (published) {
      const content = `${row.title}\n\n${blocksToText(row.body as Json[])}`.trim();
      if (!content) return;
      await admin.rpc("app_knowledge_autosave", {
        p_org: orgId,
        p_key: key,
        p_title: `Help: ${row.title}`,
        p_content: content.slice(0, 20000),
        p_hash: await sha256(content),
      });
    } else {
      // Unpublished/deleted: remove the auto doc so the agent stops quoting it.
      await admin.from("knowledge_docs").delete()
        .eq("organization_id", orgId).eq("source_key", key).eq("origin", "auto");
    }
  } catch (_) { /* knowledge feed is best-effort by design */ }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body.orgId ?? "");
    const gate = await authorize(req, orgId);
    if (gate.error) return gate.error;
    const { admin } = gate.ok;
    await ensureSchema();

    // --- list: every article for this org, newest first (drafts included) ----
    if (body.action === "list") {
      const { data, error } = await admin
        .from("help_articles")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ articles: data ?? [] });
    }

    // --- save: create or update; publishing stamps published_at once ---------
    if (body.action === "save") {
      const a = (body.article ?? {}) as Json;
      const title = String(a.title ?? "").trim();
      if (!title) return json({ error: "The article needs a title." }, 400);
      const slug = slugify(String(a.slug ?? "") || title);
      if (!slug) return json({ error: "That title makes an empty link — change it." }, 400);
      const status = a.status === "published" ? "published" : "draft";

      const row: Json = {
        organization_id: orgId,
        slug,
        title,
        excerpt: String(a.excerpt ?? ""),
        category: String(a.category ?? "").trim() || "General",
        hero: String(a.hero ?? ""),
        body: Array.isArray(a.body) ? a.body : [],
        status,
        updated_at: new Date().toISOString(),
      };

      // Find the row we are updating: by id, or by (org, slug) so re-saving a
      // slug never trips the unique constraint.
      let existing: Json = null;
      if (a.id) {
        const { data } = await admin.from("help_articles").select("id, published_at")
          .eq("id", a.id).eq("organization_id", orgId).maybeSingle();
        existing = data;
        if (!existing) return json({ error: "That article could not be found." }, 404);
      } else {
        const { data } = await admin.from("help_articles").select("id, published_at")
          .eq("organization_id", orgId).eq("slug", slug).maybeSingle();
        existing = data;
      }

      if (existing) {
        // Keep the first publish date across later edits.
        row.published_at = status === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at ?? null;
        const { data, error } = await admin.from("help_articles").update(row).eq("id", existing.id).select().single();
        if (error) return json({ error: error.message }, 400);
        await audit(admin, orgId, "help_center_save", { id: existing.id, slug, status }, `Help article "${title}" saved (${status}).`);
        await feedKnowledge(admin, orgId, data, status === "published");
        return json({ ok: true, article: data });
      }

      row.published_at = status === "published" ? new Date().toISOString() : null;
      const { data, error } = await admin.from("help_articles").insert(row).select().single();
      if (error) return json({ error: error.message.includes("duplicate") ? "An article with that link already exists." : error.message }, 400);
      await audit(admin, orgId, "help_center_create", { id: data?.id, slug, status }, `Help article "${title}" created (${status}).`);
      await feedKnowledge(admin, orgId, data, status === "published");
      return json({ ok: true, article: data });
    }

    // --- delete --------------------------------------------------------------
    if (body.action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "Which article? Pass its id." }, 400);
      const { data: prev } = await admin.from("help_articles").select("id, slug, title")
        .eq("id", id).eq("organization_id", orgId).maybeSingle();
      if (!prev) return json({ error: "That article could not be found." }, 404);
      const { error } = await admin.from("help_articles").delete().eq("id", id).eq("organization_id", orgId);
      if (error) return json({ error: error.message }, 400);
      await audit(admin, orgId, "help_center_delete", { id, slug: prev.slug }, `Help article "${prev.title}" deleted.`);
      await feedKnowledge(admin, orgId, prev, false);
      return json({ ok: true });
    }

    // --- upload: an image into the public help-media bucket ------------------
    if (body.action === "upload") {
      const name = String(body.name ?? "image");
      const type = String(body.type ?? "");
      if (!type.startsWith("image/")) return json({ error: "Only images can be uploaded here." }, 400);
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(String(body.data ?? "")), (c) => c.charCodeAt(0));
      } catch (_) {
        return json({ error: "That file didn't survive the trip — try again." }, 400);
      }
      if (bytes.length === 0) return json({ error: "The file is empty." }, 400);
      if (bytes.length > 8 * 1024 * 1024) return json({ error: "Keep images under 8MB." }, 400);

      try { await admin.storage.createBucket("help-media", { public: true }); } catch (_) { /* already exists */ }
      const path = `${orgId}/${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80)}`;
      const { error } = await admin.storage.from("help-media").upload(path, bytes, { contentType: type });
      if (error) return json({ error: error.message }, 400);
      const { data: pub } = admin.storage.from("help-media").getPublicUrl(path);
      await audit(admin, orgId, "help_center_image_upload", { path, bytes: bytes.length }, "Help-center image uploaded.");
      return json({ ok: true, url: pub.publicUrl });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});
