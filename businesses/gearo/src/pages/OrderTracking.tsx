import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import OrderLookup from "@/components/sections/OrderLookup";

export default function OrderTracking() {
    return (
        <Layout>
            <Breadcrumb title="Track Your Order" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="text-center mb-4">
                        <p className="text-body-default text_secondary mb-0">
                            Enter the order reference from your confirmation and the email you checked out with.
                        </p>
                    </div>
                    <OrderLookup />
                </div>
            </section>
        </Layout>
    );
}
