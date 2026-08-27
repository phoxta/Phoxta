import { useEffect, useMemo, useRef, useState } from "react";
import { toast, toastError } from "@/lib/ops/feedback";
import type { Design } from "@/lib/db/designs";
import {
  type Limits, type SocialAccount, PLATFORM_NAMES,
  listSocialAccounts, scheduleSocialPost,
} from "@/lib/db/ops/social";
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
      setAccounts(data?.accounts ?? []);
      setLimits(data?.limits ?? null);
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

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Schedule this design"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg" style={{ width: "min(620px, 94vw)" }}>
        <h3 className="dsn-picker__t">Schedule this post</h3>

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
                {cap && (
                  <span style={{ float: "right", fontWeight: 400, color: over > 0 ? "#D63D0B" : "var(--hrx-muted)" }}>
                    {caption.length}/{cap.n} · {cap.who} is the tightest
                  </span>
                )}
              </span>
              <textarea ref={field} rows={4} value={caption} onChange={(e) => setCaption(e.target.value)}
                        placeholder="What the post says. The picture is the design." />
              {limits && picked.length > 0 && (
                <em>
                  {usable.filter((a) => picked.includes(a.id))
                    .map((a) => limits[a.platform]?.note)
                    .filter((n, i, all) => n && all.indexOf(n) === i)
                    .join(" ")}
                </em>
              )}
            </label>

            <label className="emc__f">
              <span>When</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              <em>It goes out on the first cron tick after this time — within five minutes.</em>
            </label>
          </>
        )}

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

/** `datetime-local` wants the local wall clock, not an ISO instant. */
function localIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
