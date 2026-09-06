import { useEffect, useRef, useState } from "react";
import { ENV } from "@/config/env";
import { IconArrow, IconClose, IconLeaf } from "@/lib/icons";
import { ProductCards, RichText, type ChatCard } from "@/lib/chatRich";
import { useCatalog } from "@/state/catalog";

/**
 * The in-store skin advisor.
 *
 * Talks to the Phoxta unified agent (`agent-inbound`) addressed by THIS tenant's
 * agent public key, resolved at runtime — so every buyer's shop answers as its
 * own business, with its own catalogue, and every conversation lands in that
 * owner's Inbox. Falls back to a small built-in responder if the backend is
 * unreachable, so the store always answers.
 *
 * Human takeover: when the business picks a thread up in the console, a send
 * returns `{ human: true, reply: "" }` and the person's replies arrive through
 * the poll loop below. The empty reply is honest silence while they type — the
 * canned responder must never speak over a real person.
 */

const CONV_KEY = "ferne:chat:conv";
const HUMAN_JOINED = "A team member has joined the chat…";
const TEAM_LABEL = "Team";
const POLL_MS = 5000;
const POLL_IDLE_MS = 120_000;

const CHIPS = ["Build me a routine", "Something for redness", "Which size lasts longest?", "Is it fragrance-free?"];

type Msg = { role: "bot" | "user" | "status"; text: string; cards?: ChatCard[]; team?: boolean };

type StoredConv = { id: string; lastSeenId: string | null; token: string | null };

function loadStoredConv(): StoredConv | null {
    try {
        const raw = sessionStorage.getItem(CONV_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw) as { id?: unknown; lastSeenId?: unknown; token?: unknown };
        if (v && typeof v.id === "string") {
            return {
                id: v.id,
                lastSeenId: typeof v.lastSeenId === "string" ? v.lastSeenId : null,
                token: typeof v.token === "string" ? v.token : null,
            };
        }
    } catch {
        /* storage unavailable — the thread just won't resume */
    }
    return null;
}

function storeConv(id: string | null, lastSeenId: string | null, token: string | null): void {
    try {
        if (id) sessionStorage.setItem(CONV_KEY, JSON.stringify({ id, lastSeenId, token }));
        else sessionStorage.removeItem(CONV_KEY);
    } catch {
        /* storage unavailable */
    }
}

function localReply(q: string): string {
    const s = q.toLowerCase();
    if (/routine|order|step|morning|night/.test(s))
        return "Three steps, morning and night: Cloud Cleanser on damp skin, three drops of Morning Oil pressed in, then Dew Cream to seal. The Ritual Set is all three at 15% off.";
    if (/red|sensitiv|irritat|flare/.test(s))
        return "For redness, Cloud Cleanser and Dew Cream are the two to start with — oat lipids and a 3:1:1 ceramide ratio, no fragrance and no essential oils.";
    if (/dry|dehydrat|flak|tight/.test(s))
        return "Dryness usually wants oil then cream: Morning Oil into damp skin, Dew Cream over the top. The Overnight Mask two nights a week does the rest.";
    if (/refill|size|last|value/.test(s))
        return "Most formulas come in a refill: a refill pod or pouch is 20–25% cheaper than the first purchase, and the glass stays with you.";
    if (/ingredient|fragrance|vegan|cruelty/.test(s))
        return "Four actives — rosehip, oat lipid, olive squalane and sea buckthorn — each traced to a named farm. Fragrance-free throughout, cruelty-free, and vegan apart from the beeswax in the Lip Balm.";
    return "I can help with a routine, a concern like redness or dryness, sizes and refills, or what's actually in the bottle. What's your skin doing at the moment?";
}

