-- 0043: Google Workspace connections — per-org OAuth tokens for Gmail/Drive/
-- Docs/Sheets/Calendar. Tokens are written/read by edge functions (service role);
-- members may read status columns only (the client never selects token columns).
create table if not exists google_connections (
  organization_id uuid primary key references organizations(id) on delete cascade,
  email text not null default '',
  scope text not null default '',
  access_token text not null default '',
  refresh_token text not null default '',
  token_expiry timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_google_connections_touch before update on google_connections
  for each row execute function public.app_touch_updated_at();
alter table google_connections enable row level security;
-- Members can see whether the org is connected (and to which account); the
-- client code selects only email/scope/updated_at, never the tokens.
create policy google_connections_select on google_connections for select
  using (public.app_is_org_member(organization_id));
-- No client insert/update/delete — only the service-role edge functions write.
