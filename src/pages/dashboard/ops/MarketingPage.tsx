import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listCampaigns,
  createCampaign,
  sendCampaign,
  listAutomations,
  createAutomation,
  toggleAutomation,
  type Campaign,
  type Automation,
  type AutomationTrigger,
  type AutomationAction,
} from "@/lib/db/ops/marketing";
import { invokeAction, drainWorkflows, listWorkflowRuns, type WorkflowRun } from "@/lib/db/ops/ai";
import type { OpsContext } from "@/layouts/OperatingLayout";
import PromoCodes from "./PromoCodes";

type CampaignCopy = { name: string; subject: string; body: string };
type Segment = { criteria: string; contact_ids: string[]; rationale: string };
const RUN_STYLE: Record<string, string> = {
  pending: "bg-neutral-100 neutral-700",
  running: "bg-warning-subtle text-warning",
  succeeded: "bg-success-subtle text-success",
  failed: "bg-warning-subtle text-warning",
};

const TRIGGERS: { value: AutomationTrigger; label: string }[] = [
  { value: "contact_created", label: "New contact" },
  { value: "order_paid", label: "Order paid" },
  { value: "booking_created", label: "New booking" },
  { value: "ticket_created", label: "New ticket" },
];
const ACTIONS: { value: AutomationAction; label: string }[] = [
  { value: "send_email", label: "Send email" },
  { value: "add_tag", label: "Add tag" },
  { value: "create_task", label: "Create task" },
  { value: "notify", label: "Notify team" },
];

const CAMPAIGN_STYLE: Record<Campaign["status"], string> = {
  draft: "bg-neutral-100 neutral-700",
  scheduled: "bg-warning-subtle text-warning",
  sent: "bg-success-subtle text-success",
};

