import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
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
      <Layout>
        <header className="page-header">
          <div className="container inner">
            <h1>Request received</h1>
            <p>We reply by email, usually within a few hours.</p>
          </div>
        </header>
        <section className="menu-section">
          <div className="container" style={{ maxWidth: 560 }}>
            <div className="card-box" style={{ textAlign: "center" }}>
              <p style={{ marginBottom: 24, color: "var(--text-light)" }}>
                Thanks — your request is with the kitchen{done ? <> under reference <b style={{ color: "var(--accent)" }}>#{done}</b></> : null}.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link className="btn-accent" to="/menu">Browse the menu</Link>
                <button className="btn-dark-outline" onClick={() => { setDone(null); setForm({ ...form, details: "" }); }}>
                  Send another request
                </button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="page-header">
        <div className="container inner">
          <h1>Special orders</h1>
          <p>
            Feeding a crowd, or after something that isn't on the menu? Tell us what you need and we'll come back with
            a quote.
          </p>
        </div>
      </header>

      <section className="menu-section">
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ textAlign: "center", color: "var(--text-light)", marginBottom: 32 }}>
            For everyday orders, <Link to="/menu" style={{ color: "var(--accent)" }}>order from the menu</Link> — it's faster.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
            {KINDS.map((k) => (
              <button
                key={k.v}
                type="button"
                onClick={() => setKind(k.v)}
                aria-pressed={kind === k.v}
                className="card-box"
                style={{
                  textAlign: "left", cursor: "pointer", padding: 18, font: "inherit",
                  borderColor: kind === k.v ? "var(--accent)" : "var(--border)",
                  background: kind === k.v ? "var(--accent-glow)" : "var(--white)",
                }}
              >
                <b style={{ fontSize: 14, display: "block", marginBottom: 4 }}>{k.label}</b>
                <span style={{ fontSize: 12, color: "var(--text-light)" }}>{k.blurb}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="card-box">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div className="field">
            <label htmlFor="so-name">Your name</label>
            <input id="so-name" required value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="so-email">Email</label>
            <input id="so-email" type="email" required value={emailValue}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="so-phone">Phone <span style={{ color: "var(--text-light)" }}>— optional</span></label>
            <input id="so-phone" value={form.phone}
                   onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
          </div>
          <div className="field">
            <label htmlFor="so-when">When do you need it?</label>
            <input id="so-when" type="date" value={form.when}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={(e) => setForm({ ...form, when: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="so-head">How many people?</label>
            <input id="so-head" type="number" min={1} value={form.headcount}
                   onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="so-budget">Budget <span style={{ color: "var(--text-light)" }}>— optional</span></label>
            <input id="so-budget" type="number" min={0} value={form.budget}
                   onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="so-details">What do you need?</label>
            <textarea id="so-details" rows={5} required value={form.details}
                      placeholder="Dishes you have in mind, dietary requirements, allergies, delivery or collection…"
                      onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>

            </div>

            {err && (
              <div role="alert" style={{ padding: "12px 16px", borderRadius: 8, fontSize: 14, marginBottom: 16,
                                         border: "1px solid rgba(180,83,9,.35)", background: "var(--accent-glow)", color: "var(--accent)" }}>
                {err}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button className="btn-accent" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
              <span style={{ fontSize: 13, color: "var(--text-light)" }}>We usually reply within a few hours.</span>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
