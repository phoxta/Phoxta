import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { Card, Chip, Empty, PageHeader } from "@/components/dash/Ui";
import { toast, toastError } from "@/lib/ops/feedback";
import { listIdeas, createIdea, deleteIdea, type Idea } from "@/lib/db/ideas";
import { readPendingValidatedIdea, clearPendingValidatedIdea } from "@/lib/ideas/pendingIdea";
import {
  ESTIMATED_SECONDS, TOTAL_STEPS, getCompletedSteps, humanDuration, progressPercent,
} from "@/lib/ideas/steps";

/**
 * Ideas — validate a business idea before building it.
 *
 * The run is minutes, not a programme: eight named steps, generated one after
 * another, ending in a report, a business plan and a landing page. So this page
 * leads with starting one rather than with a calendar.
 *
 * It also picks up an idea validated on the public site before signing up. That
 * sentence is the most valuable thing the marketing site produces and it lives
 * only in the visitor's browser until they land here, so it is offered as a
 * one-click start rather than asked for again.
 */

/* ── Icons (module-level, per house style) ─────────────────────────────── */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_PLUS = <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.2 3.5h1.6v5.7h5.7v1.6h-5.7v5.7H9.2v-5.7H3.5V9.2h5.7z" /></svg>;
const I_BULB = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" /></svg>;
const I_ARROW = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>;
const I_TRASH = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13" /></svg>;

function verdictTone(idea: Idea): "ok" | "warn" | "danger" | "blue" | "plain" {
  const verdict = String((idea.report as { verdict?: string } | null)?.verdict ?? "");
  if (verdict === "Pursue") return "ok";
  if (verdict === "Refine") return "warn";
  if (verdict === "Reconsider") return "danger";
  return idea.status === "completed" ? "blue" : "plain";
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [seed, setSeed] = useState("");
  const [saving, setSaving] = useState(false);
  // An idea validated on the public site, waiting to be claimed.
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
      // Claimed — it should not be offered again on the next visit.
      clearPendingValidatedIdea();
      setPending(null);
    }
    setSeed("");
    toast("Idea created. Run the validation when you are ready.");
    void load();
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
    <div>
      <PageMeta title="Phoxta - Ideas" />

      <PageHeader
        crumb="Portal"
        title="Ideas"
        note={`Validate a business idea before you build it — ${TOTAL_STEPS} steps, ${humanDuration(ESTIMATED_SECONDS)}.`}
      />

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">{error}</div>}

      {pending && (
        <Card title="You validated an idea on the site">
          <p className="fz-font-md neutral-700 mb-2">“{pending.ideaSeed}”</p>
          <p className="fz-font-sm neutral-500 mb-3">
            Pick up where you left off — the full run goes further than the preview did.
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-dark btn-sm rounded-3 ops-tap" disabled={saving}
                    onClick={() => start(pending.ideaSeed, true)}>
              {saving ? "Starting…" : "Continue this idea"}
            </button>
            <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                    onClick={() => { clearPendingValidatedIdea(); setPending(null); }}>
              Discard
            </button>
          </div>
        </Card>
      )}

      <Card title="Start a new idea">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void start(seed, false); }}>
          <label htmlFor="idea-seed" className="form-label fz-font-sm neutral-500 mb-1">
            Describe it in a sentence or two
          </label>
          <textarea
            id="idea-seed"
            className="form-control rounded-3 mb-2"
            rows={3}
            placeholder="A subscription box that delivers pre-portioned meal kits to UK households…"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button className="btn btn-dark btn-sm rounded-3 ops-tap" disabled={saving}>
              {I_PLUS} <span className="ms-1">{saving ? "Starting…" : "Create idea"}</span>
            </button>
            <span className="fz-font-sm neutral-500">
              Nothing is generated yet — you choose when to run it.
            </span>
          </div>
        </form>
      </Card>

      <Card title="Your ideas" right={<span className="fz-font-sm neutral-500">{ideas.length}</span>}>
        {loading ? (
          <p className="fz-font-md neutral-500 mb-0">Loading…</p>
        ) : ideas.length === 0 ? (
          <Empty icon={I_BULB} title="No ideas yet">
            Describe one above and Phoxta will research the market, test the demand and draft the plan.
          </Empty>
        ) : (
          <div className="d-flex flex-column gap-2">
            {ideas.map((idea) => {
              const done = getCompletedSteps(idea);
              const pct = progressPercent(done);
              const verdict = String((idea.report as { verdict?: string } | null)?.verdict ?? "");
              return (
                <div key={idea.id} className="hrx-row d-flex align-items-center gap-3 flex-wrap">
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <Link to={`/dashboard/ideas/${idea.id}`} className="fw-600 neutral-900 text-decoration-none d-block text-truncate">
                      {idea.title}
                    </Link>
                    <span className="fz-font-sm neutral-500 d-block text-truncate">{idea.idea_seed}</span>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    {verdict && <Chip tone={verdictTone(idea)}>{verdict}</Chip>}
                    <Chip tone={pct === 100 ? "ok" : "plain"}>
                      {done.length} of {TOTAL_STEPS}
                    </Chip>
                    <Link to={`/dashboard/ideas/${idea.id}`} className="btn btn-outline-dark btn-sm rounded-3 ops-tap">
                      Open {I_ARROW}
                    </Link>
                    <button type="button" className="btn btn-link btn-sm p-1 neutral-500 ops-tap"
                            aria-label={`Delete ${idea.title}`} onClick={() => void remove(idea)}>
                      {I_TRASH}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
