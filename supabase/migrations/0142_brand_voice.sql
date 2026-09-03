-- Phoxta — how a business actually sounds, written down once.
--
-- WHY THIS DOES NOT ALREADY EXIST ANYWHERE. `organizations.branding` is visual
-- and SEO only — colours, fonts, logo, tagline. `agent_config.persona`/`tone`
-- is a genuinely different register: one-to-one, reactive, answering a customer
-- who has already made contact. Broadcast copy is one-to-many to a stranger
-- scrolling past, and a voice that is right for one is often wrong for the
-- other. And `agent_memory` names "brand voice" as a use case but holds eight
-- rows of free prose with no shape, no approval and no provenance — an INPUT to
-- a voice, not the voice.
--
-- So the content engine had nothing to write in, and fell back on a negative
-- list ("never write 'unlock'"), which tells a model what to avoid and nothing
-- about who this business is.
--
-- WHY NOT NEST IT IN organizations.branding. brand-generate rewrites that whole
-- object when someone regenerates a palette. A voice nested there would be
-- destroyed by an unrelated click, silently, and nobody would know until the
-- captions started sounding like everyone else's.
create table if not exists org_voice (
  organization_id uuid primary key references organizations(id) on delete cascade,

  /** The spec itself. Shape lives in _shared/voice.ts — jsonb because the
   *  vocabulary of a voice will change and a column per trait would not. */
  spec jsonb not null default '{}'::jsonb,

  -- 'draft'    — inferred, never confirmed by a human. Still used, but every
  --              surface that uses it says so.
  -- 'approved' — the owner read it and said yes.
  -- 'archived' — superseded.
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'archived')),

  /** What it was derived from, with counts: { reviews: 18, faqs: 6, ... }.
   *  An owner reading a description of their own voice is entitled to know
   *  whether it came from forty real conversations or from nothing. */
  source jsonb not null default '{}'::jsonb,

  /** Anything the owner pasted in — "here are three posts I'm proud of" — kept
   *  verbatim so a regenerate reads what they actually said rather than a
   *  summary of it. */
  owner_input text not null default '',

  model text,
  generated_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table org_voice enable row level security;

drop policy if exists org_voice_all on org_voice;
create policy org_voice_all on org_voice for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));
