import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  fetchContactActivity,
  updateContact,
  type ActivityItem,
  type Contact,
  type ContactPatch,
  type ContactStage,
} from "@/lib/db/ops/crm";
import { formatPrice } from "@/lib/db/marketplace";
import { toastError, reportMutation } from "@/lib/ops/feedback";

const STAGES: ContactStage[] = ["lead", "prospect", "customer", "churned"];

/** Reasons + next action returned by score_lead, kept client-side per contact. */
export type ScoreMeta = { reasons: string[]; next_action: string };

type Props = {
  orgId: string;
  orgCurrency: string;
  contact: Contact;
  scoreMeta: ScoreMeta | null;
  scoring: boolean;
  onScore: () => void;
  onSaved: (patch: ContactPatch) => void; // parent patches its row cache + reloads
  onDelete: () => void; // parent owns confirmDanger + mutation
  onClose: () => void;
};

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  order: "Order",
  conversation: "Conversation",
  ticket: "Ticket",
  booking: "Booking",
};

const KIND_PATH: Record<ActivityItem["kind"], string> = {
  order: "commerce",
  conversation: "inbox",
  ticket: "inbox",
  booking: "bookings",
};

const BAD_STATUS = ["cancelled", "canceled", "escalated", "failed", "no_show", "churned", "refunded"];

function statusClass(status: string): string {
  if (BAD_STATUS.includes(status)) return "bg-danger-subtle text-danger";
  if (["paid", "fulfilled", "confirmed", "closed", "handled", "resolved", "completed"].includes(status)) return "bg-success-subtle text-success";
  if (["pending", "open", "unfulfilled", "partially_refunded", "snoozed"].includes(status)) return "bg-warning-subtle text-warning";
  return "bg-neutral-100 neutral-700";
}

const isAiSource = (source: string | null) => !!source && /\b(ai|agent)\b/i.test(source);

/** Right-hand contact drawer: edit fields, provenance + opt-outs, AI scores
 *  with reasons, and a merged activity timeline across the console modules. */
