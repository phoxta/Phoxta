import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMenu } from "@/util/menu";
import { useAccount } from "@/util/account";
import { submitSpecialOrder, type SpecialOrderKind } from "@/lib/phoxta";

/**
 * Special orders — catering, bulk, custom bakes, events.
 *
 * These cannot go through the cart: quantity, date, budget and dietary needs
 * have to be agreed first. The request becomes a ticket in the kitchen's
 * operating console Inbox (migration 0078), so it is answered on the same
 * surface as every other customer message and can be turned into an invoice.
 */

const KINDS: { v: SpecialOrderKind; label: string; blurb: string }[] = [
  { v: "catering", label: "Catering", blurb: "Trays and platters for an office or party" },
  { v: "bulk", label: "Bulk order", blurb: "Large quantities of menu items" },
  { v: "custom", label: "Custom bake", blurb: "Cakes and made-to-order dishes" },
  { v: "event", label: "Event", blurb: "Full menu for a private event" },
];

export default function SpecialOrders() {
  const { orgId } = useMenu();
  const { email } = useAccount();

  const [kind, setKind] = useState<SpecialOrderKind>("catering");
  const [form, setForm] = useState({ name: "", email: "", phone: "", when: "", headcount: "", budget: "", details: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // A signed-in customer should not retype their address.
  const emailValue = form.email || email || "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) { setErr("We couldn't reach the kitchen just now — please try again shortly."); return; }
    setBusy(true);
    setErr(null);
    const r = await submitSpecialOrder(orgId, {
      name: form.name.trim(),
      email: emailValue.trim(),
      phone: form.phone.trim(),
      kind,
      when: form.when || undefined,
      headcount: form.headcount ? Number(form.headcount) : undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      details: form.details.trim(),
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't send — please try again."); return; }
    setDone(r.reference ?? "");
  }

  if (done !== null) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <h1 className="section-title">Request received</h1>
          <p>
            Thanks — your request is with the kitchen{done ? <> under reference <b>#{done}</b></> : null}. We reply by
            email, usually within a few hours.
          </p>
          <div className="d-flex gap-2 mt-4">
            <Link className="btn btn-dark" to="/menu">Browse the menu</Link>
            <button className="btn btn-outline-dark" onClick={() => { setDone(null); setForm({ ...form, details: "" }); }}>
              Send another request
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="section-title">Special orders</h1>
        <p className="text-muted">
          Feeding a crowd, or after something that isn't on the menu? Tell us what you need and we'll come back with a
          quote. For everyday orders, <Link to="/menu">order from the menu</Link> — it's faster.
        </p>

        <div className="row g-2 mt-3 mb-4">
          {KINDS.map((k) => (
            <div className="col-6 col-md-3" key={k.v}>
              <button
                type="button"
                onClick={() => setKind(k.v)}
                aria-pressed={kind === k.v}
                className={`w-100 h-100 text-start p-3 border rounded-3 ${kind === k.v ? "border-dark bg-light" : ""}`}
                style={{ background: kind === k.v ? undefined : "transparent" }}
              >
                <b style={{ fontSize: 14 }}>{k.label}</b>
                <span className="d-block text-muted" style={{ fontSize: 12 }}>{k.blurb}</span>
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="row g-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="so-name">Your name</label>
            <input id="so-name" className="form-control" required value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="so-email">Email</label>
            <input id="so-email" type="email" className="form-control" required value={emailValue}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="so-phone">Phone <span className="text-muted">— optional</span></label>
            <input id="so-phone" className="form-control" value={form.phone}
                   onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="so-when">When do you need it?</label>
            <input id="so-when" type="date" className="form-control" value={form.when}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={(e) => setForm({ ...form, when: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="so-head">How many people?</label>
            <input id="so-head" type="number" min={1} className="form-control" value={form.headcount}
                   onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="so-budget">Budget <span className="text-muted">— optional</span></label>
            <input id="so-budget" type="number" min={0} className="form-control" value={form.budget}
                   onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="so-details">What do you need?</label>
            <textarea id="so-details" rows={5} className="form-control" required value={form.details}
                      placeholder="Dishes you have in mind, dietary requirements, allergies, delivery or collection…"
                      onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>

          {err && <div className="col-12"><div className="alert alert-danger py-2 px-3 mb-0">{err}</div></div>}

          <div className="col-12">
            <button className="btn btn-dark" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
            <span className="text-muted ms-3" style={{ fontSize: 13 }}>We usually reply within a few hours.</span>
          </div>
        </form>
      </div>
    </section>
  );
}
