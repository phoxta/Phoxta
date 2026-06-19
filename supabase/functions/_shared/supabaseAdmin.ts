import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Service-role client — bypasses RLS. Only ever used after the caller's
 *  membership has been verified, or for queue/worker draining. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** Anon client carrying the end user's JWT — used only to resolve the user. */
export function userClient(token: string): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export type { SupabaseClient };
