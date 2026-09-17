import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/state/toast";
import { IconButton } from "@/components/ui/primitives";

/**
 * Overlays on the platform's own primitives: a native <dialog> (focus trap,
 * Escape and backdrop for free) that is a centred modal on desktop and a
 * bottom sheet on a phone, a Primer-style action list, and the toast stack.
 *
 * Untitled UI's overlay finish throughout: a 12px surface lifted on
 * `shadow-app`, a hairline so the white never floats free of the page, and a
 * toast that is a card with a status dot rather than a coloured pill.
 */

export function Dialog({ open, onClose, title, children, className, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string; wide?: boolean }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);
    return (
        // A native <dialog> already closes on Escape; the click only closes on the backdrop.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <dialog
            ref={ref}
            className="cs-dialog"
            onClose={onClose}
            onClick={(e) => {
                if (e.target === ref.current) onClose();
            }}
        >
            <div className="flex h-full items-end justify-center md:items-center md:p-6">
                <div role="document" className={cn("flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-sheet md:rounded-xl md:shadow-app", wide ? "md:max-w-2xl" : "md:max-w-md", className)}>
                    <header className="flex items-center gap-3 border-b border-line px-5 py-4">
                        <h2 className="flex-1 font-display text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
                        <IconButton label="Close" size="md" onClick={onClose}>
                            <X size={16} />
                        </IconButton>
                    </header>
                    <div className="overflow-y-auto px-5 py-4">{children}</div>
                </div>
            </div>
        </dialog>
    );
}

export function Menu({ trigger, items, align = "end" }: { trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => ReactNode; items: { label: string; onSelect: () => void; danger?: boolean }[]; align?: "start" | "end" }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    return (
        <div ref={ref} className="relative">
            {trigger({ onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "menu" })}
            {open && (
                <ul role="menu" className={cn("absolute top-full z-30 mt-1.5 min-w-48 overflow-hidden rounded-md border border-line bg-card p-1 shadow-app", align === "end" ? "right-0" : "left-0")}>
                    {items.map((it) => (
                        <li key={it.label} role="none">
                            <button
                                type="button"
                                role="menuitem"
                                className={cn("block w-full rounded-xs px-2.5 py-2 text-left text-md font-medium hover:bg-page", it.danger ? "text-danger-ink hover:bg-danger-soft" : "text-ink")}
                                onClick={() => {
                                    setOpen(false);
                                    it.onSelect();
                                }}
                            >
                                {it.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function Toasts() {
    const { toasts, dismiss } = useToast();
    if (!toasts.length) return null;
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
            {toasts.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-lg border border-line bg-card px-3.5 py-2.5 text-left text-md font-medium text-ink shadow-app"
                >
                    <span className={cn("size-2 shrink-0 rounded-full", t.tone === "success" ? "bg-mint" : t.tone === "danger" ? "bg-danger" : "bg-brand")} aria-hidden="true" />
                    {t.message}
                </button>
            ))}
        </div>
    );
}
