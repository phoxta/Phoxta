import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { toast, toastError } from "@/lib/ops/feedback";
import { getIdea, runStep, createSiteFromIdea, type Idea } from "@/lib/db/ideas";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  ESTIMATED_SECONDS, GROUPS, STEPS, TOTAL_STEPS, getCompletedSteps, humanDuration,
  nextStep, progressPercent, remainingSeconds, type IdeaStep,
} from "@/lib/ideas/steps";
import "./ideas.css";

/**
 * One idea, and the run that validates it.
 *
 * Built from Phoxta's own webpage vocabulary — at-btn with its text-swap and
 * double arrow, the fz-font-* type scale, neutral-* colour, the spacing scale —
 * rather than a look invented for this screen. ideas.css only supplies what
 * main.css has no equivalent for: the segmented phase bar and the tinted chips.
 *
 * The chain runs a step at a time. The whole run is minutes of model time and an
 * edge function is killed at 150s idle, so one request doing all eight would die
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

/** Renders whatever a step produced, without a schema for each one. */
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value)) {
    return <ul>{value.map((v, i) => <li key={i}><Value value={v} /></li>)}</ul>;
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
  const chainRef = useRef(false);

  // A Studio page belongs to a business; an idea is not one. The owner picks
  // which business the generated site lands in rather than it guessing.
  const { data: orgs = [] } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const [siteOrg, setSiteOrg] = useState("");
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<{ title: string; id: string }[]>([]);

  const load = useCallback(async () => {
    const { data, error: err } = await getIdea(id);
    setIdea(data);
    setError(err ?? (data ? null : "That idea was not found."));
    setLoading(false);
    return data;
  }, [id]);

  useEffect(() => {
    void load();
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
          <Link to="/dashboard/ideas" className="at-btn text-white rounded-0">
            <span><span className="text-1">BACK TO IDEAS</span><span className="text-2">BACK TO IDEAS</span></span>
            <i>{ARROW}{ARROW}</i>
          </Link>
        </div>
      </div>
    );
  }

  const report = (idea.report ?? null) as { verdict?: string; overallScore?: number; summary?: string } | null;
  const verdictTone =
    report?.verdict === "Pursue" ? "emerald" : report?.verdict === "Reconsider" ? "grey" : "amber";

  return (
    <div className="idv">
      <PageMeta title={`Phoxta - ${idea.title}`} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="row align-items-end pb-40">
        <div className="col-lg-8">
          <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">Idea Validator</span>
          <h1 className="fz-font-3xl fw-600 lh-1 neutral-900 mb-15">{idea.title}</h1>
          <p className="fz-font-md neutral-500 mb-0 text-truncate-2">{idea.idea_seed}</p>
        </div>
        <div className="col-lg-4 d-flex justify-content-lg-end mt-20 mt-lg-0">
          <Link to="/dashboard/ideas" className="at-btn common-black bg-transparent rounded-0 p-0">
            <span><span className="text-1">{I_BACK} ALL IDEAS</span><span className="text-2">{I_BACK} ALL IDEAS</span></span>
          </Link>
        </div>
      </div>

      {idea.run_error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          The last run stopped: {idea.run_error}
        </div>
      )}

      {/* ── Progress ───────────────────────────────────────────────────── */}
      <div className="bg-neutral-50 rounded-5 p-4 mb-30">
        <div className="d-flex align-items-baseline justify-content-between mb-15">
          <span className="fz-font-md neutral-500">{done.length} of {TOTAL_STEPS} steps</span>
          <span className="fz-font-2xl fw-600 neutral-900 lh-1">{pct}%</span>
        </div>

        <div className="idv-bar mb-15">
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

        <div className="idv-legend d-flex align-items-center gap-4 flex-wrap mb-30">
          {GROUPS.map((group) => (
            <span key={group.name} className="d-inline-flex align-items-center gap-2 fz-font-label neutral-500">
              <i className={group.steps.every((s) => done.includes(s)) ? `on-${group.tone}` : ""} />
              {group.name}
            </span>
          ))}
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          {upNext ? (
            <>
              <button type="button" className="at-btn text-white rounded-0" disabled={running !== null}
                      onClick={() => void runAll()}>
                <span>
                  <span className="text-1">{running ? "RUNNING…" : "RUN THE VALIDATION"}</span>
                  <span className="text-2">{running ? "RUNNING…" : "RUN THE VALIDATION"}</span>
                </span>
                <i>{ARROW}{ARROW}</i>
              </button>
              <span className="fz-font-md neutral-500">
                {done.length === 0 ? humanDuration(ESTIMATED_SECONDS) : `${humanDuration(remainingSeconds(done))} left`}
              </span>
              {running && (
                <button type="button" className="at-btn common-black bg-transparent rounded-0 p-0"
                        onClick={() => { chainRef.current = false; toast("Stopping after this step."); }}>
                  <span><span className="text-1">STOP AFTER THIS STEP</span><span className="text-2">STOP AFTER THIS STEP</span></span>
                </button>
              )}
            </>
          ) : (
            <span className="idv-chip idv-chip--emerald">{I_TICK} Every step complete</span>
          )}
        </div>
      </div>

      {/* ── Steps ──────────────────────────────────────────────────────── */}
      <div className="d-flex flex-column gap-3">
        {STEPS.map((spec) => {
          const complete = done.includes(spec.key);
          const isRunning = running === spec.key;
          const output = spec.key === "report" ? idea.report : (idea.ai_profile ?? {})[spec.key];
          return (
            <div key={spec.key}
                 className={`idv-step bg-neutral-0 rounded-5 p-4${complete ? " idv-step--done" : isRunning ? " idv-step--running" : ""}`}>
              <div className="row align-items-center g-3">
                <div className="col-md">
                  <h3 className="fz-font-lg fw-600 neutral-900 mb-0">{spec.name}</h3>
                  <p className="fz-font-md neutral-500 mb-0">{spec.description}</p>
                </div>
                <div className="col-md-auto d-flex align-items-center gap-3">
                  {complete ? (
                    <>
                      <span className="idv-chip idv-chip--emerald">{I_TICK} Done</span>
                      <button type="button" className="at-btn common-black bg-transparent rounded-0 p-0"
                              onClick={() => setOpen(open === spec.key ? null : spec.key)}>
                        <span>
                          <span className="text-1">{open === spec.key ? "HIDE" : "VIEW"}</span>
                          <span className="text-2">{open === spec.key ? "HIDE" : "VIEW"}</span>
                        </span>
                      </button>
                    </>
                  ) : isRunning ? (
                    <span className="idv-chip idv-chip--amber">{I_CLOCK} Running…</span>
                  ) : (
                    <button type="button" className="at-btn common-black bg-transparent rounded-0 p-0"
                            disabled={running !== null} onClick={() => void generate(spec.key)}>
                      <span><span className="text-1">RUN THIS STEP</span><span className="text-2">RUN THIS STEP</span></span>
                      <i>{ARROW}{ARROW}</i>
                    </button>
                  )}
                </div>
              </div>

              {open === spec.key && output != null && (
                <div className="idv-out fz-font-md neutral-700 mt-20 pt-20 border-top">
                  <Value value={output} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Website ────────────────────────────────────────────────────── */}
      {(idea.ai_profile ?? {}).website != null && (
        <div className="bg-neutral-50 rounded-5 p-4 mt-30">
          <h3 className="fz-font-lg fw-600 neutral-900 mb-10">Build the website</h3>
          <p className="fz-font-md neutral-500 mb-20">
            Assembles a multipage site from Phoxta&apos;s own section library and drops it into
            Studio, where you can edit and publish it like any other page.
          </p>

          {built.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {built.map((p) => (
                <Link key={p.id} to={`/studio/${siteOrg}/${p.id}`} className="fz-font-md neutral-900">
                  {p.title} — open in Studio
                </Link>
              ))}
            </div>
          ) : orgs.length === 0 ? (
            <p className="fz-font-md neutral-500 mb-0">
              You need a business before a site can be built into it.{" "}
              <Link to="/dashboard/marketplace" className="neutral-900">Browse the marketplace</Link>.
            </p>
          ) : (
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <label className="visually-hidden" htmlFor="idv-site-org">Business to build into</label>
              <select id="idv-site-org" className="form-select w-auto" value={siteOrg}
                      onChange={(e) => setSiteOrg(e.target.value)}>
                <option value="">Choose a business…</option>
                {orgs.map((o) => (
                  <option key={o.organization.id} value={o.organization.id}>{o.organization.name}</option>
                ))}
              </select>
              <button type="button" className="at-btn text-white rounded-0"
                      disabled={!siteOrg || building}
                      onClick={async () => {
                        setBuilding(true);
                        const { created, error: err } = await createSiteFromIdea(siteOrg, idea);
                        setBuilding(false);
                        setBuilt(created);
                        if (err) toastError(err);
                        else toast(`Built ${created.length} pages in Studio.`);
                      }}>
                <span>
                  <span className="text-1">{building ? "BUILDING…" : "BUILD THE SITE"}</span>
                  <span className="text-2">{building ? "BUILDING…" : "BUILD THE SITE"}</span>
                </span>
                <i>{ARROW}{ARROW}</i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Verdict ────────────────────────────────────────────────────── */}
      {report && (
        <div className="bg-neutral-900 rounded-5 p-5 mt-30">
          <div className="d-flex align-items-center gap-3 flex-wrap mb-20">
            <span className="fz-font-label text-uppercase text-white opacity-50">Verdict</span>
            {report.verdict && <span className={`idv-chip idv-chip--${verdictTone}`}>{report.verdict}</span>}
            {typeof report.overallScore === "number" && (
              <span className="fz-font-2xl fw-600 text-white lh-1">{report.overallScore}<span className="fz-font-md opacity-50"> / 10</span></span>
            )}
          </div>
          {report.summary && <p className="fz-font-lg text-white opacity-75 mb-0">{report.summary}</p>}
        </div>
      )}
    </div>
  );
}
