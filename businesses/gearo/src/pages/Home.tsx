import Layout from "@/components/layout/Layout";
import Hero from "@/components/sections/Hero";
import Categories from "@/components/sections/Categories";
import ProductGrid from "@/components/sections/ProductGrid";
import Testimonials from "@/components/sections/Testimonials";
import BlogNews from "@/components/sections/BlogNews";
import RLink from "@/components/common/RLink";
import { useCatalog } from "@/util/catalog";

export default function Home() {
    const { products } = useCatalog();
    return (
        <Layout>
            <Hero />
            <Categories />
            <ProductGrid title="Our Picks For You" subtitle="Fresh styles just in! Elevate your workspace." items={products.slice(0, 8)} />

            {/* Promo banner */}
            <section className="flat-spacing-2 pt-0">
                <div className="container">
                    <div className="tf-banner-cls" style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
                        <img src="/images/banner/banner-1.jpg" alt="Elevate your office" width={1400} height={420} style={{ width: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "6%" }}>
                            <h2 className="text_white mb-2">Elevate Your Office</h2>
                            <p className="text_white mb-3" style={{ maxWidth: 420 }}>Stylish, ergonomic furniture designed for the way you work.</p>
                            <RLink to="shop-default.html" className="tf-btn btn-white" style={{ alignSelf: "flex-start" }}>Explore Collection <i className="icon-arrow-up-right" /></RLink>
                        </div>
                    </div>
                </div>
            </section>

            <ProductGrid title="On Sale Now" subtitle="Limited-time savings on workspace essentials." items={products.filter((p) => p.sale)} />
            <Testimonials />
            <BlogNews />
        </Layout>
    );
}
