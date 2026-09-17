import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { duration, isoDate, pct } from "@/lib/format";
import type { Completion, LearningPlan, LearningState, LearningTask, LessonVideo, PlanItem, Playlist } from "./types";
import { COMPLETE_AT_PCT } from "./types";

/**
 * Every number the Learning Hub shows, and the one function that decides what
 * a member is allowed to receive at all.
 *
 * `visibleTo` runs in BOTH repos — the demo filters exactly as row-level
 * security does — so a child's slice simply does not contain Oluwafemi's private
 * cycling playlist, and the companion's grounding (built from the same slice)
 * cannot leak it either. Where the two could ever disagree the module is the
 * stricter of the pair: "private" excludes co-parents, "family" excludes
 * children, and a guest holds named objects rather than a module.
 */

const MOD = "learning";
const AREA = "grow" as const;
const HREF = "/grow/learning";

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/**
 * Can this member see this playlist?
 *
 * The words mean what `wf_can_see` (sql/00-foundation.sql) says they mean, and
 * what the visibility picker prints on the screen:
 *
 *   private — the owner, and nobody else at all. Not a co-parent, not the
 *             Space owner. "Just me" is a promise or it is nothing.
 *   shared  — the owner plus the members named on the row.
 *   family  — the parents. A child gets NOTHING from "family" by default,
 *             which is exactly what the picker's own label tells the parent
 *             who chose it, and exactly what RLS would do in live.
 *   child   — written for children: everyone in the space.
 *
 * Two rules sit on top of that: a playlist SET FOR someone is theirs to see
 * whatever the visibility says (that is what assigning means), and a child
 * never receives a row that is not child-safe, whatever else is true.
 */
export function canSeePlaylist(p: Playlist, ctx: RepoContext): boolean {
    if (p.ownerMemberId === ctx.me.id) return true;
    const setForMe = p.assignedTo.includes(ctx.me.id);
    const sharedWithMe = p.visibility === "shared" && p.sharedWith.includes(ctx.me.id);
    // A guest is granted named objects, never a module: a shelf set for them,
    // or one they were named on. The family's own shelves stay the family's.
    if (ctx.role === "guest") return setForMe || sharedWithMe;
    // The child gate, above everything else.
    if (ctx.role === "child" && !p.childSafe) return false;
    if (setForMe || sharedWithMe) return true;
    if (p.visibility === "child") return true;
    return p.visibility === "family" && ctx.role === "parent";
}

/**
 * A video reaches a member through a playlist they can see, or because they
 * saved it themselves. A child needs the child-safe flag on top of that
 * (acceptance criterion 6); a parent additionally keeps unfiled imports —
 * lessons on nobody's shelf — because those belong to no one's privacy.
 *
 * The consequence that matters: the videos inside a private shelf are as
 * private as the shelf. Oluwafemi's cycling course does not surface in Ifeoluwa's
 * "recently added", her search, or her companion's grounding.
 */
export function canSeeVideo(v: LessonVideo, visiblePlaylists: Playlist[], allPlaylists: Playlist[], ctx: RepoContext): boolean {
    if (v.addedBy === ctx.me.id) return true;
    if (ctx.role === "child" && !v.childSafe) return false;
    if (visiblePlaylists.some((p) => p.videoIds.includes(v.id))) return true;
    return ctx.role === "parent" && !allPlaylists.some((p) => p.videoIds.includes(v.id));
}

/** The same rule for a plan: owner, assignee, named — then the visibility. */
export function canSeePlan(plan: LearningPlan, ctx: RepoContext): boolean {
    if (plan.ownerMemberId === ctx.me.id) return true;
    if (plan.assigneeIds.includes(ctx.me.id)) return true;
    if (plan.visibility === "shared" && plan.sharedWith.includes(ctx.me.id)) return true;
    if (ctx.role === "guest") return false;
    if (plan.visibility === "child") return true;
    return plan.visibility === "family" && ctx.role === "parent";
}

