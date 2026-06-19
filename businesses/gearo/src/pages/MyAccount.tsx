import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import RLink from "@/components/common/RLink";
import OrderLookup from "@/components/sections/OrderLookup";

export default function MyAccount() {
    return (
        <Layout>
            <Breadcrumb title="My Account" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row g-4">
                        <div className="col-lg-3">
                            <ul className="list-unstyled" style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
                                <li className="mb-2"><RLink to="my-account.html" className="link text_primary">Dashboard</RLink></li>
                                <li className="mb-2"><RLink to="my-account-orders.html" className="link">Track an order</RLink></li>
                                <li className="mb-2"><RLink to="wish-list.html" className="link">Wishlist</RLink></li>
                                <li><RLink to="login.html" className="link">Logout</RLink></li>
                            </ul>
                        </div>
                        <div className="col-lg-9">
                            <h5 className="mb-2">Track an order</h5>
                            <p className="text-body-default text_secondary mb-4">
                                Look up any order with its reference and the email you used at checkout.
                            </p>
                            <OrderLookup compact />
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
