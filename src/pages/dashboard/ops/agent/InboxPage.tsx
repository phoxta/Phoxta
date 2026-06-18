import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listConversations,
  listConversationMessages,
  sendConversationReply,
  sendConversationTemplate,
  addInternalNote,
  suggestReply,
  placeCall,
  setConversationStatus,
  setConversationTags,
  assignConversation,
  snoozeConversation,
  setCsat,
  touchPresence,
  listViewers,
  listCanned,
  listMembers,
  currentUserId,
  type Conversation,
  type ConversationMessage,
  type ConvStatus,
  type CannedResponse,
  type OrgMember,
} from "@/lib/db/ops/agent";
import type { OpsContext } from "@/layouts/OperatingLayout";

const STATUS_STYLE: Record<ConvStatus, string> = {
  open: "bg-warning-subtle text-warning",
  handled: "bg-success-subtle text-success",
  escalated: "bg-warning-subtle text-warning",
  snoozed: "bg-neutral-100 neutral-500",
  closed: "bg-neutral-100 neutral-500",
};
const CHANNEL_STYLE: Record<string, string> = {
  sms: "bg-info-subtle text-info-emphasis",
  whatsapp: "bg-success-subtle text-success",
  web: "bg-neutral-100 neutral-700",
  voice: "bg-primary-subtle text-primary-emphasis",
  email: "bg-warning-subtle text-warning",
};
const WA_WINDOW_MS = 24 * 60 * 60 * 1000;
const STATUS_FILTERS: { v: string; label: string }[] = [
  { v: "", label: "All" }, { v: "open", label: "Open" }, { v: "escalated", label: "Escalated" },
  { v: "handled", label: "Handled" }, { v: "snoozed", label: "Snoozed" }, { v: "closed", label: "Closed" },
];
const CHANNEL_FILTERS = ["", "sms", "whatsapp", "web", "voice", "email"];
// Template helpers: pull {{1}},{{2}}… placeholders and render with filled values.
const tplKeys = (body: string) => Array.from(new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))).sort((a, b) => +a - +b);
const renderTpl = (body: string, vars: Record<string, string>) => body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[n] || `{{${n}}}`);

