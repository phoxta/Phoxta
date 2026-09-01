import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Chip } from "@/components/dash/Ui";
import { toast, toastError } from "@/lib/ops/feedback";
import {
  listCalendar, reschedule, kindLabel, type CalendarItem, type CalendarKind,
} from "@/lib/db/ops/calendar";
import { localIso, DesignArt } from "./shared";

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
 * something, the move goes to the row the worker reads (see reschedule for how
 * each kind travels).
 *
 * WHAT YOU CANNOT DO HERE, and why it is not hidden. Anything already out is
 * fixed: an email that has sent cannot be unsent, so it cannot be dragged, and
 * a calendar that let you move it would be lying about what it had done. And
 * there is no "new article" button, because this console has no blog editor at
 * all — articles can be moved and read here, and are still written wherever
 * they were written before. Offering a button that opened nothing would be
 * worse than saying so.
 *
 * EVERY NUMBER ON IT IS A READ. Engagement counts come from the cached
 * insights social-insights wrote onto social_targets, the same columns the
 * queue shows — and a post whose counts were never read shows none, because
 * "not read yet" and "nobody engaged" are different facts. This dialog used to
 * invent likes and a "content pillar" per item on every load; nothing here is
 * invented any more.
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
    const { error, outcome } = await reschedule(orgId, item, at.toISOString());
    setMoving(null);
    if (error) return toastError(error);
    const stamp = at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    // Three different truths, said apart: a plan's draft is still a draft, a
    // standalone draft just became a promise to publish, and a queued post
    // simply changed its day.
    toast(
      outcome === "draft-moved" ? `Moved to ${stamp} — still a draft; approve the plan to queue it.`
        : outcome === "queued" ? `Queued for ${stamp}.`
        : `Moved to ${stamp}.`,
    );
    await load();
  };

  const onDragStart = (e: React.DragEvent, item: CalendarItem) => {
    if (item.done) return e.preventDefault();
    e.dataTransfer.setData("itemId", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Keep the original time of day; the drop only chooses the day.
    const newDate = new Date(date);
    const oldDate = new Date(item.at);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes());

    // Dropping a standalone draft is the moment it stops being an idea:
    // there is no plan to approve it later, so queueing is the only way it
    // ever publishes — and that deserves one explicit yes, not a silent flip.
    if (item.kind === "social" && item.status === "draft" && !item.planId) {
      const day = newDate.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      if (!window.confirm(`Queue "${item.title}" for ${day}? It will publish to its channels at that time.`)) return;
    }
    await move(item, newDate.toISOString());
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
            {/* The Idea Bin: drafts, waiting to be given a day. A plan's
                drafts stay drafts when dragged — the plan is the approval
                unit — and a standalone draft asks before it queues. */}
            <div className="cal__sidebar">
              <h4 className="cal__sidebar-head">Idea Bin</h4>
              <p className="cal__sidebar-note">Drag drafts onto the calendar</p>
              <div className="cal__sidebar-list">
                {items.filter((i) => i.status === "draft").map((i) => (
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
                    {i.planId && <span className="cal__draft-plan">Part of a plan</span>}
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
                {list.filter((i) => i.status !== "draft").slice(0, view === "month" ? 3 : 10).map((i) => (
                  <span
                    key={i.id}
                    draggable={!i.done}
                    onDragStart={(e) => onDragStart(e, i)}
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(i); }}
                    className={`cal__chip is-${i.kind}${i.done ? " is-done" : ""}${i.thumbnail ? " has-thumb" : ""}`}
                    title={i.title}
                  >
                    {i.thumbnail && <img src={i.thumbnail} alt="" className="cal__chip-img" />}

                    <div className="cal__chip-content">
                      <div className="cal__chip-icons">
                        {i.platforms?.map((p) => (
                          <span key={p} className={`cal__platform-icon is-${p}`} title={p} />
                        ))}
                      </div>
                      <span className="cal__chip-txt">{i.title}</span>
                    </div>

                    {/* Only when the platform has actually reported — an
                        unread post shows nothing rather than a zero. */}
                    {i.done && i.metrics && (
                       <div className="cal__chip-metrics">{i.metrics.likes} likes</div>
                    )}
                  </span>
                ))}
                {list.filter((i) => i.status !== "draft").length > 3 && view === "month" && <span className="cal__more">+{list.filter((i) => i.status !== "draft").length - 3} more</span>}
              </button>
            );
          })}
        </div>
          {loading && <p className="dsn-note">Loading…</p>}

          <h4 className="cal__dayhead">
            {new Date(picked + "T12:00:00").toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </h4>
        {dayItems.length === 0 ? (
          <p className="dsn-note">
            Nothing planned for this day. Posts are scheduled from{" "}
            <Link to="../designs">Graphics</Link> and emails from{" "}
            <Link to="../engage/broadcasts">Broadcasts</Link>.
          </p>
        ) : (
          <div className="cal__list">
            {dayItems.filter((i) => i.status !== "draft").map((i) => (
              <div key={i.id} className="cal__row">
                <i className={`cal__dot is-${i.kind}`} />
                <div className="cal__rowmain">
                  <div className="cal__rowtop">
                    <span className="cal__time">
                      {new Date(i.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <b>{i.title}</b>
                    <Chip tone={i.done ? "ok" : KIND_TONE[i.kind]}>{i.status}</Chip>
                  </div>
                  <div className="cal__rowsub">
                    {kindLabel(i.kind)}{i.detail ? ` · ${i.detail}` : ""}
                    {i.metrics && ` · ${i.metrics.likes} likes · ${i.metrics.comments} comments`}
                  </div>
                </div>
                {i.done ? (
                  <span className="cal__fixed">Already out</span>
                ) : (
                  <input
                    type="datetime-local"
                    className="cal__when"
                    defaultValue={localIso(new Date(i.at))}
                    disabled={moving === i.id}
                    onChange={(e) => void move(i, e.target.value)}
                    aria-label={`Move ${i.title}`}
                  />
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

        {previewItem && (
          <div className="cal__preview-modal" onClick={() => setPreviewItem(null)}>
            <div className="cal__preview-box" onClick={(e) => e.stopPropagation()}>
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
                  {/* The rasterised picture when one exists; otherwise the
                      design itself, drawn client-side — a planned post has no
                      picture until the day it goes out. */}
                  {previewItem.thumbnail ? (
                    <img src={previewItem.thumbnail} className="cal__sim-img" alt="" />
                  ) : previewItem.designId ? (
                    <div className="cal__sim-art"><DesignArt designId={previewItem.designId} width={308} /></div>
                  ) : null}
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
    </div>
  );
}
