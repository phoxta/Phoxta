begin;
create table public.cs_recap_drafts (
 organization_id uuid not null, live_lesson_id text not null, recap jsonb not null, generated_at timestamptz not null default now(),
 primary key(organization_id,live_lesson_id),foreign key(organization_id,live_lesson_id) references public.cs_live_lessons(organization_id,id)
);
alter table public.cs_recap_drafts enable row level security;
revoke all on public.cs_recap_drafts from anon,authenticated;
grant select on public.cs_recap_drafts to authenticated;
create policy recap_draft_host on public.cs_recap_drafts for select to authenticated using(cs_is_live_host(organization_id,live_lesson_id,auth.uid()));
insert into cs_recap_drafts(organization_id,live_lesson_id,recap) select organization_id,id,recap from cs_live_lessons where organization_id='2a51e95e-258d-405d-920b-6271d893344f' and recap is not null and not recap_approved;
update cs_live_lessons set recap=null where organization_id='2a51e95e-258d-405d-920b-6271d893344f' and not recap_approved;
create or replace function public.cs_approve_recap(p_org uuid,p_lesson text) returns void language plpgsql security definer set search_path=public as $$
declare v_recap jsonb; begin
 if not cs_is_live_host(p_org,p_lesson,auth.uid()) then raise exception 'Current teaching assignment required.'; end if;
 select recap into v_recap from cs_recap_drafts where organization_id=p_org and live_lesson_id=p_lesson;
 if v_recap is null then raise exception 'Generate and review the recap first.'; end if;
 update cs_live_lessons set recap=v_recap,recap_approved=true where organization_id=p_org and id=p_lesson;
 perform cs_audit(p_org,'recap.approved',p_lesson);
end $$;
commit;
