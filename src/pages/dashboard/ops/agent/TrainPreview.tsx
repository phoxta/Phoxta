import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { summarizeConversation } from "@/lib/db/ops/agent";

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
    <div className="d-flex flex-column gap-4">
      <div className="bg-neutral-0 rounded-4 border-100 d-flex flex-column" style={{ height: "56vh", minHeight: 380 }}>
        <div className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-600 fz-font-md">Live preview</span>
            <label className="visually-hidden" htmlFor="train-preview-channel">Channel</label>
            <select id="train-preview-channel" className="form-select form-select-sm rounded-3" style={{ width: "auto" }} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c} value={c} className="text-capitalize">{c}</option>)}
            </select>
            <span className="badge bg-neutral-100 neutral-500 fw-500">Sandbox</span>
          </div>
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={reset}>New chat</button>
        </div>

        <div ref={threadRef} className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-3">
          {messages.length === 0 && !sending && (
            <div className="m-auto text-center neutral-500" style={{ maxWidth: 360 }}>
              <h6 className="fw-600 neutral-700 mb-2">Talk to your agent as a customer</h6>
              <p className="fz-font-md mb-0">Try “Do you have anything available this week? My name's Sam, sam@email.com”. Test chats never show in your Inbox or stats.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`d-flex ${m.role === "customer" ? "justify-content-end" : "justify-content-start"}`}>
              <div className={`px-3 py-2 rounded-4 fz-font-md ${m.role === "customer" ? "bg-neutral-900 text-white" : "bg-neutral-100 neutral-900"}`} style={{ maxWidth: "85%", whiteSpace: "pre-wrap" }}>
                {m.body}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {m.actions.map((a, j) => <span key={j} className="badge bg-success-subtle text-success fw-500">✓ {a}</span>)}
                  </div>
                )}
                {m.escalated && <div className="mt-1"><span className="badge bg-danger-subtle text-danger fw-500">Escalated to a human</span></div>}
              </div>
            </div>
          ))}
          {sending && <div className="d-flex justify-content-start"><div className="px-3 py-2 rounded-4 fz-font-md bg-neutral-100 neutral-500">Thinking…</div></div>}
        </div>

        {error && <div className="alert alert-warning py-2 px-3 fz-font-md m-3 mb-0">{error}</div>}

        <form onSubmit={send} className="border-top p-3 d-flex gap-2">
          <label className="visually-hidden" htmlFor="train-preview-draft">Message your agent</label>
          <input id="train-preview-draft" className="form-control rounded-3" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message your agent…" disabled={sending} />
          <button type="submit" className="btn btn-dark rounded-3 px-4" disabled={sending || !draft.trim()}>Send</button>
        </form>
      </div>

      {publicKey && VOICE_SERVER_URL && (
        <Suspense fallback={<div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500 fz-font-md">Loading voice…</div>}>
          <VoiceAgentWidget publicKey={publicKey} serverUrl={VOICE_SERVER_URL} />
        </Suspense>
      )}
    </div>
  );
}
