import { Fragment, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import VariantMatrix from "./VariantMatrix";
import ProductEditor from "./ProductEditor";
import {
  listProducts,
  createProduct,
  updateProduct,
  uploadProductImage,
  listOrders,
  createOrder,
  setOrderStatus,
  fulfillOrder,
  type Product,
  type Order,
} from "@/lib/db/ops/commerce";
import { invokeAction, drainEmbeddings } from "@/lib/db/ops/ai";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

const toCents = (s: string) => Math.round((parseFloat(s) || 0) * 100);

type ProductCopy = { description: string; bullets: string[]; seo_title: string; seo_description: string };
type RestockResult = { items: { product: string; suggested_restock: number; rationale: string }[]; note: string };
type RecommendResult = { recommendations: { title: string; products: string[]; rationale: string }[] };

const ORDER_STATUS_STYLE: Record<Order["status"], string> = {
  pending: "bg-neutral-100 neutral-700",
  paid: "bg-success-subtle text-success",
  fulfilled: "bg-success-subtle text-success",
  cancelled: "bg-neutral-100 neutral-500",
  refunded: "bg-warning-subtle text-warning",
};

export default function CommercePage() {
  const { orgId, console: cfg } = useOutletContext<OpsContext>();
  const [variantsFor, setVariantsFor] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pForm, setPForm] = useState({ name: "", price: "", stock: "", category: "" });
  const [pImg, setPImg] = useState("");
  const [pUploading, setPUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oForm, setOForm] = useState({ customer: "", productId: "", qty: "1" });

  // AI tools
  const [copyForm, setCopyForm] = useState({ name: "", hints: "", price: "" });
  const [copy, setCopy] = useState<ProductCopy | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [restock, setRestock] = useState<RestockResult | null>(null);
  const [recommend, setRecommend] = useState<RecommendResult | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  async function load() {
    const [p, o] = await Promise.all([listProducts(orgId), listOrders(orgId)]);
    if (p.error) setError(p.error);
    setProducts(p.data);
    setOrders(o.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!pForm.name.trim()) return;
    const { error } = await createProduct(orgId, {
      name: pForm.name,
      price_cents: toCents(pForm.price),
      stock: parseInt(pForm.stock) || 0,
      image_url: pImg || null,
      metadata: pForm.category.trim() ? { category: pForm.category.trim() } : {},
    });
    if (error) setError(error);
    else {
      setPForm({ name: "", price: "", stock: "", category: "" });
      setPImg("");
      drainEmbeddings(); // index for recommendations & helpdesk RAG
      load();
    }
  }

  async function onAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPUploading(true);
    setError(null);
    const { url, error } = await uploadProductImage(orgId, file);
    setPUploading(false);
    if (error) setError(error);
    else if (url) setPImg(url);
  }

  async function genCopy() {
    if (!copyForm.name.trim()) return;
    setCopyLoading(true);
    setError(null);
    const { data, error } = await invokeAction<ProductCopy>(orgId, "product_copy", { name: copyForm.name, hints: copyForm.hints });
    setCopyLoading(false);
    if (error) setError(error);
    else setCopy(data);
  }

  async function createFromCopy() {
    if (!copyForm.name.trim() || !copy) return;
    const { error } = await createProduct(orgId, { name: copyForm.name, description: copy.description, price_cents: toCents(copyForm.price) });
    if (error) setError(error);
    else {
      setCopyForm({ name: "", hints: "", price: "" });
      setCopy(null);
      drainEmbeddings();
      load();
    }
  }

  async function runRestock() {
    setAiBusy("restock");
    setError(null);
    const { data, error } = await invokeAction<RestockResult>(orgId, "restock_forecast");
    setAiBusy(null);
    if (error) setError(error);
    else setRestock(data);
  }

  async function runRecommend() {
    setAiBusy("recommend");
    setError(null);
    const { data, error } = await invokeAction<RecommendResult>(orgId, "recommend");
    setAiBusy(null);
    if (error) setError(error);
    else setRecommend(data);
  }

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!oForm.customer.trim() || !oForm.productId) return;
    const product = products.find((p) => p.id === oForm.productId);
    if (!product) return;
    const qty = parseInt(oForm.qty) || 1;
    const { error } = await createOrder(orgId, {
      customer_name: oForm.customer,
      status: "paid",
      items: [{ name: product.name, quantity: qty, unit_price_cents: product.price_cents, product_id: product.id }],
    });
    if (error) setError(error);
    else {
      setOForm({ customer: "", productId: "", qty: "1" });
      // Decrement stock locally + persist
      updateProduct(product.id, { stock: Math.max(0, product.stock - qty) });
      load();
    }
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      {/* AI tools */}
      <div className="col-12">
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h6 className="fw-600 mb-0">✨ AI merchandising</h6>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runRestock} disabled={aiBusy === "restock"}>{aiBusy === "restock" ? "…" : "Restock suggestions"}</button>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runRecommend} disabled={aiBusy === "recommend"}>{aiBusy === "recommend" ? "…" : "Recommendations"}</button>
            </div>
          </div>

          <div className="row g-2 align-items-end">
            <div className="col-md-4"><input className="form-control rounded-3" placeholder={`${cfg.itemNoun} name`} value={copyForm.name} onChange={(e) => setCopyForm({ ...copyForm, name: e.target.value })} /></div>
            <div className="col-md-4"><input className="form-control rounded-3" placeholder="Hints (features, audience)" value={copyForm.hints} onChange={(e) => setCopyForm({ ...copyForm, hints: e.target.value })} /></div>
            <div className="col-md-2"><input className="form-control rounded-3" placeholder="Price" value={copyForm.price} onChange={(e) => setCopyForm({ ...copyForm, price: e.target.value })} /></div>
            <div className="col-md-2"><button type="button" className="btn btn-dark w-100 rounded-3" onClick={genCopy} disabled={copyLoading}>{copyLoading ? "…" : "Generate copy"}</button></div>
          </div>

          {copy && (
            <div className="mt-3 p-3 bg-neutral-50 rounded-3">
              <p className="fz-font-md neutral-900 mb-2">{copy.description}</p>
              {copy.bullets?.length > 0 && (
                <ul className="fz-font-sm neutral-700 mb-2">
                  {copy.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
              <div className="fz-font-sm neutral-500 mb-2">SEO: {copy.seo_title} — {copy.seo_description}</div>
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={createFromCopy}>Create product with this copy</button>
            </div>
          )}

          {restock && (
            <div className="mt-3">
              <div className="fz-font-sm fw-600 neutral-500 mb-1">Restock</div>
              <div className="fz-font-sm neutral-500 mb-2">{restock.note}</div>
              <ul className="fz-font-md neutral-700 mb-0">
                {restock.items?.map((it, i) => <li key={i}><span className="fw-600">{it.product}</span> · +{it.suggested_restock} — {it.rationale}</li>)}
              </ul>
            </div>
          )}

          {recommend && (
            <div className="mt-3">
              <div className="fz-font-sm fw-600 neutral-500 mb-1">Recommended bundles</div>
              <ul className="fz-font-md neutral-700 mb-0">
                {recommend.recommendations?.map((r, i) => <li key={i}><span className="fw-600">{r.title}</span> ({r.products?.join(", ")}) — {r.rationale}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="col-lg-6">
        <h5 className="fw-600 mb-3">{cfg.commerceLabel}</h5>
        <form onSubmit={addProduct} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-auto">
              <label className="rounded-3 border-100 bg-neutral-50 d-flex align-items-center justify-content-center overflow-hidden mb-0" style={{ width: 56, height: 56, cursor: "pointer" }} title="Add image">
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="neutral-400" style={{ fontSize: 20 }}>{pUploading ? "…" : "+"}</span>}
                <input type="file" accept="image/*" hidden onChange={onAddImage} disabled={pUploading} />
              </label>
            </div>
            <div className="col"><input className="form-control rounded-3" placeholder={`${cfg.itemNoun} name`} value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} required /></div>
            <div className="col-12 col-md"><input className="form-control rounded-3" placeholder="Category / section" value={pForm.category} onChange={(e) => setPForm({ ...pForm, category: e.target.value })} /></div>
            <div className="col-6 col-md-2"><input className="form-control rounded-3" placeholder="Price" value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} /></div>
            <div className="col-6 col-md-2"><input className="form-control rounded-3" placeholder="Stock" value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} /></div>
            <div className="col-12 col-md-auto"><button type="submit" className="btn btn-dark w-100 rounded-3 px-3" disabled={pUploading}>Add</button></div>
          </div>
        </form>
        {products.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No products yet.</div>
        ) : (
          <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden">
            <table className="table mb-0 align-middle">
              <tbody>
                {products.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="py-3 ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-3 border-100 bg-neutral-50 overflow-hidden flex-shrink-0" style={{ width: 44, height: 44 }}>
                            {p.image_url && <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          </div>
                          <div>
                            <div className="fw-600">{p.name}</div>
                            <div className="fz-font-sm neutral-500">
                              {formatPrice(p.price_cents, p.currency)}
                              {typeof p.metadata?.category === "string" && p.metadata.category ? ` · ${p.metadata.category}` : ""}
                              {p.status !== "active" ? ` · ${p.status}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pe-4 text-end">
                        <button type="button" className="btn btn-link btn-sm p-0 me-3 fw-600 text-decoration-none" onClick={() => setEditingId(editingId === p.id ? null : p.id)}>
                          {editingId === p.id ? "Close" : "Edit"}
                        </button>
                        {cfg.booking === "none" && (
                          <button type="button" className="btn btn-link btn-sm p-0 me-3 text-decoration-none neutral-500" onClick={() => setVariantsFor(variantsFor === p.id ? null : p.id)}>
                            {variantsFor === p.id ? "Hide variants" : "Variants"}
                          </button>
                        )}
                        <span className={`badge fw-500 ${p.stock <= 5 ? "bg-warning-subtle text-warning" : "bg-neutral-100 neutral-700"}`}>{p.stock} in stock</span>
                      </td>
                    </tr>
                    {editingId === p.id && (
                      <tr>
                        <td colSpan={2} className="bg-neutral-50 p-0">
                          <ProductEditor orgId={orgId} product={p} itemNoun={cfg.itemNoun} onSaved={() => { setEditingId(null); drainEmbeddings(); load(); }} onCancel={() => setEditingId(null)} />
                        </td>
                      </tr>
                    )}
                    {variantsFor === p.id && (
                      <tr>
                        <td colSpan={2} className="bg-neutral-50 px-4">
                          <VariantMatrix orgId={orgId} productId={p.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="col-lg-6">
        <h5 className="fw-600 mb-3">Orders</h5>
        <form onSubmit={addOrder} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Customer name" value={oForm.customer} onChange={(e) => setOForm({ ...oForm, customer: e.target.value })} required /></div>
            <div className="col-7">
              <select className="form-select rounded-3" value={oForm.productId} onChange={(e) => setOForm({ ...oForm, productId: e.target.value })} required>
                <option value="">Choose product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatPrice(p.price_cents, p.currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-3"><input className="form-control rounded-3" placeholder="Qty" value={oForm.qty} onChange={(e) => setOForm({ ...oForm, qty: e.target.value })} /></div>
            <div className="col-2"><button type="submit" className="btn btn-dark w-100 rounded-3">+</button></div>
          </div>
        </form>
        {orders.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No orders yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{o.customer_name || "Customer"}</div>
                  <div className="fz-font-sm neutral-500">{formatPrice(o.total_cents, o.currency)} · {new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge fw-500 text-capitalize ${ORDER_STATUS_STYLE[o.status]}`}>{o.status}</span>
                  {o.status === "paid" && o.fulfillment_status === "unfulfilled" ? (
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={async () => { await fulfillOrder(o.id); load(); }}>
                      Fulfill
                    </button>
                  ) : o.status === "pending" ? (
                    <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={async () => { await setOrderStatus(o.id, "paid"); load(); }}>
                      Mark paid
                    </button>
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
