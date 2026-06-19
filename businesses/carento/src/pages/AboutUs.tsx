import Layout from "@/components/layout/Layout";
import { useOrgContent } from "@/util/content";
import { fetchCms } from "@/lib/phoxta";

const FALLBACK = { title: "About us", body: "We're on a mission to make car rental effortless. Every vehicle, booking and message here is real and managed in one place." };

export default function AboutUs() {
    const page = useOrgContent((o) => fetchCms(o, "about"), FALLBACK);
    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-box pt-80 pb-80 background-body">
                    <div className="container" style={{ maxWidth: 860 }}>
                        <h2 className="neutral-1000 mb-4">{page?.title}</h2>
                        {(page?.body || "").split("\n").filter(Boolean).map((p, i) => (
                            <p className="text-lg-medium neutral-700 mb-3" key={i}>{p}</p>
                        ))}
                    </div>
                </section>
            </div>
        </Layout>
    );
}
