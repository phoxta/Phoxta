import { useEffect, useState } from "react";
import { listVariants, setVariantStock, generateVariants, type Variant } from "@/lib/db/ops/variants";

// Editable size × colour stock grid for one product (retail/fashion).
export default function VariantMatrix({ orgId, productId }: { orgId: string; productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await listVariants(productId);
    setVariants(data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function gen() {
    setBusy(true);
    await generateVariants(orgId, productId);
    await load();
    setBusy(false);
  }
  async function save(id: string, val: number) {
    await setVariantStock(id, val);
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, stock: Math.max(0, Math.round(val) || 0) } : v)));
  }

  if (loading) return <div className="fz-font-sm neutral-500 p-2">Loading variants…</div>;

  if (variants.length === 0) {
    return (
      <div className="p-2">
        <div className="fz-font-sm neutral-500 mb-2">No variants yet.</div>
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

  return (
    <div className="p-2 overflow-auto">
      <div className="fz-font-sm neutral-500 mb-2">Stock by size × colour · {total} total</div>
      <table className="table table-sm align-middle mb-2" style={{ minWidth: 360 }}>
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
                return (
                  <td key={color}>
                    <input
                      type="number"
                      min={0}
                      className={`form-control form-control-sm rounded-2 ${v.stock === 0 ? "border-warning" : ""}`}
                      style={{ width: 64 }}
                      value={v.stock}
                      onChange={(e) => setVariants((vs) => vs.map((x) => (x.id === v.id ? { ...x, stock: Number(e.target.value) } : x)))}
                      onBlur={(e) => save(v.id, Number(e.target.value))}
                    />
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
