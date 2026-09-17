import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext, Visibility } from "@/data/core";
import { clamp, isoDate, pct as pctOf } from "@/lib/format";
import type {
    BudgetLine,
    Clip,
    Comparison,
    ComparisonScore,
    Decision,
    LinkedTask,
    Note,
    Project,
    ProjectCard,
    ProjectCost,
    ProjectsState,
    RankedOption,
} from "./types";

/**
 * Every number this module shows, as pure functions of state — starting with
 * the one both repos call before anything reaches a screen.
 *
 * The privacy rules live here, once, so the demo and the live policies cannot
 * drift: a child receives only projects they are a member of and only the
 * child-safe half of them, and only notes classed `general`; a guest receives
 * only the projects explicitly shared with them, and nothing else in the
 * space is in their slice at all.
 */

export const BASE = "/execute/projects";

const EMPTY: ProjectsState = { projects: [], cards: [], costs: [], clips: [], notes: [], comparisons: [], scores: [], decisions: [] };

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** The adult rule, mirroring the database's `wf_can_see`. */
export function canSeeRow(me: Member, ownerMemberId: string | null, visibility: Visibility, sharedWith: string[]): boolean {
    if (visibility === "child") return true;
    if (visibility === "private") return ownerMemberId === me.id;
    if (visibility === "shared") return ownerMemberId === me.id || sharedWith.includes(me.id);
    return true; // family
}

export const isProjectMember = (p: Project, memberId: string): boolean => p.ownerMemberId === memberId || p.members.some((m) => m.memberId === memberId);

/** A watcher reads the project; the owner and its members are the ones who work on it. */
export const canWorkOnProject = (p: Project, memberId: string): boolean =>
    p.ownerMemberId === memberId || p.members.some((m) => m.memberId === memberId && m.role !== "watcher");

/**
 * Which projects this member may open.
 *
 * Parent: all. Child: the ones they are on, and only when the project is
 * marked child-safe. Guest: only what was explicitly shared with them —
 * "granted named objects, never modules".
 */
export function canSeeProject(p: Project, me: Member): boolean {
    if (me.role === "parent") return true;
    if (me.role === "guest") return p.visibility === "shared" && p.sharedWith.includes(me.id);
    if (!isProjectMember(p, me.id)) return false;
    if (!p.childSafe) return false;
    return canSeeRow(me, p.ownerMemberId, p.visibility, p.sharedWith);
}

/** A note reaches a child or a guest only when it is classed `general`. */
export function canSeeNote(n: Note, me: Member): boolean {
    if (me.role === "parent") return true;
    if (n.ownerMemberId === me.id) return true;
    if (n.sensitivity !== "general") return false;
    if (me.role === "child" && !n.childSafe) return false;
    return canSeeRow(me, n.ownerMemberId, n.visibility, n.sharedWith);
}

export function canSeeClip(c: Clip, me: Member): boolean {
    if (me.role === "parent") return true;
    if (c.savedBy === me.id) return true;
    if (me.role === "child" && !c.childSafe) return false;
    return canSeeRow(me, c.savedBy, c.visibility, c.sharedWith);
}

/**
 * The slice this member may receive. Both repos call it, so "what the demo
 * shows" and "what RLS returns" are the same sentence written twice.
 */
