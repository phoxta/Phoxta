import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listCampaigns,
  createCampaign,
  queueCampaign,
  listTasks,
  runAgentWorker,
  type OutboundCampaign,
} from "@/lib/db/ops/agent";
import { listContacts } from "@/lib/db/ops/crm";
import type { OpsContext } from "@/layouts/OperatingLayout";

const TYPES = [
  { value: "cold_call", label: "Cold calling / SDR" },
  { value: "upsell", label: "Upsell" },
  { value: "cross_sell", label: "Cross-sell" },
  { value: "nurture", label: "Lead nurturing" },
];
const TASK_STYLE: Record<string, string> = {
  queued: "bg-neutral-100 neutral-700",
  in_progress: "bg-warning-subtle text-warning",
  done: "bg-success-subtle text-success",
  failed: "bg-warning-subtle text-warning",
  no_answer: "bg-neutral-100 neutral-500",
};

export default function OutboundPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data, loading, error: loadError, reload } = useCachedData(
    `agent:outbound:${orgId}`,
    async () => {
      const [c, t, ct] = await Promise.all([listCampaigns(orgId), listTasks(orgId), listContacts(orgId)]);
      if (c.error) throw new Error(c.error);
      return { campaigns: c.data, tasks: t.data, contacts: ct.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const campaigns = data?.campaigns ?? [];
  const tasks = data?.tasks ?? [];
  const contacts = data?.contacts ?? [];
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "cold_call", channel_pref: "call", goal: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { error } = await createCampaign(orgId, form);
    if (error) setError(error);
    else {
      setForm({ name: "", type: "cold_call", channel_pref: "call", goal: "" });
      reload();
    }
  }

  async function queue(c: OutboundCampaign) {
    setMsg(null);
    const { count, error } = await queueCampaign(orgId, c, contacts.map((x) => ({ id: x.id, name: x.name, email: x.email, phone: x.phone })));
    if (error) setError(error);
    else {
      setMsg(`Queued ${count} ${c.name} task(s).`);
      reload();
    }
  }

  function runPending() {
    runAgentWorker();
    setMsg("Running the outbound worker…");
    setTimeout(reload, 1800);
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {(error || loadError) && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error || loadError}</div></div>}

      <div className="col-lg-6">
        <h6 className="fw-600 mb-3">Campaigns</h6>
        <form onSubmit={create} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="col-6">
              <select className="form-select rounded-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-6">
              <select className="form-select rounded-3" value={form.channel_pref} onChange={(e) => setForm({ ...form, channel_pref: e.target.value })}>
                <option value="call">Call</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="col-12"><input className="form-control rounded-3" placeholder="Goal (e.g. rebook lapsed customers)" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Create campaign</button></div>
          </div>
        </form>

        {msg && <div className="fz-font-md neutral-500 mb-2">{msg}</div>}

        {campaigns.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No campaigns yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{c.name} <span className="badge bg-neutral-100 neutral-700 fw-500 ms-1 text-capitalize">{c.type.replace("_", " ")}</span></div>
                  <div className="fz-font-sm neutral-500">{c.channel_pref} · {c.goal || "—"}</div>
                </div>
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => queue(c)}>Queue to {contacts.length}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="col-lg-6">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-600 mb-0">Task queue</h6>
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={runPending}>Run pending</button>
        </div>
        {tasks.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No outbound tasks yet. Reminders also appear here automatically from upcoming bookings.</div>
        ) : (
          <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden">
            <table className="table mb-0 align-middle">
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 ps-4">
                      <div className="fw-600 fz-font-md">{t.customer_name || "Contact"}</div>
                      <div className="fz-font-sm neutral-500 text-capitalize">{t.type.replace("_", " ")} · {t.channel}{t.outcome ? ` · ${t.outcome}` : ""}</div>
                    </td>
                    <td className="py-2 pe-4 text-end"><span className={`badge fw-500 text-capitalize ${TASK_STYLE[t.status] ?? TASK_STYLE.queued}`}>{t.status.replace("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
