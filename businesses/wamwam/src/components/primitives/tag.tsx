import type { ReactNode } from "react";
import AppLink from "@/lib/nav/link";

interface TagProps {
    className?: string;
    children?: ReactNode;
    href?: string;
}

export default function Tag({ className = "", children, href }: TagProps) {
    return (
        <AppLink
            className={`nc-Tag inline-block rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm text-neutral-600 hover:border-neutral-200 md:px-4 md:py-2.5 dark:border-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 ${className}`}
            href={href || "#"}
        >
            {children}
        </AppLink>
    );
}
