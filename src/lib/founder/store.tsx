import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { EMPTY_VENTURE, type ToolState, type VentureRecord } from "./types";
import { VENTURE_STORAGE_KEY, VentureContext, type VentureContextValue } from "./ventureContext";

// The venture record: one document every tool reads and writes.
//
// The toolkit is free and public, so it must work with no account at all:
// state lives in localStorage. Nothing leaves the browser unless the founder
// asks the adviser a question, and then only a trimmed summary goes with it.

function readStorage(): VentureRecord {
    if (typeof window === "undefined") return EMPTY_VENTURE;
    try {
        const raw = window.localStorage.getItem(VENTURE_STORAGE_KEY);
        if (!raw) return EMPTY_VENTURE;
        const parsed = JSON.parse(raw) as Partial<VentureRecord>;
        return {
            ...EMPTY_VENTURE,
            ...parsed,
            tools: parsed.tools && typeof parsed.tools === "object" ? parsed.tools : {},
        };
    } catch {
        // Private browsing, blocked storage or corrupt JSON: start clean rather than crash.
        return EMPTY_VENTURE;
    }
}

export function VentureProvider({ children }: { children: ReactNode }) {
    const [venture, setVenture] = useState<VentureRecord>(EMPTY_VENTURE);
    const [ready, setReady] = useState(false);
    const writeTimer = useRef<number | null>(null);

    // First paint reads storage once, so prerendering never touches window.
    useEffect(() => {
        setVenture(readStorage());
        setReady(true);
    }, []);

    // Debounced write: tools update on every keystroke, storage should not.
    useEffect(() => {
        if (!ready) return;
        if (writeTimer.current) window.clearTimeout(writeTimer.current);
        writeTimer.current = window.setTimeout(() => {
            try {
                window.localStorage.setItem(VENTURE_STORAGE_KEY, JSON.stringify(venture));
            } catch {
                // Storage full or blocked. The in-memory record still works for this session.
            }
        }, 400);
        return () => {
            if (writeTimer.current) window.clearTimeout(writeTimer.current);
        };
    }, [venture, ready]);

    const setProfile = useCallback(
        (patch: Partial<Pick<VentureRecord, "name" | "country" | "model">>) => {
            setVenture((v) => ({ ...v, ...patch, updatedAt: new Date().toISOString() }));
        },
        [],
    );

    const saveTool = useCallback((toolId: string, state: ToolState) => {
        setVenture((v) => ({
            ...v,
            tools: { ...v.tools, [toolId]: state },
            updatedAt: new Date().toISOString(),
        }));
    }, []);

    const getTool = useCallback((toolId: string) => venture.tools[toolId], [venture.tools]);

    const reset = useCallback(() => {
        setVenture({ ...EMPTY_VENTURE, updatedAt: new Date().toISOString() });
        try {
            window.localStorage.removeItem(VENTURE_STORAGE_KEY);
        } catch {
            /* nothing to do */
        }
    }, []);

    const completedCount = useMemo(
        () => Object.values(venture.tools).filter((t) => t?.completedAt).length,
        [venture.tools],
    );

    const value = useMemo<VentureContextValue>(
        () => ({ venture, setProfile, saveTool, getTool, reset, completedCount, ready }),
        [venture, setProfile, saveTool, getTool, reset, completedCount, ready],
    );

    return <VentureContext.Provider value={value}>{children}</VentureContext.Provider>;
}
