-- Run with Supabase db query --file. Everything is rolled back, including the
-- three synthetic identities. No email, payment or business is created.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000101','school-owner-test@example.invalid',now(),'{"full_name":"Test owner"}'),
('00000000-0000-4000-8000-000000000102','school-editor-test@example.invalid',now(),'{"full_name":"Test editor"}'),
('00000000-0000-4000-8000-000000000103','school-learner-test@example.invalid',now(),'{"full_name":"Test learner"}');
insert into public.cs_staff_assignments(organization_id,user_id,role,scope_type,scope_id) values
('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000101','owner','school','');
insert into public.cs_staff_assignments(organization_id,user_id,role,scope_type,scope_id)
select organization_id,'00000000-0000-4000-8000-000000000102','content_editor','course',id from public.cs_courses where organization_id='2a51e95e-258d-405d-920b-6271d893344f' order by id limit 1;
insert into public.cs_entitlements(organization_id,user_id,plan,status) values('2a51e95e-258d-405d-920b-6271d893344f','00000000-0000-4000-8000-000000000103','self_study','active');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare v_course text; v_other text; v_revision jsonb; v_blocked boolean:=false; begin
 select scope_id into v_course from cs_staff_assignments where user_id=auth.uid();
 if not cs_staff_can('2a51e95e-258d-405d-920b-6271d893344f','content','course',v_course) then raise exception 'FAIL: assigned editor denied'; end if;
 if cs_has_access('2a51e95e-258d-405d-920b-6271d893344f') then raise exception 'FAIL: staff inherited paid admission'; end if;
 if cs_staff_can('d211c191-c248-4214-bbfd-b6b0392fa234','content','course',v_course) then raise exception 'FAIL: cross-school access'; end if;
 v_revision:=cs_school_command('2a51e95e-258d-405d-920b-6271d893344f','open_revision',jsonb_build_object('course_id',v_course));
 if v_revision->>'state'<>'draft' then raise exception 'FAIL: revision state'; end if;
 begin perform cs_school_command('2a51e95e-258d-405d-920b-6271d893344f','publish_revision',jsonb_build_object('id',v_revision->>'id')); exception when others then v_blocked:=true; end;
 if not v_blocked then raise exception 'FAIL: editor published without permission'; end if;
 v_blocked:=false;
 begin perform cs_school_command('2a51e95e-258d-405d-920b-6271d893344f','invite','{"role":"owner","email":"bad@example.invalid"}'); exception when others then v_blocked:=true; end;
 if not v_blocked then raise exception 'FAIL: editor elevated roles'; end if;
 v_blocked:=false;
 begin insert into cs_staff_assignments(organization_id,user_id,role) values('2a51e95e-258d-405d-920b-6271d893344f',auth.uid(),'owner'); exception when insufficient_privilege then v_blocked:=true; end;
 if not v_blocked then raise exception 'FAIL: direct role write'; end if;
end $$;
reset role;
update public.cs_staff_assignments set active=false where user_id='00000000-0000-4000-8000-000000000102';
set local role authenticated;
do $$ begin if cs_is_staff('2a51e95e-258d-405d-920b-6271d893344f') then raise exception 'FAIL: stale JWT retained revoked staff'; end if; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare v_count integer; v_blocked boolean:=false; begin
 select count(*) into v_count from cs_content_revisions where organization_id='2a51e95e-258d-405d-920b-6271d893344f';
 if v_count<>0 then raise exception 'FAIL: learner can read draft'; end if;
 if cs_is_staff('2a51e95e-258d-405d-920b-6271d893344f') then raise exception 'FAIL: learner became staff'; end if;
 select count(*) into v_count from cs_courses where organization_id='2a51e95e-258d-405d-920b-6271d893344f';
 if v_count=0 then raise exception 'FAIL: paid learner lost published courses'; end if;
 select count(*) into v_count from cs_courses where organization_id='d211c191-c248-4214-bbfd-b6b0392fa234';
 if v_count<>0 then raise exception 'FAIL: learner read another school'; end if;
 begin perform cs_hold_seat(gen_random_uuid(),gen_random_uuid()); exception when insufficient_privilege then v_blocked:=true; end;
 if not v_blocked then raise exception 'FAIL: browser called service-only payment function'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ declare v_blocked boolean:=false; begin
 begin perform cs_school_command('2a51e95e-258d-405d-920b-6271d893344f','invite','{"role":"lecturer","scope_type":"school","scope_id":"","email":"teacher@example.invalid"}'); exception when others then v_blocked:=true; end;
 if not v_blocked then raise exception 'FAIL: invitation skipped MFA'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $$ declare v_inv jsonb; begin
 v_inv:=cs_school_command('2a51e95e-258d-405d-920b-6271d893344f','invite','{"role":"lecturer","scope_type":"school","scope_id":"","email":"teacher@example.invalid"}');
 if length(v_inv->>'token')<>64 then raise exception 'FAIL: invitation token'; end if;
 if not cs_sensitive_access('2a51e95e-258d-405d-920b-6271d893344f','finance') then raise exception 'FAIL: verified owner finance denied'; end if;
end $$;
reset role;
-- Verify the recurrence expression retains UK civil time across DST.
do $$ begin
 if ('2026-10-20 10:00'::timestamp at time zone 'Europe/London') at time zone 'UTC'<>'2026-10-20 09:00'::timestamp then raise exception 'FAIL: BST conversion'; end if;
 if ('2026-10-27 10:00'::timestamp at time zone 'Europe/London') at time zone 'UTC'<>'2026-10-27 10:00'::timestamp then raise exception 'FAIL: GMT conversion'; end if;
end $$;
rollback;
