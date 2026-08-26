import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { toast, toastError } from "@/lib/ops/feedback";
import { getIdea, runStep, fillIdeaImages, type Idea } from "@/lib/db/ideas";
import {
  ESTIMATED_SECONDS, GROUPS, TOTAL_STEPS, getCompletedSteps, getStep, humanDuration,
  nextStep, progressPercent, remainingSeconds, stepIndex, type IdeaStep,
} from "@/lib/ideas/steps";
import StepSlide from "./ideas/StepSlide";
import "./ideas.css";

/**
 * One idea, and the run that validates it.
 *
 * The stages are a sidebar of tabs rather than a stack of expanding rows. Seven
 * slides in a column meant scrolling past everything already read to reach the
 * step still running, and the shape of the run — which phase a step belongs to,
 * what is done, what is next — lived only in a progress bar that scrolled away.
 * As tabs the whole run stays on screen and the pane shows exactly one stage.
 *
 * Built from Phoxta's own webpage vocabulary — at-btn with its text-swap and
 * double arrow, the fz-font-* type scale, neutral-* colour, the spacing scale.
 * ideas.css only supplies what main.css has no equivalent for.
 *
 * The chain runs a step at a time. The whole run is minutes of model time and an
 * edge function is killed at 150s idle, so one request doing all seven would die
 * partway with some steps saved and nothing recording where it stopped. Per-step
 * means a closed tab costs one step, and reopening resumes from what is stored.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ARROW = (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M0.22 9.41a.75.75 0 1 0 1.06 1.06L.22 9.41ZM10.69.75a.75.75 0 0 0-.75-.75h-6.75a.75.75 0 0 0 0 1.5h6v6a.75.75 0 0 0 1.5 0V.75ZM.75 9.94l.53.53L10.47 1.28 9.94.75 9.41.22.22 9.41l.53.53Z" fill="currentColor" />
  </svg>
);

const I_BACK = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_TICK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5L16 9.5" /></svg>;
const I_CLOCK = <svg viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const I_DECK = <svg width="14" height="14" viewBox="0 0 24 24" {...ln} aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1.5" /><path d="M12 17v3M8 20h8" /></svg>;

/** Any finished stage that named an image subject but has no picture yet. */
function needsImages(idea: Idea): boolean {
  const profile = (idea.ai_profile ?? {}) as Record<string, unknown>;
  const outputs = [...Object.values(profile), idea.report];
  return outputs.some((o) => {
    if (!o || typeof o !== "object") return false;
    const r = o as Record<string, unknown>;
    return typeof r.imageQuery === "string" && r.imageQuery.trim() !== "" && !r.image;
  });
}

