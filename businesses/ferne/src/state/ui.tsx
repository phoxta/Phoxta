import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Store chrome: which overlay is open, and the toast queue.
 *
 * One overlay at a time by construction — opening the bag closes the menu — so
 * the page can never end up with two drawers and two scroll locks fighting.
 */

export type Overlay = "cart" | "menu" | "search" | null;

export type Toast = {
    id: number;
    message: string;
    action?: { to: string; label: string };
};

type UiState = {
    overlay: Overlay;
    open: (overlay: Exclude<Overlay, null>) => void;
    close: () => void;
    toasts: Toast[];
    toast: (message: string, action?: Toast["action"]) => void;
    dismiss: (id: number) => void;
};

const TOAST_MS = 3200;

const Ctx = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
    const [overlay, setOverlay] = useState<Overlay>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(1);
    const timers = useRef<number[]>([]);

    const open = useCallback((next: Exclude<Overlay, null>) => setOverlay(next), []);
    const close = useCallback(() => setOverlay(null), []);

    // Lock the page behind an overlay, and let Escape out of it.
    useEffect(() => {
        if (!overlay) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOverlay(null);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [overlay]);

    const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

    const toast = useCallback(
        (message: string, action?: Toast["action"]) => {
            const id = nextId.current++;
            setToasts((prev) => [...prev, { id, message, action }]);
            const timer = window.setTimeout(() => dismiss(id), TOAST_MS);
            timers.current.push(timer);
        },
        [dismiss],
    );

    // Every pending dismissal is cleared on unmount, so a navigation away from
    // the store can't fire a state update into a dead tree.
    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach((t) => window.clearTimeout(t));
    }, []);

    const value = useMemo<UiState>(
        () => ({ overlay, open, close, toasts, toast, dismiss }),
        [overlay, open, close, toasts, toast, dismiss],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi(): UiState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useUi must be used inside <UiProvider>");
    return ctx;
}
