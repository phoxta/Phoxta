import { Link } from "react-router-dom";
import { useOrgContent } from "@/util/content";
import { fetchCms } from "@/lib/phoxta";

const VALUES = [
    ["Considered design", "Fewer, better pieces — versatile silhouettes built to outlast trends."],
    ["Responsible making", "Natural and certified fabrics, with packaging that's fully recyclable."],
    ["A stylist for everyone", "Our AI stylist helps you choose, fit and build outfits — instantly."],
];

const FALLBACK = {
    title: "The brand behind the clothes",
    body: "Aurelia began with a simple idea: a wardrobe should feel effortless. We design modern essentials with honest materials and a quiet confidence — pieces that work as hard as you do, season after season.\nToday that philosophy extends online — shop the full collection, get styled by our AI, and have it delivered with free shipping over $100.",
};

export default function AboutPage() {
    const page = useOrgContent((o) => fetchCms(o, "about"), FALLBACK);
    return (
        <>
            <section className="pt-150 pb-60">
                <div className="container">
                    <div className="row g-5 align-items-center">
                        <div className="col-lg-6">
                            <p className="text-primary fw-600 text-uppercase mb-2" style={{ letterSpacing: 3 }}>Our Story</p>
                            <h1 className="fw-600 mb-4">{page?.title}</h1>
                            {(page?.body || "").split("\n").filter(Boolean).map((p, i) => (
                                <p className="neutral-500 mb-3" key={i}>{p}</p>
                            ))}
                            <Link to="/shop" className="at-btn bg-dark text-white"><span><span className="text-1">Shop the Collection</span><span className="text-2">Shop the Collection</span></span></Link>
                        </div>
                        <div className="col-lg-6">
                            <img className="img-cover w-100 rounded-4" src="/assets/imgs/pages/product/img-shop-1.webp" alt="Aurelia atelier" width={800} height={600} style={{ objectFit: "cover" }} />
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-neutral-50 py-60">
                <div className="container">
                    <div className="row g-4">
                        {VALUES.map(([t, d]) => (
                            <div className="col-md-4" key={t}>
                                <div className="bg-neutral-0 rounded-4 p-4 h-100">
                                    <h5 className="fw-600 mb-2">{t}</h5>
                                    <p className="neutral-500 mb-0">{d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
