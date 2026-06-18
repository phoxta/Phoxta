import { useEffect, useState } from "react";
import { gmailList, gmailGet, gmailSend, gmailImport, type GmailMsg, type GmailFull } from "@/lib/db/ops/google";

const emailOf = (raw: string) => (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim();
const nameOf = (raw: string) => raw.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || raw;
const FOLDERS = [
  { key: "inbox", label: "Inbox", q: "in:inbox" },
  { key: "sent", label: "Sent", q: "in:sent" },
  { key: "drafts", label: "Drafts", q: "in:drafts" },
];

export default function GmailApp({ orgId }: { orgId: string }) {
  const [folder, setFolder] = useState("inbox");
  const [search, setSearch] = useState("");
  const [list, setList] = useState<GmailMsg[]>([]);
  const [selected, setSelected] = useState<GmailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });

  async function load(q: string) {
    setLoading(true);
    setSelected(null);
    const { data, error } = await gmailList(orgId, q);
    if (error) setError(error);
    setList(data);
    setLoading(false);
  }
  useEffect(() => {
    const f = FOLDERS.find((x) => x.key === folder)!;
    load(search.trim() ? `${f.q} ${search.trim()}` : f.q);
  }, [folder]); // eslint-disable-line react-hooks/exhaustive-deps

  async function open(m: GmailMsg) {
    setNotice(null);
    setReply("");
    const { data, error } = await gmailGet(orgId, m.id);
    if (error) setError(error);
    setSelected(data);
  }
  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    const { ok, error } = await gmailSend(orgId, { to: emailOf(selected.from), subject: /^re:/i.test(selected.subject) ? selected.subject : `Re: ${selected.subject}`, text: reply.trim(), threadId: selected.threadId });
    setBusy(false);
    setNotice(ok ? "Sent ✓" : (error ?? "Could not send."));
    if (ok) setReply("");
  }
  async function sendCompose() {
    if (!compose.to.trim() || !compose.body.trim()) return;
    setBusy(true);
    const { ok, error } = await gmailSend(orgId, { to: compose.to.trim(), subject: compose.subject.trim(), text: compose.body.trim() });
    setBusy(false);
    if (!ok || error) { setNotice(error ?? "Could not send."); return; }
    setComposing(false);
    setCompose({ to: "", subject: "", body: "" });
    setNotice("Email sent ✓");
    if (folder === "sent") load("in:sent");
  }

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      <div className="col-lg-5">
        <button type="button" className="btn btn-dark rounded-3 w-100 mb-3" onClick={() => { setComposing(true); setSelected(null); }}>✎ Compose</button>
        <div className="d-flex gap-1 mb-2">
          {FOLDERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFolder(f.key)} className={`btn btn-sm rounded-pill px-3 ${folder === f.key ? "btn-dark" : "btn-outline-secondary"}`}>{f.label}</button>
          ))}
        </div>
        <form className="d-flex gap-2 mb-2" onSubmit={(e) => { e.preventDefault(); const f = FOLDERS.find((x) => x.key === folder)!; load(search.trim() ? `${f.q} ${search.trim()}` : f.q); }}>
          <input className="form-control form-control-sm rounded-3" placeholder="Search mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-outline-secondary btn-sm rounded-3 px-3" type="submit">Search</button>
        </form>
        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No messages.</div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 560, overflow: "auto" }}>
            {list.map((m) => (
              <button key={m.id} type="button" onClick={() => { setComposing(false); open(m); }} className={`text-start bg-neutral-0 rounded-4 p-3 border-100 ${selected?.id === m.id ? "bg-neutral-100" : ""}`}>
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
        {composing ? (
          <div className="bg-neutral-0 rounded-4 border-100 p-4">
            <h6 className="fw-600 mb-3">New message</h6>
            {notice && <div className="fz-font-sm text-success mb-2">{notice}</div>}
            <input className="form-control rounded-3 mb-2" placeholder="To" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
            <input className="form-control rounded-3 mb-2" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            <textarea className="form-control rounded-3 mb-2" rows={8} placeholder="Write your message…" value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-dark rounded-pill px-4" onClick={sendCompose} disabled={busy}>{busy ? "Sending…" : "Send"}</button>
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setComposing(false)}>Discard</button>
            </div>
          </div>
        ) : !selected ? (
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" style={{ minHeight: 200 }}>Select a message or compose a new one.</div>
        ) : (
          <div className="bg-neutral-0 rounded-4 border-100 p-4">
            <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
              <h6 className="fw-600 mb-0">{selected.subject}</h6>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={async () => { const { ok, error } = await gmailImport(orgId, selected.id); setNotice(ok ? "Added to the unified Inbox ↪" : (error ?? "Couldn't add.")); }}>↪ To Inbox</button>
            </div>
            <div className="fz-font-sm neutral-500 mb-3">{selected.from}{selected.date ? ` · ${new Date(selected.date).toLocaleString()}` : ""}</div>
            <div className="fz-font-md neutral-800 mb-3" style={{ whiteSpace: "pre-wrap", maxHeight: 340, overflow: "auto" }}>{selected.body}</div>
            {notice && <div className={`fz-font-sm mb-2 ${notice.includes("✓") || notice.includes("↪") ? "text-success" : "text-warning"}`}>{notice}</div>}
            <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="border-top border-100 pt-3">
              <textarea className="form-control rounded-3 mb-2" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${nameOf(selected.from)}…`} />
              <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
