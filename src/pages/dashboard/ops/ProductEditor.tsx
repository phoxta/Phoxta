import { useState } from "react";
import { updateProduct, uploadProductImage, type Product, type ProductStatus } from "@/lib/db/ops/commerce";

const toCents = (s: string) => Math.round((parseFloat(s) || 0) * 100);

type ModOpt = { label: string; price: string };
type ModGrp = { name: string; required: boolean; options: ModOpt[] };

type Props = { orgId: string; product: Product; itemNoun: string; onSaved: () => void; onCancel: () => void };

// Inline editor for a catalogue/menu item — name, price, stock, category, description,
// image (upload), and status. Writes through updateProduct; metadata.category drives
// how the storefront groups the item.
export default function ProductEditor({ orgId, product, itemNoun, onSaved, onCancel }: Props) {
  const meta = (product.metadata ?? {}) as Record<string, unknown>;
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2));
  const [stock, setStock] = useState(String(product.stock));
  const [category, setCategory] = useState(typeof meta.category === "string" ? meta.category : "");
  const [description, setDescription] = useState(product.description ?? "");
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [status, setStatus] = useState<ProductStatus>(product.status);
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
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    const modifiers = mods
      .map((g) => ({ name: g.name.trim(), required: g.required, options: g.options.filter((o) => o.label.trim()).map((o) => ({ label: o.label.trim(), price: toCents(o.price) })) }))
      .filter((g) => g.name && g.options.length);
    const { error } = await updateProduct(product.id, {
      name: name.trim(),
      price_cents: toCents(price),
      stock: parseInt(stock) || 0,
      description,
      status,
      image_url: imageUrl || null,
      metadata: { ...meta, category: category.trim() || undefined, modifiers: modifiers.length ? modifiers : undefined },
    });
    setBusy(false);
    if (error) setErr(error);
    else onSaved();
  }

  return (
    <div className="p-3">
      {err && <div className="alert alert-warning py-2 px-3 fz-font-sm">{err}</div>}
      <div className="d-flex gap-3 flex-wrap">
        {/* Image */}
        <div style={{ width: 120, flexShrink: 0 }}>
          <div className="rounded-3 border-100 bg-neutral-0 mb-2 d-flex align-items-center justify-content-center overflow-hidden" style={{ width: 120, height: 120 }}>
            {imageUrl
              ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span className="neutral-400 fz-font-sm">No image</span>}
          </div>
          <label className="btn btn-outline-dark btn-sm rounded-3 w-100 mb-0" style={{ cursor: "pointer" }}>
            {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload image"}
            <input type="file" accept="image/*" hidden onChange={onFile} disabled={uploading} />
          </label>
        </div>

        {/* Fields */}
        <div className="flex-grow-1" style={{ minWidth: 240 }}>
          <div className="row g-2">
            <div className="col-12"><label className="fz-font-sm neutral-500 d-block mb-1">{itemNoun} name</label><input className="form-control form-control-sm rounded-3" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="col-4"><label className="fz-font-sm neutral-500 d-block mb-1">Price</label><input className="form-control form-control-sm rounded-3" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="col-4"><label className="fz-font-sm neutral-500 d-block mb-1">Stock</label><input className="form-control form-control-sm rounded-3" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
            <div className="col-4">
              <label className="fz-font-sm neutral-500 d-block mb-1">Status</label>
              <select className="form-select form-select-sm rounded-3" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="col-12"><label className="fz-font-sm neutral-500 d-block mb-1">Category / section</label><input className="form-control form-control-sm rounded-3" placeholder="e.g. Mains, Desserts, Office Chairs…" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <div className="col-12"><label className="fz-font-sm neutral-500 d-block mb-1">Description</label><textarea className="form-control form-control-sm rounded-3" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>

            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="fz-font-sm neutral-500 mb-0">Options / modifiers</label>
                <button type="button" className="btn btn-link btn-sm p-0 fw-600 text-decoration-none" onClick={addGrp}>+ Add option group</button>
              </div>
              {mods.length === 0 && <div className="fz-font-sm neutral-400 mb-1">None — e.g. a “Size” group with Regular / Large (+$3), or “Add-ons”.</div>}
              {mods.map((g, gi) => (
                <div key={gi} className="border-100 rounded-3 p-2 mb-2">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <input className="form-control form-control-sm rounded-3" placeholder="Group name (e.g. Size)" value={g.name} onChange={(e) => setGrp(gi, { name: e.target.value })} />
                    <label className="fz-font-sm neutral-600 text-nowrap mb-0"><input type="checkbox" checked={g.required} onChange={(e) => setGrp(gi, { required: e.target.checked })} className="me-1" />Required</label>
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => delGrp(gi)}>Remove</button>
                  </div>
                  {g.options.map((o, oi) => (
                    <div key={oi} className="d-flex align-items-center gap-2 mb-1">
                      <input className="form-control form-control-sm rounded-3" placeholder="Option (e.g. Large)" value={o.label} onChange={(e) => setOpt(gi, oi, { label: e.target.value })} />
                      <div className="input-group input-group-sm" style={{ width: 120 }}>
                        <span className="input-group-text">+$</span>
                        <input className="form-control" placeholder="0.00" value={o.price} onChange={(e) => setOpt(gi, oi, { price: e.target.value })} />
                      </div>
                      <button type="button" className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none" onClick={() => delOpt(gi, oi)} aria-label="Remove option">✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => addOpt(gi)}>+ Add option</button>
                </div>
              ))}
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button type="button" className="btn btn-dark btn-sm rounded-pill px-4" onClick={save} disabled={busy || uploading}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
