import { useEffect, useMemo, useRef, useState } from "react";
import { toast, toastError } from "@/lib/ops/feedback";
import type { Design } from "@/lib/db/designs";
import {
  type InstagramOptions as IgOptions,
  type CaptionVariant, type Limits, type SocialAccount, type SocialPlatform, EMPTY_IG_OPTIONS,
  listSocialAccounts, scheduleSocialPost, writeSocialCaption,
} from "@/lib/db/ops/social";
import { uploadAsset } from "@/lib/db/ops/designAssets";
import { InstagramOptions } from "./InstagramOptions";
import { rasterise } from "./rasterise";
import { SchedulePostForm, captionCap, localIso } from "./shared";
import { docFormat } from "@/lib/designs/types";

/**
 * Putting a design out.
 *
 * The picture is rasterised through the SAME renderer the download button and
 * the email import use, so what is posted is what was downloaded — there is no
 * second renderer to drift. It goes out as JPEG because Instagram accepts JPEG
 * only; a PNG queued to Instagram fails at publish time, in a worker, where
 * nobody is watching.
 *
 * The form itself — channels, caption with its tightest-cap counter, when —
 * is SchedulePostForm, shared with the queue's inline editor so the two
 * surfaces cannot drift apart. See designs/shared.tsx.
 *
 * Nothing is posted from the browser. This queues; the cron tick on the Oracle
 * box publishes. So closing the tab, or the laptop, changes nothing.
 */
export function ScheduleDialog({ orgId, design, onClose, onConnectAccounts }: {
  orgId: string;
  design: Design;
  onClose: () => void;
  /** Opens the Graphics page's Accounts dialog. Optional so the page owner can
   *  wire it when ready; without it the empty state names the button instead. */
  onConnectAccounts?: () => void;
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
  const [steer, setSteer] = useState("");
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  /** Per-platform copy, kept beside the single caption. The publisher prefers
   *  it when present, so LinkedIn gets the LinkedIn version rather than a
   *  compromise trimmed to X's 280 characters. */
  const [captions, setCaptions] = useState<Record<string, string>>({});
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
  const cap = useMemo(() => captionCap(limits, accounts, picked), [limits, accounts, picked]);
  /**
   * Is every picked channel covered by its own caption?
   *
   * The tightest-cap block below exists because ONE caption had to satisfy
   * every platform at once. When each has its own, that reason is gone — and
   * enforcing it anyway would refuse a perfectly valid Instagram caption for
   * being longer than X's 280, which is exactly the compromise per-platform
   * copy was written to end. The server still checks each on its own.
   */
  const perPlatform = usable
    .filter((a) => picked.includes(a.id))
    .every((a) => !!captions[a.platform]) && picked.length > 0;
  const over = cap && !perPlatform ? caption.length - cap.n : 0;

  const toInstagram = usable.some((a) => picked.includes(a.id) && a.platform === "instagram");

  /**
   * Rasterise the design and store the file the publisher will send.
   *
   * `renderJpeg` is arriving in rasterise.ts in a parallel change; until it
   * lands, the PNG path stands in rather than the button failing — a fallback
   * that costs nothing to keep, because it is the path this dialog always
   * used. The upload goes through the same design-assets library either way
   * (it derives the stored extension from the file's content type).
   */
  async function renderAndStore(): Promise<string> {
    const mod = await import("./rasterise") as typeof import("./rasterise")
      & { renderJpeg?: (d: Design) => Promise<Blob> };
    if (!mod.renderJpeg) return rasterise(orgId, design);
    const blob = await mod.renderJpeg(design);
    const name = `${design.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design"}.jpg`;
    const { data, error } = await uploadAsset(orgId, new File([blob], name, { type: "image/jpeg" }));
    if (error || !data) throw new Error(error ?? "The picture could not be stored.");
    return data.url;
  }

  const go = async () => {
    if (picked.length === 0) return toastError("Choose where it should go.");
    if (over > 0) return toastError(`That is ${over} characters too long for ${cap!.who}.`);
    setBusy(true);
    try {
      // Rasterise now rather than at publish time: the design can change
      // between scheduling and posting, and what was approved is what should
      // go out.
      const mediaUrl = await renderAndStore();
      const at = new Date(when);
      const { error } = await scheduleSocialPost(orgId, {
        designId: design.id, mediaUrl, caption, captions,
        scheduledAt: at.toISOString(), accountIds: picked,
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
   * It REPLACES NOTHING. Three takes come back and the box only changes when
   * one is picked, so the "Replace what you have written?" confirm this used
   * to open — the tell that the button was destructive — is gone with it.
   */
  const write = async () => {
    const platforms = usable
      .filter((a) => picked.includes(a.id))
      .map((a) => a.platform as SocialPlatform);
    setWriting(true);
    const { data, error } = await writeSocialCaption(orgId, { designId: design.id, platforms, steer });
    setWriting(false);
    if (error) return toastError(error);
    if (!data) return;
    setVariants(data.variants ?? []);
    setWhy("");
  };

  /** Taking one: its per-platform copy is kept alongside the caption, so each
   *  channel publishes the version written for it. */
  const take = (v: CaptionVariant) => {
    const lead = usable.filter((a) => picked.includes(a.id))[0]?.platform;
    setCaption(v.full[lead ?? ""] ?? Object.values(v.full)[0] ?? "");
    setCaptions(v.full);
    setWhy(v.why);
    setVariants([]);
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
          <>
            <p className="dsn-note">
              No accounts connected yet. Instagram, LinkedIn, TikTok and X are connected from the
              Accounts button at the top of this Graphics page — connect one and it will appear here.
            </p>
            {onConnectAccounts && (
              <button type="button" className="dsn-btn" onClick={onConnectAccounts}>
                Open Accounts
              </button>
            )}
          </>
        ) : (
          <SchedulePostForm
            accounts={accounts}
            limits={limits}
            picked={picked}
            onPicked={setPicked}
            caption={caption}
            onCaption={(v) => {
              setCaption(v);
              if (why) setWhy("");
              // Typed over by hand, the per-platform set no longer matches what
              // is on screen — and publishing the stale set would send words
              // the owner never saw. Dropping it falls back to this caption.
              if (Object.keys(captions).length) setCaptions({});
            }}
            when={when}
            onWhen={setWhen}
            disabled={busy}
            onWrite={() => void write()}
            writing={writing}
            why={why}
            steer={steer}
            onSteer={setSteer}
            variants={variants}
            onTake={take}
            format={docFormat(design.doc)}
            captionRef={field}
            whenNote="It goes out on the first cron tick after this time — within five minutes."
          >
            {toInstagram && <InstagramOptions design={design} value={ig} onChange={setIg} />}
          </SchedulePostForm>
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
    </div>
  );
}
