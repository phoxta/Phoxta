import { useState } from "react";
import { useMenu } from "@/util/menu";
import { requestTableReservation } from "@/lib/phoxta";

const TIMES = ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];

export default function ReservationWidget() {
    const { orgId, live } = useMenu();
    const [done, setDone] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name") || "");
        const email = String(f.get("email") || "");
        const date = String(f.get("date") || "");
        const time = String(f.get("time") || "");
        const party = parseInt(String(f.get("guests") || "1")) || 1;
        const notes = String(f.get("notes") || "");
        setBusy(true);
        setError(null);
        try {
            // Live tenant → record a real reservation (shows in the operating console).
            if (live && orgId) await requestTableReservation(orgId, { name, email, date, time, party, notes });
            setDone(`Table requested for ${party} ${party === 1 ? "guest" : "guests"} on ${date} at ${time}. We'll confirm by email shortly, ${name}.`);
        } catch {
            setError("Sorry — we couldn't submit that just now. Please try again, or call us.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="reservation" id="reserve">
            <div className="container">
                <div className="reservation-inner">
                    <div className="section-label" style={{ color: "var(--accent-light)" }}>Reservations</div>
                    <h2 className="serif">Reserve Your Table</h2>
                    <p>Book your dining experience online. For parties of 8 or more, please call us directly.</p>
                    {done ? (
                        <div className="res-success"><i className="fas fa-check-circle" /> {done}</div>
                    ) : (
                        <form className="res-form" onSubmit={submit}>
                            <div className="res-field"><label>Date</label><input type="date" name="date" required /></div>
                            <div className="res-field">
                                <label>Time</label>
                                <select name="time" required defaultValue=""><option value="" disabled>Select…</option>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>
                            </div>
                            <div className="res-field">
                                <label>Guests</label>
                                <select name="guests" required defaultValue=""><option value="" disabled>Select…</option>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} {n === 1 ? "Guest" : "Guests"}</option>)}</select>
                            </div>
                            <div className="res-field"><label>Name</label><input type="text" name="name" placeholder="Your name" required /></div>
                            <div className="res-field"><label>Email</label><input type="email" name="email" placeholder="you@email.com" required /></div>
                            <div className="res-field" style={{ flexBasis: "100%" }}><label>Special requests <span style={{ opacity: 0.6 }}>(optional)</span></label><input type="text" name="notes" placeholder="Allergies, occasion, seating preference…" /></div>
                            <div className="res-submit"><button type="submit" className="btn-accent" disabled={busy}><i className="fas fa-calendar-check" /> {busy ? "Booking…" : "Book Now"}</button></div>
                        </form>
                    )}
                    {error && <div className="res-note" style={{ color: "#c0392b" }}>{error}</div>}
                    <div className="res-note"><i className="fas fa-phone" /> For large parties call +1 (555) 123-4567</div>
                </div>
            </div>
        </section>
    );
}
