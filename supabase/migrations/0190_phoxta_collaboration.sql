-- P S33 and §8: invitations never grant access before acceptance. Ownership
-- transfer is a two-person operation; billing stays with the existing account.
begin;
create table public.opportunity_invitations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references opportunity_workspaces(id) on delete cascade,
 email text not null check(email=lower(trim(email))),
 role text not null check(role in ('admin','editor','researcher','viewer')),
 invited_by uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),
 expires_at timestamptz not null default now()+interval '7 days',
 created_at timestamptz not null default now(), responded_at timestamptz
);
create unique index on opportunity_invitations(workspace_id,email) where status='pending';
create index on opportunity_invitations(email,expires_at) where status='pending';
create table public.opportunity_owner_transfers (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references opportunity_workspaces(id) on delete cascade,
 from_user_id uuid not null references auth.users(id), to_user_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days', responded_at timestamptz,
 check(from_user_id<>to_user_id)
);
create unique index on opportunity_owner_transfers(workspace_id) where status='pending';
alter table opportunity_invitations enable row level security;
alter table opportunity_owner_transfers enable row level security;
revoke all on opportunity_invitations,opportunity_owner_transfers from public,anon,authenticated;

-- Count people once across all workspaces, including pending reservations.
-- This helper is callable only by checked functions and the service role.
create function public.opportunity_reserve_seat(p_org uuid,p_email text) returns void
language plpgsql security definer set search_path=public as $$
declare v_emails text[];
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 select array_agg(distinct email) into v_emails from (
   select lower(u.email) email from opportunity_accounts a join auth.users u on u.id=a.user_id where a.org_id=p_org
   union select lower(u.email) from opportunity_workspaces w join auth.users u on u.id=w.owner_user_id where w.org_id=p_org
   union select lower(u.email) from workspace_members m join opportunity_workspaces w on w.id=m.workspace_id join auth.users u on u.id=m.user_id where w.org_id=p_org
   union select lower(u.email) from organization_memberships m join auth.users u on u.id=m.user_id where m.organization_id=p_org
   union select i.email from opportunity_invitations i join opportunity_workspaces w on w.id=i.workspace_id where w.org_id=p_org and i.status='pending' and i.expires_at>now()
 ) people;
 if not (p_email=any(coalesce(v_emails,'{}'))) then
   perform opportunity_assert_limit(p_org,'seats',coalesce(cardinality(v_emails),0));
 end if;
end; $$;

create function public.opportunity_team_action(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); w opportunity_workspaces; i opportunity_invitations; t opportunity_owner_transfers;
 v_id uuid; v_target uuid; v_role text; v_email text; v_existing text; v_result jsonb:='{}';
