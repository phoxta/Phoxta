import { Link } from "react-router-dom";
import { STORE } from "@/config/brand";
import { IconArrow, IconClose } from "@/lib/icons";
import { useMoney } from "@/state/catalog";
import { useCart } from "@/state/cart";
import { useUi } from "@/state/ui";

/** The bag drawer. Deliberately a summary only: shipping and discounts are shown
 *  at checkout, where the server has priced them. */
export default function MiniCart() {
    const { overlay, close } = useUi();
    const { lines, subtotalCents, setQty, remove } = useCart();
    const money = useMoney();

    const remaining = Math.max(0, STORE.freeShippingThresholdCents - subtotalCents);
    const progress = Math.min(100, (subtotalCents / STORE.freeShippingThresholdCents) * 100);

    return (
        <aside className={`drawer${overlay === "cart" ? " open" : ""}`} aria-hidden={overlay !== "cart"}>
            <div className="d-head">
                <b>Your bag</b>
                <button type="button" className="icon-btn" onClick={close} aria-label="Close bag">
                    <IconClose />
                </button>
            </div>

            <div className="d-body">
                {lines.length === 0 ? (
                    <div className="empty">
                        <b>Your bag is empty</b>
                        Add a ritual or two.
                        <br />
                        <br />
                        <Link className="btn sm" to="/shop" onClick={close}>
                            Shop best-sellers
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="ship-bar">
                            {remaining > 0 ? (
                                <>
                                    Add <b>{money(remaining)}</b> for free UK delivery
                                </>
                            ) : (
                                <b>You&rsquo;ve unlocked free UK delivery</b>
                            )}
                            <div className="bar">
                                <i style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        {lines.map((l) => (
                            <div className="line" key={`${l.productId}__${l.size}`}>
                                <div className="ph">
                                    <img src={l.img} alt="" width={72} height={88} loading="lazy" />
                                </div>
                                <div>
                                    <b>{l.name}</b>
                                    <small>
                                        {l.sizeLabel} · {money(l.unitPriceCents)}
                                    </small>
                                    <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
                                        <div className="qty sm">
                                            <button
                                                type="button"
                                                onClick={() => setQty(l.productId, l.size, l.qty - 1)}
                                                aria-label={`Reduce quantity of ${l.name}`}
                                            >
                                                &minus;
                                            </button>
                                            <span>{l.qty}</span>
                                            <button
                                                type="button"
                                                onClick={() => setQty(l.productId, l.size, l.qty + 1)}
                                                aria-label={`Increase quantity of ${l.name}`}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="rm"
                                            onClick={() => remove(l.productId, l.size)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <div className="amt">{money(l.unitPriceCents * l.qty)}</div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {lines.length > 0 && (
                <div className="d-foot">
                    <div className="sum">
                        <span>Subtotal</span>
                        <b>{money(subtotalCents)}</b>
                    </div>
                    <p className="small muted" style={{ marginBottom: 12 }}>
                        Shipping and discounts calculated at checkout.
                    </p>
                    <Link className="btn block" to="/checkout" onClick={close}>
                        Checkout
                        <span className="arr">
                            <IconArrow />
                        </span>
                    </Link>
                    <Link
                        className="link"
                        to="/cart"
                        onClick={close}
                        style={{ display: "block", textAlign: "center", marginTop: 12 }}
                    >
                        View full bag
                    </Link>
                </div>
            )}
        </aside>
    );
}