/** The slice this member is allowed to hold. Both repos return exactly this. */
export function visibleTo(state: LearningState, ctx: RepoContext): LearningState {
    const playlists = state.playlists.filter((p) => canSeePlaylist(p, ctx));
    const videos = state.videos.filter((v) => canSeeVideo(v, playlists, state.playlists, ctx));
    const ids = new Set(videos.map((v) => v.id));
    const parent = ctx.role === "parent";
    const plans = state.plans.filter((p) => canSeePlan(p, ctx));
    const planItemIds = new Set(plans.flatMap((p) => p.items.map((i) => i.id)));
    return {
        videos,
        playlists,
        // Notes are personal: parents keep the family's, a child keeps their own.
        notes: state.notes.filter((n) => (parent || n.memberId === ctx.me.id) && ids.has(n.videoId)),
        plans,
        completions: state.completions.filter((c) => (parent || c.memberId === ctx.me.id) && (c.itemType === "video" ? ids.has(c.itemId) : planItemIds.has(c.itemId))),
        tasks: state.tasks.filter((t) => (parent || t.memberId === ctx.me.id) && ids.has(t.videoId)),
    };
}

// ---------------------------------------------------------------------------
// Lookups and progress
// ---------------------------------------------------------------------------

export const videoById = (state: LearningState, id: string): LessonVideo | undefined => state.videos.find((v) => v.id === id);
export const playlistById = (state: LearningState, id: string): Playlist | undefined => state.playlists.find((p) => p.id === id);
export const planById = (state: LearningState, id: string): LearningPlan | undefined => state.plans.find((p) => p.id === id);

export const notesFor = (state: LearningState, videoId: string): VideoNoteList => state.notes.filter((n) => n.videoId === videoId).sort((a, b) => a.timestampS - b.timestampS);
type VideoNoteList = LearningState["notes"];

export const tasksFor = (state: LearningState, videoId: string): LearningTask[] => state.tasks.filter((t) => t.videoId === videoId);

export function completionFor(state: LearningState, itemType: Completion["itemType"], itemId: string, memberId: string): Completion | undefined {
    return state.completions.find((c) => c.itemType === itemType && c.itemId === itemId && c.memberId === memberId);
}

export function videoDone(state: LearningState, videoId: string, memberId: string): boolean {
    return Boolean(completionFor(state, "video", videoId, memberId)?.completedAt);
}

export function videoPct(state: LearningState, videoId: string, memberId: string): number {
    const c = completionFor(state, "video", videoId, memberId);
    return c ? c.progressPct : 0;
}

/** Where to resume a video for this member (seconds), 0 when finished or new. */
export function resumeAt(state: LearningState, video: LessonVideo, memberId: string): number {
    const c = completionFor(state, "video", video.id, memberId);
    if (!c || c.completedAt || !video.durationS) return 0;
    return Math.max(0, Math.floor((c.progressPct / 100) * video.durationS) - 5);
}

export function playlistProgress(state: LearningState, p: Playlist, memberId: string): { done: number; total: number; pct: number } {
    const total = p.videoIds.length;
    const done = p.videoIds.filter((id) => videoDone(state, id, memberId)).length;
    return { done, total, pct: pct(done, total) };
}

export function planItemDone(state: LearningState, item: PlanItem, memberId: string): boolean {
    if (item.itemType === "video" && item.itemId) return videoDone(state, item.itemId, memberId);
    return Boolean(completionFor(state, "plan-item", item.id, memberId)?.completedAt);
}

export function planProgressFor(state: LearningState, plan: LearningPlan, memberId: string): { done: number; total: number; pct: number } {
    const total = plan.items.length;
    const done = plan.items.filter((i) => planItemDone(state, i, memberId)).length;
    return { done, total, pct: pct(done, total) };
}

/** Across every assignee — what the plan card shows. */
export function planProgress(state: LearningState, plan: LearningPlan): { done: number; total: number; pct: number } {
    let done = 0;
    let total = 0;
    for (const m of plan.assigneeIds)
        for (const i of plan.items) {
            total += 1;
            if (planItemDone(state, i, m)) done += 1;
        }
    return { done, total, pct: pct(done, total) };
}

