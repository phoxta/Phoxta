import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp, pct as pctOf } from "@/lib/format";
import type { Assignment, AssignmentStatus, Badge, BadgeAward, CharacterLog, CharacterTrack, CurriculaState, DevMilestone, Grade, Subject, Submission, Unit } from "./types";

/**
 * Every number this module shows, as pure functions of state — starting with
 * the one both repos call before anything reaches a screen.
 *
 * Two rules do most of the work here. A child receives only their own subjects,
 * units, assignments, submissions, milestones and awards: no sibling's work,
 * no sibling's marks, no leaderboard. And a grade reaches a child only when a
 * parent has released it — `visibleToChild` is applied in `visibleTo()`, so
 * the unreleased mark is not merely hidden on the page, it is not in the
 * child's slice at all.
 */

export const BASE = "/grow/curricula";

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** A child owns a subject; a parent owns them all; a guest owns none. */
export function canSeeSubject(s: Subject, me: Member): boolean {
    if (me.role === "parent") return true;
    if (me.role === "guest") return false;
    return s.childMemberId === me.id;
}

const EMPTY: CurriculaState = {
    subjects: [],
    units: [],
    assignments: [],
    submissions: [],
    grades: [],
    badges: [],
    awards: [],
    milestones: [],
    tracks: [],
    logs: [],
};

/**
 * The slice this member may receive.
 *
 * Guests get nothing at all — school work is not a house-guest's business, and
 * the module is not in their nav. A child gets their own shelf of it, with the
 * badge catalogue (which is written for them) and the family's character track
 * (which is the whole family's), and grades only where a parent released them —
 * along with a status that keeps that secret, since "Graded" would give away the
 * existence of a mark the parent decided not to show yet.
 */
export function visibleTo(state: CurriculaState, ctx: RepoContext): CurriculaState {
    const me = ctx.me;
    if (me.role === "guest") return EMPTY;
    if (me.role === "parent") return state;

    const subjects = state.subjects.filter((s) => canSeeSubject(s, me));
    const subjectIds = new Set(subjects.map((s) => s.id));
    const units = state.units.filter((u) => subjectIds.has(u.subjectId));
    const unitIds = new Set(units.map((u) => u.id));
    // A mark a parent has kept back is not a mark the child knows about. The grade
    // row is dropped below, and the assignment comes back as "submitted" — otherwise
    // the status tag announces "Graded" for a mark that is not in the slice, and the
    // child's own page tells them both that it is marked and that it is not.
    const released = new Set(state.grades.filter((g) => g.visibleToChild).map((g) => g.assignmentId));
    const assignments = state.assignments
        .filter((a) => unitIds.has(a.unitId) && a.childMemberId === me.id)
        .map((a) => (a.status === "graded" && !released.has(a.id) ? { ...a, status: "submitted" as AssignmentStatus } : a));
    const assignmentIds = new Set(assignments.map((a) => a.id));

    return {
        subjects,
        units,
        assignments,
        submissions: state.submissions.filter((s) => s.memberId === me.id && assignmentIds.has(s.assignmentId)),
        // The released mark only. An unreleased grade never leaves the parent's side.
        grades: state.grades.filter((g) => g.visibleToChild && assignmentIds.has(g.assignmentId)),
        badges: state.badges,
        awards: state.awards.filter((a) => a.memberId === me.id),
        milestones: state.milestones.filter((m) => m.memberId === me.id),
        tracks: state.tracks,
        logs: state.logs.filter((l) => l.memberId === me.id),
    };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const subjectById = (s: CurriculaState, id: string): Subject | undefined => s.subjects.find((x) => x.id === id);
export const unitById = (s: CurriculaState, id: string): Unit | undefined => s.units.find((x) => x.id === id);
export const assignmentById = (s: CurriculaState, id: string): Assignment | undefined => s.assignments.find((x) => x.id === id);
export const gradeFor = (s: CurriculaState, assignmentId: string): Grade | undefined => s.grades.find((g) => g.assignmentId === assignmentId);
export const badgeById = (s: CurriculaState, id: string): Badge | undefined => s.badges.find((b) => b.id === id);
export const submissionFor = (s: CurriculaState, assignmentId: string): Submission | undefined => s.submissions.find((x) => x.assignmentId === assignmentId);

export const subjectsFor = (s: CurriculaState, memberId: string): Subject[] =>
    s.subjects.filter((x) => x.childMemberId === memberId && !x.archived).sort((a, b) => a.name.localeCompare(b.name));

export const unitsOf = (s: CurriculaState, subjectId: string): Unit[] => s.units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.order - b.order);

