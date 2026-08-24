import { useRef, useState } from "react";
import { updateProduct, uploadProductImage, type Product, type ProductStatus } from "@/lib/db/ops/commerce";
import { toastError, reportMutation } from "@/lib/ops/feedback";

/** Strict money parse: returns cents, or null when the input isn't a valid amount. */
const parseCents = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const splitCsv = (s: string): string[] => [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];

type ModOpt = { label: string; price: string };
type ModGrp = { name: string; required: boolean; options: ModOpt[] };

type Props = { orgId: string; product: Product; itemNoun: string; onSaved: () => void; onCancel: () => void };

const CSS = `
.cmx-pe .hrx-field{margin-bottom:0}
.cmx-pe-imgbox{width:120px;height:120px;border-radius:12px;border:1px solid var(--hrx-border-soft);background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px}
.cmx-pe-imgbox img{width:100%;height:100%;object-fit:cover;display:block}
.cmx-pe-nomedia{font-size:13px;color:var(--hrx-muted)}
.cmx-pe .cmx-pill-sm{height:34px;padding:0 14px;font-size:13px}
.cmx-pe .cmx-wide{width:100%;justify-content:center}
.cmx-pe-linkbtn{background:none;border:0;padding:0;font-size:13px;font-weight:600;color:var(--hrx-blue);cursor:pointer;white-space:nowrap}
.cmx-pe-linkbtn:hover{color:var(--hrx-blue-deep);text-decoration:underline}
.cmx-pe-linkbtn.muted{color:var(--hrx-muted);font-weight:500}
.cmx-pe-modbox{background:#fff;border:1px solid var(--hrx-border-soft);border-radius:12px;padding:10px;margin-bottom:8px}
.cmx-pe-hint{font-size:13px;color:var(--hrx-muted)}
.cmx-pe-check{font-size:13px;color:var(--hrx-ink);margin-bottom:0;white-space:nowrap}
`;

