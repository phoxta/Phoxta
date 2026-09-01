import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { updateSocialPost, type PostOptions } from "@/lib/db/ops/social";
import { updatePlannedPost } from "@/lib/db/ops/contentPlan";

/**
 * Everything this business has planned, on one timeline.
 *
 * The three kinds of content each already had a home — social posts in
 * Graphics, campaigns in Marketing, articles in the storefront's blog — and
 * nowhere showed them together. That is the one view that answers the question
 * people actually have, which is not "what have I scheduled on Instagram" but
 * "am I putting anything out next week".
 *
 * READS go at the tables directly. Every one of them carries a member RLS
 * policy (`app_is_org_member`), so the database already enforces the same rule
 * an edge function would restate — and none of this touches a credential.
 *
 * WRITES are split, and the split is RLS's, not ours. campaigns and blog_posts
 * give members ALL, so moving those is an ordinary update. social_posts is
 * SELECT-only (migration 0118: the edge functions own every social write, and
 * status is how the publisher decides what to claim) — a direct UPDATE there
 * matches zero rows and reports success, which is how this calendar used to
 * "move" posts that never moved. So social moves go through the same functions
 * the queue uses: social-schedule for real posts, content-plan for a plan's
 * drafts.
 *
 * WHAT IT DOES NOT DO IS INVENT A FOURTH STORE. A calendar with its own
 * "planned item" table would immediately disagree with the queue that actually
 * publishes: two rows for one post, and the one you can see is not the one the
 * worker reads. So this is a view over the real rows, and rescheduling writes
 * to the same column the publisher works from.
 */

export type CalendarKind = "social" | "email" | "blog";

export type CalendarItem = {
  id: string;
  kind: CalendarKind;
  title: string;
  /** The instant it is planned for, ISO. */
  at: string;
  /** The owning table's own status word, shown as it is. */
  status: string;
  /** Out already — a record rather than a plan, and not freely movable. */
  done: boolean;
  /** One line of context: the channels, the audience, the author. */
  detail: string;
  /** Social only: the rasterised picture, when one has been rendered. */
  thumbnail?: string;
  platforms?: string[];
  /** Real counts read from the platforms (see social-insights / 0124).
   *  Absent means never read — which is not the same as zero. */
  metrics?: { likes: number; comments: number };
  caption?: string;
  /** Social only: what the move paths need to route the write honestly. */
  designId?: string | null;
  planId?: string | null;
  accountIds?: string[];
  options?: PostOptions | null;
};

const KINDS: Record<CalendarKind, { label: string; where: string }> = {
  social: { label: "Post", where: "Graphics" },
  email: { label: "Email", where: "Marketing" },
  blog: { label: "Article", where: "the blog" },
};

export const kindLabel = (k: CalendarKind) => KINDS[k].label;
export const kindHome = (k: CalendarKind) => KINDS[k].where;

/** First line of a caption, for a chip that has one line to work with. */
function firstLine(s: string, fallback: string): string {
  const line = (s ?? "").split("\n").map((x) => x.trim()).find(Boolean);
  return line ? (line.length > 80 ? line.slice(0, 79) + "…" : line) : fallback;
}

type TargetRow = {
  platform: string;
  status: string;
  account_id: string | null;
  likes: number | null;
  comments: number | null;
};

