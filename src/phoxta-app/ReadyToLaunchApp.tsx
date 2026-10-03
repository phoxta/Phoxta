import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, Check, CheckCircle2, Circle, ExternalLink, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BusinessListing from "@/shared/sections/index-1/Business_Listing";
import { blueprintCover } from "@/lib/blueprintCover";
import { formatPrice, getBlueprint, getBlueprintScorecards, type Blueprint, type BlueprintScorecard } from "@/lib/db/marketplace";
import { startBlueprintCheckout, verifyPayment } from "@/lib/db/payments";
import { listWorkspaceTasks, updateWorkspaceTask, type WorkspaceTask } from "@/lib/db/productWorkspace";
import { PLATFORM_PLANS } from "@/lib/plans";
import { useWorkspaceState } from "./WorkspaceContext";

const ACTIVATION_PREFIX = "activation:";
const GROWTH_PRICE = PLATFORM_PLANS.find((plan) => plan.key === "growth")?.priceMonthly ?? 250;

const activationRoutes: Record<string, { label: string; to: string }> = {
  "activation:offer-brand": { label: "Review offer and brand", to: "/app/growth" },
  "activation:email": { label: "Connect customer email", to: "/app/customers/email" },
  "activation:channels": { label: "Connect WhatsApp and channels", to: "/app/customers/whatsapp" },
  "activation:payments": { label: "Configure commerce and payments", to: "/app/operations/commerce" },
  "activation:ai-controls": { label: "Choose AI approval controls", to: "/app/intelligence/capabilities" },
  "activation:domain-launch": { label: "Review launch readiness", to: "/app/intelligence/capabilities" },
};

function includedItems(blueprint: Blueprint) {
  const preset = blueprint.preset ?? {};
  const raw = [preset.modules, preset.features, preset.workflows].flatMap((value) => Array.isArray(value) ? value : []);
  const named = raw.map((value) => typeof value === "string" ? value : "").filter(Boolean);
  return named.length ? named.slice(0, 8) : [
    "A ready storefront and product catalogue",
    "Customer inbox, email and WhatsApp workflows",
    "Operations, task and approval controls",
    "Campaign, content and social tools",
    "Phoxta AI-Ops agents and business intelligence",
    "Brand, launch assets and activation checklist",
  ];
}

export function ReadyToLaunchCatalogue() {
  return <BusinessListing context="app" />;
}

export function ReadyToLaunchDetail({ slug }: { slug: string }) {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [score, setScore] = useState<BlueprintScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getBlueprint(slug), getBlueprintScorecards()]).then(([business, scores]) => {
      if (!active) return;
      setBlueprint(business.data);
      setScore(scores.data.find((item) => item.blueprint_id === business.data?.id) ?? null);
      setName(business.data?.name ?? "");
      setError(business.error ?? "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  async function purchase() {
    if (!blueprint || !accepted || buying) return;
    setBuying(true);
    setError("");
    const result = await startBlueprintCheckout(blueprint.id, name.trim() || blueprint.name);
    if (result.error || !result.url) {
      setError(result.error ?? "Checkout could not be started.");
      setBuying(false);
      return;
    }
    window.location.assign(result.url);
  }

  if (loading) return <div className="rtl-state"><LoaderCircle className="is-spinning" />Loading business…</div>;
  if (!blueprint) return <div className="rtl-state"><strong>Business unavailable</strong><p>{error || "This business is no longer live."}</p><Link to="/app/businesses">Return to Ready-to-Launch</Link></div>;
  const items = includedItems(blueprint);

  return <section className="rtl-detail">
    <Link className="rtl-back" to="/app/businesses"><ArrowLeft size={16} /> All ready-to-launch businesses</Link>
    <div className="rtl-detail-grid">
      <div className="rtl-detail-media"><img src={blueprintCover(blueprint.slug, blueprint.cover_url)} alt={`${blueprint.name} business preview`} /></div>
      <div className="rtl-detail-copy">
        <div className="rtl-badges"><span><ShieldCheck size={14} /> Phoxta verified</span>{blueprint.ai_included && <span><Sparkles size={14} /> AI-Ops included</span>}</div>
        <p className="rtl-kicker">{blueprint.vertical} · {blueprint.tier}</p>
        <h1>{blueprint.name}</h1>
        <h2>{blueprint.tagline}</h2>
        <p>{blueprint.description}</p>
        <div className="rtl-proof"><span><strong>{score?.businesses ?? 0}</strong> active businesses</span><span><strong>{score?.orders_90d ?? 0}</strong> recent orders</span><span><strong>{score?.avg_qa_score ? `${Math.round(score.avg_qa_score)}%` : "Verified"}</strong> quality</span></div>
        <label className="rtl-name"><span>Your business name</span><input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
        <div className="rtl-price"><strong>{formatPrice(blueprint.price_cents, blueprint.currency)}</strong><span>one-time business purchase</span></div>
        <label className="rtl-terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I understand that results depend on execution and market conditions. The first month of Growth is included, then {formatPrice(GROWTH_PRICE * 100, "GBP")}/month unless cancelled.</span></label>
        {error && <p className="rtl-error" role="alert">{error}</p>}
        <button className="rtl-buy" type="button" disabled={!accepted || buying || !name.trim()} onClick={() => void purchase()}>{buying ? <><LoaderCircle className="is-spinning" size={18} /> Opening secure checkout</> : <>Buy and launch <ArrowRight size={18} /></>}</button>
        {blueprint.demo_url && <a className="rtl-demo" href={blueprint.demo_url} target="_blank" rel="noreferrer">View live demo <ExternalLink size={14} /></a>}
      </div>
    </div>
    <div className="rtl-included"><header><span>What you receive</span><h2>A working business connected to your Agentic Console.</h2></header><div>{items.map((item) => <p key={item}><Check size={16} />{item}</p>)}</div></div>
  </section>;
}

export function BusinessPaymentCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshBusinesses } = useWorkspaceState();
  const reference = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("session_id") || query.get("reference") || query.get("trxref") || "";
  }, [location.search]);
  const cancelled = useMemo(() => new URLSearchParams(location.search).get("cancelled") === "1", [location.search]);
  const [message, setMessage] = useState("Confirming your payment and building your business…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cancelled) { setError("Checkout was cancelled. You have not been charged."); return; }
    let active = true;
    let timer: number | undefined;
    let attempts = 0;
    const check = async () => {
      if (!reference) { setError("The checkout reference is missing."); return; }
      attempts += 1;
      const result = await verifyPayment(reference);
      if (!active) return;
      if (result.error) {
        if (attempts < 12) timer = window.setTimeout(check, 2500);
        else setError(result.error);
        return;
      }
      if (result.data?.fulfilled) {
        if (result.data.kind === "blueprint" && result.data.organizationId) {
          await refreshBusinesses(result.data.organizationId);
          if (active) navigate(`/app/businesses/activate/${result.data.organizationId}?purchase=success`, { replace: true });
        } else if (active) navigate("/app", { replace: true });
        return;
      }
      setMessage(result.data?.status === "success" ? "Payment received. Phoxta is provisioning your workspace…" : "Waiting for secure payment confirmation…");
      if (attempts < 24) timer = window.setTimeout(check, 2500);
      else setError("Payment was received but provisioning is taking longer than expected. You can retry safely.");
    };
    void check();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [cancelled, navigate, reference, refreshBusinesses]);

  return <section className="rtl-callback"><div className="rtl-callback-mark">{error ? <Circle /> : <LoaderCircle className="is-spinning" />}</div><p>Secure checkout</p><h1>{error ? "We could not finish setup yet" : "Your business is being prepared"}</h1><span>{error || message}</span>{error && <div><button type="button" onClick={() => window.location.reload()}>Retry verification</button><Link to="/app/businesses">Return to catalogue</Link></div>}</section>;
}

