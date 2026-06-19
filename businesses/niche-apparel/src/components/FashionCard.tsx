import { Link } from "react-router-dom";
import { money, type Product } from "@/data/products";
import { useCart } from "@/util/cart";

// Fashion product card in the Phoxta design system (`product-card` classes).
export default function FashionCard({ product }: { product: Product }) {
    const { add } = useCart();
    const link = `/product-details/${product.id}`;
    return (
        <div className="product-card mb-30">
            <div className="product-card__inner">
                <div className="product-card__thumb hover-effect-1 p-relative">
                    <Link to={link} className="product-card__img-link">
                        <img src={product.img} className="product-card__img" alt={product.title} width={400} height={500} loading="lazy" />
                    </Link>
                    {product.isNew && <span className="p-absolute top-0 start-0 m-3 bg-dark text-white px-3 py-1 fz-12 fw-600 rounded-pill">New</span>}
                    {product.sale && <span className="p-absolute top-0 start-0 m-3 bg-danger text-white px-3 py-1 fz-12 fw-600 rounded-pill">Sale</span>}
                    <button
                        type="button"
                        onClick={() => add({ id: product.id, title: product.title, brand: product.brand, price: product.price, img: product.img, size: product.sizes[0], color: product.colors[0] })}
                        className="at-btn bg-white text-dark p-absolute bottom-0 start-0 end-0 m-3"
                        style={{ justifyContent: "center" }}
                    >
                        <span><span className="text-1">Add to Bag</span><span className="text-2">Add to Bag</span></span>
                    </button>
                </div>
                <div className="product-card__content">
                    <p className="product-card__brand">{product.brand}</p>
                    <div className="product-card__row">
                        <h6 className="product-card__title">
                            <Link to={link} className="product-card__title-link">{product.title}</Link>
                        </h6>
                        <p className="product-card__price">
                            {product.oldPrice && <span className="neutral-400 text-decoration-line-through me-2 fw-400">{money(product.oldPrice)}</span>}
                            {money(product.price)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
