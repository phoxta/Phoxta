import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { Card, Chip, PageHeader } from "@/components/dash/Ui";
import { toast, toastError } from "@/lib/ops/feedback";
import { getIdea, runStep, type Idea } from "@/lib/db/ideas";
import {
  ESTIMATED_SECONDS, STEPS, TOTAL_STEPS, getCompletedSteps, humanDuration,
  nextStep, progressPercent, remainingSeconds, type IdeaStep,
} from "@/lib/ideas/steps";

/**
 * One idea, and the run that validates it.
 *
 * The chain is driven here, a step at a time, because the whole run is minutes
 * of model time and an edge function is killed at 150s idle — one request that
 * did all eight would die partway with some steps saved and nothing recording
 * where it stopped. Advancing one step per call also means a closed tab costs
 * one step, and reopening resumes from whatever is stored.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_BACK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_TICK = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const I_PLAY = <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z" /></svg>;

/** Renders whatever a step produced without needing a schema per step. */
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value)) {
    return (
      <ul className="mb-0 ps-3">
        {value.map((v, i) => <li key={i} className="fz-font-md neutral-700 mb-1"><Value value={v} /></li>)}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="d-flex flex-column gap-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="fz-font-sm neutral-500 text-capitalize">{k.replace(/([A-Z])/g, " $1").trim()}: </span>
            <span className="fz-font-md neutral-700"><Value value={v} /></span>
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
  // Set when the user asks for the whole chain; cleared to stop it.
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
    // Stop the chain if the page goes away mid-run.
    return () => { chainRef.current = false; };
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

  /** Run every remaining step in order, stopping on the first failure. */
  async function runAll() {
    chainRef.current = true;
    let step = upNext;
    while (step && chainRef.current) {
      const next: IdeaStep | null = await generate(step);
      if (!next) break;
      // Re-read from what is stored, so a step someone else finished is not redone.
      const fresh = await getIdea(id);
      const remaining = fresh.data ? nextStep(getCompletedSteps(fresh.data)) : null;
      step = remaining;
    }
    if (chainRef.current) toast("Validation complete.");
    chainRef.current = false;
  }

  if (loading) return <div className="fz-font-md neutral-500">Loading…</div>;

  if (!idea) {
    return (
      <div>
        <PageMeta title="Phoxta - Idea" />
        <Card>
          <p className="neutral-700 mb-3">{error ?? "That idea was not found."}</p>
          <Link to="/dashboard/ideas" className="btn btn-dark btn-sm rounded-3">Back to ideas</Link>
        </Card>
      </div>
    );
  }

  const report = (idea.report ?? null) as { verdict?: string; overallScore?: number; summary?: string } | null;

  return (
    <div>
      <PageMeta title={`Phoxta - ${idea.title}`} />

      <PageHeader
        crumb="Ideas"
        title={idea.title}
        note={idea.idea_seed}
        actions={
          <Link to="/dashboard/ideas" className="hrx-pill">{I_BACK} All ideas</Link>
        }
      />

      {idea.run_error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          The last run stopped: {idea.run_error}
        </div>
      )}

      <Card
        title="Validation run"
        right={<span className="fz-font-sm neutral-500">{done.length} of {TOTAL_STEPS}</span>}
      >
        <div className="progress mb-3" style={{ height: 6 }} role="img"
             aria-label={`${pct}% of the validation run complete`}>
          <div className="progress-bar bg-dark" style={{ width: `${pct}%` }} />
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
          {upNext ? (
            <>
              <button type="button" className="btn btn-dark btn-sm rounded-3 ops-tap"
                      disabled={running !== null} onClick={() => void runAll()}>
                {I_PLAY} <span className="ms-1">{running ? "Running…" : "Run the whole validation"}</span>
              </button>
              <span className="fz-font-sm neutral-500">
                {done.length === 0
                  ? humanDuration(ESTIMATED_SECONDS)
                  : `${humanDuration(remainingSeconds(done))} left`}
              </span>
              {running && (
                <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                        onClick={() => { chainRef.current = false; toast("Stopping after this step."); }}>
                  Stop after this step
                </button>
              )}
            </>
          ) : (
            <Chip tone="ok" icon={I_TICK}>Every step complete</Chip>
          )}
        </div>

        <div className="d-flex flex-column gap-2">
          {STEPS.map((spec) => {
            const complete = done.includes(spec.key);
            const isRunning = running === spec.key;
            const output = spec.key === "report" ? idea.report : (idea.ai_profile ?? {})[spec.key];
            return (
              <div key={spec.key} className="hrx-row">
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="flex-grow-1" style={{ minWidth: 0 }}>
                    <span className="fw-600 neutral-900 d-block">{spec.name}</span>
                    <span className="fz-font-sm neutral-500 d-block">{spec.description}</span>
                  </span>

                  <span className="d-flex align-items-center gap-2 flex-shrink-0">
                    <Chip tone={spec.group === "Validation" ? "blue" : spec.group === "Plan" ? "orange" : "plain"}>
                      {spec.group}
                    </Chip>
                    {complete ? (
                      <>
                        <Chip tone="ok" icon={I_TICK}>Done</Chip>
                        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none fz-font-sm ops-tap"
                                onClick={() => setOpen(open === spec.key ? null : spec.key)}>
                          {open === spec.key ? "Hide" : "View"}
                        </button>
                      </>
                    ) : isRunning ? (
                      <Chip tone="warn">Running…</Chip>
                    ) : (
                      <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                              disabled={running !== null}
                              onClick={() => void generate(spec.key)}>
                        Run this step
                      </button>
                    )}
                  </span>
                </div>

                {open === spec.key && output != null && (
                  <div className="mt-3 pt-3 border-top">
                    <Value value={output} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {report && (
        <Card title="Verdict">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
            {report.verdict && (
              <Chip tone={report.verdict === "Pursue" ? "ok" : report.verdict === "Refine" ? "warn" : "danger"}>
                {report.verdict}
              </Chip>
            )}
            {typeof report.overallScore === "number" && (
              <Chip tone="blue">{report.overallScore} / 10</Chip>
            )}
          </div>
          {report.summary && <p className="fz-font-md neutral-700 mb-0">{report.summary}</p>}
        </Card>
      )}
    </div>
  );
}
