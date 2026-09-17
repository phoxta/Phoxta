import { useCallback, useMemo, useState } from "react";
import { uid } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import studioModule from "./module";
import { CANT_SEE, answerLocally, buildPack, chipsFor, classifySafety, findMatches, proposalFrom, type ContextPack, type PromptChip } from "./context";
import { COST, HARD_STOP, capState, conversations, type CapState } from "./derive";
import type { ChatMessage, StudioItem } from "./types";

/**
 * The companion, as a hook — one flow used by the full-page chat and by the
 * child's picker, so the guarantees hold in both.
 *
 * The order of the gates below IS the product promise, and it is deliberately
 * boring:
 *
 *   1. a child's free text meets the safety classifier before anything else,
 *      and a flagged message never reaches a model — it gets the "talk to a
 *      parent" redirect;
 *   2. a spent allowance stops here, plainly, with the same wording the
 *      gateway returns;
 *   3. the question is matched against the member's OWN context pack, and if
 *      nothing in it answers, the companion says "I can't see that" rather
 *      than asking a model to fill the silence;
 *   4. only then is the model called — and even then the grounded, sourced
 *      local answer is the floor, so an answer without sources is not a state
 *      this screen can reach;
 *   5. an intent in the question becomes a PROPOSAL, pending, which writes
 *      nothing anywhere until the member confirms it.
 *
 * Every turn is stored as a conversation in the module's own state, which is
 * what makes a child's chat visible to their parents (and nobody else).
 */

const DRAWER_KEY = "wafe:companion:v1";

/** What the side panel ("Ask Wàfè") has in this browser for this member. */
export function drawerThread(memberId: string): Array<{ id: string; from: "me" | "wafe"; text: string; at: string }> {
    try {
        const raw = localStorage.getItem(DRAWER_KEY);
        if (!raw) return [];
        const all = JSON.parse(raw) as Record<string, Array<{ id: string; from: "me" | "wafe"; text: string; at: string }>>;
        return Array.isArray(all[memberId]) ? all[memberId] : [];
    } catch {
        return [];
    }
}

const msg = (from: ChatMessage["from"], text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
    id: uid("msg"),
    from,
    text,
    at: new Date().toISOString(),
    sources: [],
    proposal: null,
    blocked: null,
    ...extra,
});

export interface Companion {
    /** The turn-by-turn thread on screen (this session's conversation). */
    thread: ChatMessage[];
    /** The saved conversation these turns belong to, once there is one. */
    conversationId: string | null;
    busy: boolean;
    error: string | null;
    /** The context pack this member's questions are answered from. */
    pack: ContextPack;
    cap: CapState;
    chips: PromptChip[];
    /** Little and Junior never free-type: they pick. */
    canFreeType: boolean;
    /** Everything this member has asked before, newest first. */
    history: Array<Extract<StudioItem, { kind: "chat" }>>;
    ask(question: string): Promise<void>;
    open(conversation: Extract<StudioItem, { kind: "chat" }>): void;
    fresh(): void;
    decide(proposalId: string, status: "accepted" | "dismissed"): Promise<void>;
}

export function useCompanion(moduleContext = "studio"): Companion {
    const { state, mutate } = useModule(studioModule);
    const { aiGrounding } = useData();
    const { me, space, today } = useSpace();
    const { ask: askAi, available } = useAi();

    const [thread, setThread] = useState<ChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pack = useMemo(() => buildPack(aiGrounding(), me), [aiGrounding, me]);
    // The slice is loaded before any page renders (the shell gates on it), but
    // the meter must never be the thing that crashes a screen.
    const usage = state?.usage;
    const cap = useMemo(() => capState(usage ?? { month: "", tokens: 0, costCents: 0, capCents: 1200, warnedAt: null }), [usage]);
    const chips = useMemo(() => chipsFor(me, space, new Date().getHours()), [me, space]);
    const history = useMemo(() => (state ? conversations(state) : []), [state]);
    const canFreeType = me.role === "guest" ? false : me.role !== "child" || me.ageBand === "teen" || me.ageBand === "young-adult";

    const ask = useCallback(
        async (question: string): Promise<void> => {
            const q = question.trim();
            if (!q || busy) return;
            setBusy(true);
            setError(null);

            const asked = msg("me", q);
            setThread((t) => [...t, asked]);

            let answer: ChatMessage;
            let metered = false;

            // 1 — a child's own words, checked before anything else happens.
            const verdict = me.role === "child" ? classifySafety(q) : null;
            if (verdict?.flagged) {
                answer = msg("wafe", verdict.message, { blocked: "safety" });
            } else if (cap.blocked) {
                // 2 — the hard stop, said the same way everywhere.
                answer = msg("wafe", HARD_STOP, { blocked: "cap" });
            } else {
                // 3 — answer from the pack, or admit there is nothing there.
                const local = answerLocally(q, pack, me);
                if (local.declined) {
                    answer = msg("wafe", local.text || CANT_SEE, { blocked: "scope", sources: local.sources });
                } else {
                    // 4 — the model may say it better; the grounded answer is
                    // the floor, and the sources are the pack's either way.
                    let text = local.text;
                    if (available) {
                        try {
                            const r = await askAi({
                                action: "ask",
                                prompt: q,
                                extraContext: local.sources.map((x) => `${x.label}: ${x.detail}`).join("\n"),
                            });
                            if (!r.unavailable && r.text.trim()) text = r.text.trim();
                        } catch {
                            // The companion never blocks the screen: the
                            // grounded answer already on hand is what shows.
                        }
                    }
                    // 5 — an intent becomes a card, pending, writing nothing.
                    const proposal = proposalFrom(q, findMatches(pack, q), me, today);
                    answer = msg("wafe", text, { sources: local.sources, proposal });
                    metered = true;
                }
            }

            setThread((t) => [...t, answer]);

            try {
                await mutate(async (repo) => {
                    let id = conversationId;
                    if (!id) {
                        const conv = await repo.startConversation({ title: q.length > 76 ? `${q.slice(0, 73)}…` : q, moduleContext });
                        id = conv.id;
                        setConversationId(id);
                    }
                    await repo.appendMessages(id, [asked, answer]);
                    if (metered) await repo.meter(COST.ask, 900);
                });
            } catch (e) {
                setError(e instanceof Error ? e.message : "That answer could not be saved.");
            } finally {
                setBusy(false);
            }
        },
        [askAi, available, busy, cap.blocked, conversationId, me, moduleContext, mutate, pack, today],
    );

    const open = useCallback((conversation: Extract<StudioItem, { kind: "chat" }>) => {
        setConversationId(conversation.id);
        setThread(conversation.data.messages);
        setError(null);
    }, []);

    const fresh = useCallback(() => {
        setConversationId(null);
        setThread([]);
        setError(null);
    }, []);

    const decide = useCallback(
        async (proposalId: string, status: "accepted" | "dismissed"): Promise<void> => {
            const owner = conversationId ?? history.find((c) => c.data.messages.some((m) => m.proposal?.id === proposalId))?.id;
            if (!owner) return;
            await mutate((repo) => repo.decideProposal(owner, proposalId, status));
            setThread((t) => t.map((m) => (m.proposal?.id === proposalId ? { ...m, proposal: { ...m.proposal!, status, decidedAt: new Date().toISOString() } } : m)));
        },
        [conversationId, history, mutate],
    );

    return { thread, conversationId, busy, error, pack, cap, chips, canFreeType, history, ask, open, fresh, decide };
}
