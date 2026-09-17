import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CloudOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { MOODS } from "../derive";
import { useOnline } from "../pwa";

/**
 * The small pieces the three dashboards share.
 *
 * `Widget` exists for one reason: the brief says an empty widget must show a
 * demo-load or a single next action, never a blank card. Passing `empty` makes
 * that the default rather than something each card remembers to do.
 */

export function Widget({
    title,
    sub,
    icon,
    action,
    tone = "card",
    empty,
    isEmpty,
    children,
    className,
}: {
    title: string;
    sub?: string;
    icon?: ReactNode;
    action?: ReactNode;
    tone?: "card" | "home" | "live" | "grow";
    empty?: { line: string; to?: string; cta?: string };
    isEmpty?: boolean;
    children?: ReactNode;
    className?: string;
}) {
    const bg = tone === "home" ? "bg-home-soft" : tone === "live" ? "bg-live-soft" : tone === "grow" ? "bg-grow-soft" : "bg-card";
    return (
        <section className={cn("flex flex-col rounded-xl p-4 md:p-5", bg, className)}>
            <div className="mb-3 flex items-start gap-3">
                {icon && <span className="mt-0.5 shrink-0 text-brand">{icon}</span>}
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl leading-6">{title}</h2>
                    {sub && <p className="mt-0.5 text-xs text-caption">{sub}</p>}
                </div>
                {action}
            </div>
            {isEmpty && empty ? <NextAction line={empty.line} to={empty.to} cta={empty.cta} /> : children}
        </section>
    );
}

/**
 * The honest line under a capped list.
 *
 * Every section on Home that shows three of something must print how many
 * there really are and where the rest live. It is the cheapest guarantee that
 * selection never quietly becomes deletion, and it makes the caps auditable by
 * anyone looking at the screen.
 */
export function Overflow({ children, to, cta, className }: { children: ReactNode; to?: string; cta?: string; className?: string }) {
    return (
        <p className={cn("text-sm leading-5 text-muted", className)}>
            {children}
            {to && cta && (
                <>
                    {" "}
                    <Link to={to} className="font-semibold text-brand underline underline-offset-4">
                        {cta}
                    </Link>
                </>
            )}
        </p>
    );
}

/**
 * The one thing to do when a card has nothing to show.
 *
 * The action is optional on purpose. An empty "Needs you" is a reward, not a
 * task, and a guest with no grant for a module must never be handed a door she
 * has no key to — for those, one honest sentence is the whole empty state.
 */
export function NextAction({ line, to, cta }: { line: string; to?: string; cta?: string }) {
    return (
        <div className="rounded-lg bg-page px-4 py-4">
            <p className="text-sm leading-5 text-muted">{line}</p>
            {to && cta && (
                <Link to={to} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    {cta}
                    <ArrowRight size={14} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

/** Five hearts — the mood scale, readable and tappable. */
export function MoodHearts({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
    const dim = size === "sm" ? "size-8 text-lg" : "size-12 text-4xl";
    if (!onChange) {
        return (
            <span className="inline-flex items-center gap-0.5" aria-label={`Mood ${value} out of 5`}>
                {MOODS.map((m) => (
                    <span key={m.value} className={cn("leading-none", size === "sm" ? "text-sm" : "text-lg", m.value <= value ? "opacity-100" : "opacity-20")} aria-hidden="true">
                        ♥
                    </span>
                ))}
            </span>
        );
    }
    return (
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="How was today?">
            {MOODS.map((m) => (
                <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={value === m.value}
                    aria-label={m.label}
                    title={m.label}
                    onClick={() => onChange(m.value)}
                    className={cn("grid place-items-center rounded-full border transition-colors", dim, value === m.value ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}
                >
                    <span aria-hidden="true">{m.emoji}</span>
                </button>
            ))}
        </div>
    );
}

/** A chip under the briefing: one thing the briefing was written from. */
export function SourceChip({ children }: { children: ReactNode }) {
    return <span className="inline-flex items-center rounded-full bg-page px-2.5 py-1 text-2xs font-medium text-muted">{children}</span>;
}

/**
 * The one line Home owes a family with no signal.
 *
 * The offline shell (see ../pwa.ts) means today's list and the packing list
 * still render from what is already on the device — but the companion cannot
 * answer and nothing syncs, so the screen says so rather than letting a
 * parent wonder why the briefing will not regenerate.
 */
export function OfflineNotice() {
    const online = useOnline();
    if (online) return null;
    return (
        <p className="flex items-center gap-2 rounded-xl bg-page px-4 py-3 text-sm leading-5 text-muted" role="status">
            <CloudOff size={16} className="shrink-0" aria-hidden="true" />
            You&apos;re offline. Today, your lists and your packing are all here; the companion and anything new from the rest of the family will arrive when you&apos;re back.
        </p>
    );
}