export const assignmentsOfUnit = (s: CurriculaState, unitId: string): Assignment[] => s.assignments.filter((a) => a.unitId === unitId).sort(byDue);

export const assignmentsOfSubject = (s: CurriculaState, subjectId: string): Assignment[] => s.assignments.filter((a) => a.subjectId === subjectId).sort(byDue);

export const assignmentsFor = (s: CurriculaState, memberId: string): Assignment[] => s.assignments.filter((a) => a.childMemberId === memberId).sort(byDue);

function byDue(a: Assignment, b: Assignment): number {
    return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);
}

/** The children this member may look at: every child for a parent, themselves for a child. */
export function childrenInView(ctx: RepoContext): Member[] {
    if (ctx.me.role === "child") return [ctx.me];
    return ctx.members.filter((m) => m.role === "child");
}

// ---------------------------------------------------------------------------
// Assignment status
// ---------------------------------------------------------------------------

export const isDone = (a: Assignment): boolean => a.status === "submitted" || a.status === "graded";

export const dueOn = (s: CurriculaState, memberId: string, date: string): Assignment[] =>
    s.assignments.filter((a) => a.childMemberId === memberId && a.dueDate === date).sort(byDue);

export const dueToday = (s: CurriculaState, memberId: string, today: string): Assignment[] => dueOn(s, memberId, today);

export const overdueFor = (s: CurriculaState, memberId: string, today: string): Assignment[] =>
    s.assignments.filter((a) => a.childMemberId === memberId && a.dueDate < today && !isDone(a)).sort(byDue);

export const dueThisWeek = (s: CurriculaState, memberId: string, today: string): Assignment[] => {
    const end = addDaysIso(today, 7);
    return s.assignments.filter((a) => a.childMemberId === memberId && a.dueDate >= today && a.dueDate < end).sort(byDue);
};

/** Handed in and waiting on a parent. */
export const awaitingGrade = (s: CurriculaState): Assignment[] => s.assignments.filter((a) => a.status === "submitted").sort(byDue);

