import Layout from "@/components/layout/Layout";
import { useState } from "react";
import { useFleet } from "@/util/fleet";
import { lookupReservation, type ReservationLookup } from "@/lib/phoxta";

const STATUS_COLOR: Record<string, string> = {
    pending: "#92400e", confirmed: "#166534", completed: "#475569", cancelled: "#b91c1c",
};

export default function ManageBooking() {
    const { orgId } = useFleet();
    const [ref, setRef] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ReservationLookup | null>(null);
    const [err, setErr] = useState("");

    async function lookup(e: any) {
        e.preventDefault();
        setErr("");
        setResult(null);
        if (!ref.trim() || !email.trim()) { setErr("Enter your reference and the email you booked with."); return; }
        if (!orgId) { setErr("Booking lookup works on the live store."); return; }
        setBusy(true);
        const r = await lookupReservation(orgId, ref.trim(), email.trim());
        setBusy(false);
        if (r && r.found) setResult(r);
        else setErr("No booking found with that reference and email.");
    }

    return (
        <Layout footerStyle={1}>
            <section className="section-box pt-80 pb-80 background-body">
                <div className="container" style={{ maxWidth: 620 }}>
                    <div className="text-center mb-40">
                        <h3 className="neutral-1000">Manage your booking</h3>
                        <p className="text-xl-medium neutral-500">Enter your reference and the email you booked with.</p>
                    </div>
                    <form className="card border rounded-3 p-4 background-card mb-4" onSubmit={lookup}>
                        <div className="mb-3"><input className="form-control" placeholder="Booking reference" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
                        <div className="mb-3"><input className="form-control" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        {err && <p className="text-md-medium mb-3" style={{ color: "#c0392b" }}>{err}</p>}
                        <button className="btn btn-brand-2" disabled={busy}>{busy ? "Looking up…" : "Find my booking"}</button>
                    </form>
                    {result && (
                        <div className="card border rounded-3 p-4 background-card">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="neutral-1000 mb-0">{result.product}</h5>
                                <span style={{ textTransform: "capitalize", fontWeight: 600, color: STATUS_COLOR[result.status] || "#475569" }}>{result.status}</span>
                            </div>
                            <p className="text-md-medium neutral-700 mb-1">{result.customer_name}</p>
                            <p className="text-md-medium neutral-700 mb-1">{result.start_date} → {result.end_date} ({result.units} {result.units === 1 ? "unit" : "units"})</p>
                            <p className="text-md-medium neutral-1000 fw-bold mb-0">Total: ${(result.total_cents / 100).toFixed(0)}</p>
                            <p className="text-sm-medium neutral-500 mt-3 mb-0">Need to change or cancel? Reply to your confirmation email or contact us.</p>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
