-- Phoxta — 0082: grant the identity helpers to the role that actually calls them.
--
-- 0080 revoked app_resolve_contact / app_merge_contacts from PUBLIC so an anon
-- caller cannot mint or fold contacts. But EXECUTE is granted to PUBLIC by
-- default, and service_role inherited it that way — so revoking from PUBLIC took
-- it away from the edge functions too. They run as service_role, which is the
-- only role that should hold these.
--
-- Not granted to `authenticated`: both functions are security definer and
-- therefore bypass RLS, so a browser session must never reach them directly.
-- Console-initiated merges go through an edge function that checks the caller's
-- role first.

grant execute on function public.app_resolve_contact(uuid, text, text, text, boolean) to service_role;
grant execute on function public.app_merge_contacts(uuid, uuid, uuid) to service_role;