export function addDaysIso(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Grades, averages, reports
// ---------------------------------------------------------------------------

/** The letter a percentage earns, in the family's own simple scale. */
export function letterFor(score: number): string {
    const n = clamp(Math.round(score), 0, 100);
    if (n >= 90) return "A*";
    if (n >= 80) return "A";
    if (n >= 70) return "B";
    if (n >= 60) return "C";
    if (n >= 50) return "D";
    if (n >= 40) return "E";
    return "U";
}

export function rubricTotal(rubric: Array<{ score: number; max: number }>): { score: number; max: number; pct: number } {
    const score = rubric.reduce((n, r) => n + r.score, 0);
    const max = rubric.reduce((n, r) => n + r.max, 0);
    return { score, max, pct: max > 0 ? Math.round((score / max) * 100) : 0 };
}

/** The term a child is in now: the term of their most recent live subject. */
export function currentTerm(s: CurriculaState, memberId: string): string {
    const subs = subjectsFor(s, memberId);
    if (!subs.length) return "";
    return [...subs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].term;
}

export interface AverageResult {
    /** Mean percentage across graded work; 0 when nothing is graded. */
    avg: number;
    graded: number;
    total: number;
}

function averageOf(s: CurriculaState, assignments: Assignment[]): AverageResult {
    const graded = assignments.map((a) => gradeFor(s, a.id)).filter((g): g is Grade => Boolean(g));
    const avg = graded.length ? Math.round(graded.reduce((n, g) => n + g.score, 0) / graded.length) : 0;
    return { avg, graded: graded.length, total: assignments.length };
}

/** Every graded mark this child has, in the given term (or every term). */
export function termAverage(s: CurriculaState, memberId: string, term?: string): AverageResult {
    const subjectIds = new Set(s.subjects.filter((x) => x.childMemberId === memberId && (!term || x.term === term)).map((x) => x.id));
    return averageOf(s, s.assignments.filter((a) => subjectIds.has(a.subjectId)));
}

export const subjectAverage = (s: CurriculaState, subjectId: string): AverageResult => averageOf(s, assignmentsOfSubject(s, subjectId));

/** Graded marks in a subject, oldest first — the trend the bar chart draws. */
export function subjectTrend(s: CurriculaState, subjectId: string): Array<{ label: string; value: number; hi?: boolean }> {
    const rows = assignmentsOfSubject(s, subjectId)
        .map((a) => ({ a, g: gradeFor(s, a.id) }))
        .filter((r): r is { a: Assignment; g: Grade } => Boolean(r.g))
        .sort((x, y) => (x.g.gradedAt || "").localeCompare(y.g.gradedAt || ""));
    return rows.slice(-8).map((r, i, all) => ({ label: r.a.title.slice(0, 8), value: r.g.score, hi: i === all.length - 1 }));
}

export interface ReportRow {
    subject: Subject;
    average: AverageResult;
    letter: string;
    /** The most recent parent comment in this subject, for the report card. */
    comment: string;
    lastGradedAt: string | null;
}

export interface TermReport {
    memberId: string;
    term: string;
    rows: ReportRow[];
    overall: AverageResult;
    letter: string;
    badges: BadgeAward[];
    milestones: DevMilestone[];
    generatedFor: string;
}

/** Everything the term report prints — subjects, averages and comments. */
export function termReport(s: CurriculaState, memberId: string, term: string): TermReport {
    const subjects = s.subjects.filter((x) => x.childMemberId === memberId && (!term || x.term === term)).sort((a, b) => a.name.localeCompare(b.name));
    const rows: ReportRow[] = subjects.map((subject) => {
        const average = subjectAverage(s, subject.id);
        const graded = assignmentsOfSubject(s, subject.id)
            .map((a) => gradeFor(s, a.id))
            .filter((g): g is Grade => Boolean(g))
            .sort((a, b) => (b.gradedAt || "").localeCompare(a.gradedAt || ""));
        return {
            subject,
            average,
            letter: average.graded ? letterFor(average.avg) : "—",
            comment: graded.find((g) => g.comment.trim())?.comment ?? "",
            lastGradedAt: graded[0]?.gradedAt ?? null,
        };
    });
    const overall = termAverage(s, memberId, term);
    return {
        memberId,
        term,
        rows,
        overall,
        letter: overall.graded ? letterFor(overall.avg) : "—",
        badges: awardsFor(s, memberId),
        milestones: milestonesFor(s, memberId),
        generatedFor: term,
    };
}

// ---------------------------------------------------------------------------
// Badges and milestones
// ---------------------------------------------------------------------------

export const awardsFor = (s: CurriculaState, memberId: string): BadgeAward[] =>
    s.awards.filter((a) => a.memberId === memberId).sort((a, b) => b.awardedAt.localeCompare(a.awardedAt));

export const awardCount = (s: CurriculaState, memberId: string): number => s.awards.filter((a) => a.memberId === memberId).length;

export const hasBadge = (s: CurriculaState, badgeId: string, memberId: string): boolean => s.awards.some((a) => a.badgeId === badgeId && a.memberId === memberId);

/** Awards made in the last `days` days — what the child page animates in. */
export function freshAwards(s: CurriculaState, memberId: string, today: string, days = 7): BadgeAward[] {
    const from = addDaysIso(today, -days);
    return awardsFor(s, memberId).filter((a) => a.awardedAt.slice(0, 10) >= from);
}

export const milestonesFor = (s: CurriculaState, memberId: string): DevMilestone[] =>
    s.milestones.filter((m) => m.memberId === memberId).sort((a, b) => b.progressPct - a.progressPct || a.title.localeCompare(b.title));

/** Milestones that have reached 100% and have not been celebrated yet. */
export const milestonesToCelebrate = (s: CurriculaState, memberIds: string[]): DevMilestone[] =>
    s.milestones.filter((m) => memberIds.includes(m.memberId) && m.progressPct >= 100 && !m.celebratedAt);

// ---------------------------------------------------------------------------
// Character tracks
// ---------------------------------------------------------------------------

export const monthOf = (date: string): string => date.slice(0, 7);

export const trackForMonth = (s: CurriculaState, month: string): CharacterTrack | undefined => s.tracks.find((t) => t.month === month);

export const trackFor = (s: CurriculaState, today: string): CharacterTrack | undefined => trackForMonth(s, monthOf(today));

/** Today's micro-challenge index: day of the month, wrapped to the list length. */
export function challengeIndexFor(track: CharacterTrack, date: string): number {
    if (!track.challenges.length) return 0;
    const day = Number(date.slice(8, 10)) || 1;
    return (day - 1) % track.challenges.length;
}

export const logFor = (s: CurriculaState, trackId: string, memberId: string, date: string): CharacterLog | undefined =>
    s.logs.find((l) => l.trackId === trackId && l.memberId === memberId && l.date === date);

export const logsFor = (s: CurriculaState, trackId: string, memberId: string): CharacterLog[] =>
    s.logs.filter((l) => l.trackId === trackId && l.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));

