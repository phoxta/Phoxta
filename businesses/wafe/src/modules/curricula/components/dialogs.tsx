import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgeBand, Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { SUBJECT_BG, SUBJECT_DOT } from "./pieces";
import { SUBJECT_COLOURS, type Assignment, type Badge, type DevMilestone, type ImportableUnit, type LinkedItemType, type NewAssignment, type NewBadge, type NewMilestone, type NewSubject, type NewUnit, type Subject, type SubjectColour, type Unit } from "../types";

/**
 * The parent's editors.
 *
 * All of them are real forms — labelled inputs, inline errors, Enter submits —
 * and none of them is reachable by a child: the pages gate them on
 * `curricula.manage`, and the repos refuse them a second time.
 */

export function Labelled({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
    return (
        <label className={cn("block", className)}>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-caption">{hint}</span>}
        </label>
    );
}

export const selectCls = "h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";
export const areaCls = "w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand";

export function ColourPicker({ value, onChange }: { value: SubjectColour; onChange: (c: SubjectColour) => void }) {
    return (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Subject colour">
            {SUBJECT_COLOURS.map((c) => (
                <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={value === c}
                    aria-label={c}
                    onClick={() => onChange(c)}
                    className={cn("grid size-9 place-items-center rounded-full border-2", SUBJECT_BG[c], value === c ? "border-ink" : "border-transparent")}
                >
                    <span className={cn("size-3.5 rounded-full", SUBJECT_DOT[c])} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

export function SubjectDialog({ open, onClose, kids, subject, defaultChildId, onSave }: { open: boolean; onClose: () => void; kids: Member[]; subject?: Subject; defaultChildId?: string; onSave: (input: NewSubject) => Promise<void> }) {
    const [childMemberId, setChild] = useState(subject?.childMemberId ?? defaultChildId ?? kids[0]?.id ?? "");
    const [name, setName] = useState(subject?.name ?? "");
    const [colour, setColour] = useState<SubjectColour>(subject?.colour ?? "grow");
    const [term, setTerm] = useState(subject?.term ?? "");
    const [kind, setKind] = useState<Subject["kind"]>(subject?.kind ?? "home-ed");
    const [hours, setHours] = useState(String(subject?.targetHoursWeek ?? 3));
    const [note, setNote] = useState(subject?.note ?? "");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setChild(subject?.childMemberId ?? defaultChildId ?? kids[0]?.id ?? "");
        setName(subject?.name ?? "");
        setColour(subject?.colour ?? "grow");
        setTerm(subject?.term ?? "");
        setKind(subject?.kind ?? "home-ed");
        setHours(String(subject?.targetHoursWeek ?? 3));
        setNote(subject?.note ?? "");
        setErr(null);
    }, [open, subject, defaultChildId, kids]);

    return (
        <Dialog open={open} onClose={onClose} title={subject ? "Edit subject" : "New subject"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim()) return setErr("Give the subject a name.");
                    if (!childMemberId) return setErr("Every subject belongs to one child.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({ childMemberId, name, colour, term, targetHoursWeek: Number(hours) || 0, kind, note });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <Labelled label="Whose subject">
                    <select value={childMemberId} onChange={(e) => setChild(e.target.value)} className={selectCls}>
                        {kids.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </Labelled>
                <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maths" />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Year 5 · Autumn" />
                    <Field label="Hours a week" type="number" min={0} max={40} value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
                <Labelled label="Kind">
                    <select value={kind} onChange={(e) => setKind(e.target.value as Subject["kind"])} className={selectCls}>
                        <option value="home-ed">Home education</option>
                        <option value="school">School support</option>
                        <option value="exam">Exam course</option>
                    </select>
                </Labelled>
                <Labelled label="Colour">
                    <ColourPicker value={colour} onChange={setColour} />
                </Labelled>
                <Labelled label="Note" hint="Exam board, curriculum, or how it actually runs in your week.">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={areaCls} />
                </Labelled>
                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {subject ? "Save" : "Add subject"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export function UnitDialog({ open, onClose, subjects, unit, defaultSubjectId, onSave }: { open: boolean; onClose: () => void; subjects: Subject[]; unit?: Unit; defaultSubjectId?: string; onSave: (input: NewUnit) => Promise<void> }) {
    const [subjectId, setSubjectId] = useState(unit?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "");
    const [title, setTitle] = useState(unit?.title ?? "");
    const [summary, setSummary] = useState(unit?.summary ?? "");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSubjectId(unit?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "");
        setTitle(unit?.title ?? "");
        setSummary(unit?.summary ?? "");
        setErr(null);
    }, [open, unit, defaultSubjectId, subjects]);

    return (
        <Dialog open={open} onClose={onClose} title={unit ? "Edit unit" : "New unit"}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) return setErr("Give the unit a title.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({ subjectId, title, summary });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                {!unit && (
                    <Labelled label="Subject">
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectCls}>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                )}
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fractions of amounts" />
                <Labelled label="What it covers">
                    <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className={areaCls} />
                </Labelled>
                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {unit ? "Save" : "Add unit"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

const LINK_OPTIONS: Array<{ v: LinkedItemType; label: string; placeholder: string }> = [
    { v: "none", label: "No link", placeholder: "" },
    { v: "lesson", label: "A lesson in Learning", placeholder: "/grow/learning" },
    { v: "book", label: "A book or course in the Library", placeholder: "/grow/books" },
    { v: "bible", label: "A passage in the Bible", placeholder: "/grow/bible" },
    { v: "project", label: "A project", placeholder: "/execute/projects" },
];

export function AssignmentDialog({ open, onClose, units, subjects, assignment, defaultUnitId, defaultDue, onSave }: { open: boolean; onClose: () => void; units: Unit[]; subjects: Subject[]; assignment?: Assignment; defaultUnitId?: string; defaultDue: string; onSave: (input: NewAssignment) => Promise<void> }) {
    const [unitId, setUnitId] = useState(assignment?.unitId ?? defaultUnitId ?? units[0]?.id ?? "");
    const [title, setTitle] = useState(assignment?.title ?? "");
    const [instructions, setInstructions] = useState(assignment?.instructions ?? "");
    const [dueDate, setDue] = useState(assignment?.dueDate ?? defaultDue);
    const [sprouts, setSprouts] = useState(String(assignment?.sprouts ?? 10));
    const [linkedItemType, setLinkType] = useState<LinkedItemType>(assignment?.linkedItemType ?? "none");
    const [linkedItemTitle, setLinkTitle] = useState(assignment?.linkedItemTitle ?? "");
    const [linkedHref, setLinkHref] = useState(assignment?.linkedHref ?? "");
    const [pictureLed, setPictureLed] = useState(assignment?.pictureLed ?? false);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setUnitId(assignment?.unitId ?? defaultUnitId ?? units[0]?.id ?? "");
        setTitle(assignment?.title ?? "");
        setInstructions(assignment?.instructions ?? "");
        setDue(assignment?.dueDate ?? defaultDue);
        setSprouts(String(assignment?.sprouts ?? 10));
        setLinkType(assignment?.linkedItemType ?? "none");
        setLinkTitle(assignment?.linkedItemTitle ?? "");
        setLinkHref(assignment?.linkedHref ?? "");
        setPictureLed(assignment?.pictureLed ?? false);
        setErr(null);
    }, [open, assignment, defaultUnitId, defaultDue, units]);

    const grouped = useMemo(() => {
        const bySubject = new Map<string, Unit[]>();
        for (const u of units) bySubject.set(u.subjectId, [...(bySubject.get(u.subjectId) ?? []), u]);
        return subjects.map((s) => ({ subject: s, units: bySubject.get(s.id) ?? [] })).filter((g) => g.units.length);
    }, [units, subjects]);

    const link = LINK_OPTIONS.find((o) => o.v === linkedItemType) ?? LINK_OPTIONS[0];

    return (
        <Dialog open={open} onClose={onClose} title={assignment ? "Edit the work" : "Set work"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) return setErr("What is the work?");
                    if (!unitId) return setErr("Pick the unit it belongs to.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({
                            unitId,
                            title,
                            instructions,
                            dueDate,
                            sprouts: Number(sprouts) || 0,
                            linkedItemType,
                            linkedItemTitle: linkedItemTitle || undefined,
                            linkedHref: linkedHref || undefined,
                            pictureLed,
                        });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                {!assignment && (
                    <Labelled label="Unit">
                        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={selectCls}>
                            {grouped.map((g) => (
                                <optgroup key={g.subject.id} label={g.subject.name}>
                                    {g.units.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.title}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </Labelled>
                )}
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fractions: the shaded-shape sheet" />
                <Labelled label="Instructions" hint="Say it the way you'd say it at the kitchen table.">
                    <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className={areaCls} />
                </Labelled>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Due" type="date" value={dueDate} onChange={(e) => setDue(e.target.value)} />
                    <Field label="Sprouts" type="number" min={0} max={200} value={sprouts} onChange={(e) => setSprouts(e.target.value)} />
                </div>
                <Labelled label="Link it to something">
                    <select value={linkedItemType} onChange={(e) => setLinkType(e.target.value as LinkedItemType)} className={selectCls}>
                        {LINK_OPTIONS.map((o) => (
                            <option key={o.v} value={o.v}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </Labelled>
                {linkedItemType !== "none" && (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <Field label="What it is" value={linkedItemTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Charlotte's Web" />
                        <Field label="Where it lives" value={linkedHref} onChange={(e) => setLinkHref(e.target.value)} placeholder={link.placeholder} />
                    </div>
                )}
                <div className="flex items-start gap-3 rounded-md bg-page px-4 py-3">
                    <input id="assignment-picture-led" type="checkbox" checked={pictureLed} onChange={(e) => setPictureLed(e.target.checked)} className="mt-1 size-4" />
                    <label htmlFor="assignment-picture-led">
                        <span className="block text-md font-semibold">Picture-led</span>
                        <span className="block text-xs text-caption">For the Little band: the tile shows a picture and reads itself aloud, and handing it in asks for no typing.</span>
                    </label>
                </div>
                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {assignment ? "Save" : "Set the work"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Milestone
// ---------------------------------------------------------------------------

export function MilestoneDialog({ open, onClose, kids, milestone, defaultChildId, onSave }: { open: boolean; onClose: () => void; kids: Member[]; milestone?: DevMilestone; defaultChildId?: string; onSave: (input: NewMilestone) => Promise<void> }) {
    const [memberId, setMember] = useState(milestone?.memberId ?? defaultChildId ?? kids[0]?.id ?? "");
    const [title, setTitle] = useState(milestone?.title ?? "");
    const [note, setNote] = useState(milestone?.note ?? "");
    const [progress, setProgress] = useState(milestone?.progressPct ?? 0);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setMember(milestone?.memberId ?? defaultChildId ?? kids[0]?.id ?? "");
        setTitle(milestone?.title ?? "");
        setNote(milestone?.note ?? "");
        setProgress(milestone?.progressPct ?? 0);
        setErr(null);
    }, [open, milestone, defaultChildId, kids]);

    const band: AgeBand = kids.find((c) => c.id === memberId)?.ageBand ?? "junior";

    return (
        <Dialog open={open} onClose={onClose} title={milestone ? "Edit milestone" : "New milestone"}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) return setErr("What is the milestone?");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({ memberId, band, title, note, progressPct: progress });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                {!milestone && (
                    <Labelled label="Whose milestone">
                        <select value={memberId} onChange={(e) => setMember(e.target.value)} className={selectCls}>
                            {kids.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                )}
                <Field label="Milestone" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reads aloud with expression" />
                <Labelled label="What it looks like when it's there">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={areaCls} />
                </Labelled>
                <Labelled label={`Progress · ${progress}%`} hint="A hundred per cent asks the family to celebrate it.">
                    <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full" aria-label="Progress" />
                </Labelled>
                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {milestone ? "Save" : "Add milestone"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const ICONS = ["🏅", "📚", "➗", "🔬", "🧠", "✍️", "🗣️", "💻", "🎹", "🤝", "💛", "🌱", "🦁", "🎨", "⚽", "🍲"];

export function BadgeDialog({ open, onClose, subjects, onSave }: { open: boolean; onClose: () => void; subjects: Subject[]; onSave: (input: NewBadge) => Promise<void> }) {
    const [name, setName] = useState("");
    const [kind, setKind] = useState<Badge["kind"]>("skill");
    const [virtueOrSkill, setVirtue] = useState("");
    const [criteria, setCriteria] = useState("");
    const [icon, setIcon] = useState("🏅");
    const [subjectId, setSubjectId] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName("");
        setKind("skill");
        setVirtue("");
        setCriteria("");
        setIcon("🏅");
        setSubjectId("");
        setErr(null);
    }, [open]);

    return (
        <Dialog open={open} onClose={onClose} title="New badge">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim()) return setErr("Give the badge a name.");
                    if (!criteria.trim()) return setErr("Say what earns it — a badge without criteria is a sticker.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({ name, kind, virtueOrSkill: virtueOrSkill || name, criteria, icon, subjectId: subjectId || null });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Memory Master" />
                <Labelled label="Icon">
                    <div className="flex flex-wrap gap-2">
                        {ICONS.map((i) => (
                            <button key={i} type="button" aria-pressed={icon === i} onClick={() => setIcon(i)} className={cn("grid size-10 place-items-center rounded-full text-2xl", icon === i ? "bg-brand-soft ring-2 ring-brand" : "bg-page")}>
                                <span aria-hidden="true">{i}</span>
                                <span className="sr-only">{i}</span>
                            </button>
                        ))}
                    </div>
                </Labelled>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Labelled label="Kind">
                        <select value={kind} onChange={(e) => setKind(e.target.value as Badge["kind"])} className={selectCls}>
                            <option value="skill">Skill</option>
                            <option value="virtue">Virtue</option>
                        </select>
                    </Labelled>
                    <Field label="Skill or virtue" value={virtueOrSkill} onChange={(e) => setVirtue(e.target.value)} placeholder="Scripture" />
                </div>
                <Labelled label="Subject (optional)">
                    <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectCls}>
                        <option value="">Not tied to a subject</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </Labelled>
                <Labelled label="What earns it">
                    <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={2} className={areaCls} placeholder="Say twenty memory verses from memory, references and all." />
                </Labelled>
                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add badge
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

export function AwardDialog({ open, onClose, badges, kids, defaultBadgeId, defaultChildId, onAward }: { open: boolean; onClose: () => void; badges: Badge[]; kids: Member[]; defaultBadgeId?: string; defaultChildId?: string; onAward: (badgeId: string, memberId: string, level: string, note: string) => Promise<void> }) {
    const [badgeId, setBadgeId] = useState(defaultBadgeId ?? badges[0]?.id ?? "");
    const [memberId, setMember] = useState(defaultChildId ?? kids[0]?.id ?? "");
    const [level, setLevel] = useState("");
    const [note, setNote] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const badge = badges.find((b) => b.id === badgeId);

    useEffect(() => {
        if (!open) return;
        setBadgeId(defaultBadgeId ?? badges[0]?.id ?? "");
        setMember(defaultChildId ?? kids[0]?.id ?? "");
        setNote("");
        setErr(null);
    }, [open, defaultBadgeId, defaultChildId, badges, kids]);

    useEffect(() => {
        setLevel(badge?.levels[0] ?? "Bronze");
    }, [badge]);

    return (
        <Dialog open={open} onClose={onClose} title="Award a badge">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!badgeId || !memberId) return setErr("Choose a badge and a child.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onAward(badgeId, memberId, level, note);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <Labelled label="Badge">
                    <select value={badgeId} onChange={(e) => setBadgeId(e.target.value)} className={selectCls}>
                        {badges.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.icon} {b.name}
                            </option>
                        ))}
                    </select>
                </Labelled>
                {badge && <p className="-mt-2 text-sm leading-5 text-muted">{badge.criteria}</p>}
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Labelled label="To">
                        <select value={memberId} onChange={(e) => setMember(e.target.value)} className={selectCls}>
                            {kids.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Level">
                        <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
                            {(badge?.levels.length ? badge.levels : ["Bronze", "Silver", "Gold"]).map((l) => (
                                <option key={l} value={l}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                </div>
                <Labelled label="Why they earned it" hint="This is what they will read, and what the family sees on the timeline.">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={areaCls} placeholder="Read aloud every single day in August." />
                </Labelled>
                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Award it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Import a Library course as a unit
// ---------------------------------------------------------------------------

export function ImportUnitDialog({ open, onClose, available, subjects, today, onImport }: { open: boolean; onClose: () => void; available: ImportableUnit[]; subjects: Subject[]; today: string; onImport: (subjectId: string, unit: ImportableUnit, dueFrom: string) => Promise<void> }) {
    const [unitId, setUnitId] = useState(available[0]?.id ?? "");
    const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
    const [dueFrom, setDueFrom] = useState(today);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setUnitId(available[0]?.id ?? "");
        setSubjectId(subjects[0]?.id ?? "");
        setDueFrom(today);
        setErr(null);
    }, [open, available, subjects, today]);

    const chosen = available.find((u) => u.id === unitId);

    return (
        <Dialog open={open} onClose={onClose} title="Import from the Library">
            {available.length === 0 ? (
                <div className="flex flex-col gap-3">
                    <p className="text-md leading-6 text-muted">
                        Nothing has been exported from the Library yet. Open a course in <strong>Library &amp; courses</strong> and choose &ldquo;Export to Curricula&rdquo; — it arrives here as a unit that still links back to the course.
                    </p>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            ) : (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!chosen) return setErr("Choose a course.");
                        if (!subjectId) return setErr("Choose a subject to import it into.");
                        setBusy(true);
                        setErr(null);
                        try {
                            await onImport(subjectId, chosen, dueFrom);
                            onClose();
                        } catch (e2) {
                            setErr(e2 instanceof Error ? e2.message : "That didn't import.");
                        } finally {
                            setBusy(false);
                        }
                    }}
                    className="flex flex-col gap-4"
                >
                    <Labelled label="Course">
                        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={selectCls}>
                            {available.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.title} · {u.weeks} weeks
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Into which subject">
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectCls}>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Field label="First week due" type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} hint="One assignment a week from this date." />
                    {chosen && (
                        <p className="rounded-md bg-page px-4 py-3 text-sm leading-5 text-muted">
                            {chosen.assignments.length} assignment{chosen.assignments.length === 1 ? "" : "s"} will be created, each one linking straight back to its week in the course.
                        </p>
                    )}
                    {err && <p className="text-sm text-danger-ink">{err}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Import
                        </Button>
                    </div>
                </form>
            )}
        </Dialog>
    );
}
