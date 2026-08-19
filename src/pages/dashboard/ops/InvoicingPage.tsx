import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listInvoices,
  createInvoice,
  setInvoiceStatus,
  deleteDraftInvoice,
  getInvoiceItems,
  type Invoice,
  type InvoiceItem,
} from "@/lib/db/ops/invoicing";
import { invokeAction } from "@/lib/db/ops/ai";
import { supabase } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";

type NlInvoice = {
  customer_name: string;
  customer_email?: string | null;
  due_date: string | null;
  items: { description: string; quantity: number; unit_price_cents: number }[];
};
type Dunning = { subject: string; message: string };

const INV_STYLE: Record<Invoice["status"], string> = {
  draft: "bg-neutral-100 neutral-700",
  sent: "bg-warning-subtle text-warning",
  paid: "bg-success-subtle text-success",
  void: "bg-neutral-100 neutral-500",
};

/** Parse a money string to cents; null when it isn't a positive number. */
function parseMoney(s: string): number | null {
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function isOverdue(inv: Invoice): boolean {
  return inv.status === "sent" && !!inv.due_date && inv.due_date.slice(0, 10) < todayISO();
}

/** Whole days between the due date and today — used to say *how* late it is. */
function daysOverdue(inv: Invoice): number {
  if (!inv.due_date) return 0;
  const due = Date.parse(`${inv.due_date.slice(0, 10)}T00:00:00`);
  const today = Date.parse(`${todayISO()}T00:00:00`);
  if (!Number.isFinite(due) || !Number.isFinite(today)) return 0;
  return Math.max(0, Math.round((today - due) / 86_400_000));
}

const lateLabel = (n: number) => (n === 1 ? "1 day late" : `${n} days late`);

export default function InvoicingPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "USD";
  const { data, loading, error: loadError, reload } = useCachedData(
    `ops:invoicing:${orgId}`,
    async () => {
      const i = await listInvoices(orgId);
      if (i.error) throw new Error(i.error);
      return { invoices: i.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const invoices = useMemo(() => {
    const rows = data?.invoices ?? [];
    // Overdue first, otherwise keep the newest-first order from the DB.
    return [...rows].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)));
  }, [data]);

  const [iForm, setIForm] = useState({ customer: "", email: "", description: "", amount: "", due: "" });
  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [dunning, setDunning] = useState<(Dunning & { id: string }) | null>(null);
  const [dunningId, setDunningId] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsById, setItemsById] = useState<Record<string, InvoiceItem[] | "loading" | "error">>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const monthStart = todayISO().slice(0, 7);
  const outstandingCents = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total_cents, 0);
  const paidThisMonthCents = invoices
    .filter((i) => i.status === "paid" && i.created_at.slice(0, 7) === monthStart)
    .reduce((s, i) => s + i.total_cents, 0);
  const overdueList = invoices.filter(isOverdue);
  const overdueCents = overdueList.reduce((s, i) => s + i.total_cents, 0);

  async function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!itemsById[id] || itemsById[id] === "error") {
      setItemsById((m) => ({ ...m, [id]: "loading" }));
      const { data: items, error } = await getInvoiceItems(id);
      setItemsById((m) => ({ ...m, [id]: error ? "error" : items }));
    }
  }

  async function addInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!iForm.customer.trim()) return;
    const cents = parseMoney(iForm.amount);
    if (cents === null) {
      toastError("Enter a valid amount greater than zero.");
      return;
    }
    const ok = await reportMutation(
      createInvoice(orgId, {
        customer_name: iForm.customer,
        customer_email: iForm.email,
        due_date: iForm.due || null,
        currency: orgCurrency,
        items: [{ description: iForm.description || "Services", quantity: 1, unit_price_cents: cents }],
      }),
      "Invoice created.",
    );
    if (ok) {
      setIForm({ customer: "", email: "", description: "", amount: "", due: "" });
      reload();
    }
  }

  async function createFromText() {
    if (!nlText.trim()) return;
    setNlLoading(true);
    const { data, error } = await invokeAction<NlInvoice>(orgId, "nl_invoice", { text: nlText });
    if (error || !data) {
      setNlLoading(false);
      toastError(error ?? "Couldn't read that.");
      return;
    }
    const items = (data.items ?? []).map((i) => ({
      description: i.description,
      quantity: i.quantity || 1,
      unit_price_cents: i.unit_price_cents || 0,
    }));
    const total = items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
    if (items.length === 0 || total <= 0) {
      setNlLoading(false);
      toastError("Couldn't read an amount from that — include a price (e.g. \"$500 for consulting\").");
      return;
    }
    const ok = await reportMutation(
      createInvoice(orgId, {
        customer_name: data.customer_name,
        customer_email: data.customer_email || undefined,
        due_date: data.due_date,
        currency: orgCurrency,
        items,
      }),
      "Invoice created.",
    );
    setNlLoading(false);
    if (ok) {
      setNlText("");
      reload();
    }
  }

  async function draftDunning(id: string) {
    setDunningId(id);
    const { data, error } = await invokeAction<Dunning>(orgId, "dunning_message", { invoiceId: id });
    setDunningId(null);
    if (error) toastError(error);
    else if (data) setDunning({ ...data, id });
  }

  async function sendReminder() {
    if (!dunning) return;
    setSendingReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke("commerce-notify", {
        body: { orgId, invoiceId: dunning.id, kind: "invoice_reminder", subject: dunning.subject, message: dunning.message },
      });
      const res = data as { ok?: boolean; delivery?: string; error?: string } | null;
      if (error || res?.error) {
        toastError(typeof res?.error === "string" ? res.error : "Couldn't send the reminder — try again.");
      } else if (res?.delivery === "no-email") {
        toastError("This invoice has no customer email — add one and try again.");
      } else if (res?.delivery === "failed") {
        toastError("The reminder email failed to send.");
      } else {
        toast("Reminder sent to the customer.");
        setDunning(null);
      }
    } catch {
      toastError("Couldn't send the reminder — check your connection and try again.");
    }
    setSendingReminder(false);
  }

  async function sendWithPayLink(inv: Invoice) {
    setBusyId(inv.id);
    try {
      // Emails the invoice to the customer WITH a Paystack payment link; the
      // webhook flips it to paid when they pay.
      const { data, error } = await supabase.functions.invoke("paystack-checkout", {
        body: { kind: "invoice_send", orgId, invoiceId: inv.id },
      });
      const err = error || (data as { error?: string })?.error;
      if (err) {
        toastError(typeof err === "string" ? err : "Could not send — check the customer email and try again.");
      } else {
        toast("Invoice sent with a payment link.");
        reload();
      }
    } catch {
      toastError("Could not send — check your connection and try again.");
    }
    setBusyId(null);
  }

  async function markPaid(inv: Invoice) {
    if (
      !confirmDanger(
        `Mark ${inv.number} as paid? This records the payment manually — if a Paystack payment link was sent, it may remain payable by the customer.`,
      )
    )
      return;
    if (await reportMutation(setInvoiceStatus(inv.id, "paid"), "Marked as paid.")) reload();
  }

  async function voidInvoice(inv: Invoice) {
    if (!confirmDanger(`Void ${inv.number}? A voided invoice can't be sent or paid.`)) return;
    if (await reportMutation(setInvoiceStatus(inv.id, "void"), "Invoice voided.")) reload();
  }

  async function deleteDraft(inv: Invoice) {
    if (!confirmDanger(`Delete draft ${inv.number}? This permanently removes it and its line items.`)) return;
    if (await reportMutation(deleteDraftInvoice(inv.id), "Draft deleted.")) reload();
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  // Hard fail: nothing loaded at all, so don't show empty states that read as "no invoices".
  if (loadError && !data) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center" role="alert">
        <div className="text-danger fw-600 mb-2">Couldn&apos;t load invoices</div>
        <div className="fz-font-md neutral-500 mb-3">{loadError}</div>
        <button type="button" className="btn btn-dark btn-sm rounded-pill px-4 ops-tap" onClick={() => reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {/* Stale data is still on screen, so this is a warning about freshness, not an empty page. */}
      {loadError && (
        <div className="col-12 order-first">
          <div className="alert alert-danger py-2 px-3 fz-font-md mb-0 d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
            <span>{loadError}</span>
            <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 ops-tap" onClick={() => reload()}>Retry</button>
          </div>
        </div>
      )}

      {/* Totals + overdue — leads on a phone, sits on the right from lg up. */}
      <div className="col-lg-5 order-0 order-lg-1">
        <h2 className="fz-font-lg fw-600 mb-3">Summary</h2>
        <div className="row g-2">
          <div className="col-6">
            <div className="bg-neutral-0 rounded-4 p-3 border-100 h-100">
              <div className="fz-font-sm neutral-500">Outstanding (sent)</div>
              <div className="fz-32 fw-700 lh-1 neutral-900 mt-1" style={{ overflowWrap: "anywhere" }}>{formatPrice(outstandingCents, orgCurrency)}</div>
            </div>
          </div>
          <div className="col-6">
            <div className="bg-neutral-0 rounded-4 p-3 border-100 h-100">
              <div className="fz-font-sm neutral-500">Paid this month</div>
              <div className="fz-32 fw-700 lh-1 text-success mt-1" style={{ overflowWrap: "anywhere" }}>{formatPrice(paidThisMonthCents, orgCurrency)}</div>
            </div>
          </div>
          <div className="col-12">
            <div
              className={`rounded-4 p-3 border-100 h-100 ${overdueList.length > 0 ? "bg-danger-subtle" : "bg-neutral-0"}`}
              style={overdueList.length > 0 ? { boxShadow: "inset 4px 0 0 var(--bs-danger, #dc3545)" } : undefined}
            >
              <div className={`fz-font-sm ${overdueList.length > 0 ? "text-danger fw-600" : "neutral-500"}`}>
                Overdue{overdueList.length > 0 ? ` · ${overdueList.length} invoice${overdueList.length === 1 ? "" : "s"}` : ""}
              </div>
              <div className={`fz-32 fw-700 lh-1 mt-1 ${overdueList.length > 0 ? "text-danger" : "neutral-900"}`} style={{ overflowWrap: "anywhere" }}>{formatPrice(overdueCents, orgCurrency)}</div>
              <div className={`fz-font-sm mt-1 ${overdueList.length > 0 ? "text-danger" : "neutral-500"}`}>
                {overdueList.length > 0 ? "Overdue invoices are listed first — use ✨ Remind on any of them." : "Nothing overdue — nice."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="col-lg-7 order-1 order-lg-0">
        <h2 className="fz-font-lg fw-600 mb-3">Invoices</h2>
        <form onSubmit={addInvoice} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-4">
              <label htmlFor="inv-customer" className="fz-font-sm neutral-500 d-block mb-1">Customer</label>
              <input id="inv-customer" className="form-control rounded-3" placeholder="Acme Co" value={iForm.customer} onChange={(e) => setIForm({ ...iForm, customer: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="inv-email" className="fz-font-sm neutral-500 d-block mb-1">Customer email (for the pay link)</label>
              <input id="inv-email" type="email" className="form-control rounded-3" placeholder="billing@acme.co" value={iForm.email} onChange={(e) => setIForm({ ...iForm, email: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label htmlFor="inv-desc" className="fz-font-sm neutral-500 d-block mb-1">Description</label>
              <input id="inv-desc" className="form-control rounded-3" placeholder="Services" value={iForm.description} onChange={(e) => setIForm({ ...iForm, description: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label htmlFor="inv-amount" className="fz-font-sm neutral-500 d-block mb-1">Amount ({orgCurrency})</label>
              <input id="inv-amount" type="number" min="0.01" step="0.01" inputMode="decimal" className="form-control rounded-3" placeholder="500" value={iForm.amount} onChange={(e) => setIForm({ ...iForm, amount: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="inv-due" className="fz-font-sm neutral-500 d-block mb-1">Due date</label>
              <input id="inv-due" type="date" className="form-control rounded-3" value={iForm.due} onChange={(e) => setIForm({ ...iForm, due: e.target.value })} />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button type="submit" className="btn btn-dark w-100 rounded-3 text-nowrap">Create invoice</button>
            </div>
          </div>
        </form>
        {dunning && (
          <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-3" style={{ boxShadow: "inset 3px 0 0 #212529" }} role="status">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
              <h3 className="fz-font-sm fw-600 neutral-500 mb-0">✨ Payment reminder draft</h3>
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none ops-tap" onClick={() => setDunning(null)}>Close</button>
            </div>
            <div className="fw-600 fz-font-md mb-1">{dunning.subject}</div>
            <div className="fz-font-md neutral-700 mb-2" style={{ whiteSpace: "pre-wrap" }}>{dunning.message}</div>
            <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={sendReminder} disabled={sendingReminder}>{sendingReminder ? "Sending…" : "Send to customer"}</button>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No invoices yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {invoices.map((inv) => {
              const overdue = isOverdue(inv);
              const items = itemsById[inv.id];
              return (
                <div
                  key={inv.id}
                  className={`rounded-4 p-3 border-100 ${overdue ? "bg-danger-subtle" : "bg-neutral-0"}`}
                  // `.border-100` is !important, so the overdue rail is an inset shadow.
                  style={overdue ? { boxShadow: "inset 4px 0 0 var(--bs-danger, #dc3545)" } : undefined}
                >
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <button type="button" className="btn btn-link p-0 text-start text-decoration-none text-dark flex-grow-1" style={{ minWidth: "12rem" }} onClick={() => toggleExpand(inv.id)} aria-expanded={expanded === inv.id}>
                      <div className="fw-600">{inv.number} · {inv.customer_name || "Customer"}</div>
                      <div className={`fz-font-sm ${overdue ? "text-danger fw-500" : "neutral-500"}`}>
                        {formatPrice(inv.total_cents, inv.currency)}
                        {overdue
                          ? ` · ${lateLabel(daysOverdue(inv))} — due ${new Date(inv.due_date as string).toLocaleDateString()}`
                          : inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ""}
                      </div>
                    </button>
                    <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                      {overdue && <span className="badge fw-600 bg-danger text-white">Overdue</span>}
                      <span className={`badge fw-500 text-capitalize ${INV_STYLE[inv.status]}`}>{inv.status}</span>
                      {inv.status === "draft" && (
                        <>
                          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => sendWithPayLink(inv)} disabled={busyId === inv.id}>{busyId === inv.id ? "Sending…" : "Send + pay link"}</button>
                          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none ops-tap" onClick={() => voidInvoice(inv)}>Void</button>
                          <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none ops-tap" onClick={() => deleteDraft(inv)}>Delete draft</button>
                        </>
                      )}
                      {inv.status === "sent" && <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => draftDunning(inv.id)} disabled={dunningId === inv.id}>{dunningId === inv.id ? "Writing…" : "✨ Remind"}</button>}
                      {inv.status === "sent" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => markPaid(inv)}>Mark paid</button>}
                    </div>
                  </div>
                  {expanded === inv.id && (
                    <div className="mt-2 pt-2 border-top">
                      <div className="fz-font-sm neutral-500 mb-2">
                        Issued {new Date(inv.issue_date || inv.created_at).toLocaleDateString()}
                        {inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : " · No due date"}
                        {inv.customer_email ? ` · ${inv.customer_email}` : ""}
                      </div>
                      {items === "loading" || items === undefined ? (
                        <div className="fz-font-sm neutral-500" role="status">Loading items…</div>
                      ) : items === "error" ? (
                        <div className="fz-font-sm text-danger" role="alert">Couldn&apos;t load line items.</div>
                      ) : items.length === 0 ? (
                        <div className="fz-font-sm neutral-500">No line items.</div>
                      ) : (
                        <div className="d-flex flex-column gap-1">
                          {items.map((it) => (
                            <div key={it.id} className="d-flex justify-content-between fz-font-sm">
                              <span className="neutral-700">{it.description}{it.quantity > 1 ? ` × ${it.quantity}` : ""}</span>
                              <span className="fw-600">{formatPrice(it.quantity * it.unit_price_cents, inv.currency)}</span>
                            </div>
                          ))}
                          <div className="d-flex justify-content-between fz-font-sm border-top pt-1 mt-1">
                            <span className="fw-600">Total</span>
                            <span className="fw-600">{formatPrice(inv.total_cents, inv.currency)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* AI helper sits below the invoice list, not above it. */}
        <div className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
          <h3 className="fz-font-sm fw-600 neutral-500 mb-1">✨ Create from text</h3>
          <label htmlFor="inv-nl" className="form-label fz-font-sm fw-500 neutral-500 mb-1">Describe the invoice in plain English</label>
          <div className="d-flex flex-wrap gap-2">
            <input id="inv-nl" className="form-control rounded-3 flex-grow-1" style={{ minWidth: "12rem" }} placeholder="e.g. Invoice Acme Co 500 for consulting, due in 14 days" value={nlText} onChange={(e) => setNlText(e.target.value)} />
            <button type="button" className="btn btn-dark rounded-3 px-3 text-nowrap flex-shrink-0" onClick={createFromText} disabled={nlLoading}>{nlLoading ? "Reading…" : "Create invoice"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
