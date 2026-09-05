import { useEffect, useRef, useState } from "react";
import { ProductCards, RichText, type ChatCard } from "@/lib/chat-rich";
import { supabase } from "@/integration/phoxta";
import { resolveTenant } from "@/integration/tenant";
import { ENV } from "@/config/env";

/**
 * AI assistant for this storefront.
 *
 * Talks to the Phoxta unified agent (agent-inbound) addressed by THIS tenant's
 * agent public key. Every buyer's store runs from the same deployment, so the
 * key is resolved at runtime from the hostname — a build-time key would route
 * every store's conversations into whichever business owned it.
 *
 * Conversations become real threads in the business's console Inbox, so the
 * owner can read them, take over and reply on any channel. Falls back to a
 * short local reply when the backend is unreachable, so the store always
 * answers.
 *
 * Styling note: the widget is classed with Bootstrap names (.btn, .bg-dark,
 * .rounded-pill…) that this Tailwind app does not define. They are the hooks
 * the tenant brand sheet targets with !important, so they stay. The inline
 * fallbacks below give an UNBRANDED tenant a legible widget; a branded one
 * overrides them.
 */

const AGENT_URL = ENV.supabaseUrl ? `${ENV.supabaseUrl.replace(/\/+$/, "")}/functions/v1/agent-inbound` : "";
const ANON = ENV.supabaseAnonKey ?? "";

/* ---- Human takeover (console → widget) ------------------------------------
 * A send may return { human: true, reply: "" }; the person's replies are then
 * fetched with { action: "poll", conversationId, threadToken, afterId? }.
 * threadToken is a per-thread capability returned by every send; without it
 * the poll can only 404. Conversation id, cursor and token persist in
 * sessionStorage so SPA navigation does not orphan a live human conversation.
 * Fail-soft everywhere.
 */
const CONV_KEY = "phoxta:chat:conv";

interface StoredConv {
    id: string;
    lastSeenId: string | null;
    token: string | null;
}

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
        /* storage unavailable */
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

const HUMAN_JOINED = "A team member has joined the chat…";
const TEAM_LABEL = "Team";
const POLL_MS = 5000;
const POLL_IDLE_MS = 120_000;

const LABEL = "Ask us";
const TITLE = "Travel assistant";
const SUBTITLE = "AI assistant · stays, trips & bookings";
const GREETING = "Hi — I can suggest a trip, check dates and take a booking. Where are you headed?";
const FALLBACK = "I can help with availability, pricing and bookings. Tell me your dates and I will take it from there.";
const PLACEHOLDER = "Ask about a trip…";
const CHIPS = ["What is available next month?", "Suggest a weekend trip", "What is included?", "Where is my booking?"];

/** Legible default for the brand-coloured surfaces when no tenant brand is set. */
const DARK = "var(--brand-primary, #111)";

interface Msg {
    role: "bot" | "user" | "status";
    text: string;
    cards?: ChatCard[];
    team?: boolean;
}

interface PollMessage {
    id: string;
    role: string;
    body: string;
}

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ANON) {
        headers["Authorization"] = `Bearer ${ANON}`;
        headers["apikey"] = ANON;
    }
    return headers;
}

