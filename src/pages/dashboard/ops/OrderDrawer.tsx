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
    <div className="bg-neutral-50 rounded-4 border-100 p-3">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
        <div>
          <div className="fw-600">{order.customer_name || "Customer"}</div>
          <div className="fz-font-sm neutral-500">
            {order.customer_email || "no email"} · {new Date(order.created_at).toLocaleString()}
            {order.source ? ` · via ${order.source}` : ""}
          </div>
        </div>
        <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={onClose}>Close</button>
      </div>

      {/* Line items */}
      {loading ? (
        <div className="fz-font-sm neutral-500 py-2">Loading items…</div>
      ) : itemsError ? (
        <div className="fz-font-sm text-danger py-2">{itemsError}</div>
      ) : items.length === 0 ? (
        <div className="fz-font-sm neutral-500 py-2">No line items recorded.</div>
      ) : (
        <div className="bg-neutral-0 rounded-3 border-100 p-2 mb-2">
          {items.map((i) => (
            <div key={i.id} className="d-flex justify-content-between gap-2 fz-font-md py-1">
              <span>{i.name} <span className="neutral-500">× {i.quantity}</span></span>
              <span className="fw-600">{formatPrice(i.unit_price_cents * i.quantity, currency)}</span>
            </div>
          ))}
          <div className="d-flex justify-content-between gap-2 fz-font-md border-top pt-1 mt-1">
            <span className="fw-600">Total</span>
            <span className="fw-600">{formatPrice(order.total_cents, currency)}</span>
          </div>
        </div>
      )}

      <div className="row g-3 fz-font-sm mb-2">
        <div className="col-md-6">
          <div className="fw-600 neutral-500 text-uppercase mb-1" style={{ fontSize: 11, letterSpacing: ".04em" }}>Shipping</div>
          {ship.length === 0 ? <div className="neutral-500">No shipping address on file.</div> : ship.map((l, i) => <div key={i} className="neutral-700">{l}</div>)}
        </div>
        <div className="col-md-6">
          <div className="fw-600 neutral-500 text-uppercase mb-1" style={{ fontSize: 11, letterSpacing: ".04em" }}>Payment</div>
          <div className="neutral-700">Reference: {order.payment_reference || "—"}</div>
          <div className="neutral-700">Paid: {order.paid_at ? new Date(order.paid_at).toLocaleString() : "not yet"}</div>
          {(order.discount_cents ?? 0) > 0 && (
            <div className="neutral-700">Discount: −{formatPrice(order.discount_cents ?? 0, currency)}{order.promo_code ? ` (${order.promo_code})` : ""}</div>
          )}
          {refunded > 0 && <div className="text-danger fw-600">Refunded: {formatPrice(refunded, currency)}</div>}
        </div>
      </div>

      {order.notes && <div className="fz-font-sm neutral-700 mb-2"><span className="fw-600 neutral-500">Notes:</span> {order.notes}</div>}

      {/* Fulfilment */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <label htmlFor={`trk-${order.id}`} className="fz-font-sm neutral-500 mb-0">Tracking</label>
        <input
          id={`trk-${order.id}`}
          className="form-control form-control-sm rounded-3"
          style={{ maxWidth: 220 }}
          placeholder="Tracking number (optional)"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
        {canFulfill ? (
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={doFulfill} disabled={busy !== null}>
            {busy === "fulfill" ? "…" : "Fulfill"}
          </button>
        ) : (
          <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={doSaveTracking} disabled={busy !== null || (tracking.trim() === (order.tracking ?? ""))}>
            {busy === "tracking" ? "…" : "Save tracking"}
          </button>
        )}
        <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={packingSlip}>Packing slip</button>
        {order.status === "pending" && (
          <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={doMarkPaid} disabled={busy !== null}>
            {busy === "paid" ? "…" : "Payment collected"}
          </button>
        )}
        {canCancel && (
          <button type="button" className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={doCancel} disabled={busy !== null}>
            {busy === "cancel" ? "…" : "Cancel order"}
          </button>
        )}
      </div>

      {/* Refund */}
      {canRefund && (
        <div className="d-flex flex-wrap align-items-center gap-2 border-top pt-2">
          <span className="fz-font-sm neutral-500">Refund (leave blank for the full {formatPrice(remaining, currency)})</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            aria-label="Refund amount"
            className="form-control form-control-sm rounded-3"
            style={{ maxWidth: 120 }}
            placeholder="Amount"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
          <label className="fz-font-sm neutral-600 mb-0">
            <input type="checkbox" className="me-1" checked={refundRestock} onChange={(e) => setRefundRestock(e.target.checked)} />
            Return items to stock
          </label>
          <button type="button" className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={doRefund} disabled={busy !== null}>
            {busy === "refund" ? "…" : "Refund"}
          </button>
        </div>
      )}
    </div>
  );
}
