import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { agentRespond, getAgentConfig, summarizeConversation } from "@/lib/db/ops/agent";
import type { OpsContext } from "@/layouts/OperatingLayout";

// The voice widget pulls in WebRTC + the Pipecat client SDK — lazy-load it so it
// never weighs down the dashboard until someone opens the Talk tab.
const VoiceAgentWidget = lazy(() => import("@/shared/VoiceAgentWidget"));
const VOICE_SERVER_URL = (import.meta.env.VITE_VOICE_SERVER_URL as string | undefined) ?? "";

type Msg = { role: "customer" | "agent"; body: string; actions?: string[]; escalated?: boolean };

const CHANNELS = ["web", "voice", "sms", "whatsapp"];

export default function TestPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [channel, setChannel] = useState("web");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    getAgentConfig(orgId).then(({ data }) => setPublicKey(data?.public_key ?? null));
  }, [orgId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setDraft("");
    setMessages((m) => [...m, { role: "customer", body: text }]);

    const { data, error } = await agentRespond(orgId, text, conversationId, channel);
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
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="bg-neutral-0 rounded-4 border-100 d-flex flex-column" style={{ height: "68vh" }}>
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-600 fz-font-md">Talk to your agent as a customer</span>
              <select className="form-select form-select-sm rounded-3" style={{ width: "auto" }} value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map((c) => <option key={c} value={c} className="text-capitalize">{c}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={reset}>New chat</button>
          </div>

          <div ref={threadRef} className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3">
            {messages.length === 0 && !sending && (
              <div className="m-auto text-center neutral-500" style={{ maxWidth: 420 }}>
                <h6 className="fw-600 neutral-700 mb-2">Try the agent end-to-end</h6>
                <p className="fz-font-md mb-0">e.g. “Do you have anything available this week? My name's Sam, sam@email.com” — it will check availability, book, and capture you as a lead in CRM.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`d-flex ${m.role === "customer" ? "justify-content-end" : "justify-content-start"}`}>
                <div className={`px-3 py-2 rounded-4 fz-font-md ${m.role === "customer" ? "bg-neutral-900 text-white" : "bg-neutral-100 neutral-900"}`} style={{ maxWidth: "80%", whiteSpace: "pre-wrap" }}>
                  {m.body}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-1">
                      {m.actions.map((a, j) => <span key={j} className="badge bg-success-subtle text-success fw-500">✓ {a}</span>)}
                    </div>
                  )}
                  {m.escalated && <div className="mt-1"><span className="badge bg-warning-subtle text-warning fw-500">Escalated to a human</span></div>}
                </div>
              </div>
            ))}
            {sending && <div className="d-flex justify-content-start"><div className="px-3 py-2 rounded-4 fz-font-md bg-neutral-100 neutral-500">Thinking…</div></div>}
          </div>

          {error && <div className="alert alert-warning py-2 px-3 fz-font-md m-3 mb-0">{error}</div>}

          <form onSubmit={send} className="border-top p-3 d-flex gap-2">
            <input className="form-control rounded-3" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message your agent…" disabled={sending} />
            <button type="submit" className="btn btn-dark rounded-3 px-4" disabled={sending || !draft.trim()}>Send</button>
          </form>
        </div>
      </div>

      <div className="col-lg-4 d-flex flex-column gap-4">
        {publicKey && VOICE_SERVER_URL ? (
          <Suspense fallback={<div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500 fz-font-md">Loading voice…</div>}>
            <VoiceAgentWidget publicKey={publicKey} serverUrl={VOICE_SERVER_URL} />
          </Suspense>
        ) : (
          <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <h6 className="fw-600 mb-2">Talk to your agent</h6>
            <p className="fz-font-md neutral-500 mb-0">Set <code>VITE_VOICE_SERVER_URL</code> to your Pipecat voice server to talk to the agent live in the browser — the same brain that answers the phone.</p>
          </div>
        )}
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <h6 className="fw-600 mb-2">What this proves</h6>
          <p className="fz-font-md neutral-500 mb-3">This is the same brain that answers every channel. Watch the ✓ badges — the agent takes real actions in your business:</p>
          <ul className="fz-font-md neutral-700 mb-0">
            <li>Books & reschedules into <strong>Bookings</strong></li>
            <li>Captures & qualifies leads into <strong>CRM</strong></li>
            <li>Opens <strong>support tickets</strong></li>
            <li>Routes by ZIP across <strong>locations</strong></li>
            <li>Answers from your <strong>knowledge</strong> (RAG)</li>
            <li>Escalates to a human when needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
