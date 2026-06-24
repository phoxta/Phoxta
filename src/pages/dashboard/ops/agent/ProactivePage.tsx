import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
    listAiAutomations,
    createAiAutomation,
    toggleAutomation,
    removeAutomation,
    runAutomation,
    listAutomationRuns,
    type Automation,
} from "@/lib/db/ops/proactive";

export default function ProactivePage() {
    const { orgId } = useOutletContext<OpsContext>();
    const { data, loading, error: loadError, reload } = useCachedData(
        `agent:proactive:${orgId}`,
        async () => {
            const [a, r] = await Promise.all([listAiAutomations(orgId), listAutomationRuns(orgId)]);
            return { autos: a.data, runs: r.data };
        },
        { ttl: DASHBOARD_TTL },
    );
    const autos = data?.autos ?? [];
    const runs = data?.runs ?? [];
    const [form, setForm] = useState<{ name: string; action: "ai_briefing" | "ai_task"; schedule: "schedule_daily" | "schedule_weekly"; instruction: string; channel: "email" | "dashboard" }>({ name: "", action: "ai_briefing", schedule: "schedule_daily", instruction: "", channel: "email" });
    const [busy, setBusy] = useState(false);
    const [running, setRunning] = useState<string | null>(null);
    const [output, setOutput] = useState<{ id: string; text: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function create(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) { setError("Give it a name."); return; }
        setBusy(true);
        setError(null);
        const { error } = await createAiAutomation(orgId, form);
        setBusy(false);
        if (error) return setError(error);
        setForm({ name: "", action: "ai_briefing", schedule: "schedule_daily", instruction: "", channel: "email" });
        reload();
    }
    async function run(a: Automation) {
        setRunning(a.id);
        setOutput(null);
        setError(null);
        const { output: out, error } = await runAutomation(a.id);
        setRunning(null);
        if (error) return setError(error);
        setOutput({ id: a.id, text: out ?? "" });
        reload();
    }

    const scheduleLabel = (t: string) => (t === "schedule_weekly" ? "Weekly" : "Daily");
    const actionLabel = (a: string) => (a === "ai_task" ? "AI task" : "AI briefing");

    if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

    return (
        <div className="row g-4">
            <div className="col-lg-5">
                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-1">New automation</h6>
                    <p className="fz-font-sm neutral-500 mb-3">Have the AI run on a schedule — a briefing it emails you, or a task it performs.</p>
                    <form onSubmit={create} className="d-flex flex-column gap-2">
                        <input className="form-control rounded-3" placeholder="Name (e.g. Morning briefing)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <div className="row g-2">
                            <div className="col-6"><select className="form-select rounded-3" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as typeof form.action })}><option value="ai_briefing">AI briefing</option><option value="ai_task">AI task</option></select></div>
                            <div className="col-6"><select className="form-select rounded-3" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value as typeof form.schedule })}><option value="schedule_daily">Daily</option><option value="schedule_weekly">Weekly</option></select></div>
                        </div>
                        <textarea className="form-control rounded-3" rows={3} placeholder={form.action === "ai_task" ? "What should the AI do? (e.g. draft a blog post about this week's new arrivals)" : "What to include (optional — defaults to a full business briefing)"} value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} />
                        <select className="form-select rounded-3" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}><option value="email">Email it to me</option><option value="dashboard">Dashboard only</option></select>
                        <button className="btn btn-dark rounded-3" disabled={busy}>{busy ? "…" : "Create automation"}</button>
                    </form>
                    {(error || loadError) && <div className="alert alert-warning py-2 px-3 fz-font-sm mt-3 mb-0">{error || loadError}</div>}
                </div>
            </div>

            <div className="col-lg-7 d-flex flex-column gap-4">
                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">Your automations</h6>
                    {autos.length === 0 ? (
                        <p className="neutral-500 fz-font-md mb-0">None yet. Create one on the left — try a daily "Morning briefing".</p>
                    ) : (
                        <div className="d-flex flex-column gap-2">
                            {autos.map((a) => (
                                <div key={a.id} className="border-100 rounded-3 p-3">
                                    <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                        <div>
                                            <span className="fw-600">{a.name}</span>
                                            <span className="fz-font-sm neutral-500"> · {actionLabel(a.action)} · {scheduleLabel(a.trigger)}{a.last_run_at ? ` · last run ${new Date(a.last_run_at).toLocaleString()}` : ""}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <button className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => run(a)} disabled={running === a.id}>{running === a.id ? "Running…" : "Run now"}</button>
                                            <div className="form-check form-switch m-0"><input className="form-check-input" type="checkbox" checked={a.active} onChange={async (e) => { await toggleAutomation(a.id, e.target.checked); reload(); }} /></div>
                                            <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await removeAutomation(a.id); reload(); }}>Remove</button>
                                        </div>
                                    </div>
                                    {output?.id === a.id && <div className="mt-2 p-2 bg-neutral-50 rounded-3 fz-font-sm neutral-900" style={{ whiteSpace: "pre-wrap" }}>{output.text}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">Recent runs</h6>
                    {runs.length === 0 ? (
                        <p className="neutral-500 fz-font-md mb-0">No runs yet.</p>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {runs.slice(0, 6).map((r) => (
                                <div key={r.id} className="fz-font-sm">
                                    <span className="neutral-500">{new Date(r.created_at).toLocaleString()}</span>
                                    <div className="neutral-700" style={{ whiteSpace: "pre-wrap" }}>{r.output.slice(0, 400)}{r.output.length > 400 ? "…" : ""}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
