import { useEffect, useRef, useState } from "react";
import { supabase, resolveTenant } from "@/lib/phoxta";

/**
 * AI assistant for this storefront.
 *
 * Talks to the Phoxta unified agent (agent-inbound) addressed by THIS tenant's
 * agent public_key. Every buyer's store runs from the same deployment, so the
 * key is resolved at runtime from the hostname — a build-time key would send
 * every store's conversations into whichever business owned that key.
 *
 * Conversations become real threads in that business's operating console Inbox,
 * so the owner can read them, take over and reply on any channel.
 *
 * Falls back to a short local reply when the backend is unreachable, so the
 * store always answers.
 */
const AGENT_URL = (import.meta.env.VITE_AGENT_URL as string | undefined) ?? "";
const ENV_AGENT_KEY = (import.meta.env.VITE_AGENT_PUBLIC_KEY as string | undefined) ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

const LABEL = "Ask us";
const TITLE = "Travel assistant";
const SUBTITLE = "AI assistant · stays, trips & bookings";
const GREETING = "Hi — I can suggest a trip, check dates and take a booking. Where are you headed?";
const FALLBACK = "I can help with availability, pricing and bookings. Tell me your dates and I will take it from there.";
const PLACEHOLDER = "Ask about a trip…";
const CHIPS = ["What is available next month?", "Suggest a weekend trip", "What is included?", "Where is my booking?"];

type Msg = { role: "bot" | "user"; text: string };

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [agentKey, setAgentKey] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const conv = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Resolve this store's own agent the first time the panel is opened, so a
  // visitor who never opens the chat costs nothing.
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
        /* falls back to the env key, then to a local reply */
      }
    })();
    return () => {
      active = false;
    };
  }, [open, agentKey]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setDraft("");
    setBusy(true);
    const key = agentKey || ENV_AGENT_KEY;
    let reply = "";
    if (AGENT_URL && key) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (ANON) {
          headers["Authorization"] = `Bearer ${ANON}`;
          headers["apikey"] = ANON;
        }
        const r = await fetch(AGENT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ public_key: key, channel: "web", conversationId: conv.current, message: q }),
        });
        const d = await r.json();
        conv.current = d.conversationId ?? conv.current;
        reply = d.reply ?? "";
      } catch {
        reply = "";
      }
    }
    if (!reply) reply = FALLBACK;
    setMsgs((m) => [...m, { role: "bot", text: reply }]);
    setBusy(false);
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn bg-dark text-white"
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1900, borderRadius: 999, padding: "13px 22px", fontWeight: 600 }}
        aria-expanded={open}
      >
        {open ? "Close" : LABEL}
      </button>

      {open && (
        <div
          className="d-flex flex-column"
          style={{ position: "fixed", bottom: 92, right: 24, zIndex: 1900, width: 370, maxWidth: "calc(100vw - 40px)", height: 520, maxHeight: "calc(100vh - 140px)", borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,.25)" }}
          role="dialog"
          aria-label={TITLE}
        >
          <div className="bg-dark text-white p-3">
            <h6 className="fw-bold mb-0">{TITLE}</h6>
            <p className="mb-0" style={{ fontSize: 12, opacity: 0.6 }}>{SUBTITLE}</p>
          </div>

          <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "align-self-end bg-dark text-white" : "align-self-start"}
                style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 12, lineHeight: 1.5, fontSize: 14, background: m.role === "user" ? undefined : "#F1F2F4" }}
              >
                {m.text}
              </div>
            ))}
            {busy && <div className="align-self-start" style={{ padding: "10px 14px", borderRadius: 12, background: "#F1F2F4", fontSize: 14 }}>…</div>}
          </div>

          <div className="d-flex flex-wrap gap-2 px-3 pb-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => send(c)} className="btn btn-sm border rounded-pill" style={{ fontSize: 12 }}>
                {c}
              </button>
            ))}
          </div>

          <form className="d-flex gap-2 p-2 border-top" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <input className="form-control" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={PLACEHOLDER} aria-label={PLACEHOLDER} />
            <button className="btn bg-dark text-white px-3" aria-label="Send" disabled={busy || !draft.trim()}>→</button>
          </form>
        </div>
      )}
    </>
  );
}
