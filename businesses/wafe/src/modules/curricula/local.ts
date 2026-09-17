import type { RepoContext } from "@/data/core";
import { uid } from "@/lib/format";
import { seedContext } from "@/data/coreSeed";
import { addDaysIso, letterFor, visibleTo } from "./derive";
import { seed } from "./seed";
import type {
    Assignment,
    AssignmentStatus,
    Badge,
    BadgeAward,
    CharacterLog,
    CharacterTrack,
    CurriculaRepo,
    CurriculaState,
    DevMilestone,
    Grade,
    ImportableUnit,
    NewAssignment,
    NewBadge,
    NewGrade,
    NewMilestone,
    NewSubject,
    NewTrack,
    NewUnit,
    Subject,
    Submission,
    Unit,
} from "./types";

/**
 * The demo school office — every write real, in the browser.
 *
 * The permission checks here are the ones the live policies enforce, so
 * "Not allowed" means the same thing in both modes. A parent runs the module.
 * A child may do exactly three things: move their own work along, hand it in,
 * and tick today's character challenge with a reflection. They cannot grade
 * themselves, cannot release a grade, cannot award themselves a badge and
 * cannot touch a sibling's row — the guards are on the write, not on the
 * button, so a screen that forgets to hide something still cannot do harm.
 */

const KEY = "wafe:demo:curricula:v2";

function isState(v: unknown): v is CurriculaState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<CurriculaState>;
    return Array.isArray(s.subjects) && Array.isArray(s.assignments) && Array.isArray(s.badges) && Array.isArray(s.tracks);
}

const now = (): string => new Date().toISOString();

