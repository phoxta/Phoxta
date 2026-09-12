import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/components/ui/text";
import { useTheme } from "@/lib/theme";

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
            setTimeout(() => dismiss(id), 3200);
        },
        [dismiss],
    );
    const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);
    return (
        <Ctx.Provider value={value}>
            {children}
            <Toasts />
        </Ctx.Provider>
    );
}

export function useToast(): ToastCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useToast outside ToastProvider");
    return ctx;
}

function Toasts() {
    const { toasts, dismiss } = useToast();
    const { c } = useTheme();
    const insets = useSafeAreaInsets();
    if (!toasts.length) return null;
    return (
        <View pointerEvents="box-none" style={[styles.stack, { bottom: insets.bottom + 84 }]} accessibilityLiveRegion="polite">
            {toasts.map((t) => (
                <Pressable key={t.id} onPress={() => dismiss(t.id)} style={[styles.pill, { backgroundColor: t.tone === "success" ? c.mint : t.tone === "danger" ? c.danger : c.ink }]}>
                    <Txt weight="medium" color={c.white} size={14}>
                        {t.message}
                    </Txt>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    stack: { position: "absolute", left: 16, right: 16, alignItems: "center", gap: 8, zIndex: 50 },
    pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, maxWidth: 420, boxShadow: "0 6px 14px rgba(0, 0, 0, 0.18)", elevation: 6 },
});
