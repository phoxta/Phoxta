import { Route, Routes } from "react-router-dom";
import StoreLayout from "@/components/StoreLayout";
import AboutPage from "@/pages/AboutPage";
import AccountPage from "@/pages/AccountPage";
import ArticlePage from "@/pages/ArticlePage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import CmsPage from "@/pages/CmsPage";
import ContactPage from "@/pages/ContactPage";
import HomePage from "@/pages/HomePage";
import JournalPage from "@/pages/JournalPage";
import NotFoundPage from "@/pages/NotFoundPage";
import OrderPage from "@/pages/OrderPage";
import ProductPage from "@/pages/ProductPage";
import ShopPage from "@/pages/ShopPage";

const PRIVACY_FALLBACK =
    "We only collect what we need to fulfil your order and answer your questions: your name, email, delivery address and order history.\n\nWe never sell your data, and we don't run advertising trackers on this site. Ask us at any time for a copy of what we hold, or for it to be deleted.";

const TERMS_FALLBACK =
    "These terms cover your use of this site and any order you place through it. Prices include VAT where applicable; delivery costs are shown before you pay.\n\nYou may return any item within 30 days, opened or not. Nothing here affects your statutory rights.";

export default function App() {
    return (
        <Routes>
            <Route element={<StoreLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                {/* One screen serves both: with a reference it is the receipt,
                    without one it is the guest tracking form. */}
                <Route path="/order/:ref" element={<OrderPage />} />
                <Route path="/track-order" element={<OrderPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/journal" element={<JournalPage />} />
                <Route path="/journal/:slug" element={<ArticlePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route
                    path="/privacy"
                    element={<CmsPage slug="privacy" title="Privacy Policy" fallback={PRIVACY_FALLBACK} />}
                />
                <Route
                    path="/terms"
                    element={<CmsPage slug="terms" title="Terms & Conditions" fallback={TERMS_FALLBACK} />}
                />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
