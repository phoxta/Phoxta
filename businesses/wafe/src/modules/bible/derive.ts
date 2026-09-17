import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { isoDate, pct as pctOf } from "@/lib/format";
import {
    CHILD_SAFE_TAGS,
    SCHEDULE,
    type BiblePlan,
    type BibleState,
    type DailyScripture,
    type MemoryVerse,
    type Prayer,
    type Study,
    type StudySession,
    type StudyUnit,
    type VerseReview,
} from "./types";

/**
 * Every number this module shows, as pure functions of state — and, first of
 * all, the one function both repos use to decide what a member may receive.
 *
 * Filtering here rather than in the screens is what makes the demo honest: a
 * child's `load()` genuinely does not contain her mother's private prayer, and
 * a guest's genuinely contains the handful of requests the family chose to
 * share and nothing else. The companion is grounded on the same filtered
 * slice, so "I can't see that" is true rather than polite.
 */

export const BASE = "/grow/bible";

/** Whole days since the epoch, taken at noon so a clock change cannot shift it. */
const dayNumber = (iso: string): number => Math.round(new Date(`${iso.slice(0, 10)}T12:00:00`).getTime() / 86400000);
const daysBetween = (from: string, to: string): number => dayNumber(to) - dayNumber(from);

export function addDaysIso(iso: string, n: number): string {
    const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
    d.setDate(d.getDate() + n);
    return isoDate(d);
}
const first = (name: string): string => name.split(" ")[0];

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** True when every tag on the prayer is one a child may read. */
export const tagsAreChildSafe = (p: Prayer): boolean => p.tags.every((t) => CHILD_SAFE_TAGS.has(t));

/**
 * Core visibility, applied to a prayer.
 *
 * Private is absolute: the author, nobody else, ever. Guests reach the wall
 * only through the grant AND the per-prayer "share with guests" flag, and
 * children only through the child-safe triple (flag · sensitivity · tags).
 */
export function canSeePrayer(p: Prayer, me: Member, wallGuestIds: string[]): boolean {
    if (p.authorMemberId === me.id) return true;
    if (p.visibility === "private") return false;
    if (p.visibility === "shared") return p.sharedWith.includes(me.id);
    if (me.role === "guest") return wallGuestIds.includes(me.id) && p.sharedWithGuests;
    if (me.role === "child") return p.childSafe && p.sensitivity === "general" && tagsAreChildSafe(p);
    return true;
}

/** A child may open a study only when it is child-safe and theirs. */
export function canSeeStudy(s: Study, me: Member): boolean {
    if (me.role === "parent") return true;
    if (me.role === "guest") return false;
    return s.childSafe && s.assigneeMemberIds.includes(me.id);
}

/** Wall order: open first, newest first — Home shows the top of this list. */
const wallOrder = (a: Prayer, b: Prayer): number => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return (b.answeredAt ?? b.createdAt).localeCompare(a.answeredAt ?? a.createdAt);
};

