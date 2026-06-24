import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listInvoices,
  createInvoice,
  setInvoiceStatus,
  listCustomerSubscriptions,
  createCustomerSubscription,
  setSubscriptionStatus,
  type Invoice,
} from "@/lib/db/ops/invoicing";
import { invokeAction } from "@/lib/db/ops/ai";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

const toCents = (s: string) => Math.round((parseFloat(s) || 0) * 100);

type NlInvoice = { customer_name: string; due_date: string | null; items: { description: string; quantity: number; unit_price_cents: number }[] };
type Dunning = { subject: string; message: string };

const INV_STYLE: Record<Invoice["status"], string> = {
  draft: "bg-neutral-100 neutral-700",
  sent: "bg-warning-subtle text-warning",
  paid: "bg-success-subtle text-success",
  void: "bg-neutral-100 neutral-500",
};

export default function InvoicingPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data, loading, error: loadError, reload } = useCachedData(
    `ops:invoicing:${orgId}`,
    async () => {
      const [i, s] = await Promise.all([listInvoices(orgId), listCustomerSubscriptions(orgId)]);
      if (i.error) throw new Error(i.error);
      return { invoices: i.data, subs: s.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const invoices = data?.invoices ?? [];
  const subs = data?.subs ?? [];
  const [error, setError] = useState<string | null>(null);

  const [iForm, setIForm] = useState({ customer: "", description: "", amount: "", due: "" });
  const [sForm, setSForm] = useState({ plan: "", amount: "", interval: "monthly" as "monthly" | "yearly" });

  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [dunning, setDunning] = useState<(Dunning & { id: string }) | null>(null);
  const [dunningId, setDunningId] = useState<string | null>(null);

  async function addInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!iForm.customer.trim()) return;
    const { error } = await createInvoice(orgId, {
      customer_name: iForm.customer,
      due_date: iForm.due || null,
      items: [{ description: iForm.description || "Services", quantity: 1, unit_price_cents: toCents(iForm.amount) }],
    });
    if (error) setError(error);
    else {
      setIForm({ customer: "", description: "", amount: "", due: "" });
      reload();
    }
  }

  async function createFromText() {
    if (!nlText.trim()) return;
    setNlLoading(true);
    setError(null);
    const { data, error } = await invokeAction<NlInvoice>(orgId, "nl_invoice", { text: nlText });
    if (error || !data) {
      setNlLoading(false);
      setError(error ?? "Couldn't read that.");
      return;
    }
    const { error: createErr } = await createInvoice(orgId, {
      customer_name: data.customer_name,
      due_date: data.due_date,
      items: (data.items ?? []).map((i) => ({ description: i.description, quantity: i.quantity || 1, unit_price_cents: i.unit_price_cents || 0 })),
    });
    setNlLoading(false);
    if (createErr) setError(createErr);
    else {
      setNlText("");
      reload();
    }
  }

  async function draftDunning(id: string) {
    setDunningId(id);
    setError(null);
    const { data, error } = await invokeAction<Dunning>(orgId, "dunning_message", { invoiceId: id });
    setDunningId(null);
    if (error) setError(error);
    else if (data) setDunning({ ...data, id });
  }

  async function addSub(e: React.FormEvent) {
    e.preventDefault();
    if (!sForm.plan.trim()) return;
    const { error } = await createCustomerSubscription(orgId, { plan_name: sForm.plan, amount_cents: toCents(sForm.amount), interval: sForm.interval });
    if (error) setError(error);
    else {
      setSForm({ plan: "", amount: "", interval: "monthly" });
      reload();
    }
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {(error || loadError) && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error || loadError}</div></div>}

      {/* Invoices */}
      <div className="col-lg-7">
        <h5 className="fw-600 mb-3">Invoices</h5>
        <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">✨ Create from text</div>
          <div className="d-flex gap-2">
            <input className="form-control rounded-3" placeholder="e.g. Invoice Acme Co $500 for consulting, due in 14 days" value={nlText} onChange={(e) => setNlText(e.target.value)} />
            <button type="button" className="btn btn-dark rounded-3 px-3" onClick={createFromText} disabled={nlLoading}>{nlLoading ? "…" : "Create"}</button>
          </div>
        </div>
        <form onSubmit={addInvoice} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-4"><input className="form-control rounded-3" placeholder="Customer" value={iForm.customer} onChange={(e) => setIForm({ ...iForm, customer: e.target.value })} required /></div>
            <div className="col-md-4"><input className="form-control rounded-3" placeholder="Description" value={iForm.description} onChange={(e) => setIForm({ ...iForm, description: e.target.value })} /></div>
            <div className="col-md-2"><input className="form-control rounded-3" placeholder="Amount" value={iForm.amount} onChange={(e) => setIForm({ ...iForm, amount: e.target.value })} /></div>
            <div className="col-md-2"><button type="submit" className="btn btn-dark w-100 rounded-3">Create</button></div>
          </div>
        </form>
        {invoices.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No invoices yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{inv.number} · {inv.customer_name || "Customer"}</div>
                  <div className="fz-font-sm neutral-500">{formatPrice(inv.total_cents, inv.currency)}{inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ""}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge fw-500 text-capitalize ${INV_STYLE[inv.status]}`}>{inv.status}</span>
                  {inv.status === "draft" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={async () => { await setInvoiceStatus(inv.id, "sent"); reload(); }}>Send</button>}
                  {inv.status === "sent" && <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => draftDunning(inv.id)} disabled={dunningId === inv.id}>{dunningId === inv.id ? "…" : "✨ Remind"}</button>}
                  {inv.status === "sent" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={async () => { await setInvoiceStatus(inv.id, "paid"); reload(); }}>Mark paid</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {dunning && (
          <div className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="fz-font-sm fw-600 neutral-500">✨ Payment reminder</span>
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setDunning(null)}>Close</button>
            </div>
            <div className="fw-600 fz-font-md mb-1">{dunning.subject}</div>
            <div className="fz-font-md neutral-700" style={{ whiteSpace: "pre-wrap" }}>{dunning.message}</div>
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div className="col-lg-5">
        <h5 className="fw-600 mb-3">Subscriptions</h5>
        <form onSubmit={addSub} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Plan name" value={sForm.plan} onChange={(e) => setSForm({ ...sForm, plan: e.target.value })} required /></div>
            <div className="col-5"><input className="form-control rounded-3" placeholder="Amount" value={sForm.amount} onChange={(e) => setSForm({ ...sForm, amount: e.target.value })} /></div>
            <div className="col-5">
              <select className="form-select rounded-3" value={sForm.interval} onChange={(e) => setSForm({ ...sForm, interval: e.target.value as "monthly" | "yearly" })}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="col-2"><button type="submit" className="btn btn-dark w-100 rounded-3">+</button></div>
          </div>
        </form>
        {subs.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No subscriptions yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {subs.map((s) => (
              <div key={s.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{s.plan_name}</div>
                  <div className="fz-font-sm neutral-500">{formatPrice(s.amount_cents, s.currency)}/{s.interval === "yearly" ? "yr" : "mo"}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge fw-500 text-capitalize ${s.status === "active" ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-500"}`}>{s.status}</span>
                  {s.status === "active" ? (
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await setSubscriptionStatus(s.id, "paused"); reload(); }}>Pause</button>
                  ) : s.status === "paused" ? (
                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={async () => { await setSubscriptionStatus(s.id, "active"); reload(); }}>Resume</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
