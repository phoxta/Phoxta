import { useMemo, useState } from "react";
import { createCanned, updateCanned, deleteCanned, type CannedResponse } from "@/lib/db/ops/agent";
import { confirmDanger, reportMutation, toastError } from "@/lib/ops/feedback";
import { useDialog } from "@/lib/ops/useDialog";

/**
 * "Saved replies" drawer — the saved replies + WhatsApp templates CRUD that
 * used to live on the standalone Snippets page, now reachable from the Inbox
 * composer. Supports {{name}} / {{business}} variables (substituted on insert)
 * and numbered {{1}},{{2}}… variables for approved WhatsApp templates.
 */

const CHANNELS = ["any", "sms", "whatsapp", "email", "web"];
/** Brand casing — `text-capitalize` would render these as "Sms" / "Whatsapp". */
const CHANNEL_LABEL: Record<string, string> = { sms: "SMS", whatsapp: "WhatsApp", email: "Email", web: "Web" };
type FormState = {
  title: string;
  shortcut: string;
  body: string;
  channel: string;
  is_whatsapp_template: boolean;
  whatsapp_template_sid: string;
};
const BLANK: FormState = { title: "", shortcut: "", body: "", channel: "any", is_whatsapp_template: false, whatsapp_template_sid: "" };

export default function RepliesDrawer({
  orgId,
  items,
  onClose,
  onChanged,
  onInsert,
}: {
  orgId: string;
  items: CannedResponse[];
  onClose: () => void;
  /** Re-fetch the canned list after any create/edit/delete. */
  onChanged: () => void;
  /** When set, each snippet gets an Insert button that drops it into the composer. */
  onInsert?: (c: CannedResponse) => void;
}) {
  const [form, setForm] = useState<FormState>({ ...BLANK });
  /** What the form looked like when it was last seeded — the dirty baseline. */
  const [seed, setSeed] = useState<FormState>({ ...BLANK });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(seed), [form, seed]);
  /** Closing loses whatever is half-typed in the form — ask first. */
  function requestClose() {
    if (dirty && !confirmDanger("Discard your changes to this reply?")) return;
    onClose();
  }

  // Shared dialog contract: focus moves in, Tab is trapped, Escape closes, focus
  // is restored on exit (the page-level shortcut layer stands down while it's open).
  const dialogRef = useDialog<HTMLDivElement>(requestClose);

  function startEdit(c: CannedResponse) {
    setEditingId(c.id);
    const next: FormState = {
      title: c.title ?? "",
      shortcut: c.shortcut ?? "",
      body: c.body ?? "",
      channel: c.channel ?? "any",
      is_whatsapp_template: !!c.is_whatsapp_template,
      whatsapp_template_sid: c.whatsapp_template_sid ?? "",
    };
    setForm(next);
    setSeed(next);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.body.trim()) {
      toastError("The reply needs a message body.");
      return;
    }
    setBusy(true);
    const payload = { ...form, body: form.body.trim() };
    const ok = editingId
      ? await reportMutation(updateCanned(editingId, payload), "Reply updated")
      : await reportMutation(createCanned(orgId, payload), "Reply saved");
    setBusy(false);
    if (ok) {
      setForm({ ...BLANK });
      setSeed({ ...BLANK });
      setEditingId(null);
      onChanged();
    }
  }

  async function remove(c: CannedResponse) {
    if (!confirmDanger(`Delete "${c.title || c.shortcut || "this reply"}"? This can't be undone.`)) return;
    if (await reportMutation(deleteCanned(c.id), "Reply deleted")) {
      if (editingId === c.id) {
        setEditingId(null);
        setForm({ ...BLANK });
        setSeed({ ...BLANK });
      }
      onChanged();
    }
  }

  const snippets = items.filter((i) => !i.is_whatsapp_template);
  const templates = items.filter((i) => i.is_whatsapp_template);

  const renderItem = (c: CannedResponse, isTemplate: boolean) => (
    <div key={c.id} className="bg-neutral-0 rounded-3 p-3 border-100">
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div className="fw-600 fz-font-md">
          {c.title || c.shortcut || (isTemplate ? "Template" : "Saved reply")}
          {isTemplate ? (
            <span className="badge bg-success-subtle text-success-emphasis fw-500 ms-1">WhatsApp</span>
          ) : (
            <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize ms-1">{c.channel}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {onInsert && !isTemplate && (
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-2 py-1 fz-font-sm ops-tap" onClick={() => onInsert(c)}>Insert</button>
          )}
          <button type="button" className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" onClick={() => startEdit(c)}>Edit</button>
          <button type="button" className="btn btn-link btn-sm p-0 px-2 text-danger text-decoration-none ops-tap" onClick={() => remove(c)}>Delete</button>
        </div>
      </div>
      <div className="fz-font-sm neutral-500 mt-1" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{c.body}</div>
      {isTemplate && (
        <div className={`fz-font-sm mt-1 ${c.whatsapp_template_sid ? "neutral-400" : "text-danger"}`} style={{ overflowWrap: "anywhere" }}>
          {c.whatsapp_template_sid
            ? `Approval code: ${c.whatsapp_template_sid}`
            : "No approval code yet — this can't be sent outside the 24-hour window until you add one."}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1055 }} onMouseDown={requestClose}>
      <div
        ref={dialogRef}
        className="bg-neutral-0 border-100 p-3 p-lg-4 d-flex flex-column"
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(540px, 100%)", maxWidth: "100%", overflowY: "auto", boxShadow: "-8px 0 24px rgba(0,0,0,.12)" }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Saved replies"
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="fw-600 fz-font-lg mb-0">Saved replies</h2>
          <button type="button" className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" aria-label="Close saved replies" onClick={requestClose}>✕</button>
        </div>

        <form onSubmit={save} className="bg-neutral-50 rounded-3 p-3 border-100 mb-3">
          <h3 className="fz-font-sm fw-600 neutral-500 mb-2">{editingId ? "Edit reply" : "New saved reply / WhatsApp template"}</h3>
          <div className="row g-2">
            <div className="col-7">
              <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="rd-title">Title</label>
              <input id="rd-title" className="form-control form-control-sm rounded-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-5">
              <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="rd-shortcut">Shortcut</label>
              <input id="rd-shortcut" className="form-control form-control-sm rounded-3" placeholder="/thanks" value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} />
            </div>
            <div className="col-12">
              <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="rd-body">Message</label>
              <textarea id="rd-body" className="form-control form-control-sm rounded-3" rows={4} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <div className="fz-font-sm neutral-400 mt-1">
                Variables: <code>{"{{name}}"}</code> → customer's name, <code>{"{{business}}"}</code> → your business name (filled in when inserted). WhatsApp templates also use numbered <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>…
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="rd-channel">Channel</label>
              <select id="rd-channel" className="form-select form-select-sm rounded-3" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c === "any" ? "Any channel" : CHANNEL_LABEL[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 d-flex align-items-end">
              <div className="form-check mb-1">
                <input className="form-check-input" type="checkbox" id="rd-watpl" checked={form.is_whatsapp_template} onChange={(e) => setForm({ ...form, is_whatsapp_template: e.target.checked, channel: e.target.checked ? "whatsapp" : form.channel })} />
                <label className="form-check-label fz-font-md" htmlFor="rd-watpl">WhatsApp template</label>
              </div>
            </div>
            {form.is_whatsapp_template && (
              <div className="col-12">
                <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="rd-sid">WhatsApp approval code <span className="neutral-400 fw-400">(SID)</span></label>
                <input id="rd-sid" className="form-control form-control-sm rounded-3" placeholder="HX…" value={form.whatsapp_template_sid} onChange={(e) => setForm({ ...form, whatsapp_template_sid: e.target.value })} />
                <div className="fz-font-sm neutral-400 mt-1">WhatsApp only allows pre-approved messages after 24 hours of silence. Get this message approved in your WhatsApp Business account, then paste the code it gives you here.</div>
              </div>
            )}
            <div className="col-12 d-flex align-items-center gap-2">
              <button type="submit" className="btn btn-dark btn-sm rounded-3 px-4" disabled={busy}>{busy ? "…" : editingId ? "Save changes" : "Save"}</button>
              {editingId && (
                <button type="button" className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" onClick={() => { setEditingId(null); setForm({ ...BLANK }); setSeed({ ...BLANK }); }}>Cancel edit</button>
              )}
            </div>
          </div>
        </form>

        <h3 className="fz-font-sm fw-600 neutral-500 mb-2">Saved replies</h3>
        {snippets.length === 0 ? (
          <div className="fz-font-sm neutral-400 mb-3">No saved replies yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2 mb-3">{snippets.map((c) => renderItem(c, false))}</div>
        )}

        <h3 className="fz-font-sm fw-600 neutral-500 mb-2">WhatsApp templates</h3>
        {templates.length === 0 ? (
          <div className="fz-font-sm neutral-400">No templates yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">{templates.map((c) => renderItem(c, true))}</div>
        )}
      </div>
    </div>
  );
}
