import { Suspense, lazy, useEffect, useState, type ReactNode, type Ref } from "react";
import {
  type CaptionVariant, type Limits, type SocialAccount, type SocialPlatform, PLATFORM_NAMES,
} from "@/lib/db/ops/social";
import { getDesign, type Design } from "@/lib/db/designs";
import { formatMismatch, slidesOf, type DesignFormat } from "@/lib/designs/types";

/**
 * What the studio's scheduling surfaces share.
 *
 * The schedule dialog and the queue's inline editor grew the same form twice —
 * the caption box with its tightest-cap counter, the channel pills, the
 * AI-caption button, the when field — and three files each carried their own
 * copy of `localIso`. Two implementations of one rule drift: the cap check
 * existed in one place and not the other, which is exactly how a caption that
 * X refuses got queued from the editor. So the form, the cap arithmetic and
 * the date formatting live here once, and both surfaces render this.
 */

/** `datetime-local` wants the local wall clock, not an ISO instant. */
export function localIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The tightest caption limit among the chosen channels — the one that will
 * bite. Exported on its own because the SAVE paths need it too: the form shows
 * the counter, but Duplicate and Save must refuse an over-length caption
 * before the server does, with a message that names the platform.
 */
export function captionCap(
  limits: Limits | null,
  accounts: SocialAccount[],
  picked: string[],
): { n: number; who: string } | null {
  if (!limits || picked.length === 0) return null;
  return accounts
    .filter((a) => a.status === "connected" && picked.includes(a.id))
    .reduce<{ n: number; who: string } | null>((worst, a) => {
      const n = limits[a.platform]?.caption ?? 2200;
      return !worst || n < worst.n ? { n, who: PLATFORM_NAMES[a.platform] } : worst;
    }, null);
}

/**
 * The scheduling form: channels, caption, when.
 *
 * Controlled entirely by the parent — state, save and the AI-caption call stay
 * where they were, because the two surfaces genuinely differ there (one
 * rasterises a design, the other edits a queued row). What is identical is the
 * fields themselves, so only the fields live here. `children` renders between
 * the caption and the when field: that is where the schedule dialog puts its
 * Instagram-only options, and the editor puts nothing.
 */
