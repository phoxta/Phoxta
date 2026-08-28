import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Chip } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { PostDetail } from "./PostDetail";
import {
  type Limits, type SocialAccount, type SocialPlatform, type SocialPost,
  PLATFORM_NAMES, cancelSocialPost, deleteSocialPost, listSocialAccounts, listSocialPosts,
  refreshSocialInsights, retrySocialPost, sendSocialPostNow, updateSocialPost, writeSocialCaption, scheduleSocialPost,
} from "@/lib/db/ops/social";

/**
 * What is going out, what went out, and what did not.
 *
 * A scheduler people trust is one that shows its failures. Each post lists a
 * row per channel with that channel's own outcome, because they fail
 * separately — LinkedIn takes it, Instagram's token expired — and "failed" on
 * the whole post would be a lie about the two that worked.
 *
 * Retry only re-queues the channels that did not make it, and resets their
 * attempt count, so it cannot double-post to the ones that did.
 *
 * ── EDIT AND SEND NOW ──────────────────────────────────────────────────────
 *
 * Between scheduling a post and it going out there is a window in which the
 * only honest thing to do about a typo is fix it. Before this, the only way
 * was to cancel and rebuild the whole post, which meant re-rasterising the
 * picture to change a word — so people left the typo.
 *
 * Editing stops the moment any channel has published. From that point the
 * caption in the row is no longer a plan, it is the record of what is live,
 * and quietly rewriting it would leave the console describing a post that
 * says something else. The server enforces that; this only hides the button.
 *
 * Send now exists because a queue you cannot flush is a queue you cannot
 * verify. It does not publish from here: it asks the same worker the cron tick
 * asks, for one post.
 */
