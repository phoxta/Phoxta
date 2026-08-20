-- Phoxta — 0075: the operating console's work board.
--
-- The Overview board is fed from the business's OWN data, across every console
-- module, rather than from a tasks table someone has to keep up to date. Each
-- row that represents outstanding work anywhere in the app becomes a card, and
-- the card's column is derived from that row's real status:
--
--   todo    waiting to be started    (unread message, unfulfilled paid order,
--           overdue invoice, draft campaign, low stock, new lead)
--   doing   under way                (assigned conversation, sent invoice
--           awaiting payment, confirmed upcoming booking, sending campaign)
--   review  needs a decision/failed  (agent approval queue, failed agent action
--           or automation run, escalated conversation, domain not live)
--   ready   finished in the last 7 days
--
-- Every field the card design shows is backed by a real row — nothing is
-- decorative filler:
--   tags        two chips: the module, then that record's own status/type
--   comments    real message count (conversation_messages / ticket_messages)
--   links       real attached records (order_items / invoice_items / units)
--   media       preview list — product shots, a call recording, and video
--               as soon as anything stores one (kind is read off the URL)
--   to_path     console-relative route to the record itself
--
-- counts are the TRUE totals per column; cards are only the top p_limit per
-- column, so a busy business gets an honest "17" without shipping 17 cards.

-- Media helpers ------------------------------------------------------------
-- A card can preview whatever the underlying record actually holds: a product
-- shot, a call recording, and video the moment anything stores one. The KIND is
-- derived from the URL rather than a column, so no schema change is needed when
-- a video first appears in a product gallery — it just starts rendering as one.
create or replace function public.app_media_kind(p_url text)
returns text language sql immutable as $fn$
  select case
    when p_url is null or btrim(p_url) = '' then null
    when lower(p_url) ~ '\.(mp4|webm|mov|m4v)(\?|#|$)'        then 'video'
    when lower(p_url) ~ '\.(mp3|wav|ogg|oga|m4a|aac)(\?|#|$)' then 'audio'
    else 'image'
  end
$fn$;

-- Turns a list of URLs into the card's media array, dropping blanks and keeping
-- source order. Returns '[]' (never null) so the union's types stay stable.
--
-- Storefront media is stored ROOT-RELATIVE ("/assets/imgs/..."), because it is
-- written for the tenant's own storefront app. Rendered as-is in the console
-- those resolve against the dashboard's origin and 404 — 80 of 101 product
-- images are this shape. p_base is the tenant's live storefront origin, so the
-- console can resolve them where the storefront serves them. With no live
-- domain there is nowhere to resolve to, so a relative URL is dropped rather
-- than rendered as a broken image.
drop function if exists public.app_media(text[]);
create or replace function public.app_media(p_urls text[], p_base text default null)
returns jsonb language sql immutable as $fn$
  select coalesce(
    jsonb_agg(jsonb_build_object('kind', public.app_media_kind(x.u2), 'url', x.u2) order by t.i)
      filter (where x.u2 is not null),
    '[]'::jsonb)
  from unnest(coalesce(p_urls, '{}')) with ordinality as t(u, i)
  cross join lateral (
    select case
      when t.u is null or btrim(t.u) = ''                then null
      when t.u ~ '^(https?:)?//' or t.u ~ '^data:'       then t.u
      when t.u ~ '^/' and p_base is not null             then p_base || t.u
      when t.u ~ '^/'                                    then null
      else t.u
    end as u2
  ) x
$fn$;

revoke all on function public.app_media_kind(text) from public, anon;
revoke all on function public.app_media(text[], text) from public, anon;
grant execute on function public.app_media_kind(text) to authenticated, service_role;
grant execute on function public.app_media(text[], text) to authenticated, service_role;

