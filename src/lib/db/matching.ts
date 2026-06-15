import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

export type MatchRole = "founder" | "cofounder" | "operator" | "investor";

export type MatchProfile = {
  id: string;
  user_id: string;
  role: MatchRole;
  headline: string;
  bio: string;
  skills: string[];
  verticals: string[];
  capital_band: string;
  location: string;
  is_open: boolean;
};

export type MatchProfileForm = Pick<
  MatchProfile,
  "role" | "headline" | "bio" | "skills" | "verticals" | "capital_band" | "location" | "is_open"
>;

export type Match = {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  kind: "cofounder" | "operator" | "investor" | "advisor";
  status: "pending" | "accepted" | "declined" | "withdrawn";
  message: string;
  created_at: string;
};

const SELECT = "id, user_id, role, headline, bio, skills, verticals, capital_band, location, is_open";

export async function getMyMatchProfile(userId: string): Promise<{ data: MatchProfile | null; error: string | null }> {
  const { data, error } = await supabase.from("match_profiles").select(SELECT).eq("user_id", userId).maybeSingle();
  return { data: (data as MatchProfile | null) ?? null, error: friendlyError(error?.message) };
}

export async function saveMatchProfile(userId: string, form: MatchProfileForm): Promise<{ error: string | null }> {
  const { error } = await supabase.from("match_profiles").upsert({ user_id: userId, ...form }, { onConflict: "user_id" });
  return { error: friendlyError(error?.message) };
}

/** Open profiles other than mine. RLS already limits to open profiles + my own. */
export async function listOpenProfiles(userId: string): Promise<{ data: MatchProfile[]; error: string | null }> {
  const { data, error } = await supabase
    .from("match_profiles")
    .select(SELECT)
    .eq("is_open", true)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return { data: (data as MatchProfile[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function sendMatchRequest(
  requesterId: string,
  targetUserId: string,
  kind: Match["kind"],
  message = "",
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("matches").insert({
    requester_user_id: requesterId,
    target_user_id: targetUserId,
    kind,
    message,
  });
  return { error: friendlyError(error?.message) };
}

export async function listMyMatches(): Promise<{ data: Match[]; error: string | null }> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, requester_user_id, target_user_id, kind, status, message, created_at")
    .order("created_at", { ascending: false });
  return { data: (data as Match[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function updateMatchStatus(
  id: string,
  status: Match["status"],
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("matches").update({ status }).eq("id", id);
  return { error: friendlyError(error?.message) };
}
