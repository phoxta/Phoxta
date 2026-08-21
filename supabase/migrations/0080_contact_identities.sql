-- Phoxta — 0080: one customer, many handles.
--
-- Today a contact IS its email and phone (crm_contacts.email / .phone), and
-- agentCore resolves a caller by matching one then the other. That works while
-- every channel carries an email address or a phone number — web, email, SMS,
-- WhatsApp and voice all do.
--
-- Social DMs do not. An Instagram or Messenger sender is an opaque scoped id
-- with no email and no phone, so adding those channels on top of the current
-- model would mint a brand-new orphan contact per sender and quietly destroy
-- the cross-channel continuity that is currently the system's best feature
-- (agentCore feeds prior conversation summaries from other channels into the
-- agent, keyed on contact_id).
--
-- So: identities become rows, not columns. crm_contacts stays the person;
-- contact_identities are the handles that resolve to them. Existing email/phone
-- columns are left untouched and backfilled here, so nothing that reads them
-- has to change today.

create table if not exists contact_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  -- Channel family the handle belongs to. Deliberately text + check rather than
  -- an enum: adding a channel should be a migration, not a type rewrite.
  kind text not null check (kind in (
    'email','phone','whatsapp','instagram','messenger','telegram','rcs','apple','web'
  )),
  -- The handle itself, normalised by the caller (E.164 for phone, lowercased
  -- for email, the platform-scoped id for social).
  value text not null,
  -- Whether we know the handle really belongs to this person. A phone number
  -- that called us is verified; one typed into a form is not.
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  -- A handle points at exactly one person per business. This is what makes
  -- resolution deterministic, and what makes a merge detectable rather than
  -- silently creating a duplicate.
  unique (organization_id, kind, value)
);

create index if not exists idx_contact_identities_contact on contact_identities(contact_id);
create index if not exists idx_contact_identities_lookup on contact_identities(organization_id, kind, value);

alter table contact_identities enable row level security;
drop policy if exists contact_identities_all on contact_identities;
create policy contact_identities_all on contact_identities for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- Backfill from the columns that are the identity today. Idempotent: the unique
-- constraint makes a re-run a no-op rather than a duplicate.
insert into contact_identities (organization_id, contact_id, kind, value, verified)
select c.organization_id, c.id, 'email', lower(trim(c.email)), true
from crm_contacts c
where coalesce(trim(c.email), '') <> ''
on conflict (organization_id, kind, value) do nothing;

insert into contact_identities (organization_id, contact_id, kind, value, verified)
select c.organization_id, c.id, 'phone', trim(c.phone), true
from crm_contacts c
where coalesce(trim(c.phone), '') <> ''
on conflict (organization_id, kind, value) do nothing;

-- Resolve a handle to a contact, creating the person only when the handle is
-- genuinely new. security definer because inbound webhooks (Meta, Twilio) run
-- without a user session; every path is still scoped to p_org.
create or replace function public.app_resolve_contact(
  p_org uuid,
  p_kind text,
  p_value text,
  p_name text default '',
  p_verified boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact uuid;
  v_value text := trim(coalesce(p_value, ''));
begin
  if v_value = '' then
    return null;
  end if;
  if p_kind = 'email' then
    v_value := lower(v_value);
  end if;

  select contact_id into v_contact
  from contact_identities
  where organization_id = p_org and kind = p_kind and value = v_value;

  if v_contact is not null then
    -- An unverified handle that later arrives verified (they called from the
    -- number they typed) gets upgraded rather than duplicated.
    if p_verified then
      update contact_identities set verified = true
      where organization_id = p_org and kind = p_kind and value = v_value and verified = false;
    end if;
    return v_contact;
  end if;

  -- Fall back to the legacy columns so contacts created before this migration,
  -- or by code paths still writing only email/phone, are found rather than
  -- duplicated.
  if p_kind = 'email' then
    select id into v_contact from crm_contacts
    where organization_id = p_org and lower(trim(email)) = v_value limit 1;
  elsif p_kind in ('phone', 'whatsapp') then
    select id into v_contact from crm_contacts
    where organization_id = p_org and trim(phone) = v_value limit 1;
  end if;

  if v_contact is null then
    -- name is NOT NULL with no default, and the rest of the codebase writes ''
    -- for an unknown customer rather than a placeholder — match that.
    insert into crm_contacts (organization_id, name, email, phone)
    values (
      p_org,
      trim(coalesce(p_name, '')),
      case when p_kind = 'email' then v_value else '' end,
      case when p_kind in ('phone', 'whatsapp') then v_value else '' end
    )
    returning id into v_contact;
  end if;

  insert into contact_identities (organization_id, contact_id, kind, value, verified)
  values (p_org, v_contact, p_kind, v_value, coalesce(p_verified, false))
  on conflict (organization_id, kind, value) do nothing;

  return v_contact;
end;
$$;

-- Fold one contact into another — the merge that becomes necessary the moment
-- an Instagram sender later gives you their email. Handles move across; the
-- duplicate's conversations, and therefore its history, move with them.
create or replace function public.app_merge_contacts(
  p_org uuid,
  p_keep uuid,
  p_merge uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_keep = p_merge then
    return;
  end if;
  perform 1 from crm_contacts where id = p_keep and organization_id = p_org;
  if not found then
    raise exception 'keep contact not in this organization';
  end if;
  perform 1 from crm_contacts where id = p_merge and organization_id = p_org;
  if not found then
    raise exception 'merge contact not in this organization';
  end if;

  -- Handles already on the survivor win; the loser's duplicates are dropped.
  update contact_identities i set contact_id = p_keep
  where i.contact_id = p_merge
    and not exists (
      select 1 from contact_identities k
      where k.organization_id = i.organization_id and k.kind = i.kind
        and k.value = i.value and k.contact_id = p_keep
    );
  delete from contact_identities where contact_id = p_merge;

  update conversations set contact_id = p_keep where contact_id = p_merge;
  delete from crm_contacts where id = p_merge and organization_id = p_org;
end;
$$;

revoke all on function public.app_resolve_contact(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.app_merge_contacts(uuid, uuid, uuid) from public, anon;
