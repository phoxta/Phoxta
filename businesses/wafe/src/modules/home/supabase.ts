import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { visibleTo } from "./derive";
import { TIMELINE_HREF } from "./peek";
import type { Briefing, CheckIn, Decision, HomeRepo, HomeState, Milestone, NewBriefing, NewCheckIn, NewReview, WeeklyReview, When } from "./types";

/**
 * Home under row-level security.
 *
 * The same five collections as the demo, over `wf_home_*`. RLS already keeps
 * a child out of a parent's check-in and out of the planning record, so this
 * file asks only for what the member would expect back — and then runs
 * `visibleTo` anyway, because the screens are written against one filtered
 * shape and it should not matter which repo produced it.
 *
 * snake_case ↔ camelCase happens here and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const day = (v: unknown): string => s(v).slice(0, 10);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapBriefing = (r: Row): Briefing => ({
    id: s(r.id),
    memberId: s(r.member_id),
    date: day(r.on_date),
    when: s(r.slot, "morning") as When,
    text: s(r.body),
    sources: strs(r.sources),
    kind: s(r.kind, "template") === "ai" ? "ai" : "template",
    generatedAt: iso(r.generated_at),
});

const mapDecisions = (v: unknown): Decision[] =>
    Array.isArray(v)
        ? v.filter((x): x is Row => typeof x === "object" && x !== null).map((x) => ({
              taskId: s(x.taskId),
              title: s(x.title),
              action: (["reschedule", "delegate", "drop"] as const).find((a) => a === x.action) ?? "drop",
              toMemberId: typeof x.toMemberId === "string" ? x.toMemberId : null,
              toDate: typeof x.toDate === "string" ? x.toDate : null,
              note: s(x.note),
              applied: x.applied === true,
          }))
        : [];

const mapCheckIn = (r: Row): CheckIn => ({
    id: s(r.id),
    memberId: s(r.member_id),
    date: day(r.on_date),
    mood: n(r.mood, 3),
    gratitude: s(r.gratitude),
    prayer: s(r.prayer),
    questions: strs(r.questions),
    decisions: mapDecisions(r.decisions),
    summary: s(r.summary),
    createdAt: iso(r.created_at),
});

const mapReview = (r: Row): WeeklyReview => ({
    id: s(r.id),
    weekStart: day(r.week_start),
    hostMemberId: s(r.host_member_id),
    priorities: strs(r.priorities),
    tasksPlanned: n(r.tasks_planned),
    tasksDone: n(r.tasks_done),
    prayersAnswered: n(r.prayers_answered),
    notes: s(r.notes),
    completedAt: r.completed_at ? iso(r.completed_at) : null,
});

const mapMilestone = (r: Row): Milestone => ({
    id: s(r.id),
    date: day(r.on_date),
    title: s(r.title),
    body: s(r.body),
    href: s(r.href, TIMELINE_HREF),
    photoUrl: s(r.photo_url) || undefined,
    memberIds: strs(r.member_ids),
    ownerMemberId: s(r.owner_member_id) || null,
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
});

export class SupabaseHomeRepo implements HomeRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    async load(): Promise<HomeState> {
        const space = this.ctx.space.id;
        const [briefings, checkIns, reviews, milestones, attention] = await Promise.all([
            supabase.from("wf_home_briefings").select("*").eq("space_id", space).order("generated_at", { ascending: false }).limit(60),
            supabase.from("wf_home_check_ins").select("*").eq("space_id", space).order("on_date", { ascending: false }).limit(200),
            supabase.from("wf_home_reviews").select("*").eq("space_id", space).order("week_start", { ascending: false }).limit(52),
            supabase.from("wf_home_milestones").select("*").eq("space_id", space).order("on_date", { ascending: false }).limit(200),
            supabase.from("wf_home_attention").select("key").eq("space_id", space).not("resolved_at", "is", null),
        ]);
        fail("briefings", briefings.error);
        fail("check-ins", checkIns.error);
        fail("planning", reviews.error);
        fail("timeline", milestones.error);
        fail("attention", attention.error);

        const state: HomeState = {
            briefings: (briefings.data ?? []).map(mapBriefing),
            checkIns: (checkIns.data ?? []).map(mapCheckIn),
            reviews: (reviews.data ?? []).map(mapReview),
            milestones: (milestones.data ?? []).map(mapMilestone),
            resolved: (attention.data ?? []).map((r) => s((r as Row).key)),
        };
        return visibleTo(state, this.ctx);
    }

    async saveBriefing(input: NewBriefing): Promise<Briefing> {
        const { data, error } = await supabase
            .from("wf_home_briefings")
            .upsert(
                { ...this.scope, member_id: this.ctx.me.id, on_date: input.date, slot: input.when, body: input.text, sources: input.sources, kind: input.kind, generated_at: new Date().toISOString() },
                // One briefing per member per day: the slot is a fact about the
                // row, not part of its identity (see types.ts).
                { onConflict: "space_id,member_id,on_date" },
            )
            .select()
            .single();
        fail("save briefing", error);
        return mapBriefing((data ?? {}) as Row);
    }

    async saveCheckIn(input: NewCheckIn): Promise<CheckIn> {
        if (this.ctx.role === "guest") throw new Error("Not allowed");
        const { data, error } = await supabase
            .from("wf_home_check_ins")
            .upsert(
                {
                    ...this.scope,
                    member_id: this.ctx.me.id,
                    on_date: input.date,
                    mood: Math.max(1, Math.min(5, Math.round(input.mood))),
                    gratitude: input.gratitude.trim(),
                    prayer: input.prayer.trim(),
                    questions: input.questions,
                    decisions: input.decisions,
                    summary: input.summary.trim(),
                },
                { onConflict: "space_id,member_id,on_date" },
            )
            .select()
            .single();
        fail("save check-in", error);
        return mapCheckIn((data ?? {}) as Row);
    }

    async deleteCheckIn(id: string): Promise<void> {
        const { error } = await supabase.from("wf_home_check_ins").delete().eq("id", id);
        fail("delete check-in", error);
    }

    async saveReview(input: NewReview): Promise<WeeklyReview> {
        if (this.ctx.role !== "parent") throw new Error("Not allowed");
        const { data, error } = await supabase
            .from("wf_home_reviews")
            .upsert(
                {
                    ...this.scope,
                    week_start: input.weekStart,
                    host_member_id: this.ctx.me.id,
                    priorities: input.priorities.map((p) => p.trim()).filter(Boolean).slice(0, 3),
                    tasks_planned: input.tasksPlanned,
                    tasks_done: input.tasksDone,
                    prayers_answered: input.prayersAnswered,
                    notes: input.notes.trim(),
                    completed_at: input.completed ? new Date().toISOString() : null,
                },
                { onConflict: "space_id,week_start" },
            )
            .select()
            .single();
        fail("save planning", error);
        return mapReview((data ?? {}) as Row);
    }

    async setAttentionResolved(key: string, resolved: boolean): Promise<void> {
        if (this.ctx.role !== "parent") throw new Error("Not allowed");
        const { error } = await supabase
            .from("wf_home_attention")
            .upsert({ ...this.scope, key, resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? this.ctx.me.id : null }, { onConflict: "space_id,key" });
        fail("resolve attention", error);
    }
}
