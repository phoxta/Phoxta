import { useEffect, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { toast, toastError } from "@/lib/ops/feedback";
import { gmailList, gmailGet, gmailSend, gmailImport, gmailSync, gmailBackfillHtml, type GmailMsg, type GmailFull } from "@/lib/db/ops/google";

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
  // The *committed* search term — typing doesn't refetch, submitting (or
  // switching folder) does, exactly as before.
  const [applied, setApplied] = useState("");
  const [selected, setSelected] = useState<GmailFull | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const folderQ = FOLDERS.find((x) => x.key === folder)!.q;
  const query = applied.trim() ? `${folderQ} ${applied.trim()}` : folderQ;

  // Cached per business + folder + search, so stepping back into Gmail doesn't
  // flash a full-page "Loading…" for a list we already have.
  const { data: list = [], loading, error, reload } = useCachedData<GmailMsg[]>(
    `google:gmail:${orgId}:${query}`,
    async () => {
      const { data, error } = await gmailList(orgId, query);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  // A different list is showing — the open message no longer belongs to it.
  useEffect(() => { setSelected(null); }, [query]);

  function runSearch(next = search) {
    const term = next.trim();
    if (term === applied.trim()) reload();
    else setApplied(term);
  }

  async function open(m: GmailMsg) {
    setReply("");
    const { data, error } = await gmailGet(orgId, m.id);
    if (error) toastError(error);
    setSelected(data);
  }
  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    const { ok, error } = await gmailSend(orgId, { to: emailOf(selected.from), subject: /^re:/i.test(selected.subject) ? selected.subject : `Re: ${selected.subject}`, text: reply.trim(), threadId: selected.threadId });
    setBusy(false);
    if (!ok || error) { toastError(error ?? "Could not send."); return; }
    toast("Sent.");
    setReply("");
  }
  async function sendCompose() {
    if (!compose.to.trim() || !compose.body.trim()) return;
    setBusy(true);
    const { ok, error } = await gmailSend(orgId, { to: compose.to.trim(), subject: compose.subject.trim(), text: compose.body.trim() });
    setBusy(false);
    if (!ok || error) { toastError(error ?? "Could not send."); return; }
    setComposing(false);
    setCompose({ to: "", subject: "", body: "" });
    toast("Email sent.");
    if (folder === "sent") reload();
  }

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-danger py-2 px-3 fz-font-md mb-0" role="alert">{error}</div></div>}

      <div className="col-lg-5">
        <div className="d-flex gap-2 mb-2">
          <button type="button" className="btn btn-dark rounded-3 flex-grow-1" onClick={() => { setComposing(true); setSelected(null); }}>✎ Compose</button>
          <button
            type="button"
            className="btn btn-outline-dark rounded-3 px-3 text-nowrap"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              const { imported, error } = await gmailSync(orgId);
              setSyncing(false);
              if (error) toastError(error);
              else toast(`Synced ${imported} new message(s) to the unified Inbox.`);
            }}
          >
            {syncing ? "…" : "↻ Sync to Inbox"}
          </button>
          {/* Mail imported before the sync kept HTML shows only the sender's
              flattened text version. The markup is still in Gmail, so it can be
              fetched again for messages already in the Inbox. */}
          <button
            type="button"
            className="btn btn-outline-dark rounded-3 px-3 text-nowrap"
            disabled={backfilling}
            title="Re-fetch the formatting for mail imported before it was kept"
            onClick={async () => {
              setBackfilling(true);
              const { filled, error } = await gmailBackfillHtml(orgId, 150);
              setBackfilling(false);
              if (error) toastError(error);
              else if (filled === 0) toast("Every synced message already has its formatting.", "info");
              else toast(`Restored formatting on ${filled} message(s). Reopen the Inbox to see them.`);
            }}
          >
            {backfilling ? "…" : "Restore formatting"}
          </button>
        </div>
        <div className="d-flex gap-1 mb-2">
          {FOLDERS.map((f) => (
            <button key={f.key} type="button" onClick={() => { setFolder(f.key); setApplied(search.trim()); }} className={`btn btn-sm rounded-pill px-3 ${folder === f.key ? "btn-dark" : "btn-outline-secondary"}`}>{f.label}</button>
          ))}
        </div>
        <form className="d-flex gap-2 mb-2" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
          <input className="form-control form-control-sm rounded-3" type="search" aria-label="Search mail" placeholder="Search mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-outline-secondary btn-sm rounded-3 px-3" type="submit">Search</button>
        </form>
        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500" role="status">Loading…</div>
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
            <input className="form-control rounded-3 mb-2" aria-label="To" placeholder="To" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
            <input className="form-control rounded-3 mb-2" aria-label="Subject" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            <textarea className="form-control rounded-3 mb-2" rows={8} aria-label="Message" placeholder="Write your message…" value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
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
              <button
                type="button"
                className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap"
                onClick={async () => {
                  const { ok, error } = await gmailImport(orgId, selected.id);
                  if (!ok || error) toastError(error ?? "Couldn't add.");
                  else toast("Added to the unified Inbox.");
                }}
              >
                ↪ To Inbox
              </button>
            </div>
            <div className="fz-font-sm neutral-500 mb-3">{selected.from}{selected.date ? ` · ${new Date(selected.date).toLocaleString()}` : ""}</div>
            <div className="fz-font-md neutral-800 mb-3" style={{ whiteSpace: "pre-wrap", maxHeight: 340, overflow: "auto" }}>{selected.body}</div>
            <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="border-top border-100 pt-3">
              <textarea className="form-control rounded-3 mb-2" rows={4} aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${nameOf(selected.from)}…`} />
              <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
