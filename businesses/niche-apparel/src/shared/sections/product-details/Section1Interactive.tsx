import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TabsInteractive from "@/shared/common/Tabs";
import { money, type Product } from "@/data/products";
import { useCart } from "@/util/cart";
import { fetchVariants, type Variant } from "@/lib/phoxta";

const ARROW_SVG = (
    <svg width="14" height="14" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 0 9.9375 0L3.1875 0C2.77329 0 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

const COLOR_HEX: Record<string, string> = {
    Camel: "#c19a6b", Charcoal: "#36454f", Ivory: "#fffdf2", Noir: "#1c1c1c", White: "#ffffff",
    Sand: "#c2b280", Oat: "#e3d9c6", Slate: "#5b6770", Olive: "#6b6b3a", Black: "#1c1c1c",
    Navy: "#1f2a44", Stone: "#a8a29e", Cream: "#f2f1f0", Sky: "#9fc3d8", Indigo: "#3b3f7a",
    Ecru: "#d6cbb3", Rose: "#e8b4b8", Khaki: "#bdb293", Grey: "#9ca3af",
};
const hexFor = (name: string) => COLOR_HEX[name] ?? "#cccccc";

export default function Section1Interactive({ product }: { product: Product }) {
    const { add } = useCart();
    const navigate = useNavigate();
    const [selectedSize, setSelectedSize] = useState(product.sizes[1] ?? product.sizes[0]);
    const [selectedColor, setSelectedColor] = useState(product.colors[0]);
    const [quantity, setQuantity] = useState(1);
    const [variants, setVariants] = useState<Variant[]>([]);

    useEffect(() => {
        fetchVariants(product.id).then(setVariants);
    }, [product.id]);

    const hasVariants = variants.length > 0;
    const stockOf = (size: string, color: string) => variants.find((v) => v.size === size && v.color === color)?.stock ?? 0;
    const sizeAvailable = (size: string) => !hasVariants || variants.some((v) => v.size === size && v.color === selectedColor && v.stock > 0);
    const colorAvailable = (color: string) => !hasVariants || variants.some((v) => v.color === color && v.stock > 0);
    const selectedStock = hasVariants ? stockOf(selectedSize, selectedColor) : null;
    const inStock = selectedStock === null || selectedStock > 0;

    const incrementQty = () => setQuantity((q) => q + 1);
    const decrementQty = () => setQuantity((q) => (q > 1 ? q - 1 : q));

    const addToBag = () => add({ id: product.id, title: product.title, brand: product.brand, price: product.price, img: product.img, size: selectedSize, color: selectedColor }, quantity);
    const buyNow = () => { addToBag(); navigate("/checkout"); };

    const PRODUCT_TABS = [
        {
            id: "tab-description",
            title: "Description",
            linkClassName: "bg-transparent",
            content: (
                <>
                    <p className="content-product-right__tab-lead neutral-900">
                        The {product.title} from {product.brand} brings simplicity, versatility and premium comfort to your wardrobe. Crafted from considered materials with a refined, modern silhouette, it&apos;s designed to layer easily and wear effortlessly.
                    </p>
                    <p className="neutral-900">
                        A clean cut and careful finishing make it suitable for everyday wear or dressed-up moments, while durable construction ensures it lasts season after season. The {product.colors[0].toLowerCase()} tone pairs beautifully with the rest of the collection.
                    </p>
                    <p className="neutral-900">
                        Whether you&apos;re building a capsule wardrobe or looking for a dependable everyday staple, the {product.title} keeps your style understated, confident and effortlessly modern.
                    </p>
                </>
            ),
        },
        {
            id: "tab-additional",
            title: "Additional information",
            linkClassName: "bg-transparent",
            content: (
                <table className="content-product-right__spec-table">
                    <tbody>
                        <tr><th>Type</th><td>{product.type}</td></tr>
                        <tr><th>Colours</th><td>{product.colors.join(", ")}</td></tr>
                        <tr><th>Sizes</th><td>{product.sizes.join(", ")}</td></tr>
                        <tr><th>Care</th><td>Follow the garment care label</td></tr>
                    </tbody>
                </table>
            ),
        },
        {
            id: "tab-reviews",
            title: "Reviews (0)",
            linkClassName: "bg-transparent",
            content: (
                <p className="content-product-right__no-reviews">
                    There are no reviews yet. Be the first to review &quot;{product.title}&quot;.
                </p>
            ),
        },
    ];

    return (
        <div className="content-product-right px-lg-5 pt-30">
            <div className="content-product-right__top d-flex flex-wrap align-items-center gap-3 mb-2">
                <span className="content-product-right__badge">{inStock ? (selectedStock !== null ? `${selectedStock} in stock` : "In Stock") : "Out of stock"}</span>
                <span className="content-product-right__brand">{product.brand.toUpperCase()}</span>
            </div>
            <h5 className="content-product-right__title">{product.title}</h5>
            <h6 className="content-product-right__price">
                {product.oldPrice && <span className="neutral-400 text-decoration-line-through me-2 fw-400">{money(product.oldPrice)}</span>}
                {money(product.price)}
            </h6>
            <p className="content-product-right__shipping">Shipping calculated at checkout.</p>
            <div className="content-product-right__excerpt mb-4 w-75">
                <p className="content-product-right__excerpt-text">
                    <span className="content-product-right__excerpt-text-content">
                        A considered {product.type.toLowerCase()} piece with a clean silhouette — everyday comfort with effortless, modern style.
                    </span>
                </p>
            </div>

            {/* Size */}
            <div className="content-product-right__option mb-4">
                <label className="content-product-right__option-label">Size</label>
                <div className="content-product-right__sizes">
                    {product.sizes.map((size) => (
                        <button
                            key={size}
                            type="button"
                            className={`content-product-right__size ${selectedSize === size ? "active" : ""}`}
                            data-size={size}
                            disabled={!sizeAvailable(size)}
                            style={!sizeAvailable(size) ? { opacity: 0.35, textDecoration: "line-through" } : undefined}
                            onClick={() => setSelectedSize(size)}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Color */}
            <div className="content-product-right__option mb-4">
                <label className="content-product-right__option-label">Color: {selectedColor}</label>
                <div className="content-product-right__colors">
                    {product.colors.map((name) => (
                        <button
                            key={name}
                            type="button"
                            className={`content-product-right__color ${selectedColor === name ? "active" : ""}`}
                            data-color={name}
                            title={colorAvailable(name) ? name : `${name} (out of stock)`}
                            style={{ backgroundColor: hexFor(name), ...(colorAvailable(name) ? {} : { opacity: 0.3 }) }}
                            onClick={() => setSelectedColor(name)}
                            aria-label={name}
                        />
                    ))}
                </div>
            </div>

            {/* Quantity + Add to cart */}
            <div className="content-product-right__option content-product-right__option--qty mb-4">
                <label className="content-product-right__option-label">Quantity</label>
                <div className="content-product-right__actions d-flex flex-wrap align-items-center gap-3">
                    <div className="content-product-right__qty">
                        <button type="button" className="content-product-right__qty-btn qty-down" aria-label="Decrease" onClick={decrementQty}>−</button>
                        <span className="content-product-right__qty-val qty-val" aria-live="polite">{quantity}</span>
                        <button type="button" className="content-product-right__qty-btn qty-up" aria-label="Increase" onClick={incrementQty}>+</button>
                    </div>
                    <button type="button" onClick={addToBag} disabled={!inStock} className="at-btn content-product-right__btn content-product-right__btn--outline">
                        <span className="text-nowrap">
                            <span className="text-1">ADD TO CART</span>
                            <span className="text-2">ADD TO CART</span>
                        </span>
                        <i className="icon-arrow-up-right">{ARROW_SVG}{ARROW_SVG}</i>
                    </button>
                </div>
            </div>

            <div className="w-75 mb-40">
                <button type="button" onClick={buyNow} disabled={!inStock} className="at-btn content-product-right__btn content-product-right__btn--primary w-100 mb-4">
                    <span><span className="text-1">BUY IT NOW</span><span className="text-2">BUY IT NOW</span></span>
                    <i className="icon-arrow-up-right">{ARROW_SVG}{ARROW_SVG}</i>
                </button>
            </div>

            <div className="content-product-right__meta row mb-4">
                <div className="col-md-6">
                    <p className="content-product-right__meta-item"><strong>SKU:</strong> {product.id.toUpperCase()}</p>
                    <p className="content-product-right__meta-item"><strong>Category:</strong> {product.category === "woman" ? "Women" : "Men"} · {product.type}</p>
                    <p className="content-product-right__meta-item"><strong>Brand:</strong> {product.brand}</p>
                </div>
                <div className="col-md-6">
                    <ul className="content-product-right__benefits">
                        <li>Free shipping over $100</li>
                        <li>60-day easy returns</li>
                        <li>Secure checkout</li>
                        <li>Ask the AI Stylist</li>
                    </ul>
                </div>
            </div>

            <div className="content-product-right__tabs">
                <TabsInteractive
                    tabs={PRODUCT_TABS}
                    defaultActiveId="tab-description"
                    navClassName="nav nav-tabs content-product-right__tab-nav"
                    paneClassName="tab-content content-product-right__tab-content pt-4"
                />
            </div>
        </div>
    );
}
