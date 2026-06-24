import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listTickets,
  createTicket,
  getTicketMessages,
  addTicketMessage,
  setTicketStatus,
  draftAiReply,
  type Ticket,
  type TicketMessage,
} from "@/lib/db/ops/helpdesk";
import { drainEmbeddings, invokeAction } from "@/lib/db/ops/ai";
import type { OpsContext } from "@/layouts/OperatingLayout";

type Classification = { category: string; sentiment: string; priority: string; summary: string };
const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-success-subtle text-success",
  neutral: "bg-neutral-100 neutral-700",
  negative: "bg-warning-subtle text-warning",
};

const STATUS_STYLE: Record<Ticket["status"], string> = {
  open: "bg-warning-subtle text-warning",
  pending: "bg-neutral-100 neutral-700",
  resolved: "bg-success-subtle text-success",
  closed: "bg-neutral-100 neutral-500",
};

export default function HelpdeskPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data: tickets = [], loading, error: loadError, reload: loadTickets, setData: setTickets } = useCachedData(
    `ops:helpdesk:${orgId}`,
    async () => {
      const { data, error } = await listTickets(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [classifying, setClassifying] = useState(false);

  const [tForm, setTForm] = useState({ subject: "", customer: "", message: "" });

  async function open(t: Ticket) {
    setSelected(t);
    setDraft("");
    setConfidence(null);
    const { data } = await getTicketMessages(t.id);
    setMessages(data);
  }

  async function classify() {
    if (!selected) return;
    setClassifying(true);
    setError(null);
    const { data, error } = await invokeAction<Classification>(orgId, "classify_ticket", { ticketId: selected.id });
    setClassifying(false);
    if (error) {
      setError(error);
      return;
    }
    if (data) {
      const updated = { ...selected, category: data.category, sentiment: data.sentiment, priority: (["low", "normal", "high"].includes(data.priority) ? data.priority : "normal") as Ticket["priority"], ai_summary: data.summary };
      setSelected(updated);
      setTickets((list) => (list ?? []).map((x) => (x.id === updated.id ? updated : x)));
    }
  }

  async function addTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!tForm.subject.trim() || !tForm.customer.trim()) return;
    const { error } = await createTicket(orgId, { subject: tForm.subject, customer_name: tForm.customer, message: tForm.message });
    if (error) setError(error);
    else {
      setTForm({ subject: "", customer: "", message: "" });
      drainEmbeddings(); // index the ticket for RAG deflection
      loadTickets();
    }
  }

  async function aiDraft() {
    if (!selected) return;
    setAiLoading(true);
    setError(null);
    const { reply, confidence, error } = await draftAiReply(orgId, selected.id);
    setAiLoading(false);
    if (error) setError(error);
    else if (reply) {
      setDraft(reply);
      setConfidence(confidence);
    }
  }

  async function send(author: "agent" | "ai") {
    if (!selected || !draft.trim()) return;
    await addTicketMessage(orgId, selected.id, author, draft);
    if (author === "ai") {
      await setTicketStatus(selected.id, "resolved", true);
    }
    setDraft("");
    const { data } = await getTicketMessages(selected.id);
    setMessages(data);
    loadTickets();
  }

  async function status(s: Ticket["status"]) {
    if (!selected) return;
    await setTicketStatus(selected.id, s);
    setSelected({ ...selected, status: s });
    loadTickets();
  }

  return (
    <div className="row g-4">
      {(error || loadError) && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error || loadError}</div></div>}

      {/* Ticket list */}
      <div className="col-lg-5">
        <h5 className="fw-600 mb-3">Tickets</h5>
        <form onSubmit={addTicket} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Subject" value={tForm.subject} onChange={(e) => setTForm({ ...tForm, subject: e.target.value })} required /></div>
            <div className="col-12"><input className="form-control rounded-3" placeholder="Customer name" value={tForm.customer} onChange={(e) => setTForm({ ...tForm, customer: e.target.value })} required /></div>
            <div className="col-12"><textarea className="form-control rounded-3" rows={2} placeholder="What did the customer ask?" value={tForm.message} onChange={(e) => setTForm({ ...tForm, message: e.target.value })} /></div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Add ticket</button></div>
          </div>
        </form>
        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No tickets yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => open(t)}
                className={`text-start bg-neutral-0 rounded-4 p-3 border-0 ${selected?.id === t.id ? "border-100 bg-neutral-100" : "border-100"}`}
              >
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="fw-600">{t.subject}</span>
                  <span className={`badge fw-500 text-capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                </div>
                <div className="fz-font-sm neutral-500">
                  {t.customer_name}
                  {t.ai_deflected ? " · AI-deflected" : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread + AI */}
      <div className="col-lg-7">
        {!selected ? (
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" style={{ minHeight: 200 }}>
            Select a ticket to view the conversation.
          </div>
        ) : (
          <div className="bg-neutral-0 rounded-4 border-100 p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <h6 className="fw-600 mb-0">{selected.subject}</h6>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={classify} disabled={classifying}>{classifying ? "…" : "✨ Classify"}</button>
                {selected.status !== "resolved" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => status("resolved")}>Resolve</button>}
                {selected.status !== "closed" && <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => status("closed")}>Close</button>}
              </div>
            </div>

            {(selected.category || selected.sentiment || selected.ai_summary) && (
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2 mb-1">
                  {selected.category && <span className="badge bg-neutral-100 neutral-700 fw-500">{selected.category}</span>}
                  {selected.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[selected.sentiment] ?? SENTIMENT_STYLE.neutral}`}>{selected.sentiment}</span>}
                  <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize">{selected.priority} priority</span>
                </div>
                {selected.ai_summary && <div className="fz-font-sm neutral-500">{selected.ai_summary}</div>}
              </div>
            )}

            <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 320, overflow: "auto" }}>
              {messages.length === 0 && <div className="neutral-500 fz-font-md">No messages yet.</div>}
              {messages.map((m) => (
                <div key={m.id} className={`px-3 py-2 rounded-4 fz-font-md ${m.author === "customer" ? "bg-neutral-100 neutral-900 align-self-start" : m.author === "ai" ? "bg-primary-subtle text-primary-emphasis align-self-end" : "bg-neutral-900 text-white align-self-end"}`} style={{ maxWidth: "85%", whiteSpace: "pre-wrap" }}>
                  <div className="fz-font-sm text-uppercase opacity-75 mb-1">{m.author}</div>
                  {m.body}
                </div>
              ))}
            </div>

            <div className="border-top pt-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fz-font-sm fw-600 neutral-500">
                  Reply
                  {confidence != null && (
                    <span className={`badge ms-2 fw-500 ${confidence >= 0.7 ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-700"}`}>
                      AI confidence {Math.round(confidence * 100)}%
                    </span>
                  )}
                </span>
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={aiDraft} disabled={aiLoading}>
                  {aiLoading ? "Drafting…" : "✨ Draft AI reply"}
                </button>
              </div>
              <textarea className="form-control rounded-3 mb-2" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply, or draft one with AI…" />
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-dark rounded-3 px-4" onClick={() => send("agent")} disabled={!draft.trim()}>Send reply</button>
                <button type="button" className="btn btn-outline-secondary rounded-3 px-3" onClick={() => send("ai")} disabled={!draft.trim()} title="Send as AI and mark deflected">
                  Send &amp; deflect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
