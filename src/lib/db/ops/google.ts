import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Per-org Google Workspace connection (status only — tokens stay server-side).
export type GoogleConnection = { email: string; scope: string; updated_at: string };

export async function getGoogleConnection(orgId: string): Promise<{ data: GoogleConnection | null; error: string | null }> {
  const { data, error } = await supabase
    .from("google_connections")
    .select("email, scope, updated_at")
    .eq("organization_id", orgId)
    .maybeSingle();
  return { data: (data as GoogleConnection | null) ?? null, error: friendlyError(error?.message) };
}

/** Kicks off the OAuth flow by redirecting the browser to Google's consent screen. */
export async function startGoogleConnect(orgId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("google-connect", { body: { organizationId: orgId, action: "url" } });
  const url = (data as { url?: string })?.url;
  if (error || !url) return { error: friendlyError(error?.message) ?? "Could not start Google connect." };
  window.location.href = url;
  return { error: null };
}

export async function disconnectGoogle(orgId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("google-connect", { body: { organizationId: orgId, action: "disconnect" } });
  return { error: friendlyError(error?.message) };
}
