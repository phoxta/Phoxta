-- Phoxta — 0120: the agent can show a customer a picture, and a WhatsApp
-- template is only sent when it genuinely answers.
--
-- Two unrelated-looking columns, both of which exist because the code that ships
-- alongside them has to be able to tell one thing from another and today cannot.
--
-- Every edge function reads both DEFENSIVELY (`select("*")` and a fallback for an
-- absent value), because functions deploy independently of migrations: nothing
-- here is required for the deploy to be safe, only for it to be complete.

/* ── 1. WHAT KIND OF WHATSAPP TEMPLATE IS THIS? ────────────────────────────── */

-- Meta classifies every approved template as UTILITY, MARKETING or
-- AUTHENTICATION, and Phoxta has never recorded which. That mattered the moment
-- the agent was allowed to send one on its own: a prover executed a fixture where
-- this account's MARKETING template ("Just following up on your recent enquiry")
-- was auto-sent as the answer to a service question.
--
-- Sending a marketing message to somebody asking for help is a category error,
-- and in the UK and EU it is a consent question rather than a style question — a
-- marketing message needs opt-in, and "they asked where their order is" is not
-- opt-in to marketing. So the category is now data, the agent refuses to answer
-- with anything but a utility template, and the console asks for it.
--
-- 'utility' IS THE DEFAULT ON PURPOSE, and it is the only defensible one:
--   • defaulting to 'marketing' would silently stop every existing template from
--     ever being sent, i.e. it would break a working account by migrating it;
--   • defaulting to 'utility' matches what a support console's saved templates
--     overwhelmingly are, and the code does not rest on this alone. A template
--     whose own words read as promotional is refused whatever the column says
--     (see PROMOTIONAL in supabase/functions/_shared/autoReply.ts), and the
--     relevance bar it has to clear is far higher than the one it replaces.
-- Owners should still classify their templates; the console's Saved replies
-- drawer now shows the control with the reason next to it.
-- THE DEFAULT IS 'unclassified', AND THAT IS THE WHOLE POINT.
--
-- Defaulting to 'utility' was self-defeating: the code refuses a template whose
-- own words read as promotional ONLY while nobody has classified it, so stamping
-- every existing row 'utility' switched that floor off for all of them. Applying
-- the migration would have made the account's marketing follow-up MORE sendable
-- than before it — the guard removed by the thing that introduced the guard.
--
-- 'unclassified' is the truth about a row nobody has looked at, and it keeps the
-- word test running until a human says otherwise. Only an explicit 'utility'
-- means a person decided this is an answer rather than a promotion.
alter table canned_responses
  add column if not exists whatsapp_template_category text not null default 'unclassified';

alter table canned_responses drop constraint if exists canned_responses_wa_category_check;
alter table canned_responses add constraint canned_responses_wa_category_check
  check (whatsapp_template_category in ('unclassified', 'utility', 'marketing', 'authentication'));

comment on column canned_responses.whatsapp_template_category is
  'Meta''s own category for an approved WhatsApp template. Only ''utility'' may be sent automatically as an answer to a customer: marketing is not an answer, and authentication has no code to carry.';

/* ── 2. A DESIGN THE SERVER CAN ACTUALLY SEND ──────────────────────────────── */

-- 0111 says, correctly, why the rendered PNG is NOT stored: the layout lives in
-- code, the picture is painted in the browser from the same SVG the editor
-- shows, and a stored copy goes stale the moment anyone edits a word.
--
-- That reasoning holds for the editor and fails for the agent. Twilio does not
-- accept bytes; it accepts a URL and fetches it itself. A design that only exists
-- as JSON plus a browser is a design the agent can never show a customer — so
-- "send them the menu" was unanswerable, for a menu the business had made.
--
-- The staleness is answered rather than ignored: the studio re-renders and
-- re-uploads on every save, replacing the previous file, so png_at is always the
-- moment the stored picture was made and updated_at > png_at means "this design
-- has been edited since". The file lives in the same public `design-assets`
-- bucket as every other picture the business owns, which is what makes it
-- fetchable by Twilio and visible in the library.
alter table designs add column if not exists png_url text;
alter table designs add column if not exists png_path text;
alter table designs add column if not exists png_at timestamptz;

comment on column designs.png_url is
  'Public URL of the rendered PNG in the design-assets bucket, published by the studio on save. What the agent sends when a customer asks to see this design; null until the design has been saved since this shipped.';
comment on column designs.png_path is
  'Storage path of that PNG, so the previous render is removed when a save replaces it.';
comment on column designs.png_at is
  'When the stored PNG was rendered. updated_at later than this means the design has been edited since.';
