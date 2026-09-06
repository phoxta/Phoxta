import { useState } from "react";
import { Link } from "react-router-dom";
import { FAQS } from "@/data/catalogue";
import { isEmail } from "@/lib/format";
import { IconArrow } from "@/lib/icons";
import { fetchFaqs, submitContact } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import { useCatalog } from "@/state/catalog";
import { useOrgContent } from "@/state/content";
import { useUi } from "@/state/ui";

const TOPICS = ["Order question", "Return or exchange", "Product advice", "Wholesale / stockists", "Press"];

export default function ContactPage() {
    const { orgId, profile } = useCatalog();
    const { toast } = useUi();
    const liveFaqs = useOrgContent(fetchFaqs, []);

    const faqs = liveFaqs.length
        ? liveFaqs.map((f) => ({ question: f.question, body: f.body }))
        : FAQS;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [topic, setTopic] = useState(TOPICS[0]);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        if (!name.trim() || !isEmail(email) || !message.trim()) {
            setError("Please add your name, a valid email and a message.");
            return;
        }
        if (!orgId) {
            setError("This preview isn't connected to a store, so the form can't send.");
            return;
        }
        setBusy(true);
        setError(null);
        const ok = await submitContact(orgId, name.trim(), email.trim(), topic, message.trim());
        setBusy(false);
        if (!ok) {
            setError("That didn't send. Please try again, or email us directly.");
            return;
        }
        setSent(true);
        toast("Message sent");
    }

    return (
        <div className="page">
            <PageMeta title="Help" description="Real people, Monday to Friday. We answer within one working day." />
            <div className="wrap">
                <div className="page-head">
                    <div className="crumbs">
                        <Link to="/">Home</Link> / <b>Help</b>
                    </div>
                    <h1 className="serif">
                        How can we <em>help?</em>
                    </h1>
                    <p>Real people, Monday to Friday. We answer within one working day.</p>
                </div>

                <div className="contact-grid">
                    <div>
                        <div className="info-tile">
                            <b>Email</b>
                            {profile?.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : "hello@ferne.co.uk"}
                        </div>
                        {profile?.phone && (
                            <div className="info-tile">
                                <b>Phone</b>
                                <a href={`tel:${profile.phone.replace(/\s+/g, "")}`}>{profile.phone}</a>
                            </div>
                        )}
                        <div className="info-tile">
                            <b>Studio &amp; collection point</b>
                            {profile?.address ?? "14 Gibb Street, Digbeth, Birmingham B9 4AA"}
                            {profile?.hours?.length ? (
                                <ul className="hours">
                                    {profile.hours.map((h) => (
                                        <li key={h.day}>
                                            <span>{h.day}</span>
                                            <span>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <>
                                    <br />
                                    Mon–Fri 10–6, Sat 11–4
                                </>
                            )}
                        </div>
                        <div className="info-tile">
                            <b>Returns</b>
                            30 days, opened or not. Start one from your{" "}
                            <Link className="link" to="/account">
                                account
                            </Link>{" "}
                            and we&rsquo;ll send a prepaid label.
                        </div>

                        <div className="card-box" style={{ marginTop: 12 }}>
                            <h3 className="serif" style={{ fontSize: 24, fontWeight: 400, marginBottom: 14 }}>
                                Send a message
                            </h3>
                            {sent ? (
                                <p style={{ fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                                    ✓ Thanks — we&rsquo;ll reply within one working day.
                                </p>
                            ) : (
                                <form className="form-grid" onSubmit={submit} noValidate>
                                    <div className="field">
                                        <label htmlFor="c-name">Name</label>
                                        <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="c-email">Email</label>
                                        <input
                                            id="c-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="field span">
                                        <label htmlFor="c-topic">Topic</label>
                                        <select id="c-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                                            {TOPICS.map((t) => (
                                                <option key={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field span">
                                        <label htmlFor="c-message">Message</label>
                                        <textarea
                                            id="c-message"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                        />
                                    </div>
                                    {error && (
                                        <p className="span small" style={{ color: "#C0392B" }}>
                                            {error}
                                        </p>
                                    )}
                                    <div className="span">
                                        <button className="btn sm plain" disabled={busy}>
                                            {busy ? "Sending…" : "Send"}
                                            <span className="arr">
                                                <IconArrow />
                                            </span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div id="faq">
                        <div className="eyebrow" style={{ marginBottom: 12 }}>
                            Frequently asked
                        </div>
                        <div className="faq">
                            {faqs.map((f) => (
                                <details key={f.question}>
                                    <summary>{f.question}</summary>
                                    <div className="a">{f.body}</div>
                                </details>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
