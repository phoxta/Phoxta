import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link2, List, Paperclip, Underline, X } from "lucide-react";
import { composeEmail } from "@/lib/db/ops/agent";
import { confirmDanger, toast } from "@/lib/ops/feedback";
import { useDialog } from "@/lib/ops/useDialog";
import { Tag } from "@/pages/dashboard/ops/ui/primitives";
import "@/pages/dashboard/ops/ui/console.css";
import "./inbox/inbox.css";

type Attachment = { filename: string; content: string; size: number };
const MAX_TOTAL = 5 * 1024 * 1024; // 5 MB total (base64 inflates ~33%)

/** A mistyped address fails silently at the provider — catch it before we send. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Split a comma/semicolon list, drop empties and unwrap `Name <addr>`. */
const splitAddresses = (s: string): string[] =>
  s
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/<([^>]+)>\s*$/);
      return (m ? m[1] : p).trim();
    });

const TOOLBAR: { cmd: string; label: string; icon: React.ReactNode }[] = [
  { cmd: "bold", label: "Bold", icon: <Bold width={14} height={14} /> },
  { cmd: "italic", label: "Italic", icon: <Italic width={14} height={14} /> },
  { cmd: "underline", label: "Underline", icon: <Underline width={14} height={14} /> },
  { cmd: "insertUnorderedList", label: "Bulleted list", icon: <List width={14} height={14} /> },
];

