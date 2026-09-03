// Phoxta — when a post actually goes out.
//
// THE MODEL PROPOSES; CODE DISPOSES.
//
// Asking a language model for a posting time gets you an hour that sounds
// plausible and means nothing: it has no idea what this business's audience
// does, and it cannot count. Left to itself it clusters three posts on a
// Tuesday morning, puts a LinkedIn post out at 9pm on a Sunday, and schedules
// two things eleven minutes apart. None of that is a copywriting failure, so
// none of it is fixed by a better prompt — it is arithmetic, and arithmetic
// belongs in code.
//
// So the planner picks dates and hours, and then `normaliseSchedule` moves them
// onto defensible windows, enforces spacing, caps how often a platform is
// posted to, and drops blackout dates. Every move it makes is returned in
// `changes[]` so the owner reads WHY their 7pm became 7:30pm rather than
// finding a calendar that silently disagrees with the one they approved.
//
// TWO SOURCES OF TIMING, NEVER SILENTLY MIXED
//
// `DEFAULTS` is general platform behaviour, and each entry carries a `basis`
// sentence saying so out loud, because an owner is entitled to disagree with a
// default that was never measured for their audience. `learnedWindows` is this
// business's own measured performance and only fires once there is enough of it
// to mean anything. The UI always says which one it gave you — "your posts at
// 7pm get more engagement, across 18 posts" is a fact; "7pm is a good time" is
// a horoscope, and presenting the second as the first is the exact
// precise-figure-in-a-disguise failure the dossier's rules exist to prevent.
import type { SupabaseClient } from "./supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export type Platform = "instagram" | "linkedin" | "x" | "tiktok";

export type CadenceDefault = {
  /** Sensible posts-per-week range for one platform. */
  perWeek: { min: number; max: number };
  /** Local hours worth landing on, best first. */
  hours: number[];
  /** Days of the week this platform is worth posting on. 0 = Sunday. */
  days: number[];
  /** Nothing from the same business on the same platform closer than this. */
  minGapHours: number;
  /** Said to the owner, verbatim. A default that cannot explain itself is folklore. */
  basis: string;
};

/**
 * What generally performs, stated as defaults rather than as truth.
 *
 * Deliberately NOT in _shared/social.ts's LIMITS: that encodes what a platform
 * will REFUSE (a 281-character post on X), which is a hard fact about an API.
 * This is what tends to WORK, which is a judgement that ages. Keeping them
 * apart means nobody reads a caption cap as advice or this as a guarantee.
 */
export const DEFAULTS: Record<Platform, CadenceDefault> = {
  instagram: {
    perWeek: { min: 3, max: 5 },
    hours: [11, 19, 13],
    days: [0, 1, 2, 3, 4, 5, 6],
    minGapHours: 18,
    basis: "Late morning and the evening scroll. General platform behaviour, not measured for your audience.",
  },
  linkedin: {
    perWeek: { min: 2, max: 3 },
    hours: [8, 12, 17],
    days: [1, 2, 3, 4, 5],
    minGapHours: 24,
    basis: "Weekday commute and lunch windows — LinkedIn is read between meetings, and weekends are quiet. Not measured for your audience.",
  },
  x: {
    perWeek: { min: 4, max: 7 },
    hours: [8, 12, 17, 21],
    days: [0, 1, 2, 3, 4, 5, 6],
    minGapHours: 6,
    basis: "X moves fast and tolerates frequency; posts age out in hours rather than days. Not measured for your audience.",
  },
  tiktok: {
    perWeek: { min: 3, max: 5 },
    hours: [12, 19, 21],
    days: [0, 1, 2, 3, 4, 5, 6],
    minGapHours: 18,
    basis: "Midday and late evening, when watching is the whole activity rather than a break from another one. Not measured for your audience.",
  },
};

const isPlatform = (p: string): p is Platform => p in DEFAULTS;

/** The minimum number of measured posts before this business's own numbers
 *  are allowed to override a default. Three posts is not a pattern, and
 *  dressing one up as a finding is worse than admitting there isn't one. */
