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
 * Publishing is never done IN THE BROWSER: `social-publish` is pinged by the
 * cron tick on the Oracle box, so a scheduled post goes out whether or not
 * anyone has the dashboard open. That is the whole difference between
 * scheduling and posting.
 *
 * `sendSocialPostNow` is the one call that reaches that worker directly, and it
 * still does not publish anything here — it asks the same worker to do the same
 * work for one named post, so there is exactly one piece of code that has ever
 * put a post on the wire.
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
  /** Which connected account this channel is — what the editor pre-selects. */
  account_id: string;
  platform: SocialPlatform;
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  permalink: string;
  error: string;
  /** As of `metrics_at`. NULL means not known, which is not the same as none —
   *  TikTok never tells us, and a post read before anyone had seen it has not
   *  had zero likes, it has had none counted yet. */
  likes: number | null;
  comments: number | null;
  metrics_at: string | null;
};

/**
 * The Instagram-only extras a post can carry.
 *
 * Instagram is the only one of the four with anything here, and that is not an
 * omission. LinkedIn has no co-author concept at all — you can @mention a
 * person or a company in the words, which is a different thing — X and TikTok
 * neither tag on the image nor take an alt-text field. A control that appeared
 * for all four and worked for one would be worse than no control.
 */
export type InstagramOptions = {
  /** Co-authors, up to 3. They must accept before it reaches their profile. */
  collaborators: string[];
  /** Tagged on the picture itself. x/y are 0..1 from the top-left. */
  userTags: { username: string; x: number; y: number }[];
  /** Read out by a screen reader, and the thing Instagram indexes. */
  altText: string;
  /** Publish the same picture to the story as well as the feed. */
  alsoStory: boolean;
};

export type PostOptions = { instagram?: InstagramOptions };

export const EMPTY_IG_OPTIONS: InstagramOptions =
  { collaborators: [], userTags: [], altText: "", alsoStory: false };

export type SocialPost = {
  id: string;
  design_id: string | null;
  media_url: string;
  caption: string;
  scheduled_at: string;
  status: "draft" | "queued" | "published" | "failed" | "part" | "cancelled";
  created_at: string;
  options: PostOptions | null;
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
  p: { designId?: string; mediaUrl: string; caption: string; scheduledAt: string; accountIds: string[]; options?: PostOptions },
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

/**
 * Change a post that has not gone out yet — the words, the time, the channels.
 *
 * Refused by the server once any channel has published it, and that refusal is
 * the point: after Instagram has the post, this row stops being a plan and
 * becomes the record of what is live.
 */
export const updateSocialPost = (
  orgId: string,
  p: { id: string; caption: string; scheduledAt: string; accountIds: string[]; options?: PostOptions },
) => call<{ at: string }>(orgId, "update", p);

/**
 * Send a queued post now instead of waiting for its time.
 *
 * Goes to `social-publish` rather than `social-schedule`, because it is asking
 * for the publishing worker itself — the same one the cron tick calls, narrowed
 * to one post. There is deliberately no second publisher behind this button.
 *
 * `claimed: 0` is not a failure. It means there was nothing left to send, and
 * `note` says which of the several reasons applies.
 */
export async function sendSocialPostNow(orgId: string, postId: string): Promise<{
  data: { claimed: number; sent?: number; failed?: number; simulated?: number; note?: string } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("social-publish", {
      body: { organizationId: orgId, postId },
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

/**
 * Read how the published posts are doing, from the platforms.
 *
 * Deliberately NOT part of loading the queue. The list comes from our own
 * tables and always works; this reaches four external APIs on a metered
 * budget, and a platform being down must not be the reason a business cannot
 * see what it has scheduled.
 *
 * It refreshes the stalest few and leaves anything read in the last quarter of
 * an hour alone, so pressing it repeatedly cannot spend the publishing
 * allowance. Reload the list afterwards to see the new numbers.
 */
export async function refreshSocialInsights(
  orgId: string,
): Promise<{ data: { refreshed: number; unknown: number } | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("social-insights", { body: { orgId } });
    if (error) return { data: null, error: friendlyError(String((error as Error)?.message ?? error)) };
    if (data?.error) return { data: null, error: String(data.error) };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const cancelSocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "cancel", { id });
export const deleteSocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "delete", { id });
export const retrySocialPost = (orgId: string, id: string) => call<{ ok: true }>(orgId, "retry", { id });
export const disconnectSocialAccount = (orgId: string, id: string) => call<{ ok: true }>(orgId, "disconnect", { id });

export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X",
};
