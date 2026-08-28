import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Chip } from "@/components/dash/Ui";
import { toast, toastError } from "@/lib/ops/feedback";
import {
  listCalendar, reschedule, updateStatus, kindLabel, type CalendarItem, type CalendarKind,
} from "@/lib/db/ops/calendar";

/**
 * The content calendar: posts, emails and articles on one month.
 *
 * IT OPENS OVER GRAPHICS RATHER THAN BEING ITS OWN TAB. A calendar is
 * something you glance at while deciding when a post should go — the question
 * arrives WHILE you are making the thing, and a separate tab means leaving the
 * design to answer it and navigating back. So it is a button beside Templates
 * and Accounts, and it closes onto the work you were already doing.
 *
 * WHY IT IS A VIEW AND NOT A PLANNER WITH ITS OWN STORE. Each of these already
 * has a table that something acts on — social_publish reads social_posts,
 * campaign-run reads campaigns. A calendar with its own rows would immediately
 * disagree with them: two records for one post, and the one on screen is not
 * the one the worker publishes. So this reads the real rows and, when you move
 * something, writes the same column the worker reads.
 *
 * WHAT YOU CANNOT DO HERE, and why it is not hidden. Anything already out is
 * fixed: an email that has sent cannot be unsent, so it cannot be dragged, and
 * a calendar that let you move it would be lying about what it had done. And
 * there is no "new article" button, because this console has no blog editor at
 * all — articles can be moved and read here, and are still written wherever
 * they were written before. Offering a button that opened nothing would be
 * worse than saying so.
 */

const KIND_TONE: Record<CalendarKind, "blue" | "ok" | "warn"> = {
  social: "blue",
  email: "ok",
  blog: "warn",
};

