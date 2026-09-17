import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import type { Reward, RewardKind } from "../types";
import { REWARD_KIND_LABEL } from "../types";
import { useTasks } from "./useTasks";

/**
 * What Sprouts are worth, in a parent's own words.
 *
 * The same form adds a reward and edits one, because a family changes its mind
 * about the price of a cinema trip far more often than it invents a new kind of
 * treat. Editing never re-bills: a redemption keeps the cost it was approved at.
 */
export function RewardDialog({ open, onClose, reward }: { open: boolean; onClose: () => void; reward?: Reward | null }) {
    const { mutate, toast } = useTasks();
    const editing = Boolean(reward);

    const [name, setName] = useState(reward?.name ?? "");
    const [note, setNote] = useState(reward?.note ?? "");
    const [cost, setCost] = useState(reward?.costSprouts ?? 50);
    const [kind, setKind] = useState<RewardKind>(reward?.kind ?? "treat");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (reward) {
                await mutate((r) => r.updateReward(reward.id, { name: name.trim(), note: note.trim(), costSprouts: Math.max(1, Math.round(cost)), kind }));
                toast(`"${name.trim()}" updated`, "success");
            } else {
                await mutate((r) => r.createReward({ name, note, costSprouts: cost, kind }));
                toast(`"${name.trim()}" is on the list`, "success");
                setName("");
                setNote("");
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that reward.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={editing ? "Edit this reward" : "Add a reward"}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="What it is" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Saturday cinema" />
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">The small print</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="A ticket, a drink and popcorn — one Saturday of your choosing." />
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Field label="Sprouts" type="number" min={1} step={5} value={cost} onChange={(e) => setCost(Number(e.target.value))} hint="What it costs from a balance" />
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind</span>
                        <select value={kind} onChange={(e) => setKind(e.target.value as RewardKind)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {Object.entries(REWARD_KIND_LABEL).map(([k, label]) => (
                                <option key={k} value={k}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                {error && (
                    <p className="text-sm text-danger-ink" role="alert">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        {editing ? "Save it" : "Add it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/**
 * A hand adjustment to a balance, which the ledger records like everything
 * else: a delta, a reason and a row (AC 5). Sprouts never move silently.
 */
export function AdjustDialog({ open, onClose, memberId, name }: { open: boolean; onClose: () => void; memberId: string; name: string }) {
    const { mutate, sp, toast } = useTasks();
    const [delta, setDelta] = useState(10);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const n = Math.round(delta);
            if (!n) throw new Error("Say how many Sprouts, up or down.");
            await mutate((r) => r.adjustSprouts(memberId, n, note));
            await sp.mutateCore((c) => c.addPoints(memberId, n, note.trim() || "Adjustment"));
            toast(`${n > 0 ? "+" : ""}${n} Sprouts for ${name}`, "success");
            setNote("");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't adjust that.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`Adjust ${name}'s Sprouts`}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <p className="text-md leading-6 text-muted">Every adjustment goes on the ledger with your reason, so the balance can always be explained.</p>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[120px_1fr]">
                    <Field label="Sprouts" type="number" step={5} value={delta} onChange={(e) => setDelta(Number(e.target.value))} hint="Minus to take some off" />
                    <Field label="What for" value={note} onChange={(e) => setNote(e.target.value)} required placeholder="Helped Ayo without being asked" />
                </div>
                {error && (
                    <p className="text-sm text-danger-ink" role="alert">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!note.trim()}>
                        Add it to the ledger
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
