import { useState } from "react";
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
import type { OpsContext } from "@/layouts/OperatingLayout";

const STAGES: ContactStage[] = ["lead", "prospect", "customer", "churned"];
const STAGE_STYLE: Record<ContactStage, string> = {
  lead: "bg-neutral-100 neutral-700",
  prospect: "bg-warning-subtle text-warning",
  customer: "bg-success-subtle text-success",
  churned: "bg-neutral-100 neutral-500",
};

type ScoreResult = { lead_score: number; churn_risk: number; summary: string; next_action: string };

function scoreColor(score: number | null): string {
  if (score == null) return "bg-neutral-100 neutral-500";
  if (score >= 70) return "bg-success-subtle text-success";
  if (score >= 40) return "bg-warning-subtle text-warning";
  return "bg-neutral-100 neutral-700";
}

export default function CrmPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data: rows = [], loading, error: loadError, reload, setData: setRows } = useCachedData(
    `ops:crm:${orgId}`,
    async () => {
      const { data, error } = await listContacts(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", stage: "lead" as ContactStage });
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState<Record<string, boolean>>({});
  const [scoringAll, setScoringAll] = useState(false);

  // Semantic search
  const [query, setQuery] = useState("");
  const [matchIds, setMatchIds] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);


  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await createContact(orgId, form);
    setSaving(false);
    if (error) setError(error);
    else {
      setForm({ name: "", email: "", company: "", stage: "lead" });
      drainEmbeddings(); // index the new contact for semantic search
      reload();
    }
  }

  async function onStage(c: Contact, stage: ContactStage) {
    await updateContactStage(c.id, stage);
    setRows((r) => (r ?? []).map((x) => (x.id === c.id ? { ...x, stage } : x)));
  }

  async function onDelete(id: string) {
    await deleteContact(id);
    setRows((r) => (r ?? []).filter((x) => x.id !== id));
  }

  async function scoreOne(id: string) {
    setScoring((s) => ({ ...s, [id]: true }));
    const { data } = await invokeAction<ScoreResult>(orgId, "score_lead", { contactId: id });
    setScoring((s) => ({ ...s, [id]: false }));
    if (data) {
      setRows((r) =>
        (r ?? []).map((x) =>
          x.id === id
            ? { ...x, lead_score: Math.round(data.lead_score), churn_risk: data.churn_risk, ai_summary: data.summary, scored_at: new Date().toISOString() }
            : x,
        ),
      );
    }
  }

  async function scoreAll() {
    setScoringAll(true);
    const targets = rows.filter((r) => r.scored_at == null).slice(0, 25);
    for (const c of targets) {
      await scoreOne(c.id);
    }
    setScoringAll(false);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setMatchIds(null);
      return;
    }
    setSearching(true);
    setError(null);
    const { matches, error } = await semanticSearch(orgId, query, ["crm_contacts"]);
    setSearching(false);
    if (error) setError(error);
    else setMatchIds(matches.map((m) => m.source_id));
  }

  const display =
    matchIds == null
      ? rows
      : (matchIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Contact[]);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-600 mb-0">Contacts</h5>
        <div className="d-flex gap-2">
          <form onSubmit={onSearch} className="d-flex gap-2">
            <input
              className="form-control form-control-sm rounded-3"
              style={{ minWidth: 220 }}
              placeholder="✨ Semantic search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-outline-dark btn-sm rounded-3 px-3" disabled={searching}>
              {searching ? "…" : "Search"}
            </button>
            {matchIds != null && (
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => { setMatchIds(null); setQuery(""); }}>
                Clear
              </button>
            )}
          </form>
          <button type="button" className="btn btn-dark btn-sm rounded-3 px-3" onClick={scoreAll} disabled={scoringAll}>
            {scoringAll ? "Scoring…" : "✨ Score all"}
          </button>
        </div>
      </div>

      {(error || loadError) && <div className="alert alert-warning py-2 px-3 fz-font-md">{error || loadError}</div>}

      <form onSubmit={onAdd} className="bg-neutral-0 rounded-4 p-3 border-100 mb-4">
        <div className="row g-2">
          <div className="col-md-3"><input className="form-control rounded-3" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="col-md-3"><input className="form-control rounded-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control rounded-3" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="col-md-2">
            <select className="form-select rounded-3" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as ContactStage })}>
              {STAGES.map((s) => <option key={s} value={s} className="text-capitalize">{s}</option>)}
            </select>
          </div>
          <div className="col-md-1"><button type="submit" className="btn btn-dark w-100 rounded-3" disabled={saving}>Add</button></div>
        </div>
      </form>

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      ) : display.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">{matchIds != null ? "No matches." : "No contacts yet."}</div>
      ) : (
        <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden">
          <table className="table mb-0 align-middle">
            <thead>
              <tr className="fz-font-sm neutral-500">
                <th className="fw-500 py-3 ps-4">Name</th>
                <th className="fw-500 py-3">Stage</th>
                <th className="fw-500 py-3 text-center">Lead</th>
                <th className="fw-500 py-3 text-center">Churn</th>
                <th className="fw-500 py-3 pe-4 text-end">AI</th>
              </tr>
            </thead>
            <tbody>
              {display.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 ps-4">
                    <div className="fw-600">{c.name}</div>
                    {c.ai_summary ? (
                      <div className="fz-font-sm neutral-500">{c.ai_summary}</div>
                    ) : (
                      c.company && <div className="fz-font-sm neutral-500">{c.company}</div>
                    )}
                  </td>
                  <td className="py-3">
                    <select
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
                  <td className="py-3 pe-4 text-end">
                    <button type="button" className="btn btn-link btn-sm p-0 me-3 text-decoration-none" onClick={() => scoreOne(c.id)} disabled={scoring[c.id]}>
                      {scoring[c.id] ? "…" : c.scored_at ? "Re-score" : "✨ Score"}
                    </button>
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => onDelete(c.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
