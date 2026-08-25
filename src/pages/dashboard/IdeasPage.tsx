import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { toast, toastError } from "@/lib/ops/feedback";
import { listIdeas, createIdea, deleteIdea, type Idea } from "@/lib/db/ideas";
import { readPendingValidatedIdea, clearPendingValidatedIdea } from "@/lib/ideas/pendingIdea";
import { GROUPS, TOTAL_STEPS, getCompletedSteps, nextStep, progressPercent } from "@/lib/ideas/steps";
import "./ideas.css";

/**
 * Idea Validator — the list.
 *
 * Built from Phoxta's own webpage vocabulary: at-btn and at-btn-group for
 * actions, the fz-font-* scale, neutral-* colour, spacing.css. ideas.css only
 * supplies what main.css has no equivalent for — the segmented phase bar, the
 * tinted chips and a ghost icon button.
 *
 * Note on at-btn: it is background:transparent, a TEXT button. The filled
 * primary comes from wrapping it in .at-btn-group, which is what supplies the
 * theme background and white text.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ARROW = (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M0.22 9.41a.75.75 0 1 0 1.06 1.06L.22 9.41ZM10.69.75a.75.75 0 0 0-.75-.75h-6.75a.75.75 0 0 0 0 1.5h6v6a.75.75 0 0 0 1.5 0V.75ZM.75 9.94l.53.53L10.47 1.28 9.94.75 9.41.22.22 9.41l.53.53Z" fill="currentColor" />
  </svg>
);

const I_BULB = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" /></svg>;
const I_CLOCK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const I_CHECK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" /></svg>;
const I_CHART = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
const I_ALERT = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
const I_TARGET = <svg width="13" height="13" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg>;
const I_ARROW_R = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const I_TRASH = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13" /></svg>;

type StatusFilter = "all" | "active" | "completed";

const STATUS_ICON: Record<string, React.ReactNode> = { active: I_CLOCK, completed: I_CHECK, archived: I_ALERT };
const STATUS_TONE: Record<string, string> = { active: "blue", completed: "emerald", archived: "grey" };

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function IdeasPage() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [seed, setSeed] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(() => readPendingValidatedIdea());

  const load = useCallback(async () => {
    const { data, error: err } = await listIdeas();
    setIdeas(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = ideas.length;
    const active = ideas.filter((i) => i.status === "active").length;
    const completed = ideas.filter((i) => i.status === "completed").length;
    const avg = total === 0 ? 0 : Math.round(ideas.reduce((s, i) => s + progressPercent(getCompletedSteps(i)), 0) / total);
    return { total, active, completed, avg };
  }, [ideas]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ideas.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      return i.title.toLowerCase().includes(q) || i.idea_seed.toLowerCase().includes(q);
    });
  }, [ideas, filter, query]);

  async function start(text: string, fromValidator: boolean) {
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      toastError("Describe the idea in a sentence or two first.");
      return;
    }
    setSaving(true);
    const { data, error: err } = await createIdea({ title: trimmed.slice(0, 60), ideaSeed: trimmed });
    setSaving(false);
    if (err || !data) {
      toastError(err ?? "Could not start that idea.");
      return;
    }
    if (fromValidator) {
      clearPendingValidatedIdea();
      setPending(null);
    }
    setSeed("");
    setShowNew(false);
    navigate(`/dashboard/ideas/${data.id}`);
  }

  async function remove(idea: Idea) {
    if (!window.confirm(`Delete "${idea.title}"? Everything generated for it goes too.`)) return;
    const { error: err } = await deleteIdea(idea.id);
    if (err) {
      toastError(err);
      return;
    }
    setIdeas((rows) => rows.filter((r) => r.id !== idea.id));
    toast("Idea deleted.");
  }

  return (
    <div className="idv">
      <PageMeta title="Phoxta - Idea Validator" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="row align-items-end pb-40">
        <div className="col-lg-7">
          <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">Idea Validator</span>
          <h1 className="fz-font-3xl fw-600 lh-1 neutral-900 mb-15">Validate before you build</h1>
          <p className="fz-font-md neutral-500 mb-0">
            Research the market, test the demand and draft the plan — in minutes.
          </p>
        </div>
        <div className="col-lg-5 d-flex justify-content-lg-end mt-20 mt-lg-0">
          <div className="at-btn-group">
            <button type="button" className="at-btn z-index-1" onClick={() => setShowNew((v) => !v)}>
              <span><span className="text-1">NEW IDEA</span><span className="text-2">NEW IDEA</span></span>
              <i>{ARROW}{ARROW}</i>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">{error}</div>}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-3 flex-wrap mb-30">
        <span className="idv-chip idv-chip--stat idv-chip--blue">{I_BULB} {stats.total} total</span>
        <span className="idv-chip idv-chip--stat idv-chip--amber">{I_CLOCK} {stats.active} in progress</span>
        <span className="idv-chip idv-chip--stat idv-chip--emerald">{I_CHECK} {stats.completed} completed</span>
        <span className="idv-chip idv-chip--stat idv-chip--purple">{I_CHART} {stats.avg}% avg progress</span>
      </div>

      {/* ── Claimed from the public validator ──────────────────────────── */}
      {pending && (
        <div className="bg-neutral-50 rounded-5 p-4 mb-30">
          <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">You validated this on the site</span>
          <p className="fz-font-lg neutral-900 mb-20">{pending.ideaSeed}</p>
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div className="at-btn-group">
              <button type="button" className="at-btn z-index-1" disabled={saving}
                      onClick={() => void start(pending.ideaSeed, true)}>
                <span>
                  <span className="text-1">{saving ? "STARTING…" : "CONTINUE THIS IDEA"}</span>
                  <span className="text-2">{saving ? "STARTING…" : "CONTINUE THIS IDEA"}</span>
                </span>
                <i>{ARROW}{ARROW}</i>
              </button>
            </div>
            <button type="button" className="at-btn common-black bg-transparent rounded-0 p-0"
                    onClick={() => { clearPendingValidatedIdea(); setPending(null); }}>
              <span><span className="text-1">DISCARD</span><span className="text-2">DISCARD</span></span>
            </button>
          </div>
        </div>
      )}

      {/* ── New idea ───────────────────────────────────────────────────── */}
      {showNew && (
        <div className="bg-neutral-50 rounded-5 p-4 mb-30">
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void start(seed, false); }}>
            <label htmlFor="idv-seed" className="fz-font-label text-uppercase neutral-500 d-block mb-10">
              Describe the idea in a sentence or two
            </label>
            <textarea
              id="idv-seed"
              className="form-control rounded-3 mb-20"
              rows={3}
              placeholder="A subscription box that delivers pre-portioned meal kits to UK households…"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <div className="at-btn-group">
              <button className="at-btn z-index-1" disabled={saving}>
                <span>
                  <span className="text-1">{saving ? "CREATING…" : "CREATE IDEA"}</span>
                  <span className="text-2">{saving ? "CREATING…" : "CREATE IDEA"}</span>
                </span>
                <i>{ARROW}{ARROW}</i>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search + filters ───────────────────────────────────────────── */}
      <div className="row g-3 align-items-center mb-30">
        <div className="col-md-6">
          <label className="visually-hidden" htmlFor="idv-search">Search ideas</label>
          <input id="idv-search" type="search" className="form-control rounded-3" placeholder="Search ideas…"
                 value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="col-md-6 d-flex gap-2 flex-wrap justify-content-md-end">
          {(["all", "active", "completed"] as StatusFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`btn btn-sm rounded-pill px-3 text-capitalize ${filter === f ? "btn-dark" : "btn-outline-dark"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="fz-font-md neutral-500">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="bg-neutral-50 rounded-5 p-5 text-center">
          <h3 className="fz-font-2xl fw-600 neutral-900 mb-10">
            {ideas.length === 0 ? "No ideas yet" : "No matching ideas"}
          </h3>
          <p className="fz-font-md neutral-500 mb-20">
            {ideas.length === 0
              ? "Describe a business idea and Phoxta will research the market, test the demand and draft the plan."
              : "Try a different search, or clear the filter."}
          </p>
          {ideas.length === 0 && (
            <div className="at-btn-group mx-auto">
              <button type="button" className="at-btn z-index-1" onClick={() => setShowNew(true)}>
                <span><span className="text-1">CREATE YOUR FIRST IDEA</span><span className="text-2">CREATE YOUR FIRST IDEA</span></span>
                <i>{ARROW}{ARROW}</i>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {shown.map((idea) => {
            const done = getCompletedSteps(idea);
            const pct = progressPercent(done);
            const upNext = nextStep(done);
            return (
              <div key={idea.id} className="idv-card bg-neutral-0 rounded-5 p-4"
                   role="button" tabIndex={0}
                   onClick={() => navigate(`/dashboard/ideas/${idea.id}`)}
                   onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/ideas/${idea.id}`); } }}>
                <div className="d-flex align-items-start gap-3">
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-3 flex-wrap mb-10">
                      <span className={`idv-chip idv-chip--${STATUS_TONE[idea.status] ?? "grey"}`}>
                        {STATUS_ICON[idea.status]} {idea.status}
                      </span>
                      <span className="fz-font-label neutral-500">{dateLabel(idea.created_at)}</span>
                    </div>

                    <h3 className="fz-font-lg fw-600 neutral-900 mb-10 text-truncate-2">
                      {idea.idea_seed || idea.title}
                    </h3>

                    {idea.target_audience && (
                      <p className="fz-font-md neutral-500 d-flex align-items-center gap-2 mb-15">
                        {I_TARGET} {idea.target_audience}
                      </p>
                    )}

                    <div className="d-flex align-items-baseline justify-content-between mb-10">
                      <span className="fz-font-label neutral-500">{done.length}/{TOTAL_STEPS} steps</span>
                      <span className="fz-font-label fw-600 neutral-900">{pct}%</span>
                    </div>

                    <div className="idv-bar mb-10">
                      {GROUPS.map((group) => (
                        <div key={group.name} className="idv-bar__group">
                          {group.steps.map((s) => {
                            const isDone = done.includes(s);
                            const isNext = upNext === s;
                            return (
                              <span key={s}
                                    className={`idv-seg${isDone || isNext ? ` idv-seg--${group.tone}` : ""}${isNext ? " idv-seg--current" : ""}`} />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="idv-legend d-flex align-items-center gap-4 flex-wrap">
                      {GROUPS.map((group) => (
                        <span key={group.name} className="d-inline-flex align-items-center gap-2 fz-font-label neutral-500">
                          <i className={group.steps.every((s) => done.includes(s)) ? `on-${group.tone}` : ""} />
                          {group.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 flex-shrink-0">
                    <button type="button" className="idv-iconbtn" title="Open idea" aria-label={`Open ${idea.title}`}
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/ideas/${idea.id}`); }}>
                      {I_ARROW_R}
                    </button>
                    <button type="button" className="idv-iconbtn idv-iconbtn--danger" title="Delete idea"
                            aria-label={`Delete ${idea.title}`}
                            onClick={(e) => { e.stopPropagation(); void remove(idea); }}>
                      {I_TRASH}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
