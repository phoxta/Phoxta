import { supabase } from "@/lib/supabaseClient";

/** Mirrors the live `user_profiles` table (subset used by the dashboard). RLS: own row only. */
export type UserProfile = {
  user_id: string;
  full_name: string;
  phone: string;
  job_title: string;
  company_name: string;
  company_size: string;
  industry: string;
  country: string;
  primary_goal: string;
  onboarding_completed: boolean;
};

export type ProfileForm = Pick<
  UserProfile,
  "full_name" | "phone" | "job_title" | "company_name" | "company_size" | "industry" | "country" | "primary_goal"
>;

export const COMPANY_SIZES = ["1", "2-10", "11-50", "51-200", "201-500", "500+"] as const;
export const PRIMARY_GOALS = [
  { value: "ecommerce", label: "Sell products online" },
  { value: "crm", label: "Manage customers & sales" },
  { value: "marketing", label: "Marketing & content" },
  { value: "automation", label: "Automate operations" },
  { value: "all", label: "A bit of everything" },
] as const;

const SELECT =
  "user_id, full_name, phone, job_title, company_name, company_size, industry, country, primary_goal, onboarding_completed";

/** Read the signed-in user's profile (null if not created yet). */
export async function getMyProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  const { data, error } = await supabase.from("user_profiles").select(SELECT).maybeSingle();
  return { data: (data as UserProfile | null) ?? null, error: error?.message ?? null };
}

/** Create or update the signed-in user's profile row. */
export async function saveMyProfile(
  userId: string,
  form: ProfileForm,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, ...form }, { onConflict: "user_id" });
  return { error: error?.message ?? null };
}

/** Save onboarding answers and mark onboarding complete. */
export async function completeOnboarding(
  userId: string,
  form: Partial<ProfileForm> & { primary_role?: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      ...form,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return { error: error?.message ?? null };
}
