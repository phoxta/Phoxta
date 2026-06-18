import { useRef, useState } from "react";
import { composeEmail } from "@/lib/db/ops/agent";

type Attachment = { filename: string; content: string; size: number };
const MAX_TOTAL = 5 * 1024 * 1024; // 5 MB total (base64 inflates ~33%)

const TOOLBAR: { cmd: string; label: string; arg?: never }[] = [
  { cmd: "bold", label: "B" },
  { cmd: "italic", label: "i" },
  { cmd: "underline", label: "U" },
  { cmd: "insertUnorderedList", label: "• List" },
];

export default function EmailComposer({
  orgId, initialTo = "", initialSubject = "", conversationId, onClose, onSent,
}: {
  orgId: string;
  initialTo?: string;
  initialSubject?: string;
  conversationId?: string;
  onClose: () => void;
  onSent: (conversationId: string | null) => void;
}) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    bodyRef.current?.focus();
  }
  function link() {
    const url = window.prompt("Link URL");
    if (url) document.execCommand("createLink", false, url);
    bodyRef.current?.focus();
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next: Attachment[] = [...attachments];
    for (const f of files) {
      if (next.reduce((s, a) => s + a.size, 0) + f.size > MAX_TOTAL) { setError("Attachments exceed 5 MB total."); break; }
      const content = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.readAsDataURL(f);
      });
      next.push({ filename: f.name, content, size: f.size });
    }
    setAttachments(next);
    e.target.value = "";
  }

  async function send() {
    const html = (bodyRef.current?.innerHTML ?? "").trim();
    if (!to.trim() || !html || html === "<br>") { setError("Add a recipient and a message."); return; }
    setSending(true);
    setError(null);
    const { ok, conversationId: cid, error } = await composeEmail(orgId, {
      to, cc: showCcBcc ? cc : "", bcc: showCcBcc ? bcc : "", subject,
      html, attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })), conversationId,
    });
    setSending(false);
    if (!ok || error) { setError(error ?? "Could not send."); return; }
    onSent(cid);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1050 }} className="d-flex align-items-center justify-content-center p-3" onMouseDown={onClose}>
      <div className="bg-neutral-0 rounded-4 border-100 p-4 w-100" style={{ maxWidth: 640, maxHeight: "90vh", overflow: "auto" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-600 mb-0">{conversationId ? "Reply by email" : "New email"}</h6>
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">{error}</div>}

        <div className="d-flex align-items-center gap-2 mb-2">
          <input className="form-control rounded-3" placeholder="To (comma-separated)" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none text-nowrap" onClick={() => setShowCcBcc((v) => !v)}>Cc/Bcc</button>
        </div>
        {showCcBcc && (
          <>
            <input className="form-control rounded-3 mb-2" placeholder="Cc" value={cc} onChange={(e) => setCc(e.target.value)} />
            <input className="form-control rounded-3 mb-2" placeholder="Bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} />
          </>
        )}
        <input className="form-control rounded-3 mb-2" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />

        <div className="border-100 rounded-3 mb-2">
          <div className="d-flex gap-1 p-2 border-bottom border-100">
            {TOOLBAR.map((t) => (
              <button key={t.cmd} type="button" className="btn btn-sm btn-outline-secondary rounded-2 px-2 py-0" style={{ minWidth: 32 }} onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }}>{t.label}</button>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary rounded-2 px-2 py-0" onMouseDown={(e) => { e.preventDefault(); link(); }}>Link</button>
          </div>
          <div ref={bodyRef} contentEditable suppressContentEditableWarning className="p-3 fz-font-md" style={{ minHeight: 160, outline: "none", whiteSpace: "pre-wrap" }} />
        </div>

        <div className="d-flex flex-wrap gap-1 mb-2">
          {attachments.map((a, i) => (
            <span key={i} className="badge bg-neutral-100 neutral-700 fw-500">📎 {a.filename} <button type="button" className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none ms-1" onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}>×</button></span>
          ))}
        </div>

        <div className="d-flex align-items-center justify-content-between gap-2">
          <label className="btn btn-outline-secondary btn-sm rounded-pill px-3 mb-0">
            Attach
            <input type="file" multiple className="d-none" onChange={onFiles} />
          </label>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none px-2" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-dark rounded-pill px-4" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
