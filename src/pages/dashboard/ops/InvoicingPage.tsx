import { Fragment, useMemo, useState } from "react";
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
import { Card, Chip, Empty, StatTile, stageTone } from "@/components/dash/Ui";

type NlInvoice = {
  customer_name: string;
  customer_email?: string | null;
  due_date: string | null;
  items: { description: string; quantity: number; unit_price_cents: number }[];
};
type Dunning = { subject: string; message: string };

/** Chip tone per invoice status — paid/pending come from the shared stageTone map. */
const INV_TONE: Record<Invoice["status"], "ok" | "warn" | "blue" | "danger" | "plain" | "line"> = {
  draft: "line",
  sent: stageTone("pending"),
  paid: stageTone("paid"),
  void: "plain",
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

const CSS = `
.ivx-stat-danger { background: #fdf5f3; border-color: #f0c3ba; }
.ivx-stat-danger .l, .ivx-stat-danger .v, .ivx-stat-danger .d { color: #dc2626; }
.hrx-table tbody tr.ivx-overdue,
.hrx-table tbody tr.ivx-overdue:hover { background: #fdf5f4; }
.hrx-table tbody tr.ivx-overdue > td:first-child { box-shadow: inset 3px 0 0 #dc2626; }
.hrx-table tbody tr.ivx-detail,
.hrx-table tbody tr.ivx-detail:hover { background: transparent; }
.ivx-expand { border: 0; background: transparent; padding: 0; text-align: left; color: inherit; cursor: pointer; max-width: 100%; }
.ivx-expand:hover .ivx-num { text-decoration: underline; }
.ivx-num { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ivx-sub { font-size: 12.5px; color: var(--hrx-muted); margin-top: 2px; }
.ivx-sub.late { color: #dc2626; font-weight: 500; }
.ivx-items { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 12px 14px; }
.ivx-line { display: flex; justify-content: space-between; gap: 12px; font-size: 13.5px; padding: 3px 0; }
.ivx-line .amt { font-weight: 600; white-space: nowrap; }
.ivx-total { border-top: 1px solid var(--hrx-border-soft); margin-top: 6px; padding-top: 6px; font-weight: 600; }
.ivx-accent { box-shadow: inset 3px 0 0 var(--hrx-ink); }
.ivx-pre { white-space: pre-wrap; background: var(--hrx-soft); border-radius: 12px; padding: 10px 12px; font-size: 14px; }
.ivx-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
`;

export default function InvoicingPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "GBP";
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
      toastError("Couldn't read an amount from that — include a price (e.g. \"£500 for consulting\").");
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

  if (loading) return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }}>Loading…</div>;
  // Hard fail: nothing loaded at all, so don't show empty states that read as "no invoices".
  if (loadError && !data) {
    return (
      <div className="hrx-card hrx-pad text-center" role="alert">
        <div className="fw-semibold text-danger mb-2">Couldn&apos;t load invoices</div>
        <div className="mb-3" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>{loadError}</div>
        <button type="button" className="hrx-pill dark" onClick={() => reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <style>{CSS}</style>

      {/* Stale data is still on screen, so this is a warning about freshness, not an empty page. */}
      {loadError && (
        <div className="alert alert-danger py-2 px-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2" style={{ borderRadius: 12, fontSize: 14 }} role="alert">
          <span>{loadError}</span>
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => reload()}>Retry</button>
        </div>
      )}

      {/* Totals */}
      <div className="hrx-statrow mb-3">
        <StatTile label="Outstanding (sent)" value={formatPrice(outstandingCents, orgCurrency)} />
        <StatTile label="Paid this month" value={formatPrice(paidThisMonthCents, orgCurrency)} tone="soft" delta={{ text: "This calendar month", up: true }} />
        <div className={`hrx-stat${overdueList.length > 0 ? " ivx-stat-danger" : ""}`}>
          <span className="l">Overdue{overdueList.length > 0 ? ` · ${overdueList.length} invoice${overdueList.length === 1 ? "" : "s"}` : ""}</span>
          <div className="v">{formatPrice(overdueCents, orgCurrency)}</div>
          <span className="d">
            {overdueList.length > 0 ? "Overdue invoices are listed first — use ✨ Remind on any of them." : "Nothing overdue — nice."}
          </span>
        </div>
      </div>

      <div className="row g-3">
        {/* Invoices */}
        <div className="col-xl-8">
          {dunning && (
            <Card
              className="ivx-accent mb-3"
              title="✨ Payment reminder draft"
              right={<button type="button" className="hrx-seeall" onClick={() => setDunning(null)}>Close</button>}
            >
              <div role="status">
                <div className="fw-semibold mb-1">{dunning.subject}</div>
                <div className="ivx-pre mb-3">{dunning.message}</div>
                <button type="button" className="hrx-pill dark" onClick={sendReminder} disabled={sendingReminder}>
                  {sendingReminder ? "Sending…" : "Send to customer"}
                </button>
              </div>
            </Card>
          )}

          <Card
            title="Invoices"
            right={invoices.length > 0 ? <Chip tone="line">{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</Chip> : undefined}
          >
            {invoices.length === 0 ? (
              <Empty title="No invoices yet">Create your first invoice with the form — or describe one in plain English below.</Empty>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const overdue = isOverdue(inv);
                      const items = itemsById[inv.id];
                      return (
                        <Fragment key={inv.id}>
                          <tr className={overdue ? "ivx-overdue" : undefined}>
                            <td style={{ minWidth: "14rem" }}>
                              <button type="button" className="ivx-expand" onClick={() => toggleExpand(inv.id)} aria-expanded={expanded === inv.id}>
                                <div className="ivx-num">{inv.number} · {inv.customer_name || "Customer"}</div>
                                <div className={`ivx-sub${overdue ? " late" : ""}`}>
                                  {overdue
                                    ? `${lateLabel(daysOverdue(inv))} — due ${new Date(inv.due_date as string).toLocaleDateString()}`
                                    : inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : "No due date"}
                                </div>
                              </button>
                            </td>
                            <td className="fw-semibold text-nowrap">{formatPrice(inv.total_cents, inv.currency)}</td>
                            <td>
                              <span className="d-inline-flex align-items-center gap-1 flex-wrap">
                                {overdue && <Chip tone="danger">Overdue</Chip>}
                                <Chip tone={INV_TONE[inv.status]}>{inv.status}</Chip>
                              </span>
                            </td>
                            <td>
                              <div className="ivx-actions">
                                {inv.status === "draft" && (
                                  <>
                                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => sendWithPayLink(inv)} disabled={busyId === inv.id}>{busyId === inv.id ? "Sending…" : "Send + pay link"}</button>
                                    <button type="button" className="btn btn-link btn-sm p-0 text-secondary text-decoration-none" onClick={() => voidInvoice(inv)}>Void</button>
                                    <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => deleteDraft(inv)}>Delete draft</button>
                                  </>
                                )}
                                {inv.status === "sent" && <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => draftDunning(inv.id)} disabled={dunningId === inv.id}>{dunningId === inv.id ? "Writing…" : "✨ Remind"}</button>}
                                {inv.status === "sent" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => markPaid(inv)}>Mark paid</button>}
                              </div>
                            </td>
                          </tr>
                          {expanded === inv.id && (
                            <tr className="ivx-detail">
                              <td colSpan={4}>
                                <div className="ivx-items">
                                  <div className="ivx-sub mb-2">
                                    Issued {new Date(inv.issue_date || inv.created_at).toLocaleDateString()}
                                    {inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : " · No due date"}
                                    {inv.customer_email ? ` · ${inv.customer_email}` : ""}
                                  </div>
                                  {items === "loading" || items === undefined ? (
                                    <div className="ivx-sub" role="status">Loading items…</div>
                                  ) : items === "error" ? (
                                    <div className="text-danger" style={{ fontSize: 13.5 }} role="alert">Couldn&apos;t load line items.</div>
                                  ) : items.length === 0 ? (
                                    <div className="ivx-sub">No line items.</div>
                                  ) : (
                                    <div>
                                      {items.map((it) => (
                                        <div key={it.id} className="ivx-line">
                                          <span>{it.description}{it.quantity > 1 ? ` × ${it.quantity}` : ""}</span>
                                          <span className="amt">{formatPrice(it.quantity * it.unit_price_cents, inv.currency)}</span>
                                        </div>
                                      ))}
                                      <div className="ivx-line ivx-total">
                                        <span>Total</span>
                                        <span className="amt">{formatPrice(inv.total_cents, inv.currency)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* AI helper sits below the invoice list, not above it. */}
          <Card className="mt-3" title="✨ Create from text">
            <label className="hrx-field mb-0" htmlFor="inv-nl">
              <span>Describe the invoice in plain English</span>
              <div className="d-flex flex-wrap gap-2">
                <input id="inv-nl" className="form-control flex-grow-1" style={{ minWidth: "12rem" }} placeholder="e.g. Invoice Acme Co 500 for consulting, due in 14 days" value={nlText} onChange={(e) => setNlText(e.target.value)} />
                <button type="button" className="hrx-pill dark flex-shrink-0" onClick={createFromText} disabled={nlLoading}>{nlLoading ? "Reading…" : "Create invoice"}</button>
              </div>
            </label>
          </Card>
        </div>

        {/* New invoice */}
        <div className="col-xl-4">
          <Card title="New invoice">
            <form onSubmit={addInvoice}>
              <label className="hrx-field" htmlFor="inv-customer">
                <span>Customer</span>
                <input id="inv-customer" className="form-control" placeholder="Acme Co" value={iForm.customer} onChange={(e) => setIForm({ ...iForm, customer: e.target.value })} required />
              </label>
              <label className="hrx-field" htmlFor="inv-email">
                <span>Customer email (for the pay link)</span>
                <input id="inv-email" type="email" className="form-control" placeholder="billing@acme.co" value={iForm.email} onChange={(e) => setIForm({ ...iForm, email: e.target.value })} />
              </label>
              <label className="hrx-field" htmlFor="inv-desc">
                <span>Description</span>
                <input id="inv-desc" className="form-control" placeholder="Services" value={iForm.description} onChange={(e) => setIForm({ ...iForm, description: e.target.value })} />
              </label>
              <div className="row g-2">
                <div className="col-6">
                  <label className="hrx-field" htmlFor="inv-amount">
                    <span>Amount ({orgCurrency})</span>
                    <input id="inv-amount" type="number" min="0.01" step="0.01" inputMode="decimal" className="form-control" placeholder="500" value={iForm.amount} onChange={(e) => setIForm({ ...iForm, amount: e.target.value })} required />
                  </label>
                </div>
                <div className="col-6">
                  <label className="hrx-field" htmlFor="inv-due">
                    <span>Due date</span>
                    <input id="inv-due" type="date" className="form-control" value={iForm.due} onChange={(e) => setIForm({ ...iForm, due: e.target.value })} />
                  </label>
                </div>
              </div>
              <button type="submit" className="hrx-pill primary w-100 justify-content-center">Create invoice</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
