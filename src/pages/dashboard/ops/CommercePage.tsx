import { Fragment, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import VariantMatrix from "./VariantMatrix";
import ProductEditor from "./ProductEditor";
import OrderDrawer from "./OrderDrawer";
import { Card, Chip, Empty, stageTone } from "@/components/dash/Ui";
import {
  listProducts,
  createProduct,
  updateProduct,
  uploadProductImage,
  listOrders,
  createOrder,
  type Order,
  type ProductStatus,
} from "@/lib/db/ops/commerce";
import { listVariants, decrementVariantStock, type Variant } from "@/lib/db/ops/variants";
import { invokeAction, drainEmbeddings } from "@/lib/db/ops/ai";
import { formatPrice } from "@/lib/db/marketplace";
import { toastError, reportMutation } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";

/** Strict money parse: cents, or null when the text isn't a valid amount. Empty = 0. */
const parseCents = (s: string): number | null => {
  const t = s.trim();
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

type ProductCopy = { description: string; bullets: string[]; seo_title: string; seo_description: string };
type RestockResult = { items: { product: string; suggested_restock: number; rationale: string }[]; note: string };
type RecommendResult = { recommendations: { title: string; products: string[]; rationale: string }[] };

/** Chip tone per order status — stageTone covers everything but the partial case. */
const orderTone = (status: Order["status"]) =>
  status === "partially_refunded" ? "warn" : stageTone(status);

/** Sentence-case labels, matching the Inbox's filter chips. */
const ORDER_STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

const ORDER_FILTERS: { v: "all" | Order["status"]; label: string }[] = [
  { v: "all", label: "All" },
  ...(Object.keys(ORDER_STATUS_LABEL) as Order["status"][]).map((v) => ({ v, label: ORDER_STATUS_LABEL[v] })),
];

const ORDERS_PAGE = 50;

const CSS = `
.cmx-sec{font-size:18px;font-weight:600;letter-spacing:-0.02em;margin:0 0 12px}
.cmx-summary{cursor:pointer;font-size:18px;font-weight:600;letter-spacing:-0.02em}
.cmx-sm{font-size:13px}
.cmx-md{font-size:14px}
.cmx-muted{color:var(--hrx-muted)}
.cmx-strong{font-weight:600}
.cmx-wide{width:100%;justify-content:center}
.cmx-thumb{width:44px;height:44px;border-radius:10px;background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);overflow:hidden;flex-shrink:0}
.cmx-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.cmx-imgbtn{width:56px;height:56px;border-radius:12px;border:1px dashed var(--hrx-border);background:var(--hrx-soft);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;color:var(--hrx-muted);font-size:20px;padding:0}
.cmx-imgbtn:disabled{cursor:default;opacity:.7}
.cmx-imgbtn img{width:100%;height:100%;object-fit:cover;display:block}
.cmx-linkbtn{background:none;border:0;padding:0;font-size:13px;font-weight:600;color:var(--hrx-blue);cursor:pointer;white-space:nowrap}
.cmx-linkbtn:hover{color:var(--hrx-blue-deep);text-decoration:underline}
.cmx-linkbtn.muted{color:var(--hrx-muted);font-weight:500}
.cmx-soft{background:var(--hrx-soft);border:1px solid var(--hrx-border-soft);border-radius:12px}
.cmx-subh{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--hrx-muted);margin:0 0 4px}
.cmx-row-toggle{cursor:pointer}
.hrx-table td.cmx-nested{padding:10px 14px;background:var(--hrx-soft)}
.cmx-chevbtn{width:32px;height:32px;border-radius:999px;border:0;background:rgba(39,39,39,.06);color:var(--hrx-ink);display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1;flex-shrink:0}
.cmx-chevbtn:hover{background:rgba(39,39,39,.14)}
.cmx-chevbtn span{transition:transform .15s ease;display:inline-block}
.cmx-chevbtn[aria-expanded="true"] span{transform:rotate(90deg)}
.cmx-check{font-size:14px;color:var(--hrx-ink);margin-bottom:0}
`;

/** Orders are a headline surface for sell-a-thing verticals and a rarely-used
 *  add-on for reservation ones — same capability, different prominence. */
function OrdersFrame({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (show) {
    return (
      <>
        <h2 className="cmx-sec">Orders</h2>
        {children}
      </>
    );
  }
  return (
    <details>
      <summary className="cmx-summary ops-tap">Manual orders</summary>
      <div className="cmx-sm cmx-muted mt-1 mb-3">Most money arrives through reservations — use this for one-off add-on sales.</div>
      {children}
    </details>
  );
}

export default function CommercePage() {
  const { orgId, org, console: cfg } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "GBP";
  // Reservation verticals (fleet, stays, experiences) take money through
  // reservations, not orders — so the Orders panel is demoted to a collapsed
  // "Manual orders" block there instead of owning half the tab. A restaurant
  // keeps it: takeaway/delivery orders are a real, daily surface.
  const showOrders = cfg.booking === "none" || cfg.commerceLabel === "Menu";
  const [variantsFor, setVariantsFor] = useState<string | null>(null);

  const { data: products = [], loading: productsLoading, error: productsError, reload: reloadProducts } = useCachedData(
    `ops:commerce:${orgId}:products`,
    async () => {
      const { data, error } = await listProducts(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  const [orderLimit, setOrderLimit] = useState(ORDERS_PAGE);
  const { data: orderPage, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useCachedData(
    `ops:commerce:${orgId}:orders:${orderLimit}`,
    async () => {
      const { data, hasMore, error } = await listOrders(orgId, orderLimit);
      if (error) throw new Error(error);
      return { orders: data, hasMore };
    },
    { ttl: DASHBOARD_TTL },
  );
  const orders = orderPage?.orders ?? [];
  const reloadAll = () => {
    reloadProducts();
    reloadOrders();
  };

  // Catalog filters
  const [pSearch, setPSearch] = useState("");
  const [pStatus, setPStatus] = useState<"all" | ProductStatus>("all");
  const visibleProducts = products.filter((p) => {
    if (pStatus !== "all" && p.status !== pStatus) return false;
    const q = pSearch.trim().toLowerCase();
    if (!q) return true;
    const cat = typeof p.metadata?.category === "string" ? p.metadata.category : "";
    return `${p.name} ${p.sku} ${cat}`.toLowerCase().includes(q);
  });

  // Order filters
  const [oStatusFilter, setOStatusFilter] = useState<"all" | Order["status"]>("all");
  const [oSearch, setOSearch] = useState("");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const visibleOrders = orders.filter((o) => {
    if (oStatusFilter !== "all" && o.status !== oStatusFilter) return false;
    const q = oSearch.trim().toLowerCase();
    if (!q) return true;
    return `${o.customer_name} ${o.customer_email}`.toLowerCase().includes(q);
  });

  // New product form
  const [pForm, setPForm] = useState({ name: "", price: "", stock: "", category: "" });
  const [pImg, setPImg] = useState("");
  const [pUploading, setPUploading] = useState(false);
  const pImgRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Manual order form
  const [oForm, setOForm] = useState({ customer: "", email: "", productId: "", qty: "1", size: "", color: "", paid: false });
  const [orderVariants, setOrderVariants] = useState<Variant[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  // AI tools
  const [copyForm, setCopyForm] = useState({ name: "", hints: "", price: "" });
  const [copy, setCopy] = useState<ProductCopy | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [restock, setRestock] = useState<RestockResult | null>(null);
  const [recommend, setRecommend] = useState<RecommendResult | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  // Load the chosen product's variants so manual orders can hit the exact size/colour.
  useEffect(() => {
    let alive = true;
    setOrderVariants([]);
    setOForm((f) => ({ ...f, size: "", color: "" }));
    if (!oForm.productId || cfg.booking !== "none") return;
    listVariants(oForm.productId).then(({ data }) => {
      if (alive) setOrderVariants(data);
    });
    return () => {
      alive = false;
    };
  }, [oForm.productId, cfg.booking]);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!pForm.name.trim()) return;
    const priceCents = parseCents(pForm.price);
    if (priceCents === null) {
      toastError("Price must be a valid number (e.g. 24.99).");
      return;
    }
    const stockT = pForm.stock.trim();
    const stockN = stockT === "" ? 0 : Number(stockT);
    if (!Number.isFinite(stockN) || !Number.isInteger(stockN) || stockN < 0) {
      toastError("Stock must be a whole number, 0 or more.");
      return;
    }
    const ok = await reportMutation(
      createProduct(orgId, {
        name: pForm.name,
        price_cents: priceCents,
        stock: stockN,
        image_url: pImg || null,
        metadata: pForm.category.trim() ? { category: pForm.category.trim() } : {},
      }),
      `${cfg.itemNoun} added`,
    );
    if (ok) {
      setPForm({ name: "", price: "", stock: "", category: "" });
      setPImg("");
      drainEmbeddings(); // index for recommendations & helpdesk RAG
      reloadProducts();
    }
  }

  async function onAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPUploading(true);
    const { url, error } = await uploadProductImage(orgId, file);
    setPUploading(false);
    if (error) toastError(error);
    else if (url) setPImg(url);
  }

  async function genCopy() {
    if (!copyForm.name.trim()) {
      toastError(`Name the ${cfg.itemNoun.toLowerCase()} first — the AI writes copy from it.`);
      return;
    }
    setCopyLoading(true);
    const { data, error } = await invokeAction<ProductCopy>(orgId, "product_copy", { name: copyForm.name, hints: copyForm.hints });
    setCopyLoading(false);
    if (error) toastError(error);
    else setCopy(data);
  }

  async function createFromCopy() {
    if (!copyForm.name.trim()) {
      toastError(`Name the ${cfg.itemNoun.toLowerCase()} first — the AI writes copy from it.`);
      return;
    }
    if (!copy) {
      toastError("Generate the copy first, then create from it.");
      return;
    }
    const priceCents = parseCents(copyForm.price);
    if (priceCents === null) {
      toastError("Price must be a valid number (e.g. 24.99).");
      return;
    }
    const ok = await reportMutation(
      createProduct(orgId, {
        name: copyForm.name,
        description: copy.description,
        price_cents: priceCents,
        metadata: { seo: { title: copy.seo_title, description: copy.seo_description } },
      }),
      `${cfg.itemNoun} created with AI copy`,
    );
    if (ok) {
      setCopyForm({ name: "", hints: "", price: "" });
      setCopy(null);
      drainEmbeddings();
      reloadProducts();
    }
  }

  async function runRestock() {
    setAiBusy("restock");
    const { data, error } = await invokeAction<RestockResult>(orgId, "restock_forecast");
    setAiBusy(null);
    if (error) toastError(error);
    else setRestock(data);
  }

  async function runRecommend() {
    setAiBusy("recommend");
    const { data, error } = await invokeAction<RecommendResult>(orgId, "recommend");
    setAiBusy(null);
    if (error) toastError(error);
    else setRecommend(data);
  }

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!oForm.customer.trim() || !oForm.productId) return;
    const product = products.find((p) => p.id === oForm.productId);
    if (!product) return;
    const qtyN = Number(oForm.qty.trim() || "1");
    if (!Number.isFinite(qtyN) || !Number.isInteger(qtyN) || qtyN < 1) {
      toastError("Quantity must be a whole number, 1 or more.");
      return;
    }
    setPlacingOrder(true);
    const variantSuffix = oForm.size || oForm.color
      ? ` — ${[oForm.size, oForm.color].filter(Boolean).join(" / ")}`
      : "";
    const ok = await reportMutation(
      createOrder(orgId, {
        customer_name: oForm.customer,
        customer_email: oForm.email,
        status: oForm.paid ? "paid" : "pending",
        currency: product.currency || orgCurrency,
        items: [{ name: `${product.name}${variantSuffix}`, quantity: qtyN, unit_price_cents: product.price_cents, product_id: product.id }],
      }),
      "Order created",
    );
    if (ok) {
      // Honest stock: await the decrement and surface any failure instead of
      // silently drifting out of sync with reality.
      const { error: stockErr } = await updateProduct(product.id, { stock: Math.max(0, product.stock - qtyN) });
      if (stockErr) toastError(`Order saved but stock didn't update: ${stockErr}`);
      if (oForm.size && oForm.color) {
        const { error: vErr } = await decrementVariantStock(product.id, oForm.size, oForm.color, qtyN);
        if (vErr) toastError(`Order saved but variant stock didn't update: ${vErr}`);
      }
      setOForm({ customer: "", email: "", productId: "", qty: "1", size: "", color: "", paid: false });
      reloadAll();
    }
    setPlacingOrder(false);
  }

  if (productsLoading && ordersLoading && products.length === 0 && orders.length === 0) {
    return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }}>Loading…</div>;
  }

  const variantSizes = [...new Set(orderVariants.map((v) => v.size))];
  const variantColors = [...new Set(orderVariants.map((v) => v.color))];

  return (
    <div className="row g-4">
      <style>{CSS}</style>
      {(productsError || ordersError) && (
        <div className="col-12"><div className="alert alert-warning py-2 px-3 cmx-md mb-0" role="alert">{productsError || ordersError}</div></div>
      )}

      {/* Products */}
      <div className={showOrders ? "col-lg-6" : "col-12"}>
        <h2 className="cmx-sec">{cfg.commerceLabel}</h2>
        <Card title={`Add ${cfg.itemNoun.toLowerCase()}`} className="mb-3">
          <form onSubmit={addProduct}>
            <div className="row g-2 align-items-center">
              <div className="col-auto">
                {/* A real button — the previous <label>-wrapped file input could not be
                    reached or triggered from the keyboard. */}
                <button
                  type="button"
                  className="cmx-imgbtn"
                  onClick={() => pImgRef.current?.click()}
                  disabled={pUploading}
                  aria-label={pImg ? `Replace ${cfg.itemNoun} image` : `Add ${cfg.itemNoun} image`}
                >
                  {pImg ? <img src={pImg} alt="" /> : <span aria-hidden="true">{pUploading ? "…" : "+"}</span>}
                </button>
                <input ref={pImgRef} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={onAddImage} disabled={pUploading} />
              </div>
              {/* Six controls on one line clipped every placeholder inside this
                  half-width column — give them room instead. */}
              <div className="col"><input className="form-control" placeholder={`${cfg.itemNoun} name`} aria-label={`${cfg.itemNoun} name`} value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} required /></div>
              <div className="col-12"><input className="form-control" placeholder="Category / section" aria-label="Category / section" value={pForm.category} onChange={(e) => setPForm({ ...pForm, category: e.target.value })} /></div>
              <div className="col-6"><input type="number" inputMode="decimal" min={0} step={0.01} className="form-control" placeholder={`Price (${orgCurrency})`} aria-label={`Price (${orgCurrency})`} value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} /></div>
              <div className="col-6"><input type="number" min={0} step={1} className="form-control" placeholder="Stock" aria-label="Stock" value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} /></div>
              <div className="col-12"><button type="submit" className="hrx-pill primary cmx-wide" disabled={pUploading}>Add {cfg.itemNoun.toLowerCase()}</button></div>
            </div>
          </form>
        </Card>

        <div className="d-flex gap-2 mb-3">
          <input
            type="search"
            className="form-control"
            placeholder={`Search ${cfg.commerceLabel.toLowerCase()}…`}
            aria-label={`Search ${cfg.commerceLabel.toLowerCase()}`}
            value={pSearch}
            onChange={(e) => setPSearch(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth: 140 }} aria-label="Filter by status" value={pStatus} onChange={(e) => setPStatus(e.target.value as "all" | ProductStatus)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {visibleProducts.length === 0 ? (
          <Empty title={products.length === 0 ? `No ${cfg.itemNoun.toLowerCase()}s yet` : "Nothing matches that filter"}>
            {products.length === 0 ? `Add your first ${cfg.itemNoun.toLowerCase()} with the form above.` : "Try a different search or status."}
          </Empty>
        ) : (
          <div className="hrx-card">
            <div className="hrx-tablewrap">
              <table className="hrx-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>{cfg.itemNoun}</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => (
                    <Fragment key={p.id}>
                      <tr>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="cmx-thumb">
                              {p.image_url && <img src={p.image_url} alt="" />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="cmx-strong d-flex align-items-center gap-2">
                                {p.name}
                                {p.status !== "active" && <Chip tone="line">{p.status}</Chip>}
                              </div>
                              {typeof p.metadata?.category === "string" && p.metadata.category && (
                                <div className="cmx-sm cmx-muted">{p.metadata.category}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-nowrap">{formatPrice(p.price_cents, p.currency || orgCurrency)}</td>
                        <td>
                          <Chip tone={p.stock === 0 ? "danger" : p.stock <= 5 ? "warn" : "line"}>
                            {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                          </Chip>
                        </td>
                        <td className="text-end">
                          <div className="d-flex align-items-center justify-content-end flex-wrap gap-3">
                            {cfg.booking === "none" && (
                              <button type="button" className="cmx-linkbtn muted ops-tap" onClick={() => setVariantsFor(variantsFor === p.id ? null : p.id)} aria-expanded={variantsFor === p.id} aria-label={`${variantsFor === p.id ? "Hide" : "Show"} variants for ${p.name}`}>
                                {variantsFor === p.id ? "Hide variants" : "Variants"}
                              </button>
                            )}
                            <button type="button" className="cmx-linkbtn ops-tap" onClick={() => setEditingId(editingId === p.id ? null : p.id)} aria-expanded={editingId === p.id} aria-label={`${editingId === p.id ? "Close editor for" : "Edit"} ${p.name}`}>
                              {editingId === p.id ? "Close" : "Edit"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === p.id && (
                        <tr>
                          <td colSpan={4} className="cmx-nested">
                            <ProductEditor orgId={orgId} product={p} itemNoun={cfg.itemNoun} onSaved={() => { setEditingId(null); drainEmbeddings(); reloadProducts(); }} onCancel={() => setEditingId(null)} />
                          </td>
                        </tr>
                      )}
                      {variantsFor === p.id && (
                        <tr>
                          <td colSpan={4} className="cmx-nested">
                            <VariantMatrix orgId={orgId} productId={p.id} basePriceCents={p.price_cents} currency={p.currency || orgCurrency} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className={showOrders ? "col-lg-6" : "col-12"}>
        <OrdersFrame show={showOrders}>
        <Card title="New order" className="mb-3">
          <form onSubmit={addOrder}>
            <div className="row g-2">
              <div className="col-md-6"><input className="form-control" placeholder="Customer name" aria-label="Customer name" value={oForm.customer} onChange={(e) => setOForm({ ...oForm, customer: e.target.value })} required /></div>
              <div className="col-md-6"><input type="email" className="form-control" placeholder="Customer email (optional)" aria-label="Customer email" value={oForm.email} onChange={(e) => setOForm({ ...oForm, email: e.target.value })} /></div>
              <div className="col-12">
                <select className="form-select" aria-label={cfg.itemNoun} value={oForm.productId} onChange={(e) => setOForm({ ...oForm, productId: e.target.value })} required>
                  <option value="">Choose {cfg.itemNoun.toLowerCase()}…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatPrice(p.price_cents, p.currency || orgCurrency)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Size / colour belong with the item they qualify, above the quantity. */}
              {orderVariants.length > 0 && (
                <>
                  <div className="col-6">
                    <select className="form-select" aria-label="Size" value={oForm.size} onChange={(e) => setOForm({ ...oForm, size: e.target.value })}>
                      <option value="">Size…</option>
                      {variantSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <select className="form-select" aria-label="Color" value={oForm.color} onChange={(e) => setOForm({ ...oForm, color: e.target.value })}>
                      <option value="">Color…</option>
                      {variantColors.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="col-4"><input type="number" min={1} step={1} className="form-control" placeholder="Qty" aria-label="Quantity" value={oForm.qty} onChange={(e) => setOForm({ ...oForm, qty: e.target.value })} /></div>
              <div className="col-8 d-flex align-items-center">
                <label className="cmx-check ops-tap">
                  <input type="checkbox" className="me-1" checked={oForm.paid} onChange={(e) => setOForm({ ...oForm, paid: e.target.checked })} />
                  Payment collected
                </label>
              </div>
              <div className="col-12">
                <button type="submit" className="hrx-pill dark cmx-wide" disabled={placingOrder}>{placingOrder ? "Adding…" : "Add order"}</button>
                <div className="cmx-sm cmx-muted mt-1">
                  {oForm.paid ? "This order will be saved as paid." : <>Leave “Payment collected” unticked and the order is saved as <span className="cmx-strong">pending</span>.</>}
                </div>
              </div>
            </div>
          </form>
        </Card>

        <div className="hrx-tabbar mb-2" role="group" aria-label="Filter orders by status">
          {ORDER_FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              className={`hrx-tab${oStatusFilter === f.v ? " active" : ""}`}
              onClick={() => setOStatusFilter(f.v)}
              aria-pressed={oStatusFilter === f.v}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="form-control mb-3"
          placeholder="Search by customer name or email…"
          aria-label="Search orders by customer"
          value={oSearch}
          onChange={(e) => setOSearch(e.target.value)}
        />

        {visibleOrders.length === 0 ? (
          <Empty title={orders.length === 0 ? "No orders yet" : "No orders match that filter"}>
            {orders.length === 0 ? "Orders from your storefront and manual orders show up here." : "Try a different status or search."}
          </Empty>
        ) : (
          <>
            <div className="hrx-card">
              <div className="hrx-tablewrap">
                <table className="hrx-table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-end">Total</th>
                      <th aria-label="Details" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((o) => {
                      const open = openOrderId === o.id;
                      return (
                        <Fragment key={o.id}>
                          <tr className="cmx-row-toggle" onClick={() => setOpenOrderId(open ? null : o.id)}>
                            <td>
                              <span className="cmx-strong">{o.customer_name || "Customer"}</span>
                            </td>
                            <td className="cmx-muted text-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                              <span className="d-inline-flex align-items-center gap-1">
                                {(o.status === "paid" || o.status === "pending") && o.fulfillment_status === "unfulfilled" && (
                                  <Chip tone="line">Unfulfilled</Chip>
                                )}
                                <Chip tone={orderTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Chip>
                              </span>
                            </td>
                            <td className="text-end cmx-strong text-nowrap">{formatPrice(o.total_cents, o.currency || orgCurrency)}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="cmx-chevbtn"
                                onClick={(e) => { e.stopPropagation(); setOpenOrderId(open ? null : o.id); }}
                                aria-expanded={open}
                                aria-controls={`order-detail-${o.id}`}
                                aria-label={`${open ? "Hide" : "View"} order details for ${o.customer_name || "customer"}`}
                              >
                                <span aria-hidden="true">›</span>
                              </button>
                            </td>
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={5} className="cmx-nested">
                                <OrderDrawer
                                  orgId={orgId}
                                  orgName={org.name}
                                  orgCurrency={orgCurrency}
                                  order={o}
                                  onChanged={reloadAll}
                                  onClose={() => setOpenOrderId(null)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {orderPage?.hasMore && (
              <button type="button" className="hrx-pill cmx-wide mt-2" onClick={() => setOrderLimit((l) => l + ORDERS_PAGE)} disabled={ordersLoading}>
                {ordersLoading ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
        </OrdersFrame>
      </div>

      {/* AI tools — below the operational surfaces on purpose */}
      <div className="col-12">
        <Card
          title={<><span aria-hidden="true">✨ </span>AI merchandising</>}
          right={
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="hrx-pill" onClick={runRestock} disabled={aiBusy === "restock"}>{aiBusy === "restock" ? "…" : "Restock suggestions"}</button>
              <button type="button" className="hrx-pill" onClick={runRecommend} disabled={aiBusy === "recommend"}>{aiBusy === "recommend" ? "…" : "Recommendations"}</button>
            </div>
          }
        >
          <div className="row g-2 align-items-end">
            <div className="col-md-4"><input className="form-control" placeholder={`${cfg.itemNoun} name`} aria-label={`${cfg.itemNoun} name`} value={copyForm.name} onChange={(e) => setCopyForm({ ...copyForm, name: e.target.value })} /></div>
            <div className="col-md-4"><input className="form-control" placeholder="Hints (features, audience)" aria-label="Hints" value={copyForm.hints} onChange={(e) => setCopyForm({ ...copyForm, hints: e.target.value })} /></div>
            <div className="col-md-2"><input type="number" inputMode="decimal" min={0} step={0.01} className="form-control" placeholder={`Price (${orgCurrency})`} aria-label={`Price (${orgCurrency})`} value={copyForm.price} onChange={(e) => setCopyForm({ ...copyForm, price: e.target.value })} /></div>
            <div className="col-md-2"><button type="button" className="hrx-pill dark cmx-wide" onClick={genCopy} disabled={copyLoading}>{copyLoading ? "…" : "Generate copy"}</button></div>
          </div>

          {copy && (
            <div className="mt-3 p-3 cmx-soft">
              <p className="cmx-md mb-2">{copy.description}</p>
              {copy.bullets?.length > 0 && (
                <ul className="cmx-sm cmx-muted mb-2">
                  {copy.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
              <div className="cmx-sm cmx-muted mb-2">SEO: {copy.seo_title} — {copy.seo_description}</div>
              <button type="button" className="hrx-pill primary" onClick={createFromCopy}>Create {cfg.itemNoun.toLowerCase()} with this copy</button>
            </div>
          )}

          {restock && (
            <div className="mt-3">
              <h3 className="cmx-subh">Restock</h3>
              <div className="cmx-sm cmx-muted mb-2">{restock.note}</div>
              <ul className="cmx-md mb-0">
                {restock.items?.map((it, i) => <li key={i}><span className="cmx-strong">{it.product}</span> · +{it.suggested_restock} — {it.rationale}</li>)}
              </ul>
            </div>
          )}

          {recommend && (
            <div className="mt-3">
              <h3 className="cmx-subh">Recommended bundles</h3>
              <ul className="cmx-md mb-0">
                {recommend.recommendations?.map((r, i) => <li key={i}><span className="cmx-strong">{r.title}</span> ({r.products?.join(", ")}) — {r.rationale}</li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
