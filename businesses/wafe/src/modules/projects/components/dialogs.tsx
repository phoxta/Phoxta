import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { isoDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { MemberMultiPicker, VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { ranking } from "../derive";
import type { Comparison, NewCard, NewComparison, NewDecision, NewProject, Project, ProjectCard, ProjectCost, ProjectKind, ProjectStatus, ProjectsState } from "../types";
import { KIND_LABEL, PROJECT_STATUS, STATUS_LABEL } from "../types";

/**
 * Every form in the module, in one file — real forms, labelled inputs, inline
 * errors, and no write that the repo would refuse hidden behind a button that
 * looks like it would work.
 */

/** The Finance module's stable category keys, so a budget line can be linked. */
const FINANCE_CATEGORIES: Array<{ id: string; label: string }> = [
    { id: "", label: "Not linked to Finance" },
    { id: "housing", label: "Housing" },
    { id: "groceries", label: "Groceries" },
    { id: "education", label: "Education" },
    { id: "transport", label: "Transport" },
    { id: "fun", label: "Fun" },
    { id: "giving", label: "Giving" },
    { id: "savings", label: "Savings" },
];

export function Select({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
    return (
        <label className={cn("block", className)}>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                {children}
            </select>
        </label>
    );
}

export function TextArea({ label, value, onChange, rows = 3, placeholder, className }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; className?: string }) {
    return (
        <label className={cn("block", className)}>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand" />
        </label>
    );
}

function Err({ children }: { children: string | null }) {
    if (!children) return null;
    return (
        <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {children}
        </p>
    );
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export function ProjectDialog({ open, onClose, project, onSave }: { open: boolean; onClose: () => void; project?: Project; onSave: (input: NewProject) => Promise<void> }) {
    const { members, me, role, space } = useSpace();
    const editing = Boolean(project);
    const [title, setTitle] = useState(project?.title ?? "");
    const [summary, setSummary] = useState(project?.summary ?? "");
    const [kind, setKind] = useState<ProjectKind>(project?.kind ?? "family");
    const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planning");
    const [owner, setOwner] = useState(project?.ownerMemberId ?? me.id);
    const [memberIds, setMemberIds] = useState<string[]>(project?.members.map((m) => m.memberId) ?? [me.id]);
    const [startDate, setStartDate] = useState(project?.startDate ?? isoDate());
    const [endDate, setEndDate] = useState(project?.endDate ?? "");
    const [budget, setBudget] = useState(project?.budgetCents ? String(project.budgetCents / 100) : "");
    const [category, setCategory] = useState(project?.financeCategoryId ?? "");
    const [goalLabel, setGoalLabel] = useState(project?.goalLabel ?? "");
    const [tags, setTags] = useState((project?.tags ?? []).join(", "));
    const [visibility, setVisibility] = useState<Visibility>(project?.visibility ?? "family");
    const [sharedWith, setSharedWith] = useState<string[]>(project?.sharedWith ?? []);
    const [childSafe, setChildSafe] = useState(project?.childSafe ?? true);
    const [valueId, setValueId] = useState(project?.valueId ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canPickOwner = role === "parent";

    return (
        <Dialog open={open} onClose={onClose} title={editing ? "Edit project" : "New project"} wide>
            <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setError("Give the project a name.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({
                            title,
                            summary,
                            kind,
                            status,
                            ownerMemberId: owner,
                            memberIds,
                            startDate,
                            endDate: endDate || null,
                            budgetCents: budget.trim() ? Math.round(Number(budget) * 100) : null,
                            financeCategoryId: category || null,
                            financeCategoryLabel: FINANCE_CATEGORIES.find((c) => c.id === category)?.label ?? "",
                            goalLabel,
                            valueId: valueId || null,
                            tags: tags
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            visibility,
                            sharedWith,
                            childSafe,
                        });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Err>{error}</Err>
                <Field label="Name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kitchen refresh" required />
                <TextArea label="What it is" value={summary} onChange={setSummary} placeholder="One or two sentences, so it still makes sense in a year." />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Select label="Kind" value={kind} onChange={(v) => setKind(v as ProjectKind)}>
                        {(Object.keys(KIND_LABEL) as ProjectKind[]).map((k) => (
                            <option key={k} value={k}>
                                {KIND_LABEL[k]}
                            </option>
                        ))}
                    </Select>
                    <Select label="Status" value={status} onChange={(v) => setStatus(v as ProjectStatus)}>
                        {PROJECT_STATUS.map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                            </option>
                        ))}
                    </Select>
                </div>
                {canPickOwner && (
                    <Select label="Owner" value={owner} onChange={setOwner}>
                        {members
                            .filter((m) => m.role === "parent" || m.ageBand === "young-adult")
                            .map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name} · {m.relation}
                                </option>
                            ))}
                    </Select>
                )}
                <MemberMultiPicker value={memberIds} onChange={setMemberIds} label="Who is on it" />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="Starts" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Field label="Lands by" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} hint="Leave empty if it runs until it's done." />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="Budget" type="number" min={0} step="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="6500" hint="In pounds. Leave empty for no budget." />
                    <Select label="Spends from" value={category} onChange={setCategory}>
                        {FINANCE_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.label}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="Serves the goal" value={goalLabel} onChange={(e) => setGoalLabel(e.target.value)} placeholder="A home that welcomes people" />
                    <Select label="Value" value={valueId} onChange={setValueId}>
                        <option value="">No value</option>
                        {space.values.map((v) => (
                            <option key={v} value={v}>
                                {v}
                            </option>
                        ))}
                    </Select>
                </div>
                <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="home, kitchen, 2026" hint="Comma separated." />
                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />
                <label className="flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    The children on this project may see it
                </label>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {editing ? "Save" : "Create project"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function CardDialog({ open, onClose, projectId, card, onSave }: { open: boolean; onClose: () => void; projectId: string; card?: ProjectCard; onSave: (input: NewCard) => Promise<void> }) {
    const [title, setTitle] = useState(card?.title ?? "");
    const [notes, setNotes] = useState(card?.notes ?? "");
    const [who, setWho] = useState<string[]>(card?.assigneeMemberIds ?? []);
    const [due, setDue] = useState(card?.dueAt ? card.dueAt.slice(0, 10) : "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <Dialog open={open} onClose={onClose} title={card ? "Edit card" : "Add to the board"}>
            <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setError("What is the step?");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ projectId, title, notes, assigneeMemberIds: who, dueAt: due ? `${due}T18:00:00.000Z` : null });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Err>{error}</Err>
                <Field label="Step" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book the electrician" required />
                <TextArea label="Notes" value={notes} onChange={setNotes} rows={3} />
                <MemberMultiPicker value={who} onChange={setWho} label="Who is doing it" />
                <Field label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {card ? "Save" : "Add card"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export function ComparisonDialog({ open, onClose, projectId, onSave }: { open: boolean; onClose: () => void; projectId: string; onSave: (input: NewComparison) => Promise<void> }) {
    const [title, setTitle] = useState("");
    const [criteria, setCriteria] = useState<Array<{ label: string; weight: number }>>([
        { label: "", weight: 3 },
        { label: "", weight: 3 },
    ]);
    const [options, setOptions] = useState<Array<{ label: string; note: string }>>([
        { label: "", note: "" },
        { label: "", note: "" },
    ]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <Dialog open={open} onClose={onClose} title="New comparison" wide>
            <form
                className="flex flex-col gap-5"
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ projectId, title, criteria: criteria.filter((c) => c.label.trim()), options: options.filter((o) => o.label.trim()) });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Err>{error}</Err>
                <Field label="What are we choosing between" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Three sixth forms" required />

                <fieldset>
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">The options</legend>
                    <ul className="flex flex-col gap-2">
                        {options.map((o, i) => (
                            <li key={i} className="flex gap-2">
                                <input
                                    value={o.label}
                                    onChange={(e) => setOptions(options.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))}
                                    placeholder={`Option ${i + 1}`}
                                    aria-label={`Option ${i + 1}`}
                                    className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                />
                                <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} aria-label={`Remove option ${i + 1}`} className="grid size-11 shrink-0 place-items-center rounded-md text-caption hover:text-danger-ink">
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setOptions([...options, { label: "", note: "" }])}>
                        <Plus size={14} aria-hidden="true" /> Add an option
                    </Button>
                </fieldset>

                <fieldset>
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">What matters, and how much</legend>
                    <ul className="flex flex-col gap-2">
                        {criteria.map((c, i) => (
                            <li key={i} className="flex items-center gap-2">
                                <input
                                    value={c.label}
                                    onChange={(e) => setCriteria(criteria.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))}
                                    placeholder={`Criterion ${i + 1}`}
                                    aria-label={`Criterion ${i + 1}`}
                                    className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                />
                                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                                    Weight
                                    <select value={c.weight} onChange={(e) => setCriteria(criteria.map((x, j) => (i === j ? { ...x, weight: Number(e.target.value) } : x)))} className="h-11 rounded-md border border-line-strong bg-card px-2 text-md">
                                        {[1, 2, 3, 4, 5].map((w) => (
                                            <option key={w} value={w}>
                                                {w}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button type="button" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))} aria-label={`Remove criterion ${i + 1}`} className="grid size-11 shrink-0 place-items-center rounded-md text-caption hover:text-danger-ink">
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCriteria([...criteria, { label: "", weight: 3 }])}>
                        <Plus size={14} aria-hidden="true" /> Add a criterion
                    </Button>
                </fieldset>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Create the table
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

export function DecisionDialog({
    open,
    onClose,
    state,
    projectId,
    comparison,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    state: ProjectsState;
    projectId: string;
    comparison?: Comparison;
    onSave: (input: NewDecision) => Promise<void>;
}) {
    const rows = comparison ? ranking(state, comparison) : [];
    const [decision, setDecision] = useState(rows[0] ? `Chose ${rows[0].option.label}` : "");
    const [because, setBecause] = useState("");
    const [headline, setHeadline] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <Dialog open={open} onClose={onClose} title="Write the decision down" wide>
            <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!decision.trim()) {
                        setError("Say what was chosen.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ projectId, comparisonId: comparison?.id ?? null, decision, because, headline });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Err>{error}</Err>
                {comparison && rows.length > 0 && (
                    <fieldset>
                        <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">From {comparison.title}</legend>
                        <ul className="flex flex-wrap gap-2">
                            {rows.map((r) => (
                                <li key={r.option.key}>
                                    <button
                                        type="button"
                                        onClick={() => setDecision(`Chose ${r.option.label}`)}
                                        className={cn("rounded-full border px-3.5 py-2 text-sm font-medium", decision === `Chose ${r.option.label}` ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                    >
                                        {r.option.label} · {r.total}%
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </fieldset>
                )}
                <Field label="We chose" value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Chose the local joiner" required />
                <TextArea label="Because" value={because} onChange={setBecause} rows={4} placeholder="The reasons, in enough detail that they still convince you in a year." />
                <label className="flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={headline} onChange={(e) => setHeadline(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    Show this on the project header
                </label>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Record the decision
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export function CostDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (input: { label: string; amountCents: number; paidOn: string; stage: ProjectCost["stage"] }) => Promise<void> }) {
    const { today } = useSpace();
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [paidOn, setPaidOn] = useState(today);
    const [stage, setStage] = useState<ProjectCost["stage"]>("quote");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <Dialog open={open} onClose={onClose} title="Add a cost">
            <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!label.trim() || !amount.trim()) {
                        setError("A cost needs a name and an amount.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ label, amountCents: Math.round(Number(amount) * 100), paidOn, stage });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Err>{error}</Err>
                <Field label="What for" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Electrician — island ring main" required />
                <Field label="Amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="420" required />
                <Field label="Dated" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                <Select label="Stage" value={stage} onChange={(v) => setStage(v as ProjectCost["stage"])}>
                    <option value="quote">Quoted</option>
                    <option value="deposit">Deposit</option>
                    <option value="paid">Paid</option>
                </Select>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add cost
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
