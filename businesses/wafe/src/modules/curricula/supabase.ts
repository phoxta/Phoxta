import type { AgeBand, RepoContext } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { addDaysIso, letterFor, visibleTo } from "./derive";
import type {
    Assignment,
    AssignmentStatus,
    Badge,
    BadgeAward,
    BadgeKind,
    CharacterLog,
    CharacterTrack,
    CurriculaRepo,
    CurriculaState,
    DevMilestone,
    Grade,
    ImportableUnit,
    LinkedItemType,
    NewAssignment,
    NewBadge,
    NewGrade,
    NewMilestone,
    NewSubject,
    NewTrack,
    NewUnit,
    RubricLine,
    Subject,
    SubjectColour,
    Submission,
    Unit,
} from "./types";

/**
 * The same curriculum, live, under row-level security.
 *
 * The database is the real guard — a child's select on wf_grades returns only
 * the marks a parent released, and wf_subjects only their own — but the slice
 * is still run through the same `visibleTo()` the demo uses, so the two modes
 * cannot drift. snake_case ↔ camelCase mapping lives in this file and nowhere
 * else, and no query here touches another module's tables: a unit imported
 * from the Library keeps a URL back to the course, never a foreign key.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const date = (v: unknown, d = ""): string => (typeof v === "string" && v ? v.slice(0, 10) : d);
const opt = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

function rubric(v: unknown): RubricLine[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((raw) => {
            const r = raw as Row;
            return { criterion: s(r.criterion), score: n(r.score), max: n(r.max, 10) };
        })
        .filter((r) => r.criterion);
}

const mapSubject = (r: Row): Subject => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    childMemberId: s(r.child_member_id),
    name: s(r.name),
    colour: s(r.colour, "grow") as SubjectColour,
    term: s(r.term),
    targetHoursWeek: n(r.target_hours_week),
    kind: s(r.kind, "home-ed") as Subject["kind"],
    note: s(r.note),
    photoUrl: opt(r.photo_url),
    archived: r.archived === true,
    createdAt: iso(r.created_at),
});

const mapUnit = (r: Row): Unit => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    subjectId: s(r.subject_id),
    title: s(r.title),
    summary: s(r.summary),
    order: n(r.unit_order, 1),
    sourceCourseId: nul(r.source_course_id),
    sourceHref: nul(r.source_href),
    sourceLabel: nul(r.source_label),
    createdAt: iso(r.created_at),
});

const mapAssignment = (r: Row): Assignment => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    unitId: s(r.unit_id),
    subjectId: s(r.subject_id),
    childMemberId: s(r.child_member_id),
    title: s(r.title),
    instructions: s(r.instructions),
    dueDate: date(r.due_date),
    status: s(r.status, "not-started") as AssignmentStatus,
    sprouts: n(r.sprouts),
    linkedItemType: s(r.linked_item_type, "none") as LinkedItemType,
    linkedItemTitle: opt(r.linked_item_title),
    linkedHref: opt(r.linked_href),
    attachments: strs(r.attachments),
    pictureLed: r.picture_led === true,
    creditedAt: nul(r.credited_at),
    createdAt: iso(r.created_at),
});

const mapSubmission = (r: Row): Submission => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    assignmentId: s(r.assignment_id),
    memberId: s(r.member_id),
    text: s(r.text),
    mediaUrls: strs(r.media_urls),
    submittedAt: iso(r.submitted_at),
});

const mapGrade = (r: Row): Grade => ({
    assignmentId: s(r.assignment_id),
    spaceId: s(r.space_id),
    score: n(r.score),
    letter: s(r.letter),
    rubric: rubric(r.rubric),
    comment: s(r.comment),
    gradedBy: s(r.graded_by),
    gradedAt: iso(r.graded_at),
    visibleToChild: r.visible_to_child === true,
});

const mapBadge = (r: Row): Badge => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    kind: s(r.kind, "skill") as BadgeKind,
    virtueOrSkill: s(r.virtue_or_skill),
    subjectId: nul(r.subject_id),
    criteria: s(r.criteria),
    icon: s(r.icon, "🏅"),
    levels: strs(r.levels),
    createdAt: iso(r.created_at),
});

const mapAward = (r: Row): BadgeAward => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    badgeId: s(r.badge_id),
    memberId: s(r.member_id),
    level: s(r.level),
    note: s(r.note),
    awardedBy: s(r.awarded_by),
    awardedAt: iso(r.awarded_at),
});

const mapMilestone = (r: Row): DevMilestone => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.member_id),
    band: s(r.band, "junior") as AgeBand,
    title: s(r.title),
    note: s(r.note),
    progressPct: n(r.progress_pct),
    achievedAt: r.achieved_at ? date(r.achieved_at) : null,
    photoUrl: opt(r.photo_url),
    celebratedAt: nul(r.celebrated_at),
    createdAt: iso(r.created_at),
});

const mapTrack = (r: Row): CharacterTrack => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    month: s(r.month),
    virtue: s(r.virtue),
    valueLabel: s(r.value_label),
    intro: s(r.intro),
    challenges: strs(r.challenges),
    sprouts: n(r.sprouts, 10),
    createdAt: iso(r.created_at),
});

const mapLog = (r: Row): CharacterLog => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    trackId: s(r.track_id),
    memberId: s(r.member_id),
    date: date(r.date),
    challengeIndex: n(r.challenge_index),
    reflection: s(r.reflection),
    sprouts: n(r.sprouts, 10),
    createdAt: iso(r.created_at),
});

export class SupabaseCurriculaRepo implements CurriculaRepo {
    constructor(private ctx: RepoContext) {}

    private get space(): string {
        return this.ctx.space.id;
    }

    private base(): { organization_id: string | null; space_id: string } {
        return { organization_id: this.ctx.orgId, space_id: this.space };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!this.ctx.can("curricula.manage")) this.deny();
    }

    private mine(memberId: string): void {
        if (this.ctx.can("curricula.manage")) return;
        if (this.ctx.role !== "child" || memberId !== this.ctx.me.id) this.deny();
    }

    private async assignment(id: string): Promise<Assignment> {
        const { data, error } = await supabase.from("wf_assignments").select("*").eq("id", id).maybeSingle();
        fail("assignment", error);
        if (!data) throw new Error("That piece of work is gone.");
        return mapAssignment(data as Row);
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<CurriculaState> {
        const table = (name: string) => supabase.from(name).select("*").eq("space_id", this.space);
        const [subjects, units, assignments, submissions, grades, badges, awards, milestones, tracks, logs] = await Promise.all([
            table("wf_subjects"),
            table("wf_curriculum_units"),
            table("wf_assignments"),
            table("wf_submissions"),
            table("wf_grades"),
            table("wf_badges"),
            table("wf_badge_awards"),
            table("wf_dev_milestones"),
            table("wf_character_tracks"),
            table("wf_character_logs"),
        ]);
        for (const [where, res] of [
            ["subjects", subjects],
            ["units", units],
            ["assignments", assignments],
            ["submissions", submissions],
            ["grades", grades],
            ["badges", badges],
            ["awards", awards],
            ["milestones", milestones],
            ["tracks", tracks],
            ["logs", logs],
        ] as const) {
            fail(where, res.error);
        }
        const state: CurriculaState = {
            subjects: (subjects.data ?? []).map((r) => mapSubject(r as Row)),
            units: (units.data ?? []).map((r) => mapUnit(r as Row)),
            assignments: (assignments.data ?? []).map((r) => mapAssignment(r as Row)),
            submissions: (submissions.data ?? []).map((r) => mapSubmission(r as Row)),
            grades: (grades.data ?? []).map((r) => mapGrade(r as Row)),
            badges: (badges.data ?? []).map((r) => mapBadge(r as Row)),
            awards: (awards.data ?? []).map((r) => mapAward(r as Row)),
            milestones: (milestones.data ?? []).map((r) => mapMilestone(r as Row)),
            tracks: (tracks.data ?? []).map((r) => mapTrack(r as Row)),
            logs: (logs.data ?? []).map((r) => mapLog(r as Row)),
        };
        return visibleTo(state, this.ctx);
    }

    // -- subjects ------------------------------------------------------------

    async addSubject(input: NewSubject): Promise<Subject> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_subjects")
            .insert({
                ...this.base(),
                child_member_id: input.childMemberId,
                name: input.name.trim(),
                colour: input.colour,
                term: input.term.trim(),
                target_hours_week: Math.max(0, Math.round(input.targetHoursWeek)),
                kind: input.kind,
                note: input.note?.trim() ?? "",
                photo_url: input.photoUrl ?? null,
            })
            .select()
            .single();
        fail("addSubject", error);
        return mapSubject(data as Row);
    }

    async updateSubject(id: string, patch: Partial<Omit<Subject, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.colour !== undefined) row.colour = patch.colour;
        if (patch.term !== undefined) row.term = patch.term;
        if (patch.targetHoursWeek !== undefined) row.target_hours_week = patch.targetHoursWeek;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
        if (patch.archived !== undefined) row.archived = patch.archived;
        if (patch.childMemberId !== undefined) row.child_member_id = patch.childMemberId;
        const { error } = await supabase.from("wf_subjects").update(row).eq("id", id);
        fail("updateSubject", error);
    }

    async removeSubject(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_subjects").delete().eq("id", id);
        fail("removeSubject", error);
    }

    // -- units ---------------------------------------------------------------

    async addUnit(input: NewUnit): Promise<Unit> {
        this.manage();
        const { count } = await supabase.from("wf_curriculum_units").select("id", { count: "exact", head: true }).eq("subject_id", input.subjectId);
        const { data, error } = await supabase
            .from("wf_curriculum_units")
            .insert({
                ...this.base(),
                subject_id: input.subjectId,
                title: input.title.trim(),
                summary: input.summary?.trim() ?? "",
                unit_order: (count ?? 0) + 1,
                source_course_id: input.sourceCourseId ?? null,
                source_href: input.sourceHref ?? null,
                source_label: input.sourceLabel ?? null,
            })
            .select()
            .single();
        fail("addUnit", error);
        return mapUnit(data as Row);
    }

    async updateUnit(id: string, patch: Partial<Pick<Unit, "title" | "summary" | "order">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.summary !== undefined) row.summary = patch.summary;
        if (patch.order !== undefined) row.unit_order = patch.order;
        const { error } = await supabase.from("wf_curriculum_units").update(row).eq("id", id);
        fail("updateUnit", error);
    }

    async removeUnit(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_curriculum_units").delete().eq("id", id);
        fail("removeUnit", error);
    }

    async importUnit(subjectId: string, imported: ImportableUnit, dueFrom: string): Promise<Unit> {
        this.manage();
        const { data: sub, error: subErr } = await supabase.from("wf_subjects").select("*").eq("id", subjectId).maybeSingle();
        fail("importUnit", subErr);
        if (!sub) throw new Error("Choose a subject to import into.");
        const subject = mapSubject(sub as Row);
        const courseHref = `/grow/books?course=${imported.courseId}`;
        const unit = await this.addUnit({
            subjectId,
            title: imported.title,
            summary: `${imported.weeks} week${imported.weeks === 1 ? "" : "s"} · imported from the Library`,
            sourceCourseId: imported.courseId,
            sourceHref: imported.assignments[0]?.href ?? courseHref,
            sourceLabel: `${imported.title} · Library course`,
        });
        if (imported.assignments.length) {
            const { error } = await supabase.from("wf_assignments").insert(
                imported.assignments.map((a, i) => ({
                    ...this.base(),
                    unit_id: unit.id,
                    subject_id: subjectId,
                    child_member_id: subject.childMemberId,
                    title: a.title,
                    instructions: "",
                    due_date: addDaysIso(dueFrom, i * 7),
                    status: "not-started",
                    sprouts: 15,
                    linked_item_type: "book",
                    linked_item_title: imported.title,
                    linked_href: a.href || courseHref,
                })),
            );
            fail("importUnit assignments", error);
        }
        return unit;
    }

    // -- assignments ---------------------------------------------------------

    async addAssignment(input: NewAssignment): Promise<Assignment> {
        this.manage();
        const { data: unitRow, error: unitErr } = await supabase.from("wf_curriculum_units").select("*").eq("id", input.unitId).maybeSingle();
        fail("addAssignment", unitErr);
        if (!unitRow) throw new Error("Choose a unit for this piece of work.");
        const unit = mapUnit(unitRow as Row);
        const { data: subRow, error: subErr } = await supabase.from("wf_subjects").select("*").eq("id", unit.subjectId).maybeSingle();
        fail("addAssignment", subErr);
        if (!subRow) throw new Error("That unit has lost its subject.");
        const subject = mapSubject(subRow as Row);
        const { data, error } = await supabase
            .from("wf_assignments")
            .insert({
                ...this.base(),
                unit_id: unit.id,
                subject_id: subject.id,
                child_member_id: subject.childMemberId,
                title: input.title.trim(),
                instructions: input.instructions?.trim() ?? "",
                due_date: input.dueDate,
                status: "not-started",
                sprouts: Math.max(0, Math.round(input.sprouts ?? 10)),
                linked_item_type: input.linkedItemType ?? "none",
                linked_item_title: input.linkedItemTitle ?? null,
                linked_href: input.linkedHref ?? null,
                attachments: input.attachments ?? [],
                picture_led: input.pictureLed ?? false,
            })
            .select()
            .single();
        fail("addAssignment", error);
        return mapAssignment(data as Row);
    }

    async updateAssignment(id: string, patch: Partial<Pick<Assignment, "title" | "instructions" | "dueDate" | "sprouts" | "linkedItemType" | "linkedItemTitle" | "linkedHref" | "attachments" | "pictureLed">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.instructions !== undefined) row.instructions = patch.instructions;
        if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
        if (patch.sprouts !== undefined) row.sprouts = patch.sprouts;
        if (patch.linkedItemType !== undefined) row.linked_item_type = patch.linkedItemType;
        if (patch.linkedItemTitle !== undefined) row.linked_item_title = patch.linkedItemTitle;
        if (patch.linkedHref !== undefined) row.linked_href = patch.linkedHref;
        if (patch.attachments !== undefined) row.attachments = patch.attachments;
        if (patch.pictureLed !== undefined) row.picture_led = patch.pictureLed;
        const { error } = await supabase.from("wf_assignments").update(row).eq("id", id);
        fail("updateAssignment", error);
    }

    async removeAssignment(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_assignments").delete().eq("id", id);
        fail("removeAssignment", error);
    }

    async setStatus(id: string, status: AssignmentStatus): Promise<void> {
        const a = await this.assignment(id);
        this.mine(a.childMemberId);
        if (status === "graded" && !this.ctx.can("curricula.manage")) this.deny();
        const { error } = await supabase.from("wf_assignments").update({ status }).eq("id", id);
        fail("setStatus", error);
    }

    async submitAssignment(id: string, text: string, mediaUrls: string[] = []): Promise<Submission> {
        const a = await this.assignment(id);
        this.mine(a.childMemberId);
        const memberId = this.ctx.role === "child" ? this.ctx.me.id : a.childMemberId;
        const { data, error } = await supabase
            .from("wf_submissions")
            .upsert(
                {
                    ...this.base(),
                    assignment_id: id,
                    member_id: memberId,
                    text: text.trim(),
                    media_urls: mediaUrls,
                    submitted_at: new Date().toISOString(),
                },
                { onConflict: "assignment_id,member_id" },
            )
            .select()
            .single();
        fail("submitAssignment", error);
        if (a.status !== "graded") {
            const { error: e2 } = await supabase.from("wf_assignments").update({ status: "submitted" }).eq("id", id);
            fail("submitAssignment status", e2);
        }
        return mapSubmission(data as Row);
    }

    async markCredited(id: string): Promise<number> {
        const a = await this.assignment(id);
        this.mine(a.childMemberId);
        if (a.creditedAt) return 0;
        const { error } = await supabase.from("wf_assignments").update({ credited_at: new Date().toISOString() }).eq("id", id).is("credited_at", null);
        fail("markCredited", error);
        return a.sprouts;
    }

    // -- grades --------------------------------------------------------------

    async gradeAssignment(assignmentId: string, input: NewGrade): Promise<Grade> {
        this.manage();
        const score = Math.max(0, Math.min(100, Math.round(input.score)));
        const { data, error } = await supabase
            .from("wf_grades")
            .upsert(
                {
                    ...this.base(),
                    assignment_id: assignmentId,
                    score,
                    letter: input.letter?.trim() || letterFor(score),
                    rubric: input.rubric ?? [],
                    comment: input.comment?.trim() ?? "",
                    graded_by: this.ctx.me.id,
                    graded_at: new Date().toISOString(),
                    visible_to_child: input.visibleToChild,
                },
                { onConflict: "assignment_id" },
            )
            .select()
            .single();
        fail("gradeAssignment", error);
        const { error: e2 } = await supabase.from("wf_assignments").update({ status: "graded" }).eq("id", assignmentId);
        fail("gradeAssignment status", e2);
        return mapGrade(data as Row);
    }

    async setGradeVisibility(assignmentId: string, visibleToChild: boolean): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_grades").update({ visible_to_child: visibleToChild }).eq("assignment_id", assignmentId);
        fail("setGradeVisibility", error);
    }

    async removeGrade(assignmentId: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_grades").delete().eq("assignment_id", assignmentId);
        fail("removeGrade", error);
        const { error: e2 } = await supabase.from("wf_assignments").update({ status: "submitted" }).eq("id", assignmentId).eq("status", "graded");
        fail("removeGrade status", e2);
    }

    // -- badges --------------------------------------------------------------

    async addBadge(input: NewBadge): Promise<Badge> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_badges")
            .insert({
                ...this.base(),
                name: input.name.trim(),
                kind: input.kind,
                virtue_or_skill: input.virtueOrSkill.trim(),
                subject_id: input.subjectId ?? null,
                criteria: input.criteria.trim(),
                icon: input.icon || "🏅",
                levels: input.levels?.length ? input.levels : ["Bronze", "Silver", "Gold"],
            })
            .select()
            .single();
        fail("addBadge", error);
        return mapBadge(data as Row);
    }

    async removeBadge(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_badges").delete().eq("id", id);
        fail("removeBadge", error);
    }

    async awardBadge(badgeId: string, memberId: string, level: string, note: string): Promise<BadgeAward> {
        this.manage();
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member || member.role !== "child") throw new Error("Badges are for the children.");
        const { data, error } = await supabase
            .from("wf_badge_awards")
            .insert({
                ...this.base(),
                badge_id: badgeId,
                member_id: memberId,
                level: level || "Bronze",
                note: note.trim(),
                awarded_by: this.ctx.me.id,
                awarded_at: new Date().toISOString(),
            })
            .select()
            .single();
        fail("awardBadge", error);
        return mapAward(data as Row);
    }

    async revokeAward(awardId: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_badge_awards").delete().eq("id", awardId);
        fail("revokeAward", error);
    }

    // -- milestones ----------------------------------------------------------

    async addMilestone(input: NewMilestone): Promise<DevMilestone> {
        this.manage();
        const pct = Math.max(0, Math.min(100, Math.round(input.progressPct ?? 0)));
        const { data, error } = await supabase
            .from("wf_dev_milestones")
            .insert({
                ...this.base(),
                member_id: input.memberId,
                band: input.band,
                title: input.title.trim(),
                note: input.note?.trim() ?? "",
                progress_pct: pct,
                achieved_at: pct >= 100 ? this.ctx.today : null,
                photo_url: input.photoUrl ?? null,
            })
            .select()
            .single();
        fail("addMilestone", error);
        return mapMilestone(data as Row);
    }

    async updateMilestone(id: string, patch: Partial<Pick<DevMilestone, "title" | "note" | "progressPct" | "photoUrl" | "achievedAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
        if (patch.achievedAt !== undefined) row.achieved_at = patch.achievedAt;
        if (patch.progressPct !== undefined) {
            const pct = Math.max(0, Math.min(100, Math.round(patch.progressPct)));
            row.progress_pct = pct;
            if (pct >= 100) row.achieved_at = patch.achievedAt ?? this.ctx.today;
            else {
                row.achieved_at = null;
                row.celebrated_at = null;
            }
        }
        const { error } = await supabase.from("wf_dev_milestones").update(row).eq("id", id);
        fail("updateMilestone", error);
    }

    async celebrateMilestone(id: string): Promise<void> {
        if (this.ctx.role === "guest") this.deny();
        const { error } = await supabase.from("wf_dev_milestones").update({ celebrated_at: new Date().toISOString() }).eq("id", id);
        fail("celebrateMilestone", error);
    }

    async removeMilestone(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_dev_milestones").delete().eq("id", id);
        fail("removeMilestone", error);
    }

    // -- character tracks ----------------------------------------------------

    async addTrack(input: NewTrack): Promise<CharacterTrack> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_character_tracks")
            .upsert(
                {
                    ...this.base(),
                    month: input.month,
                    virtue: input.virtue.trim(),
                    value_label: input.valueLabel.trim(),
                    intro: input.intro?.trim() ?? "",
                    challenges: input.challenges.map((c) => c.trim()).filter(Boolean),
                    sprouts: Math.max(0, Math.round(input.sprouts ?? 10)),
                },
                { onConflict: "space_id,month" },
            )
            .select()
            .single();
        fail("addTrack", error);
        return mapTrack(data as Row);
    }

    async updateTrack(id: string, patch: Partial<Pick<CharacterTrack, "virtue" | "valueLabel" | "intro" | "challenges" | "sprouts">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.virtue !== undefined) row.virtue = patch.virtue;
        if (patch.valueLabel !== undefined) row.value_label = patch.valueLabel;
        if (patch.intro !== undefined) row.intro = patch.intro;
        if (patch.challenges !== undefined) row.challenges = patch.challenges;
        if (patch.sprouts !== undefined) row.sprouts = patch.sprouts;
        const { error } = await supabase.from("wf_character_tracks").update(row).eq("id", id);
        fail("updateTrack", error);
    }

    async removeTrack(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_character_tracks").delete().eq("id", id);
        fail("removeTrack", error);
    }

    async logChallenge(trackId: string, memberId: string, challengeIndex: number, reflection: string, on?: string): Promise<CharacterLog> {
        this.mine(memberId);
        const { data: trackRow, error: trackErr } = await supabase.from("wf_character_tracks").select("*").eq("id", trackId).maybeSingle();
        fail("logChallenge", trackErr);
        if (!trackRow) throw new Error("That track is gone.");
        const track = mapTrack(trackRow as Row);
        const { data, error } = await supabase
            .from("wf_character_logs")
            .insert({
                ...this.base(),
                track_id: trackId,
                member_id: memberId,
                date: on ?? this.ctx.today,
                challenge_index: challengeIndex,
                reflection: reflection.trim(),
                sprouts: track.sprouts,
            })
            .select()
            .single();
        if (error?.message?.includes("duplicate")) throw new Error("Today's challenge is already ticked.");
        fail("logChallenge", error);
        return mapLog(data as Row);
    }

    async removeLog(id: string): Promise<void> {
        const { error } = await supabase.from("wf_character_logs").delete().eq("id", id);
        fail("removeLog", error);
    }
}