/** Which week of the plan `today` falls in (1-based, clamped to the plan). */
export function planWeek(plan: LearningPlan, today: string): number {
    const weeks = Math.max(1, ...plan.items.map((i) => i.week));
    const start = new Date(`${plan.startDate}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    const n = Math.floor((now - start) / (7 * 86400000)) + 1;
    return Math.min(weeks, Math.max(1, n));
}

/**
 * Learning this month: plan items due in the month, per assignee. Pass
 * `onlyMemberId` for a member who cannot see the whole family's progress —
 * otherwise their ring would be the family's total measured against numbers
 * they were never given.
 */
export function monthProgress(state: LearningState, today: string, onlyMemberId?: string): { done: number; total: number; pct: number } {
    const month = today.slice(0, 7);
    let done = 0;
    let total = 0;
    for (const plan of state.plans)
        for (const item of plan.items) {
            if (!item.dueDate.startsWith(month)) continue;
            for (const m of onlyMemberId ? plan.assigneeIds.filter((x) => x === onlyMemberId) : plan.assigneeIds) {
                total += 1;
                if (planItemDone(state, item, m)) done += 1;
            }
        }
    return { done, total, pct: pct(done, total) };
}

/** Minutes of lesson time this member has finished, all time. */
export function minutesWatched(state: LearningState, memberId: string): number {
    return Math.round(
        state.completions
            .filter((c) => c.itemType === "video" && c.memberId === memberId)
            .reduce((sum, c) => sum + ((videoById(state, c.itemId)?.durationS ?? 0) * c.progressPct) / 100, 0) / 60,
    );
}

/** Lessons a member has been set and has not finished, soonest due first. */
export function assignedTo(state: LearningState, memberId: string): Array<{ video: LessonVideo; plan?: LearningPlan; item?: PlanItem; playlist?: Playlist }> {
    const out: Array<{ video: LessonVideo; plan?: LearningPlan; item?: PlanItem; playlist?: Playlist; sort: string }> = [];
    const seen = new Set<string>();
    for (const plan of state.plans) {
        if (!plan.assigneeIds.includes(memberId)) continue;
        for (const item of plan.items) {
            if (item.itemType !== "video" || !item.itemId || seen.has(item.itemId)) continue;
            const video = videoById(state, item.itemId);
            if (!video || videoDone(state, video.id, memberId)) continue;
            seen.add(video.id);
            out.push({ video, plan, item, sort: item.dueDate });
        }
    }
    for (const p of state.playlists) {
        if (!p.assignedTo.includes(memberId)) continue;
        for (const id of p.videoIds) {
            if (seen.has(id)) continue;
            const video = videoById(state, id);
            if (!video || videoDone(state, video.id, memberId)) continue;
            seen.add(id);
            out.push({ video, playlist: p, sort: "9999-12-31" });
        }
    }
    return out.sort((a, b) => a.sort.localeCompare(b.sort)).map(({ sort: _sort, ...rest }) => rest);
}

/**
 * Next-video suggestions — acceptance criterion 7. The candidates are ONLY
 * this space's saved videos that this member can see and has not finished;
 * nothing here ever reaches YouTube's catalogue, and the companion is asked to
 * choose from this list by number rather than to name a video of its own.
 */
export function nextCandidates(state: LearningState, ctx: RepoContext, limit = 6): LessonVideo[] {
    const finished = state.completions.filter((c) => c.itemType === "video" && c.memberId === ctx.me.id && c.completedAt);
    const lastPlaylists = new Set(
        finished
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 3)
            .flatMap((c) => state.playlists.filter((p) => p.videoIds.includes(c.itemId)).map((p) => p.id)),
    );
    const values = new Set(finished.map((c) => videoById(state, c.itemId)?.valueId).filter(Boolean) as string[]);
    const assignedIds = new Set(assignedTo(state, ctx.me.id).map((a) => a.video.id));
    const score = (v: LessonVideo): number => {
        let s = 0;
        if (assignedIds.has(v.id)) s += 6;
        if (state.playlists.some((p) => p.videoIds.includes(v.id) && lastPlaylists.has(p.id))) s += 4;
        if (v.valueId && values.has(v.valueId)) s += 2;
        if (videoPct(state, v.id, ctx.me.id) > 0) s += 3;
        return s;
    };
    return state.videos
        .filter((v) => !videoDone(state, v.id, ctx.me.id))
        .sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const overdue = (dueDate: string, today: string): boolean => dueDate < today;

export function dashboard(state: LearningState, ctx: RepoContext): DashboardContribution {
    const today = ctx.today;
    const parent = ctx.role === "parent";
    const who = parent ? ctx.members.map((m) => m.id) : [ctx.me.id];

    // ---- Today ------------------------------------------------------------
    const agenda: AgendaItem[] = [];
    for (const plan of state.plans)
        for (const item of plan.items) {
            if (item.dueDate > today) continue;
            for (const memberId of plan.assigneeIds) {
                if (!who.includes(memberId)) continue;
                const done = planItemDone(state, item, memberId);
                if (done && item.dueDate !== today) continue;
                const late = overdue(item.dueDate, today);
                agenda.push({
                    id: `plan-${item.id}-${memberId}`,
                    moduleId: MOD,
                    area: AREA,
                    title: item.title,
                    meta: `${plan.name} · ${item.minutes} min${late && !done ? " · overdue" : ""}`,
                    memberId,
                    at: null,
                    done,
                    href: item.itemType === "video" && item.itemId ? `${HREF}/lessons/${item.itemId}` : HREF,
                    sort: late ? 20 : 40,
                });
            }
        }
    // A playlist set for someone is a commitment too: the next unwatched
    // lesson from it lands on Today when no plan already schedules it.
    const scheduled = new Set(state.plans.flatMap((p) => p.items.map((i) => i.itemId).filter(Boolean) as string[]));
    for (const p of state.playlists)
        for (const memberId of p.assignedTo) {
            if (!who.includes(memberId)) continue;
            const nextId = p.videoIds.find((id) => !scheduled.has(id) && !videoDone(state, id, memberId));
            const video = nextId ? videoById(state, nextId) : undefined;
            if (!video) continue;
            agenda.push({
                id: `playlist-${p.id}-${memberId}`,
                moduleId: MOD,
                area: AREA,
                title: video.title,
                meta: `${p.name} · ${Math.max(1, Math.round(video.durationS / 60))} min`,
                memberId,
                at: null,
                done: false,
                href: `${HREF}/lessons/${video.id}`,
                sort: 60,
            });
        }
    for (const t of state.tasks) {
        if (t.dueDate > today) continue;
        if (t.doneAt && t.dueDate !== today) continue;
        if (t.memberId && !who.includes(t.memberId)) continue;
        agenda.push({
            id: `task-${t.id}`,
            moduleId: MOD,
            area: AREA,
            title: t.title,
            meta: `From a lesson${overdue(t.dueDate, today) && !t.doneAt ? " · overdue" : ""}`,
            memberId: t.memberId,
            at: null,
            done: Boolean(t.doneAt),
            href: `${HREF}/lessons/${t.videoId}`,
            sort: overdue(t.dueDate, today) ? 21 : 41,
        });
    }

    // ---- Needs attention --------------------------------------------------
    const attention: AttentionItem[] = [];
    const lateItems = state.plans.flatMap((plan) =>
        plan.items
            .filter((i) => overdue(i.dueDate, today))
            .flatMap((i) => plan.assigneeIds.filter((m) => who.includes(m) && !planItemDone(state, i, m)).map((m) => ({ plan, item: i, memberId: m }))),
    );
    if (lateItems.length) {
        const names = [...new Set(lateItems.map((l) => ctx.members.find((m) => m.id === l.memberId)?.name.split(" ")[0] ?? "Someone"))];
        attention.push({
            id: "plan-behind",
            moduleId: MOD,
            area: AREA,
            tone: lateItems.length > 3 ? "danger" : "warn",
            title: `${lateItems.length} learning ${lateItems.length === 1 ? "item is" : "items are"} past their day`,
            body: `${names.join(", ")} · ${lateItems[0].plan.name}. Move the dates or watch one tonight.`,
            href: HREF,
            weight: 46,
        });
    }
    const lateTasks = state.tasks.filter((t) => !t.doneAt && overdue(t.dueDate, today) && (!t.memberId || who.includes(t.memberId)));
    if (lateTasks.length)
        attention.push({
            id: "task-overdue",
            moduleId: MOD,
            area: AREA,
            tone: "warn",
            title: `${lateTasks.length} action ${lateTasks.length === 1 ? "item" : "items"} from a lesson still open`,
            body: `"${lateTasks[0].title}" was due ${lateTasks[0].dueDate}.`,
            href: `${HREF}/lessons/${lateTasks[0].videoId}`,
            weight: 34,
        });
    for (const p of state.playlists) {
        for (const memberId of p.assignedTo) {
            if (!who.includes(memberId)) continue;
            const pr = playlistProgress(state, p, memberId);
            const name = ctx.members.find((m) => m.id === memberId)?.name.split(" ")[0] ?? "Someone";
            if (pr.total && pr.done === pr.total)
                attention.push({
                    id: `finished-${p.id}-${memberId}`,
                    moduleId: MOD,
                    area: AREA,
                    tone: "celebrate",
                    title: `${name} finished ${p.name}`,
                    body: `All ${pr.total} lessons watched. Worth saying out loud at dinner.`,
                    href: `${HREF}/playlists/${p.id}`,
                    weight: 30,
                });
            else if (pr.total && pr.done === 0)
                attention.push({
                    id: `unstarted-${p.id}-${memberId}`,
                    moduleId: MOD,
                    area: AREA,
                    tone: "info",
                    title: `${name} hasn't started ${p.name}`,
                    body: `${pr.total} lessons set and none watched yet.`,
                    href: `${HREF}/playlists/${p.id}`,
                    weight: 18,
                });
        }
    }

    // ---- What we're building ----------------------------------------------
    const rings: ProgressRing[] = [];
    const month = monthProgress(state, today, parent ? undefined : ctx.me.id);
    if (month.total)
        rings.push({
            id: "month",
            moduleId: MOD,
            area: AREA,
            label: "Learning this month",
            pct: month.pct,
            sub: `${month.done} of ${month.total} lessons`,
            href: HREF,
        });
    for (const plan of state.plans) {
        // A plan you are not on is not your progress ring.
        if (!parent && !plan.assigneeIds.includes(ctx.me.id)) continue;
        const pr = parent ? planProgress(state, plan) : planProgressFor(state, plan, ctx.me.id);
        if (!pr.total) continue;
        rings.push({ id: `plan-${plan.id}`, moduleId: MOD, area: AREA, label: plan.name, pct: pr.pct, sub: `Week ${planWeek(plan, today)} · ${pr.done}/${pr.total}`, href: `${HREF}?plan=${plan.id}` });
    }

    // ---- The children's cards ----------------------------------------------
    const childCards: ChildCard[] = [];
    if (ctx.role === "child") {
        const mine = assignedTo(state, ctx.me.id);
        const next = mine[0];
        if (next)
            childCards.push({
                id: "next",
                moduleId: MOD,
                area: AREA,
                title: "Lesson for today",
                body: `${next.video.title} · ${duration(next.video.durationS)}`,
                emoji: "🎬",
                href: `${HREF}/lessons/${next.video.id}`,
                pct: videoPct(state, next.video.id, ctx.me.id),
            });
        else
            childCards.push({ id: "next", moduleId: MOD, area: AREA, title: "Lessons today", body: "All done. Nice work.", emoji: "🌟", href: HREF, done: true });
        const shelf = state.playlists.filter((p) => p.assignedTo.includes(ctx.me.id));
        if (shelf.length) {
            const p = shelf[0];
            const pr = playlistProgress(state, p, ctx.me.id);
            childCards.push({ id: `pl-${p.id}`, moduleId: MOD, area: AREA, title: p.name, body: `${pr.done} of ${pr.total} watched`, emoji: "📺", href: `${HREF}/playlists/${p.id}`, pct: pr.pct, done: pr.done === pr.total });
        }
    }

    return { agenda: agenda.slice(0, 12), attention: attention.slice(0, 4), rings: rings.slice(0, 3), childCards };
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

