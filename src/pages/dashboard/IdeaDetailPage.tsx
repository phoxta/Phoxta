import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { toast, toastError } from "@/lib/ops/feedback";
import { getIdea, runStep, type Idea } from "@/lib/db/ideas";
import {
  ESTIMATED_SECONDS, GROUPS, STEPS, TOTAL_STEPS, getCompletedSteps, humanDuration,
  nextStep, progressPercent, remainingSeconds, type IdeaStep,
} from "@/lib/ideas/steps";
import "./ideas.css";

/**
 * One idea, and the run that validates it.
 *
 * Reproduces the earlier Next.js Phoxta's idea detail screen — the segmented
 * phase bar, the per-step rows that fill in as they complete, and the verdict —
 * restated in ideas.css because that app was Tailwind and shadcn.
 *
 * The chain is driven here a step at a time. The whole run is minutes of model
 * time and an edge function is killed at 150s idle, so one request doing all
 * eight would die partway with some steps saved and nothing recording where it
 * stopped. Per-step means a closed tab costs one step, and reopening resumes.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_BACK = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_TICK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" /></svg>;
const I_CLOCK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const I_PLAY = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z" /></svg>;
const I_BULB = <svg width="20" height="20" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" /></svg>;

/** Renders whatever a step produced, without needing a schema for each one. */
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((v, i) => <li key={i}><Value value={v} /></li>)}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="d-flex flex-column gap-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="k">{k.replace(/([A-Z])/g, " $1").trim()}: </span>
            <Value value={v} />
          </div>
        ))}
      </div>
    );
  }

  return <>{String(value)}</>;
}

