import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { Button } from "./button";
import PaginationDemo from "./pagination-demo";

export function Pagination({
    "aria-label": ariaLabel = "Page navigation",
    className,
    ...props
}: ComponentPropsWithoutRef<"nav">) {
    return <nav aria-label={ariaLabel} {...props} className={clsx(className, "flex flex-wrap gap-x-2")} />;
}

type PaginationEdgeProps = PropsWithChildren<{ href?: string | null; className?: string }>;

export function PaginationPrevious({ href = null, className, children = "Previous" }: PaginationEdgeProps) {
    return (
        <span className={clsx(className, "grow basis-0")}>
            <Button
                {...(href === null ? { disabled: true } : { href })}
                className="rounded-lg"
                plain
                aria-label="Previous page"
            >
                <HugeiconsIcon icon={ArrowLeft02Icon} size={16} color="currentColor" strokeWidth={1.5} />

                {children}
            </Button>
        </span>
    );
}

export function PaginationNext({ href = null, className, children = "Next" }: PaginationEdgeProps) {
    return (
        <span className={clsx(className, "flex grow basis-0 justify-end")}>
            <Button {...(href === null ? { disabled: true } : { href })} className="rounded-lg" plain aria-label="Next page">
                {children}
                <HugeiconsIcon icon={ArrowRight02Icon} size={16} color="currentColor" strokeWidth={1.5} />
            </Button>
        </span>
    );
}

export function PaginationList({ className, ...props }: ComponentPropsWithoutRef<"span">) {
    return <span {...props} className={clsx(className, "hidden items-baseline gap-x-2 sm:flex")} />;
}

type PaginationPageProps = PropsWithChildren<{ href: string; className?: string; current?: boolean }>;

export function PaginationPage({ href, className, current = false, children }: PaginationPageProps) {
    return (
        <Button
            href={href}
            plain
            aria-label={`Page ${children}`}
            aria-current={current ? "page" : undefined}
            className={clsx(
                className,
                "min-w-[2.25rem] rounded-lg before:absolute before:-inset-px before:rounded-lg",
                current && "before:bg-neutral-950/5 dark:before:bg-white/10",
            )}
        >
            <span className="-mx-0.5">{children}</span>
        </Button>
    );
}

export function PaginationGap({ className, children = <>&hellip;</>, ...props }: ComponentPropsWithoutRef<"span">) {
    return (
        <span
            aria-hidden="true"
            {...props}
            className={clsx(
                className,
                "w-[2.25rem] text-center text-sm/6 font-semibold text-neutral-950 select-none dark:text-white",
            )}
        >
            {children}
        </span>
    );
}

/**
 * The default export is the fixed demo pager the listing/search pages render.
 * Its markup lives in pagination-demo.tsx; the two modules reference each
 * other only inside render functions, so the import cycle is benign.
 */
export default function PaginationComponent() {
    return <PaginationDemo />;
}