export default function InboxPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [fChannel, setFChannel] = useState("");
  const [fStatus, setFStatus] = useState("");

  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);

  const [suggestion, setSuggestion] = useState<{ summary: string; suggestion: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [tpl, setTpl] = useState<CannedResponse | null>(null);
  const [tplVars, setTplVars] = useState<Record<string, string>>({});
  const [calling, setCalling] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const memberName = (id: string | null) => (id ? members.find((m) => m.user_id === id)?.full_name || "Teammate" : "");

  const load = useCallback(async () => {
    const { data, error } = await listConversations(orgId, { search, channel: fChannel, status: fStatus });
    if (error) setError(error);
    setConvos(data);
    setLoading(false);
    setSelected((sel) => (sel ? data.find((c) => c.id === sel.id) ?? sel : null));
  }, [orgId, search, fChannel, fStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      setMe(await currentUserId());
      setCanned((await listCanned(orgId)).data);
      setMembers((await listMembers(orgId)).data);
    })();
  }, [orgId]);

  // Presence heartbeat + collision polling while a conversation is open.
  useEffect(() => {
    if (!selected || !me) return;
    let active = true;
    const beat = async () => {
      await touchPresence(orgId, selected.id, me);
      const { data } = await listViewers(selected.id, me);
      if (active) setViewers(data.map((v) => v.user_id));
    };
    beat();
    const t = setInterval(beat, 15_000);
    return () => { active = false; clearInterval(t); };
  }, [selected, me, orgId]);

  async function open(c: Conversation) {
    setSelected(c);
    setSuggestion(null);
    setSendNote(null);
    setMode("reply");
    setDraft("");
    setTpl(null);
    setTplVars({});
    const { data } = await listConversationMessages(c.id);
    setMessages(data);
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 50);
  }

  async function refreshThread() {
    if (!selected) return;
    const { data } = await listConversationMessages(selected.id);
    setMessages(data);
    load();
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);
  }

  // WhatsApp 24h window: free-form is only allowed within 24h of the last inbound.
  const lastInbound = [...messages].reverse().find((m) => m.role === "customer");
  const waWindowClosed =
    selected?.channel_type === "whatsapp" &&
    (!lastInbound || Date.now() - new Date(lastInbound.created_at).getTime() > WA_WINDOW_MS);

  async function send() {
    const text = draft.trim();
    if (!selected || !text || busy) return;
    setBusy(true);
    setSendNote(null);
    if (mode === "note") {
      const { error } = await addInternalNote(orgId, selected.id, text);
      setBusy(false);
      if (error) { setSendNote(error); return; }
      setDraft("");
      refreshThread();
      return;
    }
    const r = await sendConversationReply(orgId, selected.id, text, selected.channel_type);
    setBusy(false);
    if (r.windowClosed) { setSendNote("WhatsApp's 24-hour window is closed — send an approved template (below) instead."); return; }
    if (!r.ok || r.error) { setSendNote(r.error ?? "Could not send."); return; }
    if (r.delivery_status === "simulated") setSendNote("Recorded, but no live channel is configured — message not actually delivered.");
    setDraft("");
    refreshThread();
  }

  async function runSuggest() {
    if (!selected) return;
    setSuggesting(true);
    const r = await suggestReply(orgId, selected.id);
    setSuggesting(false);
    if (r.error) { setSendNote(r.error); return; }
    setSuggestion({ summary: r.summary, suggestion: r.suggestion });
  }

  async function sendTemplate() {
    if (!selected || !tpl || !tpl.whatsapp_template_sid || busy) return;
    setBusy(true);
    setSendNote(null);
    const rendered = renderTpl(tpl.body, tplVars);
    const r = await sendConversationTemplate(orgId, selected.id, tpl.whatsapp_template_sid, tplVars, rendered);
    setBusy(false);
    if (!r.ok || r.error) { setSendNote(r.error ?? "Could not send template."); return; }
    setTpl(null);
    setTplVars({});
    refreshThread();
  }

  async function call() {
    if (!selected?.customer_phone || calling) return;
    setCalling(true);
    setSendNote(null);
    const r = await placeCall(orgId, selected.customer_phone, selected.id);
    setCalling(false);
    setSendNote(r.ok ? `📞 Calling ${selected.customer_phone} — your AI agent will speak with them.` : (r.error ?? "Call could not be placed."));
  }

  async function setStatus(s: ConvStatus) {
    if (!selected) return;
    await setConversationStatus(selected.id, s);
    setSelected({ ...selected, status: s });
    load();
  }
  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const t = tagDraft.trim();
    if (!selected || !t || selected.tags.includes(t)) { setTagDraft(""); return; }
    const tags = [...selected.tags, t];
    await setConversationTags(selected.id, tags);
    setSelected({ ...selected, tags });
    setTagDraft("");
    load();
  }
  async function removeTag(t: string) {
    if (!selected) return;
    const tags = selected.tags.filter((x) => x !== t);
    await setConversationTags(selected.id, tags);
    setSelected({ ...selected, tags });
    load();
  }
  async function assign(userId: string | null) {
    if (!selected) return;
    await assignConversation(selected.id, userId);
    setSelected({ ...selected, assigned_to: userId });
    load();
  }
  async function snooze() {
    if (!selected) return;
    const closing = selected.status === "snoozed";
    const until = closing ? null : new Date(Date.now() + WA_WINDOW_MS).toISOString();
    await snoozeConversation(selected.id, until);
    setSelected({ ...selected, status: closing ? "open" : "snoozed", snoozed_until: until });
    load();
  }
  async function rate(score: number) {
    if (!selected) return;
    await setCsat(selected.id, score);
    setSelected({ ...selected, csat_score: score, csat_requested: true });
  }

  const templates = canned.filter((c) => c.is_whatsapp_template);
  const snippets = canned.filter((c) => !c.is_whatsapp_template && (c.channel === "any" || c.channel === selected?.channel_type));
  const frt =
    selected?.first_response_at && selected?.created_at
      ? Math.max(0, Math.round((new Date(selected.first_response_at).getTime() - new Date(selected.created_at).getTime()) / 60000))
      : null;

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      {/* ---- Conversation list ---- */}
      <div className="col-lg-4">
        <div className="d-flex gap-2 mb-2">
          <input className="form-control form-control-sm rounded-3" placeholder="Search name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="d-flex flex-wrap gap-1 mb-2">
          {STATUS_FILTERS.map((s) => (
            <button key={s.v} type="button" onClick={() => setFStatus(s.v)} className={`btn btn-sm rounded-pill px-2 py-0 fz-font-sm ${fStatus === s.v ? "btn-dark" : "btn-outline-secondary"}`}>{s.label}</button>
          ))}
        </div>
        <div className="d-flex flex-wrap gap-1 mb-3">
          {CHANNEL_FILTERS.map((ch) => (
            <button key={ch || "all"} type="button" onClick={() => setFChannel(ch)} className={`btn btn-sm rounded-pill px-2 py-0 fz-font-sm text-capitalize ${fChannel === ch ? "btn-dark" : "btn-outline-secondary"}`}>{ch || "All channels"}</button>
          ))}
        </div>
        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : convos.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No conversations match.</div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 620, overflow: "auto" }}>
            {convos.map((c) => (
              <button key={c.id} type="button" onClick={() => open(c)} className={`text-start bg-neutral-0 rounded-4 p-3 border-100 ${selected?.id === c.id ? "bg-neutral-100" : ""}`}>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="fw-600 text-truncate">{c.customer_name || c.customer_phone || "Visitor"}</span>
                  <span className={`badge fw-500 text-capitalize ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                </div>
                <div className="fz-font-sm neutral-500 d-flex align-items-center gap-1 mt-1">
                  <span className={`badge fw-500 text-capitalize ${CHANNEL_STYLE[c.channel_type] ?? "bg-neutral-100 neutral-700"}`}>{c.channel_type}</span>
                  {c.assigned_to && <span className="badge bg-neutral-100 neutral-700 fw-500">@{memberName(c.assigned_to)}</span>}
                  {c.tags?.map((t) => <span key={t} className="badge bg-neutral-100 neutral-700 fw-500">#{t}</span>)}
                </div>
                {c.summary && <div className="fz-font-sm neutral-500 text-truncate mt-1">{c.summary}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- Thread + composer ---- */}
      <div className="col-lg-5">
        {!selected ? (
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" style={{ minHeight: 200 }}>Select a conversation.</div>
        ) : (
          <div className="bg-neutral-0 rounded-4 border-100 p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div>
                <h6 className="fw-600 mb-0">
                  {selected.customer_name || selected.customer_phone || "Visitor"}
                  <span className={`badge fw-500 text-capitalize ms-2 ${CHANNEL_STYLE[selected.channel_type] ?? "bg-neutral-100 neutral-700"}`}>{selected.channel_type}</span>
                </h6>
                <div className="fz-font-sm neutral-500">{[selected.customer_phone, selected.customer_email].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="d-flex gap-2">
                {selected.customer_phone && <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={call} disabled={calling}>{calling ? "Calling…" : "📞 Call"}</button>}
                {selected.status !== "escalated" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => setStatus("escalated")}>Take over</button>}
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={snooze}>{selected.status === "snoozed" ? "Unsnooze" : "Snooze"}</button>
                {selected.status !== "closed" ? (
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setStatus("closed")}>Close</button>
                ) : (
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setStatus("open")}>Reopen</button>
                )}
              </div>
            </div>

            {viewers.length > 0 && <div className="alert alert-warning py-1 px-3 fz-font-sm mb-2">👀 {viewers.map(memberName).join(", ") || "A teammate"} is also viewing this conversation.</div>}

            <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 320, overflow: "auto" }} ref={bodyRef}>
              {messages.map((m) => {
                if (m.role === "note") {
                  return (
                    <div key={m.id} className="align-self-center text-center" style={{ maxWidth: "92%" }}>
                      <div className="bg-warning-subtle text-warning-emphasis rounded-3 px-3 py-2 fz-font-sm" style={{ whiteSpace: "pre-wrap" }}>
                        <span className="text-uppercase opacity-75 me-1" style={{ fontSize: 10 }}>Internal note</span>{m.body}
                      </div>
                    </div>
                  );
                }
                const mine = m.role !== "customer";
                return (
                  <div key={m.id} className={`d-flex ${mine ? "justify-content-end" : "justify-content-start"}`}>
                    <div className={`px-3 py-2 rounded-4 fz-font-md ${m.role === "customer" ? "bg-neutral-100 neutral-900" : m.role === "human" ? "bg-primary-subtle text-primary-emphasis" : "bg-neutral-900 text-white"}`} style={{ maxWidth: "85%", whiteSpace: "pre-wrap" }}>
                      <div className="fz-font-sm text-uppercase opacity-75 mb-1" style={{ fontSize: 10 }}>
                        {m.role === "human" ? "you" : m.role}
                        {m.role === "human" && m.delivery_status && <span className="ms-1 opacity-75">· {m.delivery_status}</span>}
                      </div>
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>

            {waWindowClosed && (
              <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">
                WhatsApp's 24-hour window is closed. Free-form replies will be rejected — send an approved template:
                {templates.length === 0 ? <span className="d-block mt-1 neutral-500">No templates yet — add one under “Snippets”.</span> : (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {templates.map((t) => <button key={t.id} type="button" className={`btn btn-sm rounded-pill px-2 py-0 ${tpl?.id === t.id ? "btn-dark" : "btn-outline-dark"}`} onClick={() => { setTpl(t); setTplVars({}); }}>{t.title || t.shortcut}</button>)}
                  </div>
                )}
              </div>
            )}

            {tpl && (
              <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
                <div className="fz-font-sm fw-600 neutral-700 mb-1">Template · {tpl.title || tpl.shortcut}</div>
                <div className="fz-font-md neutral-800 mb-2" style={{ whiteSpace: "pre-wrap" }}>{renderTpl(tpl.body, tplVars)}</div>
                {!tpl.whatsapp_template_sid && <div className="alert alert-warning py-1 px-2 fz-font-sm mb-2">No template SID on this snippet — add it under “Snippets” so it can be sent.</div>}
                {tplKeys(tpl.body).map((k) => (
                  <input key={k} className="form-control form-control-sm rounded-3 mb-2" placeholder={`Value for {{${k}}}`} value={tplVars[k] ?? ""} onChange={(e) => setTplVars((v) => ({ ...v, [k]: e.target.value }))} />
                ))}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy || !tpl.whatsapp_template_sid || tplKeys(tpl.body).some((k) => !tplVars[k]?.trim())} onClick={sendTemplate}>Send template</button>
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setTpl(null)}>Cancel</button>
                </div>
              </div>
            )}

            {suggestion && (
              <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
                {suggestion.summary && <div className="fz-font-sm neutral-500 mb-1"><strong>Summary:</strong> {suggestion.summary}</div>}
                {suggestion.suggestion && (
                  <>
                    <div className="fz-font-md neutral-800" style={{ whiteSpace: "pre-wrap" }}>{suggestion.suggestion}</div>
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 mt-2" onClick={() => { setMode("reply"); setDraft(suggestion.suggestion); }}>Use this reply</button>
                  </>
                )}
              </div>
            )}

            {sendNote && <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">{sendNote}</div>}

            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="btn-group btn-group-sm" role="group">
                <button type="button" className={`btn rounded-pill px-3 ${mode === "reply" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setMode("reply")}>Reply</button>
                <button type="button" className={`btn rounded-pill px-3 ms-1 ${mode === "note" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setMode("note")}>Internal note</button>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {snippets.length > 0 && mode === "reply" && (
                  <select className="form-select form-select-sm rounded-3" style={{ width: "auto" }} value="" onChange={(e) => { const c = snippets.find((x) => x.id === e.target.value); if (c) setDraft((d) => (d ? d + "\n" : "") + c.body); }}>
                    <option value="">Canned…</option>
                    {snippets.map((c) => <option key={c.id} value={c.id}>{c.title || c.shortcut}</option>)}
                  </select>
                )}
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runSuggest} disabled={suggesting}>{suggesting ? "…" : "✨ Suggest"}</button>
              </div>
            </div>

            <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea className="form-control rounded-3" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === "note" ? "Private note for your team (not sent)…" : `Reply over ${selected.channel_type}…`} />
              <button type="submit" className="btn btn-dark rounded-3 px-4 align-self-end" disabled={busy || !draft.trim()}>{busy ? "…" : mode === "note" ? "Save" : "Send"}</button>
            </form>
          </div>
        )}
      </div>

      {/* ---- Context / actions panel ---- */}
      <div className="col-lg-3">
        {selected && (
          <div className="d-flex flex-column gap-3">
            <div className="bg-neutral-0 rounded-4 p-3 border-100">
              <div className="fz-font-sm fw-600 neutral-500 mb-2">Customer</div>
              <div className="fw-600">{selected.customer_name || "Unknown"}</div>
              <div className="fz-font-sm neutral-500">{selected.customer_phone || "no phone"}</div>
              <div className="fz-font-sm neutral-500">{selected.customer_email || "no email"}</div>
              <div className="fz-font-sm neutral-500 mt-2 d-flex flex-wrap gap-2">
                {selected.intent && <span>Intent: <span className="neutral-800">{selected.intent}</span></span>}
                {selected.qualified && <span className="badge bg-success-subtle text-success fw-500">qualified</span>}
                {selected.lead_score != null && <span>Score: {selected.lead_score}</span>}
              </div>
              {frt != null && <div className="fz-font-sm neutral-500 mt-1">First response: {frt === 0 ? "<1 min" : `${frt} min`}</div>}
            </div>

            <div className="bg-neutral-0 rounded-4 p-3 border-100">
              <div className="fz-font-sm fw-600 neutral-500 mb-2">Assignment</div>
              <select className="form-select form-select-sm rounded-3" value={selected.assigned_to ?? ""} onChange={(e) => assign(e.target.value || null)}>
                <option value="">Unassigned</option>
                {me && <option value={me}>Me</option>}
                {members.filter((m) => m.user_id !== me).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || "Teammate"}</option>)}
              </select>
            </div>

            <div className="bg-neutral-0 rounded-4 p-3 border-100">
              <div className="fz-font-sm fw-600 neutral-500 mb-2">Tags</div>
              <div className="d-flex flex-wrap gap-1 mb-2">
                {selected.tags?.map((t) => (
                  <span key={t} className="badge bg-neutral-100 neutral-700 fw-500">#{t} <button type="button" className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none ms-1" onClick={() => removeTag(t)}>×</button></span>
                ))}
                {(!selected.tags || selected.tags.length === 0) && <span className="fz-font-sm neutral-400">None</span>}
              </div>
              <form onSubmit={addTag}><input className="form-control form-control-sm rounded-3" placeholder="Add tag + Enter" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} /></form>
            </div>

            <div className="bg-neutral-0 rounded-4 p-3 border-100">
              <div className="fz-font-sm fw-600 neutral-500 mb-2">Satisfaction (CSAT)</div>
              {selected.csat_score != null ? (
                <div className="fz-font-md">Rated <strong>{selected.csat_score}/5</strong></div>
              ) : (
                <div className="d-flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className="btn btn-outline-secondary btn-sm rounded-circle px-2 py-0" onClick={() => rate(n)}>{n}</button>)}
                </div>
              )}
              <div className="fz-font-sm neutral-400 mt-1">Log the rating the customer gave.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
