import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  fetchContactActivity,
  fmtDay,
  updateContact,
  type ActivityItem,
  type Contact,
  type ContactPatch,
  type ContactStage,
} from "@/lib/db/ops/crm";
import { formatPrice } from "@/lib/db/marketplace";
import { toastError, reportMutation, confirmDanger } from "@/lib/ops/feedback";
import { useDialog } from "@/lib/ops/useDialog";

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
  reservation: "Reservation",
};

const KIND_PATH: Record<ActivityItem["kind"], string> = {
  order: "commerce",
  conversation: "inbox",
  ticket: "inbox",
  booking: "bookings",
  reservation: "reservations",
};

const BAD_STATUS = ["cancelled", "canceled", "escalated", "failed", "no_show", "churned", "refunded"];

function statusClass(status: string): string {
  if (BAD_STATUS.includes(status)) return "bg-danger-subtle text-danger";
  if (["paid", "fulfilled", "confirmed", "closed", "handled", "resolved", "completed"].includes(status)) return "bg-success-subtle text-success";
  if (["pending", "open", "unfulfilled", "partially_refunded", "snoozed"].includes(status)) return "bg-warning-subtle text-warning";
  return "bg-neutral-100 neutral-700";
}

const isAiSource = (source: string | null) => !!source && /\b(ai|agent)\b/i.test(source);

