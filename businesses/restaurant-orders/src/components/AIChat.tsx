import { useRef, useState } from "react";
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

type Msg = { role: "bot" | "user"; text: string; cards?: ChatCard[] };
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

    async function send(text: string) {
        const q = text.trim();
        if (!q || busy) return;
        setMsgs((m) => [...m, { role: "user", text: q }]);
        setDraft("");
        setBusy(true);
        let reply = "";
        let cards: ChatCard[] = [];
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
            } catch {
                reply = "";
            }
        }
        if (!reply) reply = localReply(q);
        setMsgs((m) => [...m, { role: "bot", text: reply, cards }]);
        setBusy(false);
        setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);
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
                        {msgs.map((m, i) => (
                            <div key={i} className={`ai-msg ${m.role}`}><RichText text={m.text} /><ProductCards cards={m.cards} /></div>
                        ))}
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
