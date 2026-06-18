import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getGoogleConnection, gmailList, gmailGet, gmailSend, type GmailMsg, type GmailFull } from "@/lib/db/ops/google";
import type { OpsContext } from "@/layouts/OperatingLayout";

const emailOf = (raw: string) => (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim();
const nameOf = (raw: string) => raw.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || raw;

export default function GmailPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [list, setList] = useState<GmailMsg[]>([]);
  const [selected, setSelected] = useState<GmailFull | null>(null);
  const [q, setQ] = useState("in:inbox");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(query = q) {
    setLoading(true);
    const { data, error } = await gmailList(orgId, query);
    if (error) setError(error);
    setList(data);
    setLoading(false);
  }
  useEffect(() => {
    getGoogleConnection(orgId).then(({ data }) => {
      setConnected(!!data);
      if (data) load();
      else setLoading(false);
    });
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function open(m: GmailMsg) {
    setSelected(null);
    setReply("");
    setNotice(null);
    const { data, error } = await gmailGet(orgId, m.id);
    if (error) setError(error);
    setSelected(data);
  }

  async function send() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    setNotice(null);
    const { ok, error } = await gmailSend(orgId, {
      to: emailOf(selected.from),
      subject: /^re:/i.test(selected.subject) ? selected.subject : `Re: ${selected.subject}`,
      text: reply.trim(),
      threadId: selected.threadId,
    });
    setSending(false);
    if (!ok || error) { setNotice(error ?? "Could not send."); return; }
    setReply("");
    setNotice("Sent ✓");
  }

  if (connected === false) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <h6 className="fw-600 mb-2">Connect Google Workspace</h6>
        <p className="neutral-500 fz-font-md mb-0">Connect your Google account in the <strong>Configure</strong> tab to read and reply to your Workspace email here.</p>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      <div className="col-lg-5">
        <form className="d-flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input className="form-control form-control-sm rounded-3" placeholder="Search Gmail (e.g. is:unread, from:…)" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-dark btn-sm rounded-3 px-3" type="submit">Search</button>
        </form>
        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No messages.</div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 620, overflow: "auto" }}>
            {list.map((m) => (
              <button key={m.id} type="button" onClick={() => open(m)} className={`text-start bg-neutral-0 rounded-4 p-3 border-100 ${selected?.id === m.id ? "bg-neutral-100" : ""}`}>
                <div className="d-flex justify-content-between gap-2">
                  <span className={`text-truncate ${m.unread ? "fw-600" : "fw-500 neutral-700"}`}>{nameOf(m.from)}</span>
                  <span className="fz-font-sm neutral-400 text-nowrap">{m.date ? new Date(m.date).toLocaleDateString() : ""}</span>
                </div>
                <div className={`fz-font-md text-truncate ${m.unread ? "fw-600" : "neutral-700"}`}>{m.subject}</div>
                <div className="fz-font-sm neutral-500 text-truncate">{m.snippet}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="col-lg-7">
        {!selected ? (
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" style={{ minHeight: 200 }}>Select a message.</div>
        ) : (
          <div className="bg-neutral-0 rounded-4 border-100 p-4">
            <h6 className="fw-600 mb-1">{selected.subject}</h6>
            <div className="fz-font-sm neutral-500 mb-3">{selected.from}{selected.date ? ` · ${new Date(selected.date).toLocaleString()}` : ""}</div>
            <div className="fz-font-md neutral-800 mb-3" style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>{selected.body}</div>
            {notice && <div className={`fz-font-sm mb-2 ${notice.includes("✓") ? "text-success" : "text-warning"}`}>{notice}</div>}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-top border-100 pt-3">
              <div className="fz-font-sm neutral-500 mb-1">Reply to {nameOf(selected.from)}</div>
              <textarea className="form-control rounded-3 mb-2" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
              <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={sending || !reply.trim()}>{sending ? "Sending…" : "Send reply"}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
