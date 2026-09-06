import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

/** True when the app has real credentials; otherwise it runs entirely on the
 *  bundled demo dataset so a visitor never sees a blank screen. */
export const isConfigured = Boolean(URL && ANON);

/**
 * One client for the whole app. Sessions are persisted under their own storage
 * key so signing in to Coir Six never collides with a Phoxta dashboard session
 * in the same browser — the two apps share an auth project, not an account UI.
 */
export const supabase: SupabaseClient = createClient(URL || "http://localhost", ANON || "anon", {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "coir-six-auth" },
});
