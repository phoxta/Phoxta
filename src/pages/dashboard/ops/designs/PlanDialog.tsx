import { useCallback, useEffect, useState } from "react";
import { Chip } from "@/components/dash/Ui";
import { TEMPLATES } from "@/lib/designs/templates";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type ContentPlan, type PlannedPost,
  approveContentPlan, generateContentPlan, getContentPlan, listContentPlans,
  rejectContentPlan, renderPlannedDesign,
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
  const [count, setCount] = useState(12);
  const [days, setDays] = useState(30);
  const [imagery, setImagery] = useState<"stock" | "generated">("stock");
  const [templateId, setTemplateId] = useState("vary");

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
    const { data, error } = await generateContentPlan(orgId, {
      brief: brief.trim(), days, posts: count, imagery, templateId,
    });
    setBusy(false);
    if (error) return toastError(error);
    if (!data) return;
    toast(`Planned ${data.posts} posts. Nothing goes out until you approve it.`);
    setBrief("");
    await loadList();
    await openPlan(data.planId);
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
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Content plan"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg" style={{ width: "min(920px, 96vw)" }}>
        <h3 className="dsn-picker__t">{plan ? plan.title : "Plan a month"}</h3>

        <div className="dsn-brief-dlg__body">
          {!plan ? (
            <>
              <label className="emc__f">
                <span>What should this month be about?</span>
                <textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)}
                          placeholder="What you want the month to do — a launch, a season, the questions people keep asking." />
              </label>

              <div className="pln__row">
                <label className="emc__f">
                  <span>Posts</span>
                  <input type="number" min={1} max={30} value={count}
                         onChange={(e) => setCount(Number(e.target.value))} />
                </label>
                <label className="emc__f">
                  <span>Across</span>
                  <input type="number" min={1} max={60} value={days}
                         onChange={(e) => setDays(Number(e.target.value))} />
                  <em>days</em>
                </label>
                <label className="emc__f">
                  <span>Graphic</span>
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="vary">Mixed — one to suit each post</option>
                    {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <label className="emc__f">
                  <span>Pictures</span>
                  <select value={imagery} onChange={(e) => setImagery(e.target.value as "stock" | "generated")}>
                    <option value="stock">Real photographs (free)</option>
                    <option value="generated">Made to order (charged per picture)</option>
                  </select>
                </label>
              </div>
              <p className="dsn-note">
                It writes the posts, lays out the designs and finds or makes the pictures. Nothing goes
                out until you have read the month and approved it.
              </p>

              {plans.length > 0 && (
                <>
                  <h4 className="pln__h">Earlier plans</h4>
                  <div className="pln__list">
                    {plans.map((p) => (
                      <button key={p.id} type="button" className="pln__item" onClick={() => void openPlan(p.id)}>
                        <b>{p.title || "Untitled plan"}</b>
                        <Chip tone={p.status === "approved" ? "ok" : p.status === "rejected" ? "danger" : "line"}>
                          {p.status}
                        </Chip>
                        <span>{new Date(p.starts_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {p.days} days</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <button type="button" className="hrx-seeall" onClick={() => { setPlan(null); setPosts([]); }}>
                ← All plans
              </button>
              {plan.rationale && <p className="pln__why">{plan.rationale}</p>}
              <p className="dsn-note">
                <Chip tone={plan.status === "approved" ? "ok" : plan.status === "rejected" ? "danger" : "warn"}>
                  {plan.status}
                </Chip>{" "}
                {plan.status === "draft"
                  ? "Nothing here has gone out or will go out until you approve it."
                  : plan.status === "approved"
                    ? "These are queued and will go out on the days shown."
                    : "Set aside — nothing from it will go out."}
              </p>

              {loading ? <p className="dsn-note">Loading…</p> : (
                <div className="pln__posts">
                  {posts.map((p) => (
                    <div key={p.id} className="pln__post">
                      <div className="pln__shot">
                        {shots[p.id] || p.media_url ? (
                          <img src={shots[p.id] || p.media_url} alt="" width={110} height={138} loading="lazy" />
                        ) : (
                          <button type="button" className="hrx-seeall" disabled={rendering === p.id}
                                  onClick={() => void preview(p)}>
                            {rendering === p.id ? "Rendering…" : "Preview"}
                          </button>
                        )}
                      </div>
                      <div className="pln__body">
                        <div className="pln__when">
                          {new Date(p.scheduled_at).toLocaleString("en-GB", {
                            weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                          <span className="pln__ch">
                            {[...new Set((p.social_targets ?? []).map((t) => t.platform))].join(", ")}
                          </span>
                        </div>
                        <div className="pln__cap">{p.caption}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose} disabled={busy}>Close</button>
          {!plan ? (
            <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void make()} disabled={busy}>
              {busy ? "Planning…" : "Plan it"}
            </button>
          ) : plan.status === "draft" ? (
            <>
              <button type="button" className="dsn-btn" onClick={() => void reject()} disabled={busy}>Set aside</button>
              <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void approve()} disabled={busy}>
                {busy ? "Approving…" : `Approve all ${posts.length}`}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.pln__row{display:flex;gap:12px;flex-wrap:wrap}
.pln__row .emc__f{flex:1;min-width:130px}
.pln__h{font-size:13px;font-weight:600;margin:16px 0 8px;color:var(--hrx-ink)}
.pln__list{display:flex;flex-direction:column;gap:6px}
.pln__item{display:flex;align-items:center;gap:10px;text-align:left;padding:9px 12px;font:inherit;
           border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card);cursor:pointer;color:inherit}
.pln__item span{margin-left:auto;font-size:12.5px;color:var(--hrx-muted)}
.pln__why{font-size:13px;color:var(--hrx-muted);line-height:1.55;margin:8px 0 0}
.pln__posts{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.pln__post{display:flex;gap:12px;padding:10px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card)}
.pln__shot{width:110px;flex:none;display:flex;align-items:center;justify-content:center}
.pln__shot img{border-radius:8px;object-fit:cover;width:110px;height:auto}
.pln__body{flex:1;min-width:0}
.pln__when{font-size:12.5px;color:var(--hrx-muted);display:flex;gap:8px;flex-wrap:wrap}
.pln__ch{font-weight:600}
.pln__cap{font-size:13.5px;color:var(--hrx-ink);white-space:pre-wrap;margin-top:4px;line-height:1.5}
`;