/**
 * The nudges the brief's rule set was missing for this module: a plan item due
 * today, a plan item that has slipped, a newly assigned playlist nobody has
 * opened, and a plan week opening. Keys are stable so each is raised once.
 */
export function nudges(state: LearningState, ctx: RepoContext): Nudge[] {
    const today = ctx.today;
    const out: Nudge[] = [];
    const firstName = (id: string): string => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
    // The engine runs client-side as whoever is signed in. A parent's session
    // may raise the family's follow-ups; a child's raises only their own, so a
    // teenager's laptop never tells the house that Dad is behind on a lesson.
    const parent = ctx.role === "parent";
    const forMe = (memberId: string): boolean => parent || memberId === ctx.me.id;

    for (const plan of state.plans) {
        const week = planWeek(plan, today);
        const weekItems = plan.items.filter((i) => i.week === week);
        const weekFor = parent ? plan.assigneeIds : plan.assigneeIds.filter((id) => id === ctx.me.id);
        if (weekItems.length && weekFor.length && plan.startDate <= today && plan.endDate >= today)
            out.push({
                key: `learning-week-${plan.id}-${week}`,
                moduleId: MOD,
                kind: "learning",
                title: `${plan.name}: week ${week} is open`,
                body: `${weekItems.length} ${weekItems.length === 1 ? "lesson" : "lessons"} this week — ${weekItems.map((i) => i.title).slice(0, 2).join(", ")}${weekItems.length > 2 ? "…" : ""}`,
                href: `${HREF}?plan=${plan.id}`,
                memberIds: weekFor,
                notBefore: `${today}T07:30:00`,
            });
        for (const item of plan.items) {
            for (const memberId of plan.assigneeIds) {
                if (!forMe(memberId) || planItemDone(state, item, memberId)) continue;
                if (item.dueDate === today)
                    out.push({
                        key: `learning-due-${item.id}-${memberId}`,
                        moduleId: MOD,
                        kind: "learning",
                        title: `Today: ${item.title}`,
                        body: `${plan.name} · about ${item.minutes} minutes.`,
                        href: item.itemType === "video" && item.itemId ? `${HREF}/lessons/${item.itemId}` : `${HREF}?plan=${plan.id}`,
                        memberIds: [memberId],
                        notBefore: `${today}T07:30:00`,
                    });
                else if (overdue(item.dueDate, today))
                    out.push({
                        key: `learning-late-${item.id}-${memberId}`,
                        moduleId: MOD,
                        kind: "learning",
                        title: `${firstName(memberId)} has a lesson to catch up`,
                        body: `"${item.title}" was set for ${item.dueDate}.`,
                        href: `${HREF}?plan=${plan.id}`,
                        memberIds: [],
                    });
            }
        }
    }

    for (const p of state.playlists)
        for (const memberId of p.assignedTo) {
            if (!forMe(memberId)) continue;
            const pr = playlistProgress(state, p, memberId);
            if (pr.total && pr.done === 0)
                out.push({
                    key: `learning-assigned-${p.id}-${memberId}`,
                    moduleId: MOD,
                    kind: "learning",
                    title: `New for you: ${p.name}`,
                    body: `${pr.total} lessons, starting with "${videoById(state, p.videoIds[0])?.title ?? "the first one"}".`,
                    href: `${HREF}/playlists/${p.id}`,
                    memberIds: [memberId],
                });
            else if (pr.total && pr.done === pr.total)
                out.push({
                    key: `learning-finished-${p.id}-${memberId}`,
                    moduleId: MOD,
                    kind: "celebrate",
                    title: `${firstName(memberId)} finished ${p.name}`,
                    body: `${pr.total} lessons, all the way through.`,
                    href: `${HREF}/playlists/${p.id}`,
                    memberIds: [],
                });
        }

    return out.slice(0, 12);
}

