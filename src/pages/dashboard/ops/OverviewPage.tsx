import { useLayoutEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  DASHBOARD_TTL, getWorkBoard, moveWorkCard, movableColumns, WORK_COLUMNS,
  type WorkBoard, type WorkCard, type WorkColumn, type WorkMedia,
} from "@/lib/cache/dashboardQueries";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";
import { StatTile } from "@/components/dash/Ui";

/**
 * Overview styles, kept local so the global stylesheet stays untouched.
 * Two layers here:
 *  - the structural shell (.ops-ov / .ops-ov-side / .ops-pin / .opc) whose
 *    class names are LOAD-BEARING — the measurement effect below queries and
 *    toggles them — so they keep their names;
 *  - everything visual, redesigned on ovx-* classes to the hrx dashboard kit
 *    (Figtree, ink #272727, blue #195ce5, soft #f9fbfc, 16px radius).
 */
const OVERVIEW_CSS = `/* ---- Overview shell: Operator rail + work board --------------------------
   Two panes side by side: the AI Operator on the left, the work board right.
   Note if anything Bootstrap-gridded is ever put back in the rail: the grid
   keys off the VIEWPORT, not the parent, so col-md/col-xl inside this
   fixed-width pane collapse to a fraction of it on a wide screen. */
/* The Operator is a fixed-height panel with its own internal scroll, so it has
   no reason to travel with the page - only the board does. It pins below the
   console's own sticky header, whose height is measured onto --ops-head-h
   (OverviewPage) because it changes with the title and tab wrapping. */
.ops-ov{display:flex;gap:20px;align-items:flex-start}
.ops-ov-side{width:420px;flex:0 0 420px;min-width:0}
.ops-pin .ops-ov-side{position:sticky;top:calc(var(--ops-head-h, 0px) + 8px);align-self:flex-start}
/* Pinned, the panel is sized to the measured gap, and min-height must stand
   down: a floor taller than the space available is exactly what pushed its
   bottom below the fold. */
.ops-pin .opc{height:var(--ops-op-h);min-height:0}
/* Appearance lives in operator-chat.css; only HEIGHT is this console's business. */
.opc{height:calc(100vh - 300px);min-height:460px}
.ovx-main{flex:1 1 auto;min-width:0}

/* ---- Headline: true per-stage totals straight off the board RPC ---------- */
.ovx-stats{margin:0 0 14px}

/* ---- Refused-move notice ------------------------------------------------- */
.ovx-notice{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:10px 14px;
  border-radius:12px;border:1px solid #f2e3b0;background:#fdf3d7;color:#a16207;
  font-size:13px;line-height:1.45}
.ovx-notice button{margin-left:auto;border:0;background:transparent;color:inherit;cursor:pointer;
  font-size:16px;line-height:1;padding:0 2px}

/* ---- Board scroller ------------------------------------------------------ */
.ops-ov-board{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;align-items:flex-start}
.ops-ov-board::-webkit-scrollbar{height:8px}
.ops-ov-board::-webkit-scrollbar-thumb{background:#d9d9d9;border-radius:8px}

/* ---- Board columns -------------------------------------------------------
   Quiet soft-grey panels in the hrx card grammar: the COLOUR lives on the
   cards (keyed to their module) and on the stage dot, not on the panel. */
.ovx-col{flex:0 0 252px;width:252px;min-width:0;border-radius:16px;padding:12px;
  background:#f9fbfc;border:1px solid #ededed}
.ovx-col.dropping{outline:2px dashed #195ce5;outline-offset:2px;background:#e8effc}
.ovx-colhead{display:flex;align-items:center;gap:8px;padding:2px 4px 12px}
.ovx-colhead b{font-size:13.5px;font-weight:600;letter-spacing:-0.01em;color:#272727}
.ovx-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:#d9d9d9}
.col-todo   .ovx-dot{background:#6b7280}
.col-doing  .ovx-dot{background:#195ce5}
.col-review .ovx-dot{background:#fe5f2b}
.col-ready  .ovx-dot{background:#16a34a}
.ovx-count{margin-left:auto;min-width:26px;height:20px;padding:0 8px;border-radius:40px;
  background:#fff;border:1px solid #ededed;color:#6b7280;font-size:11px;font-weight:600;
  display:inline-flex;align-items:center;justify-content:center}
.ovx-empty{border:1px dashed #d9d9d9;border-radius:12px;background:transparent;
  min-height:220px;display:flex;align-items:center;justify-content:center;
  padding:22px 14px;text-align:center;font-size:12.5px;color:#6b7280}

/* ---- Work card -----------------------------------------------------------
   White hrx card with a module-hued left accent, so colour still carries
   meaning (blue = inbox, green = commerce, orange = money owed ...) without
   the pastel wash. The hue is a custom property the chip, avatar and
   progress fill all inherit. */
.ovx-cards{display:flex;flex-direction:column;gap:10px}
.ovx-card{display:block;text-decoration:none;background:#fff;color:#272727;
  border:1px solid #ededed;border-left:3px solid var(--ovx-hue,#272727);
  border-radius:14px;padding:12px 12px 12px 13px;
  transition:box-shadow .15s ease,transform .15s ease,border-color .15s ease}
.ovx-card:hover,.ovx-card:focus-visible{box-shadow:0 10px 24px rgba(39,39,39,.10);
  transform:translateY(-1px);color:#272727}
/* Drag to move a card between stages. The lifted card stays visible at low
   opacity rather than disappearing, so you can still see what you are holding. */
.ovx-card[draggable="true"]{cursor:grab}
.ovx-card.dragging{opacity:.4;cursor:grabbing}
.ovx-top{display:flex;align-items:center;gap:5px;margin-bottom:9px}
.ovx-tag{font-size:10.5px;font-weight:500;line-height:1;padding:5px 8px;border-radius:40px;
  background:#f1f2f4;color:#6b7280;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;max-width:104px}
.ovx-tag.mod{background:var(--ovx-hue-bg,#f1f2f4);color:var(--ovx-hue,#272727)}
.ovx-card h3{font-size:14px;font-weight:600;letter-spacing:-0.01em;line-height:1.32;
  color:#272727;margin:0 0 5px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ovx-card p{font-size:11px;line-height:1.5;color:#6b7280;margin:0 0 10px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* Media slot: image, video poster or a call-recording strip. */
.ovx-media{position:relative;border-radius:10px;overflow:hidden;margin:0 0 10px;
  background:#f1f2f4;line-height:0}
.ovx-media img,.ovx-media video{display:block;width:100%;height:118px;object-fit:cover;
  pointer-events:none}
.ovx-more{position:absolute;right:7px;bottom:7px;background:rgba(39,39,39,.72);color:#fff;
  font-size:9.5px;font-weight:600;line-height:1;padding:4px 6px;border-radius:40px}
.ovx-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.ovx-play b{width:34px;height:34px;border-radius:50%;background:rgba(39,39,39,.6);color:#fff;
  display:flex;align-items:center;justify-content:center}
.ovx-audio{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:9px 10px;
  border-radius:10px;background:#f9fbfc;border:1px solid #ededed;font-size:11px;color:#6b7280}
.ovx-audio b{flex:0 0 24px;width:24px;height:24px;border-radius:50%;
  background:var(--ovx-hue,#272727);color:#fff;
  display:flex;align-items:center;justify-content:center}
/* Progress: only rendered where there is a real ratio behind it (a campaign's
   sent-vs-recipients), never as decoration. Fill takes the module hue. */
.ovx-prog{margin:0 0 10px}
.ovx-prog-top{display:flex;align-items:center;font-size:10.5px;color:#6b7280;margin-bottom:5px}
.ovx-prog-top b{margin-left:auto;font-weight:600;color:#272727}
.ovx-prog-bar{height:6px;border-radius:99px;background:#f1f2f4;overflow:hidden}
.ovx-prog-bar i{display:block;height:100%;border-radius:99px;background:var(--ovx-hue,#272727)}
.ovx-who{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ovx-av{width:26px;height:26px;flex:0 0 26px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:9px;font-weight:700;
  color:var(--ovx-hue,#272727);background:var(--ovx-hue-bg,#f1f2f4)}
.ovx-who b{display:block;font-size:11px;font-weight:600;color:#272727;line-height:1.2;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.ovx-who i{display:block;font-style:normal;font-size:9.5px;color:#6b7280;line-height:1.2;
  text-transform:capitalize}
.ovx-foot{display:flex;align-items:center;gap:6px;font-size:10.5px;color:#6b7280}
.ovx-foot .m{display:inline-flex;align-items:center;gap:4px;background:#f9fbfc;
  border:1px solid #f1f2f4;border-radius:6px;padding:4px 7px;white-space:nowrap}
.ovx-foot .r{margin-left:auto;display:inline-flex;align-items:center;gap:6px}
.ovx-foot svg{flex:0 0 auto;opacity:.6}
/* Module hues, in the hrx chip palette. The custom properties feed the left
   accent, the module tag, the avatar and the progress fill.
   (No backticks in here - this block lives inside a JS template literal.) */
.tint-inbox        {--ovx-hue:#195ce5;--ovx-hue-bg:#e8effc}
.tint-agent        {--ovx-hue:#6b4cc4;--ovx-hue-bg:#efeafc}
.tint-commerce     {--ovx-hue:#15803d;--ovx-hue-bg:#e6f6ec}
.tint-invoicing    {--ovx-hue:#c2570f;--ovx-hue-bg:#fff0e9}
.tint-marketing    {--ovx-hue:#c43b6b;--ovx-hue-bg:#fbe7ee}
.tint-crm          {--ovx-hue:#2c7bb0;--ovx-hue-bg:#e3f1fb}
.tint-reservations,.tint-bookings{--ovx-hue:#a16207;--ovx-hue-bg:#fdf3d7}
.tint-settings     {--ovx-hue:#4a5460;--ovx-hue-bg:#eef0f3}
@media (max-width:991.98px){
.opc{height:auto;min-height:0;max-height:72vh}
}
/* Below lg the two panes stack: the rail goes full width and the board keeps
   its own horizontal scroll rather than squeezing the columns. */
@media (max-width:991.98px){
  .ops-ov{flex-direction:column;gap:28px}
  /* Stacked, the Operator sits ABOVE the board, so pinning it would park it on
     top of the thing you scrolled down to read. */
  .ops-ov-side{width:100%;flex:1 1 auto;position:static}
  .ovx-main{width:100%}
}
@media (max-width:575.98px){
.ovx-col{flex:0 0 82%;width:82%}
}
`;

