import { useState } from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { useCatalog } from "@/util/catalog";
import { submitContact } from "@/lib/phoxta";

const fmtTime = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function Contact() {
    const { orgId, profile } = useCatalog();
    const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [err, setErr] = useState("");
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        if (!f.name.trim() || !f.email.trim()) { setErr("Please enter your name and email."); return; }
        setBusy(true);
        try {
            if (orgId) await submitContact(orgId, f.name, f.email, f.subject, f.message);
            setSent(true);
        } catch {
            setErr("Sorry, that didn't go through. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    const address = profile?.address || "123 Workspace Ave, London, UK";
    const phone = profile?.phone;
    const email = profile?.email || "hello@gearo.com";
    const hours = profile?.hours ?? [];
    const mapQ = profile?.mapQuery || profile?.address;

    return (
        <Layout>
            <Breadcrumb title="Contact" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row g-4">
                        <div className="col-lg-7">
                            <h4 className="mb-3">Get in touch</h4>
                            {sent ? (
                                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 32 }}>
                                    <h5 className="mb-2">Thanks, {f.name || "there"}!</h5>
                                    <p className="text-body-default text_secondary mb-0">We've received your message and will reply to {f.email} shortly.</p>
                                </div>
                            ) : (
                                <form className="row g-3" onSubmit={submit}>
                                    <div className="col-md-6"><input className="form-control" placeholder="Name" value={f.name} onChange={set("name")} /></div>
                                    <div className="col-md-6"><input className="form-control" placeholder="Email" type="email" value={f.email} onChange={set("email")} /></div>
                                    <div className="col-12"><input className="form-control" placeholder="Subject" value={f.subject} onChange={set("subject")} /></div>
                                    <div className="col-12"><textarea className="form-control" rows={5} placeholder="Message" value={f.message} onChange={set("message")} /></div>
                                    {err && <div className="col-12"><p className="text-body-default mb-0" style={{ color: "#c0392b" }}>{err}</p></div>}
                                    <div className="col-12"><button className="tf-btn btn-fill" style={{ height: 48 }} disabled={busy}>{busy ? "Sending…" : "Send message"}</button></div>
                                </form>
                            )}
                        </div>
                        <div className="col-lg-5">
                            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
                                <h5 className="mb-3">Visit our store</h5>
                                {address && <p className="text-body-default text_secondary mb-2">{address}</p>}
                                {email && <p className="text-body-default text_secondary mb-2">{email}</p>}
                                {phone && <p className="text-body-default text_secondary mb-3">{phone}</p>}
                                {hours.length > 0 && (
                                    <div className="text-body-default text_secondary" style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                                        {hours.map((h) => (
                                            <div key={h.day} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                                <span>{h.day}</span><span>{h.closed ? "Closed" : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {mapQ && (
                        <div className="mt-4" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
                            <iframe title="Map" width="100%" height="340" style={{ border: 0, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&output=embed`} />
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
