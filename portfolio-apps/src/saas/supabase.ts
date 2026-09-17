/**
 * Supabase client for authentication.
 *
 * Identity is the only thing that leaves the browser. Each product stores its
 * workspace data locally (IndexedDB) so a trial account works offline and no
 * customer data is uploaded before a contract exists.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const authConfigured = Boolean(url && anon)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient | null {
  if (!authConfigured) return null
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: {
        storageKey: 'femi-suite-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  }
  return client
}
