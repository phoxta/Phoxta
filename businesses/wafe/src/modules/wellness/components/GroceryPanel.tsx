import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ListRestart, Plus, RefreshCw, ShoppingBasket, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { Confirm, Money, Notice } from "@/components/shared";
import { Button, EmptyState, Field, IconButton } from "@/components/ui/primitives";
import { budgetVerdict, groceryLeftToBuy, groceryTotal, itemsForList, recipeById } from "../derive";
import type { FoodBudget, GroceryList, WellnessRepo, WellnessState } from "../types";
import { BudgetBar } from "./pieces";

/**
 * The shopping list, priced against the food envelope.
 *
 * The number on the right is Finance's, read from its LOADED SLICE — never
 * from its tables — and stamped onto the list so the warning is still true on
 * a screen that cannot see the envelope at all (AC 3). Ticking things off does
 * not change the estimate, because the estimate is what the week costs; what
 * changes is how much of it is still in the trolley.
 *
 * The same panel is the shopping screen and the shop inside Sunday planning
 * (AC 6).
 */
export function GroceryPanel({
    state,
    list,
    planId,
    currency,
    canEdit,
    foodBudget,
    run,
    compact,
}: {
    state: WellnessState;
    list: GroceryList | undefined;
    planId: string | null;
    currency: string;
    canEdit: boolean;
    foodBudget: FoodBudget | null;
    run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;
    compact?: boolean;
}) {
    const [item, setItem] = useState("");
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");
    const [busy, setBusy] = useState(false);
    const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

    if (!list) {
        return (
            <EmptyState
                icon={<ShoppingBasket size={20} aria-hidden="true" />}
                title="No list for this week yet"
                body="Put the meals down first, then price the week up in one go — every ingredient on the plan, added and totalled."
                action={
                    canEdit && planId ? (
                        <Button
                            loading={busy}
                            onClick={async () => {
                                setBusy(true);
                                await run((r) => r.buildGroceryList(planId, foodBudget?.remainingCents), "Priced from this week's meals");
                                setBusy(false);
                            }}
                        >
                            <ListRestart size={16} aria-hidden="true" /> Build it from the plan
                        </Button>
                    ) : undefined
                }
            />
        );
    }

    const items = itemsForList(state, list.id);
    const total = groceryTotal(state, list.id);
    const left = groceryLeftToBuy(state, list.id);
    const verdict = budgetVerdict(total, list.foodBudgetRemainingCents);
    const stale = foodBudget && foodBudget.remainingCents !== list.foodBudgetRemainingCents;

    const add = async (e: FormEvent) => {
        e.preventDefault();
        if (!item.trim()) return;
        setBusy(true);
        const cents = Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100) || 0;
        const ok = await run((r) => r.addGroceryItem(list.id, { item, qty, priceEstimateCents: cents }));
        setBusy(false);
        if (ok) {
            setItem("");
            setQty("");
            setPrice("");
        }
    };

    return (
        <div>
            <BudgetBar
                totalCents={total}
                remainingCents={list.foodBudgetRemainingCents}
                currency={currency}
                note={
                    <>
                        {items.filter((i) => i.checked).length} of {items.length} in the trolley · {money(left, currency)} still to buy.
                        {!foodBudget && (
                            <>
                                {" "}
                                <Link to="/live/finance" className="font-semibold text-brand underline underline-offset-2">
                                    Open Finance
                                </Link>{" "}
                                to refresh the envelope.
                            </>
                        )}
                    </>
                }
            />

            {verdict.over && (
                <Notice tone="danger" className="mt-3">
                    This week&apos;s shop is <Money cents={verdict.diffCents} currency={currency} /> over the food budget. Nothing has been spent yet — swap a dinner on the plan and rebuild the list.
                </Notice>
            )}

            {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {stale && (
                        <Button
                            variant="outline"
                            size="md"
                            loading={busy}
                            onClick={async () => {
                                setBusy(true);
                                await run((r) => r.setFoodBudgetRemaining(list.id, foodBudget.remainingCents), "Food budget refreshed from Finance");
                                setBusy(false);
                            }}
                        >
                            <RefreshCw size={14} aria-hidden="true" /> Refresh the envelope ({money(foodBudget.remainingCents, currency)} left)
                        </Button>
                    )}
                    {planId && (
                        <Button
                            variant="outline"
                            size="md"
                            loading={busy}
                            onClick={async () => {
                                setBusy(true);
                                await run((r) => r.buildGroceryList(planId, foodBudget?.remainingCents), "Rebuilt from this week's meals");
                                setBusy(false);
                            }}
                        >
                            <ListRestart size={14} aria-hidden="true" /> Rebuild from the meal plan
                        </Button>
                    )}
                </div>
            )}

            {items.length === 0 ? (
                <EmptyState className="mt-4" icon={<ShoppingBasket size={20} aria-hidden="true" />} title="Nothing on the list" body="Add the first thing, or rebuild it from the week's meals." />
            ) : (
                <ul className={cn("mt-4 divide-y divide-line rounded-xl bg-card", compact && "max-h-[26rem] overflow-y-auto")}>
                    {items.map((row) => {
                        const from = recipeById(state, row.recipeId);
                        return (
                            <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                                <input
                                    type="checkbox"
                                    checked={row.checked}
                                    disabled={!canEdit}
                                    onChange={(e) => void run((r) => r.updateGroceryItem(row.id, { checked: e.target.checked }))}
                                    className="size-5 shrink-0 accent-[var(--color-brand)]"
                                    aria-label={`${row.item} in the trolley`}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className={cn("block truncate text-md font-medium", row.checked && "text-muted line-through")}>{row.item}</span>
                                    <span className="block truncate text-xs text-caption">{[row.qty, from ? from.name : "Added by hand"].filter(Boolean).join(" · ")}</span>
                                </span>
                                <Money cents={row.priceEstimateCents} currency={currency} className="shrink-0 text-sm tabular-nums text-muted" />
                                {canEdit && (
                                    <IconButton label={`Remove ${row.item}`} size="sm" onClick={() => setRemoving({ id: row.id, name: row.item })}>
                                        <Trash2 size={13} aria-hidden="true" />
                                    </IconButton>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {canEdit && (
                <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
                    <Field label="Add something" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Plantain" className="min-w-[10rem] flex-1" />
                    <Field label="How much" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="4" className="w-24" />
                    <Field label={`Est. ${currency}`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3.20" inputMode="decimal" className="w-28" />
                    <Button type="submit" size="lg" loading={busy} disabled={!item.trim()}>
                        <Plus size={16} aria-hidden="true" /> Add
                    </Button>
                </form>
            )}

            <Confirm
                open={Boolean(removing)}
                title="Take it off the list?"
                body={removing ? `"${removing.name}" comes off this week's shop. Rebuilding from the plan would bring it back if a recipe still asks for it.` : undefined}
                confirmLabel="Take it off"
                danger
                onConfirm={async () => {
                    if (removing) await run((r) => r.removeGroceryItem(removing.id));
                }}
                onClose={() => setRemoving(null)}
            />
        </div>
    );
}
