begin;
alter table public.cs_plan_orders add column if not exists admission_version integer not null default 0;
alter table public.cs_plan_orders add column if not exists refunded_pence integer not null default 0;

create or replace function public.cs_hold_seat(p_order uuid,p_cohort uuid) returns timestamptz
language plpgsql security definer set search_path=public as $$
declare o cs_plan_orders%rowtype; c cs_cohorts%rowtype; v_used integer; v_until timestamptz:=now()+interval '40 minutes';
begin
 select * into o from cs_plan_orders where id=p_order for update;
 if not found or o.status<>'pending' or o.plan='self_study' then raise exception 'No eligible pending order.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.organization_id::text||o.user_id::text,0));
 select * into c from cs_cohorts where id=p_cohort and organization_id=o.organization_id for update;
 if not found or c.status<>'open' or c.starts_at<=now() then raise exception 'Choose an open intake.'; end if;
 if exists(select 1 from cs_seat_holds where order_id=p_order and cohort_id=p_cohort and status='held' and expires_at>now()) then
 return (select expires_at from cs_seat_holds where order_id=p_order); end if;
 select count(*) into v_used from cs_cohort_members where cohort_id=p_cohort and status='active';
 v_used:=v_used+(select count(*) from cs_seat_holds where cohort_id=p_cohort and status='held' and expires_at>now());
 if v_used>=c.capacity then raise exception 'This intake is full. Join the waitlist or choose another intake.'; end if;
 if exists(select 1 from cs_seat_holds where organization_id=o.organization_id and user_id=o.user_id and status='held' and expires_at>now()) then raise exception 'You already have a checkout in progress. Complete it or wait for the reservation to expire.'; end if;
 insert into cs_seat_holds(order_id,organization_id,cohort_id,user_id,expires_at) values(o.id,o.organization_id,p_cohort,o.user_id,v_until);
 return v_until;
end $$;

-- Called ONLY after Stripe signature verification. Amount, currency, session and
-- current order are checked again here, in the same transaction as the grant.
create or replace function public.cs_settle_school_order(p_order uuid,p_session text,p_amount integer,p_currency text,p_customer text,p_intent text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o cs_plan_orders%rowtype; h cs_seat_holds%rowtype; c cs_cohorts%rowtype; v_plan text; v_seat boolean:=true;
begin
 select * into o from cs_plan_orders where id=p_order for update;
 if not found then raise exception 'School order not found.'; end if;
 if o.amount_pence<>p_amount or lower(o.currency)<>lower(p_currency) or (o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id<>p_session) then raise exception 'Payment does not match the school order.'; end if;
 if o.status in ('paid','refunded') then return jsonb_build_object('duplicate',true); end if;
 perform pg_advisory_xact_lock(hashtextextended(o.organization_id::text||o.user_id::text,0));
 if o.plan<>'self_study' and o.admission_version>=1 then
   select * into h from cs_seat_holds where order_id=o.id for update;
   if not found then raise exception 'The order has no intake reservation.'; end if;
   select * into c from cs_cohorts where id=h.cohort_id for update;
   if exists(select 1 from cs_cohort_members where cohort_id=c.id and user_id=o.user_id and status='active') then v_seat:=true;
   elsif (select count(*) from cs_cohort_members where cohort_id=c.id and status='active')+(select count(*) from cs_seat_holds where cohort_id=c.id and order_id<>o.id and status='held' and expires_at>now())>=c.capacity then
     v_seat:=false;
     insert into cs_support_tickets(organization_id,user_id,subject,body) values(o.organization_id,o.user_id,'Paid intake needs allocation','A delayed payment arrived after this intake filled. Programme staff must arrange a transfer or refund. Order: '||o.id::text);
   else
     update cs_cohort_members set status='transferred' where organization_id=o.organization_id and user_id=o.user_id and status='active';
     insert into cs_cohort_members(organization_id,cohort_id,user_id) values(o.organization_id,c.id,o.user_id) on conflict(organization_id,cohort_id,user_id) do update set status='active';
   end if;
   update cs_seat_holds set status=case when v_seat then 'confirmed' else 'released' end where order_id=o.id;
 end if;
 select plan into v_plan from cs_entitlements where organization_id=o.organization_id and user_id=o.user_id and status='active' and (expires_at is null or expires_at>now()) for update;
 if v_plan is null or array_position(array['self_study','cohort','launch'],o.plan)>=array_position(array['self_study','cohort','launch'],v_plan) then
   insert into cs_entitlements(organization_id,user_id,plan,status,granted_at,stripe_customer_id,stripe_checkout_session_id,stripe_payment_intent_id)
   values(o.organization_id,o.user_id,o.plan,'active',now(),p_customer,p_session,p_intent)
   on conflict(organization_id,user_id) do update set plan=excluded.plan,status='active',granted_at=excluded.granted_at,stripe_customer_id=excluded.stripe_customer_id,stripe_checkout_session_id=excluded.stripe_checkout_session_id,stripe_payment_intent_id=excluded.stripe_payment_intent_id;
 end if;
 update cs_plan_orders set status='paid',paid_at=now(),stripe_checkout_session_id=p_session,stripe_payment_intent_id=p_intent where id=o.id;
 if o.plan='launch' then insert into cs_launch_allocations(organization_id,user_id) values(o.organization_id,o.user_id) on conflict do nothing; end if;
 insert into cs_staff_audit(organization_id,action,target,detail) values(o.organization_id,'payment.settled',o.id::text,jsonb_build_object('seat_allocated',v_seat,'plan',o.plan));
 return jsonb_build_object('active',true,'seat_allocated',v_seat);
end $$;

create or replace function public.cs_refund_school_order(p_intent text,p_refunded integer) returns void
language plpgsql security definer set search_path=public as $$
declare o cs_plan_orders%rowtype; v_previous cs_plan_orders%rowtype;
begin
 select * into o from cs_plan_orders where stripe_payment_intent_id=p_intent for update;
 if not found then return; end if;
 update cs_plan_orders set refunded_pence=greatest(refunded_pence,p_refunded),status=case when p_refunded>=amount_pence then 'refunded' else status end where id=o.id;
 if p_refunded<o.amount_pence then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.organization_id::text||o.user_id::text,0));
 select * into v_previous from cs_plan_orders where organization_id=o.organization_id and user_id=o.user_id and status='paid' and id<>o.id
 order by array_position(array['self_study','cohort','launch'],plan) desc,paid_at desc limit 1;
 if v_previous.id is null then
 update cs_entitlements set status='revoked' where organization_id=o.organization_id and user_id=o.user_id;
 else
 update cs_entitlements set status='active',plan=v_previous.plan,stripe_checkout_session_id=v_previous.stripe_checkout_session_id,stripe_payment_intent_id=v_previous.stripe_payment_intent_id where organization_id=o.organization_id and user_id=o.user_id;
 end if;
 if v_previous.id is null or v_previous.plan='self_study' then update cs_cohort_members set status='cancelled' where organization_id=o.organization_id and user_id=o.user_id and status='active'; end if;
 if o.plan='launch' and (v_previous.id is null or v_previous.plan<>'launch') then update cs_launch_allocations set status='on_hold',investor_consent_at=null,shared_materials='' where organization_id=o.organization_id and user_id=o.user_id; end if;
 insert into cs_staff_audit(organization_id,action,target,detail) values(o.organization_id,'payment.refunded',o.id::text,jsonb_build_object('refunded_pence',p_refunded));