// ---------------------------------------------------------------------------
// The companion's grounding, and search
// ---------------------------------------------------------------------------

export function aiContext(state: LearningState, ctx: RepoContext): string {
    // The slice is already this member's own: a private shelf, a plan they are
    // not on and a lesson they may not see never reach it, so the companion's
    // grounding is exactly what the screens would show them.
    if (!state.videos.length) return "";
    const lines: string[] = [];
    const mine = assignedTo(state, ctx.me.id).slice(0, 4);
    lines.push(`${state.videos.length} saved video lessons in ${state.playlists.length} playlists (suggestions must come only from these).`);
    for (const p of state.playlists.slice(0, 5)) {
        const pr = playlistProgress(state, p, ctx.me.id);
        lines.push(`Playlist "${p.name}" (${p.videoIds.length} lessons, ${ctx.me.name.split(" ")[0]} ${pr.done}/${pr.total}): ${p.videoIds.slice(0, 4).map((id) => videoById(state, id)?.title ?? "").filter(Boolean).join(" | ")}`);
    }
    for (const plan of state.plans.slice(0, 3)) {
        const pr = planProgress(state, plan);
        lines.push(`Plan "${plan.name}" (${plan.cadence}, week ${planWeek(plan, ctx.today)}, ${pr.done}/${pr.total} done) for ${plan.assigneeIds.map((id) => ctx.members.find((m) => m.id === id)?.name.split(" ")[0]).join(", ")}.`);
    }
    if (mine.length) lines.push(`Not yet watched by ${ctx.me.name.split(" ")[0]}: ${mine.map((a) => a.video.title).join(" | ")}`);
    const open = state.tasks.filter((t) => !t.doneAt).slice(0, 3);
    if (open.length) lines.push(`Open action items from lessons: ${open.map((t) => t.title).join("; ")}.`);
    // Whole lines only. A summary cut mid-title reads to the companion like a
    // lesson the family half-owns — and half a title is exactly the sort of
    // thing it would then invent the rest of.
    const out: string[] = [];
    let used = 0;
    for (const line of lines) {
        if (used + line.length + 1 > 1500) break;
        out.push(line);
        used += line.length + 1;
    }
    return out.join("\n");
}

