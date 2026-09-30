begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-8000-000000000301','mentor-test@example.invalid',now()),
('00000000-0000-4000-8000-000000000302','mentee-test@example.invalid',now()),
('00000000-0000-4000-8000-000000000303','unassigned-test@example.invalid',now());
insert into cs_profiles(organization_id,user_id,name) select '2a51e95e-258d-405d-920b-6271d893344f',id,email from auth.users where id in ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000303');
insert into cs_mentors(organization_id,id,name,user_id) values('2a51e95e-258d-405d-920b-6271d893344f','mentor-privacy-test','Private mentor','00000000-0000-4000-8000-000000000301');
insert into cs_staff_assignments(organization_id,user_id,role,scope_type,scope_id) values('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000301','mentor','learner','00000000-0000-4000-8000-000000000302');
insert into cs_entitlements(organization_id,user_id,plan,status) values
('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000302','cohort','active'),
('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000303','launch','active');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into cs_bookings(organization_id,id,mentor_id,user_id,starts_at,ends_at) values('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000310','mentor-privacy-test','00000000-0000-4000-8000-000000000302',now()+interval '1 day',now()+interval '1 day 30 minutes');
insert into cs_booking_notes(organization_id,booking_id,body) values('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000310','Private preparation - must not leak');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare v_room text;v_count integer; begin
 v_room:=cs_mentoring_room('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000310');
 if not cs_live_access('2a51e95e-258d-405d-920b-6271d893344f',v_room) or not cs_is_live_host('2a51e95e-258d-405d-920b-6271d893344f',v_room,auth.uid()) then raise exception 'FAIL: assigned mentor cannot host'; end if;
 select count(*) into v_count from cs_booking_notes where booking_id='00000000-0000-4000-8000-000000000310';
 if v_count<>1 then raise exception 'FAIL: mentor private notes missing'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare v_room text;v_count integer; begin
 v_room:=cs_mentoring_room('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000310');
 if not cs_live_access('2a51e95e-258d-405d-920b-6271d893344f',v_room) then raise exception 'FAIL: founder cannot join own session'; end if;
 if cs_is_live_host('2a51e95e-258d-405d-920b-6271d893344f',v_room,auth.uid()) then raise exception 'FAIL: learner received host role'; end if;
 select count(*) into v_count from cs_booking_notes where booking_id='00000000-0000-4000-8000-000000000310';
 if v_count<>0 then raise exception 'FAIL: founder can see private preparation'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000303","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare v_count integer;v_blocked boolean:=false;begin
 if cs_live_access('2a51e95e-258d-405d-920b-6271d893344f','mentoring-00000000-0000-4000-8000-000000000310') then raise exception 'FAIL: unassigned founder can enter private mentoring'; end if;
 select count(*) into v_count from cs_live_lessons where id='mentoring-00000000-0000-4000-8000-000000000310';
 if v_count<>0 then raise exception 'FAIL: private mentoring metadata exposed'; end if;
 begin perform cs_session_context('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000310'); exception when others then v_blocked:=true; end;
 if not v_blocked then raise exception 'FAIL: private founder context exposed'; end if;
end $$;
reset role;
update cs_staff_assignments set active=false where user_id='00000000-0000-4000-8000-000000000301';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ begin
 if cs_live_access('2a51e95e-258d-405d-920b-6271d893344f','mentoring-00000000-0000-4000-8000-000000000310') then raise exception 'FAIL: revoked mentor can join room'; end if;
 if exists(select 1 from cs_booking_notes where booking_id='00000000-0000-4000-8000-000000000310') then raise exception 'FAIL: revoked mentor retains private notes'; end if;
end $$;
rollback;