export default function IdeaDetailPage() {
  const { ideaId: id = "" } = useParams();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState<IdeaStep | null>(null);
  const [tab, setTab] = useState<IdeaStep>("problem");
  const chainRef = useRef(false);
  // The tab follows the run once, on load. After that it follows the founder:
  // yanking the pane away mid-read because a background step finished would be
  // the kind of helpfulness nobody asked for.
  const tabPinned = useRef(false);
  // Once per mount. A search that finds nothing must not become a request on
  // every render for the rest of the session.
  const imagesTried = useRef(false);

  const load = useCallback(async () => {
    const { data, error: err } = await getIdea(id);
    setIdea(data);
    setError(err ?? (data ? null : "That idea was not found."));
    setLoading(false);
    return data;
  }, [id]);

  useEffect(() => {
    void (async () => {
      const data = await load();
      if (data && !tabPinned.current) {
        const complete = getCompletedSteps(data);
        setTab(complete.length > 0 ? complete[complete.length - 1] : "problem");
        tabPinned.current = true;
      }
      // Stages generated before idea-run resolved photographs have a subject but
      // no picture. Fill them once, quietly, and reload only if something landed
      // — a founder reading the slide should not see it flicker for nothing.
      if (data && needsImages(data) && !imagesTried.current) {
        imagesTried.current = true;
        const { filled } = await fillIdeaImages(data.id);
        if (filled > 0) await load();
      }
    })();
    return () => { chainRef.current = false; };
  }, [load]);

  const done = idea ? getCompletedSteps(idea) : [];
  const pct = progressPercent(done);
  const upNext = nextStep(done);
  const planReady = done.includes("strategy");

  async function generate(step: IdeaStep): Promise<IdeaStep | null> {
    setRunning(step);
    setTab(step);
    const { next, error: err } = await runStep(id, step);
    setRunning(null);
    if (err) {
      chainRef.current = false;
      toastError(err);
      return null;
    }
    await load();
    return next;
  }

  async function runAll() {
    chainRef.current = true;
    let step = upNext;
    while (step && chainRef.current) {
      const next = await generate(step);
      if (!next) break;
      // Re-read what is stored rather than trusting the loop, so nothing runs
      // twice if another tab advanced the same idea.
      const fresh = await getIdea(id);
      step = fresh.data ? nextStep(getCompletedSteps(fresh.data)) : null;
    }
    if (chainRef.current) toast("Validation complete.");
    chainRef.current = false;
  }

  if (loading) return <p className="fz-font-md neutral-500">Loading…</p>;

  if (!idea) {
    return (
      <div className="idv">
        <PageMeta title="Phoxta - Idea" />
        <div className="bg-neutral-0 rounded-5 p-5 idv-card" style={{ cursor: "default" }}>
          <p className="fz-font-lg neutral-700 mb-30">{error ?? "That idea was not found."}</p>
          <div className="at-btn-group">
            <Link to=".." relative="path" className="at-btn z-index-1">
              <span><span className="text-1">BACK TO IDEAS</span><span className="text-2">BACK TO IDEAS</span></span>
              <i>{ARROW}{ARROW}</i>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const report = (idea.report ?? null) as { verdict?: string; overallScore?: number } | null;
  const verdictTone =
    report?.verdict === "Pursue" ? "emerald" : report?.verdict === "Reconsider" ? "grey" : "amber";

  const spec = getStep(tab);
  const output = tab === "report" ? idea.report : (idea.ai_profile ?? {})[tab];
  const tabDone = done.includes(tab);

  return (
    <div className="idv">
      <PageMeta title={`Phoxta - ${idea.title}`} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="row align-items-end pb-30">
        <div className="col-lg-8">
          <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">Idea Validator</span>
          <h1 className="fz-font-3xl fw-600 lh-1 neutral-900 mb-15">{idea.title}</h1>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {report?.verdict && <span className={`idv-chip idv-chip--${verdictTone}`}>{report.verdict}</span>}
            {typeof report?.overallScore === "number" && (
              <span className="fz-font-md fw-600 neutral-900">{report.overallScore} / 10</span>
            )}
            <p className="fz-font-md neutral-500 mb-0 text-truncate-2">{idea.idea_seed}</p>
          </div>
        </div>
        <div className="col-lg-4 d-flex justify-content-lg-end mt-20 mt-lg-0">
          <Link to=".." relative="path" className="at-btn common-black bg-transparent rounded-0 p-0">
            <span><span className="text-1">{I_BACK} ALL IDEAS</span><span className="text-2">{I_BACK} ALL IDEAS</span></span>
          </Link>
        </div>
      </div>

      {idea.run_error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          The last run stopped: {idea.run_error}
        </div>
      )}

      <div className="row g-4">
        {/* ── Rail: progress, then the stages as tabs ──────────────────── */}
        <div className="col-lg-4 col-xl-3">
          <div className="idv-rail">
            <div className="bg-neutral-50 rounded-5 p-4 mb-20">
              <div className="d-flex align-items-baseline justify-content-between mb-15">
                <span className="fz-font-md neutral-500">{done.length} of {TOTAL_STEPS}</span>
                <span className="fz-font-2xl fw-600 neutral-900 lh-1">{pct}%</span>
              </div>

              <div className="idv-bar mb-20">
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

              {upNext ? (
                <>
                  <div className="at-btn-group">
                    <button type="button" className="at-btn z-index-1"
                            disabled={running !== null} onClick={() => void runAll()}>
                      <span>
                        <span className="text-1">{running ? "RUNNING…" : "RUN THE VALIDATION"}</span>
                        <span className="text-2">{running ? "RUNNING…" : "RUN THE VALIDATION"}</span>
                      </span>
                      <i>{ARROW}{ARROW}</i>
                    </button>
                  </div>
                  <p className="fz-font-md neutral-500 mt-15 mb-0">
                    {done.length === 0 ? humanDuration(ESTIMATED_SECONDS) : `${humanDuration(remainingSeconds(done))} left`}
                  </p>
                  {running && (
                    <button type="button" className="at-btn common-black bg-transparent rounded-0 p-0 mt-10"
                            onClick={() => { chainRef.current = false; toast("Stopping after this step."); }}>
                      <span><span className="text-1">STOP AFTER THIS STEP</span><span className="text-2">STOP AFTER THIS STEP</span></span>
                    </button>
                  )}
                </>
              ) : (
                <span className="idv-chip idv-chip--emerald">{I_TICK} Every stage complete</span>
              )}
            </div>

            <nav className="idv-tabs" aria-label="Validation stages">
              {GROUPS.map((group) => (
                <div key={group.name}>
                  <p className="idv-tabs__group">{group.name}</p>
                  {group.steps.map((key) => {
                    const s = getStep(key);
                    const isDone = done.includes(key);
                    const isRunning = running === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        aria-current={tab === key ? "true" : undefined}
                        className={`idv-tab${tab === key ? " idv-tab--on" : ""}`}
                      >
                        <span className={`idv-tab__dot${isRunning ? " is-running" : isDone ? ` is-done on-${group.tone}` : ""}`} />
                        <span className="idv-tab__n">{String(stepIndex(key) + 1).padStart(2, "0")}</span>
                        <span className="idv-tab__name">{s?.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}

              <p className="idv-tabs__group">Deliverable</p>
              {planReady ? (
                <Link to="plan" className="idv-tab">
                  <span className="idv-tab__dot is-done on-amber" />
                  <span className="idv-tab__n">{I_DECK}</span>
                  <span className="idv-tab__name">Business plan</span>
                </Link>
              ) : (
                <span className="idv-tab idv-tab--muted">
                  <span className="idv-tab__dot" />
                  <span className="idv-tab__n">{I_DECK}</span>
                  <span className="idv-tab__name">Business plan</span>
                </span>
              )}
            </nav>
          </div>
        </div>

        {/* ── Pane: the stage itself ───────────────────────────────────── */}
        <div className="col-lg-8 col-xl-9">
          {tabDone && output != null ? (
            <StepSlide step={tab} output={output} seed={`${idea.title} ${idea.idea_seed ?? ""}`} />
          ) : (
            <div className="bg-neutral-0 rounded-5 p-5 idv-step">
              <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">
                Stage {stepIndex(tab) + 1} of {TOTAL_STEPS} — {spec?.group}
              </span>
              <h2 className="fz-font-2xl fw-600 neutral-900 lh-1 mb-15">{spec?.name}</h2>
              <p className="fz-font-lg neutral-500 mb-30">{spec?.description}</p>

              {running === tab ? (
                <span className="idv-chip idv-chip--amber">{I_CLOCK} Running — {spec?.seconds}s or so</span>
              ) : (
                <div className="at-btn-group">
                  <button type="button" className="at-btn z-index-1"
                          disabled={running !== null} onClick={() => void generate(tab)}>
                    <span><span className="text-1">RUN THIS STAGE</span><span className="text-2">RUN THIS STAGE</span></span>
                    <i>{ARROW}{ARROW}</i>
                  </button>
                </div>
              )}
            </div>
          )}

          {planReady && tab === "strategy" && (
            <div className="bg-neutral-50 rounded-5 p-4 mt-20 d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <div>
                <h3 className="fz-font-lg fw-600 neutral-900 mb-1">The plan as a deck</h3>
                <p className="fz-font-md neutral-500 mb-0">
                  Everything above, laid out as slides you can print, save or send on.
                </p>
              </div>
              <div className="at-btn-group">
                <Link to="plan" className="at-btn z-index-1">
                  <span><span className="text-1">OPEN THE BUSINESS PLAN</span><span className="text-2">OPEN THE BUSINESS PLAN</span></span>
                  <i>{ARROW}{ARROW}</i>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
