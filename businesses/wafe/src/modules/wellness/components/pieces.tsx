import { useEffect, type ReactNode } from "react";
import { Check, Flame, Snowflake, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { Money } from "@/components/shared";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import { budgetVerdict, dayNumber } from "../derive";
import type { HabitDay, HabitStats, WorkoutFocus } from "../types";
import { FOCUS_LABEL } from "../types";

/**
 * The small pieces the wellness screens share: the fortnight strip that makes
 * a streak visible (and makes a rest day look like a decision rather than a
 * hole), the budget bar that decides the shopping warning, and the child's
 * celebration.
 */

const FOCUS_TONE: Record<WorkoutFocus, "brand" | "live" | "grow" | "execute" | "create"> = {
    strength: "execute",
    cardio: "brand",
    mobility: "grow",
    family: "live",
    kids: "create",
};

export function FocusTag({ focus, className }: { focus: WorkoutFocus; className?: string }) {
    return (
        <Tag tone={FOCUS_TONE[focus]} className={className}>
            {FOCUS_LABEL[focus]}
        </Tag>
    );
}

/** A fortnight, oldest first. Kept = filled; rest = hollow; frozen = a flake. */
export function StreakStrip({ days, className, onPick }: { days: HabitDay[]; className?: string; onPick?: (day: HabitDay) => void }) {
    return (
        <ul className={cn("flex items-end gap-[3px]", className)}>
            {days.map((d) => {
                const label = `${dayNumber(d.date)}: ${d.rest ? "rest day" : d.frozen ? "frozen" : d.kept ? "kept" : d.value > 0 ? `part way (${d.value})` : "not logged"}`;
                const look = d.rest
                    ? "border border-dashed border-line-strong bg-transparent text-caption"
                    : d.frozen
                      ? "bg-sky-soft text-sky"
                      : d.kept
                        ? "bg-brand text-white"
                        : d.value > 0
                          ? "bg-brand-soft text-brand-ink"
                          : "bg-line text-caption";
                const body = (
                    <span className={cn("grid h-7 w-[calc(100%-0px)] min-w-5 flex-1 place-items-center rounded-xs text-[10px] font-semibold", look, d.today && "ring-2 ring-brand ring-offset-1 ring-offset-card")}>
                        {d.frozen ? <Snowflake size={11} aria-hidden="true" /> : d.kept ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : d.rest ? "·" : ""}
                    </span>
                );
                return (
                    <li key={d.date} className="flex-1" title={label}>
                        {onPick ? (
                            <button type="button" className="flex w-full" onClick={() => onPick(d)} aria-label={label}>
                                {body}
                            </button>
                        ) : (
                            <span className="flex w-full" aria-label={label} role="img">
                                {body}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export function StreakPill({ stats, className }: { stats: HabitStats; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-live-soft px-2.5 py-1 text-xs font-semibold text-live-ink", className)}>
            <Flame size={12} aria-hidden="true" />
            {stats.current} day{stats.current === 1 ? "" : "s"}
            {stats.best > stats.current && <span className="font-normal opacity-75">· best {stats.best}</span>}
        </span>
    );
}

/**
 * AC 3, drawn. The bar is the shop against what is left in the food envelope;
 * over budget it turns and says by how much, in plain money.
 */
export function BudgetBar({ totalCents, remainingCents, currency, note, className }: { totalCents: number; remainingCents: number; currency: string; note?: ReactNode; className?: string }) {
    const v = budgetVerdict(totalCents, remainingCents);
    const width = Math.min(100, v.pct);
    return (
        <div className={cn("rounded-lg p-4", v.over ? "bg-danger-soft" : v.near ? "bg-peach-soft" : "bg-page", className)}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-display text-3xl leading-7">
                    <Money cents={totalCents} currency={currency} />
                    <span className="ml-2 text-sm font-sans text-muted">this week&apos;s shop</span>
                </p>
                <p className="text-sm text-muted">
                    {remainingCents > 0 ? (
                        <>
                            <Money cents={remainingCents} currency={currency} className="font-semibold text-ink" /> left in the food envelope
                        </>
                    ) : (
                        "No food budget figure yet"
                    )}
                </p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={v.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Shopping against the food budget">
                <span className={cn("block h-full rounded-full transition-[width] duration-500", v.over ? "bg-danger" : v.near ? "bg-peach" : "bg-brand")} style={{ width: `${width}%` }} />
            </div>
            <p className={cn("mt-2.5 text-sm leading-5", v.over ? "font-semibold text-danger-ink" : "text-muted")}>
                {v.over ? `Over by ${money(v.diffCents, currency)}. Swap a dinner or drop what can wait.` : v.near ? "Close to the line — worth a look before you order." : remainingCents > 0 ? `${100 - Math.min(100, v.pct)}% of the envelope still to spend.` : "Open Finance to price this against the groceries budget."}
            </p>
            {note && <div className="mt-2 text-xs text-caption">{note}</div>}
        </div>
    );
}

/** A child's reward, said out loud. Dismisses itself; a tap closes it sooner. */
export function Celebration({ sprouts, title, streak, onDone }: { sprouts: number; title: string; streak: number; onDone: () => void }) {
    useEffect(() => {
        const t = window.setTimeout(onDone, 2600);
        return () => window.clearTimeout(t);
    }, [onDone]);
    return (
        <button type="button" onClick={onDone} className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-6" aria-live="polite">
            <span className="flex max-w-xs flex-col items-center gap-2 rounded-2xl bg-card px-8 py-9 text-center shadow-app">
                <span className="grid size-14 place-items-center rounded-full bg-live-soft text-live-ink">
                    <Sparkles size={26} aria-hidden="true" />
                </span>
                <span className="font-display text-5xl leading-8">+{sprouts} Sprouts</span>
                <span className="text-base text-muted">{title}</span>
                <span className="text-md font-semibold text-brand">{streak} day{streak === 1 ? "" : "s"} in a row</span>
            </span>
        </button>
    );
}

/** A member's week at a glance, used on the habits screen and the overview. */
export function WeekMeter({ kept, expected, pct, className }: { kept: number; expected: number; pct: number; className?: string }) {
    return (
        <div className={className}>
            <div className="flex items-baseline justify-between text-xs text-muted">
                <span>This week</span>
                <span className="tabular-nums">
                    {kept} of {expected} kept
                </span>
            </div>
            <ProgressBar value={pct} className="mt-1.5" label="Habits kept this week" />
        </div>
    );
}
