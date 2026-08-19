import { Fragment, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import VariantMatrix from "./VariantMatrix";
import ProductEditor from "./ProductEditor";
import OrderDrawer from "./OrderDrawer";
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

const ORDER_STATUS_STYLE: Record<Order["status"], string> = {
  pending: "bg-neutral-100 neutral-700",
  paid: "bg-success-subtle text-success",
  fulfilled: "bg-success-subtle text-success",
  cancelled: "bg-danger-subtle text-danger",
  refunded: "bg-danger-subtle text-danger",
  partially_refunded: "bg-warning-subtle text-warning",
};

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

/** Orders are a headline surface for sell-a-thing verticals and a rarely-used
 *  add-on for reservation ones — same capability, different prominence. */
function OrdersFrame({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (show) {
    return (
      <>
        <h2 className="fz-font-lg fw-600 mb-3">Orders</h2>
        {children}
      </>
    );
  }
  return (
    <details>
      <summary className="fz-font-lg fw-600 ops-tap" style={{ cursor: "pointer" }}>Manual orders</summary>
      <div className="fz-font-sm neutral-500 mt-1 mb-3">Most money arrives through reservations — use this for one-off add-on sales.</div>
      {children}
    </details>
  );
}

export default function CommercePage() {
  const { orgId, org, console: cfg } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "USD";
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
    return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  }

  const variantSizes = [...new Set(orderVariants.map((v) => v.size))];
  const variantColors = [...new Set(orderVariants.map((v) => v.color))];

  return (
    <div className="row g-4">
      {(productsError || ordersError) && (
        <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0" role="alert">{productsError || ordersError}</div></div>
      )}

      {/* Products */}
      <div className={showOrders ? "col-lg-6" : "col-12"}>
        <h2 className="fz-font-lg fw-600 mb-3">{cfg.commerceLabel}</h2>
        <form onSubmit={addProduct} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-auto">
              {/* A real button — the previous <label>-wrapped file input could not be
                  reached or triggered from the keyboard. */}
              <button
                type="button"
                className="btn p-0 rounded-3 border-100 bg-neutral-50 d-flex align-items-center justify-content-center overflow-hidden"
                style={{ width: 56, height: 56 }}
                onClick={() => pImgRef.current?.click()}
                disabled={pUploading}
                aria-label={pImg ? `Replace ${cfg.itemNoun} image` : `Add ${cfg.itemNoun} image`}
              >
                {pImg ? <img src={pImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="neutral-400 fz-20" aria-hidden="true">{pUploading ? "…" : "+"}</span>}
              </button>
              <input ref={pImgRef} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={onAddImage} disabled={pUploading} />
            </div>
            {/* Six controls on one line clipped every placeholder inside this
                half-width column — give them room instead. */}
            <div className="col"><input className="form-control rounded-3" placeholder={`${cfg.itemNoun} name`} aria-label={`${cfg.itemNoun} name`} value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} required /></div>
            <div className="col-12"><input className="form-control rounded-3" placeholder="Category / section" aria-label="Category / section" value={pForm.category} onChange={(e) => setPForm({ ...pForm, category: e.target.value })} /></div>
            <div className="col-6"><input type="number" inputMode="decimal" min={0} step={0.01} className="form-control rounded-3" placeholder={`Price (${orgCurrency})`} aria-label={`Price (${orgCurrency})`} value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} /></div>
            <div className="col-6"><input type="number" min={0} step={1} className="form-control rounded-3" placeholder="Stock" aria-label="Stock" value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} /></div>
            <div className="col-12"><button type="submit" className="btn btn-dark w-100 rounded-3 px-3" disabled={pUploading}>Add</button></div>
          </div>
        </form>

        <div className="d-flex gap-2 mb-3">
          <input
            type="search"
            className="form-control rounded-3"
            placeholder={`Search ${cfg.commerceLabel.toLowerCase()}…`}
            aria-label={`Search ${cfg.commerceLabel.toLowerCase()}`}
            value={pSearch}
            onChange={(e) => setPSearch(e.target.value)}
          />
          <select className="form-select rounded-3" style={{ maxWidth: 140 }} aria-label="Filter by status" value={pStatus} onChange={(e) => setPStatus(e.target.value as "all" | ProductStatus)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">
            {products.length === 0 ? `No ${cfg.itemNoun.toLowerCase()}s yet.` : "Nothing matches that filter."}
          </div>
        ) : (
          // No `overflow-hidden` here: Bootstrap sets it !important and would beat
          // .ops-scroll-x's overflow-x:auto, clipping the right-hand action cell.
          <div className="bg-neutral-0 rounded-4 border-100 ops-scroll-x">
            <table className="table mb-0 align-middle" style={{ minWidth: 520 }}>
              <tbody>
                {visibleProducts.map((p) => (
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
                              {formatPrice(p.price_cents, p.currency || orgCurrency)}
                              {typeof p.metadata?.category === "string" && p.metadata.category ? ` · ${p.metadata.category}` : ""}
                              {p.status !== "active" ? ` · ${p.status}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pe-4 text-end">
                        <div className="d-flex align-items-center justify-content-end flex-wrap gap-3">
                          <span className={`badge fw-500 ${p.stock === 0 ? "bg-danger-subtle text-danger" : p.stock <= 5 ? "bg-warning-subtle text-warning" : "bg-neutral-100 neutral-700"}`}>
                            {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                          </span>
                          {cfg.booking === "none" && (
                            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none neutral-500 ops-tap" onClick={() => setVariantsFor(variantsFor === p.id ? null : p.id)} aria-expanded={variantsFor === p.id} aria-label={`${variantsFor === p.id ? "Hide" : "Show"} variants for ${p.name}`}>
                              {variantsFor === p.id ? "Hide variants" : "Variants"}
                            </button>
                          )}
                          <button type="button" className="btn btn-link btn-sm p-0 fw-600 text-decoration-none ops-tap" onClick={() => setEditingId(editingId === p.id ? null : p.id)} aria-expanded={editingId === p.id} aria-label={`${editingId === p.id ? "Close editor for" : "Edit"} ${p.name}`}>
                            {editingId === p.id ? "Close" : "Edit"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === p.id && (
                      <tr>
                        <td colSpan={2} className="bg-neutral-50 p-0">
                          <ProductEditor orgId={orgId} product={p} itemNoun={cfg.itemNoun} onSaved={() => { setEditingId(null); drainEmbeddings(); reloadProducts(); }} onCancel={() => setEditingId(null)} />
                        </td>
                      </tr>
                    )}
                    {variantsFor === p.id && (
                      <tr>
                        <td colSpan={2} className="bg-neutral-50 px-4">
                          <VariantMatrix orgId={orgId} productId={p.id} basePriceCents={p.price_cents} currency={p.currency || orgCurrency} />
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
      <div className={showOrders ? "col-lg-6" : "col-12"}>
        <OrdersFrame show={showOrders}>
        <form onSubmit={addOrder} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-6"><input className="form-control rounded-3" placeholder="Customer name" aria-label="Customer name" value={oForm.customer} onChange={(e) => setOForm({ ...oForm, customer: e.target.value })} required /></div>
            <div className="col-md-6"><input type="email" className="form-control rounded-3" placeholder="Customer email (optional)" aria-label="Customer email" value={oForm.email} onChange={(e) => setOForm({ ...oForm, email: e.target.value })} /></div>
            <div className="col-12">
              <select className="form-select rounded-3" aria-label={cfg.itemNoun} value={oForm.productId} onChange={(e) => setOForm({ ...oForm, productId: e.target.value })} required>
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
                  <select className="form-select rounded-3" aria-label="Size" value={oForm.size} onChange={(e) => setOForm({ ...oForm, size: e.target.value })}>
                    <option value="">Size…</option>
                    {variantSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <select className="form-select rounded-3" aria-label="Color" value={oForm.color} onChange={(e) => setOForm({ ...oForm, color: e.target.value })}>
                    <option value="">Color…</option>
                    {variantColors.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="col-4"><input type="number" min={1} step={1} className="form-control rounded-3" placeholder="Qty" aria-label="Quantity" value={oForm.qty} onChange={(e) => setOForm({ ...oForm, qty: e.target.value })} /></div>
            <div className="col-8 d-flex align-items-center">
              <label className="fz-font-sm neutral-600 mb-0 ops-tap">
                <input type="checkbox" className="me-1" checked={oForm.paid} onChange={(e) => setOForm({ ...oForm, paid: e.target.checked })} />
                Payment collected
              </label>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-dark w-100 rounded-3" disabled={placingOrder}>{placingOrder ? "Adding…" : "Add order"}</button>
              <div className="fz-font-sm neutral-500 mt-1">
                {oForm.paid ? "This order will be saved as paid." : <>Leave “Payment collected” unticked and the order is saved as <span className="fw-600">pending</span>.</>}
              </div>
            </div>
          </div>
        </form>

        <div className="d-flex flex-wrap gap-1 mb-2" role="group" aria-label="Filter orders by status">
          {ORDER_FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              className={`btn btn-sm rounded-pill px-3 fz-font-sm ${oStatusFilter === f.v ? "btn-dark" : "btn-outline-secondary"}`}
              onClick={() => setOStatusFilter(f.v)}
              aria-pressed={oStatusFilter === f.v}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="form-control rounded-3 mb-3"
          placeholder="Search by customer name or email…"
          aria-label="Search orders by customer"
          value={oSearch}
          onChange={(e) => setOSearch(e.target.value)}
        />

        {visibleOrders.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">
            {orders.length === 0 ? "No orders yet." : "No orders match that filter."}
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {visibleOrders.map((o) => {
              const open = openOrderId === o.id;
              return (
              <Fragment key={o.id}>
                {/* Two stacked rows: name + money on top, date + status underneath —
                    so the total can never collide with the badges on a phone. */}
                <button
                  type="button"
                  className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center gap-3 w-100 text-start btn"
                  onClick={() => setOpenOrderId(open ? null : o.id)}
                  aria-expanded={open}
                  aria-controls={`order-detail-${o.id}`}
                >
                  <span className="flex-grow-1" style={{ minWidth: 0 }}>
                    <span className="d-flex align-items-baseline justify-content-between gap-2">
                      <span className="fw-600 text-truncate">{o.customer_name || "Customer"}</span>
                      <span className="fw-700 text-nowrap">{formatPrice(o.total_cents, o.currency || orgCurrency)}</span>
                    </span>
                    <span className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-1">
                      <span className="fz-font-sm neutral-500">{new Date(o.created_at).toLocaleDateString()}</span>
                      <span className="d-flex align-items-center gap-1">
                        {(o.status === "paid" || o.status === "pending") && o.fulfillment_status === "unfulfilled" && (
                          <span className="badge fw-500 bg-neutral-100 neutral-700">Unfulfilled</span>
                        )}
                        <span className={`badge fw-500 ${ORDER_STATUS_STYLE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                      </span>
                    </span>
                  </span>
                  <span
                    className="neutral-400 flex-shrink-0"
                    aria-hidden="true"
                    style={{ transition: "transform .15s ease", transform: open ? "rotate(90deg)" : "none", lineHeight: 1 }}
                  >
                    ›
                  </span>
                </button>
                {open && (
                  <OrderDrawer
                    orgId={orgId}
                    orgName={org.name}
                    orgCurrency={orgCurrency}
                    order={o}
                    onChanged={reloadAll}
                    onClose={() => setOpenOrderId(null)}
                  />
                )}
              </Fragment>
              );
            })}
            {orderPage?.hasMore && (
              <button type="button" className="btn btn-outline-dark rounded-3 w-100" onClick={() => setOrderLimit((l) => l + ORDERS_PAGE)} disabled={ordersLoading}>
                {ordersLoading ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
        </OrdersFrame>
      </div>

      {/* AI tools — below the operational surfaces on purpose */}
      <div className="col-12">
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 className="fz-font-md fw-600 mb-0"><span aria-hidden="true">✨ </span>AI merchandising</h2>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runRestock} disabled={aiBusy === "restock"}>{aiBusy === "restock" ? "…" : "Restock suggestions"}</button>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runRecommend} disabled={aiBusy === "recommend"}>{aiBusy === "recommend" ? "…" : "Recommendations"}</button>
            </div>
          </div>

          <div className="row g-2 align-items-end">
            <div className="col-md-4"><input className="form-control rounded-3" placeholder={`${cfg.itemNoun} name`} aria-label={`${cfg.itemNoun} name`} value={copyForm.name} onChange={(e) => setCopyForm({ ...copyForm, name: e.target.value })} /></div>
            <div className="col-md-4"><input className="form-control rounded-3" placeholder="Hints (features, audience)" aria-label="Hints" value={copyForm.hints} onChange={(e) => setCopyForm({ ...copyForm, hints: e.target.value })} /></div>
            <div className="col-md-2"><input type="number" inputMode="decimal" min={0} step={0.01} className="form-control rounded-3" placeholder={`Price (${orgCurrency})`} aria-label={`Price (${orgCurrency})`} value={copyForm.price} onChange={(e) => setCopyForm({ ...copyForm, price: e.target.value })} /></div>
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
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={createFromCopy}>Create {cfg.itemNoun.toLowerCase()} with this copy</button>
            </div>
          )}

          {restock && (
            <div className="mt-3">
              <h3 className="fz-font-sm fw-600 neutral-500 mb-1">Restock</h3>
              <div className="fz-font-sm neutral-500 mb-2">{restock.note}</div>
              <ul className="fz-font-md neutral-700 mb-0">
                {restock.items?.map((it, i) => <li key={i}><span className="fw-600">{it.product}</span> · +{it.suggested_restock} — {it.rationale}</li>)}
              </ul>
            </div>
          )}

          {recommend && (
            <div className="mt-3">
              <h3 className="fz-font-sm fw-600 neutral-500 mb-1">Recommended bundles</h3>
              <ul className="fz-font-md neutral-700 mb-0">
                {recommend.recommendations?.map((r, i) => <li key={i}><span className="fw-600">{r.title}</span> ({r.products?.join(", ")}) — {r.rationale}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
