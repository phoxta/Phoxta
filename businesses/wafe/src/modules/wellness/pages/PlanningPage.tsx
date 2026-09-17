import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Copy, ListRestart, Lock, Sparkles } from "lucide-react";
import { Notice, PageTitle, Section } from "@/components/shared";
import { Button, EmptyState, Skeleton, Tag } from "@/components/ui/primitives";
import { BASE, budgetVerdict, dayNumber, groceryTotal, isoWeekday, listForPlan, planFilled, planForWeek, shiftDay, weekOf } from "../derive";
import { GroceryPanel } from "../components/GroceryPanel";
import { MealGrid, NoPlanYet } from "../components/MealGrid";
import { MealPlanAi } from "../components/MealPlanAi";
import { useWellness } from "../components/useWellness";

/**
 * Sunday planning — the food half of it.
 *
 * The week ahead's meals and the shop that pays for them, side by side and
 * both editable in place (AC 6). This is deliberately one screen: deciding
 * Thursday's dinner and finding out the week is thirty pounds over are the
 * same decision, and splitting them across two tabs is what makes families
 * give up on meal planning by February.
 */
export default function PlanningPage() {
    const { state, loading, error, sp, child, run, foodBudget } = useWellness();
    const [ahead, setAhead] = useState(true);
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state?.visible || child) {
        return (
            <div>
                <PageTitle title="Sunday planning" area="live" />
                <EmptyState icon={<Lock size={20} aria-hidden="true" />} title="Planning is a parent's screen" body="You will see what is for dinner on the meals page as soon as it is decided." />
            </div>
        );
    }

    const today = sp.today;
    const thisWeek = weekOf(today);
    const weekStart = ahead ? shiftDay(thisWeek, 7) : thisWeek;
    const plan = planForWeek(state, weekStart);
    const list = plan ? listForPlan(state, plan.id) : undefined;
    const filled = plan ? planFilled(state, plan.id) : { filled: 0, total: 21, pct: 0 };
    const total = list ? groceryTotal(state, list.id) : 0;
    const verdict = list ? budgetVerdict(total, list.foodBudgetRemainingCents) : null;
    const isPlanningDay = isoWeekday(today) === sp.space.planningDay;

    return (
        <div>
            <PageTitle
                title="Sunday planning"
                sub="The week ahead in one screen: what we are eating, who is cooking it, and what it costs against the food envelope — decided now, while it can still be changed."
                area="live"
                actions={
                    plan && (
                        <Button variant="outline" onClick={() => setAsking(true)}>
                            <Sparkles size={16} aria-hidden="true" /> Meals for the budget
                        </Button>
                    )
                }
            />

            {isPlanningDay && (
                <Notice tone="info" className="mb-5">
                    It is planning day. Ten minutes now is five calm evenings — and the shopping is priced before anybody opens the app to order it.
                </Notice>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="Which week">
                {[
                    { on: false, label: "This week", start: thisWeek },
                    { on: true, label: "The week ahead", start: shiftDay(thisWeek, 7) },
                ].map((tab) => (
                    <button
                        key={tab.label}
                        type="button"
                        role="tab"
                        aria-selected={ahead === tab.on}
                        onClick={() => setAhead(tab.on)}
                        className={
                            ahead === tab.on
                                ? "h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white"
                                : "h-10 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold text-muted hover:text-ink"
                        }
                    >
                        {tab.label}
                        <span className="ml-2 font-normal opacity-70">{dayNumber(tab.start)}</span>
                    </button>
                ))}
                {plan && (
                    <>
                        <Tag tone={filled.filled >= 14 ? "ok" : "warn"} className="ml-1">
                            {filled.filled} of 21 meals down
                        </Tag>
                        {verdict && <Tag tone={verdict.over ? "danger" : "ok"}>{verdict.over ? "Over the food budget" : "Inside the food budget"}</Tag>}
                    </>
                )}
            </div>

            {!plan ? (
                <NoPlanYet
                    busy={busy}
                    onCreate={async () => {
                        setBusy(true);
                        await run((r) => r.ensureMealPlan(weekStart), "Week started");
                        setBusy(false);
                    }}
                />
            ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <section aria-label="The week's meals">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-display text-2xl leading-7">What we are eating</h2>
                            <div className="flex flex-wrap gap-2">
                                {ahead && (
                                    <Button
                                        variant="ghost"
                                        size="md"
                                        loading={busy}
                                        onClick={async () => {
                                            setBusy(true);
                                            await run((r) => r.copyWeek(thisWeek, weekStart), "Copied from this week");
                                            setBusy(false);
                                        }}
                                    >
                                        <Copy size={14} aria-hidden="true" /> Same as this week
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="md"
                                    loading={busy}
                                    onClick={async () => {
                                        setBusy(true);
                                        await run((r) => r.buildGroceryList(plan.id, foodBudget?.remainingCents), "Priced from these meals");
                                        setBusy(false);
                                    }}
                                >
                                    <ListRestart size={14} aria-hidden="true" /> Price it
                                </Button>
                            </div>
                        </div>
                        <MealGrid state={state} planId={plan.id} weekStart={weekStart} canEdit today={today} run={run} />
                    </section>

                    <section aria-label="The shopping list">
                        <h2 className="mb-3 font-display text-2xl leading-7">What it costs</h2>
                        <GroceryPanel state={state} list={list} planId={plan.id} currency={sp.space.currency} canEdit foodBudget={foodBudget} run={run} compact />
                    </section>
                </div>
            )}

            <Section title="The rest of Sunday" className="mt-10">
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <li>
                        <Link to={BASE} className="flex h-full items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-live text-white">
                                <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold">Habits and challenges</span>
                                <span className="mt-0.5 block text-sm leading-5 text-muted">Close what has finished, start what is next.</span>
                            </span>
                        </Link>
                    </li>
                    <li>
                        <Link to={`${BASE}/workouts`} className="flex h-full items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-live text-white">
                                <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold">Next week&apos;s sessions</span>
                                <span className="mt-0.5 block text-sm leading-5 text-muted">Check the schedule against the diary before it collides.</span>
                            </span>
                        </Link>
                    </li>
                    <li>
                        <Link to={`${BASE}/health`} className="flex h-full items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-live text-white">
                                <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold">Appointments</span>
                                <span className="mt-0.5 block text-sm leading-5 text-muted">Anything in the next month that needs a lift.</span>
                            </span>
                        </Link>
                    </li>
                </ul>
            </Section>

            {plan && (
                <MealPlanAi
                    open={asking}
                    onClose={() => setAsking(false)}
                    planId={plan.id}
                    weekStart={weekStart}
                    people={sp.members.filter((m) => m.role !== "guest").length}
                    currency={sp.space.currency}
                    foodBudget={foodBudget}
                    run={run}
                />
            )}
        </div>
    );
}
