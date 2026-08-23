import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAccount } from "@/util/account";
import {
  resolveTenant,
  signIn, signUp, signOut, sendReset,
  fetchMyOrders, fetchMyBookings, cancelMyBooking, fetchMyProfile, saveMyProfile,
  type CustomerOrder, type CustomerBooking,
} from "@/lib/phoxta";

/**
 * Customer account: sign in or create an account, then order and booking
 * history and contact details.
 *
 * Resolves its own tenant from the hostname rather than depending on a
 * catalogue context, so the same page drops into every storefront unchanged.
 * Everything shown is scoped server-side to the caller's verified email
 * (migration 0077) — this page grants nothing by itself.
 */

const money = (cents?: number, ccy?: string) => {
  if (cents == null) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy || "GBP" }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2);
  }
};

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

const STATUS_COPY: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Completed",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  cancelled: "Cancelled",
  confirmed: "Confirmed",
};

export default function Account() {
  const { session, email, ready } = useAccount();
  const [orgId, setOrgId] = useState<string | null>(null);

  const [mode, setMode] = useState<"in" | "up">("in");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [pForm, setPForm] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  // Resolve the tenant here so the page is portable across storefronts.
  useEffect(() => {
    let active = true;
    resolveTenant().then((t) => {
      if (active) setOrgId(t?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session || !orgId) return;
    let active = true;
    setLoading(true);
    Promise.all([fetchMyOrders(orgId), fetchMyBookings(orgId), fetchMyProfile(orgId)]).then(([o, b, p]) => {
      if (!active) return;
      setOrders(o);
      setBookings(b);
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

  async function cancel(id: string) {
    if (!orgId) return;
    const r = await cancelMyBooking(orgId, id);
    if (!r.ok) { setErr(r.error ?? "That booking cannot be cancelled online."); return; }
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    setMsg("Booking cancelled.");
  }

  if (!ready) return <div style={{ padding: "80px 20px", textAlign: "center" }}>Loading…</div>;

  // ── Signed out ───────────────────────────────────────────────────────────
  if (!session) {
    return (
      <Layout footerStyle={1}>
        <section className="section-box pt-80 pb-80 background-body">
          <div className="container" style={{ maxWidth: 460 }}>
        <h1 style={{ marginBottom: 8 }}>{mode === "in" ? "Sign in" : "Create an account"}</h1>
        <p style={{ opacity: 0.7 }}>
          {mode === "in"
            ? "See your orders and bookings in one place."
            : "Save your details and keep track of everything you order."}
        </p>

        <form onSubmit={submitAuth} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
          {mode === "up" && (
            <label>Name
              <input className="form-control" value={form.name} autoComplete="name"
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          )}
          <label>Email
            <input className="form-control" type="email" required value={form.email} autoComplete="email"
                   onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>Password
            <input className="form-control" type="password" required minLength={8} value={form.password}
                   autoComplete={mode === "in" ? "current-password" : "new-password"}
                   onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>

          {err && <p style={{ color: "#b02a37", margin: 0 }}>{err}</p>}
          {msg && <p style={{ color: "#1b6e45", margin: 0 }}>{msg}</p>}

          <button className="btn btn-dark" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button type="button" className="btn btn-link p-0"
                  onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); setMsg(null); }}>
            {mode === "in" ? "Create an account" : "I already have an account"}
          </button>
          {mode === "in" && <button type="button" className="btn btn-link p-0" onClick={reset}>Forgot password</button>}
        </div>

        <p style={{ opacity: 0.6, fontSize: 13, marginTop: 28 }}>
          You can also continue without an account — <Link to="/">keep browsing</Link>.
        </p>
          </div>
        </section>
      </Layout>
    );
  }

  // ── Signed in ────────────────────────────────────────────────────────────
  return (
    <Layout footerStyle={1}>
      <section className="section-box pt-80 pb-80 background-body">
        <div className="container" style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Your account</h1>
          <p style={{ opacity: 0.7, margin: 0 }}>{email}</p>
        </div>
        <button className="btn btn-outline-dark" style={{ marginLeft: "auto" }} onClick={() => signOut()}>Sign out</button>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your details</h2>
      <form onSubmit={saveProfile} style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
        <label style={{ flex: "1 1 220px" }}>Name
          <input className="form-control" value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} />
        </label>
        <label style={{ flex: "1 1 220px" }}>Phone
          <input className="form-control" value={pForm.phone} onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} />
        </label>
        <div style={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn btn-dark" disabled={busy}>{busy ? "…" : "Save"}</button>
          {msg && <span style={{ color: "#1b6e45", fontSize: 14 }}>{msg}</span>}
          {err && <span style={{ color: "#b02a37", fontSize: 14 }}>{err}</span>}
        </div>
      </form>

      {loading && <p style={{ opacity: 0.7 }}>Loading your history…</p>}

      {bookings.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your bookings</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b>#{b.reference}</b>
                  <span style={{ fontSize: 13, opacity: 0.75 }}>{STATUS_COPY[b.status] ?? b.status}</span>
                  <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.7 }}>
                    {day(b.when)}{b.until ? ` → ${day(b.until)}` : ""}
                  </span>
                </div>
                {b.total_cents != null && <div style={{ marginTop: 6 }}><b>{money(b.total_cents, b.currency)}</b></div>}
                {["pending", "confirmed"].includes(b.status) && (
                  <button className="btn btn-sm btn-outline-dark" style={{ marginTop: 10 }} onClick={() => cancel(b.id)}>
                    Cancel booking
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Order history</h2>
      {!loading && orders.length === 0 ? (
        <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <p style={{ marginBottom: 10 }}>No orders yet.</p>
          <Link className="btn btn-dark" to="/">Start browsing</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <b>#{o.reference}</b>
                <span style={{ fontSize: 13, opacity: 0.75 }}>{STATUS_COPY[o.status] ?? o.status}</span>
                <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.7 }}>{day(o.placed_at)}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", fontSize: 14, opacity: 0.8 }}>
                {o.items.map((it, i) => (
                  <li key={i}>{it.quantity} × {it.name}</li>
                ))}
              </ul>
              <b>{money(o.total_cents, o.currency)}</b>
              {o.refunded_cents > 0 && (
                <span style={{ marginLeft: 10, fontSize: 13, opacity: 0.7 }}>
                  {money(o.refunded_cents, o.currency)} refunded
                </span>
              )}
            </div>
          ))}
        </div>
      )}
        </div>
      </section>
    </Layout>
  );
}