begin
 if v_user is null then raise exception 'Sign in to continue.'; end if;
 if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>8000 then raise exception 'Invalid team request.'; end if;
 if p_action in ('accept','decline','revoke') then
   select * into i from opportunity_invitations where id=(p_data->>'id')::uuid;
   select * into w from opportunity_workspaces where id=i.workspace_id;
 elsif p_action in ('accept_transfer','decline_transfer','revoke_transfer') then
   select * into t from opportunity_owner_transfers where id=(p_data->>'id')::uuid;
   select * into w from opportunity_workspaces where id=t.workspace_id;
 else select * into w from opportunity_workspaces where id=(p_data->>'workspace_id')::uuid;
 end if;
 if w.id is null then raise exception 'Team request unavailable.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w.org_id::text,1));
 select * into w from opportunity_workspaces where id=w.id for update;
 v_role:=opportunity_role(w.id);
 select lower(email) into v_email from auth.users where id=v_user and email_confirmed_at is not null;
 case p_action
 when 'invite' then
   if coalesce(v_role,'') not in ('owner','admin') then raise exception 'Only owners and administrators can invite.'; end if;
   v_email:=lower(trim(p_data->>'email'));
   if v_email is null or length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
   if p_data->>'role' not in ('admin','editor','researcher','viewer') or p_data->>'role' is null then raise exception 'Choose a collaborator role.'; end if;
   if p_data->>'role'='admin' and v_role<>'owner' then raise exception 'Only the owner can appoint administrators.'; end if;
   if exists(select 1 from auth.users u where lower(u.email)=v_email and (u.id=w.owner_user_id or exists(select 1 from workspace_members m where m.workspace_id=w.id and m.user_id=u.id))) then raise exception 'This person already has access. Update their role instead.'; end if;
   update opportunity_invitations set status='revoked',responded_at=now() where workspace_id=w.id and email=v_email and status='pending' and expires_at<=now();
   perform opportunity_reserve_seat(w.org_id,v_email);
   insert into opportunity_invitations(workspace_id,email,role,invited_by) values(w.id,v_email,p_data->>'role',v_user)
     on conflict(workspace_id,email) where status='pending' do update set role=excluded.role,invited_by=excluded.invited_by,expires_at=now()+interval '7 days' returning id into v_id;
   insert into opportunity_notifications(user_id,type,title,href)
     select id,'team_invite','An opportunity workspace invitation is waiting.','/app/settings/team' from auth.users where lower(email)=v_email;
   v_result:=jsonb_build_object('id',v_id);
 when 'accept','decline','revoke' then
   select * into i from opportunity_invitations where id=i.id for update;
   if i.status<>'pending' or i.expires_at<=now() then raise exception 'Invitation is no longer pending.'; end if;
   if p_action='revoke' then
     if coalesce(v_role,'') not in ('owner','admin') then raise exception 'Only owners and administrators can revoke invitations.'; end if;
   elsif v_email is null or v_email<>i.email then raise exception 'Sign in with the verified email on this invitation.';
   end if;
   if p_action='accept' then
     -- Recheck the current plan: a downgrade can invalidate an old reservation.
     update opportunity_invitations set status='accepted' where id=i.id;
     perform opportunity_reserve_seat(w.org_id,i.email);
     if i.role='admin' and i.invited_by<>w.owner_user_id then raise exception 'Ask the current owner to renew this administrator invitation.'; end if;
     insert into workspace_members values(w.id,v_user,i.role) on conflict(workspace_id,user_id) do update set role=excluded.role;
   end if;
   update opportunity_invitations set status=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'revoked' end,responded_at=now() where id=i.id;
   v_id:=i.id; v_result:=jsonb_build_object('workspace_id',w.id);
 when 'role','remove' then
   if coalesce(v_role,'') not in ('owner','admin') then raise exception 'Only owners and administrators manage collaborators.'; end if;
   v_target:=nullif(p_data->>'user_id','')::uuid;
   if v_target is null then select id into v_target from auth.users where lower(email)=lower(trim(p_data->>'email')); end if;
   if v_target is null then raise exception 'Collaborator not found.'; end if;
   if v_target=w.owner_user_id then raise exception 'Use the confirmed ownership transfer flow.'; end if;
   select role into v_existing from workspace_members where workspace_id=w.id and user_id=v_target;
   if v_existing is null then raise exception 'This access comes from the organization. Manage it in organization settings.'; end if;
   if v_role<>'owner' and (v_existing='admin' or p_data->>'role'='admin') then raise exception 'Only the owner can manage administrator access.'; end if;
   if p_action='remove' then delete from workspace_members where workspace_id=w.id and user_id=v_target;
   else update workspace_members set role=p_data->>'role' where workspace_id=w.id and user_id=v_target; end if;
   v_id:=v_target;
   update opportunity_owner_transfers set status='revoked',responded_at=now() where workspace_id=w.id and to_user_id=v_target and status='pending';
 when 'transfer' then
   if v_role is distinct from 'owner' then raise exception 'Only the current owner can transfer ownership.'; end if;
   if p_data->>'confirmed' is distinct from 'true' then raise exception 'Confirm ownership transfer.'; end if;
   v_target:=(p_data->>'user_id')::uuid;
   if v_target=w.owner_user_id or not exists(select 1 from workspace_members where workspace_id=w.id and user_id=v_target) then raise exception 'Choose an accepted workspace collaborator.'; end if;
   update opportunity_owner_transfers set status='revoked',responded_at=now() where workspace_id=w.id and status='pending';
   insert into opportunity_owner_transfers(workspace_id,from_user_id,to_user_id) values(w.id,v_user,v_target) returning id into v_id;
   insert into opportunity_notifications(user_id,type,title,href) values(v_target,'ownership_transfer','Review an opportunity ownership transfer.','/app/settings/team');
   v_result:=jsonb_build_object('id',v_id);
 when 'accept_transfer','decline_transfer','revoke_transfer' then
   select * into t from opportunity_owner_transfers where id=t.id for update;
   if t.status<>'pending' or t.expires_at<=now() or t.from_user_id<>w.owner_user_id then raise exception 'Ownership transfer is no longer available.'; end if;
   if p_action='revoke_transfer' then
     if v_user<>w.owner_user_id then raise exception 'Only the owner can cancel this transfer.'; end if;
   elsif v_user<>t.to_user_id or v_email is null then raise exception 'Only the verified recipient can respond.'; end if;
   if p_action='accept_transfer' then
     if p_data->>'confirmed' is distinct from 'true' then raise exception 'Confirm ownership acceptance.'; end if;
     if not exists(select 1 from workspace_members where workspace_id=w.id and user_id=v_user) then raise exception 'Your collaborator access has ended.'; end if;
     update opportunity_workspaces set owner_user_id=v_user,updated_at=now() where id=w.id;
     delete from workspace_members where workspace_id=w.id and user_id=v_user;
     insert into workspace_members values(w.id,t.from_user_id,'admin') on conflict(workspace_id,user_id) do update set role='admin';
   end if;
   update opportunity_owner_transfers set status=case p_action when 'accept_transfer' then 'accepted' when 'decline_transfer' then 'declined' else 'revoked' end,responded_at=now() where id=t.id;
   v_id:=t.id;
 else raise exception 'Unsupported team action.';
 end case;
 insert into opportunity_audit_logs(actor_user_id,org_id,action,entity_id,metadata)
 values(v_user,w.org_id,'team_'||p_action,v_id,jsonb_build_object('workspace_id',w.id));
 return v_result;