/** The slice this member may receive. */
export function visibleTo(state: BibleState, ctx: RepoContext): BibleState {
    const me = ctx.me;
    const prayers = state.prayers.filter((p) => canSeePrayer(p, me, state.wallGuestIds)).sort(wallOrder);
    const prayerIds = new Set(prayers.map((p) => p.id));
    const verses = dailyFeed(state, ctx.today);

    if (me.role === "guest") {
        const granted = state.wallGuestIds.includes(me.id);
        return {
            studies: [],
            sessions: [],
            done: [],
            plans: [],
            planDays: [],
            memoryVerses: [],
            reviews: [],
            prayers: granted ? prayers : prayers.filter((p) => p.authorMemberId === me.id),
            reactions: state.reactions.filter((r) => prayerIds.has(r.prayerId)),
            wallGuestIds: granted ? [me.id] : [],
            graceDays: state.graceDays,
            rollingVerses: state.rollingVerses,
            verses,
            timeline: [],
            units: [],
        };
    }

    const parent = me.role === "parent";
    const studies = state.studies.filter((s) => canSeeStudy(s, me));
    const studyIds = new Set(studies.map((s) => s.id));
    const verseRows = state.memoryVerses.filter((v) => parent || v.memberId === me.id);
    const verseIds = new Set(verseRows.map((v) => v.id));

    const slice: BibleState = {
        studies,
        sessions: state.sessions.filter((s) => studyIds.has(s.studyId)),
        done: state.done.filter((d) => studyIds.has(d.studyId) && (parent || d.memberId === me.id)),
        plans: state.plans.filter((p) => parent || p.assigneeMemberIds.includes(me.id)),
        planDays: state.planDays,
        memoryVerses: verseRows,
        reviews: state.reviews.filter((r) => verseIds.has(r.verseId)),
        prayers,
        reactions: state.reactions.filter((r) => prayerIds.has(r.prayerId)),
        wallGuestIds: parent ? state.wallGuestIds : [],
        graceDays: state.graceDays,
        rollingVerses: state.rollingVerses,
        verses,
        timeline: parent ? state.timeline : state.timeline.filter((t) => t.visibility !== "private"),
        units: [],
    };
    slice.planDays = slice.planDays.filter((d) => slice.plans.some((p) => p.id === d.planId));
    slice.units = units(slice);
    return slice;
}

// ---------------------------------------------------------------------------
// Daily scripture
// ---------------------------------------------------------------------------

export const activePlan = (state: BibleState): BiblePlan | undefined => state.plans.find((p) => p.active);

/** Which day of the plan `date` is, 1-based; 0 when the plan has not started. */
export function planDayNumber(plan: BiblePlan, date: string): number {
    const n = daysBetween(plan.startDate, date) + 1;
    return n > 0 ? n : 0;
}

/**
 * Today's scripture: the active plan's day when there is one, otherwise the
 * family's rolling verse list, rotated by the date so it never repeats twice
 * running (AC5).
 */
export function scriptureFor(state: BibleState, date: string): DailyScripture | null {
    const plan = activePlan(state);
    if (plan) {
        const day = planDayNumber(plan, date);
        const row = state.planDays.find((d) => d.planId === plan.id && d.day === day);
        if (row) return { id: `plan-${plan.id}-${day}`, date, reference: row.passage, text: row.passageText, source: "plan", planId: plan.id, day };
    }
    const list = state.rollingVerses;
    if (!list.length) return null;
    const v = list[Math.abs(dayNumber(date)) % list.length];
    return { id: `family-${date}`, date, reference: v.reference, text: v.text, source: "family" };
}

