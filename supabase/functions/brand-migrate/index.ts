// Phoxta — brand-migrate: one-off, idempotent schema change for per-tenant branding.
// Adds organizations.branding (jsonb) and extends app_resolve_domain to return it,
// so anon storefronts can theme themselves from the resolved tenant. Runs the DDL
// over SUPABASE_DB_URL (auto-injected into edge functions) because `supabase db push`
// isn't available in this environment. Guarded by x-cron-secret. Safe to re-run.
// Deploy with --no-verify-jwt; delete after a successful run.
import { json, preflight } from "../_shared/cors.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const DDL = `
alter table organizations add column if not exists branding jsonb not null default '{}'::jsonb;

drop function if exists public.app_resolve_domain(text);
create function public.app_resolve_domain(p_host text)
returns table (organization_id uuid, slug text, app_path text, site_url text, name text, branding jsonb)
language sql stable security definer set search_path = public as $fn$
  select o.id, o.slug, o.app_path, o.site_url, o.name, coalesce(o.branding, '{}'::jsonb)
  from domains d
  join organizations o on o.id = d.organization_id
  where lower(d.hostname) = lower(p_host)
    and d.status = 'live'
  limit 1;
$fn$;
grant execute on function public.app_resolve_domain(text) to anon, authenticated;
`;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Forbidden." }, 403);

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return json({ error: "SUPABASE_DB_URL not available to this function." }, 500);

  const sql = postgres(dbUrl, { prepare: false });
  try {
    await sql.unsafe(DDL);
    const [col] = await sql`select 1 from information_schema.columns where table_name = 'organizations' and column_name = 'branding'`;
    return json({ ok: true, branding_column: !!col });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  } finally {
    await sql.end();
  }
});
