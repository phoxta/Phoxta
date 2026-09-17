import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { visibleTo } from "./derive";
import { seed } from "./seed";
import type { Briefing, CheckIn, HomeRepo, HomeState, NewBriefing, NewCheckIn, NewReview, WeeklyReview } from "./types";

/**
 * Home in the browser.
 *
 * The whole slice is one blob in localStorage, seeded on first load. Every
 * write is real — a check-in saved here is there tomorrow — and every read
 * goes through `visibleTo`, the same filter the live repo applies, so
 * switching "view as" to Tobi in the demo genuinely removes the rows he may
 * not have rather than merely hiding them.
 */

const KEY = "wafe:demo:home:v2";

export class LocalHomeRepo implements HomeRepo {
    private cache: HomeState | null = null;
    private listeners = new Set<() => void>();

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): HomeState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed = raw ? (JSON.parse(raw) as Partial<HomeState>) : null;
            this.cache = parsed && Array.isArray(parsed.checkIns) && Array.isArray(parsed.milestones) ? { briefings: [], checkIns: [], reviews: [], milestones: [], resolved: [], ...parsed } : seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        } catch {
            this.cache = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        }
        return this.cache;
    }

    private save(next: HomeState): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: the session still works, it just won't persist */
        }
        this.listeners.forEach((l) => l());
    }

    subscribe(onChange: () => void): () => void {
        this.listeners.add(onChange);
        return () => this.listeners.delete(onChange);
    }

    async load(): Promise<HomeState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- writes --------------------------------------------------------------

    /** One row per member per day — the slot records which briefing it was. */
    async saveBriefing(input: NewBriefing): Promise<Briefing> {
        const all = this.all();
        const mine = (b: Briefing): boolean => b.memberId === this.ctx.me.id && b.date === input.date;
        const existing = all.briefings.find(mine);
        const row: Briefing = {
            id: existing?.id ?? uid("brief"),
            memberId: this.ctx.me.id,
            date: input.date,
            when: input.when,
            text: input.text,
            sources: input.sources,
            kind: input.kind,
            generatedAt: new Date().toISOString(),
        };
        this.save({ ...all, briefings: [...all.briefings.filter((b) => !mine(b)), row] });
        return row;
    }

    /** One row per member per day: a second submission updates the first. */
    async saveCheckIn(input: NewCheckIn): Promise<CheckIn> {
        if (this.ctx.role === "guest") throw new Error("Not allowed");
        const all = this.all();
        const existing = all.checkIns.find((c) => c.memberId === this.ctx.me.id && c.date === input.date);
        const row: CheckIn = {
            id: existing?.id ?? uid("checkin"),
            memberId: this.ctx.me.id,
            date: input.date,
            mood: Math.max(1, Math.min(5, Math.round(input.mood))),
            gratitude: input.gratitude.trim(),
            prayer: input.prayer.trim(),
            questions: input.questions,
            decisions: input.decisions,
            summary: input.summary.trim(),
            createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        this.save({ ...all, checkIns: [...all.checkIns.filter((c) => c.id !== row.id), row] });
        return row;
    }

    async deleteCheckIn(id: string): Promise<void> {
        const all = this.all();
        const row = all.checkIns.find((c) => c.id === id);
        if (!row) return;
        if (this.ctx.role !== "parent" && row.memberId !== this.ctx.me.id) throw new Error("Not allowed");
        this.save({ ...all, checkIns: all.checkIns.filter((c) => c.id !== id) });
    }

    async saveReview(input: NewReview): Promise<WeeklyReview> {
        if (this.ctx.role !== "parent") throw new Error("Not allowed");
        const all = this.all();
        const existing = all.reviews.find((r) => r.weekStart === input.weekStart);
        const row: WeeklyReview = {
            id: existing?.id ?? uid("review"),
            weekStart: input.weekStart,
            hostMemberId: this.ctx.me.id,
            priorities: input.priorities.map((p) => p.trim()).filter(Boolean).slice(0, 3),
            tasksPlanned: input.tasksPlanned,
            tasksDone: input.tasksDone,
            prayersAnswered: input.prayersAnswered,
            notes: input.notes.trim(),
            completedAt: input.completed ? (existing?.completedAt ?? new Date().toISOString()) : null,
        };
        this.save({ ...all, reviews: [...all.reviews.filter((r) => r.id !== row.id), row] });
        return row;
    }

    async setAttentionResolved(key: string, resolved: boolean): Promise<void> {
        if (this.ctx.role !== "parent") throw new Error("Not allowed");
        const all = this.all();
        const set = new Set(all.resolved);
        if (resolved) set.add(key);
        else set.delete(key);
        this.save({ ...all, resolved: [...set] });
    }
}
