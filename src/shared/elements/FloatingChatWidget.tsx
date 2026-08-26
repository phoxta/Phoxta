import { useEffect, useRef, useState } from "react";
import { RichText, ProductCards, MediaRow, type ChatCard, type ChatMedia } from "@shared-chat/chatRich";

/**
 * Text chat for phoxta.com.
 *
 * Every storefront Phoxta sells has had a text assistant; Phoxta's own site had
 * only the voice widget, so a visitor who did not want to talk out loud had no
 * way to ask anything. This closes that: the same agent that answers the phone
 * line and SMS now answers on the website, in the same thread model, landing in
 * the Phoxta org's Inbox like any other channel.
 *
 * Answers come from the platform agent, which reads the live catalogue through
 * list_blueprints rather than describing it from memory — so what it quotes is
 * whatever is buyable at that moment.
 */

// Derived from VITE_SUPABASE_URL when VITE_AGENT_URL is unset. The storefronts
// were gated on a variable that was set on exactly one of five, which silently
// turned four assistants into canned-reply boxes; deriving it removes the
// failure mode rather than the instance.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const AGENT_URL =
  (import.meta.env.VITE_AGENT_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/agent-inbound` : "");
const AGENT_KEY = (import.meta.env.VITE_AGENT_PUBLIC_KEY as string | undefined) ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

const GREETING =
  "Hi — I can explain how Phoxta works, walk you through the businesses you can buy, and answer anything about running one. What are you looking to do?";
const CHIPS = ["What can I buy?", "How does it work?", "What does it cost?", "Can I use my own domain?"];

type Msg = { role: "bot" | "user"; text: string; cards?: ChatCard[]; media?: ChatMedia[]; team?: boolean; note?: boolean };

/**
 * Receiving a human's replies.
 *
 * A Phoxta teammate can take this conversation over from the agent in the
 * console — at which point the agent deliberately says nothing. Without a
 * receive path the visitor would simply be met with silence, which on a sales
 * conversation is the worst possible moment for it. So the widget polls its own
 * thread while it is open.
 *
 * The thread is read with a capability, not with the public agent key: the key
 * is in this bundle and identifies the business, so on its own it would let
 * anyone read anyone's conversation. `threadToken` is minted per conversation
 * and handed back only to the visitor whose message opened it.
 */
const CONV_KEY = "phoxta:site:chat";
type StoredConv = { id: string; lastSeenId: string | null; token: string | null };

function loadStoredConv(): StoredConv | null {
  try {
    const raw = sessionStorage.getItem(CONV_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredConv>;
    if (typeof v?.id !== "string") return null;
    return {
      id: v.id,
      lastSeenId: typeof v.lastSeenId === "string" ? v.lastSeenId : null,
      token: typeof v.token === "string" ? v.token : null,
    };
  } catch {
    return null; // storage blocked — the chat still works, it just cannot resume
  }
}

function storeConv(c: StoredConv | null): void {
  try {
    if (c?.id) sessionStorage.setItem(CONV_KEY, JSON.stringify(c));
    else sessionStorage.removeItem(CONV_KEY);
  } catch { /* storage blocked */ }
}

const POLL_MS = 5000;
/** Stop polling a thread nobody is touching; any message re-arms it. */
const IDLE_MS = 120_000;

const CHAT_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

export default function FloatingChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const conv = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const lastSeen = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const humanNoticed = useRef(false);
  const lastActivity = useRef(Date.now());
  const bodyRef = useRef<HTMLDivElement>(null);

  // Resume a thread a hard reload would otherwise orphan — including one a
  // teammate is in the middle of answering.
  useEffect(() => {
    const stored = loadStoredConv();
    if (!stored) return;
    conv.current = stored.id;
    lastSeen.current = stored.lastSeenId;
    token.current = stored.token;
  }, []);

  const persist = () =>
    storeConv(conv.current ? { id: conv.current, lastSeenId: lastSeen.current, token: token.current } : null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [open, msgs]);

  /** Say once, and only once per takeover, that a person is now on the thread. */
  function noteHuman(active: boolean) {
    if (active && !humanNoticed.current) {
      humanNoticed.current = true;
      setMsgs((m) => [...m, { role: "bot", text: "A Phoxta teammate has joined the chat.", note: true }]);
    }
    if (!active) humanNoticed.current = false;
  }

  // One poll of this thread. With no cursor yet the first pass is an ANCHOR: the
  // messages it sees are already on screen from the send responses, so it only
  // records the frontier and shows nothing.
  async function pollOnce() {
    if (!AGENT_URL || !AGENT_KEY || !conv.current || !token.current) return;
    const anchoring = lastSeen.current === null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ANON) {
      headers["Authorization"] = `Bearer ${ANON}`;
      headers["apikey"] = ANON;
    }
    const r = await fetch(AGENT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        public_key: AGENT_KEY,
        action: "poll",
        conversationId: conv.current,
        threadToken: token.current,
        ...(lastSeen.current ? { afterId: lastSeen.current } : {}),
      }),
    });
    if (!r.ok) return;
    const d = await r.json();
    const rows: { id: string; role: string; body: string }[] = Array.isArray(d.messages)
      ? d.messages.filter((m: unknown) => {
          const x = m as { id?: unknown; role?: unknown; body?: unknown } | null;
          return !!x && typeof x.id === "string" && typeof x.role === "string" && typeof x.body === "string";
        })
      : [];
    if (rows.length) {
      lastSeen.current = rows[rows.length - 1].id;
      persist();
    }
    noteHuman(d.human === true);
    if (anchoring) {
      rows.forEach((m) => seenIds.current.add(m.id));
      return;
    }
    const fresh = rows.filter((m) => m.body.trim() && !seenIds.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => seenIds.current.add(m.id));
    lastActivity.current = Date.now();
    setMsgs((m) => [...m, ...fresh.map((f) => ({ role: "bot" as const, text: f.body, team: f.role === "human" }))]);
  }

  // Poll only while the panel is open and the thread is warm; failures stay
  // silent (a visitor must never see plumbing).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let timer = 0;
    const tick = async () => {
      if (!alive) return;
      if (conv.current && token.current && Date.now() - lastActivity.current < IDLE_MS) {
        try { await pollOnce(); } catch { /* transient — the next tick retries */ }
      }
      if (alive) timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, POLL_MS);
    return () => { alive = false; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setDraft("");
    setBusy(true);

    let reply = "";
    let cards: ChatCard[] = [];
    let media: ChatMedia[] = [];
    let human = false;
    if (AGENT_URL && AGENT_KEY) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (ANON) {
          headers["Authorization"] = `Bearer ${ANON}`;
          headers["apikey"] = ANON;
        }
        const r = await fetch(AGENT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ public_key: AGENT_KEY, channel: "web", conversationId: conv.current, message: q }),
        });
        const d = await r.json();
        const nextId = typeof d.conversationId === "string" ? d.conversationId : conv.current;
        // A new thread voids the old capability and the old read cursor.
        if (nextId !== conv.current) {
          token.current = null;
          lastSeen.current = null;
          seenIds.current.clear();
        }
        conv.current = nextId;
        if (typeof d.threadToken === "string" && d.threadToken) token.current = d.threadToken;
        reply = (d.reply ?? "").trim();
        human = d.human === true;
        cards = Array.isArray(d.cards) ? d.cards : [];
        media = Array.isArray(d.media) ? d.media : [];
        // This reply is on screen already: re-anchor so the poll cannot repeat it.
        if (reply) lastSeen.current = null;
        persist();
      } catch (err) {
        console.error("[phoxta] chat agent unreachable:", err);
      }
    }
    lastActivity.current = Date.now();
    if (human) {
      // A teammate owns this thread — the agent stays quiet on purpose, so the
      // canned "couldn't reach the assistant" line would be a lie. Say who is
      // answering instead and let the poll deliver their reply.
      noteHuman(true);
      if (reply) setMsgs((m) => [...m, { role: "bot", text: reply, cards, media }]);
    } else {
      noteHuman(false);
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: reply || "I couldn't reach the assistant just then — try again in a moment, or use the contact page and a person will pick it up.",
          cards,
          media,
        },
      ]);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Chat with Phoxta"}
        className="d-inline-flex align-items-center justify-content-center"
        style={{
          position: "fixed", right: 24, bottom: 96, zIndex: 1899, width: 52, height: 52,
          borderRadius: 999, border: 0, cursor: "pointer",
          background: "var(--neutral-900, #111)", color: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,.25)",
        }}
      >
        {open ? "×" : CHAT_ICON}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Chat with Phoxta"
          className="d-flex flex-column bg-neutral-0"
          style={{
            position: "fixed", right: 24, bottom: 160, zIndex: 1899,
            width: 380, maxWidth: "calc(100vw - 40px)", height: 520, maxHeight: "calc(100vh - 220px)",
            borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.25)",
          }}
        >
          <div className="p-3" style={{ background: "var(--neutral-900, #111)", color: "#fff" }}>
            <div className="fw-600">Ask Phoxta</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Businesses, pricing and how it all works</div>
          </div>

          <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2" ref={bodyRef} role="log" aria-busy={busy}>
            {msgs.map((m, i) =>
              m.note ? (
                // Not a message — a status line about who is answering.
                <div key={i} className="align-self-center text-center" style={{ fontSize: 12, opacity: 0.6, padding: "2px 8px" }}>
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className={m.role === "user" ? "align-self-end text-white" : "align-self-start"}
                  style={{
                    maxWidth: "88%", padding: "10px 14px", borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                    background: m.role === "user" ? "var(--neutral-900, #111)" : "var(--neutral-100, #f1f2f4)",
                  }}
                >
                  {m.team && (
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
                      Phoxta team
                    </div>
                  )}
                  <RichText text={m.text} />
                  <MediaRow media={m.media} />
                  <ProductCards cards={m.cards} />
                </div>
              ),
            )}
            {busy && (
              <div className="align-self-start" style={{ padding: "10px 14px", borderRadius: 12, background: "var(--neutral-100, #f1f2f4)", fontSize: 14 }}>
                …
              </div>
            )}
          </div>

          <div className="d-flex flex-wrap gap-2 px-3 pb-2">
            {CHIPS.map((c) => (
              <button key={c} type="button" onClick={() => send(c)} disabled={busy}
                      className="btn btn-sm border rounded-pill" style={{ fontSize: 12 }}>
                {c}
              </button>
            ))}
          </div>

          <form className="d-flex gap-2 p-2 border-top" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <label className="visually-hidden" htmlFor="phoxta-chat-input">Message Phoxta</label>
            <input
              id="phoxta-chat-input"
              className="form-control rounded-3"
              value={draft}
              placeholder="Ask anything…"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn btn-dark px-3 rounded-3" aria-label="Send" disabled={busy || !draft.trim()}>→</button>
          </form>
        </div>
      )}
    </>
  );
}
