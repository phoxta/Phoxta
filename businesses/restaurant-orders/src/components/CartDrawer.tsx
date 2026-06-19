import { Link } from "react-router-dom";
import { useCart } from "@/util/cart";
import { money } from "@/data/menu";

export default function CartDrawer() {
    const { lines, subtotal, open, setOpen, setQty, remove } = useCart();
    return (
        <>
            <div className={`cart-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />
            <aside className={`cart-drawer${open ? " open" : ""}`} aria-hidden={!open}>
                <div className="cart-head">
                    <h3>Your Order</h3>
                    <button onClick={() => setOpen(false)} aria-label="Close"><i className="fas fa-times" /></button>
                </div>
                <div className="cart-body">
                    {lines.length === 0 ? (
                        <div className="cart-empty">
                            <i className="fas fa-utensils" style={{ fontSize: 28, marginBottom: 12, display: "block" }} />
                            Your order is empty.
                        </div>
                    ) : (
                        lines.map((l) => (
                            <div className="cart-line" key={l.lineId}>
                                <img src={l.dish.img} alt={l.dish.name} />
                                <div className="cart-line-main">
                                    <h4>{l.dish.name}</h4>
                                    {l.options.length > 0 && <div style={{ fontSize: 12, color: "var(--text-light)" }}>{l.options.map((o) => o.label).join(", ")}</div>}
                                    {l.note && <div style={{ fontSize: 12, color: "var(--text-light)", fontStyle: "italic" }}>“{l.note}”</div>}
                                    <div className="price">{money(l.unitPrice)}</div>
                                    <div className="qty">
                                        <button onClick={() => setQty(l.lineId, l.qty - 1)}>−</button>
                                        <span>{l.qty}</span>
                                        <button onClick={() => setQty(l.lineId, l.qty + 1)}>+</button>
                                    </div>
                                </div>
                                <button onClick={() => remove(l.lineId)} style={{ background: "none", border: "none", color: "#a8a29e", cursor: "pointer" }} aria-label="Remove">
                                    <i className="fas fa-trash-alt" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                {lines.length > 0 && (
                    <div className="cart-foot">
                        <div className="cart-total"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                        <Link to="/checkout" className="btn-accent" style={{ width: "100%", justifyContent: "center", borderRadius: 8 }} onClick={() => setOpen(false)}>
                            Checkout
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
}
