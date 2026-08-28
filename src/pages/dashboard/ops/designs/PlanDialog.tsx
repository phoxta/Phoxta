import { useCallback, useEffect, useState } from "react";
import { Chip } from "@/components/dash/Ui";
import { TEMPLATES } from "@/lib/designs/templates";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type ContentPlan, type PlannedPost,
  approveContentPlan, generateContentPlan, getContentPlan, listContentPlans,
  rejectContentPlan, renderPlannedDesign, updatePlannedPost,
} from "@/lib/db/ops/contentPlan";

/**
 * Planning a month, and reading it before it happens.
 *
 * THE WHOLE POINT IS THE SECOND SCREEN. Generating thirty posts is the easy
 * half; the half that decides whether anyone trusts it is being able to read
 * what was written, see the pictures, and say no. So the plan arrives as a
 * draft — its posts cannot publish — and this shows every one of them with the
 * words that will go out and the day they will go out on.
 *
 * PICTURES ARE RENDERED ON DEMAND. A planned post carries a design and no
 * picture: rendering thirty at planning time would spend a minute on images for
 * days that are weeks away, and most would be thrown out if the plan changed.
 * Pressing Preview renders one, through the same service the publisher uses on
 * the day — so what you preview is what will be posted.
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
  const [shots, setShots] = useState<Record<string, string>>({});
  const [rendering, setRendering] = useState<string | null>(null);

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
    setShots({});
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

  /** Feature: Granular Editing */
  const savePostEdit = async () => {
    if (!editingPost) return;
    setBusy(true);
    const { error } = await updatePlannedPost(editingPost.id, {
      caption: editCaption,
      scheduled_at: editDate
    });
    setBusy(false);
    
    if (error) return toastError(error);
    
    // Update local state to reflect change instantly without full refetch
    setPosts(prev => prev.map(p => 
      p.id === editingPost.id 
        ? { ...p, caption: editCaption, scheduled_at: editDate } 
        : p
    ));
    setEditingPost(null);
  };


  const preview = async (post: PlannedPost) => {
    if (!post.design_id) return;
    setRendering(post.id);
    const { url, error } = await renderPlannedDesign(orgId, post.design_id);
    setRendering(null);
    if (error) return toastError(error);
    if (url) setShots((s) => ({ ...s, [post.id]: url }));
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
        
        {/* Elegant Top Navigation */}
        <div className="pln-header">
          <div className="pln-header-left">
            {plan && (
               <button className="pln-back-btn" onClick={() => { setPlan(null); setPosts([]); }} title="Back to setup">
                 ←
               </button>
            )}
            <div>
              <h3 className="pln-header-title">{plan ? plan.title : "Plan Content with AI"}</h3>
              {plan && (
                <div className="pln-header-meta">
                   <Chip tone={plan.status === "approved" ? "ok" : plan.status === "rejected" ? "danger" : "warn"}>
                    {plan.status}
                  </Chip>
                  <span className="pln-header-date">
                     {plan.status === "draft" ? "Reviewing Draft" : plan.status === "approved" ? "Scheduled Pipeline" : "Set Aside"}
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
              {/* Left Column: Form Setup */}
              <div className="pln-setup-form">
                <div className="pln-form-card">
                  <div className="pln-form-section">
                    <div className="pln-form-icon">🎯</div>
                    <div className="pln-form-content">
                      <label className="pln-label">Core Objective</label>
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
                    <div className="pln-form-icon">📊</div>
                    <div className="pln-form-content">
                      <label className="pln-label">Strategy Mix</label>
                      <div className="pln-select-wrapper">
                        <select className="pln-select" value={contentMix} onChange={(e) => setContentMix(e.target.value)}>
                          <option value="Balanced (Mix of Education, Promotion, and Engagement)">Balanced Mix (Promo, Education, Engagement)</option>
                          <option value="Aggressive Sales (70% Promotional, 30% Education)">Aggressive Sales (70% Promo, 30% Ed)</option>
                          <option value="Brand Building (60% Behind-the-Scenes, 40% Education)">Brand Building (60% BTS, 40% Ed)</option>
                          <option value="Community Growth (80% Engagement/Questions, 20% Promo)">Community Growth (80% Engagement, 20% Promo)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pln-form-section">
                    <div className="pln-form-icon">⚙️</div>
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
                            <option value="vary">AI Selected Mix</option>
                            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="pln-param">
                          <span className="pln-param-lbl">Media</span>
                          <select className="pln-param-input pln-param-select" value={imagery} onChange={(e) => setImagery(e.target.value as "stock" | "generated")}>
                            <option value="stock">Stock Photos (Free)</option>
                            <option value="generated">AI Generated (Paid)</option>
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
                      <>✨ Generate {count} Posts</>
                    )}
                  </button>
                  <span className="pln-action-hint">No posts will be published until you approve the draft.</span>
                </div>
              </div>

              {/* Right Column: History */}
              <div className="pln-history-sidebar">
                <h4 className="pln-history-title">Previous Plans</h4>
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
              {/* Strategic Rationale Sidebar */}
              {plan.rationale && (
                 <div className="pln-rationale-panel">
                   <h4 className="pln-rationale-title">AI Strategy Brief</h4>
                   <p className="pln-rationale-text">{plan.rationale}</p>
                   
                   {plan.status === "draft" && (
                     <div className="pln-review-actions">
                       <button type="button" className="pln-btn-danger" onClick={() => void reject()} disabled={busy}>Discard Plan</button>
                       <button type="button" className="pln-btn-success" onClick={() => void approve()} disabled={busy}>
                         {busy ? "Approving..." : `Approve All ${posts.length} Posts`}
                       </button>
                     </div>
                   )}
                 </div>
              )}

              {/* Grid of Planned Posts */}
              <div className="pln-posts-grid">
                {loading ? (
                  <div className="pln-loading-pulse">Loading strategy...</div>
                ) : (
                  posts.map((p) => (
                    <div key={p.id} className="pln-post-card">
                      <div className="pln-post-media">
                        {shots[p.id] || p.media_url ? (
                          <img src={shots[p.id] || p.media_url} alt="Post preview" loading="lazy" />
                        ) : (
                          <button 
                            type="button" 
                            className="pln-preview-trigger" 
                            disabled={rendering === p.id}
                            onClick={() => void preview(p)}
                          >
                            <span className="pln-preview-icon">👁️</span>
                            {rendering === p.id ? "Rendering..." : "Generate Preview"}
                          </button>
                        )}
                        <div className="pln-post-platforms">
                          {[...new Set((p.social_targets ?? []).map((t) => t.platform))].map(plat => (
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
                               onChange={e => setEditDate(new Date(e.target.value).toISOString())} 
                               className="pln-edit-input"
                             />
                             <textarea 
                               value={editCaption} 
                               onChange={e => setEditCaption(e.target.value)} 
                               rows={4} 
                               className="pln-edit-textarea"
                             />
                             <div className="pln-edit-actions">
                               <button type="button" className="pln-btn-ghost" onClick={() => setEditingPost(null)}>Cancel</button>
                               <button type="button" className="pln-btn-save" onClick={savePostEdit}>Save Edits</button>
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
                                }}>✏️ Edit</button>
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
      <style>{CSS}</style>
    </div>
  );
}


const CSS = `
/* Overall Modal Reset */
.pln-modal-overlay { background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.pln-modal-box { background: #fff; border-radius: 20px; box-shadow: 0 24px 48px rgba(0,0,0,0.12); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; transition: max-width 0.3s ease; }

/* Header */
.pln-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #EBEBEB; background: #FAFAFA; }
.pln-header-left { display: flex; align-items: center; gap: 16px; }
.pln-back-btn { background: #fff; border: 1px solid #EBEBEB; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.pln-back-btn:hover { background: #f0f0f0; transform: scale(1.05); }
.pln-header-title { margin: 0; font-size: 18px; font-weight: 700; color: #111; letter-spacing: -0.01em; }
.pln-header-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 13px; }
.pln-header-date { color: #666; font-weight: 500; }

/* Scroll Body */
.pln-body-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; background: #fff; padding: 24px; }

/* ── SETUP SCREEN ── */
.pln-setup-grid { display: grid; grid-template-columns: 1fr 300px; gap: 32px; }

.pln-form-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); overflow: hidden; }
.pln-form-section { display: flex; gap: 16px; padding: 24px; border-bottom: 1px solid #F5F5F5; }
.pln-form-section:last-child { border-bottom: none; }
.pln-form-icon { width: 40px; height: 40px; border-radius: 12px; background: #F7F7F7; display: flex; align-items: center; justify-content: center; font-size: 20px; flex: none; }
.pln-form-content { flex: 1; min-width: 0; }
.pln-label { display: block; font-weight: 600; font-size: 14px; color: #111; margin-bottom: 8px; }

.pln-textarea { width: 100%; border: 1px solid #EBEBEB; border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #111; background: #FAFAFA; resize: vertical; outline: none; transition: 0.2s; }
.pln-textarea:focus { background: #fff; border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }

.pln-select-wrapper { position: relative; }
.pln-select { width: 100%; border: 1px solid #EBEBEB; border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #111; background: #FAFAFA; outline: none; cursor: pointer; appearance: none; transition: 0.2s; }
.pln-select:focus { background: #fff; border-color: #111; }

.pln-params-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; }
.pln-param { display: flex; flex-direction: column; gap: 6px; }
.pln-param-lbl { font-size: 12px; color: #666; font-weight: 500; }
.pln-param-input { width: 100%; border: 1px solid #EBEBEB; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #111; background: #FAFAFA; outline: none; }
.pln-param-select { appearance: none; cursor: pointer; }

.pln-action-bar { margin-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.pln-btn-primary { background: #111; color: #fff; border: none; border-radius: 30px; padding: 16px 32px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; max-width: 400px; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
.pln-btn-primary:hover:not(:disabled) { background: #000; transform: translateY(-1px); box-shadow: 0 12px 20px rgba(0,0,0,0.15); }
.pln-btn-primary:disabled { opacity: 0.8; cursor: wait; }
.pln-action-hint { font-size: 12px; color: #888; text-align: center; }

.pln-history-sidebar { background: #FAFAFA; border-radius: 16px; padding: 20px; border: 1px solid #EBEBEB; height: fit-content; }
.pln-history-title { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #111; letter-spacing: 0.02em; text-transform: uppercase; }
.pln-history-list { display: flex; flex-direction: column; gap: 8px; }
.pln-history-item { text-align: left; background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; padding: 12px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
.pln-history-item:hover { border-color: #ccc; transform: translateX(2px); }
.pln-hi-top { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #111; }
.pln-hi-bot { font-size: 12px; color: #888; }
.pln-empty-state { font-size: 13px; color: #888; text-align: center; padding: 20px 0; background: #fff; border-radius: 8px; border: 1px dashed #ddd; }

/* ── REVIEW SCREEN ── */
.pln-review-layout { display: grid; grid-template-columns: 280px 1fr; gap: 24px; }

.pln-rationale-panel { background: #fdfbf7; border: 1px solid #f0e6d2; border-radius: 16px; padding: 24px; height: fit-content; position: sticky; top: 0; }
.pln-rationale-title { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #8a6c32; }
.pln-rationale-text { font-size: 14px; line-height: 1.6; color: #5a4b2c; margin: 0 0 24px; white-space: pre-wrap; }
.pln-review-actions { display: flex; flex-direction: column; gap: 10px; }
.pln-btn-danger { background: #fff; color: #d32f2f; border: 1px solid #ffcdd2; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.pln-btn-danger:hover { background: #fff5f5; }
.pln-btn-success { background: #1a8a5a; color: #fff; border: none; border-radius: 8px; padding: 14px; font-weight: 600; font-size: 15px; cursor: pointer; box-shadow: 0 4px 12px rgba(26,138,90,0.2); transition: 0.2s; }
.pln-btn-success:hover { background: #14724a; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26,138,90,0.3); }

.pln-posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; align-content: start; }
.pln-post-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: transform 0.2s; }
.pln-post-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }

.pln-post-media { aspect-ratio: 4/5; background: #F7F7F7; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid #EBEBEB; }
.pln-post-media img { width: 100%; height: 100%; object-fit: cover; }
.pln-preview-trigger { background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); border: 1px solid rgba(0,0,0,0.1); border-radius: 30px; padding: 10px 20px; font-size: 13px; font-weight: 600; color: #111; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: 0.2s; }
.pln-preview-trigger:hover:not(:disabled) { background: #fff; transform: scale(1.05); }
.pln-plat-icon { position: absolute; top: 12px; right: 12px; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.pln-plat-icon.is-instagram { background: #E4405F; }
.pln-plat-icon.is-linkedin { background: #0A66C2; }
.pln-plat-icon.is-x { background: #000; }

.pln-post-content { padding: 16px; flex: 1; display: flex; flex-direction: column; }
.pln-post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.pln-post-date { font-size: 12px; font-weight: 600; color: #111; background: #F5F5F5; padding: 4px 10px; border-radius: 20px; }
.pln-edit-trigger { background: none; border: none; font-size: 12px; color: #666; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; }
.pln-edit-trigger:hover { background: #F5F5F5; color: #111; }
.pln-post-caption { font-size: 13px; line-height: 1.5; color: #444; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }

/* Inline Edit Form */
.pln-inline-edit { display: flex; flex-direction: column; gap: 10px; }
.pln-edit-input { width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 8px; font-size: 13px; font-family: inherit; }
.pln-edit-textarea { width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 8px; font-size: 13px; font-family: inherit; resize: vertical; }
.pln-edit-actions { display: flex; gap: 8px; justify-content: flex-end; }
.pln-btn-ghost { background: none; border: none; font-size: 13px; color: #666; cursor: pointer; padding: 6px 12px; }
.pln-btn-save { background: #111; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 16px; }

/* Loader Animation */
.pln-loader { display: flex; gap: 4px; }
.pln-loader span { width: 6px; height: 6px; background: #fff; border-radius: 50%; animation: plnBounce 1.4s infinite ease-in-out both; }
.pln-loader span:nth-child(1) { animation-delay: -0.32s; }
.pln-loader span:nth-child(2) { animation-delay: -0.16s; }
@keyframes plnBounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

@media (max-width: 900px) {
  .pln-setup-grid { grid-template-columns: 1fr; }
  .pln-review-layout { grid-template-columns: 1fr; }
  .pln-rationale-panel { position: static; }
}
`;