/** Stat-tile tone per board column, so the headline row reads left-to-right
 *  from backlog to done: neutral, blue (active), soft, dark (shipped). */
const STAT_TONES: Record<WorkColumn, "soft" | "dark" | "blue" | undefined> = {
  todo: undefined,
  doing: "blue",
  review: "soft",
  ready: "dark",
};

/** Initials for the card avatar. "Ada Lovelace" -> AL, "Vercel" -> VE. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Short, human date for the card footer: "17 May", or "Today" / "Yesterday". */
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Footer icons — thin line set, matching the kit's calendar / comment / link
// glyphs. Module-level consts, per the house style for inline SVG.
const ICON_DATE = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);
const ICON_COMMENT = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.4 8.4 0 01-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 013.6 11a8.4 8.4 0 018.4-8.4h.5A8.4 8.4 0 0121 11z" />
  </svg>
);
const ICON_LINK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
  </svg>
);

const ICON_PLAY = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.5-6.8a1 1 0 000-1.7L9.6 4.3A1 1 0 008 5.2z" />
  </svg>
);

/** The card's preview. Renders whatever the record actually has: a product shot
 *  (with a +N badge when there are more), a video poster, or a call recording. */
function CardMedia({ media }: { media: WorkMedia[] }) {
  // Storefront assets can be removed after a product is listed; a card should
  // lose its preview quietly rather than show a broken-image glyph.
  const [broken, setBroken] = useState(false);
  const first = media?.[0];
  if (!first || broken) return null;
  const extra = media.length - 1;

  if (first.kind === "audio") {
    return (
      <div className="ovx-audio">
        <b aria-hidden="true">{ICON_PLAY}</b>
        Call recording
      </div>
    );
  }
  return (
    <div className="ovx-media">
      {first.kind === "video" ? (
        <>
          {/* muted + preload=metadata: a poster frame, not a playing video in a list */}
          <video src={first.url} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
          <span className="ovx-play" aria-hidden="true"><b>{ICON_PLAY}</b></span>
        </>
      ) : (
        <img
          src={first.url}
          alt=""
          width={200}
          height={132}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      {extra > 0 && <span className="ovx-more">+{extra}</span>}
    </div>
  );
}

/** Tag text as hashtag chips: "AI Agent" -> "#ai-agent". */
const hashTag = (t: string) => `#${t.toLowerCase().replace(/\s+/g, "-")}`;

/** One work item. The whole card links to the record it was derived from.
 *  The card carries a module-hued accent (left edge, first tag, avatar,
 *  progress fill), so colour tells you which part of the business a card
 *  belongs to before you read it. */
function WorkCardView({
  card, base, currency, dragging, onDragStart, onDragEnd,
}: {
  card: WorkCard; base: string; currency: string; dragging: boolean;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const tags = (card.tags ?? []).slice(0, 2);
  const media = card.media ?? [];
  // A card the board only reports on (a low-stock product, a finished
  // automation run) has no stage to move through. Offering the drag anyway just
  // teaches people the board is broken.
  const canMove = movableColumns(card.id).length > 0;
  return (
    <Link
      to={`${base}/${card.to_path}`}
      className={`ovx-card tint-${card.module}${dragging ? " dragging" : ""}`}
      aria-label={`${card.title} — ${card.detail}`}
      draggable={canMove}
      onDragStart={(e) => {
        // A link drags its href by default, which would hand another app a URL
        // instead of moving the card.
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="ovx-top">
        {tags.map((t, i) => (
          <span key={t} className={`ovx-tag${i === 0 ? " mod" : ""}`}>{hashTag(t)}</span>
        ))}
      </div>

      <h3>{card.title}</h3>
      <p>{card.detail}</p>

      <CardMedia media={media} />

      {card.progress != null && (
        <div className="ovx-prog">
          <div className="ovx-prog-top">Progress<b>{card.progress}%</b></div>
          <div className="ovx-prog-bar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }} />
          </div>
        </div>
      )}

      <div className="ovx-who">
        <span className="ovx-av" aria-hidden="true">{initials(card.who)}</span>
        <span>
          <b>{card.who}</b>
          <i>{card.who_role}</i>
        </span>
      </div>

      <div className="ovx-foot">
        <span className="m">{ICON_DATE}{shortDate(card.occurred_at)}</span>
        <span className="r">
          {card.amount_cents != null && card.amount_cents > 0 && (
            <span className="m">{formatPrice(card.amount_cents, currency)}</span>
          )}
          {card.comments > 0 && <span className="m">{ICON_COMMENT}{card.comments}</span>}
          {card.links > 0 && <span className="m">{ICON_LINK}{card.links}</span>}
        </span>
      </div>
    </Link>
  );
}

export default function OverviewPage() {
  const { orgId, org, console: cfg } = useOutletContext<OpsContext>();
  // The board is its own cache entry: it is a different shape, a different RPC,
  // and it refreshes on a different rhythm from the 30-day summary.
  const { data: board, setData: setBoard, reload: reloadBoard } = useCachedData<WorkBoard>(
    `ops:board:${orgId}`,
    () => getWorkBoard(orgId),
    { ttl: DASHBOARD_TTL },
  );

  // Drag state. `notice` carries the RPC's reason when a move is refused —
  // a card that silently springs back teaches nothing.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<WorkColumn | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function drop(cardId: string, col: WorkColumn) {
    setDragId(null);
    setOverCol(null);
    const card = (board?.cards ?? []).find((c) => c.id === cardId);
    if (!card || card.col === col) return;

    const from = card.col;
    setNotice(null);
    // Move it now so the board feels direct, then put it back if the server
    // says the move is not expressible for this kind of record.
    setBoard((prev) => prev && ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, col } : c)),
      counts: { ...prev.counts, [from]: Math.max((prev.counts[from] ?? 1) - 1, 0), [col]: (prev.counts[col] ?? 0) + 1 },
    }));

    const res = await moveWorkCard(orgId, cardId, col);
    if (res.ok) {
      // The column is derived, so only a refetch shows where the record truly
      // landed — the optimistic guess is not the source of truth.
      void reloadBoard();
      return;
    }
    setBoard((prev) => prev && ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, col: from } : c)),
      counts: { ...prev.counts, [col]: Math.max((prev.counts[col] ?? 1) - 1, 0), [from]: (prev.counts[from] ?? 0) + 1 },
    }));
    setNotice(res.reason ?? "That card could not be moved.");
  }

  // Currency comes straight off the org record now that the windowed RPC (which
  // also returned it) is gone — same source, one fewer round trip.
  const currency = org.currency || "GBP";
  const opsBase = `/dashboard/businesses/${orgId}/ops`;
  // A card for a module this vertical doesn't run would link to a tab that isn't
  // in the console — drop those rather than render dead links.
  const visibleCards = (board?.cards ?? []).filter((c) => cfg.modules.includes(c.module));

  // The Operator pins below the console's own sticky header (breadcrumb, title,
  // tab bar). Two numbers drive it, and BOTH are measured rather than guessed:
  //
  //   --ops-head-h  how far down the scroll container the panel pins.
  //   --ops-op-h    how tall it may be. This is the one that matters: subtract
  //                 too little chrome and the panel runs past the fold, so its
  //                 lower half stays hidden until sticky releases at the very
  //                 bottom of the board. Measuring the scroll container's own
  //                 box leaves nothing to get wrong.
  //
  // Below `MIN_PINNED` there isn't enough room to pin anything usefully, so the
  // panel goes back to scrolling with the page.
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const head = document.querySelector<HTMLElement>(".dash-sticky-head");
    if (!shell || !head) return;

    /** The element that actually scrolls — sticky positions against this. */
    const scroller = (() => {
      for (let n = shell.parentElement; n; n = n.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n;
      }
      return null;
    })();

    const MIN_PINNED = 380;
    const GAP = 8;

    const measure = () => {
      const headH = Math.round(head.offsetHeight);
      const box = (scroller ?? document.documentElement).getBoundingClientRect();
      const canPin =
        scroller != null && box.height - headH - GAP >= MIN_PINNED && window.innerWidth >= 992;
      shell.style.setProperty("--ops-head-h", `${headH}px`);
      shell.classList.toggle("ops-pin", canPin);

      // Height is measured from the rail's CURRENT top down to the pane's
      // bottom edge — which is where the sidebar ends, the two being siblings in
      // the shell's flex row.
      //
      // Deriving it from the header height instead does not hold, because the
      // rail is sticky: before it sticks it sits below the page padding, after
      // it sticks it jumps up to the header. One subtraction cannot be right in
      // both positions, which is why the panel finished short of the sidebar.
      // Reading the live top is right in both, so this also runs on scroll.
      const rail = shell.querySelector<HTMLElement>(".ops-ov-side");
      if (!rail || !canPin) {
        shell.style.removeProperty("--ops-op-h");
        return;
      }
      const avail = Math.round(box.bottom - rail.getBoundingClientRect().top);
      shell.style.setProperty("--ops-op-h", `${Math.max(avail, MIN_PINNED)}px`);
    };

    measure();

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; measure(); });
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(measure);
    ro.observe(head);
    if (scroller) ro.observe(scroller);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={shellRef}>
      <style>{OVERVIEW_CSS}</style>

      <div className="ops-ov">
        {/* ================= Left rail: the AI Operator ========================= */}
        <div className="ops-ov-side">
          <OperatorChat orgId={orgId} opsBase={opsBase} />
        </div>

        {/* ================= Work board =========================================
            Fed by app_org_work_board: every row that represents outstanding work
            anywhere in this business becomes a card, and its column comes from
            that row's real status. Cards for modules this vertical doesn't run
            are dropped here — the console config owns that decision, not SQL. */}
        <div className="ovx-main">
          {notice && (
            <div className="ovx-notice" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
            </div>
          )}

          {/* Headline metrics: the server's true totals per stage (a column can
              list 8 cards while holding 17). No deltas — the board RPC carries
              no prior-window comparison to show. */}
          <div className="hrx-statrow ovx-stats" role="group" aria-label="Work by stage">
            {WORK_COLUMNS.map(({ key, label }) => (
              <StatTile
                key={key}
                label={label}
                value={board?.counts?.[key] ?? 0}
                tone={STAT_TONES[key]}
              />
            ))}
          </div>

          <div className="ops-ov-board" aria-label="Work board">
            {WORK_COLUMNS.map(({ key, label }) => {
              const cards = visibleCards.filter((c) => c.col === key);
              return (
                <section
                  key={key}
                  className={`ovx-col col-${key}${overCol === key && dragId ? " dropping" : ""}`}
                  aria-label={label}
                  onDragOver={(e) => {
                    if (!dragId || !movableColumns(dragId).includes(key)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setOverCol(key);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === key ? null : c))}
                  onDrop={(e) => { e.preventDefault(); void drop(e.dataTransfer.getData("text/plain") || dragId || "", key); }}
                >
                  <header className="ovx-colhead">
                    <span className="ovx-dot" aria-hidden="true" />
                    <b>{label}</b>
                    <span className="ovx-count">{board?.counts?.[key] ?? 0}</span>
                  </header>
                  {cards.length === 0 ? (
                    <div className="ovx-empty">Nothing here</div>
                  ) : (
                    <div className="ovx-cards">
                      {cards.map((c) => (
                        <WorkCardView
                          key={c.id} card={c} base={opsBase} currency={currency}
                          dragging={dragId === c.id}
                          onDragStart={() => setDragId(c.id)}
                          onDragEnd={() => { setDragId(null); setOverCol(null); }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
