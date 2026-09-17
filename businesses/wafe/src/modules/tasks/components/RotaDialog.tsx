import { useState, type FormEvent } from "react";
import { MemberMultiPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { isDone } from "../derive";
import type { ChoreRota, TasksState } from "../types";
import { useTasks } from "./useTasks";

/**
 * Setting up a rota: one chore, two or more children, and a turn that changes
 * on the family's planning day.
 *
 * It only offers chores, because a rota is about the jobs that come round again
 * — and it insists on two people, because one person taking turns with
 * themselves is just a chore.
 */
export function RotaDialog({ open, onClose, state }: { open: boolean; onClose: () => void; state: TasksState }) {
    const { mutate, sp, toast } = useTasks();
    const chores = state.tasks.filter((t) => t.isChore && !isDone(t));

    const [taskId, setTaskId] = useState(chores[0]?.id ?? "");
    const [name, setName] = useState("");
    const [who, setWho] = useState<string[]>([]);
    const [rotation, setRotation] = useState<ChoreRota["rotation"]>("weekly");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (!taskId) throw new Error("Pick the chore that takes turns.");
            await mutate((r) => r.createRota(name, taskId, who, rotation));
            toast("Rota set up — it turns on your planning day", "success");
            setName("");
            setWho([]);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't set that rota up.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Set up a rota">
            <form onSubmit={submit} className="flex flex-col gap-4">
                {chores.length === 0 ? (
                    <p className="text-md leading-6 text-muted">There are no chores to share out yet. Add a chore first — a task worth Sprouts — and then it can take turns.</p>
                ) : (
                    <>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">The chore that takes turns</span>
                            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                {chores.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <Field label="Call it" value={name} onChange={(e) => setName(e.target.value)} placeholder={chores.find((t) => t.id === taskId)?.title ?? "Empty the dishwasher"} hint="Leave it empty to use the chore's name" />
                        <MemberMultiPicker value={who} onChange={setWho} roles={["child", "parent"]} label="Who takes turns (two or more)" />
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">How often it changes hands</span>
                            <select value={rotation} onChange={(e) => setRotation(e.target.value as ChoreRota["rotation"])} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                <option value="weekly">Every week</option>
                                <option value="fortnightly">Every fortnight</option>
                            </select>
                        </label>
                        <p className="text-sm leading-5 text-muted">It swaps over on {sp.space.planningDay === 7 ? "Sunday" : "your planning day"}, by itself, the first time anyone on the rota opens Wàfè that day.</p>
                    </>
                )}
                {error && (
                    <p className="text-sm text-danger-ink" role="alert">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={chores.length === 0 || who.length < 2}>
                        Set it up
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
