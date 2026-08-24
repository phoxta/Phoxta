import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { summarizeConversation } from "@/lib/db/ops/agent";
import { Chip } from "@/components/dash/Ui";

/** hrx-kit dressing for the sandbox chat — the card, bubbles and link-buttons. */
const AGX_CSS = `
.agx-tp-chat{height:min(70vh,720px);min-height:420px;display:flex;flex-direction:column}
.agx-tp-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:1px solid var(--hrx-border-soft)}
.agx-tp-foot{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--hrx-border-soft)}
.agx-tp-foot .hrx-pill:disabled{opacity:.55;cursor:default}
.agx-bubble{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
.agx-bubble.customer{background:var(--hrx-ink);color:#fff;border-bottom-right-radius:4px}
.agx-bubble.agent{background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);border-bottom-left-radius:4px}
.agx-bubble.pending{background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);color:var(--hrx-muted)}
.agx-linkbtn{background:none;border:0;padding:0;font-size:13px;font-weight:500;color:var(--hrx-muted);cursor:pointer;text-decoration:none}
.agx-linkbtn:hover{color:var(--hrx-ink)}
.agx-alert{background:#fdf3d7;border:1px solid #f2dfa6;border-radius:16px;color:#a16207;padding:10px 14px;font-size:14px;margin:12px 16px 0}
`;

// The voice widget pulls in WebRTC + the Pipecat client SDK — lazy-load it so
// it never weighs down the dashboard until the Train tab is open.
const VoiceAgentWidget = lazy(() => import("@/shared/VoiceAgentWidget"));
const VOICE_SERVER_URL = (import.meta.env.VITE_VOICE_SERVER_URL as string | undefined) ?? "";

type Msg = { role: "customer" | "agent"; body: string; actions?: string[]; escalated?: boolean };

const CHANNELS = ["web", "sms", "whatsapp"];

type AgentReply = { conversationId: string; reply: string; actions?: string[]; escalated?: boolean };

/**
 * Sandbox call to the real agent brain. Mirrors agentRespond's request shape
 * exactly, plus `test: true` (the sandbox contract) so the conversation is
 * created with is_test = true and never pollutes the Inbox or the stats.
 */
async function testRespond(
  orgId: string,
  message: string,
  conversationId: string | null,
  channel: string,
): Promise<{ data: AgentReply | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("ai-agent", {
    body: { organizationId: orgId, action: "respond", message, conversationId: conversationId ?? undefined, channel, customer: {}, test: true },
  });
  if (error) {
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) serverMessage = String(payload.error);
      }
    } catch { /* fall through */ }
    return { data: null, error: serverMessage ?? friendlyError(error.message) };
  }
  if (data?.error) return { data: null, error: String(data.error) };
  return { data: data as AgentReply, error: null };
}

/**
 * Live preview pane for the Train page: talk to the real agent (same brain,
 * same knowledge, same tools) in a sandbox — test conversations are flagged
 * is_test and excluded from the Inbox and reporting.
 */
export default function TrainPreview({ orgId, publicKey }: { orgId: string; publicKey: string | null }) {
  const [channel, setChannel] = useState("web");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Never carry one business's test chat into another business's Train page.
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setDraft("");
  }, [orgId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setDraft("");
    setMessages((m) => [...m, { role: "customer", body: text }]);

    const { data, error } = await testRespond(orgId, text, conversationId, channel);
    setSending(false);
    if (error) {
      setError(error);
      return;
    }
    if (data) {
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "agent", body: data.reply, actions: data.actions, escalated: data.escalated }]);
    }
  }

  function reset() {
    if (conversationId) summarizeConversation(orgId, conversationId);
    setMessages([]);
    setConversationId(null);
    setError(null);
  }

  return (
    <div className="d-flex flex-column gap-3">
      <style>{AGX_CSS}</style>
      {/* Same sizing convention as the Inbox thread and the Operator chat:
          viewport-relative, with a floor so it stays usable on a short phone. */}
      <div className="hrx-card agx-tp-chat">
        <div className="agx-tp-head">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h2 className="hrx-card-title">Live preview</h2>
            <label className="visually-hidden" htmlFor="train-preview-channel">Channel</label>
            <select id="train-preview-channel" className="form-select form-select-sm text-capitalize" style={{ width: "auto" }} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c} value={c} className="text-capitalize">{c}</option>)}
            </select>
            <Chip tone="line">Sandbox</Chip>
          </div>
          <button type="button" className="agx-linkbtn ops-tap" onClick={reset}>New chat</button>
        </div>

        <div ref={threadRef} className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-3" role="log" aria-label="Preview conversation" aria-busy={sending}>
          {messages.length === 0 && !sending && (
            <div className="m-auto text-center px-2" style={{ maxWidth: 360, color: "var(--hrx-muted)" }}>
              <h3 className="mb-2" style={{ fontSize: 15, fontWeight: 600, color: "var(--hrx-ink)" }}>Talk to your agent as a customer</h3>
              <p className="mb-0" style={{ fontSize: 14 }}>Try “Do you have anything available this week? My name's Sam, sam@email.com”. Test chats never show in your Inbox or stats.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`d-flex ${m.role === "customer" ? "justify-content-end" : "justify-content-start"}`}>
              <div className={`agx-bubble ${m.role === "customer" ? "customer" : "agent"}`}>
                {m.body}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {m.actions.map((a, j) => <Chip key={j} tone="ok">✓ {a}</Chip>)}
                  </div>
                )}
                {m.escalated && <div className="mt-1"><Chip tone="danger">Escalated to a human</Chip></div>}
              </div>
            </div>
          ))}
          {sending && <div className="d-flex justify-content-start"><div className="agx-bubble pending">Thinking…</div></div>}
        </div>

        {error && <div className="agx-alert" role="alert">{error}</div>}

        <form onSubmit={send} className="agx-tp-foot">
          <label className="visually-hidden" htmlFor="train-preview-draft">Message your agent</label>
          <input id="train-preview-draft" className="form-control" style={{ minWidth: 0 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message your agent…" disabled={sending} />
          <button type="submit" className="hrx-pill dark flex-shrink-0" disabled={sending || !draft.trim()}>Send</button>
        </form>
      </div>

      {publicKey && VOICE_SERVER_URL && (
        <Suspense fallback={<div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>Loading voice…</div>}>
          <VoiceAgentWidget publicKey={publicKey} serverUrl={VOICE_SERVER_URL} />
        </Suspense>
      )}
    </div>
  );
}
