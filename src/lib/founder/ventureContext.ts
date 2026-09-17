import { createContext, useContext } from "react";
import type { ToolState, VentureRecord } from "./types";

/**
 * The venture context and its hook, kept apart from the provider component so
 * the module exports no components and fast refresh stays reliable.
 */
export interface VentureContextValue {
    venture: VentureRecord;
    /** Patch the top-level profile fields. */
    setProfile: (patch: Partial<Pick<VentureRecord, "name" | "country" | "model">>) => void;
    /** Save one tool's answers and result. */
    saveTool: (toolId: string, state: ToolState) => void;
    /** Read one tool's saved state. */
    getTool: (toolId: string) => ToolState | undefined;
    /** Wipe everything. The caller is responsible for confirming first. */
    reset: () => void;
    /** How many tools have been completed. */
    completedCount: number;
    /** True once the first read from storage has happened. */
    ready: boolean;
}

export const VentureContext = createContext<VentureContextValue | null>(null);

export function useVenture(): VentureContextValue {
    const ctx = useContext(VentureContext);
    if (!ctx) {
        throw new Error("useVenture must be used inside <VentureProvider>");
    }
    return ctx;
}

/** Export the whole record as a downloadable JSON string. */
export function ventureToBlob(venture: VentureRecord): string {
    return JSON.stringify(venture, null, 2);
}

export const VENTURE_STORAGE_KEY = "phoxta-founder-venture-v1";