/** "no_show" → "No show" — statuses are read by non-technical owners. */
const statusLabel = (status: string) => {
  const s = status.replace(/[_-]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: string;
  value: string;
  stage: ContactStage;
};

const seedForm = (c: Contact): FormState => ({
  name: c.name,
  email: c.email,
  phone: c.phone,
  company: c.company,
  notes: c.notes,
  tags: (c.tags ?? []).join(", "),
  value: c.value_cents ? (c.value_cents / 100).toString() : "",
  stage: c.stage,
});

/** Right-hand contact drawer: edit fields, provenance + opt-outs, AI scores
 *  with reasons, and a merged activity timeline across the console modules. */
export default function ContactDrawer({ orgId, orgCurrency, contact, scoreMeta, scoring, onScore, onSaved, onDelete, onClose }: Props) {
  const [form, setForm] = useState(() => seedForm(contact));
  // What's currently persisted — anything else in `form` is an unsaved edit.
  const [baseline, setBaseline] = useState(() => seedForm(contact));
  const [saving, setSaving] = useState(false);

  // Re-seed the form when a different contact is opened.
  useEffect(() => {
    const seed = seedForm(contact);
    setForm(seed);
    setBaseline(seed);
  }, [contact.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(
    () => (Object.keys(baseline) as (keyof FormState)[]).some((k) => form[k] !== baseline[k]),
    [form, baseline],
  );

  /** Closing with unsaved edits silently threw them away — confirm first. */
  function requestClose() {
    if (dirty && !confirmDanger("Discard your unsaved changes to this contact?")) return;
    onClose();
  }

  const dialogRef = useDialog<HTMLDivElement>(requestClose);

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
    if (ok) {
      setBaseline(form); // saved — the form is clean again
      onSaved(patch);
    }
  }

  const base = `/dashboard/businesses/${orgId}/ops`;
  const fid = (name: string) => `cd-${contact.id.slice(0, 8)}-${name}`;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1050 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Contact ${contact.name}`}
        tabIndex={-1}
        className="bg-neutral-0 h-100 shadow p-3 p-lg-4"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "min(540px, 100%)",
          maxWidth: "100%",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div style={{ minWidth: 0 }}>
            <h2 className="fz-font-lg fw-600 mb-1">{contact.name || "Unnamed contact"}</h2>
            <p className="fz-font-sm neutral-500 mb-0">
              Added {new Date(contact.created_at).toLocaleDateString()}
              {contact.source ? ` · via ${contact.source}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none ops-tap flex-shrink-0"
            aria-label="Close contact details"
            onClick={requestClose}
          >
            Close
          </button>
        </div>

        {(isAiSource(contact.source) || contact.email_opt_out || contact.sms_opt_out) && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {isAiSource(contact.source) && <span className="badge fz-font-sm bg-neutral-100 neutral-700 fw-500">✨ Captured by AI</span>}
            {contact.email_opt_out && <span className="badge fz-font-sm bg-danger-subtle text-danger fw-500">Email unsubscribed</span>}
            {contact.sms_opt_out && <span className="badge fz-font-sm bg-danger-subtle text-danger fw-500">SMS unsubscribed</span>}
          </div>
        )}

        {/* Editable details */}
        <form onSubmit={onSave} className="bg-neutral-50 rounded-4 border-100 p-3 mb-3">
          <h3 className="fz-font-md fw-600 mb-2">Details</h3>
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
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3 ops-tap" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {dirty && !saving && <span className="fz-font-sm neutral-500">Unsaved changes</span>}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ms-auto text-danger text-decoration-none ops-tap"
              onClick={onDelete}
            >
              Delete contact
            </button>
          </div>
        </form>

        {/* AI scores */}
        <div className="bg-neutral-50 rounded-4 border-100 p-3 mb-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <h3 className="fw-600 fz-font-md mb-0">AI score</h3>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 ops-tap" onClick={onScore} disabled={scoring}>
              {scoring ? "Scoring…" : contact.scored_at ? "Re-score" : "✨ Score"}
            </button>
          </div>
          {contact.scored_at == null ? (
            <p className="fz-font-sm neutral-500 mb-0">Not scored yet — score this contact to get a lead score, churn risk and a suggested next step.</p>
          ) : (
            <>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                {contact.lead_score != null && (
                  <span className="badge fz-font-sm bg-neutral-100 neutral-700 fw-600">Lead score {contact.lead_score}</span>
                )}
                {contact.churn_risk != null && (
                  <span className="badge fz-font-sm bg-neutral-100 neutral-700 fw-600">Churn risk {Math.round(contact.churn_risk * 100)}%</span>
                )}
                <span className="fz-font-sm neutral-500">scored {new Date(contact.scored_at).toLocaleDateString()}</span>
              </div>
              {contact.ai_summary && <p className="fz-font-sm neutral-700 mb-2">{contact.ai_summary}</p>}
              {scoreMeta ? (
                <>
                  {scoreMeta.next_action && (
                    <p className="fz-font-sm neutral-700 mb-2"><span className="fw-600">Next:</span> {scoreMeta.next_action}</p>
                  )}
                  {scoreMeta.reasons.length > 0 && (
                    <ul className="fz-font-sm neutral-500 mb-0 ps-3">
                      {scoreMeta.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <p className="fz-font-sm neutral-500 mb-0">Re-score to see the reasons behind this score.</p>
              )}
            </>
          )}
        </div>

        {/* Activity timeline */}
        <h3 className="fw-600 fz-font-md mb-2">Activity</h3>
        {activityLoading ? (
          <p className="fz-font-sm neutral-500 py-2 mb-0">Loading activity…</p>
        ) : activityError ? (
          <p className="fz-font-sm text-danger py-2 mb-0" role="alert">
            {activityError}
          </p>
        ) : activity.length === 0 ? (
          <p className="fz-font-sm neutral-500 py-2 mb-0">
            No orders, reservations, bookings, conversations or tickets found for this contact
            {contact.email ? "" : " — add an email address so their activity can be matched"}.
          </p>
        ) : (
          <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            {activity.map((a) => {
              const meta = [
                fmtDay(a.date),
                a.detail,
                a.amount_cents != null ? formatPrice(a.amount_cents, a.currency || orgCurrency) : "",
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={`${a.kind}-${a.id}`} className="bg-neutral-50 rounded-3 border-100 p-2">
                  <div className="d-flex align-items-start justify-content-between gap-2">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <span className="badge fz-font-sm bg-neutral-100 neutral-700 fw-500">{KIND_LABEL[a.kind]}</span>
                        {/* Status is spelled out, not only colour-coded. */}
                        <span className={`badge fz-font-sm fw-500 ${statusClass(a.status)}`}>{statusLabel(a.status)}</span>
                      </div>
                      <div className="fz-font-md fw-600 text-truncate">{a.title}</div>
                      {meta && <div className="fz-font-sm neutral-500">{meta}</div>}
                    </div>
                    <Link
                      to={`${base}/${KIND_PATH[a.kind]}`}
                      className="fz-font-sm text-decoration-none flex-shrink-0 ops-tap"
                      aria-label={`Open ${KIND_LABEL[a.kind].toLowerCase()} in ${KIND_PATH[a.kind]}`}
                      onClick={onClose}
                    >
                      Open →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
