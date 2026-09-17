import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { isoDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { MemberPicker, VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, IconButton } from "@/components/ui/primitives";
import type { Goal, GoalScope, GoalsState, Horizon, NewGoal, Pillar, ProgressMode } from "../types";
import { HORIZON_LABEL, PILLARS, PILLAR_LABEL, SCOPE_LABEL } from "../types";
import { metricFor, milestonesOf } from "../derive";

/**
 * One form for a new goal and for editing an existing one.
 *
 * The interesting bit is the progress mode: if the goal has milestones or a
 * linked number, "typed by hand" is not offered at all. Progress is computed —
 * the form is where that rule is first visible, and the repo enforces it again.
 * A linked number outranks milestones, because the number is the one figure
 * nobody types; the milestones on a measured goal are how it gets moved.
 *
 * The target date is required. The roadmap is this module's promise that any
 * goal is two clicks away, and a goal with no date has no quarter to sit in.
 */

const label = "mb-1.5 block text-xs font-medium text-muted";
const select = "h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";
const area = "w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand";

export function GoalDialog({
    open,
    onClose,
    onSave,
    state,
    goal,
    defaults,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (input: NewGoal) => Promise<void>;
    state: GoalsState;
    /** Present when editing. */
    goal?: Goal;
    defaults?: Partial<NewGoal>;
}) {
    const { space, me, can, today } = useSpace();
    const parent = can("goals.manage");
    const editing = Boolean(goal);

    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [scope, setScope] = useState<GoalScope>("family");
    const [owner, setOwner] = useState<string | null>(null);
    const [pillar, setPillar] = useState<Pillar>("execute");
    const [valueLabel, setValueLabel] = useState("");
    const [horizon, setHorizon] = useState<Horizon>("year");
    const [targetDate, setTargetDate] = useState(today);
    const [description, setDescription] = useState("");
    const [why, setWhy] = useState("");
    const [mode, setMode] = useState<ProgressMode>("milestones");
    const [metricRef, setMetricRef] = useState<string>("");
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [steps, setSteps] = useState<Array<{ title: string; due: string }>>([{ title: "", due: "" }]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasMilestones = goal ? milestonesOf(state, goal.id).length > 0 : steps.some((s) => s.title.trim());
    const hasMetric = Boolean(metricRef && metricFor(state, metricRef));
    const refs = [...new Set(state.metrics.map((m) => m.ref))].map((ref) => ({ ref, label: metricFor(state, ref)?.label ?? ref }));

    useEffect(() => {
        if (!open) return;
        const d = defaults ?? {};
        setTitle(goal?.title ?? d.title ?? "");
        setSummary(goal?.childSafeSummary ?? d.childSafeSummary ?? "");
        setScope(goal?.scope ?? d.scope ?? (parent ? "family" : "me"));
        setOwner(goal?.ownerMemberId ?? d.ownerMemberId ?? (parent ? me.id : me.id));
        setPillar(goal?.pillar ?? d.pillar ?? "execute");
        setValueLabel(goal?.valueLabel ?? d.valueLabel ?? "");
        setHorizon(goal?.horizon ?? d.horizon ?? "year");
        setTargetDate(goal?.targetDate ?? d.targetDate ?? isoDate(new Date(new Date(`${today}T00:00:00`).setMonth(new Date(`${today}T00:00:00`).getMonth() + 3))));
        setDescription(goal?.description ?? d.description ?? "");
        setWhy(goal?.why ?? d.why ?? "");
        setMode(goal?.progressMode ?? d.progressMode ?? "milestones");
        setMetricRef(goal?.metricRef ?? d.metricRef ?? "");
        // Private unless shared: a child's own goal starts as theirs alone.
        setVisibility(goal?.visibility ?? d.visibility ?? (parent ? "family" : "private"));
        setSharedWith(goal?.sharedWith ?? d.sharedWith ?? []);
        setSteps(d.milestones?.length ? d.milestones.map((m) => ({ title: m.title, due: m.due ?? "" })) : [{ title: "", due: "" }]);
        setError(null);
    }, [open, goal, defaults, parent, me.id, today]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("A goal needs a name.");
            return;
        }
        if (!targetDate) {
            setError("A goal needs a date to aim at — that is what puts it on the roadmap.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSave({
                title: title.trim(),
                childSafeSummary: summary.trim() || title.trim(),
                scope,
                ownerMemberId: scope === "family" ? owner : (owner ?? me.id),
                pillar,
                valueLabel: valueLabel || undefined,
                horizon,
                targetDate,
                description,
                why,
                // A linked number outranks everything: it is the one figure
                // nobody types. Milestones next; typing last.
                progressMode: hasMetric ? "metric" : hasMilestones ? "milestones" : mode,
                metricRef: hasMetric ? metricRef : null,
                visibility,
                sharedWith,
                milestones: editing ? undefined : steps.filter((s) => s.title.trim()).map((s) => ({ title: s.title.trim(), due: s.due || null })),
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={editing ? "Edit this goal" : "A new goal"} wide>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="The goal" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prepare the children for the new school year" required />

                <Field
                    label="What the children are told"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Getting everything ready for school"
                    hint="Children never see the goal's own words — only this line, and a percentage. No amounts, no detail."
                />

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={label}>Whose goal</span>
                        <select
                            value={scope}
                            onChange={(e) => setScope(e.target.value as GoalScope)}
                            disabled={!parent}
                            className={cn(select, !parent && "opacity-60")}
                        >
                            {(["family", "us", "me"] as GoalScope[]).map((v) => (
                                <option key={v} value={v}>
                                    {SCOPE_LABEL[v]}
                                </option>
                            ))}
                        </select>
                        {!parent && <span className="mt-1 block text-xs text-caption">Goals you make are your own.</span>}
                    </label>
                    <label className="block">
                        <span className={label}>Pillar</span>
                        <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)} className={select}>
                            {PILLARS.map((p) => (
                                <option key={p} value={p}>
                                    {PILLAR_LABEL[p]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {parent && <MemberPicker value={owner} onChange={setOwner} allowFamily={scope === "family"} label="Who is carrying it" />}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
                    <label className="block">
                        <span className={label}>Value it serves</span>
                        <select value={valueLabel} onChange={(e) => setValueLabel(e.target.value)} className={select}>
                            <option value="">—</option>
                            {space.values.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className={label}>Horizon</span>
                        <select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)} className={select}>
                            {(["quarter", "year", "multi-year"] as Horizon[]).map((h) => (
                                <option key={h} value={h}>
                                    {HORIZON_LABEL[h]}
                                </option>
                            ))}
                        </select>
                    </label>
                    {/* Required: the roadmap is the module's promise that every
                        goal is two clicks away, and a goal with no date has no
                        quarter to sit in. */}
                    <Field label="Target date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required hint="Every goal lands on the roadmap." />
                </div>

                <label className="block">
                    <span className={label}>What it actually means</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={area} placeholder="Dami into Year 11, Tobi's year planned, Ayo into Reception." />
                </label>

                <label className="block">
                    <span className={label}>Why it matters</span>
                    <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} className={area} placeholder="Because the first fortnight sets the tone for the whole year." />
                </label>

                <fieldset>
                    <legend className={label}>How progress is worked out</legend>
                    {hasMetric ? (
                        <div className="flex flex-col gap-2">
                            <p className="rounded-sm bg-brand-soft px-3 py-2.5 text-sm text-brand-ink">
                                Measured from a number, and it stays that way. Milestones on a measured goal are the steps that move the number — they do not replace it.
                            </p>
                            <label className="block">
                                <span className={label}>Which number</span>
                                <select value={metricRef} onChange={(e) => setMetricRef(e.target.value)} className={select}>
                                    <option value="">No number — count the milestones instead</option>
                                    {refs.map((r) => (
                                        <option key={r.ref} value={r.ref}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    ) : hasMilestones ? (
                        <p className="rounded-sm bg-brand-soft px-3 py-2.5 text-sm text-brand-ink">Counted from its milestones — that is what milestones are for. Nobody types a percentage on this one.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How progress is worked out">
                                {(["metric", "manual"] as ProgressMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        role="radio"
                                        aria-checked={mode === m}
                                        onClick={() => setMode(m)}
                                        className={cn("rounded-sm border px-3 py-2 text-left", mode === m ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}
                                    >
                                        <span className="block text-sm font-semibold">{m === "metric" ? "Measured from a number" : "Typed by hand"}</span>
                                        <span className="block text-2xs text-caption">{m === "metric" ? "A savings pot, books read, kilometres" : "Only when there is nothing to count"}</span>
                                    </button>
                                ))}
                            </div>
                            {mode === "metric" && (
                                <label className="block">
                                    <span className={label}>Which number</span>
                                    <select value={metricRef} onChange={(e) => setMetricRef(e.target.value)} className={select}>
                                        <option value="">Choose a number…</option>
                                        {refs.map((r) => (
                                            <option key={r.ref} value={r.ref}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </div>
                    )}
                </fieldset>

                {!editing && (
                    <fieldset>
                        <legend className={label}>First milestones (optional)</legend>
                        <ul className="flex flex-col gap-2">
                            {steps.map((s, i) => (
                                <li key={i} className="flex items-end gap-2">
                                    <Field
                                        className="min-w-0 flex-1"
                                        label={i === 0 ? "Step" : undefined}
                                        value={s.title}
                                        onChange={(e) => setSteps(steps.map((x, n) => (n === i ? { ...x, title: e.target.value } : x)))}
                                        placeholder="Complete the medical forms"
                                    />
                                    <Field
                                        className="w-40 shrink-0"
                                        label={i === 0 ? "By" : undefined}
                                        type="date"
                                        value={s.due}
                                        onChange={(e) => setSteps(steps.map((x, n) => (n === i ? { ...x, due: e.target.value } : x)))}
                                    />
                                    <IconButton label={`Remove step ${i + 1}`} size="md" className="mb-1.5" onClick={() => setSteps(steps.length > 1 ? steps.filter((_, n) => n !== i) : [{ title: "", due: "" }])}>
                                        <X size={15} />
                                    </IconButton>
                                </li>
                            ))}
                        </ul>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSteps([...steps, { title: "", due: "" }])}>
                            <Plus size={14} /> Another step
                        </Button>
                    </fieldset>
                )}

                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {editing ? "Save the goal" : "Add the goal"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
