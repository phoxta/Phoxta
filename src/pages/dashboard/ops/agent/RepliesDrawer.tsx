import { useEffect, useState } from "react";
import { createCanned, updateCanned, deleteCanned, type CannedResponse } from "@/lib/db/ops/agent";
import { confirmDanger, reportMutation, toastError } from "@/lib/ops/feedback";

/**
 * "Manage replies" drawer — the canned replies + WhatsApp templates CRUD that
 * used to live on the standalone Snippets page, now reachable from the Inbox
 * composer. Supports {{name}} / {{business}} variables (substituted on insert)
 * and numbered {{1}},{{2}}… variables for approved WhatsApp templates.
 */

const CHANNELS = ["any", "sms", "whatsapp", "email", "web"];
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Esc closes the drawer (the page-level shortcut layer stands down while it's open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function startEdit(c: CannedResponse) {
    setEditingId(c.id);
    setForm({
      title: c.title ?? "",
      shortcut: c.shortcut ?? "",
      body: c.body ?? "",
      channel: c.channel ?? "any",
      is_whatsapp_template: !!c.is_whatsapp_template,
      whatsapp_template_sid: c.whatsapp_template_sid ?? "",
    });
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
      ? await reportMutation(updateCanned(editingId, payload), "Reply updated.")
      : await reportMutation(createCanned(orgId, payload), "Reply saved.");
    setBusy(false);
    if (ok) {
      setForm({ ...BLANK });
      setEditingId(null);
      onChanged();
    }
  }

  async function remove(c: CannedResponse) {
    if (!confirmDanger(`Delete "${c.title || c.shortcut || "this reply"}"? This can't be undone.`)) return;
    if (await reportMutation(deleteCanned(c.id), "Reply deleted.")) {
      if (editingId === c.id) {
        setEditingId(null);
        setForm({ ...BLANK });
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
          {c.title || c.shortcut || (isTemplate ? "Template" : "Snippet")}
          {isTemplate ? (
            <span className="badge bg-success-subtle text-success fw-500 ms-1">WhatsApp</span>
          ) : (
            <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize ms-1">{c.channel}</span>
          )}
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          {onInsert && !isTemplate && (
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-2 py-0 fz-font-sm" onClick={() => onInsert(c)}>Insert</button>
          )}
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => startEdit(c)}>Edit</button>
          <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => remove(c)}>Delete</button>
        </div>
      </div>
      <div className="fz-font-sm neutral-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>
      {isTemplate && (
        <div className={`fz-font-sm mt-1 ${c.whatsapp_template_sid ? "neutral-400" : "text-danger"}`}>
          {c.whatsapp_template_sid ? `SID: ${c.whatsapp_template_sid}` : "No template SID — it can't be sent outside the 24-hour window until you add one."}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1055 }} onMouseDown={onClose}>
      <div
        className="bg-neutral-0 border-100 p-4 d-flex flex-column"
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(480px, 100%)", overflowY: "auto", boxShadow: "-8px 0 24px rgba(0,0,0,.12)" }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Manage replies"
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-600 mb-0">Manage replies</h6>
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={save} className="bg-neutral-50 rounded-3 p-3 border-100 mb-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">{editingId ? "Edit reply" : "New reply / template"}</div>
          <div className="row g-2">
            <div className="col-7">
              <input className="form-control form-control-sm rounded-3" placeholder="Title" aria-label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-5">
              <input className="form-control form-control-sm rounded-3" placeholder="/shortcut" aria-label="Shortcut" value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} />
            </div>
            <div className="col-12">
              <textarea className="form-control form-control-sm rounded-3" rows={4} placeholder="Message body" aria-label="Message body" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <div className="fz-font-sm neutral-400 mt-1">
                Variables: <code>{"{{name}}"}</code> → customer's name, <code>{"{{business}}"}</code> → your business name (filled in when inserted). WhatsApp templates also use numbered <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>…
              </div>
            </div>
            <div className="col-6">
              <select className="form-select form-select-sm rounded-3" aria-label="Channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c} className="text-capitalize">{c === "any" ? "Any channel" : c}</option>
                ))}
              </select>
            </div>
            <div className="col-6 d-flex align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="rd-watpl" checked={form.is_whatsapp_template} onChange={(e) => setForm({ ...form, is_whatsapp_template: e.target.checked, channel: e.target.checked ? "whatsapp" : form.channel })} />
                <label className="form-check-label fz-font-md" htmlFor="rd-watpl">WhatsApp template</label>
              </div>
            </div>
            {form.is_whatsapp_template && (
              <div className="col-12">
                <input className="form-control form-control-sm rounded-3" placeholder="Approved template SID (HX…)" aria-label="Approved WhatsApp template SID" value={form.whatsapp_template_sid} onChange={(e) => setForm({ ...form, whatsapp_template_sid: e.target.value })} />
                <div className="fz-font-sm neutral-400 mt-1">Templates are the only messages WhatsApp allows outside its 24-hour window — pre-approve them in Twilio first, then paste the ContentSid here.</div>
              </div>
            )}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-dark btn-sm rounded-3 px-4" disabled={busy}>{busy ? "…" : editingId ? "Save changes" : "Save"}</button>
              {editingId && (
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => { setEditingId(null); setForm({ ...BLANK }); }}>Cancel edit</button>
              )}
            </div>
          </div>
        </form>

        <div className="fz-font-sm fw-600 neutral-500 mb-2">Canned replies</div>
        {snippets.length === 0 ? (
          <div className="fz-font-sm neutral-400 mb-3">No canned replies yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2 mb-3">{snippets.map((c) => renderItem(c, false))}</div>
        )}

        <div className="fz-font-sm fw-600 neutral-500 mb-2">WhatsApp templates</div>
        {templates.length === 0 ? (
          <div className="fz-font-sm neutral-400">No templates yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">{templates.map((c) => renderItem(c, true))}</div>
        )}
      </div>
    </div>
  );
}