export class LocalCurriculaRepo implements CurriculaRepo {
    private cache: CurriculaState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): CurriculaState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isState(parsed)) {
                this.cache = parsed;
                return parsed;
            }
        } catch {
            /* a stale or foreign blob must never break the demo */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.save(fresh);
        return fresh;
    }

    private save(s: CurriculaState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing: the session still works, it just won't persist */
        }
    }

    private write(fn: (s: CurriculaState) => void): void {
        const s = { ...this.all() };
        fn(s);
        this.save(s);
    }

    // -- permissions ---------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    /** Parents build and mark the curriculum. */
    private manage(): void {
        if (!this.ctx.can("curricula.manage")) this.deny();
    }

    /** The child whose work this is, or a parent. */
    private mine(memberId: string): void {
        if (this.ctx.can("curricula.manage")) return;
        if (this.ctx.role !== "child" || memberId !== this.ctx.me.id) this.deny();
    }

    private assignment(id: string): Assignment {
        const a = this.all().assignments.find((x) => x.id === id);
        if (!a) throw new Error("That piece of work is gone.");
        return a;
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<CurriculaState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- subjects ------------------------------------------------------------

    async addSubject(input: NewSubject): Promise<Subject> {
        this.manage();
        const subject: Subject = {
            id: uid("sub"),
            spaceId: this.ctx.space.id,
            childMemberId: input.childMemberId,
            name: input.name.trim(),
            colour: input.colour,
            term: input.term.trim(),
            targetHoursWeek: Math.max(0, Math.round(input.targetHoursWeek)),
            kind: input.kind,
            note: input.note?.trim() ?? "",
            photoUrl: input.photoUrl,
            archived: false,
            createdAt: now(),
        };
        this.write((s) => {
            s.subjects = [...s.subjects, subject];
        });
        return subject;
    }

    async updateSubject(id: string, patch: Partial<Omit<Subject, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.subjects = s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x));
        });
    }

    async removeSubject(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const unitIds = new Set(s.units.filter((u) => u.subjectId === id).map((u) => u.id));
            const asnIds = new Set(s.assignments.filter((a) => unitIds.has(a.unitId)).map((a) => a.id));
            s.subjects = s.subjects.filter((x) => x.id !== id);
            s.units = s.units.filter((u) => !unitIds.has(u.id));
            s.assignments = s.assignments.filter((a) => !asnIds.has(a.id));
            s.submissions = s.submissions.filter((x) => !asnIds.has(x.assignmentId));
            s.grades = s.grades.filter((g) => !asnIds.has(g.assignmentId));
            s.badges = s.badges.map((b) => (b.subjectId === id ? { ...b, subjectId: null } : b));
        });
    }

    // -- units ---------------------------------------------------------------

    async addUnit(input: NewUnit): Promise<Unit> {
        this.manage();
        const order = this.all().units.filter((u) => u.subjectId === input.subjectId).length + 1;
        const unit: Unit = {
            id: uid("unit"),
            spaceId: this.ctx.space.id,
            subjectId: input.subjectId,
            title: input.title.trim(),
            summary: input.summary?.trim() ?? "",
            order,
            sourceCourseId: input.sourceCourseId ?? null,
            sourceHref: input.sourceHref ?? null,
            sourceLabel: input.sourceLabel ?? null,
            createdAt: now(),
        };
        this.write((s) => {
            s.units = [...s.units, unit];
        });
        return unit;
    }

    async updateUnit(id: string, patch: Partial<Pick<Unit, "title" | "summary" | "order">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.units = s.units.map((u) => (u.id === id ? { ...u, ...patch } : u));
        });
    }

    async removeUnit(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const asnIds = new Set(s.assignments.filter((a) => a.unitId === id).map((a) => a.id));
            s.units = s.units.filter((u) => u.id !== id);
            s.assignments = s.assignments.filter((a) => a.unitId !== id);
            s.submissions = s.submissions.filter((x) => !asnIds.has(x.assignmentId));
            s.grades = s.grades.filter((g) => !asnIds.has(g.assignmentId));
        });
    }

    /**
     * A Library course, brought across as a unit.
     *
     * The link back is the point: the unit keeps `sourceCourseId` and the href
     * of the course, and every assignment it creates points at the week it came
     * from — so a child who opens "Week 2" lands in the course, not in a dead
     * copy of its title.
     */
    async importUnit(subjectId: string, imported: ImportableUnit, dueFrom: string): Promise<Unit> {
        this.manage();
        const subject = this.all().subjects.find((x) => x.id === subjectId);
        if (!subject) throw new Error("Choose a subject to import into.");
        const courseHref = `/grow/books?course=${imported.courseId}`;
        const unit = await this.addUnit({
            subjectId,
            title: imported.title,
            summary: `${imported.weeks} week${imported.weeks === 1 ? "" : "s"} · imported from the Library`,
            sourceCourseId: imported.courseId,
            sourceHref: imported.assignments[0]?.href ?? courseHref,
            sourceLabel: `${imported.title} · Library course`,
        });
        const rows: Assignment[] = imported.assignments.map((a, i) => ({
            id: uid("asn"),
            spaceId: this.ctx.space.id,
            unitId: unit.id,
            subjectId,
            childMemberId: subject.childMemberId,
            title: a.title,
            instructions: "",
            dueDate: addDaysIso(dueFrom, i * 7),
            status: "not-started",
            sprouts: 15,
            linkedItemType: "book",
            linkedItemTitle: imported.title,
            linkedHref: a.href || courseHref,
            attachments: [],
            pictureLed: false,
            creditedAt: null,
            createdAt: now(),
        }));
        this.write((s) => {
            s.assignments = [...s.assignments, ...rows];
        });
        return unit;
    }

    // -- assignments ---------------------------------------------------------

    async addAssignment(input: NewAssignment): Promise<Assignment> {
        this.manage();
        const s0 = this.all();
        const unit = s0.units.find((u) => u.id === input.unitId);
        if (!unit) throw new Error("Choose a unit for this piece of work.");
        const subject = s0.subjects.find((x) => x.id === unit.subjectId);
        if (!subject) throw new Error("That unit has lost its subject.");
        const a: Assignment = {
            id: uid("asn"),
            spaceId: this.ctx.space.id,
            unitId: unit.id,
            subjectId: subject.id,
            childMemberId: subject.childMemberId,
            title: input.title.trim(),
            instructions: input.instructions?.trim() ?? "",
            dueDate: input.dueDate,
            status: "not-started",
            sprouts: Math.max(0, Math.round(input.sprouts ?? 10)),
            linkedItemType: input.linkedItemType ?? "none",
            linkedItemTitle: input.linkedItemTitle,
            linkedHref: input.linkedHref,
            attachments: input.attachments ?? [],
            pictureLed: input.pictureLed ?? false,
            creditedAt: null,
            createdAt: now(),
        };
        this.write((st) => {
            st.assignments = [...st.assignments, a];
        });
        return a;
    }

    async updateAssignment(id: string, patch: Partial<Pick<Assignment, "title" | "instructions" | "dueDate" | "sprouts" | "linkedItemType" | "linkedItemTitle" | "linkedHref" | "attachments" | "pictureLed">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.assignments = s.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a));
        });
    }

    async removeAssignment(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.assignments = s.assignments.filter((a) => a.id !== id);
            s.submissions = s.submissions.filter((x) => x.assignmentId !== id);
            s.grades = s.grades.filter((g) => g.assignmentId !== id);
        });
    }

    async setStatus(id: string, status: AssignmentStatus): Promise<void> {
        const a = this.assignment(id);
        this.mine(a.childMemberId);
        // Only a parent may mark something graded, and only through gradeAssignment.
        if (status === "graded" && !this.ctx.can("curricula.manage")) this.deny();
        this.write((s) => {
            s.assignments = s.assignments.map((x) => (x.id === id ? { ...x, status } : x));
        });
    }

    async submitAssignment(id: string, text: string, mediaUrls: string[] = []): Promise<Submission> {
        const a = this.assignment(id);
        this.mine(a.childMemberId);
        const memberId = this.ctx.role === "child" ? this.ctx.me.id : a.childMemberId;
        const submission: Submission = {
            id: uid("sbm"),
            spaceId: this.ctx.space.id,
            assignmentId: id,
            memberId,
            text: text.trim(),
            mediaUrls,
            submittedAt: now(),
        };
        this.write((s) => {
            s.submissions = [...s.submissions.filter((x) => !(x.assignmentId === id && x.memberId === memberId)), submission];
            s.assignments = s.assignments.map((x) => (x.id === id ? { ...x, status: x.status === "graded" ? "graded" : "submitted" } : x));
        });
        return submission;
    }

    /** Mark the Sprouts paid and hand the amount back; the page credits them. */
    async markCredited(id: string): Promise<number> {
        const a = this.assignment(id);
        this.mine(a.childMemberId);
        if (a.creditedAt) return 0;
        this.write((s) => {
            s.assignments = s.assignments.map((x) => (x.id === id ? { ...x, creditedAt: now() } : x));
        });
        return a.sprouts;
    }

    // -- grades --------------------------------------------------------------

    async gradeAssignment(assignmentId: string, input: NewGrade): Promise<Grade> {
        this.manage();
        this.assignment(assignmentId);
        const score = Math.max(0, Math.min(100, Math.round(input.score)));
        const grade: Grade = {
            assignmentId,
            spaceId: this.ctx.space.id,
            score,
            letter: input.letter?.trim() || letterFor(score),
            rubric: input.rubric ?? [],
            comment: input.comment?.trim() ?? "",
            gradedBy: this.ctx.me.id,
            gradedAt: now(),
            visibleToChild: input.visibleToChild,
        };
        this.write((s) => {
            s.grades = [...s.grades.filter((g) => g.assignmentId !== assignmentId), grade];
            s.assignments = s.assignments.map((a) => (a.id === assignmentId ? { ...a, status: "graded" } : a));
        });
        return grade;
    }

    async setGradeVisibility(assignmentId: string, visibleToChild: boolean): Promise<void> {
        this.manage();
        this.write((s) => {
            s.grades = s.grades.map((g) => (g.assignmentId === assignmentId ? { ...g, visibleToChild } : g));
        });
    }

    async removeGrade(assignmentId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.grades = s.grades.filter((g) => g.assignmentId !== assignmentId);
            s.assignments = s.assignments.map((a) => (a.id === assignmentId && a.status === "graded" ? { ...a, status: "submitted" } : a));
        });
    }

    // -- badges --------------------------------------------------------------

    async addBadge(input: NewBadge): Promise<Badge> {
        this.manage();
        const badge: Badge = {
            id: uid("bdg"),
            spaceId: this.ctx.space.id,
            name: input.name.trim(),
            kind: input.kind,
            virtueOrSkill: input.virtueOrSkill.trim(),
            subjectId: input.subjectId ?? null,
            criteria: input.criteria.trim(),
            icon: input.icon || "🏅",
            levels: input.levels?.length ? input.levels : ["Bronze", "Silver", "Gold"],
            createdAt: now(),
        };
        this.write((s) => {
            s.badges = [...s.badges, badge];
        });
        return badge;
    }

    async removeBadge(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.badges = s.badges.filter((b) => b.id !== id);
            s.awards = s.awards.filter((a) => a.badgeId !== id);
        });
    }

    async awardBadge(badgeId: string, memberId: string, level: string, note: string): Promise<BadgeAward> {
        this.manage();
        const badge = this.all().badges.find((b) => b.id === badgeId);
        if (!badge) throw new Error("That badge is gone.");
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member || member.role !== "child") throw new Error("Badges are for the children.");
        const awarded: BadgeAward = {
            id: uid("awd"),
            spaceId: this.ctx.space.id,
            badgeId,
            memberId,
            level: level || badge.levels[0] || "Bronze",
            note: note.trim(),
            awardedBy: this.ctx.me.id,
            awardedAt: now(),
        };
        this.write((s) => {
            s.awards = [...s.awards, awarded];
        });
        return awarded;
    }

    async revokeAward(awardId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.awards = s.awards.filter((a) => a.id !== awardId);
        });
    }

    // -- milestones ----------------------------------------------------------

    async addMilestone(input: NewMilestone): Promise<DevMilestone> {
        this.manage();
        const pct = Math.max(0, Math.min(100, Math.round(input.progressPct ?? 0)));
        const m: DevMilestone = {
            id: uid("mil"),
            spaceId: this.ctx.space.id,
            memberId: input.memberId,
            band: input.band,
            title: input.title.trim(),
            note: input.note?.trim() ?? "",
            progressPct: pct,
            achievedAt: pct >= 100 ? this.ctx.today : null,
            photoUrl: input.photoUrl,
            celebratedAt: null,
            createdAt: now(),
        };
        this.write((s) => {
            s.milestones = [...s.milestones, m];
        });
        return m;
    }

    async updateMilestone(id: string, patch: Partial<Pick<DevMilestone, "title" | "note" | "progressPct" | "photoUrl" | "achievedAt">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.milestones = s.milestones.map((m) => {
                if (m.id !== id) return m;
                const next = { ...m, ...patch };
                if (typeof patch.progressPct === "number") {
                    next.progressPct = Math.max(0, Math.min(100, Math.round(patch.progressPct)));
                    // Reaching a hundred sets the date and re-arms the celebration.
                    if (next.progressPct >= 100 && !m.achievedAt) next.achievedAt = this.ctx.today;
                    if (next.progressPct < 100) {
                        next.achievedAt = null;
                        next.celebratedAt = null;
                    }
                }
                return next;
            });
        });
    }

    async celebrateMilestone(id: string): Promise<void> {
        if (this.ctx.role === "guest") this.deny();
        this.write((s) => {
            s.milestones = s.milestones.map((m) => (m.id === id ? { ...m, celebratedAt: now() } : m));
        });
    }

    async removeMilestone(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.milestones = s.milestones.filter((m) => m.id !== id);
        });
    }

    // -- character tracks ----------------------------------------------------

    async addTrack(input: NewTrack): Promise<CharacterTrack> {
        this.manage();
        const track: CharacterTrack = {
            id: uid("trk"),
            spaceId: this.ctx.space.id,
            month: input.month,
            virtue: input.virtue.trim(),
            valueLabel: input.valueLabel.trim(),
            intro: input.intro?.trim() ?? "",
            challenges: input.challenges.map((c) => c.trim()).filter(Boolean),
            sprouts: Math.max(0, Math.round(input.sprouts ?? 10)),
            createdAt: now(),
        };
        this.write((s) => {
            s.tracks = [...s.tracks.filter((t) => t.month !== track.month), track];
        });
        return track;
    }

    async updateTrack(id: string, patch: Partial<Pick<CharacterTrack, "virtue" | "valueLabel" | "intro" | "challenges" | "sprouts">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.tracks = s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t));
        });
    }

    async removeTrack(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.tracks = s.tracks.filter((t) => t.id !== id);
            s.logs = s.logs.filter((l) => l.trackId !== id);
        });
    }

    async logChallenge(trackId: string, memberId: string, challengeIndex: number, reflection: string, date?: string): Promise<CharacterLog> {
        this.mine(memberId);
        const track = this.all().tracks.find((t) => t.id === trackId);
        if (!track) throw new Error("That track is gone.");
        const on = date ?? this.ctx.today;
        const existing = this.all().logs.find((l) => l.trackId === trackId && l.memberId === memberId && l.date === on);
        if (existing) throw new Error("Today's challenge is already ticked.");
        const entry: CharacterLog = {
            id: uid("clg"),
            spaceId: this.ctx.space.id,
            trackId,
            memberId,
            date: on,
            challengeIndex,
            reflection: reflection.trim(),
            sprouts: track.sprouts,
            createdAt: now(),
        };
        this.write((s) => {
            s.logs = [...s.logs, entry];
        });
        return entry;
    }

    async removeLog(id: string): Promise<void> {
        const entry = this.all().logs.find((l) => l.id === id);
        if (!entry) return;
        this.mine(entry.memberId);
        this.write((s) => {
            s.logs = s.logs.filter((l) => l.id !== id);
        });
    }
}
