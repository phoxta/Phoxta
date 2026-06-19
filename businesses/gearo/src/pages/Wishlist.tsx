import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductCard from "@/components/common/ProductCard";
import RLink from "@/components/common/RLink";
import { useCatalog } from "@/util/catalog";
import { useWishlist } from "@/util/wishlist";

export default function Wishlist() {
    const { products } = useCatalog();
    const { ids } = useWishlist();
    const saved = products.filter((p) => ids.includes(p.id));
    return (
        <Layout>
            <Breadcrumb title="Wishlist" />
            <section className="flat-spacing-5">
                <div className="container">
                    {saved.length === 0 ? (
                        <div className="text-center" style={{ padding: "60px 0" }}>
                            <p className="text-body-1 mb-3">Your wishlist is empty.</p>
                            <RLink to="shop-default.html" className="tf-btn btn-fill">Browse products</RLink>
                        </div>
                    ) : (
                        <div className="tf-grid-layout tf-col-2 lg-col-4">
                            {saved.map((p) => <ProductCard key={p.id} product={p} />)}
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
