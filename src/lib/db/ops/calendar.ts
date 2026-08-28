import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Everything this business has planned, on one timeline.
 *
 * The three kinds of content each already had a home — social posts in
 * Graphics, campaigns in Marketing, articles in the storefront's blog — and
 * nowhere showed them together. That is the one view that answers the question
 * people actually have, which is not "what have I scheduled on Instagram" but
 * "am I putting anything out next week".
 *
 * IT READS THE TABLES DIRECTLY. Every one of them carries a member RLS policy
 * (`app_is_org_member`), so the database already enforces the same rule an edge
 * function would restate — and unlike publishing, none of this touches a
 * credential. A function here would be a hop that adds latency and a second
 * place for the rule to drift.
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
        .select("id, caption, scheduled_at, status, social_targets(platform)")
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
      ...(posts.data ?? []).map((p) => ({
        id: p.id as string,
        kind: "social" as const,
        title: firstLine(String(p.caption ?? ""), "Untitled post"),
        at: String(p.scheduled_at),
        status: String(p.status),
        done: ["published", "failed", "part"].includes(String(p.status)),
        detail: [...new Set(((p.social_targets ?? []) as { platform: string }[]).map((t) => t.platform))].join(", "),
      })),
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

/**
 * Move something to another time.
 *
 * It writes the SAME column the publisher reads, which is the whole point of
 * not having a separate calendar store: moving a post here moves the post, not
 * a copy of it. Anything already out is refused rather than silently ignored —
 * you cannot un-send an email, and a calendar that let you drag one would be
 * lying about what it had done.
 */
export async function reschedule(
  item: Pick<CalendarItem, "id" | "kind" | "done">,
  atIso: string,
): Promise<{ error: string | null }> {
  if (item.done) {
    return { error: "That has already gone out, so it cannot be moved. It is a record now, not a plan." };
  }
  const table = item.kind === "social" ? "social_posts" : item.kind === "email" ? "campaigns" : "blog_posts";
  const column = item.kind === "blog" ? "published_at" : "scheduled_at";
  const { error } = await supabase.from(table).update({ [column]: atIso }).eq("id", item.id);
  return { error: error ? friendlyError(error.message) : null };
}
