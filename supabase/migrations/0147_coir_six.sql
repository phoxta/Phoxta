-- Phoxta platform — 0147 the Coir Six business (an online-course platform).
--
-- Coir Six began as a portfolio case study — a glance-first learner dashboard
-- prototyped in HTML — and was then built out as a real learning app. This
-- turns it into a sellable blueprint: its own app (businesses/coir-six →
-- Vercel project `coir-six`, wildcard *.coir-six.phoxta.com) on the shared
-- backend, listed at £2,500.
--
-- One deployment serves every buyer, so every table here is scoped by
-- organization_id. Two halves:
--
--   * the CATALOGUE (categories, mentors, courses, modules, lessons, quiz,
--     live sessions, groups) — public-read, written by the platform. Ids are
--     stable text keys per school (primary key (organization_id, id)), shared
--     with the app's bundled demo, so a learner's progress on "l-fe1-3" means
--     the same thing in demo and live.
--   * LEARNER STATE (profile, enrollments, progress, study time, tasks, notes,
--     groups, inbox, notifications, quiz attempts, certificates) — user_id =
--     auth.uid() is the security boundary; organization_id scopes it.
--
-- A buyer gets a working school on day one: the org-insert trigger seeds the
-- starter catalogue into the new tenant (cs_seed_org). Nothing here touches
-- products, orders or billing — courses are not products.
--
-- Follow-up once the Vercel project exists:
--   update blueprints set vercel_project_id = 'prj_…' where slug = 'coir-six';

-- ---------------------------------------------------------------------------
-- 1. Catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.cs_categories (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id    text not null,
  name  text not null,
  blurb text not null default '',
  sort  integer not null default 0,
  primary key (organization_id, id)
);

create table if not exists public.cs_mentors (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id        text not null,
  name      text not null,
  role      text not null default '',
  bio       text not null default '',
  hue       text not null default 'lilac',
  photo_url text,
  handle    text not null default '',
  followers integer not null default 0,
  expertise text[] not null default '{}',
  primary key (organization_id, id)
);

create table if not exists public.cs_courses (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id           text not null,
  slug         text not null,
  title        text not null,
  blurb        text not null default '',
  description  text not null default '',
  category_id  text not null,
  mentor_id    text not null,
  level        text not null default 'Beginner' check (level in ('Beginner','Intermediate','Advanced')),
  theme        text not null default 'ux',
  cover_url    text,
  rating       numeric(2,1) not null default 4.8,
  learners     integer not null default 0,
  outcomes     jsonb not null default '[]'::jsonb,
  published    boolean not null default true,
  published_at timestamptz not null default now(),
  primary key (organization_id, id),
  unique (organization_id, slug),
  foreign key (organization_id, category_id) references public.cs_categories(organization_id, id),
  foreign key (organization_id, mentor_id)   references public.cs_mentors(organization_id, id)
);

create table if not exists public.cs_modules (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id        text not null,
  course_id text not null,
  title     text not null,
  sort      integer not null default 0,
  primary key (organization_id, id),
  foreign key (organization_id, course_id) references public.cs_courses(organization_id, id) on delete cascade
);

create table if not exists public.cs_lessons (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id           text not null,
  course_id    text not null,
  module_id    text not null,
  title        text not null,
  kind         text not null default 'video' check (kind in ('video','article','quiz')),
  duration_sec integer not null default 0,
  video_url    text,
  captions_url text,
  source       text not null default '',
  body         text not null default '',
  sort         integer not null default 0,
  primary key (organization_id, id),
  foreign key (organization_id, course_id) references public.cs_courses(organization_id, id) on delete cascade,
  foreign key (organization_id, module_id) references public.cs_modules(organization_id, id) on delete cascade
);
create index if not exists idx_cs_lessons_course on public.cs_lessons(organization_id, course_id, sort);

create table if not exists public.cs_quiz_questions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id          text not null,
  lesson_id   text not null,
  prompt      text not null,
  options     jsonb not null default '[]'::jsonb,
  answer      integer not null default 0,
  explanation text not null default '',
  sort        integer not null default 0,
  primary key (organization_id, id),
  foreign key (organization_id, lesson_id) references public.cs_lessons(organization_id, id) on delete cascade
);

create table if not exists public.cs_live_lessons (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id            text not null,
  mentor_id     text not null,
  category_id   text not null,
  title         text not null,
  description   text not null default '',
  starts_at     timestamptz not null,
  duration_min  integer not null default 60,
  join_url      text not null default '',
  recording_url text,
  primary key (organization_id, id),
  foreign key (organization_id, mentor_id)   references public.cs_mentors(organization_id, id),
  foreign key (organization_id, category_id) references public.cs_categories(organization_id, id)
);

create table if not exists public.cs_groups (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id          text not null,
  name        text not null,
  category_id text not null,
  blurb       text not null default '',
  members     integer not null default 0,
  image_url   text,
  primary key (organization_id, id),
  foreign key (organization_id, category_id) references public.cs_categories(organization_id, id)
);

-- ---------------------------------------------------------------------------
-- 2. Learner state
-- ---------------------------------------------------------------------------
create table if not exists public.cs_profiles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null default '',
  handle          text not null default '',
  hue             text not null default 'lilac',
  photo_url       text,
  headline        text not null default '',
  weekly_goal_min integer not null default 180,
  interests       text[] not null default '{}',
  onboarded       boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.cs_enrollments (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  course_id      text not null,
  enrolled_at    timestamptz not null default now(),
  completed_at   timestamptz,
  last_lesson_id text,
  primary key (organization_id, user_id, course_id),
  foreign key (organization_id, course_id) references public.cs_courses(organization_id, id) on delete cascade
);

create table if not exists public.cs_lesson_progress (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_id    text not null,
  position_sec integer not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (organization_id, user_id, lesson_id),
  foreign key (organization_id, lesson_id) references public.cs_lessons(organization_id, id) on delete cascade
);

create table if not exists public.cs_study_sessions (
  id          uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  lesson_id   text,
  minutes     integer not null check (minutes > 0 and minutes <= 600),
  occurred_at timestamptz not null default now()
);
create index if not exists idx_cs_sessions_user on public.cs_study_sessions(organization_id, user_id, occurred_at desc);

