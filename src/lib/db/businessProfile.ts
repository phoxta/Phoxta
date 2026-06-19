import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Per-tenant business profile — hours, address, contact, map location. Stored on
// organizations.profile, read by storefronts via app_resolve_domain. Universal to
// every vertical. (Distinct from src/lib/db/profile.ts, which is the USER profile.)
export type Hours = { day: string; open: string; close: string; closed: boolean };
export type BusinessProfile = { address?: string; phone?: string; email?: string; mapQuery?: string; hours?: Hours[] };

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DEFAULT_HOURS: Hours[] = DAYS.map((d) => ({ day: d, open: "11:00", close: "22:00", closed: false }));

export async function getBusinessProfile(orgId: string): Promise<{ data: BusinessProfile; error: string | null }> {
  const { data, error } = await supabase.from("organizations").select("profile").eq("id", orgId).maybeSingle();
  const p = (data as { profile?: BusinessProfile } | null)?.profile;
  return { data: p && Object.keys(p).length ? p : {}, error: friendlyError(error?.message) };
}

export async function saveBusinessProfile(orgId: string, profile: BusinessProfile): Promise<{ error: string | null }> {
  const { error } = await supabase.from("organizations").update({ profile }).eq("id", orgId);
  return { error: friendlyError(error?.message) };
}
