import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Illustration, type IllustrationName } from "@/components/ui/Illustration";
import { SplitLines } from "@/components/ui/motion";

/**
 * The panel every Home opens with.
 *
 * Home is the screen a parent is meant to read in under a minute, so it gets
 * the same hero the five area pages get — a tinted panel in the area's own
 * colour, the greeting set as the headline, and a drawing beside it — rather
 * than the bare heading it carried before. Parent, child, little and guest all
 * come through here, so the four Homes open the same way and only the words,
 * the colour and the drawing change.
 */
export function HomeHero({
    kicker,
    title,
    sub,
    actions,
    art = "gather",
    tone = "home",
    className,
}: {
    /** Small line above the greeting: the date, or the child's own word for today. */
    kicker?: ReactNode;
    title: string;
    sub?: ReactNode;
    actions?: ReactNode;
    art?: IllustrationName;
    /** Which area's tint the panel takes. Home is olive; a child's is warmer. */
    tone?: "home" | "grow" | "create" | "live";
    /** Child mode reads larger, so the caller can raise the headline size. */
    className?: string;
}) {
    const TINT = {
        home: "bg-home-wash",
        grow: "bg-grow-soft",
        create: "bg-create-soft",
        live: "bg-live-soft",
    }[tone];

    return (
        <header
            className={cn("paper grid items-center gap-6 overflow-hidden rounded-xl px-6 py-7 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:px-9 md:py-9", TINT, className)}
            data-shown="true"
        >
            <div className="min-w-0">
                {kicker && <div className="mb-2 text-2xs font-medium uppercase tracking-[0.08em] text-caption">{kicker}</div>}
                <SplitLines as="h1" className="font-display text-7xl leading-9 md:text-8xl md:leading-[1.1]" text={title} />
                {sub && <p className="mt-2.5 max-w-xl text-base leading-6 text-muted">{sub}</p>}
                {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {/* Decorative: the greeting beside it already says what this is. */}
            <div className="justify-self-end max-md:hidden" aria-hidden="true">
                <Illustration name={art} className="w-full max-w-[290px]" />
            </div>
        </header>
    );
}
