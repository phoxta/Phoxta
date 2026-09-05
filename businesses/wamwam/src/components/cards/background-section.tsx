import type { ReactNode } from "react";

export interface BackgroundSectionProps {
    className?: string;
    children?: ReactNode;
}

// The default keeps its trailing space: the rendered class attribute must match byte-for-byte.
export default function BackgroundSection({ className = "bg-neutral-50 dark:bg-white/5 ", children }: BackgroundSectionProps) {
    return (
        <div
            className={`absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 xl:max-w-[1340px] xl:rounded-[40px] 2xl:max-w-(--breakpoint-2xl) ${className}`}
        >
            {children}
        </div>
    );
}