export const LEARN_FLOOR = 12;

export type LearnedWindows = Partial<Record<Platform, { hours: number[]; posts: number; note: string }>>;

/**
 * This business's own best hours, or null when there is not enough evidence.
 *
 * Reads whatever performance history exists. Returns null — not a guess — below
 * LEARN_FLOOR per platform, so a caller can say "our general default" honestly
 * rather than implying a measurement nobody took.
 */
export async function learnedWindows(admin: SupabaseClient, orgId: string): Promise<LearnedWindows | null> {
  // AGE-MATCHED READINGS FIRST (0143). social_metrics keeps a row per reading
  // with the post's age at the time, so two posts can be compared at the same
  // point in their lives. Comparing a six-month-old post's lifetime likes with
  // a two-day-old post's is a measurement of age, not of content — and that is
  // all social_targets can offer, because it overwrites.
  const rows = await ageMatched(admin, orgId) ?? await lifetime(admin, orgId);
  if (!rows?.length) return null;

  const byPlatform = new Map<Platform, { hour: number; score: number }[]>();
  for (const r of rows) {
    const list = byPlatform.get(r.platform) ?? [];
    list.push({ hour: r.hour, score: r.score });
    byPlatform.set(r.platform, list);
  }

  const out: LearnedWindows = {};
  for (const [platform, list] of byPlatform) {
    if (list.length < LEARN_FLOOR) continue;
    const tally = new Map<number, { total: number; n: number }>();
    for (const r of list) {
      const cur = tally.get(r.hour) ?? { total: 0, n: 0 };
      cur.total += r.score;
      cur.n += 1;
      tally.set(r.hour, cur);
    }
    const ranked = [...tally.entries()]
      .map(([hour, v]) => ({ hour, avg: v.total / v.n }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map((h) => h.hour);
    if (ranked.length) {
      out[platform] = {
        hours: ranked,
        posts: list.length,
        note: `Your own ${platform} posts do best around ${ranked.map((h) => `${h}:00`).join(", ")}, across ${list.length} posts.`,
      };
    }
  }
  return Object.keys(out).length ? out : null;
}

type Measured = { platform: Platform; hour: number; score: number };

/** Engagement weighted so a comment counts for more than a like, which is the
 *  one thing every platform's own ranking agrees on. */
const score = (likes: unknown, comments: unknown) =>
  Number(likes ?? 0) + Number(comments ?? 0) * 2;

/**
 * One reading per post, taken 24-72 hours after it went out.
 *
 * The window is what makes the comparison fair: long enough that a post has
 * finished gathering, early enough that every post in the sample is being
 * judged at the same age. Returns null when the history is empty, so the
 * caller falls back rather than concluding this business has no good hours.
 */
async function ageMatched(admin: SupabaseClient, orgId: string): Promise<Measured[] | null> {
  const { data, error } = await admin
    .from("social_metrics")
    .select("target_id, platform, likes, comments, read_at, hours_since_publish, social_posts(scheduled_at)")
    .eq("organization_id", orgId)
    .gte("hours_since_publish", 24)
    .lte("hours_since_publish", 72)
    .order("read_at", { ascending: false })
    .limit(1000);
  if (error || !data?.length) return null;

  // Newest reading per target wins — ordered above, so the first seen is it.
  const seen = new Set<string>();
  const out: Measured[] = [];
  for (const row of data as Json[]) {
    const key = String(row.target_id ?? "");
    if (!key || seen.has(key)) continue;
    const p = String(row.platform ?? "");
    if (!isPlatform(p)) continue;
    const when = new Date(String(row.social_posts?.scheduled_at ?? ""));
    if (isNaN(when.getTime())) continue;
    seen.add(key);
    out.push({ platform: p, hour: when.getUTCHours(), score: score(row.likes, row.comments) });
  }
  return out.length ? out : null;
}

/**
 * The old snapshot, for a business with no reading history yet.
 *
 * Unfair in the way described above — these are lifetime totals on posts of
 * every age — but it is what exists for anyone whose posts went out before
 * 0143, and a slightly unfair ranking above LEARN_FLOOR still beats a default
 * that was never measured for their audience at all.
 */
async function lifetime(admin: SupabaseClient, orgId: string): Promise<Measured[] | null> {
  const { data, error } = await admin
    .from("social_targets")
    .select("platform, likes, comments, sent_at")
    .eq("organization_id", orgId)
    .eq("status", "sent")
    .not("sent_at", "is", null)
    .limit(500);
  if (error || !data?.length) return null;

  const out: Measured[] = [];
  for (const row of data as Json[]) {
    const p = String(row.platform ?? "");
    if (!isPlatform(p)) continue;
    const when = new Date(String(row.sent_at));
    if (isNaN(when.getTime())) continue;
    out.push({ platform: p, hour: when.getUTCHours(), score: score(row.likes, row.comments) });
  }
  return out.length ? out : null;
}

export type Slot = {
  slotId: string;
  /** YYYY-MM-DD, the business's local date. */
  date: string;
  /** 0-23, the business's local hour. */
  hour: number;
  platforms: string[];
};

export type ScheduleChange = { slotId: string; was: string; now: string; why: string };

export type NormaliseOpts = {
  timezone: string;
  learned?: LearnedWindows | null;
  /** YYYY-MM-DD dates nothing may land on. */
  blackout?: string[];
  /** Per-platform overrides the owner set. */
  settings?: Partial<Record<Platform, Partial<CadenceDefault>>>;
};

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (date: string, hour: number) => `${date} ${pad(hour)}:00`;

/** Nearest allowed hour to the one asked for, preferring the ranked order. */
function snapHour(want: number, allowed: number[]): number {
  if (!allowed.length) return want;
  if (allowed.includes(want)) return want;
  return allowed.reduce((best, h) => (Math.abs(h - want) < Math.abs(best - want) ? h : best), allowed[0]);
}

function dowOf(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  return isNaN(d.getTime()) ? 1 : d.getUTCDay();
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Move a proposed calendar onto defensible times.
 *
 * Deterministic and total: every slot comes back, possibly moved, never
 * dropped — a plan that quietly loses a post is worse than one posted at an
 * awkward hour. `changes` explains every move in the owner's terms.
 */
export function normaliseSchedule(
  slots: Slot[],
  opts: NormaliseOpts,
): { slots: Slot[]; changes: ScheduleChange[] } {
  const changes: ScheduleChange[] = [];
  const blackout = new Set(opts.blackout ?? []);
  // EVERY instant already placed, per platform — not just the most recent one.
  //
  // Tracking only the last placement looks equivalent and is not: pushing a
  // clashing slot forward breaks chronological order, so the next slot can land
  // BEFORE it and be compared against the wrong neighbour. That shipped three
  // Instagram posts at 11:00, 13:00 and the next morning — a two-hour gap where
  // the rule says eighteen — and it passed a reading of the code, which is why
  // the arithmetic here is tested rather than reasoned about.
  const placed = new Map<string, number[]>();

  const out = [...slots]
    .sort((a, b) => (a.date === b.date ? a.hour - b.hour : a.date < b.date ? -1 : 1))
    .map((slot) => {
      const before = stamp(slot.date, slot.hour);
      let { date, hour } = slot;
      const reasons: string[] = [];

      // The platforms on this slot decide the rules. A slot going to several
      // takes the STRICTEST of them, because one calendar has to satisfy all.
      const platforms = slot.platforms.filter(isPlatform) as Platform[];
      const specs = platforms.map((p) => ({ ...DEFAULTS[p], ...(opts.settings?.[p] ?? {}) }));
      const allowedDays = specs.length
        ? specs.map((s) => new Set(s.days)).reduce((acc, s) => new Set([...acc].filter((d) => s.has(d))))
        : new Set([0, 1, 2, 3, 4, 5, 6]);
      const minGap = specs.length ? Math.max(...specs.map((s) => s.minGapHours)) : 0;

      // Learned hours win over defaults when this business has enough history.
      const hourPool = platforms.length
        ? [...new Set(platforms.flatMap((p) => opts.learned?.[p]?.hours ?? DEFAULTS[p].hours))]
        : [];
      const usedLearned = platforms.some((p) => (opts.learned?.[p]?.hours ?? []).length);

      const snapped = snapHour(hour, hourPool);
      if (snapped !== hour) {
        reasons.push(usedLearned ? "moved to an hour your own posts do better at" : "moved to a better-performing hour");
        hour = snapped;
      }

      // Off a day this platform is not read on, or a date the owner blacked
      // out: walk forward to the next date that satisfies both. Bounded so a
      // pathological set of rules cannot spin.
      let guard = 0;
      while ((blackout.has(date) || (allowedDays.size && !allowedDays.has(dowOf(date)))) && guard < 14) {
        date = addDays(date, 1);
        guard++;
        if (!reasons.includes("moved off a day you excluded") && blackout.has(slot.date)) {
          reasons.push("moved off a day you excluded");
        } else if (!reasons.includes("moved to a weekday this platform is actually read on")) {
          reasons.push("moved to a weekday this platform is actually read on");
        }
      }

      // Spacing, per platform, against everything already placed on it. Push
      // forward in whole hours until the gap holds against ALL of them, and
      // keep skipping blacked-out or disallowed days as we go.
      for (let i = 0; i < 24 * 21; i++) {
        const at = new Date(`${date}T${pad(hour)}:00:00Z`).getTime();
        const dayBad = blackout.has(date) || (allowedDays.size > 0 && !allowedDays.has(dowOf(date)));
        const clash = platforms.some((p) =>
          (placed.get(p) ?? []).some((prev) => Math.abs(at - prev) < minGap * 3600_000)
        );
        if (!dayBad && !clash) break;
        if (dayBad) {
          date = addDays(date, 1);
          hour = hourPool.length ? hourPool[0] : hour;
        } else if (hour >= 23) {
          date = addDays(date, 1);
          hour = hourPool.length ? Math.min(...hourPool) : 9;
        } else {
          hour += 1;
        }
        if (clash && !reasons.includes("spaced out so two posts do not land together")) {
          reasons.push("spaced out so two posts do not land together");
        }
      }

      const at = new Date(`${date}T${pad(hour)}:00:00Z`).getTime();
      for (const p of platforms) placed.set(p, [...(placed.get(p) ?? []), at]);

      const after = stamp(date, hour);
      if (after !== before) {
        changes.push({ slotId: slot.slotId, was: before, now: after, why: reasons.join("; ") || "adjusted to fit the week's shape" });
      }
      return { ...slot, date, hour };
    });

  return { slots: out, changes };
}

/**
 * A business's local wall-clock hour as a real UTC instant.
 *
 * Moved here unchanged from content-plan: scheduling owns it, and two copies
 * would drift. `new Date("2026-03-01T10:00")` is parsed by the Deno runtime as
 * UTC, which made "10am" mean 6am in New York for every business at once. Intl
 * gives the zone's offset for that exact date (DST included); adding it back
 * turns the local 10:00 into the correct instant. Null on a date that will not
 * parse, so a post is skipped rather than scheduled at a wrong one.
 *
 * The single hour of a DST transition can land an hour off — a social post is
 * not worth solving spring-forward for — and an IANA name Intl does not know
 * falls back to UTC rather than losing the post.
 */
export function wallClockToUtc(dateStr: string, hour: number, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!m) return null;
  const naiveUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, 0, 0);
  if (Number.isNaN(naiveUtc)) return null;
  let offsetMs = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(naiveUtc));
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const asUtc = Date.UTC(
      Number(p.year), Number(p.month) - 1, Number(p.day),
      Number(p.hour), Number(p.minute), Number(p.second),
    );
    offsetMs = asUtc - naiveUtc;
  } catch {
    offsetMs = 0;
  }
  const t = new Date(naiveUtc - offsetMs);
  return Number.isNaN(t.getTime()) ? null : t;
}
