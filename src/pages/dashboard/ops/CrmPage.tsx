import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listContacts,
  createContact,
  updateContactStage,
  deleteContact,
  type Contact,
  type ContactStage,
} from "@/lib/db/ops/crm";
import { semanticSearch, drainEmbeddings } from "@/lib/db/ops/ai";
import { invokeAction } from "@/lib/db/ops/ai";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import ContactDrawer, { type ScoreMeta } from "./ContactDrawer";
import type { OpsContext } from "@/layouts/OperatingLayout";

const STAGES: ContactStage[] = ["lead", "prospect", "customer", "churned"];
const STAGE_STYLE: Record<ContactStage, string> = {
  lead: "bg-neutral-100 neutral-700",
  prospect: "bg-warning-subtle text-warning",
  customer: "bg-success-subtle text-success",
  churned: "bg-neutral-100 neutral-500",
};

const SCORE_CAP = 25;

type ScoreResult = {
  lead_score: number;
  churn_risk: number;
  summary: string;
  next_action: string;
  reasons: string[];
};

function scoreColor(score: number | null): string {
  if (score == null) return "bg-neutral-100 neutral-500";
  if (score >= 70) return "bg-success-subtle text-success";
  if (score >= 40) return "bg-warning-subtle text-warning";
  return "bg-neutral-100 neutral-700";
}

function metaKey(orgId: string): string {
  return `ops:crm:score-meta:${orgId}`;
}

function loadScoreMeta(orgId: string): Record<string, ScoreMeta> {
  try {
    const raw = window.localStorage.getItem(metaKey(orgId));
    return raw ? (JSON.parse(raw) as Record<string, ScoreMeta>) : {};
  } catch {
    return {};
  }
}

