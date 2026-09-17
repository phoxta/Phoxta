import { useEffect, useState, type FormEvent } from "react";
import { addDays, isoDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { MemberMultiPicker } from "@/components/shared";
import { Button, Field } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import type { Book, NewPlan, PaceUnit, ReadingPlan } from "../types";

/**
 * A reading plan is a promise with a pace: ten pages a day, five days a week,
 * finish by the end of the month. The dashboard turns it into one line on
 * today's list, and the module tells you — gently, twice — when it slips.
 */

const UNITS: Array<{ v: PaceUnit; label: string }> = [
    { v: "pages", label: "pages a day" },
    { v: "chapters", label: "chapters a day" },
    { v: "minutes", label: "minutes a day" },
];

export function PlanDialog({ open, onClose, books, plan, defaultBookId, onSave }: { open: boolean; onClose: () => void; books: Book[]; plan?: ReadingPlan; defaultBookId?: string; onSave: (input: NewPlan) => Promise<void> }) {
    const { today } = useSpace();
    const [bookId, setBookId] = useState("");
    const [unit, setUnit] = useState<PaceUnit>("pages");
    const [amount, setAmount] = useState("10");
    const [daysPerWeek, setDaysPerWeek] = useState("5");
    const [assignees, setAssignees] = useState<string[]>([]);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(isoDate(addDays(today, 28)));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setBookId(plan?.bookId ?? defaultBookId ?? books[0]?.id ?? "");
        setUnit(plan?.pace.unit ?? "pages");
        setAmount(String(plan?.pace.amount ?? 10));
        setDaysPerWeek(String(plan?.pace.daysPerWeek ?? 5));
        setAssignees(plan?.assigneeMemberIds ?? []);
        setStartDate(plan?.startDate ?? today);
        setEndDate(plan?.endDate ?? isoDate(addDays(today, 28)));
        setError(null);
    }, [open, plan, defaultBookId, books, today]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!bookId) {
            setError("Choose a book first.");
            return;
        }
        if (!assignees.length) {
            setError("Who is doing the reading?");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSave({
                bookId,
                pace: { unit, amount: Number(amount) || 1, daysPerWeek: Number(daysPerWeek) || 7 },
                assigneeMemberIds: assignees,
                startDate,
                endDate,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={plan ? "Edit reading plan" : "New reading plan"}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Book</span>
                    <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        {books.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.title}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="How much" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Of what</span>
                        <select value={unit} onChange={(e) => setUnit(e.target.value as PaceUnit)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {UNITS.map((u) => (
                                <option key={u.v} value={u.v}>
                                    {u.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <Field label="Days a week" type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} hint="Five means weekdays; seven means every day." />

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Field label="Finish by" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>

                {/* Household only: a guest receives no plans, no progress and no shelf,
                    so a plan assigned to one would be invisible to them and clutter here. */}
                <MemberMultiPicker value={assignees} onChange={setAssignees} label="Who is reading" roles={["parent", "child"]} />

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {plan ? "Save plan" : "Start the plan"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
