-- Phoxta — 0140: the owner's operator stops being handed the sales script.
--
-- agent_config.procedures is ONE field read by TWO agents with different
-- audiences. 0088 wrote prospect-facing rules into it for the platform org —
-- "You are the first person a prospect meets at Phoxta", plus a NEVER REVEAL
-- list covering margins, unit costs, providers and roadmap. Correct for the
-- public agent, which is what 0088 was fixing.
--
-- But agent-operator injects that same field into the OWNER's operator. So the
-- owner asking what Phoxta sells was qualified like a lead ("tell me what you
-- want your new business to do — budget, timeline, have you run a business
-- before?"), and the business's own numbers became things the operator must not
-- disclose to the person who owns them.
--
-- Two fields, because there are two audiences:
--   procedures        — the CUSTOMER-facing agent (agent-inbound, every channel)
--   owner_procedures  — the OWNER-facing operator (agent-operator, ai-gateway,
--                       automation-run), which never speaks to a customer
--
-- Empty for every tenant by default, and agent-operator still falls back to
-- `procedures` when it is unset — so nobody's agent changes behaviour but the
-- one org that had a genuine audience conflict.

alter table agent_config add column if not exists owner_procedures text not null default '';

comment on column agent_config.procedures is
  'Plain-English hard rules for the CUSTOMER-facing agent, on every channel. Read by agent-inbound via _shared/agentCore.ts.';
comment on column agent_config.owner_procedures is
  'Plain-English hard rules for the OWNER-facing operator (agent-operator, ai-gateway, automation-run). Never seen by a customer. When empty, agent-operator falls back to `procedures`.';

-- The platform org, resolved by public_key rather than a hardcoded id (same as 0088).
update agent_config
set owner_procedures = $proc$
You are talking to Phoxta's own team, never to a customer or a prospect. The
rules the public agent follows about selling do not apply to this conversation.

WHAT WE SELL
- Call list_blueprints before naming, counting or pricing anything in the
  marketplace. It reads the live catalogue, so it cannot go stale.
- list_products is a DIFFERENT thing: this org's own product rows, which are
  empty. An empty product list is NOT an empty catalogue — never report that
  Phoxta has nothing for sale without calling list_blueprints first.

HOW TO TALK TO THE OWNER
- Answer the question that was asked. Never pitch, never run discovery, never
  ask about budget, timeline or whether they have run a business before — those
  are questions for a prospect.
- Margins, unit costs, pricing floors, which providers and models power the
  platform, infrastructure, roadmap and unreleased work are all fair game here.
  The public agent's NEVER REVEAL list protects those from OUTSIDERS, not from
  the people running the business.
- Lead with the number or the fact. Keep commentary short, and say plainly when
  something is not set up yet rather than describing it as if it were.
$proc$
where public_key = '0aac33659f43ff9c3108fe2133b0be2d';
