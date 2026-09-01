import { useCallback, useEffect, useState } from "react";
import { Chip } from "@/components/dash/Ui";
import { TEMPLATES } from "@/lib/designs/templates";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type ContentPlan, type PlannedPost,
  approveContentPlan, generateContentPlan, getContentPlan, listContentPlans,
  rejectContentPlan, updatePlannedPost,
} from "@/lib/db/ops/contentPlan";
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
export function PlanDialog({ orgId, open, onClose }: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [posts, setPosts] = useState<PlannedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Which posts have had Preview pressed — each is one designs-row fetch,
   *  so it stays a button rather than thirty automatic fetches per open. */
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});

  const [brief, setBrief] = useState("");
  const [contentMix, setContentMix] = useState("Balanced (Mix of Education, Promotion, and Engagement)");
  const [count, setCount] = useState(12);
  const [days, setDays] = useState(30);
  const [imagery, setImagery] = useState<"stock" | "generated">("stock");
  const [templateId, setTemplateId] = useState("vary");

  const [editingPost, setEditingPost] = useState<PlannedPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDate, setEditDate] = useState("");

  const loadList = useCallback(async () => {
    const { data, error } = await listContentPlans(orgId);
    if (error) toastError(error);
    setPlans(data?.plans ?? []);
  }, [orgId]);

  useEffect(() => { if (open) void loadList(); }, [open, loadList]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose, busy]);

  const openPlan = async (id: string) => {
    setLoading(true);
    const { data, error } = await getContentPlan(orgId, id);
    setLoading(false);
    if (error) return toastError(error);
    setPlan(data?.plan ?? null);
    setPosts(data?.posts ?? []);
    setPreviewing({});
  };

  const make = async () => {
    if (!brief.trim()) return toastError("Say what the month should be about.");
    setBusy(true);
    const fullBrief = `Strategy Mix: ${contentMix}.\n\nCore Objective: ${brief.trim()}`;
    const { data, error } = await generateContentPlan(orgId, {
      brief: fullBrief, days, posts: count, imagery, templateId,
    });
    setBusy(false);
    if (error) return toastError(error);
    if (!data) return;
    toast(`Planned ${data.posts} posts. Nothing goes out until you approve it.`);
    setBrief("");
    await loadList();
    await openPlan(data.planId);
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
          {!plan ? (
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
                        <div className="pln-param">
                          <span className="pln-param-lbl">Media</span>
                          <select className="pln-param-input pln-param-select" value={imagery} onChange={(e) => setImagery(e.target.value as "stock" | "generated")}>
                            <option value="stock">Stock photos (free)</option>
                            <option value="generated">Generated (paid)</option>
                          </select>
                        </div>
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
                                <button type="button" className="pln-edit-trigger" onClick={() => {
                                  setEditingPost(p); setEditCaption(p.caption); setEditDate(p.scheduled_at);
                                }}>Edit</button>
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
    </div>
  );
}
