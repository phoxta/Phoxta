import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Chip, Empty } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type EmailSummary, deleteEmail, emailFromPost, getEmail, listEmails,
} from "@/lib/db/emailStudio";
import { EmailComposer } from "./EmailComposer";
import { EmailTemplatePicker } from "./EmailTemplatePicker";
import { PRESETS, type Draft } from "./emailPresets";

/**
 * Everything the studio can send, and the two ways to start one.
 *
 * Deliberately the same two buttons as the graphics tab — Create New and
 * Templates — because they are the same two decisions: start with nothing and
 * write it, or start from something and change it. "From a blog post" used to
 * be a third button; a post is a starting point like any other, and two
 * buttons that both mean "start one" is one button too many.
 */

export function EmailIndex({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    const { data, error } = await listEmails();
    if (error) toastError(error);
    setRows(data?.templates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const fromPost = useCallback(async (slug: string) => {
    const { data, error } = await emailFromPost(slug);
    if (error || !data) return toastError(error ?? "Could not read that post.");
    setOpen({ ...data.template } as Draft);
  }, []);

  // Arriving from the blog console's "Send as email": open the post straight
  // into the composer, and drop the parameters so a refresh does not reopen a
  // second copy over unsaved work.
  useEffect(() => {
    if (params.get("email") !== "post") return;
    const slug = params.get("slug");
    setParams(new URLSearchParams(), { replace: true });
    if (slug) void fromPost(slug);
  }, [params, setParams, fromPost]);

  if (open) {
    return (
      <EmailComposer
        orgId={orgId}
        initial={open}
        onSaved={() => void load()}
        onClose={() => { setOpen(null); void load(); }}
      />
    );
  }

  return (
    <>
      <div className="dsn-start">
        <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => setNaming(true)}>
          {I_SPARK}Create New
        </button>
        <button type="button" className="dsn-btn" onClick={() => setPicking(true)}>
          {I_PLUS}Templates
        </button>
      </div>

      <Card title="Your emails">
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty title="Nothing here yet">
            Create one, or open Templates and pull in a blog post — the post itself goes out, not a link
            to it.
          </Empty>
        ) : (
          <div className="emc__cards">
            {rows.map((r) => (
              <div key={r.id} className="emc__card">
                <button
                  type="button"
                  className="emc__cardMain"
                  onClick={async () => {
                    const { data, error } = await getEmail(r.id);
                    if (error || !data) return toastError(error ?? "Could not open it.");
                    setOpen(data.template);
                  }}
                >
                  <span className="emc__cardName">{r.name}</span>
                  <span className="emc__cardSub">{r.subject || "No subject yet"}</span>
                  <span className="emc__cardMeta">
                    <Chip tone="line">{r.kind}</Chip>
                    {r.status === "sent" && <Chip tone="line">sent</Chip>}
                    {new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </button>
                <button
                  type="button"
                  className="hrx-seeall"
                  onClick={async () => {
                    if (!confirmDanger(`Delete “${r.name}”? It goes for good — anything already sent stays sent.`)) return;
                    const { error } = await deleteEmail(r.id);
                    if (error) return toastError(error);
                    toast("Deleted.");
                    void load();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {naming && (
        <NameDialog
          onClose={() => setNaming(false)}
          onGo={(name, subject) => {
            const d = PRESETS.find((p) => p.id === "letter")!.make();
            setNaming(false);
            setOpen({ ...d, name: name || "Untitled email", subject });
          }}
        />
      )}

      {picking && (
        <EmailTemplatePicker
          onClose={() => setPicking(false)}
          onPickPreset={(d) => { setPicking(false); setOpen(d); }}
          onPickPost={(slug) => { setPicking(false); void fromPost(slug); }}
        />
      )}
      <style>{CSS}</style>
    </>
  );
}

/** Name it and say what it is about. Two fields, because an email with no
 *  subject is the one thing this studio cannot preview honestly — the inbox
 *  line is most of the design. */
function NameDialog({ onClose, onGo }: { onClose: () => void; onGo: (name: string, subject: string) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const go = () => onGo(name.trim(), subject.trim());

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Create an email"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg">
        <h3 className="dsn-picker__t">Create an email</h3>
        <p className="dsn-note">
          It starts as a letter — a few paragraphs and one button. Change any of it afterwards, or open
          Templates for a different shape.
        </p>
        <label className="emc__f">
          <span>Name it</span>
          <input ref={first} value={name} placeholder="What you will call it in this list"
                 onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") go(); }} />
        </label>
        <label className="emc__f">
          <span>Subject</span>
          <input value={subject} placeholder="What lands in the inbox"
                 onChange={(e) => setSubject(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") go(); }} />
        </label>
        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={go}>{I_SPARK}Create</button>
        </div>
      </div>
    </div>
  );
}

// Same marks as the graphics tab; copied rather than shared for the same
// reason NewDesign copies them — reaching across would close an import cycle.
const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_SPARK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
const I_PLUS = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;

const CSS = `
.emc__cards{display:flex;flex-direction:column;gap:8px}
.emc__card{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card)}
.emc__cardMain{flex:1;text-align:left;background:none;border:0;padding:0;cursor:pointer;min-width:0}
.emc__cardName{display:block;font-size:14px;font-weight:600;color:var(--hrx-ink)}
.emc__cardSub{display:block;font-size:12.5px;color:var(--hrx-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.emc__cardMeta{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11.5px;color:var(--hrx-muted)}
`;