export async function listCalendar(
  orgId: string,
  fromIso: string,
  toIso: string,
): Promise<{ data: CalendarItem[]; error: string | null }> {
  try {
    // In parallel: one slow table must not decide how fast the month draws.
    const [posts, campaigns, blog] = await Promise.all([
      supabase
        .from("social_posts")
        // media_url is the rasterised picture (a planned post's is empty until
        // the day); design_id lets the preview draw the document client-side;
        // plan_id and account_id are what the move paths route on; likes and
        // comments are the cached insights social-insights wrote — the same
        // columns the queue reads, never invented here.
        .select("id, caption, scheduled_at, status, media_url, design_id, plan_id, options, social_targets(platform, status, account_id, likes, comments)")
        .eq("organization_id", orgId)
        .gte("scheduled_at", fromIso).lte("scheduled_at", toIso)
        .neq("status", "cancelled"),
      supabase
        .from("campaigns")
        .select("id, name, subject, channel, status, scheduled_at, sent_at, recipients")
        .eq("organization_id", orgId)
        .or(`and(scheduled_at.gte.${fromIso},scheduled_at.lte.${toIso}),and(sent_at.gte.${fromIso},sent_at.lte.${toIso})`),
      supabase
        .from("blog_posts")
        .select("id, title, status, published_at, author")
        .eq("organization_id", orgId)
        .gte("published_at", fromIso).lte("published_at", toIso),
    ]);

    const err = posts.error ?? campaigns.error ?? blog.error;
    if (err) return { data: [], error: friendlyError(err.message) };

    const now = Date.now();
    const items: CalendarItem[] = [
      ...(posts.data ?? []).map((p) => {
        const targets = ((p.social_targets ?? []) as TargetRow[]);
        // Only counts a platform has actually reported. NULL means "never
        // read", and summing it as zero would show a real post as ignored.
        const read = targets.filter((t) => t.status === "sent" && (t.likes !== null || t.comments !== null));
        return {
          id: p.id as string,
          kind: "social" as const,
          title: firstLine(String(p.caption ?? ""), "Untitled post"),
          at: String(p.scheduled_at),
          status: String(p.status),
          done: ["published", "failed", "part"].includes(String(p.status)),
          detail: [...new Set(targets.map((t) => t.platform))].join(", "),
          thumbnail: String(p.media_url ?? "") || undefined,
          platforms: targets.map((t) => t.platform),
          metrics: read.length
            ? {
                likes: read.reduce((n, t) => n + (t.likes ?? 0), 0),
                comments: read.reduce((n, t) => n + (t.comments ?? 0), 0),
              }
            : undefined,
          caption: String(p.caption ?? ""),
          designId: (p.design_id as string | null) ?? null,
          planId: (p.plan_id as string | null) ?? null,
          accountIds: [...new Set(targets.map((t) => t.account_id).filter((x): x is string => Boolean(x)))],
          options: (p.options as PostOptions | null) ?? null,
        };
      }),
      ...(campaigns.data ?? []).map((c) => {
        // A sent campaign belongs on the day it WENT, not the day it was
        // planned for — those differ, and the calendar is a record of what
        // happened as much as a plan for what will.
        const at = String(c.sent_at ?? c.scheduled_at ?? "");
        return {
          id: c.id as string,
          kind: "email" as const,
          title: String(c.name || c.subject || "Untitled campaign"),
          at,
          status: String(c.status),
          done: String(c.status) === "sent",
          detail: [String(c.channel ?? "email"), c.recipients ? `${c.recipients} recipients` : ""].filter(Boolean).join(" · "),
        };
      }).filter((c) => c.at),
      ...(blog.data ?? []).map((b) => ({
        id: b.id as string,
        kind: "blog" as const,
        title: String(b.title || "Untitled article"),
        at: String(b.published_at),
        status: String(b.status),
        done: String(b.status) === "published" && new Date(String(b.published_at)).getTime() <= now,
        detail: String(b.author ?? ""),
      })),
    ];

    items.sort((a, b) => a.at.localeCompare(b.at));
    return { data: items, error: null };
  } catch (e) {
    return { data: [], error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

/** What actually happened, so the caller can say it honestly:
 *  - "moved":       the date changed and nothing else did.
 *  - "draft-moved": a plan's draft moved; it is still a draft.
 *  - "queued":      a standalone draft was queued for its new time. */
export type RescheduleOutcome = "moved" | "draft-moved" | "queued";

/**
 * Move something to another time.
 *
 * It changes the SAME row the publisher reads, which is the whole point of not
 * having a separate calendar store: moving a post here moves the post, not a
 * copy of it. Anything already out is refused rather than silently ignored —
 * you cannot un-send an email, and a calendar that let you drag one would be
 * lying about what it had done.
 *
 * Social routes by what the row is (see the module note for why no social
 * write can go at the table):
 *
 *   - A PLAN'S DRAFT moves through content-plan, which only touches drafts —
 *     so the move cannot fork the plan or quietly make the post publishable.
 *   - A STANDALONE DRAFT has no plan to approve it, so the only honest move is
 *     to queue it for the new time via social-schedule. The caller confirms
 *     first, because this is the moment the post becomes a promise to publish.
 *   - A QUEUED post goes through the same social-schedule update the queue's
 *     editor uses, carrying its own caption, channels and options unchanged.
 */
export async function reschedule(
  orgId: string,
  item: CalendarItem,
  atIso: string,
): Promise<{ error: string | null; outcome?: RescheduleOutcome }> {
  if (item.done) {
    return { error: "That has already gone out, so it cannot be moved. It is a record now, not a plan." };
  }

  if (item.kind === "email" || item.kind === "blog") {
    const table = item.kind === "email" ? "campaigns" : "blog_posts";
    const column = item.kind === "blog" ? "published_at" : "scheduled_at";
    const { error } = await supabase.from(table).update({ [column]: atIso }).eq("id", item.id);
    return { error: error ? friendlyError(error.message) : null, outcome: "moved" };
  }

  if (item.status === "draft" && item.planId) {
    const { error } = await updatePlannedPost(orgId, item.planId, item.id, { scheduledAt: atIso });
    return { error, outcome: "draft-moved" };
  }

  if ((item.accountIds ?? []).length === 0) {
    return { error: "This post has no channels left on it — open it in the Graphics queue and choose where it should go." };
  }
  // The stored options travel with the move. social-schedule rewrites the
  // whole options column on update, so omitting them here would silently strip
  // a post's Instagram collaborators for the crime of changing its day.
  const { error } = await updateSocialPost(orgId, {
    id: item.id,
    caption: item.caption ?? "",
    scheduledAt: atIso,
    accountIds: item.accountIds ?? [],
    options: item.options ?? {},
  });
  return { error, outcome: item.status === "draft" ? "queued" : "moved" };
}