export function BusinessActivation({ organizationId }: { organizationId: string }) {
  const { business, businesses, selectBusiness, refreshBusinesses } = useWorkspaceState();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void refreshBusinesses(organizationId).then(async (selected) => {
      if (!active) return;
      if (selected) selectBusiness(selected.id);
      const result = await listWorkspaceTasks(organizationId);
      if (!active) return;
      setTasks(result.data.filter((task) => task.source === "system" && task.source_id?.startsWith(ACTIVATION_PREFIX)));
      setError(result.error ?? "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const organization = businesses.find((item) => item.id === organizationId) ?? (business?.id === organizationId ? business : null);
  const completed = tasks.filter((task) => task.status === "ready").length;

  async function toggle(task: WorkspaceTask) {
    const next = task.status === "ready" ? "todo" : "ready";
    const result = await updateWorkspaceTask(task.id, { status: next });
    if (result.error || !result.data) { setError(result.error ?? "Task could not be updated."); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? result.data! : item));
  }

  if (loading) return <div className="rtl-state"><LoaderCircle className="is-spinning" />Loading activation plan…</div>;
  return <section className="rtl-activation">
    <div className="rtl-activation-hero"><span><CheckCircle2 size={22} /> Business provisioned</span><h1>{organization?.name ?? "Your new business"} is ready.</h1><p>Phoxta created the operating workspace, installed its business modules and connected it to AI-Ops. Complete these checks before launch.</p><div className="rtl-progress"><i style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /><span>{completed} of {tasks.length} complete</span></div></div>
    {error && <p className="rtl-error">{error}</p>}
    <div className="rtl-checklist">{tasks.map((task) => { const route = activationRoutes[task.source_id ?? ""]; return <article key={task.id} className={task.status === "ready" ? "is-ready" : ""}><button type="button" onClick={() => void toggle(task)} aria-label={`${task.status === "ready" ? "Reopen" : "Complete"} ${task.title}`}>{task.status === "ready" ? <CheckCircle2 /> : <Circle />}</button><div><strong>{route?.label ?? task.title}</strong><p>{task.detail}</p></div>{route && <button type="button" onClick={() => navigate(route.to)}>Open <ArrowRight size={15} /></button>}</article>; })}</div>
    <div className="rtl-activation-actions"><button type="button" onClick={() => { selectBusiness(organizationId); navigate("/app"); }}><Bot size={18} /> Open {organization?.name ?? "business"} in AI-Ops</button><Link to="/app/businesses">Explore more businesses</Link></div>
  </section>;
}

export function ReadyToLaunchRoutes({ path }: { path: string }) {
  if (path === "/app/businesses/payment/callback") return <BusinessPaymentCallback />;
  const activation = path.match(/^\/app\/businesses\/activate\/([^/]+)$/);
  if (activation) return <BusinessActivation organizationId={decodeURIComponent(activation[1])} />;
  const detail = path.match(/^\/app\/businesses\/([^/]+)$/);
  if (detail) return <ReadyToLaunchDetail slug={decodeURIComponent(detail[1])} />;
  return <ReadyToLaunchCatalogue />;
}
