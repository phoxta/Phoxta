-- Wàfè — notifications: the notification centre and the follow-up engine.
--
-- Five tables and one catalogue:
--   wf_notification_items   what the engine raised, per member
--   wf_notification_marks   snooze/acted overlay for the shell's own wf_notifications
--   wf_notification_prefs   channels, quiet hours, digest, muted categories
--   wf_follow_up_rules      what THIS family changed about a rule
--   wf_nudge_history        every attempt, delivered or not — the audit trail
--   wf_catalog_follow_up_rules  the rules the product ships with, per tenant
--
-- The privacy promises the app makes are enforced here as well, not only in
-- the client: a member reads their own inbox, a parent additionally reads
-- their children's, and nobody but a parent may read a row whose sensitivity
-- class is financial, health, documents, private or settings. The unique index
-- on idempotency_key is what makes "one nudge per rule, record, member and
-- window" true even when two tabs race.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_notification_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  rule_key         text,
  kind             text not null default 'family',
  sensitivity      text not null default 'general'
                     check (sensitivity in ('general','financial','health','documents','private','settings')),
  record_type      text,
  record_id        text,
  -- The record's own name, so the inbox's inline actions can still find the row
  -- they are about when the raising rule only knew a local identifier.
  record_title     text,
  title            text not null,
  body             text not null default '',
  href             text,
  channel          text not null default 'in-app' check (channel in ('in-app','email','push')),
  idempotency_key  text not null,
  reminder_number  integer not null default 1,
  needs_attention  boolean not null default false,
  action           jsonb,
  action_outcome   text,
  read_at          timestamptz,
  snoozed_until    timestamptz,
  acted_at         timestamptz,
  deferred_until   timestamptz,
  digest_for       date,
  is_test          boolean not null default false,
  created_at       timestamptz not null default now()
);
alter table public.wf_notification_items add column if not exists record_title text;
create index if not exists idx_wf_notification_items_member on public.wf_notification_items(member_id, created_at desc);
create index if not exists idx_wf_notification_items_space on public.wf_notification_items(space_id, created_at desc);
-- One nudge per rule / record / member / window. This is the criterion.
create unique index if not exists uq_wf_notification_items_key on public.wf_notification_items(space_id, idempotency_key);

