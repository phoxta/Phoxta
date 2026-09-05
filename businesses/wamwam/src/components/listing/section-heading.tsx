import clsx from "clsx";
import type { HTMLAttributes } from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface SectionHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
    level?: HeadingLevel;
}

export function SectionHeading({ className, children, level: Lv = "h2", ...props }: SectionHeadingProps) {
    return (
        <Lv className={clsx("text-[1.375rem] font-medium", className)} {...props}>
            {children}
        </Lv>
    );
}

export function SectionSubheading({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={clsx("mt-2 block text-base/6 text-neutral-500 dark:text-neutral-300", className)} {...props}>
            {children}
        </h3>
    );
}
