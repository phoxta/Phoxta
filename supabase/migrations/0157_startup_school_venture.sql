-- ---------------------------------------------------------------------------
-- The venture record, session briefs, and the cohort signal
--
-- One structured document per founder, per school. Every AI feature in this
-- app reads it, and that is the point: a model is useful here because it has
-- context about THIS business, not because it is clever. Without a venture
-- record each feature starts from nothing and produces generic advice, which
-- is the failure mode the evidence on AI tutoring keeps finding.
--
-- The shape follows the handbook's journey rather than inventing one, so the
-- courses, the tools and the mentor brief all describe the same object:
--
--   founder      fit scores, gaps, the three must-haves
--   opportunity  the problem, the ten market questions with confidence + test
--   model        the five questions, positioning, what you are deliberately not
--   legal        form, jurisdiction, the founder agreement's open terms
--   plan         the one-liner, the ask, the use of funds
--   money        launch capital, the source stack, runway
--   traction     customers, revenue, the metric set
--   asks         what this founder currently needs help with
--
-- Kept as jsonb rather than forty columns because the sections are edited as
-- wholes by the tools that own them, and because a stage a founder has not
-- reached should be absent rather than a row of nulls. The few fields that are
-- queried — stage, country — are promoted to real columns.
-- ---------------------------------------------------------------------------

