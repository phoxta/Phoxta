import { Link } from "react-router-dom";
import type { Product } from "@/data/catalogue";
import { IconArrow, IconHeart } from "@/lib/icons";
import { useMoney } from "@/state/catalog";
import { useCart } from "@/state/cart";
import { useUi } from "@/state/ui";
import { useWishlist } from "@/state/wishlist";

/** The one product card the whole store uses — home shelf, shop grid, related,
 *  upsell and the wishlist — so a change to how a product is presented lands
 *  everywhere at once. */
export default function ProductCard({ product }: { product: Product }) {
    const money = useMoney();
    const { add } = useCart();
    const { open, toast } = useUi();
    const { has, toggle } = useWishlist();

    const soldOut = product.stock <= 0;
    const saved = has(product.slug);
    const defaultSize = product.sizes[0];
    const badge = product.bestseller
        ? "Best seller"
        : product.isNew
          ? "New"
          : product.compareAtCents
            ? `Save ${Math.round((1 - product.priceCents / product.compareAtCents) * 100)}%`
            : null;

    return (
        <article className="product">
            <div className="img">
                <Link to={`/product/${product.slug}`}>
                    <img src={product.img} alt={product.name} width={520} height={650} loading="lazy" />
                </Link>
                {badge && <span className="tag">{badge}</span>}
                <button
                    type="button"
                    className={`cart wish-btn${saved ? " on" : ""}`}
                    aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
                    aria-pressed={saved}
                    onClick={() => toast(toggle(product.slug) ? "Saved to wishlist" : "Removed from wishlist")}
                >
                    <IconHeart filled={saved} />
                </button>
                {soldOut ? (
                    <div className="oos">
                        <span>Sold out — notify me</span>
                    </div>
                ) : (
                    <div className="bar">
                        <button
                            type="button"
                            className="buy"
                            onClick={() => {
                                add(product, defaultSize);
                                toast(`${product.name} added to bag`, { to: "/cart", label: "View bag" });
                                open("cart");
                            }}
                        >
                            Add to bag
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </button>
                        <span className="price">{money(product.priceCents)}</span>
                    </div>
                )}
            </div>
            <div className="info">
                <div>
                    <div className="name">
                        <Link to={`/product/${product.slug}`}>{product.name}</Link>
                    </div>
                    {product.tagline && <div className="desc">{product.tagline}</div>}
                </div>
                <span className="size">{defaultSize.label}</span>
            </div>
        </article>
    );
}
