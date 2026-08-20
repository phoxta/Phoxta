import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  DASHBOARD_TTL, getWorkBoard, WORK_COLUMNS,
  type WorkBoard, type WorkCard, type WorkMedia,
} from "@/lib/cache/dashboardQueries";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";

/**
 * Overview styles, kept local so the global stylesheet stays untouched: the
 * two-pane shell (data rail + work board) and the work card itself.
 */
const OVERVIEW_CSS = `
/* ---- Overview shell: console data rail + task board ----------------------
   Two panes side by side: the AI Operator on the left, the work board right.
   Note if anything Bootstrap-gridded is ever put back in the rail: the grid keys
   off the VIEWPORT, not the parent, so col-md/col-xl inside this fixed-width
   pane collapse to a fraction of it on a wide screen. */
.ops-ov{display:flex;gap:20px;align-items:flex-start}
.ops-ov-side{width:460px;flex:0 0 460px;min-width:0}
.ops-ov-board{flex:1 1 auto;min-width:0;display:flex;gap:13px;overflow-x:auto;padding-bottom:4px;align-items:flex-start}
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
.opc{display:flex;flex-direction:column;background:var(--at-neutral-0);border:1px solid rgba(0,0,0,.07);
  border-radius:14px;overflow:hidden;height:calc(100vh - 300px);min-height:460px}
.opc-head{background:#4B4557;padding:22px 20px;display:flex;align-items:center;gap:10px}
.opc-head h2{margin:0;font-size:30px;font-weight:700;line-height:1.1;color:#fff;letter-spacing:-.01em}
.opc-head a{margin-left:auto;font-size:11px;color:rgba(255,255,255,.72);text-decoration:none;white-space:nowrap}
.opc-head a:hover{color:#fff}

.opc-body{flex:1 1 auto;overflow-y:auto;padding:16px 15px;display:flex;flex-direction:column;gap:4px;
  background:var(--at-neutral-0)}
.opc-day{display:flex;align-items:center;justify-content:center;margin:12px 0 14px}
.opc-day span{font-size:10.5px;color:var(--at-neutral-400)}

.opc-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.opc-group.mine{align-items:flex-end}
.opc-group.theirs{align-items:flex-start}
.opc-row{display:flex;align-items:flex-end;gap:6px;max-width:86%}
.opc-group.mine .opc-row{flex-direction:row}
.opc-bubble{padding:9px 12px;border-radius:12px;font-size:11.5px;line-height:1.55;white-space:pre-wrap;
  word-break:break-word}
.opc-group.theirs .opc-bubble{background:var(--at-neutral-0);border:1px solid var(--at-neutral-200);
  color:var(--at-neutral-900);border-bottom-left-radius:4px}
.opc-group.mine .opc-bubble{background:#B9AEE0;color:#241F33;border-bottom-right-radius:4px}
.opc-tick{color:#22A45D;flex:0 0 auto;margin-bottom:2px}
/* Read-aloud, on the agent's messages. Uses the browser's own speech synthesis,
   so it costs nothing and works with no provider configured. */
.opc-say{flex:0 0 auto;border:0;background:transparent;padding:2px;margin-bottom:2px;cursor:pointer;
  color:var(--at-neutral-400);display:flex;align-items:center;justify-content:center;border-radius:5px}
.opc-say:hover{color:var(--at-neutral-900);background:var(--at-neutral-100)}
.opc-say.on{color:#7C5CD6}

.opc-meta{display:flex;align-items:center;gap:6px;padding:0 2px}
.opc-group.mine .opc-meta{flex-direction:row-reverse}
.opc-av{width:19px;height:19px;flex:0 0 19px;border-radius:50%;background:var(--at-neutral-900);color:#fff;
  font-size:7.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.opc-meta b{font-size:10.5px;font-weight:600;color:var(--at-neutral-900)}
.opc-meta i{font-size:9.5px;font-style:normal;color:var(--at-neutral-400)}

/* Attachments: images tile, video/audio get real controls, everything else is a
   download row. Signed URLs, so these are live objects not public links. */
.opc-att{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.opc-grid{display:grid;grid-template-columns:1fr;gap:6px}
.opc-grid.multi{grid-template-columns:1fr 1fr}
.opc-grid img{width:100%;height:110px;object-fit:cover;border-radius:8px;display:block;background:var(--at-neutral-100)}
.opc-video{width:100%;max-height:170px;border-radius:8px;display:block;background:#000}
.opc-audio{width:100%;height:34px}
.opc-file{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;text-decoration:none;
  background:rgba(0,0,0,.05);color:inherit}
.opc-file-ic{flex:0 0 auto;opacity:.7}
.opc-file-meta b{display:block;font-size:11px;font-weight:600}
.opc-file-meta i{display:block;font-size:9.5px;font-style:normal;opacity:.65}

.opc-typing{display:flex;gap:4px;align-items:center}
.opc-typing i{width:5px;height:5px;border-radius:50%;background:var(--at-neutral-400);
  animation:opcBlink 1.2s infinite ease-in-out}
.opc-typing i:nth-child(2){animation-delay:.18s}
.opc-typing i:nth-child(3){animation-delay:.36s}
@keyframes opcBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
@media (prefers-reduced-motion:reduce){.opc-typing i{animation:none;opacity:.6}}

.opc-empty{margin:auto 0;text-align:center;color:var(--at-neutral-500);font-size:12px}
.opc-empty p{margin:0 0 12px}
.opc-starters{display:flex;flex-direction:column;gap:7px}
.opc-starters button{background:transparent;border:1px solid var(--at-neutral-200);border-radius:999px;
  padding:7px 12px;font-size:11px;color:var(--at-neutral-700);cursor:pointer;text-align:left}
.opc-starters button:hover{border-color:var(--at-neutral-400);color:var(--at-neutral-900)}
.opc-tools{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}
.opc-tools span{font-size:10px;background:#E2E5FB;color:#2F3337;border-radius:5px;padding:3px 7px}
.opc-err{font-size:11px;color:#B02A37;background:#FBE3E5;border-radius:8px;padding:8px 10px}

.opc-pending{display:flex;flex-wrap:wrap;gap:6px;padding:9px 12px 0}
.opc-pending span{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;background:var(--at-neutral-100);
  border-radius:6px;padding:4px 6px 4px 8px;color:var(--at-neutral-700)}
.opc-pending button{border:0;background:transparent;cursor:pointer;font-size:13px;line-height:1;
  color:var(--at-neutral-500);padding:0 2px}

.opc-form{display:flex;align-items:center;gap:9px;padding:11px 12px 13px}
.opc-input{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;background:var(--at-neutral-0);
  border:1px solid var(--at-neutral-200);border-radius:999px;padding:5px 6px 5px 11px}
.opc-clip,.opc-send{border:0;background:transparent;cursor:pointer;color:var(--at-neutral-500);
  display:flex;align-items:center;justify-content:center;padding:3px}
.opc-clip:hover,.opc-send:hover{color:var(--at-neutral-900)}
.opc-clip:disabled,.opc-send:disabled{opacity:.35;cursor:default}
.opc-text{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;font-size:11.5px;padding:5px 0;
  color:var(--at-neutral-900)}
.opc-text::placeholder{color:var(--at-neutral-400)}
.opc-mic{flex:0 0 38px;width:38px;height:38px;border:0;border-radius:50%;background:#7C5CD6;color:#fff;
  display:flex;align-items:center;justify-content:center;cursor:pointer}
.opc-mic:hover{background:#6B4CC4}
.opc-mic.on{background:#D64550}

@media (max-width:991.98px){.opc{height:auto;min-height:0;max-height:72vh}.opc-head h2{font-size:24px}}

/* Below lg the two panes stack: the rail goes full width and the board keeps
   its own horizontal scroll rather than squeezing the columns. */
@media (max-width:991.98px){
  .ops-ov{flex-direction:column;gap:28px}
  .ops-ov-side{width:100%;flex:1 1 auto}
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
function WorkCardView({ card, base, currency }: { card: WorkCard; base: string; currency: string }) {
  const tags = (card.tags ?? []).slice(0, 2);
  const media = card.media ?? [];
  return (
    <Link
      to={`${base}/${card.to_path}`}
      className={`ops-ov-card tint-${card.module}`}
      aria-label={`${card.title} — ${card.detail}`}
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
  const { data: board } = useCachedData<WorkBoard>(
    `ops:board:${orgId}`,
    () => getWorkBoard(orgId),
    { ttl: DASHBOARD_TTL },
  );

  // Currency comes straight off the org record now that the windowed RPC (which
  // also returned it) is gone — same source, one fewer round trip.
  const currency = org.currency || "USD";
  const opsBase = `/dashboard/businesses/${orgId}/ops`;
  // A card for a module this vertical doesn't run would link to a tab that isn't
  // in the console — drop those rather than render dead links.
  const visibleCards = (board?.cards ?? []).filter((c) => cfg.modules.includes(c.module));

  return (
    <div>
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
        <div className="ops-ov-board" aria-label="Work board">
          {WORK_COLUMNS.map(({ key, label }) => {
            const cards = visibleCards.filter((c) => c.col === key);
            return (
              <section key={key} className={`ops-ov-col col-${key}`} aria-label={label}>
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
                      <WorkCardView key={c.id} card={c} base={opsBase} currency={currency} />
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
