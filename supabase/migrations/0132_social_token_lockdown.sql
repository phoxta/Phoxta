-- Phoxta — 0132: social_accounts token lockdown.
--
-- WHY A COLUMN GRANT AND NOT A POLICY. RLS row policies decide WHICH ROWS a
-- role may see and say nothing about WHICH COLUMNS: social_accounts_select
-- (0118) passes for any member of the org, and PostgREST then serves whatever
-- columns the role's table privilege covers — which was all of them. So any
-- member, with the anon key and their own JWT, could read
-- `?select=access_token,refresh_token` for every connected account in their
-- business: live Instagram / LinkedIn / X / TikTok credentials, from the
-- browser. 0118's own comment promised "the client never selects the token
-- columns" — but a promise in a comment is not an ACL.
--
-- The fix PostgREST actually respects is a column ACL: take away the blanket
-- privileges and grant back SELECT on only the safe columns. The row policy
-- stays exactly as it is — membership still decides which rows — and every
-- edge function is untouched, because service_role keeps its own grant.
--
-- Nothing user-facing changes: the client goes through the social-schedule
-- function (src/lib/db/ops/social.ts invokes it; there is no direct
-- PostgREST select on this table anywhere in src/), and that function's
-- `accounts` action already selects only id, platform, handle, display_name,
-- avatar_url, status, last_error, updated_at — all in the grant below.
--
-- Idempotent: REVOKE and GRANT both re-run cleanly.

-- Writes were already dead for these roles (0118 created no insert/update/
-- delete policies), so revoking ALL costs nothing and stops relying on RLS
-- alone for the one table that holds credentials.
revoke all on table public.social_accounts from anon, authenticated;

-- Every column except access_token and refresh_token. token_expiry and scope
-- stay readable: when a token lapses, and what it was allowed to do, are
-- facts about the connection the console may show — the credential itself is
-- not.
grant select (
  id,
  organization_id,
  platform,
  external_id,
  handle,
  display_name,
  avatar_url,
  token_expiry,
  scope,
  status,
  last_error,
  connected_by,
  created_at,
  updated_at
) on public.social_accounts to authenticated;
