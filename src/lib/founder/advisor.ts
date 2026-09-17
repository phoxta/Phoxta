import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { VentureRecord } from "./types";

// Client for the public `founder-advice` edge function.
//
// The toolkit is free and needs no account, so this calls with the anon key
// only. The function rate-limits by hashed IP and meters its spend against the
// platform organisation, the same pattern the homepage idea validator uses.

export interface AdvisorCitation {
    /** The reference file the passage came from, e.g. "modern/S01-sales.md". */
    ref: string;
    /** Human label, e.g. "Sales (2026 layer)". */
    label: string;
}

export interface AdvisorReply {
    answer: string;
    citations: AdvisorCitation[];
    /** Questions the founder could usefully ask next. */
    followUps: string[];
    /** Tool slugs the advisor thinks would help, resolved to links in the UI. */
    suggestedTools: string[];
    /** Daily allowance left, when the function reports it. */
    remaining: number | null;
}

export interface AdvisorTurn {
    role: "user" | "assistant";
    content: string;
}

interface AdvisorRequest {
    /** "chat" for the advisor panel, or a named generator task. */
    task: string;
    question: string;
    history?: AdvisorTurn[];
    /** Trimmed venture context so answers use the founder's own numbers. */
    context?: {
        name?: string;
        country?: string;
        model?: string;
        stage?: string;
        /** Completed tool results, heavily trimmed. */
        signals?: Record<string, string>;
    };
}

export interface AdvisorResult {
    reply: AdvisorReply | null;
    limited: boolean;
    error: string | null;
}

/** Pull a small, privacy-safe summary of what the founder has already done. */
export function contextFromVenture(venture: VentureRecord, stage?: string): AdvisorRequest["context"] {
    const signals: Record<string, string> = {};
    for (const [toolId, state] of Object.entries(venture.tools)) {
        if (!state?.result) continue;
        const { score, label } = state.result;
        if (label) signals[toolId] = typeof score === "number" ? `${label} (${score})` : label;
    }
    return {
        name: venture.name || undefined,
        country: venture.country || undefined,
        model: venture.model || undefined,
        stage,
        signals: Object.keys(signals).length ? signals : undefined,
    };
}

export async function askAdvisor(req: AdvisorRequest): Promise<AdvisorResult> {
    if (!req.question.trim()) {
        return { reply: null, limited: false, error: "Type a question first." };
    }

    const { data, error } = await supabase.functions.invoke("founder-advice", { body: req });

    if (error) {
        // functions.invoke hides the JSON body inside error.context on non-2xx.
        let msg = error.message;
        let limited = false;
        try {
            const ctx = await (error as { context?: Response }).context?.json?.();
            if (ctx?.error) msg = String(ctx.error);
            if (ctx?.limited) limited = true;
        } catch {
            /* keep the original message */
        }
        return { reply: null, limited, error: friendlyError(msg) };
    }

    const payload = data as Partial<AdvisorReply> & { limited?: boolean };
    if (payload?.limited) {
        return { reply: null, limited: true, error: "You have used today's free questions. Come back tomorrow." };
    }

    return {
        reply: {
            answer: String(payload?.answer ?? ""),
            citations: Array.isArray(payload?.citations) ? payload.citations : [],
            followUps: Array.isArray(payload?.followUps) ? payload.followUps : [],
            suggestedTools: Array.isArray(payload?.suggestedTools) ? payload.suggestedTools : [],
            remaining: typeof payload?.remaining === "number" ? payload.remaining : null,
        },
        limited: false,
        error: null,
    };
}
