import { useState } from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";

const FAQS = [
    ["How long does delivery take?", "Most orders ship within 24 hours and arrive in 2–5 business days."],
    ["What is your return policy?", "Returns are accepted within 30 days of delivery in original condition."],
    ["Do you offer assembly?", "Larger furniture items include step-by-step guides; assembly service is available at checkout in select areas."],
    ["Is there a warranty?", "Yes — all furniture comes with a 2-year warranty against manufacturing defects."],
];

export default function Faqs() {
    const [open, setOpen] = useState(0);
    return (
        <Layout>
            <Breadcrumb title="FAQs" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            {FAQS.map(([q, a], i) => (
                                <div key={i} style={{ border: "1px solid #eee", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
                                    <button onClick={() => setOpen(open === i ? -1 : i)} className="d-flex justify-content-between align-items-center w-100 text-title" style={{ border: 0, background: "none", padding: "16px 20px", textAlign: "left", fontWeight: 600 }}>
                                        {q}<span>{open === i ? "−" : "+"}</span>
                                    </button>
                                    {open === i && <div className="text-body-default text_secondary" style={{ padding: "0 20px 18px" }}>{a}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
