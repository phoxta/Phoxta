import { useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  getOrderItems,
  fulfillOrder,
  saveOrderTracking,
  setOrderStatus,
  cancelOrder,
  notifyCommerce,
  refundOrder,
  type Order,
} from "@/lib/db/ops/commerce";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import { Chip, stageTone } from "@/components/dash/Ui";

type Props = {
  orgId: string;
  orgName: string;
  orgCurrency: string;
  order: Order;
  onChanged: () => void; // reload orders (and products, for restocks) after a mutation
  onClose: () => void;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// Preferred ordering for shipping jsonb keys; anything else stringy is appended.
const SHIP_KEYS = ["name", "address", "address1", "address2", "line1", "line2", "street", "city", "state", "region", "zip", "postal_code", "postcode", "country", "phone"];

function shippingLines(shipping: Record<string, unknown> | null): string[] {
  if (!shipping || typeof shipping !== "object") return [];
  const seen = new Set<string>();
  const lines: string[] = [];
  const push = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
    if (s && !seen.has(s)) {
      seen.add(s);
      lines.push(s);
    }
  };
  for (const k of SHIP_KEYS) push(shipping[k]);
  for (const [k, v] of Object.entries(shipping)) if (!SHIP_KEYS.includes(k)) push(v);
  return lines;
}

function toastDelivery(delivery: "sent" | "no-email" | "failed" | null, error: string | null) {
  if (error) toastError(`Customer notification failed: ${error}`);
  else if (delivery === "sent") toast("Customer notified by email");
  else if (delivery === "no-email") toast("Saved — no customer email on file, so no notification was sent", "info");
  else toastError("Saved, but the customer notification failed.");
}

const CSS = `
.cmx-od{background:#fff;border:1px solid var(--hrx-border-soft);border-radius:12px;padding:16px}
.cmx-od .hrx-pill{height:36px;padding:0 14px;font-size:13px}
.cmx-od .hrx-field{margin-bottom:8px}
.cmx-od-sm{font-size:13px}
.cmx-od-md{font-size:14px}
.cmx-od-muted{color:var(--hrx-muted)}
.cmx-od-strong{font-weight:600}
.cmx-od-title{font-size:16px;font-weight:600;letter-spacing:-0.02em;margin:0}
.cmx-od-box{background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);border-radius:12px;padding:14px;margin-bottom:14px}
.cmx-od-kick{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--hrx-muted);margin:0 0 4px}
.cmx-od-sep{border-top:1px solid var(--hrx-border-soft);padding-top:14px}
.cmx-od-total{font-size:20px;font-weight:700}
.cmx-od-lbl{display:block;font-size:13px;font-weight:500;color:var(--hrx-muted);margin-bottom:6px}
.cmx-od-check{font-size:13px;color:var(--hrx-ink);margin-bottom:0}
.cmx-od-danger-txt{color:#dc2626;font-weight:600}
.cmx-od .hrx-pill.cmx-od-danger{background:#fff;border-color:#f3c5c5;color:#dc2626}
.cmx-od .hrx-pill.cmx-od-danger:hover{background:#fdeaea;color:#dc2626}
.cmx-od-linkbtn{background:none;border:0;padding:0;font-size:13px;font-weight:500;color:var(--hrx-muted);cursor:pointer;white-space:nowrap}
.cmx-od-linkbtn:hover{color:var(--hrx-ink);text-decoration:underline}
`;

/** Expanded order detail card: line items, customer + shipping, payment trail,
 *  fulfilment (tracking + packing slip + notify), cancel and refunds. */
