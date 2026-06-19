-- Phoxta platform — 0020 visual pages (Studio page builder)
-- The visual builder stores its page tree as a Puck JSON document on cms_pages.
-- Existing markdown pages keep working unchanged: `kind` defaults to 'markdown'
-- and continues to use `body`; visual pages set kind='visual' and use `document`.
-- header_style / footer_style mirror MainLayout's chrome knobs so a published
-- page renders with the same header/footer/scroll system as a hand-built page.

alter table cms_pages
  add column if not exists kind text not null default 'markdown'
    check (kind in ('markdown', 'visual')),
  add column if not exists document jsonb,                 -- Puck Data { root, content, zones }
  add column if not exists header_style smallint,          -- 1..15 (null => default)
  add column if not exists footer_style smallint;          -- 1..15 (null => default)

-- Storefronts (and the org ops summary) filter published pages; no schema change
-- needed there. RLS, the updated_at trigger and the embedding trigger defined in
-- 0006/0007 already cover the new columns (embedding indexes title+body; visual
-- pages simply contribute their title until Phase 4 extracts text into `body`).
