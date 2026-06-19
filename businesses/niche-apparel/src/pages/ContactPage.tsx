import { useState } from "react";
import PageHero from "@/components/PageHero";
import { useCatalog } from "@/util/catalog";
import { submitContact } from "@/lib/phoxta";

const fmtTime = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function ContactPage() {
    const { orgId, profile } = useCatalog();
    const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const set = (k: string) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));

    const address = profile?.address || "24 Atelier Lane, City Centre";
    const email = profile?.email || "hello@aurelia.com";
    const phone = profile?.phone || "+1 (555) 123-4567";
    const hours = profile?.hours ?? [];
    const mapQ = profile?.mapQuery || profile?.address;

    async function submit(e: any) {
        e.preventDefault();
        setBusy(true);
        try {
            if (orgId) await submitContact(orgId, f.name, f.email, f.subject, f.message);
        } catch {
            /* fall through to thank-you */
        } finally {
            setBusy(false);
            setSent(true);
        }
    }

    return (
        <>
            <PageHero eyebrow="Get in Touch" title="We'd love to hear from you" subtitle="Questions about an order, sizing or a private appointment — our team and AI stylist are here to help." />
            <section className="pb-80">
                <div className="container">
                    <div className="row g-4 justify-content-center">
                        <div className="col-lg-7">
                            <div className="bg-neutral-50 rounded-4 p-4 p-lg-5">
                                {sent ? (
                                    <p className="text-success fw-600 mb-0">Thank you{f.name ? `, ${f.name}` : ""} — we'll be in touch shortly{f.email ? ` at ${f.email}` : ""}.</p>
                                ) : (
                                    <form className="row g-3" onSubmit={submit}>
                                        <div className="col-md-6"><input className="form-control" placeholder="Name" value={f.name} onChange={set("name")} required /></div>
                                        <div className="col-md-6"><input className="form-control" type="email" placeholder="Email" value={f.email} onChange={set("email")} required /></div>
                                        <div className="col-12"><input className="form-control" placeholder="Subject" value={f.subject} onChange={set("subject")} /></div>
                                        <div className="col-12"><textarea className="form-control" rows={5} placeholder="Message" value={f.message} onChange={set("message")} required /></div>
                                        <div className="col-12"><button className="at-btn bg-dark text-white" disabled={busy}><span><span className="text-1">{busy ? "Sending…" : "Send Message"}</span><span className="text-2">{busy ? "Sending…" : "Send Message"}</span></span></button></div>
                                    </form>
                                )}
                            </div>
                        </div>
                        <div className="col-lg-4">
                            <div className="d-flex flex-column gap-3">
                                <div className="bg-neutral-0 border border-100 rounded-4 p-4"><h6 className="fw-600 mb-1">Visit</h6><p className="neutral-500 mb-0">{address}</p></div>
                                <div className="bg-neutral-0 border border-100 rounded-4 p-4"><h6 className="fw-600 mb-1">Email</h6><p className="neutral-500 mb-0">{email}</p></div>
                                <div className="bg-neutral-0 border border-100 rounded-4 p-4"><h6 className="fw-600 mb-1">Call</h6><p className="neutral-500 mb-0">{phone}</p></div>
                                {hours.length > 0 && (
                                    <div className="bg-neutral-0 border border-100 rounded-4 p-4">
                                        <h6 className="fw-600 mb-2">Opening hours</h6>
                                        {hours.map((h) => (
                                            <div key={h.day} className="d-flex justify-content-between neutral-500" style={{ padding: "2px 0" }}>
                                                <span>{h.day}</span><span>{h.closed ? "Closed" : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {mapQ && (
                        <div className="rounded-4 overflow-hidden border border-100 mt-4">
                            <iframe title="Map" width="100%" height="340" style={{ border: 0, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&output=embed`} />
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