end; $$;

create function public.opportunity_team_inbox() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_email text;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 return jsonb_build_object(
   'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'workspace_id',w.id,'title',w.title,'role',i.role,'expires_at',i.expires_at)) from opportunity_invitations i join opportunity_workspaces w on w.id=i.workspace_id where i.email=v_email and i.status='pending' and i.expires_at>now()),'[]'),
   'transfers',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',w.title,'expires_at',t.expires_at)) from opportunity_owner_transfers t join opportunity_workspaces w on w.id=t.workspace_id where t.to_user_id=auth.uid() and v_email is not null and t.status='pending' and t.expires_at>now()),'[]'));
end; $$;

create function public.opportunity_team_pending(p_workspace uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if coalesce(opportunity_role(p_workspace),'') not in ('owner','admin') then raise exception 'Only owners and administrators can view pending access.'; end if;
 return jsonb_build_object('invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',email,'role',role,'expires_at',expires_at)) from opportunity_invitations where workspace_id=p_workspace and status='pending' and expires_at>now()),'[]'),
   'transfers',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'email',u.email,'expires_at',t.expires_at)) from opportunity_owner_transfers t join auth.users u on u.id=t.to_user_id where t.workspace_id=p_workspace and t.status='pending' and t.expires_at>now()),'[]'));
end; $$;

create or replace function public.opportunity_members(p_workspace uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if opportunity_role(p_workspace) is null then raise exception 'Workspace access denied.'; end if;
 return coalesce((select jsonb_agg(to_jsonb(m) order by priority,email) from (
 select distinct on(user_id) user_id,email,role,origin,priority from (
 select w.owner_user_id user_id,u.email,'owner' role,'workspace' origin,0 priority from opportunity_workspaces w join auth.users u on u.id=w.owner_user_id where w.id=p_workspace
 union all select m.user_id,u.email,m.role,'workspace',1 from workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace
 union all select m.user_id,u.email,case when m.role in ('owner','admin') then 'admin' when m.role='viewer' then 'viewer' else 'editor' end,'organization',2 from organization_memberships m join opportunity_workspaces w on w.org_id=m.organization_id join auth.users u on u.id=m.user_id where w.id=p_workspace
 ) people order by user_id,priority
 ) m),'[]');
end; $$;
revoke all on function opportunity_reserve_seat(uuid,text) from public,anon,authenticated;
revoke all on function opportunity_team_action(text,jsonb),opportunity_team_inbox(),opportunity_team_pending(uuid) from public,anon;
grant execute on function opportunity_team_action(text,jsonb),opportunity_team_inbox(),opportunity_team_pending(uuid) to authenticated;
commit;
