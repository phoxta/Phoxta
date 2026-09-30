-- Real database functions, synthetic identities, and a full rollback. No Stripe
-- charge, email, live room connection or production business is created.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-8000-000000000401','rules-owner@example.invalid',now()),
('00000000-0000-4000-8000-000000000402','rules-learner@example.invalid',now()),
('00000000-0000-4000-8000-000000000403','rules-mentor@example.invalid',now());
insert into cs_staff_assignments(organization_id,user_id,role,scope_type,scope_id) values
('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000401','owner','school',''),
('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000403','mentor','learner','00000000-0000-4000-8000-000000000402');
insert into cs_mentors(organization_id,id,name,user_id,bookable) values
('2a51e95e-258d-405d-920b-6271d893344f','rules-mentor','Rules mentor','00000000-0000-4000-8000-000000000403',true);
insert into cs_cohorts(id,organization_id,name,starts_at,ends_at,capacity,mentor_sessions,status)
values('00000000-0000-4000-8000-000000000410','2a51e95e-258d-405d-920b-6271d893344f','RULES TEST - rollback','2026-10-14 00:00 Europe/London','2027-01-31 23:59 Europe/London',null,0,'open');
insert into cs_plan_orders(id,organization_id,user_id,plan,amount_pence,currency,admission_version)
values('00000000-0000-4000-8000-000000000411','2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000402','launch',500000,'GBP',2);
select cs_hold_seat('00000000-0000-4000-8000-000000000411','00000000-0000-4000-8000-000000000410');
select cs_settle_school_order('00000000-0000-4000-8000-000000000411','cs_rules_test',500000,'gbp','cus_rules','pi_rules');
do $$ declare e cs_entitlements%rowtype; until_at timestamptz; begin
 select * into e from cs_entitlements where user_id='00000000-0000-4000-8000-000000000402';
 if e.expires_at is null or abs(extract(epoch from (e.expires_at-(e.granted_at+interval '1 year'))))>2 then raise exception 'FAIL: one-year term not applied'; end if;
 until_at:=e.expires_at;
 perform cs_settle_school_order('00000000-0000-4000-8000-000000000411','cs_rules_test',500000,'gbp','cus_rules','pi_rules');
 if (select expires_at from cs_entitlements where user_id=e.user_id)<>until_at then raise exception 'FAIL: webhook retry extended access'; end if;
 if (select x->'seats_left' from jsonb_array_elements(cs_public_intakes(e.organization_id)) x where x->>'id'='00000000-0000-4000-8000-000000000410')<>'null'::jsonb then raise exception 'FAIL: uncapped intake advertised as full'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000402","role":"authenticated","aal":"aal1"}',true);
-- Three sessions across the UK clock-change week all count in the same week.
insert into cs_bookings(organization_id,mentor_id,user_id,starts_at,ends_at)
select '2a51e95e-258d-405d-920b-6271d893344f','rules-mentor','00000000-0000-4000-8000-000000000402',t,t+interval '30 minutes'
from unnest(array['2026-10-19 10:00 Europe/London'::timestamptz,'2026-10-21 10:00 Europe/London'::timestamptz,'2026-10-25 10:00 Europe/London'::timestamptz]) as t;
do $$ declare blocked boolean:=false; begin
 begin
 insert into cs_bookings(organization_id,mentor_id,user_id,starts_at,ends_at) values
 ('2a51e95e-258d-405d-920b-6271d893344f','rules-mentor','00000000-0000-4000-8000-000000000402','2026-10-25 12:00 Europe/London','2026-10-25 12:30 Europe/London');
 exception when others then if sqlerrm not like '%three mentoring%' then raise; end if; blocked:=true; end;
 if not blocked then raise exception 'FAIL: fourth weekly session allowed'; end if;
end $$;
insert into cs_bookings(organization_id,mentor_id,user_id,starts_at,ends_at) values
('2a51e95e-258d-405d-920b-6271d893344f','rules-mentor','00000000-0000-4000-8000-000000000402','2026-10-26 10:00 Europe/London','2026-10-26 10:30 Europe/London');
update cs_entitlements set expires_at=now()-interval '1 second' where user_id='00000000-0000-4000-8000-000000000402';
do $$ begin if cs_has_access('2a51e95e-258d-405d-920b-6271d893344f') then raise exception 'FAIL: expired admission can read courses'; end if; end $$;
update cs_entitlements set expires_at=now()+interval '1 year' where user_id='00000000-0000-4000-8000-000000000402';
select cs_school_command('2a51e95e-258d-405d-920b-6271d893344f','select_business',jsonb_build_object('blueprint_id',(select blueprint_id from cs_launch_catalogue where organization_id='2a51e95e-258d-405d-920b-6271d893344f' and enabled limit 1),'accept_ownership',true));
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated","aal":"aal2"}',true);
do $$ declare business uuid; second_business uuid; s subscriptions%rowtype; begin
 business:=cs_provision_launch('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000402');
 second_business:=cs_provision_launch('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000402');
 if business<>second_business then raise exception 'FAIL: second business provisioned on retry'; end if;
 select * into s from subscriptions where organization_id=business;
 if s.status<>'active' or s.amount_cents<>0 or s.school_included_until is null
 or abs(extract(epoch from (s.school_included_until-(now()+interval '3 months'))))>2
 or s.stripe_subscription_id is not null or s.paystack_subscription_code is not null then raise exception 'FAIL: three-month console benefit not correctly granted'; end if;
 -- Exercise expiry on only this synthetic benefit, without calling the global
 -- scheduled function, so no existing subscription is touched even in rollback.
 update subscriptions set school_included_until=now()-interval '1 second' where organization_id=business;
 if not exists(select 1 from subscriptions where organization_id=business and school_included_until<=now() and amount_cents=0 and stripe_subscription_id is null) then raise exception 'FAIL: complimentary expiry predicate'; end if;
end $$;
rollback;
