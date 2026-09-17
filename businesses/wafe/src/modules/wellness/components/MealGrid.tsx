import { useState, type FormEvent } from "react";
import { CookingPot, Pencil, Plus, Utensils, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MemberAvatar, MemberPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, IconButton } from "@/components/ui/primitives";
import { dayLabel, dayNumber, recipeById, slotOn, weekDays } from "../derive";
import type { MealSlotKind, WellnessRepo, WellnessState } from "../types";
import { SLOT_LABEL, SLOT_ORDER } from "../types";

/**
 * The week's meals, as seven day cards rather than a spreadsheet — a phone
 * reads it as easily as a laptop, and the cook's face is on the card, which is
 * the whole point of a rota.
 *
 * The same component is the meals screen AND the meal panel inside Sunday
 * planning (AC 6): one grid, one dialog, one set of rules.
 */
export function MealGrid({
    state,
    planId,
    weekStart,
    canEdit,
    today,
    run,
}: {
    state: WellnessState;
    planId: string;
    weekStart: string;
    canEdit: boolean;
    today: string;
    run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;
}) {
    const [editing, setEditing] = useState<{ date: string; slot: MealSlotKind } | null>(null);
    const days = weekDays(weekStart);

    return (
        <>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {days.map((date) => (
                    <li key={date} className={cn("rounded-xl bg-card p-4", date === today && "outline-2 outline-brand")}>
                        <div className="mb-2.5 flex items-baseline justify-between">
                            <h3 className="text-base font-semibold">{dayLabel(date)}</h3>
                            <span className="text-xs text-caption">{date === today ? "Today" : dayNumber(date)}</span>
                        </div>
                        <ul className="flex flex-col gap-1.5">
                            {SLOT_ORDER.map((slot) => {
                                const row = slotOn(state, planId, date, slot);
                                const recipe = recipeById(state, row?.recipeId ?? null);
                                return (
                                    <li key={slot} className="flex items-start gap-2 rounded-md bg-page px-2.5 py-2">
                                        <span className="mt-0.5 w-[62px] shrink-0 text-2xs font-medium uppercase tracking-[0.05em] text-caption">{SLOT_LABEL[slot]}</span>
                                        <span className="min-w-0 flex-1">
                                            {row?.title ? (
                                                <>
                                                    <span className="block text-md font-medium leading-5">{row.title}</span>
                                                    {(row.cookMemberId || recipe) && (
                                                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-caption">
                                                            {row.cookMemberId && (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <MemberAvatar memberId={row.cookMemberId} size="xs" /> cooking
                                                                </span>
                                                            )}
                                                            {recipe && <span>{recipe.minutes} min · serves {recipe.servings}</span>}
                                                        </span>
                                                    )}
                                                    {row.note && <span className="mt-1 block text-xs leading-4 text-muted">{row.note}</span>}
                                                </>
                                            ) : (
                                                <span className="block text-sm text-caption">Nothing down yet</span>
                                            )}
                                        </span>
                                        {canEdit && (
                                            <IconButton label={`${row?.title ? "Change" : "Add"} ${SLOT_LABEL[slot].toLowerCase()} on ${dayLabel(date)}`} size="sm" onClick={() => setEditing({ date, slot })}>
                                                {row?.title ? <Pencil size={12} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                                            </IconButton>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                ))}
            </ul>

            {editing && <SlotDialog state={state} planId={planId} date={editing.date} slot={editing.slot} onClose={() => setEditing(null)} run={run} />}
        </>
    );
}

function SlotDialog({
    state,
    planId,
    date,
    slot,
    onClose,
    run,
}: {
    state: WellnessState;
    planId: string;
    date: string;
    slot: MealSlotKind;
    onClose: () => void;
    run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;
}) {
    const existing = slotOn(state, planId, date, slot);
    const [recipeId, setRecipeId] = useState<string>(existing?.recipeId ?? "");
    const [title, setTitle] = useState(existing?.recipeId ? "" : (existing?.title ?? ""));
    const [cook, setCook] = useState<string | null>(existing?.cookMemberId ?? null);
    const [note, setNote] = useState(existing?.note ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const chosen = recipeId ? state.recipes.find((r) => r.id === recipeId) : undefined;
        const name = chosen?.name ?? title.trim();
        if (!name) return;
        setBusy(true);
        const ok = await run((r) => r.setMealSlot(planId, date, slot, { recipeId: recipeId || null, title: name, cookMemberId: cook, note }), `${SLOT_LABEL[slot]} on ${dayLabel(date)} set`);
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title={`${SLOT_LABEL[slot]} · ${dayLabel(date)} ${dayNumber(date)}`}>
            <form onSubmit={submit}>
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted">From our recipes</span>
                    <select
                        value={recipeId}
                        onChange={(e) => {
                            setRecipeId(e.target.value);
                            if (e.target.value) setTitle("");
                        }}
                        className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                    >
                        <option value="">Something else…</option>
                        {[...state.recipes]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name} · {r.minutes} min
                                </option>
                            ))}
                    </select>
                </label>

                {!recipeId && <Field label="What are we eating" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leftovers, beans on toast, out at Grandma's…" className="mt-4" />}

                <MemberPicker value={cook} onChange={setCook} allowFamily label="Who is cooking" className="mt-4" />

                <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="On the table by 18:15 — Bible study is at seven." className="mt-4" />

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    {existing && (
                        <Button
                            variant="ghost"
                            onClick={async () => {
                                setBusy(true);
                                const ok = await run((r) => r.clearMealSlot(planId, date, slot), "Cleared");
                                setBusy(false);
                                if (ok) onClose();
                            }}
                        >
                            <X size={15} aria-hidden="true" /> Clear
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        <CookingPot size={15} aria-hidden="true" /> Save
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/** "Nothing is down for this week yet" — the same empty state in both places. */
export function NoPlanYet({ onCreate, busy }: { onCreate: () => void; busy?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-6 py-12 text-center">
            <span className="mb-1 grid size-12 place-items-center rounded-full bg-live-soft text-live-ink">
                <Utensils size={20} aria-hidden="true" />
            </span>
            <h3 className="text-xl font-semibold">No plan for this week yet</h3>
            <p className="max-w-sm text-md text-muted">Ten minutes now is five calm evenings. Start the week and put a name against each pan.</p>
            <Button className="mt-3" onClick={onCreate} loading={busy}>
                <Plus size={16} aria-hidden="true" /> Start this week&apos;s plan
            </Button>
        </div>
    );
}