export default function OrderDrawer({ orgId, orgName, orgCurrency, order, onChanged, onClose }: Props) {
  const currency = order.currency || orgCurrency;
  const { data: items = [], loading, error: itemsError } = useCachedData(
    `ops:order-items:${order.id}`,
    async () => {
      const { data, error } = await getOrderItems(order.id);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [tracking, setTracking] = useState(order.tracking ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundRestock, setRefundRestock] = useState(false);

  const refunded = order.refunded_cents ?? 0;
  const remaining = Math.max(0, order.total_cents - refunded);
  const canFulfill = order.fulfillment_status === "unfulfilled" && (order.status === "paid" || order.status === "pending" || order.status === "partially_refunded");
  const canCancel = order.status === "pending" || order.status === "paid";
  const canRefund = (order.status === "paid" || order.status === "partially_refunded" || order.status === "fulfilled") && remaining > 0;
  const ship = shippingLines(order.shipping);

  async function doFulfill() {
    setBusy("fulfill");
    const ok = await reportMutation(fulfillOrder(order.id, tracking), undefined);
    if (ok) {
      const { delivery, error } = await notifyCommerce(orgId, { kind: "order_fulfilled", orderId: order.id, tracking: tracking.trim() || undefined });
      toastDelivery(delivery, error);
      onChanged();
    }
    setBusy(null);
  }

  async function doSaveTracking() {
    setBusy("tracking");
    const ok = await reportMutation(saveOrderTracking(order.id, tracking), "Tracking saved");
    if (ok) onChanged();
    setBusy(null);
  }

  async function doMarkPaid() {
    if (!confirmDanger(`Mark this ${formatPrice(order.total_cents, currency)} order as paid? Only do this once you have actually collected payment.`)) return;
    setBusy("paid");
    const ok = await reportMutation(setOrderStatus(order.id, "paid"), "Marked paid");
    if (ok) onChanged();
    setBusy(null);
  }

  async function doCancel() {
    if (!confirmDanger("Cancel this order and return its items to stock? This cannot be undone.")) return;
    setBusy("cancel");
    const ok = await reportMutation(cancelOrder(order.id, true), undefined);
    if (ok) {
      const { delivery, error } = await notifyCommerce(orgId, { kind: "order_cancelled", orderId: order.id });
      toastDelivery(delivery, error);
      onChanged();
    }
    setBusy(null);
  }

  async function doRefund() {
    const t = refundAmount.trim();
    let amountCents: number | undefined;
    if (t !== "") {
      const n = Number(t);
      if (!Number.isFinite(n) || n <= 0) {
        toastError("Refund amount must be a number greater than 0.");
        return;
      }
      amountCents = Math.round(n * 100);
      if (amountCents > remaining) {
        toastError(`Refund can't exceed the remaining ${formatPrice(remaining, currency)}.`);
        return;
      }
      if (amountCents === remaining) amountCents = undefined; // full refund
    }
    const label = amountCents ? formatPrice(amountCents, currency) : `the full remaining ${formatPrice(remaining, currency)}`;
    if (!confirmDanger(`Refund ${label} to ${order.customer_name || "the customer"}? This cannot be undone.`)) return;
    setBusy("refund");
    const { refundedCents, error } = await refundOrder(orgId, order.id, amountCents, refundRestock);
    setBusy(null);
    if (error) {
      toastError(error);
      return;
    }
    toast(`Refund issued — ${formatPrice(refundedCents ?? (amountCents ?? remaining), currency)} refunded in total`);
    setRefundAmount("");
    onChanged();
  }

  function packingSlip() {
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) {
      toastError("Your browser blocked the packing-slip window — allow pop-ups and try again.");
      return;
    }
    const rows = items
      .map((i) => `<tr><td>${esc(i.name)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${esc(formatPrice(i.unit_price_cents, currency))}</td></tr>`)
      .join("");
    win.document.write(`<!doctype html><html><head><title>Packing slip — order ${esc(order.id.slice(0, 8))}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:14px}h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#666;margin:20px 0 6px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}th{font-size:12px;text-transform:uppercase;color:#666}p{margin:2px 0}</style>
</head><body>
<h1>${esc(orgName)}</h1>
<p>Packing slip · Order ${esc(order.id.slice(0, 8).toUpperCase())} · ${esc(new Date(order.created_at).toLocaleDateString())}</p>
<h2>Ship to</h2>
<p>${esc(order.customer_name || "Customer")}</p>
${ship.map((l) => `<p>${esc(l)}</p>`).join("") || "<p>No shipping address on file</p>"}
<h2>Items</h2>
<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit price</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No line items</td></tr>'}</tbody></table>
${order.notes ? `<h2>Notes</h2><p>${esc(order.notes)}</p>` : ""}
</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <section
      id={`order-detail-${order.id}`}
      className="cmx-od"
      aria-label={`Order details for ${order.customer_name || "customer"}`}
    >
      <style>{CSS}</style>
      <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
        <div style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
            <h3 className="cmx-od-title">Order {order.id.slice(0, 8).toUpperCase()}</h3>
            <Chip tone={order.status === "partially_refunded" ? "warn" : stageTone(order.status)}>
              {order.status.replace(/_/g, " ")}
            </Chip>
          </div>
          <div className="cmx-od-sm cmx-od-muted">
            {order.customer_name || "Customer"} · {order.customer_email || "no email"}
          </div>
          <div className="cmx-od-sm cmx-od-muted">
            {new Date(order.created_at).toLocaleString()}
            {order.source ? ` · via ${order.source}` : ""}
          </div>
        </div>
        <button type="button" className="cmx-od-linkbtn ops-tap flex-shrink-0" onClick={onClose}>Close</button>
      </div>

      {/* Line items */}
      {loading ? (
        <div className="cmx-od-sm cmx-od-muted py-2">Loading items…</div>
      ) : itemsError ? (
        <div className="cmx-od-sm cmx-od-danger-txt py-2" role="alert">{itemsError}</div>
      ) : items.length === 0 ? (
        <div className="cmx-od-sm cmx-od-muted py-2">No line items recorded.</div>
      ) : (
        <div className="cmx-od-box">
          {items.map((i) => (
            <div key={i.id} className="d-flex justify-content-between gap-3 cmx-od-md py-1">
              <span style={{ minWidth: 0 }}>{i.name} <span className="cmx-od-muted">× {i.quantity}</span></span>
              <span className="cmx-od-strong text-nowrap">{formatPrice(i.unit_price_cents * i.quantity, currency)}</span>
            </div>
          ))}
          <div className="d-flex justify-content-between align-items-baseline gap-3 cmx-od-sep mt-2" style={{ paddingTop: 8 }}>
            <span className="cmx-od-kick mb-0">Total</span>
            <span className="cmx-od-total text-nowrap">{formatPrice(order.total_cents, currency)}</span>
          </div>
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <h4 className="cmx-od-kick">Shipping</h4>
          {ship.length === 0
            ? <div className="cmx-od-sm cmx-od-muted">No shipping address on file.</div>
            : ship.map((l, i) => <div key={i} className="cmx-od-md">{l}</div>)}
        </div>
        <div className="col-md-6">
          <h4 className="cmx-od-kick">Payment</h4>
          <div className="cmx-od-md">Reference: {order.payment_reference || "—"}</div>
          <div className="cmx-od-md">Paid: {order.paid_at ? new Date(order.paid_at).toLocaleString() : "not yet"}</div>
          {(order.discount_cents ?? 0) > 0 && (
            <div className="cmx-od-md">Discount: −{formatPrice(order.discount_cents ?? 0, currency)}{order.promo_code ? ` (${order.promo_code})` : ""}</div>
          )}
          {refunded > 0 && <div className="cmx-od-md cmx-od-danger-txt">Refunded: {formatPrice(refunded, currency)}</div>}
        </div>
      </div>

      {order.notes && <div className="cmx-od-sm mb-3"><span className="cmx-od-strong cmx-od-muted">Notes:</span> {order.notes}</div>}

      {/* Fulfilment — the tracking field takes its own line on a phone so the
          action buttons below it stay on a full-width, tappable row. */}
      <div className="cmx-od-sep">
        <label className="hrx-field" htmlFor={`trk-${order.id}`}>
          <span>Tracking number (optional)</span>
          <input
            id={`trk-${order.id}`}
            className="form-control form-control-sm"
            style={{ maxWidth: 260 }}
            placeholder="e.g. 1Z999AA10123456784"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </label>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {canFulfill ? (
            <button type="button" className="hrx-pill dark" onClick={doFulfill} disabled={busy !== null}>
              {busy === "fulfill" ? "Fulfilling…" : "Mark fulfilled"}
            </button>
          ) : (
            <button type="button" className="hrx-pill" onClick={doSaveTracking} disabled={busy !== null || (tracking.trim() === (order.tracking ?? ""))}>
              {busy === "tracking" ? "Saving…" : "Save tracking"}
            </button>
          )}
          <button type="button" className="hrx-pill" onClick={packingSlip}>Print packing slip</button>
          {order.status === "pending" && (
            <button type="button" className="hrx-pill" onClick={doMarkPaid} disabled={busy !== null}>
              {busy === "paid" ? "Saving…" : "Payment collected"}
            </button>
          )}
          {canCancel && (
            <button type="button" className="hrx-pill cmx-od-danger" onClick={doCancel} disabled={busy !== null}>
              {busy === "cancel" ? "Cancelling…" : "Cancel order"}
            </button>
          )}
        </div>
      </div>

      {/* Refund */}
      {canRefund && (
        <div className="cmx-od-sep mt-3">
          <label htmlFor={`refund-${order.id}`} className="cmx-od-lbl">
            Refund amount — leave blank to refund the full {formatPrice(remaining, currency)}
          </label>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              id={`refund-${order.id}`}
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              className="form-control form-control-sm"
              style={{ maxWidth: 130 }}
              placeholder="Amount"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <label className="cmx-od-check ops-tap">
              <input type="checkbox" className="me-1" checked={refundRestock} onChange={(e) => setRefundRestock(e.target.checked)} />
              Return items to stock
            </label>
            <button type="button" className="hrx-pill cmx-od-danger" onClick={doRefund} disabled={busy !== null}>
              {busy === "refund" ? "Refunding…" : "Refund"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
