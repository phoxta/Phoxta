import { useLayoutEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  DASHBOARD_TTL, getWorkBoard, moveWorkCard, WORK_COLUMNS,
  type WorkBoard, type WorkCard, type WorkColumn, type WorkMedia,
} from "@/lib/cache/dashboardQueries";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";

/**
 * Overview styles, kept local so the global stylesheet stays untouched: the
 * two-pane shell (data rail + work board) and the work card itself.
 */
const OVERVIEW_CSS = `/* ---- Overview shell: console data rail + task board ----------------------
   Two panes side by side: the AI Operator on the left, the work board right.
   Note if anything Bootstrap-gridded is ever put back in the rail: the grid keys
   off the VIEWPORT, not the parent, so col-md/col-xl inside this fixed-width
   pane collapse to a fraction of it on a wide screen. */
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
.ops-ov-board{flex:1 1 auto;min-width:0;display:flex;gap:13px;overflow-x:auto;padding-bottom:4px;align-items:flex-start}
/* Drag to move a card between stages. The lifted card stays visible at low
   opacity rather than disappearing, so you can still see what you are holding. */
.ops-ov-card[draggable="true"]{cursor:grab}
.ops-ov-card.dragging{opacity:.4;cursor:grabbing}
.ops-ov-col.dropping{outline:2px dashed var(--at-neutral-400);outline-offset:2px;background:var(--at-neutral-50)}
.ops-ov-notice{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:9px 12px;border-radius:10px;
  background:#FFF4E5;color:#7A4B00;font-size:13px;line-height:1.45}
.ops-ov-notice button{margin-left:auto;border:0;background:transparent;color:inherit;cursor:pointer;
  font-size:16px;line-height:1;padding:0 2px}
.ops-ov-board::-webkit-scrollbar{height:8px}
.ops-ov-board::-webkit-scrollbar-thumb{background:var(--at-neutral-200);border-radius:8px}
.ops-ov-col{flex:0 0 229px;width:229px;min-width:0}
.ops-ov-colhead{display:flex;align-items:baseline;gap:6px;padding:0 2px 12px}
.ops-ov-colhead b{font-size:15px;font-weight:600;color:var(--at-neutral-900)}
.ops-ov-colhead span{font-size:13px;color:var(--at-neutral-400)}
/* ---- Board columns -------------------------------------------------------
   Each column is a tinted panel, and each CARD is tinted too — by its module,
   so the colour carries meaning (green = commerce, blue = inbox, amber = money
   owed …) rather than being decorative. Title text takes the deeper shade of
   the same hue, as in the design. */
.ops-ov-col{flex:0 0 229px;width:229px;min-width:0;border-radius:14px;padding:12px 11px 14px;
  border:1px solid rgba(0,0,0,.05)}
.col-todo  {background:#F6F7FC}
.col-doing {background:#FDF7F2}
.col-review{background:#FDF3F7}
.col-ready {background:#F1F8FD}
.ops-ov-colhead{display:flex;align-items:center;gap:6px;padding:2px 3px 12px}
.ops-ov-colhead b{font-size:13.5px;font-weight:600;color:var(--at-neutral-900)}
.ops-ov-colhead .n{font-size:12px;color:var(--at-neutral-400);margin-right:auto}
.ops-ov-colhead .chev{color:var(--at-neutral-400);font-size:11px}
.ops-ov-colhead .dots{color:var(--at-neutral-400);font-size:13px;letter-spacing:1px}
.ops-ov-empty{border:1px dashed rgba(0,0,0,.13);border-radius:10px;background:transparent;
  min-height:240px;display:flex;align-items:center;justify-content:center;
  padding:22px 14px;text-align:center;font-size:12.5px;color:var(--at-neutral-400)}
/* ---- Work card ----------------------------------------------------------
   Anatomy from the design: #hashtag chips + overflow glyph · coloured title ·
   note line · optional media · optional progress · avatar · count pills. */
.ops-ov-cards{display:flex;flex-direction:column;gap:11px}
.ops-ov-card{display:block;text-decoration:none;border-radius:12px;padding:13px;
  border:1px solid rgba(0,0,0,.04);transition:box-shadow .15s ease,transform .15s ease}
.ops-ov-card:hover,.ops-ov-card:focus-visible{box-shadow:0 8px 20px rgba(0,0,0,.10);transform:translateY(-1px)}
.ops-ov-card-top{display:flex;align-items:center;gap:5px;margin-bottom:9px}
.ops-ov-chip{font-size:10px;font-weight:500;line-height:1;padding:5px 8px;border-radius:6px;
  background:rgba(255,255,255,.72);color:rgba(0,0,0,.62);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;max-width:92px}
.ops-ov-dots{margin-left:auto;color:rgba(0,0,0,.32);font-size:14px;line-height:1;letter-spacing:1px}
.ops-ov-card h3{font-size:14px;font-weight:600;line-height:1.32;margin:0 0 5px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ops-ov-card p{font-size:10.5px;line-height:1.5;color:rgba(0,0,0,.55);margin:0 0 10px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* Media slot: image, video poster or a call-recording strip. Surfaces sit on
   rgba white so they read correctly on every card tint. */
.ops-ov-media{position:relative;border-radius:8px;overflow:hidden;margin:0 0 10px;
  background:rgba(255,255,255,.55);line-height:0}
.ops-ov-media img,.ops-ov-media video{display:block;width:100%;height:118px;object-fit:cover;
  pointer-events:none}
.ops-ov-more{position:absolute;right:7px;bottom:7px;background:rgba(0,0,0,.55);color:#fff;
  font-size:9.5px;font-weight:600;line-height:1;padding:4px 6px;border-radius:5px}
.ops-ov-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.ops-ov-play b{width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;
  display:flex;align-items:center;justify-content:center}
.ops-ov-audio{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:9px 10px;border-radius:8px;
  background:rgba(255,255,255,.6);font-size:10.5px;color:rgba(0,0,0,.66)}
.ops-ov-audio b{flex:0 0 24px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;
  display:flex;align-items:center;justify-content:center}
/* Progress: the dotted meter from the design. Only rendered where there is a
   real ratio behind it (a campaign's sent-vs-recipients), never as decoration. */
.ops-ov-prog{margin:0 0 10px}
.ops-ov-prog-top{display:flex;align-items:center;font-size:10px;color:rgba(0,0,0,.55);margin-bottom:5px}
.ops-ov-prog-top b{margin-left:auto;font-weight:600}
.ops-ov-prog-dots{display:flex;gap:3px}
.ops-ov-prog-dots i{flex:1 1 auto;height:7px;border-radius:99px;background:rgba(255,255,255,.75)}
.ops-ov-prog-dots i.on{background:currentColor}
.ops-ov-who{display:flex;align-items:center;gap:7px;margin-bottom:10px}
.ops-ov-av{width:24px;height:24px;flex:0 0 24px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:9px;font-weight:700;color:#fff;background:rgba(0,0,0,.55);
  box-shadow:0 0 0 2px rgba(255,255,255,.75)}
.ops-ov-who b{display:block;font-size:10.5px;font-weight:600;color:rgba(0,0,0,.78);line-height:1.2;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
.ops-ov-who i{display:block;font-style:normal;font-size:9.5px;color:rgba(0,0,0,.45);line-height:1.2;
  text-transform:capitalize}
.ops-ov-foot{display:flex;align-items:center;gap:6px;font-size:10px;color:rgba(0,0,0,.55)}
.ops-ov-foot .m{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.72);
  border-radius:6px;padding:4px 7px}
.ops-ov-foot .r{margin-left:auto;display:inline-flex;align-items:center;gap:6px}
.ops-ov-foot svg{flex:0 0 auto;opacity:.6}
/* Card tints, keyed to the module. The CSS color property carries the deep
   shade, so the title and the filled progress dots inherit it via currentColor.
   (No backticks in here — this block lives inside a JS template literal.) */
.tint-inbox      {background:#E8EDFB;color:#3B5BC4}
.tint-agent      {background:#EDE7FB;color:#6B4CC4}
.tint-commerce   {background:#E3F5E9;color:#2E8B57}
.tint-invoicing  {background:#FDEEE0;color:#C4703B}
.tint-marketing  {background:#FBE7EE;color:#C43B6B}
.tint-crm        {background:#E3F1FB;color:#2C7BB0}
.tint-reservations,.tint-bookings{background:#FBF3DC;color:#8A6A11}
.tint-settings   {background:#EEF0F3;color:#4A5460}
.ops-ov-card h3{color:currentColor}
/* ---- AI Operator chat ----------------------------------------------------
   Built to the chat design: a dark title band, day separators, grouped bubbles
   (mine lavender on the right, the agent's light on the left) with one
   avatar/name/time footer per group, and a composer carrying attach, send and
   a mic. Fills the rail's height so the thread scrolls inside it and the
   composer stays pinned instead of the page growing. */
/* Appearance lives in operator-chat.css so the panel looks the same wherever it
   is mounted. Only its HEIGHT is set here, because that is genuinely this
   console's business: the rail is a fixed column and the thread scrolls inside
   it. The dashboard home sets its own height the same way. */
.opc{height:calc(100vh - 300px);min-height:460px}
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
  .ops-ov-board{width:100%}
}
@media (max-width:575.98px){
.ops-ov-col{flex:0 0 82%;width:82%}
}
`;

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

