import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client-only Supabase client for the Phoxta dashboard (Vite SPA).
 * Uses the public anon key + the signed-in user's session; RLS enforces
 * tenant isolation server-side. Never put service-role / server secrets here —
 * Vite bundles VITE_* vars into client JS that anyone can read.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Surfaced in the auth UI rather than crashing the whole app.
  console.warn(
    "[Phoxta] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "http://localhost",
  supabaseAnonKey ?? "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles email confirm / recovery links
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "phoxta-auth",
    },
  },
);
