import { useEffect, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { toast, toastError } from "@/lib/ops/feedback";
import { gmailList, gmailGet, gmailSend, gmailImport, gmailBackfillHtml, type GmailMsg, type GmailFull } from "@/lib/db/ops/google";
import { runEmailSync } from "@/lib/db/ops/emailHealth";
import { Card, Empty, InitialAvatar } from "@/components/dash/Ui";

const CSS = `
.ggx-gmail .hrx-pill:disabled { opacity: 0.55; cursor: not-allowed; }
.ggx-alert { background: #fdeaea; color: #dc2626; border: 1px solid #f6c9c9; border-radius: 12px; padding: 10px 14px; font-size: 14px; }
.ggx-maillist { max-height: 560px; overflow: auto; }
.ggx-mailrow { padding: 12px 10px; border-radius: 12px; cursor: pointer; transition: background-color 0.12s ease; }
.ggx-mailrow:hover { background: var(--hrx-soft); }
.ggx-mailrow.sel { background: #e8effc; }
.ggx-mailrow .row1 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; }
.ggx-mailrow .who { font-size: 14px; font-weight: 500; color: var(--hrx-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ggx-mailrow .when { font-size: 12px; color: var(--hrx-muted); white-space: nowrap; flex-shrink: 0; }
.ggx-mailrow .subj { display: block; font-size: 14px; color: var(--hrx-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.ggx-mailrow .snip { display: block; font-size: 13px; color: var(--hrx-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.ggx-mailrow.unread .who, .ggx-mailrow.unread .subj { font-weight: 700; }
.ggx-mailrow.unread .who::after { content: ""; display: inline-block; width: 7px; height: 7px; border-radius: 999px; background: var(--hrx-blue); margin-left: 6px; vertical-align: middle; }
.ggx-msgmeta { display: flex; align-items: center; gap: 10px; margin: 4px 0 16px; }
.ggx-msgmeta .from { font-size: 13px; color: var(--hrx-muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ggx-msgbody { font-size: 14.5px; line-height: 1.6; color: var(--hrx-ink); white-space: pre-wrap; max-height: 340px; overflow: auto; background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.ggx-replybar { border-top: 1px solid var(--hrx-border-soft); padding-top: 16px; }
.ggx-loading { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 32px 24px; text-align: center; color: var(--hrx-muted); font-size: 14px; }
`;

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
    <div className="row g-4 ggx-gmail">
      <style>{CSS}</style>
      {error && <div className="col-12"><div className="ggx-alert" role="alert">{error}</div></div>}

      <div className="col-lg-5">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="hrx-pill primary flex-grow-1 justify-content-center" onClick={() => { setComposing(true); setSelected(null); }}>✎ Compose</button>
          <button
            type="button"
            className="hrx-pill"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              const { data, error } = await runEmailSync(orgId);
              setSyncing(false);
              // "Synced 0 new message(s)" used to be the answer for a revoked
              // token, a 403, a mailbox whose mail is filtered out of the sync's
              // reach AND a quiet Tuesday — because the client dropped the
              // function's own error string. Each of those now says what it is.
              if (error) { toastError(error); return; }
              if (!data) { toastError("The sync did not report a result."); return; }
              if (data.imported > 0) {
                toast(`Added ${data.imported} new message(s) to the unified Inbox${data.replied ? `, ${data.replied} answered automatically` : ""}.`);
              } else if (data.listed === 0) {
                toast(`Gmail matched nothing for "${data.query}". Open Email delivery to find out where your mail is.`, "info");
              } else {
                toast(`Checked ${data.listed} message(s) — all ${data.alreadyHad} of the matches were already in the Inbox.`, "info");
              }
            }}
          >
            {syncing ? "…" : "↻ Sync to Inbox"}
          </button>
          {/* Mail imported before the sync kept HTML shows only the sender's
              flattened text version. The markup is still in Gmail, so it can be
              fetched again for messages already in the Inbox. */}
          <button
            type="button"
            className="hrx-pill"
            disabled={backfilling}
            title="Re-fetch the formatting for mail imported before it was kept"
            onClick={async () => {
              setBackfilling(true);
              const r = await gmailBackfillHtml(orgId, 150);
              setBackfilling(false);
              // Say which of the several reasons produced a zero. "Nothing to do"
              // and "your Google token is dead" look identical otherwise, which
              // is what made the first run impossible to diagnose.
              if (r.error) {
                toastError(`${r.error} — checked ${r.checked}, restored ${r.filled}`);
              } else if (r.filled > 0) {
                toast(`Restored formatting on ${r.filled} of ${r.checked} message(s). Reopen the Inbox to see them.`);
              } else if (r.checked === 0) {
                toast("No email messages carry a Gmail id, so there is nothing to fetch back.", "info");
              } else if (r.alreadyHad === r.checked) {
                toast(`All ${r.checked} already have their formatting — the renderer is what to look at next.`, "info");
              } else {
                toast(
                  `Checked ${r.checked}: ${r.alreadyHad} already had it, ${r.noHtmlInGmail} are plain-text only, ${r.fetchFailed} could not be fetched.`,
                  "info",
                );
              }
            }}
          >
            {backfilling ? "…" : "Restore formatting"}
          </button>
        </div>
        <div className="hrx-tabbar mb-3" role="group" aria-label="Mail folders">
          {FOLDERS.map((f) => (
            <button key={f.key} type="button" onClick={() => { setFolder(f.key); setApplied(search.trim()); }} className={`hrx-tab${folder === f.key ? " active" : ""}`} aria-pressed={folder === f.key}>{f.label}</button>
          ))}
        </div>
        <form className="d-flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
          <input className="form-control form-control-sm" type="search" aria-label="Search mail" placeholder="Search mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="hrx-pill dark" type="submit" style={{ height: 38 }}>Search</button>
        </form>
        {loading ? (
          <div className="ggx-loading" role="status">Loading…</div>
        ) : list.length === 0 ? (
          <Empty title="No messages" icon={<span aria-hidden="true">✉️</span>}>Nothing in this folder matches.</Empty>
        ) : (
          <Card pad={false} className="ggx-maillist">
            <div className="px-2 py-1">
              {list.map((m) => (
                <button key={m.id} type="button" onClick={() => { setComposing(false); open(m); }} className={`hrx-listrow ggx-mailrow${selected?.id === m.id ? " sel" : ""}${m.unread ? " unread" : ""}`}>
                  <InitialAvatar name={nameOf(m.from)} />
                  <span className="main">
                    <span className="row1">
                      <span className="who">{nameOf(m.from)}</span>
                      <span className="when">{m.date ? new Date(m.date).toLocaleDateString() : ""}</span>
                    </span>
                    <span className="subj">{m.subject}</span>
                    <span className="snip">{m.snippet}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="col-lg-7">
        {composing ? (
          <Card title="New message">
            <label className="hrx-field">
              <span>To</span>
              <input className="form-control" placeholder="name@example.com" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
            </label>
            <label className="hrx-field">
              <span>Subject</span>
              <input className="form-control" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            </label>
            <label className="hrx-field">
              <span>Message</span>
              <textarea className="form-control" rows={8} placeholder="Write your message…" value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
            </label>
            <div className="d-flex align-items-center gap-2">
              <button type="button" className="hrx-pill primary" onClick={sendCompose} disabled={busy}>{busy ? "Sending…" : "Send"}</button>
              <button type="button" className="hrx-pill" onClick={() => setComposing(false)}>Discard</button>
            </div>
          </Card>
        ) : !selected ? (
          <Empty title="No message open" icon={<span aria-hidden="true">📬</span>}>Select a message from the list, or compose a new one.</Empty>
        ) : (
          <Card
            title={selected.subject}
            right={
              <button
                type="button"
                className="hrx-pill"
                onClick={async () => {
                  const { ok, error } = await gmailImport(orgId, selected.id);
                  if (!ok || error) toastError(error ?? "Couldn't add.");
                  else toast("Added to the unified Inbox.");
                }}
              >
                ↪ To Inbox
              </button>
            }
          >
            <div className="ggx-msgmeta">
              <InitialAvatar name={nameOf(selected.from)} size={32} />
              <span className="from">{selected.from}{selected.date ? ` · ${new Date(selected.date).toLocaleString()}` : ""}</span>
            </div>
            <div className="ggx-msgbody">{selected.body}</div>
            <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="ggx-replybar">
              <label className="hrx-field">
                <span>Reply</span>
                <textarea className="form-control" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${nameOf(selected.from)}…`} />
              </label>
              <button type="submit" className="hrx-pill primary" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
