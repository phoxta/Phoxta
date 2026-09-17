import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { addDaysIso, canSeeStudy, nextInterval, visibleTo } from "./derive";
import { SCHEDULE, type BiblePlan, type BibleRepo, type BibleState, type MemoryVerse, type NewPlan, type NewPrayer, type NewSession, type NewStudy, type NewVerse, type PlanDay, type Prayer, type PrayerMilestone, type PrayerReaction, type PrayerStatus, type PrayerTag, type ReviewResult, type Sensitivity, type SessionDone, type Study, type StudySession, type StudyType, type VerseReview } from "./types";

/**
 * The same module, live, under row-level security.
 *
 * The policies in `sql/bible.sql` are the real guard — a private prayer is not
 * hidden from a child, it is unreadable by one — but this repo still shapes the
 * result through the same `visibleTo()` the demo uses, so the two modes cannot
 * drift. snake_case ↔ camelCase mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const opt = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const date = (v: unknown): string => (typeof v === "string" ? v.slice(0, 10) : "");
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapStudy = (r: Row): Study => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    type: s(r.type, "custom") as StudyType,
    description: s(r.description),
    childSafe: r.child_safe === true,
    assigneeMemberIds: strs(r.assignee_member_ids),
    value: opt(r.value_id),
    coverUrl: opt(r.cover_url),
    minutes: n(r.minutes, 15),
    createdAt: iso(r.created_at),
});

const mapSession = (r: Row): StudySession => ({
    id: s(r.id),
    studyId: s(r.study_id),
    order: n(r.session_order, 1),
    passage: s(r.passage),
    passageText: s(r.passage_text),
    devotional: s(r.devotional),
    questions: strs(r.questions),
    prayerFocus: s(r.prayer_focus),
});

const mapDone = (r: Row): SessionDone => ({
    id: s(r.id),
    studyId: s(r.study_id),
    sessionId: s(r.session_id),
    memberId: s(r.member_id),
    date: date(r.done_on),
    at: iso(r.created_at),
});

const mapPlan = (r: Row): BiblePlan => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    startDate: date(r.start_date),
    translation: s(r.translation, "WEB"),
    assigneeMemberIds: strs(r.assignee_member_ids),
    active: r.active === true,
    createdAt: iso(r.created_at),
});

const mapPlanDay = (r: Row): PlanDay => ({ planId: s(r.plan_id), day: n(r.day_number, 1), passage: s(r.passage), passageText: s(r.passage_text) });

const mapVerse = (r: Row): MemoryVerse => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.member_id),
    reference: s(r.reference),
    text: s(r.text),
    readAloud: r.read_aloud === true,
    addedAt: iso(r.created_at),
});

const mapReview = (r: Row): VerseReview => ({
    id: s(r.id),
    verseId: s(r.verse_id),
    memberId: s(r.member_id),
    dueAt: date(r.due_at),
    intervalDays: n(r.interval_days, 1),
    step: n(r.step),
    result: (opt(r.result) as ReviewResult | undefined) ?? null,
    reviewedAt: nul(r.reviewed_at),
});

const mapPrayer = (r: Row): Prayer => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    authorMemberId: s(r.owner_member_id),
    title: s(r.title),
    detail: s(r.detail),
    tags: strs(r.tags) as PrayerTag[],
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    sensitivity: s(r.sensitivity, "general") as Sensitivity,
    status: s(r.status, "open") as PrayerStatus,
    answeredAt: r.answered_at ? date(r.answered_at) : null,
    testimony: s(r.testimony),
    childSafe: r.child_safe === true,
    sharedWithGuests: r.shared_with_guests === true,
    fromGuest: r.from_guest === true,
    createdAt: iso(r.created_at),
});

const mapReaction = (r: Row): PrayerReaction => ({
    id: s(r.id),
    prayerId: s(r.prayer_id),
    memberId: s(r.member_id),
    type: "prayed",
    date: date(r.prayed_on),
    at: iso(r.created_at),
});

const mapMilestone = (r: Row): PrayerMilestone => ({
    id: s(r.id),
    prayerId: s(r.prayer_id),
    date: date(r.happened_on),
    title: s(r.title),
    body: s(r.body),
    href: "/grow/bible/prayer",
    memberIds: strs(r.member_ids),
    ownerMemberId: nul(r.owner_member_id),
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
});

export class SupabaseBibleRepo implements BibleRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!this.ctx.can("bible.manage")) this.deny();
    }

    private mine(memberId: string): void {
        if (!this.ctx.can("bible.manage") && memberId !== this.ctx.me.id) this.deny();
    }

    private notGuest(): void {
        if (this.ctx.role === "guest") this.deny();
    }

    private async wallGranted(): Promise<boolean> {
        const { data } = await supabase.from("wf_bible_settings").select("wall_guest_ids").eq("space_id", this.ctx.space.id).maybeSingle();
        return strs((data as Row | null)?.wall_guest_ids).includes(this.ctx.me.id);
    }

    /** A guest reaches the wall only through the grant (AC4). */
    private async mayUseWall(): Promise<void> {
        if (this.ctx.role !== "guest") return;
        if (!(await this.wallGranted())) this.deny();
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<BibleState> {
        const spaceId = this.ctx.space.id;
        const [studies, sessions, done, plans, planDays, verses, reviews, prayers, reactions, milestones, settings] = await Promise.all([
            supabase.from("wf_bible_studies").select("*").eq("space_id", spaceId),
            supabase.from("wf_bible_sessions").select("*").eq("space_id", spaceId).order("session_order", { ascending: true }),
            supabase.from("wf_bible_session_done").select("*").eq("space_id", spaceId),
            supabase.from("wf_bible_plans").select("*").eq("space_id", spaceId),
            supabase.from("wf_bible_plan_days").select("*").eq("space_id", spaceId).order("day_number", { ascending: true }),
            supabase.from("wf_memory_verses").select("*").eq("space_id", spaceId),
            supabase.from("wf_verse_reviews").select("*").eq("space_id", spaceId),
            supabase.from("wf_prayers").select("*").eq("space_id", spaceId).order("created_at", { ascending: false }),
            supabase.from("wf_prayer_reactions").select("*").eq("space_id", spaceId),
            supabase.from("wf_prayer_milestones").select("*").eq("space_id", spaceId),
            supabase.from("wf_bible_settings").select("*").eq("space_id", spaceId).maybeSingle(),
        ]);
        fail("studies", studies.error);
        fail("sessions", sessions.error);
        fail("completed sessions", done.error);
        fail("reading plans", plans.error);
        fail("plan days", planDays.error);
        fail("memory verses", verses.error);
        fail("reviews", reviews.error);
        fail("prayers", prayers.error);
        fail("reactions", reactions.error);
        fail("answered prayers", milestones.error);

        const cfg = (settings.data as Row | null) ?? {};
        const rolling = Array.isArray(cfg.rolling_verses) ? (cfg.rolling_verses as Row[]) : [];
        const state: BibleState = {
            studies: (studies.data ?? []).map(mapStudy),
            sessions: (sessions.data ?? []).map(mapSession),
            done: (done.data ?? []).map(mapDone),
            plans: (plans.data ?? []).map(mapPlan),
            planDays: (planDays.data ?? []).map(mapPlanDay),
            memoryVerses: (verses.data ?? []).map(mapVerse),
            reviews: (reviews.data ?? []).map(mapReview),
            prayers: (prayers.data ?? []).map(mapPrayer),
            reactions: (reactions.data ?? []).map(mapReaction),
            wallGuestIds: strs(cfg.wall_guest_ids),
            graceDays: strs(cfg.grace_days).map((d) => d.slice(0, 10)),
            rollingVerses: rolling.map((v) => ({ reference: s(v.reference), text: s(v.text) })).filter((v) => v.reference && v.text),
            verses: [],
            timeline: (milestones.data ?? []).map(mapMilestone),
            units: [],
        };
        return visibleTo(state, this.ctx);
    }

    /** The settings row is created lazily — a family need never think about it. */
    private async patchSettings(row: Row): Promise<void> {
        const { error } = await supabase.from("wf_bible_settings").upsert({ ...this.scope, ...row }, { onConflict: "space_id" });
        fail("save settings", error);
    }

    // -- studies -------------------------------------------------------------

    async addStudy(input: NewStudy): Promise<Study> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_bible_studies")
            .insert({
                ...this.scope,
                title: input.title.trim(),
                type: input.type,
                description: input.description.trim(),
                child_safe: input.childSafe,
                assignee_member_ids: input.assigneeMemberIds,
                value_id: input.value ?? null,
                cover_url: input.coverUrl ?? null,
                minutes: Math.max(5, Math.round(input.minutes ?? 15)),
                owner_member_id: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("add study", error);
        const study = mapStudy(data as Row);
        if (input.sessions?.length) {
            const rows = input.sessions.map((x, i) => ({
                ...this.scope,
                study_id: study.id,
                session_order: i + 1,
                passage: x.passage.trim(),
                passage_text: x.passageText.trim(),
                devotional: x.devotional.trim(),
                questions: x.questions.filter((q) => q.trim()),
                prayer_focus: x.prayerFocus.trim(),
            }));
            const inserted = await supabase.from("wf_bible_sessions").insert(rows);
            fail("add sessions", inserted.error);
        }
        return study;
    }

    async updateStudy(id: string, patch: Partial<Pick<Study, "title" | "description" | "childSafe" | "assigneeMemberIds" | "value" | "minutes">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.assigneeMemberIds !== undefined) row.assignee_member_ids = patch.assigneeMemberIds;
        if (patch.value !== undefined) row.value_id = patch.value ?? null;
        if (patch.minutes !== undefined) row.minutes = patch.minutes;
        const { error } = await supabase.from("wf_bible_studies").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update study", error);
    }

    async removeStudy(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_bible_studies").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove study", error);
    }

    async addSession(studyId: string, input: NewSession): Promise<StudySession> {
        this.manage();
        const existing = await supabase.from("wf_bible_sessions").select("session_order").eq("study_id", studyId);
        fail("sessions", existing.error);
        const order = (existing.data ?? []).length + 1;
        const { data, error } = await supabase
            .from("wf_bible_sessions")
            .insert({
                ...this.scope,
                study_id: studyId,
                session_order: order,
                passage: input.passage.trim(),
                passage_text: input.passageText.trim(),
                devotional: input.devotional.trim(),
                questions: input.questions.filter((q) => q.trim()),
                prayer_focus: input.prayerFocus.trim(),
            })
            .select("*")
            .single();
        fail("add session", error);
        return mapSession(data as Row);
    }

    async updateSession(id: string, patch: Partial<NewSession>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.passage !== undefined) row.passage = patch.passage;
        if (patch.passageText !== undefined) row.passage_text = patch.passageText;
        if (patch.devotional !== undefined) row.devotional = patch.devotional;
        if (patch.questions !== undefined) row.questions = patch.questions;
        if (patch.prayerFocus !== undefined) row.prayer_focus = patch.prayerFocus;
        const { error } = await supabase.from("wf_bible_sessions").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update session", error);
    }

    async removeSession(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_bible_sessions").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove session", error);
    }

    async completeSession(sessionId: string, memberId: string): Promise<{ points: number }> {
        this.notGuest();
        this.mine(memberId);
        const state = await this.load();
        const session = state.sessions.find((x) => x.id === sessionId);
        const study = session ? state.studies.find((x) => x.id === session.studyId) : undefined;
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!session || !study || !member || !canSeeStudy(study, member)) throw new Error("Not allowed");
        const { error } = await supabase
            .from("wf_bible_session_done")
            .upsert({ ...this.scope, study_id: study.id, session_id: sessionId, member_id: memberId, done_on: this.ctx.today }, { onConflict: "session_id,member_id" });
        fail("complete session", error);
        return { points: member.role === "child" ? 15 : 0 };
    }

    async uncompleteSession(sessionId: string, memberId: string): Promise<void> {
        this.notGuest();
        this.mine(memberId);
        const { error } = await supabase.from("wf_bible_session_done").delete().eq("session_id", sessionId).eq("member_id", memberId).eq("space_id", this.ctx.space.id);
        fail("undo session", error);
    }

    // -- plans ---------------------------------------------------------------

    async addPlan(input: NewPlan): Promise<BiblePlan> {
        this.manage();
        const cleared = await supabase.from("wf_bible_plans").update({ active: false }).eq("space_id", this.ctx.space.id);
        fail("archive plans", cleared.error);
        const { data, error } = await supabase
            .from("wf_bible_plans")
            .insert({
                ...this.scope,
                title: input.title.trim(),
                start_date: input.startDate,
                translation: input.translation.trim() || "WEB",
                assignee_member_ids: input.assigneeMemberIds,
                active: true,
                owner_member_id: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("add plan", error);
        const plan = mapPlan(data as Row);
        if (input.days.length) {
            const days = await supabase
                .from("wf_bible_plan_days")
                .insert(input.days.map((d, i) => ({ ...this.scope, plan_id: plan.id, day_number: i + 1, passage: d.passage.trim(), passage_text: d.passageText.trim() })));
            fail("add plan days", days.error);
        }
        return plan;
    }

    async updatePlan(id: string, patch: Partial<Pick<BiblePlan, "title" | "translation" | "assigneeMemberIds" | "active" | "startDate">>): Promise<void> {
        this.manage();
        if (patch.active === true) {
            const cleared = await supabase.from("wf_bible_plans").update({ active: false }).eq("space_id", this.ctx.space.id);
            fail("archive plans", cleared.error);
        }
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.translation !== undefined) row.translation = patch.translation;
        if (patch.assigneeMemberIds !== undefined) row.assignee_member_ids = patch.assigneeMemberIds;
        if (patch.active !== undefined) row.active = patch.active;
        if (patch.startDate !== undefined) row.start_date = patch.startDate;
        const { error } = await supabase.from("wf_bible_plans").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update plan", error);
    }

    async removePlan(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_bible_plans").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove plan", error);
    }

    // -- memory verses -------------------------------------------------------

    async addVerse(input: NewVerse): Promise<MemoryVerse> {
        this.notGuest();
        this.mine(input.memberId);
        const { data, error } = await supabase
            .from("wf_memory_verses")
            .insert({ ...this.scope, member_id: input.memberId, reference: input.reference.trim(), text: input.text.trim(), read_aloud: Boolean(input.readAloud) })
            .select("*")
            .single();
        fail("add verse", error);
        const verse = mapVerse(data as Row);
        const review = await supabase
            .from("wf_verse_reviews")
            .insert({ ...this.scope, verse_id: verse.id, member_id: verse.memberId, due_at: addDaysIso(this.ctx.today, SCHEDULE[0]), interval_days: SCHEDULE[0], step: 0 });
        fail("schedule verse", review.error);
        return verse;
    }

    async updateVerse(id: string, patch: Partial<Pick<MemoryVerse, "reference" | "text" | "readAloud">>): Promise<void> {
        this.notGuest();
        const row: Row = {};
        if (patch.reference !== undefined) row.reference = patch.reference;
        if (patch.text !== undefined) row.text = patch.text;
        if (patch.readAloud !== undefined) row.read_aloud = patch.readAloud;
        const { error } = await supabase.from("wf_memory_verses").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update verse", error);
    }

    async removeVerse(id: string): Promise<void> {
        this.notGuest();
        const { error } = await supabase.from("wf_memory_verses").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove verse", error);
    }

    async reviewVerse(verseId: string, memberId: string, result: ReviewResult): Promise<{ points: number }> {
        this.notGuest();
        this.mine(memberId);
        const pending = await supabase.from("wf_verse_reviews").select("*").eq("verse_id", verseId).eq("member_id", memberId).is("reviewed_at", null).order("due_at", { ascending: true }).limit(1).maybeSingle();
        fail("verse card", pending.error);
        const row = pending.data as Row | null;
        if (!row) throw new Error("That card is not waiting for an answer.");
        const { step, days } = nextInterval(n(row.step), result);
        const stamped = await supabase.from("wf_verse_reviews").update({ result, reviewed_at: new Date().toISOString() }).eq("id", s(row.id));
        fail("record review", stamped.error);
        const next = await supabase
            .from("wf_verse_reviews")
            .insert({ ...this.scope, verse_id: verseId, member_id: memberId, due_at: addDaysIso(this.ctx.today, days), interval_days: days, step });
        fail("schedule next review", next.error);
        return { points: this.ctx.members.find((m) => m.id === memberId)?.role === "child" ? 5 : 0 };
    }

    // -- prayer --------------------------------------------------------------

    async addPrayer(input: NewPrayer): Promise<Prayer> {
        await this.mayUseWall();
        const guest = this.ctx.role === "guest";
        const child = this.ctx.role === "child";
        const visibility: Visibility = guest ? "family" : input.visibility;
        const { data, error } = await supabase
            .from("wf_prayers")
            .insert({
                ...this.scope,
                owner_member_id: this.ctx.me.id,
                title: input.title.trim(),
                detail: input.detail.trim(),
                tags: input.tags,
                visibility,
                shared_with: visibility === "shared" ? (input.sharedWith ?? []) : [],
                sensitivity: visibility === "private" ? "private" : (input.sensitivity ?? "general"),
                status: "open",
                child_safe: child ? true : input.childSafe,
                shared_with_guests: guest ? true : input.sharedWithGuests,
                from_guest: guest,
            })
            .select("*")
            .single();
        fail("add prayer", error);
        return mapPrayer(data as Row);
    }

    async updatePrayer(id: string, patch: Partial<Pick<Prayer, "title" | "detail" | "tags" | "visibility" | "sharedWith" | "sensitivity" | "childSafe" | "sharedWithGuests">>): Promise<void> {
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.detail !== undefined) row.detail = patch.detail;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.sensitivity !== undefined) row.sensitivity = patch.sensitivity;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.sharedWithGuests !== undefined) row.shared_with_guests = patch.sharedWithGuests;
        if (patch.visibility !== undefined) {
            row.visibility = patch.visibility;
            row.shared_with = patch.visibility === "shared" ? (patch.sharedWith ?? []) : [];
            if (patch.visibility === "private") {
                row.shared_with_guests = false;
                row.child_safe = false;
                row.sensitivity = "private";
            }
        } else if (patch.sharedWith !== undefined) {
            row.shared_with = patch.sharedWith;
        }
        const { error } = await supabase.from("wf_prayers").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update prayer", error);
    }

    async removePrayer(id: string): Promise<void> {
        const { error } = await supabase.from("wf_prayers").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove prayer", error);
    }

    async markAnswered(id: string, testimony: string): Promise<void> {
        const found = await supabase.from("wf_prayers").select("*").eq("id", id).eq("space_id", this.ctx.space.id).single();
        fail("prayer", found.error);
        const prayer = mapPrayer(found.data as Row);
        const { error } = await supabase.from("wf_prayers").update({ status: "answered", answered_at: this.ctx.today, testimony: testimony.trim() }).eq("id", id);
        fail("mark answered", error);
        // The thread stays; the timeline gets its entry (AC3).
        const milestone = await supabase.from("wf_prayer_milestones").upsert(
            {
                ...this.scope,
                prayer_id: id,
                happened_on: this.ctx.today,
                title: `Answered: ${prayer.title}`,
                body: testimony.trim(),
                member_ids: [],
                owner_member_id: prayer.authorMemberId,
                visibility: prayer.visibility,
                shared_with: prayer.sharedWith,
            },
            { onConflict: "prayer_id" },
        );
        fail("record answer", milestone.error);
    }

    async reopenPrayer(id: string): Promise<void> {
        const { error } = await supabase.from("wf_prayers").update({ status: "open", answered_at: null }).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("reopen prayer", error);
        const gone = await supabase.from("wf_prayer_milestones").delete().eq("prayer_id", id).eq("space_id", this.ctx.space.id);
        fail("clear timeline", gone.error);
    }

    async togglePrayed(prayerId: string, memberId: string, on: boolean): Promise<void> {
        await this.mayUseWall();
        if (memberId !== this.ctx.me.id) this.deny();
        if (on) {
            const { error } = await supabase.from("wf_prayer_reactions").upsert({ ...this.scope, prayer_id: prayerId, member_id: memberId, prayed_on: this.ctx.today }, { onConflict: "prayer_id,member_id,prayed_on" });
            fail("say a prayer", error);
            return;
        }
        const { error } = await supabase.from("wf_prayer_reactions").delete().eq("prayer_id", prayerId).eq("member_id", memberId).eq("prayed_on", this.ctx.today);
        fail("undo", error);
    }

    // -- grants and rhythm ---------------------------------------------------

    async setWallGuest(memberId: string, granted: boolean): Promise<void> {
        this.manage();
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member || member.role !== "guest") throw new Error("The wall is granted to guests.");
        const current = await supabase.from("wf_bible_settings").select("wall_guest_ids").eq("space_id", this.ctx.space.id).maybeSingle();
        const set = new Set(strs((current.data as Row | null)?.wall_guest_ids));
        if (granted) set.add(memberId);
        else set.delete(memberId);
        await this.patchSettings({ wall_guest_ids: [...set] });
    }

    async setGraceDay(day: string, on: boolean): Promise<void> {
        this.manage();
        const current = await supabase.from("wf_bible_settings").select("grace_days").eq("space_id", this.ctx.space.id).maybeSingle();
        const set = new Set(strs((current.data as Row | null)?.grace_days).map((d) => d.slice(0, 10)));
        if (on) set.add(day);
        else set.delete(day);
        await this.patchSettings({ grace_days: [...set].sort() });
    }
}
