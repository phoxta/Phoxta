import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAccount } from "@/util/account";
import { useMenu } from "@/util/menu";
import {
  signIn, signUp, signOut, sendReset,
  fetchMyOrders, fetchMyProfile, saveMyProfile,
  type CustomerOrder,
} from "@/lib/phoxta";

/**
 * Customer account: sign in / create an account, then order history and details.
 *
 * One page rather than three, because a customer's whole relationship with a
 * takeaway is "what did I order, and can I get it again". Everything shown is
 * scoped server-side to the caller's verified email.
 *
 * Presentation uses the restaurant's own theme (index.css): the .page-header
 * hero, .menu-section rhythm, .card-box surfaces, .field form rows and the
 * .btn-accent / .btn-dark-outline pair. It previously rendered raw Bootstrap
 * with no <Layout>, so it had no nav or footer and none of the site's type.
 */

/** Orders carry their own currency, so format per row rather than assuming one. */
const money = (cents: number, ccy: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy || "GBP" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)}`;
  }
};

const STATUS_COPY: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid — being prepared",
  fulfilled: "Completed",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/** Maps an order status onto the theme's existing .status-tag colours. */
const STATUS_TONE: Record<string, string> = {
  pending: "preparing",
  paid: "preparing",
  fulfilled: "ready",
  refunded: "new",
  partially_refunded: "new",
  cancelled: "new",
};

/** Inline notices in the theme's palette — Bootstrap alerts look foreign here. */
function Notice({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  const err = tone === "error";
  return (
    <div
      role={err ? "alert" : "status"}
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        fontSize: 14,
        border: `1px solid ${err ? "rgba(180,83,9,.35)" : "rgba(22,163,74,.35)"}`,
        background: err ? "var(--accent-glow)" : "rgba(22,163,74,.10)",
        color: err ? "var(--accent)" : "var(--success)",
      }}
    >
      {children}
    </div>
  );
}

export default function Account() {
  const { session, email, ready } = useAccount();
  const { orgId } = useMenu();

  const [mode, setMode] = useState<"in" | "up">("in");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [pForm, setPForm] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session || !orgId) return;
    let active = true;
    setLoading(true);
    Promise.all([fetchMyOrders(orgId), fetchMyProfile(orgId)]).then(([o, p]) => {
      if (!active) return;
      setOrders(o);
      // The profile only seeds the form; there is nothing else to hold it for.
      setPForm({ name: p?.name ?? "", phone: p?.phone ?? "" });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [session, orgId]);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = mode === "in"
      ? await signIn(form.email.trim(), form.password)
      : await signUp(form.email.trim(), form.password, form.name.trim());
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    if (mode === "up") setMsg("Account created. Check your email if a confirmation is required, then sign in.");
  }

  async function reset() {
    if (!form.email.trim()) { setErr("Enter your email first, then tap reset."); return; }
    const r = await sendReset(form.email.trim());
    if (r.error) setErr(r.error);
    else setMsg("If that address has an account, a reset link is on its way.");
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setBusy(true);
    const r = await saveMyProfile(orgId, pForm.name, pForm.phone);
    setBusy(false);
    setMsg(r.ok ? "Details saved." : null);
    setErr(r.ok ? null : r.error);
  }

  if (!ready) {
    return (
      <Layout>
        <header className="page-header">
          <div className="container inner"><h1>Your account</h1></div>
        </header>
        <section className="menu-section">
          <div className="container" style={{ textAlign: "center", color: "var(--text-light)" }}>Loading…</div>
        </section>
      </Layout>
    );
  }

  // ── Signed out ───────────────────────────────────────────────────────────
  if (!session) {
    return (
      <Layout>
        <header className="page-header">
          <div className="container inner">
            <h1>{mode === "in" ? "Welcome back" : "Create an account"}</h1>
            <p>
              {mode === "in"
                ? "Sign in to see your orders and reorder in a tap."
                : "Save your details, track orders and reorder your favourites."}
            </p>
          </div>
        </header>

        <section className="menu-section">
          <div className="container" style={{ maxWidth: 480 }}>
            <div className="card-box">
              <form onSubmit={submitAuth}>
                {mode === "up" && (
                  <div className="field">
                    <label htmlFor="ac-name">Name</label>
                    <input id="ac-name" value={form.name}
                           onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="ac-email">Email</label>
                  <input id="ac-email" type="email" required value={form.email}
                         onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                </div>
                <div className="field">
                  <label htmlFor="ac-pw">Password</label>
                  <input id="ac-pw" type="password" required minLength={8} value={form.password}
                         onChange={(e) => setForm({ ...form, password: e.target.value })}
                         autoComplete={mode === "in" ? "current-password" : "new-password"} />
                </div>

                {err && <div style={{ marginBottom: 16 }}><Notice tone="error">{err}</Notice></div>}
                {msg && <div style={{ marginBottom: 16 }}><Notice tone="ok">{msg}</Notice></div>}

                <button className="btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
                  {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
                </button>
              </form>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); setMsg(null); }}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", fontSize: 13, color: "var(--accent)" }}
                >
                  {mode === "in" ? "Create an account" : "I already have an account"}
                </button>
                {mode === "in" && (
                  <button
                    type="button"
                    onClick={reset}
                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", fontSize: 13, color: "var(--text-light)" }}
                  >
                    Forgot password
                  </button>
                )}
              </div>
            </div>

            <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--text-light)" }}>
              You can also order without an account — <Link to="/menu" style={{ color: "var(--accent)" }}>browse the menu</Link>.
            </p>
          </div>
        </section>
      </Layout>
    );
  }

  // ── Signed in ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <header className="page-header">
        <div className="container inner">
          <h1>Your account</h1>
          <p>{email}</p>
        </div>
      </header>

      <section className="menu-section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
            <button className="btn-dark-outline" onClick={() => signOut()}>Sign out</button>
          </div>

          <div className="card-box" style={{ marginBottom: 32 }}>
            <h2 className="serif" style={{ fontSize: 28, marginBottom: 20 }}>Your details</h2>
            <form onSubmit={saveProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <div className="field">
                  <label htmlFor="p-name">Name</label>
                  <input id="p-name" value={pForm.name}
                         onChange={(e) => setPForm({ ...pForm, name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="p-phone">Phone</label>
                  <input id="p-phone" value={pForm.phone}
                         onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <button className="btn-accent" disabled={busy}>{busy ? "…" : "Save"}</button>
                {msg && <Notice tone="ok">{msg}</Notice>}
                {err && <Notice tone="error">{err}</Notice>}
              </div>
            </form>
          </div>

          <h2 className="serif" style={{ fontSize: 28, marginBottom: 20 }}>Order history</h2>
          {loading ? (
            <p style={{ color: "var(--text-light)" }}>Loading your orders…</p>
          ) : orders.length === 0 ? (
            <div className="card-box" style={{ textAlign: "center" }}>
              <p style={{ marginBottom: 20, color: "var(--text-light)" }}>No orders yet.</p>
              <Link className="btn-accent" to="/menu">Browse the menu</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.map((o) => (
                <div key={o.id} className="card-box">
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                    <b>#{o.reference}</b>
                    <span className={`status-tag ${STATUS_TONE[o.status] ?? "new"}`}>
                      {STATUS_COPY[o.status] ?? o.status}
                    </span>
                    {o.fulfilment === "fulfilled" && <span className="badge-pill">Delivered</span>}
                    <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-light)" }}>
                      {new Date(o.placed_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  <ul style={{ listStyle: "none", margin: "14px 0", fontSize: 14, color: "var(--text-light)" }}>
                    {o.items.map((it, i) => (
                      <li key={i}>
                        {it.quantity} × {it.name}
                        {it.notes ? <span style={{ fontStyle: "italic" }}> — {it.notes}</span> : null}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <b>{money(o.total_cents, o.currency)}</b>
                    {o.refunded_cents > 0 && (
                      <span style={{ fontSize: 13, color: "var(--text-light)" }}>
                        {money(o.refunded_cents, o.currency)} refunded
                      </span>
                    )}
                    <Link className="btn-dark-outline" style={{ marginLeft: "auto", padding: "10px 22px", fontSize: 11 }} to={`/track?ref=${o.reference}`}>Track</Link>
                    <Link className="btn-accent" style={{ padding: "11px 22px", fontSize: 11 }} to="/menu">Order again</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
