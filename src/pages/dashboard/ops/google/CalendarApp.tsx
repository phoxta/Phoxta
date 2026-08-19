import { useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { toast, toastError } from "@/lib/ops/feedback";
import { calendarList, calendarCreate, type CalEvent } from "@/lib/db/ops/google";

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
    <div style={{ maxWidth: 640 }}>
      {error && <div className="alert alert-danger py-2 px-3 fz-font-md mb-3" role="alert">{error}</div>}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-600 mb-0">Upcoming</h6>
        <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => setShow((v) => !v)} aria-expanded={show}>＋ New event</button>
      </div>
      {show && (
        <form onSubmit={create} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3 d-flex flex-column gap-2">
          <input className="form-control form-control-sm rounded-3" aria-label="Event title" placeholder="Event title" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required />
          <label className="fz-font-sm neutral-500 mb-0">Start<input type="datetime-local" className="form-control form-control-sm rounded-3" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></label>
          <label className="fz-font-sm neutral-500 mb-0">End<input type="datetime-local" className="form-control form-control-sm rounded-3" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
          <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3 align-self-start" disabled={busy}>{busy ? "Creating…" : "Create event"}</button>
        </form>
      )}
      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500" role="status">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Nothing upcoming.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {events.map((e) => (
            <a key={e.id} href={e.link} target="_blank" rel="noreferrer" className="bg-neutral-0 rounded-4 p-3 border-100 text-decoration-none d-block">
              <div className="fw-600 neutral-900">{e.summary}</div>
              <div className="fz-font-sm neutral-500">{e.start ? new Date(e.start).toLocaleString() : ""}{e.location ? ` · ${e.location}` : ""}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
