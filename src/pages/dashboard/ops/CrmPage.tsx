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
import { CrmStats, StageBoard, type CrmSort } from "./crm/CrmBoard";
import "./crm.css";
import type { OpsContext } from "@/layouts/OperatingLayout";

const STAGES: ContactStage[] = ["lead", "prospect", "customer", "churned"];
const STAGE_STYLE: Record<ContactStage, string> = {
  lead: "bg-neutral-100 neutral-700",
  prospect: "bg-warning-subtle text-warning",
  customer: "bg-success-subtle text-success",
  churned: "bg-neutral-100 neutral-500",
};

const SCORE_CAP = 25;

const SORT_LABEL: Record<CrmSort, string> = { recent: "Sort by", value: "Value", score: "Score" };

const ico = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const SearchIcon = () => <svg {...ico}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>;
const SortIcon = () => <svg {...ico}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
const FilterIcon = () => <svg {...ico}><path d="M3 5h18l-7 8v5l-4 2v-7z" /></svg>;

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
  // Board view controls. The comp shows "Sort by" and "Filters" as menus; these
  // cycle instead, because two states each is the whole useful range here and a
  // menu for two options is furniture.
  const [sort, setSort] = useState<CrmSort>("recent");
  const [hotOnly, setHotOnly] = useState(false);
  const [adding, setAdding] = useState(false);

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
          org.currency || "GBP",
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
    <div className="crm">
      <div className="crm-bar">
        <h2 className="fz-font-lg fw-600 mb-0 me-2">Contacts</h2>
        <span className="fz-font-sm neutral-500">
          {loading
            ? "Loading…"
            : display.length === rows.length
              ? `${rows.length} contact${rows.length === 1 ? "" : "s"}`
              : `Showing ${display.length} of ${rows.length}`}
        </span>

        <span className="crm-bar__spacer" />

        <label className="crm-search">
          <SearchIcon />
          <input
            type="search"
            aria-label="Search contacts by name, email or company"
            placeholder="Search name, email, company…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setMatchIds(null);
            }}
          />
        </label>

        <button
          type="button"
          className="crm-tool"
          title="Smart search — finds contacts by meaning, not just matching text"
          onClick={onSemanticSearch}
          disabled={searching}
        >
          {searching ? "…" : "✨"} Smart
        </button>

        {matchIds != null && (
          <button type="button" className="crm-tool" onClick={() => setMatchIds(null)}>
            Clear
          </button>
        )}

        <button
          type="button"
          className="crm-tool"
          aria-pressed={sort === "value"}
          onClick={() => setSort((v) => (v === "recent" ? "value" : v === "value" ? "score" : "recent"))}
          title="Change the order cards appear in"
        >
          <SortIcon /> {SORT_LABEL[sort]}
        </button>

        <button
          type="button"
          className="crm-tool"
          aria-pressed={hotOnly}
          onClick={() => setHotOnly((v) => !v)}
          title="Show only contacts the lead score has flagged"
        >
          <FilterIcon /> {hotOnly ? "High score" : "Filters"}
        </button>

        <button type="button" className="crm-tool" onClick={exportCsv}>
          Export
        </button>

        <button
          type="button"
          className="crm-tool"
          onClick={scoreAll}
          disabled={scoreProgress != null}
          title={`Scores up to ${SCORE_CAP} unscored contacts per run`}
        >
          {scoreProgress ? `Scoring ${scoreProgress.done}/${scoreProgress.total}…` : "✨ Score all"}
        </button>

        <button type="button" className="crm-tool crm-tool--dark" onClick={() => setAdding((v) => !v)}>
          + Add customer
        </button>
      </div>

      {loadError && (
        <div className="alert alert-warning py-2 px-3 fz-font-md mb-0" role="alert">
          {loadError}
        </div>
      )}

      {adding && (
        <form onSubmit={onAdd} className="crm-panel">
          <h3 className="crm-panel__h">Add a contact</h3>
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
              <input id="crm-add-phone" className="form-control rounded-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label htmlFor="crm-add-company" className="form-label fz-font-sm neutral-500 mb-1">Company</label>
              <input id="crm-add-company" className="form-control rounded-3" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark btn-sm rounded-3 w-100 ops-tap" disabled={saving}>
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </form>
      )}

      <CrmStats rows={rows} currency={org.currency || "GBP"} />

      <StageBoard
        stages={STAGES}
        rows={display}
        sort={sort}
        hotOnly={hotOnly}
        currency={org.currency || "GBP"}
        onOpen={(c) => setOpenId(c.id)}
        onStage={onStage}
        onDelete={onDelete}
      />

      {open && (
        <ContactDrawer
          orgId={orgId}
          orgCurrency={org.currency || "GBP"}
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
