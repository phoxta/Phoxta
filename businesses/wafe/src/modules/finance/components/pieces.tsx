import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { useSpace } from "@/state/space";
import { Money, PageTitle } from "@/components/shared";
import { Tag } from "@/components/ui/primitives";
import { BASE, addMonths, monthLabel, monthOf, shortMonth } from "../derive";
import type { CategoryColour, CategorySpend, FinanceState, MonthPoint, WishItem, WishStatus } from "../types";

/**
 * The module's own furniture: the tab rail, the month picker, a budget bar that
 * reads as money rather than as a percentage, the two charts and the cards for
 * a bill and a wish. Everything here is presentational — the numbers arrive
 * already computed by `derive.ts`.
 */

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export const BAR_FILL: Record<CategoryColour, string> = {
    brand: "bg-brand",
    live: "bg-live",
    terra: "bg-terra",
    ochre: "bg-ochre",
    plum: "bg-plum",
    sage: "bg-sage",
    mint: "bg-mint",
};

export const DOT_FILL: Record<CategoryColour, string> = {
    brand: "bg-brand",
    live: "bg-live",
    terra: "bg-terra",
    ochre: "bg-ochre",
    plum: "bg-plum",
    sage: "bg-sage",
    mint: "bg-mint",
};

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const TABS: Array<{ to: string; label: string; end?: boolean }> = [
    { to: BASE, label: "Overview", end: true },
    { to: `${BASE}/budgets`, label: "Budgets" },
    { to: `${BASE}/ledger`, label: "Ledger" },
    { to: `${BASE}/bills`, label: "Bills" },
    { to: `${BASE}/purchases`, label: "Purchases" },
    { to: `${BASE}/giving`, label: "Giving" },
];

export function FinanceNav({ readOnly }: { readOnly?: boolean }) {
    const tabs = readOnly ? TABS.filter((t) => t.label === "Overview" || t.label === "Budgets") : TABS;
    return (
        <nav aria-label="Finance" className="rail mb-6 md:mx-0 md:flex-wrap md:px-0">
            {tabs.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                        cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", isActive ? "border-brand bg-brand text-white" : "border-line-strong text-muted hover:border-ink hover:text-ink")
                    }
                >
                    {t.label}
                </NavLink>
            ))}
        </nav>
    );
}

// ---------------------------------------------------------------------------
// Month picker
// ---------------------------------------------------------------------------

