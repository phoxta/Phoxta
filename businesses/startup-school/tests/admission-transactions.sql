begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-8000-000000000201','seat-one@example.invalid',now()),
('00000000-0000-4000-8000-000000000202','seat-two@example.invalid',now());
insert into public.cs_cohorts(id,organization_id,name,starts_at,ends_at,capacity,mentor_sessions,status)
values('00000000-0000-4000-8000-000000000210','2a51e95e-258d-405d-920b-6271d893344f','TRANSACTION TEST - rollback',now()+interval '10 days',now()+interval '30 days',1,2,'open');
insert into public.cs_plan_orders(id,organization_id,user_id,plan,amount_pence,currency,status,admission_version) values
('00000000-0000-4000-8000-000000000211','2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000201','cohort',120000,'GBP','pending',1),
('00000000-0000-4000-8000-000000000212','2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000202','cohort',120000,'GBP','pending',1),
('00000000-0000-4000-8000-000000000213','2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000201','self_study',25000,'GBP','pending',1);
do $$ declare blocked boolean:=false; result jsonb; begin
 perform cs_hold_seat('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000210');
 begin perform cs_hold_seat('00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000210'); exception when others then blocked:=true; end;
 if not blocked then raise exception 'FAIL: held seat oversold'; end if;
 blocked:=false;
 begin perform cs_settle_school_order('00000000-0000-4000-8000-000000000211','cs_test_fake',25000,'gbp','cus_fake','pi_fake'); exception when others then blocked:=true; end;
 if not blocked then raise exception 'FAIL: wrong amount accepted'; end if;
 if exists(select 1 from cs_entitlements where user_id='00000000-0000-4000-8000-000000000201') then raise exception 'FAIL: amount mismatch granted access'; end if;
 perform cs_settle_school_order('00000000-0000-4000-8000-000000000211','cs_test_fake',120000,'gbp','cus_fake','pi_fake');
 result:=cs_settle_school_order('00000000-0000-4000-8000-000000000211','cs_test_fake',120000,'gbp','cus_fake','pi_fake');
 if result->>'duplicate'<>'true' then raise exception 'FAIL: webhook retry not idempotent'; end if;
 if (select count(*) from cs_cohort_members where cohort_id='00000000-0000-4000-8000-000000000210' and status='active')<>1 then raise exception 'FAIL: membership count'; end if;
 if (select plan from cs_entitlements where user_id='00000000-0000-4000-8000-000000000201')<>'cohort' then raise exception 'FAIL: settled plan'; end if;
 -- A lower-value late webhook must not downgrade an existing admission.
 perform cs_settle_school_order('00000000-0000-4000-8000-000000000213','cs_test_fake2',25000,'gbp','cus_fake','pi_fake2');
 if (select plan from cs_entitlements where user_id='00000000-0000-4000-8000-000000000201')<>'cohort' then raise exception 'FAIL: late lower plan downgraded access'; end if;
 -- Partial refunds preserve access; a full refund restores a previous paid tier.
 perform cs_refund_school_order('pi_fake',100);
 if (select status from cs_plan_orders where id='00000000-0000-4000-8000-000000000211')<>'paid' then raise exception 'FAIL: partial refund revoked access'; end if;
 perform cs_refund_school_order('pi_fake',120000);
 if (select plan from cs_entitlements where user_id='00000000-0000-4000-8000-000000000201')<>'self_study' then raise exception 'FAIL: full refund did not restore paid lower tier'; end if;
 perform cs_refund_school_order('pi_fake2',25000);
 if (select status from cs_entitlements where user_id='00000000-0000-4000-8000-000000000201')<>'revoked' then raise exception 'FAIL: full refunds left free access'; end if;
end $$;
rollback;