export default function IdeaDetailPage() {
  const { id = "" } = useParams();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState<IdeaStep | null>(null);
  const [open, setOpen] = useState<IdeaStep | null>(null);
  /** Set while the whole chain is requested; cleared to stop it. */
  const chainRef = useRef(false);

  const load = useCallback(async () => {
    const { data, error: err } = await getIdea(id);
    setIdea(data);
    setError(err ?? (data ? null : "That idea was not found."));
    setLoading(false);
    return data;
  }, [id]);

  useEffect(() => {
    void load();
    return () => { chainRef.current = false; }; // stop if the page goes away mid-run
  }, [load]);

  const done = idea ? getCompletedSteps(idea) : [];
  const pct = progressPercent(done);
  const upNext = nextStep(done);

  async function generate(step: IdeaStep): Promise<IdeaStep | null> {
    setRunning(step);
    const { next, error: err } = await runStep(id, step);
    setRunning(null);
    if (err) {
      chainRef.current = false;
      toastError(err);
      return null;
    }
    await load();
    setOpen(step);
    return next;
  }

  async function runAll() {
    chainRef.current = true;
    let step = upNext;
    while (step && chainRef.current) {
      const next = await generate(step);
      if (!next) break;
      // Re-read what is stored rather than trusting the loop, so nothing is
      // generated twice if another tab advanced the same idea.
      const fresh = await getIdea(id);
      step = fresh.data ? nextStep(getCompletedSteps(fresh.data)) : null;
    }
    if (chainRef.current) toast("Validation complete.");
    chainRef.current = false;
  }

  if (loading) return <div className="fz-font-md neutral-500">Loading…</div>;

  if (!idea) {
    return (
      <div className="idv">
        <PageMeta title="Phoxta - Idea" />
        <div className="idv-card" style={{ cursor: "default" }}>
          <p className="neutral-700 mb-3">{error ?? "That idea was not found."}</p>
          <Link to="/dashboard/ideas" className="btn btn-dark btn-sm rounded-3">Back to ideas</Link>
        </div>
      </div>
    );
  }

  const report = (idea.report ?? null) as { verdict?: string; overallScore?: number; summary?: string } | null;
  const verdictClass =
    report?.verdict === "Pursue" ? "idv-badge--completed"
      : report?.verdict === "Reconsider" ? "idv-badge--archived"
        : "idv-badge--active";

  return (
    <div className="idv">
      <PageMeta title={`Phoxta - ${idea.title}`} />

      <header className="idv-head">
        <span className="idv-head__icon">{I_BULB}</span>
        <div style={{ minWidth: 0 }}>
          <h1 className="idv-head__title">{idea.title}</h1>
          <p className="idv-head__sub">{idea.idea_seed}</p>
        </div>
        <div className="idv-head__actions">
          <Link to="/dashboard/ideas" className="btn btn-outline-dark btn-sm rounded-3">
            {I_BACK} <span className="ms-1">All ideas</span>
          </Link>
        </div>
      </header>

      {idea.run_error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          The last run stopped: {idea.run_error}
        </div>
      )}

      <div className="idv-card mb-3" style={{ cursor: "default" }}>
        <div className="idv-progress__row">
          <span>{done.length}/{TOTAL_STEPS} steps</span>
          <b>{pct}%</b>
        </div>

        <div className="idv-bar">
          {GROUPS.map((group) => (
            <div key={group.name} className="idv-bar__group">
              {group.steps.map((s) => {
                const isDone = done.includes(s);
                const isRunning = running === s;
                return (
                  <span
                    key={s}
                    className={`idv-seg${isDone || isRunning ? ` idv-seg--${group.tone}` : ""}${isRunning ? " idv-seg--current" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="idv-legend mb-3">
          {GROUPS.map((group) => (
            <span key={group.name}>
              <i className={group.steps.every((s) => done.includes(s)) ? `on-${group.tone}` : ""} />
              {group.name}
            </span>
          ))}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {upNext ? (
            <>
              <button type="button" className="btn btn-dark btn-sm rounded-3 ops-tap"
                      disabled={running !== null} onClick={() => void runAll()}>
                {I_PLAY} <span className="ms-1">{running ? "Running…" : "Run the whole validation"}</span>
              </button>
              <span className="idv-card__date">
                {done.length === 0 ? humanDuration(ESTIMATED_SECONDS) : `${humanDuration(remainingSeconds(done))} left`}
              </span>
              {running && (
                <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                        onClick={() => { chainRef.current = false; toast("Stopping after this step."); }}>
                  Stop after this step
                </button>
              )}
            </>
          ) : (
            <span className="idv-badge idv-badge--completed">{I_TICK} Every step complete</span>
          )}
        </div>
      </div>

      <div className="d-flex flex-column gap-2">
        {STEPS.map((spec) => {
          const complete = done.includes(spec.key);
          const isRunning = running === spec.key;
          const output = spec.key === "report" ? idea.report : (idea.ai_profile ?? {})[spec.key];
          return (
            <div key={spec.key} className={`idv-step${complete ? " idv-step--done" : isRunning ? " idv-step--running" : ""}`}>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className="idv-step__name">{spec.name}</span>
                  <span className="idv-step__desc">{spec.description}</span>
                </span>

                <span className="d-flex align-items-center gap-2 flex-shrink-0">
                  {complete ? (
                    <>
                      <span className="idv-badge idv-badge--completed">{I_TICK} Done</span>
                      <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none fz-font-sm ops-tap"
                              onClick={() => setOpen(open === spec.key ? null : spec.key)}>
                        {open === spec.key ? "Hide" : "View"}
                      </button>
                    </>
                  ) : isRunning ? (
                    <span className="idv-badge idv-badge--active">{I_CLOCK} Running…</span>
                  ) : (
                    <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                            disabled={running !== null} onClick={() => void generate(spec.key)}>
                      Run this step
                    </button>
                  )}
                </span>
              </div>

              {open === spec.key && output != null && (
                <div className="idv-out"><Value value={output} /></div>
              )}
            </div>
          );
        })}
      </div>

      {report && (
        <div className="idv-card mt-3" style={{ cursor: "default" }}>
          <div className="idv-card__top">
            {report.verdict && <span className={`idv-badge ${verdictClass}`}>{report.verdict}</span>}
            {typeof report.overallScore === "number" && (
              <span className="idv-pill idv-pill--purple">{report.overallScore} / 10</span>
            )}
          </div>
          {report.summary && <p className="idv-out mb-0" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>{report.summary}</p>}
        </div>
      )}
    </div>
  );
}