end $$;

-- The existing business provisioner runs inside this transaction and row lock.
-- If ANY step fails it rolls back; concurrent/retried clicks return the same org.
create or replace function public.cs_provision_launch(p_org uuid,p_user uuid) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare a cs_launch_allocations%rowtype; v_purchase uuid; v_org uuid; v_name text;
begin
 perform cs_assert_staff(p_org,'launch');
 if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Verify your authenticator before provisioning a business.'; end if;
 select * into a from cs_launch_allocations where organization_id=p_org and user_id=p_user for update;
 if not found then raise exception 'Launch selection not found.'; end if;
 if a.provisioned_org_id is not null then return a.provisioned_org_id; end if;
 if a.status<>'reserved' or a.ownership_accepted_at is null or a.blueprint_id is null then raise exception 'The founder must select and accept a business first.'; end if;
 if not exists(select 1 from cs_entitlements where organization_id=p_org and user_id=p_user and status='active' and (expires_at is null or expires_at>now()) and plan='launch') then raise exception 'Active paid Launch admission is required.'; end if;
 if not exists(select 1 from cs_launch_catalogue where organization_id=p_org and blueprint_id=a.blueprint_id and enabled) then raise exception 'The selected business is not available.'; end if;
 select name into v_name from blueprints where id=a.blueprint_id and status='live';
 if not found then raise exception 'This blueprint is not currently provisionable.'; end if;
 insert into purchases(buyer_user_id,blueprint_id,amount_cents,currency,status) values(p_user,a.blueprint_id,0,'GBP','pending') returning id into v_purchase;
 v_org:=app_provision_business_paid(p_user,a.blueprint_id,v_name,v_purchase);
 update cs_launch_allocations set provisioned_org_id=v_org,purchase_id=v_purchase,status='handover',updated_at=now() where organization_id=p_org and user_id=p_user;
 perform cs_audit(p_org,'launch.provisioned',p_user::text,jsonb_build_object('business_id',v_org,'included_with_admission',true));
 return v_org;
end $$;
revoke all on function public.cs_hold_seat(uuid,uuid),public.cs_settle_school_order(uuid,text,integer,text,text,text),public.cs_refund_school_order(text,integer) from public,anon,authenticated;
grant execute on function public.cs_hold_seat(uuid,uuid),public.cs_settle_school_order(uuid,text,integer,text,text,text),public.cs_refund_school_order(text,integer) to service_role;
revoke all on function public.cs_provision_launch(uuid,uuid) from public,anon;
grant execute on function public.cs_provision_launch(uuid,uuid) to authenticated;
commit;
