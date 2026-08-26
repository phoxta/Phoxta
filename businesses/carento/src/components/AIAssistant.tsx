import { useEffect, useRef, useState } from "react";
import { RichText, ProductCards, type ChatCard } from "@/lib/chatRich";
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
// threadToken, afterId? } → { messages: [{ id, role: "agent"|"human", body,
// created_at }], human }.
//
// threadToken is a per-thread capability returned by every send. The agent
// public_key ships inside this bundle, so it proves a business and never a
// visitor; the poll therefore answers 404 to anyone who cannot present the token
// for the thread they ask about. It is stored and resumed beside the id and the
// cursor. An entry written before tokens existed carries none: that thread can
// still be sent on (the next send returns a fresh token) but must not be polled.
// The conversation id + poll cursor live in sessionStorage so SPA navigation
// doesn't orphan a live human conversation. Fail-soft everywhere: blocked
// storage just loses resume, a failed poll just waits for the next one.
const CONV_KEY = "phoxta:chat:conv";
function loadStoredConv(): { id: string; lastSeenId: string | null; token: string | null } | null {
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
function storeConv(id: string | null, lastSeenId: string | null, token: string | null) {
  try {
    if (id) sessionStorage.setItem(CONV_KEY, JSON.stringify({ id, lastSeenId, token }));
    else sessionStorage.removeItem(CONV_KEY);
  } catch {
    /* storage unavailable */
  }
}

const HUMAN_JOINED = "A team member has joined the chat…";
const TEAM_LABEL = "Team";
const POLL_MS = 5000; // receive cadence while the panel is open
const POLL_IDLE_MS = 120_000; // stop polling ~2 min after the last activity

const LABEL = "Ask us";
const TITLE = "Sales assistant";
const SUBTITLE = "AI assistant · stock, finance & test drives";
const GREETING = "Hi — I can help you find the right car, compare specs, talk finance and book a test drive. What are you after?";
const FALLBACK = "I can help with stock, prices, finance and test drives. Tell me what you are looking for and I will take it from there.";
const PLACEHOLDER = "Ask about a car…";
const CHIPS = ["What SUVs are in stock?", "Book a test drive", "What finance do you offer?", "Value my part-exchange"];

type Msg = { role: "bot" | "user" | "status"; text: string; cards?: ChatCard[]; team?: boolean };

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [agentKey, setAgentKey] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const conv = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Human-takeover receive path: the last delivered message id (poll cursor),
  // ids already rendered (dedupe), whether the takeover notice has been shown,
  // and the last activity time that keeps the poll loop alive.
  const lastSeen = useRef<string | null>(null);
  // The capability for THIS thread, from the last send that returned one.
  // Without it the poll can only 404, so the receive loop stays quiet until a
  // send hands one over.
  const threadToken = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const humanActive = useRef(false);
  const humanNoticed = useRef(false);
  const lastActivity = useRef(Date.now());

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

  // Resume across SPA navigation: a human conversation must not be orphaned
  // because the visitor changed page — restore the thread id + poll cursor.
  useEffect(() => {
    const s = loadStoredConv();
    if (s && !conv.current) {
      conv.current = s.id;
      lastSeen.current = s.lastSeenId;
      threadToken.current = s.token; // null on an entry stored before tokens
    }
  }, []);

  const persistConv = () => storeConv(conv.current, lastSeen.current, threadToken.current);

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

  // One poll: POST { public_key, action: "poll", conversationId, threadToken,
  // afterId? } → { messages: [{ id, role: "agent"|"human", body, created_at }],
  // human }. With no cursor yet the first poll is an ANCHOR: it swallows the
  // history (those bubbles are already on screen from send responses) and only
  // records the frontier; later polls deliver what comes after it.
  async function pollOnce(key: string) {
    if (!AGENT_URL || !conv.current || !threadToken.current) return;
    const anchor = lastSeen.current === null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ANON) {
      headers["Authorization"] = `Bearer ${ANON}`;
      headers["apikey"] = ANON;
    }
    const r = await fetch(AGENT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        public_key: key,
        action: "poll",
        conversationId: conv.current,
        threadToken: threadToken.current,
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
      const key = agentKey || ENV_AGENT_KEY;
      // Every tick re-reads the refs, so a thread resumed without a token (one
      // stored before tokens existed) starts polling the moment a send returns
      // one — no token can never wedge the loop shut.
      if (key && conv.current && threadToken.current && Date.now() - lastActivity.current <= POLL_IDLE_MS) {
        try {
          await pollOnce(key);
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
  }, [open, agentKey]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setDraft("");
    setBusy(true);
    const key = agentKey || ENV_AGENT_KEY;
    let reply = "";
    let cards: ChatCard[] = [];
    let humanTurn = false;
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
        // Every reply that names a thread carries that thread's capability too
        // — the normal, human-takeover and flow-suppressed paths alike. A
        // different thread id invalidates the token held for the old one.
        const nextConv = typeof d.conversationId === "string" ? d.conversationId : conv.current;
        if (nextConv !== conv.current) threadToken.current = null;
        if (typeof d.threadToken === "string" && d.threadToken) threadToken.current = d.threadToken;
        conv.current = nextConv;
        reply = d.reply ?? "";
        cards = Array.isArray(d.cards) ? d.cards : [];
        humanTurn = d.human === true;
        // The reply arrives inline: re-anchor the poll cursor past it so the
        // receive loop never re-delivers a bubble that is already on screen.
        if (reply) lastSeen.current = null;
        persistConv();
      } catch {
        reply = "";
      }
    }
    lastActivity.current = Date.now();
    if (humanTurn) {
      // A person has this thread: the empty reply is honest silence while they
      // type — no canned line. Show the takeover once; the poll loop delivers
      // their words as they come.
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
            {msgs.map((m, i) =>
              m.role === "status" ? (
                <div key={i} className="align-self-center text-center" style={{ fontSize: 12, opacity: 0.6, padding: "2px 6px" }}>
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className={m.role === "user" ? "align-self-end bg-dark text-white" : "align-self-start"}
                  style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 12, lineHeight: 1.5, fontSize: 14, background: m.role === "user" ? undefined : "#F1F2F4" }}
                >
                  {m.team && <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, marginBottom: 2 }}>{TEAM_LABEL}</div>}
                  <RichText text={m.text} />
                  <ProductCards cards={m.cards} />
                </div>
              ),
            )}
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