create table if not exists public.cs_ventures (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '',
  one_liner  text not null default '',
  -- Where they are on the journey. Drives the adviser's tone and the brief.
  stage      text not null default 'fit'
    check (stage in ('fit','opportunity','model','legal','plan','capital','launch','growth','scale','harvest')),
  -- Jurisdiction changes the legal form, the funding sources and the payment
  -- rails. Asked once and remembered, never a footnote.
  country    text not null default '',
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.cs_ventures enable row level security;

-- A founder owns their venture record outright. Mentors do NOT get a blanket
-- read: they see it through the session brief, for a booking that exists, which
-- keeps "who can see my business" answerable in one sentence.
drop policy if exists cs_ventures_own on public.cs_ventures;
create policy cs_ventures_own on public.cs_ventures
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- the session brief ------------------------------------------------------
-- Cached on the booking, the way a class recap is cached on the lesson: it is
-- deterministic enough that regenerating it per view would spend tokens to
-- produce the same page.
alter table public.cs_bookings add column if not exists brief jsonb;
alter table public.cs_bookings add column if not exists brief_at timestamptz;

comment on column public.cs_bookings.brief is
  'Mentor-facing preparation, generated from the venture record, course progress, wrong quiz answers and the last session. Never shown to the founder — it may say things a mentor should read before deciding how to open.';

-- --- what the brief is built from -------------------------------------------
-- One security-definer function rather than granting mentors read access to a
-- founder's progress tables. It answers exactly one question — "what should I
-- know before this session" — and only for a booking the caller is the mentor
-- on.
create or replace function public.cs_session_context(p_org uuid, p_booking uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_b       record;
  v_is_mine boolean;
  v_out     jsonb;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;

  select * into v_b from cs_bookings
   where organization_id = p_org and id = p_booking;
  if not found then raise exception 'No such session'; end if;

  -- The mentor on this booking, or the founder themselves (who may preview
  -- what their mentor will see — there is nothing here they do not own).
  select exists (
    select 1 from cs_mentors m
     where m.organization_id = p_org and m.id = v_b.mentor_id and m.user_id = v_uid
  ) or v_b.user_id = v_uid into v_is_mine;
  if not v_is_mine then raise exception 'That session is not yours'; end if;

  select jsonb_build_object(
    'agenda', v_b.agenda,
    'startsAt', v_b.starts_at,
    'founder', (
      select jsonb_build_object('name', p.name, 'headline', p.headline)
        from cs_profiles p
       where p.organization_id = p_org and p.user_id = v_b.user_id
    ),
    'venture', (
      select jsonb_build_object('name', v.name, 'oneLiner', v.one_liner,
                                'stage', v.stage, 'country', v.country, 'doc', v.doc)
        from cs_ventures v
       where v.organization_id = p_org and v.user_id = v_b.user_id
    ),
    -- What they have actually worked through, not what they enrolled in.
    'progress', (
      select coalesce(jsonb_agg(jsonb_build_object('course', c.title, 'done', x.done, 'total', x.total)), '[]'::jsonb)
        from (
          select l.course_id,
                 count(*) filter (where pr.completed_at is not null) as done,
                 count(*) as total
            from cs_lessons l
            left join cs_lesson_progress pr
              on pr.organization_id = l.organization_id
             and pr.lesson_id = l.id
             and pr.user_id = v_b.user_id
           where l.organization_id = p_org
           group by l.course_id
        ) x
        join cs_courses c on c.organization_id = p_org and c.id = x.course_id
       where x.done > 0
    ),
    -- The most useful signal in the whole brief: where they were wrong.
    'weakSpots', (
      select coalesce(jsonb_agg(jsonb_build_object('lesson', l.title, 'score', a.score, 'total', a.total)), '[]'::jsonb)
        from cs_quiz_attempts a
        join cs_lessons l on l.organization_id = p_org and l.id = a.lesson_id
       where a.organization_id = p_org and a.user_id = v_b.user_id and a.score < a.total
    ),
    -- Continuity: what was said last time and what was left open.
    'lastSession', (
      select jsonb_build_object(
               'startsAt', b2.starts_at,
               'agenda', b2.agenda,
               'notes', b2.shared_notes,
               'openActions', (
                 select coalesce(jsonb_agg(ac.body), '[]'::jsonb)
                   from cs_booking_actions ac
                  where ac.organization_id = p_org and ac.booking_id = b2.id and ac.done_at is null
               ))
        from cs_bookings b2
       where b2.organization_id = p_org and b2.user_id = v_b.user_id
         and b2.id <> p_booking and b2.starts_at < v_b.starts_at
         and b2.status in ('confirmed','completed')
       order by b2.starts_at desc limit 1
    )
  ) into v_out;

  return v_out;
end $$;

grant execute on function public.cs_session_context(uuid, uuid) to authenticated;

-- --- the cohort signal ------------------------------------------------------
-- Which lessons this school's founders get wrong most often. No model needed:
-- it is a GROUP BY, and it is the thing that tells a mentor what to teach live
-- on Thursday. Aggregate only — never names a founder.
create or replace function public.cs_cohort_signal(p_org uuid, p_days integer default 14)
returns table (lesson_id text, lesson_title text, course_title text, attempts bigint, avg_score numeric)
language sql stable security definer set search_path = public as $$
  select a.lesson_id,
         l.title,
         c.title,
         count(*) as attempts,
         round(avg(a.score::numeric / nullif(a.total, 0)) * 100, 0) as avg_score
    from cs_quiz_attempts a
    join cs_lessons l on l.organization_id = a.organization_id and l.id = a.lesson_id
    join cs_courses c on c.organization_id = a.organization_id and c.id = l.course_id
   where a.organization_id = p_org
     and a.created_at > now() - make_interval(days => greatest(p_days, 1))
   group by a.lesson_id, l.title, c.title
  having count(*) >= 2
   order by avg(a.score::numeric / nullif(a.total, 0)) asc
   limit 10;
$$;

grant execute on function public.cs_cohort_signal(uuid, integer) to authenticated;

-- --- realtime ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and tablename = 'cs_ventures') then
    alter publication supabase_realtime add table public.cs_ventures;
  end if;
end $$;

-- --- what was said in a 1:1 -------------------------------------------------
-- The classroom writes its captions to cs_live_transcript, keyed by the live
-- lesson. A 1:1 has no lesson, so it needs its own home — otherwise the only
-- source for post-session capture would be text posted by the client, which is
-- both unverifiable and lost the moment the tab closes.
--
-- Deliberately NOT readable by default. A transcript of a founder describing
-- what is going wrong in their business is the most sensitive row in this
-- schema; both parties to the session can read it and nobody else.
create table if not exists public.cs_booking_transcript (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id           bigserial,
  booking_id   uuid not null,
  speaker_name text not null default '',
  text         text not null,
  said_at      timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, booking_id) references public.cs_bookings(organization_id, id) on delete cascade
);

