-- P FR-015: prepare an account for final Auth deletion after private storage is
-- cleared by the server-side processor. Billing obligations stop the process.
begin;
alter table opportunity_privacy_requests add column if not exists subject_hash text;
alter table opportunity_privacy_requests add column if not exists retention_reason text;
alter table opportunity_privacy_requests alter column user_id drop not null;
alter table opportunity_privacy_requests drop constraint if exists opportunity_privacy_requests_user_id_fkey;
alter table opportunity_privacy_requests add constraint opportunity_privacy_requests_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null;

create function public.opportunity_prepare_account_deletion(p_request uuid,p_confirmed boolean,p_storage_deleted boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r opportunity_privacy_requests; a opportunity_accounts; v_user uuid; v_hash text;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' and not app_is_platform_admin() then raise exception 'Platform administrator required.'; end if;
 if not p_confirmed or not p_storage_deleted then raise exception 'Confirm the request and private storage deletion.'; end if;
 select * into r from opportunity_privacy_requests where id=p_request for update;
 if r.request_type<>'delete_account' or r.user_id is null or r.status not in ('requested','retention_review') then raise exception 'Account deletion request is unavailable.'; end if;
 v_user:=r.user_id;
 select * into a from opportunity_accounts where user_id=v_user;
 if a.user_id is not null and a.billing_status not in ('free','canceled','incomplete_expired') then
   update opportunity_privacy_requests set status='retention_review',retention_reason='Cancel or resolve the active subscription before account deletion.' where id=p_request;
   return jsonb_build_object('ready',false,'reason','active_billing');
 end if;
 -- Both inputs are unguessable UUIDs; this correlation token is not an
 -- authentication secret and avoids retaining the deleted identity.
 v_hash:=md5(v_user::text||':'||p_request::text);
 update opportunity_privacy_requests set status='processing',subject_hash=v_hash,retention_reason=null where id=p_request;
 delete from opportunity_workspaces where owner_user_id=v_user;
 delete from workspace_members where user_id=v_user;
 delete from organization_memberships where user_id=v_user;
 delete from saved_opportunities where user_id=v_user;
 delete from opportunity_feedback where user_id=v_user;
 delete from saved_businesses where user_id=v_user;
 delete from opportunity_notifications where user_id=v_user;
 delete from opportunity_notification_preferences where user_id=v_user;
 delete from discovery_profiles where user_id=v_user;
 delete from opportunity_events where user_id=v_user;
 update opportunity_audit_logs set actor_user_id=null,metadata=metadata||jsonb_build_object('deleted_subject_hash',v_hash) where actor_user_id=v_user;
 delete from opportunity_accounts where user_id=v_user;
 delete from organizations where owner_user_id=v_user and coalesce((metadata->>'opportunity_only')::boolean,false);
 update opportunity_privacy_requests set user_id=null where id=p_request;
 return jsonb_build_object('ready',true,'user_id',v_user,'receipt',p_request,'subject_hash',v_hash);
end; $$;
revoke all on function opportunity_prepare_account_deletion(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function opportunity_prepare_account_deletion(uuid,boolean,boolean) to service_role;
commit;
