-- Phoxta — 0079: generic customer enquiries.
--
-- 0078 added special orders for the food vertical. The same shape serves every
-- other "ask before you buy" moment a storefront has — a car dealership needs
-- test drives, part-exchange valuations and finance enquiries; a furniture shop
-- needs bulk quotes. Rather than one RPC per vertical, this is the general one:
-- a structured question that becomes a ticket in the business's operating
-- console Inbox and a CRM lead.
--
-- app_submit_special_order stays as-is so the restaurant keeps working; it is
-- the food-flavoured wrapper of this idea.

create or replace function public.app_submit_enquiry(
  p_org uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_kind text,        -- test-drive | part-exchange | finance | reserve | quote | question
  p_subject text,     -- what it is about (e.g. the vehicle)
  p_when date,        -- preferred date, where one applies
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
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_kind  text := coalesce(nullif(btrim(lower(p_kind)), ''), 'question');
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_body text;
begin
  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'An email address is required so we can reply.');
  end if;

  -- Public endpoint that writes rows: keep a ceiling on it.
  if (select count(*) from tickets
      where organization_id = p_org and lower(customer_email) = v_email
        and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'You have sent several enquiries already — we will come back to you shortly.');
  end if;

  v_body :=
    initcap(replace(v_kind, '-', ' ')) || ' enquiry' ||
    coalesce(E'\nAbout: '     || v_subject, '') ||
    coalesce(E'\nPreferred: ' || to_char(p_when, 'DD Mon YYYY'), '') ||
    coalesce(E'\nPhone: '     || nullif(btrim(p_phone), ''), '') ||
    coalesce(E'\n\n'          || nullif(btrim(p_details), ''), '');

  insert into tickets (organization_id, subject, customer_name, customer_email, status, priority, category)
  values (
    p_org,
    initcap(replace(v_kind, '-', ' ')) || coalesce(' — ' || v_subject, ''),
    coalesce(v_name, 'Customer'),
    v_email,
    'open',
    -- Someone asking to come in and drive a car is a hot lead; treat it that way.
    case when v_kind in ('test-drive', 'reserve') then 'high' else 'normal' end,
    'enquiry'
  )
  returning id into v_ticket;

  insert into ticket_messages (organization_id, ticket_id, author, body)
  values (p_org, v_ticket, 'customer', v_body);

  select id into v_contact from crm_contacts
   where organization_id = p_org and lower(email) = v_email limit 1;
  if v_contact is null then
    insert into crm_contacts (organization_id, name, email, phone, stage, source, notes)
    values (p_org, coalesce(v_name, 'Customer'), v_email, nullif(btrim(p_phone), ''), 'lead',
            replace(v_kind, '-', ' '), coalesce(v_subject, 'Enquiry'));
  else
    update crm_contacts
       set phone = coalesce(phone, nullif(btrim(p_phone), '')),
           name  = coalesce(name, v_name),
           updated_at = now()
     where id = v_contact;
  end if;

  return jsonb_build_object('ok', true, 'reference', left(v_ticket::text, 8));
end $$;

revoke all on function public.app_submit_enquiry(uuid, text, text, text, text, text, date, text) from public;
grant execute on function public.app_submit_enquiry(uuid, text, text, text, text, text, date, text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