/** How much of this month's track a child has done, 0–100. */
export function trackPct(s: CurriculaState, track: CharacterTrack, memberId: string, today: string): number {
    const dayOfMonth = Number(today.slice(8, 10)) || 1;
    const soFar = Math.min(dayOfMonth, track.challenges.length || dayOfMonth);
    return pctOf(logsFor(s, track.id, memberId).length, soFar);
}

// ---------------------------------------------------------------------------
// The child's feed
// ---------------------------------------------------------------------------

export interface FeedItem {
    id: string;
    kind: "assignment" | "character" | "milestone" | "badge";
    title: string;
    body: string;
    emoji: string;
    href: string;
    done: boolean;
    /** What the read-aloud button says. */
    speak: string;
    pictureLed?: boolean;
    photoUrl?: string;
    sprouts?: number;
}

/**
 * The child's own feed for a day: today's assignments first (they are what the
 * morning is for), then the character challenge, then anything to celebrate.
 * The order is deliberate and the same every morning — a nine-year-old should
 * not have to hunt.
 */
export function feedFor(s: CurriculaState, memberId: string, today: string): FeedItem[] {
    const items: FeedItem[] = [];
    const due = [...overdueFor(s, memberId, today), ...dueToday(s, memberId, today)];
    for (const a of due) {
        const subject = subjectById(s, a.subjectId);
        const late = a.dueDate < today;
        items.push({
            id: a.id,
            kind: "assignment",
            title: a.title,
            body: `${subject?.name ?? "Work"}${late ? " · from yesterday" : " · today"}${a.sprouts ? ` · ${a.sprouts} Sprouts` : ""}`,
            emoji: a.pictureLed ? "🖼️" : "📘",
            href: `${BASE}/${memberId}/assignments/${a.id}`,
            done: isDone(a),
            speak: `${a.title}. ${subject?.name ?? ""}. ${a.instructions || "Tap to start."}`,
            pictureLed: a.pictureLed,
            photoUrl: a.attachments[0],
            sprouts: a.sprouts,
        });
    }

    const track = trackFor(s, today);
    if (track) {
        const idx = challengeIndexFor(track, today);
        const done = Boolean(logFor(s, track.id, memberId, today));
        items.push({
            id: `track-${track.id}`,
            kind: "character",
            title: track.challenges[idx] ?? track.virtue,
            body: `${track.virtue} challenge · ${track.sprouts} Sprouts`,
            emoji: "🌱",
            href: `${BASE}/${memberId}`,
            done,
            speak: `Today's ${track.virtue} challenge. ${track.challenges[idx] ?? ""}`,
        });
    }

    for (const m of s.milestones.filter((x) => x.memberId === memberId && x.progressPct >= 100 && !x.celebratedAt)) {
        items.push({
            id: `milestone-${m.id}`,
            kind: "milestone",
            title: `You did it: ${m.title}`,
            body: "A milestone to celebrate together.",
            emoji: "🎉",
            href: `${BASE}/${memberId}`,
            done: false,
            speak: `You did it. ${m.title}. That is a milestone worth celebrating.`,
            photoUrl: m.photoUrl,
        });
    }

    for (const a of freshAwards(s, memberId, today, 3)) {
        const badge = badgeById(s, a.badgeId);
        if (!badge) continue;
        items.push({
            id: `award-${a.id}`,
            kind: "badge",
            title: `New badge: ${badge.name}`,
            body: a.note || `${badge.virtueOrSkill} · ${a.level}`,
            emoji: badge.icon || "🏅",
            href: `${BASE}/${memberId}`,
            done: false,
            speak: `You earned a new badge. ${badge.name}. ${a.note || ""}`,
        });
    }

    return items;
}