export default function SkinAdvisor() {
    const { agentKey } = useCatalog();
    const key = agentKey || ENV.agentPublicKey || "";
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>([
        {
            role: "bot",
            text: "Hello — I'm the Ferne skin advisor. Tell me what your skin is doing and I'll suggest a routine, or ask me anything about what's in the bottle.",
        },
    ]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);

    const conv = useRef<string | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const lastSeen = useRef<string | null>(null);
    const threadToken = useRef<string | null>(null);
    const seenIds = useRef<Set<string>>(new Set());
    const humanActive = useRef(false);
    const humanNoticed = useRef(false);
    const lastActivity = useRef(Date.now());

    // Resume across SPA navigation: a human conversation must not be orphaned
    // because the shopper changed page.
    useEffect(() => {
        const s = loadStoredConv();
        if (s && !conv.current) {
            conv.current = s.id;
            lastSeen.current = s.lastSeenId;
            threadToken.current = s.token;
        }
    }, []);

    const persistConv = () => storeConv(conv.current, lastSeen.current, threadToken.current);

    const scrollDown = () =>
        window.setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);

    function noteHuman(active: boolean) {
        if (active && !humanNoticed.current) {
            humanNoticed.current = true;
            setMsgs((m) => [...m, { role: "status", text: HUMAN_JOINED }]);
            scrollDown();
        }
        if (!active && humanActive.current) humanNoticed.current = false;
        humanActive.current = active;
    }

    function headers(): Record<string, string> {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (ENV.supabaseAnonKey) {
            h["Authorization"] = `Bearer ${ENV.supabaseAnonKey}`;
            h["apikey"] = ENV.supabaseAnonKey;
        }
        return h;
    }

    // One poll. With no cursor yet the first poll is an ANCHOR: it swallows the
    // history (already on screen from the send responses) and records only the
    // frontier, so nothing is delivered twice.
    async function pollOnce(publicKey: string) {
        if (!ENV.agentUrl || !conv.current || !threadToken.current) return;
        const anchor = lastSeen.current === null;
        const r = await fetch(ENV.agentUrl, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
                public_key: publicKey,
                action: "poll",
                conversationId: conv.current,
                threadToken: threadToken.current,
                ...(lastSeen.current ? { afterId: lastSeen.current } : {}),
            }),
        });
        if (!r.ok) throw new Error(`poll ${r.status}`);
        const d = (await r.json()) as { messages?: unknown; human?: boolean };
        const raw: unknown[] = Array.isArray(d.messages) ? d.messages : [];
        const list = raw.filter((m): m is { id: string; role: string; body: string } => {
            const x = m as { id?: unknown; role?: unknown; body?: unknown } | null;
            return !!x && typeof x.id === "string" && typeof x.role === "string" && typeof x.body === "string";
        });
        if (list.length) lastSeen.current = list[list.length - 1].id;
        if (d.human === true) noteHuman(true);
        else if (d.human === false) noteHuman(false);

        if (anchor) {
            list.forEach((m) => seenIds.current.add(m.id));
        } else {
            const fresh = list.filter((m) => m.body.trim() && !seenIds.current.has(m.id));
            fresh.forEach((m) => seenIds.current.add(m.id));
            if (fresh.length) {
                setMsgs((prev) => [
                    ...prev,
                    ...fresh.map((m) => ({ role: "bot" as const, text: m.body, team: m.role === "human" })),
                ]);
                lastActivity.current = Date.now();
                scrollDown();
            }
        }
        persistConv();
    }

    // Receive loop: the console's human replies have no push channel, so this
    // poll is their delivery leg. Runs while the panel is open, goes quiet ~2
    // minutes after the last activity, and backs off silently on failures.
    useEffect(() => {
        if (!open) return;
        lastActivity.current = Date.now();
        let stopped = false;
        let failures = 0;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            if (key && conv.current && threadToken.current && Date.now() - lastActivity.current <= POLL_IDLE_MS) {
                try {
                    await pollOnce(key);
                    failures = 0;
                } catch {
                    failures = Math.min(failures + 1, 5);
                }
            }
            if (!stopped) timer = setTimeout(tick, POLL_MS * (1 + failures));
        };
        tick();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, key]);

    async function send(text: string) {
        const q = text.trim();
        if (!q || busy) return;
        setMsgs((m) => [...m, { role: "user", text: q }]);
        setDraft("");
        setBusy(true);
        scrollDown();

        let reply = "";
        let cards: ChatCard[] = [];
        let humanTurn = false;

        if (ENV.agentUrl && key) {
            try {
                const r = await fetch(ENV.agentUrl, {
                    method: "POST",
                    headers: headers(),
                    body: JSON.stringify({
                        public_key: key,
                        channel: "web",
                        conversationId: conv.current,
                        message: q,
                    }),
                });
                const d = (await r.json()) as {
                    conversationId?: string;
                    threadToken?: string;
                    reply?: string;
                    cards?: ChatCard[];
                    human?: boolean;
                };
                // Every reply that names a thread carries that thread's capability
                // too. A different thread id invalidates the token held for the old.
                const nextConv = typeof d.conversationId === "string" ? d.conversationId : conv.current;
                if (nextConv !== conv.current) threadToken.current = null;
                if (typeof d.threadToken === "string" && d.threadToken) threadToken.current = d.threadToken;
                conv.current = nextConv;
                reply = d.reply ?? "";
                cards = Array.isArray(d.cards) ? d.cards : [];
                humanTurn = d.human === true;
                // The reply arrives inline: re-anchor the cursor past it so the
                // receive loop never re-delivers a bubble already on screen.
                if (reply) lastSeen.current = null;
                persistConv();
            } catch {
                reply = "";
            }
        }

        lastActivity.current = Date.now();
        if (humanTurn) {
            noteHuman(true);
            if (reply) setMsgs((m) => [...m, { role: "bot", text: reply, cards }]);
        } else {
            setMsgs((m) => [...m, { role: "bot", text: reply || localReply(q), cards }]);
        }
        setBusy(false);
        scrollDown();
    }

    return (
        <>
            <button
                type="button"
                className="advisor-launch"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? "Close the skin advisor" : "Ask the skin advisor"}
            >
                {open ? <IconClose /> : <IconLeaf />}
                <span>{open ? "Close" : "Skin advisor"}</span>
            </button>

            {open && (
                <section className="advisor" aria-label="Skin advisor">
                    <header className="advisor-head">
                        <b className="serif">Skin advisor</b>
                        <span>Routines, concerns, ingredients</span>
                    </header>

                    <div className="advisor-body" ref={bodyRef}>
                        {msgs.map((m, i) =>
                            m.role === "status" ? (
                                <p className="advisor-status" key={i}>
                                    {m.text}
                                </p>
                            ) : (
                                <div className={`advisor-msg ${m.role}`} key={i}>
                                    {m.team && <span className="advisor-who">{TEAM_LABEL}</span>}
                                    <RichText text={m.text} />
                                    <ProductCards cards={m.cards} />
                                </div>
                            ),
                        )}
                        {busy && <div className="advisor-msg bot">…</div>}
                    </div>

                    <div className="advisor-chips">
                        {CHIPS.map((c) => (
                            <button type="button" className="chip" key={c} onClick={() => send(c)}>
                                {c}
                            </button>
                        ))}
                    </div>

                    <form
                        className="advisor-form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            send(draft);
                        }}
                    >
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Ask about your skin…"
                            aria-label="Ask the skin advisor"
                        />
                        <button className="icon-btn" aria-label="Send" disabled={busy}>
                            <IconArrow />
                        </button>
                    </form>
                </section>
            )}
        </>
    );
}
