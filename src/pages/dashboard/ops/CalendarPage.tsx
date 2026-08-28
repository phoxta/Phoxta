import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Card, Chip, PageHeader } from "@/components/dash/Ui";
import { toast, toastError } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
  listCalendar, reschedule, kindLabel, type CalendarItem, type CalendarKind,
} from "@/lib/db/ops/calendar";

/**
 * The content calendar: posts, emails and articles on one month.
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

export default function CalendarPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [month, setMonth] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string>(() => dayKey(new Date()));
  const [moving, setMoving] = useState<string | null>(null);
  const [show, setShow] = useState<Record<CalendarKind, boolean>>({ social: true, email: true, blog: true });

  const grid = useMemo(() => monthGrid(month), [month]);

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

  useEffect(() => { void load(); }, [load]);

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

  const today = dayKey(new Date());
  const dayItems = byDay.get(picked) ?? [];
  const monthLabel = month.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const step = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

  return (
    <>
      <PageHeader
        crumb="Console"
        title="Calendar"
        note="Everything you have planned — posts, emails and articles — on one month."
        actions={
          <>
            <button type="button" className="hrx-pill" onClick={() => step(-1)} aria-label="Previous month">←</button>
            <button type="button" className="hrx-pill" onClick={() => setMonth(new Date())}>Today</button>
            <button type="button" className="hrx-pill" onClick={() => step(1)} aria-label="Next month">→</button>
          </>
        }
      />

      <Card
        title={monthLabel}
        right={
          <div className="cal__filters">
            {(Object.keys(show) as CalendarKind[]).map((k) => (
              <label key={k} className={`cal__filter${show[k] ? " is-on" : ""}`}>
                <input type="checkbox" checked={show[k]}
                       onChange={() => setShow((s) => ({ ...s, [k]: !s[k] }))} />
                <i className={`cal__dot is-${k}`} />
                {kindLabel(k)}s
              </label>
            ))}
          </div>
        }
      >
        <div className="cal__grid" role="grid" aria-label={`${monthLabel} calendar`}>
          {DAY_NAMES.map((d) => <div key={d} className="cal__dayname">{d}</div>)}
          {grid.map((d) => {
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            const outside = d.getMonth() !== month.getMonth();
            return (
              <button
                type="button"
                key={k}
                className={`cal__day${outside ? " is-outside" : ""}${k === today ? " is-today" : ""}${k === picked ? " is-picked" : ""}`}
                onClick={() => setPicked(k)}
                aria-label={`${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${list.length} item${list.length === 1 ? "" : "s"}`}
              >
                <span className="cal__num">{d.getDate()}</span>
                {/* Three, then a count. A day with nine things on it must not
                    make its row nine rows tall and push the rest off screen. */}
                {list.slice(0, 3).map((i) => (
                  <span key={i.id} className={`cal__chip is-${i.kind}${i.done ? " is-done" : ""}`} title={i.title}>
                    {i.title}
                  </span>
                ))}
                {list.length > 3 && <span className="cal__more">+{list.length - 3} more</span>}
              </button>
            );
          })}
        </div>
        {loading && <p className="dsn-note">Loading…</p>}
      </Card>

      <Card title={new Date(picked + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })}>
        {dayItems.length === 0 ? (
          <p className="dsn-note">
            Nothing planned for this day. Posts are scheduled from{" "}
            <Link to="../designs">Graphics</Link> and emails from{" "}
            <Link to="../engage/broadcasts">Broadcasts</Link>.
          </p>
        ) : (
          <div className="cal__list">
            {dayItems.map((i) => (
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
      </Card>

      <style>{CSS}</style>
    </>
  );
}

const CSS = `
.cal__filters{display:flex;gap:10px;flex-wrap:wrap}
.cal__filter{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--hrx-muted);cursor:pointer}
.cal__filter.is-on{color:var(--hrx-ink)}
.cal__filter input{margin:0;accent-color:#1D1D1D}
.cal__dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.cal__dot.is-social{background:#1c56fd}
.cal__dot.is-email{background:#1a8a5a}
.cal__dot.is-blog{background:#F0460E}

.cal__grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.cal__dayname{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
              color:var(--hrx-muted);text-align:center;padding-bottom:2px}
.cal__day{display:flex;flex-direction:column;gap:3px;align-items:stretch;text-align:left;
          min-height:96px;padding:6px;border:1px solid var(--hrx-border);border-radius:10px;
          background:var(--hrx-card);cursor:pointer;font:inherit;color:inherit;overflow:hidden}
.cal__day.is-outside{opacity:.45}
.cal__day.is-today{border-color:#1D1D1D}
.cal__day.is-picked{outline:2px solid #F0460E;outline-offset:-1px}
.cal__num{font-size:12px;font-weight:600;color:var(--hrx-muted)}
.cal__day.is-today .cal__num{color:var(--hrx-ink)}
.cal__chip{font-size:11.5px;line-height:1.3;padding:2px 5px;border-radius:5px;color:#fff;
           overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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

@media (max-width: 720px){
  .cal__day{min-height:64px;flex-direction:row;flex-wrap:wrap;align-content:flex-start;gap:4px}
  .cal__num{font-size:13px;width:100%}
  .cal__chip{font-size:0;width:8px;height:8px;border-radius:50%;padding:0;flex:none}
  .cal__more{font-size:10px;width:100%}
}
`;
