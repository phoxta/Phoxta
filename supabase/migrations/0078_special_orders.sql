-- Phoxta — 0078: special order requests.
--
-- A digital-first food business does two things: takes ordinary online orders
-- from the menu, and takes SPECIAL ORDERS — catering, bulk, custom cakes, event
-- platters — which are a conversation before they are a sale. Those cannot go
-- through the normal cart: quantity, date, budget and dietary needs have to be
-- agreed first.
--
-- A special order is modelled as a helpdesk ticket rather than a new table, so
-- it lands in the operating console Inbox where the owner already works, can be
-- replied to on any channel, assigned, and turned into an invoice. The
-- structured fields are kept both in the ticket body (human-readable, so the AI
-- agent can answer about it) and on the CRM contact (so it counts as a lead).

create or replace function public.app_submit_special_order(
  p_org uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_kind text,          -- catering | bulk | custom | event
  p_when date,
  p_headcount int,
  p_budget_cents bigint,
  p_details text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket uuid;
  v_contact uuid;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_kind text := coalesce(nullif(btrim(lower(p_kind)), ''), 'custom');
  v_body text;
begin
  -- Public form: an email is the minimum needed to reply at all.
  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'An email address is required so we can reply.');
  end if;
  if p_details is null or btrim(p_details) = '' then
    return jsonb_build_object('ok', false, 'error', 'Tell us a little about what you need.');
  end if;

  -- Rate guard: a public endpoint that creates rows needs a ceiling.
  if (select count(*) from tickets
      where organization_id = p_org and lower(customer_email) = v_email
        and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'You have sent several requests already — we will come back to you shortly.');
  end if;

  v_body :=
    'Special order request (' || v_kind || ')' ||
    coalesce(E'\nWhen: '      || to_char(p_when, 'DD Mon YYYY'), '') ||
    coalesce(E'\nHeadcount: ' || p_headcount::text, '') ||
    coalesce(E'\nBudget: '    || (p_budget_cents / 100)::text, '') ||
    coalesce(E'\nPhone: '     || nullif(btrim(p_phone), ''), '') ||
    E'\n\n' || btrim(p_details);

  insert into tickets (organization_id, subject, customer_name, customer_email, status, priority, category)
  values (
    p_org,
    initcap(v_kind) || ' request' || coalesce(' — ' || to_char(p_when, 'DD Mon'), ''),
    coalesce(v_name, 'Customer'),
    v_email,
    'open',
    case when p_when is not null and p_when <= current_date + 7 then 'high' else 'normal' end,
    'special-order'
  )
  returning id into v_ticket;

  insert into ticket_messages (organization_id, ticket_id, author, body)
  values (p_org, v_ticket, 'customer', v_body);

  -- Same person, one CRM record, whether they ordered as a guest or signed in.
  select id into v_contact from crm_contacts
   where organization_id = p_org and lower(email) = v_email limit 1;
  if v_contact is null then
    insert into crm_contacts (organization_id, name, email, phone, stage, source, notes)
    values (p_org, coalesce(v_name, 'Customer'), v_email, nullif(btrim(p_phone), ''), 'lead',
            'special order', 'Asked about a ' || v_kind || ' order.');
  else
    update crm_contacts
       set phone = coalesce(phone, nullif(btrim(p_phone), '')),
           name  = coalesce(name, v_name),
           updated_at = now()
     where id = v_contact;
  end if;

  return jsonb_build_object('ok', true, 'reference', left(v_ticket::text, 8));
end $$;

revoke all on function public.app_submit_special_order(uuid, text, text, text, text, date, int, bigint, text) from public;
grant execute on function public.app_submit_special_order(uuid, text, text, text, text, date, int, bigint, text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
