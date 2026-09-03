-- Phoxta — what a post actually did, kept as history rather than as a snapshot.
--
-- WHY THE EXISTING COLUMNS ARE NOT ENOUGH. 0124 put likes/comments ON
-- social_targets and OVERWRITES them on every refresh. That is the right shape
-- for "how is this post doing right now" and the wrong shape for every question
-- the content engine needs to ask:
--
--   * Engagement is uncomputable. Two readings are needed to know whether a
--     post is still gathering likes or finished; one value that keeps changing
--     is not two readings.
--   * A six-month-old post compares unfairly with a one-day-old one. Without
--     knowing how long each had been live when it was read, "247 likes beats
--     31 likes" is a statement about age, not about content.
--
-- So those columns stay exactly as they are — the console reads them and they
-- work — and this appends alongside. Nothing is migrated and nothing is moved.
--
-- HOURS_SINCE_PUBLISH IS THE COLUMN THAT MAKES THE TABLE WORTH HAVING. It is
-- stored rather than derived at query time because it is a fact about the
-- READING ("this is what the post had after 26 hours"), and deriving it later
-- from now() would silently re-date every historical row every time it was run.
create table if not exists social_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  target_id uuid not null references social_targets(id) on delete cascade,
  post_id uuid not null references social_posts(id) on delete cascade,
  platform text not null,

  /** When this reading was taken. */
  read_at timestamptz not null default now(),
  /** How long the post had been live when it was taken. NULL when we do not
   *  know it went out — an unknown age is not an age of zero. */
  hours_since_publish numeric,

  -- EVERY METRIC IS NULLABLE, AND NULL MEANS NOT KNOWN — never none. TikTok
  -- tells us nothing at all; Instagram's impressions and saves need scopes the
  -- app may not hold. A zero in any of these columns is a real measured zero,
  -- which is a different and much rarer thing than "the platform did not say".
  likes int,
  comments int,
  shares int,
  saves int,
  impressions int,
  reach int,
  clicks int,
  video_views int,

  created_at timestamptz not null default now()
);

-- The read pattern is "this business's posts, newest reading first" and
-- "every reading for this target", so both get an index.
create index if not exists social_metrics_org_read_idx
  on social_metrics (organization_id, read_at desc);
create index if not exists social_metrics_target_idx
  on social_metrics (target_id, read_at desc);

comment on column social_metrics.hours_since_publish is
  'Age of the post when this reading was taken. NULL = publish time unknown. Comparing two posts read at different points in their life without this compares nothing.';
comment on column social_metrics.impressions is
  'NULL means the platform did not tell us, NEVER that there were none.';

alter table social_metrics enable row level security;

drop policy if exists social_metrics_read on social_metrics;
create policy social_metrics_read on social_metrics for select
  using (public.app_is_org_member(organization_id));

-- Written by the insights worker under the service role only. A member has no
-- reason to invent a reading, and an invented one would be indistinguishable
-- from a measured one for ever.

/**
 * How this business's posts have actually performed, with the strategy labels
 * they were planned under.
 *
 * THE POINT IS THE JOIN. social_posts now carries pillar, funnel_stage and
 * campaign_key, so this can answer "does teaching outperform promoting for us"
 * rather than only "which post got the most likes" — which is the question that
 * makes the next month's plan better rather than merely informed.
 *
 * ENGAGEMENT_RATE IS NULL WHEN IMPRESSIONS ARE NULL. Dividing by a null
 * denominator, or quietly substituting reach or a follower count, produces
 * exactly the confident invented number the whole engine is built to avoid. A
 * missing rate is honest; a computed-from-nothing rate is a lie with a decimal
 * point.
 *
 * The reading used per target is the LAST one taken between 24 and 72 hours
 * after publishing — long enough for a post to have finished gathering, early
 * enough that a six-month-old post and a two-day-old one are being compared at
 * the same point in their lives. A target with no reading in that window is
 * returned with null metrics rather than dropped: "we have not measured this"
 * is information, and hiding those rows would make the sample look complete.
 *
 * SECURITY DEFINER with an org parameter needs the membership check INSIDE the
 * security boundary, or any authenticated user could read any business's
 * numbers by passing a different uuid.
 */
create or replace function public.app_org_post_performance(p_org uuid, p_days int default 90)
returns table (
  post_id uuid, target_id uuid, platform text, published_at timestamptz,
  pillar text, funnel_stage text, campaign_key text, angle text,
  hour_of_day int, day_of_week int,
  likes int, comments int, shares int, saves int, impressions int, reach int,
  engagement_rate numeric, hours_since_publish numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.app_is_org_member(p_org) then
    raise exception 'not a member of that business';
  end if;

  return query
  with reading as (
    select distinct on (m.target_id)
      m.target_id, m.likes, m.comments, m.shares, m.saves,
      m.impressions, m.reach, m.hours_since_publish
    from social_metrics m
    where m.organization_id = p_org
      and m.hours_since_publish between 24 and 72
    order by m.target_id, m.read_at desc
  )
  select
    -- scheduled_at, not a separate published_at: the publisher fires on the
    -- first cron tick after it, which is within five minutes.
    p.id, t.id, t.platform, p.scheduled_at,
    coalesce(p.pillar, ''), coalesce(p.funnel_stage, ''),
    p.campaign_key, coalesce(p.angle, ''),
    extract(hour from p.scheduled_at)::int,
    extract(dow from p.scheduled_at)::int,
    r.likes, r.comments, r.shares, r.saves, r.impressions, r.reach,
    case
      when r.impressions is null or r.impressions = 0 then null
      else round(
        (coalesce(r.likes, 0) + coalesce(r.comments, 0)
         + coalesce(r.shares, 0) + coalesce(r.saves, 0))::numeric
        / r.impressions, 4)
    end,
    r.hours_since_publish
  from social_posts p
  join social_targets t on t.post_id = p.id
  left join reading r on r.target_id = t.id
  where p.organization_id = p_org
    and t.status = 'sent'
    and p.scheduled_at >= now() - make_interval(days => greatest(1, p_days))
  order by p.scheduled_at desc;
end;
$$;

revoke all on function public.app_org_post_performance(uuid, int) from public;
grant execute on function public.app_org_post_performance(uuid, int) to authenticated;