// Footer icons — thin line set, matching the card design's calendar / comment /
// link glyphs. Module-level consts, per the house style for inline SVG.
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
      <div className="ops-ov-audio">
        <b aria-hidden="true">{ICON_PLAY}</b>
        Call recording
      </div>
    );
  }
  return (
    <div className="ops-ov-media">
      {first.kind === "video" ? (
        <>
          {/* muted + preload=metadata: a poster frame, not a playing video in a list */}
          <video src={first.url} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
          <span className="ops-ov-play" aria-hidden="true"><b>{ICON_PLAY}</b></span>
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
      {extra > 0 && <span className="ops-ov-more">+{extra}</span>}
    </div>
  );
}

/** Tag text as the design's hashtag chips: "AI Agent" -> "#ai-agent". */
const hashTag = (t: string) => `#${t.toLowerCase().replace(/\s+/g, "-")}`;

/** One work item. The whole card links to the record it was derived from.
 *  The card is tinted by module, so colour tells you which part of the business
 *  a card belongs to before you read it. */
function WorkCardView({
  card, base, currency, dragging, onDragStart, onDragEnd,
}: {
  card: WorkCard; base: string; currency: string; dragging: boolean;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const tags = (card.tags ?? []).slice(0, 2);
  const media = card.media ?? [];
  return (
    <Link
      to={`${base}/${card.to_path}`}
      className={`ops-ov-card tint-${card.module}${dragging ? " dragging" : ""}`}
      aria-label={`${card.title} — ${card.detail}`}
      draggable
      onDragStart={(e) => {
        // A link drags its href by default, which would hand another app a URL
        // instead of moving the card.
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="ops-ov-card-top">
        {tags.map((t) => <span key={t} className="ops-ov-chip">{hashTag(t)}</span>)}
        <span className="ops-ov-dots" aria-hidden="true">•••</span>
      </div>

      <h3>{card.title}</h3>
      <p>{card.detail}</p>

      <CardMedia media={media} />

      {card.progress != null && (
        <div className="ops-ov-prog">
          <div className="ops-ov-prog-top">Progress<b>{card.progress}%</b></div>
          <div className="ops-ov-prog-dots" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < Math.round(card.progress! / 10) ? "on" : ""} />
            ))}
          </div>
        </div>
      )}

      <div className="ops-ov-who">
        <span className="ops-ov-av" aria-hidden="true">{initials(card.who)}</span>
        <span>
          <b>{card.who}</b>
          <i>{card.who_role}</i>
        </span>
      </div>

      <div className="ops-ov-foot">
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
  const currency = org.currency || "USD";
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
      const avail = Math.round(box.height - headH - GAP * 2);
      const canPin = scroller != null && avail >= MIN_PINNED && window.innerWidth >= 992;
      shell.style.setProperty("--ops-head-h", `${headH}px`);
      shell.style.setProperty("--ops-op-h", `${avail}px`);
      shell.classList.toggle("ops-pin", canPin);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    if (scroller) ro.observe(scroller);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={shellRef}>
      <style>{OVERVIEW_CSS}</style>

      <div className="ops-ov">
        {/* ================= Left rail: this console's own data ================= */}
        <div className="ops-ov-side">
          <OperatorChat orgId={orgId} opsBase={opsBase} />
        </div>
        {/* ================= Work board =========================================
            Fed by app_org_work_board: every row that represents outstanding work
            anywhere in this business becomes a card, and its column comes from
            that row's real status. Cards for modules this vertical doesn't run
            are dropped here — the console config owns that decision, not SQL. */}
        {notice && (
          <div className="ops-ov-notice" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
          </div>
        )}

        <div className="ops-ov-board" aria-label="Work board">
          {WORK_COLUMNS.map(({ key, label }) => {
            const cards = visibleCards.filter((c) => c.col === key);
            return (
              <section
                key={key}
                className={`ops-ov-col col-${key}${overCol === key && dragId ? " dropping" : ""}`}
                aria-label={label}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverCol(key); } }}
                onDragLeave={() => setOverCol((c) => (c === key ? null : c))}
                onDrop={(e) => { e.preventDefault(); void drop(e.dataTransfer.getData("text/plain") || dragId || "", key); }}
              >
                <header className="ops-ov-colhead">
                  <span className="chev" aria-hidden="true">›</span>
                  <b>{label}</b>
                  <span className="n">{board?.counts?.[key] ?? 0}</span>
                  <span className="dots" aria-hidden="true">⋮</span>
                </header>
                {cards.length === 0 ? (
                  <div className="ops-ov-empty">Nothing here</div>
                ) : (
                  <div className="ops-ov-cards">
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
  );
}
