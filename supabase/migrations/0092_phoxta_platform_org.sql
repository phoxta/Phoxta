-- Phoxta — 0092: Phoxta becomes a business you can open in the console.
--
-- The ask: manage the platform the same way a blueprint business is managed.
-- The console already does all of that — Inbox, CRM, Commerce, Marketing,
-- Invoicing, AI Agent, Settings — but only for an organization. Phoxta was not
-- one, so none of it applied to the platform's own operations: no inbox for
-- prospects, no CRM of customers, no agent config for the website assistant.
--
-- The platform agent key already belongs to an org (agent_config carries it).
-- Rather than creating a second Phoxta and splitting its data, that org is
-- promoted in place: named Phoxta, slugged, tagged vertical 'platform', and the
-- owner added as a member so the console authorizes.
--
-- Diagnostics are raised as NOTICEs so a push shows what actually happened
-- rather than claiming success blindly.

do $$
declare
  v_owner   uuid;
  v_org     uuid;
  v_admins  int;
  v_owners  int;
begin
  select id into v_owner from auth.users where lower(email) = 'femi@phoxta.com';
  select count(*) into v_admins from platform_admins;
  select count(*) into v_owners from platform_admins where note = 'platform owner';
  raise notice '[phoxta] platform_admins rows=% ownerRow=% ownerUserFound=%',
    v_admins, v_owners, (v_owner is not null);

  -- The org that owns the website/phone agent key.
  select organization_id into v_org
  from agent_config
  where public_key = '0aac33659f43ff9c3108fe2133b0be2d'
  limit 1;

  if v_org is null then
    raise notice '[phoxta] no org owns the platform agent key — nothing promoted';
    return;
  end if;

  update organizations
  set name     = 'Phoxta',
      slug     = coalesce(nullif(slug, ''), 'phoxta'),
      vertical = 'platform',
      stage    = 'active'
  where id = v_org;

  raise notice '[phoxta] promoted org % to the platform business', v_org;

  -- The console authorizes on organization_memberships, not ownership, so the
  -- owner needs a membership row even if they created the org.
  if v_owner is not null then
    insert into organization_memberships (organization_id, user_id, role)
    values (v_org, v_owner, 'owner')
    on conflict do nothing;
    raise notice '[phoxta] owner membership ensured';
  end if;
end $$;
