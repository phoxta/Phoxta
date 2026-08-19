import { useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listVariants, setVariantStock, setVariantPrice, generateVariants } from "@/lib/db/ops/variants";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError } from "@/lib/ops/feedback";

type Props = { orgId: string; productId: string; basePriceCents: number; currency: string };

// Editable size × colour grid for one product (retail/fashion): per-cell stock
// and an optional per-cell price override (blank = inherit the product price).
export default function VariantMatrix({ orgId, productId, basePriceCents, currency }: Props) {
  const { data: variants = [], loading, reload, setData: setVariants } = useCachedData(
    `ops:variants:${productId}`,
    async () => {
      const { data, error } = await listVariants(productId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [busy, setBusy] = useState(false);
  // Local drafts so typing garbage never writes through; keyed by variant id.
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  async function gen() {
    setBusy(true);
    const { created, error } = await generateVariants(orgId, productId);
    setBusy(false);
    if (error) toastError(error);
    else if (created > 0) toast(`${created} variant${created === 1 ? "" : "s"} created`);
    else toast("Variants already up to date", "info");
    await reload();
  }

  function clearDraft(map: React.Dispatch<React.SetStateAction<Record<string, string>>>, id: string) {
    map((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  }

  async function saveStock(id: string) {
    const raw = stockDrafts[id];
    if (raw === undefined) return; // untouched
    const prev = (variants ?? []).find((v) => v.id === id);
    if (!prev) return;
    const t = raw.trim();
    clearDraft(setStockDrafts, id);
    if (t === "") return; // empty blur: skip — never write 0 by accident
    const n = Number(t);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      toastError("Stock must be a whole number, 0 or more.");
      return;
    }
    if (n === prev.stock) return;
    const prevStock = prev.stock;
    setVariants((vs) => (vs ?? []).map((v) => (v.id === id ? { ...v, stock: n } : v)));
    const { error } = await setVariantStock(id, n);
    if (error) {
      // Roll the optimistic update back so the grid shows the real value.
      setVariants((vs) => (vs ?? []).map((v) => (v.id === id ? { ...v, stock: prevStock } : v)));
      toastError(error);
    }
  }

  async function savePrice(id: string) {
    const raw = priceDrafts[id];
    if (raw === undefined) return;
    const prev = (variants ?? []).find((v) => v.id === id);
    if (!prev) return;
    const t = raw.trim();
    clearDraft(setPriceDrafts, id);
    let next: number | null;
    if (t === "") {
      if (prev.price_cents == null) return; // was already inherited — nothing to do
      next = null; // cleared an override → inherit again
    } else {
      const n = Number(t);
      if (!Number.isFinite(n) || n < 0) {
        toastError("Price must be a number, 0 or more.");
        return;
      }
      next = Math.round(n * 100);
      if (next === prev.price_cents) return;
    }
    const prevPrice = prev.price_cents;
    setVariants((vs) => (vs ?? []).map((v) => (v.id === id ? { ...v, price_cents: next } : v)));
    const { error } = await setVariantPrice(id, next);
    if (error) {
      setVariants((vs) => (vs ?? []).map((v) => (v.id === id ? { ...v, price_cents: prevPrice } : v)));
      toastError(error);
    }
  }

  if (loading) return <div className="fz-font-sm neutral-500 p-2">Loading variants…</div>;

  if (variants.length === 0) {
    return (
      <div className="p-2">
        <div className="fz-font-sm neutral-500 mb-2">No variants yet. Set sizes &amp; colours in the editor, then generate the grid.</div>
        <button type="button" className="btn btn-outline-dark btn-sm rounded-3" onClick={gen} disabled={busy}>
          {busy ? "…" : "Generate from sizes & colours"}
        </button>
      </div>
    );
  }

  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Set(variants.map((v) => v.color))];
  const cell = (size: string, color: string) => variants.find((v) => v.size === size && v.color === color);
  const total = variants.reduce((s, v) => s + v.stock, 0);
  const outOfStock = variants.filter((v) => v.stock === 0).length;

  return (
    <div className="p-2 overflow-auto">
      <div className="fz-font-sm neutral-500 mb-2">
        Stock &amp; price by size × colour · {total} total
        {outOfStock > 0 && <span className="text-danger fw-600"> · {outOfStock} variant{outOfStock === 1 ? "" : "s"} at 0</span>}
        <span className="neutral-400"> · blank price = inherits {formatPrice(basePriceCents, currency)}</span>
      </div>
      <table className="table table-sm align-middle mb-2" style={{ minWidth: 420 }}>
        <thead>
          <tr>
            <th></th>
            {colors.map((c) => <th key={c} className="fz-font-sm fw-600">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {sizes.map((size) => (
            <tr key={size}>
              <td className="fz-font-sm fw-600">{size}</td>
              {colors.map((color) => {
                const v = cell(size, color);
                if (!v) return <td key={color} className="neutral-300">—</td>;
                const stockVal = stockDrafts[v.id] ?? String(v.stock);
                const priceVal = priceDrafts[v.id] ?? (v.price_cents == null ? "" : (v.price_cents / 100).toFixed(2));
                return (
                  <td key={color}>
                    <div className="d-flex flex-column gap-1">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`Stock for ${size} / ${color}`}
                        className={`form-control form-control-sm rounded-2 ${v.stock === 0 ? "border-danger" : ""}`}
                        style={{ width: 84 }}
                        value={stockVal}
                        onChange={(e) => setStockDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                        onBlur={() => saveStock(v.id)}
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        aria-label={`Price override for ${size} / ${color}`}
                        className="form-control form-control-sm rounded-2"
                        style={{ width: 84 }}
                        placeholder="price"
                        title={v.price_cents == null ? `Inherits ${formatPrice(basePriceCents, currency)}` : formatPrice(v.price_cents, currency)}
                        value={priceVal}
                        onChange={(e) => setPriceDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                        onBlur={() => savePrice(v.id)}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={gen} disabled={busy}>+ Sync new sizes / colours</button>
    </div>
  );
}