const csvField = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function CrmPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const { data: rows = [], loading, error: loadError, reload, setData: setRows } = useCachedData(
    `ops:crm:${orgId}`,
    async () => {
      const { data, error } = await listContacts(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", stage: "lead" as ContactStage });
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState<Record<string, boolean>>({});
  const [scoreProgress, setScoreProgress] = useState<{ done: number; total: number } | null>(null);
  const [scoreMeta, setScoreMeta] = useState<Record<string, ScoreMeta>>(() => loadScoreMeta(orgId));
  const [openId, setOpenId] = useState<string | null>(null);

  // Primary search: plain substring filter, applied as you type.
  const [filter, setFilter] = useState("");
  // Secondary: semantic ("✨") search results override the substring filter.
  const [matchIds, setMatchIds] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const ok = await reportMutation(createContact(orgId, form), "Contact added");
    setSaving(false);
    if (ok) {
      setForm({ name: "", email: "", phone: "", company: "", stage: "lead" });
      drainEmbeddings(); // index the new contact for semantic search
      reload();
    }
  }

  async function onStage(c: Contact, stage: ContactStage) {
    const prev = c.stage;
    setRows((r) => (r ?? []).map((x) => (x.id === c.id ? { ...x, stage } : x)));
    const ok = await reportMutation(updateContactStage(c.id, stage), "Stage updated");
    if (!ok) setRows((r) => (r ?? []).map((x) => (x.id === c.id ? { ...x, stage: prev } : x)));
  }

  async function onDelete(c: Contact) {
    if (!confirmDanger(`Delete ${c.name || "this contact"}? This cannot be undone.`)) return;
    const ok = await reportMutation(deleteContact(c.id), "Contact deleted");
    if (ok) {
      setRows((r) => (r ?? []).filter((x) => x.id !== c.id));
      setOpenId((id) => (id === c.id ? null : id));
    }
  }

  async function scoreOne(id: string): Promise<boolean> {
    setScoring((s) => ({ ...s, [id]: true }));
    const { data, error } = await invokeAction<ScoreResult>(orgId, "score_lead", { contactId: id });
    setScoring((s) => ({ ...s, [id]: false }));
    if (error) {
      toastError(error);
      return false;
    }
    if (!data) return false;
    setRows((r) =>
      (r ?? []).map((x) =>
        x.id === id
          ? { ...x, lead_score: Math.round(data.lead_score), churn_risk: data.churn_risk, ai_summary: data.summary, scored_at: new Date().toISOString() }
          : x,
      ),
    );
    setScoreMeta((m) => {
      const next = { ...m, [id]: { reasons: data.reasons ?? [], next_action: data.next_action ?? "" } };
      try {
        window.localStorage.setItem(metaKey(orgId), JSON.stringify(next));
      } catch {
        /* storage full/blocked — reasons just won't persist across reloads */
      }
      return next;
    });
    return true;
  }

  async function scoreAll() {
    const unscored = rows.filter((r) => r.scored_at == null);
    if (unscored.length === 0) {
      toast("Every contact is already scored — use Re-score on a row to refresh one.", "info");
      return;
    }
    const targets = unscored.slice(0, SCORE_CAP);
    if (unscored.length > SCORE_CAP) {
      toast(`Scoring the first ${SCORE_CAP} of ${unscored.length} unscored contacts (${SCORE_CAP} per run).`, "info");
    }
    setScoreProgress({ done: 0, total: targets.length });
    let done = 0;
    for (const c of targets) {
      const ok = await scoreOne(c.id);
      if (!ok) break; // the failure was already toasted — stop instead of hammering
      done += 1;
      setScoreProgress({ done, total: targets.length });
    }
    setScoreProgress(null);
    if (done > 0) toast(`Scored ${done} contact${done === 1 ? "" : "s"}.`);
  }

  async function onSemanticSearch() {
    if (!filter.trim()) {
      toastError("Type what you're looking for first, then hit ✨ for semantic search.");
      return;
    }
    setSearching(true);
    const { matches, error } = await semanticSearch(orgId, filter, ["crm_contacts"]);
    setSearching(false);
    if (error) toastError(error);
    else setMatchIds(matches.map((m) => m.source_id));
  }

  const display = useMemo(() => {
    if (matchIds != null) {
      return matchIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Contact[];
    }
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q),
    );
  }, [rows, filter, matchIds]);

  function exportCsv() {
    if (display.length === 0) {
      toastError("Nothing to export — the current list is empty.");
      return;
    }
    const header = ["name", "email", "phone", "company", "stage", "tags", "notes", "value", "currency", "lead_score", "churn_risk", "created_at"];
    const lines = [header.map(csvField).join(",")];
    for (const c of display) {
      lines.push(
        [
          c.name,
          c.email,
          c.phone,
          c.company,
          c.stage,
          (c.tags ?? []).join("; "),
          c.notes,
          ((c.value_cents ?? 0) / 100).toFixed(2),
          org.currency || "USD",
          c.lead_score ?? "",
          c.churn_risk ?? "",
          c.created_at,
        ]
          .map(csvField)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`Exported ${display.length} contact${display.length === 1 ? "" : "s"}.`);
  }

  const open = openId == null ? null : display.find((c) => c.id === openId) ?? rows.find((c) => c.id === openId) ?? null;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-600 mb-0">Contacts</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <input
            className="form-control form-control-sm rounded-3"
            style={{ minWidth: 220 }}
            type="search"
            aria-label="Search contacts by name, email or company"
            placeholder="Search name, email, company…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setMatchIds(null);
            }}
          />
          <button
            type="button"
            className="btn btn-outline-dark btn-sm rounded-3 px-3"
            title="Semantic search — finds contacts by meaning, not just text"
            onClick={onSemanticSearch}
            disabled={searching}
          >
            {searching ? "…" : "✨"}
          </button>
          {matchIds != null && (
            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setMatchIds(null)}>
              Clear ✨
            </button>
          )}
          <button type="button" className="btn btn-outline-dark btn-sm rounded-3 px-3" onClick={exportCsv}>
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-dark btn-sm rounded-3 px-3"
            title={`Scores up to ${SCORE_CAP} unscored contacts per run`}
            onClick={scoreAll}
            disabled={scoreProgress != null}
          >
            {scoreProgress ? `Scoring ${scoreProgress.done}/${scoreProgress.total}…` : "✨ Score all"}
          </button>
        </div>
      </div>

      {loadError && <div className="alert alert-warning py-2 px-3 fz-font-md">{loadError}</div>}

      <form onSubmit={onAdd} className="bg-neutral-0 rounded-4 p-3 border-100 mb-4">
        <div className="row g-2">
          <div className="col-md-3">
            <label htmlFor="crm-add-name" className="form-label fz-font-sm neutral-500 mb-1">Name</label>
            <input id="crm-add-name" className="form-control rounded-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <label htmlFor="crm-add-email" className="form-label fz-font-sm neutral-500 mb-1">Email</label>
            <input id="crm-add-email" type="email" className="form-control rounded-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label htmlFor="crm-add-phone" className="form-label fz-font-sm neutral-500 mb-1">Phone</label>
            <input id="crm-add-phone" type="tel" className="form-control rounded-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label htmlFor="crm-add-company" className="form-label fz-font-sm neutral-500 mb-1">Company</label>
            <input id="crm-add-company" className="form-control rounded-3" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="col-md-1">
            <label htmlFor="crm-add-stage" className="form-label fz-font-sm neutral-500 mb-1">Stage</label>
            <select id="crm-add-stage" className="form-select rounded-3 text-capitalize" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as ContactStage })}>
              {STAGES.map((s) => <option key={s} value={s} className="text-capitalize">{s}</option>)}
            </select>
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <button type="submit" className="btn btn-dark w-100 rounded-3" disabled={saving}>Add</button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      ) : display.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">
          {matchIds != null ? "No matches." : filter.trim() ? "No contacts match your search." : "No contacts yet."}
        </div>
      ) : (
        <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden">
          <table className="table mb-0 align-middle">
            <thead>
              <tr className="fz-font-sm neutral-500">
                <th className="fw-500 py-3 ps-4">Name</th>
                <th className="fw-500 py-3">Email</th>
                <th className="fw-500 py-3">Phone</th>
                <th className="fw-500 py-3">Stage</th>
                <th className="fw-500 py-3 text-center">Lead</th>
                <th className="fw-500 py-3 text-center">Churn</th>
                <th className="fw-500 py-3 pe-4 text-end">AI</th>
              </tr>
            </thead>
            <tbody>
              {display.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setOpenId(c.id)}>
                  <td className="py-3 ps-4">
                    <div className="fw-600">{c.name}</div>
                    {c.ai_summary ? (
                      <div className="fz-font-sm neutral-500">{c.ai_summary}</div>
                    ) : (
                      c.company && <div className="fz-font-sm neutral-500">{c.company}</div>
                    )}
                  </td>
                  <td className="py-3 fz-font-sm neutral-700">
                    {c.email || <span className="neutral-500">—</span>}
                    {c.email_opt_out && <span className="badge bg-danger-subtle text-danger fw-500 ms-2">unsubscribed</span>}
                  </td>
                  <td className="py-3 fz-font-sm neutral-700">
                    {c.phone || <span className="neutral-500">—</span>}
                    {c.sms_opt_out && <span className="badge bg-danger-subtle text-danger fw-500 ms-2">unsubscribed</span>}
                  </td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      aria-label={`Stage for ${c.name}`}
                      className={`badge border-0 fw-500 text-capitalize ${STAGE_STYLE[c.stage]}`}
                      value={c.stage}
                      onChange={(e) => onStage(c, e.target.value as ContactStage)}
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3 text-center">
                    {c.lead_score != null ? <span className={`badge fw-600 ${scoreColor(c.lead_score)}`}>{c.lead_score}</span> : <span className="neutral-500 fz-font-sm">—</span>}
                  </td>
                  <td className="py-3 text-center">
                    {c.churn_risk != null ? (
                      <span className={`badge fw-500 ${c.churn_risk >= 0.6 ? "bg-warning-subtle text-warning" : "bg-neutral-100 neutral-700"}`}>{Math.round(c.churn_risk * 100)}%</span>
                    ) : (
                      <span className="neutral-500 fz-font-sm">—</span>
                    )}
                  </td>
                  <td className="py-3 pe-4 text-end" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn btn-link btn-sm p-0 me-3 text-decoration-none" onClick={() => scoreOne(c.id)} disabled={scoring[c.id]}>
                      {scoring[c.id] ? "…" : c.scored_at ? "Re-score" : "✨ Score"}
                    </button>
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => onDelete(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <ContactDrawer
          orgId={orgId}
          orgCurrency={org.currency || "USD"}
          contact={open}
          scoreMeta={scoreMeta[open.id] ?? null}
          scoring={!!scoring[open.id]}
          onScore={() => scoreOne(open.id)}
          onSaved={(patch) => {
            setRows((r) => (r ?? []).map((x) => (x.id === open.id ? { ...x, ...patch } : x)));
            reload();
          }}
          onDelete={() => onDelete(open)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
