import { useEffect, useRef, useState } from "react";
import { RichText, ProductCards, type ChatCard } from "@/lib/chatRich";
import { dishes, money } from "@/data/menu";
import { useMenu } from "@/util/menu";

// AI Concierge — connects to the Phoxta unified agent (agent-inbound) addressed
// by THIS tenant's agent public_key, resolved at runtime from the menu context
// (every buyer's storefront runs from the same deployment, so a build-time key
// would send every store's chats into whichever business owned that key).
// Falls back to an on-device menu assistant so the demo is always useful.
// The agent endpoint. VITE_AGENT_URL was set on exactly one of the five
// storefronts, and the send path is gated on it — so the other four never
// called the agent at all and answered every question with the canned
// fallback below, forever, with nothing reaching the owner's Inbox.
//
// Derived from VITE_SUPABASE_URL when unset: the storefront cannot function
// without that variable anyway, so the chat can no longer be silently
// disabled by a missing one.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const AGENT_URL =
  (import.meta.env.VITE_AGENT_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/agent-inbound` : "");
if (!AGENT_URL && typeof console !== "undefined") {
  console.warn("[phoxta] chat has no agent endpoint (VITE_AGENT_URL / VITE_SUPABASE_URL unset) — replies are canned.");
}
const ENV_AGENT_KEY = (import.meta.env.VITE_AGENT_PUBLIC_KEY as string | undefined) ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

// --- Human takeover (console → widget) -------------------------------------
// When the business takes a thread over, a send returns { human: true, reply: "" }
// and the person's replies are fetched with { action: "poll", conversationId,
// afterId? } → { messages: [{ id, role: "agent"|"human", body, created_at }],
// human }. The conversation id + poll cursor live in sessionStorage so SPA
// navigation doesn't orphan a live human conversation. Fail-soft everywhere:
// blocked storage just loses resume, a failed poll just waits for the next one.
const CONV_KEY = "phoxta:chat:conv";
function loadStoredConv(): { id: string; lastSeenId: string | null } | null {
    try {
        const raw = sessionStorage.getItem(CONV_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw) as { id?: unknown; lastSeenId?: unknown };
        if (v && typeof v.id === "string") {
            return { id: v.id, lastSeenId: typeof v.lastSeenId === "string" ? v.lastSeenId : null };
        }
    } catch {
        /* storage unavailable */
    }
    return null;
}
function storeConv(id: string | null, lastSeenId: string | null) {
    try {
        if (id) sessionStorage.setItem(CONV_KEY, JSON.stringify({ id, lastSeenId }));
        else sessionStorage.removeItem(CONV_KEY);
    } catch {
        /* storage unavailable */
    }
}

const HUMAN_JOINED = "A team member has joined the chat…";
const TEAM_LABEL = "Team";
const POLL_MS = 5000; // receive cadence while the panel is open
const POLL_IDLE_MS = 120_000; // stop polling ~2 min after the last activity

type Msg = { role: "bot" | "user" | "status"; text: string; cards?: ChatCard[]; team?: boolean };
// No "Book a table": this is a delivery and collection kitchen with no dining
// room, so suggesting it invites a request nobody can honour.
const CHIPS = ["Recommend a dish", "What's vegetarian?", "Track my order", "Catering for an event"];

function localReply(q: string): string {
    const s = q.toLowerCase();
    if (/veg|vegetarian|vegan/.test(s)) {
        const v = dishes.filter((d) => d.tags.includes("V")).slice(0, 3);
        return `A few favourites from our plant-forward dishes: ${v.map((d) => `${d.name} (${money(d.price)})`).join(", ")}. Shall I add one to your order?`;
    }
    if (/gluten|gf|allerg/.test(s)) {
        const g = dishes.filter((d) => d.tags.includes("GF")).slice(0, 3);
        return `These are prepared gluten-free: ${g.map((d) => d.name).join(", ")}. Always let us know about allergies and the kitchen will adapt.`;
    }
    if (/wine|pair|cellar|drink/.test(s)) {
        return "For seafood I'd pour our Premier Cru Chablis; with the duck or tenderloin, the Côte de Nuits Pinot Noir is sublime. Our sommelier can pair every course on request.";
    }
    if (/book|reserv|table/.test(s)) {
        return "I can help with that — head to Reservations and pick a date, time and party size. For parties of 8+ we'll arrange it personally.";
    }
    if (/recommend|popular|best|chef/.test(s)) {
        const p = dishes.filter((d) => d.popular);
        return `Tonight I'd suggest ${p.map((d) => d.name).join(", ")}. The ${p[0]?.name} is our chef's signature. Want me to add it to your order?`;
    }
    if (/hour|open|time/.test(s)) {
        return "We serve lunch Tue–Sun 12:00–2:30pm and dinner Tue–Sat 6:00–10:30pm. We'd love to host you.";
    }
    return "I'm Saveur's concierge — I can recommend dishes, suggest wine pairings, note dietary needs, or help you book a table. What are you in the mood for?";
}

export default function AIChat() {
    // Per-tenant: the storefront resolves its own business from the hostname, so
    // the chat must address that business's agent, not the build's default.
    const { agentKey } = useMenu();
    const AGENT_KEY = agentKey || ENV_AGENT_KEY;
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>([
        { role: "bot", text: "Bonsoir! I'm the Saveur concierge. Ask me for a recommendation, a wine pairing, or to book a table." },
    ]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const convRef = useRef<string | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    // Human-takeover receive path: the last delivered message id (poll cursor),
    // ids already rendered (dedupe), whether the takeover notice has been shown,
    // and the last activity time that keeps the poll loop alive.
    const lastSeen = useRef<string | null>(null);
    const seenIds = useRef<Set<string>>(new Set());
    const humanActive = useRef(false);
    const humanNoticed = useRef(false);
    const lastActivity = useRef(Date.now());

    // Resume across SPA navigation: a human conversation must not be orphaned
    // because the visitor changed page — restore the thread id + poll cursor.
    useEffect(() => {
        const s = loadStoredConv();
        if (s && !convRef.current) {
            convRef.current = s.id;
            lastSeen.current = s.lastSeenId;
        }
    }, []);

    const persistConv = () => storeConv(convRef.current, lastSeen.current);

    const scrollDown = () =>
        setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);

    // A person has (or has released) this thread. Surface the takeover once per
    // page load; a later hand-back re-arms the notice.
    function noteHuman(active: boolean) {
        if (active && !humanNoticed.current) {
            humanNoticed.current = true;
            setMsgs((m) => [...m, { role: "status", text: HUMAN_JOINED }]);
            scrollDown();
        }
        if (!active && humanActive.current) humanNoticed.current = false;
        humanActive.current = active;
    }

    // One poll: POST { public_key, action: "poll", conversationId, afterId? } →
    // { messages: [{ id, role: "agent"|"human", body, created_at }], human }.
    // With no cursor yet the first poll is an ANCHOR: it swallows the history
    // (those bubbles are already on screen from send responses) and only records
    // the frontier; later polls deliver what comes after it.
    async function pollOnce(key: string) {
        if (!AGENT_URL || !convRef.current) return;
        const anchor = lastSeen.current === null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (ANON) { headers["Authorization"] = `Bearer ${ANON}`; headers["apikey"] = ANON; }
        const r = await fetch(AGENT_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
                public_key: key,
                action: "poll",
                conversationId: convRef.current,
                ...(lastSeen.current ? { afterId: lastSeen.current } : {}),
            }),
        });
        if (!r.ok) throw new Error(`poll ${r.status}`);
        const d = await r.json();
        const raw: unknown[] = Array.isArray(d.messages) ? d.messages : [];
        const list = raw.filter((m): m is { id: string; role: string; body: string } => {
            const x = m as { id?: unknown; role?: unknown; body?: unknown } | null;
            return !!x && typeof x.id === "string" && typeof x.role === "string" && typeof x.body === "string";
        });
        if (list.length) lastSeen.current = list[list.length - 1].id;
        if (d.human === true) noteHuman(true);
        else if (d.human === false) noteHuman(false);
        if (!anchor) {
            const fresh = list.filter((m) => m.body.trim() && !seenIds.current.has(m.id));
            fresh.forEach((m) => seenIds.current.add(m.id));
            if (fresh.length) {
                setMsgs((prev) => [...prev, ...fresh.map((m) => ({ role: "bot" as const, text: m.body, team: m.role === "human" }))]);
                lastActivity.current = Date.now();
                scrollDown();
            }
        } else {
            list.forEach((m) => seenIds.current.add(m.id));
        }
        persistConv();
    }

    // Receive loop: the console's human replies have no push channel — this poll
    // is their delivery leg. Runs while the panel is open, goes quiet ~2 minutes
    // after the last activity (a send or an incoming message re-arms it), backs
    // off silently on network failures, and stops when the panel closes.
    useEffect(() => {
        if (!open) return;
        lastActivity.current = Date.now();
        let stopped = false;
        let failures = 0;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            if (AGENT_KEY && convRef.current && Date.now() - lastActivity.current <= POLL_IDLE_MS) {
                try {
                    await pollOnce(AGENT_KEY);
                    failures = 0;
                } catch {
                    failures = Math.min(failures + 1, 5); // 5s → 30s, silently
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
    }, [open, AGENT_KEY]);

    async function send(text: string) {
        const q = text.trim();
        if (!q || busy) return;
        setMsgs((m) => [...m, { role: "user", text: q }]);
        setDraft("");
        setBusy(true);
        let reply = "";
        let cards: ChatCard[] = [];
        let humanTurn = false;
        if (AGENT_URL && AGENT_KEY) {
            try {
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (ANON) { headers["Authorization"] = `Bearer ${ANON}`; headers["apikey"] = ANON; }
                const res = await fetch(AGENT_URL, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ public_key: AGENT_KEY, channel: "web", conversationId: convRef.current, message: q }),
                });
                const data = await res.json();
                convRef.current = data.conversationId ?? convRef.current;
                reply = data.reply ?? "";
                cards = Array.isArray(data.cards) ? data.cards : [];
                humanTurn = data.human === true;
                // The reply arrives inline: re-anchor the poll cursor past it so
                // the receive loop never re-delivers an on-screen bubble.
                if (reply) lastSeen.current = null;
                persistConv();
            } catch {
                reply = "";
            }
        }
        lastActivity.current = Date.now();
        if (humanTurn) {
            // A person has this thread: the empty reply is honest silence while
            // they type — no canned concierge line. Show the takeover once; the
            // poll loop delivers their words as they come.
            noteHuman(true);
            if (reply) setMsgs((m) => [...m, { role: "bot", text: reply, cards }]);
        } else {
            if (!reply) reply = localReply(q);
            setMsgs((m) => [...m, { role: "bot", text: reply, cards }]);
        }
        setBusy(false);
        scrollDown();
    }

    return (
        <>
            <button className="ai-fab" onClick={() => setOpen((v) => !v)} aria-label="AI concierge">
                <i className={`fas ${open ? "fa-times" : "fa-comment-dots"}`} />
            </button>
            {open && (
                <div className="ai-panel">
                    <div className="ai-head">
                        <h4>Saveur Concierge</h4>
                        <p>AI assistant · recommendations, pairings & bookings</p>
                    </div>
                    <div className="ai-body" ref={bodyRef}>
                        {msgs.map((m, i) =>
                            m.role === "status" ? (
                                <div key={i} style={{ textAlign: "center", fontSize: 12, opacity: 0.6, padding: "2px 6px" }}>{m.text}</div>
                            ) : (
                                <div key={i} className={`ai-msg ${m.role}`}>
                                    {m.team && <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, marginBottom: 2 }}>{TEAM_LABEL}</div>}
                                    <RichText text={m.text} /><ProductCards cards={m.cards} />
                                </div>
                            ),
                        )}
                        {busy && <div className="ai-msg bot">…</div>}
                    </div>
                    <div className="ai-suggest">
                        {CHIPS.map((c) => (
                            <button key={c} className="ai-chip" onClick={() => send(c)}>{c}</button>
                        ))}
                    </div>
                    <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask the concierge…" />
                        <button type="submit" aria-label="Send"><i className="fas fa-paper-plane" /></button>
                    </form>
                </div>
            )}
        </>
    );
}
