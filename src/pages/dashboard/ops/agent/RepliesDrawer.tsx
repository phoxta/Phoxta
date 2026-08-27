import { useMemo, useState } from "react";
import { CornerDownLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { createCanned, updateCanned, deleteCanned, type CannedResponse, type WhatsappTemplateCategory } from "@/lib/db/ops/agent";
import { confirmDanger, reportMutation, toastError } from "@/lib/ops/feedback";
import { useDialog } from "@/lib/ops/useDialog";
import { Tag } from "@/pages/dashboard/ops/ui/primitives";
import "@/pages/dashboard/ops/ui/console.css";
import "./inbox/inbox.css";

/**
 * "Saved replies" drawer — the saved replies + WhatsApp templates CRUD that
 * used to live on the standalone Snippets page, now reachable from the Inbox
 * composer. Supports {{name}} / {{business}} variables (substituted on insert)
 * and numbered {{1}},{{2}}… variables for approved WhatsApp templates.
 */

const CHANNELS = ["any", "sms", "whatsapp", "email", "web"];
/** Brand casing — `text-capitalize` would render these as "Sms" / "Whatsapp". */
const CHANNEL_LABEL: Record<string, string> = { sms: "SMS", whatsapp: "WhatsApp", email: "Email", web: "Web" };
/**
 * Meta classifies every approved template, and which class it is decides whether
 * the AI agent may ever send it on its own.
 *
 * This was not recorded anywhere, and it had to be: outside WhatsApp's 24-hour
 * window the agent may only send an approved template, and with no category to
 * read it once sent this account's MARKETING template — "Just following up on
 * your recent enquiry" — as the answer to a service question. A promotion is not
 * an answer, and in the UK and EU it is a consent question rather than a style
 * one. Marking a template Marketing is how an owner tells the agent to leave it
 * alone; it stays fully usable by a person from the composer.
 */
const CATEGORIES: { value: WhatsappTemplateCategory; label: string; note: string }[] = [
  {
    value: "utility",
    label: "Utility",
    note: "Follows up on something the customer did or asked for — an order update, a booking confirmation, an answer. Your agent may send this one by itself.",
  },
  {
    value: "marketing",
    label: "Marketing",
    note: "A promotion, an offer or a re-engagement message. Your agent will never send it as a reply; you can still send it yourself from the composer.",
  },
  {
    value: "authentication",
    label: "Authentication",
    note: "A one-time passcode message. Never sent automatically — there is no code for the agent to put in it.",
  },
];

type FormState = {
  title: string;
  shortcut: string;
  body: string;
  channel: string;
  is_whatsapp_template: boolean;
  whatsapp_template_sid: string;
  whatsapp_template_category: WhatsappTemplateCategory;
};
const BLANK: FormState = {
  title: "",
  shortcut: "",
  body: "",
  channel: "any",
  is_whatsapp_template: false,
  whatsapp_template_sid: "",
  whatsapp_template_category: "utility",
};

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
      whatsapp_template_category: c.whatsapp_template_category ?? "utility",
    };
    setForm(next);
    setSeed(next);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...BLANK });
    setSeed({ ...BLANK });
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
      if (editingId === c.id) cancelEdit();
      onChanged();
    }
  }

  const snippets = items.filter((i) => !i.is_whatsapp_template);
  const templates = items.filter((i) => i.is_whatsapp_template);

  const renderItem = (c: CannedResponse, isTemplate: boolean) => (
    <div key={c.id} className="oc-panel" style={{ background: "var(--at-neutral-0)" }}>
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div className="fw-600 d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 13 }}>
          {c.title || c.shortcut || (isTemplate ? "Template" : "Saved reply")}
          {isTemplate ? <Tag tone="ok">WhatsApp</Tag> : <Tag>{CHANNEL_LABEL[c.channel] ?? c.channel}</Tag>}
          {/* Which templates the agent may answer with, at a glance. */}
          {isTemplate && (
            <Tag tone={(c.whatsapp_template_category ?? "utility") === "utility" ? undefined : "warn"}>
              {CATEGORIES.find((k) => k.value === (c.whatsapp_template_category ?? "utility"))?.label ?? "Utility"}
            </Tag>
          )}
          {c.shortcut && c.title && <Tag>{c.shortcut}</Tag>}
        </div>
        <div className="d-flex align-items-center gap-1 flex-shrink-0">
          {onInsert && !isTemplate && (
            <button type="button" className="oc-btn oc-btn--sm" onClick={() => onInsert(c)}>
              <CornerDownLeft /> Insert
            </button>
          )}
          <button type="button" className="oc-ico" aria-label={`Edit ${c.title || c.shortcut}`} onClick={() => startEdit(c)}>
            <Pencil width={15} height={15} />
          </button>
          <button type="button" className="oc-ico" aria-label={`Delete ${c.title || c.shortcut}`} onClick={() => remove(c)}>
            <Trash2 width={15} height={15} />
          </button>
        </div>
      </div>
      <div className="mt-2" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--at-neutral-500)" }}>
        {c.body}
      </div>
      {isTemplate && (
        <div
          className="mt-2"
          style={{ overflowWrap: "anywhere", fontSize: 11.5, color: c.whatsapp_template_sid ? "var(--at-neutral-400)" : "var(--oc-danger, #dc2626)" }}
        >
          {c.whatsapp_template_sid
            ? `Approval code: ${c.whatsapp_template_sid}`
            : "No approval code yet — this can't be sent outside the 24-hour window until you add one."}
        </div>
      )}
    </div>
  );

  return (
    <div className="oc-sheet__scrim" role="presentation" onMouseDown={requestClose}>
      <div
        ref={dialogRef}
        className="oc-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rd-title-h"
      >
        <div className="oc-sheet__head">
          <h2 id="rd-title-h">Saved replies</h2>
          <button type="button" className="oc-ico" aria-label="Close saved replies" onClick={requestClose}>
            <X width={16} height={16} />
          </button>
        </div>

        <div className="oc-sheet__body">
          <form onSubmit={save} className="oc-panel mb-4">
            <div className="oc-panel__head">
              {editingId ? <Pencil /> : <Plus />}
              {editingId ? "Edit reply" : "New saved reply / WhatsApp template"}
            </div>

            <div className="d-flex gap-2 mb-2">
              <div className="flex-grow-1">
                <label className="oc-label" htmlFor="rd-title">
                  Title
                </label>
                <input id="rd-title" className="oc-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ width: 130 }}>
                <label className="oc-label" htmlFor="rd-shortcut">
                  Shortcut
                </label>
                <input
                  id="rd-shortcut"
                  className="oc-field"
                  placeholder="/thanks"
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                />
              </div>
            </div>

            <label className="oc-label" htmlFor="rd-body">
              Message
            </label>
            <textarea
              id="rd-body"
              className="oc-field"
              rows={4}
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="mt-1 mb-3" style={{ fontSize: 11, color: "var(--at-neutral-400)", lineHeight: 1.5 }}>
              Variables: <code>{"{{name}}"}</code> → customer's name, <code>{"{{business}}"}</code> → your business name (filled in
              when inserted). WhatsApp templates also use numbered <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>…
            </div>

            <div className="d-flex gap-3 align-items-end mb-2 flex-wrap">
              <div style={{ minWidth: 160 }}>
                <label className="oc-label" htmlFor="rd-channel">
                  Channel
                </label>
                <select id="rd-channel" className="oc-field" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c === "any" ? "Any channel" : CHANNEL_LABEL[c] ?? c}
                    </option>
                  ))}
                </select>
              </div>
              <label className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: 12.5, cursor: "pointer" }} htmlFor="rd-watpl">
                <input
                  type="checkbox"
                  id="rd-watpl"
                  checked={form.is_whatsapp_template}
                  onChange={(e) => setForm({ ...form, is_whatsapp_template: e.target.checked, channel: e.target.checked ? "whatsapp" : form.channel })}
                />
                WhatsApp template
              </label>
            </div>

            {form.is_whatsapp_template && (
              <>
                <div className="mb-2">
                  <label className="oc-label" htmlFor="rd-sid">
                    WhatsApp approval code (SID)
                  </label>
                  <input
                    id="rd-sid"
                    className="oc-field"
                    placeholder="HX…"
                    value={form.whatsapp_template_sid}
                    onChange={(e) => setForm({ ...form, whatsapp_template_sid: e.target.value })}
                  />
                  <div className="mt-1" style={{ fontSize: 11, color: "var(--at-neutral-400)", lineHeight: 1.5 }}>
                    WhatsApp only allows pre-approved messages after 24 hours of silence. Get this message approved in your WhatsApp
                    Business account, then paste the code it gives you here.
                  </div>
                </div>

                <div className="mb-2">
                  <label className="oc-label" htmlFor="rd-category">
                    What kind of template is it?
                  </label>
                  <select
                    id="rd-category"
                    className="oc-field"
                    value={form.whatsapp_template_category}
                    onChange={(e) => setForm({ ...form, whatsapp_template_category: e.target.value as WhatsappTemplateCategory })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1" style={{ fontSize: 11, color: "var(--at-neutral-400)", lineHeight: 1.5 }}>
                    {CATEGORIES.find((c) => c.value === form.whatsapp_template_category)?.note}
                    {" "}It is the same category WhatsApp approved it under — set it to match, so your agent never answers a customer's
                    question with a promotion.
                  </div>
                </div>
              </>
            )}

            <div className="d-flex align-items-center gap-2 mt-3">
              <button type="submit" className="oc-btn oc-btn--primary" disabled={busy}>
                {busy ? "…" : editingId ? "Save changes" : "Save"}
              </button>
              {editingId && (
                <button type="button" className="oc-btn" onClick={cancelEdit}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <h3 className="oc-label">Saved replies</h3>
          {snippets.length === 0 ? (
            <div className="mb-4" style={{ fontSize: 12, color: "var(--at-neutral-400)" }}>
              No saved replies yet.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">{snippets.map((c) => renderItem(c, false))}</div>
          )}

          <h3 className="oc-label">WhatsApp templates</h3>
          {templates.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--at-neutral-400)" }}>No templates yet.</div>
          ) : (
            <div className="d-flex flex-column gap-2">{templates.map((c) => renderItem(c, true))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
