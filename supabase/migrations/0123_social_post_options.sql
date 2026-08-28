-- Phoxta — the per-platform options a scheduled post carries.
--
-- Collaborators, tagged people, alt text and "put it on the story too" are all
-- decisions made when the post is composed and acted on minutes or days later
-- by the publisher. They have to travel WITH the post, and until now a post was
-- a picture, a caption and a time.
--
-- WHY ONE JSONB COLUMN RATHER THAN FOUR REAL ONES. These are not our fields.
-- Each one exists because Instagram accepts a parameter of that name today, and
-- the set changes: alt_text arrived in March 2025, collaborators a year before
-- that, and the music library has never been in the API at all. A column per
-- parameter means a migration every time Meta adds one, on a table that is on
-- the publishing path. A jsonb keeps the schema still while the platforms move.
--
-- The shape is validated where it is used — in social-schedule on the way in
-- and in the Instagram adapter on the way out — because a check constraint here
-- could only ever restate what Meta's API already enforces, one release behind.
alter table social_posts
  add column if not exists options jsonb not null default '{}'::jsonb;

comment on column social_posts.options is
  'Per-platform publishing options, namespaced by platform. Instagram: '
  '{"instagram":{"collaborators":["name"],"userTags":[{"username":"name","x":0.5,"y":0.5}],'
  '"altText":"...","alsoStory":true}}. x/y are 0..1 from the top-left of the picture. '
  'Validated in the edge functions, not here: these are Meta''s parameters, not ours.';