create table if not exists public.cs_bookmarks (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  primary key (organization_id, user_id, course_id),
  foreign key (organization_id, course_id) references public.cs_courses(organization_id, id) on delete cascade
);

create table if not exists public.cs_follows (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  mentor_id text not null,
  primary key (organization_id, user_id, mentor_id),
  foreign key (organization_id, mentor_id) references public.cs_mentors(organization_id, id) on delete cascade
);

create table if not exists public.cs_live_rsvps (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  live_lesson_id text not null,
  primary key (organization_id, user_id, live_lesson_id),
  foreign key (organization_id, live_lesson_id) references public.cs_live_lessons(organization_id, id) on delete cascade
);

-- course_id is a soft reference: a task outlives a deleted course.
create table if not exists public.cs_tasks (
  id         uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  course_id  text,
  due_at     timestamptz not null,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_cs_tasks_user on public.cs_tasks(organization_id, user_id, due_at);

create table if not exists public.cs_notes (
  id         uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id  text not null,
  at_sec     integer,
  body       text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, lesson_id) references public.cs_lessons(organization_id, id) on delete cascade
);
create index if not exists idx_cs_notes_user on public.cs_notes(organization_id, user_id, lesson_id);

create table if not exists public.cs_group_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id  text not null,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (organization_id, group_id, user_id),
  foreign key (organization_id, group_id) references public.cs_groups(organization_id, id) on delete cascade
);

create table if not exists public.cs_group_posts (
  id          uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id    text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  author_hue  text not null default 'lilac',
  author_photo_url text,
  body        text not null,
  created_at  timestamptz not null default now(),
  foreign key (organization_id, group_id) references public.cs_groups(organization_id, id) on delete cascade
);
create index if not exists idx_cs_posts_group on public.cs_group_posts(organization_id, group_id, created_at desc);

create table if not exists public.cs_conversations (
  id         uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  peer_kind  text not null check (peer_kind in ('mentor','friend')),
  peer_id    text not null,
  peer_name  text not null default '',
  peer_role  text not null default '',
  peer_hue   text not null default 'lilac',
  last_body  text not null default '',
  unread     integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, peer_kind, peer_id)
);

create table if not exists public.cs_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.cs_conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  from_me         boolean not null default true,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_cs_messages_conv on public.cs_messages(conversation_id, created_at);

create table if not exists public.cs_notifications (
  id         uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'lesson',
  title      text not null,
  body       text not null default '',
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_cs_notifications_user on public.cs_notifications(organization_id, user_id, created_at desc);

create table if not exists public.cs_quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id  text not null,
  score      integer not null,
  total      integer not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, lesson_id) references public.cs_lessons(organization_id, id) on delete cascade
);