export function MonthPicker({ month, onChange, today, className }: { month: string; onChange: (m: string) => void; today: string; className?: string }) {
    const max = monthOf(today);
    const canForward = month < max;
    return (
        <div className={cn("inline-flex items-center gap-1 rounded-full border border-line-strong bg-card p-1", className)}>
            <button type="button" onClick={() => onChange(addMonths(month, -1))} aria-label="The month before" className="grid size-8 place-items-center rounded-full text-muted hover:bg-page hover:text-ink">
                <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold">{monthLabel(month)}</span>
            <button
                type="button"
                onClick={() => canForward && onChange(addMonths(month, 1))}
                disabled={!canForward}
                aria-label="The month after"
                className="grid size-8 place-items-center rounded-full text-muted enabled:hover:bg-page enabled:hover:text-ink disabled:opacity-35"
            >
                <ChevronRight size={16} aria-hidden="true" />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Budget bars
// ---------------------------------------------------------------------------

export function BudgetBar({ c, action }: { c: CategorySpend; action?: ReactNode }) {
    const { space } = useSpace();
    const width = Math.min(100, c.budgetCents > 0 ? Math.round((c.spentCents / c.budgetCents) * 100) : 0);
    const left = c.budgetCents - c.spentCents;
    return (
        <li className="rounded-lg bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex items-center gap-2 text-md font-semibold">
                    <span className={cn("size-2 shrink-0 rounded-full", DOT_FILL[c.colour])} aria-hidden="true" />
                    {c.name}
                    {c.isGiving && (
                        <Tag tone="live" className="ml-1">
                            Giving
                        </Tag>
                    )}
                    {c.isSavings && (
                        <Tag tone="ok" className="ml-1">
                            Saving
                        </Tag>
                    )}
                </span>
                <span className="text-sm tabular-nums text-muted">
                    <Money cents={c.spentCents} className="font-semibold text-ink" /> of <Money cents={c.budgetCents} />
                </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name}: ${c.pct}% of budget`}>
                <span className={cn("block h-full rounded-full transition-[width] duration-500", c.over ? "bg-danger" : c.near ? "bg-peach" : BAR_FILL[c.colour])} style={{ width: `${width}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className={cn(c.over ? "font-semibold text-danger-ink" : "text-caption")}>
                    {c.budgetCents === 0 ? "No limit set" : c.over ? `${money(Math.abs(left), space.currency)} over` : `${money(left, space.currency)} left · ${c.pct}%`}
                </span>
                {action}
            </div>
        </li>
    );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

/** Spend by category as a horizontal bar list — readable on a phone, unlike a pie. */
export function CategoryChart({ categories }: { categories: CategorySpend[] }) {
    const rows = categories.filter((c) => c.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents);
    const max = Math.max(1, ...rows.map((r) => r.spentCents));
    if (!rows.length) return <p className="rounded-lg bg-page p-4 text-sm text-muted">Nothing has been spent this month yet.</p>;
    return (
        <ul className="rounded-lg bg-page p-4">
            {rows.map((c) => (
                <li key={c.categoryId} className="mb-3 last:mb-0">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-medium">{c.name}</span>
                        <Money cents={c.spentCents} className="shrink-0 tabular-nums text-muted" />
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-track">
                        <span className={cn("block h-full rounded-full", BAR_FILL[c.colour])} style={{ width: `${Math.round((c.spentCents / max) * 100)}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Six months of in and out, side by side. */
export function InOutChart({ points }: { points: MonthPoint[] }) {
    const max = Math.max(1, ...points.flatMap((p) => [p.incomeCents, p.spentCents]));
    return (
        <figure className="rounded-lg bg-page px-4 pb-3 pt-4">
            <ul className="flex h-28 items-end justify-around gap-2">
                {points.map((p) => (
                    <li key={p.month} className="flex h-full flex-1 items-end justify-center gap-1">
                        <span
                            className="w-3 rounded-t-[4px] bg-sage md:w-4"
                            style={{ height: `${Math.max(2, Math.round((p.incomeCents / max) * 100))}%` }}
                            role="img"
                            aria-label={`${shortMonth(p.month)}: ${money(p.incomeCents)} in`}
                        />
                        <span
                            className="w-3 rounded-t-[4px] bg-terra md:w-4"
                            style={{ height: `${Math.max(2, Math.round((p.spentCents / max) * 100))}%` }}
                            role="img"
                            aria-label={`${shortMonth(p.month)}: ${money(p.spentCents)} out`}
                        />
                    </li>
                ))}
            </ul>
            <figcaption className="mt-3 flex justify-around gap-2 text-2xs text-muted">
                {points.map((p) => (
                    <span key={p.month} className="flex-1 text-center">
                        {shortMonth(p.month)}
                    </span>
                ))}
            </figcaption>
            <p className="mt-2 flex items-center justify-center gap-4 text-2xs text-caption">
                <span className="inline-flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-sage" aria-hidden="true" /> In
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-terra" aria-hidden="true" /> Out
                </span>
            </p>
        </figure>
    );
}

// ---------------------------------------------------------------------------
// Small bits
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<WishStatus, "brand" | "ok" | "warn" | "danger" | "neutral" | "live"> = {
    requested: "warn",
    approved: "ok",
    planned: "brand",
    deferred: "neutral",
    declined: "danger",
    bought: "live",
};

export function WishStatusTag({ status }: { status: WishStatus }) {
    const label: Record<WishStatus, string> = {
        requested: "Waiting",
        approved: "Approved",
        planned: "Planned",
        deferred: "Not yet",
        declined: "Declined",
        bought: "Bought",
    };
    return <Tag tone={STATUS_TONE[status]}>{label[status]}</Tag>;
}

/** An amount typed in pounds, stored in pence. */
export function AmountField({ label, value, onChange, id, hint, required, className }: { label: string; value: number; onChange: (cents: number) => void; id: string; hint?: string; required?: boolean; className?: string }) {
    const { space } = useSpace();
    const symbol = space.currency === "GBP" ? "£" : space.currency === "USD" ? "$" : space.currency === "EUR" ? "€" : space.currency;
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                {label}
            </label>
            <div className="flex h-[46px] items-center gap-2 rounded-md border border-line-strong bg-card px-4 text-md focus-within:border-brand">
                <span className="shrink-0 text-muted">{symbol}</span>
                <input
                    id={id}
                    inputMode="decimal"
                    required={required}
                    value={value ? (value / 100).toFixed(2).replace(/\.00$/, "") : ""}
                    onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        onChange(Math.round((Number(raw) || 0) * 100));
                    }}
                    placeholder="0"
                    className="min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-caption"
                />
            </div>
            {hint && <p className="text-xs text-caption">{hint}</p>}
        </div>
    );
}

export function CategorySelect({ id, label = "Category", value, onChange, state, kind = "expense" }: { id: string; label?: string; value: string; onChange: (v: string) => void; state: FinanceState; kind?: "income" | "expense" }) {
    const list = state.budgets.filter((c) => c.active && c.kind === kind).sort((a, b) => a.order - b.order);
    return (
        <label htmlFor={id} className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                {list.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>
        </label>
    );
}

/**
 * What a child or a guest sees if they reach a finance screen: an honest,
 * warm wall rather than an error — and the one door that IS theirs.
 */
export function MoneyIsPrivate({ mine }: { mine: number }) {
    return (
        <div>
            <PageTitle title="This part is Mum and Dad's" sub="The family's money — the budget, the bills, what we give — stays with the grown-ups. That is not a punishment; it is just whose job it is." area="live" />
            <div className="rounded-xl bg-card p-6">
                <p className="text-base leading-7">
                    What you <em>can</em> do here is ask for something. Write down what you would like and why, and a parent answers you on the same screen — you will see whether it was a yes, a not-yet or a no, and what they said
                    about it.
                </p>
                <Link to={`${BASE}/wish`} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                    <Sparkles size={16} aria-hidden="true" />
                    {mine ? `My wishes (${mine})` : "Ask for something"}
                </Link>
            </div>
        </div>
    );
}

/** A wish, however it is being looked at. */
export function WishThumb({ wish, className }: { wish: WishItem; className?: string }) {
    if (!wish.imageUrl) return null;
    return <img src={wish.imageUrl} alt="" width={96} height={72} loading="lazy" className={cn("size-16 shrink-0 rounded-md object-cover md:size-[72px]", className)} />;
}
