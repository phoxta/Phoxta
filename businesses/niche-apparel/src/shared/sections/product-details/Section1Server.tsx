import Section1Interactive from "./Section1Interactive";
import { detailGallery, type Product } from "@/data/products";

export default function Section1Server({ product }: { product: Product }) {
    const gallery = [product.img, ...detailGallery.slice(0, 5)];
    return (
        <section className="sec-1-shop-details overflow-hidden pt-150">
            <div className="container">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="row g-3">
                            {gallery.map((src, i) => (
                                <div key={i} className="col-md-6">
                                    <div className="product-card">
                                        <div className="product-card__inner">
                                            <div className="product-card__thumb">
                                                <div className="product-card__img-link d-flex justify-content-center align-items-end">
                                                    <img
                                                        className="product-card__img"
                                                        src={src}
                                                        alt={product.title}
                                                        width={408}
                                                        height={476}
                                                        style={{ width: "100%", height: "auto" }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <Section1Interactive product={product} />
                    </div>
                </div>
            </div>
        </section>
    );
}
