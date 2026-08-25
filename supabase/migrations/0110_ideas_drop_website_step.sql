-- Phoxta — the run ends at the business plan.
--
-- The website step is gone: an idea now finishes with a validation score and a
-- plan, and building a site is a separate job for a business that exists.
--
-- The 'website' value STAYS in the idea_step enum. Postgres cannot drop a value
-- from an enum type, and recreating the type would mean rewriting every column
-- that uses it under a lock, to remove a value nothing writes any more. A value
-- with no writers costs nothing; the rewrite could cost an outage.
--
-- What this migration does clean up is the data: ideas whose last run stopped on
-- the website step point `current_step` at a step that no longer exists in the
-- UI, which would show them as parked on a stage nobody can open.

update ideas
   set current_step = 'strategy'
 where current_step = 'website';

-- Generated site copy stays in ai_profile.website. It is not read any more, but
-- it is the founder's, it is small, and deleting it to tidy the shape of a JSON
-- column is not a trade worth making.

delete from idea_step_inputs where step = 'website';

comment on type idea_step is
  'Stages of a validation run. ''website'' is retired — kept because an enum value cannot be dropped; nothing writes it as of 0110.';