export default function MarketingPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cForm, setCForm] = useState({ name: "", channel: "email" as "email" | "sms", subject: "" });
  const [aForm, setAForm] = useState({ name: "", trigger: "contact_created" as AutomationTrigger, action: "send_email" as AutomationAction });
  const [runs, setRuns] = useState<WorkflowRun[]>([]);

  // AI
  const [genForm, setGenForm] = useState({ goal: "", channel: "email", audience: "all customers" });
  const [genBody, setGenBody] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [segDesc, setSegDesc] = useState("");
  const [seg, setSeg] = useState<(Segment & { count: number }) | null>(null);
  const [segLoading, setSegLoading] = useState(false);

  async function load() {
    const [c, a, w] = await Promise.all([listCampaigns(orgId), listAutomations(orgId), listWorkflowRuns(orgId)]);
    if (c.error) setError(c.error);
    setCampaigns(c.data);
    setAutomations(a.data);
    setRuns(w.data);
    setLoading(false);
  }

  async function genCampaign() {
    if (!genForm.goal.trim()) return;
    setGenLoading(true);
    setError(null);
    const { data, error } = await invokeAction<CampaignCopy>(orgId, "campaign_copy", genForm);
    setGenLoading(false);
    if (error) setError(error);
    else if (data) {
      setCForm({ name: data.name, channel: genForm.channel as "email" | "sms", subject: data.subject });
      setGenBody(data.body);
    }
  }

  async function runSegment() {
    if (!segDesc.trim()) return;
    setSegLoading(true);
    setError(null);
    const { data, error } = await invokeAction<Segment>(orgId, "segment_audience", { description: segDesc });
    setSegLoading(false);
    if (error) setError(error);
    else if (data) setSeg({ ...data, count: data.contact_ids?.length ?? 0 });
  }

  async function runPending() {
    drainWorkflows();
    setTimeout(load, 1500);
  }
  useEffect(() => {
    load();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!cForm.name.trim()) return;
    const { error } = await createCampaign(orgId, { ...cForm, body: genBody });
    if (error) setError(error);
    else {
      setCForm({ name: "", channel: "email", subject: "" });
      setGenBody("");
      load();
    }
  }

  async function addAutomation(e: React.FormEvent) {
    e.preventDefault();
    if (!aForm.name.trim()) return;
    const { error } = await createAutomation(orgId, aForm);
    if (error) setError(error);
    else {
      setAForm({ name: "", trigger: "contact_created", action: "send_email" });
      load();
    }
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      <div className="col-12"><PromoCodes orgId={orgId} /></div>

      {/* Campaigns */}
      <div className="col-lg-7">
        <h5 className="fw-600 mb-3">Campaigns</h5>

        <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">✨ Generate campaign</div>
          <div className="row g-2">
            <div className="col-md-6"><input className="form-control rounded-3" placeholder="Goal (e.g. win back lapsed customers)" value={genForm.goal} onChange={(e) => setGenForm({ ...genForm, goal: e.target.value })} /></div>
            <div className="col-md-3">
              <select className="form-select rounded-3" value={genForm.channel} onChange={(e) => setGenForm({ ...genForm, channel: e.target.value })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="col-md-3"><button type="button" className="btn btn-dark w-100 rounded-3" onClick={genCampaign} disabled={genLoading}>{genLoading ? "…" : "Generate"}</button></div>
          </div>
          {genBody && <div className="mt-2 p-2 bg-neutral-50 rounded-3 fz-font-sm neutral-700" style={{ whiteSpace: "pre-wrap" }}>{genBody}<div className="fz-font-sm neutral-500 mt-1">Filled the form below — adjust and create.</div></div>}
        </div>

        <form onSubmit={addCampaign} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-5"><input className="form-control rounded-3" placeholder="Campaign name" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} required /></div>
            <div className="col-md-3">
              <select className="form-select rounded-3" value={cForm.channel} onChange={(e) => setCForm({ ...cForm, channel: e.target.value as "email" | "sms" })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="col-md-4"><input className="form-control rounded-3" placeholder="Subject" value={cForm.subject} onChange={(e) => setCForm({ ...cForm, subject: e.target.value })} /></div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Create campaign</button></div>
          </div>
        </form>
        {campaigns.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No campaigns yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{c.name} <span className="badge bg-neutral-100 neutral-700 fw-500 text-uppercase ms-1">{c.channel}</span></div>
                  <div className="fz-font-sm neutral-500">{c.status === "sent" ? `Sent to ${c.recipients} · ${c.sent_at ? new Date(c.sent_at).toLocaleDateString() : ""}` : c.subject || "No subject"}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge fw-500 text-capitalize ${CAMPAIGN_STYLE[c.status]}`}>{c.status}</span>
                  {c.status !== "sent" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={async () => { await sendCampaign(orgId, c.id); load(); }}>Send</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">✨ AI audience segment</div>
          <div className="d-flex gap-2">
            <input className="form-control rounded-3" placeholder="e.g. high-value customers at churn risk" value={segDesc} onChange={(e) => setSegDesc(e.target.value)} />
            <button type="button" className="btn btn-dark rounded-3 px-3" onClick={runSegment} disabled={segLoading}>{segLoading ? "…" : "Build"}</button>
          </div>
          {seg && (
            <div className="mt-2 fz-font-md neutral-700">
              <span className="fw-600">{seg.criteria}</span> — {seg.count} contacts. <span className="neutral-500">{seg.rationale}</span>
            </div>
          )}
        </div>
      </div>

      {/* Automations */}
      <div className="col-lg-5">
        <h5 className="fw-600 mb-3">Automations</h5>
        <form onSubmit={addAutomation} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Automation name" value={aForm.name} onChange={(e) => setAForm({ ...aForm, name: e.target.value })} required /></div>
            <div className="col-6">
              <select className="form-select rounded-3" value={aForm.trigger} onChange={(e) => setAForm({ ...aForm, trigger: e.target.value as AutomationTrigger })}>
                {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-6">
              <select className="form-select rounded-3" value={aForm.action} onChange={(e) => setAForm({ ...aForm, action: e.target.value as AutomationAction })}>
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Add automation</button></div>
          </div>
        </form>
        {automations.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No automations yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {automations.map((a) => {
              const trig = TRIGGERS.find((t) => t.value === a.trigger)?.label ?? a.trigger;
              const act = ACTIONS.find((x) => x.value === a.action)?.label ?? a.action;
              return (
                <div key={a.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <div className="fw-600">{a.name}</div>
                    <div className="fz-font-sm neutral-500">When {trig} → {act}</div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input className="form-check-input" type="checkbox" checked={a.active} onChange={async (e) => { await toggleAutomation(a.id, e.target.checked); load(); }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="fw-600 mb-0">Automation runs</h6>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={runPending}>Run pending</button>
          </div>
          {runs.length === 0 ? (
            <p className="fz-font-sm neutral-500 mb-0">No runs yet. Runs are created automatically when an automation's trigger fires.</p>
          ) : (
            <div className="d-flex flex-column gap-1">
              {runs.slice(0, 8).map((r) => (
                <div key={r.id} className="d-flex align-items-center justify-content-between fz-font-sm">
                  <span className="neutral-700">{r.automations?.name ?? "Automation"} · {r.trigger.replace("_", " ")}</span>
                  <span className={`badge fw-500 text-capitalize ${RUN_STYLE[r.status] ?? RUN_STYLE.pending}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
