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
import { Chip } from "@/components/dash/Ui";

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

/** Maps an activity status to the kit's chip tones (Chip in components/dash/Ui). */
function statusTone(status: string): "danger" | "ok" | "warn" | "plain" {
  if (BAD_STATUS.includes(status)) return "danger";
  if (["paid", "fulfilled", "confirmed", "closed", "handled", "resolved", "completed"].includes(status)) return "ok";
  if (["pending", "open", "unfulfilled", "partially_refunded", "snoozed"].includes(status)) return "warn";
  return "plain";
}

/** Lead-score chip tone: high reads green, middling amber, low stays plain. */
function scoreTone(score: number): "ok" | "warn" | "plain" {
  if (score >= 70) return "ok";
  if (score >= 40) return "warn";
  return "plain";
}

/* Drawer-local presentation, on the hrx palette: Figtree (inherited from the
   .hrx layout), ink #272727, blue #195ce5, soft #f9fbfc, borders #ededed. */
const DRAWER_CSS = `
.crx-drawer { background: #fff; border-left: 1px solid #ededed; color: #272727; padding: clamp(18px, 2.4vw, 28px); }
.crx-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
.crx-sub { font-size: 13px; color: #6b7280; }
.crx-close { height: 32px; padding: 0 14px; border-radius: 50px; border: 1px solid #ededed; background: #fff; color: #272727; font-size: 13px; font-weight: 500; line-height: 1; display: inline-flex; align-items: center; cursor: pointer; transition: background-color 0.15s ease; }
.crx-close:hover { background: #f1f2f4; }
.crx-sec { background: #f9fbfc; border: 1px solid #ededed; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
.crx-sec__h { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 10px; }
.crx-sec .form-label { font-size: 13px; font-weight: 500; color: #6b7280; }
.crx-note { font-size: 13px; color: #6b7280; margin: 0; }
.crx-body { font-size: 13px; color: #272727; }
.crx-danger { font-size: 13px; color: #dc2626; }
.crx-meta { font-size: 12.5px; color: #6b7280; }
.crx-kv { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid #ececec; margin: 0; }
.crx-kv:first-child { border-top: 0; padding-top: 0; }
.crx-kv dt { font-size: 13px; font-weight: 500; color: #6b7280; }
.crx-kv dd { margin: 0; font-size: 13px; font-weight: 600; color: #272727; text-align: right; }
.crx-time { display: flex; flex-direction: column; }
.crx-row { padding: 12px 0; border-top: 1px solid #ececec; }
.crx-row:first-child { border-top: 0; padding-top: 4px; }
.crx-row__t { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
.crx-row__s { font-size: 13px; color: #6b7280; margin-top: 2px; }
.crx-open { font-size: 13px; font-weight: 500; color: #195ce5; text-decoration: none; }
.crx-open:hover { color: #1246b0; }
`;

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
        className="crx-drawer h-100 shadow"
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
        <style>{DRAWER_CSS}</style>

        <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
          <div style={{ minWidth: 0 }}>
            <h2 className="crx-title mb-1">{contact.name || "Unnamed contact"}</h2>
            <p className="crx-sub mb-0">
              Added {new Date(contact.created_at).toLocaleDateString()}
              {contact.source ? ` · via ${contact.source}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="crx-close flex-shrink-0 ops-tap"
            aria-label="Close contact details"
            onClick={requestClose}
          >
            Close
          </button>
        </div>

        {(isAiSource(contact.source) || contact.email_opt_out || contact.sms_opt_out) && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {isAiSource(contact.source) && <Chip tone="blue">✨ Captured by AI</Chip>}
            {contact.email_opt_out && <Chip tone="danger">Email unsubscribed</Chip>}
            {contact.sms_opt_out && <Chip tone="danger">SMS unsubscribed</Chip>}
          </div>
        )}

        {/* Editable details */}
        <form onSubmit={onSave} className="crx-sec">
          <h3 className="crx-sec__h">Details</h3>
          <div className="row g-2">
            <div className="col-md-6">
              <label htmlFor={fid("name")} className="form-label mb-1">Name</label>
              <input id={fid("name")} className="form-control form-control-sm rounded-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("email")} className="form-label mb-1">Email</label>
              <input id={fid("email")} type="email" className="form-control form-control-sm rounded-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("phone")} className="form-label mb-1">Phone</label>
              <input id={fid("phone")} type="tel" className="form-control form-control-sm rounded-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("company")} className="form-label mb-1">Company</label>
              <input id={fid("company")} className="form-control form-control-sm rounded-3" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("value")} className="form-label mb-1">Value ({orgCurrency})</label>
              <input id={fid("value")} type="number" min={0} step={0.01} className="form-control form-control-sm rounded-3" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor={fid("stage")} className="form-label mb-1">Stage</label>
              <select id={fid("stage")} className="form-select form-select-sm rounded-3 text-capitalize" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as ContactStage })}>
                {STAGES.map((s) => <option key={s} value={s} className="text-capitalize">{s}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label htmlFor={fid("tags")} className="form-label mb-1">Tags (comma-separated)</label>
              <input id={fid("tags")} className="form-control form-control-sm rounded-3" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="col-12">
              <label htmlFor={fid("notes")} className="form-label mb-1">Notes</label>
              <textarea id={fid("notes")} rows={3} className="form-control form-control-sm rounded-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            <button type="submit" className="hrx-pill dark ops-tap" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {dirty && !saving && <span className="crx-meta">Unsaved changes</span>}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ms-auto crx-danger text-decoration-none ops-tap"
              onClick={onDelete}
            >
              Delete contact
            </button>
          </div>
        </form>

        {/* AI scores */}
        <div className="crx-sec">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <h3 className="crx-sec__h mb-0">AI score</h3>
            <button type="button" className="hrx-pill ops-tap" onClick={onScore} disabled={scoring}>
              {scoring ? "Scoring…" : contact.scored_at ? "Re-score" : "✨ Score"}
            </button>
          </div>
          {contact.scored_at == null ? (
            <p className="crx-note">Not scored yet — score this contact to get a lead score, churn risk and a suggested next step.</p>
          ) : (
            <>
              <dl className="mb-2">
                {contact.lead_score != null && (
                  <div className="crx-kv">
                    <dt>Lead score</dt>
                    <dd><Chip tone={scoreTone(contact.lead_score)}>{contact.lead_score}</Chip></dd>
                  </div>
                )}
                {contact.churn_risk != null && (
                  <div className="crx-kv">
                    <dt>Churn risk</dt>
                    <dd><Chip tone={contact.churn_risk >= 0.5 ? "danger" : "plain"}>{Math.round(contact.churn_risk * 100)}%</Chip></dd>
                  </div>
                )}
                <div className="crx-kv">
                  <dt>Scored</dt>
                  <dd>{new Date(contact.scored_at).toLocaleDateString()}</dd>
                </div>
              </dl>
              {contact.ai_summary && <p className="crx-body mb-2">{contact.ai_summary}</p>}
              {scoreMeta ? (
                <>
                  {scoreMeta.next_action && (
                    <p className="crx-body mb-2"><span className="fw-600">Next:</span> {scoreMeta.next_action}</p>
                  )}
                  {scoreMeta.reasons.length > 0 && (
                    <ul className="crx-note mb-0 ps-3">
                      {scoreMeta.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <p className="crx-note">Re-score to see the reasons behind this score.</p>
              )}
            </>
          )}
        </div>

        {/* Activity timeline */}
        <div className="crx-sec">
          <h3 className="crx-sec__h">Activity</h3>
          {activityLoading ? (
            <p className="crx-note py-1">Loading activity…</p>
          ) : activityError ? (
            <p className="crx-danger py-1 mb-0" role="alert">
              {activityError}
            </p>
          ) : activity.length === 0 ? (
            <p className="crx-note py-1">
              No orders, reservations, bookings, conversations or tickets found for this contact
              {contact.email ? "" : " — add an email address so their activity can be matched"}.
            </p>
          ) : (
            <div className="crx-time">
              {activity.map((a) => {
                const meta = [
                  fmtDay(a.date),
                  a.detail,
                  a.amount_cents != null ? formatPrice(a.amount_cents, a.currency || orgCurrency) : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div key={`${a.kind}-${a.id}`} className="crx-row">
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <Chip tone="line">{KIND_LABEL[a.kind]}</Chip>
                          {/* Status is spelled out, not only colour-coded. */}
                          <Chip tone={statusTone(a.status)}>{statusLabel(a.status)}</Chip>
                        </div>
                        <div className="crx-row__t text-truncate">{a.title}</div>
                        {meta && <div className="crx-row__s">{meta}</div>}
                      </div>
                      <Link
                        to={`${base}/${KIND_PATH[a.kind]}`}
                        className="crx-open flex-shrink-0 ops-tap"
                        aria-label={`Open ${KIND_LABEL[a.kind].toLowerCase()} in ${KIND_PATH[a.kind]}`}
                        onClick={onClose}
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
