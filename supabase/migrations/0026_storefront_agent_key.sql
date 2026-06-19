-- Phoxta platform — 0026 storefront agent key resolver
-- The in-store AI Stylist talks to the SAME agent brain (agent-inbound) as phone/
-- chat, addressed by the business's agent public_key. That key lives in
-- agent_config (member-only RLS), so the anon storefront can't read it directly.
-- This SECURITY DEFINER RPC returns the tenant's agent public_key (creating a
-- default agent_config on first use, like the console does), so each buyer's
-- storefront uses ITS OWN agent. Returns null for an unknown org.

create or replace function public.app_storefront_agent_key(p_org uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_key text;
begin
  if not exists (select 1 from organizations where id = p_org) then
    return null;
  end if;
  select public_key into v_key from agent_config where organization_id = p_org limit 1;
  if v_key is null then
    insert into agent_config (organization_id) values (p_org)
    returning public_key into v_key;
  end if;
  return v_key;
end;
$$;
grant execute on function public.app_storefront_agent_key(uuid) to anon, authenticated;
