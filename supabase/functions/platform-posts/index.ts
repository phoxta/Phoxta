// Phoxta — platform-posts: blog authoring for the platform console.
// Actions: list | save | delete. Gated by platform_admins membership; every
// write is appended to platform_audit.
//
// Published posts are read by the PUBLIC marketing site straight from the
// `platform_posts` table with the anon key (RLS allows status='published'
// only), so the blog needs no function call on the read path.
//
// The schema bootstraps lazily over SUPABASE_DB_URL the first time an admin
// touches the function (`supabase db push` is not available in this
// environment). The DDL is idempotent and
// also recorded in supabase/migrations/0102_platform_posts.sql.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, userClient } from "../_shared/supabaseAdmin.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// deno-lint-ignore no-explicit-any
type Json = any;

const DDL = `
create table if not exists public.platform_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  category text not null default 'playbooks' check (category in ('playbooks','tear-downs','case-studies')),
  img text not null default '/assets/imgs/pages/img-72.webp',
  hero text not null default '/assets/imgs/pages/img-168.webp',
  author text not null default 'Phoxta',
  read_minutes int not null default 6,
  body jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_posts enable row level security;
-- 'hidden' marks a code-shipped article as taken off the site; the public
-- client must be able to see WHICH slugs are hidden (their content ships in
-- the JS bundle anyway), so hidden rows stay readable.
alter table public.platform_posts drop constraint if exists platform_posts_status_check;
alter table public.platform_posts add constraint platform_posts_status_check
  check (status in ('draft','published','hidden'));
drop policy if exists "public read published posts" on public.platform_posts;
create policy "public read published posts" on public.platform_posts
  for select using (status in ('published','hidden'));
grant select on public.platform_posts to anon, authenticated;
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

/** Verify the JWT and require platform_admins membership. */
async function requirePlatformAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };

  const admin = adminClient();
  const { data: m } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ud.user.id)
    .maybeSingle();
  if (!m) return { error: json({ error: "Only a platform admin can do that." }, 403) };
  return { admin, userId: ud.user.id, email: ud.user.email ?? "" };
}

async function audit(admin: Json, actorEmail: string, action: string, target: string, detail: Json) {
  try {
    await admin.from("platform_audit").insert({ actor_email: actorEmail, action, target, detail });
  } catch (_) { /* audited actions still ran */ }
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

Deno.serve(async (req): Promise<Response> => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const gate = await requirePlatformAdmin(req);
    // Truthiness, not `"error" in gate`: TypeScript gives the success branch an
    // implicit `error?: undefined`, so `in` does not discriminate the union and
    // the handler infers `Response | undefined` — which is how a fall-through
    // would hide here. The explicit Promise<Response> above is the guard.
    if (gate.error) return gate.error;
    const { admin, email: actorEmail } = gate;
    await ensureSchema();

    // --- list: every post, newest first --------------------------------------
    if (body.action === "list") {
      const { data, error } = await admin
        .from("platform_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ posts: data ?? [] });
    }

    // --- save: create or update; publishing stamps published_at once ---------
    if (body.action === "save") {
      const p = (body.post ?? {}) as Json;
      const title = String(p.title ?? "").trim();
      if (!title) return json({ error: "The post needs a title." }, 400);
      const slug = slugify(String(p.slug ?? "") || title);
      if (!slug) return json({ error: "That title makes an empty link — change it." }, 400);
      const status = ["published", "hidden", "draft"].includes(p.status) ? p.status : "draft";

      const row: Json = {
        slug,
        title,
        excerpt: String(p.excerpt ?? ""),
        category: ["playbooks", "tear-downs", "case-studies"].includes(p.category) ? p.category : "playbooks",
        img: String(p.img ?? "") || "/assets/imgs/pages/img-72.webp",
        hero: String(p.hero ?? "") || "/assets/imgs/pages/img-168.webp",
        author: String(p.author ?? "") || "Phoxta",
        read_minutes: Math.max(1, Number(p.read_minutes) || 6),
        body: Array.isArray(p.body) ? p.body : [],
        status,
        updated_at: new Date().toISOString(),
      };

      if (p.id) {
        // Keep the first publish date across later edits.
        const { data: prev } = await admin.from("platform_posts").select("published_at").eq("id", p.id).maybeSingle();
        row.published_at = status === "published" ? (prev?.published_at ?? new Date().toISOString()) : prev?.published_at ?? null;
        const { data, error } = await admin.from("platform_posts").update(row).eq("id", p.id).select().single();
        if (error) return json({ error: error.message }, 400);
        await audit(admin, actorEmail, "post_save", slug, { id: p.id, status });
        return json({ ok: true, post: data });
      }

      // No id but the slug already has a row (e.g. overriding a built-in that
      // was overridden before) — update in place rather than failing on unique.
      const { data: bySlug } = await admin.from("platform_posts").select("id, published_at").eq("slug", slug).maybeSingle();
      if (bySlug) {
        row.published_at = status === "published" ? (bySlug.published_at ?? new Date().toISOString()) : bySlug.published_at ?? null;
        const { data, error } = await admin.from("platform_posts").update(row).eq("id", bySlug.id).select().single();
        if (error) return json({ error: error.message }, 400);
        await audit(admin, actorEmail, "post_save", slug, { id: bySlug.id, status });
        return json({ ok: true, post: data });
      }

      row.published_at = status === "published" ? new Date().toISOString() : null;
      const { data, error } = await admin.from("platform_posts").insert(row).select().single();
      if (error) return json({ error: error.message.includes("duplicate") ? "A post with that link already exists." : error.message }, 400);
      await audit(admin, actorEmail, "post_create", slug, { id: data?.id, status });
      return json({ ok: true, post: data });
    }

    // --- delete --------------------------------------------------------------
    if (body.action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "Which post? Pass its id." }, 400);
      const { error } = await admin.from("platform_posts").delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
      await audit(admin, actorEmail, "post_delete", id, {});
      return json({ ok: true });
    }

    // --- upload: an image into the public blog-media bucket ------------------
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

      try { await admin.storage.createBucket("blog-media", { public: true }); } catch (_) { /* already exists */ }
      const path = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80)}`;
      const { error } = await admin.storage.from("blog-media").upload(path, bytes, { contentType: type });
      if (error) return json({ error: error.message }, 400);
      const { data: pub } = admin.storage.from("blog-media").getPublicUrl(path);
      await audit(admin, actorEmail, "post_image_upload", path, { bytes: bytes.length });
      return json({ ok: true, url: pub.publicUrl });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});
