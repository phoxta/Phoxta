import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery, DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listConversations,
  listMessages,
  askAssistant,
  type AiConversation,
  type AiMessage,
} from "@/lib/db/ai";

export default function AssistantPage() {
  // The business list comes from the shared, warmed "organizations" cache.
  const { data: orgRows = [], loading, error: orgsError } = useCachedData(
    organizationsQuery.key,
    organizationsQuery.fetch,
    { ttl: DASHBOARD_TTL },
  );
  const orgs = orgRows.map((d) => d.organization);
  const [orgId, setOrgId] = useState<string>("");
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Default to the first business once the org list is available.
  useEffect(() => {
    if (!orgId && orgRows.length > 0) setOrgId(orgRows[0].organization.id);
  }, [orgRows, orgId]);

  // When the business changes, load its conversations and open the latest.
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    listConversations(orgId).then(({ data }) => {
      if (!active) return;
      setConversations(data);
      setConversationId(data[0]?.id ?? null);
      if (!data[0]) setMessages([]);
    });
    return () => {
      active = false;
    };
  }, [orgId]);

  // Load the transcript of the open conversation.
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    listMessages(conversationId).then(({ data }) => {
      if (active) setMessages(data);
    });
    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function startNew() {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !orgId || sending) return;

    setError(null);
    setSending(true);
    setDraft("");
    // Optimistically show the user's message.
    const optimistic: AiMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    const res = await askAssistant(orgId, text, conversationId);
    setSending(false);

    if (res.error) {
      setError(res.error);
      // Roll the optimistic message back into the box so it isn't lost.
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setDraft(text);
      return;
    }

    const newId = res.conversationId ?? conversationId;
    if (newId && newId !== conversationId) {
      setConversationId(newId);
      listConversations(orgId).then(({ data }) => setConversations(data));
    }
    if (newId) {
      const { data } = await listMessages(newId);
      setMessages(data);
    }
  }

  if (loading) {
    return (
      <div>
        <PageMeta title="Phoxta - Assistant" />
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <PageMeta title="Phoxta - Assistant" />
      <div className="mb-4 d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <h2 className="fw-600 mb-1">Assistant</h2>
          <p className="neutral-500 mb-0">Your business's AI — drafts, plans, answers and next steps.</p>
        </div>
        {orgs.length > 0 && (
          <div style={{ minWidth: 220 }}>
            <label className="form-label fz-font-sm fw-500 neutral-500 mb-1">Business</label>
            <select className="form-select rounded-3" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {orgs.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
          <h5 className="fw-600 mb-2">No business yet</h5>
          <p className="neutral-500 mb-3">Add a business to start using its assistant.</p>
          <Link to="/dashboard/marketplace" className="at-btn d-inline-block">
            <span>
              <span className="text-1">Browse the marketplace</span>
              <span className="text-2">Browse the marketplace</span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {/* Conversation list */}
          <div className="col-lg-3">
            <button type="button" className="btn btn-dark w-100 rounded-3 mb-3" onClick={startNew}>
              + New chat
            </button>
            <div className="d-flex flex-column gap-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConversationId(c.id)}
                  className={`text-start px-3 py-2 rounded-3 border-0 fz-font-md text-truncate ${
                    c.id === conversationId ? "bg-neutral-100 neutral-900 fw-600" : "bg-neutral-0 neutral-500"
                  }`}
                >
                  {c.title}
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="fz-font-sm neutral-500 px-2">No conversations yet.</p>
              )}
            </div>
          </div>

          {/* Thread */}
          <div className="col-lg-9">
            <div className="bg-neutral-0 rounded-4 border-100 d-flex flex-column" style={{ height: "70vh" }}>
              <div ref={threadRef} className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3">
                {messages.length === 0 && !sending && (
                  <div className="m-auto text-center neutral-500" style={{ maxWidth: 420 }}>
                    <h6 className="fw-600 neutral-700 mb-2">Ask your assistant anything</h6>
                    <p className="fz-font-md mb-0">
                      Try “Draft a launch announcement”, “What should I focus on this week?”, or “Write a reply to an
                      unhappy customer”.
                    </p>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`d-flex ${m.role === "user" ? "justify-content-end" : "justify-content-start"}`}>
                    <div
                      className={`px-3 py-2 rounded-4 fz-font-md ${
                        m.role === "user" ? "bg-neutral-900 text-white" : "bg-neutral-100 neutral-900"
                      }`}
                      style={{ maxWidth: "80%", whiteSpace: "pre-wrap" }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="d-flex justify-content-start">
                    <div className="px-3 py-2 rounded-4 fz-font-md bg-neutral-100 neutral-500">Thinking…</div>
                  </div>
                )}
              </div>

              {(error || orgsError) && (
                <div className="alert alert-warning py-2 px-3 fz-font-md m-3 mb-0" role="alert">
                  {error || orgsError}
                </div>
              )}

              <form onSubmit={send} className="border-top p-3 d-flex gap-2">
                <input
                  className="form-control rounded-3"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message your assistant…"
                  disabled={sending}
                />
                <button type="submit" className="btn btn-dark rounded-3 px-4" disabled={sending || !draft.trim()}>
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
