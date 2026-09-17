import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { money } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { Notice } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { dayLabel, weekDays } from "../derive";
import type { AiMealPlan, FoodBudget, WellnessRepo } from "../types";

/**
 * "What meals can we make with this week's grocery budget?"
 *
 * The companion PROPOSES. Nothing is written until a parent reads the week
 * and presses apply, and the panel says out loud what it was given — the food
 * envelope, the number of people, the week — because an answer without its
 * sources is a guess with a nice font.
 */
export function MealPlanAi({
    open,
    onClose,
    planId,
    weekStart,
    people,
    currency,
    foodBudget,
    run,
}: {
    open: boolean;
    onClose: () => void;
    planId: string;
    weekStart: string;
    people: number;
    currency: string;
    foodBudget: FoodBudget | null;
    run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;
}) {
    const { ask, busy, available } = useAi();
    const [preferences, setPreferences] = useState("");
    const [budget, setBudget] = useState(foodBudget ? (foodBudget.remainingCents / 100).toFixed(0) : "");
    const [plan, setPlan] = useState<AiMealPlan | null>(null);
    const [text, setText] = useState("");
    const [unavailable, setUnavailable] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);

    const budgetCents = Math.round(Number(budget.replace(/[^0-9.]/g, "")) * 100) || 0;

    const generate = async (e: FormEvent) => {
        e.preventDefault();
        setUnavailable(null);
        setPlan(null);
        try {
            const res = await ask<AiMealPlan>({
                action: "meal-plan",
                prompt: preferences || "A normal week for us.",
                payload: { budgetCents, currency, days: 7, preferences, people, weekStart },
                extraContext: `The week starts ${weekStart}. There are ${people} of us. ${foodBudget ? `Finance says ${money(foodBudget.remainingCents, currency)} is left in the ${foodBudget.name} envelope this month.` : "No food budget figure was available."}`,
            });
            if (res.unavailable) {
                setUnavailable(res.unavailable);
                return;
            }
            setText(res.text);
            setPlan(res.data ?? null);
        } catch (err) {
            setUnavailable(err instanceof Error ? err.message : "The companion couldn't answer.");
        }
    };

    const apply = async () => {
        if (!plan) return;
        setApplying(true);
        const ok = await run((r) => r.applyAiMealPlan(planId, plan), "The week is down. Have a read before you shop.");
        setApplying(false);
        if (ok) onClose();
    };

    const days = weekDays(weekStart);

    return (
        <Dialog open={open} onClose={onClose} title="Meals for this week's budget" wide>
            {!available && <Notice tone="info">The companion needs the backend configured for this build. You can still plan the week by hand.</Notice>}

            <form onSubmit={generate}>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label={`Budget for the week (${currency})`} value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="112" hint={foodBudget ? `${money(foodBudget.remainingCents, currency)} left in ${foodBudget.name}.` : "No figure from Finance."} />
                    <Field label="Anything to work around" value={preferences} onChange={(e) => setPreferences(e.target.value)} placeholder="No peanuts. Bible study Wednesday." />
                </div>
                <p className="mt-3 text-xs leading-5 text-caption">
                    I will use: the week beginning {weekStart}, {people} of us at the table, the budget above{foodBudget ? `, and the ${foodBudget.name} envelope from Finance` : ""}. Nothing is written until you say so.
                </p>
                <div className="mt-4 flex justify-end">
                    <Button type="submit" loading={busy} disabled={!available}>
                        <Sparkles size={16} aria-hidden="true" /> Ask the companion
                    </Button>
                </div>
            </form>

            {busy && (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                    <Spinner /> Thinking about seven dinners…
                </p>
            )}
            {unavailable && (
                <Notice tone="warn" className="mt-4">
                    {unavailable}
                </Notice>
            )}

            {plan && (
                <div className="mt-5">
                    {text && <p className="mb-3 text-md leading-6 text-muted">{text}</p>}
                    <ul className="flex flex-col gap-2">
                        {(plan.days ?? []).slice(0, 7).map((d, i) => (
                            <li key={i} className="rounded-md bg-page px-3 py-2.5">
                                <p className="text-sm font-semibold">{dayLabel(d.date && days.includes(d.date) ? d.date : days[i])}</p>
                                <p className="mt-0.5 text-sm leading-5 text-muted">
                                    {[d.breakfast, d.lunch, d.dinner].filter(Boolean).join(" · ") || "Nothing suggested"}
                                </p>
                            </li>
                        ))}
                    </ul>
                    {(plan.grocery ?? []).length > 0 && (
                        <p className="mt-3 text-sm text-muted">
                            {plan.grocery!.length} things on the shopping list, about {money(plan.totalCents ?? plan.grocery!.reduce((n, g) => n + (g.estCents ?? 0), 0), currency)}.
                        </p>
                    )}
                    {plan.note && <p className="mt-2 text-xs leading-5 text-caption">{plan.note}</p>}
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setPlan(null)}>
                            Discard
                        </Button>
                        <Button loading={applying} onClick={apply}>
                            Put it on the week
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