const kb = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default function EmailComposer({
  orgId, initialTo = "", initialSubject = "", initialBody = "", conversationId, onClose, onSent,
}: {
  orgId: string;
  initialTo?: string;
  initialSubject?: string;
  /** Plain-text seed for the body — lets the inline composer hand its draft over. */
  initialBody?: string;
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
  const fileRef = useRef<HTMLInputElement>(null);
  /** What the body looked like before the owner touched it — the dirty baseline. */
  const initialHtmlRef = useRef("");

  // Seed the body once, so "Attach / format" can carry the inline draft across.
  useEffect(() => {
    if (!initialBody || !bodyRef.current) return;
    bodyRef.current.innerText = initialBody;
    initialHtmlRef.current = (bodyRef.current.innerHTML ?? "").replace(/<br\s*\/?>/gi, "").trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Validate every address before the round trip — a typo here just bounces.
    const addresses = [...splitAddresses(to), ...(showCcBcc ? [...splitAddresses(cc), ...splitAddresses(bcc)] : [])];
    const bad = addresses.find((a) => !EMAIL_RE.test(a));
    if (bad) { setError(`"${bad}" doesn't look like an email address.`); return; }
    setSending(true);
    setError(null);
    const { ok, conversationId: cid, error } = await composeEmail(orgId, {
      to, cc: showCcBcc ? cc : "", bcc: showCcBcc ? bcc : "", subject,
      html, attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })), conversationId,
    });
    setSending(false);
    if (!ok || error) { setError(error ?? "Could not send."); return; }
    toast("Email sent");
    onSent(cid);
    onClose();
  }

  /** Closing loses the draft — confirm when there's anything in it. */
  function requestClose() {
    const html = (bodyRef.current?.innerHTML ?? "").replace(/<br\s*\/?>/gi, "").trim();
    const dirty =
      html !== initialHtmlRef.current ||
      subject.trim() !== initialSubject.trim() ||
      attachments.length > 0 || !!cc.trim() || !!bcc.trim() || to.trim() !== initialTo.trim();
    if (dirty && !confirmDanger("Discard this email draft?")) return;
    onClose();
  }

  // Shared dialog contract (focus trap, Escape, focus restore). Escape routes
  // through requestClose so a half-written email still asks before it's lost.
  const dialogRef = useDialog<HTMLDivElement>(requestClose);
  const used = attachments.reduce((s, a) => s + a.size, 0);

  return (
    <div className="oc-sheet__scrim" role="presentation" onMouseDown={requestClose}>
      {/* The body is a contentEditable, so the focus ring has to live on its frame. */}
      <style>{".ec-frame:focus-within{border-color:var(--oc-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--oc-accent) 14%,transparent);}"}</style>
      <div
        ref={dialogRef}
        className="oc-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ec-title-h"
      >
        <div className="oc-sheet__head">
          <h2 id="ec-title-h">{conversationId ? "Reply by email" : "New email"}</h2>
          <button type="button" className="oc-ico" aria-label="Close composer" onClick={requestClose}>
            <X width={16} height={16} />
          </button>
        </div>

        <div className="oc-sheet__body">
          {error && (
            <div className="oc-panel oc-panel--danger mb-3" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex align-items-center justify-content-between gap-2">
            <label className="oc-label" htmlFor="ec-to">
              To — separate addresses with commas
            </label>
            <button
              type="button"
              className="oc-btn oc-btn--sm mb-1"
              aria-expanded={showCcBcc}
              onClick={() => setShowCcBcc((v) => !v)}
            >
              Cc/Bcc
            </button>
          </div>
          <input id="ec-to" className="oc-field mb-3" inputMode="email" autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} />

          {showCcBcc && (
            <>
              <label className="oc-label" htmlFor="ec-cc">Cc</label>
              <input id="ec-cc" className="oc-field mb-3" value={cc} onChange={(e) => setCc(e.target.value)} />
              <label className="oc-label" htmlFor="ec-bcc">Bcc</label>
              <input id="ec-bcc" className="oc-field mb-3" value={bcc} onChange={(e) => setBcc(e.target.value)} />
            </>
          )}

          <label className="oc-label" htmlFor="ec-subject">Subject</label>
          <input id="ec-subject" className="oc-field mb-3" value={subject} onChange={(e) => setSubject(e.target.value)} />

          <div className="oc-label" id="ec-body-label">Message</div>
          <div
            className="ec-frame"
            style={{ border: "1px solid var(--at-neutral-200)", borderRadius: 12, overflow: "hidden", transition: "border-color .15s ease, box-shadow .15s ease" }}
          >
            <div
              className="d-flex flex-nowrap gap-1 p-2"
              role="group"
              aria-label="Formatting"
              style={{ borderBottom: "1px solid var(--at-neutral-100)", background: "var(--at-neutral-50)" }}
            >
              {TOOLBAR.map((t) => (
                <button
                  key={t.cmd}
                  type="button"
                  className="oc-ico"
                  style={{ width: 30, height: 30 }}
                  aria-label={t.label}
                  title={t.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec(t.cmd);
                  }}
                >
                  {t.icon}
                </button>
              ))}
              <button
                type="button"
                className="oc-ico"
                style={{ width: 30, height: 30 }}
                aria-label="Insert link"
                title="Insert link"
                onMouseDown={(e) => {
                  e.preventDefault();
                  link();
                }}
              >
                <Link2 width={14} height={14} />
              </button>
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-labelledby="ec-body-label"
              aria-multiline="true"
              className="p-3"
              style={{ minHeight: 220, maxHeight: "46vh", overflowY: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13.5, lineHeight: 1.6, outline: 0 }}
            />
          </div>

          {attachments.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-3">
              {attachments.map((a, i) => (
                <span key={i} className="oc-tag" style={{ maxWidth: "100%", overflowWrap: "anywhere" }}>
                  <Paperclip width={10} height={10} />
                  {a.filename}
                  <span style={{ opacity: 0.6 }}>· {kb(a.size)}</span>
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 ms-1 lh-1"
                    style={{ color: "inherit", cursor: "pointer" }}
                    aria-label={`Remove attachment ${a.filename}`}
                    onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                  >
                    <X width={10} height={10} />
                  </button>
                </span>
              ))}
              <Tag tone={used > MAX_TOTAL * 0.8 ? "warn" : "plain"}>{kb(used)} of 5 MB</Tag>
            </div>
          )}
        </div>

        <div className="oc-sheet__foot align-items-center">
          {/* A real button, not a <label> wrapping a display:none input — the
              wrapper isn't focusable, which made attaching mouse-only. */}
          <button type="button" className="oc-btn" onClick={() => fileRef.current?.click()}>
            <Paperclip /> Attach a file
          </button>
          <input ref={fileRef} type="file" multiple hidden tabIndex={-1} aria-hidden="true" onChange={onFiles} />
          <button type="button" className="oc-btn ms-auto" onClick={requestClose}>
            Cancel
          </button>
          <button type="button" className="oc-btn oc-btn--accent" onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}
