import Layout from "@/components/layout/Layout";
import Link from "@/components/common/Link";
import { useState } from "react";
import { useOrgContent } from "@/util/content";
import { fetchFaqs, type Faq } from "@/lib/phoxta";

const FALLBACK: Faq[] = [
    { id: "1", question: "How do I make a reservation?", body: "Browse the fleet, pick your dates, and complete checkout — you'll get a confirmation by email right away.", category: "General", sort: 0 },
    { id: "2", question: "What do I need to rent a car?", body: "A valid driving licence, a payment card and a booking reference. That's it.", category: "General", sort: 1 },
    { id: "3", question: "Can I change or cancel my booking?", body: "Yes — contact us with your reference and we'll help you adjust or cancel where possible.", category: "General", sort: 2 },
    { id: "4", question: "Do you offer refunds?", body: "Refunds follow our standard policy; reach out to support and we'll sort it out quickly.", category: "General", sort: 3 },
];

export default function Faqs() {
    const faqs = useOrgContent(fetchFaqs, FALLBACK);
    const [open, setOpen] = useState<string | null>(null);
    const mid = Math.ceil(faqs.length / 2);
    const cols = [faqs.slice(0, mid), faqs.slice(mid)];

    const Item = ({ f }: { f: Faq }) => (
        <div className="mb-2 card border">
            <div className="px-0 card-header border-0 bg-gradient-1 background-card">
                <a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" style={{ cursor: "pointer" }} onClick={() => setOpen((p) => (p === f.id ? null : f.id))}>
                    <p className="text-lg-bold neutral-1000 pe-4 mb-0">{f.question}</p>
                    <span className="ms-auto arrow me-2">
                        <svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
                            <path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </a>
            </div>
            <div className={`collapse ${open === f.id ? "show" : ""}`}>
                <p className="pt-0 pb-4 px-3 card-body background-body mb-0">{f.body}</p>
            </div>
        </div>
    );

    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-faqs-2 pt-80 pb-80 background-body">
                    <div className="container">
                        <div className="text-center mb-40">
                            <h3 className="my-3 neutral-1000">Frequently Asked Questions</h3>
                            <p className="text-xl-medium neutral-500">Any questions? We would be happy to help you. <Link href="/contact">Contact us</Link>.</p>
                        </div>
                        <div className="row">
                            {cols.map((col, ci) => (
                                <div className="col-lg-6" key={ci}>
                                    <div className="accordion">{col.map((f) => <Item key={f.id} f={f} />)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