export function SchedulePostForm({
  accounts, limits, picked, onPicked,
  caption, onCaption, when, onWhen,
  disabled = false, onWrite, writing = false, why = "",
  steer, onSteer, variants, onTake, format,
  captionRef, whereNote, whenNote, children,
}: {
  /** Every account, connected or not — the form names the expired ones. */
  accounts: SocialAccount[];
  limits: Limits | null;
  picked: string[];
  onPicked: (ids: string[]) => void;
  caption: string;
  onCaption: (v: string) => void;
  /** A `datetime-local` value — see localIso. */
  when: string;
  onWhen: (v: string) => void;
  disabled?: boolean;
  /** When present, the "Write it for me" button renders and calls this. */
  onWrite?: () => void;
  writing?: boolean;
  /** The one line of reasoning the caption writer came back with. */
  why?: string;
  /** What this particular post is FOR, in the owner's words. The caption writer
   *  has always accepted this and nothing has ever sent it — so every caption
   *  so far was written from the artwork alone, with no idea what the post was
   *  meant to achieve. */
  steer?: string;
  onSteer?: (v: string) => void;
  /** Three takes to choose between, once the writer has run. */
  variants?: CaptionVariant[];
  onTake?: (v: CaptionVariant) => void;
  /** The design's shape, so the form can say when a chosen platform will crop
   *  it. Advice only — nothing is reshaped without being asked. */
  format?: DesignFormat;
  captionRef?: Ref<HTMLTextAreaElement>;
  /** A surface-specific sentence under the channel pills. */
  whereNote?: string;
  /** A surface-specific sentence under the when field. */
  whenNote?: string;
  children?: ReactNode;
}) {
  const usable = accounts.filter((a) => a.status === "connected");
  const cap = captionCap(limits, accounts, picked);
  const over = cap ? caption.length - cap.n : 0;
  const pickedPlatforms = usable.filter((a) => picked.includes(a.id)).map((a) => a.platform);
  const mismatches = format ? formatMismatch(format, pickedPlatforms) : [];

  return (
    <>
      <div className="emc__f">
        <span>Where</span>
        <div className="sow">
          {usable.map((a) => (
            <label key={a.id} className={`sow__c${picked.includes(a.id) ? " is-on" : ""}`}>
              <input
                type="checkbox"
                checked={picked.includes(a.id)}
                disabled={disabled}
                onChange={() => onPicked(
                  picked.includes(a.id) ? picked.filter((x) => x !== a.id) : [...picked, a.id],
                )}
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
        {whereNote && <em>{whereNote}</em>}
        {/* Said here, next to the channel that causes it, rather than at save
            time — a crop warning after the fact is a complaint, not help. */}
        {mismatches.map((m) => (
          <em key={m.platform} className="spf-warn">
            {PLATFORM_NAMES[m.platform as SocialPlatform] ?? m.platform}: {m.note}
          </em>
        ))}
      </div>

      {/* The steer. It goes ABOVE the caption because it is an input to writing
          it, not a note about it — put underneath, it reads as something you
          fill in afterwards, which is too late to be used. */}
      {onSteer && (
        <label className="emc__f">
          <span>What is this post for?</span>
          <input
            type="text" value={steer ?? ""} disabled={disabled}
            onChange={(e) => onSteer(e.target.value)}
            placeholder="Optional — e.g. push the Saturday slots, or answer the question we keep getting"
          />
          <em>The writer reads this before it writes. Without it, it only has the words on the artwork.</em>
        </label>
      )}

      <label className="emc__f">
        <span>
          Caption
          {onWrite && (
            <button
              type="button" className="emc__ai" onClick={onWrite}
              disabled={writing || disabled}
              title="Write it from the words on the design"
            >
              {writing ? "Writing…" : "Write it for me"}
            </button>
          )}
          {cap && (
            <span className={`spf-count${over > 0 ? " is-over" : ""}`}>
              {caption.length}/{cap.n} · {cap.who} is the tightest
            </span>
          )}
        </span>
        <textarea
          ref={captionRef} rows={6} value={caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="What the post says. The picture is the design."
        />
        {why && <em>{why}</em>}

        {/* THREE CARDS INSTEAD OF A CONFIRM DIALOG. When the writer returned
            one caption, using it overwrote whatever was in the box — which is
            why both call sites asked "Replace what you have written?" first.
            Offered as a choice, nothing is replaced until something is picked,
            and the question stops needing to be asked. */}
        {!!variants?.length && onTake && (
          <div className="spf-takes">
            {variants.map((v, i) => {
              const platform = pickedPlatforms[0] ?? Object.keys(v.full)[0];
              const text = v.full[platform] ?? Object.values(v.full)[0] ?? "";
              const per = Object.keys(v.captions);
              return (
                <button
                  type="button" key={i} className="spf-take"
                  onClick={() => onTake(v)} disabled={disabled}
                  title="Use this one"
                >
                  <span className="spf-take__t">{v.label}</span>
                  <span className="spf-take__c">{text}</span>
                  {v.why && <span className="spf-take__w">{v.why}</span>}
                  {per.length > 1 && (
                    <span className="spf-take__p">
                      Written separately for {per.map((p) => PLATFORM_NAMES[p as SocialPlatform] ?? p).join(", ")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {limits && picked.length > 0 && (
          <em>
            {usable.filter((a) => picked.includes(a.id))
              .map((a) => limits[a.platform]?.note)
              .filter((n, i, all) => n && all.indexOf(n) === i)
              .join(" ")}
          </em>
        )}
      </label>

      {children}

      <label className="emc__f">
        <span>When</span>
        <input type="datetime-local" value={when} onChange={(e) => onWhen(e.target.value)} />
        {whenNote && <em>{whenNote}</em>}
      </label>
    </>
  );
}

/* ── A planned design, drawn from its document ─────────────────────────────
   The render module is heavy (the whole canvas renderer), and the plan and
   calendar dialogs only reach for it when somebody actually asks to see a
   picture — so it loads on first use rather than riding along with the page. */
const DesignSvgLazy = lazy(() =>
  import("@/lib/designs/render").then((m) => ({ default: m.DesignSvg })));

/**
 * A design shown AS the design, not as a picture of one.
 *
 * Planned posts carry a design_id and an empty media_url — the publisher
 * renders on the day. Previews used to ask the design-render service to do
 * that early, which is unreachable in production; but the same document
 * renders in the browser with the same DesignSvg the studio's editor and
 * tiles already use, so the preview is client-side, current by construction,
 * and works wherever the console does.
 */
/**
 * A document that is not saved yet, drawn.
 *
 * The reference dialog needs this: a layout rebuilt from an uploaded picture
 * has to be looked at BEFORE anyone agrees to make a month in it, and at that
 * point there is no design row to fetch. Same renderer as everywhere else, so
 * what is approved is what will be drawn.
 */
export function DocArt({ doc, width = 280 }: { doc: unknown; width?: number }) {
  return (
    <Suspense fallback={<p className="dsn-note">Drawing it…</p>}>
      <DesignSvgLazy doc={doc as never} width={width} />
    </Suspense>
  );
}

export function DesignArt({ designId, width = 280 }: { designId: string; width?: number }) {
  const [design, setDesign] = useState<Design | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let active = true;
    void getDesign(designId).then(({ data }) => {
      if (!active) return;
      if (data) setDesign(data); else setGone(true);
    });
    return () => { active = false; };
  }, [designId]);

  if (gone) return <p className="dsn-note">The design behind this post is no longer here.</p>;
  if (!design) return <p className="dsn-note">Loading the design…</p>;
  return (
    <Suspense fallback={<p className="dsn-note">Loading the design…</p>}>
      <DesignSvgLazy doc={slidesOf(design.doc, design.template_id)[0]} width={width} />
    </Suspense>
  );
}
