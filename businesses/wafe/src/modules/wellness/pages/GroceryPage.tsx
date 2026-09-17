import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, Utensils } from "lucide-react";
import { Notice, PageTitle, Section } from "@/components/shared";
import { Button, EmptyState, IconButton, Skeleton } from "@/components/ui/primitives";
import { BASE, dayNumber, listForPlan, planForWeek, recipeById, shiftDay, slotOn, weekDays, weekOf } from "../derive";
import { GroceryPanel } from "../components/GroceryPanel";
import { useWellness } from "../components/useWellness";

/**
 * The shop.
 *
 * One number matters here and it is the comparison, not the total: what this
 * week's food costs against what is left in the envelope (AC 3). The list is
 * built from the recipes on the plan, so changing Thursday's dinner changes
 * the bill — which is the only honest way to make a food budget hold.
 *
 * Children and guests never reach this screen: prices are money, and money in
 * Wàfè stops at the parents, in the filter and in the policy.
 */
export default function GroceryPage() {
    const { state, loading, error, sp, child, run, foodBudget } = useWellness();
    const [offset, setOffset] = useState(0);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state?.visible || child) {
        return (
            <div>
                <PageTitle title="The shop" area="live" />
                <EmptyState icon={<Lock size={20} aria-hidden="true" />} title="This one is for the grown-ups" body="What the shopping costs is part of the family's money, and that stays with the parents." />
            </div>
        );
    }

    const today = sp.today;
    const weekStart = shiftDay(weekOf(today), offset * 7);
    const plan = planForWeek(state, weekStart);
    const list = plan ? listForPlan(state, plan.id) : undefined;
    const dinners = plan
        ? weekDays(weekStart)
              .map((d) => ({ date: d, slot: slotOn(state, plan.id, d, "dinner") }))
              .filter((x) => x.slot?.title)
        : [];

    return (
        <div>
            <PageTitle
                title="The shop"
                sub="Priced from the week's meals and set against what is left in the food envelope — before anything is bought, while it can still be changed."
                area="live"
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <IconButton label="The week before" size="md" onClick={() => setOffset(offset - 1)}>
                    <ChevronLeft size={16} aria-hidden="true" />
                </IconButton>
                <p className="text-base font-semibold">
                    {offset === 0 ? "This week" : offset === 1 ? "Next week" : `Week of ${dayNumber(weekStart)}`}
                    <span className="ml-2 text-sm font-normal text-caption">
                        {dayNumber(weekStart)} – {dayNumber(shiftDay(weekStart, 6))}
                    </span>
                </p>
                <IconButton label="The week after" size="md" onClick={() => setOffset(offset + 1)}>
                    <ChevronRight size={16} aria-hidden="true" />
                </IconButton>
            </div>

            {!plan ? (
                <EmptyState
                    icon={<Utensils size={20} aria-hidden="true" />}
                    title="No meals for this week yet"
                    body="The shopping list is built from the recipes on the plan, so the plan comes first."
                    action={
                        <Link to={`${BASE}/meals`} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                            Plan the meals
                        </Link>
                    }
                />
            ) : (
                <GroceryPanel state={state} list={list} planId={plan.id} currency={sp.space.currency} canEdit foodBudget={foodBudget} run={run} />
            )}

            {dinners.length > 0 && (
                <Section title="What this is buying" className="mt-8">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {dinners.map(({ date, slot }) => {
                            const recipe = recipeById(state, slot?.recipeId ?? null);
                            return (
                                <li key={date} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3">
                                    <span className="w-12 shrink-0 text-xs font-semibold text-caption">{dayNumber(date)}</span>
                                    <span className="min-w-0 flex-1 truncate text-md font-medium">{slot?.title}</span>
                                    {recipe && <span className="shrink-0 text-xs tabular-nums text-muted">serves {recipe.servings}</span>}
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-3 text-sm text-muted">
                        Change a dinner on the{" "}
                        <Link to={`${BASE}/meals`} className="font-semibold text-brand underline underline-offset-2">
                            meals screen
                        </Link>{" "}
                        and rebuild the list — the bill follows the food, not the other way round.
                    </p>
                </Section>
            )}

            {plan && !list && (
                <div className="mt-6">
                    <Button
                        onClick={() => void run((r) => r.buildGroceryList(plan.id, foodBudget?.remainingCents), "Priced from this week's meals")}
                    >
                        Price the week
                    </Button>
                </div>
            )}
        </div>
    );
}