export default function ContactDrawer({ orgId, orgCurrency, contact, scoreMeta, scoring, onScore, onSaved, onDelete, onClose }: Props) {
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    notes: contact.notes,
    tags: (contact.tags ?? []).join(", "),
    value: contact.value_cents ? (contact.value_cents / 100).toString() : "",
    stage: contact.stage,
  });
  const [saving, setSaving] = useState(false);

  // Re-seed the form when a different contact is opened.
  useEffect(() => {
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      notes: contact.notes,
      tags: (contact.tags ?? []).join(", "),
      value: contact.value_cents ? (contact.value_cents / 100).toString() : "",
      stage: contact.stage,
    });
  }, [contact.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: activity = [], loading: activityLoading, error: activityError } = useCachedData(
    `ops:crm:activity:${contact.id}`,
    async () => {
      const { data, error } = await fetchContactActivity(orgId, contact.id, contact.email);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toastError("Name is required.");
      return;
    }
    let valueCents = 0;
    const raw = form.value.trim();
    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        toastError("Value must be a number of 0 or more — fix it and save again.");
        return;
      }
      valueCents = Math.round(n * 100);
    }
    const patch: ContactPatch = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      notes: form.notes,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      value_cents: valueCents,
      stage: form.stage,
    };
    setSaving(true);
    const ok = await reportMutation(updateContact(contact.id, patch), "Contact saved");
    setSaving(false);
    if (ok) onSaved(patch);
  }

  const base = `/dashboard/businesses/${orgId}/ops`;
  const fid = (name: string) => `cd-${contact.id.slice(0, 8)}-${name}`;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1050 }}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label={`Contact ${contact.name}`}
        className="bg-neutral-0 h-100 shadow p-4"
        style={{ position: "absolute", right: 0, top: 0, width: "min(540px, 100%)", overflowY: "auto" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
          <div>
            <h5 className="fw-600 mb-1">{contact.name}</h5>
            <div className="fz-font-sm neutral-500">
              Added {new Date(contact.created_at).toLocaleDateString()}
              {contact.source ? ` · via ${contact.source}` : ""}
            </div>
          </div>
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          {isAiSource(contact.source) && <span className="badge bg-neutral-100 neutral-700 fw-500">✨ Captured by AI</span>}
          {contact.email_opt_out && <span className="badge bg-danger-subtle text-danger fw-500">Email unsubscribed</span>}
          {contact.sms_opt_out && <span className="badge bg-danger-subtle text-danger fw-500">SMS unsubscribed</span>}
        </div>

        {/* Editable details */}
        <form onSubmit={onSave} className="bg-neutral-50 rounded-4 border-100 p-3 mb-3">
          <div className="row g-2">
            <div className="col-md-6">
              <label htmlFor={fid("name")} className="form-label fz-font-sm neutral-500 mb-1">Name</label>
              <input id={fid("name")} className="form-control form-control-sm rounded-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("email")} className="form-label fz-font-sm neutral-500 mb-1">Email</label>
              <input id={fid("email")} type="email" className="form-control form-control-sm rounded-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("phone")} className="form-label fz-font-sm neutral-500 mb-1">Phone</label>
              <input id={fid("phone")} type="tel" className="form-control form-control-sm rounded-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("company")} className="form-label fz-font-sm neutral-500 mb-1">Company</label>
              <input id={fid("company")} className="form-control form-control-sm rounded-3" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("value")} className="form-label fz-font-sm neutral-500 mb-1">Value ({orgCurrency})</label>
              <input id={fid("value")} type="number" min={0} step={0.01} className="form-control form-control-sm rounded-3" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("stage")} className="form-label fz-font-sm neutral-500 mb-1">Stage</label>
              <select id={fid("stage")} className="form-select form-select-sm rounded-3 text-capitalize" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as ContactStage })}>
                {STAGES.map((s) => <option key={s} value={s} className="text-capitalize">{s}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label htmlFor={fid("tags")} className="form-label fz-font-sm neutral-500 mb-1">Tags (comma-separated)</label>
              <input id={fid("tags")} className="form-control form-control-sm rounded-3" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="col-12">
              <label htmlFor={fid("notes")} className="form-label fz-font-sm neutral-500 mb-1">Notes</label>
              <textarea id={fid("notes")} rows={3} className="form-control form-control-sm rounded-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 mt-3">
            <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-link btn-sm p-0 ms-auto text-danger text-decoration-none" onClick={onDelete}>
              Delete contact
            </button>
          </div>
        </form>

        {/* AI scores */}
        <div className="bg-neutral-50 rounded-4 border-100 p-3 mb-3">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            <span className="fw-600 fz-font-md">AI score</span>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={onScore} disabled={scoring}>
              {scoring ? "Scoring…" : contact.scored_at ? "Re-score" : "✨ Score"}
            </button>
          </div>
          {contact.scored_at == null ? (
            <div className="fz-font-sm neutral-500">Not scored yet.</div>
          ) : (
            <>
              <div className="d-flex flex-wrap gap-2 mb-2 fz-font-sm">
                {contact.lead_score != null && <span className="badge bg-neutral-100 neutral-700 fw-600">Lead {contact.lead_score}</span>}
                {contact.churn_risk != null && <span className="badge bg-neutral-100 neutral-700 fw-600">Churn {Math.round(contact.churn_risk * 100)}%</span>}
                <span className="neutral-500">scored {new Date(contact.scored_at).toLocaleDateString()}</span>
              </div>
              {contact.ai_summary && <div className="fz-font-sm neutral-700 mb-1">{contact.ai_summary}</div>}
              {scoreMeta ? (
                <>
                  {scoreMeta.next_action && (
                    <div className="fz-font-sm neutral-700 mb-1"><span className="fw-600">Next:</span> {scoreMeta.next_action}</div>
                  )}
                  {scoreMeta.reasons.length > 0 && (
                    <ul className="fz-font-sm neutral-500 mb-0 ps-3">
                      {scoreMeta.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <div className="fz-font-sm neutral-500">Re-score to see the reasons behind this score.</div>
              )}
            </>
          )}
        </div>

        {/* Activity timeline */}
        <div className="fw-600 fz-font-md mb-2">Activity</div>
        {activityLoading ? (
          <div className="fz-font-sm neutral-500 py-2">Loading activity…</div>
        ) : activityError ? (
          <div className="fz-font-sm text-danger py-2">{activityError}</div>
        ) : activity.length === 0 ? (
          <div className="fz-font-sm neutral-500 py-2">
            No orders, conversations, tickets or bookings found for this contact{contact.email ? "" : " — add an email to match activity"}.
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {activity.map((a) => (
              <div key={`${a.kind}-${a.id}`} className="bg-neutral-50 rounded-3 border-100 p-2 d-flex align-items-start gap-2">
                <span className={`badge fw-500 ${statusClass(a.status)}`}>{KIND_LABEL[a.kind]}</span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="fz-font-md fw-600 text-truncate">{a.title}</div>
                  <div className="fz-font-sm neutral-500 text-truncate">
                    {new Date(a.date).toLocaleDateString()} · {a.detail}
                    {a.amount_cents != null ? ` · ${formatPrice(a.amount_cents, a.currency || orgCurrency)}` : ""}
                  </div>
                </div>
                <Link to={`${base}/${KIND_PATH[a.kind]}`} className="fz-font-sm text-decoration-none flex-shrink-0" onClick={onClose}>
                  Open →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