create index if not exists cs_booking_transcript_idx
  on public.cs_booking_transcript (organization_id, booking_id, said_at);

alter table public.cs_booking_transcript enable row level security;

drop policy if exists cs_booking_transcript_parties on public.cs_booking_transcript;
create policy cs_booking_transcript_parties on public.cs_booking_transcript
  for all to authenticated
  using (
    exists (
      select 1 from public.cs_bookings b
       where b.organization_id = cs_booking_transcript.organization_id
         and b.id = cs_booking_transcript.booking_id
         and (b.user_id = auth.uid()
              or exists (select 1 from public.cs_mentors m
                          where m.organization_id = b.organization_id
                            and m.id = b.mentor_id and m.user_id = auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.cs_bookings b
       where b.organization_id = cs_booking_transcript.organization_id
         and b.id = cs_booking_transcript.booking_id
         and (b.user_id = auth.uid()
              or exists (select 1 from public.cs_mentors m
                          where m.organization_id = b.organization_id
                            and m.id = b.mentor_id and m.user_id = auth.uid()))
    )
  );

-- --- the mentor's desk ------------------------------------------------------
-- A mentor can already read the bookings made with them (0156), but not the
-- founder behind one: cs_profiles is own-row-only, and widening that policy to
-- "any mentor may read any learner" would be a much bigger grant than the one
-- thing actually needed, which is the name of the person arriving at 14:00.
--
-- So: one security-definer function that returns the mentor's own bookings with
-- exactly the founder fields a desk needs — name, hue, photo, one-liner. Not
-- the venture record, not their progress. Those still come through the brief,
-- for a booking that exists.
create or replace function public.cs_mentor_desk(p_org uuid)
returns table (
  id uuid, mentor_id text, user_id uuid,
  starts_at timestamptz, ends_at timestamptz, booked_tz text,
  status text, agenda text, shared_notes text, room_id text,
  rescheduled_from uuid, cancel_reason text, created_at timestamptz,
  brief_at timestamptz,
  founder_name text, founder_hue text, founder_photo_url text, founder_one_liner text
)
language sql stable security definer set search_path = public as $$
  select b.id, b.mentor_id, b.user_id,
         b.starts_at, b.ends_at, b.booked_tz,
         b.status, b.agenda, b.shared_notes, b.room_id,
         b.rescheduled_from, b.cancel_reason, b.created_at,
         b.brief_at,
         coalesce(p.name, 'A founder'), coalesce(p.hue, 'lilac'), p.photo_url,
         coalesce(v.one_liner, '')
    from cs_bookings b
    join cs_mentors m
      on m.organization_id = b.organization_id
     and m.id = b.mentor_id
     and m.user_id = auth.uid()
    left join cs_profiles p
      on p.organization_id = b.organization_id and p.user_id = b.user_id
    left join cs_ventures v
      on v.organization_id = b.organization_id and v.user_id = b.user_id
   where b.organization_id = p_org
   order by b.starts_at desc
   limit 200;
$$;

grant execute on function public.cs_mentor_desk(uuid) to authenticated;

-- Which mentor am I, if any? Returns zero rows for a founder, which is what
-- hides the whole mentoring console rather than a client-side role check.
create or replace function public.cs_my_mentor(p_org uuid)
returns table (id text, name text, role text, hue text, photo_url text, session_min integer, timezone text)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.role, m.hue, m.photo_url, m.session_min, m.timezone
    from cs_mentors m
   where m.organization_id = p_org and m.user_id = auth.uid()
   limit 1;
$$;

grant execute on function public.cs_my_mentor(uuid) to authenticated;

-- --- where the source has been overtaken ------------------------------------
-- cs_lessons.revision is added by 0155, because the generated seed writes it
-- and a generated migration has to apply on its own. Only the comment belongs
-- here, where hand-written SQL lives.
comment on column public.cs_lessons.revision is
  'Where the 2018 source has been overtaken by later evidence. Both sides are shown to the learner. Financing, legal and valuation figures move — re-research before relying on a specific number.';