// ---------------------------------------------------------------------------
// Dashboard, nudges, grounding, search
// ---------------------------------------------------------------------------

const firstName = (ctx: RepoContext, id: string): string => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";

/** 06:00 local on `date`, as an ISO instant — when a child's day is published. */
function sixAm(date: string): string {
    const d = new Date(`${date}T06:00:00`);
    return Number.isNaN(d.getTime()) ? `${date}T06:00:00.000Z` : d.toISOString();
}

export function dashboard(state: CurriculaState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    if (ctx.me.role === "guest") return { agenda, attention, rings, childCards };

    const kids = childrenInView(ctx);
    const child = ctx.me.role === "child";

    for (const kid of kids) {
        // Today's work — on the family's Today from 06:00, which is what makes
        // it "already there" when a child opens the app at breakfast.
        for (const a of dueToday(state, kid.id, ctx.today)) {
            const subject = subjectById(state, a.subjectId);
            agenda.push({
                id: `asn-${a.id}`,
                moduleId: "curricula",
                area: "grow",
                title: a.title,
                meta: `${subject?.name ?? "Curriculum"}${a.sprouts ? ` · ${a.sprouts} Sprouts` : ""}`,
                memberId: kid.id,
                at: sixAm(ctx.today),
                done: isDone(a),
                href: `${BASE}/${kid.id}/assignments/${a.id}`,
                sort: 610,
            });
        }

        const late = overdueFor(state, kid.id, ctx.today);
        if (late.length) {
            attention.push({
                id: `overdue-${kid.id}`,
                moduleId: "curricula",
                area: "grow",
                tone: late.length > 2 ? "danger" : "warn",
                title: `${firstName(ctx, kid.id)} has ${late.length} piece${late.length === 1 ? "" : "s"} of work overdue`,
                body: late
                    .slice(0, 3)
                    .map((a) => `${a.title} (${subjectById(state, a.subjectId)?.name ?? "—"})`)
                    .join(" · "),
                href: `${BASE}/${kid.id}`,
                weight: 52,
            });
        }

        const term = currentTerm(state, kid.id);
        const avg = termAverage(state, kid.id, term);
        if (avg.graded > 0 && !child) {
            rings.push({
                id: `avg-${kid.id}`,
                moduleId: "curricula",
                area: "grow",
                label: `${firstName(ctx, kid.id)} · ${term || "this term"}`,
                pct: avg.avg,
                sub: `${avg.avg}% across ${avg.graded} marked piece${avg.graded === 1 ? "" : "s"}`,
                href: `${BASE}/${kid.id}`,
            });
        }

        for (const m of milestonesToCelebrate(state, [kid.id])) {
            attention.push({
                id: `milestone-${m.id}`,
                moduleId: "curricula",
                area: "grow",
                tone: "celebrate",
                title: `${firstName(ctx, kid.id)} reached ${m.title}`,
                body: "A developmental milestone at 100%. Mark it together — a photo, a phone call to Ibadan, something.",
                href: `${BASE}/${kid.id}`,
                weight: 44,
            });
        }
    }

    // Parents: work handed in and waiting on a mark.
    if (ctx.me.role === "parent") {
        const waiting = awaitingGrade(state);
        if (waiting.length) {
            attention.push({
                id: "to-grade",
                moduleId: "curricula",
                area: "grow",
                tone: "info",
                title: `${waiting.length} piece${waiting.length === 1 ? "" : "s"} of work waiting to be marked`,
                body: waiting
                    .slice(0, 3)
                    .map((a) => `${firstName(ctx, a.childMemberId)}: ${a.title}`)
                    .join(" · "),
                href: BASE,
                weight: 36,
            });
        }
        const track = trackFor(state, ctx.today);
        if (track) {
            const done = ctx.members.filter((m) => m.role === "child" && logFor(state, track.id, m.id, ctx.today)).length;
            const kidsCount = ctx.members.filter((m) => m.role === "child").length;
            rings.push({
                id: `track-${track.id}`,
                moduleId: "curricula",
                area: "grow",
                label: `${track.virtue} this month`,
                pct: pctOf(done, kidsCount),
                sub: `${done} of ${kidsCount} did today's challenge`,
                href: BASE,
            });
        }
    }

    // The child's own cards — this module's half of the child dashboard feed.
    if (child) {
        for (const item of feedFor(state, ctx.me.id, ctx.today).slice(0, 6)) {
            childCards.push({
                id: item.id,
                moduleId: "curricula",
                area: "grow",
                title: item.title,
                body: item.body,
                emoji: item.emoji,
                href: item.href,
                done: item.done,
            });
        }
        const term = currentTerm(state, ctx.me.id);
        const avg = termAverage(state, ctx.me.id, term);
        if (avg.graded > 0) {
            rings.push({
                id: "my-average",
                moduleId: "curricula",
                area: "grow",
                label: "My marks this term",
                pct: avg.avg,
                sub: `${avg.graded} piece${avg.graded === 1 ? "" : "s"} marked`,
                href: `${BASE}/${ctx.me.id}`,
            });
        }
        for (const a of freshAwards(state, ctx.me.id, ctx.today, 3)) {
            const badge = badgeById(state, a.badgeId);
            if (!badge) continue;
            attention.push({
                id: `award-${a.id}`,
                moduleId: "curricula",
                area: "grow",
                tone: "celebrate",
                title: `You earned ${badge.name}`,
                body: a.note || `${badge.virtueOrSkill} · ${a.level}`,
                href: `${BASE}/${ctx.me.id}`,
                weight: 60,
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: CurriculaState, ctx: RepoContext): Nudge[] {
    if (ctx.me.role === "guest") return [];
    const out: Nudge[] = [];
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);

    for (const kid of childrenInView(ctx)) {
        const today = dueToday(state, kid.id, ctx.today).filter((a) => !isDone(a));
        if (today.length) {
            out.push({
                key: `curricula-day-${kid.id}-${ctx.today}`,
                moduleId: "curricula",
                kind: "learning",
                title: `Today's work: ${today.length} thing${today.length === 1 ? "" : "s"}`,
                body: today
                    .slice(0, 3)
                    .map((a) => `${a.title} (${subjectById(state, a.subjectId)?.name ?? "—"})`)
                    .join(" · "),
                href: `${BASE}/${kid.id}`,
                memberIds: [kid.id],
                // The feed is published for the morning, never in the night.
                notBefore: sixAm(ctx.today),
            });
        }
        for (const a of overdueFor(state, kid.id, ctx.today)) {
            out.push({
                key: `curricula-overdue-${a.id}-${ctx.today}`,
                moduleId: "curricula",
                kind: "learning",
                title: `${a.title} is overdue`,
                body: `${firstName(ctx, kid.id)} was due to hand this in on ${a.dueDate}. ${subjectById(state, a.subjectId)?.name ?? ""}`.trim(),
                href: `${BASE}/${kid.id}/assignments/${a.id}`,
                memberIds: [...new Set([...parents, kid.id])],
            });
        }
        for (const m of milestonesToCelebrate(state, [kid.id])) {
            out.push({
                key: `curricula-milestone-${m.id}`,
                moduleId: "curricula",
                kind: "celebrate",
                title: `${firstName(ctx, kid.id)} reached ${m.title}`,
                body: "One hundred per cent. Worth marking together before the week runs away.",
                href: `${BASE}/${kid.id}`,
                memberIds: [...new Set([...parents, kid.id])],
            });
        }
    }

    for (const a of awaitingGrade(state)) {
        out.push({
            key: `curricula-to-grade-${a.id}`,
            moduleId: "curricula",
            kind: "learning",
            title: `${firstName(ctx, a.childMemberId)} handed in ${a.title}`,
            body: "It is waiting for a mark and a sentence of feedback.",
            href: `${BASE}/${a.childMemberId}/assignments/${a.id}`,
            memberIds: parents,
        });
    }

    return out;
}

export function aiContext(state: CurriculaState, ctx: RepoContext): string {
    if (ctx.me.role === "guest" || !state.subjects.length) return "";
    const kids = childrenInView(ctx);
    const lines: string[] = [];

    for (const kid of kids) {
        const name = kid.name.split(" ")[0];
        const term = currentTerm(state, kid.id);
        const avg = termAverage(state, kid.id, term);
        const subs = subjectsFor(state, kid.id).map((s) => {
            const a = subjectAverage(state, s.id);
            return a.graded ? `${s.name} ${a.avg}%` : s.name;
        });
        const late = overdueFor(state, kid.id, ctx.today).length;
        const today = dueToday(state, kid.id, ctx.today).map((a) => a.title);
        lines.push(
            `${name} (${term || "this term"}): ${subs.join(", ")}. Average ${avg.graded ? `${avg.avg}% over ${avg.graded} marked` : "not marked yet"}. ` +
                `${today.length ? `Due today: ${today.join("; ")}. ` : ""}${late ? `${late} overdue. ` : ""}Badges: ${awardCount(state, kid.id)}.`,
        );
        const ms = milestonesFor(state, kid.id)
            .slice(0, 3)
            .map((m) => `${m.title} ${m.progressPct}%`);
        if (ms.length) lines.push(`${name} milestones: ${ms.join(", ")}.`);
    }

    const track = trackFor(state, ctx.today);
    if (track) {
        const idx = challengeIndexFor(track, ctx.today);
        lines.push(`Character track for ${track.month}: ${track.virtue} (value: ${track.valueLabel}). Today's challenge: "${track.challenges[idx] ?? ""}".`);
    }

    return lines.join(" ").slice(0, 1500);
}

export function search(state: CurriculaState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const s of state.subjects) {
        if (`${s.name} ${s.term} ${s.note}`.toLowerCase().includes(needle)) hits.push({ title: s.name, meta: `Subject · ${s.term}`, href: `${BASE}/${s.childMemberId}` });
    }
    for (const a of state.assignments) {
        if (`${a.title} ${a.instructions}`.toLowerCase().includes(needle)) {
            hits.push({ title: a.title, meta: `Assignment · due ${a.dueDate}`, href: `${BASE}/${a.childMemberId}/assignments/${a.id}` });
        }
    }
    for (const b of state.badges) {
        if (`${b.name} ${b.virtueOrSkill} ${b.criteria}`.toLowerCase().includes(needle)) hits.push({ title: b.name, meta: `Badge · ${b.virtueOrSkill}`, href: BASE });
    }
    return hits.slice(0, 8);
}

/** Status → the tag tone the screens use, in one place. */
export const STATUS_TONE: Record<AssignmentStatus, "neutral" | "grow" | "warn" | "ok"> = {
    "not-started": "neutral",
    "in-progress": "warn",
    submitted: "grow",
    graded: "ok",
};