export function search(state: LearningState, q: string): Array<{ title: string; meta: string; href: string }> {
    const hit = (s: string): boolean => s.toLowerCase().includes(q);
    const out: Array<{ title: string; meta: string; href: string }> = [];
    for (const p of state.playlists) if (hit(p.name) || hit(p.note)) out.push({ title: p.name, meta: `Playlist · ${p.videoIds.length} lessons`, href: `${HREF}/playlists/${p.id}` });
    for (const v of state.videos) if (hit(v.title) || hit(v.channel) || hit(v.description)) out.push({ title: v.title, meta: `Lesson · ${v.channel} · ${duration(v.durationS)}`, href: `${HREF}/lessons/${v.id}` });
    for (const plan of state.plans) if (hit(plan.name) || hit(plan.objective)) out.push({ title: plan.name, meta: `Learning plan · ${plan.items.length} items`, href: `${HREF}?plan=${plan.id}` });
    for (const n of state.notes) if (hit(n.text)) out.push({ title: n.text, meta: `Note · ${videoById(state, n.videoId)?.title ?? "a lesson"}`, href: `${HREF}/lessons/${n.videoId}?t=${n.timestampS}` });
    return out.slice(0, 8);
}

/** The completion line, exported so the UI can explain itself. */
export const completionRule = `Counted as finished at ${COMPLETE_AT_PCT}% watched, or when a parent marks it.`;

/** Today, as the module sees it (the shell's date, not the device clock). */
export const todayOf = (ctx: RepoContext): string => ctx.today || isoDate();
