import { useCallback, useEffect, useState } from "react";
import { Card, Chip } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type SocialPost, PLATFORM_NAMES, cancelSocialPost, listSocialPosts, retrySocialPost,
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
 */
export function SocialQueue({ orgId }: { orgId: string }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await listSocialPosts(orgId);
    if (error) toastError(error);
    setPosts(data?.posts ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return null;
  if (posts.length === 0) return null;

  return (
    <Card title="Scheduled">
      <p className="opx-note">
        Posts go out from the server on a five-minute tick, so they do not need this page — or any
        page — to be open.
      </p>
      <div className="soq">
        {posts.map((p) => (
          <div key={p.id} className="soq__row">
            {p.media_url
              ? <img className="soq__art" src={p.media_url} alt="" width={64} height={80} loading="lazy" />
              : <div className="soq__art" />}
            <div className="soq__main">
              <div className="soq__when">
                {new Date(p.scheduled_at).toLocaleString("en-GB", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
                <Chip tone={p.status === "published" ? "ok" : p.status === "failed" ? "danger" : p.status === "part" ? "warn" : "line"}>
                  {p.status === "part" ? "partly out" : p.status}
                </Chip>
              </div>
              <div className="soq__cap">{p.caption || <em>No caption</em>}</div>
              <div className="soq__ch">
                {(p.social_targets ?? []).map((t) => (
                  <span key={t.id} className={`soq__t is-${t.status}`} title={t.error || undefined}>
                    {PLATFORM_NAMES[t.platform] ?? t.platform}
                    {t.permalink && <a href={t.permalink} target="_blank" rel="noreferrer"> ↗</a>}
                    {t.status === "failed" && " — did not go"}
                  </span>
                ))}
              </div>
              {/* The reason, in full, not a tooltip nobody hovers. */}
              {(p.social_targets ?? []).filter((t) => t.error).map((t) => (
                <div key={t.id + "-e"} className="soq__err">
                  {PLATFORM_NAMES[t.platform]}: {t.error}
                </div>
              ))}
            </div>
            <div className="soq__acts">
              {(p.status === "failed" || p.status === "part") && (
                <button type="button" className="hrx-seeall" onClick={async () => {
                  const { error } = await retrySocialPost(orgId, p.id);
                  if (error) return toastError(error);
                  toast("Queued again — only the channels that failed.");
                  void load();
                }}>Retry</button>
              )}
              {p.status !== "published" && p.status !== "cancelled" && (
                <button type="button" className="hrx-seeall" onClick={async () => {
                  if (!confirmDanger("Cancel this scheduled post?")) return;
                  const { error } = await cancelSocialPost(orgId, p.id);
                  if (error) return toastError(error);
                  toast("Cancelled.");
                  void load();
                }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{CSS}</style>
    </Card>
  );
}

const CSS = `
.soq{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.soq__row{display:flex;gap:12px;padding:10px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card)}
.soq__art{width:64px;height:80px;object-fit:cover;border-radius:8px;background:var(--hrx-soft);flex:0 0 auto}
.soq__main{flex:1;min-width:0}
.soq__when{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--hrx-ink)}
.soq__cap{font-size:13px;color:var(--hrx-muted);margin:4px 0 6px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.soq__ch{display:flex;flex-wrap:wrap;gap:6px}
.soq__t{font-size:11.5px;padding:3px 8px;border-radius:50px;border:1px solid var(--hrx-border);color:var(--hrx-muted)}
.soq__t.is-sent{border-color:#bfe3c8;color:#1c6b33}
.soq__t.is-failed{border-color:#f6cdba;color:#8a3b12}
.soq__t a{text-decoration:none}
.soq__err{font-size:11.5px;line-height:1.45;color:#8a3b12;margin-top:5px}
.soq__acts{display:flex;flex-direction:column;gap:6px;flex:0 0 auto}
`;
