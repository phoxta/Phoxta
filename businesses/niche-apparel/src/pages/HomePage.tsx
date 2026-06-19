import { Link } from "react-router-dom";
import FashionCard from "@/components/FashionCard";
import { useCatalog } from "@/util/catalog";

const CATS = [
    { label: "Women", to: "/shop?c=woman", img: "/assets/imgs/pages/product/img-shop-4.webp" },
    { label: "Men", to: "/shop?c=man", img: "/assets/imgs/pages/product/img-shop-5.webp" },
    { label: "New In", to: "/shop?c=new", img: "/assets/imgs/pages/product/img-shop-6.webp" },
];

export default function HomePage() {
    const { products } = useCatalog(); // live per-tenant catalogue (New Arrivals)
    return (
        <>
            {/* HERO — contained card (header sits on the light band above it) */}
            <section className="pt-150 pb-40">
                <div className="container">
                    <div className="p-relative rounded-4 overflow-hidden" style={{ height: "clamp(460px, 72vh, 760px)" }}>
                        <img className="w-100 h-100" src="/assets/imgs/pages/product/img-shop-3.webp" alt="Aurelia Autumn Winter" style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(20,18,16,.62) 0%, rgba(20,18,16,.25) 45%, rgba(20,18,16,0) 75%)" }} />
                        <div className="p-relative h-100 d-flex align-items-center">
                            <div className="px-4 px-lg-5" style={{ maxWidth: 620 }}>
                                <p className="text-white text-uppercase mb-3" style={{ letterSpacing: 4, fontSize: 13, opacity: 0.85 }}>Autumn / Winter 2026</p>
                                <h1 className="text-white fw-600 lh-1 mb-3" style={{ fontSize: "clamp(40px, 5.5vw, 84px)" }}>Effortless<br />modern wardrobe</h1>
                                <p className="text-white mb-4" style={{ maxWidth: 440, fontSize: 17, opacity: 0.8 }}>Considered essentials designed to last — delivered to your door, with an AI stylist to help you choose.</p>
                                <div className="d-flex gap-3 flex-wrap">
                                    <Link to="/shop?c=new" className="at-btn bg-white text-dark"><span><span className="text-1">Shop New In</span><span className="text-2">Shop New In</span></span></Link>
                                    <Link to="/shop?c=woman" className="at-btn bg-transparent text-white" style={{ border: "1px solid rgba(255,255,255,.45)" }}><span><span className="text-1">Shop Women</span><span className="text-2">Shop Women</span></span></Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CATEGORIES */}
            <section className="pt-80 pb-40">
                <div className="container">
                    <div className="row g-3">
                        {CATS.map((c) => (
                            <div className="col-md-4" key={c.label}>
                                <Link to={c.to} className="p-relative rounded-4 fix d-block text-decoration-none hover-effect-1">
                                    <img className="img-cover" src={c.img} alt={c.label} width={600} height={720} style={{ height: 440, objectFit: "cover", width: "100%" }} loading="lazy" />
                                    <div className="p-absolute bottom-0 start-0 m-4">
                                        <h3 className="fw-600 text-white mb-2">{c.label}</h3>
                                        <span className="at-btn bg-white text-dark"><span><span className="text-1">Shop Now</span><span className="text-2">Shop Now</span></span></span>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NEW ARRIVALS */}
            <section className="pt-60 pb-40">
                <div className="container">
                    <div className="d-flex flex-wrap justify-content-between align-items-end mb-40">
                        <div>
                            <p className="section-label text-primary fw-600 text-uppercase mb-2" style={{ letterSpacing: 3 }}>Just In</p>
                            <h2 className="fw-600 mb-0">New Arrivals</h2>
                        </div>
                        <Link to="/shop" className="at-btn bg-dark text-white"><span><span className="text-1">View All</span><span className="text-2">View All</span></span></Link>
                    </div>
                    <div className="row g-3">
                        {products.slice(0, 8).map((p) => (
                            <div className="col-xxl-3 col-lg-4 col-md-6 col-12" key={p.id}><FashionCard product={p} /></div>
                        ))}
                    </div>
                </div>
            </section>

            {/* EDITORIAL PROMO */}
            <section className="pt-40 pb-80">
                <div className="container">
                    <div className="row g-3">
                        <div className="col-md-7">
                            <div className="p-relative rounded-4 fix h-100">
                                <img className="img-cover w-100 h-100" src="/assets/imgs/pages/product/img-shop-1.webp" alt="New season" style={{ minHeight: 420, objectFit: "cover" }} loading="lazy" />
                                <div className="p-absolute bottom-0 start-0 m-lg-5 m-4">
                                    <h3 className="fw-600 text-white mb-2">The New Season<br />Edit</h3>
                                    <h6 className="fw-500 text-white opacity-75 mb-4">Free shipping on orders over $100</h6>
                                    <Link to="/shop?c=new" className="at-btn bg-white text-dark"><span><span className="text-1">Explore</span><span className="text-2">Explore</span></span></Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-5">
                            <div className="p-relative rounded-4 fix h-100">
                                <img className="img-cover w-100 h-100" src="/assets/imgs/pages/product/img-shop-2.webp" alt="Sale" style={{ minHeight: 420, objectFit: "cover" }} loading="lazy" />
                                <div className="p-absolute bottom-0 start-0 m-lg-5 m-4">
                                    <h3 className="fw-600 text-white mb-2">Sale<br />Up to 40% off</h3>
                                    <Link to="/shop?c=sale" className="at-btn bg-white text-dark"><span><span className="text-1">Shop Sale</span><span className="text-2">Shop Sale</span></span></Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
