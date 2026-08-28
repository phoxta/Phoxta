import { useEffect, useMemo, useRef, useState } from "react";
import { toast, toastError } from "@/lib/ops/feedback";
import type { Design } from "@/lib/db/designs";
import {
  type InstagramOptions as IgOptions,
  type Limits, type SocialAccount, type SocialPlatform, PLATFORM_NAMES, EMPTY_IG_OPTIONS,
  listSocialAccounts, scheduleSocialPost, writeSocialCaption,
} from "@/lib/db/ops/social";
import { InstagramOptions } from "./InstagramOptions";
import { rasterise } from "./rasterise";

/**
 * Putting a design out.
 *
 * The picture is rasterised through the SAME path the download button and the
 * email import use, so what is posted is what was downloaded — there is no
 * second renderer to drift.
 *
 * The caption counter is per platform because the limits differ by a factor of
 * ten: X will take 280 characters and Instagram 2,200. Showing one number
 * against the shortest selected channel is what stops somebody writing a good
 * caption and then discovering at publish time that it was refused.
 *
 * Nothing is posted from the browser. This queues; the cron tick on the Oracle
 * box publishes. So closing the tab, or the laptop, changes nothing.
 */
export function ScheduleDialog({ orgId, design, onClose }: {
  orgId: string;
  design: Design;
  onClose: () => void;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState(() => localIso(new Date(Date.now() + 15 * 60 * 1000)));
  const [busy, setBusy] = useState(false);
  /** The collaborators, tags, alt text and story — Instagram only, and only
   *  worth carrying when Instagram is one of the chosen channels. */
  const [ig, setIg] = useState<IgOptions>(EMPTY_IG_OPTIONS);
  /** Writing the caption, and the one line of reasoning it comes back with. */
  const [writing, setWriting] = useState(false);
  const [why, setWhy] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, busy]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await listSocialAccounts(orgId);
      if (error) toastError(error);
      const found = data?.accounts ?? [];
      setAccounts(found);
      setLimits(data?.limits ?? null);
      // TICKED BY DEFAULT. Somebody who has connected four accounts wants the
      // post on four accounts; starting empty made every post a four-click
      // errand and, worse, made "I forgot to tick LinkedIn" a silent outcome
      // that only shows up as a post that never appeared. Unticking to hold one
      // back is the rarer intent, so it is the one that costs a click.
      setPicked(found.filter((x) => x.status === "connected").map((x) => x.id));
      setLoading(false);
    })();
  }, [orgId]);

  const usable = accounts.filter((a) => a.status === "connected");

  /** The tightest limit among the chosen channels — the one that will bite. */
  const cap = useMemo(() => {
    if (!limits || picked.length === 0) return null;
    const chosen = usable.filter((a) => picked.includes(a.id));
    return chosen.reduce<{ n: number; who: string } | null>((worst, a) => {
      const n = limits[a.platform]?.caption ?? 2200;
      return !worst || n < worst.n ? { n, who: PLATFORM_NAMES[a.platform] } : worst;
    }, null);
  }, [limits, picked, usable]);

  const over = cap ? caption.length - cap.n : 0;

  const toInstagram = usable.some((a) => picked.includes(a.id) && a.platform === "instagram");

  const go = async () => {
    if (picked.length === 0) return toastError("Choose where it should go.");
    if (over > 0) return toastError(`That is ${over} characters too long for ${cap!.who}.`);
    setBusy(true);
    try {
      // Rasterise now rather than at publish time: the design can change
      // between scheduling and posting, and what was approved is what should
      // go out.
      const mediaUrl = await rasterise(orgId, design);
      const at = new Date(when);
      const { error } = await scheduleSocialPost(orgId, {
        designId: design.id, mediaUrl, caption, scheduledAt: at.toISOString(), accountIds: picked,
        // Only when Instagram is going to receive it. Storing them against a
        // post that is going nowhere near Instagram would leave the console
        // showing collaborators on a post that can never have any.
        options: toInstagram ? { instagram: ig } : {},
      });
      if (error) throw new Error(error);
      toast(at.getTime() <= Date.now() + 60_000 ? "Queued — it goes out on the next tick." : `Scheduled for ${at.toLocaleString("en-GB")}.`);
      onClose();
    } catch (e) {
      toastError(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Write the caption from what is printed ON the design.
   *
   * The picked platforms travel with the request, because the craft genuinely
   * differs: the first line carries an Instagram post, LinkedIn demotes a link
   * in the body, and X counts the hashtags inside its 280. A caption written for
   * one platform and posted to another is a caption refused at publish time.
   *
   * It REPLACES the box, so anything already typed is confirmed first — the
   * button sits next to the words it would overwrite.
   */
  const write = async () => {
    const platforms = usable
      .filter((a) => picked.includes(a.id))
      .map((a) => a.platform as SocialPlatform);
    if (caption.trim() && !window.confirm("Replace what you have written?")) return;
    setWriting(true);
    const { data, error } = await writeSocialCaption(orgId, { designId: design.id, platforms });
    setWriting(false);
    if (error) return toastError(error);
    if (!data) return;
    setCaption(data.full);
    setWhy(data.why);
    field.current?.focus();
  };

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Schedule this design"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg" style={{ width: "min(620px, 94vw)" }}>
        <h3 className="dsn-picker__t">Schedule this post</h3>

        <div className="dsn-brief-dlg__body">
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : usable.length === 0 ? (
          <p className="dsn-note">
            No accounts connected yet. Connect Instagram, LinkedIn, TikTok or X under Engage → Channels,
            and they will appear here.
          </p>
        ) : (
          <>
            <div className="emc__f">
              <span>Where</span>
              <div className="sow">
                {usable.map((a) => (
                  <label key={a.id} className={`sow__c${picked.includes(a.id) ? " is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={picked.includes(a.id)}
                      onChange={() => setPicked((p) =>
                        p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id])}
                    />
                    <span>{PLATFORM_NAMES[a.platform]}{a.handle ? ` · ${a.handle}` : ""}</span>
                  </label>
                ))}
              </div>
              {usable.length > 1 && (
                <em>
                  {picked.length === usable.length
                    ? "Going to everything you have connected. Untick anything you want to hold back."
                    : `${picked.length} of ${usable.length} — the rest will not get this post.`}
                </em>
              )}
              {accounts.some((a) => a.status !== "connected") && (
                <em>
                  {accounts.filter((a) => a.status !== "connected").map((a) => PLATFORM_NAMES[a.platform]).join(", ")}
                  {" "}needs reconnecting, so it is not listed.
                </em>
              )}
            </div>

            <label className="emc__f">
              <span>
                Caption
                <button
                  type="button" className="emc__ai" onClick={() => void write()}
                  disabled={writing || busy}
                  title="Write it from the words on the design"
                >
                  {writing ? "Writing…" : "Write it for me"}
                </button>
                {cap && (
                  <span style={{ float: "right", fontWeight: 400, color: over > 0 ? "#D63D0B" : "var(--hrx-muted)" }}>
                    {caption.length}/{cap.n} · {cap.who} is the tightest
                  </span>
                )}
              </span>
              <textarea ref={field} rows={6} value={caption}
                        onChange={(e) => { setCaption(e.target.value); if (why) setWhy(""); }}
                        placeholder="What the post says. The picture is the design." />
              {why && <em style={{ color: "var(--hrx-muted)" }}>{why}</em>}
              {limits && picked.length > 0 && (
                <em>
                  {usable.filter((a) => picked.includes(a.id))
                    .map((a) => limits[a.platform]?.note)
                    .filter((n, i, all) => n && all.indexOf(n) === i)
                    .join(" ")}
                </em>
              )}
            </label>

            {toInstagram && <InstagramOptions design={design} value={ig} onChange={setIg} />}

            <label className="emc__f">
              <span>When</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              <em>It goes out on the first cron tick after this time — within five minutes.</em>
            </label>
          </>
        )}
        </div>

        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void go()}
                  disabled={busy || loading || usable.length === 0}>
            {busy ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.sow{display:flex;flex-wrap:wrap;gap:7px}
.sow__c{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;cursor:pointer;
        border:1px solid var(--hrx-border);background:var(--hrx-bg);font-size:13px;color:var(--hrx-ink);
        user-select:none}
.sow__c.is-on{border-color:#1D1D1D;background:var(--hrx-card);font-weight:600}
.sow__c input{margin:0;accent-color:#1D1D1D;width:15px;height:15px;cursor:pointer}
`;

/** `datetime-local` wants the local wall clock, not an ISO instant. */
function localIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
