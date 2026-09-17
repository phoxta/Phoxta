import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/primitives";

/**
 * A right-side panel: notifications, the companion.
 *
 * Deliberately not a native <dialog>: the companion has to sit BESIDE the page
 * without blocking it, so this is a plain region with dialog semantics, Escape
 * to close and focus handed back to the control that opened it. The backdrop
 * is only drawn where the panel actually covers the page — always on a phone,
 * and on desktop only when the caller asks for a modal.
 */
export function Drawer({
    open,
    onClose,
    title,
    sub,
    icon,
    children,
    footer,
    headerExtra,
    backdrop = "always",
    className,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    sub?: string;
    icon?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    headerExtra?: ReactNode;
    /** "always": modal everywhere. "mobile": the page stays usable on desktop. */
    backdrop?: "always" | "mobile";
    className?: string;
}) {
    const panel = useRef<HTMLDivElement>(null);
    const restore = useRef<HTMLElement | null>(null);
    const close = useRef(onClose);
    close.current = onClose;
    const [shown, setShown] = useState(false);

    // Slide in on the frame after mount so the transition has a starting state.
    useEffect(() => {
        if (!open) {
            setShown(false);
            return;
        }
        const id = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        restore.current = document.activeElement as HTMLElement | null;
        const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
        first?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close.current();
        };
        document.addEventListener("keydown", onKey);
        const lock = backdrop === "always";
        const prev = document.body.style.overflow;
        if (lock) document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            if (lock) document.body.style.overflow = prev;
            restore.current?.focus?.();
        };
    }, [open, backdrop]);

    if (!open) return null;
    const titleId = `drawer-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return (
        <>
            <button
                type="button"
                aria-label="Close panel"
                onClick={onClose}
                className={cn("fixed inset-0 z-40 bg-ink/35 transition-opacity", shown ? "opacity-100" : "opacity-0", backdrop === "mobile" && "md:hidden")}
            />
            <div
                ref={panel}
                role="dialog"
                aria-modal={backdrop === "always" ? true : undefined}
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn(
                    "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-page shadow-app outline-none transition-transform duration-200 ease-out md:w-[420px]",
                    shown ? "translate-x-0" : "translate-x-full",
                    className,
                )}
            >
                <header className="flex items-center gap-3 border-b border-line bg-card px-5 py-3.5">
                    {icon && <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white">{icon}</span>}
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="truncate font-display text-2xl leading-6">
                            {title}
                        </h2>
                        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
                    </div>
                    {headerExtra}
                    <IconButton label="Close" size="md" onClick={onClose}>
                        <X size={16} />
                    </IconButton>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && <div className="border-t border-line bg-card">{footer}</div>}
            </div>
        </>
    );
}
