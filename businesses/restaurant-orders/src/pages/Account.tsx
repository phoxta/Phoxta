import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
 */

/** Orders carry their own currency, so format per row rather than assuming one. */
const money = (cents: number, ccy: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy || "USD" }).format(cents / 100);
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
    return <section className="section"><div className="container"><p>Loading…</p></div></section>;
  }

  // ── Signed out ───────────────────────────────────────────────────────────
  if (!session) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 460 }}>
          <h1 className="section-title">{mode === "in" ? "Sign in" : "Create an account"}</h1>
          <p className="text-muted">
            {mode === "in"
              ? "Sign in to see your orders and reorder in a tap."
              : "Save your details, track orders and reorder your favourites."}
          </p>

          <form onSubmit={submitAuth} className="d-flex flex-column gap-3 mt-4">
            {mode === "up" && (
              <div>
                <label className="form-label" htmlFor="ac-name">Name</label>
                <input id="ac-name" className="form-control" value={form.name}
                       onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              </div>
            )}
            <div>
              <label className="form-label" htmlFor="ac-email">Email</label>
              <input id="ac-email" type="email" required className="form-control" value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            </div>
            <div>
              <label className="form-label" htmlFor="ac-pw">Password</label>
              <input id="ac-pw" type="password" required minLength={8} className="form-control" value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })}
                     autoComplete={mode === "in" ? "current-password" : "new-password"} />
            </div>

            {err && <div className="alert alert-danger py-2 px-3 mb-0">{err}</div>}
            {msg && <div className="alert alert-success py-2 px-3 mb-0">{msg}</div>}

            <button className="btn btn-dark w-100" disabled={busy}>
              {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="d-flex justify-content-between mt-3">
            <button type="button" className="btn btn-link p-0" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); setMsg(null); }}>
              {mode === "in" ? "Create an account" : "I already have an account"}
            </button>
            {mode === "in" && <button type="button" className="btn btn-link p-0" onClick={reset}>Forgot password</button>}
          </div>

          <p className="text-muted mt-4 mb-0" style={{ fontSize: 13 }}>
            You can also order without an account — <Link to="/menu">browse the menu</Link>.
          </p>
        </div>
      </section>
    );
  }

  // ── Signed in ────────────────────────────────────────────────────────────
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="d-flex align-items-center flex-wrap gap-2 mb-4">
          <div>
            <h1 className="section-title mb-1">Your account</h1>
            <p className="text-muted mb-0">{email}</p>
          </div>
          <button className="btn btn-outline-dark ms-auto" onClick={() => signOut()}>Sign out</button>
        </div>

        <h2 className="h5 mb-3">Your details</h2>
        <form onSubmit={saveProfile} className="row g-3 mb-5">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="p-name">Name</label>
            <input id="p-name" className="form-control" value={pForm.name}
                   onChange={(e) => setPForm({ ...pForm, name: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="p-phone">Phone</label>
            <input id="p-phone" className="form-control" value={pForm.phone}
                   onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} />
          </div>
          <div className="col-12 d-flex align-items-center gap-3">
            <button className="btn btn-dark" disabled={busy}>{busy ? "…" : "Save"}</button>
            {msg && <span className="text-success" style={{ fontSize: 14 }}>{msg}</span>}
            {err && <span className="text-danger" style={{ fontSize: 14 }}>{err}</span>}
          </div>
        </form>

        <h2 className="h5 mb-3">Order history</h2>
        {loading ? (
          <p className="text-muted">Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className="p-4 border rounded-3 text-center">
            <p className="mb-2">No orders yet.</p>
            <Link className="btn btn-dark" to="/menu">Browse the menu</Link>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {orders.map((o) => (
              <div key={o.id} className="p-3 border rounded-3">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <b>#{o.reference}</b>
                  <span className="badge bg-light text-dark">{STATUS_COPY[o.status] ?? o.status}</span>
                  {o.fulfilment === "fulfilled" && <span className="badge bg-success-subtle text-success">Delivered</span>}
                  <span className="ms-auto text-muted" style={{ fontSize: 13 }}>
                    {new Date(o.placed_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <ul className="list-unstyled mt-2 mb-2" style={{ fontSize: 14 }}>
                  {o.items.map((it, i) => (
                    <li key={i} className="text-muted">
                      {it.quantity} × {it.name}
                      {it.notes ? <span className="fst-italic"> — {it.notes}</span> : null}
                    </li>
                  ))}
                </ul>
                <div className="d-flex align-items-center gap-3">
                  <b>{money(o.total_cents, o.currency)}</b>
                  {o.refunded_cents > 0 && (
                    <span className="text-muted" style={{ fontSize: 13 }}>
                      {money(o.refunded_cents, o.currency)} refunded
                    </span>
                  )}
                  <Link className="btn btn-sm btn-outline-dark ms-auto" to={`/track?ref=${o.reference}`}>Track</Link>
                  <Link className="btn btn-sm btn-dark" to="/menu">Order again</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
