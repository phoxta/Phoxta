import { PLATFORM_NAMES, type SocialPost, type SocialTarget } from "@/lib/db/ops/social";

/**
 * One post, opened.
 *
 * The queue row is a summary and always was; a published post had nowhere to
 * go from it. You could see that Instagram had it and that was the end of the
 * trail — no picture at size, no full caption, no numbers unless they happened
 * to fit on one line, and no way through to the post itself.
 *
 * WHAT IT IS HONEST ABOUT, because these are the three things people try next:
 *
 *   COMMENT TEXT IS NOT READABLE. Counts come from the basic permission this
 *   app holds; reading what people actually wrote needs
 *   instagram_business_manage_comments, which is a separate permission with its
 *   own Meta review and would need every connected account to reconnect. So the
 *   count is shown and the text is not, and the panel says which rather than
 *   leaving an empty list that looks broken.
 *
 *   A PUBLISHED CAPTION CANNOT BE EDITED. Not a gap here — Instagram's API has
 *   no endpoint for it, and neither does X. The post is live and the words are
 *   its words. Saying so beats a greyed-out Edit button with no explanation.
 *
 *   NULL IS NOT ZERO. A count we have never read and a count of nought are
 *   different facts, and TikTok will not tell us at all. Each says what it is.
 */
export function PostDetail({ post, onClose }: { post: SocialPost; onClose: () => void }) {
  const targets = post.social_targets ?? [];
  const ig = post.options?.instagram;
  const anySent = targets.some((t) => t.status === "sent");

  return (
    <div className="pdx">
      <div className="pdx__grid">
        {post.media_url && (
          <img className="pdx__art" src={post.media_url} alt="" width={220} height={275} loading="lazy" />
        )}
        <div className="pdx__body">
          <div className="pdx__cap">{post.caption || <em>No caption</em>}</div>

          <div className="pdx__ch">
            {targets.map((t) => <Channel key={t.id} t={t} />)}
          </div>

          {ig && (ig.collaborators?.length || ig.userTags?.length || ig.altText || ig.alsoStory) && (
            <dl className="pdx__opts">
              {!!ig.collaborators?.length && (
                <><dt>Collaborators</dt><dd>{ig.collaborators.map((c) => `@${c}`).join(", ")}</dd></>
              )}
              {!!ig.userTags?.length && (
                <><dt>Tagged</dt><dd>{ig.userTags.map((t) => `@${t.username}`).join(", ")}</dd></>
              )}
              {ig.altText && <><dt>Alt text</dt><dd>{ig.altText}</dd></>}
              {ig.alsoStory && <><dt>Story</dt><dd>Posted to the story as well</dd></>}
            </dl>
          )}

          {anySent && (
            <p className="pdx__note">
              Counts are read from the platform and refreshed on demand — use “Refresh likes and
              comments” above. What people wrote in the comments is not readable: that needs a
              separate Instagram permission this app has not been granted, so the post itself is the
              place to read them.
            </p>
          )}
          {post.status === "published" && (
            <p className="pdx__note">
              A published post cannot be edited from here. Instagram and X have no API for changing a
              caption once it is live — open the post to change it, or delete and repost.
            </p>
          )}
        </div>
      </div>

      <div className="pdx__acts">
        <button type="button" className="dsn-btn" onClick={onClose}>Close</button>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

function Channel({ t }: { t: SocialTarget }) {
  const name = PLATFORM_NAMES[t.platform] ?? t.platform;
  const known = t.likes !== null || t.comments !== null;
  return (
    <div className={`pdx__c is-${t.status}`}>
      <b>{name}</b>
      <span className="pdx__st">{t.status === "sent" ? "posted" : t.status}</span>

      {t.status === "sent" && (
        known ? (
          <span className="pdx__n" title={t.metrics_at ? `As of ${new Date(t.metrics_at).toLocaleString("en-GB")}` : undefined}>
            {t.likes !== null && <span>♥ {t.likes}</span>}
            {t.comments !== null && <span>💬 {t.comments}</span>}
          </span>
        ) : (
          // Told apart deliberately: one of these is a limitation of ours and
          // the other is a platform that will never answer.
          <span className="pdx__unknown">
            {t.platform === "tiktok" ? "TikTok does not report these" : "Not read yet"}
          </span>
        )
      )}

      {t.permalink
        ? <a className="hrx-seeall" href={t.permalink} target="_blank" rel="noreferrer">View on {name}</a>
        : t.status === "sent" && <span className="pdx__unknown">No link yet — refresh to fetch it</span>}

      {t.error && <span className="pdx__err">{t.error}</span>}
    </div>
  );
}

const CSS = `
.pdx{margin-top:10px;padding-top:10px;border-top:1px dashed var(--hrx-border)}
.pdx__grid{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.pdx__art{border-radius:10px;border:1px solid var(--hrx-border);width:180px;height:auto;flex:none}
.pdx__body{flex:1;min-width:220px;display:flex;flex-direction:column;gap:10px}
.pdx__cap{font-size:13.5px;line-height:1.5;color:var(--hrx-ink);white-space:pre-wrap}
.pdx__ch{display:flex;flex-direction:column;gap:6px}
.pdx__c{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:13px;
        padding:7px 10px;border:1px solid var(--hrx-border);border-radius:10px;background:var(--hrx-bg)}
.pdx__c.is-failed{border-color:#D63D0B}
.pdx__st{color:var(--hrx-muted);font-size:12.5px}
.pdx__n{display:inline-flex;gap:9px;font-weight:600;font-variant-numeric:tabular-nums}
.pdx__unknown{color:var(--hrx-muted);font-size:12.5px}
.pdx__err{color:#D63D0B;font-size:12.5px;flex-basis:100%}
.pdx__opts{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:0;font-size:12.5px}
.pdx__opts dt{color:var(--hrx-muted)}
.pdx__opts dd{margin:0;color:var(--hrx-ink)}
.pdx__note{font-size:12.5px;color:var(--hrx-muted);margin:0;line-height:1.5}
.pdx__acts{display:flex;justify-content:flex-end;margin-top:10px}
`;
