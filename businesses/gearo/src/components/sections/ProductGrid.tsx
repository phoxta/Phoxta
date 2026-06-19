import ProductCard from "@/components/common/ProductCard";
import type { Product } from "@/util/products";

export default function ProductGrid({ title, subtitle, items }: { title: string; subtitle?: string; items: Product[] }) {
    return (
        <section className="flat-spacing-5 pt-0">
            <div className="container">
                <div className="row">
                    <div className="col-12">
                        <div className="heading-section text-center">
                            <h3 className="wow fadeInUp">{title}</h3>
                            {subtitle && <p className="text-body-default text_secondary wow fadeInUp">{subtitle}</p>}
                        </div>
                        <div className="tf-grid-layout tf-col-2 lg-col-4">
                            {items.map((p) => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