export function visibleTo(state: ProjectsState, ctx: RepoContext): ProjectsState {
    const me = ctx.me;
    if (me.role === "parent") return state;

    const projects = state.projects.filter((p) => canSeeProject(p, me));
    if (!projects.length) return EMPTY;
    const ids = new Set(projects.map((p) => p.id));
    const child = me.role === "child";

    const comparisons = state.comparisons.filter((c) => ids.has(c.projectId));
    const compIds = new Set(comparisons.map((c) => c.id));

    return {
        projects,
        cards: state.cards.filter((c) => ids.has(c.projectId) && (!child || c.childSafe)),
        // Money is a parent's business: no cost line reaches a child or a guest.
        costs: [],
        clips: state.clips.filter((c) => (c.projectId ? ids.has(c.projectId) : c.savedBy === me.id) && canSeeClip(c, me)),
        notes: state.notes.filter((n) => (n.projectId ? ids.has(n.projectId) : n.ownerMemberId === me.id) && canSeeNote(n, me)),
        comparisons,
        scores: state.scores.filter((s) => compIds.has(s.comparisonId)),
        decisions: state.decisions.filter((d) => ids.has(d.projectId)),
    };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const projectById = (s: ProjectsState, id: string): Project | undefined => s.projects.find((p) => p.id === id);
export const noteById = (s: ProjectsState, id: string): Note | undefined => s.notes.find((n) => n.id === id);
export const clipById = (s: ProjectsState, id: string): Clip | undefined => s.clips.find((c) => c.id === id);
export const comparisonById = (s: ProjectsState, id: string): Comparison | undefined => s.comparisons.find((c) => c.id === id);

export const cardsOf = (s: ProjectsState, projectId: string): ProjectCard[] =>
    s.cards.filter((c) => c.projectId === projectId).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export const costsOf = (s: ProjectsState, projectId: string): ProjectCost[] =>
    s.costs.filter((c) => c.projectId === projectId).sort((a, b) => b.paidOn.localeCompare(a.paidOn));

export const clipsOf = (s: ProjectsState, projectId: string): Clip[] =>
    s.clips.filter((c) => c.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const notesOf = (s: ProjectsState, projectId: string): Note[] =>
    s.notes.filter((n) => n.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const comparisonsOf = (s: ProjectsState, projectId: string): Comparison[] =>
    s.comparisons.filter((c) => c.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const decisionsOf = (s: ProjectsState, projectId: string): Decision[] =>
    s.decisions.filter((d) => d.projectId === projectId).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));

/** The decision the project header shows: the pinned one, else the newest. */
export function headlineDecision(s: ProjectsState, p: Project): Decision | undefined {
    if (p.decisionId) {
        const pinned = s.decisions.find((d) => d.id === p.decisionId);
        if (pinned) return pinned;
    }
    return decisionsOf(s, p.id)[0];
}

export const activeProjects = (s: ProjectsState): Project[] => s.projects.filter((p) => !p.archived);

export const membersOf = (p: Project, all: Member[]): Member[] => {
    const ids = [p.ownerMemberId, ...p.members.map((m) => m.memberId)];
    return [...new Set(ids)].map((id) => all.find((m) => m.id === id)).filter((m): m is Member => Boolean(m));
};

/** Every folder in use, for the vault's sidebar. */
export function folders(s: ProjectsState): string[] {
    const set = new Set<string>();
    for (const c of s.clips) if (c.folder) set.add(c.folder);
    for (const n of s.notes) if (n.folder) set.add(n.folder);
    return [...set].sort((a, b) => a.localeCompare(b));
}

/** Every tag in use, most used first. */
export function tagCounts(s: ProjectsState): Array<{ tag: string; n: number }> {
    const map = new Map<string, number>();
    const bump = (t: string) => map.set(t, (map.get(t) ?? 0) + 1);
    for (const c of s.clips) c.tags.forEach(bump);
    for (const n of s.notes) n.tags.forEach(bump);
    for (const p of s.projects) p.tags.forEach(bump);
    return [...map.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
}

// ---------------------------------------------------------------------------
// Board + progress
// ---------------------------------------------------------------------------

export interface BoardProgress {
    done: number;
    total: number;
    pct: number;
    doing: number;
    overdue: number;
}

export function boardProgress(s: ProjectsState, projectId: string, today: string, linked: LinkedTask[] = []): BoardProgress {
    const cards = cardsOf(s, projectId);
    const done = cards.filter((c) => c.status === "done").length + linked.filter((t) => t.done).length;
    const total = cards.length + linked.length;
    const overdue =
        cards.filter((c) => c.status !== "done" && c.dueAt && c.dueAt.slice(0, 10) < today).length +
        linked.filter((t) => !t.done && t.dueAt && t.dueAt.slice(0, 10) < today).length;
    return { done, total, pct: pctOf(done, total), doing: cards.filter((c) => c.status === "doing").length, overdue };
}

/** How far through the dates we are, for the timeline bar. */
export function elapsedPct(p: Project, today: string): number {
    if (!p.endDate) return 0;
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    const now = new Date(today).getTime();
    if (end <= start) return 100;
    return clamp(Math.round(((now - start) / (end - start)) * 100), 0, 100);
}

export const daysLeft = (p: Project, today: string): number | null => {
    if (!p.endDate) return null;
    return Math.round((new Date(p.endDate).getTime() - new Date(today).getTime()) / 86400000);
};

/** Cards grouped into the three columns, each already in order. */
export function columns(s: ProjectsState, projectId: string): Record<"todo" | "doing" | "done", ProjectCard[]> {
    const all = cardsOf(s, projectId);
    return {
        todo: all.filter((c) => c.status === "todo"),
        doing: all.filter((c) => c.status === "doing"),
        done: all.filter((c) => c.status === "done"),
    };
}

/** Cards with a date, grouped by week, for the timeline. */
export function timeline(s: ProjectsState, projectId: string, linked: LinkedTask[] = []): Array<{ week: string; items: Array<{ id: string; title: string; dueAt: string; done: boolean; linked: boolean }> }> {
    const items = [
        ...cardsOf(s, projectId)
            .filter((c) => c.dueAt)
            .map((c) => ({ id: c.id, title: c.title, dueAt: c.dueAt as string, done: c.status === "done", linked: false })),
        ...linked.filter((t) => t.dueAt).map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt as string, done: t.done, linked: true })),
    ].sort((a, b) => a.dueAt.localeCompare(b.dueAt));

    const out: Array<{ week: string; items: typeof items }> = [];
    for (const it of items) {
        const week = weekLabel(it.dueAt);
        const last = out[out.length - 1];
        if (last && last.week === week) last.items.push(it);
        else out.push({ week, items: [it] });
    }
    return out;
}

