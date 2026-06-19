import { Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
import ShopPage from "@/pages/ShopPage";
import ProductDetailsPage from "@/pages/ProductDetailsPage";
import CheckoutPage from "@/pages/CheckoutPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import OrderTrackingPage from "@/pages/OrderTrackingPage";
import CartDrawer from "@/components/CartDrawer";
import AIStylist from "@/components/AIStylist";

// Aurelia fashion store — built on the real Phoxta design layer (MainLayout +
// GSAP effects + design system), with fashion routes and a custom menu.
export default function App() {
    return (
        <>
            <Routes>
                <Route element={<MainLayout headerStyle={2} footerStyle={2} />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/product-archive" element={<ShopPage />} />
                    <Route path="/product-details/:id" element={<ProductDetailsPage />} />
                    <Route path="/product-details" element={<ProductDetailsPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/track-order" element={<OrderTrackingPage />} />
                    <Route path="*" element={<HomePage />} />
                </Route>
            </Routes>
            <CartDrawer />
            <AIStylist />
        </>
    );
}
