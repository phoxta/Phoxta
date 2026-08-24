import { useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { toast, toastError } from "@/lib/ops/feedback";
import { calendarList, calendarCreate, type CalEvent } from "@/lib/db/ops/google";
import { Card, Empty } from "@/components/dash/Ui";

const CSS = `
.ggx-cal .hrx-pill:disabled { opacity: 0.55; cursor: not-allowed; }
.ggx-alert { background: #fdeaea; color: #dc2626; border: 1px solid #f6c9c9; border-radius: 12px; padding: 10px 14px; font-size: 14px; margin-bottom: 16px; }
.ggx-calhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.ggx-calhead h6 { font-size: 18px; font-weight: 500; letter-spacing: -0.03em; margin: 0; }
.ggx-loading { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 32px 24px; text-align: center; color: var(--hrx-muted); font-size: 14px; }
.ggx-event {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-decoration: none;
  background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-left: 4px solid var(--hrx-blue);
  border-radius: 12px; color: var(--hrx-ink); transition: background-color 0.15s ease, border-color 0.15s ease;
}
.ggx-event:hover { background: #e8effc; border-color: var(--hrx-blue); color: var(--hrx-ink); }
.ggx-event .cal {
  width: 46px; height: 46px; border-radius: 12px; background: var(--hrx-blue); color: #fff; flex-shrink: 0;
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;
}
.ggx-event .cal .d { font-size: 17px; font-weight: 700; }
.ggx-event .cal .m { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
.ggx-event .body { min-width: 0; }
.ggx-event .ttl { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ggx-event .sub { font-size: 13px; color: var(--hrx-muted); display: block; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

export default function CalendarApp({ orgId }: { orgId: string }) {
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ summary: "", start: "", end: "" });

  const { data: events = [], loading, error, reload } = useCachedData<CalEvent[]>(
    `google:calendar:${orgId}`,
    async () => {
      const { data, error } = await calendarList(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.summary || !form.start) return;
    setBusy(true);
    const { ok, error } = await calendarCreate(orgId, { summary: form.summary, start: new Date(form.start).toISOString(), end: new Date(form.end || form.start).toISOString() });
    setBusy(false);
    if (!ok || error) { toastError(error ?? "Couldn't create the event."); return; }
    setShow(false);
    setForm({ summary: "", start: "", end: "" });
    toast("Event created.");
    reload();
  }

  return (
    <div className="ggx-cal" style={{ maxWidth: 640 }}>
      <style>{CSS}</style>
      {error && <div className="ggx-alert" role="alert">{error}</div>}
      <div className="ggx-calhead">
        <h6>Upcoming</h6>
        <button type="button" className="hrx-pill primary" onClick={() => setShow((v) => !v)} aria-expanded={show}>＋ New event</button>
      </div>
      {show && (
        <Card title="New event" className="mb-3">
          <form onSubmit={create}>
            <label className="hrx-field">
              <span>Event title</span>
              <input className="form-control" placeholder="Event title" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required />
            </label>
            <label className="hrx-field">
              <span>Start</span>
              <input type="datetime-local" className="form-control" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            </label>
            <label className="hrx-field">
              <span>End</span>
              <input type="datetime-local" className="form-control" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </label>
            <button type="submit" className="hrx-pill primary" disabled={busy}>{busy ? "Creating…" : "Create event"}</button>
          </form>
        </Card>
      )}
      {loading ? (
        <div className="ggx-loading" role="status">Loading…</div>
      ) : events.length === 0 ? (
        <Empty title="Nothing upcoming" icon={<span aria-hidden="true">📅</span>}>Events you create appear here and on your Google Calendar.</Empty>
      ) : (
        <div className="d-flex flex-column gap-2">
          {events.map((e) => {
            const dt = e.start ? new Date(e.start) : null;
            return (
              <a key={e.id} href={e.link} target="_blank" rel="noreferrer" className="ggx-event">
                <span className="cal" aria-hidden="true">
                  <span className="d">{dt ? dt.getDate() : "·"}</span>
                  <span className="m">{dt ? dt.toLocaleString(undefined, { month: "short" }) : ""}</span>
                </span>
                <span className="body">
                  <span className="ttl">{e.summary}</span>
                  <span className="sub">{dt ? dt.toLocaleString() : ""}{e.location ? ` · ${e.location}` : ""}</span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
