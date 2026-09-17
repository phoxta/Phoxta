import { useEffect, useState } from "react";
import { useSpace } from "@/state/space";
import { MemberMultiPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import type { BiblePlan, NewPlan } from "../types";

/**
 * Starting a reading plan, and editing the one that is running.
 *
 * A plan is the thing that decides what the whole house reads at breakfast, so
 * it is worth being able to start one, retire one and go back to the family
 * verse list on purpose rather than by accident. Days are typed one to a line —
 * a plan is usually copied off a card or a church handout, and thirty separate
 * form rows would be a worse way to do that on a phone than thirty lines.
 *
 * The days are only editable when the plan is new: `updatePlan` deliberately
 * patches the plan's own fields and never its passages, so a running plan
 * cannot change under a family halfway through.
 */

const parseDays = (text: string): NewPlan["days"] =>
    text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const at = line.indexOf("|");
            if (at === -1) return { passage: line, passageText: "" };
            return { passage: line.slice(0, at).trim(), passageText: line.slice(at + 1).trim() };
        })
        .filter((d) => d.passage.length > 0);

export function PlanDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (input: NewPlan) => Promise<void>; initial?: BiblePlan }) {
    const { today, members } = useSpace();
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState(today);
    const [translation, setTranslation] = useState("WEB");
    const [assignees, setAssignees] = useState<string[]>([]);
    const [days, setDays] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(initial?.title ?? "");
        setStartDate(initial?.startDate ?? today);
        setTranslation(initial?.translation ?? "WEB");
        setAssignees(initial?.assigneeMemberIds ?? members.filter((m) => m.role !== "guest").map((m) => m.id));
        setDays("");
        setError(null);
    }, [open, initial, today, members]);

    const parsed = parseDays(days);

    return (
        <Dialog open={open} onClose={onClose} title={initial ? "Edit this plan" : "Start a reading plan"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setError("Give the plan a name.");
                        return;
                    }
                    if (!initial && parsed.length === 0) {
                        setError("A plan needs at least one day. Type one passage per line.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ title, startDate, translation, assigneeMemberIds: assignees, days: parsed });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="What it's called" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Psalms for the autumn" error={error} />

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Field label="Day one" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Translation</span>
                        <select value={translation} onChange={(e) => setTranslation(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="WEB">WEB</option>
                            <option value="KJV">KJV</option>
                            <option value="NIV">NIV</option>
                            <option value="ESV">ESV</option>
                            <option value="NLT">NLT</option>
                        </select>
                    </label>
                </div>

                <MemberMultiPicker className="mt-4" label="Who is reading it" value={assignees} onChange={setAssignees} roles={["parent", "child"]} />

                {initial ? (
                    <p className="mt-5 rounded-md bg-page px-4 py-3 text-xs leading-5 text-muted">The passages stay as they were written. To read something else, retire this plan and start a new one — nobody's progress is thrown away.</p>
                ) : (
                    <label className="mt-5 block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">The days — one passage a line</span>
                        <textarea
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            rows={7}
                            placeholder={"Psalm 1 | Blessed is the man who doesn't walk in the counsel of the wicked…\nPsalm 8\nPsalm 23"}
                            className="w-full rounded-md border border-line-strong bg-card px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-brand"
                        />
                        <span className="mt-1.5 block text-xs leading-5 text-caption">
                            Put the words after a <span className="font-mono">|</span> if you want them on the card; leave them off and the reference stands alone. {parsed.length ? `${parsed.length} day${parsed.length === 1 ? "" : "s"} so far.` : ""}
                        </span>
                    </label>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {initial ? "Save" : "Start the plan"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
