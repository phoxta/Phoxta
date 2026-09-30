begin;
alter table public.opportunity_accounts add column billing_event_created bigint not null default 0;
alter table public.opportunity_accounts add column billing_grace_ends_at timestamptz;
alter table public.opportunity_accounts add column checkout_lease uuid;
alter table public.opportunity_accounts add column checkout_lease_expires_at timestamptz;
create function public.opportunity_claim_billing(p_user uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_token uuid;
begin
 update opportunity_accounts set checkout_lease=gen_random_uuid(),checkout_lease_expires_at=now()+interval '5 minutes'
 where user_id=p_user and (checkout_lease_expires_at is null or checkout_lease_expires_at<now()) returning checkout_lease into v_token;
 return v_token;
end; $$;
create function public.opportunity_release_billing(p_user uuid,p_token uuid) returns void language sql security definer set search_path=public as $$
 update opportunity_accounts set checkout_lease=null,checkout_lease_expires_at=null where user_id=p_user and checkout_lease=p_token;
$$;
revoke all on function opportunity_claim_billing(uuid),opportunity_release_billing(uuid,uuid) from public,anon,authenticated;
grant execute on function opportunity_claim_billing(uuid),opportunity_release_billing(uuid,uuid) to service_role;
-- Product decision: seven days to repair a failed renewal. Expiry is evaluated
-- at every entitlement check, even if no further webhook arrives.
create or replace function public.opportunity_limits(p_org uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select p.limits || coalesce((select o.limits from opportunity_entitlement_overrides o where o.org_id=p_org and (o.expires_at is null or o.expires_at>now())),'{}'::jsonb)
 from opportunity_accounts a join opportunity_plan_limits p on p.plan_key=case when a.billing_status='past_due' and (a.billing_grace_ends_at is null or a.billing_grace_ends_at<=now()) then 'free' else a.plan_key end where a.org_id=p_org;
$$;
create table public.opportunity_billing_events(event_id text primary key,event_created bigint not null,received_at timestamptz not null default now());
alter table public.opportunity_billing_events enable row level security;
revoke all on public.opportunity_billing_events from anon,authenticated;
create function public.opportunity_apply_subscription(p_event text,p_created bigint,p_user uuid,p_customer text,p_subscription text,p_plan text,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare a opportunity_accounts;
begin
 select * into a from opportunity_accounts where user_id=p_user for update;
 if not found then raise exception 'Opportunity account not found.'; end if;
 if a.stripe_customer_id is not null and a.stripe_customer_id<>p_customer then raise exception 'Billing customer mismatch.'; end if;
 if not exists(select 1 from opportunity_plan_limits where plan_key=p_plan) then raise exception 'Unknown subscription plan.'; end if;
 insert into opportunity_billing_events(event_id,event_created) values(p_event,p_created) on conflict do nothing;
 if not found then return; end if;
 if p_created<a.billing_event_created then return; end if;
 update opportunity_accounts set plan_key=case when p_status in ('active','trialing','past_due') then p_plan else 'free' end,
 billing_grace_ends_at=case when p_status='past_due' then coalesce(a.billing_grace_ends_at,now()+interval '7 days') else null end,
 billing_status=p_status,stripe_customer_id=p_customer,stripe_subscription_id=p_subscription,billing_event_created=p_created where user_id=p_user;
 insert into opportunity_audit_logs(actor_user_id,org_id,action,metadata) values(p_user,a.org_id,'billing_subscription_sync',jsonb_build_object('plan',p_plan,'status',p_status,'event_id',p_event));
end; $$;
revoke all on function opportunity_apply_subscription(text,bigint,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function opportunity_apply_subscription(text,bigint,uuid,text,text,text,text) to service_role;
commit;
