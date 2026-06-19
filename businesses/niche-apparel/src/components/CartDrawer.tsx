import { Link } from "react-router-dom";
import { useCart } from "@/util/cart";

export default function CartDrawer() {
    const { lines, subtotal, open, setOpen, setQty, remove } = useCart();
    return (
        <>
            <div
                onClick={() => setOpen(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s" }}
            />
            <aside
                className="bg-neutral-0 d-flex flex-column"
                style={{ position: "fixed", top: 0, right: 0, width: 420, maxWidth: "92vw", height: "100vh", zIndex: 2001, transform: open ? "translateX(0)" : "translateX(105%)", transition: "transform .4s cubic-bezier(.4,0,.2,1)", boxShadow: "-10px 0 60px rgba(0,0,0,.18)" }}
            >
                <div className="d-flex align-items-center justify-content-between p-4 border-bottom border-100">
                    <h5 className="fw-600 mb-0">Your Bag ({lines.length})</h5>
                    <button className="btn p-0 fz-24 lh-1" onClick={() => setOpen(false)} aria-label="Close">×</button>
                </div>
                <div className="flex-grow-1 overflow-auto p-4">
                    {lines.length === 0 ? (
                        <p className="text-center neutral-500 py-5">Your bag is empty.</p>
                    ) : (
                        lines.map((l) => (
                            <div key={l.id + l.size + l.color} className="d-flex gap-3 pb-3 mb-3 border-bottom border-100">
                                <img src={l.img} alt={l.title} width={70} height={90} style={{ objectFit: "cover", borderRadius: 8 }} />
                                <div className="flex-grow-1">
                                    <p className="fz-13 neutral-500 mb-0">{l.brand}</p>
                                    <h6 className="fw-600 mb-1">{l.title}</h6>
                                    <p className="fz-13 neutral-500 mb-1">Size {l.size}{l.color ? ` · ${l.color}` : ""}</p>
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-inline-flex align-items-center border border-100 rounded">
                                            <button className="btn btn-sm px-2 py-0" onClick={() => setQty(l.id, l.size, l.color, l.qty - 1)}>−</button>
                                            <span className="px-2 fz-14">{l.qty}</span>
                                            <button className="btn btn-sm px-2 py-0" onClick={() => setQty(l.id, l.size, l.color, l.qty + 1)}>+</button>
                                        </div>
                                        <span className="fw-600">${(l.price * l.qty).toFixed(2)}</span>
                                    </div>
                                </div>
                                <button className="btn p-0 neutral-400" onClick={() => remove(l.id, l.size, l.color)} aria-label="Remove">×</button>
                            </div>
                        ))
                    )}
                </div>
                {lines.length > 0 && (
                    <div className="p-4 border-top border-100">
                        <div className="d-flex justify-content-between fw-600 fz-18 mb-3"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                        <Link to="/checkout" onClick={() => setOpen(false)} className="at-btn bg-dark text-white w-100" style={{ justifyContent: "center" }}>
                            <span><span className="text-1">Checkout</span><span className="text-2">Checkout</span></span>
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
}
