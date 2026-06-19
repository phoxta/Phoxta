import RLink from "@/components/common/RLink";
import { money, type Product } from "@/util/products";
import { useCart } from "@/util/cart";
import { useWishlist } from "@/util/wishlist";

// Product card — converted from the template's `.card-product.style-1`.
export default function ProductCard({ product }: { product: Product }) {
    const { add } = useCart();
    const { has, toggle } = useWishlist();
    return (
        <div className="card-product style-1">
            <div className="card-product-wrapper">
                <RLink to="product-detail.html" className="image-wrap">
                    <img className="img-product" src={product.img} alt={product.title} width={400} height={400} />
                    <img className="img-hover" src={product.imgHover} alt={product.title} width={400} height={400} />
                </RLink>
                {product.sale && (
                    <div className="on-sale-wrap"><span className="on-sale-item">{product.sale}</span></div>
                )}
                <div className="list-product-btn">
                    <a href="#" onClick={(e) => { e.preventDefault(); toggle(product.id); }} className={`box-icon wishlist btn-icon-action${has(product.id) ? " active" : ""}`}>
                        <span className="icon icon-heart" style={has(product.id) ? { color: "#e11d48" } : undefined} /><span className="tooltip">{has(product.id) ? "Saved" : "Wishlist"}</span>
                    </a>
                    <a href="#" onClick={(e) => e.preventDefault()} className="box-icon compare">
                        <span className="icon icon-compare" /><span className="tooltip">Compare</span>
                    </a>
                    <RLink to="product-detail.html" className="box-icon quickview">
                        <span className="icon icon-eye" /><span className="tooltip">Quick View</span>
                    </RLink>
                </div>
                <div className="list-btn-main">
                    <a href="#" onClick={(e) => { e.preventDefault(); add(product); }} className="btn-main-product">Add To cart</a>
                </div>
            </div>
            <div className="card-product-info">
                <RLink to="product-detail.html" className="text-title title link">{product.title}</RLink>
                <div className="price text-body-default">
                    {product.oldPrice && <span className="text-caption-1 old-price">{money(product.oldPrice)}</span>} {money(product.price)}
                </div>
                <ul className="list-color-product">
                    {product.colors.map((c, i) => (
                        <li key={i} className={`list-color-item color-swatch${i === 0 ? " active" : ""}`}>
                            <span className="d-none text-capitalize color-filter">{c.name}</span>
                            <span className={`swatch-value ${c.cls}`} />
                            <img src={product.img} alt={c.name} width={400} height={400} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
