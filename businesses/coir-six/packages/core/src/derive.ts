import type { Catalogue, CategoryId, Course, Lesson, LiveAttendance, LiveLesson, UserState } from "./types";
import { dayKey } from "./format";

/**
 * Everything the screens show that isn't stored: progress percentages,
 * "continue watching", the streak, the weekly chart. Pure functions of the
 * catalogue and the learner, so the same numbers appear on every page and
 * every one of them can be tested without a browser.
 */

export const lessonsOf = (cat: Catalogue, courseId: string): Lesson[] =>
    cat.lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.sort - b.sort);

/** Course length in minutes, from its lessons — so the card and the detail page can never disagree. */
export const courseMinutes = (cat: Catalogue, courseId: string): number =>
    Math.round(lessonsOf(cat, courseId).reduce((n, l) => n + l.durationSec, 0) / 60);

export const isDone = (user: UserState, lessonId: string): boolean =>
    Boolean(user.progress.find((p) => p.lessonId === lessonId)?.completedAt);

export function courseProgress(cat: Catalogue, user: UserState, courseId: string): { done: number; total: number; pct: number } {
    const ls = lessonsOf(cat, courseId);
    const done = ls.filter((l) => isDone(user, l.id)).length;
    return { done, total: ls.length, pct: ls.length ? Math.round((done / ls.length) * 100) : 0 };
}

/** The lesson to open when the learner presses "continue" on a course. */
export function nextLesson(cat: Catalogue, user: UserState, courseId: string): Lesson | null {
    const ls = lessonsOf(cat, courseId);
    if (!ls.length) return null;
    const e = user.enrollments.find((x) => x.courseId === courseId);
    const last = e?.lastLessonId ? ls.find((l) => l.id === e.lastLessonId) : null;
    // Resume an unfinished lesson; otherwise the first one not yet complete.
    if (last && !isDone(user, last.id)) return last;
    return ls.find((l) => !isDone(user, l.id)) ?? ls[ls.length - 1];
}

export const isEnrolled = (user: UserState, courseId: string): boolean => user.enrollments.some((e) => e.courseId === courseId);

/** Enrolled, unfinished courses, most recently touched first. */
export function continueWatching(cat: Catalogue, user: UserState): Course[] {
    const touched = (courseId: string): string =>
        user.progress
            .filter((p) => lessonsOf(cat, courseId).some((l) => l.id === p.lessonId))
            .reduce((m, p) => (p.updatedAt > m ? p.updatedAt : m), user.enrollments.find((e) => e.courseId === courseId)?.enrolledAt ?? "");
    return user.enrollments
        .filter((e) => !e.completedAt)
        .map((e) => cat.courses.find((c) => c.id === e.courseId))
        .filter((c): c is Course => Boolean(c))
        .sort((a, b) => touched(b.id).localeCompare(touched(a.id)));
}

/** "6/12 watched" per category, across the learner's enrolled courses. */
export function categoryWatched(cat: Catalogue, user: UserState): Record<CategoryId, { done: number; total: number }> {
    const out: Record<CategoryId, { done: number; total: number }> = { fe: { done: 0, total: 0 }, ux: { done: 0, total: 0 }, br: { done: 0, total: 0 } };
    for (const e of user.enrollments) {
        const course = cat.courses.find((c) => c.id === e.courseId);
        if (!course) continue;
        const p = courseProgress(cat, user, course.id);
        out[course.categoryId].done += p.done;
        out[course.categoryId].total += p.total;
    }
    return out;
}

/** Monday-anchored start of the week containing `d`. */
export function weekStart(d = new Date()): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x;
}

export function minutesThisWeek(user: UserState, now = new Date()): number {
    const start = weekStart(now).getTime();
    return user.sessions.filter((s) => new Date(s.occurredAt).getTime() >= start).reduce((n, s) => n + s.minutes, 0);
}

/** Weekly-goal completion, the number in the ring. */
export function goalPct(user: UserState, now = new Date()): number {
    const goal = Math.max(1, user.profile.weeklyGoalMin);
    return Math.min(100, Math.round((minutesThisWeek(user, now) / goal) * 100));
}

/** Consecutive days (ending today or yesterday) with any study logged. */
export function streak(user: UserState, now = new Date()): number {
    const days = new Set(user.sessions.map((s) => dayKey(s.occurredAt)));
    let count = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // A streak survives until the end of today: missing today doesn't break it yet.
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor))) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return count;
}

export const studiedToday = (user: UserState, now = new Date()): boolean =>
    user.sessions.some((s) => dayKey(s.occurredAt) === dayKey(now));

/** Last N days of minutes, oldest first — the bar chart and the activity strip. */
export function dailyMinutes(user: UserState, days: number, now = new Date()): { day: string; label: string; minutes: number }[] {
    const out: { day: string; label: string; minutes: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = dayKey(d);
        out.push({ day: key, label: d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1), minutes: 0 });
    }
    const idx = new Map(out.map((o, i) => [o.day, i]));
    for (const s of user.sessions) {
        const i = idx.get(dayKey(s.occurredAt));
        if (i !== undefined) out[i].minutes += s.minutes;
    }
    return out;
}

