import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Scheduling a design out to the connected social accounts.
 *
 * Everything goes through the `social-schedule` function rather than straight
 * at the tables, because the access tokens live in those rows and the client
 * has no business holding them — the function selects the columns a person is
 * allowed to see and nothing else.
 *
 * Publishing is not done here and never will be: `social-publish` is pinged by
 * the cron tick on the Oracle box, so a scheduled post goes out whether or not
 * anyone has the dashboard open. That is the whole difference between
 * scheduling and posting.
 */

export type SocialPlatform = "instagram" | "linkedin" | "tiktok" | "x";

export type SocialAccount = {
  id: string;
  platform: SocialPlatform;
  handle: string;
  display_name: string;
  avatar_url: string;
  status: "connected" | "expired" | "revoked";
  last_error: string;
  updated_at: string;
};

export type SocialTarget = {
  id: string;
  platform: SocialPlatform;
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  permalink: string;
  error: string;
};

export type SocialPost = {
  id: string;
  design_id: string | null;
  media_url: string;
  caption: string;
  scheduled_at: string;
  status: "draft" | "queued" | "published" | "failed" | "part" | "cancelled";
  created_at: string;
  social_targets: SocialTarget[];
};

export type Limits = Record<SocialPlatform, { caption: number; note: string }>;

async function call<T>(orgId: string, action: string, payload: Record<string, unknown> = {}) {
  try {
    const { data, error } = await supabase.functions.invoke("social-schedule", {
      body: { action, organizationId: orgId, ...payload },
    });
    if (error) return { data: null as T | null, error: friendlyError(String((error as Error)?.message ?? error)) };
    if (data?.error) return { data: null as T | null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null as T | null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const listSocialAccounts = (orgId: string) =>
  call<{ accounts: SocialAccount[]; limits: Limits }>(orgId, "accounts");

export const listSocialPosts = (orgId: string) =>
  call<{ posts: SocialPost[] }>(orgId, "list");

export const scheduleSocialPost = (
  orgId: string,
  p: { designId?: string; mediaUrl: string; caption: string; scheduledAt: string; accountIds: string[] },
) => call<{ id: string; at: string }>(orgId, "schedule", p);

export const cancelSocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "cancel", { id });
export const retrySocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "retry", { id });
export const disconnectSocialAccount = (orgId: string, id: string) => call<{ ok: true }>(orgId, "disconnect", { id });

export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X",
};