function weekLabel(iso: string): string {
    const d = new Date(iso);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return `Week of ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

// ---------------------------------------------------------------------------
// Money (AC 8)
// ---------------------------------------------------------------------------

/**
 * The budget line.
 *
 * Spending comes from the linked Finance category when the Finance slice is
 * loaded and holds it; otherwise from the project's own cost lines. The screen
 * always says which, because a number whose source is a guess is worse than no
 * number at all.
 */
export function budgetLine(s: ProjectsState, p: Project, financeSpentCents: number | null): BudgetLine {
    const budgetCents = p.budgetCents ?? 0;
    const own = costsOf(s, p.id).reduce((n, c) => n + c.amountCents, 0);
    const useFinance = p.financeCategoryId !== null && financeSpentCents !== null;
    const spentCents = useFinance ? (financeSpentCents as number) : own;
    const source: BudgetLine["source"] = useFinance ? "finance" : own > 0 ? "costs" : "none";
    return {
        budgetCents,
        spentCents,
        pct: budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0,
        source,
        label: source === "finance" ? `from Finance · ${p.financeCategoryLabel || p.financeCategoryId}` : source === "costs" ? "from this project's cost lines" : "nothing spent yet",
        over: budgetCents > 0 && spentCents > budgetCents,
    };
}

// ---------------------------------------------------------------------------
// Comparisons (AC 2)
// ---------------------------------------------------------------------------

export const scoreOf = (scores: ComparisonScore[], comparisonId: string, optionKey: string, criterionKey: string): number =>
    scores.find((s) => s.comparisonId === comparisonId && s.optionKey === optionKey && s.criterionKey === criterionKey)?.score ?? 0;

/**
 * The live ranking: each option's weighted score as a percentage of the best
 * it could have scored. Pure, so the table re-ranks the moment a score lands.
 */
export function ranking(s: ProjectsState, c: Comparison): RankedOption[] {
    const totalWeight = c.criteria.reduce((n, cr) => n + Math.max(0, cr.weight), 0) || 1;
    const rows = c.options.map((option) => {
        const scores: Record<string, number> = {};
        let weighted = 0;
        let any = false;
        for (const cr of c.criteria) {
            const v = scoreOf(s.scores, c.id, option.key, cr.key);
            scores[cr.key] = v;
            if (v > 0) any = true;
            weighted += v * Math.max(0, cr.weight);
        }
        return { option, scores, total: Math.round((weighted / (totalWeight * 10)) * 100), rank: 0, unscored: !any };
    });
    rows.sort((a, b) => b.total - a.total || a.option.label.localeCompare(b.option.label));
    rows.forEach((r, i) => (r.rank = i + 1));
    return rows;
}

export const leader = (s: ProjectsState, c: Comparison): RankedOption | undefined => ranking(s, c).find((r) => !r.unscored);

/** True when every option has at least one score — the point a decision is due. */
export const fullyScored = (s: ProjectsState, c: Comparison): boolean => c.options.length > 1 && ranking(s, c).every((r) => !r.unscored);

export const comparisonNeedsDecision = (s: ProjectsState, c: Comparison): boolean => fullyScored(s, c) && !s.decisions.some((d) => d.comparisonId === c.id);

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

/** "bbc.co.uk" from a URL, for the clip's source line. */
export function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url.replace(/^https?:\/\//, "").split("/")[0] || "link";
    }
}

/**
 * A readable snapshot from whatever the clipper captured.
 *
 * The bookmarklet sends the page's own selection or its meta description; the
 * companion can read the page back into full prose on top. When neither is
 * there we still store something honest rather than an empty column.
 */
export function snapshotFrom(title: string, excerpt: string, url: string): string {
    const clean = excerpt.replace(/\s+/g, " ").trim();
    if (clean.length > 40) return clean;
    return `${title || hostOf(url)} — saved from ${hostOf(url)}. ${clean}`.trim();
}

export const readingMinutes = (text: string): number => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220));

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const notePreview = (n: Note, len = 140): string => {
    const text = n.blocks
        .map((b) => b.text)
        .join(" · ")
        .replace(/\s+/g, " ")
        .trim();
    return text.length > len ? `${text.slice(0, len)}…` : text;
};

export const noteTodos = (n: Note): { done: number; total: number } => {
    const todos = n.blocks.filter((b) => b.type === "todo");
    return { done: todos.filter((b) => b.done).length, total: todos.length };
};

// ---------------------------------------------------------------------------
// Dashboard, nudges, grounding, search
// ---------------------------------------------------------------------------

const dayOf = (iso: string): string => iso.slice(0, 10);

export function dashboard(state: ProjectsState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const live = activeProjects(state);
    const mine = live.filter((p) => isProjectMember(p, ctx.me.id));

    for (const p of live) {
        for (const c of cardsOf(state, p.id)) {
            if (c.status === "done" || !c.dueAt) continue;
            const due = dayOf(c.dueAt);
            if (due > ctx.today) continue;
            const forMe = c.assigneeMemberIds.length === 0 || c.assigneeMemberIds.includes(ctx.me.id);
            if (ctx.me.role !== "parent" && !forMe) continue;
            agenda.push({
                id: `card-${c.id}`,
                moduleId: "projects",
                area: "execute",
                title: c.title,
                meta: `${p.title}${due < ctx.today ? " · overdue" : ""}`,
                memberId: c.assigneeMemberIds[0] ?? null,
                at: null,
                done: false,
                href: `${BASE}/${p.id}`,
                sort: due < ctx.today ? 210 : 240,
            });
        }
    }

    for (const p of live.slice(0, 6)) {
        const prog = boardProgress(state, p.id, ctx.today);
        if (!prog.total) continue;
        rings.push({
            id: `proj-${p.id}`,
            moduleId: "projects",
            area: "execute",
            label: p.title,
            pct: prog.pct,
            sub: `${prog.done} of ${prog.total} done`,
            href: `${BASE}/${p.id}`,
        });
    }

    if (ctx.me.role === "parent") {
        for (const p of live) {
            const line = budgetLine(state, p, null);
            if (line.budgetCents > 0 && line.pct >= 85) {
                attention.push({
                    id: `budget-${p.id}`,
                    moduleId: "projects",
                    area: "execute",
                    tone: line.over ? "danger" : "warn",
                    title: `${p.title} is at ${line.pct}% of budget`,
                    body: `${line.source === "costs" ? "Cost lines booked so far" : "Spending"} against a budget of ${(line.budgetCents / 100).toFixed(0)}.`,
                    href: `${BASE}/${p.id}`,
                    weight: line.over ? 78 : 62,
                });
            }
        }
        for (const c of state.comparisons) {
            const p = projectById(state, c.projectId);
            if (!p || p.archived || !comparisonNeedsDecision(state, c)) continue;
            const top = leader(state, c);
            attention.push({
                id: `decide-${c.id}`,
                moduleId: "projects",
                area: "execute",
                tone: "info",
                title: `${c.title} is scored and undecided`,
                body: top ? `${top.option.label} leads on ${top.total}%. Write the decision down while the reasons are fresh.` : "Every option has a score. Time to choose.",
                href: `${BASE}/${c.projectId}`,
                weight: 55,
            });
        }
    }

    for (const p of live) {
        const left = daysLeft(p, ctx.today);
        if (left === null || left > 7 || left < 0 || p.status === "done") continue;
        const prog = boardProgress(state, p.id, ctx.today);
        if (prog.pct >= 100) continue;
        attention.push({
            id: `due-${p.id}`,
            moduleId: "projects",
            area: "execute",
            tone: left <= 2 ? "warn" : "info",
            title: `${p.title} lands in ${left === 0 ? "today" : `${left} day${left === 1 ? "" : "s"}`}`,
            body: `${prog.total - prog.done} thing${prog.total - prog.done === 1 ? "" : "s"} still open on the board.`,
            href: `${BASE}/${p.id}`,
            weight: left <= 2 ? 66 : 48,
        });
    }

    if (ctx.me.role === "child") {
        for (const p of mine) {
            const prog = boardProgress(state, p.id, ctx.today);
            childCards.push({
                id: `proj-${p.id}`,
                moduleId: "projects",
                area: "execute",
                title: p.title,
                body: prog.total ? `${prog.done} of ${prog.total} done${prog.overdue ? ` · ${prog.overdue} late` : ""}` : "Nothing on the board yet — add the first step.",
                emoji: p.kind === "school" ? "🔬" : p.kind === "creative" ? "🎨" : "🧱",
                href: `${BASE}/${p.id}`,
                pct: prog.pct,
                done: prog.total > 0 && prog.pct >= 100,
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: ProjectsState, ctx: RepoContext): Nudge[] {
    if (ctx.me.role === "guest") return [];
    const out: Nudge[] = [];
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);

    for (const p of activeProjects(state)) {
        for (const c of cardsOf(state, p.id)) {
            if (c.status === "done" || !c.dueAt) continue;
            const due = dayOf(c.dueAt);
            const who = c.assigneeMemberIds.length ? c.assigneeMemberIds : parents;
            if (due === ctx.today) {
                out.push({
                    key: `projects-card-due-${c.id}-${ctx.today}`,
                    moduleId: "projects",
                    kind: "task",
                    title: `Due today on ${p.title}`,
                    body: c.title,
                    href: `${BASE}/${p.id}`,
                    memberIds: who,
                });
            } else if (due < ctx.today) {
                out.push({
                    key: `projects-card-late-${c.id}-${ctx.today}`,
                    moduleId: "projects",
                    kind: "task",
                    title: `${c.title} has slipped`,
                    body: `It was due on ${due} for ${p.title}.`,
                    href: `${BASE}/${p.id}`,
                    memberIds: [...new Set([...who, ...parents])],
                });
            }
        }

        const line = budgetLine(state, p, null);
        if (line.budgetCents > 0 && line.over) {
            out.push({
                key: `projects-over-budget-${p.id}`,
                moduleId: "projects",
                kind: "finance",
                title: `${p.title} is over budget`,
                body: `${line.pct}% of what was set aside. Worth a look before the next invoice.`,
                href: `${BASE}/${p.id}`,
                memberIds: parents,
            });
        }
    }

    for (const c of state.comparisons) {
        const p = projectById(state, c.projectId);
        if (!p || p.archived || !comparisonNeedsDecision(state, c)) continue;
        const top = leader(state, c);
        out.push({
            key: `projects-decide-${c.id}`,
            moduleId: "projects",
            kind: "task",
            title: `A decision is waiting on ${p.title}`,
            body: top ? `${c.title}: ${top.option.label} leads on ${top.total}%.` : c.title,
            href: `${BASE}/${p.id}`,
            memberIds: parents,
        });
    }

    for (const d of state.decisions) {
        const p = projectById(state, d.projectId);
        if (!p || dayOf(d.decidedAt) < ctx.today) continue;
        out.push({
            key: `projects-decided-${d.id}`,
            moduleId: "projects",
            kind: "celebrate",
            title: `Decided: ${d.decision}`,
            body: `${p.title} — ${d.because}`,
            href: `${BASE}/${p.id}`,
            memberIds: parents,
        });
    }

    return out;
}

export function aiContext(state: ProjectsState, ctx: RepoContext): string {
    if (!state.projects.length) return "";
    const lines: string[] = [];
    const live = activeProjects(state);

    for (const p of live.slice(0, 6)) {
        const prog = boardProgress(state, p.id, ctx.today);
        const bits = [`${p.title} (${p.status}, ${prog.done}/${prog.total} on the board`];
        if (ctx.me.role === "parent" && p.budgetCents) {
            const line = budgetLine(state, p, null);
            bits.push(`, budget ${(line.budgetCents / 100).toFixed(0)} ${ctx.space.currency} with ${(line.spentCents / 100).toFixed(0)} booked`);
        }
        bits.push(")");
        const d = headlineDecision(state, p);
        if (d) bits.push(` Decision: ${d.decision} because ${d.because}.`);
        const clips = clipsOf(state, p.id).length;
        const notes = notesOf(state, p.id).length;
        if (clips || notes) bits.push(` Vault: ${clips} clip${clips === 1 ? "" : "s"}, ${notes} note${notes === 1 ? "" : "s"}.`);
        lines.push(bits.join(""));
    }

    for (const c of state.comparisons.slice(0, 3)) {
        const top = leader(state, c);
        lines.push(`Comparison "${c.title}": ${c.options.length} options on ${c.criteria.length} criteria${top ? `, ${top.option.label} leading on ${top.total}%` : ", not scored yet"}.`);
    }

    const archived = state.projects.filter((p) => p.archived).length;
    if (archived) lines.push(`${archived} archived project${archived === 1 ? "" : "s"} (read-only).`);

    return lines.join(" ").slice(0, 1500);
}

export function search(state: ProjectsState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const p of state.projects) {
        if (`${p.title} ${p.summary} ${p.tags.join(" ")}`.toLowerCase().includes(needle)) {
            hits.push({ title: p.title, meta: `Project · ${p.archived ? "archived" : p.status}`, href: `${BASE}/${p.id}` });
        }
    }
    for (const c of state.clips) {
        if (`${c.title} ${c.excerpt} ${c.snapshotText} ${c.tags.join(" ")}`.toLowerCase().includes(needle)) {
            hits.push({ title: c.title, meta: `Clip · ${hostOf(c.url)}`, href: c.projectId ? `${BASE}/${c.projectId}?tab=vault` : `${BASE}/vault` });
        }
    }
    for (const n of state.notes) {
        if (`${n.title} ${notePreview(n, 400)} ${n.tags.join(" ")}`.toLowerCase().includes(needle)) {
            hits.push({ title: n.title, meta: `Note · ${n.folder || "Vault"}`, href: `${BASE}/${n.projectId ?? "vault"}/notes/${n.id}` });
        }
    }
    for (const c of state.comparisons) {
        if (`${c.title} ${c.options.map((o) => o.label).join(" ")}`.toLowerCase().includes(needle)) {
            hits.push({ title: c.title, meta: `Comparison · ${c.options.length} options`, href: `${BASE}/${c.projectId}?tab=compare` });
        }
    }
    for (const c of state.cards) {
        if (c.title.toLowerCase().includes(needle)) hits.push({ title: c.title, meta: "Board card", href: `${BASE}/${c.projectId}` });
    }
    return hits.slice(0, 8);
}

/** Today, or the context's today — one place, so pages and repos agree. */
export const todayOf = (ctx: RepoContext): string => ctx.today || isoDate();