export default function AIAssistant() {
    const [open, setOpen] = useState(false);
    const [agentKey, setAgentKey] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: GREETING }]);
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

    // Resolve this store's agent the first time the panel opens, so a visitor
    // who never opens the chat costs nothing.
    useEffect(() => {
        if (!open || agentKey) return;
        let active = true;
        (async () => {
            try {
                const tenant = await resolveTenant();
                if (!tenant) return;
                const { data } = await supabase.rpc("app_storefront_agent_key", { p_org: tenant.id });
                if (active && data) setAgentKey(String(data));
            } catch {
                /* falls back to a local reply */
            }
        })();
        return () => {
            active = false;
        };
    }, [open, agentKey]);

    // Resume a thread across SPA navigation.
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
        setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);

    // Surface a takeover once per page load; a hand-back re-arms the notice.
    function noteHuman(active: boolean) {
        if (active && !humanNoticed.current) {
            humanNoticed.current = true;
            setMsgs((m) => [...m, { role: "status", text: HUMAN_JOINED }]);
            scrollDown();
        }
        if (!active && humanActive.current) humanNoticed.current = false;
        humanActive.current = active;
    }

    // One poll. With no cursor yet the first poll is an ANCHOR: it swallows the
    // history (already on screen from send responses) and records the frontier.
    async function pollOnce(key: string) {
        if (!AGENT_URL || !conv.current || !threadToken.current) return;
        const anchor = lastSeen.current === null;
        const r = await fetch(AGENT_URL, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                public_key: key,
                action: "poll",
                conversationId: conv.current,
                threadToken: threadToken.current,
                ...(lastSeen.current ? { afterId: lastSeen.current } : {}),
            }),
        });
        if (!r.ok) throw new Error(`poll ${r.status}`);
        const d = (await r.json()) as { messages?: unknown; human?: unknown };
        const raw: unknown[] = Array.isArray(d.messages) ? d.messages : [];
        const list = raw.filter((m): m is PollMessage => {
            const x = m as Partial<PollMessage> | null;
            return !!x && typeof x.id === "string" && typeof x.role === "string" && typeof x.body === "string";
        });
        if (list.length) lastSeen.current = list[list.length - 1].id;
        if (d.human === true) noteHuman(true);
        else if (d.human === false) noteHuman(false);
        if (!anchor) {
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
        } else {
            list.forEach((m) => seenIds.current.add(m.id));
        }
        persistConv();
    }

    // Receive loop for human replies. Runs while open, idles ~2 min after the
    // last activity, backs off silently on failure, stops when closed.
    useEffect(() => {
        if (!open) return;
        lastActivity.current = Date.now();
        let stopped = false;
        let failures = 0;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            if (agentKey && conv.current && threadToken.current && Date.now() - lastActivity.current <= POLL_IDLE_MS) {
                try {
                    await pollOnce(agentKey);
                    failures = 0;
                } catch {
                    failures = Math.min(failures + 1, 5); // 5s → 30s
                }
            }
            if (!stopped) timer = setTimeout(tick, POLL_MS * (1 + failures));
        };
        void tick();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
        // pollOnce reads refs only; agentKey is the sole reactive input.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, agentKey]);

    async function send(text: string) {
        const q = text.trim();
        if (!q || busy) return;
        setMsgs((m) => [...m, { role: "user", text: q }]);
        setDraft("");
        setBusy(true);
        let reply = "";
        let cards: ChatCard[] = [];
        let humanTurn = false;
        if (AGENT_URL && agentKey) {
            try {
                const r = await fetch(AGENT_URL, {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ public_key: agentKey, channel: "web", conversationId: conv.current, message: q }),
                });
                const d = (await r.json()) as {
                    conversationId?: unknown;
                    threadToken?: unknown;
                    reply?: unknown;
                    cards?: unknown;
                    human?: unknown;
                };
                const nextConv = typeof d.conversationId === "string" ? d.conversationId : conv.current;
                if (nextConv !== conv.current) threadToken.current = null;
                if (typeof d.threadToken === "string" && d.threadToken) threadToken.current = d.threadToken;
                conv.current = nextConv;
                reply = typeof d.reply === "string" ? d.reply : "";
                cards = Array.isArray(d.cards) ? (d.cards as ChatCard[]) : [];
                humanTurn = d.human === true;
                // The reply arrives inline: re-anchor the poll cursor past it.
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
            if (!reply) reply = FALLBACK;
            setMsgs((m) => [...m, { role: "bot", text: reply, cards }]);
        }
        setBusy(false);
        scrollDown();
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                // Below lg the fixed quick-nav bar owns the bottom of the screen, and
                // its Menu button is the only way into the site's navigation there —
                // so the launcher has to clear it rather than sit on top of it.
                className="btn bg-dark text-white fixed right-6 bottom-27 z-[1900] lg:bottom-6"
                style={{
                    borderRadius: 999,
                    padding: "13px 22px",
                    fontWeight: 600,
                    background: DARK,
                    color: "#fff",
                    border: 0,
                    cursor: "pointer",
                }}
                aria-expanded={open}
                aria-controls="wamwam-assistant"
            >
                {open ? "Close" : LABEL}
            </button>

            {open && (
                <div
                    id="wamwam-assistant"
                    // Sits above the launcher, which itself clears the mobile quick-nav.
                    className="d-flex flex-column fixed right-6 bottom-43 z-[1900] lg:bottom-23"
                    style={{
                        width: 370,
                        maxWidth: "calc(100vw - 48px)",
                        height: 520,
                        maxHeight: "calc(100dvh - 210px)",
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "#fff",
                        boxShadow: "0 24px 70px rgba(0,0,0,.25)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                    role="dialog"
                    aria-label={TITLE}
                >
                    <div className="bg-dark text-white p-3" style={{ background: DARK, color: "#fff", padding: 16 }}>
                        <h6 className="fw-bold mb-0" style={{ fontWeight: 700, margin: 0 }}>
                            {TITLE}
                        </h6>
                        <p className="mb-0" style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
                            {SUBTITLE}
                        </p>
                    </div>

                    <div
                        className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2"
                        ref={bodyRef}
                        aria-live="polite"
                        style={{ flexGrow: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
                    >
                        {msgs.map((m, i) =>
                            m.role === "status" ? (
                                <div
                                    key={i}
                                    className="align-self-center text-center"
                                    style={{ alignSelf: "center", textAlign: "center", fontSize: 12, opacity: 0.6, padding: "2px 6px" }}
                                >
                                    {m.text}
                                </div>
                            ) : (
                                <div
                                    key={i}
                                    className={m.role === "user" ? "align-self-end bg-dark text-white" : "align-self-start"}
                                    style={{
                                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                        maxWidth: "85%",
                                        padding: "10px 14px",
                                        borderRadius: 12,
                                        lineHeight: 1.5,
                                        fontSize: 14,
                                        background: m.role === "user" ? DARK : "#F1F2F4",
                                        color: m.role === "user" ? "#fff" : undefined,
                                    }}
                                >
                                    {m.team && (
                                        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, marginBottom: 2 }}>{TEAM_LABEL}</div>
                                    )}
                                    <RichText text={m.text} />
                                    <ProductCards cards={m.cards} />
                                </div>
                            ),
                        )}
                        {busy && (
                            <div
                                className="align-self-start"
                                style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 12, background: "#F1F2F4", fontSize: 14 }}
                            >
                                …
                            </div>
                        )}
                    </div>

                    <div
                        className="d-flex flex-wrap gap-2 px-3 pb-2"
                        style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 16px 8px" }}
                    >
                        {CHIPS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => send(c)}
                                className="btn btn-sm border rounded-pill"
                                style={{
                                    fontSize: 12,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    border: "1px solid rgba(0,0,0,.15)",
                                    background: "transparent",
                                    cursor: "pointer",
                                }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    <form
                        className="d-flex gap-2 p-2 border-top"
                        style={{ display: "flex", gap: 8, padding: 8, borderTop: "1px solid rgba(0,0,0,.1)" }}
                        onSubmit={(e) => {
                            e.preventDefault();
                            void send(draft);
                        }}
                    >
                        <input
                            className="form-control"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={PLACEHOLDER}
                            aria-label={PLACEHOLDER}
                            style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,.15)" }}
                        />
                        <button
                            type="submit"
                            className="btn bg-dark text-white px-3"
                            aria-label="Send"
                            disabled={busy || !draft.trim()}
                            style={{ background: DARK, color: "#fff", border: 0, borderRadius: 8, padding: "0 12px", cursor: "pointer" }}
                        >
                            →
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
