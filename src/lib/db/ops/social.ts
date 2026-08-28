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

/**
 * Ask for the consent URL.
 *
 * Returns `needs` and `redirectUri` rather than only an error when the platform
 * has no developer app: those are the two things whoever sets it up has to
 * know, and burying them in a log helps nobody.
 */
export async function connectSocial(orgId: string, platform: SocialPlatform) {
  try {
    const { data, error } = await supabase.functions.invoke("social-connect", {
      body: { action: "connect", organizationId: orgId, platform },
    });
    // A 400 from the function arrives as an error with the body attached; the
    // body is where the useful part is.
    const payload = (data ?? {}) as { url?: string; error?: string; needs?: string[]; redirectUri?: string };
    if (payload.error) {
      return { data: null, error: payload.error, needs: payload.needs, redirectUri: payload.redirectUri };
    }
    if (error) {
      const body = await readFunctionError(error);
      return { data: null, error: body.error ?? friendlyError(String(error)), needs: body.needs, redirectUri: body.redirectUri };
    }
    return { data: payload, error: null, needs: undefined, redirectUri: undefined };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)), needs: undefined, redirectUri: undefined };
  }
}

/** supabase-js hands back a FunctionsHttpError whose body holds the reason. */
async function readFunctionError(error: unknown): Promise<{ error?: string; needs?: string[]; redirectUri?: string }> {
  try {
    const res = (error as { context?: Response })?.context;
    if (res && typeof res.json === "function") return await res.json();
  } catch { /* the body was not json; the generic message stands */ }
  return {};
}

export const listSocialAccounts = (orgId: string) =>
  call<{ accounts: SocialAccount[]; limits: Limits }>(orgId, "accounts");

export const listSocialPosts = (orgId: string) =>
  call<{ posts: SocialPost[] }>(orgId, "list");

export const scheduleSocialPost = (
  orgId: string,
  p: { designId?: string; mediaUrl: string; caption: string; scheduledAt: string; accountIds: string[] },
) => call<{ id: string; at: string }>(orgId, "schedule", p);

/**
 * Write the caption and the hashtags for a design.
 *
 * Its own function rather than another `social-schedule` action, because it is
 * the only thing here that spends the model budget — so it is metered, and a
 * failure to write copy must never look like a failure to schedule.
 *
 * `platforms` steers the craft: the rules genuinely differ, and a caption
 * written for Instagram and posted to X is a caption that gets refused for
 * length. `steer` is the owner saying what this particular post is for.
 */
export async function writeSocialCaption(
  orgId: string,
  p: { designId: string; platforms: SocialPlatform[]; steer?: string },
): Promise<{
  data: { caption: string; hashtags: string[]; hook: string; why: string; cap: number; full: string } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("social-caption", {
      body: { orgId, ...p },
    });
    if (error) {
      let msg = error.message;
      try {
        const ctx = await (error as { context?: Response }).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* keep the transport's message */ }
      return { data: null, error: friendlyError(msg) };
    }
    if (data?.error) return { data: null, error: String(data.error) };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const cancelSocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "cancel", { id });
export const retrySocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "retry", { id });
export const disconnectSocialAccount = (orgId: string, id: string) => call<{ ok: true }>(orgId, "disconnect", { id });

export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X",
};
