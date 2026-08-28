-- Phoxta — "Send now", and the guard that makes editing a queued post safe.
--
-- WHY THE CLAIM NEEDED A SECOND ARGUMENT. Publishing lives in exactly one
-- place: social-publish. The token refresh, the marking of an account the
-- platform has rejected, and the settling of a post to published/part/failed
-- all happen there, and a second publisher written for the "Send now" button
-- would be a second place for those to drift out of step.
--
-- So the button does not publish. It asks the SAME worker to do the SAME work,
-- narrowed to one post. Passing a post id drops the `scheduled_at <= now()`
-- test — that test is the definition of "due", and "send it now" is precisely
-- the statement that due-ness no longer applies. Nothing else relaxes: the
-- post must still be queued, the target must still be unsent, and the claim is
-- still FOR UPDATE SKIP LOCKED, so a person pressing the button at the same
-- moment the cron tick picks the post up cannot produce two posts.
--
-- The old single-argument form is dropped rather than left beside this one.
-- Both would be callable with p_limit alone, and PostgREST would have no way
-- to choose — an ambiguity that surfaces as a runtime 300, at the worst
-- possible time, on the path that publishes. The deployed worker calls it with
-- p_limit only; p_post_id defaults to null and it keeps sweeping exactly as
-- before, so this is safe to apply ahead of the function deploy.

drop function if exists public.app_claim_social_targets(int);

create or replace function public.app_claim_social_targets(
  p_limit int default 10,
  p_post_id uuid default null
)
returns setof social_targets
language sql
security definer
set search_path = public
as $$
  update social_targets t
     set status = 'sending', claimed_at = now(), attempts = t.attempts + 1
   where t.id in (
     select t2.id
       from social_targets t2
       join social_posts p on p.id = t2.post_id
      where p.status = 'queued'
        -- Named post: only that one. Unnamed: the whole due queue.
        and (p_post_id is null or t2.post_id = p_post_id)
        -- "Due" only governs the sweep. A named post is being sent on purpose.
        and (p_post_id is not null or p.scheduled_at <= now())
        and (
          t2.status = 'pending'
          -- A row left 'sending' by a crashed run is retried after ten
          -- minutes; three attempts and it is left alone for a person.
          or (t2.status = 'sending' and t2.claimed_at < now() - interval '10 minutes')
        )
        and t2.attempts < 3
      order by p.scheduled_at
      limit p_limit
      for update skip locked
   )
  returning t.*;
$$;

-- Functions are EXECUTE TO PUBLIC by default, and this one is SECURITY
-- DEFINER: without the revoke, any anon caller could drain another org's
-- queue — or, now, name a post id belonging to somebody else.
revoke execute on function public.app_claim_social_targets(int, uuid) from public, anon, authenticated;

-- ── one channel per post, enforced ──────────────────────────────────────────
-- Editing a queued post rewrites its channel list, which means inserting
-- targets for the channels that were added. The edge function only inserts
-- ones that are genuinely new, but a duplicate row here would publish the
-- same post twice to the same account, and that is the one failure this whole
-- design exists to prevent — so it is a constraint and not a convention.
--
-- Guarded: if a duplicate somehow already exists, the index cannot be built
-- and an unguarded CREATE would take the migration down with it. Better to
-- ship without the belt than not to ship the braces.
do $$
begin
  if not exists (
    select 1 from social_targets group by post_id, account_id having count(*) > 1
  ) then
    create unique index if not exists idx_social_targets_once
      on social_targets(post_id, account_id);
  else
    raise notice 'social_targets has duplicate (post_id, account_id) rows; unique index skipped';
  end if;
end $$;