/** Today first, then the four days behind it — what Home reads as `verses`. */
export function dailyFeed(state: BibleState, today: string): DailyScripture[] {
    const out: DailyScripture[] = [];
    for (let i = 0; i >= -4; i -= 1) {
        const s = scriptureFor(state, addDaysIso(today, i));
        if (s) out.push(s);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Studies
// ---------------------------------------------------------------------------

export const studyById = (state: BibleState, id: string): Study | undefined => state.studies.find((s) => s.id === id);

export const sessionsOf = (state: BibleState, studyId: string): StudySession[] => state.sessions.filter((s) => s.studyId === studyId).sort((a, b) => a.order - b.order);

export const isSessionDone = (state: BibleState, sessionId: string, memberId: string): boolean => state.done.some((d) => d.sessionId === sessionId && d.memberId === memberId);

export interface StudyProgress {
    study: Study;
    total: number;
    done: number;
    pct: number;
    next: StudySession | undefined;
}

/** Progress for one member; for a parent not enrolled, the household's furthest. */
export function studyProgress(state: BibleState, study: Study, memberId: string): StudyProgress {
    const sessions = sessionsOf(state, study.id);
    const who = study.assigneeMemberIds.includes(memberId) ? [memberId] : study.assigneeMemberIds.length ? study.assigneeMemberIds : [memberId];
    const doneCount = sessions.filter((s) => who.some((m) => isSessionDone(state, s.id, m))).length;
    return {
        study,
        total: sessions.length,
        done: doneCount,
        pct: pctOf(doneCount, sessions.length),
        next: sessions.find((s) => !who.some((m) => isSessionDone(state, s.id, m))),
    };
}

export const myStudies = (state: BibleState, memberId: string): Study[] => state.studies.filter((s) => s.assigneeMemberIds.includes(memberId));

/**
 * Studies materialised for Curricula (AC6). Each session is one assignment, so
 * a completed session moves the Curricula unit the moment the slice reloads.
 *
 * The shape is Curricula's own `ImportableUnit` (plus a `done` flag it may
 * ignore), so the register imports a study with the line it already uses for
 * Books. Bible may not edit Curricula, so until that read is wired the screens
 * here promise only what this module can keep on its own.
 */
export function units(state: BibleState): StudyUnit[] {
    return state.studies
        .filter((s) => s.assigneeMemberIds.length > 0)
        .map((s) => {
            const sessions = sessionsOf(state, s.id);
            return {
                id: `unit-${s.id}`,
                studyId: s.id,
                courseId: s.id,
                title: s.title,
                subject: "Bible & discipleship",
                weeks: sessions.length,
                memberIds: s.assigneeMemberIds,
                assignments: sessions.map((x) => ({
                    id: `asn-${x.id}`,
                    week: x.order,
                    title: `${x.order}. ${x.passage}`,
                    href: `${BASE}/studies/${s.id}?s=${x.order}`,
                    done: s.assigneeMemberIds.some((m) => isSessionDone(state, x.id, m)),
                })),
            };
        });
}

// ---------------------------------------------------------------------------
// Memory verses
// ---------------------------------------------------------------------------

export const versesOf = (state: BibleState, memberId: string): MemoryVerse[] => state.memoryVerses.filter((v) => v.memberId === memberId);

/** The row waiting to be answered for this verse, if any. */
export const pendingReview = (state: BibleState, verseId: string): VerseReview | undefined => state.reviews.find((r) => r.verseId === verseId && r.reviewedAt === null);

/** 0–5: how many rungs of the 1-3-7-14-30 ladder this verse has climbed. */
export function masteryOf(state: BibleState, verseId: string): number {
    const passed = state.reviews.filter((r) => r.verseId === verseId && r.result === "knew").length;
    const failed = state.reviews.filter((r) => r.verseId === verseId && r.result === "again").length;
    const pending = pendingReview(state, verseId);
    if (pending) return Math.min(SCHEDULE.length, pending.step);
    return Math.max(0, Math.min(SCHEDULE.length, passed - failed));
}

/** The next interval after a result, in days. */
export const nextInterval = (step: number, result: "knew" | "again"): { step: number; days: number } => {
    const s = result === "knew" ? Math.min(step + 1, SCHEDULE.length - 1) : 0;
    return { step: s, days: SCHEDULE[s] };
};

export interface DueCard {
    verse: MemoryVerse;
    review: VerseReview;
    mastery: number;
    overdueDays: number;
}

/** Cards due on or before `today` for a member (AC1). */
export function dueVerses(state: BibleState, memberId: string, today: string): DueCard[] {
    return state.memoryVerses
        .filter((v) => v.memberId === memberId)
        .map((v) => {
            const review = pendingReview(state, v.id);
            if (!review || review.dueAt > today) return null;
            return { verse: v, review, mastery: masteryOf(state, v.id), overdueDays: daysBetween(review.dueAt, today) };
        })
        .filter((c): c is DueCard => c !== null)
        .sort((a, b) => b.overdueDays - a.overdueDays);
}

/** The next date this member has a card, or null when nothing is scheduled. */
export function nextVerseDate(state: BibleState, memberId: string): string | null {
    const dates = state.memoryVerses.filter((v) => v.memberId === memberId).map((v) => pendingReview(state, v.id)?.dueAt).filter((d): d is string => Boolean(d));
    return dates.length ? dates.sort()[0] : null;
}

/**
 * "Hide words" practice: blank out roughly `level`/4 of the words, always the
 * longer ones first so the sentence keeps its shape.
 */
export function hideWords(text: string, level: number): Array<{ word: string; hidden: boolean }> {
    const words = text.split(/\s+/).filter(Boolean);
    if (level <= 0) return words.map((w) => ({ word: w, hidden: false }));
    const ranked = words
        .map((w, i) => ({ i, len: w.replace(/[^A-Za-zÀ-ÿ]/g, "").length }))
        .sort((a, b) => b.len - a.len || a.i - b.i);
    const n = Math.min(words.length, Math.round((words.length * Math.min(level, 4)) / 4));
    const hidden = new Set(ranked.slice(0, n).map((r) => r.i));
    return words.map((w, i) => ({ word: w, hidden: hidden.has(i) }));
}

// ---------------------------------------------------------------------------
// Prayer
// ---------------------------------------------------------------------------

export const openPrayers = (state: BibleState): Prayer[] => state.prayers.filter((p) => p.status === "open");
export const answeredPrayers = (state: BibleState): Prayer[] => state.prayers.filter((p) => p.status === "answered").sort((a, b) => (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""));

/** The wall proper: everything except the author's own private list. */
export const wallPrayers = (state: BibleState): Prayer[] => state.prayers.filter((p) => p.visibility !== "private");
export const privatePrayers = (state: BibleState, memberId: string): Prayer[] => state.prayers.filter((p) => p.visibility === "private" && p.authorMemberId === memberId);

export const prayedCount = (state: BibleState, prayerId: string): number => state.reactions.filter((r) => r.prayerId === prayerId).length;
export const hasPrayed = (state: BibleState, prayerId: string, memberId: string): boolean => state.reactions.some((r) => r.prayerId === prayerId && r.memberId === memberId);

/** AC8: the guest card is exactly the open requests marked shared with guests. */
export const howToPrayThisWeek = (state: BibleState): Prayer[] => state.prayers.filter((p) => p.status === "open" && p.sharedWithGuests && p.visibility !== "private").slice(0, 6);

/**
 * Prayer streak, with grace (AC9).
 *
 * A day counts when the member prayed for something on the wall, or wrote or
 * answered a request. A day on the family's grace list neither counts nor
 * breaks the chain — the streak simply steps over it, because the brief's
 * mechanic is rituals, not loss aversion.
 */
export function prayerStreak(state: BibleState, memberId: string, today: string): { days: number; graceUsed: number; activeToday: boolean } {
    const grace = new Set(state.graceDays);
    const active = new Set<string>();
    for (const r of state.reactions) if (r.memberId === memberId) active.add(r.date);
    for (const p of state.prayers) {
        if (p.authorMemberId !== memberId) continue;
        active.add(p.createdAt.slice(0, 10));
        if (p.answeredAt) active.add(p.answeredAt);
    }
    let days = 0;
    let graceUsed = 0;
    // Today not yet prayed is not a broken streak: start counting yesterday.
    let cursor = active.has(today) ? today : addDaysIso(today, -1);
    for (let i = 0; i < 400; i += 1) {
        if (active.has(cursor)) days += 1;
        else if (grace.has(cursor)) graceUsed += 1;
        else break;
        cursor = addDaysIso(cursor, -1);
    }
    return { days, graceUsed, activeToday: active.has(today) };
}

/** Prayers answered in the last `n` days — the family's evidence, recently. */
export const recentlyAnswered = (state: BibleState, today: string, n = 14): Prayer[] =>
    answeredPrayers(state).filter((p) => p.answeredAt && daysBetween(p.answeredAt, today) <= n && p.answeredAt <= today);

// ---------------------------------------------------------------------------
// Dashboard, nudges, grounding, search
// ---------------------------------------------------------------------------

export function dashboard(state: BibleState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const me = ctx.me;
    const today = ctx.today;
    const verse = state.verses[0];

    // ---- Guest: the wall they were given, and how to pray this week --------
    if (me.role === "guest") {
        const wall = howToPrayThisWeek(state);
        if (wall.length) {
            attention.push({
                id: "how-to-pray",
                moduleId: "bible",
                area: "grow",
                tone: "info",
                title: "How to pray for us this week",
                body: wall.slice(0, 3).map((p) => p.title).join(" · "),
                href: `${BASE}/prayer`,
                weight: 44,
            });
        }
        return { agenda, attention, rings, childCards };
    }

    // ---- Today's scripture --------------------------------------------------
    if (verse) {
        agenda.push({
            id: `scripture-${verse.date}`,
            moduleId: "bible",
            area: "grow",
            title: verse.reference,
            meta: verse.source === "plan" ? `Reading plan · day ${verse.day}` : "Today's verse",
            memberId: null,
            at: `${today}T07:00:00`,
            done: false,
            href: BASE,
            sort: 70,
        });
    }

    // ---- Memory verses due at 07:00 (AC1) ----------------------------------
    const due = dueVerses(state, me.id, today);
    if (due.length) {
        agenda.push({
            id: `verses-due-${today}`,
            moduleId: "bible",
            area: "grow",
            title: due.length === 1 ? `Memory verse: ${due[0].verse.reference}` : `${due.length} memory verses to review`,
            meta: `Memory · ${due[0].overdueDays > 0 ? `${due[0].overdueDays}d overdue` : "due today"}`,
            memberId: me.id,
            at: `${today}T07:00:00`,
            done: false,
            href: `${BASE}/verses`,
            sort: 74,
        });
    }
    // A parent also sees the children's cards waiting.
    if (me.role === "parent") {
        for (const kid of ctx.members.filter((m) => m.role === "child")) {
            const theirs = dueVerses(state, kid.id, today);
            if (!theirs.length) continue;
            agenda.push({
                id: `verses-due-${kid.id}-${today}`,
                moduleId: "bible",
                area: "grow",
                title: `${first(kid.name)}: ${theirs.length} verse${theirs.length === 1 ? "" : "s"} to review`,
                meta: `Memory · ${theirs[0].verse.reference}`,
                memberId: kid.id,
                at: `${today}T07:00:00`,
                done: false,
                href: `${BASE}/verses`,
                sort: 76,
            });
        }
    }

    // ---- Studies ------------------------------------------------------------
    for (const study of myStudies(state, me.id)) {
        const p = studyProgress(state, study, me.id);
        if (p.next) {
            agenda.push({
                id: `study-${study.id}`,
                moduleId: "bible",
                area: "grow",
                title: `${study.title} · ${p.next.passage}`,
                meta: `Study · ${study.minutes} min`,
                memberId: me.id,
                at: null,
                done: false,
                href: `${BASE}/studies/${study.id}?s=${p.next.order}`,
                sort: 640,
            });
        }
        rings.push({
            id: `study-${study.id}`,
            moduleId: "bible",
            area: "grow",
            label: study.title,
            pct: p.pct,
            sub: `Session ${Math.min(p.done + 1, p.total || 1)} of ${p.total}`,
            href: `${BASE}/studies/${study.id}`,
        });
    }

    // ---- Prayer -------------------------------------------------------------
    const open = openPrayers(state).filter((p) => p.visibility !== "private");
    const streak = prayerStreak(state, me.id, today);
    if (open.length && !streak.activeToday) {
        agenda.push({
            id: "prayer-wall",
            moduleId: "bible",
            area: "grow",
            title: `Pray for ${open.length} thing${open.length === 1 ? "" : "s"} on the wall`,
            meta: streak.days ? `Prayer · ${streak.days}-day streak` : "Prayer",
            memberId: me.id,
            at: null,
            done: false,
            href: `${BASE}/prayer`,
            sort: 690,
        });
    }
    for (const p of recentlyAnswered(state, today, 7).slice(0, 2)) {
        attention.push({
            id: `answered-${p.id}`,
            moduleId: "bible",
            area: "grow",
            tone: "celebrate",
            title: `Answered: ${p.title}`,
            body: p.testimony || "Marked answered on the wall — worth saying out loud at dinner.",
            href: `${BASE}/prayer`,
            weight: 34,
        });
    }
    if (me.role === "parent") {
        const stale = open.filter((p) => daysBetween(p.createdAt.slice(0, 10), today) >= 30);
        if (stale.length) {
            attention.push({
                id: "prayer-stale",
                moduleId: "bible",
                area: "grow",
                tone: "info",
                title: `${stale.length} request${stale.length === 1 ? " has" : "s have"} been open a month`,
                body: `Starting with "${stale[0].title}". Sunday planning is a good moment to ask how it is going.`,
                href: `${BASE}/prayer`,
                weight: 24,
            });
        }
    }

    // ---- The child's own cards ---------------------------------------------
    if (me.role === "child") {
        if (verse) {
            childCards.push({
                id: "verse-today",
                moduleId: "bible",
                area: "grow",
                title: "Today's verse",
                body: `${verse.reference} — ${verse.text}`,
                emoji: "📖",
                href: BASE,
            });
        }
        if (due.length) {
            childCards.push({
                id: "memory",
                moduleId: "bible",
                area: "grow",
                title: "Memory verse",
                body: due.length === 1 ? `Practise ${due[0].verse.reference}.` : `${due.length} verses to practise.`,
                emoji: "🧠",
                href: `${BASE}/verses`,
                pct: pctOf(masteryOf(state, due[0].verse.id), SCHEDULE.length),
            });
        }
        for (const study of myStudies(state, me.id)) {
            const p = studyProgress(state, study, me.id);
            childCards.push({
                id: `study-${study.id}`,
                moduleId: "bible",
                area: "grow",
                title: study.title,
                body: p.next ? `Next: ${p.next.passage}` : "You have finished every session. Well done.",
                emoji: "🌱",
                href: `${BASE}/studies/${study.id}`,
                pct: p.pct,
                done: !p.next,
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: BibleState, ctx: RepoContext): Nudge[] {
    if (ctx.me.role === "guest") return [];
    const out: Nudge[] = [];
    const today = ctx.today;
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);

    // Memory cards come up at 07:00, never before (AC1).
    for (const m of ctx.members.filter((x) => x.role !== "guest")) {
        const due = dueVerses(state, m.id, today);
        if (!due.length) continue;
        out.push({
            key: `bible-verses-${m.id}-${today}`,
            moduleId: "bible",
            kind: "prayer",
            title: due.length === 1 ? `Memory verse: ${due[0].verse.reference}` : `${due.length} memory verses are due`,
            body: `${first(m.name)} has ${due.length} card${due.length === 1 ? "" : "s"} to review today. Two minutes each.`,
            href: `${BASE}/verses`,
            memberIds: [m.id],
            notBefore: `${today}T07:00:00`,
        });
    }

    const verse = state.verses[0];
    if (verse) {
        out.push({
            key: `bible-scripture-${today}`,
            moduleId: "bible",
            kind: "prayer",
            title: `Today's reading: ${verse.reference}`,
            body: verse.text.slice(0, 140),
            href: BASE,
            memberIds: [],
            notBefore: `${today}T07:00:00`,
        });
    }

    for (const p of recentlyAnswered(state, today, 3)) {
        out.push({
            key: `bible-answered-${p.id}`,
            moduleId: "bible",
            kind: "celebrate",
            title: `Answered: ${p.title}`,
            body: p.testimony || "One more for the archive.",
            href: `${BASE}/prayer`,
            memberIds: parents,
        });
    }

    for (const study of state.studies) {
        for (const memberId of study.assigneeMemberIds) {
            const p = studyProgress(state, study, memberId);
            if (!p.next || p.done === 0) continue;
            const last = state.done.filter((d) => d.studyId === study.id && d.memberId === memberId).map((d) => d.date).sort().pop();
            // Seven days, not five: a study that waited a working week is a
            // nudge; one that waited a weekend is just a weekend.
            if (!last || daysBetween(last, today) < 7) continue;
            out.push({
                key: `bible-study-idle-${study.id}-${memberId}-${today}`,
                moduleId: "bible",
                kind: "learning",
                title: `${study.title} has been waiting`,
                body: `${first(ctx.members.find((m) => m.id === memberId)?.name ?? "Someone")} last did a session ${daysBetween(last, today)} days ago. Next up: ${p.next.passage}.`,
                href: `${BASE}/studies/${study.id}`,
                memberIds: [...new Set([...parents, memberId])],
            });
        }
    }

    return out;
}

export function aiContext(state: BibleState, ctx: RepoContext): string {
    const name = (id: string): string => first(ctx.members.find((m) => m.id === id)?.name ?? "someone");
    const verse = state.verses[0];

    if (ctx.me.role === "guest") {
        const wall = howToPrayThisWeek(state).map((p) => p.title);
        return [
            verse ? `Today's family verse: ${verse.reference} — ${verse.text}` : "",
            wall.length ? `The family asked guests to pray for: ${wall.join("; ")}.` : "Nothing on the wall has been shared with guests this week.",
            "Nothing else in this family's Bible, study or prayer records is visible to this guest.",
        ]
            .filter(Boolean)
            .join(" ")
            .slice(0, 1500);
    }

    const plan = activePlan(state);
    const studies = state.studies.filter((s) => s.assigneeMemberIds.length > 0).map((s) => {
        const p = studyProgress(state, s, ctx.me.id);
        return `"${s.title}" (${p.done}/${p.total}${s.assigneeMemberIds.length ? `, ${s.assigneeMemberIds.map(name).join(" & ")}` : ""})`;
    });
    const due = dueVerses(state, ctx.me.id, ctx.today).map((d) => d.verse.reference);
    const mine = versesOf(state, ctx.me.id).map((v) => v.reference);
    // Private prayers are excluded from the grounding OUTRIGHT — including the
    // asking member's own. The wall is what the companion may reason about; a
    // private list is the one place in Wàfè nothing reads but its author's own
    // eyes, and the closing line of this summary has to stay true.
    const open = openPrayers(state).filter((p) => p.visibility !== "private");
    const answered = recentlyAnswered(state, ctx.today, 30);
    const streak = prayerStreak(state, ctx.me.id, ctx.today);

    return [
        verse ? `Today's scripture (${verse.source === "plan" ? `${plan?.title}, day ${verse.day}` : "family verse list"}): ${verse.reference} — ${verse.text}` : "",
        studies.length ? `Studies: ${studies.join("; ")}.` : "",
        mine.length ? `${first(ctx.me.name)}'s memory verses: ${mine.join(", ")}${due.length ? ` (due today: ${due.join(", ")})` : ""}.` : "",
        open.length ? `Open prayer requests: ${open.slice(0, 6).map((p) => `${p.title} (${p.tags.join("/") || "untagged"}, from ${name(p.authorMemberId)})`).join("; ")}.` : "",
        answered.length ? `Answered in the last month: ${answered.slice(0, 3).map((p) => p.title).join("; ")}.` : "",
        `${first(ctx.me.name)} has prayed ${streak.days} day${streak.days === 1 ? "" : "s"} running${streak.graceUsed ? ` (${streak.graceUsed} grace day${streak.graceUsed === 1 ? "" : "s"} stepped over)` : ""}.`,
        "Private prayers are not in this summary and must never be guessed at.",
    ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1500);
}

export function search(state: BibleState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const s of state.studies) {
        if (`${s.title} ${s.description}`.toLowerCase().includes(needle)) hits.push({ title: s.title, meta: `Bible study · ${sessionsOf(state, s.id).length} sessions`, href: `${BASE}/studies/${s.id}` });
    }
    for (const s of state.sessions) {
        if (`${s.passage} ${s.passageText}`.toLowerCase().includes(needle)) {
            const study = studyById(state, s.studyId);
            if (study) hits.push({ title: s.passage, meta: `Session ${s.order} · ${study.title}`, href: `${BASE}/studies/${study.id}?s=${s.order}` });
        }
    }
    for (const v of state.memoryVerses) {
        if (`${v.reference} ${v.text}`.toLowerCase().includes(needle)) hits.push({ title: v.reference, meta: "Memory verse", href: `${BASE}/verses` });
    }
    for (const p of state.prayers) {
        if (`${p.title} ${p.detail} ${p.testimony}`.toLowerCase().includes(needle)) {
            hits.push({ title: p.title, meta: p.status === "answered" ? `Answered prayer${p.answeredAt ? ` · ${p.answeredAt}` : ""}` : "Prayer request", href: `${BASE}/prayer` });
        }
    }
    return hits.slice(0, 8);
}
