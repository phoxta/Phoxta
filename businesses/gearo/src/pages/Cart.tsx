import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import RLink from "@/components/common/RLink";
import { useCart } from "@/util/cart";
import { money } from "@/util/products";

export default function Cart() {
    const { lines, setQty, remove, subtotal } = useCart();

    return (
        <Layout>
            <Breadcrumb title="Shopping Cart" />
            <section className="flat-spacing-4">
                <div className="container">
                    {lines.length === 0 ? (
                        <div className="text-center" style={{ padding: "60px 0" }}>
                            <p className="text-body-1 mb-3">Your cart is empty.</p>
                            <RLink to="shop-default.html" className="tf-btn btn-fill">Continue shopping</RLink>
                        </div>
                    ) : (
                        <div className="row">
                            <div className="col-lg-8">
                                <table className="table" style={{ width: "100%" }}>
                                    <thead>
                                        <tr className="text-title">
                                            <th style={{ textAlign: "left", padding: "12px 0" }}>Product</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l) => (
                                            <tr key={l.product.id} style={{ borderTop: "1px solid #eee" }}>
                                                <td style={{ padding: "16px 0" }}>
                                                    <div className="d-flex align-items-center" style={{ gap: 12 }}>
                                                        <img src={l.product.img} alt={l.product.title} width={72} height={72} style={{ borderRadius: 8 }} />
                                                        <span className="text-title">{l.product.title}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center">{money(l.product.price)}</td>
                                                <td className="text-center">
                                                    <input type="number" min={1} value={l.qty} onChange={(e) => setQty(l.product.id, Number(e.target.value) || 1)} style={{ width: 64, textAlign: "center", border: "1px solid #e5e5e5", borderRadius: 6, height: 36 }} />
                                                </td>
                                                <td className="text-center">{money(l.product.price * l.qty)}</td>
                                                <td className="text-center">
                                                    <button onClick={() => remove(l.product.id)} className="btn-link" style={{ border: 0, background: "none", color: "#999" }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-lg-4">
                                <div className="border-100 rounded-3 p-4" style={{ border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
                                    <h5 className="mb-3">Order Summary</h5>
                                    <div className="d-flex justify-content-between mb-2"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                                    <div className="d-flex justify-content-between mb-3 text_secondary"><span>Shipping</span><span>Calculated at checkout</span></div>
                                    <div className="d-flex justify-content-between mb-3 text-title" style={{ fontWeight: 600 }}><span>Total</span><span>{money(subtotal)}</span></div>
                                    <RLink to="checkout.html" className="tf-btn btn-fill w-100" style={{ height: 48 }}>Checkout</RLink>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
