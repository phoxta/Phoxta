import { useRef, useState } from "react";
import { useCatalog } from "@/util/catalog";

// AI Stylist — connects to the Phoxta unified agent (agent-inbound) addressed by
// THIS tenant's agent public_key, resolved at runtime from the catalogue context
// (so every buyer's store uses its own agent). Falls back to a built-in stylist
// when the backend is unreachable, so the store always answers.
const AGENT_URL = (import.meta.env.VITE_AGENT_URL as string | undefined) ?? "";
const ENV_AGENT_KEY = (import.meta.env.VITE_AGENT_PUBLIC_KEY as string | undefined) ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

type Msg = { role: "bot" | "user"; text: string };
const CHIPS = ["What's new in?", "Style a wool coat", "Gift under $150", "Size advice"];

function localReply(q: string): string {
    const s = q.toLowerCase();
    if (/new|arriv|trend/.test(s)) return "Just landed: the Tailored Wool Coat, Silk Slip Dress and Cashmere Knit. Want me to pull up the New Arrivals edit?";
    if (/gift|under|budget/.test(s)) return "Lovely gifts under $150: the Relaxed Linen Shirt, Pleated Midi Skirt and Merino Roll-Neck — all ship in recyclable packaging.";
    if (/coat|style|outfit|wear|pair/.test(s)) return "The Tailored Wool Coat looks beautiful over the Cashmere Knit with Wide-Leg Trousers — an easy, elevated everyday look.";
    if (/size|fit|measure/.test(s)) return "Our pieces run true to size. Between sizes? Size up for a relaxed drape — tell me your usual size and I'll confirm.";
    return "I'm your Aurelia stylist — I can suggest pieces, build outfits, advise on fit and find the perfect gift. What are you shopping for?";
}

export default function AIStylist() {
    const { agentKey } = useCatalog();
    const AGENT_KEY = agentKey || ENV_AGENT_KEY;
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: "Hi — I'm your personal stylist. Looking for something specific, or shall I suggest a few pieces?" }]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const conv = useRef<string | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    async function send(text: string) {
        const q = text.trim();
        if (!q || busy) return;
        setMsgs((m) => [...m, { role: "user", text: q }]);
        setDraft("");
        setBusy(true);
        let reply = "";
        if (AGENT_URL && AGENT_KEY) {
            try {
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (ANON) { headers["Authorization"] = `Bearer ${ANON}`; headers["apikey"] = ANON; }
                const r = await fetch(AGENT_URL, { method: "POST", headers, body: JSON.stringify({ public_key: AGENT_KEY, channel: "web", conversationId: conv.current, message: q }) });
                const d = await r.json();
                conv.current = d.conversationId ?? conv.current;
                reply = d.reply ?? "";
            } catch { reply = ""; }
        }
        if (!reply) reply = localReply(q);
        setMsgs((m) => [...m, { role: "bot", text: reply }]);
        setBusy(false);
        setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);
    }

    return (
        <>
            <button onClick={() => setOpen((v) => !v)} className="at-btn bg-dark text-white" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1900, justifyContent: "center", borderRadius: 999, padding: "14px 22px" }}>
                <span><span className="text-1">{open ? "Close" : "AI Stylist"}</span><span className="text-2">{open ? "Close" : "AI Stylist"}</span></span>
            </button>
            {open && (
                <div className="bg-neutral-0 d-flex flex-column" style={{ position: "fixed", bottom: 92, right: 24, zIndex: 1900, width: 370, maxWidth: "calc(100vw - 40px)", height: 520, maxHeight: "calc(100vh - 140px)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.25)" }}>
                    <div className="bg-dark text-white p-3">
                        <h6 className="fw-600 mb-0">Aurelia Stylist</h6>
                        <p className="fz-12 opacity-50 mb-0">AI assistant · styling, fit &amp; gifts</p>
                    </div>
                    <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2" ref={bodyRef}>
                        {msgs.map((m, i) => (
                            <div key={i} className={`fz-14 ${m.role === "user" ? "align-self-end bg-dark text-white" : "align-self-start bg-neutral-100"}`} style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 12, lineHeight: 1.5 }}>{m.text}</div>
                        ))}
                        {busy && <div className="align-self-start bg-neutral-100 fz-14" style={{ padding: "10px 14px", borderRadius: 12 }}>…</div>}
                    </div>
                    <div className="d-flex flex-wrap gap-2 px-3 pb-2">
                        {CHIPS.map((c) => <button key={c} onClick={() => send(c)} className="btn btn-sm border border-100 rounded-pill fz-12">{c}</button>)}
                    </div>
                    <form className="d-flex gap-2 p-2 border-top border-100" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
                        <input className="form-control" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask the stylist…" />
                        <button className="at-btn bg-dark text-white px-3" style={{ justifyContent: "center" }} aria-label="Send"><span><span className="text-1">→</span><span className="text-2">→</span></span></button>
                    </form>
                </div>
            )}
        </>
    );
}
