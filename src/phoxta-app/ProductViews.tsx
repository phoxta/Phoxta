import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import { decideAction, listActions, listAudit, type AgentAction, type AuditEntry } from "@/lib/db/ops/operator";
import { fulfillOrder, listOrders, listProducts, setOrderStatus, type Order, type Product } from "@/lib/db/ops/commerce";
import { listInvoices, setInvoiceStatus, type Invoice } from "@/lib/db/ops/invoicing";
import { listReservations, setReservationStatus, type Reservation } from "@/lib/db/ops/reservations";
import { addKnowledge, listKnowledge, removeKnowledge, type KnowledgeDoc } from "@/lib/db/ops/knowledge";
import { listCapabilities, listDeliveryReceipts, type Capability, type DeliveryReceipt } from "@/lib/db/productWorkspace";

type Result<T> = { data: T; error: string | null };

function useData<T>(load: () => Promise<Result<T>>, dependencies: unknown[], initial: T) {
  const [data, setData] = useState(initial); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => { setLoading(true); const result = await load(); setData(result.data); setError(result.error); setLoading(false); }, dependencies);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload };
}

function Shell({ eyebrow, title, notice, children }: { eyebrow: string; title: string; notice?: string; children: React.ReactNode }) {
  return <section className="pxc-product-view"><header><div><span>{eyebrow}</span><h2>{title}</h2></div>{notice && <em>{notice}</em>}</header>{children}</section>;
}

function Empty({ loading, error, name }: { loading: boolean; error: string | null; name: string }) {
  return <p className={error ? "pxc-product-empty is-error" : "pxc-product-empty"}>{loading ? `Loading ${name}…` : error || `No ${name} yet.`}</p>;
}

function money(cents: number, currency = "GBP") { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100); }
function since(value: string) { const minutes = Math.floor((Date.now() - Date.parse(value)) / 60000); return minutes < 60 ? `${Math.max(0, minutes)}m` : `${Math.floor(minutes / 60)}h`; }

function Approvals() {
  const { business } = useWorkspace(); const actions = useData(() => listActions(business.id), [business.id], [] as AgentAction[]); const [notice, setNotice] = useState(""); const pending = actions.data.filter((item) => item.status === "pending");
  async function decide(id: string, decision: "approve" | "reject") { const result = await decideAction(id, decision); setNotice(result.error ?? `Action ${decision === "approve" ? "approved" : "rejected"}.`); if (!result.error) await actions.reload(); }
  return <Shell eyebrow="Governed actions" title="Approve important work before it leaves Phoxta." notice={notice}><div className="pxc-product-list">{pending.map((item) => <article key={item.id}><div><strong>{item.title || item.tool.replaceAll("_", " ")}</strong><small>{item.tool.replaceAll("_", " ")} · {since(item.created_at)}</small><p>{Object.keys(item.args).length ? JSON.stringify(item.args) : "No additional parameters."}</p></div><span><button onClick={() => void decide(item.id, "reject")}><X size={14} />Reject</button><button className="primary" onClick={() => void decide(item.id, "approve")}><Check size={14} />Approve</button></span></article>)}{!pending.length && <Empty loading={actions.loading} error={actions.error} name="actions awaiting approval" />}</div></Shell>;
}

function Activity() {
  const { business } = useWorkspace(); const audit = useData(() => listAudit(business.id, 100), [business.id], [] as AuditEntry[]); const deliveries = useData(() => listDeliveryReceipts(business.id), [business.id], [] as DeliveryReceipt[]);
  return <Shell eyebrow="Audit trail" title="What changed, who acted, and what happened."><div className="pxc-product-metrics"><span><b>{audit.data.length}</b>Recent actions</span><span><b>{deliveries.data.filter((item) => item.state === "sent" || item.state === "delivered").length}</b>Delivered</span><span><b>{deliveries.data.filter((item) => item.state === "failed").length}</b>Failed</span><span><b>{deliveries.data.filter((item) => item.verified_at).length}</b>Verified</span></div><div className="pxc-product-list compact">{deliveries.data.map((item) => <article key={`delivery:${item.id}`}><i className={`state is-${item.state === "delivered" || item.state === "sent" ? "ok" : item.state}`} /><div><strong>{item.summary || item.error || item.capability_key.replaceAll("_", " ")}</strong><small>{item.provider || "Phoxta"} · delivery receipt · {since(item.created_at)}</small></div><em>{item.state}</em></article>)}{audit.data.map((item) => <article key={item.id}><i className={`state is-${item.status}`} /><div><strong>{item.summary || item.tool.replaceAll("_", " ")}</strong><small>{item.actor} · {item.tool.replaceAll("_", " ")} · {since(item.created_at)}</small></div><em>{item.status}</em></article>)}{!audit.data.length && !deliveries.data.length && <Empty loading={audit.loading || deliveries.loading} error={audit.error || deliveries.error} name="audited actions" />}</div></Shell>;
}

