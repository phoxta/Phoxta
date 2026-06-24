import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listLocations, createLocation, deleteLocation, listCallLogs, listConversationMessages, type Location, type ConversationMessage } from "@/lib/db/ops/agent";
import type { OpsContext } from "@/layouts/OperatingLayout";

export default function CallCenterPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data, loading, error: loadError, reload } = useCachedData(
    `agent:call-center:${orgId}`,
    async () => {
      const [l, c] = await Promise.all([listLocations(orgId), listCallLogs(orgId)]);
      if (l.error) throw new Error(l.error);
      return { locations: l.data, calls: c.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const locations = data?.locations ?? [];
  const calls = data?.calls ?? [];
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", zip: "", phone: "", services: "" });
  const [test, setTest] = useState({ zip: "", service: "" });
  const [routed, setRouted] = useState<Location | null | "none">(null);
  const [transcriptFor, setTranscriptFor] = useState<string | null>(null);
  const [tMsgs, setTMsgs] = useState<ConversationMessage[]>([]);
  const [tLoading, setTLoading] = useState(false);

  async function openTranscript(convId: string) {
    if (transcriptFor === convId) { setTranscriptFor(null); return; }
    setTranscriptFor(convId);
    setTLoading(true);
    const { data } = await listConversationMessages(convId);
    setTMsgs(data.filter((m) => m.role !== "note"));
    setTLoading(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { error } = await createLocation(orgId, {
      name: form.name,
      zip: form.zip,
      phone: form.phone,
      service_types: form.services.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (error) setError(error);
    else {
      setForm({ name: "", zip: "", phone: "", services: "" });
      reload();
    }
  }

  function runRoute() {
    // Mirrors app_route_location: prefer exact ZIP, then a matching service type.
    const active = locations.filter((l) => l.active);
    const best =
      active.find((l) => l.zip === test.zip && (!test.service || l.service_types.includes(test.service))) ||
      active.find((l) => l.zip === test.zip) ||
      active.find((l) => l.service_types.includes(test.service)) ||
      active[0];
    setRouted(best ?? "none");
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {(error || loadError) && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error || loadError}</div></div>}

      <div className="col-lg-6">
        <h6 className="fw-600 mb-3">Locations</h6>
        <form onSubmit={add} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-6"><input className="form-control rounded-3" placeholder="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="col-md-3"><input className="form-control rounded-3" placeholder="ZIP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            <div className="col-md-3"><input className="form-control rounded-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-12"><input className="form-control rounded-3" placeholder="Service types (comma separated)" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} /></div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Add location</button></div>
          </div>
        </form>
        {locations.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No locations yet. Add branches to route calls by ZIP.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {locations.map((l) => (
              <div key={l.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{l.name} <span className="fz-font-sm neutral-500">{l.zip}</span></div>
                  <div className="fz-font-sm neutral-500">{l.service_types.join(", ") || "All services"}</div>
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await deleteLocation(l.id); reload(); }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">Test ZIP routing</div>
          <div className="d-flex gap-2">
            <input className="form-control rounded-3" placeholder="ZIP" value={test.zip} onChange={(e) => setTest({ ...test, zip: e.target.value })} />
            <input className="form-control rounded-3" placeholder="Service" value={test.service} onChange={(e) => setTest({ ...test, service: e.target.value })} />
            <button type="button" className="btn btn-dark rounded-3 px-3" onClick={runRoute}>Route</button>
          </div>
          {routed === "none" && <div className="fz-font-md neutral-500 mt-2">No matching location.</div>}
          {routed && routed !== "none" && <div className="fz-font-md neutral-700 mt-2">→ Routes to <span className="fw-600">{routed.name}</span> ({routed.phone || routed.zip})</div>}
        </div>
      </div>

      <div className="col-lg-6">
        <h6 className="fw-600 mb-3">Call log</h6>
        {calls.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No calls logged yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {calls.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <div className="fw-600 fz-font-md text-capitalize">{c.direction} · {c.locations?.name ?? "Unassigned"}</div>
                    <div className="fz-font-sm neutral-500">{new Date(c.created_at).toLocaleString()}{c.after_hours ? " · after hours" : ""}</div>
                  </div>
                  <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize">{c.outcome}</span>
                </div>
                {c.recording_url && <audio controls src={c.recording_url} className="w-100 mt-2" style={{ height: 36 }} />}
                {c.conversation_id && (
                  <button type="button" className="btn btn-link btn-sm p-0 mt-1 text-decoration-none" onClick={() => openTranscript(c.conversation_id!)}>
                    {transcriptFor === c.conversation_id ? "Hide transcript" : "View transcript"}
                  </button>
                )}
                {transcriptFor === c.conversation_id && (
                  <div className="border-top border-100 mt-2 pt-2 d-flex flex-column gap-1" style={{ maxHeight: 240, overflow: "auto" }}>
                    {tLoading ? (
                      <div className="neutral-500 fz-font-sm">Loading…</div>
                    ) : tMsgs.length === 0 ? (
                      <div className="neutral-500 fz-font-sm">No transcript captured.</div>
                    ) : (
                      tMsgs.map((m) => (
                        <div key={m.id} className="fz-font-sm" style={{ whiteSpace: "pre-wrap" }}>
                          <span className="fw-600 neutral-700">{m.role === "customer" ? "Caller" : m.role === "agent" ? "Agent" : m.role === "human" ? "You" : m.role}:</span> {m.body}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
