-- Wàfè — module: people (relatives, friends, communities, mentors)
--
-- The relational world of a family, and the sharpest privacy problem in the
-- product: a nine-year-old may know that Aunty Bisi's birthday is on the 30th
-- and must never be able to read her address, her phone number or what her
-- mother wrote about her marriage.
--
-- COLUMN-LEVEL PRIVACY, ENFORCED IN POSTGRES
--
--   wf_people           parents (and a guest's own row) only — children are
--                       excluded from the base table outright.
--   wf_people_child     a redacting view: id, name, relationship, kind, photo,
--                       birthday, tags. No phone, no address, no notes, no
--                       prayer needs, no gift ideas, no contact history. This
--                       is the ONLY people relation a child's session reads,
--                       so "children never see contact details" is a fact
--                       about the database, not about the client.
--   wf_mentor_sessions  parents, and the members on the session (a mentor
--                       guest sees their own sessions and nothing else).
--   wf_communities_v    communities with the contact book, the family's notes
--                       and the money blanked for anyone but a parent, so a
--                       shared community is a name, a rhythm and a place.
--   wf_mentor_sessions_v the same rows with `notes` blanked unless
--                       wf_can_see() says this member may read them — which
--                       is how a session note that defaults to Private stays
--                       private from the other parent and from the mentor.
--
-- Money lives in wf_community_giving and is parent-only, full stop.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_people (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  name              text not null,
  relationship      text not null default '',
  kind              text not null default 'other' check (kind in ('relative','friend','neighbour','other')),
  photo_url         text,
  birthday          date,
  anniversary       date,
  address           text not null default '',
  phone             text not null default '',
  email             text not null default '',
  notes             text not null default '',
  prayer_needs      text not null default '',
  gift_ideas        jsonb not null default '[]'::jsonb,
  cadence           text not null default 'none' check (cadence in ('weekly','monthly','quarterly','none')),
  last_contacted_at timestamptz,
  linked_member_id  uuid references public.wf_members(id) on delete set null,
  tags              text[] not null default '{}',
  visibility        text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with       uuid[] not null default '{}',
  owner_member_id   uuid references public.wf_members(id) on delete set null,
  -- Set when the contact was converted into a scoped guest invitation.
  invite_code       text,
  shared_objects    text[] not null default '{}',
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_people_space on public.wf_people(space_id);
create index if not exists idx_wf_people_birthday on public.wf_people(space_id, birthday) where birthday is not null;

create table if not exists public.wf_contact_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  person_id       uuid not null references public.wf_people(id) on delete cascade,
  at              timestamptz not null default now(),
  channel         text not null default 'other' check (channel in ('call','visit','message','video','other')),
  note            text not null default '',
  by_member_id    uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_contact_log_person on public.wf_contact_log(person_id, at desc);

create table if not exists public.wf_communities (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  space_id                uuid not null references public.wf_spaces(id) on delete cascade,
  name                    text not null,
  type                    text not null default 'other' check (type in ('church','coop','club','school','other')),
  meeting_rhythm          text not null default '',
  meets_where             text not null default '',
  link                    text not null default '',
  photo_url               text,
  roles_held              text[] not null default '{}',
  contacts                jsonb not null default '[]'::jsonb,
  giving_commitment_cents integer not null default 0,
  giving_frequency        text not null default 'none' check (giving_frequency in ('weekly','monthly','quarterly','yearly','none')),
  member_ids              uuid[] not null default '{}',
  linked_event_ids        uuid[] not null default '{}',
  shared_with_guests      boolean not null default false,
  notes                   text not null default '',
  created_at              timestamptz not null default now()
);
create index if not exists idx_wf_communities_space on public.wf_communities(space_id);

-- A commitment is only giving once it is paid; people/derive.ts `givingRows`
-- publishes these for a giving ledger. Parents only, like every money table
-- in Wàfè.
create table if not exists public.wf_community_giving (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  community_id    uuid not null references public.wf_communities(id) on delete cascade,
  community_name  text not null default '',
  amount_cents    integer not null check (amount_cents > 0),
  paid_at         timestamptz not null default now(),
  note            text not null default '',
  by_member_id    uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_community_giving_space on public.wf_community_giving(space_id, paid_at desc);

create table if not exists public.wf_mentors (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  person_id          uuid not null references public.wf_people(id) on delete cascade,
  -- Set when the mentor also holds a guest seat in the family.
  member_id          uuid references public.wf_members(id) on delete set null,
  area               text not null default 'other' check (area in ('faith','career','marriage','music','other')),
  title              text not null default '',
  mentee_member_ids  uuid[] not null default '{}',
  next_session_at    timestamptz,
  created_at         timestamptz not null default now()
);
create unique index if not exists uq_wf_mentors_person on public.wf_mentors(space_id, person_id);

create table if not exists public.wf_mentor_sessions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.wf_spaces(id) on delete cascade,
  mentor_id             uuid not null references public.wf_mentors(id) on delete cascade,
  date                  timestamptz not null default now(),
  participants          uuid[] not null default '{}',
  agenda                text not null default '',
  notes                 text not null default '',
  -- The brief: notes default to Private for the parent who wrote them.
  notes_visibility      text not null default 'private' check (notes_visibility in ('private','shared','family','child')),
  notes_shared_with     uuid[] not null default '{}',
  owner_member_id       uuid references public.wf_members(id) on delete set null,
  questions_before_next text[] not null default '{}',
  next_session_at       timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists idx_wf_mentor_sessions_mentor on public.wf_mentor_sessions(mentor_id, date desc);

-- Follow-ups: everything a task needs, plus the session they came from, so a
-- task list adopting them (via people/derive.ts `taskRows`) can link back to
-- the conversation that produced them.
create table if not exists public.wf_follow_ups (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  session_id      uuid not null references public.wf_mentor_sessions(id) on delete cascade,
  mentor_id       uuid not null references public.wf_mentors(id) on delete cascade,
  title           text not null,
  member_id       uuid references public.wf_members(id) on delete set null,
  due_at          timestamptz not null default now(),
  done            boolean not null default false,
  -- Set by a task list once it has adopted this follow-up; null while it lives here only.
  task_id         uuid,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_follow_ups_session on public.wf_follow_ups(session_id);
create index if not exists idx_wf_follow_ups_space on public.wf_follow_ups(space_id, done, due_at);

-- A gift idea moved into the gift pipeline: a present waiting on a parent's
-- yes, published to a purchase pipeline by people/derive.ts `wishRows` with
-- `for_person_name` as the recipient.
create table if not exists public.wf_gift_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  person_id       uuid not null references public.wf_people(id) on delete cascade,
  gift_idea_id    text not null,
  title           text not null,
  for_person_name text not null default '',
  occasion        text not null default '',
  est_cents       integer not null default 0,
  status          text not null default 'pending' check (status in ('pending','approved','bought','declined')),
  note            text not null default '',
  requested_by    uuid references public.wf_members(id) on delete set null,
  requested_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_gift_requests_space on public.wf_gift_requests(space_id, status);

-- Pre-loaded content: message templates so a family is never handed a blank
-- box at 08:00 on somebody's birthday, whether or not the companion answers.
create table if not exists public.wf_catalog_message_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  occasion        text not null,
  tone            text not null default 'warm',
  body            text not null,
  created_at      timestamptz not null default now()
);
create unique index if not exists uq_wf_catalog_message_templates on public.wf_catalog_message_templates(organization_id, slug);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['wf_people','wf_contact_log','wf_communities','wf_community_giving',
                           'wf_mentors','wf_mentor_sessions','wf_follow_ups','wf_gift_requests',
                           'wf_catalog_message_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- People. A child's session gets NOTHING from this table; they read the view
-- below. A guest gets their own row (the record the family keeps about them)
-- and nothing else.
drop policy if exists wf_people_read on public.wf_people;
create policy wf_people_read on public.wf_people for select to authenticated using (
  (wf_is_parent(space_id) and wf_can_see(space_id, owner_member_id, visibility, shared_with))
  or (linked_member_id is not null and linked_member_id = wf_my_member(space_id))
);
drop policy if exists wf_people_write on public.wf_people;
create policy wf_people_write on public.wf_people for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_people_edit on public.wf_people;
create policy wf_people_edit on public.wf_people for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_people_del on public.wf_people;
create policy wf_people_del on public.wf_people for delete to authenticated using (wf_is_parent(space_id));

-- Contact history, gift ideas in the base table, prayer needs: parents only,
-- so the log follows the table it belongs to.
drop policy if exists wf_contact_log_parent on public.wf_contact_log;
create policy wf_contact_log_parent on public.wf_contact_log for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Communities: parents see them all; a child sees the ones they are actually
-- part of (their church and their co-op, not Dad's cycling club); a guest sees
-- the ones the family marked shared. Contacts, notes and money are stripped
-- from all three non-parent readers by wf_communities_v below. Parents manage.
drop policy if exists wf_communities_read on public.wf_communities;
create policy wf_communities_read on public.wf_communities for select to authenticated using (
  wf_is_member(space_id)
  and (
    wf_is_parent(space_id)
    or (wf_my_role(space_id) = 'child' and wf_my_member(space_id) = any (member_ids))
    or (wf_my_role(space_id) = 'guest' and shared_with_guests)
  )
);
drop policy if exists wf_communities_write on public.wf_communities;
create policy wf_communities_write on public.wf_communities for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_communities_edit on public.wf_communities;
create policy wf_communities_edit on public.wf_communities for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_communities_del on public.wf_communities;
create policy wf_communities_del on public.wf_communities for delete to authenticated using (wf_is_parent(space_id));

-- Money: parents, full stop.
drop policy if exists wf_community_giving_parent on public.wf_community_giving;
create policy wf_community_giving_parent on public.wf_community_giving for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Mentors: parents see all; a child sees the mentors who mentor THEM; a
-- mentor guest sees their own record.
drop policy if exists wf_mentors_read on public.wf_mentors;
create policy wf_mentors_read on public.wf_mentors for select to authenticated using (
  wf_is_parent(space_id)
  or wf_my_member(space_id) = any (mentee_member_ids)
  or (member_id is not null and member_id = wf_my_member(space_id))
);
drop policy if exists wf_mentors_write on public.wf_mentors;
create policy wf_mentors_write on public.wf_mentors for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_mentors_edit on public.wf_mentors;
create policy wf_mentors_edit on public.wf_mentors for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_mentors_del on public.wf_mentors;
create policy wf_mentors_del on public.wf_mentors for delete to authenticated using (wf_is_parent(space_id));

-- Sessions: parents; the members in the room; the mentor whose sessions they
-- are. Note this is ROW access — the notes column is decided separately by
-- the view below.
drop policy if exists wf_mentor_sessions_read on public.wf_mentor_sessions;
create policy wf_mentor_sessions_read on public.wf_mentor_sessions for select to authenticated using (
  wf_is_parent(space_id)
  or wf_my_member(space_id) = any (participants)
  or exists (select 1 from public.wf_mentors m where m.id = mentor_id and m.member_id = wf_my_member(space_id))
);
drop policy if exists wf_mentor_sessions_write on public.wf_mentor_sessions;
create policy wf_mentor_sessions_write on public.wf_mentor_sessions for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_mentor_sessions_edit on public.wf_mentor_sessions;
create policy wf_mentor_sessions_edit on public.wf_mentor_sessions for update to authenticated
  using (wf_is_parent(space_id) and (notes_visibility <> 'private' or owner_member_id is null or owner_member_id = wf_my_member(space_id)))
  with check (wf_is_parent(space_id));
drop policy if exists wf_mentor_sessions_del on public.wf_mentor_sessions;
create policy wf_mentor_sessions_del on public.wf_mentor_sessions for delete to authenticated
  using (wf_is_parent(space_id) and (owner_member_id is null or owner_member_id = wf_my_member(space_id)));

-- Follow-ups: parents, the person they are for, and whoever can see the session.
drop policy if exists wf_follow_ups_read on public.wf_follow_ups;
create policy wf_follow_ups_read on public.wf_follow_ups for select to authenticated using (
  wf_is_parent(space_id)
  or member_id = wf_my_member(space_id)
  or exists (select 1 from public.wf_mentors m where m.id = mentor_id and m.member_id = wf_my_member(space_id))
);
drop policy if exists wf_follow_ups_write on public.wf_follow_ups;
create policy wf_follow_ups_write on public.wf_follow_ups for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_follow_ups_edit on public.wf_follow_ups;
create policy wf_follow_ups_edit on public.wf_follow_ups for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_follow_ups_del on public.wf_follow_ups;
create policy wf_follow_ups_del on public.wf_follow_ups for delete to authenticated using (wf_is_parent(space_id));

-- Gift requests are purchases in waiting: parents only.
drop policy if exists wf_gift_requests_parent on public.wf_gift_requests;
create policy wf_gift_requests_parent on public.wf_gift_requests for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Catalogue: readable by anyone signed in, written by the seed function only.
drop policy if exists wf_catalog_message_templates_read on public.wf_catalog_message_templates;
create policy wf_catalog_message_templates_read on public.wf_catalog_message_templates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. The three redacting views
-- ---------------------------------------------------------------------------

-- What a CHILD may hold about a relative or a friend: a name, a face and a
-- birthday. Deliberately a definer view (no security_invoker) because the
-- base table's policy excludes children entirely — the guard is the WHERE
-- clause here, and it is the whole of it. Anything added to this select list
-- is added to what a nine-year-old can read, so add nothing lightly.
drop view if exists public.wf_people_child;
create view public.wf_people_child with (security_barrier = true) as
select p.id,
       p.space_id,
       p.name,
       p.relationship,
       p.kind,
       p.photo_url,
       p.birthday,
       p.tags,
       p.linked_member_id,
       p.created_at
from public.wf_people p
where wf_is_member(p.space_id)
  and wf_my_role(p.space_id) = 'child'
  and p.visibility in ('family','child')
  and (
    p.kind in ('relative','friend')
    -- …and the child's own mentors, so their mentor page can name them.
    or exists (select 1 from public.wf_mentors m
               where m.person_id = p.id and wf_my_member(p.space_id) = any (m.mentee_member_ids))
  );
grant select on public.wf_people_child to authenticated;

-- Sessions with the notes column decided per reader. security_invoker so the
-- row policy above still applies; the CASE is the column-level rule, which is
-- what makes "notes default to Private for the parent who wrote them" true of
-- the other parent and of the mentor as well as of the client.
drop view if exists public.wf_mentor_sessions_v;
create view public.wf_mentor_sessions_v with (security_invoker = true, security_barrier = true) as
select s.id,
       s.space_id,
       s.mentor_id,
       s.date,
       s.participants,
       s.agenda,
       case when wf_can_see(s.space_id, s.owner_member_id, s.notes_visibility, s.notes_shared_with)
            then s.notes else '' end as notes,
       not wf_can_see(s.space_id, s.owner_member_id, s.notes_visibility, s.notes_shared_with) as notes_withheld,
       s.notes_visibility,
       s.notes_shared_with,
       s.owner_member_id,
       s.questions_before_next,
       s.next_session_at,
       s.created_at
from public.wf_mentor_sessions s;
grant select on public.wf_mentor_sessions_v to authenticated;

-- A community as a non-parent may hold it: the name, the rhythm and the place
-- we go, never the roster of who to ring, never what the family privately
-- thinks about it, never the money. security_invoker so the row policy above
-- still decides WHICH communities a reader gets; this decides which COLUMNS.
-- "Shared on purpose" means a guest granted the church is granted the church,
-- not its contact book.
drop view if exists public.wf_communities_v;
create view public.wf_communities_v with (security_invoker = true, security_barrier = true) as
select c.id,
       c.space_id,
       c.name,
       c.type,
       c.meeting_rhythm,
       c.meets_where,
       c.link,
       c.photo_url,
       c.roles_held,
       case when wf_is_parent(c.space_id) then c.contacts else '[]'::jsonb end as contacts,
       case when wf_is_parent(c.space_id) then c.giving_commitment_cents else 0 end as giving_commitment_cents,
       case when wf_is_parent(c.space_id) then c.giving_frequency else 'none' end as giving_frequency,
       c.member_ids,
       c.linked_event_ids,
       c.shared_with_guests,
       case when wf_is_parent(c.space_id) then c.notes else '' end as notes,
       c.created_at
from public.wf_communities c;
grant select on public.wf_communities_v to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Provisioning — the message-template catalogue
-- ---------------------------------------------------------------------------
create or replace function public.wf_seed_people(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_message_templates (organization_id, slug, occasion, tone, body) values
    (p_org, 'birthday-warm', 'birthday', 'warm',
     'Happy birthday, {{name}}! We thank God for you today — for who you are and for everything you have been to this family. Have a beautiful day, and know you are prayed for.'),
    (p_org, 'birthday-short', 'birthday', 'short',
     'Happy birthday {{name}}! Thinking of you today and praying it is a lovely one. With love from all of us.'),
    (p_org, 'birthday-child', 'birthday', 'child',
     'Happy birthday {{name}}!! I hope you get cake. Love from {{me}} xx'),
    (p_org, 'anniversary-warm', 'anniversary', 'warm',
     'Happy anniversary, {{name}}! {{years}} years — what a gift to watch you keep choosing each other. Praying for many more, and thanking God for you both.'),
    (p_org, 'condolence', 'condolence', 'gentle',
     'We were so sorry to hear about {{subject}}. There are no right words. We are praying for you, and we are here — for a meal, a lift, or just to sit with you.'),
    (p_org, 'thinking-of-you', 'checkin', 'warm',
     'Hello {{name}} — you have been on our minds this week. No news needed, we just wanted you to know we are thinking of you and praying for you.'),
    (p_org, 'thank-you', 'thanks', 'warm',
     'Thank you, {{name}}. Truly. What you did did not go unnoticed and it made a real difference to us.')
  on conflict (organization_id, slug) do update
    set occasion = excluded.occasion, tone = excluded.tone, body = excluded.body;
end $$;
grant execute on function public.wf_seed_people(uuid) to authenticated;
