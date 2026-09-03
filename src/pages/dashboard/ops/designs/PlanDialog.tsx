import { useCallback, useEffect, useRef, useState } from "react";
import { Chip } from "@/components/dash/Ui";
import { TEMPLATES } from "@/lib/designs/templates";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type ContentPlan, type Coverage, type PlanSection, type PlannedPost,
  approveContentPlan, createContentPlan, getContentPlan, getPlanSections, listContentPlans,
  rejectContentPlan, rewindPlan, runPlanStage, updatePlannedPost,
} from "@/lib/db/ops/contentPlan";
import { percentDone, stageSpec, type PlanStage } from "@/lib/content/stages";
import { getVoice, type VoiceRow } from "@/lib/db/ops/voice";
import type { Look } from "@/lib/db/ops/designReference";
import { PlanStrategy } from "./PlanStrategy";
import { VoiceDialog } from "./VoiceDialog";
import { LookDialog } from "./LookDialog";
import { DesignArt } from "./shared";

/**
 * Planning a month, and reading it before it happens.
 *
 * THE WHOLE POINT IS THE SECOND SCREEN. Generating thirty posts is the easy
 * half; the half that decides whether anyone trusts it is being able to read
 * what was written, see the pictures, and say no. So the plan arrives as a
 * draft — its posts cannot publish — and this shows every one of them with the
 * words that will go out and the day they will go out on.
 *
 * PICTURES ARE DRAWN ON DEMAND, IN THE BROWSER. A planned post carries a
 * design and no picture — the publisher renders on the day. Preview draws the
 * design document itself with the same DesignSvg the studio's editor and tiles
 * use, so what you look at is the design as it stands, with no render service
 * in the path (the one this used to call is unreachable in production, which
 * made every preview a spinner into an error).
 */
