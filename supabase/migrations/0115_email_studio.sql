-- Phoxta — the email studio's storage.
--
-- Until now every email Phoxta sends was written in TypeScript and shipped in a
-- deploy. That is right for a receipt, which should not be editable by anyone
-- in a hurry, and wrong for a campaign, a newsletter or a post — those are
-- written on a Tuesday afternoon by whoever has something to say.
--
-- So composed mail lives here as blocks, in the same shape the renderer already
-- takes. NOT as HTML: storing HTML would fork the design the moment the
-- template changes, and the whole point of one renderer is that a saved
-- template picks up every fix to the layout without being touched.

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled email',
  -- 'campaign' is written from scratch, 'post' came from a blog post and can be
  -- re-pulled if the post changes, 'brochure' is the code-shipped one opened
  -- for editing.
  kind text not null default 'campaign' check (kind in ('campaign', 'post', 'brochure')),

  subject text not null default '',
  preheader text not null default '',
  /** The tracked line in the masthead, opposite the wordmark. */
  strap text not null default '',
  footnote text not null default '',

  -- Block[] exactly as packages/email/src/render.ts defines it.
  blocks jsonb not null default '[]'::jsonb,

  -- When kind='post': which post it was pulled from, so it can be refreshed.
  source_slug text,

  status text not null default 'draft' check (status in ('draft', 'ready', 'sent')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_email_templates_updated on email_templates(updated_at desc);

-- Phoxta's own list, not a tenant's: no client role touches it, service_role
-- bypasses RLS, and the console reaches it through the edge function so that
-- every write is behind the platform_admins check and the audit log.
alter table email_templates enable row level security;

-- ── the send ledger, generalised ────────────────────────────────────────────
-- It was brochure-only. Every composed email needs the same two guarantees the
-- brochure needed — do not send to someone who said no, do not send the same
-- thing to the same person twice — so the table stops being about the brochure.
alter table platform_brochure_sends add column if not exists kind text not null default 'brochure';
alter table platform_brochure_sends add column if not exists subject text not null default '';
alter table platform_brochure_sends add column if not exists template_id uuid;

do $$
begin
  if to_regclass('public.platform_email_sends') is null then
    alter table platform_brochure_sends rename to platform_email_sends;
  end if;
end $$;

-- The dedupe key is (email, kind): one brochure per person, and one send per
-- campaign per person, without a campaign blocking the brochure.
create index if not exists idx_email_sends_email_kind on platform_email_sends(email, kind);