create or replace function public.app_org_work_board(p_org uuid, p_limit int default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb; v_base text;
begin
  if not public.app_is_org_member(p_org) then raise exception 'Not allowed'; end if;

  -- The tenant's live storefront origin, used to resolve root-relative media.
  select 'https://' || d.hostname into v_base
  from domains d
  where d.organization_id = p_org and d.status = 'live'
  order by d.is_primary desc nulls last, d.created_at
  limit 1;

  with items as (
    -- ── Inbox: conversations ────────────────────────────────────────────
    select
      'conversation:' || c.id                                        as id,
      case
        when c.status = 'escalated'                                   then 'review'
        when c.status in ('handled','closed')
             and c.updated_at >= now() - interval '7 days'            then 'ready'
        when c.unread                                                 then 'todo'
        when c.status = 'open' and c.assigned_to is not null           then 'doing'
      end                                                             as col,
      'inbox'                                                         as module,
      array['Inbox', initcap(coalesce(nullif(c.channel_type,''),'chat'))] as tags,
      coalesce(nullif(c.customer_name,''), 'Conversation')            as title,
      coalesce(nullif(c.summary,''),
               initcap(coalesce(nullif(c.channel_type,''),'chat')) || ' conversation') as detail,
      public.app_media(array[(select cl.recording_url from call_logs cl
        where cl.conversation_id = c.id and cl.recording_url is not null
        order by cl.created_at desc limit 1)], v_base)                          as media,
      coalesce(nullif(c.customer_name,''), 'Customer')                as who,
      coalesce(nullif(c.channel_type,''), 'chat')                     as who_role,
      coalesce(c.last_message_at, c.created_at)                       as occurred_at,
      null::bigint                                                    as amount_cents,
      (select count(*) from conversation_messages m where m.conversation_id = c.id)::int as comments,
      0                                                               as links,
      null::int                                                       as progress,
      'inbox?c=' || c.id                                              as to_path,
      (c.status = 'escalated')                                        as urgent
    from conversations c
    where c.organization_id = p_org and not c.is_test

    union all
    -- ── Inbox: helpdesk tickets ─────────────────────────────────────────
    select
      'ticket:' || t.id,
      case
        when t.status = 'open'                                        then 'todo'
        when t.status = 'pending'                                     then 'review'
        when t.status in ('resolved','closed')
             and t.updated_at >= now() - interval '7 days'            then 'ready'
      end,
      'inbox',
      array['Ticket', initcap(coalesce(nullif(t.priority,''),'normal'))],
      coalesce(nullif(t.subject,''), 'Support ticket'),
      coalesce(nullif(t.ai_summary,''),
               coalesce(nullif(t.category,''),'Ticket') || ' · ' || coalesce(nullif(t.priority,''),'normal')),
      '[]'::jsonb,
      coalesce(nullif(t.customer_name,''), 'Customer'),
      'Ticket',
      coalesce(t.updated_at, t.created_at),
      null::bigint,
      (select count(*) from ticket_messages m where m.ticket_id = t.id)::int,
      0,
      null::int,
      'inbox?t=' || t.id,
      (coalesce(t.priority,'') in ('high','urgent'))
    from tickets t
    where t.organization_id = p_org

    union all
    -- ── AI Agent: approval queue, and actions that failed ───────────────
    select
      'agent_action:' || a.id,
      case
        when a.status in ('pending','failed')                         then 'review'
        when a.status = 'executed'
             and a.created_at >= now() - interval '7 days'            then 'ready'
      end,
      'agent',
      array['AI Agent', initcap(replace(coalesce(nullif(a.tool,''),'action'), '_', ' '))],
      coalesce(nullif(a.title,''), 'Agent action'),
      case a.status
        when 'failed'  then coalesce(nullif(a.error,''), 'The agent could not complete this')
        when 'pending' then 'Waiting for your approval'
        else 'Executed by your agent'
      end,
      '[]'::jsonb,
      'AI agent',
      'Operator',
      a.created_at,
      null::bigint,
      0,
      0,
      null::int,
      'agent/operator',
      (a.status in ('pending','failed'))
    from agent_actions a
    where a.organization_id = p_org

    union all
    -- ── Commerce: orders ────────────────────────────────────────────────
    select
      'order:' || o.id,
      case
        when o.status in ('paid','partially_refunded')
             and o.fulfillment_status = 'unfulfilled'                 then 'todo'
        when o.status = 'pending'                                     then 'todo'
        when o.fulfillment_status = 'fulfilled'
             and o.updated_at >= now() - interval '7 days'            then 'ready'
      end,
      'commerce',
      array['Commerce', initcap(coalesce(nullif(o.fulfillment_status,''),'order'))],
      'Order ' || coalesce(nullif(o.payment_reference,''), left(o.id::text, 8)),
      case
        when o.status = 'pending'                 then 'Awaiting payment'
        when o.fulfillment_status = 'unfulfilled' then 'Paid — needs fulfilment'
        else 'Fulfilled and on its way'
      end,
      coalesce((select public.app_media(array_agg(x.u), v_base)
        from (select pr.image_url as u from order_items oi
              join products pr on pr.id = oi.product_id
              where oi.order_id = o.id and nullif(pr.image_url,'') is not null
              limit 3) x), '[]'::jsonb),
      coalesce(nullif(o.customer_name,''), 'Customer'),
      'Order',
      coalesce(o.paid_at, o.updated_at, o.created_at),
      (coalesce(o.total_cents,0) - coalesce(o.refunded_cents,0))::bigint,
      0,
      (select count(*) from order_items oi where oi.order_id = o.id)::int,
      null::int,
      'commerce',
      (o.status in ('paid','partially_refunded') and o.fulfillment_status = 'unfulfilled')
    from orders o
    where o.organization_id = p_org

    union all
    -- ── Commerce: stock about to run out ────────────────────────────────
    select
      'product:' || p.id,
      case when p.stock is not null and p.stock <= 3 then 'todo' end,
      'commerce',
      array['Commerce', 'Stock'],
      coalesce(nullif(p.name,''), 'Product'),
      case when coalesce(p.stock,0) = 0
           then 'Out of stock — restock to keep selling'
           else 'Low stock — only ' || p.stock || ' left' end,
      public.app_media(
        array[nullif(p.image_url,'')] ||
        coalesce((select array_agg(g) from jsonb_array_elements_text(
          case when jsonb_typeof(p.gallery) = 'array' then p.gallery else '[]'::jsonb end) g), '{}'), v_base),
      'Inventory',
      'Stock',
      p.updated_at,
      p.price_cents::bigint,
      0,
      0,
      null::int,
      'commerce',
      (coalesce(p.stock,0) = 0)
    from products p
    where p.organization_id = p_org and p.status = 'active'

    union all
    -- ── Invoicing ───────────────────────────────────────────────────────
    select
      'invoice:' || i.id,
      case
        when i.status = 'draft'                                       then 'todo'
        when i.status = 'sent' and i.due_date is not null
             and i.due_date < current_date                            then 'todo'
        when i.status = 'sent'                                        then 'doing'
        when i.status = 'paid'
             and coalesce(i.paid_at, i.updated_at) >= now() - interval '7 days' then 'ready'
      end,
      'invoicing',
      array['Invoicing', initcap(coalesce(nullif(i.status,''),'invoice'))],
      'Invoice ' || coalesce(nullif(i.number,''), left(i.id::text, 8)),
      case
        when i.status = 'draft' then 'Draft — not sent yet'
        when i.status = 'sent' and i.due_date is not null and i.due_date < current_date
          then 'Overdue since ' || to_char(i.due_date, 'DD Mon')
        when i.status = 'sent' then 'Sent — awaiting payment'
        else 'Paid in full'
      end,
      '[]'::jsonb,
      coalesce(nullif(i.customer_name,''), 'Customer'),
      'Invoice',
      coalesce(i.paid_at, i.updated_at, i.created_at),
      i.total_cents::bigint,
      0,
      (select count(*) from invoice_items ii where ii.invoice_id = i.id)::int,
      null::int,
      'invoicing',
      (i.status = 'sent' and i.due_date is not null and i.due_date < current_date)
    from invoices i
    where i.organization_id = p_org

    union all
    -- ── Reservations ────────────────────────────────────────────────────
    select
      'reservation:' || r.id,
      case
        when r.status = 'pending'                                     then 'todo'
        when r.status = 'confirmed' and r.start_date >= current_date   then 'doing'
        when r.status = 'confirmed' and r.end_date < current_date
             and r.end_date >= current_date - 7                        then 'ready'
      end,
      'reservations',
      array['Reservations', initcap(coalesce(nullif(r.status,''),'booking'))],
      coalesce(nullif(r.customer_name,''), 'Reservation'),
      to_char(r.start_date,'DD Mon') || ' → ' || to_char(r.end_date,'DD Mon')
        || case when coalesce(r.units,1) > 1 then ' · ' || r.units || ' units' else '' end,
      public.app_media(array[(select pr.image_url from products pr where pr.id = r.product_id)], v_base),
      coalesce(nullif(r.customer_name,''), 'Guest'),
      'Reservation',
      r.created_at,
      r.total_cents::bigint,
      0,
      coalesce(r.units,0)::int,
      -- Only for a stay that is actually under way; a future booking has no
      -- meaningful progress, so it stays null rather than showing an empty bar.
      case when r.status = 'confirmed' and r.start_date <= current_date and r.end_date >= current_date
             and r.end_date > r.start_date
           then least(100, greatest(0, round(100.0 * (current_date - r.start_date) / (r.end_date - r.start_date))))::int end,
      'reservations',
      (r.status = 'pending')
    from reservations r
    where r.organization_id = p_org

    union all
    -- ── Bookings (appointment verticals) ────────────────────────────────
    select
      'booking:' || b.id,
      case
        when b.status = 'pending'                                     then 'todo'
        when b.status = 'confirmed' and b.start_at >= now()            then 'doing'
        when b.status in ('completed','confirmed') and b.start_at < now()
             and b.start_at >= now() - interval '7 days'               then 'ready'
      end,
      'bookings',
      array['Bookings', initcap(coalesce(nullif(b.status,''),'booking'))],
      coalesce(nullif(b.customer_name,''), 'Booking'),
      to_char(b.start_at, 'DD Mon') || ' at ' || to_char(b.start_at, 'HH24:MI'),
      '[]'::jsonb,
      coalesce(nullif(b.customer_name,''), 'Customer'),
      'Booking',
      b.start_at,
      null::bigint,
      0,
      0,
      null::int,
      'bookings',
      (b.status = 'pending')
    from bookings b
    where b.organization_id = p_org

    union all
    -- ── Marketing: campaigns ────────────────────────────────────────────
    select
      'campaign:' || c.id,
      case
        when c.status = 'draft'                                       then 'todo'
        when c.status in ('scheduled','sending')                      then 'doing'
        when c.status = 'sent'
             and coalesce(c.sent_at, c.updated_at) >= now() - interval '7 days' then 'ready'
      end,
      'marketing',
      array['Marketing', initcap(coalesce(nullif(c.channel,''),'email'))],
      coalesce(nullif(c.name,''), 'Campaign'),
      coalesce(nullif(c.subject,''),
               initcap(coalesce(nullif(c.status,''),'draft')) || ' campaign'),
      '[]'::jsonb,
      'Marketing',
      'Campaign',
      coalesce(c.sent_at, c.scheduled_at, c.updated_at, c.created_at),
      null::bigint,
      0,
      coalesce(c.recipients,0)::int,
      -- Real ratio: how much of the audience has actually been sent to.
      case when coalesce(c.recipients,0) > 0
           then least(100, round(100.0 * coalesce(c.sent_count,0) / c.recipients))::int end,
      'marketing',
      false
    from campaigns c
    where c.organization_id = p_org

    union all
    -- ── Marketing: the AI outbound queue ────────────────────────────────
    select
      'outbound:' || t.id,
      case
        when t.status = 'queued'                                      then 'todo'
        when t.status = 'in_progress'                                 then 'doing'
        when t.status = 'failed'                                      then 'review'
        when t.status = 'done'
             and t.updated_at >= now() - interval '7 days'            then 'ready'
      end,
      'marketing',
      array['Outreach', initcap(replace(coalesce(nullif(t.type,''),'task'), '_', ' '))],
      coalesce(nullif(t.customer_name,''), 'Outbound task'),
      initcap(replace(coalesce(nullif(t.type,''),'task'), '_', ' '))
        || ' via ' || coalesce(nullif(t.channel,''), 'any channel'),
      '[]'::jsonb,
      coalesce(nullif(t.customer_name,''), 'Contact'),
      'Outreach',
      coalesce(t.due_at, t.updated_at, t.created_at),
      null::bigint,
      0,
      0,
      null::int,
      'marketing?tab=outreach',
      (t.status = 'failed')
    from outbound_tasks t
    where t.organization_id = p_org

    union all
    -- ── Marketing: automations that failed ──────────────────────────────
    select
      'automation_run:' || r.id,
      case when r.status = 'failed' and r.created_at >= now() - interval '14 days' then 'review' end,
      'marketing',
      array['Marketing', 'Automation'],
      'Automation failed',
      coalesce(nullif(left(r.output::text, 90), ''), 'A scheduled automation did not complete'),
      '[]'::jsonb,
      'Automation',
      'System',
      r.created_at,
      null::bigint,
      0,
      0,
      null::int,
      'marketing?tab=automations',
      true
    from automation_runs r
    where r.organization_id = p_org

    union all
    -- ── CRM: leads that have just come in ───────────────────────────────
    select
      'contact:' || c.id,
      case when c.stage = 'lead' and c.created_at >= now() - interval '14 days' then 'todo' end,
      'crm',
      array['CRM', initcap(coalesce(nullif(c.stage,''),'lead'))],
      coalesce(nullif(c.name,''), 'New lead'),
      coalesce(nullif(c.company,''), nullif(c.email,''), nullif(c.source,''), 'A new lead to qualify'),
      '[]'::jsonb,
      coalesce(nullif(c.name,''), 'Lead'),
      'Lead',
      c.created_at,
      c.value_cents::bigint,
      0,
      0,
      null::int,
      'crm',
      false
    from crm_contacts c
    where c.organization_id = p_org

    union all
    -- ── Settings: a domain that is not live yet ─────────────────────────
    select
      'domain:' || d.id,
      case when d.status <> 'live' then 'review' end,
      'settings',
      array['Settings', initcap(coalesce(nullif(d.status,''),'domain'))],
      coalesce(nullif(d.hostname,''), 'Domain'),
      'Domain ' || coalesce(nullif(d.status,''), 'not live') || ' — finish setup to go live',
      '[]'::jsonb,
      'Domain',
      'Settings',
      d.created_at,
      null::bigint,
      0,
      0,
      null::int,
      'settings',
      true
    from domains d
    where d.organization_id = p_org
  ),
  live as (select * from items where col is not null),
  ranked as (
    select l.*, row_number() over (
      partition by l.col order by l.urgent desc, l.occurred_at desc nulls last, l.id
    ) as rn
    from live l
  )
  select jsonb_build_object(
    'counts', coalesce((
      select jsonb_object_agg(t.col, t.n)
      from (select col, count(*) as n from live group by col) t
    ), '{}'::jsonb),
    'cards', coalesce((
      select jsonb_agg(to_jsonb(r) - 'rn' order by r.col, r.rn)
      from ranked r where r.rn <= greatest(p_limit, 1)
    ), '[]'::jsonb)
  ) into v;

  return v;
end $$;

revoke all on function public.app_org_work_board(uuid, int) from public, anon;
grant execute on function public.app_org_work_board(uuid, int) to authenticated, service_role;

notify pgrst, 'reload schema';
