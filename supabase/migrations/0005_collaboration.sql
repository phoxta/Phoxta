-- Phoxta platform — 0005 collaboration: team invitations & notifications
-- Multi-user businesses (invite teammates) + an in-app notification feed that
-- turns platform events (connection requests, accepted invites) into alerts.

-- ---------------------------------------------------------------------------
-- Helper: is the current user an owner/admin of the org? (manage invites)
-- ---------------------------------------------------------------------------
create or replace function public.app_is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;
grant execute on function public.app_is_org_admin(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- organization_invitations: invite a teammate by email to a business
-- ---------------------------------------------------------------------------
create table if not exists organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('admin','staff','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
-- At most one open invite per email per business.
create unique index if not exists idx_org_invites_unique_pending
  on organization_invitations (organization_id, lower(email))
  where status = 'pending';
create index if not exists idx_org_invites_email on organization_invitations (lower(email));

alter table organization_invitations enable row level security;

-- Members see their org's invites; an invited person sees invites to their email.
create policy org_invites_select on organization_invitations
  for select using (
    public.app_is_org_member(organization_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
-- Only owners/admins create invites (and must record themselves as the inviter).
create policy org_invites_insert on organization_invitations
  for insert with check (public.app_is_org_admin(organization_id) and invited_by = auth.uid());
-- Owners/admins can revoke (update status); acceptance goes through the function.
create policy org_invites_update on organization_invitations
  for update using (public.app_is_org_admin(organization_id))
  with check (public.app_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- notifications: per-user in-app feed (system-generated)
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('info','invite','billing','network','ai')),
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

alter table notifications enable row level security;

-- Users see and dismiss (mark read) only their own notifications.
create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Accept an invitation: definer fn so the invitee can join (RLS otherwise only
-- lets the owner add memberships). Validates the invite is for the caller's
-- email, adds the membership, marks accepted, and pings the inviter.
-- ---------------------------------------------------------------------------
create or replace function public.app_accept_invitation(p_invitation uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_org uuid;
  v_role text;
  v_inviter uuid;
begin
  select organization_id, role, invited_by
    into v_org, v_role, v_inviter
  from organization_invitations
  where id = p_invitation and status = 'pending' and lower(email) = v_email;

  if v_org is null then
    return null;  -- not found / not for this user / already handled
  end if;

  insert into organization_memberships (organization_id, user_id, role)
  values (v_org, auth.uid(), v_role)
  on conflict (organization_id, user_id) do nothing;

  update organization_invitations set status = 'accepted' where id = p_invitation;

  if v_inviter is not null then
    insert into notifications (user_id, title, body, kind, link)
    values (v_inviter, 'Invitation accepted', 'A teammate accepted your invitation.', 'invite', '/dashboard/businesses');
  end if;

  return v_org;
end;
$$;
grant execute on function public.app_accept_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Turn network events (table `matches`, from 0003) into notifications.
-- ---------------------------------------------------------------------------
create or replace function public.app_on_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into notifications (user_id, title, body, kind, link)
    values (new.target_user_id, 'New connection request',
            coalesce(nullif(new.message, ''), 'Someone wants to connect with you.'),
            'network', '/dashboard/network');
  elsif (tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted') then
    insert into notifications (user_id, title, body, kind, link)
    values (new.requester_user_id, 'Connection accepted',
            'Your connection request was accepted.', 'network', '/dashboard/network');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_match_notify on matches;
create trigger trg_match_notify
  after insert or update on matches
  for each row execute function public.app_on_match_change();
