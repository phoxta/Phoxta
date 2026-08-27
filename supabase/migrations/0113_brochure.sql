-- Phoxta — the brochure's two ledgers.
--
-- The brochure is the only email Phoxta sends that the reader did not ask for,
-- and unsolicited mail needs two things before it is allowed out of the door:
-- somewhere to record that a person has said no, and a record of who has
-- already had it. Without the first it is spam; without the second the same
-- person gets it three times, which is how a sender's domain reputation dies.
--
-- Both are keyed by email rather than by lead id, because someone can reach us
-- through more than one form and a no has to hold across all of them.

create table if not exists platform_optouts (
  email      text primary key,
  reason     text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists platform_brochure_sends (
  id        uuid primary key default gen_random_uuid(),
  email     text not null,
  resend_id text not null default '',
  sent_at   timestamptz not null default now()
);
create index if not exists idx_brochure_sends_email on platform_brochure_sends(email);

-- Phoxta's own lists, not a tenant's: no client role touches them, and
-- service_role bypasses RLS. Enabled with no policies is deny-all, which is
-- the intent stated explicitly rather than left to whoever reads this next.
alter table platform_optouts enable row level security;
alter table platform_brochure_sends enable row level security;
