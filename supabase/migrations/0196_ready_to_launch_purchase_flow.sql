-- Ready-to-Launch purchase fulfilment.
-- A signed Stripe webhook can safely retry this function until the purchased
-- organization and its activation plan both exist.

create or replace function public.app_provision_business_paid(
  p_user uuid, p_blueprint uuid, p_name text, p_purchase uuid
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_bp public.blueprints%rowtype;
  v_purchase public.purchases%rowtype;
  v_org_id uuid;
  v_slug text;
  v_suffix text := substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
begin
  select * into v_purchase from public.purchases
   where id=p_purchase and buyer_user_id=p_user and blueprint_id=p_blueprint
   for update;
  if not found then raise exception 'Purchase not found'; end if;
  if v_purchase.status <> 'paid' then raise exception 'Purchase is not paid'; end if;
  if v_purchase.organization_id is not null then return v_purchase.organization_id; end if;

  select * into v_bp from public.blueprints where id=p_blueprint and status='live';
  if not found then raise exception 'Blueprint not available'; end if;
  v_slug := regexp_replace(lower(coalesce(v_bp.slug,'business')), '[^a-z0-9]+', '-', 'g') || '-' || v_suffix;

  insert into public.organizations (
    owner_user_id,name,slug,vertical,blueprint_id,stage,lifecycle_stage,app_path,modules,provisioned_at
  ) values (
    p_user,coalesce(nullif(btrim(p_name),''),v_bp.name),v_slug,v_bp.vertical,v_bp.id,'active','building',v_bp.app_path,coalesce(v_bp.preset,'{}'::jsonb),now()
  ) returning id into v_org_id;

  update public.purchases set organization_id=v_org_id,status='paid' where id=p_purchase;
  insert into public.agent_config(organization_id,display_name)
    values(v_org_id,coalesce(nullif(btrim(p_name),''),v_bp.name) || ' AI')
    on conflict(organization_id) do nothing;

  insert into public.workspace_tasks(organization_id,title,detail,status,source,source_id,metadata) values
    (v_org_id,'Review your offer and brand','Confirm the included offer, catalogue, pricing and launch assets before publishing.','todo','system','activation:offer-brand',jsonb_build_object('route','/app/growth','category','business')),
    (v_org_id,'Connect customer email','Connect the mailbox your AI agents will monitor and use for approved replies.','todo','system','activation:email',jsonb_build_object('route','/app/customers/email','category','channel')),
    (v_org_id,'Connect WhatsApp and channels','Add the customer channels this business will receive and respond on.','todo','system','activation:channels',jsonb_build_object('route','/app/customers/whatsapp','category','channel')),
    (v_org_id,'Configure commerce and payments','Review products, fulfilment rules and the provider used to collect customer payments.','todo','system','activation:payments',jsonb_build_object('route','/app/operations/commerce','category','operations')),
    (v_org_id,'Choose AI approval controls','Set which actions agents can complete and which require human approval.','todo','system','activation:ai-controls',jsonb_build_object('route','/app/intelligence/capabilities','category','ai')),
    (v_org_id,'Review launch readiness','Check live capabilities, providers, domain and remaining launch blockers.','todo','system','activation:domain-launch',jsonb_build_object('route','/app/intelligence/capabilities','category','launch'))
  on conflict(organization_id,source,source_id) where source_id is not null do nothing;

  insert into public.notifications(user_id,title,body,kind,link)
    values(p_user,'Your business is ready',coalesce(nullif(btrim(p_name),''),v_bp.name) || ' has been provisioned in Phoxta AI-Ops.','ai','/app/businesses/activate/' || v_org_id::text);
  return v_org_id;
end;
$$;

revoke execute on function public.app_provision_business_paid(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.app_provision_business_paid(uuid,uuid,text,uuid) to service_role;