function Commerce() {
  const { business } = useWorkspace(); const products = useData(() => listProducts(business.id), [business.id], [] as Product[]); const orders = useData(() => listOrders(business.id, 50).then((result) => ({ data: result.data, error: result.error })), [business.id], [] as Order[]); const [notice, setNotice] = useState("");
  async function advance(order: Order) { const result = order.status === "paid" && order.fulfillment_status !== "fulfilled" ? await fulfillOrder(order.id) : await setOrderStatus(order.id, order.status === "pending" ? "paid" : order.status); setNotice(result.error ?? "Order updated."); if (!result.error) await orders.reload(); }
  return <Shell eyebrow="Commerce" title="Products, orders and fulfilment in one operating view." notice={notice}><div className="pxc-product-metrics"><span><b>{products.data.length}</b>Products</span><span><b>{orders.data.length}</b>Orders</span><span><b>{orders.data.filter((item) => item.status === "paid").length}</b>Paid</span><span><b>{orders.data.filter((item) => item.fulfillment_status === "unfulfilled").length}</b>To fulfil</span></div><div className="pxc-product-list compact">{orders.data.map((item) => <article key={item.id}><div><strong>{item.customer_name || "Customer"}</strong><small>{money(item.total_cents, item.currency)} · {item.fulfillment_status}</small></div><em>{item.status}</em><button onClick={() => void advance(item)}>Update</button></article>)}{!orders.data.length && <Empty loading={orders.loading} error={orders.error || products.error} name="orders" />}</div></Shell>;
}

function Invoices() {
  const { business } = useWorkspace(); const invoices = useData(() => listInvoices(business.id), [business.id], [] as Invoice[]); const [notice, setNotice] = useState("");
  async function advance(item: Invoice) { const next = item.status === "draft" ? "sent" : item.status === "sent" ? "paid" : item.status; const result = await setInvoiceStatus(item.id, next); setNotice(result.error ?? "Invoice updated."); if (!result.error) await invoices.reload(); }
  return <Shell eyebrow="Invoicing" title="Issue invoices and follow payment status." notice={notice}><div className="pxc-product-list compact">{invoices.data.map((item) => <article key={item.id}><div><strong>{item.number} · {item.customer_name || "Customer"}</strong><small>{money(item.total_cents, item.currency)} · due {item.due_date || "not set"}</small></div><em>{item.status}</em><button onClick={() => void advance(item)}>Advance</button></article>)}{!invoices.data.length && <Empty loading={invoices.loading} error={invoices.error} name="invoices" />}</div></Shell>;
}

function Reservations() {
  const { business } = useWorkspace(); const rows = useData(() => listReservations(business.id), [business.id], [] as Reservation[]); const [notice, setNotice] = useState("");
  async function advance(item: Reservation) { const next = item.status === "pending" ? "confirmed" : item.status === "confirmed" ? "completed" : item.status; const result = await setReservationStatus(item.id, next); setNotice(result.error ?? "Reservation updated."); if (!result.error) await rows.reload(); }
  return <Shell eyebrow="Reservations" title="Capacity, guests and service status." notice={notice}><div className="pxc-product-list compact">{rows.data.map((item) => <article key={item.id}><div><strong>{item.customer_name || "Guest"} · {item.product_name}</strong><small>{new Date(item.start_date).toLocaleDateString()} · {item.units} unit{item.units === 1 ? "" : "s"}</small></div><em>{item.status}</em><button onClick={() => void advance(item)}>Advance</button></article>)}{!rows.data.length && <Empty loading={rows.loading} error={rows.error} name="reservations" />}</div></Shell>;
}

function Capabilities() {
  const { business } = useWorkspace(); const rows = useData(() => listCapabilities(business.id), [business.id], [] as Capability[]);
  return <Shell eyebrow="Capability health" title="What is live, connected or still in preview."><div className="pxc-capability-grid">{rows.data.map((item) => <article key={item.key}><span className={`is-${item.state}`} /><div><strong>{item.label}</strong><small>{item.area}{item.provider ? ` · ${item.provider}` : ""}</small><p>{item.detail}</p></div><em>{item.state.replaceAll("_", " ")}</em></article>)}{!rows.data.length && <Empty loading={rows.loading} error={rows.error} name="capabilities" />}</div></Shell>;
}

function Knowledge() {
  const { business } = useWorkspace(); const docs = useData(() => listKnowledge(business.id), [business.id], [] as KnowledgeDoc[]); const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [notice, setNotice] = useState("");
  async function add(event: React.FormEvent) { event.preventDefault(); const result = await addKnowledge(business.id, title, content); setNotice(result.error ?? "Knowledge added."); if (!result.error) { setTitle(""); setContent(""); await docs.reload(); } }
  async function remove(id: string) { const result = await removeKnowledge(id); setNotice(result.error ?? "Knowledge removed."); if (!result.error) await docs.reload(); }
  return <Shell eyebrow="Agent knowledge" title="Approved facts Phoxta may use when it works." notice={notice}><form className="pxc-product-form" onSubmit={add}><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Knowledge title" /><input required value={content} onChange={(event) => setContent(event.target.value)} placeholder="Approved guidance or fact" /><button>Add</button></form><div className="pxc-product-list compact">{docs.data.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.content.slice(0, 170)}</small></div><em>Approved</em><button onClick={() => void remove(item.id)}>Remove</button></article>)}{!docs.data.length && <Empty loading={docs.loading} error={docs.error} name="knowledge" />}</div></Shell>;
}

export const PRODUCT_ROUTES = new Set(["/app/activity", "/app/operations/approvals", "/app/operations/commerce", "/app/operations/invoicing", "/app/operations/reservations", "/app/intelligence/capabilities", "/app/intelligence/knowledge"]);

export default function ProductView({ path }: { path: string }) {
  if (path === "/app/activity") return <Activity />;
  if (path === "/app/operations/approvals") return <Approvals />;
  if (path === "/app/operations/commerce") return <Commerce />;
  if (path === "/app/operations/invoicing") return <Invoices />;
  if (path === "/app/operations/reservations") return <Reservations />;
  if (path === "/app/intelligence/capabilities") return <Capabilities />;
  if (path === "/app/intelligence/knowledge") return <Knowledge />;
  return <button className="pxc-product-empty" onClick={() => location.reload()}><RefreshCw size={14} />Reload workspace</button>;
}