create table if not exists public.wf_notification_marks (
  notification_id  uuid primary key references public.wf_notifications(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  snoozed_until    timestamptz,
  acted_at         timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_notification_marks_member on public.wf_notification_marks(member_id);

create table if not exists public.wf_notification_prefs (
  member_id        uuid primary key references public.wf_members(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  channel_in_app   boolean not null default true,
  channel_email    boolean not null default false,
  channel_push     boolean not null default false,
  quiet_start      time not null default '21:30',
  quiet_end        time not null default '07:00',
  digest_mode      text not null default 'auto' check (digest_mode in ('off','auto','always')),
  digest_at        time not null default '18:00',
  muted_categories text[] not null default '{}',
  timezone         text not null default 'Europe/London',
  updated_at       timestamptz not null default now()
);
create index if not exists idx_wf_notification_prefs_space on public.wf_notification_prefs(space_id);

create table if not exists public.wf_follow_up_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  rule_key         text not null,
  enabled          boolean,
  max_reminders    integer check (max_reminders between 0 and 9),
  recipient_role   text check (recipient_role in ('parents','assignee','owner','child','guest','everyone')),
  updated_at       timestamptz not null default now(),
  unique (space_id, rule_key)
);

create table if not exists public.wf_nudge_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  rule_key         text not null,
  record_id        text,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  reminder_number  integer not null default 1,
  outcome          text not null default 'delivered'
                     check (outcome in ('delivered','duplicate','held','digest','muted','parked','blocked')),
  note             text not null default '',
  sent_at          timestamptz not null default now()
);
create index if not exists idx_wf_nudge_history_lookup on public.wf_nudge_history(space_id, rule_key, member_id, sent_at desc);

-- Pre-loaded content: the rule catalogue every family in this tenant starts from.
create table if not exists public.wf_catalog_follow_up_rules (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  rule_key         text not null,
  label            text not null,
  trigger_text     text not null default '',
  module_id        text not null default 'home',
  kind             text not null default 'family',
  sensitivity      text not null default 'general',
  recipient_role   text not null default 'parents',
  job              text not null default 'daily-07:00',
  window_unit      text not null default 'day' check (window_unit in ('day','week','once')),
  max_reminders    integer not null default 1,
  escalate_to      text,
  enabled          boolean not null default true,
  sort             integer not null default 0,
  primary key (organization_id, rule_key)
);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['wf_notification_items','wf_notification_marks','wf_notification_prefs','wf_follow_up_rules','wf_nudge_history','wf_catalog_follow_up_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- "My inbox, plus my children's if I am a parent" — and never a sensitive
-- class for anyone who is not a parent. One predicate, used by every policy
-- on the item and mark tables.
create or replace function public.wf_notif_mine(p_space uuid, p_member uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_me   uuid;
  v_role text;
begin
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_me = p_member then return true; end if;
  if v_role <> 'parent' then return false; end if;
  return exists (select 1 from wf_members c where c.id = p_member and c.space_id = p_space and c.role = 'child');
end $$;
grant execute on function public.wf_notif_mine(uuid, uuid) to authenticated;

-- Items -----------------------------------------------------------------
drop policy if exists wf_notification_items_read on public.wf_notification_items;
create policy wf_notification_items_read on public.wf_notification_items for select to authenticated
  using (wf_notif_mine(space_id, member_id) and (sensitivity = 'general' or wf_is_parent(space_id)));
drop policy if exists wf_notification_items_insert on public.wf_notification_items;
create policy wf_notification_items_insert on public.wf_notification_items for insert to authenticated
  with check (
    wf_is_member(space_id)
    and exists (select 1 from wf_members m where m.id = member_id and m.space_id = wf_notification_items.space_id)
    -- The engine may never address a sensitive class to a child or a guest.
    and (sensitivity = 'general' or exists (select 1 from wf_members m where m.id = member_id and m.role = 'parent'))
  );
drop policy if exists wf_notification_items_update on public.wf_notification_items;
create policy wf_notification_items_update on public.wf_notification_items for update to authenticated
  using (wf_notif_mine(space_id, member_id)) with check (wf_notif_mine(space_id, member_id));
drop policy if exists wf_notification_items_delete on public.wf_notification_items;
create policy wf_notification_items_delete on public.wf_notification_items for delete to authenticated
  using (wf_notif_mine(space_id, member_id));

-- Marks (overlay on the shell's notifications) --------------------------
drop policy if exists wf_notification_marks_all on public.wf_notification_marks;
create policy wf_notification_marks_all on public.wf_notification_marks for all to authenticated
  using (wf_notif_mine(space_id, member_id)) with check (wf_notif_mine(space_id, member_id));

-- The centre lets a parent open a child's inbox and act on their behalf, so
-- the shell's own notifications need the same reach. (The foundation grants
-- each member only their own; this widens it to a parent's children.)
drop policy if exists wf_notifications_parent_read on public.wf_notifications;
create policy wf_notifications_parent_read on public.wf_notifications for select to authenticated
  using (wf_is_parent(space_id) and exists (select 1 from wf_members c where c.id = member_id and c.space_id = wf_notifications.space_id and c.role = 'child'));
drop policy if exists wf_notifications_parent_update on public.wf_notifications;
create policy wf_notifications_parent_update on public.wf_notifications for update to authenticated
  using (wf_is_parent(space_id) and exists (select 1 from wf_members c where c.id = member_id and c.space_id = wf_notifications.space_id and c.role = 'child'))
  with check (wf_is_parent(space_id));

-- Preferences: your own; a parent may set anyone's in the family ---------
drop policy if exists wf_notification_prefs_read on public.wf_notification_prefs;
create policy wf_notification_prefs_read on public.wf_notification_prefs for select to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_notification_prefs_write on public.wf_notification_prefs;
create policy wf_notification_prefs_write on public.wf_notification_prefs for insert to authenticated
  with check (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_notification_prefs_edit on public.wf_notification_prefs;
create policy wf_notification_prefs_edit on public.wf_notification_prefs for update to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id))
  with check (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

-- Children are in-app only, whatever is written to their row.
create or replace function public.wf_notification_prefs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.channel_in_app := true;
  if exists (select 1 from wf_members m where m.id = new.member_id and m.role = 'child') then
    new.channel_email := false;
    new.channel_push  := false;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_wf_notification_prefs_guard on public.wf_notification_prefs;
create trigger trg_wf_notification_prefs_guard before insert or update on public.wf_notification_prefs
  for each row execute function public.wf_notification_prefs_guard();

-- Rules: the family reads them, parents edit them ------------------------
drop policy if exists wf_follow_up_rules_read on public.wf_follow_up_rules;
create policy wf_follow_up_rules_read on public.wf_follow_up_rules for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_follow_up_rules_write on public.wf_follow_up_rules;
create policy wf_follow_up_rules_write on public.wf_follow_up_rules for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- History: parents see the family's, everyone sees their own -------------
drop policy if exists wf_nudge_history_read on public.wf_nudge_history;
create policy wf_nudge_history_read on public.wf_nudge_history for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_nudge_history_insert on public.wf_nudge_history;
create policy wf_nudge_history_insert on public.wf_nudge_history for insert to authenticated with check (wf_is_member(space_id));

-- The catalogue is product content: any signed-in member may read it.
drop policy if exists wf_catalog_follow_up_rules_read on public.wf_catalog_follow_up_rules;
create policy wf_catalog_follow_up_rules_read on public.wf_catalog_follow_up_rules for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Realtime — the unread count moves without a refresh
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'wf_notification_items') then
      alter publication supabase_realtime add table public.wf_notification_items;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Seed — the rule catalogue this tenant starts from
-- ---------------------------------------------------------------------------
-- The defaults from the brief plus the four the completeness review added: a
-- Learning Hub plan item falling due, a newly assigned playlist or
-- reading-plan day, a Book-to-Course week opening, and a reward redemption
-- waiting for a parent's yes.
create or replace function public.wf_seed_notifications(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_follow_up_rules
    (organization_id, rule_key, label, trigger_text, module_id, kind, sensitivity, recipient_role, job, window_unit, max_reminders, escalate_to, sort)
  values
    (p_org,'task.overdue','Task overdue','A task passes its due date and is still open','tasks','task','general','assignee','daily-07:00','day',3,'parents',1),
    (p_org,'task.due-tomorrow','Task due tomorrow','A task falls due the next day','tasks','task','general','assignee','daily-18:00','once',1,null,2),
    (p_org,'task.unassigned','Nobody owns this task','A task sits without an owner for two days','tasks','task','general','parents','daily-07:00','day',2,null,3),
    (p_org,'chore.streak-missed','Chore missed twice','A recurring chore is missed two days running','tasks','task','general','child','daily-18:00','day',2,'parents',4),
    (p_org,'habit.missed-2','Habit missed two days','A habit has no log for two days','wellness','wellness','general','owner','daily-18:00','day',2,null,5),
    (p_org,'wellness.appointment-2','Appointment in two days','A health appointment is 48 hours away','wellness','wellness','health','parents','daily-07:00','once',2,null,6),
    (p_org,'milestone.due-7','Milestone due in a week','A goal milestone is seven days out','goals','goal','general','owner','daily-07:00','once',2,'parents',7),
    (p_org,'goal.stalled-14','Goal has stalled','No milestone has moved on a goal for a fortnight','goals','goal','general','parents','weekly-sun-17:00','week',2,null,8),
    (p_org,'curricula.assignment-due','Curriculum assignment due','An assigned curriculum item falls due','curricula','learning','general','child','daily-07:00','day',3,'parents',9),
    (p_org,'project.blocked-7','Project blocked a week','A project has been marked blocked for seven days','projects','goal','general','owner','weekly-sun-17:00','week',2,'parents',10),
    (p_org,'learning.assigned-untouched-5','Assigned lesson untouched','An assigned lesson has not been opened for five days','learning','learning','general','child','daily-07:00','day',3,'parents',11),
    (p_org,'learning.plan-item-due','Learning plan item due today','A Learning Hub plan item falls due today','learning','learning','general','assignee','daily-07:00','day',2,null,12),
    (p_org,'learning.newly-assigned','Something new was assigned','A playlist, course or reading-plan day is assigned to a member','learning','learning','general','assignee','on-change','once',1,null,13),
    (p_org,'books.course-week-open','A course week opens','The next week of a Book-to-Course plan becomes available','books','learning','general','assignee','weekly-sun-17:00','week',1,null,14),
    (p_org,'books.reading-plan-behind','Reading plan slipping','A reading plan is three days behind its schedule','books','learning','general','owner','weekly-sun-17:00','week',2,null,15),
    (p_org,'bible.plan-day','Today''s reading','A Bible reading-plan day is due','bible','prayer','general','assignee','daily-07:00','day',1,null,16),
    (p_org,'prayer.request-added','A prayer request was added','Someone adds a request to the prayer wall','bible','prayer','general','everyone','on-change','once',1,null,17),
    (p_org,'prayer.unanswered-30','Prayer unanswered a month','A prayer request has had no update for thirty days','bible','prayer','general','owner','weekly-sun-17:00','once',2,null,18),
    (p_org,'bill.due-3','Bill due in three days','A recurring bill is due within three days','finance','finance','financial','parents','daily-07:00','day',3,null,19),
    (p_org,'budget.threshold-80','Budget past 80%','An envelope crosses 80% of its monthly allowance','finance','finance','financial','parents','daily-07:00','week',2,null,20),
    (p_org,'purchase.approval-pending','Purchase waiting for approval','A purchase request needs a parent''s decision','finance','finance','financial','parents','hourly','day',3,null,21),
    (p_org,'reward.redemption-pending','Reward redemption waiting','A child asks to redeem points for a reward','family','family','general','parents','hourly','day',3,null,22),
    (p_org,'event.tomorrow','Something on tomorrow','An event the member is on is one day away','calendar','event','general','assignee','daily-18:00','once',1,null,23),
    (p_org,'event.rsvp-missing','RSVP still missing','An invitation has no answer two days before','calendar','event','general','assignee','daily-07:00','day',3,null,24),
    (p_org,'trip.countdown-14','Trip in a fortnight','A trip is fourteen days away','travel','travel','general','everyone','daily-07:00','once',1,null,25),
    (p_org,'travel.packing-ready','Packing lists ready','The packing lists for a trip are generated or change','travel','travel','general','everyone','on-change','once',2,null,26),
    (p_org,'birthday.in-7','Birthday in a week','A member''s birthday is seven days away','notifications','family','general','parents','daily-07:00','once',1,null,27),
    (p_org,'celebrate.badge-earned','Somebody earned something','A child earns a badge or finishes a plan','family','celebrate','general','everyone','on-change','once',1,null,28),
    (p_org,'memories.on-this-day','On this day','A memory from a past year falls on today''s date','memories','family','general','everyone','daily-07:00','day',1,null,29),
    (p_org,'checkin.evening','Evening check-in still open','The evening check-in has not been done by 21:00','home','briefing','general','parents','daily-18:00','day',2,null,30)
  on conflict (organization_id, rule_key) do update set
    label = excluded.label,
    trigger_text = excluded.trigger_text,
    module_id = excluded.module_id,
    kind = excluded.kind,
    sensitivity = excluded.sensitivity,
    recipient_role = excluded.recipient_role,
    job = excluded.job,
    window_unit = excluded.window_unit,
    max_reminders = excluded.max_reminders,
    escalate_to = excluded.escalate_to,
    sort = excluded.sort;
end $$;
grant execute on function public.wf_seed_notifications(uuid) to authenticated;

-- The assembler appends this to wf_seed_org(p_org):
--   perform wf_seed_notifications(p_org);