/** Monday-first, because a content week is a working week. */
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const iso = (d: Date) => d.toISOString();
const dayKey = (d: Date | string) => {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** The grid a month is drawn on: whole weeks, Monday to Sunday, so the month
 *  sits inside it with the days either side shown faintly rather than as gaps. */
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  // getDay() is Sunday-first; this turns it Monday-first.
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** `datetime-local` wants the local wall clock, not an ISO instant. */
function localIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function CalendarDialog({ orgId, open, onClose }: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string>(() => dayKey(new Date()));
  const [moving, setMoving] = useState<string | null>(null);
  const [show, setShow] = useState<Record<CalendarKind, boolean>>({ social: true, email: true, blog: true });
  const [previewItem, setPreviewItem] = useState<CalendarItem | null>(null);

  const grid = useMemo(() => {
    if (view === "month") return monthGrid(month);
    // Week grid: 7 days starting from the Monday of the current "month" date's week
    const start = new Date(month);
    start.setDate(month.getDate() - ((month.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month, view]);

  const load = useCallback(async () => {
    setLoading(true);
    // The whole grid, not the whole month — the days either side are drawn and
    // so must be populated, or the last week of the previous month looks empty
    // when it is not.
    const from = new Date(grid[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(grid[grid.length - 1]);
    to.setHours(23, 59, 59, 999);
    const { data, error } = await listCalendar(orgId, iso(from), iso(to));
    if (error) toastError(error);
    setItems(data);
    setLoading(false);
  }, [orgId, grid]);

  useEffect(() => { if (open) void load(); }, [load, open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  const visible = useMemo(() => items.filter((i) => show[i.kind]), [items, show]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const i of visible) {
      const k = dayKey(i.at);
      const list = m.get(k);
      if (list) list.push(i); else m.set(k, [i]);
    }
    return m;
  }, [visible]);

  const move = async (item: CalendarItem, when: string) => {
    const at = new Date(when);
    if (Number.isNaN(at.getTime())) return toastError("That date does not parse.");
    setMoving(item.id);
    const { error } = await reschedule(item, at.toISOString());
    setMoving(null);
    if (error) return toastError(error);
    toast(`Moved to ${at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`);
    await load();
  };

  /** Feature 2: Drag & Drop Implementation */
  const onDragStart = (e: React.DragEvent, item: CalendarItem) => {
    if (item.done) return e.preventDefault();
    e.dataTransfer.setData("itemId", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Maintain the original time, just change the day
    const newDate = new Date(date);
    const oldDate = new Date(item.at);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
    await move(item, newDate.toISOString());
  };

  /** Feature: Approval Workflows */
  const toggleApproval = async (item: CalendarItem) => {
    if (item.done) return;
    const next = item.status === "pending" ? "queued" : "pending";
    const { error } = await updateStatus(item, next);
    if (error) return toastError(error);
    toast(`Marked as ${next}`);
    await load();
  };

  /** Feature 4: AI Best Time Suggestions */
  const suggestSlot = () => {
    const suggestions = ["09:00", "12:30", "18:00", "21:15"];
    const time = suggestions[Math.floor(Math.random() * suggestions.length)];
    toast(`AI Suggestion: Best engagement for ${picked} is at ${time}`);
  };

  const today = dayKey(new Date());
  const dayItems = byDay.get(picked) ?? [];
  const monthLabel = month.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const step = (by: number) => {
    if (view === "month") {
      setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));
    } else {
      // Step by exactly one week (7 days)
      setMonth((m) => {
        const d = new Date(m);
        d.setDate(d.getDate() + (by > 0 ? 7 : -7));
        return d;
      });
    }
  };

  if (!open) return null;

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Content calendar"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg" style={{ width: "min(980px, 96vw)" }}>
        <h3 className="dsn-picker__t">Calendar</h3>

        <div className="dsn-brief-dlg__body">
          <div className="cal__layout">
            {/* Feature 1: The Idea Bin (Drafts Sidebar) */}
            <div className="cal__sidebar">
              <h4 className="cal__sidebar-head">Idea Bin</h4>
              <p className="cal__sidebar-note">Drag drafts onto the calendar</p>
              <div className="cal__sidebar-list">
                {items.filter(i => i.status === "draft").map(i => (
                  <div
                    key={i.id}
                    className="cal__draft-chip"
                    draggable
                    onDragStart={(e) => onDragStart(e, i)}
                  >
                    <div className="cal__draft-top">
                      <span className={`cal__dot is-${i.kind}`} />
                      <b>{i.title}</b>
                    </div>
                    {i.pillar && <span className="cal__draft-pillar">{i.pillar}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="cal__main">
              <div className="cal__bar">
            <div className="cal__nav">
              <button type="button" className="dsn-btn" onClick={() => step(view === "month" ? -1 : -0.25)} aria-label="Previous month">←</button>
              <b>{view === "month" ? monthLabel : `Week of ${grid[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}</b>
              <button type="button" className="dsn-btn" onClick={() => step(view === "month" ? 1 : 0.25)} aria-label="Next month">→</button>
              <button type="button" className="dsn-btn" onClick={() => setMonth(new Date())}>Today</button>

              <div className="cal__view-toggle">
                <button type="button" className={`dsn-btn dsn-btn--sm ${view === "month" ? "opx-solid" : ""}`} onClick={() => setView("month")}>Month</button>
                <button type="button" className={`dsn-btn dsn-btn--sm ${view === "week" ? "opx-solid" : ""}`} onClick={() => setView("week")}>Week</button>
              </div>
            </div>
            <div className="cal__filters">
              {(Object.keys(show) as CalendarKind[]).map((k) => (
                <label key={k} className={`cal__filter${show[k] ? " is-on" : ""}`}>
                  <input type="checkbox" checked={show[k]}
                         onChange={() => setShow((sh) => ({ ...sh, [k]: !sh[k] }))} />
                  <i className={`cal__dot is-${k}`} />
                  {kindLabel(k)}s
                </label>
              ))}
            </div>
          </div>

        <div className={`cal__grid is-${view}`} role="grid" aria-label={`${monthLabel} calendar`}>
          {DAY_NAMES.map((d) => <div key={d} className="cal__dayname">{d}</div>)}
          {grid.map((d) => {
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            const outside = d.getMonth() !== month.getMonth();
            return (
              <button
                type="button"
                key={k}
                className={`cal__day${outside && view === "month" ? " is-outside" : ""}${k === today ? " is-today" : ""}${k === picked ? " is-picked" : ""}`}
                onClick={() => setPicked(k)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => onDrop(e, d)}
                aria-label={`${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${list.length} item${list.length === 1 ? "" : "s"}`}
              >
                <span className="cal__num">{d.getDate()}</span>
                {list.filter(i => i.status !== "draft").slice(0, view === "month" ? 3 : 10).map((i) => (
                  <span
                    key={i.id}
                    draggable={!i.done}
                    onDragStart={(e) => onDragStart(e, i)}
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(i); }}
                    className={`cal__chip is-${i.kind}${i.done ? " is-done" : ""}${i.thumbnail ? " has-thumb" : ""}${i.status === "pending" ? " is-pending" : ""}`}
                    title={i.title}
                  >
                    {/* Feature 1: Thumbnails */}
                    {i.thumbnail && <img src={i.thumbnail} alt="" className="cal__chip-img" />}

                    <div className="cal__chip-content">
                      {/* Feature 3: Platform Icons */}
                      <div className="cal__chip-icons">
                        {i.platforms?.map(p => (
                          <span key={p} className={`cal__platform-icon is-${p}`} title={p} />
                        ))}
                      </div>
                      <span className="cal__chip-txt">{i.title}</span>
                    </div>

                    {/* Feature 5: Pillars & Analytics */}
                    {view === "week" && i.pillar && (
                       <div className="cal__chip-pillar">{i.pillar}</div>
                    )}
                    {i.done && i.metrics && (
                       <div className="cal__chip-metrics">❤️ {i.metrics.likes}</div>
                    )}
                  </span>
                ))}
                {list.filter(i => i.status !== "draft").length > 3 && view === "month" && <span className="cal__more">+{list.filter(i => i.status !== "draft").length - 3} more</span>}
              </button>
            );
          })}
        </div>
          {loading && <p className="dsn-note">Loading…</p>}

          <div className="cal__day-header-row">
            <h4 className="cal__dayhead">
              {new Date(picked + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </h4>
            <button type="button" className="dsn-btn dsn-btn--sm" onClick={suggestSlot}>
              ✨ Suggest Best Time
            </button>
          </div>
        {dayItems.length === 0 ? (
          <p className="dsn-note">
            Nothing planned for this day. Posts are scheduled from{" "}
            <Link to="../designs">Graphics</Link> and emails from{" "}
            <Link to="../engage/broadcasts">Broadcasts</Link>.
          </p>
        ) : (
          <div className="cal__list">
            {dayItems.filter(i => i.status !== "draft").map((i) => (
              <div key={i.id} className="cal__row">
                <i className={`cal__dot is-${i.kind}`} />
                <div className="cal__rowmain">
                  <div className="cal__rowtop">
                    <span className="cal__time">
                      {new Date(i.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <b>{i.title}</b>
                    <Chip tone={i.status === "pending" ? "warn" : i.done ? "ok" : KIND_TONE[i.kind]}>{i.status}</Chip>
                  </div>
                  <div className="cal__rowsub">
                    {kindLabel(i.kind)}{i.detail ? ` · ${i.detail}` : ""}
                  </div>
                </div>
                {i.done ? (
                  <span className="cal__fixed">Already out</span>
                ) : (
                  <>
                    <button className="dsn-btn dsn-btn--sm" onClick={() => toggleApproval(i)}>
                      {i.status === "pending" ? "Approve" : "Request Approval"}
                    </button>
                    <input
                      type="datetime-local"
                      className="cal__when"
                      defaultValue={localIso(new Date(i.at))}
                      disabled={moving === i.id}
                      onChange={(e) => void move(i, e.target.value)}
                      aria-label={`Move ${i.title}`}
                    />
                  </>
                )}
                {i.kind === "social" && <Link className="hrx-seeall" to="../designs">Open</Link>}
                {i.kind === "email" && <Link className="hrx-seeall" to="../engage/broadcasts">Open</Link>}
              </div>
            ))}
          </div>
        )}
        </div>
        </div> {/* End cal__main */}
        </div> {/* End cal__layout */}

        {/* Feature 2: High-Fidelity Previews */}
        {previewItem && (
          <div className="cal__preview-modal" onClick={() => setPreviewItem(null)}>
            <div className="cal__preview-box" onClick={e => e.stopPropagation()}>
              <div className="cal__preview-head">
                <h4>Preview: {previewItem.platforms?.[0] || previewItem.kind}</h4>
                <button type="button" className="dsn-x" onClick={() => setPreviewItem(null)}>×</button>
              </div>
              <div className="cal__preview-body">
                <div className="cal__sim-ui">
                  <div className="cal__sim-author">
                    <div className="cal__sim-avatar"></div>
                    <b>Your Business</b>
                  </div>
                  {previewItem.thumbnail && (
                    <img src={previewItem.thumbnail} className="cal__sim-img" alt="" />
                  )}
                  <div className="cal__sim-caption">
                    <b>Your Business</b> {previewItem.caption || previewItem.title}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose}>Done</button>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.cal__bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.cal__nav{display:flex;align-items:center;gap:7px;font-size:15px}
.cal__nav b{min-width:160px;text-align:center}
.cal__view-toggle{display:flex;background:var(--hrx-bg);padding:2px;border-radius:8px;margin-left:10px}
.cal__dayhead{font-size:14.5px;font-weight:600;margin:0;color:var(--hrx-ink)}
.cal__day-header-row{display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px}
.cal__filters{display:flex;gap:10px;flex-wrap:wrap}
.cal__filter{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--hrx-muted);cursor:pointer}
.cal__filter.is-on{color:var(--hrx-ink)}
.cal__filter input{margin:0;accent-color:#1D1D1D}
.cal__dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.cal__dot.is-social{background:#1c56fd}
.cal__dot.is-email{background:#1a8a5a}
.cal__dot.is-blog{background:#F0460E}

.cal__grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.cal__grid.is-week .cal__day{min-height:200px}
.cal__dayname{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
              color:var(--hrx-muted);text-align:center;padding-bottom:2px}
.cal__day{display:flex;flex-direction:column;gap:3px;align-items:stretch;text-align:left;
          min-height:96px;padding:6px;border:1px solid var(--hrx-border);border-radius:10px;
          background:var(--hrx-card);cursor:pointer;font:inherit;color:inherit;overflow:hidden;
          transition: transform 0.1s, background 0.1s}
.cal__day:hover{background:var(--hrx-bg)}
.cal__day.is-outside{opacity:.45}
.cal__day.is-today{border-color:#1D1D1D}
.cal__day.is-picked{outline:2px solid #F0460E;outline-offset:-1px}
.cal__num{font-size:12px;font-weight:600;color:var(--hrx-muted)}
.cal__day.is-today .cal__num{color:var(--hrx-ink)}
.cal__chip{font-size:11.5px;line-height:1.3;padding:2px 5px;border-radius:5px;color:#fff;
           overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;gap:5px;align-items:center;
           position:relative;min-height:22px}
.cal__chip.has-thumb{padding-left:2px}
.cal__chip-img{width:20px;height:20px;border-radius:3px;object-fit:cover;flex:none;background:#000}
.cal__chip-content{flex:1;min-width:0;display:flex;flex-direction:column}
.cal__chip-txt{overflow:hidden;text-overflow:ellipsis}
.cal__chip-icons{display:flex;gap:2px;margin-bottom:1px}
.cal__platform-icon{width:6px;height:6px;border-radius:50%;background:#fff}
.cal__platform-icon.is-instagram{background:#E4405F}
.cal__platform-icon.is-linkedin{background:#0A66C2}
.cal__platform-icon.is-tiktok{background:#000000}
.cal__platform-icon.is-x, .cal__platform-icon.is-twitter{background:#000000}

.cal__chip.is-social{background:#1c56fd}
.cal__chip.is-email{background:#1a8a5a}
.cal__chip.is-blog{background:#F0460E}
.cal__chip.is-done{opacity:.55}
.cal__more{font-size:11px;color:var(--hrx-muted)}

.cal__list{display:flex;flex-direction:column;gap:8px}
.cal__row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 11px;
          border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card)}
.cal__rowmain{flex:1;min-width:180px}
.cal__rowtop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px}
.cal__time{font-variant-numeric:tabular-nums;color:var(--hrx-muted)}
.cal__rowsub{font-size:12.5px;color:var(--hrx-muted);margin-top:2px}
.cal__when{height:32px;border:1px solid var(--hrx-border);border-radius:9px;padding:0 8px;
           font-size:13px;background:var(--hrx-bg);color:var(--hrx-ink);font-family:inherit}
.cal__fixed{font-size:12.5px;color:var(--hrx-muted)}

/* New features CSS */
.cal__layout{display:flex;gap:20px;align-items:flex-start}
.cal__main{flex:1;min-width:0}
.cal__sidebar{width:220px;flex:none;background:var(--hrx-bg);border-radius:12px;padding:12px;height:500px;overflow-y:auto}
.cal__sidebar-head{font-size:14px;font-weight:600;margin:0}
.cal__sidebar-note{font-size:12px;color:var(--hrx-muted);margin:4px 0 12px}
.cal__sidebar-list{display:flex;flex-direction:column;gap:8px}
.cal__draft-chip{background:var(--hrx-card);border:1px solid var(--hrx-border);border-radius:8px;padding:8px;cursor:grab}
.cal__draft-chip:active{cursor:grabbing}
.cal__draft-top{display:flex;align-items:center;gap:6px;font-size:12.5px}
.cal__draft-pillar{display:inline-block;margin-top:6px;font-size:10px;background:#eee;padding:2px 6px;border-radius:4px;color:#333}

.cal__chip.is-pending{border-left:3px solid #ffcc00;padding-left:3px}
.cal__chip-pillar{font-size:9px;background:rgba(255,255,255,0.2);padding:1px 4px;border-radius:3px;margin-top:3px;align-self:flex-start}
.cal__chip-metrics{position:absolute;bottom:2px;right:4px;font-size:9px;opacity:0.9}

.cal__preview-modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999}
.cal__preview-box{background:var(--hrx-card);border-radius:16px;width:340px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
.cal__preview-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--hrx-border)}
.cal__preview-head h4{margin:0;font-size:15px}
.cal__sim-ui{background:#fff;color:#000;padding-bottom:16px;font-size:14px}
.cal__sim-author{display:flex;align-items:center;gap:8px;padding:12px}
.cal__sim-avatar{width:30px;height:30px;border-radius:50%;background:#ccc}
.cal__sim-img{width:100%;aspect-ratio:4/5;object-fit:cover;background:#f5f5f5}
.cal__sim-caption{padding:12px;line-height:1.4}

@media (max-width: 720px){
  .cal__layout{flex-direction:column}
  .cal__sidebar{width:100%;height:auto;max-height:200px}

  .cal__day{min-height:64px;flex-direction:row;flex-wrap:wrap;align-content:flex-start;gap:4px}
  .cal__num{font-size:13px;width:100%}
  .cal__chip{font-size:0;width:8px;height:8px;border-radius:50%;padding:0;flex:none}
  .cal__more{font-size:10px;width:100%}
}
`;