/** Minutes per ten-day bucket over the last month — the design's "1-10 Aug / 11-20 Aug / 21-30 Aug" chart, kept honest with real dates. */
export function tenDayBuckets(user: UserState, now = new Date()): { label: string; minutes: number; current: boolean }[] {
    const buckets: { label: string; minutes: number; current: boolean; from: number; to: number }[] = [];
    for (let b = 2; b >= 0; b--) {
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - b * 10 + 1);
        const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 10);
        const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        buckets.push({ label: `${fmt(from)} – ${fmt(new Date(to.getTime() - 86400000))}`, minutes: 0, current: b === 0, from: from.getTime(), to: to.getTime() });
    }
    for (const s of user.sessions) {
        const t = new Date(s.occurredAt).getTime();
        const bk = buckets.find((x) => t >= x.from && t < x.to);
        if (bk) bk.minutes += s.minutes;
    }
    return buckets.map(({ label, minutes, current }) => ({ label, minutes, current }));
}

export const totalMinutes = (user: UserState): number => user.sessions.reduce((n, s) => n + s.minutes, 0);

export const lessonsCompleted = (user: UserState): number => user.progress.filter((p) => p.completedAt).length;

export function upcomingLive(cat: Catalogue, now = new Date()): LiveLesson[] {
    return cat.liveLessons.filter((l) => new Date(l.startsAt).getTime() + l.durationMin * 60000 >= now.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
export function pastLive(cat: Catalogue, now = new Date()): LiveLesson[] {
    return cat.liveLessons.filter((l) => new Date(l.startsAt).getTime() + l.durationMin * 60000 < now.getTime()).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

/**
 * How a live lesson relates to right now.
 *
 * ONE definition, deliberately matching what `coir-live` will actually issue a
 * token for (15 minutes either side of the class). The UI used to open its
 * "Join now" button 10 minutes before the hour while the server refused until
 * 15 — a five-minute window where the button was a lie. Keep these in step.
 */
export const LIVE_EARLY_MIN = 15;
export const LIVE_LATE_MIN = 15;
/** How far ahead a class is worth flagging as "starting soon". */
export const LIVE_SOON_MIN = 6 * 60;

export type LiveState = "live" | "soon" | "upcoming" | "past";

/** When the doors open — 15 minutes before the hour. */
export const liveOpensAt = (l: LiveLesson): Date => new Date(new Date(l.startsAt).getTime() - LIVE_EARLY_MIN * 60000);
export const liveClosesAt = (l: LiveLesson): Date =>
    new Date(new Date(l.startsAt).getTime() + (l.durationMin + LIVE_LATE_MIN) * 60000);

export function liveState(l: LiveLesson, now = new Date()): LiveState {
    const t = now.getTime();
    if (t >= liveOpensAt(l).getTime() && t <= liveClosesAt(l).getTime()) return "live";
    if (t < liveOpensAt(l).getTime()) {
        return liveOpensAt(l).getTime() - t <= LIVE_SOON_MIN * 60000 ? "soon" : "upcoming";
    }
    return "past";
}

/** The class happening right now, if there is one. The banner's whole input. */
export function liveNow(cat: Catalogue, now = new Date()): LiveLesson | null {
    return cat.liveLessons.find((l) => liveState(l, now) === "live") ?? null;
}

/** The next class close enough to be worth a countdown. */
export function liveSoon(cat: Catalogue, now = new Date()): LiveLesson | null {
    return (
        cat.liveLessons
            .filter((l) => liveState(l, now) === "soon")
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
    );
}

/** What the learner's register says about one class. */
export const attendanceFor = (user: UserState, liveLessonId: string): LiveAttendance | null =>
    user.attendance.find((a) => a.liveLessonId === liveLessonId) ?? null;

export const unreadMessages = (user: UserState): number => user.conversations.reduce((n, c) => n + c.unread, 0);
export const unreadNotifications = (user: UserState): number => user.notifications.filter((n) => !n.readAt).length;
export const openTasks = (user: UserState): number => user.tasks.filter((t) => !t.doneAt).length;

/** Courses the learner hasn't started, ranked by their interests then rating. */
export function recommended(cat: Catalogue, user: UserState, limit = 4): Course[] {
    const enrolled = new Set(user.enrollments.map((e) => e.courseId));
    const interests = new Set(user.profile.interests);
    return cat.courses
        .filter((c) => !enrolled.has(c.id))
        .sort((a, b) => Number(interests.has(b.categoryId)) - Number(interests.has(a.categoryId)) || b.rating - a.rating)
        .slice(0, limit);
}

export function searchCourses(cat: Catalogue, q: string): Course[] {
    const s = q.trim().toLowerCase();
    if (!s) return cat.courses;
    return cat.courses.filter((c) => {
        const mentor = cat.mentors.find((m) => m.id === c.mentorId)?.name ?? "";
        const category = cat.categories.find((x) => x.id === c.categoryId)?.name ?? "";
        return [c.title, c.blurb, c.level, mentor, category].join(" ").toLowerCase().includes(s);
    });
}

export const courseBySlug = (cat: Catalogue, slug?: string): Course | undefined => cat.courses.find((c) => c.slug === slug);
export const mentorOf = (cat: Catalogue, course: Course) => cat.mentors.find((m) => m.id === course.mentorId);
export const categoryOf = (cat: Catalogue, id: CategoryId) => cat.categories.find((c) => c.id === id);
