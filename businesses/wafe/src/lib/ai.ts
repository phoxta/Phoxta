import { useCallback, useState } from "react";
import { isConfigured, supabase } from "@/lib/supabase";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { useTenant } from "@/state/tenant";

/**
 * The companion's client.
 *
 * Every AI feature in Wàfè goes through ONE edge function (`wafe-ai`) with an
 * `action`. The client attaches the family's role-safe grounding — each module
 * contributes a summary that omits whatever the asking member may not see — so
 * the companion knows the family and still never leaks the budget to a child.
 * Metered against the tenant; the demo runs against the showcase allowance.
 */

export type AiAction =
    | "ask"            // contextual question over the family's data
    | "briefing"       // morning/evening briefing for the asking member
    | "reflect"        // evening reflection prompts + a short summary of the day
    | "summarize"      // key takeaways / action items / discussion prompts for a video, article or chapter
    | "learning-plan"  // a lesson plan from a video or topic
    | "book-course"    // a 4-week curriculum from a book
    | "suggest-tasks"  // break a goal/milestone into tasks
    | "meal-plan"      // a week of meals within a budget + grocery list
    | "packing"        // a packing list for a trip, per member
    | "outfit"         // an outfit from the closet for an occasion
    | "song"           // lyrics + chord chart
    | "storyboard"     // a visual story in scenes
    | "image";         // an image (Gemini image model, where the plan allows)

export interface AiResult<T = unknown> {
    text: string;
    data?: T;
    /** Set when the plan/allowance blocked the call; UI shows it, never throws. */
    unavailable?: string;
    model?: string;
}

export interface AiCall {
    action: AiAction;
    /** Free text from the user or the screen. */
    prompt?: string;
    /** Action-specific structured input (a video title, a goal, a budget…). */
    payload?: Record<string, unknown>;
    /** Extra grounding the screen adds on top of the module summaries. */
    extraContext?: string;
}

const FN = "wafe-ai";

export async function callAi(input: AiCall & { orgId: string | null; spaceId: string; memberId: string; role: string; demo: boolean; grounding: string }): Promise<AiResult> {
    if (!isConfigured) return { text: "", unavailable: "AI needs the backend to be configured for this build." };
    const url = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, "") + `/functions/v1/${FN}`;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
        body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => ({}))) as Partial<AiResult> & { error?: string };
    if (res.status === 429 || res.status === 402) return { text: "", unavailable: body.error || "This month's AI allowance is used up." };
    if (!res.ok) throw new Error(body.error || `AI request failed (${res.status})`);
    return { text: body.text ?? "", data: body.data, model: body.model, unavailable: body.unavailable };
}

/** The hook every screen uses: `const { ask, busy, error } = useAi()`. */
export function useAi() {
    const { aiGrounding } = useData();
    const sp = useSpace();
    const { tenant } = useTenant();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ask = useCallback(
        async <T = unknown>(input: AiCall): Promise<AiResult<T>> => {
            setBusy(true);
            setError(null);
            try {
                const r = await callAi({ ...input, orgId: tenant?.id ?? null, spaceId: sp.space.id, memberId: sp.me.id, role: sp.role, demo: sp.kind === "demo", grounding: aiGrounding() });
                return r as AiResult<T>;
            } catch (e) {
                const msg = e instanceof Error ? e.message : "The companion couldn't answer.";
                setError(msg);
                throw e;
            } finally {
                setBusy(false);
            }
        },
        [aiGrounding, sp, tenant?.id],
    );
    return { ask, busy, error, available: isConfigured };
}