export function PlanDialog({ orgId, open, onClose, onEditDesign }: {
  orgId: string;
  open: boolean;
  onClose: () => void;
  /** Open a planned post's artwork in the editor. The plan writes the words
   *  AND the picture, so "the caption is right but the photo is wrong" needed
   *  somewhere to go — until now the only way in was to hunt the design down
   *  in the library by a title the planner chose. */
  onEditDesign?: (designId: string) => void;
}) {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [posts, setPosts] = useState<PlannedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Which posts have had Preview pressed — each is one designs-row fetch,
   *  so it stays a button rather than thirty automatic fetches per open. */
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});

  /** The chain: which stage is running, what it has read, what it dropped.
   *  `chainRef` is the cancel token — closing the dialog mid-run must stop the
   *  loop, not leave it spending in the background. Same shape as DossierPage. */
  const [running, setRunning] = useState<PlanStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  /** Set once the strategy is written: the chain pauses here for a human. */
  const [awaitingStrategy, setAwaitingStrategy] = useState(false);
  const [activePlanId, setActivePlanId] = useState("");
  const chainRef = useRef(0);

  const [brief, setBrief] = useState("");
  const [contentMix, setContentMix] = useState("Balanced (Mix of Education, Promotion, and Engagement)");
  const [count, setCount] = useState(12);
  const [days, setDays] = useState(30);
  const [templateId, setTemplateId] = useState("vary");

  /** Whether this business has a voice written down, shown on the setup screen
   *  so the state is visible before a month is commissioned rather than after. */
  const [voice, setVoice] = useState<VoiceRow | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  /** The art direction this month is made in. Chosen before anything is
   *  written, and carried in the plan's inputs — a look is per month, like the
   *  strategy, rather than a standing setting. */
  const [look, setLook] = useState<Look | null>(null);
  const [lookOpen, setLookOpen] = useState(false);

  const [editingPost, setEditingPost] = useState<PlannedPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDate, setEditDate] = useState("");

  const loadList = useCallback(async () => {
    const { data, error } = await listContentPlans(orgId);
    if (error) toastError(error);
    setPlans(data?.plans ?? []);
  }, [orgId]);

  useEffect(() => { if (open) void loadList(); }, [open, loadList]);

  // Re-read on every open and after the dialog closes, so approving a voice is
  // reflected here without a page reload.
  useEffect(() => {
    if (!open || voiceOpen) return;
    void getVoice(orgId).then(({ data }) => setVoice(data?.voice ?? null));
  }, [open, voiceOpen, orgId]);

  // Closing the dialog cancels the chain. Without this the loop keeps going
  // against a dialog nobody is looking at — every stage a real model call on
  // the tenant's bill, with the result written to a plan they walked away from.
  // The work already done is safe: each stage is committed as it finishes, so
  // reopening the plan resumes rather than restarts.
  useEffect(() => {
    if (open) return;
    chainRef.current += 1;
    setRunning(null);
    setAwaitingStrategy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose, busy]);

  const openPlan = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await getContentPlan(orgId, id);
    setLoading(false);
    if (error) return toastError(error);
    setPlan(data?.plan ?? null);
    setPosts(data?.posts ?? []);
    setPreviewing({});
  }, [orgId]);

  /**
   * Run the chain until it needs a person or runs out of stages.
   *
   * `stopAfterStrategy` is the whole reason this pauses: the owner reads the
   * strategy and says yes BEFORE thirty pieces of copy are written. Abandoning
   * here costs four model calls; abandoning after production costs the month.
   */
  const runChain = useCallback(async (planId: string, stopAfterStrategy: boolean, from: PlanStage) => {
    const token = ++chainRef.current;
    setBusy(true);
    // Show the progress screen BEFORE the first request returns. A stage takes
    // half a minute, and without this the dialog falls back to the setup form
    // for that whole time — which reads as "it forgot what I asked for".
    setRunning(from);
    setProgress(percentDone(from, 0, 0));
    try {
      for (let guard = 0; guard < 40; guard++) {
        if (chainRef.current !== token) return; // dialog closed, or a newer run started
        let { data, error } = await runPlanStage(orgId, planId);
        // One retry per stage. A model timeout mid-chain is transient and
        // common enough to be worth absorbing: every stage already written is
        // stored, so retrying costs one call rather than the month, and making
        // the owner press "generate" again would throw away four stages of
        // thinking to recover from a hiccup.
        if (error && chainRef.current === token) {
          await new Promise((r) => setTimeout(r, 2500));
          if (chainRef.current !== token) return;
          ({ data, error } = await runPlanStage(orgId, planId));
        }
        if (chainRef.current !== token) return;
        if (error) {
          toastError(`${error} — reopen the plan to pick up where it stopped.`);
          setRunning(null);
          await loadList();
          return;
        }
        if (!data) return;

        setRunning((data.next as PlanStage) ?? null);
        setProgress(percentDone((data.next as PlanStage) ?? null, data.total ?? 0, data.done ?? 0));
        if (data.coverage) setCoverage(data.coverage);
        // What the engine refused to accept from the model, said plainly — a
        // campaign quietly missing is worse than one that explains itself.
        if (data.dropped?.length) setDropped((d) => [...d, ...data.dropped!.map((x) => `${x.what}: ${x.why}`)]);

        const justFinished = data.stage;
        if (stopAfterStrategy && justFinished === "strategy") {
          const { data: rows } = await getPlanSections(orgId, planId);
          if (chainRef.current !== token) return;
          setSections(rows ?? []);
          setAwaitingStrategy(true);
          setRunning(null);
          return;
        }
        if (!data.next) {
          setRunning(null);
          toast("The month is written. Nothing goes out until you approve it.");
          await loadList();
          await openPlan(planId);
          return;
        }
      }
      toastError("That took more steps than expected — open the plan to see how far it got.");
    } finally {
      if (chainRef.current === token) setBusy(false);
    }
  }, [orgId, loadList, openPlan]);

  const make = async () => {
    if (!brief.trim()) return toastError("Say what the month should be about.");
    setBusy(true);
    setDropped([]);
    setCoverage([]);
    setSections([]);
    const { data, error } = await createContentPlan(orgId, {
      brief: `Strategy Mix: ${contentMix}.\n\nCore Objective: ${brief.trim()}`,
      days, posts: count, templateId,
      // The look travels with the plan rather than being applied afterwards:
      // production has to know the layout to pour each post into, and a month
      // half-made in one look and half in another is not a look.
      ...(look ? { look } : {}),
    });
    if (error) { setBusy(false); return toastError(error); }
    if (!data) { setBusy(false); return; }
    setActivePlanId(data.planId);
    setBrief("");
    await runChain(data.planId, true, "context");
  };

  /**
   * Save one post's words or day, through content-plan's own update action.
   *
   * The function is the only writer that works — social_posts is SELECT-only
   * under RLS, so the direct update this used to do matched nothing and the
   * old caption published — and its refusals are worth showing verbatim: a
   * 409 means the post is no longer a draft, a 400 means the caption is over
   * a platform's cap.
   */
  const savePostEdit = async () => {
    if (!editingPost || !plan) return;
    setBusy(true);
    const { post, error } = await updatePlannedPost(orgId, plan.id, editingPost.id, {
      caption: editCaption,
      scheduledAt: editDate,
    });
    setBusy(false);

    if (error) return toastError(error);

    // The server's row when it returned one, so what is shown is what was
    // stored; the local values only when it did not.
    setPosts((prev) => prev.map((p) =>
      p.id === editingPost.id
        ? (post ?? { ...p, caption: editCaption, scheduled_at: editDate })
        : p,
    ));
    setEditingPost(null);
  };

  const approve = async () => {
    if (!plan) return;
    if (!confirmDanger(`Approve "${plan.title}"? Its ${posts.length} posts will go out on the days shown.`)) return;
    setBusy(true);
    const { data, error } = await approveContentPlan(orgId, plan.id);
    setBusy(false);
    if (error) return toastError(error);
    toast(`${data?.queued ?? 0} posts queued.`);
    await loadList();
    await openPlan(plan.id);
  };

  const reject = async () => {
    if (!plan) return;
    setBusy(true);
    const { error } = await rejectContentPlan(orgId, plan.id);
    setBusy(false);
    if (error) return toastError(error);
    toast("Set aside. Nothing from it will go out.");
    await loadList();
    await openPlan(plan.id);
  };

  if (!open) return null;

  return (
    <div className="dsn-modal pln-modal-overlay" role="dialog" aria-modal="true" aria-label="Content plan"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box pln-modal-box" style={{ width: "min(960px, 96vw)", maxWidth: plan ? "1100px" : "960px" }}>

        <div className="pln-header">
          <div className="pln-header-left">
            {plan && (
               <button className="pln-back-btn" onClick={() => { setPlan(null); setPosts([]); }} title="Back to setup">
                 ←
               </button>
            )}
            <div>
              <h3 className="pln-header-title">{plan ? plan.title : "Plan a month of content"}</h3>
              {plan && (
                <div className="pln-header-meta">
                   <Chip tone={plan.status === "approved" ? "ok" : plan.status === "rejected" ? "danger" : "warn"}>
                    {plan.status}
                  </Chip>
                  <span className="pln-header-date">
                     {plan.status === "draft" ? "Reviewing draft" : plan.status === "approved" ? "Queued to publish" : "Set aside"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button type="button" className="dsn-x" onClick={onClose} disabled={busy}>×</button>
        </div>

        <div className="pln-body-scroll">
          {running ? (
            // A bar that names the work being done. "Writing it" for four
            // minutes reads as a hang, so production advances per batch.
            <div className="pln-running">
              <p className="pln-running-label">{stageSpec(running)?.label ?? "Working"}…</p>
              <p className="pln-running-desc">{stageSpec(running)?.description ?? ""}</p>
              <div className="pln-progress"><span style={{ width: `${Math.max(4, progress)}%` }} /></div>
              {coverage.filter((c) => c.rows > 0).length > 0 && (
                <p className="pln-running-read">
                  Read {coverage.filter((c) => c.rows > 0).map((c) => `${c.rows} ${c.source}`).join(", ")}.
                </p>
              )}
            </div>
          ) : awaitingStrategy ? (
            <>
              {/* What the engine refused to take from the model. A campaign
                  built on a discount this business is not running is dropped
                  in code, and saying so is the difference between a guardrail
                  and a silent edit. */}
              {dropped.length > 0 && (
                <div className="pln-dropped">
                  <p className="pln-dropped-title">Adjusted before you saw it</p>
                  <ul>{dropped.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}
              <PlanStrategy
              sections={sections}
              coverage={coverage}
              busy={busy}
              onApprove={() => { setAwaitingStrategy(false); void runChain(activePlanId, false, "calendar"); }}
              onChange={async (steer) => {
                setBusy(true);
                const { error } = await rewindPlan(orgId, activePlanId, "strategy");
                setBusy(false);
                if (error) return toastError(error);
                // The steer is kept with the plan's own brief so the rewrite
                // means what the owner just said, not what they said an hour ago.
                setAwaitingStrategy(false);
                setSections([]);
                toast(`Rethinking the strategy: ${steer}`);
                void runChain(activePlanId, true, "situation");
              }}
              />
            </>
          ) : !plan ? (
            <div className="pln-setup-grid">
              {/* Left column: the brief and its knobs */}
              <div className="pln-setup-form">
                <div className="pln-form-card">
                  <div className="pln-form-section">
                    <div className="pln-form-content">
                      <label className="pln-label">Core objective</label>
                      <textarea
                        className="pln-textarea"
                        rows={3}
                        value={brief}
                        onChange={(e) => setBrief(e.target.value)}
                        placeholder="e.g. Launching our new summer collection and educating customers on the sustainable materials..."
                      />
                    </div>
                  </div>

                  <div className="pln-form-section">
                    <div className="pln-form-content">
                      <label className="pln-label">Strategy mix</label>
                      <div className="pln-select-wrapper">
                        <select className="pln-select" value={contentMix} onChange={(e) => setContentMix(e.target.value)}>
                          <option value="Balanced (Mix of Education, Promotion, and Engagement)">Balanced mix (promo, education, engagement)</option>
                          <option value="Aggressive Sales (70% Promotional, 30% Education)">Aggressive sales (70% promo, 30% education)</option>
                          <option value="Brand Building (60% Behind-the-Scenes, 40% Education)">Brand building (60% behind-the-scenes, 40% education)</option>
                          <option value="Community Growth (80% Engagement/Questions, 20% Promo)">Community growth (80% engagement, 20% promo)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pln-form-section">
                    <div className="pln-form-content">
                      <label className="pln-label">Parameters</label>
                      <div className="pln-params-grid">
                        <div className="pln-param">
                          <span className="pln-param-lbl">Posts</span>
                          <input className="pln-param-input" type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                        </div>
                        <div className="pln-param">
                          <span className="pln-param-lbl">Days</span>
                          <input className="pln-param-input" type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} />
                        </div>
                        <div className="pln-param">
                          <span className="pln-param-lbl">Design</span>
                          <select className="pln-param-input pln-param-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                            <option value="vary">Varied — chosen per post</option>
                            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voice sits here rather than in brand settings because this
                      is the moment it matters and the moment it is believable:
                      an owner about to commission a month of writing will spend
                      a minute on how it should sound. Buried two menus away in
                      "Brand", it is a field nobody ever opens. */}
                  {/* The look sits beside the voice on purpose: they are the
                      two halves of "does this sound and look like us", and both
                      are decided before a month is commissioned rather than
                      discovered afterwards on thirty finished posts. */}
                  <div className="pln-form-section">
                    <div className="pln-form-content">
                      <label className="pln-label">How it looks</label>
                      <div className="pln-voice-row">
                        <button type="button" className="pln-btn-ghost" onClick={() => setLookOpen(true)}>
                          {look ? "Change the look" : "Choose a look"}
                        </button>
                        <span className="pln-voice-state">
                          {!look
                            ? "Not chosen — posts will use whichever built-in layout suits each one."
                            : look.doc
                              ? `Your own design, rebuilt — “${look.name}”. Every post this month is made in it.`
                              : `“${look.name}” — ${look.origin === "web" ? "direction taken from your reference" : "a suggested direction"}.`}
                        </span>
                        {look && (
                          <button type="button" className="pln-btn-ghost" onClick={() => setLook(null)}>Clear</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pln-form-section">
                    <div className="pln-form-content">
                      <label className="pln-label">How you sound</label>
                      <div className="pln-voice-row">
                        <button type="button" className="pln-btn-ghost" onClick={() => setVoiceOpen(true)}>
                          {voice ? "Review your voice" : "Work out how you sound"}
                        </button>
                        <span className="pln-voice-state">
                          {!voice
                            ? "Not written yet — everything will still get written, just in a more general voice."
                            : voice.status === "approved"
                              ? "Approved by you. Every post this month will match it."
                              : "A draft, inferred from your inbox and reviews. Worth two minutes."}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pln-action-bar">
                  <button type="button" className="pln-btn-primary" onClick={() => void make()} disabled={busy}>
                    {busy ? (
                      <span className="pln-loader"><span></span><span></span><span></span></span>
                    ) : (
                      <>Generate {count} posts</>
                    )}
                  </button>
                  <span className="pln-action-hint">No posts will be published until you approve the draft.</span>
                </div>
              </div>

              {/* Right column: history */}
              <div className="pln-history-sidebar">
                <h4 className="pln-history-title">Previous plans</h4>
                {plans.length === 0 ? (
                  <div className="pln-empty-state">No previous plans generated yet.</div>
                ) : (
                  <div className="pln-history-list">
                    {plans.map((p) => (
                      <button key={p.id} type="button" className="pln-history-item" onClick={() => void openPlan(p.id)}>
                        <div className="pln-hi-top">
                          <b>{p.title || "Untitled plan"}</b>
                          <Chip tone={p.status === "approved" ? "ok" : p.status === "rejected" ? "danger" : "line"}>{p.status}</Chip>
                        </div>
                        <div className="pln-hi-bot">
                          {new Date(p.starts_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {p.days} days
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pln-review-layout">
              {/* The planner's own reasoning, and the one decision */}
              {plan.rationale && (
                 <div className="pln-rationale-panel">
                   <h4 className="pln-rationale-title">The shape of the month</h4>
                   <p className="pln-rationale-text">{plan.rationale}</p>

                   {plan.status === "draft" && (
                     <div className="pln-review-actions">
                       <button type="button" className="pln-btn-danger" onClick={() => void reject()} disabled={busy}>Discard plan</button>
                       <button type="button" className="pln-btn-success" onClick={() => void approve()} disabled={busy}>
                         {busy ? "Approving…" : `Approve all ${posts.length} posts`}
                       </button>
                     </div>
                   )}
                 </div>
              )}

              {/* The posts themselves */}
              <div className="pln-posts-grid">
                {loading ? (
                  <div className="pln-loading-pulse">Loading the plan…</div>
                ) : (
                  posts.map((p) => (
                    <div key={p.id} className="pln-post-card">
                      <div className="pln-post-media">
                        {p.media_url ? (
                          <img src={p.media_url} alt="Post preview" loading="lazy" />
                        ) : p.design_id && previewing[p.id] ? (
                          <DesignArt designId={p.design_id} width={280} />
                        ) : p.design_id ? (
                          <button
                            type="button"
                            className="pln-preview-trigger"
                            onClick={() => setPreviewing((s) => ({ ...s, [p.id]: true }))}
                          >
                            Preview
                          </button>
                        ) : null}
                        <div className="pln-post-platforms">
                          {[...new Set((p.social_targets ?? []).map((t) => t.platform))].map((plat) => (
                             <span key={plat} className={`pln-plat-icon is-${plat}`} title={plat} />
                          ))}
                        </div>
                      </div>

                      <div className="pln-post-content">
                        {editingPost?.id === p.id ? (
                           <div className="pln-inline-edit">
                             <input
                               type="datetime-local"
                               value={editDate.slice(0, 16)}
                               onChange={(e) => setEditDate(new Date(e.target.value).toISOString())}
                               className="pln-edit-input"
                             />
                             <textarea
                               value={editCaption}
                               onChange={(e) => setEditCaption(e.target.value)}
                               rows={4}
                               className="pln-edit-textarea"
                             />
                             <div className="pln-edit-actions">
                               <button type="button" className="pln-btn-ghost" onClick={() => setEditingPost(null)}>Cancel</button>
                               <button type="button" className="pln-btn-save" onClick={savePostEdit} disabled={busy}>
                                 {busy ? "Saving…" : "Save edits"}
                               </button>
                             </div>
                           </div>
                        ) : (
                          <>
                            <div className="pln-post-header">
                              <span className="pln-post-date">
                                {new Date(p.scheduled_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {plan.status === "draft" && (
                                <span className="pln-post-acts">
                                  {onEditDesign && p.design_id && (
                                    <button type="button" className="pln-edit-trigger"
                                      onClick={() => onEditDesign(p.design_id!)}>Edit graphic</button>
                                  )}
                                  <button type="button" className="pln-edit-trigger" onClick={() => {
                                    setEditingPost(p); setEditCaption(p.caption); setEditDate(p.scheduled_at);
                                  }}>Edit words</button>
                                </span>
                              )}
                            </div>
                            <div className="pln-post-caption">{p.caption}</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <VoiceDialog orgId={orgId} open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      <LookDialog
        orgId={orgId}
        open={lookOpen}
        brief={brief}
        onClose={() => setLookOpen(false)}
        onChoose={setLook}
      />
    </div>
  );
}