export function SocialQueue({ orgId }: { orgId: string }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  /** The post whose Send now is in flight, so only its own button says so. */
  const [sending, setSending] = useState<string | null>(null);
  /** Reading the counts from the platforms, which is not instant. */
  const [counting, setCounting] = useState(false);
  /** The post opened for a proper look — picture, caption, numbers, links. */
  const [viewing, setViewing] = useState<string | null>(null);

  // New Features State
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const insights = useMemo(() => {
    let totalLikes = 0;
    let totalComments = 0;
    let sentPostsCount = 0;
    let bestPostId = "";
    let bestPostCaption = "";
    let bestPostMedia = "";
    let maxEngagement = -1;

    posts.forEach(p => {
      let pLikes = 0;
      let pComments = 0;
      let isSent = false;
      (p.social_targets ?? []).forEach(t => {
        if (t.status === "sent") {
          isSent = true;
          if (t.likes) pLikes += t.likes;
          if (t.comments) pComments += t.comments;
        }
      });
      if (isSent) {
        sentPostsCount++;
        totalLikes += pLikes;
        totalComments += pComments;
        const engagement = pLikes + pComments;
        if (engagement > maxEngagement) {
          maxEngagement = engagement;
          bestPostId = p.id;
          bestPostCaption = p.caption;
          bestPostMedia = p.media_url;
        }
      }
    });
    return { totalLikes, totalComments, sentPostsCount, bestPostId, bestPostCaption, bestPostMedia };
  }, [posts]);

  const duplicatePost = async (p: SocialPost) => {
    setDuplicating(p.id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data, error } = await scheduleSocialPost(orgId, {
      designId: p.design_id || undefined,
      mediaUrl: p.media_url,
      caption: p.caption,
      scheduledAt: tomorrow.toISOString(),
      accountIds: [...new Set((p.social_targets ?? []).map(t => t.account_id).filter(Boolean))]
    });
    setDuplicating(null);
    if (error) return toastError(error);
    toast("Post duplicated! You can edit the new copy.");
    await load();
    if (data?.id) setEditing(data.id);
  };

  const load = useCallback(async () => {
    const { data, error } = await listSocialPosts(orgId);
    if (error) toastError(error);
    setPosts(data?.posts ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  /**
   * Read the counts once, for anything that has never been read.
   *
   * Refreshing on every render would spend the publishing allowance — that is
   * why it is a button. But a post whose numbers have NEVER been fetched shows
   * nothing at all, which reads as "this post got no engagement" rather than
   * "nobody has asked yet", and the button is easy to miss when you do not know
   * there is anything behind it. So the first read happens on its own, once per
   * visit, only for rows with no metrics_at, and silently. Everything after
   * that is still deliberate.
   */
  const firstRead = useRef(false);
  useEffect(() => {
    if (firstRead.current || loading) return;
    const unread = posts.some((p) =>
      (p.social_targets ?? []).some((t) => t.status === "sent" && t.metrics_at === null));
    if (!unread) return;
    firstRead.current = true;
    void (async () => {
      const { error } = await refreshSocialInsights(orgId);
      if (!error) await load();
    })();
  }, [posts, loading, orgId, load]);

  /**
   * Ask the platforms how the posts did.
   *
   * NOT done on load. Reading the queue must work when Instagram does not, and
   * these calls come out of the same hourly allowance that publishing spends —
   * a page that refreshed counts every time it opened could stop a business's
   * posts going out. So it is a button, it refreshes the stalest few, and it
   * leaves anything read in the last quarter of an hour alone.
   */
  const refreshCounts = async () => {
    setCounting(true);
    const { data, error } = await refreshSocialInsights(orgId);
    setCounting(false);
    if (error) return toastError(error);
    await load();
    if (!data) return;
    toast(
      data.refreshed === 0 && data.unknown === 0 ? "Already up to date."
        : data.unknown ? `Read ${data.refreshed}. ${data.unknown} would not say.`
        : `Read ${data.refreshed}.`,
    );
  };

  // The accounts are needed only by the editor, but fetching them when it opens
  // would put a spinner inside a panel that is meant to feel instant.
  useEffect(() => {
    void (async () => {
      const { data } = await listSocialAccounts(orgId);
      setAccounts(data?.accounts ?? []);
      setLimits(data?.limits ?? null);
    })();
  }, [orgId]);

  if (loading) return null;
  if (posts.length === 0) return null;

  /** Nothing has gone out yet, so the wording and the plan are still a plan. */
  const editable = (p: SocialPost) =>
    p.status !== "published" && p.status !== "cancelled" &&
    !(p.social_targets ?? []).some((t) => t.status === "sent" || t.status === "sending");

  /** Only a queued post has anything to flush; failed and part want Retry. */
  const sendable = (p: SocialPost) =>
    p.status === "queued" && (p.social_targets ?? []).some((t) => t.status === "pending");

  const sendNow = async (p: SocialPost) => {
    setSending(p.id);
    const { data, error } = await sendSocialPostNow(orgId, p.id);
    setSending(null);
    if (error) return toastError(error);
    if (!data) return;
    if (data.claimed === 0) return toastError(data.note || "There was nothing left to send.");
    const bits = [
      data.sent ? `${data.sent} sent` : "",
      data.simulated ? `${data.simulated} simulated` : "",
      data.failed ? `${data.failed} did not go` : "",
    ].filter(Boolean);
    toast(bits.length ? bits.join(", ") : "Sent.");
    void load();
  };

  return (
    <div className="soq-module">
      <div className="soq-top-bar">
        <div className="soq-top-text">
          <h2 className="soq-module-title">Social Queue</h2>
          <p className="soq-module-sub">Scheduled posts deploy automatically on a five-minute tick.</p>
        </div>
        <div className="soq-top-actions">
          {posts.some((p) => (p.social_targets ?? []).some((t) => t.status === "sent")) && (
            <button type="button" className="soq-btn-outline" disabled={counting}
                    onClick={() => void refreshCounts()}>
              {counting ? "Reading metrics…" : "↻ Refresh metrics"}
            </button>
          )}
          <div className="soq-view-toggle">
            <button className={`soq-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>☰ List</button>
            <button className={`soq-toggle-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>⊞ Grid</button>
          </div>
        </div>
      </div>

      {insights.sentPostsCount > 0 && (
        <div className="soq-insights">
          <div className="soq-stat-card">
            <span className="soq-stat-label">Published</span>
            <span className="soq-stat-value">{insights.sentPostsCount} <span className="soq-stat-unit">posts</span></span>
          </div>
          <div className="soq-stat-card">
            <span className="soq-stat-label">Engagement</span>
            <span className="soq-stat-value">❤️ {insights.totalLikes} <span className="soq-stat-sep">·</span> 💬 {insights.totalComments}</span>
          </div>
          {insights.bestPostId && (
            <div className="soq-stat-card best-post" onClick={() => setViewing(insights.bestPostId)} title="View top post">
              <div className="soq-best-left">
                <span className="soq-stat-label">🔥 Top Performing Post</span>
                <span className="soq-best-caption">{insights.bestPostCaption}</span>
              </div>
              {insights.bestPostMedia && <img src={insights.bestPostMedia} alt="" className="soq-best-img" />}
            </div>
          )}
        </div>
      )}

      <div className={`soq-layout is-${viewMode}`}>
        {posts.map((p) => {
          const isFailed = p.status === "failed";
          const isSent = p.status === "published";
          const isPart = p.status === "part";

          if (viewMode === "grid") {
            return (
              <div key={p.id} className="soq-grid-item" onClick={() => setViewing(p.id)}>
                {p.media_url ? <img src={p.media_url} alt="" className="soq-grid-img" /> : <div className="soq-grid-placeholder" />}
                <div className="soq-grid-overlay">
                  <div className="soq-grid-status">
                    <Chip tone={isSent ? "ok" : isFailed ? "danger" : isPart ? "warn" : "line"}>{p.status}</Chip>
                  </div>
                  <div className="soq-grid-metrics">
                    {(() => {
                       let l = 0, c = 0;
                       (p.social_targets ?? []).forEach(t => { l += (t.likes || 0); c += (t.comments || 0); });
                       return l > 0 || c > 0 ? <span>❤️ {l} 💬 {c}</span> : <span>View</span>;
                    })()}
                  </div>
                </div>
                {viewing === p.id && (
                   <div className="soq-expand-panel" onClick={(e) => e.stopPropagation()}>
                     <PostDetail post={p} onClose={() => setViewing(null)} />
                   </div>
                )}
              </div>
            );
          }

          return (
            <div key={p.id} className={`soq-card is-${p.status}`}>
              <div className="soq-card-inner">
                {p.media_url
                  ? <img className="soq-art" src={p.media_url} alt="" loading="lazy" />
                  : <div className="soq-art-placeholder" />}
                
                <div className="soq-main">
                  <div className="soq-when">
                    <span className="soq-date">
                      {new Date(p.scheduled_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Chip tone={isSent ? "ok" : isFailed ? "danger" : isPart ? "warn" : "line"}>
                      {isPart ? "partly out" : p.status}
                    </Chip>
                  </div>
                  <div className="soq-cap">{p.caption || <em>No caption</em>}</div>
                  
                  <div className="soq-channels">
                    {(p.social_targets ?? []).map((t) => (
                      <span key={t.id} className={`soq-target is-${t.status}`} title={t.error || undefined}>
                        {PLATFORM_NAMES[t.platform] ?? t.platform}
                        {t.permalink && <a href={t.permalink} target="_blank" rel="noreferrer" className="soq-link-icon"> ↗</a>}
                        {t.status === "failed" && " ⚠️"}
                        {t.status === "sent" && (t.likes !== null || t.comments !== null) && (
                          <b className="soq-metrics" title={t.metrics_at ? `As of ${new Date(t.metrics_at).toLocaleString("en-GB")}` : undefined}>
                            {t.likes !== null && <span>♥ {t.likes}</span>}
                            {t.comments !== null && <span>💬 {t.comments}</span>}
                          </b>
                        )}
                      </span>
                    ))}
                  </div>
                  
                  {(p.social_targets ?? []).filter((t) => t.error).map((t) => (
                    <div key={t.id + "-e"} className="soq-err">
                      {PLATFORM_NAMES[t.platform]}: {t.error}
                    </div>
                  ))}
                </div>

                <div className="soq-acts">
                  <button type="button" className="soq-btn-ghost" onClick={() => setViewing((v) => (v === p.id ? null : p.id))}>
                    {viewing === p.id ? "Close" : "View"}
                  </button>
                  
                  <button type="button" className="soq-btn-ghost" disabled={duplicating === p.id} onClick={() => void duplicatePost(p)}>
                    {duplicating === p.id ? "..." : "Duplicate"}
                  </button>

                  {sendable(p) && (
                    <button type="button" className="soq-btn-ghost" disabled={sending === p.id} onClick={() => void sendNow(p)}>
                      {sending === p.id ? "Sending…" : "Send now"}
                    </button>
                  )}
                  
                  {editable(p) && (
                    <button type="button" className="soq-btn-ghost" onClick={() => setEditing((e) => (e === p.id ? null : p.id))}>
                      {editing === p.id ? "Close" : "Edit"}
                    </button>
                  )}
                  
                  {(isFailed || isPart) && (
                    <button type="button" className="soq-btn-ghost retry" onClick={async () => {
                      const { error } = await retrySocialPost(orgId, p.id);
                      if (error) return toastError(error);
                      toast("Queued again — only the channels that failed.");
                      void load();
                    }}>Retry</button>
                  )}
                  
                  {p.status !== "published" && p.status !== "cancelled" && (
                    <button type="button" className="soq-btn-ghost danger" onClick={async () => {
                      if (!confirmDanger("Cancel this scheduled post?")) return;
                      const { error } = await cancelSocialPost(orgId, p.id);
                      if (error) return toastError(error);
                      toast("Cancelled.");
                      void load();
                    }}>Cancel</button>
                  )}
                  
                  {p.status === "cancelled" && (
                     <button type="button" className="soq-btn-ghost danger" onClick={async () => {
                       if (!confirmDanger("Permanently delete this cancelled post?")) return;
                       const { error } = await deleteSocialPost(orgId, p.id);
                       if (error) return toastError(error);
                       toast("Post deleted.");
                       void load();
                     }}>Delete</button>
                  )}
                </div>
              </div>

              {viewing === p.id && (
                <div className="soq-expand-panel">
                   <PostDetail post={p} onClose={() => setViewing(null)} />
                </div>
              )}

              {editing === p.id && (
                <div className="soq-expand-panel edit-panel">
                  <PostEditor
                    orgId={orgId}
                    post={p}
                    accounts={accounts}
                    limits={limits}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); void load(); }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

/**
 * The editor, opened in place under the post it belongs to.
 *
 * In place rather than in a modal because the thing being changed is right
 * there — the picture, the channels that failed, the caption that was too
 * long. A dialog would cover the evidence the person is editing against.
 *
 * The picture is NOT editable here. It was rasterised from the design at
 * scheduling time so that what was approved is what goes out, and offering to
 * swap it would quietly undo that guarantee. Changing the picture means
 * scheduling the design again.
 */
function PostEditor({ orgId, post, accounts, limits, onClose, onSaved }: {
  orgId: string;
  post: SocialPost;
  accounts: SocialAccount[];
  limits: Limits | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const usable = useMemo(() => accounts.filter((a) => a.status === "connected"), [accounts]);

  const [caption, setCaption] = useState(post.caption);
  const [when, setWhen] = useState(() => localIso(new Date(post.scheduled_at)));
  const [picked, setPicked] = useState<string[]>(
    () => (post.social_targets ?? []).map((t) => t.account_id).filter(Boolean),
  );
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [why, setWhy] = useState("");

  /** The tightest limit among the chosen channels — the one that will bite. */
  const cap = useMemo(() => {
    if (!limits || picked.length === 0) return null;
    return usable.filter((a) => picked.includes(a.id)).reduce<{ n: number; who: string } | null>((worst, a) => {
      const n = limits[a.platform]?.caption ?? 2200;
      return !worst || n < worst.n ? { n, who: PLATFORM_NAMES[a.platform] } : worst;
    }, null);
  }, [limits, picked, usable]);

  const over = cap ? caption.length - cap.n : 0;

  /**
   * A channel already on the post whose account has since expired.
   *
   * It cannot stay — the post would fail on it — and silently dropping it
   * would be a change the owner did not make, so it is named instead.
   */
  const orphaned = (post.social_targets ?? [])
    .filter((t) => t.account_id && !usable.some((a) => a.id === t.account_id))
    .map((t) => PLATFORM_NAMES[t.platform] ?? t.platform);

  const save = async () => {
    if (picked.length === 0) return toastError("Choose where it should go.");
    if (over > 0) return toastError(`That is ${over} characters too long for ${cap!.who}.`);
    setBusy(true);
    const at = new Date(when);
    const { error } = await updateSocialPost(orgId, {
      id: post.id, caption, scheduledAt: at.toISOString(), accountIds: picked,
    });
    setBusy(false);
    if (error) return toastError(error);
    toast(at.getTime() <= Date.now() ? "Saved — it goes out on the next tick." : `Saved for ${at.toLocaleString("en-GB")}.`);
    onSaved();
  };

  /** The same writer the schedule dialog uses, steered by the channels chosen
   *  here — which may not be the ones it was first written for. */
  const write = async () => {
    if (!post.design_id) return toastError("This post is not linked to a design, so there are no words to write from.");
    if (caption.trim() && !window.confirm("Replace what you have written?")) return;
    const platforms = usable.filter((a) => picked.includes(a.id)).map((a) => a.platform as SocialPlatform);
    setWriting(true);
    const { data, error } = await writeSocialCaption(orgId, { designId: post.design_id, platforms });
    setWriting(false);
    if (error) return toastError(error);
    if (!data) return;
    setCaption(data.full);
    setWhy(data.why);
  };

  return (
    <div className="soq__edit">
      <div className="emc__f">
        <span>Where</span>
        <div className="d-flex flex-wrap gap-2">
          {usable.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`hrx-seeall${picked.includes(a.id) ? " opx-solid" : ""}`}
              onClick={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}
            >
              {PLATFORM_NAMES[a.platform]}{a.handle ? ` · ${a.handle}` : ""}
            </button>
          ))}
        </div>
        {orphaned.length > 0 && (
          <em>{orphaned.join(", ")} needs reconnecting, so it will come off this post when you save.</em>
        )}
      </div>

      <label className="emc__f">
        <span>
          Caption
          {post.design_id && (
            <button type="button" className="emc__ai" onClick={() => void write()}
                    disabled={writing || busy} title="Write it from the words on the design">
              {writing ? "Writing…" : "Write it for me"}
            </button>
          )}
          {cap && (
            <span style={{ float: "right", fontWeight: 400, color: over > 0 ? "#D63D0B" : "var(--hrx-muted)" }}>
              {caption.length}/{cap.n} · {cap.who} is the tightest
            </span>
          )}
        </span>
        <textarea rows={5} value={caption}
                  onChange={(e) => { setCaption(e.target.value); if (why) setWhy(""); }}
                  placeholder="What the post says. The picture is the design." />
        {why && <em style={{ color: "var(--hrx-muted)" }}>{why}</em>}
      </label>

      <label className="emc__f">
        <span>When</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <em>The picture stays as it was rendered when this was scheduled.</em>
      </label>

      <div className="soq__edit-acts">
        <button type="button" className="dsn-btn" onClick={onClose} disabled={busy}>Discard</button>
        <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/** `datetime-local` wants the local wall clock, not an ISO instant. */
function localIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CSS = `
.soq-module { display: flex; flex-direction: column; gap: 20px; margin-top: 10px; }

/* Top Header */
.soq-top-bar { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; padding: 0 4px; }
.soq-module-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--hrx-ink); }
.soq-module-sub { font-size: 13px; color: var(--hrx-muted); margin: 4px 0 0; }
.soq-top-actions { display: flex; align-items: center; gap: 12px; }
.soq-btn-outline { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.soq-btn-outline:hover:not(:disabled) { background: #f9f9f9; border-color: #ccc; }
.soq-view-toggle { display: flex; background: #EBEBEB; padding: 3px; border-radius: 8px; }
.soq-toggle-btn { background: transparent; border: none; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #666; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.soq-toggle-btn.active { background: #fff; color: #111; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Insights Bar */
.soq-insights { display: flex; gap: 16px; flex-wrap: wrap; }
.soq-stat-card { background: #fff; border: 1px solid var(--hrx-border); border-radius: 12px; padding: 16px 20px; flex: 1; min-width: 200px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.soq-stat-label { font-size: 12px; font-weight: 600; color: var(--hrx-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.soq-stat-value { font-size: 24px; font-weight: 700; color: var(--hrx-ink); display: flex; align-items: baseline; gap: 4px; }
.soq-stat-unit { font-size: 14px; font-weight: 500; color: var(--hrx-muted); }
.soq-stat-sep { color: #ccc; margin: 0 4px; font-weight: 400; }
.soq-stat-card.best-post { flex: 2; flex-direction: row; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.2s; background: linear-gradient(145deg, #fff, #fafafa); }
.soq-stat-card.best-post:hover { border-color: #ccc; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.soq-best-left { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.soq-best-caption { font-size: 14px; line-height: 1.4; color: var(--hrx-ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-right: 16px; }
.soq-best-img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

/* Layouts */
.soq-layout { display: flex; flex-direction: column; gap: 12px; }
.soq-layout.is-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }

/* Grid Mode */
.soq-grid-item { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--hrx-soft); cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.soq-grid-img { width: 100%; height: 100%; object-fit: cover; }
.soq-grid-placeholder { width: 100%; height: 100%; background: var(--hrx-soft); }
.soq-grid-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; }
.soq-grid-item:hover .soq-grid-overlay { opacity: 1; }
.soq-grid-status { align-self: flex-end; }
.soq-grid-metrics { align-self: center; color: #fff; font-weight: 600; font-size: 14px; margin-top: auto; margin-bottom: auto; }

/* List Mode - Card Redesign */
.soq-card { background: #fff; border: 1px solid var(--hrx-border); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.02); transition: 0.2s; }
.soq-card:hover { border-color: #ddd; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.soq-card.is-failed { border-color: #f6cdba; background: #fffaf7; }
.soq-card.is-published { border-left: 3px solid #1a8a5a; }

.soq-card-inner { display: flex; gap: 16px; padding: 16px; }
.soq-art { width: 80px; height: 100px; object-fit: cover; border-radius: 8px; flex: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.soq-art-placeholder { width: 80px; height: 100px; border-radius: 8px; background: var(--hrx-soft); flex: none; }

.soq-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.soq-when { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.soq-date { font-size: 13px; font-weight: 600; color: var(--hrx-ink); }

.soq-cap { font-size: 14px; color: var(--hrx-muted); margin: 0 0 10px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5; }

.soq-channels { display: flex; flex-wrap: wrap; gap: 8px; }
.soq-target { font-size: 12px; padding: 4px 10px; border-radius: 20px; border: 1px solid var(--hrx-border); color: var(--hrx-muted); background: #fafafa; display: flex; align-items: center; gap: 4px; }
.soq-target.is-sent { border-color: #bfe3c8; color: #1c6b33; background: #f2fbf4; }
.soq-target.is-failed { border-color: #f6cdba; color: #8a3b12; background: #fff5f0; }
.soq-link-icon { text-decoration: none; color: inherit; opacity: 0.6; }
.soq-link-icon:hover { opacity: 1; }
.soq-metrics { display: flex; gap: 6px; margin-left: 6px; font-weight: 600; padding-left: 6px; border-left: 1px solid rgba(0,0,0,0.1); }

.soq-err { font-size: 12px; line-height: 1.5; color: #d32f2f; margin-top: 8px; background: #ffebee; padding: 6px 10px; border-radius: 6px; }

.soq-acts { display: flex; flex-direction: column; gap: 6px; flex: none; }
.soq-btn-ghost { background: transparent; border: 1px solid transparent; padding: 6px 12px; font-size: 13px; font-weight: 600; color: #555; border-radius: 8px; cursor: pointer; transition: 0.2s; text-align: center; }
.soq-btn-ghost:hover:not(:disabled) { background: #f0f0f0; color: #111; }
.soq-btn-ghost.retry { color: #8a3b12; }
.soq-btn-ghost.retry:hover { background: #fff5f0; }
.soq-btn-ghost.danger { color: #d32f2f; }
.soq-btn-ghost.danger:hover { background: #ffebee; }
.soq-btn-ghost:disabled { opacity: 0.5; cursor: wait; }

.soq-expand-panel { border-top: 1px dashed var(--hrx-border); padding: 16px; background: #fafafa; }
.soq-expand-panel.edit-panel { background: #fff; }

.soq__edit { display: flex; flex-direction: column; gap: 16px; }
.soq__edit .emc__f { margin-bottom: 0; }
.soq__edit-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

@media (max-width: 720px) {
  .soq-card-inner { flex-direction: column; }
  .soq-art { width: 100%; height: auto; aspect-ratio: 4/5; }
  .soq-acts { flex-direction: row; flex-wrap: wrap; }
  .soq-stat-card.best-post { flex-direction: column; align-items: flex-start; }
  .soq-best-img { align-self: flex-end; margin-top: -30px; }
}
`;
