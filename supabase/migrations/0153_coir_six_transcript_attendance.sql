-- ---------------------------------------------------------------------------
-- Coir Six — what was said, and what attending is worth
--
-- Two things:
--   1. `cs_live_transcript` — the captions, kept. A class that has been
--      transcribed is searchable, quotable and summarisable afterwards;
--      captions that exist only on screen are gone the moment they scroll.
--   2. Attendance counts toward a certificate.
-- ---------------------------------------------------------------------------

-- 1. The transcript -----------------------------------------------------------

create table if not exists public.cs_live_transcript (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  live_lesson_id  text not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- Denormalised like cs_live_chat: a transcript must still read correctly
  -- months later, under the name the speaker had at the time.
  speaker_name    text not null default '',
  text            text not null,
  said_at         timestamptz not null default now(),
  foreign key (organization_id, live_lesson_id) references public.cs_live_lessons(organization_id, id) on delete cascade
);
create index if not exists cs_live_transcript_lesson_idx
  on public.cs_live_transcript (organization_id, live_lesson_id, said_at);

alter table public.cs_live_transcript enable row level security;
grant select, insert on public.cs_live_transcript to authenticated;
drop policy if exists cs_live_transcript_read on public.cs_live_transcript;
-- Same tenancy rule as the roster and the chat (0150): your own school only.
create policy cs_live_transcript_read on public.cs_live_transcript
  for select to authenticated using (cs_is_member(organization_id));
drop policy if exists cs_live_transcript_write on public.cs_live_transcript;
create policy cs_live_transcript_write on public.cs_live_transcript
  for insert to authenticated with check (user_id = auth.uid() and cs_is_member(organization_id));
-- Nobody edits the record of what was said, including the person who said it.
revoke update, delete on public.cs_live_transcript from authenticated;

-- 1b. The recap ---------------------------------------------------------------
-- Written once by coir-live-recap and shared by everyone who opens the lesson:
-- a recap is deterministic enough that regenerating it per viewer would be
-- spending tokens to produce the same paragraphs.
alter table public.cs_live_lessons add column if not exists recap jsonb;

-- 2. Attendance counts --------------------------------------------------------
--
-- A live session can belong to a course. When it does, attending it counts
-- toward that course's certificate exactly as finishing a lesson does.
--
-- NOTHING IS LINKED BY DEFAULT, and that is deliberate: the requirement is
-- `done >= total`, so linking a session a learner has not attended would make
-- an already-earned certificate unobtainable. A school opts in by setting
-- course_id, ideally on sessions it runs from now on.
alter table public.cs_live_lessons add column if not exists course_id text;

do $$ begin
  alter table public.cs_live_lessons
    add constraint cs_live_lessons_course_fk
    foreign key (organization_id, course_id) references public.cs_courses(organization_id, id);
exception when duplicate_object then null; end $$;

create index if not exists cs_live_lessons_course_idx
  on public.cs_live_lessons (organization_id, course_id) where course_id is not null;

/** Minutes in the room that count as having attended. Turning up for ninety
    seconds is not attendance; nor should a dropped connection cost it, which is
    why cs_live_participants.seconds accumulates across rejoins. */
create or replace function public.cs_live_attendance_floor() returns integer
language sql immutable as $$ select 300 $$;

create or replace function public.cs_issue_certificate(p_org uuid, p_course text)
returns table (id uuid, code text, issued_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_total      int;
  v_done       int;
  v_live_total int;
  v_live_done  int;
  v_code       text;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;

  select count(*) into v_total from cs_lessons where organization_id = p_org and course_id = p_course;
  select count(*) into v_done
    from cs_lesson_progress p
    join cs_lessons l on l.organization_id = p.organization_id and l.id = p.lesson_id
   where p.organization_id = p_org and p.user_id = v_uid and l.course_id = p_course
     and p.completed_at is not null;

  -- Live sessions tied to this course count the same as lessons.
  select count(*) into v_live_total
    from cs_live_lessons where organization_id = p_org and course_id = p_course;
  select count(*) into v_live_done
    from cs_live_participants a
    join cs_live_lessons l
      on l.organization_id = a.organization_id and l.id = a.live_lesson_id
   where a.organization_id = p_org and a.user_id = v_uid and l.course_id = p_course
     and a.seconds >= cs_live_attendance_floor();

  if (v_total + v_live_total) = 0 or (v_done + v_live_done) < (v_total + v_live_total) then
    raise exception 'Finish every lesson first (% of % done)',
      v_done + v_live_done, v_total + v_live_total;
  end if;

  v_code := 'CS-' || upper(regexp_replace(p_course, '^c-', '')) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

  insert into cs_certificates (organization_id, user_id, course_id, code)
  values (p_org, v_uid, p_course, v_code)
  on conflict (organization_id, user_id, course_id) do nothing;

  insert into cs_notifications (organization_id, user_id, kind, title, body, href)
  select p_org, v_uid, 'certificate', 'Certificate issued',
         'Your certificate is ready to view and share.',
         '/certificates/' || ct.id
    from cs_certificates ct
   where ct.organization_id = p_org and ct.user_id = v_uid and ct.course_id = p_course;

  return query
    select ct.id, ct.code, ct.issued_at
      from cs_certificates ct
     where ct.organization_id = p_org and ct.user_id = v_uid and ct.course_id = p_course;
end $$;
grant execute on function public.cs_issue_certificate(uuid, text) to authenticated;
grant execute on function public.cs_live_attendance_floor() to authenticated;

-- Realtime for the transcript, same idempotent shape as 0147/0150.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cs_live_transcript') then
      alter publication supabase_realtime add table public.cs_live_transcript;
    end if;
  end if;
end $$;
