import { useEffect, useRef, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listVariants, setVariantStock, setVariantPrice, generateVariants } from "@/lib/db/ops/variants";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError } from "@/lib/ops/feedback";

type Props = { orgId: string; productId: string; basePriceCents: number; currency: string };

const CSS = `
.cmx-vm-sm{font-size:13px}
.cmx-vm-muted{color:var(--hrx-muted)}
.cmx-vm-strong{font-weight:600;color:var(--hrx-ink)}
.cmx-vm-danger{color:#dc2626;font-weight:600}
.cmx-vm-wrap{background:#fff;border:1px solid var(--hrx-border-soft);border-radius:12px;overflow-x:auto;margin-bottom:8px}
.cmx-vm-table{width:100%;border-collapse:collapse;font-size:13px}
.cmx-vm-table thead th{text-align:left;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--hrx-muted);padding:8px 10px;border-bottom:1px solid var(--hrx-border-soft);white-space:nowrap}
.cmx-vm-table td{padding:8px 10px;border-bottom:1px solid #f1f2f4;vertical-align:top}
.cmx-vm-table tbody th{text-align:left;font-size:13px;font-weight:600;color:var(--hrx-ink);padding:8px 10px;border-bottom:1px solid #f1f2f4;white-space:nowrap;vertical-align:middle}
.cmx-vm-table tbody tr:last-child td,.cmx-vm-table tbody tr:last-child th{border-bottom:0}
.cmx-vm-stick{position:sticky;left:0;background:#fff}
.cmx-vm-pill-sm{height:34px;padding:0 14px;font-size:13px}
.cmx-vm-linkbtn{background:none;border:0;padding:0;font-size:13px;font-weight:500;color:var(--hrx-muted);cursor:pointer;white-space:nowrap}
.cmx-vm-linkbtn:hover{color:var(--hrx-ink);text-decoration:underline}
`;

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
  // One acknowledgement per burst of cell edits — a toast per cell would spam
  // anyone tabbing across the grid, but silence leaves saves unconfirmed.
  const savedAck = useRef<number | null>(null);

  function ackSaved() {
    if (savedAck.current !== null) window.clearTimeout(savedAck.current);
    savedAck.current = window.setTimeout(() => {
      savedAck.current = null;
      toast("Variants saved");
    }, 800);
  }

  useEffect(
    () => () => {
      if (savedAck.current !== null) window.clearTimeout(savedAck.current);
    },
    [],
  );

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
    } else {
      ackSaved();
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
    } else {
      ackSaved();
    }
  }

  if (loading) {
    return (
      <div className="p-2">
        <style>{CSS}</style>
        <div className="cmx-vm-sm cmx-vm-muted">Loading variants…</div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="p-2">
        <style>{CSS}</style>
        <div className="cmx-vm-sm cmx-vm-muted mb-2">No variants yet. Set sizes &amp; colors in the editor, then generate the grid.</div>
        <button type="button" className="hrx-pill cmx-vm-pill-sm" onClick={gen} disabled={busy}>
          {busy ? "…" : "Generate from sizes & colors"}
        </button>
      </div>
    );
  }

  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Set(variants.map((v) => v.color))];
  const cell = (size: string, color: string) => variants.find((v) => v.size === size && v.color === color);
  const total = variants.reduce((s, v) => s + v.stock, 0);
  const outOfStock = variants.filter((v) => v.stock === 0).length;

  // Each colour column carries two ~88px inputs; below that width the cells crush,
  // so the grid keeps its natural size and scrolls sideways instead.
  const gridMinWidth = 76 + colors.length * 104;

  return (
    <div className="p-2">
      <style>{CSS}</style>
      <div className="cmx-vm-sm cmx-vm-muted mb-2">
        Stock &amp; price by size × color · <span className="cmx-vm-strong">{total} in stock</span>
        {outOfStock > 0 && <span className="cmx-vm-danger"> · {outOfStock} variant{outOfStock === 1 ? "" : "s"} at 0</span>}
        <span> · blank price = inherits {formatPrice(basePriceCents, currency)}</span>
      </div>
      <div className="cmx-vm-wrap">
        <table className="cmx-vm-table" style={{ minWidth: gridMinWidth }}>
          <caption className="visually-hidden">Stock and price override for every size and color combination</caption>
          <thead>
            <tr>
              <th scope="col" className="cmx-vm-stick" style={{ zIndex: 2 }}>Size</th>
              {colors.map((c) => <th key={c} scope="col">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {sizes.map((size) => (
              <tr key={size}>
                <th scope="row" className="cmx-vm-stick" style={{ zIndex: 1 }}>{size}</th>
                {colors.map((color) => {
                  const v = cell(size, color);
                  if (!v) return <td key={color} className="cmx-vm-muted text-center">—</td>;
                  const stockVal = stockDrafts[v.id] ?? String(v.stock);
                  const priceVal = priceDrafts[v.id] ?? (v.price_cents == null ? "" : (v.price_cents / 100).toFixed(2));
                  return (
                    <td key={color}>
                      <div className="d-flex flex-column gap-1" style={{ width: 88 }}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          aria-label={`Stock for ${size} / ${color}`}
                          className={`form-control form-control-sm ${v.stock === 0 ? "border-danger" : ""}`}
                          value={stockVal}
                          onChange={(e) => setStockDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                          onBlur={() => saveStock(v.id)}
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          aria-label={`Price override for ${size} / ${color}`}
                          className="form-control form-control-sm"
                          placeholder="price"
                          title={v.price_cents == null ? `Inherits ${formatPrice(basePriceCents, currency)}` : formatPrice(v.price_cents, currency)}
                          value={priceVal}
                          onChange={(e) => setPriceDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                          onBlur={() => savePrice(v.id)}
                        />
                        {v.stock === 0 && <span className="cmx-vm-sm cmx-vm-danger">Sold out</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="cmx-vm-linkbtn ops-tap" onClick={gen} disabled={busy}>+ Sync new sizes / colors</button>
    </div>
  );
}
