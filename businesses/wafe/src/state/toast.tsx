import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type Toast = { id: number; message: string; tone: "default" | "success" | "danger" };

type ToastCtx = {
    toasts: Toast[];
    toast: (message: string, tone?: Toast["tone"]) => void;
    dismiss: (id: number) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const next = useRef(1);
    const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
    const toast = useCallback(
        (message: string, tone: Toast["tone"] = "default") => {
            const id = next.current++;
            setToasts((t) => [...t.slice(-2), { id, message, tone }]);
            window.setTimeout(() => dismiss(id), 3200);
        },
        [dismiss],
    );
    const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useToast(): ToastCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useToast outside ToastProvider");
    return ctx;
}
