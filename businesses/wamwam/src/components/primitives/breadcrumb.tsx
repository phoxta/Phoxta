import type { ComponentProps } from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons";

function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
    return <nav aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...props} />;
}

function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
    return (
        <ol
            data-slot="breadcrumb-list"
            className={cn(
                "flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5",
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
    return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

function BreadcrumbLink({ asChild, className, ...props }: ComponentProps<"a"> & { asChild?: boolean }) {
    const Comp = asChild ? Slot.Root : "a";

    return <Comp data-slot="breadcrumb-link" className={cn("transition-colors hover:text-foreground", className)} {...props} />;
}

/** The current crumb is plain text, not a link, so it carries only aria-current. */
function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
    return (
        <span
            data-slot="breadcrumb-page"
            aria-current="page"
            className={cn("font-normal text-foreground", className)}
            {...props}
        />
    );
}

function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<"li">) {
    return (
        <li
            data-slot="breadcrumb-separator"
            role="presentation"
            aria-hidden="true"
            className={cn("[&>svg]:size-3.5", className)}
            {...props}
        >
            {children ?? <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="rtl:rotate-180" />}
        </li>
    );
}

function BreadcrumbEllipsis({ className, ...props }: ComponentProps<"span">) {
    return (
        <span
            data-slot="breadcrumb-ellipsis"
            role="presentation"
            aria-hidden="true"
            className={cn("flex size-5 items-center justify-center [&>svg]:size-4", className)}
            {...props}
        >
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
            <span className="sr-only">More</span>
        </span>
    );
}

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
};
