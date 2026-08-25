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
 * Reproduces the earlier Next.js Phoxta's Ideas screen: the amber header tile,
 * four tinted stat pills, search and status tabs, and cards carrying a segmented
 * phase bar with the running step pulsing. That app was Tailwind and shadcn, so
 * the classes could not come across; ideas.css restates the same design, using
 * the palette values the original used rather than near-misses.
 *
 * What did change is the model underneath. There are no days — the run finishes
 * in minutes — so the bar segments steps and the pills count steps, not a
 * calendar.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_BULB = <svg width="20" height="20" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" /></svg>;
const I_CLOCK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const I_CHECK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" /></svg>;
const I_CHART = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
const I_ALERT = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
const I_SEARCH = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>;
const I_TARGET = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></svg>;
const I_ARROW = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const I_TRASH = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13" /></svg>;
const I_ROCKET = <svg width="30" height="30" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3c3.5 1.5 6 5 6 9l-3 3H9l-3-3c0-4 2.5-7.5 6-9Z" /><path d="M9 15l-2 5 4-2M15 15l2 5-4-2" /><circle cx="12" cy="10" r="1.6" /></svg>;
const I_PLUS = <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.2 3.5h1.6v5.7h5.7v1.6h-5.7v5.7H9.2v-5.7H3.5V9.2h5.7z" /></svg>;

type StatusFilter = "all" | "active" | "completed";

const STATUS_ICON: Record<string, React.ReactNode> = {
  active: I_CLOCK,
  completed: I_CHECK,
  archived: I_ALERT,
};

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

      <header className="idv-head">
        <span className="idv-head__icon">{I_BULB}</span>
        <div>
          <h1 className="idv-head__title">Idea Validator</h1>
          <p className="idv-head__sub">Research, test and plan a business idea in minutes.</p>
        </div>
        <div className="idv-head__actions">
          <button type="button" className="btn btn-dark btn-sm rounded-3 ops-tap" onClick={() => setShowNew((v) => !v)}>
            {I_PLUS} <span className="ms-1">New idea</span>
          </button>
        </div>
      </header>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">{error}</div>}

      <div className="idv-stats">
        <span className="idv-pill idv-pill--blue">{I_BULB} {stats.total} total</span>
        <span className="idv-pill idv-pill--amber">{I_CLOCK} {stats.active} in progress</span>
        <span className="idv-pill idv-pill--emerald">{I_CHECK} {stats.completed} completed</span>
        <span className="idv-pill idv-pill--purple">{I_CHART} {stats.avg}% avg progress</span>
      </div>

      {pending && (
        <div className="idv-card mb-3" style={{ cursor: "default" }}>
          <p className="idv-card__title mb-1">You validated this on the site</p>
          <p className="idv-card__meta mb-3">“{pending.ideaSeed}”</p>
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-dark btn-sm rounded-3 ops-tap" disabled={saving}
                    onClick={() => void start(pending.ideaSeed, true)}>
              {saving ? "Starting…" : "Continue this idea"}
            </button>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                    onClick={() => { clearPendingValidatedIdea(); setPending(null); }}>
              Discard
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <div className="idv-card mb-3" style={{ cursor: "default" }}>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void start(seed, false); }}>
            <label htmlFor="idv-seed" className="idv-step__desc mb-1">Describe the idea in a sentence or two</label>
            <textarea
              id="idv-seed"
              className="form-control rounded-3 mb-2"
              rows={3}
              placeholder="A subscription box that delivers pre-portioned meal kits to UK households…"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <button className="btn btn-dark btn-sm rounded-3 ops-tap" disabled={saving}>
              {saving ? "Creating…" : "Create idea"}
            </button>
          </form>
        </div>
      )}

      <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
        <label className="idv-pill flex-grow-1" style={{ maxWidth: 380, background: "var(--at-neutral-50)", borderColor: "transparent" }}>
          {I_SEARCH}
          <input
            type="search"
            aria-label="Search ideas"
            placeholder="Search ideas…"
            className="border-0 bg-transparent flex-grow-1"
            style={{ outline: "none", fontSize: 13, minWidth: 0 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="idv-filters">
          {(["all", "active", "completed"] as StatusFilter[]).map((f) => (
            <button key={f} type="button" className="idv-tab" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="fz-font-md neutral-500">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="idv-card" style={{ cursor: "default" }}>
          <div className="idv-empty">
            <span className="idv-empty__icon">{I_ROCKET}</span>
            <h3>{ideas.length === 0 ? "No ideas yet" : "No matching ideas"}</h3>
            <p>
              {ideas.length === 0
                ? "Describe a business idea and Phoxta will research the market, test the demand and draft the plan."
                : "Try a different search, or clear the filter."}
            </p>
            {ideas.length === 0 && (
              <button type="button" className="btn btn-dark btn-sm rounded-3 ops-tap" onClick={() => setShowNew(true)}>
                {I_PLUS} <span className="ms-1">Create your first idea</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {shown.map((idea) => {
            const done = getCompletedSteps(idea);
            const pct = progressPercent(done);
            const running = nextStep(done);
            return (
              <div
                key={idea.id}
                className="idv-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/dashboard/ideas/${idea.id}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/ideas/${idea.id}`); } }}
              >
                <div className="d-flex align-items-start gap-3">
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="idv-card__top">
                      <span className={`idv-badge idv-badge--${idea.status}`}>
                        {STATUS_ICON[idea.status]} {idea.status}
                      </span>
                      <span className="idv-card__date">{dateLabel(idea.created_at)}</span>
                    </div>

                    <h3 className="idv-card__title">{idea.idea_seed || idea.title}</h3>

                    {idea.target_audience && (
                      <p className="idv-card__meta">{I_TARGET} {idea.target_audience}</p>
                    )}

                    <div className="idv-progress__row">
                      <span>{done.length}/{TOTAL_STEPS} steps</span>
                      <b>{pct}%</b>
                    </div>

                    {/* One segment per step, grouped by phase — the original's
                        signature element. The step about to run pulses. */}
                    <div className="idv-bar">
                      {GROUPS.map((group) => (
                        <div key={group.name} className="idv-bar__group">
                          {group.steps.map((s) => {
                            const isDone = done.includes(s);
                            const isNext = running === s;
                            return (
                              <span
                                key={s}
                                className={`idv-seg${isDone || isNext ? ` idv-seg--${group.tone}` : ""}${isNext ? " idv-seg--current" : ""}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="idv-legend">
                      {GROUPS.map((group) => {
                        const all = group.steps.every((s) => done.includes(s));
                        return (
                          <span key={group.name}>
                            <i className={all ? `on-${group.tone}` : ""} />
                            {group.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="idv-card__actions">
                    <button type="button" className="idv-iconbtn" title="Open idea" aria-label={`Open ${idea.title}`}
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/ideas/${idea.id}`); }}>
                      {I_ARROW}
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
