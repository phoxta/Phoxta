import { useEffect, useState, type FormEvent } from "react";
import { resolveTenant, submitEnquiry, type EnquiryKind } from "@/lib/phoxta";
import { useAccount } from "@/util/account";

/**
 * Buyer enquiry widget — the sales counterpart of the old rental BookingWidget.
 *
 * A car is bought once, not booked by the day, so the pick-up/drop-off date
 * range that drove the rental flow does not apply. What a buyer actually does
 * on a listing is: book a test drive, ask about finance, or offer their current
 * car in part-exchange. Each becomes a high-signal lead in the dealership's
 * operating console Inbox (migration 0079) and a CRM contact.
 */

const KINDS: { v: EnquiryKind; label: string; cta: string }[] = [
  { v: "test-drive", label: "Book a test drive", cta: "Request test drive" },
  { v: "finance", label: "Finance options", cta: "Ask about finance" },
  { v: "part-exchange", label: "Part-exchange", cta: "Value my car" },
  { v: "reserve", label: "Reserve this car", cta: "Reserve it" },
];

export default function EnquiryWidget({ vehicle }: { vehicle?: string }) {
  const { email } = useAccount();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [kind, setKind] = useState<EnquiryKind>("test-drive");
  const [form, setForm] = useState({ name: "", email: "", phone: "", when: "", details: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resolveTenant().then((t) => {
      if (active) setOrgId(t?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const emailValue = form.email || email || "";
  const active = KINDS.find((k) => k.v === kind)!;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) { setErr("We couldn't reach the dealership just now — please try again shortly."); return; }
    setBusy(true);
    setErr(null);
    const r = await submitEnquiry(orgId, {
      name: form.name.trim(),
      email: emailValue.trim(),
      phone: form.phone.trim(),
      kind,
      subject: vehicle,
      when: form.when || undefined,
      details: form.details.trim(),
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't send — please try again."); return; }
    setDone(r.reference ?? "");
  }

  if (done !== null) {
    return (
      <div className="box-booking-form p-4" style={{ borderRadius: 16, background: "#fff" }}>
        <h5 className="mb-2">Thanks — that's with the team</h5>
        <p className="text-md-medium mb-3">
          {done ? <>Your reference is <b>#{done}</b>. </> : null}
          We reply by email, usually the same day.
        </p>
        <button className="btn btn-primary" onClick={() => { setDone(null); setForm({ ...form, details: "" }); }}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="box-booking-form p-4" style={{ borderRadius: 16, background: "#fff" }}>
      <h5 className="mb-1">{vehicle ? "Interested in this car?" : "Talk to the team"}</h5>
      {vehicle && <p className="text-md-medium mb-3">{vehicle}</p>}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {KINDS.map((k) => (
          <button
            key={k.v}
            type="button"
            onClick={() => setKind(k.v)}
            aria-pressed={kind === k.v}
            className={`btn btn-sm ${kind === k.v ? "btn-primary" : "btn-outline-secondary"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="row g-2">
        <div className="col-sm-6">
          <label className="form-label" htmlFor="eq-name">Name</label>
          <input id="eq-name" className="form-control" required value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </div>
        <div className="col-sm-6">
          <label className="form-label" htmlFor="eq-email">Email</label>
          <input id="eq-email" type="email" className="form-control" required value={emailValue}
                 onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </div>
        <div className="col-sm-6">
          <label className="form-label" htmlFor="eq-phone">Phone</label>
          <input id="eq-phone" className="form-control" value={form.phone}
                 onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </div>
        {(kind === "test-drive" || kind === "reserve") && (
          <div className="col-sm-6">
            <label className="form-label" htmlFor="eq-when">Preferred day</label>
            <input id="eq-when" type="date" className="form-control" value={form.when}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={(e) => setForm({ ...form, when: e.target.value })} />
          </div>
        )}
        <div className="col-12">
          <label className="form-label" htmlFor="eq-details">
            {kind === "part-exchange" ? "Your current car" : "Anything else?"}
          </label>
          <textarea
            id="eq-details"
            rows={3}
            className="form-control"
            value={form.details}
            placeholder={
              kind === "part-exchange"
                ? "Make, model, year, mileage and condition…"
                : kind === "finance"
                  ? "Deposit you have in mind, monthly budget, term…"
                  : "Questions about the car, or a time that suits you…"
            }
            onChange={(e) => setForm({ ...form, details: e.target.value })}
          />
        </div>
      </div>

      {err && <p className="text-danger mt-2 mb-0">{err}</p>}

      <button className="btn btn-primary w-100 mt-3" disabled={busy}>
        {busy ? "Sending…" : active.cta}
      </button>
      <p className="text-sm mt-2 mb-0" style={{ opacity: 0.7 }}>No obligation — we usually reply the same day.</p>
    </form>
  );
}
