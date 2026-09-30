begin;

-- New admissions receive one calendar year. Historical purchases keep their
-- existing terms; do not retroactively shorten an already purchased admission.
alter table public.cs_entitlements add column if not exists expires_at timestamptz;
alter table public.cs_plan_orders add column if not exists access_expires_at timestamptz;
alter table public.cs_plan_orders add column if not exists terms_accepted_at timestamptz;
alter table public.cs_plan_orders add column if not exists terms_snapshot jsonb not null default '{}';
create or replace function public.cs_entitlement_term() returns trigger
language plpgsql security definer set search_path=public as $$
declare o cs_plan_orders%rowtype;
begin
 if tg_op='INSERT' or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id then
   select * into o from cs_plan_orders where organization_id=new.organization_id and user_id=new.user_id
     and stripe_checkout_session_id=new.stripe_checkout_session_id;
   if found and o.admission_version>=2 then
     new.expires_at:=coalesce(o.access_expires_at,coalesce(o.paid_at,now())+interval '1 year');
   elsif found then new.expires_at:=null;
   end if;
 end if;
 return new;
end $$;
create trigger school_entitlement_term before insert or update on public.cs_entitlements
for each row execute function public.cs_entitlement_term();

create or replace function public.cs_order_term() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status='paid' and old.status<>'paid' and new.admission_version>=2 then
   new.access_expires_at:=coalesce(new.paid_at,now())+interval '1 year';
   update cs_entitlements set expires_at=new.access_expires_at
   where organization_id=new.organization_id and user_id=new.user_id and stripe_checkout_session_id=new.stripe_checkout_session_id;
 end if;
 return new;
end $$;
create trigger school_order_term before update on public.cs_plan_orders for each row execute function public.cs_order_term();

create or replace function public.cs_has_access(p_org uuid,p_min_plan text default 'self_study')
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_entitlements e where e.organization_id=p_org and e.user_id=auth.uid() and e.status='active'
   and (e.expires_at is null or e.expires_at>now())
   and case e.plan when 'self_study' then 1 when 'cohort' then 2 when 'launch' then 3 else 0 end
       >=case p_min_plan when 'self_study' then 1 when 'cohort' then 2 when 'launch' then 3 else 999 end);
$$;

alter table public.cs_cohorts add column if not exists mentor_weekly_min integer not null default 1 check(mentor_weekly_min=1);
alter table public.cs_cohorts add column if not exists mentor_weekly_max integer not null default 3 check(mentor_weekly_max=3);
-- Keep the original total column compatible with existing clients; the actual
-- limit is enforced per calendar week of the chosen intake's timezone.
create or replace function public.cs_intake_mentor_total() returns trigger
language plpgsql set search_path=public as $$
begin
 new.mentor_sessions:=greatest(1,ceil(extract(epoch from (new.ends_at-new.starts_at))/604800)::integer)*3;
 return new;
end $$;
create trigger school_intake_mentor_total before insert or update of starts_at,ends_at on public.cs_cohorts
for each row execute function public.cs_intake_mentor_total();

create or replace function public.cs_require_cohort_access() returns trigger
language plpgsql security definer set search_path=public as $$
declare c cs_cohorts%rowtype; week_start timestamptz; week_end timestamptz; used integer;
begin
 if auth.uid() is null and auth.role()='service_role' then return new; end if;
 if tg_table_name='cs_live_participants' then
   if not cs_live_access(new.organization_id,new.live_lesson_id) then raise exception 'This class is not part of your active access.'; end if;
 elsif tg_table_name='cs_bookings' then
   if new.user_id=auth.uid() then
     if not cs_has_access(new.organization_id,'cohort') then raise exception 'Active Cohort or Launch admission is required.'; end if;
     if new.status<>'cancelled' and (tg_op='INSERT' or new.starts_at is distinct from old.starts_at or old.status='cancelled') then
       perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text||new.user_id::text,0));
       select co.* into c from cs_cohort_members m join cs_cohorts co on co.id=m.cohort_id
       where m.organization_id=new.organization_id and m.user_id=new.user_id and m.status='active'
         and new.starts_at>=co.starts_at and new.ends_at<=co.ends_at order by co.starts_at desc limit 1;
       if not found then raise exception 'Choose a mentoring session within your assigned intake dates.'; end if;
       week_start:=date_trunc('week',new.starts_at at time zone c.timezone) at time zone c.timezone;
       week_end:=(date_trunc('week',new.starts_at at time zone c.timezone)+interval '1 week') at time zone c.timezone;
       select count(*) into used from cs_bookings where organization_id=new.organization_id and user_id=new.user_id
         and status<>'cancelled' and starts_at>=week_start and starts_at<week_end and id<>new.id;
       if used>=c.mentor_weekly_max then raise exception 'You can book up to three mentoring sessions per week. Choose another week or contact programme support.'; end if;
       if not exists(select 1 from cs_mentors m where m.organization_id=new.organization_id and m.id=new.mentor_id and m.bookable
          and (cs_staff_can(new.organization_id,'mentoring','learner',new.user_id::text,m.user_id)
            or cs_staff_can(new.organization_id,'mentoring','cohort',c.id::text,m.user_id))) then
          raise exception 'This mentor is not assigned to your intake. Contact programme support.';
       end if;
     end if;
   elsif not cs_mentor_access(new.organization_id,new.mentor_id,new.user_id) then raise exception 'This booking is not assigned to you.'; end if;
 end if;
 return new;
end $$;

