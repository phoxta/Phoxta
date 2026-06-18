import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listKnowledge, addKnowledge, removeKnowledge, type KnowledgeDoc } from "@/lib/db/ops/knowledge";
import type { OpsContext } from "@/layouts/OperatingLayout";

export default function KnowledgePage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await listKnowledge(orgId);
    if (error) setError(error);
    setDocs(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true);
    const { error } = await addKnowledge(orgId, form.title.trim(), form.content.trim());
    setSaving(false);
    if (error) setError(error);
    else { setForm({ title: "", content: "" }); load(); }
  }

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      <div className="col-lg-5">
        <h6 className="fw-600 mb-2">Teach your agent</h6>
        <p className="fz-font-sm neutral-500 mb-3">Add facts, policies, FAQs or anything the AI should know. It's embedded and retrieved automatically across chat, SMS, WhatsApp and voice.</p>
        <form onSubmit={add} className="bg-neutral-0 rounded-4 p-3 border-100">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Title (e.g. Refund policy)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="col-12"><textarea className="form-control rounded-3" rows={5} placeholder="Knowledge / answer…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4" disabled={saving}>{saving ? "Saving…" : "Add to knowledge base"}</button></div>
          </div>
        </form>
      </div>

      <div className="col-lg-7">
        <h6 className="fw-600 mb-3">Knowledge base</h6>
        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Nothing yet. Add what the agent should know — products, policies, hours, FAQs.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {docs.map((d) => (
              <div key={d.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex justify-content-between gap-2">
                <div>
                  {d.title && <div className="fw-600">{d.title}</div>}
                  <div className="fz-font-sm neutral-500" style={{ whiteSpace: "pre-wrap" }}>{d.content}</div>
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await removeKnowledge(d.id); load(); }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