create table if not exists public.cs_certificates (
  id        uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  code      text not null unique,
  issued_at timestamptz not null default now(),
  unique (organization_id, user_id, course_id),
  foreign key (organization_id, course_id) references public.cs_courses(organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  -- Catalogue: anyone may read (a school's course list is public content, like a
  -- shop's products); only the platform writes (no client policy).
  foreach t in array array['cs_categories','cs_mentors','cs_courses','cs_modules','cs_lessons','cs_quiz_questions','cs_live_lessons','cs_groups'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;

  -- Learner state: the owner, and only the owner.
  foreach t in array array['cs_profiles','cs_enrollments','cs_lesson_progress','cs_study_sessions','cs_bookmarks','cs_follows','cs_live_rsvps','cs_tasks','cs_notes','cs_group_members','cs_conversations','cs_messages','cs_notifications','cs_quiz_attempts','cs_certificates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end $$;

-- Group posts are read by every signed-in learner and written under the author's own id.
alter table public.cs_group_posts enable row level security;
grant select, insert, delete on public.cs_group_posts to authenticated;
drop policy if exists cs_group_posts_read on public.cs_group_posts;
create policy cs_group_posts_read on public.cs_group_posts for select to authenticated using (true);
drop policy if exists cs_group_posts_write on public.cs_group_posts;
create policy cs_group_posts_write on public.cs_group_posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists cs_group_posts_delete on public.cs_group_posts;
create policy cs_group_posts_delete on public.cs_group_posts for delete to authenticated using (user_id = auth.uid());

-- Certificates are issued by the RPC below, never inserted directly.
drop policy if exists cs_certificates_own on public.cs_certificates;
create policy cs_certificates_own on public.cs_certificates for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.cs_certificates from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Functions
-- ---------------------------------------------------------------------------

-- Remember where a learner is in a course, and close the course when every
-- lesson is done. Called after each progress write.
create or replace function public.cs_touch_enrollment(p_org uuid, p_lesson text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_course text;
  v_total  int;
  v_done   int;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  select course_id into v_course from cs_lessons where organization_id = p_org and id = p_lesson;
  if v_course is null then return; end if;

  insert into cs_enrollments (organization_id, user_id, course_id, last_lesson_id)
  values (p_org, v_uid, v_course, p_lesson)
  on conflict (organization_id, user_id, course_id) do update set last_lesson_id = excluded.last_lesson_id;

  select count(*) into v_total from cs_lessons where organization_id = p_org and course_id = v_course;
  select count(*) into v_done from cs_lesson_progress p
    join cs_lessons l on l.organization_id = p.organization_id and l.id = p.lesson_id
   where p.organization_id = p_org and p.user_id = v_uid and l.course_id = v_course and p.completed_at is not null;

  if v_total > 0 and v_done >= v_total then
    update cs_enrollments set completed_at = coalesce(completed_at, now())
     where organization_id = p_org and user_id = v_uid and course_id = v_course;
  end if;
end $$;
grant execute on function public.cs_touch_enrollment(uuid, text) to authenticated;

-- A certificate is earned, not inserted: the server checks every lesson is
-- complete, then mints one (idempotent).
create or replace function public.cs_issue_certificate(p_org uuid, p_course text)
returns table (id uuid, code text, issued_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_total int;
  v_done  int;
  v_code  text;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  select count(*) into v_total from cs_lessons where organization_id = p_org and course_id = p_course;
  select count(*) into v_done from cs_lesson_progress p
    join cs_lessons l on l.organization_id = p.organization_id and l.id = p.lesson_id
   where p.organization_id = p_org and p.user_id = v_uid and l.course_id = p_course and p.completed_at is not null;
  if v_total = 0 or v_done < v_total then
    raise exception 'Finish every lesson first (% of % done)', v_done, v_total;
  end if;

  v_code := 'CS-' || upper(regexp_replace(p_course, '^c-', '')) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  insert into cs_certificates (organization_id, user_id, course_id, code)
  values (p_org, v_uid, p_course, v_code)
  on conflict (organization_id, user_id, course_id) do nothing;

  insert into cs_notifications (organization_id, user_id, kind, title, body, href)
  select p_org, v_uid, 'certificate', 'Certificate earned', c.title, '/certificates/' || ct.id
    from cs_certificates ct join cs_courses c on c.organization_id = ct.organization_id and c.id = ct.course_id
   where ct.organization_id = p_org and ct.user_id = v_uid and ct.course_id = p_course and ct.issued_at > now() - interval '5 seconds';

  return query select ct.id, ct.code, ct.issued_at from cs_certificates ct
   where ct.organization_id = p_org and ct.user_id = v_uid and ct.course_id = p_course;
end $$;
grant execute on function public.cs_issue_certificate(uuid, text) to authenticated;

-- Live inbox: messages and notifications reach an open session without a reload.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cs_messages') then
      alter publication supabase_realtime add table public.cs_messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cs_notifications') then
      alter publication supabase_realtime add table public.cs_notifications;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. The starter school — cs_seed_org(p_org)
--
-- Mirrors businesses/coir-six/src/data/seed.ts. Idempotent per tenant, so it
-- can re-run to refresh the starter content without touching learner rows.
-- Videos are public YouTube lectures on each subject; `source` credits the
-- channel. Image paths are relative to the app's own host.
-- ---------------------------------------------------------------------------
create or replace function public.cs_seed_org(p_org uuid) returns void
language plpgsql security definer set search_path = public as $seed$
begin
  insert into cs_categories (organization_id, id, name, blurb, sort)
  select p_org, v.* from (values
    ('fe', 'Front End',    'HTML, CSS, JavaScript and the frameworks on top', 0),
    ('ux', 'UI/UX Design', 'Research, interaction, interface and design systems', 1),
    ('br', 'Branding',     'Identity, voice and the image a company puts out', 2)
  ) as v(id, name, blurb, sort)
  on conflict (organization_id, id) do update set name = excluded.name, blurb = excluded.blurb, sort = excluded.sort;

  insert into cs_mentors (organization_id, id, name, role, bio, hue, photo_url, handle, followers, expertise)
  select p_org, v.* from (values
    ('m-padhang',  'Padhang Satrio',   'Product Designer · Mentor', $b$Fifteen years designing products people keep. Runs design-system practice at a fintech and teaches the parts nobody writes down.$b$, 'sky',   '/images/mentor-padhang.jpg',  'padhang',  12800, '{ux,br}'::text[]),
    ('m-zakir',    'Zakir Horizontal', 'Brand Strategist · Mentor', $b$Names, voices and rebrands for companies that had outgrown their first logo. Believes a brand is what you do when nobody is watching.$b$, 'peach', '/images/mentor-zakir.jpg',    'zakir',     8400, '{br}'::text[]),
    ('m-leonardo', 'Leonardo Samsul',  'Front-End Lead · Mentor',   $b$Ships front ends for a living and teaches the fundamentals underneath the frameworks. Patient with beginners, allergic to magic.$b$, 'mint',  '/images/mentor-leonardo.jpg', 'leonardo', 21500, '{fe}'::text[]),
    ('m-bayu',     'Bayu Salto',       'UX Researcher · Mentor',    $b$Turns interviews into decisions. Has run research sprints for three unicorns and one bakery, and rates the bakery highest.$b$, 'rose',  '/images/mentor-bayu.jpg',     'bayu',      6900, '{ux}'::text[]),
    ('m-amara',    'Amara Osei',       'CSS Specialist · Mentor',   $b$Layout is a language and she is fluent. Grid, container queries and the parts of CSS that make senior engineers nervous.$b$, 'lilac', '/images/mentor-amara.jpg',    'amara',     9700, '{fe}'::text[]),
    ('m-mei',      'Mei Tanaka',       'Design Lead · Mentor',      $b$Leads design at a health-tech scale-up. Teaches how to run research that changes what gets built, not just what gets said.$b$, 'plum',  '/images/mentor-mei.jpg',      'mei',       5300, '{ux}'::text[])
  ) as v(id, name, role, bio, hue, photo_url, handle, followers, expertise)
  on conflict (organization_id, id) do update set name = excluded.name, role = excluded.role, bio = excluded.bio, hue = excluded.hue, photo_url = excluded.photo_url, handle = excluded.handle, followers = excluded.followers, expertise = excluded.expertise;

  insert into cs_courses (organization_id, id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, published_at)
  select p_org, v.* from (values
    ('c-fe-beginner', 'front-end-beginners-guide', $b$Beginner's Guide to Becoming a Professional Front-End Developer$b$,
     $b$From a blank file to a deployed site: HTML, CSS and JavaScript the way working engineers actually use them.$b$,
     $b$This course takes you from zero to a front-end developer who can be trusted with a real ticket. You will build three small projects, learn to read documentation instead of copying tutorials, and finish with a portfolio site you deployed yourself.

Every lesson ends with something you can look at in a browser. There is no theory you will not use in the following lesson.$b$,
     'fe', 'm-leonardo', 'Beginner', 'fe', '/images/cover-fe-beginner.jpg', 4.9, 18420,
     '["Write semantic HTML a screen reader can navigate","Lay out a page with Flexbox and Grid without a framework","Fetch data and render it with plain JavaScript","Deploy a static site and read Lighthouse honestly"]'::jsonb, '2026-02-10'::timestamptz),
    ('c-fe-css', 'modern-css-layouts', $b$Modern CSS Layouts: Grid, Flexbox and Container Queries$b$,
     $b$Stop fighting the cascade. Layout that holds at every width, with the newest CSS that browsers finally agree on.$b$,
     $b$A layout course for people who can already write CSS but still reach for a framework when things get hard. We cover the mental model of Grid, when Flexbox is the right tool, and container queries — components that respond to the space they are in, not the viewport.$b$,
     'fe', 'm-amara', 'Intermediate', 'fe', '/images/cover-fe-css.jpg', 4.8, 7310,
     '["Choose Grid or Flexbox for the right reasons","Build a responsive card that never needs a media query","Use subgrid and container queries in production","Debug layout with the browser''s own tools"]'::jsonb, '2026-04-22'::timestamptz),
    ('c-fe-ts', 'typescript-for-react', $b$TypeScript for React Developers$b$,
     $b$Types that catch the bug before your user does — without turning every component into a puzzle.$b$,
     $b$You know React. This course adds the TypeScript you actually need: typing props and state, discriminated unions for UI state, generics where they earn their keep, and the compiler settings that make strict mode a friend rather than a wall.$b$,
     'fe', 'm-leonardo', 'Intermediate', 'mint', '/images/cover-fe-ts.jpg', 4.7, 5120,
     '["Type props, children and event handlers correctly","Model loading, error and success states with unions","Write a generic hook once and reuse it safely","Turn on strict mode without drowning in errors"]'::jsonb, '2026-06-03'::timestamptz),
    ('c-ux-optimize', 'optimizing-user-experience', $b$Optimizing User Experience with the Best UI/UX Design$b$,
     $b$The difference between a screen that looks finished and one that works — measured, tested and shipped.$b$,
     $b$Good UX is not taste; it is a series of decisions you can defend. This course walks the full loop — understand the task, sketch the flow, design the screen, test it with five people, fix what they stumbled on — using a real product as the running example.$b$,
     'ux', 'm-bayu', 'Beginner', 'ux', '/images/cover-ux-optimize.jpg', 4.9, 22910,
     '["Map a task before you draw a screen","Establish hierarchy with weight and colour, not size","Run a five-person usability test in an afternoon","Write findings that engineers act on"]'::jsonb, '2026-01-18'::timestamptz),
    ('c-ux-systems', 'design-systems-tokens-to-components', $b$Design Systems from Tokens to Components$b$,
     $b$One source of truth for colour, type and spacing — and the component library that grows out of it.$b$,
     $b$Design systems fail when they start with components. This course starts with tokens, builds primitives on top, and only then assembles the patterns teams actually reuse. You will document as you go, so the system explains itself to the next designer.$b$,
     'ux', 'm-padhang', 'Advanced', 'ux', '/images/cover-ux-systems.jpg', 4.8, 4880,
     '["Name tokens by role, never by appearance","Build a button that survives every state","Decide what belongs in the system and what does not","Ship documentation people read"]'::jsonb, '2026-05-14'::timestamptz),
    ('c-ux-research', 'research-sprints', $b$Research Sprints: Interviews to Insights$b$,
     $b$Five days from a question to a decision, with real customers in the room.$b$,
     $b$A research sprint is the fastest honest way to find out whether you are building the right thing. This course gives you the plan for a week: recruit, interview, synthesise, decide. Includes the scripts, the templates and the mistakes.$b$,
     'ux', 'm-mei', 'Intermediate', 'peach', '/images/cover-ux-research.jpg', 4.7, 3260,
     '["Recruit five of the right people in two days","Run an interview that does not lead the witness","Synthesise with affinity mapping in under three hours","Present one decision, not forty findings"]'::jsonb, '2026-07-01'::timestamptz),
    ('c-br-revive', 'reviving-company-image', $b$Reviving and Refreshing Company Image$b$,
     $b$When the brand no longer matches the business — how to change it without losing the people who already love it.$b$,
     $b$Most rebrands are redesigns that forgot to ask why. This course is the strategy first: audit what the brand means today, decide what must survive, and only then touch the mark, the palette and the voice. Two full case studies from brief to launch.$b$,
     'br', 'm-padhang', 'Intermediate', 'br', '/images/cover-br-revive.jpg', 4.8, 9140,
     '["Audit a brand honestly, including the parts that work","Write a brief a designer can actually use","Evolve a mark without alienating existing customers","Plan a rollout that does not surprise anyone"]'::jsonb, '2026-03-08'::timestamptz),
    ('c-br-voice', 'brand-voice', $b$Brand Voice: Writing that Sounds Like You$b$,
     $b$A voice guide people actually follow — from the homepage headline to the error message.$b$,
     $b$Every brand has a voice; most have it by accident. This course makes it deliberate: define three traits, write the rules that flow from them, and apply them to the hard cases — error states, legal copy, the apology email — where voice matters most.$b$,
     'br', 'm-zakir', 'Beginner', 'br', '/images/cover-br-voice.jpg', 4.6, 6020,
     '["Define a voice in three traits and their limits","Write microcopy that stays in character under pressure","Build a voice guide a team will keep using","Audit existing copy in an hour"]'::jsonb, '2026-06-20'::timestamptz)
  ) as v(id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, published_at)
  on conflict (organization_id, id) do update set slug = excluded.slug, title = excluded.title, blurb = excluded.blurb, description = excluded.description, category_id = excluded.category_id, mentor_id = excluded.mentor_id, level = excluded.level, theme = excluded.theme, cover_url = excluded.cover_url, rating = excluded.rating, learners = excluded.learners, outcomes = excluded.outcomes, published_at = excluded.published_at;

  insert into cs_modules (organization_id, id, course_id, title, sort)
  select p_org, v.* from (values
    ('mod-fe1-1','c-fe-beginner','Foundations',0), ('mod-fe1-2','c-fe-beginner','Layout & style',1), ('mod-fe1-3','c-fe-beginner','Behaviour & shipping',2),
    ('mod-fe2-1','c-fe-css','The layout mental model',0), ('mod-fe2-2','c-fe-css','Responding to space',1),
    ('mod-fe3-1','c-fe-ts','Typing the UI',0),
    ('mod-ux1-1','c-ux-optimize','Understand',0), ('mod-ux1-2','c-ux-optimize','Design & test',1),
    ('mod-ux2-1','c-ux-systems','Tokens first',0),
    ('mod-ux3-1','c-ux-research','The sprint week',0),
    ('mod-br1-1','c-br-revive','Strategy before style',0), ('mod-br1-2','c-br-revive','The refresh',1),
    ('mod-br2-1','c-br-voice','Finding the voice',0)
  ) as v(id, course_id, title, sort)
  on conflict (organization_id, id) do update set course_id = excluded.course_id, title = excluded.title, sort = excluded.sort;

  insert into cs_lessons (organization_id, id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, sort)
  select p_org, l.id, l.course_id, l.module_id, l.title, l.kind, l.duration_sec,
         case when l.yt is null then null else 'https://www.youtube.com/watch?v=' || l.yt end,
         null,
         coalesce(l.source, ''),
         l.body, l.sort
  from (values
    ('l-fe1-1','c-fe-beginner','mod-fe1-1','What a front-end developer actually does','video',107,'9mY70fWMMdM','Codecademy',$b$Before a line of code: what the job is, what it is not, and the three skills that separate someone who can follow a tutorial from someone who can be handed a ticket.$b$,0),
    ('l-fe1-2','c-fe-beginner','mod-fe1-1','HTML that means something','video',572,'YOsMJQfwqow','Kevin Powell',$b$Semantic elements, the document outline, and why a screen reader is the fastest way to find out whether your HTML is any good.$b$,1),
    ('l-fe1-3','c-fe-beginner','mod-fe1-2','The cascade, without the fear','video',807,'c0kfcP_nD9E','Kevin Powell',$b$Specificity, inheritance and the box model — the three things that explain nearly every 'why is my CSS not working' question.$b$,2),
    ('l-fe1-4','c-fe-beginner','mod-fe1-2','Flexbox in one page','article',480,null,null,$b$Flexbox solves one problem: distributing space along a single line. Once you accept that, everything else is a property on either the container or the items.

The container decides the direction (`flex-direction`), whether items wrap (`flex-wrap`), and how leftover space is shared along the main axis (`justify-content`) and the cross axis (`align-items`).

The items decide how much they are allowed to grow (`flex-grow`), shrink (`flex-shrink`) and what they start at (`flex-basis`). The shorthand `flex: 1` means 'grow to fill, shrink if you must, start from nothing' — which is what you want nine times out of ten.

The mistake everyone makes: reaching for Flexbox to build a two-dimensional grid. If you find yourself nesting three flex containers to get rows and columns to line up, stop. That is what Grid is for, and it is the next lesson.$b$,3),
    ('l-fe1-5','c-fe-beginner','mod-fe1-3','Fetching data and rendering it','video',395,'cuEtnrL9-H0','Web Dev Simplified',$b$fetch, promises and the DOM: pulling a list from an API and turning it into elements without a framework, so you understand what the framework will later do for you.$b$,4),
    ('l-fe1-6','c-fe-beginner','mod-fe1-3','Module check: foundations','quiz',300,null,null,$b$A short check on the module. Three questions; you can retake it as often as you like.$b$,5),
    ('l-fe2-1','c-fe-css','mod-fe2-1','Grid is a coordinate system','video',2223,'rg7Fvvl3taU','Kevin Powell',$b$Tracks, lines, areas. The mental model that makes Grid obvious, and the three properties you will use for 90% of layouts.$b$,0),
    ('l-fe2-2','c-fe-css','mod-fe2-2','Container queries: components that respond to their box','video',1463,'3_-Je5XpbqY','Kevin Powell',$b$A card that is one column in a sidebar and three in the main area — with no media queries and no JavaScript.$b$,1),
    ('l-fe2-3','c-fe-css','mod-fe2-2','Subgrid and when you need it','article',420,null,null,$b$Subgrid lets a nested element take its track sizing from its parent grid, so card contents line up ACROSS cards, not just within them.

The classic case: a row of cards whose titles are different lengths. Without subgrid, the 'price' row in each card sits at a different height. With `grid-template-rows: subgrid` on each card, every card's rows share the parent's tracks and everything aligns.

Use it when alignment across siblings matters. Do not use it as a general layout tool — a plain grid on the parent is usually simpler.$b$,2),
    ('l-fe3-1','c-fe-ts','mod-fe3-1','Typing props without fighting the compiler','video',1524,'1RPUt4es9Ns','Sunny Sood',$b$Interfaces vs types, children, optional props and the handful of React types you will look up constantly until you don't.$b$,0),
    ('l-fe3-2','c-fe-ts','mod-fe3-1','Discriminated unions for UI state','article',540,null,null,$b$Every async screen has at least three states: loading, error, and success with data. Modelling them as three booleans invites the impossible combinations — loading AND error, success with no data.

A discriminated union makes the impossible states unrepresentable:

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Item[] }

Now `switch (state.status)` narrows the type in each branch, the compiler insists you handle every case, and adding a fourth state ('empty', say) produces errors exactly where the UI needs to change.

This single pattern removes a category of bugs from every data-driven component you write.$b$,1),
    ('l-fe3-3','c-fe-ts','mod-fe3-1','Module check: typing the UI','quiz',300,null,null,$b$A short check on the module. Three questions; you can retake it as often as you like.$b$,2),
    ('l-ux1-1','c-ux-optimize','mod-ux1-1','Understand of UI/UX design','video',196,'5KUNmgt_pvY','NNgroup',$b$What UX is measured by, what UI is responsible for, and why the two are argued about by people who have never shipped either.$b$,0),
    ('l-ux1-2','c-ux-optimize','mod-ux1-1','Map the task before the screen','video',226,'dsviXwJwslI','NNgroup',$b$A task flow on paper takes ten minutes and saves a week. How to draw one, and what it tells you that a wireframe never will.$b$,1),
    ('l-ux1-3','c-ux-optimize','mod-ux1-2','Hierarchy through weight, not size','video',2918,'crGNE8cKQ9o','Design Pilot',$b$A tight type scale, three text colours and one loud accent — how a calm interface tells you where to look without shouting.$b$,2),
    ('l-ux1-4','c-ux-optimize','mod-ux1-2','The five-person test','article',600,null,null,$b$Five people find roughly 85% of the usability problems in a design. The sixth mostly finds what the first five already found.

The method fits in an afternoon. Write three tasks in the user's words ('find out how much delivery costs'), not the interface's ('locate the shipping information section'). Recruit five people who resemble your users. Sit beside each one, give them a task, and say nothing.

When they get stuck, do not help. Ask 'what are you thinking?' and write down exactly what they say. The stumble IS the finding.

Afterwards, list every stumble, count how many people hit each one, and fix the ones two or more hit. Then test again. The second round is faster and the design is measurably better — not prettier, better.$b$,3),
    ('l-ux2-1','c-ux-systems','mod-ux2-1','Tokens are the system','video',792,'JyCmacSyDY4','Figma',$b$Colour, type, spacing, radius, elevation — named by role, never by appearance — and why every component that follows becomes easier because of it.$b$,0),
    ('l-ux2-2','c-ux-systems','mod-ux2-1','Module check: tokens','quiz',300,null,null,$b$A short check on the module. Three questions; you can retake it as often as you like.$b$,1),
    ('l-ux3-1','c-ux-research','mod-ux3-1','Day one: the question','video',183,'jy-QGuWE7PQ','NNgroup',$b$A sprint is only as good as the question it starts with. How to write one you can actually answer in five days, and how to recruit around it.$b$,0),
    ('l-ux3-2','c-ux-research','mod-ux3-1','Interviews that don''t lead the witness','article',540,null,null,$b$The worst interview question is 'would you use this?' Everyone says yes. The best one is 'tell me about the last time you…' — because a story about the past cannot be polite about the future.

Open with the story. Follow the thread: 'what happened next?', 'what did you do then?', 'how did that feel?'. Never suggest an answer; when you catch yourself about to, pause instead. Silence is the most productive question you own.

Record everything and take notes anyway — the notes are your first pass at synthesis. By the end of five interviews, patterns will already be visible in your own handwriting.$b$,1),
    ('l-br1-1','c-br-revive','mod-br1-1','Audit before you touch anything','video',1046,'frolJ7Qq_oc','Elements Brand Management',$b$What the brand means to customers today — measured, not assumed — and the parts that are working which a rebrand must not break.$b$,0),
    ('l-br1-2','c-br-revive','mod-br1-1','Writing the brief','video',567,'4S8Nf6KTwtM','Will Paterson',$b$The one-page brief that keeps a rebrand honest: what must change, what must survive, and how you will know it worked.$b$,1),
    ('l-br1-3','c-br-revive','mod-br1-2','Evolve the mark, don''t replace it','article',480,null,null,$b$The most expensive rebrands are the ones that threw away recognition. A mark carries years of accumulated meaning; a refresh should spend that equity, not burn it.

Start by listing what people recognise: the silhouette, the colour, a letterform. Keep at least two. Modernise the rest — proportions, weight, how it behaves at 16 pixels — and test the old and new side by side with customers. If they can tell it is the same company at a glance, you have a refresh. If they cannot, you have a new brand and a marketing budget to match.$b$,2),
    ('l-br1-4','c-br-revive','mod-br1-2','Palette and type for a refresh','video',2486,'Co75kmQtbaA','Flux Academy',$b$Choosing a palette that ages well and a type pairing that does the work of a hundred guidelines.$b$,3),
    ('l-br1-5','c-br-revive','mod-br1-2','Module check: the refresh','quiz',300,null,null,$b$A short check on the module. Three questions; you can retake it as often as you like.$b$,4),
    ('l-br2-1','c-br-voice','mod-br2-1','Three traits and their limits','video',58,'uDaZZt91MVo','The Futur',$b$'Friendly but not chummy. Confident but not smug.' A voice is defined as much by what it never does as what it does.$b$,0),
    ('l-br2-2','c-br-voice','mod-br2-1','Voice under pressure: the error message','article',420,null,null,$b$Anyone can sound like the brand on the homepage. The test is the 500 error, the declined card, the 'we are sorry' email.

Under pressure, three rules hold. Say what happened in plain words. Say what the person can do next. Do not perform sympathy you cannot back with action.

'Something went wrong' fails all three. 'We could not save your changes — check your connection and try again; your draft is still here' passes, and it sounds like a company that has thought about you.$b$,1),
    ('l-br2-3','c-br-voice','mod-br2-1','Module check: voice','quiz',300,null,null,$b$A short check on the module. Three questions; you can retake it as often as you like.$b$,2)
  ) as l(id, course_id, module_id, title, kind, duration_sec, yt, source, body, sort)
  on conflict (organization_id, id) do update set course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title, kind = excluded.kind, duration_sec = excluded.duration_sec, video_url = excluded.video_url, captions_url = excluded.captions_url, source = excluded.source, body = excluded.body, sort = excluded.sort;

  insert into cs_quiz_questions (organization_id, id, lesson_id, prompt, options, answer, explanation, sort)
  select p_org, v.* from (values
    ('q-fe1-1','l-fe1-6',$b$Which element should wrap the main navigation of a page?$b$,'["<div class=\"nav\">","<nav>","<menu>","<section>"]'::jsonb,1,$b$<nav> announces a navigation landmark to assistive technology; a div announces nothing.$b$,0),
    ('q-fe1-2','l-fe1-6',$b$`flex: 1` on an item is shorthand for…$b$,'["grow 1, shrink 0, basis auto","grow 1, shrink 1, basis 0","grow 0, shrink 1, basis auto","grow 1, shrink 1, basis 100%"]'::jsonb,1,$b$flex: 1 → 1 1 0: grow to fill, shrink if needed, start from nothing.$b$,1),
    ('q-fe1-3','l-fe1-6',$b$Which fetches JSON correctly?$b$,'["fetch(url).json()","await fetch(url).then(r => r.json())","JSON.parse(fetch(url))","fetch(url, ''json'')"]'::jsonb,1,$b$fetch resolves to a Response; .json() reads and parses the body.$b$,2),
    ('q-fe3-1','l-fe3-3',$b$The main benefit of a discriminated union for UI state is…$b$,'["Shorter code","Impossible states can''t be represented","Faster rendering","No need for useState"]'::jsonb,1,$b$Each variant carries only the fields valid for that state, so 'loading and error' cannot exist.$b$,0),
    ('q-fe3-2','l-fe3-3',$b$How do you type a component's children?$b$,'["children: string","children: JSX","children: React.ReactNode","children: any"]'::jsonb,2,$b$ReactNode covers elements, strings, numbers, fragments, null — everything React can render.$b$,1),
    ('q-fe3-3','l-fe3-3',$b$When should you write a generic hook?$b$,'["Always","When two callers need different data shapes and the logic is identical","Never in React","Only for API calls"]'::jsonb,1,$b$Generics earn their keep when the behaviour is shared and only the type varies.$b$,2),
    ('q-ux2-1','l-ux2-2',$b$A well-named token is…$b$,'["color-purple-600","color-brand-primary","color-button","purple"]'::jsonb,1,$b$Role, not appearance: a rebrand changes the value, and every use keeps meaning.$b$,0),
    ('q-ux2-2','l-ux2-2',$b$What should a design system start with?$b$,'["Components","Tokens","Page templates","Icons"]'::jsonb,1,$b$Components built before tokens each invent their own values and the system never converges.$b$,1),
    ('q-ux2-3','l-ux2-2',$b$How many states must a button component handle at minimum?$b$,'["Two: default and hover","Three: default, hover, disabled","Five: default, hover, focus, disabled, loading","One"]'::jsonb,2,$b$Focus is not optional — keyboard users depend on it — and loading prevents double submits.$b$,2),
    ('q-br1-1','l-br1-5',$b$The first step of a rebrand is…$b$,'["A new logo","An audit of what the brand means today","A new tagline","Picking a palette"]'::jsonb,1,$b$You cannot decide what to change until you know what is working.$b$,0),
    ('q-br1-2','l-br1-5',$b$A refresh keeps at least…$b$,'["The old website","Two recognisable elements of the mark","The same agency","The founder''s signature"]'::jsonb,1,$b$Recognition is equity; keeping two elements lets customers tell it is still you.$b$,1),
    ('q-br1-3','l-br1-5',$b$A good brief states…$b$,'["Only the deliverables","What must change, what must survive, and how success is measured","The budget","The colours"]'::jsonb,1,$b$Without 'what must survive' the designer optimises for novelty.$b$,2),
    ('q-br2-1','l-br2-3',$b$A brand voice is best defined by…$b$,'["A list of adjectives","Three traits with their limits","The founder''s personality","The competitor''s voice"]'::jsonb,1,$b$'Confident but not smug' is actionable; 'confident' alone is not.$b$,0),
    ('q-br2-2','l-br2-3',$b$The best test of a voice is…$b$,'["The homepage headline","The error message","The logo","The pitch deck"]'::jsonb,1,$b$Anyone sounds good on the homepage; the voice is tested when something went wrong.$b$,1),
    ('q-br2-3','l-br2-3',$b$A good error message does NOT…$b$,'["Say what happened","Say what to do next","Perform sympathy it can''t back with action","Use plain words"]'::jsonb,2,$b$'We''re so sorry' with no remedy is a performance, not help.$b$,2)
  ) as v(id, lesson_id, prompt, options, answer, explanation, sort)
  on conflict (organization_id, id) do update set lesson_id = excluded.lesson_id, prompt = excluded.prompt, options = excluded.options, answer = excluded.answer, explanation = excluded.explanation, sort = excluded.sort;

  -- Live sessions, dated relative to today so the schedule is always alive.
  insert into cs_live_lessons (organization_id, id, mentor_id, category_id, title, description, starts_at, duration_min, join_url, recording_url)
  select p_org, v.* from (values
    ('live-1','m-padhang','ux',$b$Understand of UI/UX design — live Q&A$b$,$b$Bring a screen you are stuck on. We will pull three apart together and talk through hierarchy, spacing and the one change that fixes most of them.$b$, date_trunc('day', now()) - interval '18 days' + interval '16 hours', 60, 'https://meet.example.com/coir-six/live-1', 'https://www.youtube.com/watch?v=s91jO5UIfGY'),
    ('live-2','m-leonardo','fe',$b$Office hours: your first deploy$b$,$b$Deploying a static site end to end, then debugging the three things that always go wrong on the first attempt.$b$, date_trunc('day', now()) + interval '1 day' + interval '18 hours', 45, 'https://meet.example.com/coir-six/live-2', null),
    ('live-3','m-bayu','ux',$b$Watch a usability test, live$b$,$b$A real participant, a real prototype, and a running commentary on what to notice. The fastest way to learn to moderate.$b$, date_trunc('day', now()) + interval '3 days' + interval '13 hours', 60, 'https://meet.example.com/coir-six/live-3', null),
    ('live-4','m-zakir','br',$b$Brand voice clinic$b$,$b$Send your homepage copy in advance; we rewrite the weakest paragraph on screen.$b$, date_trunc('day', now()) + interval '6 days' + interval '17 hours', 50, 'https://meet.example.com/coir-six/live-4', null),
    ('live-5','m-amara','fe',$b$Container queries in production$b$,$b$Real components from a real codebase, refactored from media queries to container queries, with the gotchas.$b$, date_trunc('day', now()) + interval '9 days' + interval '12 hours', 60, 'https://meet.example.com/coir-six/live-5', null),
    ('live-6','m-mei','ux',$b$Synthesis workshop$b$,$b$Bring five interviews' worth of notes. Leave with three themes and one decision.$b$, date_trunc('day', now()) - interval '5 days' + interval '15 hours', 90, 'https://meet.example.com/coir-six/live-6', 'https://www.youtube.com/watch?v=C4nYxZxteJY')
  ) as v(id, mentor_id, category_id, title, description, starts_at, duration_min, join_url, recording_url)
  on conflict (organization_id, id) do update set mentor_id = excluded.mentor_id, category_id = excluded.category_id, title = excluded.title, description = excluded.description, starts_at = excluded.starts_at, duration_min = excluded.duration_min, join_url = excluded.join_url, recording_url = excluded.recording_url;

  insert into cs_groups (organization_id, id, name, category_id, blurb, members, image_url)
  select p_org, v.* from (values
    ('g-fe-study','Front-End Study Circle','fe',$b$Weekly accountability for the beginner's course. Share what you built, get unstuck.$b$,1240,'/images/group-fe-study.jpg'),
    ('g-css','CSS Layout Lab','fe',$b$Grid puzzles, container-query experiments and the occasional argument about margins.$b$,612,'/images/group-css.jpg'),
    ('g-ux-crit','UX Critique Club','ux',$b$Post a screen, get three honest critiques within a day. Be kind, be specific.$b$,2380,'/images/group-ux-crit.jpg'),
    ('g-research','Research Practitioners','ux',$b$Interview scripts, recruiting tips and synthesis templates from people doing it weekly.$b$,890,'/images/group-research.jpg'),
    ('g-brand','Brand Builders','br',$b$Rebrands in progress, voice guides in draft, and case studies dissected.$b$,731,'/images/group-brand.jpg')
  ) as v(id, name, category_id, blurb, members, image_url)
  on conflict (organization_id, id) do update set name = excluded.name, category_id = excluded.category_id, blurb = excluded.blurb, members = excluded.members, image_url = excluded.image_url;
end $seed$;

-- ---------------------------------------------------------------------------
-- 6. Provision: a business created from this blueprint gets the starter school
-- ---------------------------------------------------------------------------
create or replace function public.cs_seed_on_provision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.blueprint_id is not null
     and exists (select 1 from blueprints b where b.id = new.blueprint_id and b.slug = 'coir-six') then
    perform cs_seed_org(new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_org_seed_coir_six on organizations;
create trigger trg_org_seed_coir_six after insert on organizations
  for each row execute function public.cs_seed_on_provision();

-- ---------------------------------------------------------------------------
-- 7. Blueprint — £2,500 one-time, priced in GBP like Ferne.
-- ---------------------------------------------------------------------------
insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency,
                        cover_url, demo_url, verified, ai_included, status, app_path, subdomain_base, metrics, preset)
values (
  'coir-six',
  'Coir Six Learning',
  'An online-course platform — video lessons, quizzes, live sessions, groups, certificates and a learner dashboard.',
  'A complete online school: a glance-first learner dashboard that shows momentum and what to do next, courses built from video lectures, articles and quizzes with resume and auto-complete, live mentor sessions with recordings, study groups, tasks, timestamped notes, an inbox, a weekly goal and streak, and certificates earned only when every lesson is done. Ships with a starter catalogue of eight courses so the school works on day one. Multi-tenant by host, built in React and ready to brand.',
  'Education',
  'premium',
  250000,
  'GBP',
  'https://images.pexels.com/photos/574069/pexels-photo-574069.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
  'https://demo.coir-six.phoxta.com',
  true, false, 'live',
  'businesses/coir-six',
  'coir-six.phoxta.com',
  '{"built": true, "app": "businesses/coir-six"}'::jsonb,
  '{"currency": "GBP", "school": true}'::jsonb
)
on conflict (slug) do update set
  name           = excluded.name,
  tagline        = excluded.tagline,
  description    = excluded.description,
  vertical       = excluded.vertical,
  tier           = excluded.tier,
  price_cents    = excluded.price_cents,
  currency       = excluded.currency,
  cover_url      = excluded.cover_url,
  demo_url       = excluded.demo_url,
  verified       = excluded.verified,
  ai_included    = excluded.ai_included,
  app_path       = excluded.app_path,
  subdomain_base = excluded.subdomain_base,
  metrics        = excluded.metrics,
  preset         = excluded.preset,
  status         = 'live';

-- ---------------------------------------------------------------------------
-- 8. Demo tenant + showcase host + starter school
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_org uuid;
begin
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc limit 1;
  if v_uid is null then raise notice '[coir-six seed] no auth user yet — skipping tenant'; return; end if;

  select id into v_org from organizations where slug = 'coir-six-demo';
  if v_org is null then
    -- Branding carries the NAME only: the demo has to look exactly like the
    -- app a buyer is being shown.
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage, lifecycle_stage,
                               app_path, modules, branding, profile, currency, provisioned_at)
    select v_uid, 'Coir Six', 'coir-six-demo', coalesce(b.vertical, 'Education'), b.id, 'trial', 'operating',
           coalesce(b.app_path, 'businesses/coir-six'), coalesce(b.preset, '{}'::jsonb),
           $b$ {"name":"Coir Six","tagline":"Sharpen your skills with professional online courses"} $b$::jsonb,
           $p$ {
             "address": "Ducie Street Warehouse, 51 Dale Street, Manchester M1 2HF",
             "phone": "+44 161 250 8890",
             "email": "hello@coirsix.example",
             "mapQuery": "Dale Street, Manchester M1 2HF",
             "hours": [
               {"day":"Monday","open":"09:00","close":"18:00","closed":false},
               {"day":"Tuesday","open":"09:00","close":"18:00","closed":false},
               {"day":"Wednesday","open":"09:00","close":"18:00","closed":false},
               {"day":"Thursday","open":"09:00","close":"18:00","closed":false},
               {"day":"Friday","open":"09:00","close":"17:00","closed":false},
               {"day":"Saturday","closed":true},
               {"day":"Sunday","closed":true}
             ]
           } $p$::jsonb,
           'GBP',
           now()
    from blueprints b where b.slug = 'coir-six'
    returning id into v_org;
    raise notice '[coir-six seed] org created %', v_org;
  end if;

  -- The showcase host and the buyer-style host, both live. The org-insert
  -- trigger may already have created the buyer-style one; on conflict we
  -- reassert it.
  insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
  values (v_org, 'demo.coir-six.phoxta.com',          'subdomain', false, 'live', 'issued', now()),
         (v_org, 'coir-six-demo.coir-six.phoxta.com', 'subdomain', true,  'live', 'issued', now())
  on conflict (hostname) do update
    set organization_id = excluded.organization_id,
        status          = 'live',
        tls_status      = 'issued',
        verified_at     = coalesce(domains.verified_at, now());

  -- The provision trigger seeds a NEW org; an org that already existed gets
  -- the same starter school here (idempotent either way).
  perform cs_seed_org(v_org);
  raise notice '[coir-six seed] starter school in place for %', v_org;
end $$;