-- Only explicitly approved commercial terms, not staff-only settings, are public.
create or replace function public.cs_public_school_terms(p_org uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('version','2026-09-26','access_policy',access_policy,'cancellation_policy',cancellation_policy,
   'launch_terms',launch_terms,'mentoring_policy','One mentoring session each week during your intake, with up to three sessions per Monday-Sunday week where mentor slots are available. Contact programme support if you cannot book your weekly session. Unused sessions do not roll over.')
 from cs_school_settings where organization_id=p_org;
$$;
revoke all on function public.cs_public_school_terms(uuid) from public;
grant execute on function public.cs_public_school_terms(uuid) to anon,authenticated,service_role;

insert into cs_school_settings(organization_id,access_policy,cancellation_policy,completion_policy,launch_terms)
values('2a51e95e-258d-405d-920b-6271d893344f',
 'New admissions include one calendar year of access to courses, toolkits, templates and your learning workspace, starting when payment is confirmed. There is no automatic renewal. Live classes and mentoring run during your assigned intake. Earlier purchases retain the access terms under which they were sold.',
 'You may cancel your admission within 14 days after purchase for a full refund, even if you have started learning. Request cancellation through Programme support or the contact details on phoxta.com; include your name and payment reference. You do not have to use a particular form. We aim to return approved refunds to the original payment method within 14 days of your cancellation request. If a business has already been provisioned, the team will coordinate the return of its access and assets as part of cancellation; this does not remove your statutory rights. After the cooling-off period, requests are reviewed individually and statutory remedies remain available. One move to a later available intake is free if requested at least seven days before your intake starts, subject to capacity. Later requests, illness and exceptional circumstances are reviewed individually. Transfers are between intakes, not between people. If Phoxta cancels an intake, choose an available replacement or a refund. These policies do not limit your statutory rights.',
 'Complete every course lesson, score at least 70% in each quiz and receive a confirmed pass for published practical assignments to request a course certificate.',
 'Launch includes one business of your choice from the live Phoxta business marketplace, the assets described in its listing, supported provisioning and handover, and three calendar months of Phoxta Operating Console access from provisioning. The included console period has no automatic paid renewal. Choose and expressly approve a paid plan if you want to continue afterwards. Third-party costs such as domains, payment processing, advertising, inventory and external services are separate and must be reviewed before activation. Investor-network access is not a guarantee of funding or business revenue.')
on conflict(organization_id) do update set access_policy=excluded.access_policy,cancellation_policy=excluded.cancellation_policy,
 completion_policy=excluded.completion_policy,launch_terms=excluded.launch_terms;

-- Make every currently live marketplace choice available, not an arbitrary
-- school shortlist. Draft and archived businesses cannot be provisioned.
insert into cs_launch_catalogue(organization_id,blueprint_id,included_assets,ongoing_costs,enabled)
select '2a51e95e-258d-405d-920b-6271d893344f',id,
 'One provisioned '||name||' business with the assets described in its Phoxta listing and a supported handover. Includes three months of Phoxta Operating Console access.',
 'Operating Console fees are included for three months from provisioning. No automatic paid renewal. External service, domain, transaction, advertising and inventory costs are separate; review these before activation.',true
from blueprints where status='live'
on conflict(organization_id,blueprint_id) do update set enabled=true;
create or replace function public.cs_sync_launch_choice() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status='live' then
   insert into cs_launch_catalogue(organization_id,blueprint_id,included_assets,ongoing_costs,enabled)
   values('2a51e95e-258d-405d-920b-6271d893344f',new.id,
    'One provisioned '||new.name||' business with its listed assets, supported handover and three months of Phoxta Operating Console access.',
    'No console fee for the first three months and no automatic renewal. External services, domains, transactions, advertising and inventory are separate.',true)
   on conflict(organization_id,blueprint_id) do update set enabled=true;
 else update cs_launch_catalogue set enabled=false where organization_id='2a51e95e-258d-405d-920b-6271d893344f' and blueprint_id=new.id;
 end if;
 return new;
end $$;
create trigger school_launch_choices after insert or update of status on public.blueprints for each row execute function public.cs_sync_launch_choice();

alter table public.cs_launch_allocations add column if not exists console_included_until timestamptz;
alter table public.subscriptions add column if not exists school_included_until timestamptz;
create or replace function public.cs_launch_console_benefit() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.provisioned_org_id is not null and old.provisioned_org_id is null then
   new.console_included_until:=now()+interval '3 months';
   insert into subscriptions(organization_id,plan,status,amount_cents,currency,current_period_end,school_included_until)
   values(new.provisioned_org_id,'growth','active',0,'GBP',new.console_included_until,new.console_included_until)
   on conflict(organization_id) do nothing;
 end if;
 return new;
end $$;
create trigger school_launch_console_benefit before update on public.cs_launch_allocations for each row execute function public.cs_launch_console_benefit();

-- No stored-card charge is created. Expiry cancels only the complimentary row,
-- never a paid subscription that the business owner subsequently authorised.
create or replace function public.cs_expire_console_benefits() returns integer
language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
 update subscriptions set status='canceled',updated_at=now()
 where school_included_until<=now() and status='active' and amount_cents=0
   and stripe_subscription_id is null and paystack_subscription_code is null;
 get diagnostics affected=row_count;
 return affected;
end $$;
revoke all on function public.cs_expire_console_benefits() from public,anon,authenticated;
grant execute on function public.cs_expire_console_benefits() to service_role;
do $$ begin if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('startup-school-console-benefits','5 * * * *','select public.cs_expire_console_benefits()'); end if; end $$;

commit;
