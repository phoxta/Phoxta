import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listCanned, createCanned, deleteCanned } from "@/lib/db/ops/agent";
import type { OpsContext } from "@/layouts/OperatingLayout";

const CHANNELS = ["any", "sms", "whatsapp", "email", "web"];
const BLANK = { title: "", shortcut: "", body: "", channel: "any", is_whatsapp_template: false, whatsapp_template_sid: "" };

export default function SnippetsPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data: items = [], loading, error: loadError, reload } = useCachedData(
    `agent:snippets:${orgId}`,
    async () => {
      const { data, error } = await listCanned(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [form, setForm] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.body.trim()) return;
    const { error } = await createCanned(orgId, form);
    if (error) setError(error);
    else { setForm({ ...BLANK }); reload(); }
  }

  const snippets = items.filter((i) => !i.is_whatsapp_template);
  const templates = items.filter((i) => i.is_whatsapp_template);

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {(error || loadError) && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error || loadError}</div></div>}

      <div className="col-lg-5">
        <h6 className="fw-600 mb-3">New snippet / template</h6>
        <form onSubmit={create} className="bg-neutral-0 rounded-4 p-3 border-100">
          <div className="row g-2">
            <div className="col-7"><input className="form-control rounded-3" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="col-5"><input className="form-control rounded-3" placeholder="/shortcut" value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} /></div>
            <div className="col-12"><textarea className="form-control rounded-3" rows={3} placeholder="Message body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></div>
            <div className="col-6">
              <select className="form-select rounded-3" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {CHANNELS.map((c) => <option key={c} value={c} className="text-capitalize">{c === "any" ? "Any channel" : c}</option>)}
              </select>
            </div>
            <div className="col-6 d-flex align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="watpl" checked={form.is_whatsapp_template} onChange={(e) => setForm({ ...form, is_whatsapp_template: e.target.checked, channel: e.target.checked ? "whatsapp" : form.channel })} />
                <label className="form-check-label fz-font-md" htmlFor="watpl">WhatsApp template</label>
              </div>
            </div>
            {form.is_whatsapp_template && (
              <div className="col-12"><input className="form-control rounded-3" placeholder="Approved template SID (optional)" value={form.whatsapp_template_sid} onChange={(e) => setForm({ ...form, whatsapp_template_sid: e.target.value })} /></div>
            )}
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Save</button></div>
          </div>
        </form>
        <p className="fz-font-sm neutral-500 mt-2">Snippets appear in the Inbox composer. <strong>WhatsApp templates</strong> are the only thing you can send outside WhatsApp's 24-hour window — pre-approve them in Twilio first.</p>
      </div>

      <div className="col-lg-7">
        <h6 className="fw-600 mb-3">Canned replies</h6>
        {snippets.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500 mb-4">No snippets yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2 mb-4">
            {snippets.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex justify-content-between gap-2">
                <div>
                  <div className="fw-600">{c.title || c.shortcut || "Snippet"} <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize ms-1">{c.channel}</span></div>
                  <div className="fz-font-sm neutral-500" style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await deleteCanned(c.id); reload(); }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <h6 className="fw-600 mb-3">WhatsApp templates</h6>
        {templates.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No templates yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {templates.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex justify-content-between gap-2">
                <div>
                  <div className="fw-600">{c.title || "Template"} <span className="badge bg-success-subtle text-success fw-500 ms-1">WhatsApp</span></div>
                  <div className="fz-font-sm neutral-500" style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>
                  {c.whatsapp_template_sid && <div className="fz-font-sm neutral-400">SID: {c.whatsapp_template_sid}</div>}
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await deleteCanned(c.id); reload(); }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
