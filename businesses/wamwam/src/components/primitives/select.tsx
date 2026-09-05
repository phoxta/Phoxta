import * as Headless from "@headlessui/react";
import clsx from "clsx";
import type { Ref } from "react";

export type SelectProps = { className?: string; ref?: Ref<HTMLSelectElement> } & Omit<Headless.SelectProps, "as" | "className">;

/**
 * Native <select> with the browser chevron suppressed (appearance-none) and
 * no replacement drawn; the right padding stays reserved. Intentional.
 */
export default function Select({ className, multiple, ref, ...props }: SelectProps) {
    return (
        <span
            data-slot="control"
            className={clsx([
                className,
                // Basic layout
                "group relative block w-full",
                // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
                "dark:before:hidden",
                // Focus ring
                "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset has-data-focus:after:ring-2 has-data-focus:after:ring-blue-500",
                // Disabled state
                "has-data-disabled:opacity-50 has-data-disabled:before:bg-neutral-950/5 has-data-disabled:before:shadow-none",
            ])}
        >
            <Headless.Select
                ref={ref}
                multiple={multiple}
                {...props}
                className={clsx([
                    // Basic layout
                    "relative block w-full appearance-none rounded-full px-3.5 py-2",
                    // Horizontal padding
                    multiple
                        ? "px-[calc(--spacing(3.5)-1px)] sm:px-[calc(--spacing(3)-1px)]"
                        : "pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]",
                    // Options (multi-select)
                    "[&_optgroup]:font-semibold",
                    // Typography
                    "text-base/6 text-neutral-950 placeholder:text-neutral-500 sm:text-sm/6 dark:text-white dark:*:text-white",
                    // Border
                    "border border-neutral-300 data-hover:border-neutral-400 dark:border-white/10 dark:data-hover:border-white/20",
                    // Background color
                    "bg-transparent dark:bg-white/5 dark:*:bg-neutral-800",
                    // Hide default focus styles
                    "focus:outline-hidden",
                    // Invalid state
                    "data-invalid:border-red-500 data-invalid:data-hover:border-red-500 dark:data-invalid:border-red-600 dark:data-invalid:data-hover:border-red-600",
                    // Disabled state
                    "data-disabled:border-neutral-950/20 data-disabled:opacity-100 dark:data-disabled:border-white/15 dark:data-disabled:bg-white/[2.5%] dark:data-hover:data-disabled:border-white/15",
                ])}
            />
        </span>
    );
}
