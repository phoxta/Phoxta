import { cn } from "@/lib/cn";

/**
 * The Wàfè marks. The sprig is the logo's line icon — a stem with three
 * leaves — drawn in currentColor so it sits on olive, cream or a photo.
 */
export function Sprig({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21V9" />
            <path d="M12 13c0-3 2.5-5 6-5 0 3-2.5 5-6 5z" />
            <path d="M12 17c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" />
            <path d="M12 9c0-2.5 1.5-5 4-6-.5 3-2 5-4 6z" />
        </svg>
    );
}

/** Olive disc with the sprig, at any size. */
export function Mark({ className, size = 32 }: { className?: string; size?: number }) {
    return (
        <span className={cn("grid shrink-0 place-items-center rounded-full bg-brand text-white", className)} style={{ width: size, height: size }} aria-hidden="true">
            <Sprig className="size-[55%]" />
        </span>
    );
}

/** Mark + wordmark. `name` overrides the wordmark for a tenant. */
export function Wordmark({ name = "Wàfè", size = 32, className, light }: { name?: string; size?: number; className?: string; light?: boolean }) {
    return (
        <span className={cn("inline-flex items-center gap-3", className)}>
            <Mark size={size} className={light ? "bg-white/20 text-white" : undefined} />
            <span className={cn("font-display text-3xl font-semibold leading-none tracking-[-0.03em]", light ? "text-white" : "text-ink")}>{name}</span>
        </span>
    );
}