// Inline editor for a catalogue/menu item — name, price, stock, category, description,
// image (upload), and status. Writes through updateProduct; metadata.category drives
// how the storefront groups the item.
export default function ProductEditor({ orgId, product, itemNoun, onSaved, onCancel }: Props) {
  const meta = (product.metadata ?? {}) as Record<string, unknown>;
  // Every editor row is rendered inside the same catalogue table, so ids have to
  // be namespaced per product or the labels would point at the wrong inputs.
  const fid = (name: string) => `pe-${product.id}-${name}`;
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2));
  const [stock, setStock] = useState(String(product.stock));
  const [category, setCategory] = useState(typeof meta.category === "string" ? meta.category : "");
  const [description, setDescription] = useState(product.description ?? "");
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [sizesStr, setSizesStr] = useState(Array.isArray(meta.sizes) ? (meta.sizes as string[]).join(", ") : "");
  const [colorsStr, setColorsStr] = useState(Array.isArray(meta.colors) ? (meta.colors as string[]).join(", ") : "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mods, setMods] = useState<ModGrp[]>(() => {
    const raw = Array.isArray(meta.modifiers) ? (meta.modifiers as Record<string, unknown>[]) : [];
    return raw.map((g) => ({
      name: String(g.name ?? ""),
      required: !!g.required,
      options: (Array.isArray(g.options) ? (g.options as Record<string, unknown>[]) : []).map((o) => ({ label: String(o.label ?? ""), price: ((Number(o.price) || 0) / 100).toString() })),
    }));
  });
  const setGrp = (i: number, patch: Partial<ModGrp>) => setMods((m) => m.map((g, gi) => (gi === i ? { ...g, ...patch } : g)));
  const setOpt = (gi: number, oi: number, patch: Partial<ModOpt>) => setMods((m) => m.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g)));
  const addGrp = () => setMods((m) => [...m, { name: "", required: false, options: [{ label: "", price: "" }] }]);
  const delGrp = (i: number) => setMods((m) => m.filter((_, gi) => gi !== i));
  const addOpt = (gi: number) => setMods((m) => m.map((g, i) => (i === gi ? { ...g, options: [...g.options, { label: "", price: "" }] } : g)));
  const delOpt = (gi: number, oi: number) => setMods((m) => m.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    const { url, error } = await uploadProductImage(orgId, file);
    setUploading(false);
    if (error) setErr(error);
    else if (url) setImageUrl(url);
  }

  async function save() {
    if (!name.trim()) {
      // Save is a plain button outside any <form>, so nothing else would tell
      // the owner why clicking it did nothing.
      toastError(`${itemNoun} name can't be empty.`);
      return;
    }
    const priceCents = parseCents(price);
    if (priceCents === null) {
      toastError("Price must be a valid number (e.g. 24.99).");
      return;
    }
    const stockT = stock.trim();
    const stockN = stockT === "" ? 0 : Number(stockT);
    if (!Number.isFinite(stockN) || !Number.isInteger(stockN) || stockN < 0) {
      toastError("Stock must be a whole number, 0 or more.");
      return;
    }
    for (const g of mods) {
      for (const o of g.options) {
        if (o.label.trim() && o.price.trim() && parseCents(o.price) === null) {
          toastError(`Option price "${o.price}" in "${g.name || "options"}" isn't a valid number.`);
          return;
        }
      }
    }
    setBusy(true);
    setErr(null);
    const modifiers = mods
      .map((g) => ({ name: g.name.trim(), required: g.required, options: g.options.filter((o) => o.label.trim()).map((o) => ({ label: o.label.trim(), price: parseCents(o.price) ?? 0 })) }))
      .filter((g) => g.name && g.options.length);
    const sizes = splitCsv(sizesStr);
    const colors = splitCsv(colorsStr);
    const ok = await reportMutation(
      updateProduct(product.id, {
        name: name.trim(),
        price_cents: priceCents,
        stock: stockN,
        description,
        status,
        image_url: imageUrl || null,
        metadata: {
          ...meta,
          category: category.trim() || undefined,
          modifiers: modifiers.length ? modifiers : undefined,
          sizes: sizes.length ? sizes : undefined,
          colors: colors.length ? colors : undefined,
        },
      }),
      "Saved",
    );
    setBusy(false);
    if (ok) onSaved();
  }

  return (
    <div className="p-2 cmx-pe">
      <style>{CSS}</style>
      {err && <div className="alert alert-warning py-2 px-3 cmx-pe-hint" role="alert">{err}</div>}
      <div className="d-flex gap-3 flex-wrap">
        {/* Image */}
        <div style={{ width: 120, flexShrink: 0 }}>
          <div className="cmx-pe-imgbox">
            {imageUrl
              ? <img src={imageUrl} alt={`${name || itemNoun} photo`} />
              : <span className="cmx-pe-nomedia">No image</span>}
          </div>
          {/* A real button, not a <label> wrapping a hidden input — the label form
              could not be reached or fired from the keyboard. */}
          <button type="button" className="hrx-pill cmx-pill-sm cmx-wide" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={onFile} disabled={uploading} />
        </div>

        {/* Fields */}
        <div className="flex-grow-1" style={{ minWidth: 240 }}>
          <div className="row g-2">
            <div className="col-12">
              <label className="hrx-field" htmlFor={fid("name")}>
                <span>{itemNoun} name</span>
                <input id={fid("name")} className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <div className="col-6 col-sm-4">
              <label className="hrx-field" htmlFor={fid("price")}>
                <span>Price ({product.currency})</span>
                <input id={fid("price")} type="number" inputMode="decimal" min={0} step={0.01} className="form-control form-control-sm" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
            </div>
            <div className="col-6 col-sm-4">
              <label className="hrx-field" htmlFor={fid("stock")}>
                <span>Stock</span>
                <input id={fid("stock")} type="number" min={0} step={1} className="form-control form-control-sm" value={stock} onChange={(e) => setStock(e.target.value)} />
              </label>
            </div>
            <div className="col-12 col-sm-4">
              <label className="hrx-field" htmlFor={fid("status")}>
                <span>Status</span>
                <select id={fid("status")} className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <div className="col-12">
              <label className="hrx-field" htmlFor={fid("category")}>
                <span>Category / section</span>
                <input id={fid("category")} className="form-control form-control-sm" placeholder="e.g. Mains, Desserts, Office Chairs…" value={category} onChange={(e) => setCategory(e.target.value)} />
              </label>
            </div>
            <div className="col-12">
              <label className="hrx-field" htmlFor={fid("description")}>
                <span>Description</span>
                <textarea id={fid("description")} className="form-control form-control-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>

            {/* Sizes & colours drive the variant grid (metadata.sizes / metadata.colors) */}
            <div className="col-12 col-sm-6">
              <label className="hrx-field" htmlFor={fid("sizes")}>
                <span>Sizes (comma-separated)</span>
                <input id={fid("sizes")} className="form-control form-control-sm" placeholder="e.g. S, M, L, XL" value={sizesStr} onChange={(e) => setSizesStr(e.target.value)} />
              </label>
            </div>
            <div className="col-12 col-sm-6">
              <label className="hrx-field" htmlFor={fid("colors")}>
                <span>Colors (comma-separated)</span>
                <input id={fid("colors")} className="form-control form-control-sm" placeholder="e.g. Black, Ivory" value={colorsStr} onChange={(e) => setColorsStr(e.target.value)} />
              </label>
            </div>

            <div className="col-12">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                <span id={fid("mods")} className="cmx-pe-hint" style={{ fontWeight: 500 }}>Options / modifiers</span>
                <button type="button" className="cmx-pe-linkbtn ops-tap" onClick={addGrp}>+ Add option group</button>
              </div>
              {mods.length === 0 && <div className="cmx-pe-hint mb-1">None — e.g. a “Size” group with Regular / Large (+£3), or “Add-ons”.</div>}
              <div role="group" aria-labelledby={fid("mods")}>
                {mods.map((g, gi) => (
                  <div key={gi} className="cmx-pe-modbox">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <input
                        className="form-control form-control-sm"
                        style={{ flex: "1 1 150px", minWidth: 0 }}
                        placeholder="Group name (e.g. Size)"
                        aria-label={`Option group ${gi + 1} name`}
                        value={g.name}
                        onChange={(e) => setGrp(gi, { name: e.target.value })}
                      />
                      <label className="cmx-pe-check ops-tap"><input type="checkbox" checked={g.required} onChange={(e) => setGrp(gi, { required: e.target.checked })} className="me-1" />Required</label>
                      <button type="button" className="cmx-pe-linkbtn muted ops-tap" onClick={() => delGrp(gi)}>Remove{g.name.trim() ? ` “${g.name.trim()}”` : " group"}</button>
                    </div>
                    {g.options.map((o, oi) => (
                      <div key={oi} className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <input
                          className="form-control form-control-sm"
                          style={{ flex: "1 1 140px", minWidth: 0 }}
                          placeholder="Option (e.g. Large)"
                          aria-label={`Option ${oi + 1} name in ${g.name.trim() || `group ${gi + 1}`}`}
                          value={o.label}
                          onChange={(e) => setOpt(gi, oi, { label: e.target.value })}
                        />
                        <div className="input-group input-group-sm" style={{ width: 110 }}>
                          <span className="input-group-text">+$</span>
                          <input
                            className="form-control"
                            placeholder="0.00"
                            aria-label={`Extra charge for option ${oi + 1} in ${g.name.trim() || `group ${gi + 1}`}`}
                            value={o.price}
                            onChange={(e) => setOpt(gi, oi, { price: e.target.value })}
                          />
                        </div>
                        <button type="button" className="cmx-pe-linkbtn muted ops-tap" onClick={() => delOpt(gi, oi)} aria-label={`Remove option ${oi + 1} from ${g.name.trim() || `group ${gi + 1}`}`}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="cmx-pe-linkbtn muted ops-tap" onClick={() => addOpt(gi)}>+ Add option</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 mt-3">
            <button type="button" className="hrx-pill primary" onClick={save} disabled={busy || uploading}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="cmx-pe-linkbtn muted ops-tap" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
