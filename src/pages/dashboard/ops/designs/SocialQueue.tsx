import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Chip, Empty } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { PostDetail } from "./PostDetail";
import { SchedulePostForm, captionCap, localIso } from "./shared";
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

    posts.forEach((p) => {
      let pLikes = 0;
      let pComments = 0;
      let isSent = false;
      (p.social_targets ?? []).forEach((t) => {
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

  /**
   * Copy a post to tomorrow, as a starting point rather than a repost.
   *
   * The options come with it: dropping them silently stripped a duplicate's
   * Instagram collaborators, tags, alt text and story — the parts of the post
   * you cannot see in the list. And the caption is checked against the same
   * per-platform cap the schedule form applies, because the server refuses an
   * over-length caption and "duplicate failed" says nothing about why.
   */
  const duplicatePost = async (p: SocialPost) => {
    const accountIds = [...new Set((p.social_targets ?? []).map((t) => t.account_id).filter(Boolean))];
    const cap = captionCap(limits, accounts, accountIds);
    if (cap && p.caption.length > cap.n) {
      return toastError(`That caption is ${p.caption.length - cap.n} characters too long for ${cap.who}, so a copy cannot be queued as it is.`);
    }
    setDuplicating(p.id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data, error } = await scheduleSocialPost(orgId, {
      designId: p.design_id || undefined,
      mediaUrl: p.media_url,
      caption: p.caption,
      scheduledAt: tomorrow.toISOString(),
      accountIds,
      options: p.options ?? {},
    });
    setDuplicating(null);
    if (error) return toastError(error);
    toast("Duplicated — edit the new copy below.");
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
  if (posts.length === 0) {
    // Said rather than blank: a section that silently is not there reads as
    // broken to anyone who has just pressed Schedule for the first time.
    return (
      <Card title="Social queue">
        <Empty title="Nothing queued yet">
          Schedule a design from your library and it will appear here.
        </Empty>
      </Card>
    );
  }

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

  const viewingPost = posts.find((p) => p.id === viewing) ?? null;

  return (
    <div className="soq-module">
      <div className="soq-top-bar">
        <div className="soq-top-text">
          <h2 className="soq-module-title">Social queue</h2>
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
            <button className={`soq-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>List</button>
            <button className={`soq-toggle-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>Grid</button>
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
            <span className="soq-stat-value">
              {insights.totalLikes} <span className="soq-stat-unit">likes</span>
              <span className="soq-stat-sep">·</span>
              {insights.totalComments} <span className="soq-stat-unit">comments</span>
            </span>
          </div>
          {insights.bestPostId && (
            <div className="soq-stat-card best-post" onClick={() => setViewing(insights.bestPostId)} title="View top post">
              <div className="soq-best-left">
                <span className="soq-stat-label">Top performing post</span>
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
            // The detail does NOT open inside the tile: the tile is a square
            // with overflow hidden, so a panel in it renders as a clipped
            // corner of itself. It opens as a dialog below, outside the grid.
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
                       (p.social_targets ?? []).forEach((t) => { l += (t.likes || 0); c += (t.comments || 0); });
                       return l > 0 || c > 0 ? <span>{l} likes · {c} comments</span> : <span>View</span>;
                    })()}
                  </div>
                </div>
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
                        {t.status === "sent" && (t.likes !== null || t.comments !== null) && (
                          <b className="soq-metrics" title={t.metrics_at ? `As of ${new Date(t.metrics_at).toLocaleString("en-GB")}` : undefined}>
                            {t.likes !== null && <span>{t.likes} likes</span>}
                            {t.comments !== null && <span>{t.comments} comments</span>}
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
                    {duplicating === p.id ? "Duplicating…" : "Duplicate"}
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
                       toast("Deleted.");
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

      {/* Grid mode's detail, as a dialog over the page rather than inside an
          aspect-ratio:1 overflow:hidden tile — where it rendered as a clipped
          square of itself. List mode keeps its in-place expansion, because
          there the panel has the row's full width to open into. */}
      {viewMode === "grid" && viewingPost && (
        <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Post detail"
             onPointerDown={(e) => { if (e.target === e.currentTarget) setViewing(null); }}>
          <div className="dsn-modal__box soq-detail-dlg">
            <PostDetail post={viewingPost} onClose={() => setViewing(null)} />
          </div>
        </div>
      )}
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
 * The fields are SchedulePostForm, shared with the schedule dialog, so the
 * cap counter, the channel pills and the AI-caption button cannot drift from
 * the form that queued the post in the first place.
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

  const cap = useMemo(() => captionCap(limits, accounts, picked), [limits, accounts, picked]);
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
      // The stored options ride along unchanged: social-schedule rewrites the
      // whole options column on update, so omitting them here would strip a
      // post's Instagram collaborators for the crime of fixing a typo.
      options: post.options ?? {},
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
      <SchedulePostForm
        accounts={accounts}
        limits={limits}
        picked={picked}
        onPicked={setPicked}
        caption={caption}
        onCaption={(v) => { setCaption(v); if (why) setWhy(""); }}
        when={when}
        onWhen={setWhen}
        disabled={busy}
        onWrite={post.design_id ? () => void write() : undefined}
        writing={writing}
        why={why}
        whereNote={orphaned.length > 0
          ? `${orphaned.join(", ")} needs reconnecting, so it will come off this post when you save.`
          : undefined}
        whenNote="The picture stays as it was rendered when this was scheduled."
      />

      <div className="soq__edit-acts">
        <button type="button" className="dsn-btn" onClick={onClose} disabled={busy}>Discard</button>
        <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
