-- Wàfè — books: the family library and the book-to-course engine.
--
-- Eight tables and one settings row. The shelf (wf_books) carries the standard
-- visibility columns, so wf_can_see() decides on its own that a child never
-- receives a parent's private reading. Everything downstream — progress,
-- plans, courses, weeks, items, attempts — is reachable only through a book
-- the caller can already see, which is exactly how the app filters it.
--
-- THE GUEST RULE. A mentor guest is given ONE course and nothing else in this
-- module: no shelf, no plans, no progress, no attempts. That is enforced here,
-- not in the client: wf_courses' read policy admits a guest only when their
-- member id is in shared_with_guest_ids, and wf_books admits the book behind
-- such a course (a course without its book is not readable). Guests are also
-- read-only throughout — there is no insert/update/delete policy that a guest
-- can satisfy anywhere in this file.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_books (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  title            text not null,
  author           text not null default '',
  format           text not null default 'physical' check (format in ('ebook','physical','audio')),
  cover_url        text,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  status           text not null default 'want' check (status in ('want','reading','done')),
  -- Pages, or minutes when format = 'audio'.
  pages            integer not null default 0 check (pages >= 0),
  rating           integer not null default 0 check (rating between 0 and 5),
  notes            text not null default '',
  tags             text[] not null default '{}',
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  -- A family value ("Faith"), free text so a space can rename its own values.
  value_label      text,
  -- The goal this reading feeds: a REAL id from the Goals module, written by a
  -- picker over that module's rows — never a slug minted from a label. No FK:
  -- Goals is another module's table, and modules never reference each other's
  -- tables (CONTRACT.md), so the label is denormalised alongside it.
  goal_id          text,
  goal_label       text,
  started_at       date,
  finished_at      date,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_books_space on public.wf_books(space_id, status);
create index if not exists idx_wf_books_owner on public.wf_books(owner_member_id);

create table if not exists public.wf_reading_progress (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  book_id          uuid not null references public.wf_books(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  page             integer,
  pct              integer not null default 0 check (pct between 0 and 100),
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (book_id, member_id)
);
create index if not exists idx_wf_reading_progress_book on public.wf_reading_progress(book_id);

create table if not exists public.wf_reading_plans (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  book_id              uuid not null references public.wf_books(id) on delete cascade,
  pace_unit            text not null default 'pages' check (pace_unit in ('pages','chapters','minutes')),
  pace_amount          integer not null default 10 check (pace_amount > 0),
  days_per_week        integer not null default 7 check (days_per_week between 1 and 7),
  assignee_member_ids  uuid[] not null default '{}',
  start_date           date not null default current_date,
  end_date             date not null default current_date,
  goal_id              text,
  created_at           timestamptz not null default now()
);
create index if not exists idx_wf_reading_plans_space on public.wf_reading_plans(space_id);

create table if not exists public.wf_courses (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  book_id                uuid not null references public.wf_books(id) on delete cascade,
  title                  text not null,
  weeks                  integer not null default 4 check (weeks between 1 and 12),
  status                 text not null default 'draft' check (status in ('draft','published')),
  generated_by           uuid references public.wf_members(id) on delete set null,
  model                  text,
  cost_cents             integer not null default 0,
  shared_with_guest_ids  uuid[] not null default '{}',
  child_safe             boolean not null default false,
  audience               text not null default '',
  enrolled               uuid[] not null default '{}',
  unit_id                uuid,
  created_at             timestamptz not null default now()
);
create index if not exists idx_wf_courses_space on public.wf_courses(space_id, status);
create index if not exists idx_wf_courses_book on public.wf_courses(book_id);

create table if not exists public.wf_course_weeks (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.wf_spaces(id) on delete cascade,
  course_id             uuid not null references public.wf_courses(id) on delete cascade,
  week                  integer not null default 1 check (week between 1 and 12),
  theme                 text not null default '',
  chapters              text not null default '',
  discussion_questions  text[] not null default '{}',
  family_activity       text not null default '',
  -- [{ q, options[], answer, why }]
  quiz                  jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  unique (course_id, week)
);
create index if not exists idx_wf_course_weeks_course on public.wf_course_weeks(course_id, week);

create table if not exists public.wf_course_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  course_week_id   uuid not null references public.wf_course_weeks(id) on delete cascade,
  type             text not null default 'read' check (type in ('read','discuss','activity','quiz','note')),
  title            text not null,
  item_order       integer not null default 1,
  -- Members who have ticked this off; a week is done for a member when every
  -- item on it holds their id.
  done_by          uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_course_items_week on public.wf_course_items(course_week_id, item_order);

create table if not exists public.wf_quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  course_id        uuid not null references public.wf_courses(id) on delete cascade,
  course_week_id   uuid not null references public.wf_course_weeks(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  answers          integer[] not null default '{}',
  score            integer not null default 0,
  total            integer not null default 0,
  attempted_at     timestamptz not null default now()
);
create index if not exists idx_wf_quiz_attempts_week on public.wf_quiz_attempts(course_week_id, member_id);

-- A course exported for Curricula. Modules never write each other's rows, so
-- the export is materialised here in the shape Curricula reads, and Curricula
-- picks it up from the books slice.
create table if not exists public.wf_course_units (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  course_id        uuid not null unique references public.wf_courses(id) on delete cascade,
  book_id          uuid not null references public.wf_books(id) on delete cascade,
  title            text not null,
  subject          text not null default 'Reading',
  weeks            integer not null default 4,
  member_ids       uuid[] not null default '{}',
  -- [{ id, week, title, href }] — each assignment links back to the week.
  assignments      jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create table if not exists public.wf_book_settings (
  space_id         uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  year_goal        integer not null default 12 check (year_goal >= 0),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- True when the caller is a guest who was explicitly given this course.
create or replace function public.wf_book_course_shared(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_courses c
    where c.id = p_course
      and c.status = 'published'
      and wf_my_member(c.space_id) = any (c.shared_with_guest_ids)
  );
$$;

-- True when the caller may read this book: the ordinary visibility rule, or
-- because a course built on it was shared with them.
create or replace function public.wf_book_readable(p_book uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_books b
    where b.id = p_book
      and (
        wf_can_see(b.space_id, b.owner_member_id, b.visibility, b.shared_with)
        or exists (select 1 from public.wf_courses c where c.book_id = b.id and wf_book_course_shared(c.id))
      )
  );
$$;

-- True when the caller may read this course: a member of the family whose
-- book they can see, or the guest it was shared with.
create or replace function public.wf_course_readable(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_courses c join public.wf_books b on b.id = c.book_id
    where c.id = p_course
      and (
        (wf_is_member(c.space_id) and wf_can_see(b.space_id, b.owner_member_id, b.visibility, b.shared_with))
        or wf_book_course_shared(c.id)
      )
  );
$$;

grant execute on function public.wf_book_course_shared(uuid) to authenticated;
grant execute on function public.wf_book_readable(uuid) to authenticated;
grant execute on function public.wf_course_readable(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_books           enable row level security;
alter table public.wf_reading_progress enable row level security;
alter table public.wf_reading_plans   enable row level security;
alter table public.wf_courses         enable row level security;
alter table public.wf_course_weeks    enable row level security;
alter table public.wf_course_items    enable row level security;
alter table public.wf_quiz_attempts   enable row level security;
alter table public.wf_course_units    enable row level security;
alter table public.wf_book_settings   enable row level security;

drop policy if exists wf_books_read  on public.wf_books;
drop policy if exists wf_books_write on public.wf_books;
drop policy if exists wf_books_edit  on public.wf_books;
drop policy if exists wf_books_del   on public.wf_books;
create policy wf_books_read  on public.wf_books for select to authenticated
  using (wf_can_see(space_id, owner_member_id, visibility, shared_with)
         or exists (select 1 from public.wf_courses c where c.book_id = wf_books.id and wf_book_course_shared(c.id)));
create policy wf_books_write on public.wf_books for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_books_edit  on public.wf_books for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
create policy wf_books_del   on public.wf_books for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_reading_progress_read  on public.wf_reading_progress;
drop policy if exists wf_reading_progress_write on public.wf_reading_progress;
drop policy if exists wf_reading_progress_edit  on public.wf_reading_progress;
drop policy if exists wf_reading_progress_del   on public.wf_reading_progress;
create policy wf_reading_progress_read  on public.wf_reading_progress for select to authenticated
  using (wf_is_member(space_id) and wf_book_readable(book_id));
create policy wf_reading_progress_write on public.wf_reading_progress for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or member_id = wf_my_member(space_id)));
create policy wf_reading_progress_edit  on public.wf_reading_progress for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_reading_progress_del   on public.wf_reading_progress for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

drop policy if exists wf_reading_plans_read  on public.wf_reading_plans;
drop policy if exists wf_reading_plans_write on public.wf_reading_plans;
drop policy if exists wf_reading_plans_edit  on public.wf_reading_plans;
drop policy if exists wf_reading_plans_del   on public.wf_reading_plans;
create policy wf_reading_plans_read  on public.wf_reading_plans for select to authenticated
  using (wf_is_member(space_id) and wf_book_readable(book_id)
         and (wf_is_parent(space_id) or wf_my_member(space_id) = any (assignee_member_ids)));
create policy wf_reading_plans_write on public.wf_reading_plans for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_reading_plans_edit  on public.wf_reading_plans for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_reading_plans_del   on public.wf_reading_plans for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_courses_read  on public.wf_courses;
drop policy if exists wf_courses_write on public.wf_courses;
drop policy if exists wf_courses_edit  on public.wf_courses;
drop policy if exists wf_courses_del   on public.wf_courses;
create policy wf_courses_read  on public.wf_courses for select to authenticated using (wf_course_readable(id));
create policy wf_courses_write on public.wf_courses for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_courses_edit  on public.wf_courses for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_courses_del   on public.wf_courses for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_course_weeks_read  on public.wf_course_weeks;
drop policy if exists wf_course_weeks_write on public.wf_course_weeks;
drop policy if exists wf_course_weeks_edit  on public.wf_course_weeks;
drop policy if exists wf_course_weeks_del   on public.wf_course_weeks;
create policy wf_course_weeks_read  on public.wf_course_weeks for select to authenticated using (wf_course_readable(course_id));
create policy wf_course_weeks_write on public.wf_course_weeks for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_course_weeks_edit  on public.wf_course_weeks for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_course_weeks_del   on public.wf_course_weeks for delete to authenticated using (wf_is_parent(space_id));

-- Items are the one place a child writes: ticking their own box. The policy
-- allows a member of the family to update an item on a course they are
-- enrolled in; a guest satisfies neither branch, so a shared course stays
-- read-only for them.
drop policy if exists wf_course_items_read  on public.wf_course_items;
drop policy if exists wf_course_items_write on public.wf_course_items;
drop policy if exists wf_course_items_edit  on public.wf_course_items;
drop policy if exists wf_course_items_del   on public.wf_course_items;
create policy wf_course_items_read  on public.wf_course_items for select to authenticated
  using (exists (select 1 from public.wf_course_weeks w where w.id = course_week_id and wf_course_readable(w.course_id)));
create policy wf_course_items_write on public.wf_course_items for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_course_items_edit  on public.wf_course_items for update to authenticated
  using (wf_is_parent(wf_course_items.space_id)
         or exists (select 1 from public.wf_course_weeks w join public.wf_courses c on c.id = w.course_id
                    where w.id = wf_course_items.course_week_id and wf_my_member(wf_course_items.space_id) = any (c.enrolled)))
  with check (wf_is_parent(wf_course_items.space_id)
         or exists (select 1 from public.wf_course_weeks w join public.wf_courses c on c.id = w.course_id
                    where w.id = wf_course_items.course_week_id and wf_my_member(wf_course_items.space_id) = any (c.enrolled)));
create policy wf_course_items_del   on public.wf_course_items for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_quiz_attempts_read  on public.wf_quiz_attempts;
drop policy if exists wf_quiz_attempts_write on public.wf_quiz_attempts;
drop policy if exists wf_quiz_attempts_del   on public.wf_quiz_attempts;
create policy wf_quiz_attempts_read  on public.wf_quiz_attempts for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_quiz_attempts_write on public.wf_quiz_attempts for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
              and exists (select 1 from public.wf_courses c where c.id = course_id
                          and (wf_is_parent(space_id) or wf_my_member(space_id) = any (c.enrolled))));
create policy wf_quiz_attempts_del   on public.wf_quiz_attempts for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_course_units_read  on public.wf_course_units;
drop policy if exists wf_course_units_write on public.wf_course_units;
drop policy if exists wf_course_units_edit  on public.wf_course_units;
drop policy if exists wf_course_units_del   on public.wf_course_units;
create policy wf_course_units_read  on public.wf_course_units for select to authenticated using (wf_is_member(space_id));
create policy wf_course_units_write on public.wf_course_units for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_course_units_edit  on public.wf_course_units for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_course_units_del   on public.wf_course_units for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_book_settings_read  on public.wf_book_settings;
drop policy if exists wf_book_settings_write on public.wf_book_settings;
drop policy if exists wf_book_settings_edit  on public.wf_book_settings;
create policy wf_book_settings_read  on public.wf_book_settings for select to authenticated using (wf_is_member(space_id));
create policy wf_book_settings_write on public.wf_book_settings for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_book_settings_edit  on public.wf_book_settings for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded catalogue: course templates every tenant starts with
-- ---------------------------------------------------------------------------

create table if not exists public.wf_catalog_book_courses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  title            text not null,
  author           text not null default '',
  audience         text not null default '',
  child_safe       boolean not null default true,
  -- [{ week, theme, chapters, discussionQuestions[], familyActivity, quiz[] }]
  weeks            jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.wf_catalog_book_courses enable row level security;
drop policy if exists wf_catalog_book_courses_read on public.wf_catalog_book_courses;
create policy wf_catalog_book_courses_read on public.wf_catalog_book_courses for select to authenticated using (true);

/**
 * Seed the catalogue for a tenant. Idempotent: re-running updates in place, so
 * an operator can improve a template and every new family gets the better one.
 */
create or replace function public.wf_seed_books(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_book_courses (organization_id, slug, title, author, audience, child_safe, weeks)
  values
    (p_org, 'household-rhythms', 'Household rhythms — four weeks', 'Adapted from the family-habits tradition',
     'The whole family, read aloud after Sunday lunch.', true,
     '[{"week":1,"theme":"Waking: what we do first","chapters":"Introduction and chapters 1-2",
        "discussionQuestions":["What is the first thing each of us does in the morning?","What one sentence could we say before anyone leaves the house?","Which morning habit would we not want to pass on?"],
        "familyActivity":"Write our morning sentence on a card and tape it inside the front door.","quiz":[]},
       {"week":2,"theme":"Mealtimes: the table as a welcome","chapters":"Chapters 3-4",
        "discussionQuestions":["When did we last eat with nobody holding a phone?","Who could we invite this month who has never been?","What would we like said before we eat?"],
        "familyActivity":"Invite one person outside the family to Sunday lunch.","quiz":[]},
       {"week":3,"theme":"Screens, work and rest","chapters":"Chapters 5-6",
        "discussionQuestions":["What does each of us reach for when we are bored?","What would a good screen-free morning look like?","What do we do with a day off?"],
        "familyActivity":"A screen-free Saturday morning, out of the house.","quiz":[]},
       {"week":4,"theme":"Bedtime: blessing and forgiveness","chapters":"Chapters 7-8",
        "discussionQuestions":["What do we want the last words of the day to be?","How do we say sorry here, and how quickly?","Which habit are we keeping?"],
        "familyActivity":"Write a bedtime blessing for each child in their own words.","quiz":[]}]'::jsonb),
    (p_org, 'read-a-novel-together', 'Read a novel together — four weeks', 'Any novel',
     'A teenager and a parent reading the same book.', true,
     '[{"week":1,"theme":"Who is this about?","chapters":"First quarter",
        "discussionQuestions":["Whose story is this?","What does the main character want?","What is in the way?"],
        "familyActivity":"Each write one sentence predicting the ending, and seal it.","quiz":[]},
       {"week":2,"theme":"What changes","chapters":"Second quarter",
        "discussionQuestions":["What has the character learned?","Who has been let down?","What would we have done?"],
        "familyActivity":"Cook something the characters would eat.","quiz":[]},
       {"week":3,"theme":"The hardest part","chapters":"Third quarter",
        "discussionQuestions":["Where does it turn?","What does the author want us to feel here?","Is anyone right?"],
        "familyActivity":"Read the hardest page aloud to each other.","quiz":[]},
       {"week":4,"theme":"What it was for","chapters":"Final quarter",
        "discussionQuestions":["Open the sealed predictions — who was closest?","What will we remember in a year?","Who should read it next?"],
        "familyActivity":"Write the book a one-line review for the shelf.","quiz":[]}]'::jsonb)
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        author = excluded.author,
        audience = excluded.audience,
        child_safe = excluded.child_safe,
        weeks = excluded.weeks;
end;
$$;

grant execute on function public.wf_seed_books(uuid) to authenticated;
