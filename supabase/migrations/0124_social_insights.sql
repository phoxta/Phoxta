-- Phoxta — how a published post is doing.
--
-- WHY THE NUMBERS ARE STORED AND NOT JUST FETCHED. Every platform meters these
-- calls, and Instagram meters them hard: 200 API calls per hour per account,
-- shared with publishing. Reading counts live on every render would mean a
-- console tab left open could exhaust the hour's budget and take the PUBLISHER
-- down with it — the posts would stop going out because somebody was looking at
-- how the last one did. So the counts are cached on the row and refreshed on
-- demand, with an age beside them so the console can say how old they are
-- rather than implying they are live.
--
-- NULL IS NOT ZERO, and the distinction is the whole reason these are nullable.
-- A post with no likes yet and a post whose platform will not tell us look
-- identical if both are 0, and one of those is a fact while the other is our
-- own limitation. TikTok is the case in point: reading a video's stats needs a
-- scope this app does not hold, so its counts stay null and the console shows
-- nothing rather than a zero the owner would read as "nobody liked it".
alter table social_targets
  add column if not exists likes int,
  add column if not exists comments int,
  add column if not exists metrics_at timestamptz;

comment on column social_targets.likes is
  'Likes as of metrics_at. NULL means not known — never means none.';
comment on column social_targets.comments is
  'Comments as of metrics_at. NULL means not known — never means none.';
comment on column social_targets.metrics_at is
  'When likes/comments were last read from the platform. NULL = never read.';

-- The refresh asks for the stalest sent rows first, and this is the index that
-- makes that a lookup rather than a scan of every target ever queued.
create index if not exists idx_social_targets_metrics
  on social_targets(metrics_at nulls first) where status = 'sent';
